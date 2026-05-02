import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: String,
    userEmail: String,
    userRole: String,
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    areaName: String,
    severity: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    temperature: Number,
    description: String,
    category: {
      type: String,
      default: 'Heat observation',
    },
    source: {
      type: String,
      default: 'Citizen',
    },
    status: {
      type: String,
      enum: ['pending', 'validated', 'rejected', 'anomaly'],
      default: 'pending',
    },
    image: String, // URL or base64
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Report = mongoose.model('Report', reportSchema);

export default Report;
