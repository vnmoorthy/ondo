"""Claude Sonnet 5.5 via the Emergent LLM key: extraction, explanation, translation, incident parsing."""
import os
import re
import json
import uuid
import asyncio
import logging
from typing import Optional, List
from pydantic import BaseModel, Field
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

log = logging.getLogger("llm")
MODEL = ("anthropic", "claude-sonnet-5-5")


async def ask(system: str, prompt: str) -> str:
    chat = LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id=str(uuid.uuid4()), system_message=system).with_model(*MODEL)
    out = []
    async for ev in chat.stream_message(UserMessage(text=prompt)):
        if isinstance(ev, TextDelta):
            out.append(ev.content)
        elif isinstance(ev, StreamDone):
            break
    return "".join(out).strip()


def _json(text: str) -> dict:
    m = re.search(r"\{.*\}", text, re.S)
    return json.loads(m.group(0) if m else text)


class Medication(BaseModel):
    name: str
    generic: Optional[str] = None
    drug_class: Optional[str] = None


class Factors(BaseModel):
    alcohol_drinks_3h: int = 0
    poor_sleep: bool = False
    seasick: bool = False
    sunburn: bool = False
    dehydrated: bool = False


class Profile(BaseModel):
    name: str = "Guest"
    age: Optional[int] = None
    language: str = "English"
    lang_code: str = "en-US"
    home: Optional[str] = None
    country_code: Optional[str] = None
    ship: Optional[str] = None
    party: Optional[str] = None
    medications: List[Medication] = Field(default_factory=list)
    conditions: List[str] = Field(default_factory=list)
    factors: Factors = Field(default_factory=Factors)
    pregnancy_weeks: Optional[int] = None
    children_ages: List[int] = Field(default_factory=list)
    privacy_request: bool = False
    mobility_need: bool = False
    heart_attack_6mo: bool = False
    wishes: Optional[str] = None


INTAKE_SYS = """You are Ondo's intake assistant at Yu Pinang Onsen, Penang. Extract a guest profile from what they said (any language).
Return ONLY JSON with keys: name, age (int or null), language (English name of the language they spoke, e.g. "Japanese"),
lang_code (BCP-47 for speech, e.g. en-AU, ja-JP, zh-CN, hi-IN, es-ES), home, country_code (ISO 3166 alpha-2 of home, e.g. AU, JP), ship (cruise ship name or null), party (who they travel with, short),
medications: [{name (as said), generic (English generic name), drug_class (e.g. beta-blocker, anticholinergic, diuretic, ACE inhibitor, anticoagulant, antihypertensive, insulin)}],
conditions: [short English strings], factors: {alcohol_drinks_3h:int, poor_sleep:bool, seasick:bool, sunburn:bool, dehydrated:bool},
pregnancy_weeks (int or null), children_ages ([int]), privacy_request (bool: tattoos or modesty or private wish), mobility_need (bool),
heart_attack_6mo (bool), wishes (short English, what they want from the soak).
A seasickness patch is scopolamine (anticholinergic). Unspecified blood-pressure pills (降圧剤) are drug_class "antihypertensive". Drinks on a ship's drinks package today count as alcohol in the last 3 h unless they say otherwise.
Use null/[]/false when unknown. Never invent medicines."""


def _norm(t: str) -> str:
    return re.sub(r"\s+", " ", (t or "").strip()).lower()


def _f(**kw):
    return {"alcohol_drinks_3h": 0, "poor_sleep": False, "seasick": False, "sunburn": False, "dehydrated": False, **kw}


