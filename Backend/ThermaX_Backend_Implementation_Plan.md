# ThermaX — Backend Implementation Plan
### Production-Grade Architecture (FYP 2)

**Prepared for:** FYP 2 Implementation Phase
**Scope:** Backend, ML Pipeline, Data Fusion, Security, Deployment
**Frontend Status:** Complete (no changes required)

---

## 1. Objective & Success Criteria

Transform the current MERN prototype backend into a production-grade, multi-source
**environmental intelligence platform** capable of:

- Fusing citizen reports + satellite data (GEE/MODIS) + live weather API data into a
  single evidence-based heat assessment
- Running DBSCAN hotspot detection as a scheduled ML pipeline, not client-side JS
- Producing auto-generated, audit-logged, formally formatted PDF reports
- Meeting Pakistan PDPB data-protection requirements
- Surviving a real security review (OWASP Top 10) before any live demo
- Being architecturally scalable to multiple cities later
  (multi-tenant-ready, API-first, role-based)

**Definition of done for FYP 2 backend:** an admin account (issued through
the bootstrapping process in §10) can select a city + date range, click
Export, and receive a data-fusion PDF report — with a traceable model
version, data provenance, and confidence score — built from real satellite +
weather + citizen data, archived to storage, and fully audit-logged.


---

## 2. System Architecture Overview

```
                    React + MapLibre + PWA (DONE)
                              │
                              ▼
                 Nginx (reverse proxy, TLS)
                              │
                              ▼
                  Express.js API Gateway (/api/v1)
                              │
        ┌───────────┬─────────┴─────────┐
        ▼           ▼                   ▼
   MongoDB      Upstash Redis      Winston/Morgan
   Atlas        (cache only)        → Audit Logs
        │
        │  (fire-and-forget trigger, Express doesn't wait)
        ▼
   FastAPI ML Microservice
        │
        ▼
   Celery (single queue system, broker = Upstash Redis)
        │
   ┌────┴──────────────────────┐
   ▼                            ▼
enrich_report task          run_clustering task
(per report, on submit)     (Celery Beat, every 6–12h/city)
   │                            │
   ▼                            ▼
GEE + Weather API fusion    DBSCAN batch clustering
+ Quality Control               │
   │                            ▼
   ▼                     Hotspot collection (MongoDB)
SatelliteAnalysis +              │
AIAnalysis written                ▼
directly to MongoDB       Alert threshold check → Notifications
        │
        ▼
Report Export (on-demand, admin-triggered)
        │
        ▼
reportAggregationService → HTML template → Puppeteer → PDF
        │
        ▼
Azure Blob Storage (archive) → GeneratedReport doc (MongoDB) → audit-logged
```

Two backend services, one database, **one queue system**:
- **Express (Node)** — auth, CRUD, RBAC, orchestration, PDF export, audit logging
- **FastAPI + Celery (Python)** — GEE calls, weather fusion, quality control,
  DBSCAN, risk scoring, all async job execution

Both connect to the same **MongoDB Atlas** cluster. Express owns writes for
`Report`, `User`, `WeatherSnapshot` (fetched synchronously at submission time)
and `GeneratedReport`; the FastAPI/Celery worker owns writes for
`SatelliteAnalysis`, `AIAnalysis`, and `Hotspot`. Keeping all ML/enrichment
job execution inside the Python service — instead of splitting it across
BullMQ (Node) and Celery (Python) — means one broker, one worker pool, one
place to debug a stuck job.

---

## 3. Updated Repository Structure

