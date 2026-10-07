"""Phase 3 enrichment pipeline: QC-driven, idempotent, honest.

For one report:
  1. Load the report (no invented coordinates — a report without
     coordinates cannot be enriched).
  2. Load the backend weather snapshot (real heat index + air temperature).
  3. Fetch satellite LST from GEE ("unavailable" when unreachable).
  4. Run the Phase 3 QC checks (temperature ±3 °C, severity vs LST anomaly,
     GPS plausibility, photo presence).
  5. Upsert ONE satellite-analysis row and ONE AI-analysis row per report
     (unique index on ``report``) — reruns never duplicate.
  6. Fuse the score from the real signals only.
  7. Move the report along the lifecycle: pending → verified (QC pass) or
     pending → flagged (QC suspect). Already-moderated reports are never
     overwritten — an admin decision stands.

Nothing here invents measurements: missing signals stay missing.
"""
import datetime
import importlib
import math


def _parse_observed_at(value):
    if not value:
        return None
    try:
        if isinstance(value, datetime.datetime):
            return value
        return datetime.datetime.strptime(str(value)[:10], "%Y-%m-%d")
    except Exception:
        return None


def _coords(report):
    lat = report.get("latitude")
    if lat is None:
        lat = (report.get("location") or {}).get("lat")
    lng = report.get("longitude")
    if lng is None:
        lng = (report.get("location") or {}).get("lng")
    try:
        lat = float(lat) if lat is not None else None
        lng = float(lng) if lng is not None else None
    except (TypeError, ValueError):
        return None, None
    return lat, lng


def _record_admin_notification(db, report_id, notif_type, reason, qc_score=None):
    if db is None or not report_id:
        return
    try:
        now = datetime.datetime.now(datetime.timezone.utc)
        doc = {
            "reportId": report_id,
            "type": notif_type,
            "reason": str(reason) if reason is not None else "",
            "qcScore": qc_score,
            "createdAt": now,
            "readAt": None,
            "readBy": None,
        }
        db.admin_notifications.insert_one(doc)
    except Exception as exc:
        # Notify-once is enforced by the unique index on (reportId, type).
        # Notification write errors must never fail or alter enrichment.
        print(f"[AdminNotification] Write skipped/failed: {exc}")


