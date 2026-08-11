export function snapToGrid(latitude, longitude, precisionDegrees = 0.001) {
  // Snaps raw coordinates to ~100m x 100m centroid grid for public-facing PDPB privacy compliance
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (isNaN(lat) || isNaN(lng)) return { lat: 24.8607, lng: 67.0011 };

  const snappedLat = Math.round(lat / precisionDegrees) * precisionDegrees;
  const snappedLng = Math.round(lng / precisionDegrees) * precisionDegrees;

  return {
    lat: Number(snappedLat.toFixed(4)),
    lng: Number(snappedLng.toFixed(4))
  };
}

export default { snapToGrid };