```
Backend/
├── models/
│   ├── User.js                 (enhanced)
│   ├── Report.js                (slim — core citizen submission + refs)
│   ├── WeatherSnapshot.js       (NEW — split from Report, per-submission weather)
│   ├── SatelliteAnalysis.js     (NEW — split from Report, GEE output)
│   ├── AIAnalysis.js            (NEW — split from Report, versioned fusion output)
│   ├── Weather.js               (existing — live/forecast cache, distinct from WeatherSnapshot)
│   ├── Hotspot.js               (NEW)
│   ├── AuditLog.js              (NEW)
│   ├── Alert.js                 (NEW)
│   ├── GeneratedReport.js       (NEW — PDF archive metadata)
│   └── RefreshToken.js          (NEW — token rotation)
├── controllers/
│   ├── reportController.js      (enhanced)
│   ├── weatherController.js     (existing)
│   ├── hotspotController.js     (NEW)
│   ├── exportController.js      (NEW — PDF generation)
│   └── alertController.js       (NEW)
├── routes/
│   ├── v1/                      (NEW — versioned)
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── reports.js
│   │   ├── weather.js
│   │   ├── heatmap.js
│   │   ├── hotspots.js
│   │   ├── dashboard.js
│   │   ├── exports.js
│   │   └── alerts.js
├── middleware/
│   ├── auth.js                  (enhanced — cookie-based JWT)
│   ├── validation.js            (existing, extended)
│   ├── auditLogger.js           (NEW)
│   └── rateLimiters.js          (NEW — tiered limits)
├── services/
│   ├── weatherService.js        (enhanced — auto-fetch enrichment fields)
│   ├── mlServiceClient.js       (NEW — fires the FastAPI enrichment trigger, does not wait on the job)
│   ├── boundaryService.js       (NEW — district/city resolution)
│   ├── reportAggregationService.js  (NEW)
│   ├── pdfReportService.js      (NEW — Puppeteer wrapper + Blob upload)
│   ├── azureBlobService.js      (NEW — PDF archive storage/retrieval)
│   ├── notificationService.js   (NEW — alert dispatch)
│   └── anonymizationService.js  (NEW — PDPB grid-snapping)
├── templates/
│   └── reportTemplate.js        (NEW — HTML report builder)
├── data/
│   └── boundaries/
│       └── pk_districts.geojson (NEW — GADM Pakistan admin boundaries)
├── utils/ (existing, unchanged)
└── constants/
    ├── roles.js                 (simplified — USER, ADMIN only)
    └── categories.js             (NEW — report category enum)

ml-service/                       (NEW — separate FastAPI service)
├── main.py
├── routers/
│   ├── enrichment.py
│   ├── clustering.py
│   └── risk.py
├── services/
│   ├── gee_service.py
│   ├── weather_service.py
│   ├── quality_control.py
│   ├── dbscan_service.py
│   └── risk_assessment.py
├── celery_app.py
├── tasks.py                     (enrich_report, run_clustering — the only two async tasks in the system)
└── requirements.txt
```

---

## 4. Data Model Plan

### 4.1 `User.js` (enhanced)

Add to existing schema:

| Field | Type | Notes |
|---|---|---|
| `phone` | String | optional |
| `organization` | String | optional affiliation, e.g. 'Citizen', 'Researcher', 'Institution' |
| `role` | Enum | simplified two-tier: `user`, `admin` |
| `isActive` | Boolean | for admin-disable without deletion |
| `lastLoginAt` | Date | |
| `passwordChangedAt` | Date | for token invalidation on password change |

**Password policy upgrade:** minimum 8 characters, must include uppercase,
lowercase, number, special character — enforced via Joi + `zxcvbn` strength check.
Update demo account passwords to match before final handover.

### 4.2 The Report Family (split for modularity)

The original design put everything — user input, weather, satellite data, AI
output — on one `Report` document. That gets unwieldy fast and makes every
write contend on the same document. Splitting it keeps `Report` small and
lets each data source be written independently by whichever service owns it.

#### `Report.js` (slim core — Express-owned)

```js
{
  user: ObjectId,
  latitude: Number,
  longitude: Number,
  severityLevel: Number,        // 1-5
  ambientTemp: Number,
  surfaceTemp: Number,
  humidity: Number,
  images: [String],
  status: enum['pending','verified','rejected'],   // human verification, not AI status

  // location enrichment (server-resolved, not client dropdown)
  areaName: String,
  district: String,             // resolved via boundaryService, not trusted client input
  city: String,
  category: enum['urban_heat_island','industrial_heat','lack_of_canopy',
                  'heatwave','asphalt_heat','concrete_surface','other'],
  description: String,

  // references to sibling collections — populated at different points in the pipeline
  weatherSnapshotRef: ObjectId,   // → WeatherSnapshot, set synchronously by Express
  satelliteAnalysisRef: ObjectId, // → SatelliteAnalysis, set by Celery worker
  aiAnalysisRef: ObjectId,        // → AIAnalysis, stub created by Express, updated by Celery

  reportRef: String,              // human-readable ID: HTX-2026-000123
  deviceId: String,               // optional, for future IoT sensor integration

  createdAt, updatedAt
}
```

#### `WeatherSnapshot.js` (NEW — Express-owned, written synchronously at submission)

```js
{
  report: ObjectId,
  windSpeed: Number,
  heatIndex: Number,
  uvIndex: Number,
  weatherCondition: String,
  airQuality: { aqi: Number, source: String },   // optional
  source: String,                 // e.g. 'OpenWeatherMap'
  fetchedAt: Date
}
```

#### `SatelliteAnalysis.js` (NEW — Celery-owned, written async)

```js
{
  report: ObjectId,
  lst: Number,                    // MODIS Land Surface Temp
  ndvi: Number,                    // vegetation index
  landCover: String,
  uhiClassification: String,
  geeTileId: String,
  source: String,                  // e.g. 'MODIS Terra'
  fetchedAt: Date
}
```

#### `AIAnalysis.js` (NEW — Celery-owned, the versioned fusion output)

