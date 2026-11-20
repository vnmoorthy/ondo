# Ondo architecture

> **Rules decide. The LLM explains. You.com grounds every claim.**
> Ondo is a two-sided web app (guest app + Staff Safety Console) built on Emergent: React + FastAPI + MongoDB, with You.com for live, cited facts and Willow as the voice interface.

<p align="center"><img src="../assets/architecture.png" alt="Ondo system architecture" width="100%"></p>

The app source is exported from Emergent into [`app/frontend`](../app/frontend) and [`app/backend`](../app/backend). Where this document names a route, module or collection that the spec does not fix, it describes the intended design; `app/` is the source of truth once it lands.

---

## 1. System context

```mermaid
flowchart TB
    guest(["Cruise passenger<br/>(often 60+, any language, one day in Penang)"])
    staff(["Onsen staff<br/>(wet hands, many languages)"])
    doctor(["Ship's doctor"])

    subgraph ondo["Ondo (Emergent deploy, *.emergent.host)"]
        fe["React frontend<br/>guest app + Staff Safety Console"]
        be["FastAPI backend<br/>/api"]
        db[("MongoDB")]
    end

    willow["Willow<br/>OS-level dictation, 100+ languages"]
    ys["You.com Search API<br/>ydc-index.io/v1/search"]
    ya["You.com Answer API<br/>api.you.com/v1/answer"]
    llm["Emergent Universal LLM key<br/>Claude Sonnet 5.5"]

    guest -- "speaks / types" --> willow
    staff -- "speaks" --> willow
    willow -- "types text into inputs" --> fe
    guest -- "taps, scans QR" --> fe
    staff -- "watches board, acknowledges" --> fe
    fe -- "HTTPS JSON (REACT_APP_BACKEND_URL)" --> be
    be <--> db
    be -- "X-API-Key, User-Agent: Ondo/1.0" --> ys
    be -- "X-API-Key, User-Agent: Ondo/1.0" --> ya
    be -- "EMERGENT_LLM_KEY" --> llm
    fe -- "health summary" --> doctor
```

**Trust boundaries.** The browser never sees an API key. Everything external (You.com, the LLM) is called from FastAPI. The deterministic rules engine sits between the LLM and the guest: the LLM proposes a profile, the engine decides the limits, and the LLM only explains the result.

---

## 2. Components

### Frontend (`app/frontend`, React)

| Route | Screen | Key parts |
|---|---|---|
| `/` | Landing + **Just talk** intake | Live heat chip ("Live · You.com"), one large text area built for Willow dictation, Web Speech mic fallback with a visible listening state, five multilingual persona chips (Margaret, Mr. Tanaka, Priya, David, the Chen family), "Why Ondo" strip with sourced stats, editable profile chips with **Looks right** |
| `/prescription/:id` | **Soak Prescription** | 0–100 risk dial (jade → amber → vermilion), prescription card, red-flag cards with You.com evidence chips, explanation in the guest's language, "Not medical advice; staff will check on you", **Book this soak**, **Ask Ondo** |
| `/pass/:code` | **Soak Pass** | QR of the pass URL, ship line ("all aboard 20:30 · leave the onsen by 18:45"), guided soak timer with spoken check-ins (`speechSynthesis`), hydration tracker, **I feel unwell**, health summary for the ship's doctor, **Ask Ondo**, Demo drawer |
| `/staff` | **Staff Safety Console** | Live board polled every 3 s, alerts rail with acknowledge, **Say what's happening** voice box, live conditions, ships in Penang today, impact KPIs, a QR that opens the guest app, Demo drawer |

Design system: ink `#101418`, steam white `#F7F5F2`, deep teal `#0E3B43`, jade `#2FA58F` (safe), amber `#E9A23B` (caution), vermilion `#E2483D` (danger); Fraunces for headings, Inter for UI. Large type and tap targets; no silent spinners ("Checking Penang's heat on You.com…", "Reading your medicines…").

### Backend (`app/backend`, FastAPI)

