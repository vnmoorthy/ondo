# Ondo: 3-minute storyboard

**Team V9 · Speech to Ship · Emergent HQ, San Francisco · Nov 20 2026**
Deck: 10 slides. Live app: **https://heat-safe-onsen.emergent.host** (staff console: **https://heat-safe-onsen.emergent.host/staff**). Repo: https://github.com/vnmoorthy/ondo

The talk runs 3:00 with a 70-second live product moment in the middle (1:07 to 2:17). Spoken text is about 430 words,
which is roughly 145 words a minute: calm, not rushed. The last words of the talk are **"Make heat safe for every body."**

Framing rule for every sentence: Ondo gives **safety guidance, not medical advice**. Say "guidance", "limits" and
"staff confirm". Never say "diagnose" or "treat".

---

## Pre-show checklist (T minus 10 minutes)

1. **Two browser tabs on the presenting laptop.** Tab 1: guest app at `https://heat-safe-onsen.emergent.host`, cursor in the "Just talk" box.
   Tab 2: staff console at `https://heat-safe-onsen.emergent.host/staff`.
2. **Demo drawer:** press **Reset demo**, then turn **fast-forward (10×)** on, so the spoken check-in fires within
   seconds of pressing Start.
3. **Warm the cache.** Run Margaret once end to end within 10 minutes of going on stage. You.com results are cached for
   10 minutes, so her heat reading and red-flag citations come back instantly. Then Reset demo again.
4. **Willow:** running, signed in, with the microphone set to the laptop or lapel mic. Hold fn in the text box once to
   test it. Optional: add `metoprolol` and `scopolamine` to Willow's custom dictionary.
5. **Sound:** laptop volume about 70%, with sound routed to the room so the spoken check-in is audible. Browser speech
   voice works (test by pressing Start on any pass).
6. **Network:** venue Wi-Fi plus a phone hotspot ready to switch to.
7. **Backup assets open in a hidden window** (see the backup plan): six screenshots and a 70-second screen recording
   of the full live loop.
8. **Clicker:** deck on slide 1, presenter view showing the next slide. Every slide's entrance animations play on their
   own after the transition, so one click per slide is all you need.
9. **Deck with the live link.** Rebuild the deck once the app URL is known so slide 10 shows the real host and a QR
   code: `LIVE_URL=https://<app>.emergent.host NODE_PATH=<deps> node deck/build_deck.js && python3 deck/add_motion.py deck/Ondo-Pitch.pptx`.

---

## The beats