```js
{
  report: ObjectId,
  modelVersion: String,            // e.g. '1.0.0' — bump on any DBSCAN/QC logic change
  heatScore: Number,               // 0.6*T + 0.4*S
  heatRiskLevel: enum['low','moderate','high','extreme'],
  dbscanClusterId: String,         // null if noise/unclustered
  hotspotConfidence: Number,       // 0-1, how confidently this belongs to its cluster
  analysisConfidence: Number,      // 0-1, overall reliability of the fused result
  qualityControlScore: Number,     // 0-1, flags anomalous/conflicting sensor readings

  // provenance — which sources actually contributed to this analysis
  sources: {
    sensor: Boolean,               // was user-submitted data usable?
    satellite: String,             // e.g. 'MODIS Terra', or null if GEE call failed
    weather: String                // e.g. 'OpenWeatherMap', or null if unavailable
  },

  // fine-grained progress tracking, not just pending/completed
  status: enum['PENDING','FETCHING_WEATHER','FETCHING_GEE',
               'RUNNING_AI','COMPLETED','FAILED'],

  generatedAt: Date
}
```

Express creates a `WeatherSnapshot` and a stub `AIAnalysis` (`status: 'PENDING'`)
synchronously at submission time; the Celery worker fills in `SatelliteAnalysis`
and updates the same `AIAnalysis` doc through its status states. Both Node
(Mongoose) and Python (Pydantic/motor) models target the same MongoDB
collections, so keep the two schema definitions in sync when either changes.

Use **MongoDB Time-Series Collections** for `Report` and its three sibling
collections if write volume grows (`timeField: 'createdAt'`) — zero extra
infra, just a schema option, addresses the "MongoDB at scale" concern from
your thesis reviewer.

### 4.3 `Hotspot.js` (NEW)

```js
{
  clusterId: String,             // DBSCAN label, unique per run
  city: String,
  district: String,
  zone: String,                  // human-readable name
  centroid: { lat: Number, lng: Number },
  boundary: GeoJSON.Polygon,     // convex hull of member points
  avgTemp: Number,
  peakTemp: Number,
  reportCount: Number,
  memberReportIds: [ObjectId],
  severity: enum['low','moderate','high','critical'],
  status: enum['active','monitoring','resolved'],
  detectedAt: Date,
  detectionRun: String           // batch job ID for traceability
}
```

### 4.4 `AuditLog.js` (NEW — accountability & traceability)

```js
{
  action: String,                // 'REPORT_EXPORTED', 'REPORT_VERIFIED', 'ROLE_CHANGED'...
  performedBy: ObjectId,
  targetType: String,
  targetId: ObjectId,
  details: Mixed,
  ip: String,
  userAgent: String,
  timestamp: Date
}
```

Index on `{ performedBy: 1, timestamp: -1 }` and `{ action: 1, timestamp: -1 }`.
Add a **TTL or archival policy** (e.g., 2 years) documented in your data
governance section.

### 4.5 `Alert.js` (NEW)

```js
{
  hotspotId: ObjectId,
  triggerCondition: String,      // e.g. "avgTemp > 52"
  severity: String,
  channel: enum['email','webhook','sms'],
  recipients: [String],
  status: enum['pending','sent','failed'],
  sentAt: Date
}
```

### 4.6 `RefreshToken.js` (NEW — for rotation)

```js
{
  user: ObjectId,
  tokenHash: String,             // never store raw token
  deviceInfo: String,
  issuedAt: Date,
  expiresAt: Date,
  revoked: Boolean
}
```

### 4.7 `GeneratedReport.js` (NEW — PDF archive, avoids regenerating on every request)

```js
{
  reportRef: String,              // e.g. HTX-GOV-2026-000045
  city: String,
  fromDate: Date,
  toDate: Date,
  pdfUrl: String,                 // Azure Blob Storage URL (or SAS URL if private)
  blobPath: String,
  fileSizeBytes: Number,
  generatedBy: ObjectId,          // admin who triggered it
  modelVersion: String,           // AIAnalysis model version used for underlying data
  systemVersion: String,          // app build/git SHA at generation time
  generatedAt: Date
}
```

Index on `{ city: 1, fromDate: 1, toDate: 1 }` so a repeat export request for
the same city/period can serve the archived PDF instead of re-rendering.

---

## 5. API Surface (versioned `/api/v1`)

| Method | Route | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | account creation |
| POST | `/auth/login` | Public | returns short-lived JWT + httpOnly refresh cookie |
| POST | `/auth/refresh` | Public (cookie) | rotate token |
| POST | `/auth/logout` | Auth | revoke refresh token |
| GET | `/reports` | Public | paginated, filterable |
| POST | `/reports` | Auth | submit report → triggers enrichment queue |
| GET | `/reports/my-reports` | Auth | |
| PATCH | `/reports/:id/status` | Admin | verify/reject |
| GET | `/hotspots` | Public | active hotspot list |
| GET | `/hotspots/:id` | Public | detail incl. member reports |
| GET | `/heatmap` | Public | tile-optimized point data |
| GET | `/dashboard/kpis` | Auth | admin dashboard stats |
| POST | `/exports/report-pdf` | Admin | **the export flow** — returns archived PDF if one exists for the same city/period, else generates and archives a new one |
| GET | `/exports/history` | Admin | list previously generated reports (from `GeneratedReport`) |
| GET | `/alerts` | Admin | alert history |
| PUT | `/alerts/thresholds` | Admin | configure trigger thresholds |
| GET | `/users` | Admin | |
| PUT | `/users/:id/role` | Admin | promote/demote — blocked if it would leave zero admins |

