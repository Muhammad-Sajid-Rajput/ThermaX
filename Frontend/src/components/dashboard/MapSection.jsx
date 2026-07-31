import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Map, Eye, EyeOff, RotateCcw, Maximize, Minimize } from 'lucide-react';
import useFullscreen from '../../hooks/ui/useFullscreen';

import { runDbscan } from '../../utils/geo/clustering';
import { processClustersToHotspots } from '../../utils/geo/hotspotUtils';
import {
  formatHeatmapPoints,
  HEATMAP_CONFIG,
} from '../../utils/geo/heatmapLayer';

// Fix default marker icon paths (Vite asset pipeline issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const PRIORITY_COLORS = {
  Extreme: '#dc2626',
  Critical: '#dc2626',
  High: '#f97316',
  Moderate: '#facc15',
  Medium: '#facc15',
  Low: '#65a30d',
};

const SEVERITY_COLORS = {
  5: '#dc2626',
  4: '#f97316',
  3: '#facc15',
  2: '#2a9d8f',
  1: '#3b82f6',
};

const KARACHI_CENTER = [24.8607, 67.0011];

// ─── Inner map component ───────────────────────────────────────────────────
const LeafletMapInner = ({
  heatmapData,
  hotspotsData,
  reportsData,
  focus,
  layers,
  onLayersChange,
  resetTrigger,
}) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRefs = useRef({
    heat: null,
    hotspotLayers: [],
    reportMarkers: [],
  });

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: KARACHI_CENTER,
      zoom: 12,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Carto Voyager basemap
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; CARTO &copy; OSM',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(map);

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      if (
        containerRef.current?.offsetWidth > 0 &&
        containerRef.current?.offsetHeight > 0
      ) {
        map.invalidateSize();
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Heatmap layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (layerRefs.current.heat) {
      map.removeLayer(layerRefs.current.heat);
      layerRefs.current.heat = null;
    }

    if (layers.heat && heatmapData?.length > 0) {
      const points = heatmapData
        .map((p) => {
          const lat = p.lat ?? p[0];
          const lng = p.lng ?? p[1];
          const weight = p.intensity ?? p.weight ?? p[2] ?? 0.5;
          return [lat, lng, weight];
        })
        .filter((p) => p[0] != null && p[1] != null);

      const heatLayer = L.heatLayer(
        points,
        HEATMAP_CONFIG || {
          radius: 25,
          blur: 18,
          maxZoom: 15,
          gradient: {
            0.2: '#2a9d8f',
            0.4: '#facc15',
            0.6: '#f97316',
            0.8: '#dc2626',
            1.0: '#991b1b',
          },
        }
      );

      heatLayer.addTo(map);
      layerRefs.current.heat = heatLayer;
    }
  }, [heatmapData, layers.heat]);

  // Hotspot rendering (Polygons from API OR Circles from DBSCAN)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    layerRefs.current.hotspotLayers.forEach((l) => map.removeLayer(l));
    layerRefs.current.hotspotLayers = [];

    if (layers.hotspots && (!focus || focus === 'hotspots')) {
      const newLayers = hotspotsData
        .map((hs) => {
          const priority = hs.severityLabel || hs.priority;
          const color = PRIORITY_COLORS[priority] ?? '#0f766e';
          let layer;

          const popupContent = `
          <div style="min-width:200px;font-family:Inter,sans-serif;line-height:1.5">
            <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#1e293b;">
              ${hs.area || hs.id || 'Hotspot Area'}
            </div>
            <span style="background:${color}22;color:${color};font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;display:inline-block;margin-bottom:8px;">
              ${priority}
            </span>
            <div style="font-size:12px;color:#475569">
              <div style="display:flex; justify-content:space-between;">
                <span>Avg Temp:</span> <b>${hs.avgTemp ?? hs.avgTemperature ?? 'N/A'}°C</b>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span>Avg Severity:</span> <b>${(hs.avgSeverity ?? 0).toFixed(1)}</b>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span>Reports:</span> <b>${hs.reportCount ?? 0}</b>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span>Confidence:</span> <b>${hs.confidence > 1 ? hs.confidence : ((hs.confidence ?? 0) * 100).toFixed(0)}%</b>
              </div>
            </div>
          </div>
        `;

          if (hs.geojson) {
            // Render Polygon
            layer = L.geoJSON(hs.geojson, {
              style: {
                color,
                weight: focus === 'hotspots' ? 2.5 : 1.5,
                fillColor: color,
                fillOpacity: focus === 'hotspots' ? 0.22 : 0.14,
                dashArray: focus === 'hotspots' ? null : '5 4',
              },
            });
            layer.bindPopup(popupContent);

            // Hover effect
            layer.on('mouseover', function () {
              this.setStyle({ fillOpacity: 0.4 });
            });
            layer.on('mouseout', function () {
              this.setStyle({
                fillOpacity: focus === 'hotspots' ? 0.22 : 0.14,
              });
            });
          } else if (hs.centroid) {
            // Render Dynamic Circle (from DBSCAN)
            const radius = Math.min(200 + (hs.reportCount || 1) * 50, 1000);
            layer = L.circle([hs.centroid.lat, hs.centroid.lng], {
              color: color,
              fillColor: color,
              fillOpacity: 0.3,
              weight: 2,
              radius: radius,
              dashArray: '5 5',
            });
            layer.bindPopup(popupContent);

            // Hover effect
            layer.on('mouseover', function () {
              this.setStyle({ fillOpacity: 0.5 });
            });
            layer.on('mouseout', function () {
              this.setStyle({ fillOpacity: 0.3 });
            });
          }

          if (layer) {
            layer.addTo(map);
            return layer;
          }
          return null;
        })
        .filter(Boolean);

      layerRefs.current.hotspotLayers = newLayers;
    }
  }, [hotspotsData, layers.hotspots, focus]);

  // Report markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    layerRefs.current.reportMarkers.forEach((m) => map.removeLayer(m));
    layerRefs.current.reportMarkers = [];

    if (layers.reports && reportsData?.length > 0) {
      const newMarkers = reportsData
        .map((rpt) => {
          const [lat, lng] = rpt.coordinates ?? [rpt.lat, rpt.lng];
          if (!lat || !lng) return null;

          const sev = rpt.severity ?? 1;
          const color = SEVERITY_COLORS[sev] ?? '#94a3b8';
          const size = 10 + sev * 3;

          const icon = L.divIcon({
            html: `
            <div style="
              width:${size * 2}px;height:${size * 2}px;border-radius:50%;
              background:${color};border:2.5px solid white;
              box-shadow:0 2px 10px ${color}99;
              display:flex;align-items:center;justify-content:center;
              color:white;font-size:11px;font-weight:700;font-family:Inter,sans-serif">${sev}</div>`,
            className: '',
            iconSize: [size * 2, size * 2],
            iconAnchor: [size, size],
          });

          const marker = L.marker([lat, lng], { icon }).bindPopup(`
          <div style="min-width:210px;font-family:Inter,sans-serif;line-height:1.5">
            <div style="font-weight:700;font-size:13px;margin-bottom:1px">${rpt.id || 'Report'}</div>
            <div style="font-size:11px;color:#64748b;margin-bottom:5px">${rpt.area || ''} ${rpt.category ? '· ' + rpt.category : ''}</div>
            <div style="font-size:12px;color:#334155;margin-bottom:5px">${rpt.description || 'No description provided.'}</div>
            <div style="font-size:11px;color:#94a3b8">
              <b>Source:</b> ${rpt.source || 'User'} &nbsp;·&nbsp; <b>Severity:</b> ${rpt.severity}/5
            </div>
          </div>`);

          marker.addTo(map);
          return marker;
        })
        .filter(Boolean);

      layerRefs.current.reportMarkers = newMarkers;
    }
  }, [reportsData, layers.reports, focus]);

  // Click interaction (lat/lng popup)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onMapClick = (e) => {
      L.popup()
        .setLatLng(e.latlng)
        .setContent(
          `
          <div style="font-family:Inter; font-size:12px;">
            <strong>Location:</strong><br/>
            Lat: ${e.latlng.lat.toFixed(5)}<br/>
            Lng: ${e.latlng.lng.toFixed(5)}
          </div>
        `
        )
        .openOn(map);
    };

    map.on('click', onMapClick);
    return () => {
      map.off('click', onMapClick);
    };
  }, []);

  // Handle reset view
  useEffect(() => {
    if (resetTrigger > 0 && mapRef.current) {
      mapRef.current.setView(KARACHI_CENTER, 12, {
        animate: true,
        duration: 0.5,
      });
    }
  }, [resetTrigger]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-80 flex-1 z-0 rounded-b-xl"
    />
  );
};

