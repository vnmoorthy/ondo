# Ondo (温度): concept brief (source of truth for the deck, README and storyboard)

## One line
**Ondo is the AI that makes heat safe for every body.** First product: the heat-safety host for **Yu Pinang Onsen** in
Penang. Cruise passengers just talk, in any language, about who they are, how they feel and the medicines they take.
Ondo checks Penang's live heat with You.com and runs a deterministic safety engine. Each guest gets a personal Soak
Prescription and a guided soak. The Staff Safety Console watches everyone in the water.
Tagline: **"Soak safely in Penang's heat."** Closing line: **"Make heat safe for every body."**

## Hackathon brief (drawn, no re-rolls)
"A hot springs onsen for cruise ship passengers with one day in port in Penang, Malaysia." Team V9, Speech to Ship,
Emergent HQ San Francisco, Nov 20 2026. Built on Emergent, by voice with Willow, grounded by You.com.

## The problem: heat is a silent, growing killer
- About **546,000 heat-related deaths a year** in the last decade (Lancet Countdown 2025, via PIK Potsdam).
- Heat deaths among people **over 65 were 167% higher in 2023 than in the 1990s** (Lancet Countdown 2024).
- **Japan: an estimated ~19,000 bathing-related deaths a year**, mostly people over 65, from "heat shock". The official
  advice is water under 41°C and soaks of at most 10 minutes (Consumer Affairs Agency, via nippon.com).
- Cruise passengers are the highest-risk onsen guests:
  - often older, and on blood-pressure pills, beta-blockers or diuretics;
  - many wear **scopolamine seasickness patches that stop sweating**;
  - dehydrated after days at sea and ship drinks packages;
  - they step from a 22°C ship into 34°C, humid Penang, then into a 41°C bath.
- The onsen knows none of this about its guests. It puts up a sign. Staff can't read 20 languages.

## The product (built on Emergent)
1. **Just talk.** Hold fn and speak with Willow, or tap the mic, in any language. "I'm Margaret, 71, from Sydney. I take
   metoprolol and I put a seasickness patch on this morning." The AI turns it into editable profile chips: age,
   medicines with their drug classes, conditions, today's factors, language and ship.
2. **Live heat check.** You.com Search with `knowledge: core` returns George Town's live temperature, humidity and
   heat index.
3. **Soak Prescription.** A **deterministic rules engine** (code, not the LLM) sets the bath, max °C, minutes per round,
   rounds, cool-downs and water. A risk dial runs green, amber or red. Red-flag cards carry **cited evidence from the
   You.com Answer API**. The LLM only explains, in the guest's language.
4. **Soak Pass.** A QR code, a guided soak timer with **spoken check-ins in the guest's language**, a hydration tracker,
   an **"I feel unwell"** button that alerts staff instantly, and a health summary for the ship's doctor.
5. **Staff Safety Console.** Every guest in the water with their personal limit (time versus limit), risk colours,
   red flags and an alerts rail. A **"Say what's happening"** voice box built for Willow (staff hands are wet). A
   heat-spike simulation re-runs the engine for everyone.
6. **Ask Ondo.** Grounded answers with citations ("Can I soak after two beers?").

## The wow moment
Margaret speaks for 20 seconds and the dial swings to red: *"Your seasickness patch stops you sweating. In a 41°C bath
on a 34°C Penang day, that can cause heat stroke in minutes."* Ondo moves her to the 37.5°C Jade bath for 6 minutes,
with sources. Her name lights up on the staff console with a timer. Then a heat spike hits and every limit tightens
live. *We just prevented a heat stroke, in her language.*

## Sponsor tools: three proofs
- **Emergent:** the whole two-sided full-stack app (React + FastAPI + MongoDB, a unit-tested rules engine, Universal
  LLM key with Claude Sonnet 5.5, public `emergent.host` deploy) was built by Emergent's agent from our prompts and
  spec.
- **You.com:** live and load-bearing. Search with `knowledge: core` gives the live Penang heat index. Answer gives cited
  evidence for every red flag and every guest question. Sources are on screen, and the key stays server-side.
- **Willow:** voice is the interface. Older guests can't type drug names on a phone, but they can say them, in 100+
  languages. Staff with wet hands report incidents by voice.

## Business model
- **Venues:** per-guest SaaS for onsen, spas, saunas and thermal baths (about US$0.50–1 per guest, or a monthly plan).
  It replaces a laminated sign and a liability gap.
- **Insurers:** lower premiums for venues using Ondo (fewer incidents, an audit trail). Ondo shares that saving.
- **Cruise lines:** licensing for ship spas, medical centres and shore excursions. They know their guests' risk
  profiles.
- **Consumer and employers next:** a personal heat-safety subscription for people over 65 and their families, and
  heat-safety compliance for employers of outdoor workers.

## The trillion-dollar path (wedge → engine → category)
1. **Wedge:** one Penang onsen shows that cruise guests soak more safely, stay longer and spend more.
2. **Thermal venues worldwide:** Japan's ~27,000 onsen facilities, saunas, spas and thermal baths, plus cruise-ship
   spas.
3. **Personal heat safety:** the same engine tells anyone what their body can take today: older adults, outdoor
   workers, athletes, travellers. Billions now live through dangerous heat every year.
4. **Category:** the health layer of climate adaptation, at the meeting point of the ~US$6T+ wellness economy, health
   insurance and climate resilience.

## How we chose it
- 30 ideas were scored by a simulated panel of about 70 agents modelled on this event's judges (Emergent, Willow,
  You.com, Bond AI, plus VC, design and voice-AI archetypes), alongside 12 cruise-passenger personas and a red team.
- Ondo grows out of **SoakRx** (finals #3, 3.89/5, with the joint-highest "works live" score). Judges called its
  spoken scopolamine-patch catch a "gasp moment" and "real empathy". Their critique ("put the onsen and staff side front
  and centre, let rules decide and the LLM explain") shaped Ondo directly.

## Brand
- Name **Ondo** (温度, "temperature"). Venue **Yu Pinang Onsen**.
- Palette: ink `#101418`, steam white `#F7F5F2`, deep teal `#0E3B43`, jade `#2FA58F` (safe), amber `#E9A23B`
  (caution), vermilion `#E2483D` (danger). The temperature gradient jade → amber → vermilion is the motif.
- Fonts: Fraunces (display), Inter (UI).
