import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios before api.js loads: the module wires interceptors at import
// time, so the mock instance must expose them plus a spied `post`.
vi.mock('axios', () => {
  const mockPost = vi.fn(async () => ({ data: { ok: true } }));
  const mockInstance = {
    post: mockPost,
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  globalThis.__submitMock = { mockPost };
  return { default: { create: vi.fn(() => mockInstance) } };
});

import { normalizeModerationDecision, buildReportFormData, submitHeatReport, getSubmissionErrorMessage } from './api.js';

const mockPost = () => globalThis.__submitMock.mockPost;

// Phase 3 report-lifecycle vocabulary: 'pending' | 'verified' | 'flagged' | 'rejected'.
// updateModerationStatus must never silently map an admin decision to 'rejected'.
describe('normalizeModerationDecision', () => {
  it("passes through 'verified'", () => {
    expect(normalizeModerationDecision('verified')).toBe('verified');
  });

  it("passes through 'flagged'", () => {
    expect(normalizeModerationDecision('flagged')).toBe('flagged');
  });

  it("passes through 'rejected'", () => {
    expect(normalizeModerationDecision('rejected')).toBe('rejected');
  });

  it("maps the legacy alias 'validated' to 'verified'", () => {
    expect(normalizeModerationDecision('validated')).toBe('verified');
  });

  it("maps the legacy aliases 'anomaly' and 'approve'", () => {
    expect(normalizeModerationDecision('anomaly')).toBe('flagged');
    expect(normalizeModerationDecision('approve')).toBe('verified');
  });

  it('throws on garbage instead of silently mapping to rejected', () => {
    expect(() => normalizeModerationDecision('banana')).toThrow();
    expect(() => normalizeModerationDecision('')).toThrow();
    expect(() => normalizeModerationDecision(null)).toThrow();
    expect(() => normalizeModerationDecision(undefined)).toThrow();
  });
});

describe('buildReportFormData', () => {
  it('packs reportData JSON and the image file as separate multipart parts', () => {
    const payload = { latitude: 24.86, longitude: 67.0, severity: 4 };
    const file = new File(['bytes'], 'heat.jpg', { type: 'image/jpeg' });
    const body = buildReportFormData(payload, file);
    expect(body).toBeInstanceOf(FormData);
    expect(JSON.parse(body.get('reportData'))).toEqual(payload);
    const imagePart = body.get('image');
    expect(imagePart).toBeInstanceOf(File);
    expect(imagePart.name).toBe('heat.jpg');
  });

  it('omits the image part when no file was chosen', () => {
    const body = buildReportFormData({ latitude: 24.86 }, null);
    expect(body.get('reportData')).toContain('24.86');
    expect(body.get('image')).toBeNull();
  });
});

describe('submitHeatReport', () => {
  beforeEach(() => {
    mockPost().mockClear();
  });

  it('passes onUploadProgress through to axios for multipart uploads', async () => {
    const onUploadProgress = vi.fn();
    const body = buildReportFormData({ latitude: 24.86 }, null);
    await submitHeatReport(body, { onUploadProgress });
    expect(mockPost()).toHaveBeenCalledTimes(1);
    const [, , config] = mockPost().mock.calls[0];
    // The browser must set Content-Type itself (with the multipart
    // boundary); a manual header strips the boundary and breaks uploads.
    expect(config.headers?.['Content-Type']).toBeUndefined();
    expect(config.onUploadProgress).toBe(onUploadProgress);
  });

  it('omits onUploadProgress when no callback is given', async () => {
    const body = buildReportFormData({ latitude: 24.86 }, null);
    await submitHeatReport(body);
    const [, , config] = mockPost().mock.calls[0];
    expect(config.onUploadProgress).toBeUndefined();
  });

  it('posts JSON without multipart headers for non-FormData payloads', async () => {
    await submitHeatReport({ latitude: 24.86, severity: 3 });
    const [, payload, config] = mockPost().mock.calls[0];
    expect(payload).toEqual({ latitude: 24.86, severity: 3 });
    expect(config?.headers?.['Content-Type']).toBeUndefined();
  });
});

describe('getSubmissionErrorMessage', () => {
  it('reports a network failure when the request got no response', () => {
    const msg = getSubmissionErrorMessage({ request: {} });
    expect(msg).toMatch(/network error/i);
  });

  it('reports a 5xx server error with the status code only', () => {
    expect(getSubmissionErrorMessage({ response: { status: 502, data: {} } })).toBe(
      'Server error (502). Please try again later.'
    );
  });

  it('surfaces the server-provided message for 4xx validation errors', () => {
    const msg = getSubmissionErrorMessage({
      response: {
        status: 400,
        data: { message: 'Coordinates are outside supported cities' },
      },
    });
    expect(msg).toBe('Coordinates are outside supported cities');
  });

  it('falls back to a generic rejection message for 4xx without a server message', () => {
    const msg = getSubmissionErrorMessage({ response: { status: 422, data: {} } });
    expect(msg).toMatch(/\(422\)/);
  });

  it('never leaks stacks, non-string payloads, or raw error objects', () => {
    const err = {
      response: { status: 400, data: { message: { nested: 'object' } } },
      stack: 'Error: boom\n    at submitHeatReport',
    };
    const msg = getSubmissionErrorMessage(err);
    expect(typeof msg).toBe('string');
    expect(msg).not.toContain('boom');
    expect(msg).not.toContain('[object Object]');
  });

  it('returns a generic message for unknown error shapes', () => {
    expect(getSubmissionErrorMessage(null)).toMatch(/submission failed/i);
    expect(getSubmissionErrorMessage(new Error('weird'))).toMatch(
      /submission failed/i
    );
  });
});
