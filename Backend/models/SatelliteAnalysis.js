import mongoose from 'mongoose';

const { Schema } = mongoose;

const satelliteAnalysisSchema = new Schema(
  {
    report: {
      type: Schema.Types.ObjectId,
      ref: 'Report',
      required: true,
      unique: true,
      index: true,
    },
    lst: Number, // Land Surface Temp (°C)
    ndvi: Number, // Normalized Difference Vegetation Index
    landCover: String,
    uhiClassification: String,
    geeTileId: String,
    source: {
      type: String,
      default: 'MODIS Terra',
    },
    // Provenance: 'unavailable' means the provider could not be reached and
    // NO values were invented. isSynthetic is always false in this system.
    status: {
      type: String,
      enum: ['ok', 'unavailable'],
      default: 'ok',
      index: true,
    },
    isSynthetic: {
      type: Boolean,
      default: false,
    },
    // Image acquisition date from the provider (provenance). Null when the
    // provider is unavailable or does not expose it — never invented.
    observedAt: {
      type: Date,
      default: null,
    },
    fetchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const SatelliteAnalysis = mongoose.model('SatelliteAnalysis', satelliteAnalysisSchema);
export default SatelliteAnalysis;
