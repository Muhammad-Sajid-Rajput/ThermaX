# ThermaX Backend — Administrative & Moderation Architecture

## 1. Autonomous Moderation & Outlier Notification System

The ThermaX platform operates with an autonomous report pipeline:
1. **Submission**: Citizen heat reports are received and stored with status `pending`.
2. **Autonomous Enrichment**: On the 30-minute scheduled pipeline tick (or asynchronous trigger), pending reports are cross-checked with real-time weather observations and satellite Land Surface Temperature (LST) from Google Earth Engine.
3. **Automated Verdict**:
   - `QC Pass`: status transitions `pending → verified`.
   - `QC Suspect`: status transitions `pending → flagged` (quarantined from the public hotspot map).
   - The status update is guarded by `{ _id, status: "pending" }` — automated verdicts **never overwrite an admin moderation decision**.
   - The automation **never sets `rejected`**; `rejected` is terminal and reachable only via admin action.

### Outlier Definitions & Triggers

To prevent alert fatigue and eliminate routine clicking, admins are **only notified on actionable outliers**:

| Notification Type | Trigger Condition | Rationale |
| :--- | :--- | :--- |
| `enrichment_failed` | Enrichment pipeline returns `FAILED` for a report (tick stamps `enrichmentFailedAt`). | The automation itself broke or encountered missing coordinates/severity; human review is required. |
| `extreme_contradiction` | QC verdict is `suspect` **AND** `citizen_temp_vs_weather` check fails with `\|citizen_temp - weather_temp\| >= EXTREME_TEMP_DIFF_C` (default 15°C, env-overridable). | Extreme divergence between citizen report and physical ground instrument suggests fraudulent submission, spoofed data, or a broken citizen sensor. |

### Quarantined Routine Suspects (Not Notified)
- Routine suspect verdicts with small temperature differences ($3^\circ\text{C} < \text{diff} < 15^\circ\text{C}$).
- Cloudy-day satellite unavailability (`environmental_evidence` failure) — retried on next tick.
- Missing photo warning (`photo_presence`).
- GPS plausibility checks skipped due to missing bounds.

These reports are quarantined from hotspot clustering without generating admin notifications.

---

## 2. Admin Workflow & Endpoints

Admins access the system through authenticated, role-authorized endpoints (`authenticate`, `authorizeAdmin`).

### Notifications API
- `GET /api/v1/admin/notifications`
  - Returns unread notifications first, then read notifications, newest first (capped at 100).
  - Populates `reportId` with `reportRef`, `status`, `city`, `createdAt`.
  - Response: `{ notifications: [{ _id, reportId: {...}, type, reason, qcScore, createdAt, readAt }] }`
- `POST /api/v1/admin/notifications/:id/read`
  - Sets `readAt = new Date()` and `readBy = req.user._id`.
  - Returns 404 if notification is not found.

### Enrichment Failures Dead-Letter API
- `GET /api/v1/admin/enrichment-failures`: Lists dead-lettered reports whose enrichment trigger failed after 3 retries.
- `POST /api/v1/admin/enrichment-failures/:id/retry`: Re-queues enrichment pipeline run.
- `POST /api/v1/admin/enrichment-failures/:id/dismiss`: Dismisses dead letter.

### Human-in-the-Loop Moderation Controls
In `Frontend/src/Pages/Admin/ReportManagement.jsx`, admins retain manual control buttons:
- **Verify (`approve`)**: Manually approves and marks the report `verified`.
- **Flag (`flag`)**: Flags report for audit.
- **Reject (`reject`)**: Rejects and terminates report lifecycle.
Clicking any outlier notification on the Admin Dashboard navigates directly to the flagged report with pre-filtered search and inspection modal.

---

## 3. Area Insights & Decision Briefing API

Provides decision-oriented, area-scoped executive reports for municipal stakeholders, disaster-management authorities, and public health officials.

### Single Source of Truth
- `GET /api/v1/insights` (also mounted at legacy `/api/insights`)
  - **Auth**: Admin-only (`authenticate`, `authorizeAdmin`).
  - **Query Parameters**:
    - `city`: Required, allowlisted (`Karachi`, `Lahore`, `Islamabad`). Unknown city returns 400.
    - `area`: Optional, trimmed literal substring filter on `areaName` (case-insensitive, ReDoS protected).
    - `days`: Optional time window (`7`, `30`, `90`; default `30`). Other values return 400.
    - `includeSynthetic`: Optional boolean (default `false`).
  - **Payload Structure**:
    - `scope`: `{ city, area, days, from, to }`
    - `dataQuality`: `{ reportCount, verifiedCount, flaggedCount, trendEligible, minReportsForTrend, syntheticExcluded, hotspotRunId }`
    - `summary`: `{ totalReports, avgTemp, peakTemp, avgSeverity, activeHotspots, criticalHotspots }`
    - `baseline`: `{ cityAvgTemp, areaAvgTempDelta, cityReportCount }`
    - `takeaways`: Deterministic executive takeaway bullets.
    - `severityDistribution`: Count for severity levels 1 through 5.
    - `volumeSeries`: Daily verified report counts in city timezone (empty array if `!trendEligible`).
    - `tempSeries`: Daily average temperatures in city timezone (empty array if `!trendEligible`).
    - `hotspots`: Published hotspots in scope ranked by TVI desc (unscored last and labeled).
    - `topDirectives`: Aggregated actionable directives sorted by `hotspotCount` desc.

### Multi-Format Exports API
- `GET /api/v1/insights/export`
  - Supports `format=csv` (default if omitted) and `format=json`.
  - Rejects `format=pdf` (and other unsupported formats) with an honest 400 (`Export format 'pdf' is not supported... Use browser print-to-PDF`).
  - **CSV Export**: Returns a multi-section spreadsheet (`SUMMARY`, `TAKEAWAYS`, `SEVERITY_DISTRIBUTION`, `VOLUME_SERIES`, `TEMP_SERIES`, `HOTSPOT_RANKING`, `TOP_DIRECTIVES`). All free-text cells are protected against formula injection (`=`, `+`, `-`, `@` prefix neutralization). Negative numeric values (such as temperature deltas) remain strictly numeric.
  - **JSON Export**: Downloads the exact, verbatim insights payload.
