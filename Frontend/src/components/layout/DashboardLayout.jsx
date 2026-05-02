import React from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import ContextPanel from './ContextPanel';
import ContextModal from './ContextModal';
import useSelectedLocation from '../../hooks/useSelectedLocation';
/**
 * Main application layout with shared Navbar.
 *
 * Structure:
 * ┌─────────────────────────────────────────┐
 * │ Navbar (h-16, sticky top-0) │
 * ├──────────────────────────┬──────────────┤
 * │ Main content area │ ContextPanel │
 * │ (scrollable) │ (slide-in) │
 * └──────────────────────────┴──────────────┘
 *
 * Container width: max-w-7xl — consistent across all pages.
 * Spacing scale : p-4 → sm:p-6 → lg:p-8 for progressive enhancement.
 */
const DashboardLayout = ({ children }) => {
  const { isPanelOpen, isModalOpen, selectedLocation } = useSelectedLocation();
  const location = useLocation();
  const isProfileRoute = location.pathname === '/profile';

  const mainClassName = isProfileRoute
    ? 'flex-1 w-full min-h-0 overflow-y-auto lg:overflow-hidden relative bg-slate-50'
    : 'flex-1 overflow-y-auto w-full relative scroll-smooth bg-slate-50';

  const contentClassName = isProfileRoute
    ? 'min-h-full lg:h-full max-w-7xl mx-auto w-full px-3 sm:px-4 lg:px-4 py-3 lg:py-4'
    : 'px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto w-full flex flex-col gap-6 lg:gap-8 pb-20 lg:pb-8';

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 font-sans">
      {/* ── Top Navigation ───────────────────────────────────────── */}
      <Navbar />
      {/* ── Main App Area ─────────────────────────────────────────── */}
      <div
        className={`flex-1 flex overflow-hidden transition-all duration-300 ${
          isPanelOpen ? 'lg:grid lg:grid-cols-[1fr_320px]' : ''
        }`}
      >
        {/* ── Main Content ───────────────────────────────────────── */}
        <main className={mainClassName}>
          {/*
px: 4 → sm:6 → lg:8 (matches Navbar px-4 md:px-6 lg:px-8)
py: 6 → lg:8
max-w: 7xl (consistent page-width cap)
pb-20 on mobile (safe zone above mobile browser chrome)
*/}
          <div className={contentClassName}>
            {children}
          </div>
        </main>
        {/* ── Context Panel (right slide-in) ─────────────────────── */}
        <aside
          className={`
fixed inset-y-0 right-0 z-40 w-80
bg-white
border-l border-slate-200
overflow-y-auto shadow-xl
transition-transform duration-300 ease-in-out
lg:static lg:shadow-none
${isPanelOpen ? 'translate-x-0' : 'translate-x-full lg:hidden'}`}
        >
          <ContextPanel />
        </aside>
      </div>
      {/* ── Context Modal (overlay) ─────────────────────────────── */}
      {isModalOpen && selectedLocation && <ContextModal />}
    </div>
  );
};
export default DashboardLayout;
