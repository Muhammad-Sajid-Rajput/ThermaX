// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, within, fireEvent, waitFor } from '@testing-library/react';
import AdvisoryBanner from './AdvisoryBanner.jsx';
import { fetchHotspots } from '../../services/api.js';
import useUserLocationStore from '../../stores/userLocationStore.js';

vi.mock('../../services/api.js', () => ({
  fetchHotspots: vi.fn(),
}));

const criticalHotspot = {
  id: 'h1',
  area: 'Gulshan-e-Iqbal',
  city: 'Karachi',
  riskTier: 'critical',
  advisory: {
    en: 'Extreme heat danger in your area. Stay indoors.',
    ur: 'شدید گرمی کا خطرہ ہے۔ گھر کے اندر رہیں۔',
    tier: 'critical',
    heatIndexBand: 'extreme',
    heatIndex: 46.0,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  useUserLocationStore.setState({ cityName: null, status: 'idle', requested: false });
});

describe('AdvisoryBanner', () => {
  it('renders the critical advisory in English with a city prop', async () => {
    fetchHotspots.mockResolvedValue({ data: [criticalHotspot] });
    const view = render(<AdvisoryBanner city="Karachi" />);
    await waitFor(() => {
      expect(within(view.container).getByText(/Extreme heat danger/)).toBeTruthy();
    });
    expect(fetchHotspots).toHaveBeenCalledWith({ city: 'Karachi' });
    expect(within(view.container).getByText('Critical heat risk')).toBeTruthy();
  });

  it('toggles to Urdu', async () => {
    fetchHotspots.mockResolvedValue({ data: [criticalHotspot] });
    const view = render(<AdvisoryBanner city="Karachi" />);
    await waitFor(() => {
      expect(within(view.container).getByText(/Extreme heat danger/)).toBeTruthy();
    });
    fireEvent.click(within(view.container).getByLabelText('Switch to Urdu'));
    expect(within(view.container).getByText(/شدید گرمی/)).toBeTruthy();
  });

  it('is dismissible', async () => {
    fetchHotspots.mockResolvedValue({ data: [criticalHotspot] });
    const view = render(<AdvisoryBanner city="Karachi" />);
    await waitFor(() => {
      expect(within(view.container).getByText(/Extreme heat danger/)).toBeTruthy();
    });
    fireEvent.click(within(view.container).getByLabelText('Dismiss advisory'));
    expect(view.container.innerHTML).toBe('');
  });

  it('renders nothing for low-tier hotspots', async () => {
    fetchHotspots.mockResolvedValue({
      data: [{ ...criticalHotspot, riskTier: 'low', advisory: { en: 'Normal.', ur: 'معمول۔' } }],
    });
    const view = render(<AdvisoryBanner city="Karachi" />);
    await waitFor(() => {
      expect(fetchHotspots).toHaveBeenCalled();
    });
    expect(view.container.innerHTML).toBe('');
  });

  it('renders nothing when the advisory is missing', async () => {
    fetchHotspots.mockResolvedValue({
      data: [{ ...criticalHotspot, advisory: null }],
    });
    const view = render(<AdvisoryBanner city="Karachi" />);
    await waitFor(() => {
      expect(fetchHotspots).toHaveBeenCalled();
    });
    expect(view.container.innerHTML).toBe('');
  });

  it('renders nothing on fetch failure (no fake advisory)', async () => {
    fetchHotspots.mockRejectedValue(new Error('network down'));
    const view = render(<AdvisoryBanner city="Karachi" />);
    await waitFor(() => {
      expect(fetchHotspots).toHaveBeenCalled();
    });
    expect(view.container.innerHTML).toBe('');
  });

  it('picks the highest tier across hotspots', async () => {
    fetchHotspots.mockResolvedValue({
      data: [
        { ...criticalHotspot, riskTier: 'moderate', advisory: { en: 'Warm.', ur: 'گرم۔' } },
        criticalHotspot,
      ],
    });
    const view = render(<AdvisoryBanner city="Karachi" />);
    await waitFor(() => {
      expect(within(view.container).getByText(/Extreme heat danger/)).toBeTruthy();
    });
  });

  it('falls back to English when the Urdu advisory is missing (no blank render)', async () => {
    fetchHotspots.mockResolvedValue({
      data: [
        {
          ...criticalHotspot,
          advisory: { en: 'Extreme heat danger in your area. Stay indoors.', ur: null },
        },
      ],
    });
    const view = render(<AdvisoryBanner city="Karachi" />);
    await waitFor(() => {
      expect(within(view.container).getByText(/Extreme heat danger/)).toBeTruthy();
    });
    // Switch to Urdu: with no Urdu text the banner must show the English
    // fallback — never an empty paragraph.
    fireEvent.click(within(view.container).getByLabelText('Switch to Urdu'));
    expect(within(view.container).getByText(/Extreme heat danger/)).toBeTruthy();
    const advisoryParagraph = view.container.querySelector('p.leading-relaxed');
    expect(advisoryParagraph.textContent.trim().length).toBeGreaterThan(0);
  });

  it('matches the rendered snapshot for a critical advisory', async () => {
    fetchHotspots.mockResolvedValue({ data: [criticalHotspot] });
    const view = render(<AdvisoryBanner city="Karachi" />);
    await waitFor(() => {
      expect(within(view.container).getByText(/Extreme heat danger/)).toBeTruthy();
    });
    expect(view.container.innerHTML).toMatchSnapshot();
  });
});