PRESETS = {_norm(k): v for k, v in {
    "I'm Margaret, 71, from Sydney, on the Navigator of the Seas. I take metoprolol for my blood pressure and I put a seasickness patch on this morning. I'd love a long hot soak.":
        {"name": "Margaret", "age": 71, "language": "English", "lang_code": "en-AU", "home": "Sydney", "country_code": "AU", "ship": "Navigator of the Seas",
         "medications": [{"name": "metoprolol", "generic": "metoprolol", "drug_class": "beta-blocker"}, {"name": "seasickness patch", "generic": "scopolamine", "drug_class": "anticholinergic"}],
         "factors": _f(), "wishes": "a long hot soak"},
    "田中です。68歳です。ワーファリンと降圧剤を飲んでいます。温泉は大好きです。":
        {"name": "田中", "age": 68, "language": "Japanese", "lang_code": "ja-JP", "home": "Japan", "country_code": "JP",
         "medications": [{"name": "ワーファリン", "generic": "warfarin", "drug_class": "anticoagulant"}, {"name": "降圧剤", "generic": "antihypertensive", "drug_class": "antihypertensive"}],
         "factors": _f(), "wishes": "loves hot springs"},
    "I'm Priya, 20 weeks pregnant, vegetarian, travelling with my husband. Is the onsen safe for me?":
        {"name": "Priya", "age": 33, "language": "English", "lang_code": "en-IN", "home": "Mumbai", "country_code": "IN", "party": "with husband",
         "conditions": ["vegetarian"], "factors": _f(), "pregnancy_weeks": 20, "wishes": "wants to know if the onsen is safe"},
    "Had three beers on the ship's drinks package, slept badly, want the hottest bath you have.":
        {"name": "David", "age": 52, "language": "English", "lang_code": "en-US", "home": "Austin", "country_code": "US",
         "factors": _f(alcohol_drinks_3h=3, poor_sleep=True), "wishes": "the hottest bath"},
    "我们一家四口，孩子六岁，第一次泡温泉。":
        {"name": "陈家 (Chen family)", "language": "Mandarin Chinese", "lang_code": "zh-CN", "home": "China", "country_code": "CN", "party": "family of four",
         "children_ages": [6], "factors": _f(), "wishes": "first onsen visit"},
}.items()}

DRUGS = {"metoprolol": ("metoprolol", "beta-blocker"), "atenolol": ("atenolol", "beta-blocker"), "bisoprolol": ("bisoprolol", "beta-blocker"),
         "scopolamine": ("scopolamine", "anticholinergic"), "seasickness patch": ("scopolamine", "anticholinergic"), "seasick patch": ("scopolamine", "anticholinergic"),
         "warfarin": ("warfarin", "anticoagulant"), "ワーファリン": ("warfarin", "anticoagulant"), "insulin": ("insulin", "insulin"), "metformin": ("metformin", "antidiabetic"),
         "furosemide": ("furosemide", "diuretic"), "lasix": ("furosemide", "diuretic"), "lisinopril": ("lisinopril", "ACE inhibitor"), "amlodipine": ("amlodipine", "antihypertensive"),
         "降圧剤": ("antihypertensive", "antihypertensive"), "apixaban": ("apixaban", "anticoagulant")}
NUM = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "a couple": 2}


async def extract_profile(text: str) -> Profile:
    preset = PRESETS.get(_norm(text))
    if preset:
        return Profile(**preset)
    for attempt in range(2):
        try:
            return Profile(**_json(await asyncio.wait_for(ask(INTAKE_SYS, text), 20)))
        except Exception as e:
            log.warning("intake attempt %d failed: %s", attempt + 1, e)
    return fallback_profile(text)