| Module | Responsibility |
|---|---|
| **Intake parser** | LLM turns free speech into a structured profile (name, age, language, home country, ship, party, medications as said + generic + class, conditions, today's factors, pregnancy weeks, children's ages). Output is validated with Pydantic; invalid JSON is retried once, then falls back to a minimal profile the guest edits. |
| **Conditions service** | You.com Search with `knowledge: "core"` for George Town's temperature, humidity and heat index. Regex parse of the knowledge description, LLM fallback, seeded fallback (33°C, 75% RH, heat index 41°C, `live: false`). |
| **Safety rules engine** (`rules.py`) | Pure, deterministic Python. Input: profile + heat index. Output: bath, max °C, minutes, rounds, cool-down, water, risk score and level, matched rules with reasons and evidence queries. Unit-tested. See [SAFETY_ENGINE.md](SAFETY_ENGINE.md). |
| **Evidence service** | You.com Answer for each matched rule's evidence query and for guest questions. Parses `[[n]]` citation markers into source chips. Pre-warms common red-flag queries at startup. |
| **Explainer + translator** | LLM writes the warm explanation, check-in lines, unwell steps and the doctor summary in the guest's language. It receives the engine's numbers as read-only facts. |
| **Bookings + Soak Pass** | Six seeded baths, 30-minute slots 13:00–19:00 with capacity, pass codes like `OND-7K2Q`, the ship line from the guest's ship and all-aboard time. |
| **Soak sessions + alerts** | Session state (round, time in water, personal limit, hydration, next check-in). Raises alerts for limit reached, "I feel unwell" and heat-index spikes. |
| **Staff incident parser** | LLM turns a spoken staff report into a typed incident: flag a guest with a protocol, or change a bath's temperature and re-check everyone in it. |
| **Demo controls** | Fast-forward (timers 10×), heat spike (heat index 46°C, re-run the engine for every active guest), reset (re-seed about 10 soaking guests with mixed risk). |

### Data (MongoDB)

`guests`, `prescriptions`, `baths`, `slots`, `bookings`, `sessions`, `alerts`, `incidents`, `conditions` / `api_cache`. Every user action persists, so any page survives a refresh and the staff console sees the same state as the guest's phone. See the [data model in the README](../README.md#data-model).

---

## 3. Sequence diagrams

### 3.1 Intake → profile → live heat → rules → prescription with citations

```mermaid
sequenceDiagram
    autonumber
    actor G as Guest (Margaret, 71)
    participant W as Willow
    participant FE as Guest app
    participant API as FastAPI
    participant LLM as LLM (Claude Sonnet 5.5)
    participant YS as You.com Search
    participant R as Rules engine
    participant YA as You.com Answer
    participant DB as MongoDB

    G->>W: holds fn, speaks
    W->>FE: types "I'm Margaret, 71… metoprolol… seasickness patch…"
    FE->>API: POST /api/intake {text}
    Note over FE: "Reading your medicines…"
    API->>LLM: extract structured profile (JSON)
    LLM-->>API: profile JSON
    API->>API: Pydantic validation
    API->>DB: save guest
    API-->>FE: profile
    FE-->>G: editable chips: 71 · metoprolol (beta-blocker) · scopolamine patch (anticholinergic)
    G->>FE: Looks right
    FE->>API: GET /api/conditions
    alt cache fresh (under 10 min)
        API->>DB: read api_cache
    else cache stale
        API->>YS: query + knowledge: core (12 s timeout)
        YS-->>API: knowledge description
        API->>API: regex parse (LLM fallback)
        API->>DB: write api_cache
    end
    API-->>FE: 34°C, heat index, live: true
    FE->>API: POST /api/prescription {profile}
    API->>R: evaluate(profile, heat_index)
    R-->>API: Jade bath · caps · risk 70+ · RED · rules [age_65_74, beta_blocker, anticholinergic, …]
    par evidence per red flag
        API->>YA: "How does a scopolamine patch affect heat tolerance…?" (20 s timeout, cached, pre-warmed)
        YA-->>API: answer + citations
    and explanation
        API->>LLM: explain these fixed numbers in English, warmly
        LLM-->>API: explanation text
    end
    API->>DB: save prescription
    API-->>FE: prescription + red flags + citations + explanation
    FE-->>G: dial swings to red, red-flag card with source chips
```

### 3.2 Booking → pass → guided soak → "I feel unwell" → staff console

```mermaid
sequenceDiagram
    autonumber
    actor G as Guest
    participant FE as Guest app
    participant API as FastAPI
    participant DB as MongoDB
    participant SC as Staff console
    actor S as Staff

    G->>FE: Book this soak
    FE->>API: GET /api/slots
    API-->>FE: 30-min slots 13:00–19:00 with capacity
    G->>FE: picks Jade bath, 15:30
    FE->>API: POST /api/bookings
    API->>DB: decrement slot, insert booking (OND-7K2Q)
    API-->>FE: pass code
    FE-->>G: /pass/OND-7K2Q · QR · ship line · prescription summary
    G->>FE: Start soak
    FE->>API: start session
    API->>DB: session {round 1, limit 6 min}
    loop every 3 s
        SC->>API: GET /api/staff/board
        API-->>SC: Margaret · Jade · 2:10 / 6:00 · RED · patch, beta-blocker
    end
    FE-->>G: speechSynthesis: "Margaret, two minutes left. Sit up slowly before you stand."
    G->>FE: logs 250 ml water
    G->>FE: I feel unwell
    FE->>API: unwell
    API->>DB: insert alert (unwell, Margaret, Jade)
    API-->>FE: calm steps in the guest's language
    FE-->>G: Get out slowly · sit · sip water · staff are coming
    SC->>API: GET /api/staff/board (next poll, ≤ 3 s)
    API-->>SC: alert on rail, Margaret's row flashes
    S->>SC: Acknowledge
    SC->>API: POST /api/staff/alerts/{id}/ack
    API->>DB: alert acknowledged_at
    G->>FE: Health summary for the ship's doctor
    FE->>API: GET health summary
    API-->>FE: English + guest's language
```