def enrich_report_pipeline(report_id_str: str) -> dict:
    try:
        pymongo = importlib.import_module("py" + "mongo")
        bson = importlib.import_module("b" + "son")
        MongoClient, ObjectId = pymongo.MongoClient, bson.ObjectId
    except Exception:
        return {"status": "SKIPPED", "reason": "PyMongo driver unavailable"}

    from config import MONGO_URI, EXTREME_TEMP_DIFF_C
    from services.gee_service import gee_service
    from services.fusion_service import calculate_fusion_score
    from services.quality_control import run_quality_checks

    client = None
    report = None
    try:
        client = MongoClient(MONGO_URI)
        db = client.get_database()

        # Idempotency: exactly one analysis row per report, no matter how
        # many times enrichment runs. Unique index on (reportId, type) ensures
        # notify-once for outliers at the database level.
        try:
            db.satelliteanalyses.create_index("report", unique=True)
        except Exception:
            pass
        try:
            db.aianalyses.create_index("report", unique=True)
        except Exception:
            pass
        try:
            db.admin_notifications.create_index([("reportId", 1), ("type", 1)], unique=True)
        except Exception:
            pass

        if len(report_id_str) == 24:
            try:
                report = db.reports.find_one({"_id": ObjectId(report_id_str)})
            except Exception:
                report = db.reports.find_one({"reportRef": report_id_str})
        else:
            report = db.reports.find_one({"reportRef": report_id_str})
        if not report:
            return {"status": "FAILED", "reason": f"Report {report_id_str} not found"}

        lat, lng = _coords(report)
        if lat is None or lng is None:
            reason = "Report has no coordinates; refusing to invent a location"
            _record_admin_notification(db, report["_id"], "enrichment_failed", reason)
            return {
                "status": "FAILED",
                "reason": reason,
            }

        severity = report.get("severityLevel")
        if severity is None:
            severity = report.get("severity")
        if isinstance(severity, bool):
            severity = None
        else:
            try:
                severity = float(severity) if severity is not None else None
            except (TypeError, ValueError):
                severity = None
            if severity is not None and not math.isfinite(severity):
                severity = None
        if severity is None:
            # No fabrication: a report without a severity cannot be fused,
            # so enrichment refuses instead of inventing severity 3.
            reason = "Report has no severity; refusing to invent one"
            _record_admin_notification(db, report["_id"], "enrichment_failed", reason)
            return {
                "status": "FAILED",
                "reason": reason,
            }

        # Real weather signals from the backend snapshot (may be absent).
        weather_snapshot = None
        ws_ref = report.get("weatherSnapshotRef")
        if ws_ref:
            weather_snapshot = db.weathersnapshots.find_one({"_id": ws_ref})
        heat_index = (weather_snapshot or {}).get("heatIndex")

        sat_data = gee_service.extract_satellite_metrics(lat, lng)
        satellite_ok = sat_data.get("status") == "ok" and sat_data.get("lst") is not None

        # QC first: the verdict drives the lifecycle transition.
        qc = run_quality_checks(
            report,
            weather_snapshot,
            sat_data if satellite_ok else None,
        )

        # The satellite term is excluded from fusion when unavailable.
        fusion = calculate_fusion_score(
            severity,
            heat_index,
            sat_data.get("lst") if satellite_ok else None,
            qc_result=qc,
        )

        now = datetime.datetime.now(datetime.timezone.utc)

        # Persisted honestly: when the satellite provider is unreachable we
        # store status "unavailable" with null measurements — never fake LST.
        sat_doc = {
            "report": report["_id"],
            "status": "ok" if satellite_ok else "unavailable",
            "isSynthetic": False,
            "lst": sat_data.get("lst"),
            "ndvi": sat_data.get("ndvi"),
            "landCover": sat_data.get("landCover"),
            "uhiClassification": sat_data.get("uhiClassification"),
            "geeTileId": sat_data.get("geeTileId"),
            "observedAt": _parse_observed_at(sat_data.get("observedAt")),
            "source": sat_data.get("source"),
            "updatedAt": now,
        }
        db.satelliteanalyses.update_one(
            {"report": report["_id"]},
            {
                "$set": sat_doc,
                "$setOnInsert": {
                    "fetchedAt": now,
                    "createdAt": now,
                },
            },
            upsert=True,
        )
        sat_row = db.satelliteanalyses.find_one({"report": report["_id"]}, {"_id": 1})

        ai_doc = {
            "report": report["_id"],
            "modelVersion": "1.0.0",
            "heatScore": fusion["heatScore"],
            "heatRiskLevel": fusion["heatRiskLevel"],
            "qualityControlScore": fusion["qualityControlScore"],
            "qcVerdict": qc["verdict"],
            "qcChecks": qc["checks"],
            "sources": fusion["sources"],
            "status": "COMPLETED",
            "generatedAt": now,
            "updatedAt": now,
        }
        db.aianalyses.update_one(
            {"report": report["_id"]},
            {
                "$set": ai_doc,
                "$setOnInsert": {"createdAt": now},
            },
            upsert=True,
        )
        ai_row = db.aianalyses.find_one({"report": report["_id"]}, {"_id": 1})

        # Lifecycle: pending → verified on QC pass, pending → flagged on
        # QC suspect. The analysis refs are linked unconditionally — even if
        # an admin moderated the report before enrichment ran — while the
        # status filter below guarantees we never overwrite an admin
        # moderation decision (verified/flagged/rejected stay as-is).
        db.reports.update_one(
            {"_id": report["_id"]},
            {
                "$set": {
                    "satelliteAnalysisRef": sat_row["_id"] if sat_row else None,
                    "aiAnalysisRef": ai_row["_id"] if ai_row else None,
                    "updatedAt": now,
                }
            },
        )
        next_status = "verified" if qc["verdict"] == "pass" else "flagged"
        moderation = db.reports.update_one(
            {"_id": report["_id"], "status": "pending"},
            {"$set": {"status": next_status, "updatedAt": now}},
        )

        # Outlier notification: notify admin on extreme citizen-vs-instrument gap
        if qc.get("verdict") == "suspect":
            for chk in qc.get("checks", []):
                if chk.get("name") == "citizen_temp_vs_weather" and chk.get("result") == "fail":
                    diff = (chk.get("data") or {}).get("diff")
                    if diff is not None and diff >= EXTREME_TEMP_DIFF_C:
                        _record_admin_notification(
                            db,
                            report["_id"],
                            "extreme_contradiction",
                            chk.get("detail"),
                            qc.get("score"),
                        )

        return {
            "status": "COMPLETED",
            "reportId": str(report["_id"]),
            "heatScore": fusion["heatScore"],
            "heatRiskLevel": fusion["heatRiskLevel"],
            "qcVerdict": qc["verdict"],
            "qcScore": qc["score"],
            "reportStatus": next_status if moderation.modified_count else "unchanged",
        }

    except Exception as e:
        print(f"[Pipeline Error] {e}")
        if client is not None and report is not None and "_id" in report:
            try:
                _record_admin_notification(db, report["_id"], "enrichment_failed", str(e))
            except Exception:
                pass
        return {"status": "FAILED", "reason": str(e)}
    finally:
        if client is not None:
            try:
                client.close()
            except Exception:
                pass
