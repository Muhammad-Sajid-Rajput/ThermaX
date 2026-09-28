import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, Copy, Map, Home } from 'lucide-react';
import { toast } from 'react-hot-toast';
const SubmissionStatusPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Status comes from location state when the submission flow navigates here.
  // No fallback ID is invented: without real state we say so honestly.
  const state = location.state || null;

  if (!state) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] py-8 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            No submission data
          </h2>
          <p className="text-slate-600 mb-8">
            This page is shown right after a report is submitted. If you came
            here directly, there is nothing to display. Submit a report or
            check your reports to see their status.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/report')}
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors"
            >
              Submit a Report
            </button>
            <button
              onClick={() => navigate('/my-reports')}
              className="w-full py-3 px-4 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors border border-slate-200"
            >
              <Home className="w-4 h-4 inline mr-2" /> My Reports
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-8 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        {state.status === 'valid' ? (
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8" />
          </div>
        ) : (
          <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8" />
          </div>
        )}
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {state.status === 'valid'
            ? 'Report Submitted Successfully'
            : 'Report Under Review'}
        </h2>
        <p className="text-slate-600 mb-8">
          {state.status === 'valid'
            ? 'Your heat vulnerability report has been received and queued for quality checks.'
            : 'Your submission was flagged as a potential anomaly or duplicate and is awaiting manual review.'}
        </p>
        <div className="bg-slate-50 p-4 rounded-xl text-left mb-8 space-y-3">
          <div className="flex justify-between items-center pb-3 border-b border-slate-200">
            <span className="text-sm text-slate-500">Submission ID</span>
            <span className="font-mono text-sm font-semibold text-slate-900 flex items-center gap-2">
              {state.id}
              <button
                type="button"
                onClick={() => {
                  if (state.id) {
                    navigator.clipboard?.writeText(state.id);
                    toast.success('Copied submission ID to clipboard');
                  }
                }}
                className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors"
                title="Copy ID"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-slate-200">
            <span className="text-sm text-slate-500">Status</span>
            <span className="text-sm font-semibold capitalize px-2 py-1 bg-white rounded-md border border-slate-200">
              {state.status}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500">Timestamp</span>
            <span className="text-sm font-medium text-slate-900">
              {new Date(state.timestamp).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Map className="w-4 h-4" /> View Map Dashboard
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 px-4 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-200"
          >
            <Home className="w-4 h-4" /> Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
export default SubmissionStatusPage;
