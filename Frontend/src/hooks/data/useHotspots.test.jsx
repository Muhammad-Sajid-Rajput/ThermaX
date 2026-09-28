// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { fetchHotspots } from '../../services/api.js';
import { useHotspots } from './useHotspots.js';

vi.mock('../../services/api.js', () => ({
  fetchHotspots: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  fetchHotspots.mockResolvedValue({ data: [], lastUpdated: '2026-09-27T00:00:00Z' });
});

describe('useHotspots refetch stability', () => {
  it('fetches once on mount', async () => {
    renderHook(() => useHotspots({ city: 'Karachi' }));
    await waitFor(() => {
      expect(fetchHotspots).toHaveBeenCalledTimes(1);
    });
    expect(fetchHotspots).toHaveBeenCalledWith({ city: 'Karachi' });
  });

  it('does not refetch when re-rendered with an equal-but-new filters object', async () => {
    // Regression guard: callers commonly pass an inline `{ city }` literal,
    // so the hook must key on serialized filters — not object identity —
    // or every render would fire another fetch (refetch loop).
    const { rerender } = renderHook(({ filters }) => useHotspots(filters), {
      initialProps: { filters: { city: 'Karachi' } },
    });
    await waitFor(() => {
      expect(fetchHotspots).toHaveBeenCalledTimes(1);
    });
    rerender({ filters: { city: 'Karachi' } });
    rerender({ filters: { city: 'Karachi' } });
    rerender({ filters: { city: 'Karachi' } });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fetchHotspots).toHaveBeenCalledTimes(1);
  });

  it('refetches when the filters actually change', async () => {
    const { rerender } = renderHook(({ filters }) => useHotspots(filters), {
      initialProps: { filters: { city: 'Karachi' } },
    });
    await waitFor(() => {
      expect(fetchHotspots).toHaveBeenCalledTimes(1);
    });
    rerender({ filters: { city: 'Lahore' } });
    await waitFor(() => {
      expect(fetchHotspots).toHaveBeenCalledTimes(2);
    });
    expect(fetchHotspots).toHaveBeenLastCalledWith({ city: 'Lahore' });
  });
});
