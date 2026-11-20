# Ondo API regression tests: conditions, intake (LLM), prescription (rules + You.com evidence),
# bookings lifecycle, ask, staff board/voice/ack/confirm, demo speed + heat spike (state restored after).
# Run serially: pytest /app/backend/tests/test_ondo_api.py -n 0
import os
import sys
import pytest
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")
sys.path.insert(0, "/app/backend")
import rules  # noqa: E402

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/") + "/api"
mdb = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
T = 120

MARGARET = "I'm Margaret, 71, from Sydney, on the Navigator of the Seas. I take metoprolol for my blood pressure and I put a seasickness patch on this morning. I'd love a long hot soak."
TANAKA = "田中です。68歳です。ワーファリンと降圧剤を飲んでいます。温泉は大好きです。"

# track created records for cleanup (by id/code only)
CREATED = {"profiles": [], "prescriptions": [], "bookings": [], "alerts": [], "incidents": []}


def base_profile(**kw):
    p = {"name": "TEST_Guest", "age": 40, "language": "English", "lang_code": "en-US", "medications": [], "conditions": [],
         "factors": {"alcohol_drinks_3h": 0, "poor_sleep": False, "seasick": False, "sunburn": False, "dehydrated": False},
         "pregnancy_weeks": None, "children_ages": []}
    p.update(kw)
    return p


def make_rx(profile):
    r = requests.post(f"{BASE_URL}/prescription", json={"profile": profile}, timeout=T)
    assert r.status_code == 200, r.text
    d = r.json()
    CREATED["prescriptions"].append(d["id"])
    return d


@pytest.fixture(scope="session", autouse=True)
def cleanup():
    yield
    for pid in CREATED["profiles"]:
        mdb.profiles.delete_one({"id": pid})
    for pid in CREATED["prescriptions"]:
        mdb.prescriptions.delete_one({"id": pid})
    for code in CREATED["bookings"]:
        mdb.bookings.delete_one({"code": code})
        mdb.alerts.delete_many({"code": code})
        mdb.incidents.delete_many({"booking_code": code})
    for aid in CREATED["alerts"]:
        mdb.alerts.delete_one({"id": aid})
    for iid in CREATED["incidents"]:
        mdb.incidents.delete_one({"id": iid})


# ---------- conditions ----------
def test_conditions_live():
    d = requests.get(f"{BASE_URL}/conditions", timeout=T).json()
    assert isinstance(d["heat_index"], (int, float))
    assert d["live"] is True


# ---------- intake (LLM) ----------
def test_intake_margaret():
    r = requests.post(f"{BASE_URL}/intake", json={"text": MARGARET}, timeout=T)
    assert r.status_code == 200
    d = r.json()
    CREATED["profiles"].append(d["id"])
    p = d["profile"]
    assert p["age"] == 71
    classes = rules.med_classes(p["medications"])
    assert "beta_blocker" in classes and "anticholinergic" in classes, p["medications"]
    blob = str(p["medications"]).lower()
    assert "metoprolol" in blob and "scopolamine" in blob


def test_intake_tanaka_japanese():
    r = requests.post(f"{BASE_URL}/intake", json={"text": TANAKA}, timeout=T)
    d = r.json()
    CREATED["profiles"].append(d["id"])
    p = d["profile"]
    assert p["language"] == "Japanese" and p["lang_code"] == "ja-JP"
    assert "warfarin" in str(p["medications"]).lower()


def test_intake_empty_400():
    assert requests.post(f"{BASE_URL}/intake", json={"text": "  "}, timeout=T).status_code == 400


# ---------- prescription + rules ----------
MARG_PROFILE = base_profile(name="TEST_Margaret", age=71, language="English", lang_code="en-AU", ship="Navigator of the Seas",
                            medications=[{"name": "metoprolol", "generic": "metoprolol", "drug_class": "beta-blocker"},
                                         {"name": "seasickness patch", "generic": "scopolamine", "drug_class": "anticholinergic"}])


def test_prescription_margaret_red_with_evidence():
    d = make_rx(MARG_PROFILE)
    rx = d["rx"]
    assert rx["risk_level"] == "red" and rx["max_temp"] <= 38 and rx["rounds"] == 2 and rx["staff_confirm"] is True
    assert len(rx["red_flags"]) >= 3
    for f in rx["red_flags"]:
        ev = d["evidence"][f["id"]]
        assert "answer" in ev and isinstance(ev["citations"], list) and "live" in ev
    assert d["explanation"]["summary"]
    g = requests.get(f"{BASE_URL}/prescription/{d['id']}", timeout=T)
    assert g.status_code == 200 and g.json()["rx"]["risk_level"] == "red"


def test_prescription_404():
    assert requests.get(f"{BASE_URL}/prescription/nope", timeout=T).status_code == 404


def test_rules_david_footbath():
    rx = rules.run_engine(base_profile(age=52, factors={"alcohol_drinks_3h": 3, "poor_sleep": True}), 39)
    assert rx["bath"]["id"] == "footbath" and rx["risk_level"] == "red"


