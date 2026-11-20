# Ondo (温度): product spec. Build exactly this.

**Brief:** a hot springs onsen for cruise ship passengers with one day in port in Penang, Malaysia.
**Product:** Ondo is the AI heat-safety host for **Yu Pinang Onsen** in Penang. Cruise passengers just talk, in any
language, about who they are, how they feel and what medicines they take. Ondo checks Penang's live heat with You.com,
runs a deterministic safety engine, and gives each guest a personal **Soak Prescription**: bath, water temperature,
minutes, rounds, cool-downs and water. Guided soaks have spoken check-ins. A **Staff Safety Console** shows every
guest in the water with a personal time limit, so no one gets heat stroke, fainting or "heat shock".
Tagline: **"Soak safely in Penang's heat."** Mission: make heat safe for every body.

## Why (show on the landing page with source links)
- About 546,000 people die from heat every year (Lancet Countdown 2025 via PIK Potsdam).
- Heat deaths among people over 65 were 167% higher in 2023 than in the 1990s (Lancet Countdown 2024).
- Japan estimates about 19,000 bathing-related deaths a year, mostly people over 65; the advice is water under 41°C and
  at most 10 minutes (Consumer Affairs Agency via nippon.com).
- Cruise passengers are the highest-risk onsen guests. They are often older and on blood-pressure pills, beta-blockers
  or diuretics. Many wear scopolamine seasickness patches, which stop sweating. Many are dehydrated after days at sea
  and drinks packages. They step off a 22°C ship into 34°C, humid Penang, then into a 41°C bath.

## Users
1. **Cruise passengers** with one day in Penang (Swettenham Pier, George Town); many are 60+, multilingual.
2. **Onsen staff** who must keep everyone safe in the water.

## Screens and flow (mobile-first, every button works)

### 1. Landing + "Just talk" intake (`/`)
- Hero: "Soak safely in Penang's heat." Show the live George Town heat index chip, labelled "Live · You.com".
- One large text area: **"Just talk: who you are, how you feel today, and any medicines. Hold fn and speak with
  Willow, or tap the mic."** Include a mic button using the browser Web Speech API as a fallback, with a visible
  listening state. Typing also works.
- Example persona chips that fill the box (multilingual on purpose):
  - Margaret, 71, Sydney, Navigator of the Seas: "I'm Margaret, 71, from Sydney. I take metoprolol for my blood
    pressure and I put a seasickness patch on this morning. I'd love a long hot soak."
  - Mr. Tanaka, 68, Osaka (Japanese): "田中です。68歳です。ワーファリンと降圧剤を飲んでいます。温泉は大好きです。"
  - Priya, 33, Mumbai: "I'm Priya, 20 weeks pregnant, vegetarian, travelling with my husband. Is the onsen safe for me?"
  - David, 52, Austin: "Had three beers on the ship's drinks package, slept badly, want the hottest bath you have."
  - Chen family (Mandarin): "我们一家四口，孩子六岁，第一次泡温泉。"
- A "Why Ondo" strip with the three statistics above and source links.
- On submit, `POST /api/intake {text}` → the LLM returns a structured profile: name, age, language (reply in it),
  home country, ship name, party, medications (as said, plus generic name and class), conditions, today's factors
  (alcohol drinks in the last 3 h, poor sleep, seasickness, sunburn, dehydration), pregnancy weeks, children's ages.
  Show it as **editable chips** with a "Looks right" button.

### 2. Soak Prescription (`/prescription/:id`)
- `GET /api/conditions` → You.com Search with `knowledge: "core"` for live George Town temperature, humidity and heat
  index (seeded fallback: 33°C, 75% RH, heat index 41°C, labelled "cached").
- `POST /api/prescription {profile}` runs the **deterministic Python rules engine** below. The LLM must never change the
  numbers; it only writes the warm explanation in the guest's language.
- UI:
  - Big **risk dial** (green / amber / red, score 0–100).
  - The prescription card: recommended bath, max water °C, minutes per round, rounds, cool-down minutes, water ml.
  - **Red-flag cards**, each with a plain-language reason, for example: "Your seasickness patch (scopolamine) stops you
    sweating. In hot water on a 34°C day your body can't cool down."
  - Each red flag has **evidence chips from You.com Answer** with citations.
  - A "Not medical advice; staff will check on you" note.
  - "Book this soak" button.

### 3. Book + Soak Pass (`/pass/:code`)
- Baths (seed): Hinoki indoor 41°C; Rotenburo outdoor rock bath 40°C (shaded); Jade gentle bath 37.5°C; Cool plunge
  18°C; Private family bath 37–40°C adjustable (tattoo-friendly, modest); Step-free accessible bath 38°C.
