# Kubernetes Deployment Guide for ThermaX

This directory contains production Kubernetes deployment manifests for ThermaX.

## Provisioning Secrets Before Deployment

Both `thermax-backend` and `thermax-ml` rely on `envFrom: secretRef: thermax-secrets`. To prevent pods from crash-looping (`CreateContainerConfigError` / `CrashLoopBackOff`):

1. Copy the secret template:
   ```bash
   cp k8s/secrets-template.yaml k8s/secrets.yaml
   ```

2. Fill in production credentials in `k8s/secrets.yaml`:
   - `JWT_SECRET` / `JWT_ACCESS_SECRET`
   - `ML_SERVICE_KEY`
   - `WEATHER_API_KEY`
   - `RESEND_API_KEY`
   - `MONGO_URI` / `MONGODB_URI`

3. Apply the secret to your Kubernetes cluster:
   ```bash
   kubectl apply -f k8s/secrets.yaml
   ```

## Deploying Applications

Once secrets are in place, apply the remaining manifests:
```bash
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/ml-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/ingress.yaml
```
