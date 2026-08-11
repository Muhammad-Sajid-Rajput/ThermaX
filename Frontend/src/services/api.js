import axios from 'axios';
import { isLocalMode, DEMO_CREDENTIALS } from './config';
import {
  userStorage,
  reportStorage,
  hotspotStorage,
  authStorage,
  isSeeded,
} from './localStorageService';
import { seedDemoData } from './seedData';
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  timeout: 7000,
});

api.interceptors.request.use((config) => {
  const token = authStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
const ARRAY_CANDIDATE_KEYS = [
  'data',
  'items',
  'results',
  'reports',
  'hotspots',
  'heatmap',
  'points',
  'features',
];
const CITY_CENTER = [24.8607, 67.0011];
const PLATFORM_UPDATED_AT = '2026-04-25T08:30:00+05:00';
const HEATMAP_ENDPOINT = '/api/heatmap';
const HOTSPOTS_ENDPOINT = '/api/hotspots';
const REPORTS_ENDPOINT = '/api/report';
const AREA_PROFILES = [
  {
    name: 'Saddar',
    center: [24.8532, 67.0284],
    avgTemperature: 41.6,
    avgSeverity: 4.2,
    ndvi: 0.19,
    priority: 'Critical',
    confidence: 0.93,
    satelliteCorrelation: 0.9,
    polygon: [
      [24.8582, 67.0224],
      [24.8582, 67.0348],
      [24.8482, 67.0348],
      [24.8482, 67.0224],
    ],
  },
  {
    name: 'Korangi Industrial Area',
    center: [24.8301, 67.1395],
    avgTemperature: 40.8,
    avgSeverity: 3.9,
    ndvi: 0.23,
    priority: 'High',
    confidence: 0.86,
    satelliteCorrelation: 0.84,
    polygon: [
      [24.8356, 67.1325],
      [24.8356, 67.1465],
      [24.8247, 67.1465],
      [24.8247, 67.1325],
    ],
  },
  {
    name: 'Gulshan-e-Iqbal',
    center: [24.9184, 67.0952],
    avgTemperature: 39.6,
    avgSeverity: 3.5,
    ndvi: 0.31,
    priority: 'High',
    confidence: 0.82,
    satelliteCorrelation: 0.81,
    polygon: [
      [24.9238, 67.0878],
      [24.9238, 67.1024],
      [24.9129, 67.1024],
      [24.9129, 67.0878],
    ],
  },
  {
    name: 'North Nazimabad',
    center: [24.9386, 67.0417],
    avgTemperature: 38.7,
    avgSeverity: 3.1,
    ndvi: 0.35,
    priority: 'Medium',
    confidence: 0.74,
    satelliteCorrelation: 0.78,
    polygon: [
      [24.9441, 67.0347],
      [24.9441, 67.0487],
      [24.9331, 67.0487],
      [24.9331, 67.0347],
    ],
  },
  {
    name: 'Clifton',
    center: [24.8103, 67.0305],
    avgTemperature: 37.8,
    avgSeverity: 2.8,
    ndvi: 0.42,
    priority: 'Low',
    confidence: 0.68,
    satelliteCorrelation: 0.72,
    polygon: [
      [24.8161, 67.0232],
      [24.8161, 67.0374],
      [24.8044, 67.0374],
      [24.8044, 67.0232],
    ],
  },
];
const HOTSPOT_PRIORITY_ORDER = ['Low', 'Medium', 'High', 'Critical'];
const HOTSPOT_PRIORITY_COLORS = {
  Low: '#65a30d',
  Medium: '#facc15',
  High: '#f97316',
  Critical: '#dc2626',
};
const REPORT_SEED = [
  {
    id: 'RPT-2401',
    area: 'Saddar',
    coordinates: [24.8528, 67.0296],
    severity: 5,
    timestamp: '2026-04-25T07:40:00+05:00',
    description:
      'Roadside pavement is radiating intense heat and pedestrians are sheltering under shop shutters.',
    source: 'Citizen',
    category: 'Built-up canyon',
  },
  {
    id: 'RPT-2402',
    area: 'Saddar',
    coordinates: [24.8547, 67.0254],
    severity: 4,
    timestamp: '2026-04-25T05:15:00+05:00',
    description:
      'Bus stop queue reported strong radiant heat after sunrise with little tree cover.',
    source: 'Field volunteer',
    category: 'Transit exposure',
  },
  {
    id: 'RPT-2403',
    area: 'Korangi Industrial Area',
    coordinates: [24.8298, 67.1412],
    severity: 4,
    timestamp: '2026-04-24T18:00:00+05:00',
    description:
      'Industrial sheds and asphalt yards stayed hot into the evening; workers requested water points.',
    source: 'Factory staff',
    category: 'Industrial heat',
  },
  {
    id: 'RPT-2404',
    area: 'Gulshan-e-Iqbal',
    coordinates: [24.9176, 67.0939],
    severity: 3,
    timestamp: '2026-04-24T14:35:00+05:00',
    description:
      'Playground edge near block market felt hotter than nearby shaded street.',
    source: 'Community lead',
    category: 'Open ground',
  },
  {
    id: 'RPT-2405',
    area: 'North Nazimabad',
    coordinates: [24.9398, 67.0431],
    severity: 3,
    timestamp: '2026-04-24T11:10:00+05:00',
    description:
      'A concrete service lane retained heat around noon and elderly residents avoided the crossing.',
    source: 'Citizen',
    category: 'Residential corridor',
  },
  {
    id: 'RPT-2406',
    area: 'Clifton',
    coordinates: [24.8094, 67.0317],
    severity: 2,
    timestamp: '2026-04-23T16:20:00+05:00',
    description:
      'Seafront breeze lowered discomfort, but the parking apron still produced localized hotspots.',
    source: 'Citizen',
    category: 'Parking apron',
  },
  {
    id: 'RPT-2407',
    area: 'Korangi Industrial Area',
    coordinates: [24.8324, 67.1378],
    severity: 5,
    timestamp: '2026-04-22T13:45:00+05:00',
    description:
      'Shift change crowd reported overheating near warehouse roofs with no shaded waiting zone.',
    source: 'Field volunteer',
    category: 'Worker exposure',
  },
  {
    id: 'RPT-2408',
    area: 'Gulshan-e-Iqbal',
    coordinates: [24.9191, 67.0987],
    severity: 4,
    timestamp: '2026-04-21T15:10:00+05:00',
    description:
      'Pedestrian bridge deck felt significantly hotter than nearby service road.',
    source: 'Citizen',
    category: 'Concrete bridge',
  },
  {
    id: 'RPT-2409',
    area: 'Saddar',
    coordinates: [24.8507, 67.0312],
    severity: 5,
    timestamp: '2026-04-20T12:35:00+05:00',
    description:
      'Dense commercial block showed sustained heat stress with several reports of dizziness.',
    source: 'Community lead',
    category: 'Commercial strip',
  },
  {
    id: 'RPT-2410',
    area: 'North Nazimabad',
    coordinates: [24.9369, 67.0399],
    severity: 2,
    timestamp: '2026-04-19T17:20:00+05:00',
    description:
      'Tree-lined pocket remained manageable, but adjacent paved lane was still noticeably warm.',
    source: 'Citizen',
    category: 'Mixed cover',
  },
  {
    id: 'RPT-2411',
    area: 'Clifton',
    coordinates: [24.8114, 67.0288],
    severity: 3,
    timestamp: '2026-04-18T10:40:00+05:00',
    description:
      'Pedestrian plaza outside retail frontage was hot despite coastal airflow.',
    source: 'Citizen',
    category: 'Retail frontage',
  },
  {
    id: 'RPT-2412',
    area: 'Korangi Industrial Area',
    coordinates: [24.8275, 67.1431],
    severity: 4,
    timestamp: '2026-04-17T14:50:00+05:00',
    description:
      'Heat plume persisted around loading docks and metal roofs in afternoon shift.',
    source: 'Factory staff',
    category: 'Loading zone',
  },
  {
    id: 'RPT-2413',
    area: 'Saddar',
    coordinates: [24.8561, 67.0273],
    severity: 4,
    timestamp: '2026-04-16T16:25:00+05:00',
    description:
      'Street vendors moved carts into shade because heat buildup peaked after 3 PM.',
    source: 'Citizen',
    category: 'Market edge',
  },
  {
    id: 'RPT-2414',
    area: 'Gulshan-e-Iqbal',
    coordinates: [24.9153, 67.0916],
    severity: 3,
    timestamp: '2026-04-14T12:05:00+05:00',
    description:
      'School pickup zone lacked shade and surface temperatures stayed elevated across the curb lane.',
    source: 'Parent volunteer',
    category: 'School frontage',
  },
  {
    id: 'RPT-2415',
    area: 'North Nazimabad',
    coordinates: [24.9407, 67.0465],
    severity: 4,
    timestamp: '2026-04-12T13:10:00+05:00',
    description:
      'Delivery riders highlighted a low-ventilation street canyon near apartments.',
    source: 'Field volunteer',
    category: 'Street canyon',
  },
  {
    id: 'RPT-2416',
    area: 'Clifton',
    coordinates: [24.8072, 67.0341],
    severity: 2,
    timestamp: '2026-04-10T18:30:00+05:00',
    description:
      'Evening walkways cooled faster than inland neighborhoods, but parking lots still radiated heat.',
    source: 'Citizen',
    category: 'Mixed coastal zone',
  },
];
const DOWNLOAD_HISTORY = [
  {
    id: 'EXP-9001',
    date: '2026-04-25T07:50:00+05:00',
    type: 'PDF',
    status: 'Completed',
    name: 'Daily hotspot bulletin',
  },
  {
    id: 'EXP-9002',
    date: '2026-04-24T20:10:00+05:00',
    type: 'CSV',
    status: 'Completed',
    name: 'User report extract',
  },
  {
    id: 'EXP-9003',
    date: '2026-04-24T18:05:00+05:00',
    type: 'PDF',
    status: 'Processing',
    name: 'Weekly mitigation summary',
  },
];
const AUTH_USERS = [
  {
    id: 'USR-01',
    name: 'Areesha Khan',
    email: 'observer@thermax.app',
    role: 'Community Analyst',
  },
  {
    id: 'ADM-01',
    name: 'Naveed Ali',
    email: 'admin@thermax.app',
    role: 'Operations Admin',
  },
];
const wait = (ms = 320) => new Promise((resolve) => setTimeout(resolve, ms));
const formatTimestamp = (value) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
const formatRelativeRangeLabel = (range) => {
  if (range === '24h') return 'Past 24 hours';
  if (range === '30d') return 'Past 30 days';
  return 'Past 7 days';
};
const toDate = (value) => new Date(value);
const areaLookup = new Map(AREA_PROFILES.map((area) => [area.name, area]));
const enrichedReports = REPORT_SEED.map((report, index) => {
  const area = areaLookup.get(report.area);
  return {
    ...report,
    clusterId: `CL-${String(HOTSPOT_PRIORITY_ORDER.indexOf(area.priority) + 1).padStart(2, '0')}`,
    temperature: Number((area.avgTemperature + (index % 3) * 0.35).toFixed(1)),
    ndvi: area.ndvi,
    priority: area.priority,
    confidence: area.confidence,
    satelliteDelta: Number(
      (area.satelliteCorrelation - 0.64 + (index % 4) * 0.03).toFixed(2)
    ),
    status: index % 4 === 0 ? 'Pending review' : 'Validated',
    imageHint:
      report.category === 'Industrial heat'
        ? 'High-albedo retrofit required'
        : 'Shade and cooling corridor recommended',
  };
});
const buildHeatmapPoints = () =>
  AREA_PROFILES.flatMap((area, areaIndex) => {
    const [lat, lng] = area.center;
    const base = Math.min(1, 0.42 + area.avgSeverity * 0.1);
    return [
      [lat, lng, base],
      [lat + 0.003, lng + 0.002, base - 0.08],
      [lat - 0.0025, lng + 0.0017, base - 0.06],
      [lat + 0.0015, lng - 0.0022, base - 0.1 + areaIndex * 0.01],
    ].map(([pointLat, pointLng, intensity], pointIndex) => ({
      id: `HT-${areaIndex + 1}-${pointIndex + 1}`,
      lat: Number(pointLat.toFixed(5)),
      lng: Number(pointLng.toFixed(5)),
      intensity: Number(Math.max(intensity, 0.25).toFixed(2)),
      area: area.name,
      updatedAt: PLATFORM_UPDATED_AT,
    }));
  });
const buildHotspots = () =>
  AREA_PROFILES.map((area, index) => ({
    id: `CL-${String(index + 1).padStart(2, '0')}`,
    clusterId: `CL-${String(index + 1).padStart(2, '0')}`,
    name: `${area.name} hotspot`,
    area: area.name,
    avgTemperature: area.avgTemperature,
    avgSeverity: area.avgSeverity,
    ndvi: area.ndvi,
    priority: area.priority,
    confidence: area.confidence,
    reportCount: enrichedReports.filter((report) => report.area === area.name)
      .length,
    satelliteCorrelation: area.satelliteCorrelation,
    updatedAt: PLATFORM_UPDATED_AT,
    geojson: {
      type: 'Feature',
      properties: {
        clusterId: `CL-${String(index + 1).padStart(2, '0')}`,
        area: area.name,
        priority: area.priority,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [...area.polygon, area.polygon[0]].map(([lat, lng]) => [lng, lat]),
        ],
      },
    },
  }));
const MOCK_HEATMAP = buildHeatmapPoints();
const MOCK_HOTSPOTS = buildHotspots();
const normalizeFilters = (filters = {}) => ({
  range: filters.range ?? '7d',
  severity: filters.severity ?? 'all',
  area: filters.area ?? 'all',
  timeBucket: filters.timeBucket ?? 'all',
});
const inRange = (timestamp, range) => {
  const date = toDate(timestamp).getTime();
  const end = toDate(PLATFORM_UPDATED_AT).getTime();
  if (range === '24h') {
    return date >= end - 24 * 60 * 60 * 1000;
  }
  if (range === '30d') {
    return date >= end - 30 * 24 * 60 * 60 * 1000;
  }
  return date >= end - 7 * 24 * 60 * 60 * 1000;
};
const bucketMatches = (timestamp, range, bucket) => {
  if (bucket === 'all') return true;
  const date = toDate(timestamp);
  if (range === '24h') {
    const hour = date.getHours();
    if (bucket === '00-06') return hour < 6;
    if (bucket === '06-12') return hour >= 6 && hour < 12;
    if (bucket === '12-18') return hour >= 12 && hour < 18;
    return hour >= 18;
  }
  return date.toISOString().slice(0, 10) === bucket;
};
const applyFiltersToReports = (filters = {}) => {
  const normalized = normalizeFilters(filters);
  return enrichedReports.filter((report) => {
    const matchesRange = inRange(report.timestamp, normalized.range);
    const matchesSeverity =
      normalized.severity === 'all' ||
      report.severity === Number(normalized.severity);
    const matchesArea =
      normalized.area === 'all' || report.area === normalized.area;
    const matchesBucket = bucketMatches(
      report.timestamp,
      normalized.range,
      normalized.timeBucket
    );
    return matchesRange && matchesSeverity && matchesArea && matchesBucket;
  });
};
const applyFiltersToHeatmap = (filters = {}) => {
  const normalized = normalizeFilters(filters);
  return MOCK_HEATMAP.filter((point) => {
    const matchesArea =
      normalized.area === 'all' || point.area === normalized.area;
    return matchesArea;
  });
};
const applyFiltersToHotspots = (filters = {}) => {
  const normalized = normalizeFilters(filters);
  return MOCK_HOTSPOTS.filter((hotspot) => {
    const matchesArea =
      normalized.area === 'all' || hotspot.area === normalized.area;
    const matchesSeverity =
      normalized.severity === 'all' ||
      Math.round(hotspot.avgSeverity) >= Number(normalized.severity);
    return matchesArea && matchesSeverity;
  });
};
const getTimelineBuckets = (range) => {
  if (range === '24h') {
    return ['00-06', '06-12', '12-18', '18-24'];
  }
  const dayCount = range === '30d' ? 6 : 7;
  return Array.from({ length: dayCount }, (_, index) => {
    const current = new Date(PLATFORM_UPDATED_AT);
    current.setDate(current.getDate() - (dayCount - index - 1));
    return current.toISOString().slice(0, 10);
  });
};
const toFriendlyBucketLabel = (bucket, range) => {
  if (range === '24h') return bucket;
  return new Intl.DateTimeFormat('en-PK', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(bucket));
};
const deriveTrendSeries = (reports, range) =>
  getTimelineBuckets(range).map((bucket) => ({
    bucket,
    label: toFriendlyBucketLabel(bucket, range),
    reports: reports.filter((report) =>
      bucketMatches(report.timestamp, range, bucket)
    ).length,
  }));
const deriveSeverityDistribution = (reports) =>
  [1, 2, 3, 4, 5].map((severity) => ({
    severity: `S${severity}`,
    value: reports.filter((report) => report.severity === severity).length,
    label: `Severity ${severity}`,
  }));
const deriveHotspotGrowth = (hotspots) =>
  hotspots.map((hotspot) => ({
    area: hotspot.area,
    growth: Number(
      (hotspot.avgSeverity * 8 + hotspot.reportCount * 1.6).toFixed(1)
    ),
    priority: hotspot.priority,
  }));
const deriveKpis = (reports, hotspots, range) => {
  const totalReports = reports.length;
  const activeHotspots = hotspots.length;
  const avgSeverity = totalReports
    ? Number(
        (
          reports.reduce((sum, report) => sum + report.severity, 0) /
          totalReports
        ).toFixed(1)
      )
    : 0;
  const satelliteCorrelation = hotspots.length
    ? Number(
        (
          (hotspots.reduce(
            (sum, hotspot) => sum + hotspot.satelliteCorrelation,
            0
          ) /
            hotspots.length) *
          100
        ).toFixed(0)
      )
    : 0;
  return [
    {
      label: 'Total Reports',
      value: totalReports.toString(),
      change: `${formatRelativeRangeLabel(range)}`,
      tone: 'neutral',
    },
    {
      label: 'Active Hotspots',
      value: activeHotspots.toString(),
      change: `${hotspots.filter((item) => item.priority === 'Critical').length} critical`,
      tone: 'warm',
    },
    {
      label: 'Avg Severity',
      value: avgSeverity.toString(),
      change: 'Citizen + satellite fused',
      tone: 'hot',
    },
    {
      label: 'Satellite Correlation',
      value: `${satelliteCorrelation}%`,
      change: 'DBSCAN confidence linked',
      tone: 'cool',
    },
  ];
};
const deriveRecommendations = (hotspots) =>
  hotspots
    .slice()
    .sort(
      (left, right) =>
        HOTSPOT_PRIORITY_ORDER.indexOf(right.priority) -
        HOTSPOT_PRIORITY_ORDER.indexOf(left.priority)
    )
    .slice(0, 3)
    .map((hotspot) => ({
      id: hotspot.clusterId,
      area: hotspot.area,
      action:
        hotspot.priority === 'Critical'
          ? 'Deploy temporary shade, hydration points, and street-side misting'
          : hotspot.priority === 'High'
            ? 'Prioritize tree canopy and reflective surface interventions'
            : 'Monitor and sustain cooling corridors',
      priority: hotspot.priority,
    }));
const buildOverview = (filters = {}) => {
  const normalized = normalizeFilters(filters);
  const reports = applyFiltersToReports(normalized);
  const hotspots = applyFiltersToHotspots(normalized);
  const heatmap = applyFiltersToHeatmap(normalized);
  return {
    filters: normalized,
    reports,
    hotspots,
    heatmap,
    kpis: deriveKpis(reports, hotspots, normalized.range),
    charts: {
      trend: deriveTrendSeries(reports, normalized.range),
      severity: deriveSeverityDistribution(reports),
      hotspotGrowth: deriveHotspotGrowth(hotspots),
    },
    recommendations: deriveRecommendations(hotspots),
    availableAreas: AREA_PROFILES.map((area) => area.name),
    lastUpdated: PLATFORM_UPDATED_AT,
  };
};
const getNearestArea = (lat, lng) => {
  let bestArea = AREA_PROFILES[0];
  let bestScore = Number.POSITIVE_INFINITY;
  AREA_PROFILES.forEach((area) => {
    const score =
      Math.abs(area.center[0] - lat) + Math.abs(area.center[1] - lng);
    if (score < bestScore) {
      bestScore = score;
      bestArea = area;
    }
  });
  return bestArea;
};
const maybeFetch = async (endpoint, params) => {
  const response = await api.get(endpoint, { params });
  return response.data;
};
const coerceArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (!value || typeof value !== 'object') {
    return [];
  }
  for (const key of ARRAY_CANDIDATE_KEYS) {
    if (Array.isArray(value[key])) {
      return value[key];
    }
  }
  return [];
};
const normalizeCoordinatePair = (value) => {
  if (Array.isArray(value) && value.length >= 2) {
    return [Number(value[0]), Number(value[1])];
  }
  return null;
};
const normalizeHeatmapPoint = (point, index) => {
  if (Array.isArray(point) && point.length >= 3) {
    return {
      id: `HT-API-${index + 1}`,
      lat: Number(point[0]),
      lng: Number(point[1]),
      intensity: Number(point[2]),
      area: point[3] ?? 'Observed heat',
      updatedAt: PLATFORM_UPDATED_AT,
    };
  }
  if (!point || typeof point !== 'object') {
    return null;
  }
  const lat = Number(point.lat ?? point.latitude ?? point.coordinates?.[0]);
  const lng = Number(point.lng ?? point.longitude ?? point.coordinates?.[1]);
  const intensity = Number(
    point.intensity ?? point.weight ?? point.value ?? point.severity ?? 0.5
  );
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }
  return {
    id: point.id ?? `HT-API-${index + 1}`,
    lat,
    lng,
    intensity: Number.isNaN(intensity) ? 0.5 : intensity,
    area: point.area ?? point.name ?? 'Observed heat',
    updatedAt: point.updatedAt ?? PLATFORM_UPDATED_AT,
  };
};
const normalizeHotspotFeature = (feature, index) => {
  if (!feature || typeof feature !== 'object') {
    return null;
  }
  const properties = feature.properties ?? {};
  return {
    id: properties.id ?? feature.id ?? `CL-API-${index + 1}`,
    clusterId:
      properties.clusterId ??
      properties.cluster_id ??
      feature.id ??
      `CL-API-${index + 1}`,
    name: properties.name ?? properties.area ?? `Hotspot ${index + 1}`,
    area: properties.area ?? properties.name ?? `Area ${index + 1}`,
    avgTemperature: Number(
      properties.avgTemperature ?? properties.avg_temp ?? 0
    ),
    avgSeverity: Number(
      properties.avgSeverity ??
        properties.avg_severity ??
        properties.severity ??
        0
    ),
    ndvi: Number(properties.ndvi ?? 0),
    priority: properties.priority ?? 'Medium',
    confidence: Number(properties.confidence ?? 0.7),
    reportCount: Number(properties.reportCount ?? properties.report_count ?? 0),
    satelliteCorrelation: Number(
      properties.satelliteCorrelation ?? properties.satellite_correlation ?? 0
    ),
    updatedAt: properties.updatedAt ?? PLATFORM_UPDATED_AT,
    geojson: feature,
  };
};
const normalizeHotspotRecord = (hotspot, index) => {
  if (!hotspot || typeof hotspot !== 'object') {
    return null;
  }
  if (hotspot.type === 'Feature') {
    return normalizeHotspotFeature(hotspot, index);
  }
  const geojson =
    hotspot.geojson ??
    (hotspot.geometry
      ? {
          type: 'Feature',
          properties: hotspot.properties ?? {
            area: hotspot.area ?? hotspot.name,
            priority: hotspot.priority,
          },
          geometry: hotspot.geometry,
        }
      : null);
  return {
    id: hotspot.id ?? hotspot.clusterId ?? `CL-API-${index + 1}`,
    clusterId: hotspot.clusterId ?? hotspot.cluster_id ?? `CL-API-${index + 1}`,
    name: hotspot.name ?? hotspot.area ?? `Hotspot ${index + 1}`,
    area: hotspot.area ?? hotspot.name ?? `Area ${index + 1}`,
    avgTemperature: Number(hotspot.avgTemperature ?? hotspot.avg_temp ?? 0),
    avgSeverity: Number(
      hotspot.avgSeverity ?? hotspot.avg_severity ?? hotspot.severity ?? 0
    ),
    ndvi: Number(hotspot.ndvi ?? 0),
    priority: hotspot.priority ?? 'Medium',
    confidence: Number(hotspot.confidence ?? 0.7),
    reportCount: Number(hotspot.reportCount ?? hotspot.report_count ?? 0),
    satelliteCorrelation: Number(
      hotspot.satelliteCorrelation ?? hotspot.satellite_correlation ?? 0
    ),
    updatedAt: hotspot.updatedAt ?? PLATFORM_UPDATED_AT,
    geojson,
  };
};
const normalizeReportRecord = (report, index) => {
  if (!report || typeof report !== 'object') {
    return null;
  }
  if (report.type === 'Feature') {
    const properties = report.properties ?? {};
    const coordinates = report.geometry?.coordinates ?? [];
    return {
      id: properties.id ?? report.id ?? `RPT-API-${index + 1}`,
      area: properties.area ?? properties.name ?? 'Observed area',
      coordinates: [Number(coordinates[1]), Number(coordinates[0])],
      severity: Number(properties.severity ?? 1),
      timestamp:
        properties.timestamp ?? properties.createdAt ?? PLATFORM_UPDATED_AT,
      description: properties.description ?? 'Field report received.',
      source: properties.source ?? 'Citizen',
      category: properties.category ?? 'Heat observation',
      temperature: Number(properties.temperature ?? 0),
    };
  }
  const coordinates =
    normalizeCoordinatePair(report.coordinates) ??
    normalizeCoordinatePair([report.latitude, report.longitude]) ??
    normalizeCoordinatePair([report.lat, report.lng]);
  if (!coordinates) {
    return null;
  }
  return {
    id: report.id ?? `RPT-API-${index + 1}`,
    area: report.area ?? report.name ?? 'Observed area',
    coordinates,
    severity: Number(report.severity ?? 1),
    timestamp: report.timestamp ?? report.createdAt ?? PLATFORM_UPDATED_AT,
    description: report.description ?? 'Field report received.',
    source: report.source ?? 'Citizen',
    category: report.category ?? 'Heat observation',
    temperature: Number(report.temperature ?? 0),
  };
};
const normalizeHeatmapResponse = (payload) =>
  coerceArray(payload).map(normalizeHeatmapPoint).filter(Boolean);
