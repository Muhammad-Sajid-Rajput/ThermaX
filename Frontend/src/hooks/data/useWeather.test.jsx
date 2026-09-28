// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fetchCurrentWeather } from '../../services/weatherService.js';
import useWeather from './useWeather.js';

vi.mock('../../services/weatherService.js', () => ({
  fetchCurrentWeather: vi.fn(),
}));

const makeWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  fetchCurrentWeather.mockResolvedValue({ temperature: 35, heatIndex: 38 });
});

describe('useWeather (0,0) null-island suppression', () => {
  it('never fires a weather call for (0,0)', async () => {
    // (0,0) means geolocation has not resolved yet — it is not a real
    // location, so no weather fetch or display should happen for it.
    renderHook(() => useWeather(0, 0), { wrapper: makeWrapper() });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fetchCurrentWeather).not.toHaveBeenCalled();
  });

  it('never fires a weather call for string "0","0"', async () => {
    renderHook(() => useWeather('0', '0'), { wrapper: makeWrapper() });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fetchCurrentWeather).not.toHaveBeenCalled();
  });

  it('never fires a weather call when coordinates are missing', async () => {
    renderHook(() => useWeather(null, null), { wrapper: makeWrapper() });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fetchCurrentWeather).not.toHaveBeenCalled();
  });

  it('fetches for real coordinates', async () => {
    const { result } = renderHook(() => useWeather(24.8607, 67.0011), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => {
      expect(fetchCurrentWeather).toHaveBeenCalledTimes(1);
    });
    expect(fetchCurrentWeather).toHaveBeenCalledWith(24.8607, 67.0011, {
      save: false,
    });
    await waitFor(() => {
      expect(result.current.data).toEqual({ temperature: 35, heatIndex: 38 });
    });
  });
});
