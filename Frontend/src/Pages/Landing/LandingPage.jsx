import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Map as MapIcon,
  ShieldAlert,
  Activity,
  Flame,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NavLink } from 'react-router-dom';
// ─── Minimal standalone header for the landing page ──────────────────────────
// (The shared Navbar is not used here because the landing page is fullscreen
// and has a different visual hierarchy. This header is intentionally minimal.)
const LandingHeader = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          className="flex items-center gap-2.5 cursor-pointer select-none"
          onClick={() => navigate('/')}
        >
          <div className="w-8 h-8 rounded-xl bg-green-600 flex items-center justify-center shadow-sm">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">
            ThermaX
          </span>
        </div>
        {/* Nav links + CTA */}
        <nav className="flex items-center gap-2 sm:gap-4">
          {isAuthenticated ? (
            <>
              <NavLink
                to="/dashboard"
                className="text-sm font-semibold text-white bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              >
                Go to App
              </NavLink>
              <button
                onClick={handleLogout}
                className="text-sm font-semibold text-slate-600 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Login
              </NavLink>
              <NavLink
                to="/signup"
                className="text-sm font-semibold text-white bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              >
                Sign Up
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
// ─── Landing Page ─────────────────────────────────────────────────────────────
const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const handleReportClick = () => {
    if (isAuthenticated) {
      navigate('/report');
    } else {
      navigate('/login', { state: { from: '/report' } });
    }
  };
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <LandingHeader />
      {/* Hero Section */}
      <section className="relative bg-white py-16 md:py-24 flex-1 flex justify-center border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center self-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-semibold mb-8 border border-green-100">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live Heat Mapping Active
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6 leading-[1.1]">
            Advanced Crowdsourced <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-green-600 to-teal-600">
              Urban Heat Mapping
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 leading-relaxed font-medium">
            Transform community-reported heat data into actionable urban climate
            intelligence through real-time mapping and machine learning
            analytics.
          </p>

          {/* Action Buttons - Right after description */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8">
            <button
              onClick={handleReportClick}
              className="group inline-flex items-center justify-center px-8 py-4 text-base font-bold rounded-xl text-white bg-linear-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
            >
              <ShieldAlert className="w-5 h-5 mr-2 group-hover:animate-pulse" />
              Report Heat
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="group inline-flex items-center justify-center px-8 py-4 text-base font-bold rounded-xl text-slate-700 bg-white border-2 border-slate-200 hover:border-green-500 hover:text-green-600 transition-all shadow-md hover:shadow-lg hover:-translate-y-1"
            >
              <MapIcon className="w-5 h-5 mr-2" />
              Dashboard
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>
      {/* Features Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
              Built for Climate Resilience
            </h2>
            <p className="text-slate-500 font-medium">
              Everything you need to monitor, analyze, and act on urban heat
              island effects.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center justify-center mb-6">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Crowdsource Reports
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Securely gather localized heat vulnerability data from citizens
                across the urban landscape.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-50 border border-green-100 text-green-600 rounded-xl flex items-center justify-center mb-6">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Analyze Hotspots
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Process complex geographic information using DBSCAN clustering
                algorithms.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-50 border border-green-100 text-green-600 rounded-xl flex items-center justify-center mb-6">
                <MapIcon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Adapt & Plan
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Equip urban planners with interactive composite heat severity
                dashboards.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-green-600 flex items-center justify-center">
              <Flame className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-900">ThermaX</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Urban Heat Intelligence Platform · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};
export default LandingPage;