| Time | Slide | On screen | Say (exact words) | Live action |
|---|---|---|---|---|
| **0:00–0:15** | 1 Title | Slide 1 already up: the 22°C → 34°C → 41°C dial with steam, "Ondo 温度" | "This morning, a seventy-one-year-old named Margaret stepped off a cruise ship into Penang. Behind her ear is a seasickness patch. It stops her sweating. Her next stop is a forty-one-degree hot spring. Nobody there knows." | Stand still. Point to the dial's 41°C end on "forty-one-degree hot spring". Pause one beat after "Nobody there knows." |
| **0:15–0:30** | 1 Title | "The AI that makes heat safe for every body" · Yu Pinang Onsen · "Built on Emergent · by voice with Willow · grounded by You.com" | "We're Team V9, and this is Ondo, Japanese for temperature: the AI heat-safety host for Yu Pinang Onsen. Emergent built the entire two-sided app, Willow is how guests and staff talk to it, and You.com feeds it live Penang heat and cited evidence." | Gesture to the sponsor line as you name each one. Click. |
| **0:30–0:43** | 2 The silent killer | Three big numbers with sources | "Heat is a silent killer. About 546,000 people die from heat every year. Heat deaths in people over sixty-five are up 167 percent since the 1990s. And Japan estimates about 19,000 bathing deaths a year, mostly older people." | The three cards rise in one by one; let them land. Do not read the sources aloud; they're on the slide. Click. |
| **0:43–0:55** | 3 Why cruise passengers | Ship 22°C → Penang 34°C → bath 41°C gradient | "Cruise passengers are the riskiest guests an onsen gets. Often older. On blood-pressure pills. Wearing patches that stop sweating. Dried out from days at sea. They walk from a 22-degree ship into 34-degree Penang, then into a 41-degree bath." | Point along the jade → amber → vermilion gradient as you say each temperature. Click. |
| **0:55–1:03** | 4 Margaret + staff | Split: Margaret, and staff at the water's edge | "The onsen knows none of this. It has a sign, and staff who can't read twenty languages. Ondo looks after both sides: Margaret, and the people watching the water." | Click. |
| **1:03–1:07** | 5 Product flow | Talk → Heat check → Prescription → Soak Pass → Staff console | "Talk, check, prescribe, soak, watch. Let me show you, live." | Switch the display to the laptop, Tab 1 (guest app). |
| **1:07–1:20** | LIVE | `https://heat-safe-onsen.emergent.host`: landing, "Live · You.com" heat chip, Just-talk box | "I'm Margaret." *(hold fn and speak in a natural voice:)* **"I'm Margaret, 71, from Sydney. I take metoprolol for my blood pressure and I put a seasickness patch on this morning. I'd love a long hot soak."** | Hold **fn** with the cursor in the box and dictate with Willow. Release fn. Press submit. The step labels show ("Reading your medicines…"). |
| **1:20–1:28** | LIVE | Editable profile chips | "She just talked. Ondo pulled out her age, metoprolol as a beta-blocker, and the patch: scopolamine. Everything is editable. She taps 'Looks right'." | Point to the scopolamine chip. Tap **Looks right**. |
| **1:28–1:48** | LIVE | Prescription: George Town heat index ("Live · You.com"), the dial swings to **red**, the scopolamine red-flag card with citation chips | "Ondo checks Penang's heat right now on You.com. Then a rules engine, code not the AI, sets the numbers. Red. *'Your seasickness patch stops you sweating. In a 41-degree bath on a 34-degree day, that can cause heat stroke in minutes.'* Every red flag carries its sources. It moves her to a gentle, cooler bath with short rounds, and staff confirm before she gets in." | Point to the heat chip, then the dial, then hover over a citation chip. Read the red-flag line from the screen. Read the bath and minutes from the card, not from memory. |
| **1:48–1:58** | LIVE | Book → Soak Pass: QR, ship line "Navigator of the Seas · all aboard 20:30 · leave the onsen by 18:45", timer | "She books. Her Soak Pass knows her ship sails tonight. She presses start, and Ondo talks to her." *(check-in plays: "Margaret, two minutes left. Sit up slowly before you stand.")* | Tap **Book this soak**, then **Start**. Fast-forward is already on, so the spoken check-in plays in a few seconds. Stay quiet while it speaks. |
| **1:58–2:17** | LIVE | Tab 2: Staff Safety Console. Margaret is on the board with her own timer versus her limit, red flags, then the heat spike | "On the staff side, Margaret is already here, with her own limit, not the sign's. Now Penang heats up: heat index 46." *(click)* "Every guest's limit tightens, at once, and staff hear it." | Switch to Tab 2. Point to Margaret's row and progress bar. Open **Demo → Simulate heat spike**. Let the alerts rail light up and the announcement play. Switch the display back to the deck. |
| **2:17–2:24** | 6 The wow | Phone mock (red dial, scopolamine red flag, Jade bath 37.5°C · 6 min) beside the staff console; heat-index-46 callout | "Twenty seconds of talking. A heat stroke prevented, in her language." | Click. |
| **2:24–2:33** | 7 How it's built | Architecture: React · FastAPI · MongoDB · rules engine · Claude Sonnet 5.5 · You.com Search + Answer · Willow | "Emergent's agent built all of it from our spec: React, FastAPI, MongoDB, a unit-tested rules engine, live on emergent.host. The AI explains. You.com grounds. The numbers are always code." | Point to the "Rules engine" box on the diagram on "always code". Click. |
| **2:33–2:42** | 8 Business | Venues (now) · Insurers · Cruise lines · Consumers and employers (next) · US$0.50–1 per guest | "Venues pay per guest, about fifty cents to a dollar, to replace a laminated sign and a liability gap. Insurers reward venues that use it. Cruise lines license it for ship spas and shore trips." | Click. |
| **2:42–2:50** | 9 Trillion-dollar path | Wedge → thermal venues → personal heat safety → category | "One Penang onsen first. Then Japan's 27,000 onsen, the world's saunas and spas. Then personal heat safety for anyone. The health layer of climate adaptation." | The rings build outward on their own; let them grow as you speak. Click. |
| **2:50–3:00** | 10 Validation + close | 30 ideas · ~70 simulated judge agents · SoakRx finals #3 (3.89/5) → Ondo. Emergent · You.com · Willow proofs, live link, repo link, QR (when the deck was built with `LIVE_URL`) | "We put 30 ideas in front of a simulated panel of about seventy judge agents. The gasp moment was that patch. So we built it. Ondo. **Make heat safe for every body.**" | Stop. Smile. Leave slide 10 up with the live link and QR to `https://heat-safe-onsen.emergent.host`. |

