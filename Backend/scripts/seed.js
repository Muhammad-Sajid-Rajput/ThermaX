/**
 * Phase 0 seed script — repeatable demo dataset.
 *
 * Creates: 1 admin, 3 citizens, and ~45 heat reports clustered across
 * Karachi, Lahore and Islamabad (clustered points so DBSCAN finds hotspots,
 * plus a few scattered noise points).
 *
 * Repeatable: clears the users and reports collections first, and uses a
 * seeded RNG so every run produces the same dataset.
 *
 * Usage:  npm run seed
 * Env:    MONGO_URI (default mongodb://localhost:27017/thermax)
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, ROLES } from '../models/User.js';
import { Report } from '../models/Report.js';
import { REPORT_CATEGORIES } from '../constants/categories.js';

dotenv.config();

// ─── Seeded RNG (mulberry32) ────────────────────────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260927);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const jitter = (v, amount) => v + (rand() * 2 - 1) * amount;

// ─── City definitions ───────────────────────────────────────────────────────
const CITIES = [
  {
    name: 'Karachi',
    center: [24.8607, 67.0011],
    districts: ['Malir', 'Korangi', 'South'],
    areas: ['Gulshan-e-Iqbal', 'Saddar', 'Landhi', 'Clifton', 'Orangi Town'],
  },
  {
    name: 'Lahore',
    center: [31.5204, 74.3587],
    districts: ['Cantt', 'Model Town', 'Ravi'],
    areas: ['Gulberg', 'Johar Town', 'Walled City', 'DHA Phase 5', 'Shahdara'],
  },
  {
    name: 'Islamabad',
    center: [33.6844, 73.0479],
    districts: ['Zone II', 'Zone IV', 'Zone V'],
    areas: ['G-9 Markaz', 'F-10', 'Blue Area', 'Bahria Town', 'Pirwadhai'],
  },
];

const CATEGORIES = Object.values(REPORT_CATEGORIES);
const DESCRIPTIONS = [
  'Extreme heat around midday, road surface too hot to walk on.',
  'No shade or trees in this market area, very uncomfortable.',
  'Hot wind and dry air, difficult to breathe outdoors.',
  'Asphalt radiating heat well into the evening.',
  'Dense traffic and concrete buildings trapping heat.',
];

async function main() {
  // Destructive-operation guard: this script WIPES the users and reports
  // collections. Refuse to run against production unless explicitly forced.
  const force = process.argv.includes('--force');
  if (process.env.NODE_ENV === 'production' && !force) {
    console.error(
      'REFUSING TO SEED: NODE_ENV=production and this script deletes the ' +
        'users and reports collections. Re-run with `--force` if you really ' +
        'mean to wipe and reseed this database.'
    );
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/thermax';
  await mongoose.connect(mongoUri);
  console.log(`Connected to ${mongoUri}`);

  // Repeatable: wipe seeded collections first.
  await User.deleteMany({});
  await Report.deleteMany({});
  await mongoose.connection.collection('weathersnapshots').deleteMany({}).catch(() => {});
  await mongoose.connection.collection('satelliteanalyses').deleteMany({}).catch(() => {});
  await mongoose.connection.collection('hotspots').deleteMany({}).catch(() => {});
  await mongoose.connection.collection('hotspot_publications').deleteMany({}).catch(() => {});
  await mongoose.connection.collection('enrichmentfailures').deleteMany({}).catch(() => {});
  await mongoose.connection.collection('generatedreports').deleteMany({}).catch(() => {});
  await mongoose.connection.collection('refreshtokens').deleteMany({}).catch(() => {});
  console.log('Cleared users, reports, weather, satellite, hotspot, and failure collections.');

  // ─── Users ──────────────────────────────────────────────────────────────
  const admin = await User.create({
    name: 'ThermaX Admin',
    email: 'admin@thermax-demo.com',
    password: 'ThermaX-Admin-2026!',
    role: ROLES.ADMIN,
    isEmailVerified: true,
  });

  const citizens = [];
  for (let i = 1; i <= 3; i++) {
    citizens.push(
      await User.create({
        name: `Citizen ${i}`,
        email: `citizen${i}@thermax-demo.com`,
        password: 'ThermaX-Citizen-2026!',
        role: ROLES.USER,
        isEmailVerified: true,
      })
    );
  }
  console.log(`Created admin + ${citizens.length} citizens.`);

  // ─── Reports: 3 tight clusters per city + scattered noise ───────────────
  const reports = [];
  for (const city of CITIES) {
    const [cLat, cLng] = city.center;

    // Cluster centers, ~1–2 km apart.
    const centers = [
      [cLat + 0.008, cLng + 0.006],
      [cLat - 0.01, cLng + 0.004],
      [cLat + 0.002, cLng - 0.012],
    ];

    for (const [clat, clng] of centers) {
      const count = 4 + Math.floor(rand() * 2); // 4–5 reports per cluster
      for (let i = 0; i < count; i++) {
        reports.push({
          user: pick(citizens)._id,
          latitude: jitter(clat, 0.004),
          longitude: jitter(clng, 0.004),
          severityLevel: 3 + Math.floor(rand() * 3), // 3–5
          ambientTemp: Math.round((38 + rand() * 8) * 10) / 10, // 38–46 °C
          humidity: Math.round(20 + rand() * 40),
          city: city.name,
          district: pick(city.districts),
          areaName: pick(city.areas),
          category: pick(CATEGORIES),
          description: pick(DESCRIPTIONS),
          status: rand() < 0.7 ? 'pending' : 'verified',
          source: 'Citizen',
          // Demo data: distinguishable from real citizen reports.
          isSynthetic: true,
        });
      }
    }

    // Scattered noise points (should not form clusters).
    for (let i = 0; i < 3; i++) {
      reports.push({
        user: pick(citizens)._id,
        latitude: jitter(cLat, 0.08),
        longitude: jitter(cLng, 0.08),
        severityLevel: 1 + Math.floor(rand() * 2), // 1–2
        ambientTemp: Math.round((34 + rand() * 4) * 10) / 10,
        humidity: Math.round(30 + rand() * 30),
        city: city.name,
        district: pick(city.districts),
        areaName: pick(city.areas),
        category: pick(CATEGORIES),
        description: pick(DESCRIPTIONS),
        status: 'pending',
        source: 'Citizen',
        // Demo data: distinguishable from real citizen reports.
        isSynthetic: true,
      });
    }
  }

  await Report.insertMany(reports);
  console.log(`Inserted ${reports.length} reports across ${CITIES.length} cities.`);

  const byCity = await Report.aggregate([
    { $group: { _id: '$city', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  console.table(byCity.map((r) => ({ city: r._id, reports: r.count })));

  console.log('\nSeed complete. Login credentials:');
  console.log('  admin@thermax-demo.com / ThermaX-Admin-2026!   (admin, verified)');
  console.log('  citizen1@thermax-demo.com / ThermaX-Citizen-2026!  (user, verified)');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
