![ThermaX Banner](assets/thermax_banner.webp)

# ThermaX — Urban Heat Island & Spatial Thermal-Risk Platform

Citizen heat reports + real weather + real satellite land-surface temperature,
fused into per-city hotspot maps with vulnerability scoring (TVI-lite) and
deterministic bilingual heat advisories — for Karachi, Lahore, and Islamabad.

Final-year project. Built locally; this repository is the complete system.

---

## Architecture (three tiers)

```
┌─────────────────────────────┐
│  FRONTEND  React + Vite     │  :5173
│  heatmap · hotspots ·       │
│  reports · admin panels     │
└──────────────┬──────────────┘
               │  REST /api/v1/*
┌──────────────▼──────────────┐
│  BACKEND  Express + MongoDB │  :5000
│  auth (JWT+OTP) · reports   │
│  QC-gated lifecycle ·       │
│  hotspots/TVI read API      │
└──────────────┬──────────────┘
               │  HTTP  X-Service-Key
┌──────────────▼──────────────┐      ┌──────────────────────────┐
│  ML SERVICE  FastAPI        │─────▶│ weatherapi.com (air temp │
│  :8000  enrichment · QC ·   │      │  + heat index)           │
│  fusion · DBSCAN · TVI ·    │      └──────────────────────────┘
│  advisories · scheduler     │      ┌──────────────────────────┐
│  (APScheduler tick /30 min) │─────▶│ Google Earth Engine      │
└─────────────────────────────┘      │ MODIS MOD11A1 LST        │
                                     └──────────────────────────┘
```

- **Frontend** (`Frontend/`): citizen reporting with photo upload, heatmap
  and hotspot views, admin moderation/TVI/directive panels, bilingual
  citizen advisory banner.
- **Backend** (`Backend/`): the system of record. Email-OTP auth, report
  lifecycle (`pending → verified | flagged | rejected`), city-resolution
  against OSM boundaries, reader-atomic hotspot reads via per-city
  publication pointers.
- **ML service** (`ML/`): enrichment and scoring. Per-report: weather
  snapshot → GEE/MODIS LST → 4-check QC → fusion heatScore. Per tick:
  enrich pending → DBSCAN per city (verified-only) → TVI-lite → deterministic
  directives + EN/UR advisories → atomic publication.

City authority is shared: `Backend/data/cities.json` (Karachi, Lahore,
Islamabad — OSM boundary polygons, WorldPop 2020 1 km population grids).

---

## What the system honestly does

- **Report lifecycle with teeth & autonomous moderation.** Reports start `pending`. QC (citizen temp
  vs provider air temp ±3 °C · severity vs satellite surface-air excess ·
  GPS plausibility · photo presence) moves them to `verified` or `flagged`.
  GPS alone can never verify — with no environmental signal the report goes
  to human moderation. Routine moderation is fully autonomous: the admin acts
  only when notified of deliberate outliers (`enrichment_failed` or `extreme_contradiction`
  with temperature gap $\ge 15^\circ\text{C}$). Routine suspects (cloudy satellite, minor drift)
  are quarantined silently to prevent alert fatigue. The admin retains full manual
  Verify / Flag / Reject controls to act on notifications.
- **Real satellite data, honestly absent when absent.** MODIS LST comes
  through Google Earth Engine when credentials exist (verified live:
  Karachi 33.0 °C, Lahore 30.9 °C, Islamabad 27.6 °C, 2026-09-23). Without
  them the service reports `status: "unavailable"` — there is no synthetic
  fallback, and fusion/TVI renormalize around the missing term.
- **No fabricated fallbacks anywhere.** Unconfigured weather API → 503, not
  a fake 38 °C. No mock-report fallbacks. Every dataset carries provenance
  (`isSynthetic`, `status`).
- **TVI-lite vulnerability scoring.** `TVI = 0.5·heat + 0.3·reports +
  0.2·population`, caps and renormalization documented in the Evaluation section below.
- **DBSCAN hotspots, per city, reader-atomic.** Verified reports only;
  insert-then-flip publication pointers, so readers always see exactly one
  complete run. `eps=1.0 km`, `min_samples=3` — calibrated by the Phase 8
  sensitivity sweep.
- **Deterministic directives + bilingual advisories.** Tier×context lookup
  tables for admins; EN + UR citizen advisories escalated by heat-index band.
  No LLM, no generation — the same input always produces the same output.
- **Area Insights & Multi-Format Decision Briefings.** Scoped decision
  reports by city + area + time window (7, 30, 90 days). Aggregates verified
  reports only, computes baseline temperature deltas vs city average, enforces
  statistical trend-eligibility gating (withholding sparse series rather than
  extrapolating), ranks published hotspots by TVI descending, aggregates top
  directives, and provides three exits: interactive UI, formula-injection-guarded
  multi-section CSV (`format=csv`), raw JSON, and styled print-to-PDF (`window.print()`).

