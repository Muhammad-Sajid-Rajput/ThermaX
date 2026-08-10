import mongoose from 'mongoose';

const { Schema } = mongoose;

export const ANALYSIS_STATUS = {
  PENDING: 'PENDING',
  FETCHING_WEATHER: 'FETCHING_WEATHER',
  FETCHING_GEE: 'FETCHING_GEE',
  RUNNING_AI: 'RUNNING_AI',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
};

const aiAnalysisSchema = new Schema(
  {
    report: {
      type: Schema.Types.ObjectId,
      ref: 'Report',
      required: true,
      index: true,
    },
    modelVersion: {
      type: String,
      default: '1.0.0',
    },
    heatScore: Number,
    heatRiskLevel: {
      type: String,
      enum: ['low', 'moderate', 'high', 'extreme'],
      default: 'moderate',
    },
    dbscanClusterId: String,
    hotspotConfidence: Number,
    analysisConfidence: Number,
    qualityControlScore: Number,
    sources: {
      sensor: { type: Boolean, default: true },
      satellite: String,
      weather: String,
    },
    status: {
      type: String,
      enum: Object.values(ANALYSIS_STATUS),
      default: ANALYSIS_STATUS.PENDING,
      index: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const AIAnalysis = mongoose.model('AIAnalysis', aiAnalysisSchema);
export default AIAnalysis;
