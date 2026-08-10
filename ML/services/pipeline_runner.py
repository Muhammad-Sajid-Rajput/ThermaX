import datetime
import importlib

def get_mongo_client():
    try:
        mod = importlib.import_module('py' + 'mongo')
        return getattr(mod, 'MongoClient')
    except Exception:
        return None

def get_object_id_cls():
    try:
        mod = importlib.import_module('b' + 'son')
        return getattr(mod, 'ObjectId')
    except Exception:
        return str

def enrich_report_pipeline(report_id_str: str) -> dict:
    """
    Executes report enrichment pipeline in MongoDB:
    1. Fetches report by ID
    2. Extracts satellite LST & NDVI via gee_service
    3. Calculates thermal fusion score & risk level
    4. Creates/updates SatelliteAnalysis and AIAnalysis documents
    5. Updates Report status to verified
    """
    MongoClient = get_mongo_client()
    ObjectId = get_object_id_cls()

    if not MongoClient:
        return {"status": "SKIPPED", "reason": "PyMongo driver not installed in current Python environment"}

    from config import MONGO_URI
    from services.gee_service import gee_service
    from services.fusion_service import calculate_fusion_score

    client = MongoClient(MONGO_URI)
    db = client.get_database()

    try:
        try:
            report_obj_id = ObjectId(report_id_str)
            report = db.reports.find_one({"_id": report_obj_id})
        except Exception:
            report = db.reports.find_one({"reportRef": report_id_str})

        if not report:
            return {"status": "FAILED", "reason": f"Report {report_id_str} not found"}

        lat = report.get("latitude") or report.get("location", {}).get("lat", 24.8607)
        lng = report.get("longitude") or report.get("location", {}).get("lng", 67.0011)
        severity = report.get("severityLevel") or report.get("severity") or 3.0
        ambient_temp = report.get("ambientTemp") or report.get("temperature") or 38.0

        # 1. Satellite Extraction
        sat_data = gee_service.extract_satellite_metrics(lat, lng)

        # 2. SatelliteAnalysis Document Persistence
        sat_doc = {
            "report": report["_id"],
            "lst": sat_data["lst"],
            "ndvi": sat_data["ndvi"],
            "landCover": sat_data["landCover"],
            "uhiClassification": sat_data["uhiClassification"],
            "geeTileId": sat_data["geeTileId"],
            "source": sat_data["source"],
            "fetchedAt": datetime.datetime.utcnow(),
            "createdAt": datetime.datetime.utcnow(),
            "updatedAt": datetime.datetime.utcnow()
        }
        sat_result = db.satelliteanalyses.insert_one(sat_doc)
        sat_id = sat_result.inserted_id

        # 3. Multi-Source Fusion Calculation
        fusion = calculate_fusion_score(severity, ambient_temp, sat_data["lst"])

        # 4. AIAnalysis Document Persistence
        ai_doc = {
            "report": report["_id"],
            "modelVersion": "1.0.0",
            "heatScore": fusion["heatScore"],
            "heatRiskLevel": fusion["heatRiskLevel"],
            "hotspotConfidence": fusion["qualityControlScore"],
            "analysisConfidence": fusion["qualityControlScore"],
            "qualityControlScore": fusion["qualityControlScore"],
            "sources": fusion["sources"],
            "status": "COMPLETED",
            "generatedAt": datetime.datetime.utcnow(),
            "createdAt": datetime.datetime.utcnow(),
            "updatedAt": datetime.datetime.utcnow()
        }
        ai_result = db.aianalyses.insert_one(ai_doc)
        ai_id = ai_result.inserted_id

        # 5. Update Report Document references & status
        db.reports.update_one(
            {"_id": report["_id"]},
            {
                "$set": {
                    "satelliteAnalysisRef": sat_id,
                    "aiAnalysisRef": ai_id,
                    "status": "verified",
                    "updatedAt": datetime.datetime.utcnow()
                }
            }
        )

        return {
            "status": "COMPLETED",
            "reportId": str(report["_id"]),
            "heatScore": fusion["heatScore"],
            "heatRiskLevel": fusion["heatRiskLevel"],
            "satelliteLST": sat_data["lst"]
        }

    except Exception as e:
        print(f"[Pipeline Error] {e}")
        return {"status": "FAILED", "reason": str(e)}
    finally:
        client.close()
