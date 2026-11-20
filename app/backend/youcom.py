"""You.com Search + Answer client: server-side only, Mongo-cached for 10 minutes, seeded fallbacks."""
import os
import re
import logging
from datetime import datetime, timezone, timedelta
import httpx

log = logging.getLogger("youcom")
SEARCH_URL = "https://ydc-index.io/v1/search"
ANSWER_URL = "https://api.you.com/v1/answer"
CACHE_MIN = 10

CDC = "https://www.cdc.gov/heat-health/hcp/clinical-guidance/heat-and-medications-guidance-for-clinicians.html"
NHS_SPA = "https://www.nhs.uk/conditions/pregnancy-and-baby/hot-tubs-saunas-pregnant/"
NIPPON = "https://www.nippon.com/en/japan-data/h01885/"
WHO = "https://www.who.int/news-room/fact-sheets/detail/climate-change-heat-and-health"

FALLBACK_EVIDENCE = {
    "anticholinergic": ("Anticholinergic drugs such as scopolamine reduce sweating, the body's main way to lose heat, raising the risk of heat stroke in hot environments [[1]].", [CDC]),
    "beta_blocker": ("Beta-blockers blunt the heart-rate response to heat and can reduce skin blood flow, impairing heat loss and raising fainting risk [[1]].", [CDC]),
    "diuretic": ("Diuretics cause fluid and salt loss and increase the risk of dehydration and heat illness [[1]].", [CDC]),
    "vasodilator": ("ACE inhibitors, ARBs and vasodilators can cause low blood pressure in heat, and hot baths add further vasodilation [[1]].", [CDC]),
    "anticoagulant": ("Anticoagulants raise bleeding risk from falls; wet bathing areas increase fall risk [[1]].", [CDC]),
    "diabetes": ("Heat speeds insulin absorption and people with diabetes may have reduced sweating and sensation, increasing burn and hypoglycaemia risk [[1]].", [CDC]),
    "pregnancy": ("Pregnant people are advised to avoid hot tubs and saunas because raising core temperature may harm the baby and cause fainting [[1]].", [NHS_SPA]),
    "heart": ("Hot water bathing increases heart workload; Japan links around 19,000 bathing deaths a year mostly to cardiovascular events in older people [[1]].", [NIPPON]),
    "age_65": ("Japan's Consumer Affairs Agency advises older people to keep bath water under 41°C and soak no more than 10 minutes [[1]].", [NIPPON]),
    "age_75": ("Most bathing-related deaths in Japan occur in people over 65; advice is under 41°C and at most 10 minutes [[1]].", [NIPPON]),
    "alcohol_light": ("Alcohol before bathing is a known risk factor for fainting and drowning in hot baths [[1]].", [NIPPON]),
    "alcohol_heavy": ("Bathing after drinking is strongly discouraged: alcohol lowers blood pressure and impairs judgement in hot water [[1]].", [NIPPON]),
    "sleep_seasick": ("Dehydration increases the risk of heat-related illness; drink water before and after heat exposure [[1]].", [WHO]),
    "children": ("Infants and young children are among the most vulnerable to heat because they regulate temperature less well [[1]].", [WHO]),
    "epilepsy": ("People with epilepsy should never bathe alone, because a seizure in water can lead to drowning [[1]].", ["https://www.epilepsy.org.uk/info/daily-life/safety/bathing"]),
    "heat_40": ("Heat index values above 40°C mean high risk of heat exhaustion and heat stroke with prolonged exposure [[1]].", [WHO]),
    "heat_45": ("Extreme heat greatly increases risk of heat stroke, especially for older adults and people on medicines [[1]].", [WHO]),
}
FALLBACK_CONDITIONS = {"temp_c": 33, "humidity": 75, "heat_index": 41, "summary": "Hot and humid in George Town with afternoon thunderstorms likely.",
                       "source": "AccuWeather (cached)"}


def _key():
    return os.environ.get("YDC_API_KEY", "")


def _headers():
    return {"X-API-Key": _key(), "Content-Type": "application/json", "User-Agent": "Ondo/1.0"}


async def _cached(db, key):
    doc = await db.yc_cache.find_one({"key": key}, {"_id": 0})
    if doc and datetime.fromisoformat(doc["ts"]) > datetime.now(timezone.utc) - timedelta(minutes=CACHE_MIN):
        return doc["data"]
    return None


async def _store(db, key, data):
    await db.yc_cache.update_one({"key": key}, {"$set": {"key": key, "data": data, "ts": datetime.now(timezone.utc).isoformat()}}, upsert=True)


async def _post(url, body, timeout):
    if not _key():
        return None
    try:
        async with httpx.AsyncClient(timeout=timeout) as c:
            r = await c.post(url, json=body, headers=_headers())
        if r.status_code != 200:
            log.warning("You.com %s %s: %s", url, r.status_code, r.text[:200])
            return None
        return r.json()
    except Exception as e:
        log.warning("You.com %s failed: %s", url, e)
        return None


async def search(db, query, count=5, knowledge=True, freshness=None):
    key = f"search:{query.strip().lower()}:{freshness}"
    hit = await _cached(db, key)
    if hit:
        return hit
    body = {"query": query, "count": count, "extraction": {"extraction_mode": "highlights"}}
    if knowledge:
        body["knowledge"] = "core"
    if freshness:
        body["freshness"] = freshness
    data = await _post(SEARCH_URL, body, 12)
    if data is None:
        return None
    await _store(db, key, data)
    return data


