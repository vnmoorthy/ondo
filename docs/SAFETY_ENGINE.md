# The Ondo safety engine

> **Rules decide. The LLM explains.**
> Every number that keeps a guest safe (bath, water temperature, minutes, rounds, cool-down, water) comes from a small, deterministic, unit-tested Python rules table in `app/backend/rules.py`. The language model understands messy speech and explains the result in the guest's language. It can never change a limit.

> [!IMPORTANT]
> **Ondo gives safety guidance, not medical advice.** It is not a medical device, it does not diagnose or treat, and it does not replace a doctor. It applies conservative limits so an onsen can keep guests safe, and onsen staff check on every guest. When in doubt, the answer is "not today", and staff confirm.

This document describes the engine as specified in [`spec/ondo-spec.md`](../spec/ondo-spec.md). If `app/backend/rules.py` and its tests ever differ from this page, **the code and its tests win**; please open a PR to bring this page back in sync.

---

## 1. Why deterministic

| Concern | Deterministic rules | An LLM deciding limits |
|---|---|---|
| Same input, same answer | Always | Not guaranteed |
| Auditable by a venue, insurer or regulator | A readable table with rule ids | A prompt and a sampled output |
| Unit-testable | Yes: one test per rule and per combination | Only statistically |
| Works offline | Yes | No |
| Can be talked into a higher limit | No | Possibly (prompt injection) |

The LLM is excellent at the parts rules are bad at: turning *"I put a seasickness patch on this morning"* into `scopolamine · anticholinergic`, writing a warm sentence in Japanese, and turning *"Rotenburo is 42 degrees right now"* into a typed incident. So each does what it is good at.

---

## 2. Inputs

**Profile** (from `POST /api/intake`, confirmed by the guest as editable chips):

| Field | Example |
|---|---|
| `name`, `age`, `language`, `home_country`, `ship`, `party` | Margaret, 71, en, Australia, Navigator of the Seas, 2 |
| `medications[]`: `as_said`, `generic`, `drug_class` | "seasickness patch" → scopolamine → anticholinergic |
| `conditions[]` | hypertension, diabetes, heart disease, heart attack in the last 6 months, epilepsy |
| `today`: `alcohol_drinks_3h`, `poor_sleep`, `seasick_or_vomited`, `sunburn`, `dehydrated` | 0, false, false, false, false |
| `pregnancy_weeks` | null or 20 |
| `children_ages[]` | [6] |
| `privacy_needs` | tattoos, modesty, companion |

**Conditions** (from `GET /api/conditions`): `heat_index_c` from You.com Search (`knowledge: "core"`), or the seeded fallback (heat index 41°C, marked `live: false`). The Demo drawer's heat spike sets it to 46°C.

**Medicine matching.** The rules match on drug class. The class comes from a deterministic generic-name dictionary first (the drugs named in the table below and their common brand names), and from the LLM's class label only when the dictionary has no entry. A medicine Ondo cannot classify is shown on its chip as "not recognised" for staff to check; it never silently lowers risk.

---

## 3. The rules table

**Baseline (every guest):** max **41°C** · **10 min** per round · **3 rounds** · **5 min** cool-down · **250 ml** water before and after each round · risk **10**.

