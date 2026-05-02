import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
const PermissionDeniedPage = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-8 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Location Access Denied
        </h2>
        <p className="text-slate-600 mb-8">
          We cannot proceed with your report without location access. This is
          necessary to pinpoint heat vulnerabilities on the map.
        </p>
        <p className="text-sm text-slate-500 mb-8 bg-slate-50 p-4 rounded-xl">
          If you previously denied access, you may need to check your browser's
          site settings to re-enable location permissions for ThermaX.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => navigate('/permission')}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 px-4 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-200"
          >
            <Home className="w-4 h-4" /> Return Home
          </button>
        </div>
      </div>
    </div>
  );
};
export default PermissionDeniedPage;
