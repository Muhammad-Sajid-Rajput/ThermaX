/**
 * Seed Data Generator for ThermaX Demo Mode
 */
import { storage, userStorage, reportStorage, hotspotStorage, isSeeded, setSeeded } from './localStorageService';
import { DEMO_CREDENTIALS } from './config';

export const INITIAL_USERS = [
  {
    _id: 'usr_admin_001',
    name: DEMO_CREDENTIALS.ADMIN.name,
    email: DEMO_CREDENTIALS.ADMIN.email,
    role: DEMO_CREDENTIALS.ADMIN.role,
    isActive: true,
    reportsSubmitted: 14,
    reputation: 98,
    createdAt: '2024-01-15T08:00:00.000Z',
    lastActive: new Date().toISOString(),
  },
  {
    _id: 'usr_demo_002',
    name: DEMO_CREDENTIALS.USER.name,
    email: DEMO_CREDENTIALS.USER.email,
    role: DEMO_CREDENTIALS.USER.role,
    isActive: true,
    reportsSubmitted: 6,
    reputation: 85,
    createdAt: '2024-02-01T10:30:00.000Z',
    lastActive: new Date().toISOString(),
  },
];

export const INITIAL_REPORTS = [
  {
    _id: 'rpt_001',
    userId: 'usr_admin_001',
    userEmail: 'admin@thermax.com',
    area: 'Saddar',
    areaName: 'Saddar Commercial Hub',
    severity: 5,
    temperature: 42.5,
    ambientTemp: 38.0,
    surfaceTemp: 47.0,
    humidity: 65,
    latitude: 24.8532,
    longitude: 67.0284,
    coordinates: [24.8532, 67.0284],
    status: 'validated',
    description: 'Extreme heat trapped in dense concrete commercial area with high traffic density.',
    category: 'Urban Heat Island',
    source: 'Citizen Report',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    _id: 'rpt_002',
    userId: 'usr_demo_002',
    userEmail: 'demo@thermax.com',
    area: 'Korangi Industrial Area',
    areaName: 'Korangi Industrial Zone',
    severity: 4,
    temperature: 40.8,
    ambientTemp: 37.2,
    surfaceTemp: 44.4,
    humidity: 58,
    latitude: 24.8301,
    longitude: 67.1395,
    coordinates: [24.8301, 67.1395],
    status: 'validated',
    description: 'High industrial emissions and dark asphalt roofs absorbing thermal energy.',
    category: 'Industrial Emissions',
    source: 'Sensor Node',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    _id: 'rpt_003',
    userId: 'usr_admin_001',
    userEmail: 'admin@thermax.com',
    area: 'Lyari',
    areaName: 'Lyari High-Density Quarter',
    severity: 4,
    temperature: 41.2,
    ambientTemp: 37.5,
    surfaceTemp: 45.0,
    humidity: 62,
    latitude: 24.8667,
    longitude: 66.9917,
    coordinates: [24.8667, 66.9917],
    status: 'pending',
    description: 'Narrow corridors with zero vegetation causing extreme trapped radiant heat.',
    category: 'Lack of Vegetation',
    source: 'Field Analyst',
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

export const INITIAL_HOTSPOTS = [
  {
    id: 'cl_001',
    clusterId: 'cl_001',
    area: 'Saddar',
    priority: 'Critical',
    avgTemperature: 41.8,
    avgSeverity: 4.5,
    reportCount: 18,
    confidence: 0.94,
    ndvi: 0.18,
    centroid: [24.8532, 67.0284],
    geojson: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [67.0224, 24.8582],
            [67.0348, 24.8582],
            [67.0348, 24.8482],
            [67.0224, 24.8482],
            [67.0224, 24.8582],
          ],
        ],
      },
    },
  },
  {
    id: 'cl_002',
    clusterId: 'cl_002',
    area: 'Korangi Industrial Area',
    priority: 'High',
    avgTemperature: 40.5,
    avgSeverity: 4.0,
    reportCount: 12,
    confidence: 0.88,
    ndvi: 0.22,
    centroid: [24.8301, 67.1395],
    geojson: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [67.1325, 24.8356],
            [67.1465, 24.8356],
            [67.1465, 24.8247],
            [67.1325, 24.8247],
            [67.1325, 24.8356],
          ],
        ],
      },
    },
  },
];

export const seedDemoData = () => {
  if (isSeeded()) return;

  INITIAL_USERS.forEach((u) => userStorage.save(u));
  INITIAL_REPORTS.forEach((r) => reportStorage.save(r));
  hotspotStorage.saveAll(INITIAL_HOTSPOTS);

  setSeeded();
};
