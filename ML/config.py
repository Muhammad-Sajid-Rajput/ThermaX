import json
import os

def _load_env():
    for path in ['../Backend/.env', '.env']:
        if os.path.exists(path):
            with open(path, encoding='utf-8') as f:
                for line in f:
                    if '=' in line and not line.strip().startswith('#'):
                        k, v = line.strip().split('=', 1)
                        os.environ.setdefault(k.strip(), v.strip())

_load_env()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MONGO_URI = os.getenv('MONGO_URI') or os.getenv('MONGODB_URI') or 'mongodb://localhost:27017/thermax'
PORT = int(os.getenv('PORT', 8000))
GEE_PROJECT_ID = os.getenv('GEE_PROJECT_ID', 'heatmappingfyp')
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
# Phase 8 calibration: the DBSCAN sensitivity sweep (ML/eval/sensitivity.py)
# on the seeded demo geometry (cluster centers ~1.8-2.0 km apart, members
# within ~0.45 km) showed eps=1.5 density-merging adjacent hotspots into one,
# while eps=1.0 recovers every seeded cluster and stays stable across
# min_samples 2-5. eps=1.0 is the default; re-validate against real report
# density in field deployment. Overridable via DBSCAN_EPS_KM.
DBSCAN_EPS_KM = float(os.getenv('DBSCAN_EPS_KM', 1.0))
DBSCAN_MIN_SAMPLES = int(os.getenv('DBSCAN_MIN_SAMPLES', 3))
EARTH_RADIUS_KM = 6371.0088

# ─── Phase 4 scheduler ─────────────────────────────────────────────────────
# How often the pipeline tick runs: enrich pending reports → QC → DBSCAN per
# city → fusion → TVI-lite (Phase 5) → directives/advisories (Phase 6) →
# atomic hotspot publication, all in the same tick.
PIPELINE_INTERVAL_MINUTES = int(os.getenv("PIPELINE_INTERVAL_MINUTES", 30))
# Shared secret the backend sends as X-Service-Key on every ML call.
# Empty in local dev (endpoints stay open); set it in staging/prod.
ML_SERVICE_KEY = os.getenv("ML_SERVICE_KEY", "")
# Demo/demo-seed reports (isSynthetic: true) are excluded from clustering by
# default — the public hotspot map must never be built from fabricated demo
# data. Set to "true" only for a deliberate demo run against the seed set.
INCLUDE_SYNTHETIC_REPORTS = os.getenv("INCLUDE_SYNTHETIC_REPORTS", "false").lower() == "true"
# Deployment environment: "production" triggers fail-fast behavior (e.g.
# refusing to boot without ML_SERVICE_KEY). Anything else is dev/test.
ENV_NAME = os.getenv("ENV", os.getenv("NODE_ENV", "development")).lower()
# Simple in-memory sliding-window rate limit: requests per minute per IP.
ML_RATE_LIMIT_PER_MINUTE = int(os.getenv("ML_RATE_LIMIT_PER_MINUTE", 100))
# JSON body guard: larger payloads are rejected with 413.
ML_MAX_BODY_BYTES = int(os.getenv("ML_MAX_BODY_BYTES", 5 * 1024 * 1024))

# ─── Phase 3 QC calibration ─────────────────────────────────────────────────
# Tolerances for the QC cross-checks. Coarse, documented, and adjustable
# without a code change. These are heuristics for South-Asian summer
# daytime urban heat — NOT calibrated physical thresholds — and the wide
# tolerances are what keep the checks honest.
QC_TEMP_TOLERANCE_C = float(os.getenv("QC_TEMP_TOLERANCE_C", 3.0))
QC_ANOMALY_TOLERANCE_C = float(os.getenv("QC_ANOMALY_TOLERANCE_C", 8.0))
QC_SCORE_PENALTY_PER_FAILURE = float(os.getenv("QC_SCORE_PENALTY_PER_FAILURE", 0.35))

# ─── Phase 5: shared city definitions ──────────────────────────────────────────
# The canonical city list (name, boundary polygon, center, timezone) lives in
# Backend/data/cities.json. The ML service reads the SAME file the backend
# uses, so the two services can never disagree about what "Karachi" means.
# CITY_BOUNDS (coarse bboxes) is derived from it for the QC GPS-plausibility
# check, which only needs a rough box.
CITIES_CONFIG_PATH = os.getenv(
    "CITIES_CONFIG_PATH",
    os.path.join(BASE_DIR, "..", "Backend", "data", "cities.json"),
)

