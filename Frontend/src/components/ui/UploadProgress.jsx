import { AlertTriangle } from 'lucide-react';

/**
 * Upload progress + failure display for the report-submission flow.
 *
 * `progress` — 0..100 while the photo uploads; null when idle.
 * `error`    — safe, user-facing message string (see
 *              getSubmissionErrorMessage in services/api.js) shown when the
 *              submission fails. Renders nothing when both are null.
 */
export default function UploadProgress({ progress, error }) {
  if (error) {
    return (
      <div
        role="alert"
        className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3"
      >
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-red-800 mb-0.5">Upload failed</p>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (progress == null) return null;

  return (
    <div
      className="mt-3"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Photo upload progress"
    >
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
        <span>{progress >= 100 ? 'Upload complete' : 'Uploading photo…'}</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
