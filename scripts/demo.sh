#!/usr/bin/env bash
#
# Phase 8 — the 5-minute defense demo.
#
#   fresh Mongo database -> deterministic seed -> synthetic weather ->
#   one full ML pipeline tick -> printed hotspots / TVI / advisories.
#
# Repeatable: every step is deterministic and the database is dropped first.
# Target: under 5 minutes on a local machine.
#
# Honest-data notes (see README.md for the full story):
#  - the seeded reports are synthetic (isSynthetic: true);
#  - weather snapshots are synthetic too (source=demo-seed), because a demo
#    machine has no weather/GEE API keys;
#  - INCLUDE_SYNTHETIC_REPORTS=true is a deliberate demo opt-in — the
#    production pipeline excludes synthetic data.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MONGO_URI="${MONGO_URI:-mongodb://127.0.0.1:27017/thermax_demo}"
export MONGO_URI
export NODE_ENV=development
export INCLUDE_SYNTHETIC_REPORTS=true

# ─── preflight ─────────────────────────────────────────────────────────────
need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "demo.sh: missing '$1' — $2" >&2
    exit 1
  }
}
need node "install Node.js 20+"
need npm "install Node.js 20+"

PY=python3
if [ -x "$ROOT/ML/.venv/bin/python" ]; then
  PY="$ROOT/ML/.venv/bin/python"
fi
"$PY" -c "import pymongo" 2>/dev/null || {
  echo "demo.sh: python module 'pymongo' is missing for $PY" >&2
  echo "  install it with: $PY -m pip install -r $ROOT/ML/requirements.txt" >&2
  exit 1
}
[ -d "$ROOT/Backend/node_modules" ] || {
  echo "demo.sh: Backend dependencies are missing" >&2
  echo "  install them with: cd $ROOT/Backend && npm ci" >&2
  exit 1
}
"$PY" - "$MONGO_URI" <<'EOF' || {
import os, sys
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
uri = sys.argv[1]
try:
    MongoClient(uri, serverSelectionTimeoutMS=3000).get_database().command("ping")
except ServerSelectionTimeoutError:
    print(f"demo.sh: cannot reach MongoDB at {uri} — start mongod first", file=sys.stderr)
    raise SystemExit(1)
EOF
  exit 1
}

# ─── 1. fresh database ─────────────────────────────────────────────────────
echo "==> [1/5] dropping demo database"
"$PY" - "$MONGO_URI" <<'EOF'
import sys
from pymongo import MongoClient
uri = sys.argv[1]
client = MongoClient(uri)
client.drop_database(client.get_database().name)
print("    fresh: " + uri)
EOF

# ─── 2. seed ───────────────────────────────────────────────────────────────
echo "==> [2/5] seeding deterministic demo dataset"
(cd "$ROOT/Backend" && npm run seed --silent)

# ─── 3. synthetic weather ──────────────────────────────────────────────────
echo "==> [3/5] attaching synthetic weather snapshots (source=demo-seed)"
(cd "$ROOT/Backend" && node scripts/demo-enrich.js)

# ─── 4. pipeline tick ──────────────────────────────────────────────────────
echo "==> [4/5] running one full ML pipeline tick"
echo "    (enrich -> QC -> DBSCAN -> TVI -> advisories -> atomic publication)"
(cd "$ROOT/ML" && "$PY" -c "
from tasks import run_pipeline_tick
import json
summary = run_pipeline_tick()
print(json.dumps(summary, indent=2, default=str))
")

# ─── 5. report ─────────────────────────────────────────────────────────────
echo "==> [5/5] current published hotspots per city"
"$PY" "$ROOT/scripts/demo_report.py"
echo
echo "demo complete — the hotspots above are the current published runs."
