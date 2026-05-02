import { useState, useEffect } from 'react';
import { AdminPanel } from '../../components/admin';
import {
  Map,
  Layers,
  Filter,
  Eye,
  EyeOff,
  Thermometer,
  Zap,
  Wind,
  Droplets,
  Activity,
  Download,
  RefreshCw,
  MapPin,
  Crosshair,
  Square,
  Circle,
  Hexagon,
  Shield,
  Flame,
} from 'lucide-react';
function HeatmapControl() {
  const [activeLayers, setActiveLayers] = useState({
    heatmap: true,
    reports: true,
    hotspots: true,
    boundaries: false,
    satellite: false,
  });
  const [thresholds, setThresholds] = useState({
    critical: 40,
    high: 35,
    moderate: 30,
    low: 25,
  });
  const [selectedArea, setSelectedArea] = useState('all');
  const [timeRange, setTimeRange] = useState('24h');
  const areas = [
    { id: 'all', name: 'All Areas' },
    { id: 'korangi', name: 'Korangi Industrial' },
    { id: 'saddar', name: 'Saddar' },
    { id: 'gulshan', name: 'Gulshan-e-Iqbal' },
    { id: 'dha', name: 'DHA' },
    { id: 'landhi', name: 'Landhi' },
    { id: 'clifton', name: 'Clifton' },
    { id: 'north', name: 'North Nazimabad' },
  ];
  const toggleLayer = (layer) => {
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };
  const layerConfigs = [
    {
      id: 'heatmap',
      name: 'Heat Intensity',
      icon: Thermometer,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
    },
    {
      id: 'reports',
      name: 'User Reports',
      icon: Activity,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
    },
    {
      id: 'hotspots',
      name: 'Critical Hotspots',
      icon: Zap,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
    },
    {
      id: 'boundaries',
      name: 'Area Boundaries',
      icon: Square,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
    },
    {
      id: 'satellite',
      name: 'Satellite View',
      icon: Map,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
    },
  ];
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Heatmap Control</h1>
          <p className="text-slate-500">
            Configure map layers and visualization settings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors">
            <Download className="w-4 h-4" />
            Export Map
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Map Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Map Visualization */}
          <AdminPanel
            title="Live Heatmap"
            subtitle="Real-time heat intensity visualization"
            icon={Map}
            iconColor="orange"
            className="h-125"
          >
            <div className="relative h-full rounded-xl overflow-hidden bg-[#1a1f2e]">
              {/* Grid background */}
              <div className="absolute inset-0 opacity-20">
                <svg width="100%" height="100%">
                  <defs>
                    <pattern
                      id="mapgrid"
                      width="40"
                      height="40"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 40 0 L 0 0 0 40"
                        fill="none"
                        stroke="#374151"
                        strokeWidth="0.5"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#mapgrid)" />
                </svg>
              </div>
              {/* Simulated heat zones */}
              {activeLayers.heatmap && (
                <>
                  <div className="absolute top-[20%] left-[30%] w-32 h-32 rounded-full bg-red-500/40 blur-2xl animate-pulse"></div>
                  <div className="absolute top-[40%] right-[25%] w-24 h-24 rounded-full bg-orange-500/30 blur-2xl"></div>
                  <div className="absolute bottom-[30%] left-[40%] w-20 h-20 rounded-full bg-yellow-500/30 blur-2xl"></div>
                  <div className="absolute top-[60%] left-[60%] w-16 h-16 rounded-full bg-orange-500/35 blur-2xl animate-pulse"></div>
                </>
              )}
              {/* Hotspot markers */}
              {activeLayers.hotspots && (
                <>
                  <div className="absolute top-[20%] left-[30%] transform -translate-x-1/2 -translate-y-1/2">
                    <div className="relative">
                      <div className="w-4 h-4 bg-red-500 rounded-full animate-ping absolute"></div>
                      <div className="w-4 h-4 bg-red-500 rounded-full relative border-2 border-white"></div>
                    </div>
                  </div>
                  <div className="absolute top-[40%] right-[25%] transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full border-2 border-white"></div>
                  </div>
                </>
              )}
              {/* Report markers */}
              {activeLayers.reports && (
                <>
                  <div className="absolute top-[35%] left-[45%] w-2 h-2 bg-green-400 rounded-full"></div>
                  <div className="absolute top-[50%] left-[35%] w-2 h-2 bg-green-400 rounded-full"></div>
                  <div className="absolute top-[45%] left-[55%] w-2 h-2 bg-green-400 rounded-full"></div>
                  <div className="absolute top-[25%] left-[50%] w-2 h-2 bg-green-400 rounded-full"></div>
                </>
              )}
              {/* Area labels */}
              <div className="absolute top-[20%] left-[30%] transform -translate-x-1/2 -translate-y-8">
                <span className="px-2 py-1 bg-gray-900/90 rounded text-xs text-white font-medium whitespace-nowrap">
                  Korangi Industrial
                </span>
              </div>
              <div className="absolute top-[40%] right-[25%] transform -translate-x-1/2 -translate-y-8">
                <span className="px-2 py-1 bg-gray-900/90 rounded text-xs text-white font-medium whitespace-nowrap">
                  Saddar
                </span>
              </div>
              <div className="absolute bottom-[30%] left-[40%] transform -translate-x-1/2 translate-y-6">
                <span className="px-2 py-1 bg-slate-800/90 rounded text-xs text-white font-medium whitespace-nowrap">
                  DHA
                </span>
              </div>
              <div className="absolute top-[60%] left-[60%] transform -translate-x-1/2 -translate-y-8">
                <span className="px-2 py-1 bg-slate-800/90 rounded text-xs text-white font-medium whitespace-nowrap">
                  Landhi
                </span>
              </div>
              {/* Legend */}
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-slate-200 shadow-lg">
                <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">
                  Heat Intensity
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-600"></div>
                    <span className="text-xs text-slate-700 font-medium">
                      ≥ 40°C Critical
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-xs text-slate-700 font-medium">
                      35-40°C High
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-xs text-slate-700 font-medium">
                      30-35°C Moderate
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-xs text-slate-700 font-medium">
                      &lt; 30°C Normal
                    </span>
                  </div>
                </div>
              </div>
              {/* Zoom controls */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button className="w-10 h-10 rounded-lg bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 flex items-center justify-center transition-colors shadow-sm">
                  <Filter className="w-5 h-5" />
                </button>
                <button className="w-10 h-10 rounded-lg bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 flex items-center justify-center transition-colors shadow-sm">
                  <MapPin className="w-5 h-5" />
                </button>
                <button className="w-10 h-10 rounded-lg bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 flex items-center justify-center transition-colors shadow-sm">
                  <Shield className="w-5 h-5" />
                </button>
              </div>
            </div>
          </AdminPanel>
          {/* Map Statistics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Thermometer className="w-4 h-4 text-red-500" />
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Avg Temperature
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900">37.2°C</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Active Hotspots
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900">23</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Map className="w-4 h-4 text-green-500" />
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Reports Today
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900">186</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Coverage
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900">94%</p>
            </div>
          </div>
        </div>
        {/* Controls Sidebar */}
        <div className="space-y-6">
          {/* Layer Controls */}
          <AdminPanel
            title="Map Layers"
            subtitle="Toggle visualization layers"
            icon={Layers}
            iconColor="blue"
          >
            <div className="space-y-2">
              {layerConfigs.map((layer) => {
                const Icon = layer.icon;
                const isActive = activeLayers[layer.id];
                return (
                  <button
                    key={layer.id}
                    onClick={() => toggleLayer(layer.id)}
                    className={`
w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200
${isActive ? 'bg-slate-50 border border-slate-200' : 'bg-transparent hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${layer.bgColor} ${layer.color}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span
                        className={`text-sm font-semibold ${isActive ? 'text-slate-900' : 'text-slate-400'}`}
                      >
                        {layer.name}
                      </span>
                    </div>
                    {isActive ? (
                      <Eye className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </AdminPanel>
          {/* Filters */}
          <AdminPanel
            title="Filters"
            subtitle="Filter map data"
            icon={Filter}
            iconColor="purple"
          >
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-500 mb-2 block font-medium">
                  Area Selection
                </label>
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-green-600 transition-colors"
                >
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-500 mb-2 block font-medium">
                  Time Range
                </label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-green-600 transition-colors"
                >
                  <option value="1h">Last 1 hour</option>
                  <option value="6h">Last 6 hours</option>
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                </select>
              </div>
            </div>
          </AdminPanel>
          {/* Threshold Controls */}
          <AdminPanel
            title="Threshold Settings"
            subtitle="Heat level thresholds"
            icon={Thermometer}
            iconColor="red"
          >
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-red-400">Critical (≥°C)</label>
                  <span className="text-sm text-slate-900 font-mono font-bold">
                    {thresholds.critical}°C
                  </span>
                </div>
                <input
                  type="range"
                  min="35"
                  max="50"
                  value={thresholds.critical}
                  onChange={(e) =>
                    setThresholds((prev) => ({
                      ...prev,
                      critical: parseInt(e.target.value),
                    }))
                  }
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-orange-400">High (≥°C)</label>
                  <span className="text-sm text-slate-900 font-mono font-bold">
                    {thresholds.high}°C
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="40"
                  value={thresholds.high}
                  onChange={(e) =>
                    setThresholds((prev) => ({
                      ...prev,
                      high: parseInt(e.target.value),
                    }))
                  }
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-yellow-400">
                    Moderate (≥°C)
                  </label>
                  <span className="text-sm text-slate-900 font-mono font-bold">
                    {thresholds.moderate}°C
                  </span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="35"
                  value={thresholds.moderate}
                  onChange={(e) =>
                    setThresholds((prev) => ({
                      ...prev,
                      moderate: parseInt(e.target.value),
                    }))
                  }
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
              </div>
              <button className="w-full mt-4 py-2.5 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-colors shadow-md">
                Apply Thresholds
              </button>
            </div>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}
export default HeatmapControl;
