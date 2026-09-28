import { describe, it, expect } from 'vitest';
import { normalizeCity, highestTier, SUPPORTED_CITIES } from './city.js';

describe('normalizeCity', () => {
  it('matches supported cities case-insensitively', () => {
    expect(normalizeCity('karachi')).toBe('Karachi');
    expect(normalizeCity('LAHORE')).toBe('Lahore');
    expect(normalizeCity('Islamabad')).toBe('Islamabad');
  });

  it('handles known aliases', () => {
    expect(normalizeCity('Islamabad Capital Territory')).toBe('Islamabad');
  });

  it('returns null instead of guessing', () => {
    expect(normalizeCity('Atlantis')).toBeNull();
    expect(normalizeCity('Your City')).toBeNull();
    expect(normalizeCity(null)).toBeNull();
    expect(normalizeCity('')).toBeNull();
  });

  it('covers exactly the supported cities', () => {
    expect(SUPPORTED_CITIES).toEqual(['Karachi', 'Lahore', 'Islamabad']);
  });
});

describe('highestTier', () => {
  it('picks the most severe risk tier', () => {
    const hs = [
      { id: 'a', riskTier: 'low' },
      { id: 'b', riskTier: 'high' },
      { id: 'c', riskTier: 'moderate' },
    ];
    expect(highestTier(hs).id).toBe('b');
  });

  it('returns null for empty input', () => {
    expect(highestTier([])).toBeNull();
    expect(highestTier(null)).toBeNull();
  });
});
