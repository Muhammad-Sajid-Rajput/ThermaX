import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Flame,
  Menu,
  X,
  LogOut,
  User as UserIcon,
  Shield,
  Database,
  Wifi,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isLocalMode, setDataMode } from '../../services/config';
// Base navigation items — visible to all users
const getNavItems = (isAuthenticated) => {
  const items = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Insight', href: '/insight' },
    { name: 'Reports', href: '/reports' },
  ];
  // Only show My Reports when authenticated (per spec)
  if (isAuthenticated) {
    items.push({ name: 'My Reports', href: '/my-reports' });
  }
  return items;
};
// Separate Submit Report button with auth-aware behavior
const SUBMIT_REPORT_ITEM = { name: 'Submit Report', href: '/report' };
const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isAdmin = user?.role === 'ADMIN';
  // Auth-aware Submit Report handler
  const handleSubmitReportClick = () => {
    if (isAuthenticated) {
      navigate('/report');
    } else {
      // Redirect to login with return URL
      navigate('/login', { state: { from: '/report' } });
    }
  };
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  const renderAuthSection = () => {
    // Not logged in → Login link only (Sign Up goes in mobile drawer)
    if (!user) {
      return (
        <div className="flex items-center gap-2">
          <NavLink
            to="/login"
            className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 transition-colors"
          >
            Login
          </NavLink>
          <NavLink
            to="/signup"
            className="text-sm font-semibold text-white bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
          >
            Sign Up
          </NavLink>
        </div>
      );
    }
    // Logged in → profile avatar dropdown + visible Logout button
    return (
      <div className="flex items-center gap-2">
        {/* Avatar / profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 sm:pr-3 rounded-full hover:bg-slate-100 transition-colors border border-transparent focus:border-slate-200 outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-linear-to-tr from-green-600 to-green-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-bold text-slate-900 leading-none">
                {user?.name?.split('')[0] ?? 'User'}
              </p>
            </div>
          </button>
          {isProfileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 origin-top-right duration-200">
              <div className="px-4 py-2 mb-2 border-b border-slate-100/50">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              <div className="px-2 space-y-1">
                <button
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <UserIcon className="w-4 h-4" />
                  Profile
                </button>
                <div className="border-t border-slate-100 my-1 pt-1">
                  <button
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  return (
    <>
      <nav className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 transition-colors h-16">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 h-full">
          <div className="flex items-center h-full gap-4">
            {/* Logo - Left */}
            <NavLink
              to="/dashboard"
              className="flex items-center gap-2.5 outline-none shrink-0"
            >
              <div className="w-8 h-8 rounded-xl bg-green-600 flex items-center justify-center shadow-sm">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">
                ThermaX
              </span>
            </NavLink>
            {/* Spacer */}
            <div className="flex-1"></div>
            {/* Nav Links + Controls - Right */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              {/* Nav Links */}
              <div className="hidden lg:flex items-center gap-1">
                {getNavItems(isAuthenticated).map((item) => {
                  const isActive =
                    location.pathname === item.href ||
                    (item.href !== '/dashboard' &&
                      location.pathname.startsWith(item.href));
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        isActive
                          ? 'text-slate-900 bg-slate-100'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/50'
                      }`}
                    >
                      {item.name}
                    </NavLink>
                  );
                })}
                {/* Auth-aware Submit Report Button */}
                <button
                  onClick={handleSubmitReportClick}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                    location.pathname === '/report'
                      ? 'text-white bg-green-600 shadow-sm'
                      : 'text-green-600 hover:text-white hover:bg-green-600 bg-green-50'
                  }`}
                >
                  <Flame className="w-4 h-4" />
                  {SUBMIT_REPORT_ITEM.name}
                </button>
                {isAdmin && (
                  <NavLink
                    to="/admin"
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                      location.pathname.startsWith('/admin')
                        ? 'text-slate-900 bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/50'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </NavLink>
                )}
              </div>
              <div className="w-px h-6 bg-slate-200 hidden lg:block mx-1"></div>
              {/* Mode Indicator */}
              <button
                onClick={() => {
                  const newMode = isLocalMode() ? 'api' : 'local';
                  if (
                    confirm(
                      `Switch to ${newMode === 'local' ? 'Local (Demo)' : 'API'} mode? The page will reload.`
                    )
                  ) {
                    setDataMode(newMode);
                  }
                }}
                className={`hidden sm:flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  isLocalMode()
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
                title="Click to switch mode"
              >
                {isLocalMode() ? (
                  <Database className="w-3.5 h-3.5" />
                ) : (
                  <Wifi className="w-3.5 h-3.5" />
                )}
                <span className="hidden lg:inline">
                  {isLocalMode() ? 'Local' : 'API'}
                </span>
              </button>
              {renderAuthSection()}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 ml-1 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-100 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-70 bg-white shadow-2xl flex flex-col border-l border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <span className="font-bold text-lg text-slate-900">Menu</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-slate-500 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {getNavItems(isAuthenticated).map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                      isActive
                        ? 'text-slate-900 bg-slate-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/50'
                    }`}
                  >
                    {item.name}
                  </NavLink>
                );
              })}
              {/* Auth-aware Submit Report Button - Mobile */}
              <button
                onClick={handleSubmitReportClick}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${
                  location.pathname === '/report'
                    ? 'text-white bg-green-600 shadow-sm'
                    : 'text-green-600 hover:text-white hover:bg-green-600 bg-green-50'
                }`}
              >
                <Flame className="w-4 h-4" />
                {SUBMIT_REPORT_ITEM.name}
              </button>
              {isAdmin && (
                <NavLink
                  to="/admin"
                  className="flex px-4 py-3 rounded-xl text-sm font-semibold mt-2 transition-colors items-center gap-2 text-slate-600"
                >
                  <Shield className="w-4 h-4" />
                  Administration
                </NavLink>
              )}
            </div>
            {/* Mobile menu bottom — auth actions */}
            {!user ? (
              <div className="p-4 border-t border-slate-100 space-y-2">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-2.5 text-sm font-bold text-slate-900 bg-slate-100 rounded-xl"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="w-full py-2.5 text-sm font-bold text-white bg-green-600 rounded-xl"
                >
                  Sign Up
                </button>
              </div>
            ) : (
              <div className="p-4 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-red-600 bg-red-50 rounded-xl"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
export default Navbar;
