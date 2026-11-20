"""Realistic demo seed: ~10 cruise guests soaking right now at Yu Pinang Onsen."""
import uuid
import random
from datetime import datetime, timezone, timedelta
from rules import run_engine
from llm import fallback_explanation
from youcom import FALLBACK_EVIDENCE

SHIPS = [
    {"name": "Navigator of the Seas", "line": "Royal Caribbean", "guests": 4000, "arrive": "14:00", "depart": "21:00", "all_aboard": "20:30", "leave_by": "18:45", "source": "CruiseMapper via You.com"},
    {"name": "Oceania Nautica", "line": "Oceania Cruises", "guests": 684, "arrive": "07:00", "depart": "17:00", "all_aboard": "16:30", "leave_by": "14:45", "source": "CruiseMapper via You.com"},
]


def ship_info(name):
    n = (name or "").lower()
    for s in SHIPS:
        if s["name"].lower().split(" of ")[0] in n or n in s["name"].lower() and n:
            return s
    return SHIPS[0]


def med(name, generic, cls):
    return {"name": name, "generic": generic, "drug_class": cls}


def P(name, age, lang, code, home, cc, ship, party, meds=(), conds=(), factors=None, **kw):
    f = {"alcohol_drinks_3h": 0, "poor_sleep": False, "seasick": False, "sunburn": False, "dehydrated": False}
    f.update(factors or {})
    base = {"name": name, "age": age, "language": lang, "lang_code": code, "home": home, "country_code": cc, "ship": ship, "party": party,
            "medications": list(meds), "conditions": list(conds), "factors": f, "pregnancy_weeks": None, "children_ages": [],
            "privacy_request": False, "mobility_need": False, "heart_attack_6mo": False, "wishes": None}
    base.update(kw)
    return base


NAV = "Navigator of the Seas"
GUESTS = [
    (P("Margaret Hughes", 71, "English", "en-AU", "Sydney", "AU", NAV, "with husband Ken", [med("metoprolol", "metoprolol", "beta-blocker"), med("seasickness patch", "scopolamine", "anticholinergic")], wishes="a long hot soak"), "jade", 0.55, "soaking"),
    (P("田中 健一 (Kenichi Tanaka)", 68, "Japanese", "ja-JP", "Osaka", "JP", NAV, "with wife", [med("ワーファリン", "warfarin", "anticoagulant"), med("降圧剤", "antihypertensive", "antihypertensive")]), "rotenburo", 0.7, "soaking"),
    (P("Robert Miller", 78, "English", "en-US", "Phoenix", "US", NAV, "solo", [med("Lasix", "furosemide", "diuretic")], ["mild COPD"]), "jade", 1.05, "soaking"),
    (P("Linda Johnson", 66, "English", "en-GB", "Leeds", "GB", NAV, "with sister", [med("lisinopril", "lisinopril", "ACE inhibitor")]), "rotenburo", 0.35, "soaking"),
    (P("Carlos Mendes", 45, "Portuguese", "pt-BR", "São Paulo", "BR", NAV, "with partner"), "hinoki", 0.6, "soaking"),
    (P("Sophie Laurent", 38, "French", "fr-FR", "Lyon", "FR", NAV, "with friends", factors={"alcohol_drinks_3h": 1}), "hinoki", 0.9, "soaking"),
    (P("陈伟 (Wei Chen)", 40, "Mandarin Chinese", "zh-CN", "Shanghai", "CN", NAV, "family of four", children_ages=[6, 9]), "family", 0.4, "soaking"),
    (P("Anna Schmidt", 72, "German", "de-DE", "Munich", "DE", NAV, "with husband", [med("insulin", "insulin glargine", "insulin")], ["type 2 diabetes"]), "accessible", 0.8, "soaking"),
    (P("Ian O'Brien", 62, "English", "en-IE", "Cork", "IE", NAV, "with wife", factors={"poor_sleep": True, "seasick": True}), "rotenburo", 0.2, "cooldown"),
    (P("Fatima Al-Sayed", 29, "Arabic", "ar-SA", "Dubai", "AE", NAV, "with sister", privacy_request=True), "family", 0.5, "soaking"),
]