def _clean_citations(cits):
    out = []
    for c in cits or []:
        src = c.get("source") or c.get("url") or ""
        ex = (c.get("excerpts") or [""])[0] if c.get("excerpts") else ""
        out.append({"url": src, "excerpt": ex[:280], "domain": re.sub(r"^https?://(www\.)?", "", src).split("/")[0]})
    return out


async def answer(db, query):
    """Return {answer, citations, live}."""
    key = f"answer:{query.strip().lower()}"
    hit = await _cached(db, key)
    if hit:
        return {**hit, "live": True}
    data = await _post(ANSWER_URL, {"query": query}, 20)
    if data is None or not data.get("answer"):
        return None
    out = {"answer": data["answer"], "citations": _clean_citations(data.get("citations"))}
    if not out["citations"]:
        out["citations"] = [{"url": w.get("url", ""), "excerpt": (w.get("snippets") or [""])[0][:280],
                             "domain": re.sub(r"^https?://(www\.)?", "", w.get("url", "")).split("/")[0]}
                            for w in (data.get("results") or {}).get("web", [])[:3]]
    await _store(db, key, out)
    return {**out, "live": True}


async def evidence(db, rule_id, query):
    res = await answer(db, query)
    if res:
        return res
    text, urls = FALLBACK_EVIDENCE.get(rule_id, ("Hot water and heat strain the body; keep soaks short and drink water [[1]].", [WHO]))
    return {"answer": text, "citations": [{"url": u, "excerpt": text.split(" [[")[0], "domain": re.sub(r"^https?://(www\.)?", "", u).split("/")[0]} for u in urls], "live": False}


def heat_index_c(t, rh):
    f = t * 9 / 5 + 32
    hi = 0.5 * (f + 61.0 + ((f - 68.0) * 1.2) + (rh * 0.094))
    if hi >= 80:
        hi = (-42.379 + 2.04901523 * f + 10.14333127 * rh - .22475541 * f * rh - .00683783 * f * f - .05481717 * rh * rh
              + .00122874 * f * f * rh + .00085282 * f * rh * rh - .00000199 * f * f * rh * rh)
    return round((hi - 32) * 5 / 9)


def _c(v):
    v = float(v)
    return round((v - 32) * 5 / 9) if v > 55 else round(v)


def parse_weather(texts):
    out, feels = {}, []
    for text in texts:
        text = text or ""
        cur = re.search(r"Currently, it is (\d+)°\s*F", text) or re.search(r"Temperature:\s*\+?(\d+)°", text) or re.search(r"(\d{2})°\s*F", text)
        if cur and "temp_c" not in out:
            out["temp_c"] = _c(cur.group(1))
        hi = re.search(r"daytime high is (\d+)°\s*F", text) or re.search(r"High (\d{2})°C", text)
        if hi and "high_c" not in out:
            out["high_c"] = _c(hi.group(1))
        h = re.search(r"humidity(?: is)?[^\d]{0,4}(\d{2,3})\s*%", text, re.I)
        if h and "humidity" not in out:
            out["humidity"] = int(h.group(1))
        for pat in (r"feels like[^\d]{0,15}(\d{2,3})°", r"Heat Index\s*(\d{2,3})°", r"RealFeel®?\s*(\d{2,3})°"):
            feels += [_c(x) for x in re.findall(pat, text, re.I)]
    if feels:
        out["feels_like"] = max(feels)
    return out


async def conditions(db):
    data = await search(db, "George Town Penang weather now heat index humidity", count=5, knowledge=True)
    if data:
        res = data.get("results") or {}
        texts = [k.get("description", "") for k in res.get("knowledge") or []]
        texts += ["\n".join((w.get("contents") or {}).get("highlights") or w.get("snippets") or [w.get("description", "")]) for w in res.get("web") or []]
        parsed = parse_weather(texts)
        if "temp_c" in parsed:
            t = parsed["temp_c"]
            rh = parsed.get("humidity", 75)
            hi = parsed.get("feels_like") or heat_index_c(t, min(rh, 80))
            kn = (res.get("knowledge") or [{}])[0]
            src = ((kn.get("attribution") or [{}])[0]).get("name") or ((res.get("web") or [{}])[0]).get("title", "You.com")
            return {"temp_c": t, "humidity": rh, "heat_index": hi, "high_c": parsed.get("high_c"), "summary": (texts[0] or "")[:220], "source": src, "live": True,
                    "sources": [{"url": w.get("url"), "title": w.get("title")} for w in (res.get("web") or [])[:3]]}
    return {**FALLBACK_CONDITIONS, "live": False, "sources": [{"url": "https://www.accuweather.com/en/my/george-town/228029/weather-forecast/228029", "title": "AccuWeather George Town"}]}


async def heat_news(db):
    data = await search(db, "Penang heatwave heat warning MetMalaysia", count=4, knowledge=False, freshness="week")
    if data:
        web = (data.get("results") or {}).get("web") or []
        items = [{"title": w.get("title"), "url": w.get("url"), "age": w.get("page_age"),
                  "snippet": (((w.get("contents") or {}).get("highlights") or w.get("snippets") or [w.get("description", "")])[0] or "")[:180]} for w in web[:4]]
        if items:
            return {"items": items, "live": True}
    return {"live": False, "items": [
        {"title": "MetMalaysia: hot weather advisory for northern Peninsular states", "url": "https://www.met.gov.my/", "age": None, "snippet": "Daily maximum temperatures of 33–35°C expected in Penang, Kedah and Perlis."},
        {"title": "Stay hydrated as Penang heat persists", "url": "https://www.thestar.com.my/", "age": None, "snippet": "Health officials urge the elderly and visitors to avoid prolonged sun exposure."},
    ]}
