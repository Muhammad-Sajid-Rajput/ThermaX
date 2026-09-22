import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import useUserLocationStore from '../../stores/userLocationStore';
import { createUserLocationMarker } from '../../utils/geo/userLocationMarker';

const PAKISTAN_CENTER = [30.3753, 69.3451];

const MiniMap = ({
  center = PAKISTAN_CENTER,
  zoom = 6,
  reports = [],
  hotspots = [],
  heatmap = [],
  height = '200px',
  showUserLocation = true,
}) => {
  const userLat = useUserLocationStore((s) => s.lat);
  const userLng = useUserLocationStore((s) => s.lng);
  const userCity = useUserLocationStore((s) => s.cityName);
  const userAccuracy = useUserLocationStore((s) => s.accuracy);

  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({
    reports: [],
    hotspots: [],
    heat: null,
    userLocationMarker: null,
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
    layerGroup.forEach((layer) => map.removeLayer(layer));
    layersRef.current[type] = [];
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

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

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.stop();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map._mapPane) return;

    const [lat, lng] = center ?? [];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    map.stop();
    map.setView([lat, lng], zoom, { animate: false });
    map.invalidateSize();
  }, [center, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    clearLayers('heat');

    if (heatmap && heatmap.length > 0) {
      const points = heatmap
        .map((point) => {
          const lat = point.lat ?? point[0];
          const lng = point.lng ?? point[1];
          const weight = point.intensity ?? point.weight ?? point[2] ?? 0.5;
          return [lat, lng, weight];
        })
        .filter((point) => point[0] != null && point[1] != null);

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
      .map((report) => {
        const [lat, lng] = report.coordinates ?? [];
        if (!lat || !lng) return null;

        const severity = report.severity ?? 1;
        const color = SEVERITY_COLORS[severity] ?? '#94a3b8';
        const size = 10 + severity * 3;

        const icon = L.divIcon({
          html: `
          <div style="
            width:${size * 2}px;height:${size * 2}px;border-radius:50%;
            background:${color};border:2.5px solid white;
            box-shadow:0 2px 10px ${color}99;
            display:flex;align-items:center;justify-content:center;
            color:white;font-size:11px;font-weight:700;font-family:Inter,sans-serif">${severity}</div>`,
          className: '',
          iconSize: [size * 2, size * 2],
          iconAnchor: [size, size],
        });

        const marker = L.marker([lat, lng], { icon }).bindPopup(`
        <div style="min-width:210px;font-family:Inter,sans-serif;line-height:1.5">
          <div style="font-weight:700;font-size:13px;margin-bottom:1px">${report.id || ''}</div>
          <div style="font-size:11px;color:#64748b;margin-bottom:5px">${report.area || ''} · ${report.category || ''}</div>
          <div style="font-size:12px;color:#334155;margin-bottom:5px">${report.description || ''}</div>
          <div style="font-size:11px;color:#94a3b8">
            <b>Source:</b> ${report.source || ''} &nbsp;·&nbsp; <b>Severity:</b> ${report.severity}/5
          </div>
        </div>`);

        marker.addTo(map);
        return marker;
      })
      .filter(Boolean);

    layersRef.current.reports = newLayers;
  }, [reports, clearLayers]);

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
      .map((hotspot) => {
        if (!hotspot.geojson) return null;

        const color = PRIORITY_COLORS[hotspot.priority] ?? '#0f766e';
        const layer = L.geoJSON(hotspot.geojson, {
          style: {
            color,
            weight: 1.5,
            fillColor: color,
            fillOpacity: 0.14,
            dashArray: '5 4',
          },
        }).bindPopup(`
        <div style="min-width:190px;font-family:Inter,sans-serif;line-height:1.5">
          <div style="font-weight:700;font-size:13px;margin-bottom:3px">${hotspot.area}</div>
          <span style="
            background:${color}22;color:${color};
            font-size:11px;font-weight:600;
            padding:2px 8px;border-radius:20px;display:inline-block;margin-bottom:6px">${hotspot.priority}</span>
          <div style="font-size:12px;color:#475569">
            <div>Avg temp: <b>${hotspot.avgTemperature ?? 'N/A'}°C</b></div>
            <div>Avg severity: <b>${hotspot.avgSeverity?.toFixed(1) ?? 'N/A'}</b></div>
            <div>Reports: <b>${hotspot.reportCount ?? 0}</b></div>
            <div>Confidence: <b>${((hotspot.confidence ?? 0) * 100).toFixed(0)}%</b></div>
          </div>
        </div>`);

        layer.addTo(map);
        return layer;
      })
      .filter(Boolean);

    layersRef.current.hotspots = newLayers;
  }, [hotspots, clearLayers]);

  // User location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (layersRef.current.userLocationMarker) {
      map.removeLayer(layersRef.current.userLocationMarker);
      layersRef.current.userLocationMarker = null;
    }

    if (showUserLocation && userLat != null && userLng != null) {
      const marker = createUserLocationMarker(userLat, userLng, {
        cityName: userCity,
        accuracy: userAccuracy,
      });
      marker.addTo(map);
      layersRef.current.userLocationMarker = marker;
    }
  }, [showUserLocation, userLat, userLng, userCity, userAccuracy]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '8px' }}
      className="border border-gray-200 z-0 relative"
    />
  );
};

export default MiniMap;