def fallback_profile(text: str) -> Profile:
    low = text.lower()
    name = re.search(r"(?:I'm|I am|name is|my name's)\s+([A-Z][a-z]+)", text)
    age = re.search(r"\b(\d{2})\s*(?:years?|yo|y/o|歳|岁|,)", text) or re.search(r"\b(?:age|aged)\s*(\d{2})", low)
    preg = re.search(r"(\d{1,2})\s*weeks?\s*pregnant", low)
    drinks = 0
    m = re.search(r"(\d+|one|two|three|four|five|six|a couple)\s+(?:of\s+)?(?:beers?|drinks?|glasses|wines?|cocktails?|shots?)", low)
    if m:
        drinks = int(m.group(1)) if m.group(1).isdigit() else NUM[m.group(1)]
    meds, seen = [], set()
    for k, (g, c) in DRUGS.items():
        if k in low and g not in seen:
            seen.add(g)
            meds.append(Medication(name=k, generic=g, drug_class=c))
    kids = [int(x) for x in re.findall(r"(\d{1,2})[- ]year[- ]old", low)]
    return Profile(name=name.group(1) if name else "Guest", age=int(age.group(1)) if age else None, medications=meds,
                   pregnancy_weeks=int(preg.group(1)) if preg else None, children_ages=[k for k in kids if k < 18],
                   factors=Factors(alcohol_drinks_3h=drinks, poor_sleep=bool(re.search(r"slept (badly|poorly)|poor sleep|no sleep|didn't sleep", low)),
                                   seasick=("seasick" in low and "patch" not in low)))


class Phrases(BaseModel):
    start_round: str
    two_min_left: str
    one_min_left: str
    get_out: str
    cooldown_start: str
    cooldown_end: str
    finished: str
    drink_water: str
    heat_alert: str


class Explanation(BaseModel):
    summary: str
    flag_reasons: dict = Field(default_factory=dict)
    phrases: Phrases
    unwell_steps: List[str]
    disclaimer: str


EXPLAIN_SYS = """You are Ondo, the warm heat-safety host of Yu Pinang Onsen in Penang. You receive a guest profile and a FIXED soak prescription
computed by a safety engine. Never change any number. Write everything in the guest's language. Be warm, short, plain, large-print friendly.
Return ONLY JSON: {"summary": 2-3 sentences addressing the guest by name, explaining their prescription,
"flag_reasons": {rule_id: one plain sentence translating that rule's reason},
"phrases": {"start_round": "...", "two_min_left": "<name>, two minutes left. Sit up slowly before you stand.", "one_min_left": "...", "get_out": "time to get out slowly",
 "cooldown_start": "...rest in the shade and sip water", "cooldown_end": "...", "finished": "...", "drink_water": "...", "heat_alert": "Penang's heat has risen; Ondo has shortened your soak"} (all with the guest's name, in their language),
"unwell_steps": [4 short calm steps: get out slowly, sit down, sip water, staff are coming],
"disclaimer": "Not medical advice; staff will check on you." translated}"""


def fallback_explanation(profile: dict, rx: dict) -> dict:
    n = profile.get("name") or "Friend"
    b = rx["bath"]["name"]
    return {
        "summary": f"{n}, your safe soak today is the {b} at up to {rx['max_temp']}°C, {rx['max_minutes']} minutes a round for {rx['rounds']} round(s), with {rx['cooldown_minutes']} minutes cooling down in between. Drink {rx['total_water_ml']} ml of water across your visit.",
        "flag_reasons": {f["id"]: f["reason"] for f in rx["red_flags"]},
        "phrases": {"start_round": f"{n}, ease in slowly. Your round has started.", "two_min_left": f"{n}, two minutes left. Sit up slowly before you stand.",
                    "one_min_left": f"{n}, one minute left. Move to the step and sit up.", "get_out": f"{n}, time to get out. Stand up slowly and hold the rail.",
                    "cooldown_start": f"{n}, rest in the shade and sip some water.", "cooldown_end": f"{n}, your cool-down is done.",
                    "finished": f"Well done {n}. Your soak is complete. Please drink a glass of water.", "drink_water": f"{n}, please have a sip of water.",
                    "heat_alert": f"{n}, Penang's heat has risen. Ondo has shortened your soak to stay safe."},
        "unwell_steps": ["Get out of the water slowly, holding the rail.", "Sit down somewhere cool and shaded.", "Sip some water slowly.", "Stay calm: staff are on their way to you now."],
        "disclaimer": "Not medical advice; staff will check on you.",
    }


