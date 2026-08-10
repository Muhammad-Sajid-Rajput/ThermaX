import mongoose from 'mongoose';
import { REPORT_CATEGORIES } from '../constants/categories.js';

const { Schema } = mongoose;

const reportSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    severityLevel: {
      type: Number,
      min: 1,
      max: 5,
    },
    ambientTemp: Number,
    surfaceTemp: Number,
    humidity: Number,
    images: [String],
    image: String,
    status: {
      type: String,
      enum: ['pending', 'verified', 'validated', 'rejected', 'anomaly'],
      default: 'pending',
      index: true,
    },
    areaName: String,
    district: String,
    city: {
      type: String,
      default: 'Karachi',
      index: true,
    },
    category: {
      type: String,
      default: REPORT_CATEGORIES.URBAN_HEAT_ISLAND,
    },
    description: String,
    source: {
      type: String,
      default: 'Citizen',
    },

    // References to sibling enrichment models
    weatherSnapshotRef: {
      type: Schema.Types.ObjectId,
      ref: 'WeatherSnapshot',
    },
    satelliteAnalysisRef: {
      type: Schema.Types.ObjectId,
      ref: 'SatelliteAnalysis',
    },
    aiAnalysisRef: {
      type: Schema.Types.ObjectId,
      ref: 'AIAnalysis',
    },

    reportRef: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    deviceId: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  }
);

// Compatibility virtual getters/setters for Frontend
reportSchema
  .virtual('location')
  .get(function () {
    return {
      lat: this.latitude ?? this.get('location.lat'),
      lng: this.longitude ?? this.get('location.lng'),
    };
  })
  .set(function (loc) {
    if (loc && typeof loc === 'object') {
      if (loc.lat !== undefined) this.latitude = Number(loc.lat);
      if (loc.lng !== undefined) this.longitude = Number(loc.lng);
    }
  });

reportSchema
  .virtual('severity')
  .get(function () {
    return this.severityLevel;
  })
  .set(function (val) {
    this.severityLevel = Number(val);
  });

reportSchema
  .virtual('temperature')
  .get(function () {
    return this.ambientTemp;
  })
  .set(function (val) {
    this.ambientTemp = Number(val);
  });

reportSchema.virtual('area').get(function () {
  return this.areaName;
});

reportSchema.virtual('coordinates').get(function () {
  return [this.latitude, this.longitude];
});

reportSchema.virtual('timestamp').get(function () {
  return this.createdAt || new Date();
});

reportSchema.pre('save', function (next) {
  if (!this.user && this.userId) {
    this.user = this.userId;
  }
  if (!this.userId && this.user) {
    this.userId = this.user;
  }
  if (!this.severityLevel && this.severity) {
    this.severityLevel = this.severity;
  }
  if (!this.ambientTemp && this.temperature) {
    this.ambientTemp = this.temperature;
  }
  next();
});

reportSchema.index({ latitude: 1, longitude: 1 });
reportSchema.index({ createdAt: -1 });

export const Report = mongoose.model('Report', reportSchema);
export default Report;
