import asyncio
import json
import uuid
import logging
import os
from contextlib import suppress
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel

load_dotenv(Path(__file__).parent / ".env")

import rules  # noqa: E402
import heatcurve  # noqa: E402
import youcom  # noqa: E402
import llm  # noqa: E402
from seed import seed, ship_info, new_code, limits_of, SHIPS  # noqa: E402

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
log = logging.getLogger("ondo")

INDEXES = {
    "bookings": [IndexModel([("code", ASCENDING)], name="code", unique=True), IndexModel([("status", ASCENDING)], name="status")],
    "prescriptions": [IndexModel([("id", ASCENDING)], name="id", unique=True)],
    "profiles": [IndexModel([("id", ASCENDING)], name="id", unique=True)],
    "alerts": [IndexModel([("id", ASCENDING)], name="id", unique=True), IndexModel([("created_at", DESCENDING)], name="created_desc"), IndexModel([("key", ASCENDING)], name="key")],
    "incidents": [IndexModel([("created_at", DESCENDING)], name="created_desc")],
    "yc_cache": [IndexModel([("key", ASCENDING)], name="key", unique=True)],
    "baths": [IndexModel([("id", ASCENDING)], name="id", unique=True)],
}

app = FastAPI()
api = APIRouter(prefix="/api")
ACTIVE = ["soaking", "cooldown"]


def now():
    return datetime.now(timezone.utc)


def iso():
    return now().isoformat()


async def demo_state():
    d = await db.demo.find_one({"id": "demo"}, {"_id": 0})
    return d or {"id": "demo", "speed": 1, "heat_override": None, "heat_version": 0}


async def current_conditions():
    c = await youcom.conditions(db)
    d = await demo_state()
    if d.get("heat_override"):
        c = {**c, "heat_index": d["heat_override"], "simulated": True, "summary": "Simulated heat spike: extreme heat warning for George Town."}
    return c


async def baths_list():
    return await db.baths.find({}, {"_id": 0}).to_list(50)


async def reset_baths():
    await db.baths.delete_many({})
    await db.baths.insert_many([{**b, "current_temp": b["temp"]} for b in rules.BATHS])


def elapsed_of(b, speed):
    if b.get("status") not in ACTIVE:
        return b.get("phase_base_s", 0)
    started = datetime.fromisoformat(b["phase_started_at"])
    return b.get("phase_base_s", 0) + (now() - started).total_seconds() * speed


def phase_limit_s(b):
    lim = b["limits"]
    return (lim["cooldown_minutes"] if b["status"] == "cooldown" else lim["max_minutes"]) * 60


def clean(doc):
    doc.pop("_id", None)
    return doc


async def add_alert(type_, severity, message, code=None, name=None, key=None, extra=None):
    if key and await db.alerts.find_one({"key": key}):
        return None
    a = {"id": str(uuid.uuid4()), "type": type_, "severity": severity, "code": code, "name": name, "message": message, "ack": False,
         "key": key, "created_at": iso(), **(extra or {})}
    await db.alerts.insert_one(dict(a))
    return a


# ---------- guest ----------
class IntakeIn(BaseModel):
    text: str


class RxIn(BaseModel):
    profile: dict
    profile_id: Optional[str] = None


class BookIn(BaseModel):
    prescription_id: str
    bath_id: str
    slot: str


class PhaseIn(BaseModel):
    phase: str
    round: int = 1


class WaterIn(BaseModel):
    ml: int = 250


class AskIn(BaseModel):
    question: str
    language: str = "English"


class VoiceIn(BaseModel):
    text: str


class SpeedIn(BaseModel):
    fast: bool


@api.get("/")
async def root():
    return {"app": "Ondo", "ok": True}


@api.get("/conditions")
async def get_conditions():
    return await current_conditions()


@api.post("/intake")
async def intake(body: IntakeIn):
    if not body.text.strip():
        raise HTTPException(400, "Please tell Ondo a little about yourself.")
    prof = (await llm.extract_profile(body.text)).model_dump()
    pid = str(uuid.uuid4())
    await db.profiles.insert_one({"id": pid, "text": body.text, "profile": prof, "created_at": iso()})
    return {"id": pid, "profile": prof}


@api.post("/prescription")
async def prescription(body: RxIn):
    prof = llm.Profile(**body.profile).model_dump()
    cond = await current_conditions()
    rx = rules.run_engine(prof, cond["heat_index"])
    ev_tasks = [youcom.evidence(db, f["id"], f["query"]) for f in rx["red_flags"]]
    results = await asyncio.gather(llm.explain(prof, rx), *ev_tasks)
    doc = {"id": str(uuid.uuid4()), "profile_id": body.profile_id, "profile": prof, "rx": rx, "explanation": results[0],
           "evidence": {f["id"]: r for f, r in zip(rx["red_flags"], results[1:])}, "conditions": cond, "created_at": iso()}
    await db.prescriptions.insert_one(dict(doc))
    return clean(doc)


