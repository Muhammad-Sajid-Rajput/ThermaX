/**
 * Demo Data Seeder
 * Seeds initial data into localStorage for local demo mode
 */
import { DEMO_CREDENTIALS } from './config';
import {
  userStorage,
  reportStorage,
  hotspotStorage,
  analyticsStorage,
  setSeeded,
} from './localStorageService';
// Demo Users
const seedUsers = () => {
  const admin = {
    _id: 'usr_admin_001',
    name: DEMO_CREDENTIALS.ADMIN.name,
    email: DEMO_CREDENTIALS.ADMIN.email,
    password: DEMO_CREDENTIALS.ADMIN.password,
    role: 'ADMIN',
    isActive: true,
    createdAt: '2026-01-15T08:00:00+05:00',
    lastActive: new Date().toISOString(),
    reportsSubmitted: 0,
    reputation: 5.0,
    verified: true,
  };
  const demoUser = {
    _id: 'usr_demo_001',
    name: DEMO_CREDENTIALS.USER.name,
    email: DEMO_CREDENTIALS.USER.email,
    password: DEMO_CREDENTIALS.USER.password,
    role: 'USER',
    isActive: true,
    createdAt: '2026-02-20T10:30:00+05:00',
    lastActive: new Date().toISOString(),
    reportsSubmitted: 3,
    reputation: 4.2,
    verified: false,
  };
  const additionalUsers = [
    {
      _id: 'usr_002',
      name: 'Ahmed Khan',
      email: 'ahmed@example.com',
      password: 'password123',
      role: 'USER',
      isActive: true,
      createdAt: '2026-03-10T14:20:00+05:00',
      lastActive: '2026-04-28T09:15:00+05:00',
      reportsSubmitted: 5,
      reputation: 4.5,
      verified: true,
    },
    {
      _id: 'usr_003',
      name: 'Fatima Ali',
      email: 'fatima@example.com',
      password: 'password123',
      role: 'USER',
      isActive: true,
      createdAt: '2026-03-15T11:45:00+05:00',
      lastActive: '2026-04-29T16:30:00+05:00',
      reportsSubmitted: 2,
      reputation: 3.8,
      verified: false,
    },
    {
      _id: 'usr_004',
      name: 'Bilal Hassan',
      email: 'bilal@example.com',
      password: 'password123',
      role: 'USER',
      isActive: false,
      createdAt: '2026-03-20T09:00:00+05:00',
      lastActive: '2026-03-25T12:00:00+05:00',
      reportsSubmitted: 1,
      reputation: 2.5,
      verified: false,
    },
  ];
  [admin, demoUser, ...additionalUsers].forEach((user) =>
    userStorage.save(user)
  );
  return [admin, demoUser, ...additionalUsers];
};
// Demo Reports
const seedReports = (users) => {
  const baseDate = new Date();
  const reports = [
    {
      _id: 'rpt_001',
      area: 'Saddar',
      areaName: 'Saddar',
      coordinates: [24.8528, 67.0296],
      location: { lat: 24.8528, lng: 67.0296 },
      severity: 5,
      temperature: 42.3,
      description:
        'Roadside pavement is radiating intense heat and pedestrians are sheltering under shop shutters.',
      source: 'Citizen',
      category: 'Built-up canyon',
      status: 'validated',
      userId: users[1]._id,
      userName: users[1].name,
      userEmail: users[1].email,
      userRole: users[1].role,
      timestamp: new Date(
        baseDate.getTime() - 2 * 24 * 60 * 60 * 1000
      ).toISOString(),
      image: null,
    },
    {
      _id: 'rpt_002',
      area: 'Korangi',
      areaName: 'Korangi Industrial Area',
      coordinates: [24.8298, 67.1412],
      location: { lat: 24.8298, lng: 67.1412 },
      severity: 4,
      temperature: 40.8,
      description:
        'Industrial sheds and asphalt yards stayed hot into the evening; workers requested water points.',
      source: 'Factory staff',
      category: 'Industrial heat',
      status: 'validated',
      userId: users[2]._id,
      userName: users[2].name,
      userEmail: users[2].email,
      userRole: users[2].role,
      timestamp: new Date(
        baseDate.getTime() - 3 * 24 * 60 * 60 * 1000
      ).toISOString(),
      image: null,
    },
    {
      _id: 'rpt_003',
      area: 'Gulshan',
      areaName: 'Gulshan-e-Iqbal',
      coordinates: [24.9176, 67.0939],
      location: { lat: 24.9176, lng: 67.0939 },
      severity: 3,
      temperature: 39.6,
      description:
        'Playground edge near block market felt hotter than nearby shaded street.',
      source: 'Community lead',
      category: 'Open ground',
      status: 'pending',
      userId: users[1]._id,
      userName: users[1].name,
      userEmail: users[1].email,
      userRole: users[1].role,
      timestamp: new Date(
        baseDate.getTime() - 1 * 24 * 60 * 60 * 1000
      ).toISOString(),
      image: null,
    },
    {
      _id: 'rpt_004',
      area: 'North Nazimabad',
      areaName: 'North Nazimabad',
      coordinates: [24.9398, 67.0431],
      location: { lat: 24.9398, lng: 67.0431 },
      severity: 4,
      temperature: 41.2,
      description:
        'Delivery riders highlighted a low-ventilation street canyon near apartments.',
      source: 'Field volunteer',
      category: 'Street canyon',
      status: 'validated',
      userId: users[3]._id,
      userName: users[3].name,
      userEmail: users[3].email,
      userRole: users[3].role,
      timestamp: new Date(
        baseDate.getTime() - 4 * 24 * 60 * 60 * 1000
      ).toISOString(),
      image: null,
    },
    {
      _id: 'rpt_005',
      area: 'Clifton',
      areaName: 'Clifton',
      coordinates: [24.8094, 67.0317],
      location: { lat: 24.8094, lng: 67.0317 },
      severity: 2,
      temperature: 37.8,
      description:
        'Seafront breeze lowered discomfort, but the parking apron still produced localized hotspots.',
      source: 'Citizen',
      category: 'Parking apron',
      status: 'validated',
      userId: users[1]._id,
      userName: users[1].name,
      userEmail: users[1].email,
      userRole: users[1].role,
      timestamp: new Date(
        baseDate.getTime() - 5 * 24 * 60 * 60 * 1000
      ).toISOString(),
      image: null,
    },
    {
      _id: 'rpt_006',
      area: 'Saddar',
      areaName: 'Saddar',
      coordinates: [24.8547, 67.0254],
      location: { lat: 24.8547, lng: 67.0254 },
      severity: 4,
      temperature: 41.5,
      description:
        'Bus stop queue reported strong radiant heat after sunrise with little tree cover.',
      source: 'Field volunteer',
      category: 'Transit exposure',
      status: 'pending',
      userId: users[2]._id,
      userName: users[2].name,
      userEmail: users[2].email,
      userRole: users[2].role,
      timestamp: new Date(
        baseDate.getTime() - 6 * 24 * 60 * 60 * 1000
      ).toISOString(),
      image: null,
    },
    {
      _id: 'rpt_007',
      area: 'Korangi',
      areaName: 'Korangi Industrial Area',
      coordinates: [24.8324, 67.1378],
      location: { lat: 24.8324, lng: 67.1378 },
      severity: 5,
      temperature: 43.1,
      description:
        'Shift change crowd reported overheating near warehouse roofs with no shaded waiting zone.',
      source: 'Field volunteer',
      category: 'Worker exposure',
      status: 'validated',
      userId: users[0]._id,
      userName: users[0].name,
      userEmail: users[0].email,
      userRole: users[0].role,
      timestamp: new Date(
        baseDate.getTime() - 2 * 24 * 60 * 60 * 1000
      ).toISOString(),
      image: null,
    },
    {
      _id: 'rpt_008',
      area: 'Gulshan',
      areaName: 'Gulshan-e-Iqbal',
      coordinates: [24.9191, 67.0987],
      location: { lat: 24.9191, lng: 67.0987 },
      severity: 4,
      temperature: 40.5,
      description:
        'Pedestrian bridge deck felt significantly hotter than nearby service road.',
      source: 'Citizen',
      category: 'Concrete bridge',
      status: 'pending',
      userId: users[3]._id,
      userName: users[3].name,
      userEmail: users[3].email,
      userRole: users[3].role,
      timestamp: new Date(
        baseDate.getTime() - 1 * 24 * 60 * 60 * 1000
      ).toISOString(),
      image: null,
    },
  ];
  reports.forEach((report) => reportStorage.save(report));
  return reports;
};
// Demo Hotspots
const seedHotspots = () => {
  const hotspots = [
    {
      id: 'cl_01',
      clusterId: 'CL-01',
      name: 'Saddar hotspot',
      area: 'Saddar',
      avgTemperature: 41.6,
      avgSeverity: 4.2,
      ndvi: 0.19,
      priority: 'Critical',
      confidence: 0.93,
      satelliteCorrelation: 0.9,
      reportCount: 3,
      updatedAt: new Date().toISOString(),
      center: [24.8532, 67.0284],
      polygon: [
        [24.8582, 67.0224],
        [24.8582, 67.0348],
        [24.8482, 67.0348],
        [24.8482, 67.0224],
      ],
      geojson: {
        type: 'Feature',
        properties: {
          clusterId: 'CL-01',
          area: 'Saddar',
          priority: 'Critical',
        },
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
      id: 'cl_02',
      clusterId: 'CL-02',
      name: 'Korangi Industrial Area hotspot',
      area: 'Korangi Industrial Area',
      avgTemperature: 40.8,
      avgSeverity: 3.9,
      ndvi: 0.23,
      priority: 'High',
      confidence: 0.86,
      satelliteCorrelation: 0.84,
      reportCount: 2,
      updatedAt: new Date().toISOString(),
      center: [24.8301, 67.1395],
      polygon: [
        [24.8356, 67.1325],
        [24.8356, 67.1465],
        [24.8247, 67.1465],
        [24.8247, 67.1325],
      ],
      geojson: {
        type: 'Feature',
        properties: {
          clusterId: 'CL-02',
          area: 'Korangi Industrial Area',
          priority: 'High',
        },
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
    {
      id: 'cl_03',
      clusterId: 'CL-03',
      name: 'Gulshan-e-Iqbal hotspot',
      area: 'Gulshan-e-Iqbal',
      avgTemperature: 39.6,
      avgSeverity: 3.5,
      ndvi: 0.31,
      priority: 'High',
      confidence: 0.82,
      satelliteCorrelation: 0.81,
      reportCount: 2,
      updatedAt: new Date().toISOString(),
      center: [24.9184, 67.0952],
      polygon: [
        [24.9238, 67.0878],
        [24.9238, 67.1024],
        [24.9129, 67.1024],
        [24.9129, 67.0878],
      ],
      geojson: {
        type: 'Feature',
        properties: {
          clusterId: 'CL-03',
          area: 'Gulshan-e-Iqbal',
          priority: 'High',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [67.0878, 24.9238],
              [67.1024, 24.9238],
              [67.1024, 24.9129],
              [67.0878, 24.9129],
              [67.0878, 24.9238],
            ],
          ],
        },
      },
    },
    {
      id: 'cl_04',
      clusterId: 'CL-04',
      name: 'North Nazimabad hotspot',
      area: 'North Nazimabad',
      avgTemperature: 38.7,
      avgSeverity: 3.1,
      ndvi: 0.35,
      priority: 'Medium',
      confidence: 0.74,
      satelliteCorrelation: 0.78,
      reportCount: 1,
      updatedAt: new Date().toISOString(),
      center: [24.9386, 67.0417],
      polygon: [
        [24.9441, 67.0347],
        [24.9441, 67.0487],
        [24.9331, 67.0487],
        [24.9331, 67.0347],
      ],
      geojson: {
        type: 'Feature',
        properties: {
          clusterId: 'CL-04',
          area: 'North Nazimabad',
          priority: 'Medium',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [67.0347, 24.9441],
              [67.0487, 24.9441],
              [67.0487, 24.9331],
              [67.0347, 24.9331],
              [67.0347, 24.9441],
            ],
          ],
        },
      },
    },
    {
      id: 'cl_05',
      clusterId: 'CL-05',
      name: 'Clifton hotspot',
      area: 'Clifton',
      avgTemperature: 37.8,
      avgSeverity: 2.8,
      ndvi: 0.42,
      priority: 'Low',
      confidence: 0.68,
      satelliteCorrelation: 0.72,
      reportCount: 1,
      updatedAt: new Date().toISOString(),
      center: [24.8103, 67.0305],
      polygon: [
        [24.8161, 67.0232],
        [24.8161, 67.0374],
        [24.8044, 67.0374],
        [24.8044, 67.0232],
      ],
      geojson: {
        type: 'Feature',
        properties: {
          clusterId: 'CL-05',
          area: 'Clifton',
          priority: 'Low',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [67.0232, 24.8161],
              [67.0374, 24.8161],
              [67.0374, 24.8044],
              [67.0232, 24.8044],
              [67.0232, 24.8161],
            ],
          ],
        },
      },
    },
  ];
  hotspotStorage.saveAll(hotspots);
  return hotspots;
};
// Demo Analytics
const seedAnalytics = (reports, hotspots) => {
  const totalReports = reports.length;
  const activeHotspots = hotspots.length;
  const avgSeverity = totalReports
    ? (reports.reduce((sum, r) => sum + r.severity, 0) / totalReports).toFixed(
        1
      )
    : 0;
  const severityDistribution = [
    {
      severity: 'S1',
      value: reports.filter((r) => r.severity === 1).length,
      label: 'Severity 1',
    },
    {
      severity: 'S2',
      value: reports.filter((r) => r.severity === 2).length,
      label: 'Severity 2',
    },
    {
      severity: 'S3',
      value: reports.filter((r) => r.severity === 3).length,
      label: 'Severity 3',
    },
    {
      severity: 'S4',
      value: reports.filter((r) => r.severity === 4).length,
      label: 'Severity 4',
    },
    {
      severity: 'S5',
      value: reports.filter((r) => r.severity === 5).length,
      label: 'Severity 5',
    },
  ];
  const analytics = {
    totalReports,
    activeHotspots,
    avgSeverity,
    severityDistribution,
    criticalZones: hotspots.filter((h) => h.priority === 'Critical').length,
    lastUpdated: new Date().toISOString(),
  };
  analyticsStorage.set(analytics);
  return analytics;
};
// Main seed function
export const seedDemoData = () => {
  const users = seedUsers();
  const reports = seedReports(users);
  const hotspots = seedHotspots();
  const analytics = seedAnalytics(reports, hotspots);
  setSeeded();
  return { users, reports, hotspots, analytics };
};
// Reset function
export const resetDemoData = () => {
  localStorage.removeItem('thermax_users');
  localStorage.removeItem('thermax_heat_reports');
  localStorage.removeItem('thermax_hotspots');
  localStorage.removeItem('thermax_analytics');
  localStorage.removeItem('thermax_seeded');
  localStorage.removeItem('thermax_current_user');
  localStorage.removeItem('thermax_token');
};
