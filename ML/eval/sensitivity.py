"""Phase 8 evaluation: DBSCAN eps x min_samples sensitivity sweep.

Feeds a deterministic synthetic point set (3 tight clusters + scattered
noise, mimicking the seeded demo geometry) through
``services.clustering_service.run_dbscan_clustering`` over a grid of
``(eps_km, min_samples)`` and reports, per cell:

- clusters found
- noise points (points not in any cluster)
- largest cluster size
- expected clusters recovered (a true center counts as recovered when some
  found cluster's centroid is within 1.0 km of it)

Usage (from the ML directory)::

    python eval/sensitivity.py        # markdown table on stdout
    python eval/sensitivity.py --tsv  # tab-separated values

Exit code 0 on success. The pure ``sweep()`` function is importable so the
test suite can pin the behavior (see tests/test_eval.py).
"""

import os
import random
import sys

# Make ``config`` and ``services.*`` importable whether this file is run as
# ``python eval/sensitivity.py`` or imported as ``eval.sensitivity``.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.clustering_service import (  # noqa: E402
    haversine_distance_km,
    run_dbscan_clustering,
)
from config import DBSCAN_EPS_KM, DBSCAN_MIN_SAMPLES  # noqa: E402

# Grid prescribed by the implementation plan.
EPS_VALUES = [0.5, 1.0, 1.5, 2.0, 3.0]
MIN_SAMPLES_VALUES = [2, 3, 5, 8]

# Recovery radius: a true cluster center counts as recovered when a found
# cluster's centroid lands within this distance (km).
RECOVERY_RADIUS_KM = 1.0

# The production defaults under test — read from config so the sweep can
# never disagree with the deployed value.
DEFAULT_EPS_KM = DBSCAN_EPS_KM
DEFAULT_MIN_SAMPLES = DBSCAN_MIN_SAMPLES


def make_demo_points(seed=20260928):
    """Deterministic point set: 3 tight clusters + 6 scattered noise points.

    Geometry mirrors ``Backend/scripts/seed.js``: cluster centers ~1.8-2.0 km
    apart, members jittered within ~0.45 km, noise spread over ~5 km. Every
    point carries a citizen temperature (38-46 C in clusters, cooler noise)
    so the clustering thermal stats path is exercised too.
    """
    rng = random.Random(seed)
    # Same relative geometry as Backend/scripts/seed.js: cluster centers
    # ~1.8-2.0 km apart, members jittered within ~0.45 km — the sweep
    # evaluates the clustering the demo actually runs.
    base_lat, base_lng = 24.8607, 67.0011
    centers = [
        (base_lat + 0.008, base_lng + 0.006),
        (base_lat - 0.010, base_lng + 0.004),
        (base_lat + 0.002, base_lng - 0.012),
    ]
    points = []
    pid = 0
    for clat, clng in centers:
        for _ in range(5):
            pid += 1
            points.append(
                {
                    "id": f"p{pid}",
                    "lat": clat + (rng.random() * 2 - 1) * 0.004,
                    "lng": clng + (rng.random() * 2 - 1) * 0.004,
                    "temp": round(38 + rng.random() * 8, 1),
                }
            )
    for _ in range(6):
        pid += 1
        points.append(
            {
                "id": f"p{pid}",
                "lat": 24.8607 + (rng.random() * 2 - 1) * 0.05,
                "lng": 67.0011 + (rng.random() * 2 - 1) * 0.05,
                "temp": round(34 + rng.random() * 4, 1),
            }
        )
    return points, centers


def recovered_centers(clusters, true_centers, radius_km=RECOVERY_RADIUS_KM):
    """How many true centers have a found cluster centroid nearby."""
    recovered = 0
    for tlat, tlng in true_centers:
        for c in clusters:
            cent = c["centroid"]
            if (
                haversine_distance_km(tlat, tlng, cent["lat"], cent["lng"])
                <= radius_km
            ):
                recovered += 1
                break
    return recovered


def sweep(points, true_centers, eps_values=EPS_VALUES,
          min_samples_values=MIN_SAMPLES_VALUES):
    """Run the full grid. Returns a list of row dicts (deterministic)."""
    rows = []
    for eps in eps_values:
        for ms in min_samples_values:
            clusters = run_dbscan_clustering(
                points, eps_km=eps, min_samples=ms)
            clustered = sum(c["reportCount"] for c in clusters)
            rows.append(
                {
                    "eps_km": eps,
                    "min_samples": ms,
                    "clusters": len(clusters),
                    "noise": len(points) - clustered,
                    "largest": max(
                        (c["reportCount"] for c in clusters), default=0),
                    "recovered": recovered_centers(clusters, true_centers),
                    "expected": len(true_centers),
                }
            )
    return rows


def as_markdown(rows):
    lines = [
        "| eps (km) | min_samples | clusters | noise pts | largest | "
        "expected recovered |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for r in rows:
        flag = " **<-- production defaults**" if (
            r["eps_km"] == DEFAULT_EPS_KM
            and r["min_samples"] == DEFAULT_MIN_SAMPLES
        ) else ""
        lines.append(
            f"| {r['eps_km']} | {r['min_samples']} | {r['clusters']} | "
            f"{r['noise']} | {r['largest']} | "
            f"{r['recovered']}/{r['expected']}{flag} |"
        )
    return "\n".join(lines)


def as_tsv(rows):
    lines = ["eps_km\tmin_samples\tclusters\tnoise\tlargest\trecovered\texpected"]
    for r in rows:
        lines.append(
            f"{r['eps_km']}\t{r['min_samples']}\t{r['clusters']}\t"
            f"{r['noise']}\t{r['largest']}\t{r['recovered']}\t{r['expected']}"
        )
    return "\n".join(lines)


def main(argv=None):
    argv = argv or []
    points, centers = make_demo_points()
    rows = sweep(points, centers)
    print(f"# DBSCAN sensitivity — {len(points)} points, "
          f"{len(centers)} true clusters + noise")
    print()
    if "--tsv" in argv:
        print(as_tsv(rows))
    else:
        print(as_markdown(rows))
    print()
    stable = [r for r in rows if r["recovered"] == r["expected"]]
    print(
        f"Cells recovering all {len(centers)} expected clusters: "
        f"{len(stable)}/{len(rows)}"
    )
    default = next(
        (
            r for r in rows
            if r["eps_km"] == DEFAULT_EPS_KM
            and r["min_samples"] == DEFAULT_MIN_SAMPLES
        ),
        None,
    )
    if default is not None:
        print(
            f"Production defaults (eps={DEFAULT_EPS_KM} km, "
            f"min_samples={DEFAULT_MIN_SAMPLES}): "
            f"{default['clusters']} clusters, "
            f"{default['recovered']}/{default['expected']} expected recovered"
        )
    else:
        print(
            f"Current environment defaults (eps={DEFAULT_EPS_KM} km, "
            f"min_samples={DEFAULT_MIN_SAMPLES}) are outside the standard sweep grid."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
