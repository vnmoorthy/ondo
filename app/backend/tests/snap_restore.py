# Test helper: snapshot/restore demo-mutable state so UI tests (heat spike, voice) leave data untouched.
# usage: python snap_restore.py snap|restore
import os
import sys
import pickle
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
F = "/tmp/ondo_snap.pkl"
FIELDS = ("limits", "heat_version", "red_flag_ids", "phase_base_s", "phase_started_at", "flagged", "flagged_severity", "status", "round")

if sys.argv[1] == "snap":
    s = {"demo": db.demo.find_one({"id": "demo"}, {"_id": 0}),
         "bookings": {b["code"]: {k: b.get(k) for k in FIELDS} for b in db.bookings.find({})},
         "rx": {p["id"]: p.get("rx_spike") for p in db.prescriptions.find({}, {"id": 1, "rx_spike": 1})},
         "baths": {b["id"]: b["current_temp"] for b in db.baths.find({})},
         "alerts": [a["id"] for a in db.alerts.find({}, {"id": 1})],
         "incidents": [i["id"] for i in db.incidents.find({}, {"id": 1})]}
    pickle.dump(s, open(F, "wb"))
    print("snap", len(s["bookings"]), len(s["alerts"]))
else:
    s = pickle.load(open(F, "rb"))
    db.demo.replace_one({"id": "demo"}, s["demo"], upsert=True)
    for code, v in s["bookings"].items():
        unset = {k: "" for k, x in v.items() if x is None}
        st = {k: x for k, x in v.items() if x is not None}
        db.bookings.update_one({"code": code}, {"$set": st, **({"$unset": unset} if unset else {})})
    for pid, v in s["rx"].items():
        db.prescriptions.update_one({"id": pid}, {"$set": {"rx_spike": v}} if v else {"$unset": {"rx_spike": ""}})
    for bid, t in s["baths"].items():
        db.baths.update_one({"id": bid}, {"$set": {"current_temp": t}})
    a = db.alerts.delete_many({"id": {"$nin": s["alerts"]}}).deleted_count
    i = db.incidents.delete_many({"id": {"$nin": s["incidents"]}}).deleted_count
    print("restored; removed alerts", a, "incidents", i)
