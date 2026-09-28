import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from '../app.js';
import { User, ROLES } from '../models/User.js';
import { Report } from '../models/Report.js';
import { generateAccessToken } from '../utils/jwt.js';
import * as weatherService from '../services/weatherService.js';
import * as mlServiceClient from '../services/mlServiceClient.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');

// Minimal valid 1x1 PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

async function makeCitizen(tag) {
  const user = await User.create({
    name: tag,
    email: `${tag}@photoupload.test`,
    password: 'Test123!',
    role: ROLES.USER,
    isEmailVerified: true,
  });
  return { user, token: generateAccessToken(user._id, user.role) };
}

function trackUploads() {
  return new Set(fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : []);
}

function cleanupUploads(before) {
  if (!fs.existsSync(uploadsDir)) return;
  for (const f of fs.readdirSync(uploadsDir)) {
    if (!before.has(f)) {
      try {
        fs.unlinkSync(path.join(uploadsDir, f));
      } catch {
        /* already gone */
      }
    }
  }
}

describe('report photo upload — multipart integration (pre-Phase-6 review)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(weatherService, 'enrichAndSaveSnapshot').mockResolvedValue(null);
    vi.spyOn(mlServiceClient, 'triggerReportEnrichment').mockImplementation(() => ({}));
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('stores an attached photo and links it to the report', async () => {
    const before = trackUploads();
    try {
      const { token } = await makeCitizen('photocitizen');
      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${token}`)
        .field(
          'reportData',
          JSON.stringify({
            latitude: 24.86,
            longitude: 67.0,
            severityLevel: 4,
            city: 'Karachi',
            description: 'Photo upload integration test',
          })
        )
        .attach('image', PNG, 'heat-photo.png');

      expect(res.status).toBe(201);
      const report = await Report.findById(res.body.report._id);
      expect(report).not.toBeNull();
      expect(report.image).toMatch(/^\/uploads\//);

      const storedName = path.basename(report.image);
      const storedPath = path.join(uploadsDir, storedName);
      expect(fs.existsSync(storedPath)).toBe(true);
      // Stored bytes are the uploaded bytes.
      expect(fs.readFileSync(storedPath).equals(PNG)).toBe(true);
    } finally {
      cleanupUploads(before);
    }
  });

  it('never trusts the client filename — no path traversal, no name reuse', async () => {
    const before = trackUploads();
    try {
      const { token } = await makeCitizen('photocitizen2');
      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${token}`)
        .field(
          'reportData',
          JSON.stringify({
            latitude: 24.861,
            longitude: 67.001,
            severityLevel: 3,
            city: 'Karachi',
            description: 'Traversal filename test',
          })
        )
        .attach('image', PNG, '../../evil-traversal.png');

      expect(res.status).toBe(201);
      const report = await Report.findById(res.body.report._id);
      const storedName = path.basename(report.image);
      // The stored name is server-generated: no client path, no '..'.
      expect(storedName).not.toContain('..');
      expect(storedName).not.toContain('evil-traversal');
      expect(path.sep === '\\' ? !storedName.includes('/') : !storedName.includes('/')).toBe(true);
      // Nothing escaped the uploads directory.
      const parentDir = path.join(__dirname, '..');
      expect(fs.existsSync(path.join(parentDir, 'evil-traversal.png'))).toBe(false);
    } finally {
      cleanupUploads(before);
    }
  });

  it('rejects non-image uploads instead of storing them', async () => {
    const before = trackUploads();
    try {
      const { token } = await makeCitizen('photocitizen3');
      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${token}`)
        .field(
          'reportData',
          JSON.stringify({
            latitude: 24.862,
            longitude: 67.002,
            severityLevel: 2,
            city: 'Karachi',
            description: 'Non-image rejection test',
          })
        )
        .attach('image', Buffer.from('not an image at all'), 'notes.txt');

      expect(res.status).toBe(400);
      // No file was stored for the rejected upload.
      const after = trackUploads();
      expect([...after].filter((f) => !before.has(f))).toEqual([]);
    } finally {
      cleanupUploads(before);
    }
  });
});
