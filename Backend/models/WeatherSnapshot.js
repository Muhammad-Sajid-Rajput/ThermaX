import mongoose from 'mongoose';

const { Schema } = mongoose;

const weatherSnapshotSchema = new Schema(
  {
    report: {
      type: Schema.Types.ObjectId,
      ref: 'Report',
      required: true,
      index: true,
    },
    windSpeed: Number,
    heatIndex: Number,
    uvIndex: Number,
    weatherCondition: String,
    airQuality: {
      aqi: Number,
      source: String,
    },
    source: {
      type: String,
      default: 'OpenWeatherMap',
    },
    fetchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const WeatherSnapshot = mongoose.model('WeatherSnapshot', weatherSnapshotSchema);
export default WeatherSnapshot;
