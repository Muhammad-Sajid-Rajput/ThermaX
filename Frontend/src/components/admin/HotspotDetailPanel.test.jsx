// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/react';
import HotspotDetailPanel from './HotspotDetailPanel.jsx';

const hotspot = {
  id: 'h1',
  clusterId: 'CL-01',
  area: 'Gulshan-e-Iqbal',
  city: 'Karachi',
  tvi: 0.72,
  tviComponents: { heat: 0.8, reports: 0.6, population: 0.5 },
  tviWeightsUsed: { heat: 0.5, reports: 0.3, population: 0.2 },
  tviNote: null,
  riskTier: 'critical',
  directives: [
    { id: 'open-cooling-centers', text: 'Open public cooling centers.' },
    { id: 'water-points', text: 'Deploy drinking-water points.' },
  ],
  advisory: {
    en: 'Extreme heat danger in your area.',
    ur: 'شدید گرمی کا خطرہ ہے۔',
    tier: 'critical',
    heatIndexBand: 'extreme',
    heatIndex: 46.0,
  },
  heatIndexMean: 46.0,
};

describe('HotspotDetailPanel', () => {
  it('renders the TVI score with component breakdown', () => {
    const view = render(<HotspotDetailPanel hotspot={hotspot} />);
    const c = within(view.container);
    expect(c.getByText('0.72')).toBeTruthy();
    expect(c.getByText('Heat score')).toBeTruthy();
    expect(c.getByText('Report density')).toBeTruthy();
    expect(c.getByText('Population density')).toBeTruthy();
    expect(c.getByText('critical risk')).toBeTruthy();
  });

  it('renders automated mitigation directives', () => {
    const view = render(<HotspotDetailPanel hotspot={hotspot} />);
    const c = within(view.container);
    expect(c.getByText('Open public cooling centers.')).toBeTruthy();
    expect(c.getByText('Deploy drinking-water points.')).toBeTruthy();
  });

  it('previews the citizen advisory in English', () => {
    const view = render(<HotspotDetailPanel hotspot={hotspot} />);
    const c = within(view.container);
    expect(c.getByText('Extreme heat danger in your area.')).toBeTruthy();
  });

  it('is honest about unscored hotspots', () => {
    const view = render(
      <HotspotDetailPanel hotspot={{ ...hotspot, tvi: null, riskTier: 'unknown', directives: [], advisory: null }} />
    );
    const c = within(view.container);
    expect(c.getByText(/No TVI score/)).toBeTruthy();
    expect(c.getByText(/No directives/)).toBeTruthy();
  });

  it('renders measured heat index byte-identically and handles null honestly with "—"', () => {
    const measuredView = render(<HotspotDetailPanel hotspot={{ ...hotspot, heatIndexMean: 46.35 }} />);
    expect(within(measuredView.container).getByText('46.35°C')).toBeTruthy();

    const nullView = render(<HotspotDetailPanel hotspot={{ ...hotspot, heatIndexMean: null }} />);
    expect(within(nullView.container).getByText('—')).toBeTruthy();
  });

  it('discloses 2-component TVI when population is unavailable', () => {
    const view = render(
      <HotspotDetailPanel
        hotspot={{
          ...hotspot,
          tviComponents: ['heat', 'reports'],
          tviWeightsUsed: { heat: 0.625, reports: 0.375 },
        }}
      />
    );
    expect(within(view.container).getByText('2-component TVI (population unavailable for this city)')).toBeTruthy();
  });

  it('renders nothing without a hotspot', () => {
    const view = render(<HotspotDetailPanel hotspot={null} />);
    expect(view.container.innerHTML).toBe('');
  });
});
