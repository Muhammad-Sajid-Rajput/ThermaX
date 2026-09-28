"""Phase 5 static population-density grid lookup.

Each supported city has a precomputed grid at
``Backend/data/pop_grids/<city-slug>.json``: row-major persons/km² derived
from the WorldPop 2020 1km UN-adjusted population raster
(``pak_ppp_2020_1km_Aggregated.tif``, https://www.worldpop.org/), masked to
the city's OSM boundary polygon, with per-row latitude area correction.
``null`` cells are outside the city polygon.

The grids are STATIC assets (sampled 2026-09-27) — the pipeline does a pure
local lookup, no network, no GEE call at tick time. Source and sampling
date are recorded inside each grid file.
"""
import json
import math
import os

from config import POP_GRID_DIR, CITY_SLUGS

_cache = {}


def _load_grid(city_name):
    if city_name in _cache:
        return _cache[city_name]
    slug = CITY_SLUGS.get(city_name, city_name.lower())
    path = os.path.join(POP_GRID_DIR, f"{slug}.json")
    try:
        with open(path, encoding="utf-8") as f:
            grid = json.load(f)
    except (OSError, ValueError) as exc:
        grid = {"error": str(exc)}
    _cache[city_name] = grid
    return grid


def pop_density_at(city_name, lat, lng):
    """Persons/km² at (lat, lng) from the city's static grid.

    O(1) row-major index. Returns None when the city has no grid, the point
    falls outside the grid window, or the cell is null (outside the city
    polygon) — the TVI service then excludes the population component
    instead of inventing one.
    """
    try:
        lat = float(lat)
        lng = float(lng)
    except (TypeError, ValueError):
        return None
    if not (math.isfinite(lat) and math.isfinite(lng)):
        return None
    grid = _load_grid(city_name)
    if grid.get("error") or "values" not in grid:
        return None
    min_lng, min_lat, max_lng, max_lat = grid["bbox"]
    rows, cols = grid["rows"], grid["cols"]
    if not (min_lng <= lng <= max_lng and min_lat <= lat <= max_lat):
        return None
    # Row 0 is the northernmost row.
    col = int((lng - min_lng) / (max_lng - min_lng) * cols)
    row = int((max_lat - lat) / (max_lat - min_lat) * rows)
    col = max(0, min(cols - 1, col))
    row = max(0, min(rows - 1, row))
    value = grid["values"][row * cols + col]
    if value is None:
        return None
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    return v if math.isfinite(v) and v >= 0 else None
