import React from 'react';
import useSelectedLocation from '../../hooks/useSelectedLocation';
export const ContextModal = () => {
  const { selectedLocation, isModalOpen, closeModal } = useSelectedLocation();
  if (!isModalOpen || !selectedLocation) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedLocation.name}
            </h2>
            <button
              onClick={closeModal}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-1">{selectedLocation.address}</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Conditions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Current Conditions
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                  <span className="text-green-700 font-medium">Temperature</span>
                  <span className="text-xl font-bold text-green-900">
                    {selectedLocation.temperature}°C
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                  <span className="text-green-700 font-medium">Humidity</span>
                  <span className="text-xl font-bold text-green-900">
                    {selectedLocation.humidity}%
                  </span>
                </div>
              </div>
            </div>
            {/* Historical Analysis */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Historical Analysis
              </h3>
              <div className="bg-gray-50 p-4 rounded">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">24h Average</span>
                    <span className="font-medium">
                      {selectedLocation.temperature}°C
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Peak Today</span>
                    <span className="font-medium">
                      {selectedLocation.temperature + 2}°C
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Low Today</span>
                    <span className="font-medium">
                      {selectedLocation.temperature - 1}°C
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* AI Insights */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              AI Insights
            </h3>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="space-y-2 text-sm text-purple-800">
                <p>• Temperature patterns show consistent daily variation</p>
                <p>• Humidity levels are within optimal range</p>
                <p>• No significant anomalies detected in recent data</p>
                <p>
                  • Predicted temperatures for next 24h:{' '}
                  {selectedLocation.temperature - 1}°C to{' '}
                  {selectedLocation.temperature + 3}°C
                </p>
              </div>
            </div>
          </div>
          {/* Action Buttons */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={closeModal}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Close
            </button>
            <button className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors">
              Generate Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ContextModal;
