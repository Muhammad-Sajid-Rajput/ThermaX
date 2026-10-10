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
      // No default: a missing city must fail validation, never silently
      // become Karachi.
      required: true,
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
      // 'unknown' is emitted by the ML clustering service when no
      // temperature measurements exist for a cluster — a legitimate value,
      // not a placeholder. Default is 'unknown' (never 'high'): a document
      // inserted without a severity must not fabricate one.
      enum: ['low', 'moderate', 'high', 'critical', 'unknown'],
      default: 'unknown',
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
    // Phase 4 support: identifies which atomic replacement run a hotspot
    // belongs to. Phase 5 replaced the isCurrent flag sweep with a
    // city-level current-run pointer (HotspotPublication); runId is the
    // join key readers use.
    runId: {
      type: String,
      index: true,
    },
    // NOTE: a previous Phase 4 `isCurrent` boolean flag field existed on
    // this schema but was never written by the pipeline and has been
    // removed entirely. The city-level current-run pointer
    // (HotspotPublication) is the sole publication mechanism; no reader
    // may reference isCurrent.
    // Phase 5 TVI-lite: Thermal Vulnerability Index (0–1) with its three
    // normalized components. Null when the component had no data — never
    // a fabricated zero.
    tvi: {
      type: Number,
      default: null,
      index: true,
    },
    tviComponents: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    tviWeightsUsed: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    tviNote: {
      type: String,
      default: null,
    },
    // Phase 6: deterministic directives + citizen advisories. Computed
    // ML-side from the TVI-lite score (riskTier) and per-hotspot context;
    // stored here so the atomic publication carries complete hotspots.
    // riskTier is the canonical tier vocabulary (low/moderate/high/critical,
    // unknown when unscored) — distinct from the temp-based `severity`.
    riskTier: {
      type: String,
      enum: ['low', 'moderate', 'high', 'critical', 'unknown'],
      default: 'unknown',
      index: true,
    },
    directives: [
      {
        _id: false,
        id: { type: String, required: true },
        text: { type: String, required: true },
      },
    ],
    advisory: {
      en: String,
      ur: String,
      tier: String,
      heatIndexBand: String,
      heatIndex: Number,
    },
    heatIndexMean: {
      type: Number,
      default: null,
    },
    directiveContext: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
  },
  { timestamps: true }
);

hotspotSchema.index({ city: 1, status: 1, severity: 1 });
hotspotSchema.index({ city: 1, runId: 1 });

export const Hotspot = mongoose.model('Hotspot', hotspotSchema);
export default Hotspot;
