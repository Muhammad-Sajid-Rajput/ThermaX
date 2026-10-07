import mongoose from 'mongoose';

const { Schema } = mongoose;

// Phase 5 reader-atomic publication pointer: exactly one document per
// city. The ML pipeline flips currentRunId in a single-document upsert
// AFTER inserting the new run's hotspot docs, so readers (which resolve
// this pointer first) always see one complete run — never a torn set.
// previousRunId is retained for one extra tick to protect readers that
// resolved the pointer just before the flip.
const hotspotPublicationSchema = new Schema(
  {
    city: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    currentRunId: {
      type: String,
      required: true,
    },
    previousRunId: {
      type: String,
      default: null,
    },
  },
  {
    collection: 'hotspot_publications',
    timestamps: { createdAt: true, updatedAt: true },
  }
);

export const HotspotPublication = mongoose.model(
  'HotspotPublication',
  hotspotPublicationSchema,
  'hotspot_publications'
);
export default HotspotPublication;
