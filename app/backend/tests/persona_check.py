# Persona end-to-end (LLM intake -> rules) check for David, Priya, Chen. Cleans up its own records.
import os
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")
U = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
P = {
    "david": "Had three beers on the ship's drinks package, slept badly, want the hottest bath you have.",
    "priya": "I'm Priya, 20 weeks pregnant, vegetarian, travelling with my husband. Is the onsen safe for me?",
    "chen": "我们一家四口，孩子六岁，第一次泡温泉。",
}
for k, t in P.items():
    i = requests.post(f"{U}/intake", json={"text": t}, timeout=120).json()
    p = i["profile"]
    r = requests.post(f"{U}/prescription", json={"profile": p, "profile_id": i["id"]}, timeout=120).json()
    rx = r["rx"]
    print(k, "| lang", p["language"], p["lang_code"], "| f", p["factors"], "preg", p["pregnancy_weeks"], "kids", p["children_ages"],
          "| risk", rx["risk_level"], rx["risk_score"], "bath", rx["bath"]["id"], rx["bath"].get("set_temp"), "max", rx["max_temp"], rx["max_minutes"], "min x", rx["rounds"],
          "| flags", [f["id"] for f in rx["red_flags"]], "| summary:", r["explanation"]["summary"][:90])
    db.profiles.delete_one({"id": i["id"]})
    db.prescriptions.delete_one({"id": r["id"]})
