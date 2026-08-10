import mongoose from 'mongoose';

const { Schema } = mongoose;

const alertSchema = new Schema(
  {
    hotspotId: {
      type: Schema.Types.ObjectId,
      ref: 'Hotspot',
      index: true,
    },
    triggerCondition: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ['low', 'moderate', 'high', 'critical'],
      default: 'high',
    },
    channel: {
      type: String,
      enum: ['email', 'webhook', 'sms'],
      default: 'email',
    },
    recipients: [String],
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
      index: true,
    },
    sentAt: Date,
  },
  { timestamps: true }
);

export const Alert = mongoose.model('Alert', alertSchema);
export default Alert;
