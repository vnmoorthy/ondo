# Intake reliability: five persona presets instant + non-preset LLM/fallback
import os, time, pytest, requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")

PERSONAS = {
    "margaret": ("I'm Margaret, 71, from Sydney, on the Navigator of the Seas. I take metoprolol for my blood pressure and I put a seasickness patch on this morning. I'd love a long hot soak.", "Margaret"),
    "tanaka": ("田中です。68歳です。ワーファリンと降圧剤を飲んでいます。温泉は大好きです。", "田中"),
    "priya": ("I'm Priya, 20 weeks pregnant, vegetarian, travelling with my husband. Is the onsen safe for me?", "Priya"),
    "david": ("Had three beers on the ship's drinks package, slept badly, want the hottest bath you have.", "David"),
    "chen": ("我们一家四口，孩子六岁，第一次泡温泉。", "陈家 (Chen family)"),
}


@pytest.mark.parametrize("key", list(PERSONAS))
def test_preset_intake_instant(key):
    text, name = PERSONAS[key]
    t = time.time()
    r = requests.post(f"{BASE_URL}/api/intake", json={"text": text}, timeout=30)
    dt = time.time() - t
    assert r.status_code == 200
    p = r.json()["profile"]
    assert p["name"] == name
    assert dt < 1.5, f"{key} took {dt:.2f}s"
    if key == "david":
        assert p["age"] == 52 and p["factors"]["alcohol_drinks_3h"] == 3 and p["factors"]["poor_sleep"] is True
    if key == "priya":
        assert p["pregnancy_weeks"] == 20
    if key == "chen":
        assert p["children_ages"] == [6]


def test_non_preset_bob():
    r = requests.post(f"{BASE_URL}/api/intake", json={"text": "I'm Bob, 70 years old, I take metoprolol and a seasickness patch, had two beers and slept badly"}, timeout=90)
    assert r.status_code == 200
    p = r.json()["profile"]
    print(p)
    assert p["name"] == "Bob" and p["age"] == 70
    gens = {(m.get("generic") or "").lower() for m in p["medications"]}
    assert "metoprolol" in gens and "scopolamine" in gens
    assert p["factors"]["alcohol_drinks_3h"] == 2 and p["factors"]["poor_sleep"] is True


def test_fallback_parser_unit():
    import sys
    sys.path.insert(0, "/app/backend")
    from llm import fallback_profile
    p = fallback_profile("I'm Bob, 70 years old, I take metoprolol and a seasickness patch, had two beers and slept badly")
    assert p.name == "Bob" and p.age == 70
    assert {m.generic for m in p.medications} == {"metoprolol", "scopolamine"}
    assert p.factors.alcohol_drinks_3h == 2 and p.factors.poor_sleep
    p2 = fallback_profile("I am Ana, 30 weeks pregnant, on insulin and warfarin")
    assert p2.pregnancy_weeks == 30 and {"insulin", "warfarin"} <= {m.generic for m in p2.medications}
