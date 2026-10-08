import { describe, it, expect } from 'vitest';
import { normalizeCity, highestTier } from './city.js';

describe('normalizeCity', () => {
  it('formats city names case-insensitively with proper title casing', () => {
    expect(normalizeCity('karachi')).toBe('Karachi');
    expect(normalizeCity('LAHORE')).toBe('Lahore');
    expect(normalizeCity('Islamabad')).toBe('Islamabad');
    expect(normalizeCity('sukkur')).toBe('Sukkur');
    expect(normalizeCity('mian channu')).toBe('Mian Channu');
  });

  it('returns null for empty or non-string input', () => {
    expect(normalizeCity(null)).toBeNull();
    expect(normalizeCity(undefined)).toBeNull();
    expect(normalizeCity('')).toBeNull();
    expect(normalizeCity('   ')).toBeNull();
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
