import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import useUserLocationStore from '../../stores/userLocationStore';
import { buildHotspotPopup, buildReportPopup } from '../../utils/popupBuilders';
import { getHotspotColor, getHotspotRadius } from '../../utils/geo/hotspotUtils';
import { HEATMAP_CONFIG } from '../../utils/geo/heatmapLayer';

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
    // `center`/`zoom` are intentionally init-only here: a dedicated effect
    // below calls map.setView() when they change. Re-running this effect
    // would destroy and recreate the Leaflet map on every pan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const heatLayer = L.heatLayer(points, HEATMAP_CONFIG);

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
        // Public DTO carries the snapped (anonymized) location.
        const loc = report.location ?? {};
        const lat = loc.lat ?? report.coordinates?.[0];
        const lng = loc.lng ?? report.coordinates?.[1];
        if (!lat || !lng) return null;

        // Coerce: a non-numeric severity must never reach the icon HTML.
        const severity = Number.isFinite(Number(report.severity)) ? Number(report.severity) : 1;
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

        // Popup HTML comes from the shared XSS-hardened builder.
        const marker = L.marker([lat, lng], { icon }).bindPopup(buildReportPopup(report));

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

    const newLayers = hotspots
      .map((hotspot) => {
        const color = getHotspotColor(hotspot);
        const popupContent = buildHotspotPopup(hotspot, color);

        const hasValidCentroid =
          hotspot.centroid &&
          Number.isFinite(Number(hotspot.centroid.lat)) &&
          Number.isFinite(Number(hotspot.centroid.lng));

        let layer;
        if (hasValidCentroid) {
          const radius = getHotspotRadius(hotspot.reportCount);
          layer = L.circle([hotspot.centroid.lat, hotspot.centroid.lng], {
            color,
            fillColor: color,
            fillOpacity: 0.28,
            weight: 2,
            radius,
            dashArray: '5 4',
          }).bindPopup(popupContent);
        } else if (hotspot.geojson) {
          layer = L.geoJSON(hotspot.geojson, {
            style: {
              color,
              weight: 1.5,
              fillColor: color,
              fillOpacity: 0.14,
              dashArray: '5 4',
            },
          }).bindPopup(popupContent);
        }

        if (layer) {
          layer.addTo(map);
          return layer;
        }
        return null;
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
