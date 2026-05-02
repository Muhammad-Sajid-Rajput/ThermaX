# 🌡️ ThermaX
### Advanced Crowdsourced Urban Heat Mapping Platform

> A production-grade SaaS analytics dashboard with role-based access control, empowering citizens and researchers to collaboratively report, analyze, and visualize urban heat islands through advanced spatial analytics, real-time data processing, and interactive mapping.

---

## 📋 Table of Contents

- [Overview](#overview)
- [🚀 Key Features](#-key-features)
- [Project Structure](#project-structure)
- [System Architecture](#system-architecture)
- [System Workflow](#system-workflow)
- [Pages & Features](#pages--features)
- [Navigation Flow](#navigation-flow)
- [Page Connections](#page-connections)
- [Tech Stack](#tech-stack)
- [Design System](#design-system)
- [🗺️ Advanced Map Features](#️-advanced-map-features)
- [Key Metrics Tracked](#key-metrics-tracked)
- [Data Pipeline](#data-pipeline)
- [🔧 Development Guide](#-development-guide)
- [📊 Performance & Optimization](#-performance--optimization)

---

## Overview

**ThermaX** is a comprehensive Final Year Project (FYP) that addresses urban heat island challenges through advanced crowdsourced data collection, real-time spatial analytics, and interactive visualization. The platform combines citizen science with machine learning to create actionable climate intelligence for urban planners and researchers.

### 🎯 Mission
Transform community-reported heat data into actionable urban climate intelligence through:
- **Real-time heat mapping** with advanced spatial visualization
- **Machine learning analytics** for hotspot detection and trend analysis
- **Interactive data exploration** with multi-layer map controls
- **Professional reporting** for urban planning and policy decisions

### 🏗️ Current Implementation
ThermaX is a **production-ready MERN SaaS platform** featuring:

#### 🔐 **Authentication System**
- **JWT Token Authentication** with secure bcrypt password hashing
- **Role-Based Access Control** (USER, COMMUNITY_REPORTER, COMMUNITY_ANALYST, ADMIN, OPERATIONS_ADMIN)
- **Public vs Protected Routes** - Users can explore dashboard, login required for reporting
- **App-Password Style Login** - Clean email/password authentication flow
- **Session Management** - Persistent authentication with localStorage
- **Security Features** - Rate limiting, input validation, CORS protection

#### 🎨 **Frontend Features**
- **SaaS Dashboard**: Real-time KPI monitoring, interactive Leaflet maps, and analytics.
- **Advanced Geolocation**: GPS-based location capture with auto-area detection.
- **Reporting Pipeline**: Multi-step wizard with image uploads (Multer-integrated).
- **DBSCAN Insights**: Visual explainability for machine learning hotspot clusters.
- **Admin Management**: Full user and report moderation interfaces.

#### 🚀 **Backend API (MERN Stack)**
- **Express.js Server**: Modular architecture with specialized route handlers.
- **MongoDB Integration**: Persistent storage using Mongoose ODM with spatial indexing.
- **Image Processing**: Multer-based file storage for citizen evidence photos.
- **Resilient Fallbacks**: API services feature mock fallbacks to maintain uptime during DB maintenance.

---

## Project Structure

```
ThermaX/
│
├── Frontend/
│   ├── src/
│   │   ├── App.jsx                    # Main app with JWT-based routing
│   │   ├── main.jsx                   # App entry point
│   │   ├── index.css                  # Global styles
│   │   ├── Components/                # Reusable UI components
│   │   │   ├── ui/                    # Base UI components
│   │   │   │   ├── FullscreenButton.jsx    # Professional fullscreen toggle
│   │   │   │   ├── RouteLoader.jsx
│   │   │   │   ├── Badge.jsx              # Status badges
│   │   │   │   ├── Panel.jsx              # Content panels
│   │   │   │   └── SectionHeading.jsx     # Section headers
│   │   │   ├── auth/                  # Authentication components
│   │   │   │   └── ProtectedRoute.jsx     # JWT route protection & guards
│   │   │   ├── layout/                # Layout components
│   │   │   │   ├── AppLayout.jsx          # Main App routing layout
│   │   │   │   ├── DashboardLayout.jsx    # SaaS dashboard vertical layout
│   │   │   │   ├── Navbar.jsx             # Top SaaS navigation replacing legacy sidebar
│   │   │   │   └── ContextPanel.jsx       # Right context panel
│   │   │   ├── dashboard/             # Dashboard-specific components
│   │   │   │   ├── KpiCards.jsx           # Professional KPI cards
│   │   │   │   ├── MapSection.jsx         # Map section with controls
│   │   │   │   ├── MapLegend.jsx          # Map legend overlay
│   │   │   │   └── AnalyticsSection.jsx   # Analytics charts
│   │   │   └── map/                   # Advanced map components
│   │   │       ├── InteractiveMap.jsx     # Main map with all features
│   │   │       ├── HeatmapLayer.jsx       # Heat intensity visualization
│   │   │       ├── ClusterLayer.jsx       # Marker clustering
│   │   │       ├── HotspotLayer.jsx       # DBSCAN risk zones
│   │   │       ├── AnalyticsPanel.jsx     # Click analytics
│   │   │       ├── LayerControl.jsx       # Base maps & overlays
│   │   │       ├── UserLocation.jsx       # Geolocation features
│   │   │       ├── MapErrorBoundary.jsx   # Error handling
│   │   │       ├── MapLoadingStates.jsx   # Loading components
│   │   │       └── README.md              # Map documentation
│   │   ├── Pages/                     # Route-based page components
│   │   │   ├── Dashboard/             # New SaaS dashboard
│   │   │   │   └── SaaS.jsx              # Main SaaS dashboard page
│   │   │   ├── Admin/                 # Admin panel pages
│   │   │   │   ├── AdminDashboard.jsx   # Main admin dashboard
│   │   │   │   ├── ReportManagement.jsx # Report moderation system
│   │   │   │   └── UserManagement.jsx   # User administration
│   │   │   ├── Auth/                  # Clean centered auth screens
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   └── SignupPage.jsx
│   │   │   ├── Landing/               # Redesigned responsive landing page
│   │   │   │   └── LandingPage.jsx
│   │   │   ├── Permission/            # Geolocation permission flows
│   │   │   │   ├── PermissionPage.jsx
│   │   │   │   └── PermissionDeniedPage.jsx
│   │   │   ├── HeatReport/            # Wizard-style reporting form
│   │   │   │   ├── HeatReportPage.jsx
│   │   │   │   └── SubmissionStatusPage.jsx
│   │   │   ├── Insight/               # DBSCAN Hotspot analytics explanation
│   │   │   │   └── InsightPage.jsx
│   │   │   ├── Profile/               # User profile and statistics
│   │   │   │   └── ProfilePage.jsx
│   │   │   ├── Reports/               # Analytics reports and history
│   │   │   │   ├── ReportsPage.jsx
│   │   │   │   └── MyReportsPage.jsx
│   │   ├── context/                   # React Context providers
│   │   │   └── AuthContext.jsx        # JWT authentication context & RBAC
│   │   ├── hooks/                     # Custom React hooks
│   │   │   ├── useSelectedLocation.js # Zustand global state for map interactions
│   │   │   ├── data/                  # Data fetching hooks
│   │   │   │   ├── useHeatmap.js
│   │   │   │   ├── useHeatmapData.js
│   │   │   │   ├── useHotspots.js
│   │   │   │   ├── useRealTimeData.js
│   │   │   │   └── useReports.js
│   │   │   ├── api/                   # API hooks
│   │   │   │   └── useApiResource.js
│   │   │   └── ui/                    # UI hooks
│   │   │       └── useFullscreen.js
│   │   ├── services/                  # API and data services
│   │   │   ├── api.js                 # Centralized Axios instance & endpoints
│   │   │   ├── config.js              # API configuration
│   │   │   ├── heatmapService.js      # Heatmap API abstraction
│   │   │   ├── hotspotsService.js     # Hotspots API abstraction
│   │   │   ├── localStorageService.js # Local storage utilities
│   │   │   └── seedData.js            # Mock data generation
│   │   └── utils/                     # Utility functions
│   │       ├── areaDetection.js       # Auto-area name detection
│   │       ├── geoUtils.js            # Geographic calculations
│   │       └── helpers.js             # General helper functions
│   ├── public/                        # Static assets
│   ├── package.json                   # Dependencies and scripts
│   ├── vite.config.js                 # Vite configuration
│   ├── tailwind.config.js             # Tailwind CSS config
│   └── README.md                      # This file
└── Backend/                           # Node.js + Express + MongoDB API
    ├── models/                        # Mongoose models
    │   ├── User.js                   # User schema with bcrypt
    │   └── Report.js                 # Heat report schema with spatial data
    ├── controllers/                   # Business logic
    │   ├── reportController.js        # Report & Image upload logic
    │   └── dashboardController.js     # Aggregated analytics logic
    ├── routes/                        # API route handlers
    │   ├── auth.js                   # Authentication endpoints
    │   ├── users.js                  # User management
    │   ├── reports.js                # Heat report & moderation
    │   ├── heatmap.js                # Spatial heatmap data
    │   ├── hotspots.js               # DBSCAN cluster data
    │   ├── dashboard.js              # Analytics snapshots
    │   └── exports.js                # Data export functionality
    ├── middleware/                     # Custom middleware
    │   ├── auth.js                   # JWT verification & RBAC guards
    │   └── validation.js             # Joi input validation
    ├── utils/                         # Utility functions
    │   ├── jwt.js                     # JWT token utilities
    │   ├── upload.js                  # Multer configuration
    │   └── mockAuth.js                # Mock fallback logic
    ├── uploads/                       # User-uploaded images (static)
    ├── server.js                      # Express server entry point
    ├── package.json                   # Backend dependencies
    ├── .env.example                   # Environment variables template
    └── README.md                      # Backend documentation
```

The frontend is organized as a modern React SPA with production-grade architecture, featuring advanced spatial visualization components, real-time data management, and comprehensive error handling.

---

## 🚀 Key Features

### 🔐 Role-Based Authentication & Access Control
- **Multi-Role System**: USER, COMMUNITY_REPORTER, COMMUNITY_ANALYST, ADMIN, OPERATIONS_ADMIN
- **Granular Permissions**: VIEW_DASHBOARD, SUBMIT_REPORTS, MANAGE_REPORTS, MANAGE_USERS, etc.
- **Secure Routes**: Protected routes with role guards and automatic redirects
- **Session Management**: Persistent authentication with localStorage and automatic logout
- **User Attribution**: All reports include user context for better moderation and analytics

### 🎯 Professional SaaS Dashboard
- **Modern Vertical Layout**: Sticky top Navbar, main scrollable content area, and right context panel.
- **Professional KPI Cards**: Trend indicators, icons, and hover effects with standardized tokens.
- **Interactive Analytics**: Charts, rankings, and data visualization components
- **Responsive Design**: Mobile-first approach with desktop enhancements
- **Dark/Light Themes**: Complete theme system with smooth transitions
- **Dynamic Navigation**: Role-based sidebar with admin-only sections

### 🗺️ Advanced Spatial Visualization
- **Real-time Heat Mapping**: Interactive Leaflet-based maps with severity-based gradient visualization
- **Professional Fullscreen Toggle**: Browser-compatible fullscreen mode with smooth animations
- **Marker Clustering**: Intelligent grouping of nearby reports using Leaflet.markercluster
- **DBSCAN Hotspot Detection**: Color-coded risk zones with detailed analytics
- **Multi-layer Control**: Toggle between heat, satellite, clusters, and hotspots layers
- **Click Analytics**: Detailed location analysis with comprehensive insights
- **Map Legend**: Professional overlay showing heat severity levels and map elements

### 📊 Real-time Data Processing
- **Live Data Polling**: 30-second interval updates with automatic retry logic
- **Error Resilience**: Comprehensive error boundaries and graceful degradation
- **Performance Optimization**: Debounced requests, memoization, and efficient state management
- **Mock Data Fallback**: Silent development-friendly data generation
- **API Abstraction Layer**: Clean separation between UI and data services

### 🎨 Production-Grade UI/UX
- **Accessibility**: ARIA labels, keyboard navigation, and semantic HTML
- **Loading States**: Skeleton screens, progress indicators, and status displays
- **Micro-interactions**: Hover effects, transitions, and smooth animations
- **Professional Components**: Reusable UI components with consistent design system

### 🔧 Developer Experience
- **Modular Architecture**: Reusable components with clean separation of concerns
- **Custom Hooks**: Specialized hooks for fullscreen, data management, and utilities
- **Service Layer**: API abstraction with centralized error handling
- **Code Quality**: ESLint, Stylelint, and Tailwind CSS linting
- **Geographic Utils**: Comprehensive utility functions for spatial calculations

---

## System Architecture

ThermaX is organized into **6 distinct architectural layers**, each with a clearly defined responsibility. The layers communicate in sequence from client-facing interfaces through to visualization outputs.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  CLIENT LAYER                                                            │
│                                                                          │
│  Dashboard  |  Heat Reporting Form  |  Geolocation & Permissions         │
│  Offline Capabilities  |  Interactive Map  |  Responsive Web SPA         │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │  (bidirectional)
┌─────────────────────────────────▼────────────────────────────────────────┐
│  APPLICATION LAYER                                                       │
│                                                                          │
│  RESTful API Server                                                      │
│    ├──► Auth & Rate Limiting                                             │
│    └──► Validation & Preprocessing  ──►  Anonymization                   │
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
│  Anomaly Detection  ──►  Aggregation & Scoring  ──►  Hotspot Detection   │
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────────────────┐
│  VISUALIZATION & REPORTING LAYER                                         │
│                                                                          │
│  Dashboards  |  Heat Map Generator  |  PDF/CSV Export                    │
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

### 3. ❌ Permission Denied (`/permission/denied`)

- Displays geolocation denied message
- Provides options to try again or return home
- Routes back to `/permission` or `/`

### 4. � Authentication (`/auth`)

- **Multi-Role Login System**: Supports USER, COMMUNITY_REPORTER, COMMUNITY_ANALYST, ADMIN, OPERATIONS_ADMIN
- **Role-Based Redirects**: Admins → `/admin`, Users → `/dashboard`
- **Session Persistence**: Automatic login restoration and logout handling
- **User Context**: Displays user information and role in authenticated sections

### 5. 📝 Heat Reporting Form (`/report`)

- **Authentication Required**: Users must be logged in to submit reports
- **Enhanced User Attribution**: Reports include userId, userName, userEmail, userRole
- **4-Step Wizard**: Location → Severity → Evidence → Review
- **Advanced Features**:
  - GPS coordinates with auto-detection
  - Severity slider (1–5) with cause selection
  - Photo upload with preview
  - Field notes and observations
- **Submit Action**: Posts to API with user context and routes to `/report/status`
- **Dashboard Integration**: "Submit Report" button available for authenticated users

### 6. ✅ Data Validation & Status (`/report/status`)

- Protected route showing validation pipeline/status cards
- Displays submission ID and timestamp passed from form flow
- Shows one validation result per submission (Valid / Duplicate / Anomaly)
- Provides quick actions:
  - `View Dashboard` → `/dashboard`
  - `Return to Home` → `/`

### 7. 🗺️ Heat Map Dashboard (`/dashboard`)

- GeoPulse dashboard layout with KPI cards and filter controls
- Interactive map using Leaflet with heat overlay integration
- Real-time data fetching from `/api/heatmap` and `/api/hotspots`
- Top-right dashboard actions route to Insight and Reports

### 8. 🧠 ML & Hotspot Analytics (`/insight`)

- Inference summary header with run metadata
- Geospatial distribution preview card
- KPI widgets (aggregation score, anomaly index)
- Cluster ranking and trend/intensity charts with real-time data

### 9. 📊 Reports & Export (`/reports`)

- Summary stats and report preview card
- Export options UI:
  - PDF report button (generates mitigation reports)
  - CSV export button
- Last generated report indicator with timestamp

### 10. � My Reports (`/my-reports`)

- Personal report history for authenticated users
- Displays user's submitted heat reports with status tracking
- Filterable by date, severity, and validation status

### 11. 🛡️ Admin Dashboard (`/admin`)

- **Role-Protected Access**: Only ADMIN and OPERATIONS_ADMIN roles
- **System Overview**: Real-time statistics (reports, users, hotspots)
- **Quick Actions**: Direct access to report management, user management, heatmap control
- **Navigation Tabs**: Overview, Reports, Users, Heatmap, Analytics, Settings, Alerts
- **System Health Monitoring**: Operational status and performance metrics

### 12. 📋 Report Management (`/admin/reports`)

- **Bulk Moderation**: Approve/reject multiple reports simultaneously
- **Advanced Filtering**: Status, area, severity, date range filters
- **Report Details**: Complete report information with user attribution
- **Export Capabilities**: Download filtered reports for analysis
- **Moderation Queue**: Pending review workflow with validation

### 13. 👥 User Management (`/admin/users`)

- **Complete User Directory**: All users with roles and status
- **Bulk User Actions**: Activate/suspend multiple users
- **User Analytics**: Reputation tracking and activity monitoring
- **Role Management**: Assign and update user roles
- **Detailed Profiles**: User information and activity history

### 14. ⚖️ Legacy Admin Moderation (`/admin/moderation`)

- Administrative interface for report moderation (legacy)
- Queue system for reviewing flagged submissions
- Bulk actions for approving/rejecting reports
- Analytics on moderation trends

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
| **Frontend Framework** | React 18 with lazy loading and Suspense |
| **Routing** | React Router DOM 6 (SPA with role-based protected routes) |
| **Authentication** | Custom RBAC system with React Context API |
| **Authorization** | Role-based access control with granular permissions |
| **Build Tool** | Vite 7.3 with SWC for fast development |
| **CSS Framework** | Tailwind CSS v4.1 via `@tailwindcss/postcss` |
| **Icons** | Lucide React for modern, consistent iconography |
| **Typography** | Inter (Google Fonts) — weights 400–900 |
| **Theming** | Tailwind dark mode (`class` strategy) — light and dark supported |
| **HTTP Client** | Axios 1.13 for API communication |
| **Maps** | Leaflet 1.9.4 + React-Leaflet 4.2.1 + Leaflet.heat 0.2.0 + Leaflet.markercluster 1.5.3 |
| **Charts** | Recharts 3.3 for data visualization |
| **State Management** | Zustand 5.0 with devtools middleware |
| **Fullscreen API** | Custom useFullscreen hook with browser compatibility |
| **Code Quality** | ESLint 9.39 with React hooks and refresh plugins |
| **Style Linting** | Stylelint 17.3 with Tailwind CSS config |
| **Notifications** | React Hot Toast 2.6 |
| **Package Manager** | pnpm with workspace support |
| **App Type** | Production-grade Role-Based SaaS Web SPA with advanced spatial analytics |
| **Backend** | Express.js 4.18 with MongoDB 8.0 via Mongoose |
| **Authentication** | JWT 9.0 with bcryptjs 2.4 |
| **Session Management** | localStorage-based session persistence |
| **Security** | Helmet 7.1, express-rate-limit 7.1, Joi 17.11 |
| **Database** | Crowdsourced Heat Reports DB with Spatial Indexing |
| **External APIs** | Satellite Data API (LST + Land Use), Weather/Env Data API |
| **ML Engine** | Anomaly Detection, Aggregation & Scoring, Hotspot Detection |
| **Animations** | Tailwind `animate-pulse` + CSS transitions |

---

## 🗺️ Advanced Map Features

### Core Map Components

#### `InteractiveMap`
The main map component that integrates all visualization layers and features.

**Features:**
- Real-time data polling with 15-second intervals
- Multiple base maps (OpenStreetMap, Satellite, Terrain)
- Advanced layer control with overlay toggles
- Click-to-analyze functionality with detailed insights
- Error boundaries and comprehensive loading states
- User location integration with nearby heat analysis

**Usage:**
```jsx
<InteractiveMap
  enableRealTimeUpdates={true}
  onError={(type, error) => console.error(type, error)}
/>
```

#### `HeatmapLayer`
Advanced heat intensity visualization using `leaflet.heat`.

**Features:**
- Blue → Yellow → Red severity gradient
- Severity (1-5) to intensity mapping
- Performance optimized with proper cleanup
- Toggle visibility support

**Data Format:**
```jsx
const heatmapData = [
  { lat: 40.7128, lng: -74.0060, severity: 3 },
  { lat: 40.7260, lng: -73.9897, severity: 4 }
];
```

#### `ClusterLayer`
Intelligent marker clustering using `Leaflet.markercluster`.

**Features:**
- Custom cluster icons with count display
- Severity-based marker colors
- Smooth zoom transitions
- Detailed popup information

#### `HotspotLayer`
DBSCAN clustered hotspot visualization.

**Features:**
- Color-coded risk zones (Green/Yellow/Red)
- Interactive tooltips with risk level indicators
- Detailed popup with analytics
- Radius visualization for impact areas

**Data Format:**
```jsx
const hotspotsData = [
  {
    id: "hotspot-1",
    center: [40.7128, -74.0060],
    radius: 1000,
    avgSeverity: 4.2,
    pointCount: 25,
    avgTemperature: 38
  }
];
```

#### `AnalyticsPanel`
Comprehensive location analytics on map click.

**Features:**
- Average severity calculation in specified radius
- Report count and temperature analysis
- 7-day trend visualization
- Nearest hotspot information
- Export capabilities

#### `LayerControl`
Advanced layer management interface.

**Features:**
- Multiple base map options (OpenStreetMap, Satellite, Terrain)
- Overlay layer toggles (Heatmap, Clusters, Hotspots, User Location)
- Visual indicators for active layers
- Collapsible interface design

#### `UserLocation`
Browser geolocation integration with analytics.

**Features:**
- Real-time location tracking with watch mode
- Nearby heat analysis (1km radius)
- Distance to nearest hotspot calculation
- Permission handling with graceful fallbacks

### Real-time Data Management

#### `useRealTimeData` Hook
Custom hook for real-time data polling and management.

**Features:**
- Automatic polling with configurable intervals
- Retry logic with exponential backoff
- Mock data fallback for development
- Comprehensive error handling
- Debounced requests to prevent API spam

**Usage:**
```jsx
const {
  data,
  loading,
  errors,
  isLoading,
  hasErrors,
  isPolling,
  refresh,
  mostRecentUpdate
} = useRealTimeData({
  enabled: true,
  pollingInterval: 15000,
  endpoints: {
    heatmap: "/api/heatmap",
    reports: "/api/reports",
    hotspots: "/api/hotspots"
  }
});
```

### Error Handling & Loading States

#### `MapErrorBoundary`
Comprehensive error boundary for map components.

**Features:**
- Retry mechanisms with attempt tracking
- Development error details
- Graceful fallbacks
- User-friendly error messages

#### `MapLoadingStates`
Collection of specialized loading components.

**Components:**
- `MapSkeleton` - Loading skeleton animation
- `DataLoadingIndicator` - Per-data-type loading status
- `EmptyMapState` - No data state with retry options
- `FullScreenLoading` - Full-screen loading overlay
- `ConnectionStatus` - Network connectivity indicator

### Performance Optimizations

- **Lazy Loading**: Components load data only when visible
- **Memoization**: Heavy computations cached with `useMemo`
- **Debouncing**: API requests debounced to prevent spam
- **Cleanup**: Proper cleanup of intervals and event listeners
- **Chunked Loading**: Marker clusters support progressive loading

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

## API Endpoints & Services

### Core API Configuration
- **Base URL**: Configured via `VITE_API_BASE_URL` environment variable
- **Timeout**: 7 seconds for all requests
- **HTTP Client**: Axios with automatic error handling

### Primary Endpoints

| Endpoint | Method | Description | Response Type |
|----------|--------|-------------|---------------|
| `/api/heatmap` | GET | Fetch heat map data with filtering options | HeatmapData[] |
| `/api/hotspots` | GET | Retrieve detected heat hotspot clusters | HotspotData[] |
| `/api/report` | POST | Submit new heat vulnerability report | SubmissionResponse |

### Service Functions

#### Data Fetching Services
- `fetchHeatmap(filters)` - Retrieves heatmap data with optional filters
- `fetchHotspots(filters)` - Gets hotspot clusters with geographic bounds
- `fetchReports(filters)` - Fetches individual heat reports
- `fetchDashboardSnapshot(filters)` - Aggregated dashboard KPIs
- `fetchInsightSnapshot(filters)` - ML analytics and insights
- `fetchReportsCenter(filters)` - Reports center analytics

#### User Services
- `submitHeatReport(payload)` - Submit new heat report
- `fetchMyReports()` - Get user's personal report history
- `authenticateUser(payload)` - User authentication

#### Admin Services
- `fetchModerationQueue()` - Get reports needing moderation
- `updateModerationStatus(reportId, decision)` - Update report moderation status

#### Utility Services
- `generateMitigationReport(payload)` - Generate PDF/CSV reports
- `detectAreaName(latitude, longitude)` - Reverse geocoding for area detection
- `getAreaProfiles()` - Get predefined area profiles with metadata

### Data Models

#### Heat Report Structure
```javascript
{
  id: string,           // UUID
  timestamp: string,    // ISO datetime
  latitude: number,     // GPS coordinates
  longitude: number,
  severity: number,     // 1-5 scale
  causes: string[],     // Selected cause categories
  comment: string,      // User observations
  photo?: string,       // Base64 image data
  status: 'valid' | 'duplicate' | 'anomaly',
  areaName: string      // Detected area
}
```

#### Area Profile Structure
```javascript
{
  name: string,
  center: [number, number],    // [lat, lng]
  avgTemperature: number,
  avgSeverity: number,
  ndvi: number,                 // Normalized Difference Vegetation Index
  priority: 'Critical' | 'High' | 'Medium' | 'Low',
  confidence: number,           // 0-1 scale
  satelliteCorrelation: number, // 0-1 scale
  polygon: [number, number][]   // Geographic bounds
}
```

### Geographic Coverage
- **Primary City**: Karachi, Pakistan (24.8607°N, 67.0011°E)
- **Key Areas**: Saddar, Korangi Industrial Area, DHA, Clifton, etc.
- **Coordinate System**: WGS84 (latitude, longitude)
- **Spatial Indexing**: Quadtree-based for efficient geo-queries

---

## 🔧 Development Guide

### 🚀 Quick Start

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd ThermaX
   ```

2. **Backend Setup**
   ```bash
   cd Backend
   npm install
   cp .env.example .env
   # Configure .env with your settings
   npm start
   # Backend runs on http://localhost:5001
   ```

3. **Frontend Setup**
   ```bash
   cd Frontend
   npm install
   npm run dev
   # Frontend runs on http://localhost:5173
   ```

### Authentication System

The platform features a complete JWT-based authentication system:

#### **Demo Accounts**
- **Regular User**: `demo@thermax.com` / `demo123`
- **Admin User**: `admin@thermax.com` / `admin123`

#### **Authentication Flow**
1. **Public Access**: Users can explore dashboard without login
2. **Protected Features**: Login required for heat reporting, personal features
3. **Role-Based Access**: Different features based on user role
4. **Session Management**: Persistent authentication with localStorage

#### **Backend API Endpoints**
```bash
# Authentication
POST /api/auth/signup     # User registration
POST /api/auth/login       # User login
GET  /api/auth/verify     # Token verification

# User Management
GET  /api/users/profile   # Get user profile (auth required)
PUT  /api/users/profile   # Update profile (auth required)

# Reports
GET  /api/reports         # Public reports (no auth required)
POST /api/reports         # Submit report (auth required)
GET  /api/reports/my-reports  # User's reports (auth required)
```

### Frontend Development

#### **Development Commands**
```bash
cd Frontend
npm install              # Install dependencies
npm run dev             # Start development server
npm run build           # Build for production
npm run preview         # Preview production build
npm run lint            # Run ESLint
```

#### **Authentication Integration**
- **AuthContext**: Global authentication state management
- **ProtectedRoute**: JWT-based route guards
- **Role-Based Routing**: Different routes for different user roles
- **API Integration**: Automatic token handling for API calls

#### **Route Structure**
- **Public Routes**: `/`, `/dashboard`, `/insight`, `/reports`
- **Auth Routes**: `/login`, `/signup`
- **Protected Routes**: `/report`, `/my-reports`
- **Admin Routes**: `/admin/*`

### Backend Development

#### **Development Commands**
```bash
cd Backend
npm install              # Install dependencies
npm start                # Start production server
npm run dev              # Start development with nodemon
```

#### **Environment Variables**
```env
PORT=5001
NODE_ENV=development
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
MONGODB_URI=mongodb://localhost:27017/thermax
FRONTEND_URL=http://localhost:5173
VITE_MAP_DEFAULT_ZOOM=11
```

#### Required Dependencies
All required packages are already installed:

```json
{
  "leaflet": "^1.9.4",
  "leaflet.heat": "^0.2.0", 
  "leaflet.markercluster": "^1.5.3",
  "react-leaflet": "^4.2.1",
  "axios": "^1.13.2",
  "recharts": "^3.3.0",
  "lucide-react": "^0.263.1"
}
```

### 🎯 New Features Implementation

#### SaaS Dashboard Components
The new dashboard architecture includes:

```jsx
// Main dashboard layout
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import KpiCards from './components/dashboard/KpiCards.jsx';
import MapSection from './components/dashboard/MapSection.jsx';
import AnalyticsSection from './components/dashboard/AnalyticsSection.jsx';

// Usage in SaaS dashboard
function SaaSDashboard() {
  return (
    <DashboardLayout>
      <KpiCards items={kpiData} />
      <MapSection heatmap={heatmap} hotspots={hotspots} reports={reports} />
      <AnalyticsSection />
    </DashboardLayout>
  );
}
```

#### Fullscreen Toggle Implementation
Professional fullscreen functionality with browser compatibility:

```jsx
import FullscreenButton from './components/ui/FullscreenButton.jsx';
import { useRef } from 'react';

function MapComponent() {
  const mapRef = useRef(null);

  return (
    <div ref={mapRef} className="map-container">
      <InteractiveMap />
      <FullscreenButton
        targetRef={mapRef}
        position="top-right"
        showTooltip={true}
        persistState={true}
      />
    </div>
  );
}
```

#### Custom Hooks Usage
Leverage the new custom hooks for better state management:

```jsx
// Fullscreen functionality
import useFullscreen from './hooks/useFullscreen.js';

const { isFullscreen, toggleFullscreen } = useFullscreen({
  targetRef: mapRef,
  persistState: true
});

// Data management
import useHeatmapData from './hooks/useHeatmapData.js';
import useHotspots from './hooks/useHotspots.js';

const { data: heatmap, loading, error } = useHeatmapData();
const { data: hotspots, stats } = useHotspots();
```

### 🔧 API Integration

#### Service Layer Architecture
Clean API abstraction with centralized error handling:

```jsx
// Heatmap service
import heatmapService from './services/heatmapService.js';

const { data, stats, distribution } = await heatmapService.getHeatmapData();

// Hotspots service  
import hotspotsService from './services/hotspotsService.js';

const { hotspots, priority, topRiskAreas } = await hotspotsService.getHotspots();
```

#### Mock Data System
Silent mock data fallback for development:

```jsx
// useRealTimeData hook automatically falls back to mock data
const { data, loading, error } = useRealTimeData({
  enabled: true,
  pollingInterval: 30000, // 30 seconds
  endpoints: {
    heatmap: "/api/heatmap",
    reports: "/api/reports", 
    hotspots: "/api/hotspots"
  }
});
```

### 🎨 UI Components

#### Professional KPI Cards
Modern KPI cards with trend indicators:

```jsx
import KpiCards from './components/dashboard/KpiCards.jsx';

const kpiData = [
  {
    id: 'total-reports',
    label: 'Total Reports',
    value: '2,847',
    icon: Users,
    trend: { value: '+12%', direction: 'up', color: 'text-green-600' },
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20'
  }
];

<KpiCards items={kpiData} />
```

#### Map Section with Controls
Enhanced map section with layer controls and fullscreen:

```jsx
import MapSection from './components/dashboard/MapSection.jsx';

<MapSection 
  heatmap={heatmapData}
  hotspots={hotspotsData}
  reports={reportsData}
/>
```

### 🚀 Performance Optimizations

#### Real-time Data Management
- **Polling Interval**: 30 seconds (reduced from 15 for performance)
- **Debouncing**: API requests debounced to prevent spam
- **Memoization**: Heavy computations cached with `useMemo`
- **Cleanup**: Proper cleanup of intervals and event listeners

#### Component Optimization
- **Lazy Loading**: Components load data only when visible
- **Error Boundaries**: Comprehensive error handling
- **Loading States**: Professional loading indicators
- **State Persistence**: Fullscreen state persisted across reloads

### 🐛 Common Issues & Solutions

#### Console Warnings
Mock data warnings are now completely silenced for clean development experience.

#### Fullscreen API Compatibility
The `useFullscreen` hook handles all browser prefixes and edge cases automatically.

#### Performance Issues
- Reduced polling frequency from 15s to 30s
- Implemented proper cleanup in all hooks
- Added debouncing to prevent API spam
- Used memoization for expensive computations

### 🗺️ Map Integration

#### CSS Imports
Ensure these CSS files are imported in your main CSS file:

```css
@import 'leaflet/dist/leaflet.css';
@import 'leaflet.markercluster/dist/MarkerCluster.css';
@import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
```

#### Basic Map Usage
```jsx
import InteractiveMap from './Components/map/InteractiveMap';

function MyComponent() {
  return (
    <div className="h-96">
      <InteractiveMap
        enableRealTimeUpdates={true}
        initialHeatmap={[]}
        initialHotspots={[]}
        initialReports={[]}
      />
    </div>
  );
}
```

### 🎨 Component Development

#### Creating Custom Map Layers
```jsx
import { useMap } from 'react-leaflet';

function CustomLayer({ data, visible }) {
  const map = useMap();
  
  useEffect(() => {
    if (!visible || !data) return;
    
    // Your custom layer logic here
    
    return () => {
      // Cleanup logic
    };
  }, [map, data, visible]);
  
  return null;
}
```

#### Error Handling Pattern
```jsx
import MapErrorBoundary from './Components/map/MapErrorBoundary';

function SafeMap() {
  return (
    <MapErrorBoundary>
      <InteractiveMap />
    </MapErrorBoundary>
  );
}
```

### 📊 Data Formats

#### Heatmap Data Structure
```javascript
{
  lat: number,        // Latitude
  lng: number,        // Longitude 
  severity: number    // 1-5 scale
}
```

#### Report Data Structure
```javascript
{
  id: string,
  lat: number,
  lng: number,
  severity: number,
  description: string,
  category: string,
  temperature: number,
  timestamp: string,
  area: string,
  source: string
}
```

#### Hotspot Data Structure
```javascript
{
  id: string,
  center: [number, number],  // [lat, lng]
  radius: number,            // meters
  avgSeverity: number,
  pointCount: number,
  avgTemperature: number,
  area: string
}
```

### 🐛 Troubleshooting

#### Common Issues

**Map not rendering:**
- Check Leaflet CSS imports
- Verify container has explicit height
- Ensure map is not inside hidden element

**Clusters not working:**
- Verify `leaflet.markercluster.css` is loaded
- Check data format for valid coordinates
- Ensure markers have unique keys

**Heatmap not visible:**
- Verify data points have valid coordinates
- Check intensity values (0-1 range)
- Ensure radius and blur settings are appropriate

**Performance issues:**
- Reduce data points for heatmap
- Use clustering for large datasets
- Enable chunked loading
- Implement proper cleanup

### 🧪 Testing

#### Mock Data Generation
The platform includes comprehensive mock data generators:

```javascript
import { generateMockData } from './hooks/useRealTimeData';

// Generate mock heatmap data
const mockHeatmap = generateMockData('heatmap');

// Generate mock reports
const mockReports = generateMockData('reports');

// Generate mock hotspots
const mockHotspots = generateMockData('hotspots');
```

#### Development Mode
Enable mock data by setting API endpoints to invalid URLs - the system will automatically fall back to generated mock data.

---

## 📊 Performance & Optimization

### 🚀 Performance Features

#### Real-time Optimizations
- **Debounced API Calls**: Prevents excessive requests during rapid interactions
- **Memoized Computations**: Heavy calculations cached using `useMemo`
- **Efficient State Updates**: Minimized re-renders with proper dependency arrays
- **Chunked Data Loading**: Progressive loading for large datasets

#### Map Performance
- **Layer Visibility Management**: Only render visible layers
- **Marker Clustering**: Groups nearby markers to reduce DOM nodes
- **Heatmap Point Limits**: Configurable maximum points for performance
- **Tile Loading Optimization**: Efficient tile caching and preloading

#### Memory Management
- **Proper Cleanup**: Intervals, event listeners, and map layers cleaned up on unmount
- **Error Boundaries**: Prevents memory leaks from component errors
- **Lazy Loading**: Components load data only when needed

### 📈 Performance Metrics

#### Target Performance
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Map Load Time**: < 2s
- **Data Refresh Rate**: 15 seconds

#### Monitoring
The platform includes built-in performance monitoring:
- Connection status indicators
- Loading state management
- Error rate tracking
- Data freshness indicators

### 🔧 Optimization Techniques

#### Code Splitting
```javascript
// Lazy load heavy components
const HeavyMapComponent = lazy(() => import('./HeavyMapComponent'));

// Use with Suspense
<Suspense fallback={<MapSkeleton />}>
  <HeavyMapComponent />
</Suspense>
```

#### Virtualization
For large datasets, implement virtualization:
```javascript
// Only render visible markers
const visibleMarkers = useMemo(() => {
  return markers.filter(marker => isInViewport(marker));
}, [markers, viewport]);
```

#### Caching Strategy
```javascript
// Cache API responses
const cachedData = useRef(new Map());

const fetchData = useCallback(async (endpoint) => {
  if (cachedData.current.has(endpoint)) {
    return cachedData.current.get(endpoint);
  }
  
  const data = await api.get(endpoint);
  cachedData.current.set(endpoint, data);
  return data;
}, []);
```

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

## 🔧 Recent Improvements

### April 2026 Bug Fixes & Code Quality Improvements

#### Tailwind CSS Optimization
- Updated gradient syntax: `bg-gradient-to-r` → `bg-linear-to-r` (modern Tailwind v4 syntax)
- Fixed arbitrary value classes to use standard spacing scale:
  - `z-[100]` → `z-100`
  - `w-[280px]` → `w-70`
  - `max-w-[200px]` → `max-w-50`
  - `top-[10px]` → `top-2.5`
  - `h-[460px]` → `h-115`
  - `h-[500px]` → `h-125`
  - `min-h-[500px]` → `min-h-125`
- Removed conflicting CSS class combinations (`block` + `flex`)

#### Component Fixes
- **ProtectedRoute**: Resolved IDE false-positive errors (file has single valid export)
- **ContextPanel**: Previously fixed overlay issue with proper grid layout integration
- All components now follow Tailwind v4 best practices

#### Code Quality
- Consistent Tailwind CSS class naming across all components
- Improved build compatibility with modern Tailwind syntax
- Reduced bundle size by using standard utility classes

---

## 🔧 Development Guide

### Prerequisites
- Node.js (v18+)
- MongoDB (Running locally or MongoDB Atlas)
- npm or pnpm

### 1. Clone the Repository
```bash
git clone https://github.com/Muhammad-Sajid-Rajput/ThermaX.git
cd ThermaX
```

### 2. Backend Setup
```bash
cd Backend
npm install
```
Create a `.env` file in the `Backend` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/thermax
JWT_SECRET=your_jwt_secret_key_here
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```
Start the backend:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd ../Frontend
npm install
```
Create a `.env` file in the `Frontend` directory:
```env
VITE_API_URL=http://localhost:5000
VITE_ENABLE_MOCKS=false
```
Start the frontend:
```bash
npm run dev
```

### 4. Default Admin Credentials (Development)
If the database is empty, the system will use mock authentication or you can register a new user. To enable admin features, update the user role in MongoDB to `ADMIN`.

---

## 📊 Performance & Optimization

- **Axios Interceptors**: Handles JWT token injection and 401 unauthorized redirects.
- **Zustand State**: Optimized map interaction state to prevent unnecessary re-renders.
- **Multer Storage**: Efficiently handles multipart/form-data for evidence uploads.
- **Spatial Fallbacks**: Frontend components are designed to work even if the backend is in "Mock Mode".

---

## License

This project was developed as a Final Year Project (FYP) for academic purposes.
© 2026 ThermaX — Urban Sustainability & Resilience Lab. All Rights Reserved.
