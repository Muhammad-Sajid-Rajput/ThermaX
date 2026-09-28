import mongoose from 'mongoose';

/**
 * Phase 4 dead-letter record: when the backend cannot reach the ML service
 * after all retries, the failure is persisted here instead of being
 * swallowed. Admins see open failures on the dashboard; the entry is
 * marked resolved automatically when a later trigger for the same report
 * succeeds (or dismissed manually).
 */
const enrichmentFailureSchema = new mongoose.Schema(
  {
    report: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      required: true,
    },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: '' },
    lastAttemptAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['open', 'resolved', 'dismissed'],
      default: 'open',
    },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

enrichmentFailureSchema.index({ status: 1, lastAttemptAt: -1 });

const EnrichmentFailure = mongoose.model('EnrichmentFailure', enrichmentFailureSchema);

export default EnrichmentFailure;