All mutating routes pass through `auditLogger` middleware.

---

## 6. Report Submission & Enrichment Pipeline

This is the flow that makes ThermaX a *fusion* platform, not a form-to-database app.

```
1. User submits report (lat/lng, temps, category, description, image)
        ↓
2. Express validates (Joi) + resolves district/city server-side
   via boundaryService (turf.js point-in-polygon against
   Backend/data/boundaries/pk_districts.geojson)
        ↓
3. Express calls weatherService.getCurrent(lat,lng) SYNCHRONOUSLY
   (cached in Upstash Redis, ~50ms) → creates a WeatherSnapshot doc,
   links weatherSnapshotRef on the Report
        ↓
4. Express creates a stub AIAnalysis doc (status: 'PENDING'),
   links aiAnalysisRef, saves the Report
   → 201 response returned to user IMMEDIATELY (fast UX)
        ↓
5. Express fires ONE non-blocking HTTP call:
   POST FastAPI /enrich/report/{id}   (short timeout, fire-and-forget)
        ↓
6. FastAPI immediately queues Celery's enrich_report task and
   returns 202 Accepted — Express's involvement ends here
        ↓
7. Celery worker (Python, Upstash Redis broker) runs enrich_report:
   a. AIAnalysis.status → 'FETCHING_GEE'
   b. gee_service.py → MODIS LST + NDVI + land cover for the point
      → writes a SatelliteAnalysis doc, sets Report.satelliteAnalysisRef
   c. quality_control.py → cross-checks user temp vs satellite vs
      weather, flags outliers → qualityControlScore
   d. AIAnalysis.status → 'RUNNING_AI'
      → computes heatScore = 0.6*T + 0.4*S, analysisConfidence,
        records sources.satellite / sources.weather / sources.sensor
   e. AIAnalysis.status → 'COMPLETED' (or 'FAILED' with reason logged)
      — worker writes directly to MongoDB; no round trip back through
      Express is needed
        ↓
8. If a district accumulates 3+ recent high-severity reports, an
   early clustering check can be triggered (optional fast-path) —
   otherwise the next scheduled run_clustering pass picks it up
```

**Why this is simpler than a two-queue design:** everything ML/enrichment-
related — the job, the retry logic, the MongoDB write-back — lives entirely
inside the Python service. Express's job is to fire one HTTP call and move
on; it never owns a queue, a worker, or the enrichment job's lifecycle. One
broker (Upstash Redis), one worker pool (Celery), one place to debug a stuck
job.

**Why async matters:** GEE calls can take 2–8 seconds. Blocking the user's
submission on that is bad UX, especially during a live demo.

---

## 7. FastAPI ML Microservice

### Endpoints

| Method | Route | Purpose |
|---|---|---|
| POST | `/enrich/report/{id}` | queues Celery `enrich_report` task, returns 202 + task ID immediately |
| GET | `/enrich/status/{task_id}` | poll a specific enrichment task (admin debugging) |
| POST | `/cluster/run` | manually trigger `run_clustering` (admin/testing) |
| GET | `/cluster/status/{job_id}` | check async clustering job status |
| POST | `/risk/assess` | standalone risk scoring endpoint |
| GET | `/health` | liveness/readiness for Kubernetes probes |

### Scheduled Pipeline (Celery Beat, every 6–12h per city)

```
Pull all enriched reports for city (last 30 days, status='verified')
        ↓
Feature engineering: [lat, lng, heatScore, ndvi, timestamp_weight]
        ↓
StandardScaler.fit_transform()
        ↓
DBSCAN(eps=tuned_per_city, min_samples=tuned_per_city)
        ↓
For each cluster: compute centroid, convex hull, avg/peak temp, severity tier
        ↓
Upsert into Hotspot collection (mark stale hotspots as 'resolved'
if no longer supported by current data)
        ↓
Check each new/updated hotspot against Alert thresholds
        ↓
notificationService.dispatch() for any breaches
```

`eps` and `min_samples` should be tuned per city density — document this
tuning process in your thesis; it's a strong methodology section.

### Python Dependencies (`ml-service/requirements.txt`)

```
fastapi
uvicorn
celery
redis
scikit-learn
pandas
numpy
geopandas
shapely
rasterio
pyproj
earthengine-api
pymongo
motor
httpx
python-jose
```

---

## 8. Async Job Orchestration

