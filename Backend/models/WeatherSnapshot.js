import mongoose from 'mongoose';

const { Schema } = mongoose;

const weatherSnapshotSchema = new Schema(
  {
    report: {
      type: Schema.Types.ObjectId,
      ref: 'Report',
      required: true,
      index: true,
      // One snapshot per report: enrichment reruns and the submit-time race
      // between weather + ML triggers upsert instead of duplicating rows.
      unique: true,
    },
    windSpeed: Number,
    heatIndex: Number,
    // Air temperature (°C) from the provider. Needed for QC comparison of
    // citizen-measured temperature. Null when unavailable — never faked.
    temperature: {
      type: Number,
      default: null,
    },
    uvIndex: Number,
    weatherCondition: String,
    airQuality: {
      aqi: Number,
      source: String,
    },
    source: {
      type: String,
      default: 'weatherapi',
    },
    // Provenance: snapshots are only ever written from real provider data.
    isSynthetic: {
      type: Boolean,
      default: false,
    },
    fetchedAt: {
      type: Date,
      default: Date.now,
    },
    // Provider's own observation timestamp (e.g. WeatherAPI `localtime`).
    // Distinct from fetchedAt: tells QC how stale the provider reading was
    // when the snapshot was taken. Null when the provider gives none.
    observedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const WeatherSnapshot = mongoose.model('WeatherSnapshot', weatherSnapshotSchema);
export default WeatherSnapshot;