| Rule id (suggested) | Trigger | Max °C | Max min | Rounds | Other instructions | Risk + | Red? |
|---|---|:-:|:-:|:-:|---|:-:|:-:|
| `age_65_74` | Age 65–74 | 40 | 8 | 3 | Enter slowly; no cold plunge right after; stand up slowly | 15 | |
| `age_75_plus` | Age 75+ | 39 | 6 | 2 | Staff check each round | 25 | |
| `anticholinergic` | Scopolamine patch or other anticholinergics (oxybutynin, diphenhydramine, amitriptyline) | 38 | 6 | 2 | Indoor or shaded baths only; +500 ml water | 30 | |
| `beta_blocker` | Beta-blockers (metoprolol, atenolol, bisoprolol, propranolol) | 40 | 8 | – | Stand up slowly; no cold plunge | 15 | |
| `diuretic` | Diuretics (furosemide, hydrochlorothiazide) | – | 8 | – | +500 ml water | 15 | |
| `vasodilator` | Vasodilators, nitrates, PDE5 inhibitors, ACE inhibitors / ARBs | 39 | 8 | – | No alcohol | 15 | |
| `anticoagulant` | Anticoagulants (warfarin, apixaban, rivaroxaban) | – | – | – | Handrails; slip care | 5 | |
| `diabetes` | Insulin or diabetes | 39 | 8 | – | Check glucose and eat first (neuropathy hides burns) | 15 | |
| `pregnancy` | Pregnancy | 37.5 | 10 | 2 | Private bath | 25 | First trimester: **no hot bath** |
| `heart` | Heart disease, or heart attack in the last 6 months | 37 | 5 | 1 | Doctor clearance | 40 | Heart attack < 6 months: **no bath** |
| `epilepsy` | Epilepsy | – | – | – | Never alone; private bath with a companion | 20 | |
| `alcohol_1_2` | 1–2 alcoholic drinks in the last 3 h | 39 | 6 | – | Wait 1 hour if possible | 15 | |
| `alcohol_3_plus` | 3+ drinks in the last 3 h | – | – | – | **No hot bath today; foot bath only** | 40 | **Yes** |
| `poor_sleep_seasick` | Poor sleep, or seasick / vomited today | – | 8 | – | +500 ml water | 10 | |
| `child_under_7` | Children under 7 | 38 | 5 | – | Adult supervision | 15 | |
| `heat_40` | Live heat index ≥ 40°C | −1°C on the cap | −2 min | – | Shaded or indoor baths | 10 | |
| `heat_45` | Live heat index ≥ 45°C | – | – | – | Indoor gentle baths only | 20 | |

Examples of class members beyond those the spec names (for the dictionary): nitrates such as nitroglycerin and isosorbide; PDE5 inhibitors such as sildenafil and tadalafil; ACE inhibitors such as lisinopril and ramipril; ARBs such as losartan; ワーファリン (Warfarin, its Japanese brand name).

---

## 4. How a prescription is computed

```text
limits = baseline
for rule in RULES:
    if rule.matches(profile, conditions):
        limits.max_c   = min(limits.max_c,   rule.max_c)     # most restrictive wins
        limits.minutes = min(limits.minutes, rule.minutes)
        limits.rounds  = min(limits.rounds,  rule.rounds)
        limits.water_ml_extra += rule.extra_water_ml
        limits.notes  += rule.notes
        limits.risk   += rule.risk_points
        limits.red     = limits.red or rule.is_red(profile)
        matched.append({rule.id, rule.reason, rule.evidence_query})

if heat_index >= 40:  max_c -= 1; minutes -= 2; risk += 10; notes += "shaded or indoor"
if heat_index >= 45:  risk += 20; allowed_baths = indoor gentle baths only

risk  = clamp(risk, 0, 100)                      # the dial shows 0–100
level = "red"   if red or risk > 60 else \
        "amber" if risk >= 35       else "green"
bath  = pick_bath(limits, level, profile)
```

- **Most restrictive wins.** Limits never add up; the lowest cap among matching rules applies.
- **Risk points add up.** They drive the dial and the level, not the limits.
- **Heat rules are cumulative and applied last.** At 46°C both `heat_40` and `heat_45` apply.
- **Water.** 250 ml before and after each round, plus the extra 500 ml from each matching rule that asks for it.
- **Determinism.** No randomness, no network. The function is pure, so the same profile and heat index always give the same prescription.

### Risk levels

| Level | Score | Colour | What happens |
|---|---|---|---|
| Green | below 35 | Jade `#2FA58F` | Soak per prescription |
| Amber | 35–60 | Amber `#E9A23B` | Soak per prescription; staff see the red flags on the console |
| Red | above 60, or any red rule | Vermilion `#E2483D` | Gentle bath or foot bath only; **staff confirm before soaking** |