def new_code():
    return "OND-" + "".join(random.choice("ABCDEFGHJKMNPQRSTUVWXYZ23456789") for _ in range(4))


def limits_of(rx):
    return {k: rx[k] for k in ("max_temp", "max_minutes", "rounds", "cooldown_minutes", "risk_level", "risk_score", "total_water_ml", "staff_confirm", "foot_bath_only")}


def fallback_evidence_map(rx):
    out = {}
    for f in rx["red_flags"]:
        text, urls = FALLBACK_EVIDENCE.get(f["id"], ("", []))
        out[f["id"]] = {"answer": text, "citations": [{"url": u, "excerpt": text.split(" [[")[0], "domain": u.split("/")[2].replace("www.", "")} for u in urls], "live": False}
    return out


async def seed(db, heat_index=41):
    for c in ("prescriptions", "bookings", "alerts", "incidents", "profiles"):
        await db[c].delete_many({})
    await db.demo.update_one({"id": "demo"}, {"$set": {"id": "demo", "speed": 1, "heat_override": None, "heat_version": 0}}, upsert=True)
    now = datetime.now(timezone.utc)
    hour = (now + timedelta(hours=8)).hour
    slot = f"{max(13, min(18, hour)):02d}:{'00' if (now.minute < 30) else '30'}"
    for i, (prof, bath_id, frac, status) in enumerate(GUESTS):
        rx = run_engine(prof, heat_index)
        pid = str(uuid.uuid4())
        await db.prescriptions.insert_one({"id": pid, "profile": prof, "rx": rx, "explanation": fallback_explanation(prof, rx),
                                           "evidence": fallback_evidence_map(rx), "created_at": now.isoformat(), "seeded": True})
        lim = limits_of(rx)
        elapsed = frac * (lim["max_minutes"] if status == "soaking" else lim["cooldown_minutes"]) * 60
        code = new_code()
        await db.bookings.insert_one({
            "code": code, "prescription_id": pid, "name": prof["name"], "country_code": prof["country_code"], "language": prof["language"],
            "lang_code": prof["lang_code"], "bath_id": bath_id, "slot": slot, "status": status, "round": 1 if status == "soaking" else 1,
            "phase_started_at": now.isoformat(), "phase_base_s": elapsed, "water_ml": random.choice([250, 500, 750]), "limits": lim,
            "red_flag_ids": [f["id"] for f in rx["red_flags"]], "staff_confirmed": True, "heat_version": 0, "ship": prof["ship"],
            "created_at": (now - timedelta(minutes=40 - i * 3)).isoformat(), "seeded": True})
    await db.alerts.insert_one({"id": str(uuid.uuid4()), "type": "heat", "severity": "amber", "code": None, "name": None,
                                "message": f"Heat index {heat_index}°C in George Town: all limits lowered by 1°C and 2 minutes." if heat_index >= 40 else f"Heat index {heat_index}°C in George Town: shaded baths and extra water for patch wearers.", "ack": False, "created_at": (now - timedelta(minutes=12)).isoformat()})
    await db.incidents.insert_many([
        {"id": str(uuid.uuid4()), "text": "Gentleman in the rotenburo looked flushed, moved to shade", "kind": "note", "severity": "amber", "summary": "Flushed guest moved to shade", "created_at": (now - timedelta(minutes=55)).isoformat()},
        {"id": str(uuid.uuid4()), "text": "Hinoki read 41.5 degrees, adjusted", "kind": "bath", "severity": "amber", "summary": "Hinoki over 41°C, cooled", "created_at": (now - timedelta(minutes=95)).isoformat()},
    ])
