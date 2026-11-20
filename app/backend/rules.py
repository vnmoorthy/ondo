"""Deterministic soak safety engine for Ondo. The LLM never changes these numbers."""
from typing import Optional

BATHS = [
    {"id": "hinoki", "name": "Hinoki indoor bath", "temp": 41.0, "indoor": True, "shaded": True, "gentle": False, "private": False, "step_free": False, "hot": True},
    {"id": "rotenburo", "name": "Rotenburo outdoor rock bath", "temp": 40.0, "indoor": False, "shaded": True, "gentle": False, "private": False, "step_free": False, "hot": True},
    {"id": "jade", "name": "Jade gentle bath", "temp": 37.5, "indoor": True, "shaded": True, "gentle": True, "private": False, "step_free": False, "hot": True},
    {"id": "accessible", "name": "Step-free accessible bath", "temp": 38.0, "indoor": True, "shaded": True, "gentle": True, "private": False, "step_free": True, "hot": True},
    {"id": "family", "name": "Private family bath", "temp": 40.0, "min_temp": 37.0, "adjustable": True, "indoor": True, "shaded": True, "gentle": True, "private": True, "step_free": False, "hot": True},
    {"id": "plunge", "name": "Cool plunge", "temp": 18.0, "indoor": True, "shaded": True, "gentle": False, "private": False, "step_free": False, "hot": False},
    {"id": "footbath", "name": "Ashiyu foot bath", "temp": 38.0, "indoor": False, "shaded": True, "gentle": True, "private": False, "step_free": True, "hot": False, "foot": True},
]
BATH_BY_ID = {b["id"]: b for b in BATHS}

MED_CLASSES = {
    "anticholinergic": ["scopolamine", "hyoscine", "transderm", "seasick patch", "seasickness patch", "motion sickness patch",
                        "oxybutynin", "diphenhydramine", "benadryl", "amitriptyline", "anticholinergic", "dimenhydrinate"],
    "beta_blocker": ["metoprolol", "atenolol", "bisoprolol", "propranolol", "carvedilol", "nebivolol", "beta-blocker", "beta blocker"],
    "diuretic": ["furosemide", "lasix", "hydrochlorothiazide", "chlorthalidone", "indapamide", "spironolactone", "diuretic", "water pill"],
    "vasodilator": ["nitroglycerin", "glyceryl trinitrate", "isosorbide", "nitrate", "sildenafil", "viagra", "tadalafil", "cialis", "pde5",
                    "lisinopril", "enalapril", "ramipril", "perindopril", "losartan", "valsartan", "candesartan", "telmisartan", "olmesartan",
                    "ace inhibitor", "arb", "angiotensin", "vasodilator", "amlodipine", "nifedipine", "antihypertensive", "blood pressure", "降圧"],
    "anticoagulant": ["warfarin", "warfarin", "coumadin", "apixaban", "eliquis", "rivaroxaban", "xarelto", "dabigatran", "edoxaban", "anticoagulant", "blood thinner"],
    "diabetes": ["insulin", "metformin", "gliclazide", "glipizide", "sitagliptin", "empagliflozin", "dapagliflozin", "semaglutide", "diabetes", "antidiabetic"],
}

EVIDENCE_QUERIES = {
    "age_65": "older adults over 65",
    "age_75": "people aged 75 and older",
    "anticholinergic": "a scopolamine seasickness patch or other anticholinergic medicines",
    "beta_blocker": "beta-blockers such as metoprolol",
    "diuretic": "diuretics such as furosemide or hydrochlorothiazide",
    "vasodilator": "blood pressure medicines like ACE inhibitors, ARBs, nitrates and vasodilators",
    "anticoagulant": "anticoagulants such as warfarin or apixaban",
    "diabetes": "insulin and diabetes",
    "pregnancy": "pregnancy",
    "heart": "heart disease or a recent heart attack",
    "epilepsy": "epilepsy",
    "alcohol_light": "drinking 1-2 alcoholic drinks",
    "alcohol_heavy": "drinking 3 or more alcoholic drinks",
    "sleep_seasick": "poor sleep, seasickness and dehydration",
    "children": "young children under 7",
    "heat_40": "a heat index above 40°C",
    "heat_45": "a heat index above 45°C",
}


def evidence_query(rule_id: str) -> str:
    topic = EVIDENCE_QUERIES.get(rule_id, rule_id)
    return f"How does {topic} affect heat tolerance and hot bath or sauna safety?"


def med_classes(medications: list) -> set:
    found = set()
    for m in medications or []:
        blob = " ".join(str(m.get(k) or "") for k in ("name", "generic", "drug_class")).lower()
        for cls, words in MED_CLASSES.items():
            if any(w in blob for w in words):
                found.add(cls)
    return found


