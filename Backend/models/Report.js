import mongoose from 'mongoose';
import { REPORT_CATEGORIES } from '../constants/categories.js';
import { normalizeStatus } from '../utils/reportLifecycle.js';

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
    status: {
      type: String,
      enum: ['pending', 'verified', 'flagged', 'rejected'],
      default: 'pending',
      index: true,
    },
    areaName: String,
    district: String,
    city: {
      type: String,
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(REPORT_CATEGORIES),
      default: REPORT_CATEGORIES.URBAN_HEAT_ISLAND,
    },
    description: String,
    // Citizen-supplied context the frontend collects (Phase 3: persisted,
    // previously dropped on the floor).
    causes: {
      type: [String],
      default: [],
    },
    observedAt: {
      type: Date,
      default: null,
    },
    // Privacy-preserving snapped coordinates (see anonymizationService).
    snappedLocation: {
      lat: Number,
      lng: Number,
    },
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
    // Provenance anchor: this system never writes fabricated measurements,
    // so this is always false. It exists so the guarantee is queryable.
    isSynthetic: {
      type: Boolean,
      default: false,
      index: true,
    },
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
    // Preserve null/undefined: Number(null) === 0 would fabricate a reading.
    this.ambientTemp = val == null ? val : Number(val);
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

// Normalize legacy statuses ('validated' → 'verified', 'anomaly' →
// 'flagged') in pre('validate') so pre-Phase-3 rows pass the new enum and
// keep working under the lifecycle.
reportSchema.pre('validate', function (next) {
  if (this.status) {
    const normalized = normalizeStatus(this.status);
    if (normalized !== this.status) this.status = normalized;
  }
  next();
});

reportSchema.index({ latitude: 1, longitude: 1 });
reportSchema.index({ createdAt: -1 });

export const Report = mongoose.model('Report', reportSchema);
export default Report;
