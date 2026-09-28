#!/usr/bin/env python3
"""Phase 8 demo printer: read each city's current published hotspot run
from Mongo and print a human-readable defense-demo summary.

Run via scripts/demo.sh (step 5). Reads MONGO_URI from the environment.
"""
import os
import sys

from pymongo import MongoClient

CITIES = ["Karachi", "Lahore", "Islamabad"]


def _fmt(value):
    return "n/a" if value is None else value


def main():
    uri = os.environ.get("MONGO_URI", "mongodb://127.0.0.1:27017/thermax_demo")
    db = MongoClient(uri).get_database()
    for city in CITIES:
        pub = db.hotspot_publications.find_one({"city": city}) or {}
        run_id = pub.get("currentRunId")
        if not run_id:
            print(f"--- {city}: no published run yet")
            continue
        spots = list(
            db.hotspots.find({"city": city, "runId": run_id}).sort(
                [("tvi", -1), ("_id", 1)]
            )
        )
        print(f"--- {city}: {len(spots)} hotspot(s) (run {run_id})")
        for s in spots:
            c = s.get("centroid") or {}
            adv = s.get("advisory") or {}
            en = (adv.get("en") or "").strip()
            if len(en) > 140:
                en = en[:137] + "..."
            print(
                f"  {s.get('clusterId')}: ({c.get('lat')}, {c.get('lng')}) "
                f"reports={s.get('reportCount')} "
                f"avgTemp={_fmt(s.get('avgTemp'))}C "
                f"peakTemp={_fmt(s.get('peakTemp'))}C "
                f"TVI={_fmt(s.get('tvi'))} tier={s.get('riskTier')} "
                f"heatIndexMean={_fmt(s.get('heatIndexMean'))}"
            )
            print(
                f"    advisory[{adv.get('tier')}/{adv.get('heatIndexBand')}]: "
                f"{en or '(none — tier unknown)'}"
            )
            print(f"    directives: {len(s.get('directives') or [])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
