import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { User } from '../models/User.js';
import { getJwtSecret } from '../config/env.js';

const EMAIL = 'phase1@example.com';
const PASSWORD = 'Str0ng!Passw0rd';

const signup = (overrides = {}) =>
  request(app)
    .post('/api/v1/auth/signup')
    .send({ name: 'Phase One', email: EMAIL, password: PASSWORD, ...overrides });

const login = (email = EMAIL, password = PASSWORD) =>
  request(app).post('/api/v1/auth/login').send({ email, password });

// The OTP is hashed at rest (never stored plaintext), so tests capture the
// plaintext code the way a user would — by intercepting what generateOtp()
// returns, i.e. what gets sent in the verification email.
const otpLog = [];
const _origGenerateOtp = User.prototype.generateOtp;
User.prototype.generateOtp = async function (...args) {
  const otp = await _origGenerateOtp.apply(this, args);
  otpLog.push({ email: this.email, otp });
  return otp;
};

async function otpFor(email) {
  const entry = otpLog.filter((e) => e.email === email).pop();
  return entry && entry.otp;
}

describe('auth signup (Phase 1: hardened)', () => {
  it('rejects an invalid email with 400', async () => {
    const res = await signup({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('rejects a weak password with 400', async () => {
    const res = await signup({ password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('creates an unverified user and issues NO tokens', async () => {
    const res = await signup();
    expect(res.status).toBe(201);
    expect(res.body.token).toBeFalsy();
    expect(res.body.accessToken).toBeFalsy();

    const user = await User.findOne({ email: EMAIL });
    expect(user).not.toBeNull();
    expect(user.isEmailVerified).toBe(false);
    expect(user.role).toBe('user');
  });

  it('re-registering an unverified email only resends the OTP (takeover fixed)', async () => {
    await signup();
    const res = await signup({ password: 'An0ther!Str0ng1' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeFalsy();
    expect(res.body.accessToken).toBeFalsy();

    // Attacker password must NOT work; original password must survive.
    const verify = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ email: EMAIL, code: await otpFor(EMAIL) });
    expect(verify.status).toBe(200);

    expect((await login()).status).toBe(200);
    expect((await login(EMAIL, 'An0ther!Str0ng1')).status).toBe(401);
  });

  it('login rejects unverified accounts with 403 EMAIL_NOT_VERIFIED', async () => {
    await signup();
    const res = await login();
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('full flow: signup -> verify OTP -> login works', async () => {
    await signup();
    const verify = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ email: EMAIL, code: await otpFor(EMAIL) });
    expect(verify.status).toBe(200);
    expect(verify.body.accessToken).toBeTruthy();

    const res = await login();
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
  });

  it('password reset revokes all refresh tokens', async () => {
    await signup();
    await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ email: EMAIL, code: await otpFor(EMAIL) });

    // Log in and capture the refresh cookie.
    const loginRes = await login();
    expect(loginRes.status).toBe(200);
    const rawCookie = (loginRes.headers['set-cookie'] || []).find((c) =>
      c.startsWith('refreshToken=')
    );
    expect(rawCookie).toBeTruthy();
    const refreshCookie = rawCookie.split(';')[0];

    // Sanity: the refresh token works before the reset (this rotates it,
    // so capture the NEW cookie — it is valid at reset time).
    const before = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie);
    expect(before.status).toBe(200);
    const newRawCookie = (before.headers['set-cookie'] || []).find((c) =>
      c.startsWith('refreshToken=')
    );
    const newRefreshCookie = newRawCookie.split(';')[0];

    // Reset the password via OTP.
    await request(app).post('/api/v1/auth/forgot-password').send({ email: EMAIL });
    const reset = await request(app).post('/api/v1/auth/reset-password').send({
      email: EMAIL,
      code: await otpFor(EMAIL),
      newPassword: 'NewStr0ng!Pass1',
    });
    expect(reset.status).toBe(200);

    // The refresh token that was valid at reset time must now be dead.
    const after = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', newRefreshCookie);
    expect(after.status).toBe(401);
  });
});

describe('jwt secret handling', () => {
  it('getJwtSecret throws when no secret is configured', () => {
    const saved = process.env.JWT_SECRET;
    const savedAccess = process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_SECRET;
    delete process.env.JWT_ACCESS_SECRET;
    try {
      expect(() => getJwtSecret()).toThrow(/not set/);
    } finally {
      if (saved !== undefined) process.env.JWT_SECRET = saved;
      if (savedAccess !== undefined) process.env.JWT_ACCESS_SECRET = savedAccess;
    }
  });

  it('getJwtSecret returns the configured secret', () => {
    expect(getJwtSecret()).toBe('phase0-test-secret');
  });
});