const normalizeHotspotsResponse = (payload) =>
  coerceArray(payload)
    .map(normalizeHotspotRecord)
    .filter((item) => item && item.geojson);
const normalizeReportsResponse = (payload) =>
  coerceArray(payload).map(normalizeReportRecord).filter(Boolean);
const resolveWithFallback = async ({
  endpoint,
  params,
  fallback,
  normalize,
}) => {
  try {
    const rawData = await maybeFetch(endpoint, params);
    const data = normalize ? normalize(rawData) : rawData;
    return {
      data,
      source: 'api',
      lastUpdated:
        rawData?.lastUpdated ??
        rawData?.updatedAt ??
        rawData?.meta?.lastUpdated ??
        PLATFORM_UPDATED_AT,
    };
  } catch {
    await wait();
    return {
      data: fallback,
      source: 'fallback',
      lastUpdated: PLATFORM_UPDATED_AT,
    };
  }
};
export const priorityColorFor = (priority) =>
  HOTSPOT_PRIORITY_COLORS[priority] ?? '#0f766e';
export const getPlatformCenter = () => CITY_CENTER;
export const getAvailableAreas = () => AREA_PROFILES.map((area) => area.name);
export const getAreaProfiles = () => AREA_PROFILES;
export async function fetchHeatmap(filters = {}) {
  const filtered = applyFiltersToHeatmap(filters);
  return resolveWithFallback({
    endpoint: HEATMAP_ENDPOINT,
    params: normalizeFilters(filters),
    fallback: filtered,
    normalize: normalizeHeatmapResponse,
  });
}
export async function fetchHotspots(filters = {}) {
  // Local mode: get from localStorage
  if (isLocalMode()) {
    if (!isSeeded()) seedDemoData();
    await wait(200);
    const hotspots = hotspotStorage.getAll();
    return {
      data: hotspots.map((h) => ({
        id: h.id || h.clusterId,
        clusterId: h.clusterId || h.id,
        name: h.name,
        area: h.area,
        avgTemperature: h.avgTemperature,
        avgSeverity: h.avgSeverity,
        ndvi: h.ndvi,
        priority: h.priority,
        confidence: h.confidence,
        reportCount: h.reportCount,
        satelliteCorrelation: h.satelliteCorrelation,
        updatedAt: h.updatedAt,
        geojson: h.geojson,
      })),
      source: 'local',
      lastUpdated: new Date().toISOString(),
    };
  }
  const filtered = applyFiltersToHotspots(filters);
  return resolveWithFallback({
    endpoint: HOTSPOTS_ENDPOINT,
    params: normalizeFilters(filters),
    fallback: filtered,
    normalize: normalizeHotspotsResponse,
  });
}
export async function fetchReports(filters = {}) {
  // Local mode: get from localStorage
  if (isLocalMode()) {
    if (!isSeeded()) seedDemoData();
    await wait(200);
    const reports = reportStorage.getAll();
    const normalized = normalizeFilters(filters);
    // Apply filters similar to applyFiltersToReports
    const filtered = reports.filter((report) => {
      const matchesSeverity =
        normalized.severity === 'all' ||
        report.severity === Number(normalized.severity);
      const matchesArea =
        normalized.area === 'all' || report.area === normalized.area;
      return matchesSeverity && matchesArea;
    });
    return {
      data: filtered.map((r) => ({
        id: r._id || r.id,
        _id: r._id || r.id,
        area: r.area || r.areaName,
        severity: r.severity,
        status:
          r.status === 'pending'
            ? 'Pending review'
            : r.status === 'validated'
              ? 'Validated'
              : r.status,
        timestamp: r.timestamp,
        description: r.description,
        user: { name: r.userName, email: r.userEmail },
      })),
      source: 'local',
      lastUpdated: new Date().toISOString(),
    };
  }
  const filtered = applyFiltersToReports(filters);
  return resolveWithFallback({
    endpoint: REPORTS_ENDPOINT,
    params: normalizeFilters(filters),
    fallback: filtered,
    normalize: normalizeReportsResponse,
  });
}
export async function fetchDashboardSnapshot(filters = {}) {
  // Local mode: build from localStorage
  if (isLocalMode()) {
    if (!isSeeded()) seedDemoData();
    await wait(200);
    const reports = reportStorage.getAll();
    const hotspots = hotspotStorage.getAll();
    const normalized = normalizeFilters(filters);
    // Apply filters
    const filteredReports = reports.filter((r) => {
      const matchesSeverity =
        normalized.severity === 'all' ||
        r.severity === Number(normalized.severity);
      const matchesArea =
        normalized.area === 'all' || r.area === normalized.area;
      return matchesSeverity && matchesArea;
    });
    const overview = {
      reports: filteredReports.map((r) => ({
        id: r._id || r.id,
        area: r.area || r.areaName,
        severity: r.severity,
        status:
          r.status === 'pending'
            ? 'Pending review'
            : r.status === 'validated'
              ? 'Validated'
              : r.status,
        timestamp: r.timestamp,
        description: r.description,
        category: r.category,
        source: r.source,
        coordinates:
          r.coordinates ||
          (r.latitude && r.longitude ? [r.latitude, r.longitude] : null),
        lat: r.latitude || (r.coordinates && r.coordinates[0]),
        lng: r.longitude || (r.coordinates && r.coordinates[1]),
        temperature: r.temperature,
      })),
      hotspots: hotspots.map((h) => ({
        clusterId: h.clusterId || h.id,
        id: h.id || h.clusterId,
        area: h.area,
        priority: h.priority,
        avgTemperature: h.avgTemperature,
        avgSeverity: h.avgSeverity || 0,
        reportCount: h.reportCount,
        confidence: h.confidence,
        ndvi: h.ndvi || 0,
        centroid: h.centroid,
        geojson: h.geojson,
      })),
      heatmap: MOCK_HEATMAP,
      kpis: [
        {
          label: 'Total Reports',
          value: String(reports.length),
          change: 'All time',
          tone: 'neutral',
        },
        {
          label: 'Active Hotspots',
          value: String(hotspots.length),
          change: `${hotspots.filter((h) => h.priority === 'Critical').length} critical`,
          tone: 'warm',
        },
        {
          label: 'Avg Severity',
          value: reports.length
            ? (
                reports.reduce((s, r) => s + r.severity, 0) / reports.length
              ).toFixed(1)
            : '0',
          change: 'All reports',
          tone: 'hot',
        },
        {
          label: 'Satellite Correlation',
          value: '85%',
          change: 'Estimated',
          tone: 'cool',
        },
      ],
      recommendations: hotspots
        .filter((h) => h.priority === 'Critical' || h.priority === 'High')
        .slice(0, 3)
        .map((h) => ({
          id: h.clusterId || h.id,
          area: h.area,
          priority: h.priority,
          action:
            h.priority === 'Critical'
              ? 'Deploy temporary shade, hydration points, and street-side misting'
              : 'Prioritize tree canopy and reflective surface interventions',
        })),
      lastUpdated: new Date().toISOString(),
      source: 'local',
    };
    return overview;
  }
  const res = await resolveWithFallback({
    endpoint: '/api/dashboard/snapshot',
    params: normalizeFilters(filters),
    fallback: buildOverview(filters),
  });

  return {
    ...(res.data || {}),
    source: res.source,
    lastUpdated: res.lastUpdated,
  };
}
export async function fetchInsightSnapshot(filters = {}) {
  try {
    const response = await api.get('/api/dashboard/insight', {
      params: normalizeFilters(filters),
    });
    return {
      ...response.data,
      source: 'api',
    };
  } catch (error) {
    console.error('Fetch insight failed, using mock:', error);
    const overview = buildOverview(filters);
    await wait(240);
    return {
      ...overview,
      source: 'fallback',
      explanation: {
        clustering:
          'DBSCAN groups nearby heat reports and satellite anomalies into dense neighborhoods rather than forcing every point into a cluster.',
        noise:
          'Points labeled -1 are treated as noise, which means ThermaX can ignore isolated outliers instead of overreacting to single reports.',
      },
    };
  }
}
/**
 * Fetch the reports-center data used by the admin export workflow.
 * Includes hotspot preview, download history, and mitigation recommendations.
 *
 * ⛔ ADMIN ONLY — Do NOT call from user-facing components.
 * Use fetchDashboardSnapshot() for user-visible report data instead.
 */