### Picking the bath

The six baths of Yu Pinang Onsen (seed data):

| Bath | Water | Notes |
|---|---|---|
| Hinoki indoor | 41°C | Indoor cypress bath |
| Rotenburo | 40°C | Outdoor rock bath, shaded |
| Jade gentle bath | 37.5°C | The gentle bath |
| Cool plunge | 18°C | Never recommended where a rule says "no cold plunge" |
| Private family bath | 37–40°C, adjustable | Tattoo-friendly, modest, families and companions |
| Step-free accessible bath | 38°C | Accessible |

1. Remove baths a rule forbids (outdoor unshaded for `anticholinergic` and `heat_40`; everything but indoor gentle baths for `heat_45`; the cool plunge where "no cold plunge" applies).
2. If the guest needs privacy (pregnancy, epilepsy, tattoos, modesty) or is a family with young children, use the **private family bath**, set to the guest's max °C within its 37–40°C range.
3. Otherwise recommend the bath whose temperature is **closest to, but not above,** the guest's max °C.
4. If the level is **red**, only gentle options remain: the Jade bath (37.5°C) or the adjustable private bath at or below the cap, or the foot bath; a "no hot bath" or "no bath" rule means the foot bath or no soak today. Staff confirm on the console.

---

## 5. Worked examples

Computed by hand from the table above; the shipped engine's unit tests are authoritative.

### Margaret, 71, Sydney · metoprolol · scopolamine patch (the demo)

> *"I'm Margaret, 71, from Sydney. I take metoprolol for my blood pressure and I put a seasickness patch on this morning. I'd love a long hot soak."*

| Rule | Max °C | Min | Rounds | Risk |
|---|:-:|:-:|:-:|:-:|
| Baseline | 41 | 10 | 3 | 10 |
| `age_65_74` | 40 | 8 | 3 | +15 |
| `beta_blocker` (metoprolol) | 40 | 8 | – | +15 |
| `anticholinergic` (scopolamine patch) | **38** | **6** | **2** | +30 |
| **Result, heat index below 40°C** | **38** | **6** | **2** | **70 → red** |

Ondo moves her from the 41°C Hinoki bath she wanted to the **37.5°C Jade bath, 6 minutes, 2 rounds**, indoor or shaded, +500 ml water, stand up slowly, no cold plunge, staff confirm. Red-flag card: *"Your seasickness patch (scopolamine) stops you sweating. In hot water on a 34°C day your body can't cool down."* with You.com evidence chips.

How heat changes it:

| Heat index | Max °C | Min | Risk | What changes |
|---|:-:|:-:|:-:|---|
| below 40°C | 38 | 6 | 70 | Jade bath 37.5°C |
| 41°C (`heat_40`) | 37 | 4 | 80 | Cap is now below the Jade bath: the private bath set to 37°C, or the foot bath; staff confirm |
| 46°C heat spike (`heat_40` + `heat_45`) | 37 | 4 | 100 | Indoor gentle baths only; her console timer shrinks and an alert fires if she is already past 4 minutes |

### David, 52, Austin · three beers · slept badly

> *"Had three beers on the ship's drinks package, slept badly, want the hottest bath you have."*

`alcohol_3_plus` (+40, **red rule**) + `poor_sleep_seasick` (8 min, +500 ml, +10) → risk 60, **red**. **No hot bath today; foot bath only.** Ask Ondo can explain why, with sources.

### Priya, 33, Mumbai · 20 weeks pregnant

> *"I'm Priya, 20 weeks pregnant, vegetarian, travelling with my husband. Is the onsen safe for me?"*

`pregnancy` (37.5°C, 10 min, 2 rounds, private bath, +25) → risk 35, **amber**. Not first trimester, so not red. **Private family bath set to 37.5°C, 10 minutes, 2 rounds.** With a heat index ≥ 40°C: 36.5°C cap, 8 minutes, risk 45: below every hot bath, so the foot bath or a shaded rest, and staff check in.

