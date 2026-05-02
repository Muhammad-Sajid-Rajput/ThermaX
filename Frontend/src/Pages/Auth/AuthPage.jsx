import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Activity,
  Zap,
  Leaf,
  Mail,
  Lock,
  User,
  Flame
} from 'lucide-react';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 group-hover:scale-110 transition-transform" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.11c-.22-.66-.35-1.36-.35-2.11s.13-1.45.35-2.11V7.05H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.95l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335" />
  </svg>
);

const MicrosoftIcon = () => (
  <svg viewBox="0 0 21 21" className="w-5 h-5 group-hover:scale-110 transition-transform" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="10" height="10" fill="#f25022" />
    <rect x="11" y="0" width="10" height="10" fill="#7fbb00" />
    <rect x="0" y="11" width="10" height="10" fill="#00a1f1" />
    <rect x="11" y="11" width="10" height="10" fill="#ffbb00" />
  </svg>
);

const AuthPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isSignupRoute = location.pathname === '/signup';

  const [activeTab, setActiveTab] = useState(isSignupRoute ? 'signup' : 'login');

  // Form states
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);

  const { login, signup, isLoading, error, clearError } = useAuth();

  const from = typeof location.state?.from === 'string'
    ? location.state.from
    : location.state?.from?.pathname || '/dashboard';

  // Sync tab with route
  useEffect(() => {
    setActiveTab(isSignupRoute ? 'signup' : 'login');
    clearError?.();
    setFormErrors({});
  }, [location.pathname, isSignupRoute, clearError]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFormErrors({});
    clearError?.();
    navigate(tab === 'login' ? '/login' : '/signup', { replace: true });
  };

  // Password strength calculator
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    return strength;
  };

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return { text: 'Weak', color: 'text-red-500', bg: 'bg-red-500' };
      case 2:
      case 3:
        return { text: 'Medium', color: 'text-amber-500', bg: 'bg-amber-500' };
      case 4:
      case 5:
        return { text: 'Strong', color: 'text-green-500', bg: 'bg-green-500' };
      default:
        return { text: '', color: '', bg: '' };
    }
  };

  // Login handlers
  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateLogin = () => {
    const errors = {};
    if (!loginData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(loginData.email)) {
      errors.email = 'Please enter a valid email';
    }
    if (!loginData.password) {
      errors.password = 'Password is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!validateLogin()) return;
    const result = await login(loginData);
    if (result.success) {
      if (location.state?.from) {
        navigate(from, { replace: true });
      } else {
        const userRole = result.user.role;
        if (userRole === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    }
  };

  // Signup handlers
  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const validateSignup = () => {
    const errors = {};
    if (!signupData.name) {
      errors.name = 'Name is required';
    } else if (signupData.name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    if (!signupData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(signupData.email)) {
      errors.email = 'Please enter a valid email';
    }
    if (!signupData.password) {
      errors.password = 'Password is required';
    } else if (signupData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (!signupData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (signupData.password !== signupData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!validateSignup()) return;
    const { confirmPassword, ...data } = signupData;
    const result = await signup(data);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  const strength = getPasswordStrengthText();

  // Feature cards data
  const features = [
    {
      icon: Activity,
      title: 'Real-time Analytics',
      description: 'Monitor thermal data live'
    },
    {
      icon: Zap,
      title: 'Smart Optimization',
      description: 'AI-powered efficiency'
    },
    {
      icon: Leaf,
      title: 'Sustainable Impact',
      description: 'Reduce carbon footprint'
    }
  ];

  return (
    <div className="min-h-dvh w-full flex flex-col lg:flex-row overflow-hidden bg-white">
      {/* Left Side - Brand Identity */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden bg-slate-900 lg:fixed lg:left-0 lg:top-0 lg:bottom-0">
        {/* Animated Mesh Gradient Background */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Primary gradient orb */}
          <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] bg-emerald-600/30 rounded-full blur-[120px] animate-pulse-slow" />
          {/* Secondary gradient orb */}
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-green-500/20 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
          {/* Accent glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] bg-teal-500/10 rounded-full blur-[150px]" />
        </div>

        {/* Wave Graphic */}
        <div className="absolute bottom-0 left-0 right-0 h-64 opacity-20">
          <svg
            viewBox="0 0 1440 320"
            className="absolute bottom-0 w-full h-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#059669" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#10b981" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            <path
              fill="url(#waveGradient)"
              d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 pb-20 xl:p-16 xl:pb-32 w-full h-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-linear-to-br from-green-500 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25">
              <Flame className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">ThermaX</span>
          </div>

          {/* Headline Section */}
          <div className="max-w-md">
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
              Intelligent Thermal Management for a{' '}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-green-400 via-emerald-400 to-teal-400">
                Better Tomorrow
              </span>
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed">
              Advanced analytics and smart optimization for sustainable urban climate solutions.
            </p>
          </div>

          {/* Feature Icons */}
          <div className="grid grid-cols-1 gap-4 max-w-sm">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all hover:translate-x-1 duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-linear-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border border-white/10 group-hover:from-green-500/30 group-hover:to-emerald-500/30">
                  <feature.icon className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">{feature.title}</h3>
                  <p className="text-slate-400 text-xs">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Authentication */}
      <div className="w-full lg:w-1/2 xl:w-[45%] lg:ml-[50%] xl:ml-[55%] bg-white flex flex-col min-h-dvh">
        {/* Mobile Header - Only visible on mobile */}
        <div className="lg:hidden flex items-center justify-center gap-3 p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="w-10 h-10 bg-linear-to-br from-green-600 to-emerald-500 rounded-lg flex items-center justify-center shadow-sm">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">ThermaX</span>
        </div>


        {/* Tab Navigation Header */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 py-3 lg:py-4 shrink-0">
          <div className="flex justify-center">
            <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 shadow-sm">
              <button
                onClick={() => handleTabChange('login')}
                aria-pressed={activeTab === 'login'}
                className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'login'
                  ? 'bg-white text-slate-900 shadow-sm scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
              >
                Log In
              </button>
              <button
                onClick={() => handleTabChange('signup')}
                aria-pressed={activeTab === 'signup'}
                className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'signup'
                  ? 'bg-white text-slate-900 shadow-sm scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>

        {/* Auth Content */}
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-20 pt-1 pb-6 lg:pt-2 lg:pb-8 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">

          {/* Heading */}
          <div className={`text-center ${activeTab === 'signup' ? 'mb-2' : 'mb-6'}`}>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 tracking-tight">
              {activeTab === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-slate-500 text-sm font-medium">
              {activeTab === 'login'
                ? 'Sign in to access your thermal management dashboard'
                : 'Join thousands optimizing urban thermal efficiency'}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl p-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-sm font-bold text-red-800">{error}</p>
            </div>
          )}

          {/* Login Form */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 animate-in fade-in duration-500">
              {/* Email Field */}
              <div>
                <label htmlFor="login-email" className="block text-[10px] font-bold text-slate-700 mb-0.5 px-1 uppercase tracking-wider opacity-70">
                  Email address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-green-600 transition-colors" />
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    value={loginData.email}
                    onChange={handleLoginChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    aria-invalid={!!formErrors.email}
                    aria-describedby={formErrors.email ? 'login-email-error' : undefined}
                    className={`w-full pl-10 pr-4 py-2 rounded-xl border text-sm font-medium transition-all outline-none ${formErrors.email
                      ? 'border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border-slate-200 focus:border-green-600 focus:ring-4 focus:ring-green-600/10 bg-slate-50/30 focus:bg-white'
                      }`}
                  />
                </div>
                {formErrors.email && (
                  <p id="login-email-error" className="mt-2 text-xs text-red-600 font-bold flex items-center gap-1.5 px-1" role="alert">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {formErrors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <label htmlFor="login-password" className="block text-[10px] font-bold text-slate-700 mb-0.5 px-1 uppercase tracking-wider opacity-70">
                    Password
                  </label>
                  <Link
                    to="#"
                    className="text-xs font-bold text-green-600 hover:text-green-700 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-green-600 transition-colors" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    name="password"
                    value={loginData.password}
                    onChange={handleLoginChange}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    aria-invalid={!!formErrors.password}
                    aria-describedby={formErrors.password ? 'login-password-error' : undefined}
                    className={`w-full pl-10 pr-10 py-2 rounded-xl border text-sm font-medium transition-all outline-none ${formErrors.password
                      ? 'border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border-slate-200 focus:border-green-600 focus:ring-4 focus:ring-green-600/10 bg-slate-50/30 focus:bg-white'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formErrors.password && (
                  <p id="login-password-error" className="mt-2 text-xs text-red-600 font-bold flex items-center gap-1.5 px-1" role="alert">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {formErrors.password}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                aria-busy={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-green-600/20 hover:shadow-green-600/30 transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-green-600/20"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          )}

          {/* Signup Form */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-2.5 animate-in fade-in duration-500">
              <div className="space-y-2">
                {/* Name Field */}
                <div>
                  <label htmlFor="signup-name" className="block text-[10px] font-bold text-slate-700 mb-0.5 px-1 uppercase tracking-wider opacity-70">
                    Full name
                  </label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-green-600 transition-colors" />
                    <input
                      id="signup-name"
                      type="text"
                      name="name"
                      value={signupData.name}
                      onChange={handleSignupChange}
                      placeholder="John Doe"
                      autoComplete="name"
                      aria-invalid={!!formErrors.name}
                      className={`w-full pl-10 pr-4 py-2 rounded-xl border text-sm font-medium transition-all outline-none ${formErrors.name
                        ? 'border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                        : 'border-slate-200 focus:border-green-600 focus:ring-4 focus:ring-green-600/10 bg-slate-50/30 focus:bg-white'
                        }`}
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="signup-email" className="block text-[10px] font-bold text-slate-700 mb-0.5 px-1 uppercase tracking-wider opacity-70">
                    Email address
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-green-600 transition-colors" />
                    <input
                      id="signup-email"
                      type="email"
                      name="email"
                      value={signupData.email}
                      onChange={handleSignupChange}
                      placeholder="you@example.com"
                      autoComplete="email"
                      aria-invalid={!!formErrors.email}
                      className={`w-full pl-10 pr-4 py-2 rounded-xl border text-sm font-medium transition-all outline-none ${formErrors.email
                        ? 'border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                        : 'border-slate-200 focus:border-green-600 focus:ring-4 focus:ring-green-600/10 bg-slate-50/30 focus:bg-white'
                        }`}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="signup-password" className="block text-[10px] font-bold text-slate-700 mb-0.5 px-1 uppercase tracking-wider opacity-70">
                    Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-green-600 transition-colors" />
                    <input
                      id="signup-password"
                      type={showSignupPassword ? 'text' : 'password'}
                      name="password"
                      value={signupData.password}
                      onChange={handleSignupChange}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      aria-invalid={!!formErrors.password}
                      className={`w-full pl-10 pr-10 py-2 rounded-xl border text-sm font-medium transition-all outline-none ${formErrors.password
                        ? 'border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                        : 'border-slate-200 focus:border-green-600 focus:ring-4 focus:ring-green-600/10 bg-slate-50/30 focus:bg-white'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label htmlFor="signup-confirm" className="block text-[10px] font-bold text-slate-700 mb-0.5 px-1 uppercase tracking-wider opacity-70">
                    Confirm password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-green-600 transition-colors" />
                    <input
                      id="signup-confirm"
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={signupData.confirmPassword}
                      onChange={handleSignupChange}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      aria-invalid={!!formErrors.confirmPassword}
                      className={`w-full pl-10 pr-10 py-2 rounded-xl border text-sm font-medium transition-all outline-none ${formErrors.confirmPassword
                        ? 'border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                        : 'border-slate-200 focus:border-green-600 focus:ring-4 focus:ring-green-600/10 bg-slate-50/30 focus:bg-white'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Error messages if any (moved here to prevent grid break) */}
              {(formErrors.name || formErrors.email || formErrors.password || formErrors.confirmPassword) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  {Object.entries(formErrors).map(([key, msg]) => msg && (
                    <p key={key} className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {msg}
                    </p>
                  ))}
                </div>
              )}

              {/* Password Strength */}
              {signupData.password && (
                <div className="mt-1 px-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Strength</span>
                    <span className={`text-[10px] font-bold ${strength.color}`}>{strength.text}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                    <div
                      className={`h-1 rounded-full transition-all duration-500 ${strength.bg}`}
                      style={{ width: `${(passwordStrength / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                aria-busy={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-green-600/20 hover:shadow-green-600/30 transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98] mt-1 focus:outline-none focus:ring-4 focus:ring-green-600/20"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  'Create Account'
                )}
              </button>

              {/* Terms */}
              <p className="text-[10px] text-slate-500 text-center font-medium px-4 mt-1 leading-relaxed">
                By creating an account, you agree to our{' '}
                <Link to="#" className="font-bold text-slate-700 hover:text-green-600 transition-colors">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="#" className="font-bold text-slate-700 hover:text-green-600 transition-colors">
                  Privacy Policy
                </Link>
              </p>
            </form>
          )}

          {/* Divider */}
          <div className={`relative ${activeTab === 'signup' ? 'my-2' : 'my-6'}`}>
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-4 bg-white text-slate-400 font-bold uppercase tracking-widest">Or continue with</span>
            </div>
          </div>

          {/* Social Login Options */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: GoogleIcon, label: 'Google' },
              { icon: MicrosoftIcon, label: 'Microsoft' }
            ].map((social, idx) => (
              <button
                key={idx}
                type="button"
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all group shadow-sm hover:shadow-md"
              >
                <social.icon />
                <span className="text-xs font-bold text-slate-700">{social.label}</span>
              </button>
            ))}
          </div>


        </div>
      </div>
    </div>
  );
};

export default AuthPage;
