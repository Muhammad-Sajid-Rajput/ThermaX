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

MONGO_URI = os.getenv('MONGO_URI') or os.getenv('MONGODB_URI') or 'mongodb://localhost:27017/thermax'
PORT = int(os.getenv('PORT', 8000))
GEE_PROJECT_ID = os.getenv('GEE_PROJECT_ID', 'heatmappingfyp')
DBSCAN_EPS_KM = float(os.getenv('DBSCAN_EPS_KM', 1.5))
DBSCAN_MIN_SAMPLES = int(os.getenv('DBSCAN_MIN_SAMPLES', 3))
EARTH_RADIUS_KM = 6371.0088
