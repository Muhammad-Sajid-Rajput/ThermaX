import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, ShieldCheck, Thermometer, ArrowRight, Home } from 'lucide-react';
import useUserLocationStore from '../../stores/userLocationStore';

/**
 * `/permission` — location permission explainer + request page.
 *
 * Linked from PermissionDeniedPage's "Try Again" button. Explains why
 * ThermaX needs geolocation, then triggers the browser permission prompt.
 * Success → back to where the user came from (default /report).
 * Denial → /permission/denied with recovery instructions.
 */
const PermissionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const requestLocation = useUserLocationStore((s) => s.requestLocation);
  const [requesting, setRequesting] = useState(false);

  const returnTo = location.state?.from || '/report';

  const handleGrant = async () => {
    setRequesting(true);
    try {
      const result = await requestLocation();
      if (result) {
        navigate(returnTo, { replace: true });
      } else {
        navigate('/permission/denied', { replace: true, state: { from: returnTo } });
      }
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-8 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <MapPin className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Enable Location Access
        </h2>
        <p className="text-slate-600 mb-6">
          ThermaX maps urban heat block by block. Your location lets us
          attach your report to the right neighborhood and show you the
          heat risk where you actually are.
        </p>
        <ul className="text-left text-sm text-slate-600 space-y-3 mb-8 bg-slate-50 p-4 rounded-xl">
          <li className="flex items-start gap-2">
            <Thermometer className="w-4 h-4 mt-0.5 text-orange-500 shrink-0" />
            <span>Pinpoint heat reports on the live map</span>
          </li>
          <li className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
            <span>Show hotspots and advisories near you</span>
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
            <span>
              Your reports appear publicly with snapped, coarsened
              coordinates only — no name, identity, or precise trail is ever
              shown on the public map. Your account stays linked to the
              report privately so moderators can review it and follow up if
              needed.
            </span>
          </li>
        </ul>
        <div className="space-y-3">
          <button
            onClick={handleGrant}
            disabled={requesting}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {requesting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Requesting…
              </>
            ) : (
              <>
                Grant location access <ArrowRight className="w-4 h-4" />
              </>
            )}
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

export default PermissionPage;
