import { describe, it, expect, vi } from 'vitest';

// Mock axios BEFORE the api module loads: capture the response-interceptor's
// rejection handler so we can fire synthetic 401s at it. The factory is
// hoisted above all module scope, so state crosses via globalThis.
vi.mock('axios', () => {
  const rejectedHandlers = [];
  const mockInstance = vi.fn(async () => ({ data: { ok: true } }));
  mockInstance.interceptors = {
    request: { use: vi.fn() },
    response: {
      use: vi.fn((_onOk, onRejected) => {
        rejectedHandlers.push(onRejected);
      }),
    },
  };
  const axiosPost = vi.fn();
  globalThis.__axiosMock = { rejectedHandlers, mockInstance, axiosPost };
  return {
    default: {
      create: vi.fn(() => mockInstance),
      post: (...args) => axiosPost(...args),
    },
  };
});

import { onTokenRefresh } from './api.js';
import { authStorage } from './localStorageService.js';

const holder = () => globalThis.__axiosMock;
const fire401 = (url = '/api/v1/reports') =>
  holder().rejectedHandlers[0]({
    response: { status: 401 },
    config: { url, headers: {} },
  });

describe('401 refresh serialization (pre-Phase-6 review)', () => {
  it('fires exactly one refresh for parallel 401s and notifies listeners', async () => {
    expect(holder().rejectedHandlers.length).toBeGreaterThan(0);
    let resolveRefresh;
    holder().axiosPost.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRefresh = () => resolve({ data: { accessToken: 'fresh-token-1' } });
        })
    );

    const seen = [];
    const unsubscribe = onTokenRefresh((t) => seen.push(t));

    // Two 401s land while the refresh is still in flight.
    const p1 = fire401('/api/v1/reports');
    const p2 = fire401('/api/v1/hotspots');
    await Promise.resolve();
    await Promise.resolve();
    expect(holder().axiosPost).toHaveBeenCalledTimes(1);

    resolveRefresh();
    await Promise.all([p1, p2]);

    // Both retried requests carried the fresh token…
    expect(holder().mockInstance).toHaveBeenCalledTimes(2);
    expect(holder().mockInstance.mock.calls[0][0].headers.Authorization).toBe(
      'Bearer fresh-token-1'
    );
    expect(holder().mockInstance.mock.calls[1][0].headers.Authorization).toBe(
      'Bearer fresh-token-1'
    );
    // …storage was updated…
    expect(authStorage.getToken()).toBe('fresh-token-1');
    // …and listeners (e.g. AuthContext) were notified exactly once.
    expect(seen).toEqual(['fresh-token-1']);
    unsubscribe();
  });

  it('unsubscribing stops listener notifications', async () => {
    holder().axiosPost.mockResolvedValue({ data: { accessToken: 'fresh-token-2' } });
    const seen = [];
    const unsubscribe = onTokenRefresh((t) => seen.push(t));
    unsubscribe();
    await fire401('/api/v1/reports');
    expect(holder().axiosPost).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([]);
    expect(authStorage.getToken()).toBe('fresh-token-2');
  });
});
