// Phase 0 test harness: spins up an isolated in-memory MongoDB for the suite.
// Prefers the pre-downloaded local mongod binary when it exists (no network
// download at test time); otherwise mongodb-memory-server resolves/downloads
// its own binary, so CI and other machines keep working.
// Override with MONGOMS_SYSTEM_BINARY if the binary lives elsewhere.
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Portable cache root: ~/.cache-style location under the user's home, not a
// hardcoded /home/hatch path. Overridable via MONGODB_CACHE_ROOT.
const CACHE_ROOT =
  process.env.MONGODB_CACHE_ROOT || path.join(os.homedir(), 'workspace', '.cache');

const LOCAL_MONGOD = path.join(
  CACHE_ROOT,
  'mongodb-binaries',
  'mongodb-linux-x86_64-ubuntu2404-8.2.6',
  'bin',
  'mongod'
);
const LOCAL_MONGOD_WIN = path.join(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([a-zA-Z]:)/, '$1')),
  '..',
  'mongodb-win32-x86_64-windows-8.2.6',
  'bin',
  'mongod.exe'
);
if (!process.env.MONGOMS_SYSTEM_BINARY) {
  if (existsSync(LOCAL_MONGOD)) {
    process.env.MONGOMS_SYSTEM_BINARY = LOCAL_MONGOD;
  } else if (existsSync(LOCAL_MONGOD_WIN)) {
    process.env.MONGOMS_SYSTEM_BINARY = LOCAL_MONGOD_WIN;
  }
}

// mongodb-memory-server defaults its data dir to the OS tmpdir, which here
// is a 512MB tmpfs — MongoDB refuses index builds when <500MB is free, so
// unique indexes (e.g. one-snapshot-per-report) could never actually build
// in tests. Point the data dir at the roomy home disk instead, one dir per
// vitest worker (parallel test files each run their own mongod, and two
// mongods cannot share a dbpath lock). Overridable via MONGO_TEST_DB_ROOT.
const TEST_DB_ROOT =
  process.env.MONGO_TEST_DB_ROOT || path.join(CACHE_ROOT, 'mongo-test-dbs');
const TEST_DB_PATH = path.join(TEST_DB_ROOT, `pool-${process.env.VITEST_POOL_ID || process.pid}`);
mkdirSync(TEST_DB_PATH, { recursive: true });

process.env.JWT_SECRET = process.env.JWT_SECRET || 'phase0-test-secret';
process.env.NODE_ENV = 'test';
process.env.INCLUDE_SYNTHETIC_REPORTS = 'false';

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach } from 'vitest';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { dbPath: TEST_DB_PATH },
  });
  await mongoose.connect(mongoServer.getUri());
  // Fail loudly if indexes can't build: silent background index failures
  // would make uniqueness tests pass vacuously.
  await mongoose.connection.syncIndexes();
}, 90000);

afterEach(async () => {
  const collections = Object.values(mongoose.connection.collections);
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
  rmSync(TEST_DB_PATH, { recursive: true, force: true });
});
