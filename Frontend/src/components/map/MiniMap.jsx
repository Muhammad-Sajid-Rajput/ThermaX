import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

const KARACHI_CENTER = [24.8607, 67.0011];

const MiniMap = ({
  center = KARACHI_CENTER,
  zoom = 13,
  markers = [],
  reports = [],
  hotspots = [],
  heatmap = [],
  height = '200px',
}) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({
    markers: [],
    reports: [],
    hotspots: [],
    heat: null,
  });

  const clearLayers = useCallback((type) => {
    const map = mapRef.current;
    if (!map) return;

    if (type === 'heat') {
      if (layersRef.current.heat) {
        map.removeLayer(layersRef.current.heat);
        layersRef.current.heat = null;
      }
      return;
    }

    const layerGroup = layersRef.current[type];
    layerGroup.forEach((l) => map.removeLayer(l));
    layersRef.current[type] = [];
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize map once
    if (!mapRef.current) {
      const map = L.map(containerRef.current, {
        center,
        zoom,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
      });

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          subdomains: 'abcd',
          maxZoom: 19,
        }
      ).addTo(map);

      mapRef.current = map;
    } else {
      mapRef.current.setView(center, zoom);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update heatmap
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    clearLayers('heat');

    if (heatmap && heatmap.length > 0) {
      const points = heatmap
        .map((p) => {
          const lat = p.lat ?? p[0];
          const lng = p.lng ?? p[1];
          const weight = p.intensity ?? p.weight ?? p[2] ?? 0.5;
          return [lat, lng, weight];
        })
        .filter((p) => p[0] != null && p[1] != null);

      const heatLayer = L.heatLayer(points, {
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
      });

      heatLayer.addTo(map);
      layersRef.current.heat = heatLayer;
    }
  }, [heatmap, clearLayers]);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    clearLayers('markers');

    const newLayers = markers
      .map((m) => {
        const lat = m.lat ?? m.latitude ?? m.coordinates?.[0];
        const lng = m.lng ?? m.longitude ?? m.coordinates?.[1];
        if (lat == null || lng == null) return null;

        const marker = L.marker([lat, lng]);
        if (m.popup) marker.bindPopup(m.popup);
        if (m.label) marker.bindTooltip(m.label);

        marker.addTo(map);
        return marker;
      })
      .filter(Boolean);

    layersRef.current.markers = newLayers;
  }, [markers, clearLayers]);

  // Update report dots
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    clearLayers('reports');

    const SEVERITY_COLORS = {
      5: '#dc2626',
      4: '#f97316',
      3: '#facc15',
      2: '#2a9d8f',
      1: '#94a3b8',
    };

    const newLayers = reports
      .map((rpt) => {
        const [lat, lng] = rpt.coordinates ?? [];
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
          <div style="font-weight:700;font-size:13px;margin-bottom:1px">${rpt.id || ''}</div>
          <div style="font-size:11px;color:#64748b;margin-bottom:5px">${rpt.area || ''} · ${rpt.category || ''}</div>
          <div style="font-size:12px;color:#334155;margin-bottom:5px">${rpt.description || ''}</div>
          <div style="font-size:11px;color:#94a3b8">
            <b>Source:</b> ${rpt.source || ''} &nbsp;·&nbsp; <b>Severity:</b> ${rpt.severity}/5
          </div>
        </div>`);

        marker.addTo(map);
        return marker;
      })
      .filter(Boolean);

    layersRef.current.reports = newLayers;
  }, [reports, clearLayers]);

  // Update hotspot polygons
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    clearLayers('hotspots');

    const PRIORITY_COLORS = {
      Critical: '#dc2626',
      High: '#f97316',
      Medium: '#facc15',
      Low: '#65a30d',
    };

    const newLayers = hotspots
      .map((hs) => {
        if (!hs.geojson) return null;

        const color = PRIORITY_COLORS[hs.priority] ?? '#0f766e';
        const layer = L.geoJSON(hs.geojson, {
          style: {
            color,
            weight: 1.5,
            fillColor: color,
            fillOpacity: 0.14,
            dashArray: '5 4',
          },
        }).bindPopup(`
        <div style="min-width:190px;font-family:Inter,sans-serif;line-height:1.5">
          <div style="font-weight:700;font-size:13px;margin-bottom:3px">${hs.area}</div>
          <span style="
            background:${color}22;color:${color};
            font-size:11px;font-weight:600;
            padding:2px 8px;border-radius:20px;display:inline-block;margin-bottom:6px">${hs.priority}</span>
          <div style="font-size:12px;color:#475569">
            <div>Avg temp: <b>${hs.avgTemperature ?? 'N/A'}°C</b></div>
            <div>Avg severity: <b>${hs.avgSeverity?.toFixed(1) ?? 'N/A'}</b></div>
            <div>Reports: <b>${hs.reportCount ?? 0}</b></div>
            <div>Confidence: <b>${((hs.confidence ?? 0) * 100).toFixed(0)}%</b></div>
          </div>
        </div>`);

        layer.addTo(map);
        return layer;
      })
      .filter(Boolean);

    layersRef.current.hotspots = newLayers;
  }, [hotspots, clearLayers]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '8px' }}
      className="border border-gray-200 z-0 relative"
    />
  );
};

export default MiniMap;