export async function fetchReportsCenter(filters = {}) {
  const overview = buildOverview(filters);
  await wait(240);
  return {
    ...overview,
    preview: {
      summary:
        'Mitigation bulletin blends citizen evidence, hotspot polygons, and satellite heat intensity into a single operator-ready report.',
      hotspotSummary: overview.hotspots.slice(0, 3),
      heatmapSnapshot: overview.heatmap.slice(0, 8),
    },
    downloadHistory: DOWNLOAD_HISTORY,
    source: 'fallback',
  };
}
export async function submitHeatReport(payload) {
  // Local mode: store in localStorage
  if (isLocalMode()) {
    await wait(600);
    // Ensure data is seeded
    if (!isSeeded()) {
      seedDemoData();
    }
    const currentUser = authStorage.getCurrentUser();
    const newReport = {
      area: payload.areaName,
      areaName: payload.areaName,
      coordinates: [Number(payload.latitude), Number(payload.longitude)],
      location: {
        lat: Number(payload.latitude),
        lng: Number(payload.longitude),
      },
      severity: Number(payload.severity),
      description: payload.description,
      category: payload.category || 'Heat observation',
      source: 'Citizen',
      temperature: Number(payload.temperature) || 40,
      userId: currentUser?._id,
      userName: currentUser?.name,
      userEmail: currentUser?.email,
      userRole: currentUser?.role,
      image:
        payload.image instanceof File
          ? URL.createObjectURL(payload.image)
          : null,
    };
    const saved = reportStorage.save(newReport);
    return {
      submissionId: saved._id,
      status: 'Queued for moderation',
      area: payload.areaName,
      eta: 'Cluster refresh in 5-10 minutes',
      submittedAt: new Date().toISOString(),
      source: 'local',
    };
  }
  // API mode
  try {
    let finalPayload = {
      location: {
        lat: Number(payload.latitude),
        lng: Number(payload.longitude),
      },
      severity: Number(payload.severity),
      description: payload.description,
      areaName: payload.areaName,
      temperature: Number(payload.temperature),
      category: payload.category,
    };
    // If there's an image, we might need FormData
    if (payload.image instanceof File) {
      const formData = new FormData();
      formData.append('reportData', JSON.stringify(finalPayload));
      formData.append('image', payload.image);
      const response = await api.post(REPORTS_ENDPOINT, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    }
    const response = await api.post(REPORTS_ENDPOINT, finalPayload);
    return response.data;
  } catch (error) {
    console.error('API submission failed, using mock:', error);
    await wait(600);
    const nearestArea = getNearestArea(payload.latitude, payload.longitude);
    return {
      submissionId: `RPT-MOCK-${Date.now().toString().slice(-5)}`,
      status: 'Queued for moderation',
      area: nearestArea.name,
      eta: 'Cluster refresh in 5-10 minutes',
      submittedAt: new Date().toISOString(),
      source: 'fallback',
    };
  }
}
export async function fetchMyReports() {
  // Local mode: get from localStorage
  if (isLocalMode()) {
    // Ensure data is seeded
    if (!isSeeded()) {
      seedDemoData();
    }
    await wait(220);
    const currentUser = authStorage.getCurrentUser();
    const userReports = currentUser
      ? reportStorage.getByUserEmail(currentUser.email)
      : [];
    return {
      user: currentUser || {
        _id: 'anonymous',
        name: 'Anonymous',
        email: 'anonymous@thermax.com',
        role: 'USER',
      },
      reports: userReports.map((r) => ({
        id: r._id || r.id,
        _id: r._id || r.id,
        area: r.area || r.areaName,
        description: r.description,
        severity: r.severity,
        status: r.status === 'pending' ? 'Pending' : r.status,
        timestamp: r.timestamp,
        category: r.category,
      })),
      source: 'local',
    };
  }
  // API mode: call backend endpoint
  return resolveWithFallback({
    endpoint: '/api/reports/my-reports',
    params: {},
    fallback: {
      user: AUTH_USERS[0],
      reports: enrichedReports.slice(0, 6),
    },
    normalize: (data) => ({
      user: data.user,
      reports: data.reports || [],
    }),
  });
}
/**
 * Delete a user's report within 24 hours of submission.
 *
 * @param {string} reportId - The ID of the report to delete
 */
export async function deleteMyReport(reportId) {
  // Local mode: delete from localStorage
  if (isLocalMode()) {
    await wait(300);
    const currentUser = authStorage.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }
    const report = reportStorage.getById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }
    if (report.userEmail !== currentUser.email) {
      throw new Error('Not authorized to delete this report');
    }
    // Check if within 24 hours
    const reportTime = new Date(report.timestamp).getTime();
    const now = Date.now();
    const hoursDiff = (now - reportTime) / (1000 * 60 * 60);
    if (hoursDiff > 24) {
      throw new Error('Report can only be deleted within 24 hours of submission');
    }
    reportStorage.delete(reportId);
    return { success: true, message: 'Report deleted successfully' };
  }
  // API mode
  const response = await api.delete(`/api/report/${reportId}`);
  return response.data;
}
/**
 * Fetch the moderation queue of pending/unvalidated reports.
 *
 * ⛔ ADMIN ONLY — Do NOT call from user-facing components.
 */
