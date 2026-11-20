# Ondo: 10-minute live demo script

**Team V9 · Speech to Ship · Emergent HQ, San Francisco · Nov 20 2026**
Guest app: **https://heat-safe-onsen.emergent.host** · Staff console: **https://heat-safe-onsen.emergent.host/staff** · Repo: https://github.com/vnmoorthy/ondo

This is the long-form demo for a judging table or booth, run almost entirely in the live product. It shows four guests
whose profiles trigger different rules, a judge joining from their own phone, cited answers, an emergency alert, staff
voice reporting, a heat spike, and how Emergent built it. The short pitch is in `STORYBOARD.md`.

**Framing:** Ondo gives safety guidance, not medical advice. The numbers come from a deterministic rules engine
(code). The LLM only extracts, explains and translates. Staff confirm before any red-risk soak.

**Golden rule on stage:** read every number off the screen. The engine decides, and live heat can tighten limits. Don't
quote numbers from memory.

---

## Setup (before the judges arrive)

| Item | Detail |
|---|---|
| Laptop tabs | Tab 1: `https://heat-safe-onsen.emergent.host` (guest). Tab 2: `https://heat-safe-onsen.emergent.host/staff` (staff). Tab 3: the GitHub repo, open at the README architecture diagram. |
| Demo drawer | **Reset demo**, then **fast-forward (10×) on**. |
| Cache warm-up | Run Margaret, Mr. Tanaka, Priya and David once each within 10 minutes of starting (You.com answers cache for 10 minutes), then Reset demo. |
| Willow | Running, mic checked, fn tested in both text boxes (guest "Just talk" and staff "Say what's happening"). |
| Voices | The browser has an English voice and a **Japanese (ja-JP) voice** installed for spoken check-ins. Test once. |
| Phone | Your own phone open on the staff console as a second screen, if useful. Hotspot ready. |
| Backup | Screenshots and a screen recording of each step, local, in case the network fails (see STORYBOARD.md). |

---

## Minute by minute

### 0:00–1:00 · Why this exists (landing page)
**Screen:** Tab 1 landing. Hero "Soak safely in Penang's heat.", the George Town heat-index chip ("Live · You.com"),
and the "Why Ondo" strip.

**Say:**
> "Today a Royal Caribbean ship, Navigator of the Seas, is in Penang with about four thousand guests. Many are over
> sixty-five, on blood-pressure pills, wearing seasickness patches that stop sweating, and dried out from days at sea.
> They walk from a 22-degree ship into 34-degree humid Penang, then into a 41-degree hot spring. Heat kills about
> 546,000 people a year. In Japan alone, about 19,000 people a year die in the bath. The onsen's only tool today is a
> sign. Ondo is the heat-safety host that talks to every guest in their own language and gives staff a live view of
> everyone in the water."

**Do:** point to the heat chip. "That number is George Town right now, from You.com Search." Hover over a source link
on the stats strip.

### 1:00–2:30 · Margaret, in English, by voice (the core loop)
**Do:** click into the Just-talk box, hold **fn** and dictate:
> "I'm Margaret, 71, from Sydney. I take metoprolol for my blood pressure and I put a seasickness patch on this
> morning. I'd love a long hot soak."

**Point out, in order:**
1. **Step labels, no silent spinner:** "Reading your medicines…", "Checking Penang's heat on You.com…".
2. **Editable chips:** age 71, metoprolol → beta-blocker, seasickness patch → scopolamine (anticholinergic), ship.
   "This is the read-back. If Willow mishears a drug name, she fixes it here, before any number exists." Tap
   **Looks right**.
3. **Risk dial swings red.** Read the red-flag card aloud. Hover over the **You.com citation chips** and open one in a
   new tab to show it's a real source.
4. **The prescription card:** bath, max °C, minutes per round, rounds, cool-down, water. "Three rules stacked:
   age 65–74, beta-blocker, scopolamine. Plus a live-heat rule, because today's heat index is above 40. The most
   restrictive limit wins. Red means a gentle bath only, and staff confirm before she gets in."
5. The **"Not medical advice; staff will check on you"** note.

**Do:** tap **Book this soak**, pick a slot, and land on the Soak Pass (code like `OND-7K2Q`).

### 2:30–3:15 · The Soak Pass
**Point out:** the QR code, the ship line ("Navigator of the Seas · all aboard 20:30 · leave the onsen by 18:45"), and
the prescription summary.

**Do:** press **Start**. With fast-forward on, the round counts down and the spoken check-in plays:
> "Margaret, two minutes left. Sit up slowly before you stand."

Tap the **hydration tracker** once ("she's had a glass"). Open **Health summary for the ship's doctor**: "English plus
her language, ready to hand over."

**Say:** "She can't type drug names on a phone. She can say them. And Ondo talks back, so she doesn't need to watch a
screen in the water."

