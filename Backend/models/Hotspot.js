import mongoose from 'mongoose';

const { Schema } = mongoose;

const hotspotSchema = new Schema(
  {
    clusterId: {
      type: String,
      required: true,
      index: true,
    },
    city: {
      type: String,
      default: 'Karachi',
      index: true,
    },
    district: String,
    zone: String,
    centroid: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    boundary: {
      type: {
        type: String,
        enum: ['Polygon'],
        default: 'Polygon',
      },
      coordinates: [[[Number]]],
    },
    avgTemp: Number,
    peakTemp: Number,
    reportCount: Number,
    memberReportIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Report',
      },
    ],
    severity: {
      type: String,
      enum: ['low', 'moderate', 'high', 'critical'],
      default: 'high',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'monitoring', 'resolved'],
      default: 'active',
      index: true,
    },
    detectedAt: {
      type: Date,
      default: Date.now,
    },
    detectionRun: String,
  },
  { timestamps: true }
);

hotspotSchema.index({ city: 1, status: 1, severity: 1 });

export const Hotspot = mongoose.model('Hotspot', hotspotSchema);
export default Hotspot;
