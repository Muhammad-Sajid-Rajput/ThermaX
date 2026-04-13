# 🌡️ ThermaX
### Crowdsourced Heat Mitigation and Mapping Platform

> A civic-tech web platform empowering citizens and researchers to collaboratively report, analyze, and act on urban heat — turning crowdsourced data into actionable climate intelligence.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [System Architecture](#system-architecture)
- [System Workflow](#system-workflow)
- [Pages & Features](#pages--features)
- [Navigation Flow](#navigation-flow)
- [Page Connections](#page-connections)
- [Tech Stack](#tech-stack)
- [Design System](#design-system)
- [Key Metrics Tracked](#key-metrics-tracked)
- [Data Pipeline](#data-pipeline)

---

## Overview

**ThermaX** is a Final Year Project (FYP) that addresses the growing urban heat island problem through crowdsourced community reporting. The platform allows citizens to report real-time heat hazards from their location, which are then validated by an ML model, aggregated into an interactive heat map, and exported as official mitigation reports for urban planners and researchers.

The current frontend implementation is a **React + Vite single-page app (SPA)** with client-side routing, responsive layouts, and light/dark theme support. The broader end-to-end data flow remains the same conceptually (citizen device → API → storage → ML → visualization), while some production capabilities (like full PWA install/offline behavior) are still planned.

---

## Project Structure

```
ThermaX/
│
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   ├── Components/
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   ├── header/
│   │   └── footer/
│   └── Pages/
│       ├── LandingPage/
│       ├── PermissionPage/
│       ├── HeatReport/
│       ├── Dashboard/
│       ├── InsightPage/
│       └── ReportsPage/
├── index.html
├── package.json
├── vite.config.js
├── postcss.config.js
└── tailwind.config.js
```

Frontend is organized as reusable React components and route-based pages.

---

## System Architecture

ThermaX is organized into **6 distinct architectural layers**, each with a clearly defined responsibility. The layers communicate in sequence from client-facing interfaces through to visualization outputs.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  CLIENT LAYER                                                            │
│                                                                          │
│  Dashboard  |  Heat Reporting Form  |  Geolocation & Permissions        │
│  Offline Capabilities  |  Interactive Map  |  Responsive Web SPA         │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │  (bidirectional)
┌─────────────────────────────────▼────────────────────────────────────────┐
│  APPLICATION LAYER                                                       │
│                                                                          │
│  RESTful API Server                                                      │
│    ├──► Auth & Rate Limiting                                             │
│    └──► Validation & Preprocessing  ──►  Anonymization                  │
└──────────────────────┬─────────────────────────────────┬─────────────────┘
                       │                                 │
          ┌────────────▼────────────┐      ┌────────────▼──────────────────┐
          │  DATA LAYER             │      │  EXTERNAL DATA INTEGRATION    │
          │                         │      │  LAYER                        │
          │  Crowdsourced Heat      │      │                               │
          │  Reports (Database)     │      │  Satellite Data API           │
          │  Metadata (Timestamp,   │◄─────│  Weather / Env Data API       │
          │  Severity, Geo)         │      │                               │
          │  Spatial Indexing &     │      └───────────────────────────────┘
          │  Querying               │
          └────────────┬────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────────────────┐
│  ML & ANALYTICS LAYER                                                    │
│                                                                          │
│  Anomaly Detection  ──►  Aggregation & Scoring  ──►  Hotspot Detection  │
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────────────────┐
│  VISUALIZATION & REPORTING LAYER                                         │
│                                                                          │
│  Dashboards  |  Heat Map Generator  |  PDF/CSV Export                   │
└──────────────────────────────────────────────────────────────────────────┘
```

### Layer Breakdown

**1. Client Layer** — Everything the user sees and interacts with directly.

| Component | Description |
|-----------|-------------|
| Dashboard | Main GeoPulse map view with KPI cards and heat overlays |
| Heat Reporting Form | 4-step wizard for submitting heat observations |
| Geolocation & Permissions | GPS access request and location capture |
| Offline Capabilities | Planned (not implemented in the current frontend build) |
| Interactive Map | Prototype map preview with overlay markers and severity layers |
| Web & Mobile PWA | Responsive web SPA (PWA install/offline behavior planned) |

**2. Application Layer** — Backend logic handling all incoming requests.

| Component | Description |
|-----------|-------------|
| RESTful API Server | Core server handling all client–server communication |
| Auth & Rate Limiting | Prevents abuse, manages sessions and request throttling |
| Validation & Preprocessing | Cleans and structures incoming data before storage |
| Anonymization | Strips personally identifiable information from submissions |

**3. Data Layer** — Persistent storage and spatial data management.

| Component | Description |
|-----------|-------------|
| Crowdsourced Heat Reports | Primary database storing all citizen submissions |
| Metadata (Timestamp, Severity, Geo) | Structured fields attached to every report |
| Spatial Indexing & Querying | Enables fast geo-queries for map rendering and clustering |

**4. External Data Integration Layer** — Third-party data sources enriching the platform.

| Component | Description |
|-----------|-------------|
| Satellite Data API | Provides Land Surface Temperature (LST) and Land Use data |
| Weather/Env Data API | Enriches reports with real-time environmental context |

**5. ML & Analytics Layer** — Intelligence engine processing combined data.

| Component | Description |
|-----------|-------------|
| Anomaly Detection | Identifies outlier submissions deviating from expected patterns |
| Aggregation & Scoring | Combines citizen and satellite data into composite heat scores |
| Hotspot Detection | Identifies and ranks geographic clusters of high heat intensity |

**6. Visualization & Reporting Layer** — Final outputs for users and planners.

| Component | Description |
|-----------|-------------|
| Dashboards | Real-time analytics panels with KPIs and trend charts |
| Heat Map Generator | Renders the interactive geo-heatmap with severity overlays |
| PDF/CSV Export | Produces official mitigation reports and raw data downloads |

---

## System Workflow

The complete end-to-end process from user access to final output.

### Phase 1 — User Access & Report Submission

```
User Accesses Platform
         │
         ▼
  Permission Handling ──[Denied]──► Stay on Permission Page
         │
      [Granted]
         │
         ▼
  Access Granted
         │
         ▼
  Submit Heat Vulnerability Report
         │
         ▼
  Capture Geolocation  (GPS coordinates)
         │
         ▼
  Input Severity Level  (1 = Low  →  5 = Extreme)
         │
         ▼
  Input Time of Observation  (timestamp)
         │
         ▼
  Optional Photo Upload  (JPG / PNG  ≤ 10 MB)
         │
         ▼
  Optional Comment  (free-text observation)
         │
         └──────────────────► Phase 2
```

### Phase 2 — Data Ingestion, Satellite Fetch & Validation

```
  ┌─────────────────────────────┐     ┌────────────────────────────────────┐
  │  Citizen Submission         │     │  Fetch Satellite Data              │
  │  (from Phase 1)             │     │    ├── Land Surface Temperature    │
  └──────────────┬──────────────┘     │    └── Land Use Data                │
                 │                    └───────────────┬────────────────────┘
                 │                                    │
                 └─────────────────┬──────────────────┘
                                   │
                                   ▼
                         Anonymize User Data
                                   │
                                   ▼
                        Store Crowdsourced Data
                                   │
                                   ▼
                             Validate Data
                            /             \
                       [Invalid]         [Valid]
                           │                │
                           ▼                ▼
                      Invalid Data     Valid Data
                       (Dropped)           │
                                           ▼
                                   Duplicate Filtering
                                           │
                                           ▼
                                   Anomaly Detection
                                   /               \
                              [Flagged]         [Not Flagged]
                                  │                   │
                                  ▼                   ▼
                           Flagged as           Data Ready
                            Anomaly             for Analysis
                          (Manual Review)           │
                                                    └──► Phase 3
```

### Phase 3 — ML Processing & Output Generation

```
  Aggregate Crowdsourced Data + Satellite Data
                       │
                       ▼
           Apply Machine Learning Analysis
                       │
                       ▼
             Cluster Heat Hotspots
                       │
                       ▼
            Update Hotspot Database
                       │
                       ▼
        Generate Interactive Heat Map
              /                   \
             ▼                     ▼
   Visualize Severity          Generate Reports
   Levels                      for Planners
        │                           │
        ▼                           ▼
   Recommend Mitigation         Export Data as
   Strategies                   PDF or CSV
        │                           │
        ▼                           │
   Display Recommendations          │
   to Users                         │
        │                           │
        └──────────────┬──────────────┘
                       │
                       ▼
                 End-user output
```

---

## Pages & Features

### 1. 🏠 Landing Page (`/`)

- Hero section with project messaging and two primary CTAs:
  - `Report Heat` → `/permission`
  - `View Heat Map` → `/dashboard`
- Feature cards: Report, Analyze, Adapt
- Shared responsive navigation (header + mobile bottom nav) and theme toggle

### 2. 📍 Permission & Geolocation (`/permission`)

- Requests browser geolocation before reporting
- On success, stores `sessionStorage["thermax-location-permission"] = "granted"` and routes to `/report`
- On deny/error, routes to `/permission/denied`
- Manual location selection exists as a placeholder (not implemented yet)

### 3. 📝 Heat Reporting Form (`/report`)

- Protected route (requires granted permission key)
- Multi-section report UI:
  - Severity slider (1–5)
  - Cause selection checkboxes
  - Free-text observations
  - Photo upload input (UI)
- Submit action currently logs data to console and routes to `/report/status`

### 4. ✅ Data Validation & Status (`/report/status`)

- Protected route showing validation pipeline/status cards
- Displays submission ID and timestamp passed from form flow
- Shows one validation result per submission (Valid / Duplicate / Anomaly)
- Provides quick actions:
  - `View Dashboard` → `/dashboard`
  - `Return to Home` → `/`

### 5. 🗺️ Heat Map Dashboard (`/dashboard`)

- GeoPulse dashboard layout with KPI cards and filter controls
- Map area uses static background + overlay markers (no live map engine integration yet)
- Top-right dashboard actions route to Insight and Reports

### 6. 🧠 ML & Hotspot Analytics (`/insight`)

- Inference summary header with run metadata
- Geospatial distribution preview card
- KPI widgets (aggregation score, anomaly index)
- Cluster ranking and trend/intensity charts (currently mock-data driven)

### 7. 📊 Reports & Export (`/reports`)

- Summary stats and report preview card
- Export options UI:
  - PDF report button
  - CSV export button
- Last generated report indicator (static label in current frontend)

## Navigation Flow

```
                   ┌──────────────────────────────────┐
                   │          LANDING PAGE            │
                   │   [Report Heat]  [View Heat Map] │
                   └─────────┬──────────────┬─────────┘
                             │              │
                             ▼              ▼
            ┌─────────────────────┐  ┌──────────────────────────────┐
            │  PERMISSION &       │  │   HEAT MAP DASHBOARD         │
            │  GEOLOCATION        │  │   (GeoPulse Dashboard)       │
            │                     │  │                              │
            │ [Denied] → Denied pg │  │  Top-right: Insight | Reports │
            │ [Granted] → Next    │  └───────────┬──────────┬───────┘
            └──────────┬──────────┘              │          │
                       │                         ▼          ▼
                       ▼               ┌──────────────┐  ┌──────────────┐
            ┌─────────────────────┐    │ ML & HOTSPOT │  │ REPORTS &    │
            │  HEAT REPORTING     │    │ ANALYTICS    │  │ EXPORT       │
            │  FORM               │    └──────────────┘  └──────────────┘
            │  (4-step stepper)   │
            └──────────┬──────────┘
                       │
                       ▼
            ┌─────────────────────┐
            │  DATA VALIDATION &  │◄── ML processes submission
            │  STATUS             │
            │  ✅ Valid           │
            │  ℹ️  Duplicate      │
            │  ⚠️  Anomaly        │
            │  [View Dashboard] ──┼──► HEAT MAP DASHBOARD
            │  [Return to Home] ──┼──► LANDING PAGE
            └─────────────────────┘
```

---

## Page Connections

| From Page | Action / Trigger | To Page |
|-----------|-----------------|---------|
| Landing Page | Click "Report Heat" CTA | Permission & Geolocation |
| Landing Page | Click "View Heat Map" CTA | Heat Map Dashboard |
| Landing Page | Mobile nav "Report" | Permission & Geolocation |
| Landing Page | Mobile nav "Map" | Heat Map Dashboard |
| Permission & Geolocation | Location granted → "Enable Location" | Heat Reporting Form |
| Permission & Geolocation | Location denied | Permission Denied page |
| Permission Denied page | Click "Try Again" | Permission & Geolocation |
| Permission Denied page | Click "Return Home" | Landing Page |
| Heat Reporting Form | Click "Submit Heat Report" | Data Validation & Status |
| Data Validation & Status | Click "View Dashboard" | Heat Map Dashboard |
| Data Validation & Status | Click "Return to Home" | Landing Page |
| Heat Map Dashboard | Top-right button "ML & HOTSPOT ANALYTICS" | ML & Hotspot Analytics |
| Heat Map Dashboard | Top-right button "REPORTS & EXPORT" | Reports & Export |
| ML & Hotspot Analytics | Header/Mobile nav "Dashboard" | Heat Map Dashboard |
| Reports & Export | Header/Mobile nav "Dashboard" | Heat Map Dashboard |
| Reports & Export | Header/Mobile nav "Home" | Landing Page |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + React Router DOM 6 (SPA) |
| **Build Tool** | Vite 7 |
| **CSS Utilities** | Tailwind CSS v4 via `@tailwindcss/postcss` |
| **Icons** | Google Material Symbols Outlined |
| **Typography** | Inter (Google Fonts) — weights 400–900 |
| **Theming** | Tailwind dark mode (`class` strategy) — light and dark supported |
| **App Type** | Responsive Web SPA |
| **Offline Support** | Not implemented yet in current frontend |
| **Backend** | RESTful API Server (Application Layer) |
| **Authentication** | Auth & Rate Limiting module |
| **Database** | Crowdsourced Heat Reports DB with Spatial Indexing & Querying |
| **External APIs** | Satellite Data API (LST + Land Use), Weather/Env Data API |
| **ML Engine** | Anomaly Detection, Aggregation & Scoring, Hotspot Detection |
| **Charts** | Inline SVG (line chart, bar chart, circular gauge rings) |
| **Maps** | Static map preview with UI overlays (live map integration pending) |
| **Animations** | Tailwind `animate-pulse` + CSS transitions |

---

## Design System

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#13ec37` | Brand green — CTAs, active states, accents |
| `background-light` | `#f6f8f6` | Light mode page background |
| `background-dark` | `#102213` | Dark mode page background |
| `text-dark` | `#0d1b10` | Primary text (dark green-black) |
| `accent-green` | `#4c9a59` | Secondary text, labels, subheadings |
| `heatmap-high` | `#ef4444` | High severity heat markers |
| `heatmap-low` | `#13ec37` | Low severity / safe zones |

### Heat Severity Gradient
```
Green (#13ec37)  →  Yellow (#facc15)  →  Red (#ef4444)
  Low (1)              Moderate (3)          Extreme (5)
```

### Typography Scale
- **Display / Hero**: Black 900, 4xl–6xl
- **Section Headings**: Bold 700, xl–3xl
- **Card Titles**: SemiBold 600, base–lg
- **Body**: Medium 500, sm–base
- **Metadata Labels**: Bold uppercase, 10px, wide letter-spacing

### Layout Principles
- Max content width: `max-w-2xl` (forms), `max-w-7xl` (landing page)
- Border radius: `0.5rem` (default), `1rem` (lg), `1.5rem` (xl), `9999px` (pill/full)
- Cards: White background, `border-primary/10`, `shadow-sm`
- All app screens use sticky headers and fixed bottom navigation bars
- Mobile-first responsive design with `md:` breakpoints for desktop expansion

---

## Key Metrics Tracked

| Metric | Description | Source Layer | Page |
|--------|-------------|--------------|------|
| Total Reports | Cumulative crowdsourced submissions | Data Layer | Heat Map Dashboard |
| Active Hotspots | Current high-severity geographic zones | ML & Analytics | Heat Map Dashboard |
| Avg. Severity | Mean heat severity score (1–5 scale) | Data Layer | Heat Map Dashboard |
| Satellite Correlation | % match between crowd data & satellite data | External + ML | Heat Map Dashboard |
| Aggregation Score | ML confidence in cluster groupings (0–100) | ML & Analytics | ML & Hotspot Analytics |
| Anomaly Index | % of submissions flagged as anomalous | ML & Analytics | ML & Hotspot Analytics |
| Reporting Trend (24h) | Rate of new submissions over 24 hours | Data Layer | ML & Hotspot Analytics |
| Reports This Week | Count of official mitigation reports generated | Reporting Layer | Reports & Export |
| Mitigation Success Rate | % of identified hotspots addressed | Reporting Layer | Reports & Export |

---

## Data Pipeline

A full submission lifecycle from citizen device to visualization output, combining both the architecture and workflow:

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1 — CITIZEN DEVICE (Client Layer)                     │
│  GPS + Severity (1–5) + Causes + Timestamp + Photo +Comment │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│  STEP 2 — APPLICATION LAYER                                 │
│  RESTful API → Auth & Rate Limiting                         │
│             → Validation & Preprocessing                    │
│             → Anonymization                                 │
└──────────────────────────────┬──────────────────────────────┘
               ┌───────────────┴───────────────┐
               ▼                               ▼
┌──────────────────────────┐   ┌───────────────────────────────┐
│  STEP 3a — DATA LAYER    │   │  STEP 3b — EXTERNAL DATA      │
│  Store Crowdsourced      │   │  Satellite Data API           │
│  Heat Reports            │   │   → Land Surface Temp         │
│  (UUID + Timestamp +     │   │   → Land Use Data             │
│   Severity + Geo)        │   │  Weather / Env Data API       │
│  Spatial Indexing &      │◄──│                               │
│  Querying                │   └───────────────────────────────┘
└──────────────┬───────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│  STEP 4 — ML & ANALYTICS LAYER                              │
│                                                             │
│  Validate Data                                              │
│    ├── [Invalid]  → Dropped                                 │
│    └── [Valid]    → Duplicate Filtering                     │
│                         │                                   │
│                   Anomaly Detection                         │
│                     ├── [Flagged]     → Manual Review Queue │
│                     └── [Not Flagged] → Data Ready          │
│                                            │                │
│  Aggregate Crowdsourced + Satellite Data ◄─┘                │
│  Apply Machine Learning Analysis                            │
│  Cluster Heat Hotspots                                      │
│  Update Hotspot Database                                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│  STEP 5 — VISUALIZATION & REPORTING LAYER                   │
│                                                             │
│  Generate Interactive Heat Map                              │
│    ├── Visualize Severity Levels                            │
│    │    └── Recommend Mitigation Strategies                 │
│    │         └── Display Recommendations to Users  ──► END  │
│    │                                                        │
│    └── Generate Reports for Planners                        │
│         └── Export Data as PDF or CSV  ──────────────► END  │
└─────────────────────────────────────────────────────────────┘
```

---

## License

This project was developed as a Final Year Project (FYP) for academic purposes.
© 2024 ThermaX — Urban Sustainability & Resilience Lab. All Rights Reserved.
