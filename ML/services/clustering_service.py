import math
from config import DBSCAN_EPS_KM, DBSCAN_MIN_SAMPLES, EARTH_RADIUS_KM

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi, dlambda = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    return EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def run_dbscan_clustering(report_points: list, eps_km: float = DBSCAN_EPS_KM, min_samples: int = DBSCAN_MIN_SAMPLES) -> list:
    n = len(report_points)
    if n < min_samples:
        return []

    neighbors = [
        [j for j in range(n) if i != j and haversine_distance_km(report_points[i]['lat'], report_points[i]['lng'], report_points[j]['lat'], report_points[j]['lng']) <= eps_km]
        for i in range(n)
    ]

    visited, labels, cluster_id = [False] * n, [-1] * n, 0
    for i in range(n):
        if visited[i]:
            continue
        visited[i] = True
        if len(neighbors[i]) + 1 >= min_samples:
            labels[i] = cluster_id
            seeds = list(neighbors[i])
            while seeds:
                curr = seeds.pop(0)
                if not visited[curr]:
                    visited[curr] = True
                    if len(neighbors[curr]) + 1 >= min_samples:
                        seeds.extend([nbr for nbr in neighbors[curr] if nbr not in seeds])
                if labels[curr] == -1:
                    labels[curr] = cluster_id
            cluster_id += 1

    clusters = []
    for label in set(l for l in labels if l != -1):
        members = [report_points[idx] for idx, l in enumerate(labels) if l == label]
        lats, lngs, temps = [m['lat'] for m in members], [m['lng'] for m in members], [m.get('temp', 40.0) for m in members]
        peak_temp = max(temps)
        min_lat, max_lat, min_lng, max_lng = min(lats) - 0.005, max(lats) + 0.005, min(lngs) - 0.005, max(lngs) + 0.005

        clusters.append({
            "clusterId": f"CL-{label + 1:02d}",
            "centroid": {"lat": round(sum(lats) / len(lats), 4), "lng": round(sum(lngs) / len(lngs), 4)},
            "boundary": {"type": "Polygon", "coordinates": [[[min_lng, min_lat], [max_lng, min_lat], [max_lng, max_lat], [min_lng, max_lat], [min_lng, min_lat]]]},
            "avgTemp": round(sum(temps) / len(temps), 1),
            "peakTemp": round(peak_temp, 1),
            "reportCount": len(members),
            "memberReportIds": [m['id'] for m in members],
            "severity": 'critical' if peak_temp >= 43.0 else ('high' if peak_temp >= 40.0 else 'moderate'),
            "status": "active"
        })

    return clusters
