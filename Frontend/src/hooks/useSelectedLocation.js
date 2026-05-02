import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
// Initial location data structure
const initialLocation = {
  name: 'Downtown District',
  coordinates: { lat: 24.8607, lng: 67.0011 },
  severity: 4.2,
  riskLevel: 'High Risk',
  reports: 12,
  population: '~45,000',
  areaSize: '2.4 km²',
  trends: {
    change24h: '+12%',
    change7d: '+5%',
    peakTime: '2:00 PM',
  },
  breakdown: {
    critical: 3,
    high: 8,
    medium: 15,
    low: 22,
  },
  historicalData: [],
  aiInsights: [],
};
// Create Zustand store for selected location state
const useSelectedLocation = create(
  devtools(
    (set) => ({
      // State
      selectedLocation: null,
      isPanelOpen: false, // Default closed
      isModalOpen: false,
      showTooltip: false,
      tooltipPosition: { x: 0, y: 0 },
      // Actions
      selectLocation: (location) => {
        set({
          selectedLocation: { ...initialLocation, ...location },
          isPanelOpen: false,
          showTooltip: true,
        });
      },
      clearLocation: () => {
        set({
          selectedLocation: null,
          showTooltip: false,
          isModalOpen: false,
          isPanelOpen: false,
        });
      },
      togglePanel: () => {
        set((state) => ({ isPanelOpen: !state.isPanelOpen }));
      },
      openPanel: () => {
        set({ isPanelOpen: true });
      },
      closePanel: () => {
        set({ isPanelOpen: false });
      },
      openModal: () => {
        set({ isModalOpen: true });
      },
      closeModal: () => {
        set({ isModalOpen: false });
      },
      showTooltipAt: (x, y) => {
        set({ showTooltip: true, tooltipPosition: { x, y } });
      },
      hideTooltip: () => {
        set({ showTooltip: false });
      },
      // Update location data (for real-time updates)
      updateLocationData: (updates) => {
        set((state) => ({
          selectedLocation: state.selectedLocation
            ? { ...state.selectedLocation, ...updates }
            : null,
        }));
      },
      // Generate mock historical data for charts
      generateHistoricalData: () => {
        const data = [];
        const now = new Date();
        for (let i = 30; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          data.push({
            date: date.toISOString().split('T')[0],
            severity: Math.random() * 2 + 3, // 3-5 range
            reports: Math.floor(Math.random() * 20) + 5,
            temperature: Math.random() * 10 + 25, // 25-35°C range
          });
        }
        return data;
      },
      // Generate mock AI insights
      generateAIInsights: () => {
        return [
          {
            type: 'warning',
            title: 'Escalating Risk Pattern',
            description:
              'Severity has increased by 15% over the past 3 days. Consider increased monitoring.',
            priority: 'high',
          },
          {
            type: 'recommendation',
            title: 'Optimal Response Time',
            description:
              'Based on historical data, early afternoon interventions show 40% better outcomes.',
            priority: 'medium',
          },
          {
            type: 'insight',
            title: 'Population Density Impact',
            description:
              'High population density correlates with increased report frequency during peak hours.',
            priority: 'low',
          },
        ];
      },
    }),
    {
      name: 'selected-location-store',
    }
  )
);
// Helper hook for responsive panel behavior
export const useResponsivePanel = () => {
  const { isPanelOpen, closePanel, openPanel } = useSelectedLocation();
  // Auto-close panel on mobile, open on desktop
  const handleResize = () => {
    if (window.innerWidth < 768) {
      closePanel();
    } else {
      openPanel();
    }
  };
  return {
    isPanelOpen,
    closePanel,
    openPanel,
    handleResize,
  };
};
export default useSelectedLocation;