- Slots every 30 minutes, 13:00–19:00, with capacity. `POST /api/bookings` → code like `OND-7K2Q`.
- Pass page:
  - QR code of the pass URL and the prescription summary.
  - A small ship line ("Navigator of the Seas · all aboard 20:30 · leave the onsen by 18:45").
  - **Guided soak timer**: Start → per-round countdown → cool-down countdown. Spoken check-ins use browser
    speechSynthesis in the guest's language ("Margaret, two minutes left. Sit up slowly before you stand.").
  - A hydration tracker.
  - A big **"I feel unwell"** button. It alerts staff instantly and shows calm steps in the guest's language: get out
    slowly, sit, sip water, staff are coming.
  - "Health summary for the ship's doctor" (generated, in English plus the guest's language).

### 4. Staff Safety Console (`/staff`)
- Live board (auto-refresh every 3 s) of guests in the water: name, flag, bath, time in water versus personal limit
  (progress bar), risk colour, red flags (patch, beta-blocker…), next check-in due.
- An alerts rail with an acknowledge button for limit reached, "I feel unwell", and heat-index spikes.
- **"Say what's happening"** voice box, built for Willow dictation, with a mic fallback. For example: "Margaret looks
  dizzy" or "Rotenburo is 42 degrees right now." The LLM turns it into an incident: flag the guest and show the
  protocol, or lower that bath's temperature and re-check everyone in it.
- A live-conditions panel (You.com heat index) and today's ships in Penang (You.com Search plus seed).
- Impact KPIs: guests today, heat risks caught, red flags by type, incidents.
- A QR code linking to the guest app so judges can join from their phones; their guest appears within 3 seconds.
- Seed about 10 guests currently soaking, with mixed risk levels.

### 5. Demo controls (small "Demo" drawer on pass and staff pages)
- A fast-forward toggle (timers run 10× faster).
- "Simulate heat spike" (heat index 46°C): re-run the engine for everyone, lower limits, show alerts and spoken
  announcements.
- "Reset demo".

### 6. Ask anything, grounded
- On the prescription and pass pages, "Ask Ondo" (voice or text) → `POST /api/ask` → You.com Answer with citations,
  translated to the guest's language. Examples: "Can I soak after two beers?", "Is it safe with my patch?"

## Deterministic safety engine (backend/rules.py; unit-test it)
Baseline: max 41°C, 10 minutes per round, 3 rounds, 5-minute cool-down, 250 ml water before and after each round, risk
score 10. Then apply the most restrictive limit from every rule that matches, add the risk points, and record the
rule id, reason and You.com evidence query:

| Trigger | Max °C | Max min | Rounds | Other | Risk + |
|---|---|---|---|---|---|
| Age 65–74 | 40 | 8 | 3 | enter slowly, no cold plunge right after, stand up slowly | 15 |
| Age 75+ | 39 | 6 | 2 | staff check each round | 25 |
| Scopolamine patch or other anticholinergics (oxybutynin, diphenhydramine, amitriptyline) | 38 | 6 | 2 | indoor or shaded only, +500 ml water | 30 |
| Beta-blockers (metoprolol, atenolol, bisoprolol, propranolol) | 40 | 8 | – | stand up slowly, no cold plunge | 15 |
| Diuretics (furosemide, hydrochlorothiazide) | – | 8 | – | +500 ml water | 15 |
| Vasodilators, nitrates, PDE5 inhibitors, ACE inhibitors / ARBs | 39 | 8 | – | no alcohol | 15 |
| Anticoagulants (warfarin, apixaban, rivaroxaban) | – | – | – | handrails, slip care | 5 |
| Insulin or diabetes | 39 | 8 | – | check glucose and eat first (neuropathy hides burns) | 15 |
| Pregnancy | 37.5 | 10 | 2 | private bath; first trimester: no hot bath (red) | 25 |
| Heart disease or heart attack in the last 6 months | 37 | 5 | 1 | doctor clearance; heart attack in the last 6 months: no bath (red) | 40 |
| Epilepsy | – | – | – | never alone, private bath with companion | 20 |
| Alcohol: 1–2 drinks in the last 3 h | 39 | 6 | – | wait 1 hour if possible | 15 |
| Alcohol: 3+ drinks | no hot bath today, foot bath only (red) | | | | 40 |
| Poor sleep or seasick / vomited today | – | 8 | – | +500 ml water | 10 |
| Children under 7 | 38 | 5 | – | adult supervision | 15 |
| Heat index ≥ 40°C (live) | −1°C on everyone's cap | −2 min | – | shaded or indoor | 10 |
| Heat index ≥ 45°C | indoor gentle baths only | | | | 20 |

Risk level: score below 35 is green, 35–60 is amber, above 60 or any "red" rule is red. Red means only the gentle bath
or foot bath, and staff must confirm before soaking. Recommend the bath whose temperature is closest to (but not
above) the max °C, honouring privacy needs (private family bath for pregnancy, epilepsy, tattoos, or modesty requests).

## Tech
- React + FastAPI + MongoDB.
- The Emergent Universal LLM key (Claude Sonnet 5.5) handles extraction, explanation, translation and staff incident
  parsing. Validate the LLM's JSON output with Pydantic.
- You.com: see `youcom-api-spec.md`. Calls are server-side only and cached for 10 minutes, with seeded fallbacks and
  a "Live" or "Cached" badge.
- Keep the key in the secret `YDC_API_KEY`. Send `X-API-Key` and an explicit `User-Agent` on every call.

## Design
- Calm, premium and warm. Ink `#101418`, steam white `#F7F5F2`, deep teal `#0E3B43`, jade (safe) `#2FA58F`, amber
  (caution) `#E9A23B`, vermilion (danger) `#E2483D`.
- A temperature gradient (jade → amber → vermilion) is the visual motif: risk dial, timers, bath cards. Add a subtle
  rising-steam hero animation.
- Fonts: Fraunces for headings, Inter for UI.
- Large type and tap targets for older guests. High contrast. No silent spinners: show steps like "Checking Penang's
  heat on You.com…" and "Reading your medicines…".

## Non-negotiables
- No dead buttons; data persists in MongoDB.
- Graceful fallbacks so the demo never breaks.
- Before finishing, test the whole loop: talk → chips → prescription with red flags and citations → book → pass → timer
  with spoken check-ins → "I feel unwell" → the staff console shows the guest and the alert → a staff voice incident →
  heat-spike simulation.