@api.get("/prescription/{pid}")
async def get_prescription(pid: str):
    doc = await db.prescriptions.find_one({"id": pid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Prescription not found")
    doc["heat_curve"] = heatcurve.body_heat_curve(doc["profile"], doc["rx"], rules.med_classes(doc["profile"].get("medications")))
    return doc


ETIQUETTE_EN = ["Shower and wash fully before you enter the bath.", "Bathe without swimwear; keep your small towel out of the water (rest it on your head).",
                "Tie up long hair so it doesn't touch the water.", "Speak softly and no phones or photos in the bathing area.",
                "Ask staff about tattoo covers or the private family bath.", "Enter slowly, stand up slowly, and drink water after every round."]


@api.get("/etiquette")
async def etiquette(language: str = "English"):
    if language.lower().startswith("english"):
        return {"language": language, "items": ETIQUETTE_EN}
    hit = await db.etiquette.find_one({"language": language}, {"_id": 0})
    if hit:
        return hit
    try:
        text = await llm.ask(f"Translate each line into {language}. Return ONLY a JSON array of strings, same order.", json.dumps(ETIQUETTE_EN))
        items = json.loads(text[text.index("["): text.rindex("]") + 1])
    except Exception as e:
        log.warning("etiquette translate failed: %s", e)
        return {"language": "English", "items": ETIQUETTE_EN}
    doc = {"language": language, "items": items}
    await db.etiquette.insert_one(dict(doc))
    return doc


@api.get("/impact")
async def impact():
    all_b = await db.bookings.find({}, {"_id": 0, "limits": 1, "status": 1}).to_list(1000)
    return {"risks_caught": sum(1 for x in all_b if x["limits"]["risk_level"] != "green") + 14,
            "soaking_safely": sum(1 for x in all_b if x["status"] in ACTIVE), "guests_today": len(all_b) + 37}


@api.get("/baths")
async def get_baths():
    return await baths_list()


@api.get("/slots")
async def slots(bath_id: str):
    counts = {}
    async for b in db.bookings.find({"bath_id": bath_id, "status": {"$ne": "cancelled"}}, {"slot": 1}):
        counts[b["slot"]] = counts.get(b["slot"], 0) + 1
    cap = 4 if bath_id in ("family", "accessible") else 10
    out = []
    for h in range(13, 19):
        for m in (0, 30):
            s = f"{h:02d}:{m:02d}"
            out.append({"slot": s, "taken": counts.get(s, 0), "capacity": cap, "left": max(0, cap - counts.get(s, 0))})
    out.append({"slot": "19:00", "taken": counts.get("19:00", 0), "capacity": cap, "left": max(0, cap - counts.get("19:00", 0))})
    return out


@api.post("/bookings")
async def book(body: BookIn):
    p = await db.prescriptions.find_one({"id": body.prescription_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Prescription not found")
    prof, rx = p["profile"], p["rx"]
    code = new_code()
    while await db.bookings.find_one({"code": code}):
        code = new_code()
    b = {"code": code, "prescription_id": p["id"], "name": prof["name"], "country_code": prof.get("country_code"), "language": prof.get("language"),
         "lang_code": prof.get("lang_code"), "bath_id": body.bath_id, "slot": body.slot, "status": "booked", "round": 1,
         "phase_started_at": iso(), "phase_base_s": 0, "water_ml": 0, "limits": limits_of(rx), "red_flag_ids": [f["id"] for f in rx["red_flags"]],
         "staff_confirmed": not rx["staff_confirm"], "heat_version": (await demo_state()).get("heat_version", 0), "ship": prof.get("ship"), "created_at": iso()}
    await db.bookings.insert_one(dict(b))
    if rx["staff_confirm"]:
        await add_alert("confirm", "red", f"{prof['name']} is high risk ({rx['risk_score']}). Please confirm before they soak.", code, prof["name"], key=f"confirm:{code}")
    return clean(b)


async def booking_view(code):
    b = await db.bookings.find_one({"code": code}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Pass not found")
    d = await demo_state()
    p = await db.prescriptions.find_one({"id": b["prescription_id"]}, {"_id": 0})
    bath = await db.baths.find_one({"id": b["bath_id"]}, {"_id": 0})
    b["elapsed_s"] = elapsed_of(b, d["speed"])
    b["phase_limit_s"] = phase_limit_s(b)
    return {"booking": b, "prescription": p, "bath": bath, "ship": ship_info(b.get("ship")), "demo": d}


@api.get("/bookings/{code}")
async def get_booking(code: str):
    return await booking_view(code)


@api.post("/bookings/{code}/phase")
async def set_phase(code: str, body: PhaseIn):
    if body.phase not in ("soaking", "cooldown", "done", "booked"):
        raise HTTPException(400, "bad phase")
    r = await db.bookings.update_one({"code": code}, {"$set": {"status": body.phase, "round": body.round, "phase_started_at": iso(), "phase_base_s": 0}})
    if not r.matched_count:
        raise HTTPException(404, "Pass not found")
    return await booking_view(code)


@api.post("/bookings/{code}/water")
async def water(code: str, body: WaterIn):
    await db.bookings.update_one({"code": code}, {"$inc": {"water_ml": body.ml}})
    return await booking_view(code)


@api.post("/bookings/{code}/unwell")
async def unwell(code: str):
    v = await booking_view(code)
    b = v["booking"]
    a = await add_alert("unwell", "red", f"{b['name']} pressed I feel unwell in the {v['bath']['name'] if v['bath'] else b['bath_id']}. Go now.", code, b["name"])
    await db.bookings.update_one({"code": code}, {"$set": {"unwell_at": iso()}})
    steps = (v["prescription"] or {}).get("explanation", {}).get("unwell_steps") or llm.fallback_explanation({"name": b["name"]}, v["prescription"]["rx"])["unwell_steps"]
    return {"alert": clean(a), "steps": steps}


@api.get("/bookings/{code}/summary")
async def summary(code: str):
    v = await booking_view(code)
    b = v["booking"]
    if b.get("doctor_summary"):
        return {"summary": b["doctor_summary"]}
    events = await db.alerts.find({"code": code}, {"_id": 0, "type": 1, "message": 1, "created_at": 1}).to_list(20)
    events.append({"type": "water", "message": f"Drank {b['water_ml']} ml"})
    text = await llm.doctor_summary(v["prescription"]["profile"], v["prescription"]["rx"], events)
    await db.bookings.update_one({"code": code}, {"$set": {"doctor_summary": text}})
    return {"summary": text}


@api.post("/ask")
async def ask(body: AskIn):
    q = body.question.strip()
    if not q:
        raise HTTPException(400, "Ask a question")
    res = await youcom.answer(db, q + " (hot spring onsen safety)")
    if not res:
        fb = "I couldn't reach live sources right now. In general: keep soaks short, avoid alcohol before bathing, drink water, and tell staff about any medicines [[1]]."
        res = {"answer": fb, "citations": [{"url": youcom.NIPPON, "excerpt": "Keep water under 41°C and soak at most 10 minutes.", "domain": "nippon.com"}], "live": False}
    text = await llm.translate_answer(res["answer"], body.language)
    return {"answer": text, "citations": res["citations"], "live": res["live"]}


# ---------- staff ----------
@api.get("/staff/board")
async def board():
    d = await demo_state()
    guests = []
    baths = {b["id"]: b for b in await baths_list()}
    async for b in db.bookings.find({"status": {"$in": ACTIVE}}, {"_id": 0}):
        el = elapsed_of(b, d["speed"])
        lim = phase_limit_s(b)
        if b.get("seeded") and el > lim * 2.5:
            nxt = ("cooldown", b["round"]) if b["status"] == "soaking" else ("soaking", b["round"] % b["limits"]["rounds"] + 1)
            await db.bookings.update_one({"code": b["code"]}, {"$set": {"status": nxt[0], "round": nxt[1], "phase_started_at": iso(), "phase_base_s": 0}})
            b.update({"status": nxt[0], "round": nxt[1], "phase_started_at": iso(), "phase_base_s": 0})
            el, lim = 0, phase_limit_s(b)
        if not b.get("seeded") and b["status"] == "cooldown" and el > lim * 3:
            await db.bookings.update_one({"code": b["code"]}, {"$set": {"status": "done"}})
            continue
        if b["status"] == "soaking" and el >= lim:
            await add_alert("limit", "red" if el >= lim * 1.2 else "amber", f"{b['name']} has reached their {b['limits']['max_minutes']}-minute limit in the {baths.get(b['bath_id'], {}).get('name', b['bath_id'])}. Help them out slowly.",
                            b["code"], b["name"], key=f"limit:{b['code']}:{b['round']}:{b['heat_version']}")
        checkpoints = [x for x in (lim - 120 / 1, lim) if x > el] if b["status"] == "soaking" else [lim]
        b.update({"elapsed_s": el, "phase_limit_s": lim, "next_checkin_s": max(0, (checkpoints[0] - el) if checkpoints else 0),
                  "bath_name": baths.get(b["bath_id"], {}).get("name", b["bath_id"]), "bath_temp": baths.get(b["bath_id"], {}).get("current_temp")})
        guests.append(b)
    guests.sort(key=lambda g: -(g["elapsed_s"] / max(1, g["phase_limit_s"])))
    alerts = await db.alerts.find({}, {"_id": 0}).sort("created_at", -1).to_list(40)
    all_b = await db.bookings.find({}, {"_id": 0, "red_flag_ids": 1, "limits": 1}).to_list(1000)
    by_type = {}
    for x in all_b:
        for r in x.get("red_flag_ids", []):
            if not r.startswith("heat"):
                by_type[r] = by_type.get(r, 0) + 1
    kpis = {"guests_today": len(all_b) + 37, "in_water": len(guests), "risks_caught": sum(1 for x in all_b if x["limits"]["risk_level"] != "green") + 14,
            "red_flags_by_type": by_type, "incidents": await db.incidents.count_documents({}) + await db.alerts.count_documents({"type": "unwell"})}
    incidents = await db.incidents.find({}, {"_id": 0}).sort("created_at", -1).to_list(10)
    return {"guests": guests, "alerts": alerts, "kpis": kpis, "incidents": incidents, "demo": d, "baths": list(baths.values())}


@api.post("/staff/alerts/{aid}/ack")
async def ack(aid: str):
    await db.alerts.update_one({"id": aid}, {"$set": {"ack": True, "ack_at": iso()}})
    return {"ok": True}


@api.post("/staff/confirm/{code}")
async def confirm(code: str):
    await db.bookings.update_one({"code": code}, {"$set": {"staff_confirmed": True}})
    await db.alerts.update_many({"key": f"confirm:{code}"}, {"$set": {"ack": True}})
    return {"ok": True}


PROTOCOLS = {
    "red": ["Get them out of the water now, two staff, using the rail", "Lie them down in the shade, legs raised", "Cool with wet towels and fan; small sips of water if awake",
            "Call the onsen first-aider and 999 if fainting, chest pain or confusion", "Inform the ship's medical centre"],
    "amber": ["Help them out slowly and sit them in the shade", "Give 250 ml of cool water", "Check again in 5 minutes; no further rounds today"],
}


@api.post("/staff/voice")
async def voice(body: VoiceIn):
    guests = [{"code": g["code"], "name": g["name"], "bath": g["bath_id"]} async for g in db.bookings.find({"status": {"$in": ACTIVE}}, {"_id": 0})]
    baths = [{"id": b["id"], "name": b["name"]} for b in await baths_list()]
    inc = await llm.parse_incident(body.text, guests, baths)
    result = {"id": str(uuid.uuid4()), "text": body.text, **inc.model_dump(), "created_at": iso(), "actions": []}
    if inc.kind == "guest" and inc.booking_code:
        g = await db.bookings.find_one({"code": inc.booking_code}, {"_id": 0})
        if g:
            result["guest_name"] = g["name"]
            result["protocol"] = PROTOCOLS[inc.severity if inc.severity in PROTOCOLS else "amber"]
            await db.bookings.update_one({"code": g["code"]}, {"$set": {"flagged": inc.symptom or "unwell", "flagged_severity": inc.severity}})
            await add_alert("incident", inc.severity, f"{g['name']}: {inc.symptom or 'reported unwell'}. Follow the protocol.", g["code"], g["name"])
            result["actions"].append(f"Flagged {g['name']} ({inc.symptom})")
    elif inc.kind == "bath" and inc.bath_id and inc.temp_c:
        bath = await db.baths.find_one({"id": inc.bath_id}, {"_id": 0})
        await db.baths.update_one({"id": inc.bath_id}, {"$set": {"current_temp": inc.temp_c}})
        result["actions"].append(f"{bath['name']} set to {inc.temp_c}°C")
        over = []
        async for g in db.bookings.find({"status": {"$in": ACTIVE}, "bath_id": inc.bath_id}, {"_id": 0}):
            if inc.temp_c > g["limits"]["max_temp"]:
                over.append(g["name"])
                await add_alert("incident", "red", f"{bath['name']} is {inc.temp_c}°C, above {g['name']}'s {g['limits']['max_temp']}°C limit. Move them to the Jade gentle bath.", g["code"], g["name"])
        result["rechecked"] = over
        result["protocol"] = [f"Lower {bath['name']} back to {bath['temp']}°C (add cold water / check the valve)"] + ([f"Move {', '.join(over)} out now"] if over else ["Everyone in this bath is within their limit"])
        result["actions"].append(f"Re-checked guests: {len(over)} over their limit")
    else:
        result["protocol"] = ["Logged for the shift record"]
    await db.incidents.insert_one(dict(result))
    return clean(result)


@api.get("/ships")
async def ships():
    today = (now() + timedelta(hours=8)).strftime("%A %B %d, %Y")
    res = await youcom.answer(db, f"Which cruise ships are in Penang Swettenham Pier on {today}, with arrival and departure times?")
    return {"seed": SHIPS, "answer": res["answer"] if res else None, "citations": res["citations"] if res else [], "live": bool(res), "date": today}


@api.get("/news")
async def news():
    return await youcom.heat_news(db)


# ---------- demo ----------
@api.get("/demo")
async def get_demo():
    return await demo_state()


@api.post("/demo/speed")
async def speed(body: SpeedIn):
    d = await demo_state()
    new = 10 if body.fast else 1
    async for b in db.bookings.find({"status": {"$in": ACTIVE}}, {"_id": 0}):
        await db.bookings.update_one({"code": b["code"]}, {"$set": {"phase_base_s": elapsed_of(b, d["speed"]), "phase_started_at": iso()}})
    await db.demo.update_one({"id": "demo"}, {"$set": {"speed": new}}, upsert=True)
    return await demo_state()


@api.post("/demo/heat-spike")
async def heat_spike():
    hi = 46
    d = await demo_state()
    await db.demo.update_one({"id": "demo"}, {"$set": {"heat_override": hi, "heat_version": d.get("heat_version", 0) + 1}}, upsert=True)
    changed = []
    async for b in db.bookings.find({"status": {"$ne": "done"}}, {"_id": 0}):
        p = await db.prescriptions.find_one({"id": b["prescription_id"]}, {"_id": 0})
        if not p:
            continue
        rx = rules.run_engine(p["profile"], hi)
        old = b["limits"]
        lim = limits_of(rx)
        await db.bookings.update_one({"code": b["code"]}, {"$set": {"limits": lim, "heat_version": d.get("heat_version", 0) + 1, "red_flag_ids": [f["id"] for f in rx["red_flags"]]}})
        await db.prescriptions.update_one({"id": p["id"]}, {"$set": {"rx_spike": rx}})
        if b["status"] in ACTIVE:
            changed.append({"name": b["name"], "from": old["max_minutes"], "to": lim["max_minutes"], "max_temp": lim["max_temp"], "code": b["code"]})
            await add_alert("heat", "red" if lim["risk_level"] == "red" else "amber",
                            f"Heat spike: {b['name']}'s limit cut from {old['max_minutes']} to {lim['max_minutes']} min, max {lim['max_temp']}°C.", b["code"], b["name"])
    await add_alert("heat", "red", f"Heat index spiked to {hi}°C. Indoor gentle baths only. Limits re-calculated for {len(changed)} guests in the water.")
    announcement = f"Attention staff. Heat index is now {hi} degrees. Limits lowered for {len(changed)} guests. Indoor gentle baths only."
    return {"heat_index": hi, "changed": changed, "announcement": announcement}


@api.post("/demo/reset")
async def reset():
    await reset_baths()
    await db.demo.update_one({"id": "demo"}, {"$set": {"heat_override": None}}, upsert=True)
    c = await current_conditions()
    await seed(db, c["heat_index"])
    return {"ok": True}


app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","), allow_methods=["*"], allow_headers=["*"])


async def ensure_indexes():
    for col, models in INDEXES.items():
        for m in models:
            try:
                await db[col].create_indexes([m])
            except Exception as e:
                log.error("index %s: %s", col, e)


async def prewarm():
    try:
        await youcom.conditions(db)
        qs = [(rid, rules.evidence_query(rid)) for rid in rules.EVIDENCE_QUERIES]
        for i in range(0, len(qs), 4):
            await asyncio.gather(*[youcom.answer(db, q) for _, q in qs[i:i + 4]])
        log.info("You.com prewarm done")
    except Exception as e:
        log.warning("prewarm failed: %s", e)


@app.on_event("startup")
async def startup():
    app.state.index_task = asyncio.create_task(ensure_indexes())
    if not await db.baths.count_documents({}):
        await reset_baths()
    if not await db.bookings.count_documents({}):
        await seed(db)
    app.state.prewarm = asyncio.create_task(prewarm())


@app.on_event("shutdown")
async def shutdown():
    for t in (app.state.index_task, app.state.prewarm):
        t.cancel()
        with suppress(asyncio.CancelledError):
            await t
    client.close()
