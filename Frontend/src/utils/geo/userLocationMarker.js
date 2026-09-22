import L from 'leaflet';

// Creates a Leaflet DivIcon representing the user's current GPS location
export const createUserLocationIcon = () => {
  return L.divIcon({
    className: 'user-location-marker-container',
    html: `
      <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; pointer-events: auto;">
        <div style="
          position: absolute;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(37, 99, 235, 0.35);
          animation: userLocationPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        "></div>
        <div style="
          position: absolute;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #2563eb;
          border: 2.5px solid #ffffff;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.6), 0 1px 3px rgba(0,0,0,0.3);
        "></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

/**
 * Creates a Leaflet Marker for the user's current location with popup and tooltip.
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {Object} [options]
 * @param {string} [options.cityName] - Optional detected city name
 * @param {number} [options.accuracy] - GPS accuracy in meters
 * @returns {L.Marker} Leaflet marker instance
 */
export const createUserLocationMarker = (lat, lng, options = {}) => {
  const { cityName, accuracy } = options;
  const icon = createUserLocationIcon();

  const marker = L.marker([lat, lng], {
    icon,
    zIndexOffset: 1200, // Stays above heatmaps, polygon borders, and report pins
    title: 'Your Location',
  });

  const cityLine = cityName ? `<div style="font-size:12px;font-weight:600;color:#334155;margin-bottom:3px;">${cityName}</div>` : '';
  const accuracyLine = accuracy ? `<div style="font-size:10px;color:#94a3b8;margin-top:3px;">Accuracy: ±${Math.round(accuracy)}m</div>` : '';

  marker.bindPopup(`
    <div style="font-family:Inter,system-ui,sans-serif;line-height:1.4;padding:4px 6px;min-width:160px;">
      <div style="font-weight:700;font-size:13px;color:#1e40af;display:flex;align-items:center;gap:6px;margin-bottom:4px;">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#2563eb;"></span>
        Your Location
      </div>
      ${cityLine}
      <div style="font-size:11px;color:#64748b;">
        Lat: ${Number(lat).toFixed(5)}<br/>
        Lng: ${Number(lng).toFixed(5)}
      </div>
      ${accuracyLine}
    </div>
  `);

  marker.bindTooltip('You are here', {
    direction: 'top',
    offset: [0, -14],
    className: 'user-location-tooltip',
  });

  return marker;
};
