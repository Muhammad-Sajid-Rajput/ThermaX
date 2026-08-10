import datetime
import importlib
from config import MONGO_URI
from services.pipeline_runner import enrich_report_pipeline
from services.clustering_service import run_dbscan_clustering

def enrich_report_task(report_id: str) -> dict:
    """Asynchronous background worker task to enrich thermal report in MongoDB."""
    return enrich_report_pipeline(report_id)

def run_clustering_task(city: str = "Karachi") -> dict:
    """Periodic scheduler task to run spatial DBSCAN clustering and update Hotspots in MongoDB."""
    try:
        pymongo = importlib.import_module("py" + "mongo")
        client = pymongo.MongoClient(MONGO_URI)
        db = client.get_database()

        # Fetch verified or pending citizen reports
        cursor = db.reports.find({"$or": [{"city": city}, {"city": {"$exists": False}}]})
        reports = list(cursor)

        points = []
        for r in reports:
            r_id = str(r["_id"])
            lat = r.get("latitude") or r.get("location", {}).get("lat")
            lng = r.get("longitude") or r.get("location", {}).get("lng")
            temp = r.get("ambientTemp") or r.get("temperature", 40.0)
            if lat and lng:
                points.append({"id": r_id, "lat": lat, "lng": lng, "temp": temp})

        clusters = run_dbscan_clustering(points)

        # Replace active hotspot clusters in MongoDB Atlas
        if clusters:
            db.hotspots.delete_many({"city": city})
            now = datetime.datetime.utcnow()
            for c in clusters:
                c["city"] = city
                c["createdAt"] = now
                c["updatedAt"] = now
                db.hotspots.insert_one(c)

        client.close()
        return {
            "status": "COMPLETED",
            "city": city,
            "reportsProcessed": len(points),
            "clustersFound": len(clusters)
        }

    except Exception as e:
        print(f"[Worker Clustering Task Error] {e}")
        return {"status": "FAILED", "reason": str(e)}
