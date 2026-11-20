# You.com API integration spec (verified live on Nov 20, 2026)

All calls are made **server-side from FastAPI only**. Never expose the key to the browser.

- Secret / env var: `YDC_API_KEY`
- Headers on every request: `X-API-Key: <YDC_API_KEY>`, `Content-Type: application/json`, and an explicit
  `User-Agent: Ondo/1.0`. Cloudflare blocks the bare Python-urllib user agent with "error code: 1010"; httpx,
  requests and aiohttp are fine.
- Timeouts: 12 s for Search, 20 s for Answer. On timeout or any non-200 response, use the cached or seeded fallback and
  return `"live": false` so the UI shows a "Cached" badge instead of breaking.
- Cache identical queries in MongoDB for 10 minutes (key = endpoint + normalized query).

## 1. Search (live web + knowledge)
`POST https://ydc-index.io/v1/search`
```json
{ "query": "George Town Penang weather now heat index humidity", "count": 5,
  "extraction": { "extraction_mode": "highlights" }, "knowledge": "core" }
```
Response (field names verified):
```json
{ "results": {
    "web": [ { "url": "...", "title": "...", "description": "...", "snippets": ["..."],
               "contents": { "highlights": ["query-relevant passage"] }, "page_age": "...", "favicon_url": "..." } ],
    "knowledge": [ { "type": "answer", "title": "George Town Current Weather Forecast",
                     "description": "Weather forecast for George Town, Pulau Pinang, Malaysia ... Currently, it ...",
                     "attribution": [ { "name": "AccuWeather" } ] } ] },
  "metadata": { "query": "...", "latency": 0.34 } }
```
`knowledge` is omitted when nothing relevant is found. Evidence text = `contents.highlights[0]`, falling back to
`snippets[0]`, then `description`. Parse the temperature, humidity and "feels like" values from the knowledge
description with a regex, plus an LLM fallback. Latency is about 1 s.

## 2. Answer (one-shot cited answer)
`POST https://api.you.com/v1/answer`
```json
{ "query": "Does a scopolamine seasickness patch reduce sweating and raise heat stroke risk in hot baths?" }
```
Response:
```json
{ "answer": "markdown with citation markers like [[1, 2]]",
  "citations": [ { "source": "https://...", "excerpts": ["..."] } ],
  "results": { "web": [ { "url": "...", "title": "...", "snippets": ["..."] } ] } }
```
Markers `[[1, 2]]` index (1-based) into `citations`. Render them as small source chips that link out. Latency is about
3 s, so cache results and pre-warm the common red-flag queries at startup.

## 3. How Ondo uses You.com (show a "Live · You.com" badge and sources everywhere)
| Feature | Endpoint | Query |
|---|---|---|
| Live heat index for George Town | Search + knowledge | `George Town Penang weather now heat index humidity` |
| Evidence for each red flag | Answer | `How does {medication or condition} affect heat tolerance and hot bath or sauna safety?` |
| Guest questions ("Can I soak after two beers?") | Answer | the guest's question + ` (hot spring onsen safety)` |
| Ships in Penang today (staff console) | Answer | `Which cruise ships are in Penang Swettenham Pier on {date}, with arrival and departure times?` |
| Heat news (staff console) | Search, freshness `week` | `Penang heatwave heat warning MetMalaysia` |

## 4. Verified real data for seeds and fallbacks
- Royal Caribbean Navigator of the Seas (about 4,000 guests) is in Penang Fri Nov 20 2026, 14:00–21:00 (You.com Answer
  verified this, citing CruiseMapper). Later calls: Nov 25 15:00–23:00 and Nov 30 14:00–21:00. Oceania Nautica: Nov 27
  07:00–17:00. All-aboard is usually 30–60 minutes before departure. Penang is UTC+8.
- Typical November George Town weather: 31–34°C, 70–85% humidity, heat index 40–44°C, afternoon thunderstorms.