**One queue system, not two.** The earlier design ran BullMQ on the Node
side and Celery on the Python side — two brokers, two worker runtimes, two
places a job could get stuck. Since the ML/enrichment work already lives in
FastAPI, it makes more sense for the queueing to live there too.

| Task | Trigger | Runtime | Job |
|---|---|---|---|
| `enrich_report` | Express fires `POST /enrich/report/{id}`; FastAPI queues it and returns immediately | Celery worker (Python) | GEE + weather fusion + QC for one report |
| `run_clustering` | Celery Beat cron (6–12h per city) | Celery worker (Python) | DBSCAN batch clustering |

Both tasks share the same Celery app, the same Upstash Redis broker, and the
same worker pool. Express's role ends at firing the HTTP trigger — it never
owns a queue or a worker process. This is simpler to deploy (one fewer
service in the AKS manifest), simpler to debug (one place to check for a
stuck job), and keeps all ML logic inside the Python ecosystem where it
naturally belongs.

---

## 9. Report Export Engine

*(Builds on the earlier design — now wired to the split data model and archived instead of regenerated on every click.)*

`reportAggregationService.js` pulls from four sources per request:

1. `Report` + `WeatherSnapshot` + `SatelliteAnalysis` + `AIAnalysis` — the
   fusion table (citizen + weather + satellite + AI fields, joined by ref)
2. `Hotspot` collection — clustered zones for the period
3. Source comparison table — sensor vs. satellite vs. weather-API temperature
   (the "Integrated Analysis" table from your report spec)
4. `GeneratedReport` — checked first; if a report for the same city + date
   range already exists and is recent, its archived PDF is returned instead
   of re-rendering

`reportTemplate.js` renders sections in this order (already scoped earlier):
Cover → Executive Summary → KPIs → Heat Map Snapshot → Hotspot Table →
Satellite Analysis → Trend Charts → District Breakdown → Citizen Report
Summary → Health & Risk Assessment → Recommendations → Methodology →
**Appendix: Data Sources & Reproducibility.**

That final appendix is what makes the report defensible to a researcher or
evaluator, not just readable at a glance — it should list:
- Data sources used (satellite provider, weather API, citizen sensors)
- Methodology summary (heat score formula, DBSCAN parameters)
- `AIAnalysis.modelVersion` used to generate the underlying data
- System/build version (`GeneratedReport.systemVersion`)
- Exact report generation timestamp

`pdfReportService.js` wraps Puppeteer with the header/footer/audit-log logic
already designed, then:

```
Generate PDF (Puppeteer)
        ↓
azureBlobService.upload() → Azure Blob Storage (container: exported-reports)
        ↓
Save GeneratedReport doc { pdfUrl, blobPath, modelVersion, systemVersion, ... }
        ↓
AuditLog.create() — who exported what, when, and which archived copy it maps to
        ↓
Return { pdfUrl } to the admin — browser downloads from Blob directly
   (use a short-lived SAS token if the container is private)
```

Archiving instead of regenerating every time gives you faster repeat
downloads, a historical record for compliance, and a straightforward way to
share a specific past report by link. Add **PDF/A output** (`page.pdf({ tagged: true })`
or a post-process conversion step) if strict archival compliance is required
later.

---

## 10. Security & Compliance Hardening

### Authentication
- Access token: 15 min expiry, JWT, sent in response body
- Refresh token: 7 day expiry, **httpOnly + Secure + SameSite=Strict cookie**,
  hashed in `RefreshToken` collection, rotated on every use, revocable on logout
- Rate limit `/auth/login` to 5 attempts / 15 min per IP (brute-force protection)

### Authorization
Two-tier role model: `user` and `admin`. Keeps the RBAC surface small and easy
to reason about — no extra tiers to maintain.

- `user`: submit reports, view own reports, view public hotspots/heatmap
- `admin`: everything a user can do, plus verify/reject reports, manage users,
  configure alert thresholds, export PDF reports
- Anyone who needs elevated access (e.g. your supervisor, an evaluator, a
  future collaborator) is simply given an `admin` account manually — see
  bootstrapping below. No separate signup path for admin exists; every new
  registration defaults to `role: 'user'`.

**Admin bootstrapping (how you control who becomes admin):**
1. **First admin** — after deploying, promote one account directly:
   either flip the `role` field to `'admin'` in MongoDB Atlas's UI, or run a
   one-time seed script:
   ```js
   // Backend/scripts/promoteAdmin.js
   const user = await User.findOneAndUpdate(
     { email: process.argv[2] },
     { role: 'admin' },
     { new: true }
   );
   console.log(`${user.email} is now admin`);
   ```
   Run with `node scripts/promoteAdmin.js someone@email.com`.
2. **Every admin after that** — promoted through the existing
   `UserManagement.jsx` panel, which already calls `PUT /users/:id/role`,
   guarded by `authorizeRoles('admin')`.
3. **Safeguard** — block demoting the last remaining admin (`User.countDocuments({role:'admin'})` check in the controller before allowing a role change) so the system can never end up with zero admins.