### The Chen family · child aged 6

> *"我们一家四口，孩子六岁，第一次泡温泉。"* ("We're a family of four, our child is six, first time at an onsen.")

For the six-year-old: `child_under_7` (38°C, 5 min, adult supervision, +15) → risk 25, **green**. **Private family bath set to 38°C, 5 minutes**, with a parent. The adults each get their own prescription. The explanation is written in Mandarin.

---

## 6. Evidence: every red flag is cited

Each matched rule carries an evidence query. The backend sends it to the **You.com Answer API**, caches the answer for 10 minutes, and renders its `[[n]]` citation markers as source chips on the red-flag card. Common queries are pre-warmed at startup so the demo shows sources instantly.

Template: `How does {medication or condition} affect heat tolerance and hot bath or sauna safety?`

| Rule | `{medication or condition}` |
|---|---|
| `anticholinergic` | a scopolamine seasickness patch (and other anticholinergic medicines) |
| `beta_blocker` | beta-blockers such as metoprolol |
| `diuretic` | diuretics such as furosemide or hydrochlorothiazide |
| `vasodilator` | vasodilators, nitrates, PDE5 inhibitors or ACE inhibitors |
| `anticoagulant` | anticoagulants such as warfarin |
| `diabetes` | insulin and diabetes |
| `pregnancy` | pregnancy |
| `heart` | heart disease or a recent heart attack |
| `epilepsy` | epilepsy |
| `alcohol_1_2`, `alcohol_3_plus` | drinking alcohol before bathing |
| `poor_sleep_seasick` | poor sleep, seasickness and dehydration |
| `child_under_7` | young children |
| `age_65_74`, `age_75_plus` | being over 65 |
| `heat_40`, `heat_45` | a high outdoor heat index |

The evidence **explains** a rule; it never changes one. If You.com is slow or down, the card shows the last cached answer or a seeded evidence line with a **Cached** badge, and the limits are unchanged.

---

## 7. Testing

`app/backend/tests/` should cover, at minimum:

- the baseline for a healthy 40-year-old on a cool day;
- one test per rule (limit, risk points, notes, red flag);
- combinations: the most restrictive limit wins, risk points add up;
- the level boundaries: 34 → green, 35 → amber, 60 → amber, 61 → red; any red rule → red;
- the heat rules: 39.9°C vs 40°C, 44.9°C vs 45°C, and cumulative at 46°C;
- bath selection: privacy needs, "no cold plunge", indoor-only, caps below every hot bath;
- the four worked examples above as golden tests;
- determinism: the same input twice gives identical output.

---

## 8. Limitations

- **Guidance, not diagnosis.** The table is a conservative screening heuristic built from public guidance (for example Japan's advice of water under 41°C and soaks of at most 10 minutes) and well-known effects of medicines on heat tolerance. It has not been clinically validated, and a venue deploying it should have it reviewed by a clinician.
- **It only knows what the guest says.** Undisclosed medicines or conditions are invisible. The chips step is a read-back, but speech recognition and the LLM can still mishear a drug name.
- **Heat index comes from the web.** You.com's knowledge result reflects the nearest weather source, not the onsen's own thermometer. Staff can override a bath's temperature by voice.
- **No vital signs.** Ondo does not measure heart rate, blood pressure or core temperature.
- **Children and complex cases** get conservative limits and staff attention, not a tailored plan.
- **Unknown medicines** are flagged for staff rather than assumed safe.

## 9. Disclaimer

Ondo provides general heat-safety guidance for bathing in hot springs. It is **not medical advice** and is not a substitute for advice from a doctor or pharmacist. If you feel unwell, get out of the water slowly, sit down, drink water and tell a member of staff. In an emergency, call local emergency services (in Malaysia, dial 999).
