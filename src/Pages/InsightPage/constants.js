export const HEAT_CLUSTERS = [
  {
    rank: "01",
    location: "Downtown Mall Area",
    coordinates: "42.348 deg N, 71.062 deg W",
    severityLabel: "High Intensity",
    severityWidth: "88%",
    isPrimary: true,
  },
  {
    rank: "02",
    location: "Industrial Sector B",
    coordinates: "42.355 deg N, 71.048 deg W",
    severityLabel: "Moderate",
    severityWidth: "54%",
    isPrimary: false,
  },
  {
    rank: "03",
    location: "Riverside Terminal",
    coordinates: "42.341 deg N, 71.091 deg W",
    severityLabel: "Low Spike",
    severityWidth: "32%",
    isPrimary: false,
  },
];

export const DISTRICT_INTENSITY = [
  { district: "DIST_A", score: "89.2", width: "90%", dimmed: false },
  { district: "DIST_B", score: "44.8", width: "45%", dimmed: false },
  { district: "DIST_C", score: "65.1", width: "65%", dimmed: false },
  { district: "DIST_D", score: "12.4", width: "15%", dimmed: true },
];