// ─── Severity legend items ────────────────────────────────────────────────
const SeverityLegend = () => (
  <div className="flex items-center gap-3 flex-wrap">
    {Object.entries(SEVERITY_COLORS).map(([level, color]) => (
      <div key={level} className="flex items-center gap-1.5">
        <div
          className="w-3 h-3 rounded-full border border-white/60"
          style={{ background: color }}
        />
        <span className="text-[11px] text-slate-500">S{level}</span>
      </div>
    ))}
  </div>
);

// ─── Heat gradient bar ───────────────────────────────────────────────────
const HeatGradient = () => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] text-slate-400">Low</span>
    <div
      className="h-2 rounded-full w-24"
      style={{
        background:
          'linear-gradient(to right, #2a9d8f, #facc15, #f97316, #dc2626, #991b1b)',
      }}
    />
    <span className="text-[10px] text-slate-400">High</span>
  </div>
);

// ─── Layer toggle panel ──────────────────────────────────────────────────
const LayerToggle = ({ layers, onChange }) => (
  <div className="flex items-center gap-3 text-xs">
    {[
      { key: 'heat', label: 'Heatmap', color: 'text-orange-500' },
      { key: 'hotspots', label: 'Hotspots', color: 'text-red-500' },
      { key: 'reports', label: 'Reports', color: 'text-green-600' },
    ].map(({ key, label, color }) => (
      <button
        key={key}
        onClick={() => onChange(key, !layers[key])}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
          layers[key]
            ? `${color} bg-slate-100 font-medium`
            : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        {layers[key] ? (
          <Eye className="w-3 h-3" />
        ) : (
          <EyeOff className="w-3 h-3" />
        )}
        {label}
      </button>
    ))}
  </div>
);

