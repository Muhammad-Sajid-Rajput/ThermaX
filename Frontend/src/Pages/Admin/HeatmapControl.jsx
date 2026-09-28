import { useState, useEffect, useMemo, useCallback } from 'react';
import { AdminPanel, HotspotDetailPanel } from '../../components/admin';
import MapSection from '../../components/dashboard/MapSection';
import { toast } from 'react-hot-toast';
import {
  Map as MapIcon,
  RefreshCw,
  Flame,
  Activity,
  Zap,
  MapPin,
} from 'lucide-react';
import { fetchHeatmap, fetchHotspots, fetchReports } from '../../services/api';

// Static province list — module-level so its identity is stable across
// renders. (Defined inside the component it would be a fresh array every
// render, defeating the useMemo hooks that depend on it.)
const PROVINCES = [
    {
      id: 'all',
      name: 'Pakistan (All)',
      coords: [30.3753, 69.3451],
      zoom: 6,
      bounds: { minLat: 23.5, maxLat: 37.1, minLng: 60.8, maxLng: 77.8 },
    },
    {
      id: 'punjab',
      name: 'Punjab',
      coords: [31.1704, 72.7097],
      zoom: 7,
      bounds: { minLat: 27.7, maxLat: 34.0, minLng: 69.3, maxLng: 75.4 },
    },
    {
      id: 'sindh',
      name: 'Sindh',
      coords: [25.8943, 68.5247],
      zoom: 7,
      bounds: { minLat: 23.5, maxLat: 28.5, minLng: 66.5, maxLng: 71.2 },
    },
    {
      id: 'kpk',
      name: 'Khyber Pakhtunkhwa',
      coords: [34.0151, 71.5249],
      zoom: 7,
      bounds: { minLat: 31.2, maxLat: 36.9, minLng: 69.2, maxLng: 74.1 },
    },
    {
      id: 'balochistan',
      name: 'Balochistan',
      coords: [28.4907, 65.0958],
      zoom: 6.5,
      bounds: { minLat: 24.8, maxLat: 32.1, minLng: 60.8, maxLng: 70.3 },
    },
    {
      id: 'islamabad',
      name: 'Islamabad Capital Territory',
      coords: [33.6844, 73.0479],
      zoom: 11,
      bounds: { minLat: 33.4, maxLat: 33.9, minLng: 72.8, maxLng: 73.4 },
    },
    {
      id: 'gilgit',
      name: 'Gilgit-Baltistan',
      coords: [35.8026, 74.9832],
      zoom: 7.5,
      bounds: { minLat: 34.8, maxLat: 37.1, minLng: 72.5, maxLng: 77.8 },
    },
    {
      id: 'ajk',
      name: 'Azad Jammu & Kashmir',
      coords: [33.9259, 73.7810],
      zoom: 8,
      bounds: { minLat: 32.9, maxLat: 35.1, minLng: 73.4, maxLng: 75.3 },
    },
];

