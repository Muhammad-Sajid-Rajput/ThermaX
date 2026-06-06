import mongoose from 'mongoose';

const weatherSchema = new mongoose.Schema(
  {
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    geoPoint: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    cacheKey: { type: String, index: true },
    locationName: String,
    country: String,
    temperature: Number,
    humidity: Number,
    feelsLike: Number,
    heatIndex: Number,
    uv: Number,
    windKph: Number,
    condition: String,
    source: { type: String, default: 'weatherapi' },
    observedAt: Date,
    fetchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

weatherSchema.pre('save', function syncGeoPoint(next) {
  if (this.coordinates?.lat != null && this.coordinates?.lng != null) {
    this.geoPoint = {
      type: 'Point',
      coordinates: [this.coordinates.lng, this.coordinates.lat],
    };
  }
  next();
});

weatherSchema.index({ geoPoint: '2dsphere' });
weatherSchema.index({ cacheKey: 1, fetchedAt: -1 });
weatherSchema.index({ 'coordinates.lat': 1, 'coordinates.lng': 1, fetchedAt: -1 });

const Weather = mongoose.model('Weather', weatherSchema);

export default Weather;