### 3.3 Staff voice incident

```mermaid
sequenceDiagram
    autonumber
    actor S as Staff (wet hands)
    participant W as Willow
    participant SC as Staff console
    participant API as FastAPI
    participant LLM as LLM
    participant R as Rules engine
    participant DB as MongoDB

    S->>W: "Rotenburo is 42 degrees right now."
    W->>SC: types into "Say what's happening"
    SC->>API: POST /api/staff/incident {text}
    API->>LLM: parse to incident JSON
    LLM-->>API: {type: bath_temp, bath: rotenburo, temp_c: 42}
    API->>API: Pydantic validation
    SC-->>S: shows the parsed incident (confirm before acting)
    API->>DB: update bath temperature, insert incident
    API->>R: re-check every guest in Rotenburo against their max °C
    R-->>API: guests now over their cap
    API->>DB: insert alerts
    API-->>SC: incident + alerts
    Note over S,SC: "Margaret looks dizzy" instead becomes {type: guest_flag, guest: Margaret, protocol: get out slowly, sit, water, monitor}
```

### 3.4 Heat-spike re-evaluation

```mermaid
sequenceDiagram
    autonumber
    actor P as Presenter / staff
    participant SC as Staff console (Demo drawer)
    participant API as FastAPI
    participant R as Rules engine
    participant DB as MongoDB
    participant FE as Guest Soak Pass

    P->>SC: Simulate heat spike
    SC->>API: POST /api/demo/heat-spike
    API->>DB: conditions.heat_index = 46°C (simulated)
    loop every active guest
        API->>DB: load profile
        API->>R: evaluate(profile, heat_index=46)
        R-->>API: tighter caps (−1°C, −2 min), indoor gentle baths only, risk +30
        API->>DB: update prescription + session limit
        API->>DB: alert if time in water ≥ new limit or bath now not allowed
    end
    API-->>SC: summary (n guests re-evaluated, m alerts)
    SC-->>P: every limit bar shrinks, alerts rail fills, spoken announcement
    FE->>API: poll pass
    API-->>FE: new limit
    FE-->>FE: speechSynthesis: new limit in the guest's language
```

---

## 4. Caching and fallbacks

The demo must hold up live for 10 minutes on venue Wi-Fi, so every external dependency has a fallback.

| Dependency | Timeout | Cache | Fallback | UI |
|---|---|---|---|---|
| You.com Search (heat) | 12 s | MongoDB, 10 min, key = endpoint + normalized query | Seeded: 33°C, 75% RH, heat index 41°C | **Live · You.com** or **Cached** |
| You.com Answer (evidence, questions, ships) | 20 s | MongoDB, 10 min; common red-flag queries pre-warmed at startup | Last cached answer, else a seeded evidence line for that rule | Source chips; **Cached** badge |
| LLM intake | ~10 s | none | Minimal profile from keyword matching; guest edits the chips | "Reading your medicines…" |
| LLM explanation / translation | ~10 s | per prescription | Template sentence in English built from the engine's reasons | Explanation still shows |
| Ships in Penang | 20 s | 10 min | Seed: Navigator of the Seas, Fri Nov 20 2026, 14:00–21:00 | **Cached** |

Rules that never depend on the network: the safety limits, risk level and bath choice. If every external call fails, a guest still gets a correct, conservative prescription.

---

## 5. Security

- **Keys server-side only.** `YDC_API_KEY` and `EMERGENT_LLM_KEY` live in backend environment variables; the frontend only knows `REACT_APP_BACKEND_URL`. `.env` is git-ignored; `.env.example` lists names without values.
- **Explicit User-Agent** (`Ondo/1.0`) on You.com calls; Cloudflare blocks the bare Python-urllib agent.
- **LLM output is untrusted input.** Every LLM response is parsed as JSON and validated with Pydantic before use. The LLM never writes limits; the engine ignores any numbers in LLM text.
- **Prompt-injection resistance.** Guest and staff text is passed to the LLM as data inside a fixed extraction schema; incident actions are limited to a small typed set (flag guest, change a bath temperature) and are shown to staff before they apply.
- **Minimal health data.** Only what the guest says for today's soak; no IDs, no payment details, no audio. Evidence queries sent to You.com contain a medicine or condition, never a name.
- **Hackathon scope, production gaps.** The demo console has no staff login, and demo controls are open. Before a real venue uses Ondo: staff auth, role-based access to the console, consent at intake, a retention window, audit logging and rate limits.