def _load_cities():
    try:
        with open(CITIES_CONFIG_PATH, encoding="utf-8") as f:
            data = json.load(f)
        cities = data.get("cities", [])
        return [c for c in cities if c.get("name")]
    except (OSError, ValueError) as exc:
        print(f"[config] WARNING: could not load cities config ({exc}); "
              "per-city pipeline disabled.")
        return []

CITIES = _load_cities()
CITY_NAMES = [c["name"] for c in CITIES]
CITY_SLUGS = {c["name"]: c.get("slug", c["name"].lower()) for c in CITIES}

CITY_BOUNDS = {}
for _c in CITIES:
    _b = _c.get("bbox") or {}
    CITY_BOUNDS[_c["name"]] = {
        "lat": (_b.get("minLat"), _b.get("maxLat")),
        "lng": (_b.get("minLng"), _b.get("maxLng")),
    }

# ─── Phase 5: TVI-lite (Thermal Vulnerability Index) ─────────────────────────
# TVI = 0.5·norm(heatScore) + 0.3·norm(reportDensity) + 0.2·norm(popDensity)
# Each component is normalized to 0–1 by dividing by its cap below and
# clamping; inputs above the cap saturate at 1.0 (documented, not hidden).
# Caps are coarse but explicit — the FYP report must justify or recalibrate
# them (Phase 8), not silently inherit them.
TVI_HEAT_WEIGHT = float(os.getenv("TVI_HEAT_WEIGHT", 0.5))
TVI_REPORT_WEIGHT = float(os.getenv("TVI_REPORT_WEIGHT", 0.3))
TVI_POP_WEIGHT = float(os.getenv("TVI_POP_WEIGHT", 0.2))
# heatScore is the 0–100 fusion output (see fusion_service.py).
TVI_HEAT_MAX = float(os.getenv("TVI_HEAT_MAX", 100.0))
# reportDensity = reports in the hotspot; 20+ reports saturate at 1.0.
TVI_REPORT_DENSITY_CAP = float(os.getenv("TVI_REPORT_DENSITY_CAP", 20.0))
# popDensity = persons/km² at the hotspot centroid from the static WorldPop
# 2020 1km grid (Backend/data/pop_grids/); 50,000+/km² saturates at 1.0.
TVI_POP_DENSITY_CAP = float(os.getenv("TVI_POP_DENSITY_CAP", 50000.0))
# Directory holding <city-slug>.json population grids (see pop_grid.py).
POP_GRID_DIR = os.getenv(
    "POP_GRID_DIR",
    os.path.join(BASE_DIR, "..", "Backend", "data", "pop_grids"),
)

# ─── Phase 6: riskTier thresholds + advisory bands ──────────────────────────
# riskTier is derived from the TVI-lite score (0–1). These are operational
# thresholds, not calibrated epidemiological cutoffs — the FYP report
# (Phase 8) must justify or recalibrate them against observed outcomes.
# A hotspot with tvi=None (no component data) gets tier "unknown": no
# directives are issued for it, honestly, instead of a default tier.
TVI_TIER_CRITICAL = float(os.getenv("TVI_TIER_CRITICAL", 0.65))
TVI_TIER_HIGH = float(os.getenv("TVI_TIER_HIGH", 0.45))
TVI_TIER_MODERATE = float(os.getenv("TVI_TIER_MODERATE", 0.25))
# Heat-index bands (°C) for citizen advisories. The index comes from member
# reports' weather snapshots (mean, members without one excluded); when no
# member has a heat index the band is "unknown" and the tier advisory stands
# alone — never a fabricated number.
HEAT_INDEX_EXTREME = float(os.getenv("HEAT_INDEX_EXTREME", 45.0))
HEAT_INDEX_HIGH = float(os.getenv("HEAT_INDEX_HIGH", 38.0))
# Population-density band threshold (persons/km², WorldPop 2020 grid): at or
# above this the hotspot counts as "dense" for directive context.
POP_DENSITY_HIGH = float(os.getenv("POP_DENSITY_HIGH", 15000.0))
# Peak-temperature band threshold (°C, citizen-measured): at or above this
# the extreme-temperature protocol directive applies.
PEAK_TEMP_EXTREME = float(os.getenv("PEAK_TEMP_EXTREME", 45.0))