// ─── Public MapSection wrapper ─────────────────────────────────────────────
const MapSection = ({
  heatmap = [],
  hotspots = [],
  reports = [],
  points = [],
  focus = null,
  eps = 0.015,
  minPts = 2,
  hideControls = false,
  title = 'Urban Heat Map — Karachi',
  showHotspots = true,
  showMarkers = true,
}) => {
  const [showLegend, setShowLegend] = useState(true);
  const [layers, setLayers] = useState({
    heat: hideControls ? focus === 'heatmap' : focus === 'heatmap' || !focus,
    hotspots: hideControls
      ? focus === 'hotspots'
      : showHotspots && (focus === 'hotspots' || !focus),
    reports: hideControls
      ? !focus || focus === 'reports'
      : showMarkers && !focus,
  });
  const mapCardRef = useRef(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen({
    targetRef: mapCardRef,
  });

  const [resetTrigger, setResetTrigger] = useState(0);

  const handleLayerToggle = (key, value) => {
    setLayers((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetView = () => {
    setResetTrigger((prev) => prev + 1);
  };

  // Compute DBSCAN Hotspots if points are provided
  const { finalHeatmap, finalHotspots, finalReports } = useMemo(() => {
    let finalHeatmap = heatmap;
    let finalHotspots = hotspots;
    let finalReports = reports;

    // Use points directly for DBSCAN, or fallback to mapping reports if neither heatmap nor hotspots are provided
    const sourcePoints =
      points?.length > 0
        ? points
        : reports?.length > 0 && (!hotspots || hotspots.length === 0)
          ? reports.map((r) => ({
              lat: r.coordinates?.[0] || r.lat,
              lng: r.coordinates?.[1] || r.lng,
              temp: r.temperature || 35 + (r.severity || 1) * 1.5,
              severity: r.severity || 1,
            }))
          : [];

    const validPoints = sourcePoints.filter((p) => p.lat && p.lng);

    if (validPoints.length > 0 && (!hotspots || hotspots.length === 0)) {
      const rawClusters = runDbscan(validPoints, eps, minPts);
      finalHotspots = processClustersToHotspots(rawClusters, validPoints);
      finalHeatmap = formatHeatmapPoints(validPoints);
      finalReports = validPoints; // map points back as reports so they show as markers
    } else if (validPoints.length > 0) {
      finalReports = validPoints;
    }

    return {
      finalHeatmap: finalHeatmap || [],
      finalHotspots: finalHotspots || [],
      finalReports: finalReports || [],
    };
  }, [heatmap, hotspots, reports, points, eps, minPts]);

  return (
    <Card
      ref={mapCardRef}
      className={`flex flex-col overflow-hidden h-full ${isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-white' : ''}`}
    >
      {/* Header */}
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Map className="w-4 h-4 text-green-600" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-3">
            {!hideControls && (
              <button
                onClick={() => setShowLegend((v) => !v)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
              >
                {showLegend ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                Legend
              </button>
            )}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live
            </div>
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors ml-2"
            >
              {isFullscreen ? (
                <Minimize className="w-3.5 h-3.5" />
              ) : (
                <Maximize className="w-3.5 h-3.5" />
              )}
              {isFullscreen ? 'Exit' : 'Fullscreen'}
            </button>
            {hideControls && (
              <button
                onClick={handleResetView}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-green-600 transition-colors ml-2"
              >
                <RotateCcw className="w-3 h-3" />
                Reset View
              </button>
            )}
          </div>
        </div>

        {/* Layer toggles & Map Controls */}
        {!hideControls && (
          <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
            <LayerToggle layers={layers} onChange={handleLayerToggle} />
            <button
              onClick={handleResetView}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-green-600 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset View
            </button>
          </div>
        )}

        {/* Legends */}
        {(showLegend || hideControls) && (
          <div
            className={`flex flex-wrap items-center gap-x-6 gap-y-2 ${hideControls ? 'mt-1' : 'mt-2.5 pt-2 border-t border-slate-100'}`}
          >
            {(!hideControls ||
              focus === 'hotspots' ||
              focus === 'reports' ||
              !focus) && <SeverityLegend />}
            {(!hideControls || focus === 'heatmap') && <HeatGradient />}
          </div>
        )}
      </CardHeader>

      {/* Map */}
      <CardContent className="p-0 flex-1 min-h-0 overflow-hidden rounded-b-xl relative">
        <LeafletMapInner
          heatmapData={finalHeatmap}
          hotspotsData={finalHotspots}
          reportsData={finalReports}
          focus={focus}
          layers={layers}
          onLayersChange={handleLayerToggle}
          resetTrigger={resetTrigger}
        />
      </CardContent>
    </Card>
  );
};

export default MapSection;