### 3:15–4:15 · Mr. Tanaka, in Japanese, via Willow
**Do:** go back to the landing page. Hold **fn** and dictate in Japanese (or tap the Mr. Tanaka persona chip if you
don't speak Japanese):
> 田中です。68歳です。ワーファリンと降圧剤を飲んでいます。温泉は大好きです。
> *(Tanaka desu. Rokujū-hassai desu. Wāfarin to kōatsuzai o nonde imasu. Onsen wa daisuki desu.)*
> "I'm Tanaka, 68. I take warfarin and blood-pressure medicine. I love onsen."

**Point out:**
- The chips: warfarin → anticoagulant, blood-pressure medicine → its class, language Japanese.
- The explanation and red-flag text are **in Japanese**. "The engine's numbers are the same in every language. Only
  the words are translated."
- A different rule fired: **anticoagulant → handrails and slip care.** Read the dial colour off the screen (expect
  amber, not red: same age band as Margaret, no patch).
- Book quickly, press Start, and let one **spoken check-in play in Japanese**.

**Say:** "Willow handles a hundred-plus languages. The staff don't need to."

### 4:15–5:15 · Priya and David: different bodies, different rules
**Priya (tap her persona chip):** "I'm Priya, 20 weeks pregnant, vegetarian, travelling with my husband. Is the onsen
safe for me?"
- The pregnancy rule: max 37.5°C (before the live-heat adjustment), 2 rounds, and the **private family bath**.
- **Say:** "Second trimester, so guidance and a private bath. If she'd said ten weeks, the first-trimester rule turns it
  red: no hot bath today."

**David (tap his persona chip):** "Had three beers on the ship's drinks package, slept badly, want the hottest bath you
have."
- 3+ drinks → **red: no hot bath today, foot bath only.** Poor sleep adds water.
- **Say:** "David takes no medicines at all, and he's still red. Ondo isn't just for people on pills. Heat, alcohol and
  sleep matter to everyone."

### 5:15–6:00 · A judge joins from their phone
**Do:** switch to Tab 2 (staff console). Point to the **QR code** on the console. Hand a judge the room:
> "Scan that. Make up a guest, any age, any language, any medicines. Please don't use your real health details."

While they talk to it, narrate the board: each seeded guest's **time in water versus personal limit**, risk colours,
red-flag tags (patch, beta-blocker…), next check-in due, and the KPIs (guests today, heat risks caught, red flags by
type, incidents).

**Payoff:** the judge's guest **appears on the board within 3 seconds** of booking. "That's you, on the staff side, live."

### 6:00–6:45 · Ask Ondo, with citations
**Do:** on Margaret's pass (or the judge's phone), open **Ask Ondo** and ask by voice or text:
> "Can I soak after two beers?"

**Point out:** a You.com Answer with **numbered citation chips** that link out, in the guest's language. Then invite a
judge: "Ask it anything about soaking safely." (A good second question, if rehearsed: "Is it safe with my patch?")

**Say:** "The question goes to You.com live. If it's slow, you'll see a Cached badge, never a blank."

### 6:45–7:30 · "I feel unwell" → staff alert
**Do:** on Margaret's pass, press the big **I feel unwell** button.

**Point out:**
- The guest sees calm steps in her language: get out slowly, sit, sip water, staff are coming.
- Switch to Tab 2: the **alerts rail** shows Margaret's alert at the top, with her red flags, so staff know about the
  patch before they reach her. Press **Acknowledge**.

**Say:** "One button. Staff know who she is, where she is and what she's taking, before they get to the water."

### 7:30–8:15 · Staff "Say what's happening", by voice
**Do:** in the staff console, click the **Say what's happening** box, hold **fn** and say:
> "Rotenburo is 42 degrees right now."

**Point out:** the AI turns it into an incident, lowers that bath's temperature reading, and **re-checks everyone in
it**. Then a second one:
> "Margaret looks dizzy."

→ Margaret is flagged and the protocol shows.

**Say:** "Staff hands are wet. They don't type. They talk."

### 8:15–9:00 · Heat-spike simulation
**Do:** open **Demo → Simulate heat spike** (heat index 46°C).

**Point out:**
- The engine **re-runs for every guest**. At a heat index of 45 or more, only indoor gentle baths are allowed. Limits
  shrink on the board, and progress bars jump because the limits are shorter.
- Alerts appear on the rail and a **spoken announcement** plays.
- KPIs update.

**Say:** "Nobody re-read a sign. Every limit in the building changed in one second, because Penang got hotter."

### 9:00–10:00 · How Emergent built it, and close
**Do:** switch to Tab 3 (repo README, architecture diagram).

**Say:**
> "We wrote a spec, the screens and a rules table, and spoke it to Emergent with Willow. Emergent's agent built the
> whole two-sided app: React, FastAPI, MongoDB, a deterministic rules engine with unit tests, the Universal LLM key
> with Claude Sonnet 5.5, and the public deploy on emergent.host. You.com is load-bearing: Search with `knowledge:
> core` for live heat, Answer for every cited red flag and question, key kept server-side, with a 10-minute cache and
> a Cached badge so it never breaks. Willow is the interface for guests who can't type drug names and staff with wet
> hands. Ondo: make heat safe for every body."