- `authorizeRoles` middleware already exists in `middleware/auth.js` — no
  structural change needed, just the simplified two-value enum.

### Input & Transport
- Joi validation on every mutating route (already have this — extend schemas
  for new fields)
- `helmet()` with explicit CSP directives (don't rely on defaults)
- HTTPS-only via Nginx + Azure-managed TLS cert; redirect all HTTP → HTTPS
- CORS locked to known frontend origin(s), not `*`

### Data Governance (PDPB)
- `anonymizationService.js`: before any **public-facing** API response, snap
  exact lat/lng to a 100m×100m grid centroid. Raw coordinates only visible to
  `admin` accounts.
- Data retention policy documented: raw reports retained 2 years, then
  aggregated-only
- Privacy policy page (frontend, static) referencing PDPB compliance

### Audit
- `auditLogger` middleware attached to all state-changing routes:
  report verification, role changes, exports, alert threshold edits, logins
- Winston → structured JSON logs → piped to Azure Log Analytics (or ELK if you
  want it in your thesis, but Azure-native is less infra to defend)

### OWASP Top 10 Pass Checklist (do this before any demo)
- [ ] NoSQL injection — sanitize all Mongoose query inputs (`express-mongo-sanitize`)
- [ ] XSS — sanitize description/text fields on output (`xss` package or DOMPurify server-side)
- [ ] Broken auth — covered above
- [ ] Sensitive data exposure — `.env` never committed, secrets in Azure Key Vault
- [ ] Security misconfiguration — disable `X-Powered-By`, remove verbose error stacks in prod
- [ ] Insufficient logging — covered by AuditLog + Winston

---

## 11. Alerting & Notification System

`notificationService.js` — triggered by the Celery clustering job when a
hotspot crosses a configured threshold (e.g., `avgTemp > 52°C` or a new
`critical` severity hotspot appears).

- MVP channel: email via a transactional provider (SendGrid/Azure Communication
  Services)
- Stretch: webhook delivery so an external dashboard/SMS system can
  subscribe — a strong "future extensibility" talking point for your
  thesis defense
- All dispatches logged in `Alert` collection with delivery status

---

## 12. Monitoring, Logging & Observability

| Concern | Tool | Notes |
|---|---|---|
| App errors (Node + FastAPI) | Sentry | separate projects per service |
| Metrics | Prometheus + Grafana (Azure Managed Grafana) | expose `/metrics` on both services |
| Infra health | Azure Monitor | AKS pod health, DB connection pool |
| Load testing | k6 | run before any live demo; target `/reports`, `/exports/report-pdf` |
| Structured logs | Winston (Node) / structlog (Python) | JSON format, correlation ID per request |

Add a `requestId` (uuid) generated per incoming request, propagated through
Express → FastAPI trigger call → Celery task → logged everywhere. This makes
debugging a failed enrichment trivial and is genuinely impressive in a
technical defense.

---

## 13. Environment Variables Reference

```
# Express
PORT=
MONGO_URI=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=
ML_SERVICE_URL=
FRONTEND_ORIGIN=
SENTRY_DSN_NODE=
AZURE_STORAGE_CONNECTION_STRING=
AZURE_BLOB_CONTAINER=exported-reports

# FastAPI
MONGO_URI=
UPSTASH_REDIS_URL=
GEE_SERVICE_ACCOUNT_JSON=
NASA_EARTHDATA_TOKEN=
WEATHER_API_KEY=
SENTRY_DSN_PYTHON=
CELERY_BROKER_URL=
```

Store all secrets in **Azure Key Vault**, inject via AKS secret mounts — never
in plain `.env` in production.

---

## 14. Testing Strategy

| Layer | Tool | Coverage target |
|---|---|---|
| Node unit tests | Jest | controllers, services, middleware |
| Node integration | Supertest | full route flows incl. auth |
| FastAPI unit | pytest | DBSCAN service, quality control logic |
| Load testing | k6 | 100 concurrent report submissions, export under load |
| Security scan | `npm audit` + `pip-audit` | run in CI |

Reference the separate `TEST_PLAN` document (already flagged as needed) for
detailed test cases per endpoint.

---

## 15. Deployment Pipeline

```
Local:      docker-compose up   (Express + FastAPI + Mongo + Redis stub)
        ↓
CI:         GitHub Actions → lint, test, build images, security scan
        ↓
Registry:   Azure Container Registry (ACR)
        ↓
CD:         GitHub Actions → deploy to Azure AKS (staging namespace)
        ↓
Manual gate: promote to production namespace after smoke test
        ↓
Prod:       AKS (2+ replicas each service) behind Nginx Ingress + Azure TLS
```

Minimum viable K8s setup: separate Deployments for `express-api`,
`ml-service`, with `HorizontalPodAutoscaler` on both. MongoDB stays on Atlas
(managed) — don't self-host it in K8s.

---

## 16. Phased Implementation Roadmap & Chunk Breakdown

```
Phase 1: Auth & Security Hardening ──► Phase 2: Modular Schemas ──► Phase 3: Spatial & Weather Services
                                                                               │
                                                                               ▼
Phase 6: PDF Reporting Engine ◄── Phase 5: Async Celery Tasks ◄── Phase 4: FastAPI ML Service
             │
             ▼
Phase 7: PDPB & Compliance ────► Phase 8: DevOps & AKS Deployment
```

### 🟢 Phase 1: Foundation & Security Hardening (API v1 & Auth)
**Focus**: API versioning, robust JWT token rotation, and 2-tier Role-Based Access Control (RBAC).

- **Chunk 1.1 — API Restructuring**: Mount versioned router under `/api/v1/`.
- **Chunk 1.2 — Token Rotation**: Implement short-lived Access JWTs + `httpOnly`/`SameSite=Strict` refresh cookies with token rotation stored in `RefreshToken.js`.
- **Chunk 1.3 — Simplified 2-Tier RBAC**: Enforce `user` vs. `admin` roles, add `zxcvbn` password strength checks, and build admin bootstrapping script (`Backend/scripts/promoteAdmin.js`).
- **Chunk 1.4 — Basic Security Hardening**: Add tiered rate limiters (`rateLimiters.js`), Helmet CSP headers, and origin-locked CORS.
- **Deliverables**: Versioned routes, hardened auth system, `RefreshToken.js` model, admin bootstrap script.

---

### 🟢 Phase 2: Data Model Refactoring & Expansion
**Focus**: Splitting the monolithic report schema into modular collections for independent service writes.

- **Chunk 2.1 — Split Report Schema**:
  - `Report.js`: Slim core citizen submission & references.
  - `WeatherSnapshot.js`: Per-submission weather metrics (Node-written).
  - `SatelliteAnalysis.js`: GEE Land Surface Temp & NDVI output (Python-written).
  - `AIAnalysis.js`: Versioned fusion output, risk scores & pipeline status (Python-written).
- **Chunk 2.2 — Supporting System Collections**:
  - `Hotspot.js`: Cluster centroids, polygons, and risk tiers.
  - `AuditLog.js`: System traceability and accountability logs.
  - `Alert.js`: Hotspot threshold breach notifications.
  - `GeneratedReport.js`: Metadata and SAS URLs for archived PDF exports.
- **Deliverables**: 8 modular Mongoose schemas with time-series indexing.

---

### 🟢 Phase 3: Core Node.js Services (Geofencing & Weather)
**Focus**: Server-side spatial location resolution and synchronous atmospheric enrichment.

- **Chunk 3.1 — Boundary Resolution (`boundaryService.js`)**: Server-side district/city resolution via `turf.js` point-in-polygon math against GADM Pakistan geojson (`pk_districts.geojson`).
- **Chunk 3.2 — Weather Enrichment (`weatherService.js`)**: Synchronous fetch of current weather, heat index, and UV index cached in Upstash Redis during report submission.
- **Chunk 3.3 — ML Trigger Client (`mlServiceClient.js`)**: Non-blocking fire-and-forget HTTP trigger client calling the FastAPI ML service.
- **Deliverables**: `boundaryService.js`, `weatherService.js`, `mlServiceClient.js`.

---

### 🔵 Phase 4: Python FastAPI ML Microservice Setup
**Focus**: Developing the Python microservice for Earth Engine satellite extraction and quality control.

- **Chunk 4.1 — FastAPI Service Skeleton**: Project layout with FastAPI routes (`/enrich/report/{id}`, `/cluster/run`, `/health`).
- **Chunk 4.2 — Google Earth Engine (`gee_service.py`)**: MODIS LST, NDVI, and land cover retrieval by geographic coordinate.
- **Chunk 4.3 — Sensor Quality Control (`quality_control.py`)**: Cross-validate citizen sensor readings against satellite and weather data to generate a `qualityControlScore`.
- **Chunk 4.4 — Hotspot DBSCAN Service (`dbscan_service.py`)**: Density-based spatial clustering and risk scoring algorithms.
- **Deliverables**: `ml-service/` codebase with FastAPI routers & ML processing engines.

---

### 🔵 Phase 5: Async Orchestration (Celery + Upstash Redis)
**Focus**: Background task processing using a single unified queue system.

- **Chunk 5.1 — Celery Worker Setup**: Single queue broker (Upstash Redis) running the `enrich_report` task.
- **Chunk 5.2 — Periodic Clustering Scheduler**: Celery Beat cron configuration running `run_clustering` every 6–12 hours per city.
- **Chunk 5.3 — Direct Mongo Write-Back**: Configure Celery tasks to write `SatelliteAnalysis`, `AIAnalysis`, and `Hotspot` documents directly to MongoDB Atlas.
- **Deliverables**: `celery_app.py`, `tasks.py`, end-to-end async background worker pipeline.

---

### 🟡 Phase 6: Data Fusion PDF Reporting Engine
**Focus**: Automated, audit-logged PDF report generation and Azure Blob archival.

- **Chunk 6.1 — Aggregation Engine (`reportAggregationService.js`)**: Fuse `Report`, `WeatherSnapshot`, `SatelliteAnalysis`, `AIAnalysis`, and `Hotspot` records into an export data structure. Check `GeneratedReport` first to prevent re-rendering identical requests.
- **Chunk 6.2 — HTML Template Builder (`reportTemplate.js`)**: Professional HTML report layout complete with KPIs, maps, trends, and a **Data Sources & Reproducibility Appendix**.
- **Chunk 6.3 — PDF Generator & Storage (`pdfReportService.js` & `azureBlobService.js`)**: Puppeteer headless PDF render, upload to Azure Blob Storage (`exported-reports` container), and save `GeneratedReport` document.
- **Chunk 6.4 — Export Routes**: Implement `/api/v1/exports/report-pdf` and `/api/v1/exports/history`.
- **Deliverables**: Automated PDF report builder and Azure Blob archival pipeline.

---

### 🟡 Phase 7: Compliance, PDPB Privacy & Auditing
**Focus**: Privacy compliance, data protection, and security verification.

- **Chunk 7.1 — PDPB Grid Snapping (`anonymizationService.js`)**: Snap public-facing report coordinates to 100m×100m centroids to mask raw citizen coordinates.
- **Chunk 7.2 — Audit Logging Middleware (`auditLogger.js`)**: Intercept state-changing operations (`REPORT_VERIFIED`, `ROLE_CHANGED`, `REPORT_EXPORTED`) and persist structured logs to `AuditLog.js`.
- **Chunk 7.3 — OWASP Top 10 Audit**: Implement NoSQL injection protection (`express-mongo-sanitize`) and XSS output sanitization.
- **Deliverables**: `anonymizationService.js`, `auditLogger.js`, OWASP audit checklist.

---

### 🔴 Phase 8: Monitoring, Containerization & AKS Deployment
**Focus**: Production container orchestration, observability, and load testing.

- **Chunk 8.1 — Containerization**: Dockerfiles for Express Node backend, FastAPI Python ML service, and Nginx reverse proxy + local `docker-compose.yml`.
- **Chunk 8.2 — Observability**: Winston/structlog JSON loggers with `requestId` correlation, Sentry error tracking, and Prometheus `/metrics`.
- **Chunk 8.3 — Load Testing (k6)**: Benchmark 100 concurrent report submissions and PDF export rendering.
- **Chunk 8.4 — CI/CD & AKS Deployment**: GitHub Actions pipeline targeting Azure Container Registry (ACR) and Azure Kubernetes Service (AKS).
- **Deliverables**: Docker images, K8s manifests, GitHub Actions CI/CD workflows, k6 load test scripts.

Suggested pacing: 1–2 phases per sprint depending on your FYP2 timeline (Jan–Jul 2026). Phases 3–5 (the fusion pipeline) are your highest-value, most-differentiating work — prioritize getting a thin end-to-end version of those working early, then harden.


---

## 17. What Makes This Stand Out

- **Multi-source fusion, not just crowdsourcing** — satellite + weather +
  citizen data cross-validated with a quality score is a materially stronger
  evidence base than single-source heat apps
- **Full audit trail** — every action traceable, which is a strong
  accountability story for a defense panel
- **PDPB-compliant by design** — anonymization isn't bolted on, it's in the
  architecture
- **Automated, formatted PDF reporting** — a polished, presentation-ready
  deliverable, generated on demand instead of manually compiled
- **Controlled admin access** — every account starts as a regular `user`;
  admin rights (verification, exports, alert config) are granted manually by
  whoever owns the deployment, which is a clean, defensible access model to
  demo — you control exactly who gets elevated access
- **Traceable, reproducible analysis** — every AI-fused result carries a
  model version, a record of which data sources actually contributed, and a
  confidence score, so any hotspot or report can be explained and reproduced
  later. This is what turns a report from "a number on a page" into evidence
  an evaluator or researcher can actually stand behind
- **Archived, not regenerated** — every exported report is stored, not
  recomputed on each click, giving you a historical record and fast repeat
  downloads
- **API-first** — `/api/v1` versioning means external partners/researchers
  could be given scoped API keys later without a rebuild
- **Cloud-native, horizontally scalable** — AKS + managed Mongo/Redis means it
  can genuinely handle real load, not just a demo
- **Urdu + accessibility + offline PWA** — addresses real deployment
  conditions (field workers, non-technical users, low-connectivity areas)
  that most student projects ignore entirely

This combination — real data fusion, compliance-by-design, and automated
reporting — is what separates ThermaX from a typical FYP heatmap app and
gives you real technical depth to defend in front of your evaluation panel.
