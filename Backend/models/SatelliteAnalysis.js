import mongoose from 'mongoose';

const { Schema } = mongoose;

const satelliteAnalysisSchema = new Schema(
  {
    report: {
      type: Schema.Types.ObjectId,
      ref: 'Report',
      required: true,
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
    fetchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const SatelliteAnalysis = mongoose.model('SatelliteAnalysis', satelliteAnalysisSchema);
export default SatelliteAnalysis;
