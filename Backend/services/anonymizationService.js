export function snapToGrid(latitude, longitude, precisionDegrees = 0.001) {
  // Snaps raw coordinates to ~100m x 100m centroid grid for public-facing PDPB privacy compliance
  const lat = Number(latitude);
  const lng = Number(longitude);
  // Invalid input → null, never a fabricated default location.
  if (isNaN(lat) || isNaN(lng)) return null;

  const snappedLat = Math.round(lat / precisionDegrees) * precisionDegrees;
  const snappedLng = Math.round(lng / precisionDegrees) * precisionDegrees;

  return {
    lat: Number(snappedLat.toFixed(4)),
    lng: Number(snappedLng.toFixed(4))
  };
}

export default { snapToGrid };