def test_rules_priya_pregnant():
    rx = rules.run_engine(base_profile(age=33, pregnancy_weeks=20), 39)
    assert rx["bath"]["id"] == "family" and rx["max_temp"] == 37.5


def test_rules_priya_pregnant_hot_day_set_temp_within_limit():
    # heat >= 40 lowers max_temp to 36.5; the family bath set_temp must not exceed max_temp
    rx = rules.run_engine(base_profile(age=33, pregnancy_weeks=20), 41)
    assert rx["bath"]["set_temp"] <= rx["max_temp"], (rx["bath"]["set_temp"], rx["max_temp"])


def test_rules_chen_child():
    rx = rules.run_engine(base_profile(age=40, children_ages=[6]), 39)
    assert rx["max_temp"] == 38 and rx["max_minutes"] == 5
    rx = rules.run_engine(base_profile(age=40, children_ages=[6]), 41)
    assert rx["max_temp"] == 37 and rx["max_minutes"] == 3


# ---------- bookings lifecycle ----------
class TestBooking:
    st = {}

    def test_create_booking(self):
        d = make_rx(MARG_PROFILE)
        r = requests.post(f"{BASE_URL}/bookings", json={"prescription_id": d["id"], "bath_id": "jade", "slot": "15:00"}, timeout=T)
        assert r.status_code == 200
        b = r.json()
        CREATED["bookings"].append(b["code"])
        assert b["code"].startswith("OND-") and len(b["code"]) == 8 and b["staff_confirmed"] is False
        self.st["code"] = b["code"]
        v = requests.get(f"{BASE_URL}/bookings/{b['code']}", timeout=T).json()
        assert v["booking"]["status"] == "booked" and v["bath"]["id"] == "jade" and v["ship"]["name"]

    def test_booking_404(self):
        assert requests.get(f"{BASE_URL}/bookings/OND-ZZZZ1", timeout=T).status_code == 404
        assert requests.post(f"{BASE_URL}/bookings", json={"prescription_id": "nope", "bath_id": "jade", "slot": "15:00"}, timeout=T).status_code == 404

    def test_staff_confirm_and_board(self):
        code = self.st["code"]
        assert requests.post(f"{BASE_URL}/staff/confirm/{code}", timeout=T).json()["ok"]
        assert requests.get(f"{BASE_URL}/bookings/{code}", timeout=T).json()["booking"]["staff_confirmed"] is True
        v = requests.post(f"{BASE_URL}/bookings/{code}/phase", json={"phase": "soaking", "round": 1}, timeout=T).json()
        assert v["booking"]["status"] == "soaking"
        board = requests.get(f"{BASE_URL}/staff/board", timeout=T).json()
        assert code in [g["code"] for g in board["guests"]]

    def test_phases_water(self):
        code = self.st["code"]
        assert requests.post(f"{BASE_URL}/bookings/{code}/phase", json={"phase": "cooldown", "round": 1}, timeout=T).json()["booking"]["status"] == "cooldown"
        assert requests.post(f"{BASE_URL}/bookings/{code}/phase", json={"phase": "bogus"}, timeout=T).status_code == 400
        w = requests.post(f"{BASE_URL}/bookings/{code}/water", json={"ml": 250}, timeout=T).json()
        assert w["booking"]["water_ml"] == 250

    def test_unwell_and_ack(self):
        code = self.st["code"]
        r = requests.post(f"{BASE_URL}/bookings/{code}/unwell", timeout=T).json()
        assert r["alert"]["type"] == "unwell" and isinstance(r["steps"], list) and r["steps"]
        aid = r["alert"]["id"]
        alerts = requests.get(f"{BASE_URL}/staff/board", timeout=T).json()["alerts"]
        assert aid in [a["id"] for a in alerts]
        assert requests.post(f"{BASE_URL}/staff/alerts/{aid}/ack", timeout=T).json()["ok"]
        assert mdb.alerts.find_one({"id": aid})["ack"] is True

    def test_summary_and_done(self):
        code = self.st["code"]
        s = requests.get(f"{BASE_URL}/bookings/{code}/summary", timeout=T).json()
        assert isinstance(s["summary"], str) and len(s["summary"]) > 50
        assert requests.post(f"{BASE_URL}/bookings/{code}/phase", json={"phase": "done", "round": 2}, timeout=T).json()["booking"]["status"] == "done"


def test_slots():
    s = requests.get(f"{BASE_URL}/slots?bath_id=jade", timeout=T).json()
    assert len(s) == 13 and s[0]["slot"] == "13:00" and s[0]["capacity"] == 10


