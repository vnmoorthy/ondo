import sys
sys.path.insert(0, "/app/backend")
from rules import run_engine  # noqa: E402


def prof(**kw):
    base = {"age": 40, "medications": [], "conditions": [], "factors": {}, "children_ages": []}
    base.update(kw)
    return base


def test_baseline_green():
    rx = run_engine(prof(), 33)
    assert rx["max_temp"] == 41 and rx["max_minutes"] == 10 and rx["rounds"] == 3 and rx["risk_level"] == "green"
    assert rx["bath"]["id"] == "hinoki"


def test_margaret_red():
    rx = run_engine(prof(age=71, medications=[{"name": "metoprolol"}, {"name": "seasickness patch", "generic": "scopolamine"}]), 41)
    assert rx["risk_level"] == "red" and rx["max_temp"] == 37 and rx["max_minutes"] == 4 and rx["rounds"] == 2
    assert {"age_65", "anticholinergic", "beta_blocker", "heat_40"} <= {f["id"] for f in rx["red_flags"]}


def test_alcohol_heavy_footbath():
    rx = run_engine(prof(age=52, factors={"alcohol_drinks_3h": 3, "poor_sleep": True}), 41)
    assert rx["risk_level"] == "red" and rx["bath"]["id"] == "footbath"


def test_pregnancy_private():
    rx = run_engine(prof(age=33, pregnancy_weeks=20), 33)
    assert rx["bath"]["id"] == "family" and rx["max_temp"] == 37.5 and rx["rounds"] == 2


def test_first_trimester_red():
    assert run_engine(prof(pregnancy_weeks=8), 33)["risk_level"] == "red"


def test_heat_45_indoor_gentle():
    rx = run_engine(prof(age=45), 46)
    assert rx["bath"]["gentle"] and rx["bath"]["indoor"]


def test_children():
    rx = run_engine(prof(children_ages=[6]), 33)
    assert rx["max_temp"] == 38 and rx["max_minutes"] == 5