function HeatmapControl() {
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [customCenter, setCustomCenter] = useState(null);
  const [loading, setLoading] = useState(true);

  const [heatmapData, setHeatmapData] = useState([]);
  const [hotspotsData, setHotspotsData] = useState([]);
  const [reportsData, setReportsData] = useState([]);
  // Phase 6: which hotspot's TVI + directive detail is expanded in the feed.
  const [expandedHotspotId, setExpandedHotspotId] = useState(null);

  // Stable identity (module-level PROVINCES) so dependent useMemos work.
  const provinces = PROVINCES;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [heatRes, hotRes, repRes] = await Promise.all([
        fetchHeatmap().catch(() => ({ data: [] })),
        fetchHotspots().catch(() => ({ data: [] })),
        fetchReports().catch(() => ({ data: [] })),
      ]);

      const hPoints = heatRes?.data || [];
      const hSpots = hotRes?.data || [];
      const rList = repRes?.data || [];

      setHeatmapData(hPoints);
      setHotspotsData(hSpots);
      setReportsData(rList);
    } catch (err) {
      console.error('Error fetching heatmap datasets:', err);
      toast.error('Failed to load spatial layers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentProvince = useMemo(() => {
    return provinces.find((p) => p.id === selectedProvince) || provinces[0];
  }, [selectedProvince, provinces]);

  const formattedReports = useMemo(() => {
    return reportsData
      .map((r) => ({
        ...r,
        id: r._id || r.id || 'Report',
        area: r.areaName || r.area || 'Unknown area',
        severity: r.severityLevel || r.severity || 3,
        coordinates: [
          r.latitude ?? r.location?.lat ?? null,
          r.longitude ?? r.location?.lng ?? null,
        ],
      }))
      // Never pin reports without coordinates at a fabricated city center:
      // they are not plotted on the map at all.
      .filter(
        (r) =>
          Number.isFinite(r.coordinates[0]) && Number.isFinite(r.coordinates[1])
      );
  }, [reportsData]);

  const unlocatableReports = reportsData.length - formattedReports.length;

  // Spatial filters according to selected province bounds
  const filteredHotspots = useMemo(() => {
    if (selectedProvince === 'all') return hotspotsData;
    const b = currentProvince.bounds;
    if (!b) return hotspotsData;
    return hotspotsData.filter((hs) => {
      const lat = hs.latitude || hs.location?.lat || hs.centroid?.lat || hs.lat;
      const lng = hs.longitude || hs.location?.lng || hs.centroid?.lng || hs.lng;
      if (!lat || !lng) return false;
      return lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng;
    });
  }, [selectedProvince, currentProvince, hotspotsData]);

  const filteredReports = useMemo(() => {
    if (selectedProvince === 'all') return formattedReports;
    const b = currentProvince.bounds;
    if (!b) return formattedReports;
    return formattedReports.filter((r) => {
      const [lat, lng] = r.coordinates || [];
      if (!lat || !lng) return false;
      return lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng;
    });
  }, [selectedProvince, currentProvince, formattedReports]);

  const filteredHeatmap = useMemo(() => {
    if (selectedProvince === 'all') return heatmapData;
    const b = currentProvince.bounds;
    if (!b) return heatmapData;
    return heatmapData.filter((p) => {
      const lat = p.lat ?? p[0];
      const lng = p.lng ?? p[1];
      if (lat == null || lng == null) return false;
      return lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng;
    });
  }, [selectedProvince, currentProvince, heatmapData]);

  const stats = useMemo(() => {
    const criticalHotspots = filteredHotspots.filter(
      (h) => h.priority === 'Critical' || (h.severity && h.severity >= 4)
    ).length;

    return {
      heatPoints: filteredHeatmap.length,
      activeHotspots: filteredHotspots.length,
      criticalHotspots,
      totalReports: filteredReports.length,
    };
  }, [filteredHeatmap, filteredHotspots, filteredReports]);

  const handleSelectProvince = (provinceId) => {
    setSelectedProvince(provinceId);
    setCustomCenter(null);
  };

  const handleFocusHotspot = (hs) => {
    const lat = hs.latitude || hs.location?.lat || hs.centroid?.lat || hs.lat;
    const lng = hs.longitude || hs.location?.lng || hs.centroid?.lng || hs.lng;
    if (lat && lng) {
      setCustomCenter([lat, lng]);
      toast.success(`Centered on ${hs.name || hs.area || 'Hotspot Zone'}`);
    }
  };

  const activeCenter = customCenter || currentProvince.coords;
  const activeZoom = customCenter ? 14 : currentProvince.zoom;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Heatmap & Hotspots</h1>
          <p className="text-slate-500 text-sm">
            Live urban heat intensity, cluster hotspots, and geolocated citizen reports
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedProvince}
              onChange={(e) => handleSelectProvince(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 font-semibold focus:outline-none focus:border-emerald-600 shadow-2xs"
            >
              {provinces.map((prov) => (
                <option key={prov.id} value={prov.id}>
                  {prov.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-xs font-semibold shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Map (2 Cols) + Active Hotspots (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Map */}
        <div className="lg:col-span-2 h-140 flex flex-col overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-white">
          <MapSection
            key={`${currentProvince.id}-${activeCenter.join(',')}`}
            heatmap={filteredHeatmap}
            hotspots={filteredHotspots}
            reports={filteredReports}
            title={`Urban Heat Map — ${currentProvince.name}`}
            initialCenter={activeCenter}
            initialZoom={activeZoom}
            showHeatmap={true}
            showHotspots={true}
            showMarkers={true}
            disableLegend={true}
          />
          {unlocatableReports > 0 && (
            <p className="px-4 py-2 text-[11px] text-slate-400 bg-white border-t border-slate-100">
              {unlocatableReports} report{unlocatableReports === 1 ? '' : 's'} without
              location data {unlocatableReports === 1 ? 'is' : 'are'} not shown on the map.
            </p>
          )}
        </div>

        {/* Hotspots Feed Panel */}
        <AdminPanel
          title="Active Hotspot Zones"
          subtitle={`${filteredHotspots.length} clusters in ${currentProvince.name}`}
          icon={Flame}
          iconColor="orange"
          className="flex flex-col h-140"
        >
          <div className="space-y-3 overflow-y-auto flex-1 pr-1">
            {filteredHotspots.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No active hotspot clusters in {currentProvince.name}.
              </div>
            ) : (
              filteredHotspots.map((hs, idx) => {
                const priority = hs.priority || (hs.severity >= 4 ? 'Critical' : 'High');
                const badgeColor =
                  priority === 'Critical'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : priority === 'High'
                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200';
                const hsKey = hs.id || hs._id || idx;
                const isExpanded = expandedHotspotId === hsKey;
                return (
                  <div
                    key={hsKey}
                    onClick={() => {
                      handleFocusHotspot(hs);
                      setExpandedHotspotId(isExpanded ? null : hsKey);
                    }}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 bg-white hover:bg-slate-50/50 transition-all duration-150 cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-semibold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                        {hs.name || hs.area || 'Hotspot Zone'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                        {priority}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{hs.reportCount ?? 1} reports mapped</span>
                      <span className="font-mono font-medium text-slate-700">
                        {hs.avgTemp ?? hs.avgTemperature ? `${hs.avgTemp ?? hs.avgTemperature}°C` : 'Elevated'}
                      </span>
                    </div>
                    {/* Phase 6: TVI breakdown + directive checklist */}
                    {isExpanded && <HotspotDetailPanel hotspot={hs} />}
                  </div>
                );
              })
            )}
          </div>
        </AdminPanel>
      </div>

      {/* Map Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              Active Hotspots
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.activeHotspots}</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <Zap className="w-4 h-4 text-red-500" />
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              Critical Clusters
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.criticalHotspots}</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              Reports Mapped
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.totalReports}</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <MapIcon className="w-4 h-4 text-blue-500" />
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              Heat Points
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.heatPoints}</p>
        </div>
      </div>
    </div>
  );
}

export default HeatmapControl;