# ---------- ask ----------
def test_ask_japanese():
    r = requests.post(f"{BASE_URL}/ask", json={"question": "Can I soak with warfarin?", "language": "Japanese"}, timeout=T)
    d = r.json()
    assert d["answer"] and isinstance(d["citations"], list) and len(d["citations"]) > 0
    assert any("\u3040" <= ch <= "\u30ff" or "\u4e00" <= ch <= "\u9fff" for ch in d["answer"]), d["answer"][:200]


# ---------- staff ----------
def test_staff_board():
    d = requests.get(f"{BASE_URL}/staff/board", timeout=T).json()
    assert len([g for g in d["guests"] if g.get("seeded")]) >= 8
    assert {"guests_today", "in_water", "risks_caught", "red_flags_by_type", "incidents"} <= set(d["kpis"])
    assert isinstance(d["alerts"], list)


def test_voice_margaret_dizzy():
    marg = mdb.bookings.find_one({"name": "Margaret Hughes", "status": {"$in": ["soaking", "cooldown"]}})
    if not marg:
        pytest.skip("Margaret not in water")
    before = {k: marg.get(k) for k in ("flagged", "flagged_severity")}
    r = requests.post(f"{BASE_URL}/staff/voice", json={"text": "Margaret looks dizzy"}, timeout=T).json()
    CREATED["incidents"].append(r["id"])
    try:
        assert r["kind"] == "guest" and r.get("guest_name") == "Margaret Hughes" and r["protocol"]
    finally:
        for a in mdb.alerts.find({"type": "incident", "code": marg["code"]}, {"id": 1}):
            CREATED["alerts"].append(a["id"])
        mdb.bookings.update_one({"code": marg["code"]}, {"$set": before})


def test_voice_bath_temp():
    bath = mdb.baths.find_one({"id": "rotenburo"})
    codes = [b["code"] for b in mdb.bookings.find({"bath_id": "rotenburo"}, {"code": 1})]
    pre = {a["id"] for a in mdb.alerts.find({"code": {"$in": codes}}, {"id": 1})}
    r = requests.post(f"{BASE_URL}/staff/voice", json={"text": "Rotenburo is 42 degrees right now"}, timeout=T).json()
    CREATED["incidents"].append(r["id"])
    try:
        assert r["kind"] == "bath" and r["bath_id"] == "rotenburo" and float(r["temp_c"]) == 42
        assert mdb.baths.find_one({"id": "rotenburo"})["current_temp"] == 42
        assert "rechecked" in r and r["protocol"]
    finally:
        for a in mdb.alerts.find({"code": {"$in": codes}}, {"id": 1}):
            if a["id"] not in pre:
                CREATED["alerts"].append(a["id"])
        mdb.baths.update_one({"id": "rotenburo"}, {"$set": {"current_temp": bath["current_temp"]}})


def test_ships_news():
    s = requests.get(f"{BASE_URL}/ships", timeout=T).json()
    assert len(s["seed"]) >= 1
    n = requests.get(f"{BASE_URL}/news", timeout=T)
    assert n.status_code == 200


# ---------- demo (state snapshotted + restored, no reset) ----------
def test_demo_speed_and_heat_spike():
    demo0 = mdb.demo.find_one({"id": "demo"}, {"_id": 0})
    snap = {b["code"]: {k: b.get(k) for k in ("limits", "heat_version", "red_flag_ids", "phase_base_s", "phase_started_at")} for b in mdb.bookings.find({})}
    rx_snap = {p["id"]: p.get("rx_spike") for p in mdb.prescriptions.find({}, {"id": 1, "rx_spike": 1})}
    pre_alerts = {a["id"] for a in mdb.alerts.find({}, {"id": 1})}
    try:
        assert requests.post(f"{BASE_URL}/demo/speed", json={"fast": True}, timeout=T).json()["speed"] == 10
        assert requests.post(f"{BASE_URL}/demo/speed", json={"fast": False}, timeout=T).json()["speed"] == 1
        r = requests.post(f"{BASE_URL}/demo/heat-spike", timeout=T).json()
        assert r["heat_index"] == 46 and len(r["changed"]) >= 5
        assert all(c["to"] <= c["from"] for c in r["changed"])
        assert requests.get(f"{BASE_URL}/conditions", timeout=T).json()["heat_index"] == 46
        rx = make_rx(base_profile(age=40))
        assert rx["rx"]["bath"]["indoor"] and rx["rx"]["bath"]["gentle"]
        board = requests.get(f"{BASE_URL}/staff/board", timeout=T).json()
        assert any("Heat index spiked to 46" in a["message"] for a in board["alerts"])
    finally:
        mdb.demo.replace_one({"id": "demo"}, demo0, upsert=True)
        for code, s in snap.items():
            mdb.bookings.update_one({"code": code}, {"$set": s})
        for pid, v in rx_snap.items():
            mdb.prescriptions.update_one({"id": pid}, {"$set": {"rx_spike": v}} if v else {"$unset": {"rx_spike": ""}})
        for a in mdb.alerts.find({}, {"id": 1}):
            if a["id"] not in pre_alerts:
                CREATED["alerts"].append(a["id"])