### Running long or short
- **Over 2:20 when the live part ends:** skip the slide 6 line (the room just saw it), click straight to slide 7.
- **Under time:** after the heat spike, add: "And if a guest feels unwell, one button and staff know instantly."
- **Numbers on the card differ from slide 6** (for example the card shows fewer minutes than the slide): trust the
  card and say, "The engine tightened it further for today's heat." The engine is the source of truth.

---

## Backup plan

| What goes wrong | What you do | What you say (stay calm, keep moving) |
|---|---|---|
| **Live You.com data is slow, or the badge says "Cached"** | Carry on. Ondo falls back to the cached or seeded George Town reading (33°C, 75% RH, heat index 41°C), labelled **Cached**, and the engine runs the same way. | "That badge says Cached: it's this morning's You.com reading. Live or cached, the engine gives the same answer for the same heat." |
| **Citations take longer than 3 seconds** | Keep talking through the dial and the red-flag text while the evidence chips load. They were pre-warmed, so this should be rare. | "Sources are loading from You.com. The safety limit never waits for them; it comes from the rules." |
| **Willow mishears or fn does nothing** | Tap the **Margaret persona chip** to fill the box, or fix the word in the editable chip. | "If voice mishears a drug, she fixes the chip before any number is set. That read-back is on purpose." |
| **Browser speech is silent** | Point to the on-screen check-in text and read it aloud. Check the volume after the talk. | "Margaret, two minutes left. Sit up slowly before you stand. She hears that in her own language." |
| **Staff console doesn't show Margaret within 3 seconds** | Wait one refresh (3 s), then reload Tab 2. If she's still missing, point to a seeded guest in red and run the heat spike anyway. | "Here's the board: every guest, their own limit, live." |
| **The LLM step stalls (more than 8 s)** | Go back and tap the Margaret persona chip, or switch to the backup recording at the prescription step. | "Let me jump us forward." |
| **Wi-Fi dies** | Switch to the phone hotspot (about 15 s). If that fails too, open the backup window: six full-screen screenshots in order (landing → chips → red dial with citations → Soak Pass → staff console → heat spike) or the 70-second recording. Narrate the same words over them. | "The venue Wi-Fi just gave up, so here's the same flow from this morning. Try it on your phone afterwards: the link and QR are on the last slide." |
| **Projector or laptop fails** | Present slides 1–10 from memory with the phone hotspot, and offer the live app on judges' phones via the QR on slide 10 (or read out the link). | "Everything you'd see is on your phone right now. Scan this." |

Make the six screenshots and the screen recording from a real run of the live app before the session, and keep them
local (for example in a `docs/demo-backup/` folder) so they work offline.