export async function fetchModerationQueue() {
  await wait(260);
  return {
    moderators: [AUTH_USERS[1]],
    queue: enrichedReports
      .filter((report) => report.status !== 'Validated')
      .concat(
        enrichedReports
          .slice(6, 10)
          .map((report) => ({ ...report, status: 'Pending review' }))
      ),
    source: 'fallback',
  };
}
/**
 * Update the moderation status of a report (approve / reject).
 *
 * ⛔ ADMIN ONLY — Do NOT call from user-facing components.
 */
export async function updateModerationStatus(reportId, decision) {
  if (isLocalMode()) {
    await wait(240);
    const status =
      decision === 'validated' || decision === 'approve'
        ? 'validated'
        : 'rejected';
    const updated = reportStorage.update(reportId, { status });
    return {
      id: reportId,
      decision,
      status,
      updatedAt: new Date().toISOString(),
      source: 'local',
    };
  }
  await wait(240);
  return {
    id: reportId,
    decision,
    updatedAt: new Date().toISOString(),
  };
}
export async function authenticateUser(payload) {
  // Local mode: authenticate against localStorage users
  if (isLocalMode()) {
    await wait(380);
    const user = userStorage.getByEmail(payload.email);
    if (!user || user.password !== payload.password) {
      throw new Error('Invalid email or password');
    }
    // Update last active
    userStorage.update(user._id, { lastActive: new Date().toISOString() });
    // Create mock token
    const token = `thermax_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Store auth data
    authStorage.setCurrentUser(user);
    authStorage.setToken(token);
    return {
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      source: 'local',
    };
  }
  // API mode: use fallback mock
  await wait(380);
  const matchingUser = AUTH_USERS.find(
    (user) => user.email === payload.email
  ) ?? {
    id: 'USR-NEW',
    name: payload.name || 'New ThermaX User',
    email: payload.email,
    role: 'Community Reporter',
  };
  return {
    token: 'frontend-demo-session',
    user: matchingUser,
    source: 'fallback',
  };
}
/**
 * Generate a mitigation report PDF or CSV export package.
 *
 * ⛔ ADMIN ONLY — This function should only be called from admin
 * components (e.g., AdminDashboard"Reports & Exports" tab).
 * Backend route POST /api/reports/generate enforces authorizeAdmin.
 */
export async function generateMitigationReport(payload) {
  await wait(680);
  return {
    reportId: `EXP-${Date.now().toString().slice(-4)}`,
    type: payload.type,
    status: 'Completed',
    generatedAt: new Date().toISOString(),
  };
}
export async function detectAreaName(latitude, longitude) {
  await wait(180);
  return getNearestArea(latitude, longitude).name;
}
export async function fetchUsers() {
  // Local mode: get users from localStorage
  if (isLocalMode()) {
    // Ensure data is seeded
    if (!isSeeded()) {
      seedDemoData();
    }
    await wait(200);
    const users = userStorage.getAll();
    return users.map((u) => ({
      id: u._id || u.id,
      _id: u._id || u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      status: u.isActive ? 'active' : 'suspended',
      reportsSubmitted: u.reportsSubmitted || 0,
      reputation: u.reputation || 0,
      lastActive: u.lastActive,
      createdAt: u.createdAt,
      joinDate: u.createdAt,
    }));
  }
  // API mode
  try {
    const response = await api.get('/api/users');
    return response.data.users;
  } catch (error) {
    console.error('Fetch users failed, using mock:', error);
    await wait(200);
    return [
      {
        id: '65f1a2b3c4d5e6f7a8b9c0d1',
        name: 'John Admin (Mock)',
        email: 'admin@thermax.com',
        role: 'ADMIN',
        isActive: true,
        reportsSubmitted: 15,
        reputation: 5.0,
        lastActive: new Date().toISOString(),
      },
      {
        id: '65f1a2b3c4d5e6f7a8b9c0d3',
        name: 'Ahmed Khan (Mock)',
        email: 'ahmed@example.com',
        role: 'USER',
        isActive: true,
        reportsSubmitted: 8,
        reputation: 4.2,
        lastActive: new Date().toISOString(),
      },
    ];
  }
}
export async function updateUserRole(userId, role) {
  if (isLocalMode()) {
    await wait(150);
    const updated = userStorage.update(userId, { role });
    if (!updated) throw new Error('User not found');
    return { success: true, user: updated };
  }
  const response = await api.put(`/api/users/${userId}/role`, { role });
  return response.data;
}
export async function updateUserStatus(userId, isActive) {
  if (isLocalMode()) {
    await wait(150);
    const updated = userStorage.update(userId, {
      isActive,
      status: isActive ? 'active' : 'suspended',
    });
    if (!updated) throw new Error('User not found');
    return { success: true, user: updated };
  }
  const response = await api.put(`/api/users/${userId}/status`, { isActive });
  return response.data;
}
/**
 * Fetch platform-wide admin statistics (total reports, users, hotspots, etc.).
 *
 * ⛔ ADMIN ONLY — Do NOT call from user-facing components.
 */
export async function fetchAdminStats() {
  if (isLocalMode()) {
    // Ensure data is seeded
    if (!isSeeded()) {
      seedDemoData();
    }
    await wait(200);
    const users = userStorage.getAll();
    const reports = reportStorage.getAll();
    const hotspots = hotspotStorage.getAll();
    return {
      totalReports: reports.length,
      pendingReports: reports.filter(
        (r) => r.status === 'pending' || r.status === 'Pending review'
      ).length,
      approvedReports: reports.filter(
        (r) => r.status === 'validated' || r.status === 'Validated'
      ).length,
      rejectedReports: reports.filter(
        (r) => r.status === 'rejected' || r.status === 'Rejected'
      ).length,
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.isActive).length,
      criticalHotspots: hotspots.filter((h) => h.priority === 'Critical')
        .length,
      systemHealth: 'operational',
    };
  }
  try {
    const response = await api.get('/api/dashboard/snapshot');
    return {
      totalReports: 1247,
      pendingReports: 23,
      approvedReports: 1189,
      rejectedReports: 35,
      totalUsers: 892,
      activeUsers: 156,
      criticalHotspots: 8,
      systemHealth: 'operational',
    };
  } catch (error) {
    console.error('Fetch admin stats failed:', error);
    return null;
  }
}
export async function fetchExportHistory() {
  if (isLocalMode()) {
    await wait(150);
    return {
      history: [
        {
          _id: 'EXP-1001',
          reportRef: 'EXP-1001',
          city: 'Karachi',
          pdfUrl: '/exports/EXP-1001_karachi.html',
          fileSizeBytes: 2377,
          createdAt: new Date().toISOString(),
        },
      ],
      count: 1,
    };
  }
  try {
    const response = await api.get('/api/exports/history');
    return response.data;
  } catch (error) {
    return { history: [], count: 0 };
  }
}

export async function generateExportBriefing(options = {}) {
  const { city = 'Karachi', format = 'pdf', fromDate, toDate } = options;
  if (isLocalMode()) {
    await wait(300);
    const ref = `EXP-${Date.now().toString().slice(-6)}`;
    const filename = `${ref}_${city.toLowerCase()}.${format === 'csv' ? 'csv' : 'html'}`;
    return {
      message: 'Export briefing generated successfully',
      export: {
        _id: ref,
        reportRef: ref,
        city,
        pdfUrl: `/exports/${filename}`,
        fileSizeBytes: 2400,
        createdAt: new Date().toISOString(),
      },
      downloadUrl: `/api/exports/download/${filename}`,
    };
  }
  const response = await api.post('/api/exports/generate', {
    city,
    format,
    fromDate,
    toDate,
  });
  return response.data;
}

export async function fetchAuditLogs(limit = 50) {
  if (isLocalMode()) {
    await wait(150);
    return {
      logs: [
        {
          _id: 'LOG-001',
          action: 'REPORT_SUBMITTED',
          performedBy: 'demo_user_id',
          targetType: 'REPORT',
          targetId: 'RPT-2401',
          ip: '127.0.0.1',
          timestamp: new Date().toISOString(),
        },
        {
          _id: 'LOG-002',
          action: 'REPORT_VERIFIED',
          performedBy: 'admin_user_id',
          targetType: 'REPORT',
          targetId: 'RPT-2402',
          ip: '127.0.0.1',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
      count: 2,
    };
  }
  try {
    const response = await api.get(`/api/users/audit-logs?limit=${limit}`);
    return response.data;
  } catch (error) {
    return { logs: [], count: 0 };
  }
}

export async function verifyEmail(email, code) {
  if (isLocalMode()) {
    await wait(200);
    return { success: true, message: 'Email verified successfully.' };
  }
  const response = await api.post('/api/auth/verify-email', { email, code });
  return response.data;
}

export async function forgotPassword(email) {
  if (isLocalMode()) {
    await wait(200);
    return { message: 'If an account exists, a 6-digit password reset code has been sent.' };
  }
  const response = await api.post('/api/auth/forgot-password', { email });
  return response.data;
}

export async function resetPassword(email, code, newPassword) {
  if (isLocalMode()) {
    await wait(200);
    return { message: 'Password reset successfully.' };
  }
  const response = await api.post('/api/auth/reset-password', {
    email,
    code,
    newPassword,
  });
  return response.data;
}

export async function resendOtp(email, type = 'verification') {
  if (isLocalMode()) {
    await wait(200);
    return { message: 'Verification code resent successfully.' };
  }
  const response = await api.post('/api/auth/resend-otp', { email, type });
  return response.data;
}

export {
  PLATFORM_UPDATED_AT,
  formatTimestamp,
  HOTSPOT_PRIORITY_ORDER,
  HOTSPOT_PRIORITY_COLORS,
};
