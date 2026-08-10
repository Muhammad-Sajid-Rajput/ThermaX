import os

# Pure Python .env file parser (0 external dependencies, 0 linter warnings)
def load_env_file():
    paths = [
        os.path.join(os.path.dirname(__file__), '../Backend/.env'),
        os.path.join(os.path.dirname(__file__), '.env')
    ]
    for env_path in paths:
        if os.path.exists(env_path):
            try:
                with open(env_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            key, val = line.split('=', 1)
                            os.environ.setdefault(key.strip(), val.strip())
            except Exception:
                pass

load_env_file()

MONGO_URI = os.getenv('MONGO_URI') or os.getenv('MONGODB_URI') or 'mongodb://localhost:27017/thermax'
PORT = int(os.getenv('PORT', 8000))
GEE_PROJECT_ID = os.getenv('GEE_PROJECT_ID', 'ee-thermax-project')

DBSCAN_EPS_KM = float(os.getenv('DBSCAN_EPS_KM', 1.5))
DBSCAN_MIN_SAMPLES = int(os.getenv('DBSCAN_MIN_SAMPLES', 3))
EARTH_RADIUS_KM = 6371.0088
