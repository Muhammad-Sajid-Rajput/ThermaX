"""Google Earth Engine satellite metrics.

Data-integrity rule: this module NEVER invents LST/NDVI values. When Earth
Engine is unavailable (no credentials, no network, query failure), it returns
an explicit "unavailable" payload with null measurements, and downstream
fusion excludes the satellite term.
"""
import os
import json
import datetime
import importlib
from config import GEE_PROJECT_ID

# Credentials: set GOOGLE_APPLICATION_CREDENTIALS to the GEE service-account
# JSON key path (Secure Vault -> env). ee.Initialize() picks it up via
# google.auth.default(); without it, the service reports "unavailable".
UNAVAILABLE = {
    "status": "unavailable",
    "isSynthetic": False,
    "lst": None,
    "ndvi": None,
    "landCover": None,
    "uhiClassification": None,
    "geeTileId": None,
    "source": "MODIS Terra LST (Google Earth Engine)",
}


class GEEService:
    def __init__(self):
        self.ee = None
        self.gee_available = False
        self.project_id = GEE_PROJECT_ID
        try:
            ee_mod = importlib.import_module("ee")
            # 1) Default credentials (user OAuth via `earthengine authenticate`).
            try:
                ee_mod.Initialize(project=self.project_id)
            except Exception:
                # 2) Service-account key file from GOOGLE_APPLICATION_CREDENTIALS.
                key_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
                if not key_path:
                    raise
                with open(key_path, "r", encoding="utf-8") as fh:
                    email = json.load(fh)["client_email"]
                creds = ee_mod.ServiceAccountCredentials(email, key_path)
                ee_mod.Initialize(creds, project=self.project_id)
            self.ee = ee_mod
            self.gee_available = True
            print(f"[GEE Service] Initialized Earth Engine API with project: '{self.project_id}'")
        except Exception as err:
            print(f"[GEE Service] Earth Engine unavailable ({err}); satellite metrics will report 'unavailable'.")

    def extract_satellite_metrics(self, lat: float, lng: float) -> dict:
        if self.gee_available and self.ee:
            try:
                point = self.ee.Geometry.Point([lng, lat])
                # Most recent valid daytime LST. MODIS/061/MOD11A1 is daily:
                # look back 30 days and take the newest image. An unsorted
                # .first() would return a decades-old, often masked scene.
                end = datetime.datetime.now(datetime.timezone.utc)
                start = end - datetime.timedelta(days=30)
                dataset = (
                    self.ee.ImageCollection('MODIS/061/MOD11A1')
                    .filterBounds(point)
                    .filterDate(start.strftime('%Y-%m-%d'), end.strftime('%Y-%m-%d'))
                    .select('LST_Day_1km')
                    .sort('system:time_start', False)
                )
                image = dataset.first()
                val = image.reduceRegion(self.ee.Reducer.mean(), point, 1000).getInfo()
                if val and val.get('LST_Day_1km') is not None:
                    lst_c = round(val['LST_Day_1km'] * 0.02 - 273.15, 1)
                    return {
                        "status": "ok",
                        "isSynthetic": False,
                        "lst": lst_c,
                        "ndvi": None,
                        "landCover": None,
                        "uhiClassification": self._classify(lst_c),
                        "geeTileId": f"MOD11A1_{lat:.4f}_{lng:.4f}",
                        "observedAt": image.date().format('YYYY-MM-dd').getInfo(),
                        "source": "MODIS Terra LST (Google Earth Engine)",
                    }
            except Exception as e:
                print(f"[GEE Service] Satellite query failed: {e}")

        return dict(UNAVAILABLE)

    @staticmethod
    def _classify(lst_c: float) -> str:
        if lst_c >= 44.0:
            return "Extreme UHI"
        if lst_c >= 41.0:
            return "Strong UHI"
        return "Moderate UHI"


gee_service = GEEService()