def _has(conditions: list, words: list) -> bool:
    blob = " ".join(conditions or []).lower()
    return any(w in blob for w in words)


def _rule(rid, title, reason, risk, max_temp=None, max_min=None, rounds=None, notes=None, water=0, red=False, red_kind=None):
    return {"id": rid, "title": title, "reason": reason, "risk": risk, "max_temp": max_temp, "max_minutes": max_min,
            "rounds": rounds, "notes": notes or [], "extra_water_ml": water, "red": red, "red_kind": red_kind,
            "query": evidence_query(rid)}


def match_rules(p: dict, heat_index: float) -> list:
    rules = []
    age = p.get("age") or 0
    f = p.get("factors") or {}
    conds = p.get("conditions") or []
    classes = med_classes(p.get("medications"))
    if _has(conds, ["diabet"]):
        classes.add("diabetes")

    if 65 <= age <= 74:
        rules.append(_rule("age_65", "Age 65–74", "After 65 the body senses heat later and sweats less, and blood pressure can drop when you stand up from hot water.",
                           15, 40, 8, 3, ["Enter slowly", "No cold plunge right after", "Stand up slowly"]))
    elif age >= 75:
        rules.append(_rule("age_75", "Age 75+", "After 75 the body struggles to shed heat and fainting on standing is more common.",
                           25, 39, 6, 2, ["Staff check each round"]))
    if "anticholinergic" in classes:
        rules.append(_rule("anticholinergic", "Seasickness patch (scopolamine)", f"Your seasickness patch (scopolamine) stops you sweating. In hot water on a {round(heat_index)}°C day your body can't cool down.",
                           30, 38, 6, 2, ["Indoor or shaded bath only"], 500))
    if "beta_blocker" in classes:
        rules.append(_rule("beta_blocker", "Beta-blocker", "Beta-blockers stop your heart speeding up to cope with heat, so blood pressure can fall when you stand.",
                           15, 40, 8, None, ["Stand up slowly", "No cold plunge"]))
    if "diuretic" in classes:
        rules.append(_rule("diuretic", "Diuretic (water pill)", "Water pills make you lose fluid, so you dehydrate faster in hot water.", 15, None, 8, None, [], 500))
    if "vasodilator" in classes:
        rules.append(_rule("vasodilator", "Blood-pressure medicine", "Your blood-pressure medicine widens blood vessels; hot water widens them more, which can make you faint.",
                           15, 39, 8, None, ["No alcohol today"]))
    if "anticoagulant" in classes:
        rules.append(_rule("anticoagulant", "Blood thinner", "Blood thinners mean a slip or a bump bleeds more, and wet stone floors are slippery.", 5, None, None, None, ["Use handrails", "Take care on wet floors"]))
    if "diabetes" in classes:
        rules.append(_rule("diabetes", "Insulin or diabetes", "Heat changes how fast insulin works, and nerve damage can hide a burn.", 15, 39, 8, None, ["Check glucose and eat first", "Test the water with your hand"]))

    weeks = p.get("pregnancy_weeks")
    if weeks:
        first = weeks < 13
        rules.append(_rule("pregnancy", "Pregnancy", "In first trimester a raised core temperature can harm the baby, so no hot bath today." if first
                           else "Pregnancy raises your core temperature faster and can make you faint, so the water must stay warm, not hot.",
                           25, 37.5, 10, 2, ["Private bath"] + (["First trimester: no hot bath"] if first else []), red=first, red_kind="footbath" if first else None))
    recent_mi = bool(p.get("heart_attack_6mo"))
    if recent_mi or _has(conds, ["heart", "cardiac", "angina", "coronary", "arrhythm", "atrial"]):
        rules.append(_rule("heart", "Heart condition", "Hot water makes your heart work much harder. A heart attack in the last 6 months means no bath today." if recent_mi
                           else "Hot water makes your heart work much harder, so keep it short and warm.",
                           40, 37, 5, 1, ["Doctor clearance needed"], red=recent_mi, red_kind="footbath" if recent_mi else None))
    if _has(conds, ["epilep", "seizure"]):
        rules.append(_rule("epilepsy", "Epilepsy", "A seizure in water is dangerous, so you must never soak alone.", 20, None, None, None, ["Never alone", "Private bath with a companion"]))

    drinks = int(f.get("alcohol_drinks_3h") or 0)
    if drinks >= 3:
        rules.append(_rule("alcohol_heavy", "Alcohol: 3+ drinks", "Three or more drinks plus hot water can drop your blood pressure and cause fainting or drowning. Foot bath only today.",
                           40, None, None, None, ["No hot bath today, foot bath only"], red=True, red_kind="footbath"))
    elif drinks >= 1:
        rules.append(_rule("alcohol_light", "Alcohol: 1–2 drinks", "Alcohol widens blood vessels and dehydrates you, so hot water hits harder.", 15, 39, 6, None, ["Wait 1 hour after your last drink if possible"]))
    if f.get("poor_sleep") or f.get("seasick"):
        rules.append(_rule("sleep_seasick", "Poor sleep or seasick", "Poor sleep or seasickness leaves you tired and low on fluids.", 10, None, 8, None, [], 500))
    kids = [a for a in (p.get("children_ages") or []) if a is not None and a < 7]
    if kids:
        rules.append(_rule("children", "Children under 7", "Small children heat up much faster than adults.", 15, 38, 5, None, ["Adult supervision at all times"]))
    if heat_index >= 40:
        rules.append(_rule("heat_40", f"Heat index {round(heat_index)}°C", f"Penang's heat index is {round(heat_index)}°C right now, so everyone's limits are lowered.", 10, None, None, None, ["Shaded or indoor baths"]))
    if heat_index >= 45:
        rules.append(_rule("heat_45", "Extreme heat (45°C+)", "Extreme outdoor heat today: indoor gentle baths only.", 20, None, None, None, ["Indoor gentle baths only"]))
    return rules