## What it does NOT do

- No server-side PDF engine: `format=pdf` returns an honest 400 explaining no
  server-side PDF renderer exists (stakeholders use browser print-to-PDF with
  dedicated `@media print` layout, or CSV/JSON exports).
- No LLM narrator, no WBGT, no NDBI/emissivity calibration, no cool-shelter
  navigation, no offline PWA, no NDMA/PDMA command-center workflows — all
  parked under Future Work.
- Manual browser-flow validation and nginx runtime validation are
  environmentally blocked and are not claimed.

---

## Quickstart

**Prerequisites:** Node 20+, Python 3.12, `mongod` running locally.

```bash
# 1. Backend
cd Backend && npm ci && cp .env.example .env   # set JWT_SECRET, MONGO_URI
npm run seed        # deterministic demo dataset (1 admin, 3 citizens, ~50 reports)

# 2. ML service
cd ../ML && python -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env   # optional: WEATHER_API_KEY, GEE credentials, ML_SERVICE_KEY

# 3. Frontend
cd ../Frontend && npm ci && cp .env.example .env
npm run dev   # :5173  (VITE_API_BASE_URL -> http://localhost:5000)
```

Run the services (separate terminals):

```bash
cd Backend && npm run dev     # :5000
cd ML && .venv/bin/python -m uvicorn main:app --port 8000   # :8000 (starts the 30-min pipeline tick)
cd Frontend && npm run dev    # :5173
```

Demo credentials (seeded): `admin@thermax-demo.com` / `ThermaX-Admin-2026!`,
`citizen1@thermax-demo.com` / `ThermaX-Citizen-2026!`.

## The 5-minute defense demo

```bash
./scripts/demo.sh
```

Fresh database → seed → synthetic weather → one full pipeline tick →
printed hotspots/TVI/advisories per city. Measured **13.7 s** end-to-end on
a local machine, no API keys needed. The seeded weather is explicitly
synthetic (`source: "demo-seed"`, `isSynthetic: true`).

---

## Evaluation

Every number below was measured by running the system code:

| Evaluation | Result |
|---|---|
| DBSCAN `eps × min_samples` sweep (20 cells) | Stable region `eps=1.0, min_samples ∈ {2,3,5}`; `eps ≥ 1.5` merges distinct hotspots → default recalibrated 1.5 → **1.0** |
| QC precision / recall (20 honest + 10 spoofed, seeded) | **1.00 / 1.00** (test asserts ≥ 0.80; seeded heuristic check, not field validation) |
| Fusion weights (citizen 0.30 / weather 0.35 / satellite 0.35) | Design-justified, missing-signal renormalization |
| TVI weights (0.5 / 0.3 / 0.2) | Design-justified; not statistically calibrated (no health-outcome data) |
| Seeded-zone hotspot recovery (demo) | **8/9** (Karachi 3/3, Lahore 2/3 — one DBSCAN merge, Islamabad 3/3) |
| Defense demo | **13.7 s**, 50/50 reports verified, 8 hotspots with TVI + bilingual advisories + directives |

Reproduce:

```bash
cd ML && python eval/sensitivity.py
cd ML && python -m pytest tests/test_qc.py -q -s
./scripts/demo.sh
```

---

## Repository layout

```
ThermaX/
├── Frontend/            # React + Vite citizen/admin app
├── Backend/             # Express + MongoDB API (system of record)
│   ├── data/cities.json        # city authority (shared with ML)
│   ├── data/pop_grids/         # WorldPop 2020 1 km grids
│   └── scripts/seed.js         # deterministic demo dataset
├── ML/                  # FastAPI enrichment/scoring service
│   ├── services/               # qc, fusion, clustering, tvi, gee, directives…
│   ├── eval/sensitivity.py     # Phase 8 DBSCAN sweep
│   └── tests/                  # 13 files incl. test_eval.py, test_qc.py
├── scripts/demo.sh             # the 5-minute defense demo
├── docker-compose.yml          # backend + ML + frontend
└── k8s/                        # manifests (replicas pinned to 1: in-process
                                # rate limit + single APScheduler)
```

---

## Future Work

- **WBGT** (wet-bulb globe temperature) as the physiological heat metric.
- **NDBI / emissivity calibration** for the satellite LST term.
- **Cool-shelter navigation** — routing citizens to cooling centers.
- **LLM narrator** — natural-language hotspot briefings (parked: determinism
  preferred for safety-critical advisories).
- **Nationwide operations** — beyond the 3 supported cities.
- **Real PDF engine** for exports (currently honestly HTML/CSV only).
- **Field validation** — QC against real fraud, DBSCAN against real report
  density; calibration of fusion/TVI weights against health-outcome records.
- Offline PWA; NDMA/PDMA command-center workflows.
