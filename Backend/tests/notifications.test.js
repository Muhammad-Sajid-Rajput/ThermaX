import { describe, it, expect, vi, afterEach } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import { User, ROLES } from '../models/User.js';
import Report from '../models/Report.js';
import AdminNotification from '../models/AdminNotification.js';
import { generateAccessToken } from '../utils/jwt.js';

async function makeAdmin(tag) {
  const user = await User.create({
    name: `AdminNotif ${tag}`,
    email: `adminnotif-${tag}@test.local`,
    password: 'AdminNotif-2026!',
    role: ROLES.ADMIN,
    isEmailVerified: true,
  });
  return { token: generateAccessToken(user._id, user.role), user };
}

async function makeCitizen(tag) {
  const user = await User.create({
    name: `CitizenNotif ${tag}`,
    email: `citizennotif-${tag}@test.local`,
    password: 'CitizenNotif-2026!',
    role: ROLES.CITIZEN,
    isEmailVerified: true,
  });
  return { token: generateAccessToken(user._id, user.role), user };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('admin notifications endpoints', () => {
  it('GET /api/v1/admin/notifications enforces auth: 401 for unauthenticated, 403 for citizen', async () => {
    // Unauthenticated: 401
    await request(app)
      .get('/api/v1/admin/notifications')
      .expect(401);

    // Citizen: 403
    const { token } = await makeCitizen('auth-test');
    await request(app)
      .get('/api/v1/admin/notifications')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('GET /api/v1/admin/notifications returns 200 with documented shape, unread first and sorted', async () => {
    const { token } = await makeAdmin('list-test');
    const { user: citizen } = await makeCitizen('author-test');

    const report1 = await Report.create({
      user: citizen._id,
      city: 'Karachi',
      latitude: 24.86,
      longitude: 67.0,
      severityLevel: 4,
      status: 'flagged',
    });
    const report2 = await Report.create({
      user: citizen._id,
      city: 'Karachi',
      latitude: 24.87,
      longitude: 67.01,
      severityLevel: 3,
      status: 'pending',
    });
    const report3 = await Report.create({
      user: citizen._id,
      city: 'Karachi',
      latitude: 24.88,
      longitude: 67.02,
      severityLevel: 5,
      status: 'flagged',
    });

    // Create 1 read older notification
    const readOlder = await AdminNotification.create({
      reportId: report1._id,
      type: 'extreme_contradiction',
      reason: '|20 - 40| = 20°C > 3°C',
      qcScore: 0.65,
      createdAt: new Date(Date.now() - 50000),
      readAt: new Date(Date.now() - 10000),
    });

    // Create 1 read newer notification
    const readNewer = await AdminNotification.create({
      reportId: report2._id,
      type: 'enrichment_failed',
      reason: 'Network timeout',
      qcScore: null,
      createdAt: new Date(Date.now() - 30000),
      readAt: new Date(Date.now() - 5000),
    });

    // Create 1 unread notification
    const unread = await AdminNotification.create({
      reportId: report3._id,
      type: 'extreme_contradiction',
      reason: '|15 - 40| = 25°C > 3°C',
      qcScore: 0.3,
      createdAt: new Date(Date.now() - 10000),
      readAt: null,
    });

    const res = await request(app)
      .get('/api/v1/admin/notifications')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveProperty('notifications');
    const notifs = res.body.notifications;
    expect(notifs.length).toBeGreaterThanOrEqual(3);

    // Unread must be first
    const unreadIndex = notifs.findIndex((n) => n._id === String(unread._id));
    const readNewerIndex = notifs.findIndex((n) => n._id === String(readNewer._id));
    const readOlderIndex = notifs.findIndex((n) => n._id === String(readOlder._id));

    expect(unreadIndex).toBe(0);
    expect(readNewerIndex).toBeLessThan(readOlderIndex);

    // Verify populated fields
    const firstNotif = notifs[0];
    expect(firstNotif).toHaveProperty('_id');
    expect(firstNotif).toHaveProperty('type');
    expect(firstNotif).toHaveProperty('reason');
    expect(firstNotif).toHaveProperty('qcScore');
    expect(firstNotif).toHaveProperty('createdAt');
    expect(firstNotif).toHaveProperty('readAt');
    expect(firstNotif.reportId).toHaveProperty('city', 'Karachi');
    expect(firstNotif.reportId).toHaveProperty('status', 'flagged');
  });

  it('POST /api/v1/admin/notifications/:id/read marks read and sets readBy', async () => {
    const { token, user: admin } = await makeAdmin('read-test');
    const { user: citizen } = await makeCitizen('author-test-2');

    const report = await Report.create({
      user: citizen._id,
      city: 'Lahore',
      latitude: 31.52,
      longitude: 74.35,
      severityLevel: 3,
      status: 'pending',
    });

    const notif = await AdminNotification.create({
      reportId: report._id,
      type: 'enrichment_failed',
      reason: 'Coordinates missing',
      readAt: null,
      readBy: null,
    });

    const res = await request(app)
      .post(`/api/v1/admin/notifications/${notif._id}/read`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.message).toBe('Notification marked as read.');
    expect(res.body.notification.readAt).not.toBeNull();
    expect(res.body.notification.readBy).toBe(String(admin._id));

    const updated = await AdminNotification.findById(notif._id);
    expect(updated.readAt).not.toBeNull();
    expect(String(updated.readBy)).toBe(String(admin._id));
  });

  it('POST /api/v1/admin/notifications/:id/read returns 404 for unknown id', async () => {
    const { token } = await makeAdmin('404-test');
    const nonExistentId = new mongoose.Types.ObjectId();

    await request(app)
      .post(`/api/v1/admin/notifications/${nonExistentId}/read`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    // Also returns 404 on malformed id
    await request(app)
      .post('/api/v1/admin/notifications/not-an-objectid/read')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});
