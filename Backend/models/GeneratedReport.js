import mongoose from 'mongoose';

const { Schema } = mongoose;

const generatedReportSchema = new Schema(
  {
    reportRef: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    city: {
      type: String,
      required: true,
      index: true,
    },
    fromDate: {
      type: Date,
      required: true,
    },
    toDate: {
      type: Date,
      required: true,
    },
    pdfUrl: {
      type: String,
      required: true,
    },
    blobPath: String,
    fileSizeBytes: Number,
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    modelVersion: {
      type: String,
      default: '1.0.0',
    },
    systemVersion: {
      type: String,
      default: '1.0.0',
    },
    generatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

generatedReportSchema.index({ city: 1, fromDate: 1, toDate: 1 });

export const GeneratedReport = mongoose.model('GeneratedReport', generatedReportSchema);
export default GeneratedReport;
