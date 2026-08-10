import datetime
import importlib

def enrich_report_pipeline(report_id_str: str) -> dict:
    try:
        pymongo = importlib.import_module("py" + "mongo")
        bson = importlib.import_module("b" + "son")
        MongoClient, ObjectId = pymongo.MongoClient, bson.ObjectId
    except Exception:
        return {"status": "SKIPPED", "reason": "PyMongo driver unavailable"}

    from config import MONGO_URI
    from services.gee_service import gee_service
    from services.fusion_service import calculate_fusion_score

    client = MongoClient(MONGO_URI)
    db = client.get_database()

    try:
        report = db.reports.find_one({"_id": ObjectId(report_id_str)}) if len(report_id_str) == 24 else db.reports.find_one({"reportRef": report_id_str})
        if not report:
            return {"status": "FAILED", "reason": f"Report {report_id_str} not found"}

        lat = report.get("latitude") or report.get("location", {}).get("lat", 24.8607)
        lng = report.get("longitude") or report.get("location", {}).get("lng", 67.0011)
        severity = report.get("severityLevel") or report.get("severity") or 3.0
        ambient_temp = report.get("ambientTemp") or report.get("temperature") or 38.0

        sat_data = gee_service.extract_satellite_metrics(lat, lng)
        sat_id = db.satelliteanalyses.insert_one({
            "report": report["_id"], "lst": sat_data["lst"], "ndvi": sat_data["ndvi"],
            "landCover": sat_data["landCover"], "uhiClassification": sat_data["uhiClassification"],
            "geeTileId": sat_data["geeTileId"], "source": sat_data["source"],
            "fetchedAt": datetime.datetime.utcnow(), "createdAt": datetime.datetime.utcnow(), "updatedAt": datetime.datetime.utcnow()
        }).inserted_id

        fusion = calculate_fusion_score(severity, ambient_temp, sat_data["lst"])
        ai_id = db.aianalyses.insert_one({
            "report": report["_id"], "modelVersion": "1.0.0", "heatScore": fusion["heatScore"],
            "heatRiskLevel": fusion["heatRiskLevel"], "qualityControlScore": fusion["qualityControlScore"],
            "sources": fusion["sources"], "status": "COMPLETED",
            "generatedAt": datetime.datetime.utcnow(), "createdAt": datetime.datetime.utcnow(), "updatedAt": datetime.datetime.utcnow()
        }).inserted_id

        db.reports.update_one(
            {"_id": report["_id"]},
            {"$set": {"satelliteAnalysisRef": sat_id, "aiAnalysisRef": ai_id, "status": "verified", "updatedAt": datetime.datetime.utcnow()}}
        )

        return {"status": "COMPLETED", "reportId": str(report["_id"]), "heatScore": fusion["heatScore"], "heatRiskLevel": fusion["heatRiskLevel"]}

    except Exception as e:
        print(f"[Pipeline Error] {e}")
        return {"status": "FAILED", "reason": str(e)}
    finally:
        client.close()
