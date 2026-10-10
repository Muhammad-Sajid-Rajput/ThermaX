import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import Hotspot from '../models/Hotspot.js';
import HotspotPublication from '../models/HotspotPublication.js';
import { currentHotspotRunFilter } from '../utils/currentHotspotRunFilter.js';
import { getCities } from '../services/boundaryService.js';
import { dbFailureStatus } from '../utils/dbErrors.js';

const router = express.Router();

function severityToLevel(severity) {
  // 'unknown' stays null: mapping it to a number would fabricate a reading.
  switch (severity) {
    case 'critical': return 5;
    case 'high': return 4;
    case 'moderate': return 3;
    case 'low': return 2;
    default: return null;
  }
}

export function toDto(h) {
  return {
    id: h._id,
    clusterId: h.clusterId,
    area: h.district || h.zone || h.city,
    city: h.city,
    district: h.district || h.zone || null,
    zone: h.zone || null,
    avgTemperature: h.avgTemp,
    peakTemp: h.peakTemp,
    avgSeverity: severityToLevel(h.severity),
    priority: h.severity
      ? h.severity.charAt(0).toUpperCase() + h.severity.slice(1)
      : 'Unknown',
    // No fabricated confidence score: the field is omitted until a real
    // model emits one.
    reportCount: h.reportCount || 0,
    status: h.status,
    detectedAt: h.detectedAt,
    centroid: h.centroid,
    geojson: h.boundary ? { type: 'Feature', geometry: h.boundary } : null,
    // Phase 5 TVI-lite: score + the three normalized components, so the UI
    // and the FYP report can show the math. Null when unscored.
    tvi: h.tvi ?? null,
    tviComponents: h.tviComponents
      ? {
          heat: h.tviComponents.heat ?? null,
          reports: h.tviComponents.reports ?? null,
          population: h.tviComponents.population ?? null,
        }
      : null,
    tviWeightsUsed: h.tviWeightsUsed ?? null,
    tviNote: h.tviNote ?? null,
    // Phase 6: canonical risk tier (TVI-derived), deterministic admin
    // directives, and the bilingual citizen advisory. A stored advisory with
    // no text in either language is not an advisory — served as null.
    riskTier: h.riskTier ?? 'unknown',
    directives: Array.isArray(h.directives)
      ? h.directives.map((d) => ({ id: d.id, text: d.text }))
      : [],
    advisory: h.advisory && (h.advisory.en || h.advisory.ur)
      ? {
          en: h.advisory.en ?? null,
          ur: h.advisory.ur ?? null,
          tier: h.advisory.tier ?? null,
          heatIndexBand: h.advisory.heatIndexBand ?? null,
          heatIndex: h.advisory.heatIndex ?? null,
        }
      : null,
    heatIndexMean: h.heatIndexMean ?? null,
    directiveContext: h.directiveContext ?? null,
    runId: h.runId ?? null,
  };
}

router.get('/', optionalAuth, async (req, res) => {
  try {
    // Reader path for the Phase 5 publication pointer: resolve each city's
    // current runId first, then read exactly those runs. A run that is
    // still being inserted (pointer not yet flipped) is invisible here.
    const cityParam = req.query.city;
    let runSelectors;
    if (cityParam) {
      const supported = getCities().map((c) => c.name);
      if (!supported.includes(cityParam)) {
        return res.status(400).json({
          error: 'Unknown city',
          message: `Supported cities: ${supported.join(', ')}.`,
          hotspots: [],
        });
      }
      const pub = await HotspotPublication.findOne({ city: cityParam });
      if (!pub) {
        return res.json({
          message: 'Hotspots retrieved successfully',
          hotspots: [],
          total: 0,
          lastUpdated: new Date().toISOString(),
        });
      }
      runSelectors = [{ city: cityParam, runId: pub.currentRunId }];
    } else {
      const pubs = await HotspotPublication.find({});
      runSelectors = pubs.map((p) => ({ city: p.city, runId: p.currentRunId }));
      if (runSelectors.length === 0) {
        return res.json({
          message: 'Hotspots retrieved successfully',
          hotspots: [],
          total: 0,
          lastUpdated: new Date().toISOString(),
        });
      }
    }

    // Ranked by TVI (nulls last), deterministic tiebreak on _id.
    const dbHotspots = await Hotspot.find({
      status: 'active',
      $or: runSelectors,
    })
      .sort({ tvi: -1, _id: 1 })
      .limit(100);
    const hotspots = dbHotspots.map(toDto);
    res.json({
      message: 'Hotspots retrieved successfully',
      hotspots,
      total: hotspots.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    res.status(dbFailureStatus(error)).json({
      error: 'Failed to fetch hotspots',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred fetching hotspots',
      hotspots: [],
    });
  }
});

// Phase 6: single-hotspot detail for the admin TVI + directive checklist.
// Same visibility as the list (optionalAuth); the admin UI lists from the
// current run, so IDs resolve to current hotspots in practice.
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ error: 'Invalid hotspot id', hotspot: null });
    }
    const h = await Hotspot.findById(id);
    if (!h) {
      return res.status(404).json({ error: 'Hotspot not found', hotspot: null });
    }
    // Phase 6: a hotspot is only readable while its run is the city's
    // current publication. A previous-run id returns 404 rather than
    // serving stale data the dashboard no longer shows.
    const currentFilter = await currentHotspotRunFilter(h.city);
    const isCurrent = await Hotspot.exists({ _id: h._id, ...currentFilter });
    if (!isCurrent) {
      return res.status(404).json({ error: 'Hotspot not found', hotspot: null });
    }
    res.json({ message: 'Hotspot retrieved successfully', hotspot: toDto(h) });
  } catch (error) {
    res.status(dbFailureStatus(error)).json({
      error: 'Failed to fetch hotspot',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred fetching hotspot',
      hotspot: null,
    });
  }
});

export { router as hotspotRoutes };