**Do:** open **Demo → Reset demo** for the next judges.

---

## Q&A prep: the 12 toughest questions

These come from the simulated judge, customer and red-team comments on SoakRx, the idea Ondo grew from (finals #3,
3.89/5). Answer in two or three sentences, then stop.

**1. "Is this medical advice?"**
No. Ondo gives heat-safety guidance for one activity, soaking, the way a lifeguard gives pool rules. It never
diagnoses or changes medication, every red-risk soak needs staff confirmation, and it says "not medical advice" on
every prescription. It also hands the guest a summary for the ship's doctor, who makes the medical calls.

**2. "What if You.com returns nothing, or is slow?"**
The safety limits never depend on it. The rules engine runs on the profile plus a heat reading. If Search times out
(12 s) or returns nothing, we use the 10-minute cache or a seeded George Town reading, and the badge says **Cached**
instead of Live. Evidence chips are pre-warmed for the common red flags, and a slow answer shows a loading step, not a
blank.

**3. "Who pays?"**
The venue, per guest (about US$0.50–1, or a monthly plan). It replaces a laminated sign and closes a liability gap.
Next come insurers, who can cut premiums for venues with fewer incidents and an audit trail (we share that saving),
and cruise lines, who license it for ship spas, medical centres and shore excursions.

**4. "Why voice? Isn't that just a mic button?"**
A 71-year-old can't type "scopolamine" on a phone in the sun, but she can say it in 20 seconds, in her own language.
Staff have wet hands and can't type an incident. Voice goes both ways: Ondo speaks check-ins back, so nobody watches a
screen in the water.

**5. "Liability: won't an onsen be scared of touching medication data?"**
The onsen already carries the liability: today it's a sign and a guess. Ondo gives the operator a documented,
consistent screening step and an audit trail of what each guest said, what rule fired and what staff confirmed. That's
a better position than nothing, and it's what insurers want to see. Positioning is a screening and safety tool, not a
clinical one.

**6. "How do you know the rules are right?"**
The baseline is Japan's official bathing guidance: water under 41°C, at most 10 minutes. The modifiers follow
documented heat-tolerance effects of drug classes (anticholinergics block sweating, beta-blockers blunt heart-rate
response, diuretics dehydrate), and each red flag shows its You.com citations. The rules are a readable table in code,
unit-tested, and the most restrictive rule always wins. To be honest, no clinician or onsen operator has reviewed them
yet; that review is the first step before real guests.

**7. "Can the LLM hallucinate a limit?"**
No. The LLM never sets a number. It extracts a profile, which we validate with Pydantic, and it writes the
explanation. The bath, °C, minutes, rounds and risk score come only from `rules.py`. The same profile and heat always
give the same prescription.

**8. "What if Willow mishears a drug name?"**
Everything spoken becomes editable chips with the generic name and drug class, and the guest taps "Looks right" before
any prescription exists. That read-back is the safety check. If a drug can't be matched to a class, the engine doesn't
guess. Ask Ondo can return cited evidence on it, and staff can review.

**9. "Is the live data actually live, or pre-cached for the demo?"**
It's live with a 10-minute cache, and the badge tells you which. We pre-warm the demo questions so the stage moment
isn't slowed down by latency, but Ask Ondo takes any question you type, live. Try it now.

**10. "What about privacy? Medication data, a cloud LLM, voice recordings."**
The You.com key and all AI calls stay server-side, and the browser never sees a key. In the demo, a profile exists to
power one day's Soak Pass. For production, the plan is explicit consent at intake, the shortest retention we can manage
(the guest leaves on the ship that night) and deletion on request. We'd rather store less.

**11. "Most guests are healthy and take no meds. Why would they care?"**
David takes no medicines and still goes red: three beers and a bad night's sleep. Live heat tightens everyone's
limits, children under 7 get their own limits, and the staff console covers every guest in the water, not just the
ones on medication. Penang's heat affects every body.

**12. "Isn't this a feature, not a company? What's the trillion-dollar part?"**
The wedge is one Penang onsen. The engine, "what can this body take in this heat, today", travels to Japan's ~27,000
onsen facilities, saunas, spas and cruise-ship spas, then to personal heat safety for older adults, outdoor workers,
athletes and travellers. That's the health layer of climate adaptation, where the ~US$6T+ wellness economy, health
insurance and climate resilience meet. No traction yet. Today we're showing that it works.

### Quick answers if time allows
- **"Wheelchair access?"** There's a step-free accessible bath (38°C) in the venue's bath list, and the profile can
  capture it.
- **"How did you pick this idea?"** We scored 30 ideas against a simulated panel of about 70 agents modelled on this
  event's judges, plus 12 cruise-passenger personas and a red team. Ondo grows out of SoakRx (finals #3, 3.89/5). We
  acted on the panel's critique: put the onsen and staff side front and centre, let rules decide and let the LLM
  explain. This was simulated validation, not customer traction.
- **"What did Emergent build versus you?"** We wrote the spec and the rules table. Emergent's agent built the full
  stack, tests and deploy from it.
