import mongoose from 'mongoose';

/**
 * Outlier review notifications:
 * Autonomous QC flags outlier reports (enrichment failures or extreme
 * citizen-vs-instrument temperature contradictions) for human-in-the-loop
 * review, eliminating routine moderation overhead while preserving governance.
 */
const adminNotificationSchema = new mongoose.Schema(
  {
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      required: true,
    },
    type: {
      type: String,
      enum: ['enrichment_failed', 'extreme_contradiction'],
      required: true,
    },
    reason: {
      type: String,
      default: '',
    },
    qcScore: {
      type: Number,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    readAt: {
      type: Date,
      default: null,
    },
    readBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: false,
    collection: 'admin_notifications',
  }
);

adminNotificationSchema.index({ reportId: 1, type: 1 }, { unique: true });
adminNotificationSchema.index({ readAt: 1, createdAt: -1 });

const AdminNotification = mongoose.model(
  'AdminNotification',
  adminNotificationSchema,
  'admin_notifications'
);

export default AdminNotification;