async def explain(profile: dict, rx: dict) -> dict:
    payload = {"profile": profile, "prescription": {k: rx[k] for k in ("risk_level", "risk_score", "max_temp", "max_minutes", "rounds", "cooldown_minutes", "total_water_ml", "notes")},
               "bath": rx["bath"]["name"], "rules": [{"id": f["id"], "reason": f["reason"]} for f in rx["red_flags"]]}
    try:
        return Explanation(**_json(await asyncio.wait_for(ask(EXPLAIN_SYS, json.dumps(payload, ensure_ascii=False)), 25))).model_dump()
    except Exception as e:
        log.warning("explain failed: %s", e)
        return fallback_explanation(profile, rx)


async def translate_answer(answer: str, language: str) -> str:
    sys = (f"Rewrite this cited answer for an onsen guest in {language}. Plain, warm, at most 90 words. Keep citation markers like [[1, 2]] exactly where they belong. "
           "Remove markdown headings. Return only the text.")
    try:
        return await ask(sys, answer)
    except Exception as e:
        log.warning("translate failed: %s", e)
        return answer


async def doctor_summary(profile: dict, rx: dict, events: list) -> str:
    sys = ("Write a concise health summary for a cruise ship's doctor about a guest who visited a hot-spring onsen today. "
           f"First in English, then a line '---', then the same in {profile.get('language', 'English')} (skip the second part if English). "
           "Include: name, age, ship, medicines with classes, conditions, today's factors, the soak prescription and risk level, and events (unwell alerts, water drunk). Plain text, no markdown tables.")
    try:
        return await ask(sys, json.dumps({"profile": profile, "prescription": {k: rx.get(k) for k in ("risk_level", "risk_score", "max_temp", "max_minutes", "rounds", "bath")}, "events": events}, ensure_ascii=False, default=str))
    except Exception as e:
        log.warning("doctor summary failed: %s", e)
        meds = ", ".join(m.get("generic") or m.get("name") for m in profile.get("medications", []))
        return f"{profile.get('name')}, {profile.get('age')}, ship {profile.get('ship')}. Medicines: {meds or 'none'}. Risk {rx.get('risk_level')} ({rx.get('risk_score')}). Prescribed {rx.get('max_temp')}°C, {rx.get('max_minutes')} min x {rx.get('rounds')}. Events: {len(events)}."


class Incident(BaseModel):
    kind: str
    booking_code: Optional[str] = None
    bath_id: Optional[str] = None
    temp_c: Optional[float] = None
    symptom: Optional[str] = None
    severity: str = "amber"
    summary: str = ""


async def parse_incident(text: str, guests: list, baths: list) -> Incident:
    sys = ("You parse onsen staff voice reports into an incident. Return ONLY JSON {kind: 'guest'|'bath'|'note', booking_code (match a guest by name from the list, else null), "
           "bath_id (from the list, else null), temp_c (number if a water temperature is stated), symptom (short English, e.g. dizzy, fainted, vomiting, chest pain, red skin), "
           "severity: 'red' for fainting, chest pain, confusion, collapse, not responding; else 'amber', summary: one short English sentence}.\n"
           f"Guests in the water: {json.dumps(guests, ensure_ascii=False)}\nBaths: {json.dumps(baths)}")
    try:
        return Incident(**_json(await ask(sys, text)))
    except Exception as e:
        log.warning("incident parse failed: %s", e)
        low = text.lower()
        temp = re.search(r"(\d{2}(?:\.\d)?)\s*(?:degrees|°)", low)
        bath = next((b["id"] for b in baths if b["id"] in low or b["name"].split()[0].lower() in low), None)
        if temp and bath:
            return Incident(kind="bath", bath_id=bath, temp_c=float(temp.group(1)), summary=text)
        g = next((x["code"] for x in guests if x["name"].split()[0].lower() in low), None)
        return Incident(kind="guest" if g else "note", booking_code=g, symptom="unwell", summary=text)
