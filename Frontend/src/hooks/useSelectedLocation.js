import { useEffect, useCallback } from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
// NOTE (Phase 2 data integrity): this store never fabricates location data.
// There is no "Downtown District" fixture — a previous mock with invented
// severity/reports/population/trends was deleted. selectLocation stores
// exactly what the caller passes; nothing is merged over fake defaults.
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
          selectedLocation:
            location && typeof location === 'object' ? { ...location } : null,
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
  const handleResize = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 768) {
        closePanel();
      } else {
        openPanel();
      }
    }
  }, [closePanel, openPanel]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  return {
    isPanelOpen,
    closePanel,
    openPanel,
    handleResize,
  };
};

export default useSelectedLocation;