def choose_bath(p: dict, max_temp: float, level: str, rules: list) -> dict:
    ids = {r["id"] for r in rules}
    if any(r.get("red_kind") == "footbath" for r in rules):
        return {**BATH_BY_ID["footbath"], "set_temp": BATH_BY_ID["footbath"]["temp"]}
    privacy = bool(p.get("privacy_request")) or "pregnancy" in ids or "epilepsy" in ids
    if privacy:
        b = BATH_BY_ID["family"]
        return {**b, "set_temp": max(b["min_temp"], min(b["temp"], max_temp))}
    if level == "red":
        b = BATH_BY_ID["jade"]
        return {**b, "set_temp": min(b["temp"], max_temp)}
    if p.get("mobility_need"):
        b = BATH_BY_ID["accessible"]
        return {**b, "set_temp": min(b["temp"], max_temp)}
    pool = [b for b in BATHS if b["hot"] and not b["private"]]
    if "heat_45" in ids:
        pool = [b for b in pool if b["indoor"] and b["gentle"]]
    if "anticholinergic" in ids or "heat_40" in ids:
        pool = [b for b in pool if b["indoor"] or b["shaded"]]
    fit = [b for b in pool if b["temp"] <= max_temp]
    if fit:
        b = max(fit, key=lambda x: x["temp"])
        return {**b, "set_temp": b["temp"]}
    b = BATH_BY_ID["family"]
    return {**b, "set_temp": max(b["min_temp"], min(b["temp"], max_temp))}


def run_engine(p: dict, heat_index: float) -> dict:
    rules = match_rules(p, heat_index)
    max_temp, max_min, rounds, cool, water_extra, score = 41.0, 10, 3, 5, 0, 10
    notes = []
    for r in rules:
        if r["max_temp"] is not None:
            max_temp = min(max_temp, r["max_temp"])
        if r["max_minutes"] is not None:
            max_min = min(max_min, r["max_minutes"])
        if r["rounds"] is not None:
            rounds = min(rounds, r["rounds"])
        water_extra += r["extra_water_ml"]
        score += r["risk"]
        notes += [n for n in r["notes"] if n not in notes]
    if heat_index >= 40:
        max_temp -= 1
        max_min = max(3, max_min - 2)
    score = min(100, score)
    any_red = any(r["red"] for r in rules)
    level = "red" if (score > 60 or any_red) else ("amber" if score >= 35 else "green")
    if level == "red":
        cool = max(cool, 8)
        notes = ["Staff must confirm before you soak"] + notes
    bath = choose_bath(p, max_temp, level, rules)
    foot_only = bool(bath.get("foot"))
    if foot_only:
        rounds, max_min = 1, min(max_min, 10)
    water_per_round = 500
    return {
        "risk_score": score, "risk_level": level, "max_temp": round(max_temp, 1), "max_minutes": max_min, "rounds": rounds,
        "cooldown_minutes": cool, "water_before_ml": 250, "water_after_ml": 250, "extra_water_ml": water_extra,
        "total_water_ml": water_per_round * rounds + water_extra, "notes": notes, "staff_confirm": level == "red",
        "foot_bath_only": foot_only, "bath": bath, "heat_index": heat_index,
        "red_flags": [{k: r[k] for k in ("id", "title", "reason", "risk", "red", "query")} for r in rules],
    }
