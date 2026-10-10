# Kubernetes Deployment Guide for ThermaX

This directory contains production and dev/demo Kubernetes manifests for ThermaX.

---

## 1. Secrets & Environment Configuration

Both `thermax-backend` and `thermax-ml` rely on `envFrom: secretRef: thermax-secrets`.
To prevent pods from failing readiness/liveness probes or crashing:

### Step 1: Copy Template
```bash
cp k8s/secrets-template.yaml k8s/secrets.yaml
```

### Step 2: Fill Required Variables Checklist
Verify every variable referenced by the application and manifests is configured:

| Variable | Description & Target | Example / Default |
|---|---|---|
| `NODE_ENV` | Runtime environment mode | `"production"` |
| `MONGO_URI` / `MONGODB_URI` | MongoDB connection string | `"mongodb://thermax-mongodb:27017/thermax"` (in-cluster) or Atlas URI |
| `JWT_SECRET` | Primary JWT signing secret (min 32 chars) | Cryptographic hex string |
| `JWT_ACCESS_SECRET` | Access token JWT signing secret | Cryptographic hex string |
| `JWT_ACCESS_EXPIRES_IN` | Access token expiry interval | `"15m"` |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token expiry interval | `"7d"` |
| `RESEND_API_KEY` | Resend email provider API key | `"re_..."` |
| `RESEND_FROM` | Outgoing email address | `"ThermaX <alerts@thermax.org>"` |
| `ML_SERVICE_URL` | Microservice address used by Backend | `"http://thermax-ml-service:8000"` |
| `ML_SERVICE_KEY` | Shared secret for inter-service auth | Generated 32-byte hex key |
| `WEATHER_API_KEY` | WeatherAPI.com observation key | Provider API key |
| `GEE_PROJECT_ID` | Google Earth Engine project identifier | `"thermax-fyp"` |
| `FRONTEND_URL` | Allowed CORS origins for frontend | `"https://thermax.org"` |

> **Note on `PORT`:** `PORT` is deliberately excluded from `secrets-template.yaml` to avoid port collisions. Each deployment manifest sets `PORT` explicitly in its own `env` (`5000` for backend, `8000` for ML) matching its containerPort, service targetPort, and readiness/liveness probes.

### Step 3: Apply Application Secrets
```bash
kubectl apply -f k8s/secrets.yaml
```

---

## 2. Google Earth Engine (GEE) Credentials

The ML service (`ML/services/gee_service.py`) authenticates with Google Earth Engine using a service account JSON key file via `GOOGLE_APPLICATION_CREDENTIALS`.

### Provisioning the GEE Secret:
```bash
kubectl create secret generic gee-credentials \
  --from-file=service-account.json=/path/to/your/gee-service-account-key.json
```

`k8s/ml-deployment.yaml` mounts this secret at `/etc/secrets/gee/service-account.json` and sets:
```yaml
env:
  - name: GOOGLE_APPLICATION_CREDENTIALS
    value: "/etc/secrets/gee/service-account.json"
```

> **Honest Degradation:** The volume mount is configured with `optional: true`. If `gee-credentials` is omitted, the ML pod will boot normally, and satellite LST calls will honestly degrade to returning the documented `"unavailable"` payload without stalling the sequential pipeline.

---

## 3. Database Deployment (MongoDB)

ThermaX supports two database configurations:

### Option A: In-Cluster StatefulSet (Dev / Demo Profile)
For self-contained cluster testing or demonstrations without external dependencies, apply the included MongoDB manifest:
```bash
kubectl apply -f k8s/mongodb-statefulset.yaml
```
This deploys a `mongo:6.0` StatefulSet and ClusterIP Service named `thermax-mongodb` on port `27017` with persistent volume storage.

### Option B: Managed MongoDB Atlas (Production Profile)
For production workloads, use MongoDB Atlas:
1. Set `MONGO_URI` and `MONGODB_URI` in `k8s/secrets.yaml` to your Atlas connection URI:
   ```yaml
   MONGO_URI: "mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/thermax?retryWrites=true&w=majority"
   ```
2. Skip applying `k8s/mongodb-statefulset.yaml`.

---

## 4. Deploying Applications

Deploy all ThermaX workloads in sequence:

```bash
# 1. Database (if using in-cluster Option A)
kubectl apply -f k8s/mongodb-statefulset.yaml

# 2. Secrets & GEE Credentials
kubectl apply -f k8s/secrets.yaml
# (Optional) kubectl create secret generic gee-credentials --from-file=service-account.json=...

# 3. Microservices & Web Frontend
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/ml-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml

# 4. Ingress & Routing
kubectl apply -f k8s/ingress.yaml
```

---

## 5. Verification & Health Probes

Check pod status:
```bash
kubectl get pods -l app=thermax
```

Verify service endpoints:
- **Backend:** `http://thermax-backend-service:5000/api/v1/health`
- **ML Microservice:** `http://thermax-ml-service:8000/health`
- **Frontend:** `http://thermax-frontend-service:80/`
