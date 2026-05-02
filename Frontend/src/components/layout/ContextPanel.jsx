import React from 'react';
import useSelectedLocation from '../../hooks/useSelectedLocation';
import {
  X,
  MapPin,
  Thermometer,
  Droplets,
  Clock,
  TrendingUp,
} from 'lucide-react';
export const ContextPanel = () => {
  const { selectedLocation, isPanelOpen, clearLocation } =
    useSelectedLocation();
  if (!isPanelOpen) return null;
  return (
    <div className="bg-white h-full flex flex-col">
      <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          Location Context
        </h3>
        {selectedLocation && (
          <button
            onClick={clearLocation}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="p-6 overflow-y-auto flex-1">
        {selectedLocation ? (
          <div className="space-y-6">
            <div className="flex gap-3">
              <div className="mt-1">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 leading-tight">
                  {selectedLocation.name}
                </h4>
                <p className="text-sm text-slate-500 mt-1 leading-snug">
                  {selectedLocation.address}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-1 transition-colors hover:bg-slate-100">
                <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                  <Thermometer className="w-4 h-4 text-orange-500" /> Temp
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {selectedLocation.temperature}°C
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-1 transition-colors hover:bg-slate-100">
                <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                  <Droplets className="w-4 h-4 text-green-500" /> Humidity
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {selectedLocation.humidity}%
                </div>
              </div>
            </div>
            <div className="pt-6 border-t border-slate-100 space-y-4">
              <h5 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" /> Historical Trend
              </h5>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-sm text-slate-500">24h Average</span>
                  <span className="font-semibold text-slate-900">
                    {selectedLocation.temperature}°C
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-sm text-slate-500">Peak Today</span>
                  <span className="font-semibold text-red-600 flex items-center gap-1">
                    {selectedLocation.temperature + 2}°C{' '}
                    <TrendingUp className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center pb-12">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-slate-300" />
            </div>
            <h4 className="text-base font-semibold text-slate-900 mb-1">
              No Location Selected
            </h4>
            <p className="text-sm text-slate-500 max-w-50">
              Click on the map to view detailed environmental context.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
export default ContextPanel;
