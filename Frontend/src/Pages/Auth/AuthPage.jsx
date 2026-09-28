import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { forgotPassword, resetPassword } from '../../services/api';
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
  Flame,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';


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

  // Email verification (OTP) state
  const [showOtpView, setShowOtpView] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [otpNotice, setOtpNotice] = useState(null);

  // Forgot password state
  const [showForgotView, setShowForgotView] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [forgotNotice, setForgotNotice] = useState(null);

  const {
    login,
    signup,
    verifyEmailOtp,
    resendVerificationOtp,
    isLoading,
    error,
    clearError,
    isAuthenticated,
    user,
  } = useAuth();

  const from = typeof location.state?.from === 'string'
    ? location.state.from
    : location.state?.from?.pathname || '/dashboard';

  // If already authenticated, redirect to destination or dashboard
  useEffect(() => {
    if (isAuthenticated) {
      const userRole = String(user?.role || '').toUpperCase();
      if (userRole === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else {
        const dest = from && from !== '/login' && from !== '/signup' ? from : '/dashboard';
        navigate(dest, { replace: true });
      }
    }
  }, [isAuthenticated, user?.role, navigate, from]);

  // Sync tab with route
  useEffect(() => {
    setActiveTab(isSignupRoute ? 'signup' : 'login');
    setShowOtpView(false);
    setShowForgotView(false);
    setOtpNotice(null);
    setForgotNotice(null);
    setFormErrors({});
    if (error) {
      clearError?.();
    }
  }, [location.pathname, isSignupRoute, clearError, error]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setShowOtpView(false);
    setShowForgotView(false);
    setOtpNotice(null);
    setForgotNotice(null);
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
        const userRole = String(result.user?.role || '').toUpperCase();
        if (userRole === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } else if (result.code === 'EMAIL_NOT_VERIFIED' || /verify/i.test(result.error || '')) {
      setVerificationEmail(loginData.email);
      setShowOtpView(true);
      setOtpNotice({
        type: 'info',
        text: result.error || 'Please enter the 6-digit verification code sent to your email.',
      });
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
    const { confirmPassword: _confirmPassword, ...data } = signupData;
    const result = await signup(data);
    if (result.success) {
      if (result.isEmailVerified) {
        navigate('/dashboard');
      } else {
        setVerificationEmail(data.email);
        setShowOtpView(true);
        setOtpNotice({
          type: 'success',
          text: result.message || 'Account created! Enter the 6-digit verification code sent to your email.',
        });
      }
    }
  };

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpNotice({ type: 'error', text: 'Please enter a valid 6-digit code.' });
      return;
    }
    setIsVerifyingOtp(true);
    setOtpNotice(null);
    const result = await verifyEmailOtp(verificationEmail, otpCode.trim());
    setIsVerifyingOtp(false);
    if (result.success) {
      const userRole = String(result.user?.role || '').toUpperCase();
      if (userRole === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } else {
      setOtpNotice({ type: 'error', text: result.error || 'Invalid or expired OTP code.' });
    }
  };

  const handleResendOtp = async () => {
    if (!verificationEmail) return;
    setIsResendingOtp(true);
    setOtpNotice({ type: 'info', text: 'Resending verification code...' });
    const result = await resendVerificationOtp(verificationEmail);
    setIsResendingOtp(false);
    if (result.success) {
      setOtpNotice({ type: 'success', text: result.message || 'Verification code resent.' });
    } else {
      setOtpNotice({ type: 'error', text: result.error || 'Failed to resend code.' });
    }
  };

  const handleForgotSubmitEmail = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !/\S+@\S+\.\S+/.test(forgotEmail)) {
      setForgotNotice({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }
    setIsForgotLoading(true);
    setForgotNotice(null);
    try {
      const res = await forgotPassword(forgotEmail);
      setIsForgotLoading(false);
      setForgotStep(2);
      setForgotNotice({
        type: 'success',
        text: res.message || 'Reset code sent! Check your inbox.',
      });
    } catch (err) {
      setIsForgotLoading(false);
      setForgotNotice({
        type: 'error',
        text: err?.response?.data?.message || err?.message || 'Failed to send reset code.',
      });
    }
  };

  const handleForgotSubmitReset = async (e) => {
    e.preventDefault();
    if (!forgotOtp || forgotOtp.trim().length !== 6) {
      setForgotNotice({ type: 'error', text: 'Please enter the 6-digit code.' });
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 8) {
      setForgotNotice({ type: 'error', text: 'Password must be at least 8 characters long.' });
      return;
    }
    setIsForgotLoading(true);
    setForgotNotice(null);
    try {
      const res = await resetPassword(forgotEmail, forgotOtp.trim(), forgotNewPassword);
      setIsForgotLoading(false);
      setShowForgotView(false);
      setForgotStep(1);
      setOtpNotice({
        type: 'success',
        text: res.message || 'Password reset successfully! You can now log in.',
      });
      setActiveTab('login');
    } catch (err) {
      setIsForgotLoading(false);
      setForgotNotice({
        type: 'error',
        text: err?.response?.data?.message || err?.message || 'Failed to reset password.',
      });
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
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-20 pt-1 pb-6 lg:pt-2 lg:pb-8 overflow-y-auto">

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
          {error && !showOtpView && (
            <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl p-3 flex flex-col gap-2 animate-fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <p className="text-sm font-bold text-red-800">{error}</p>
              </div>
              {/verify/i.test(error) && (
                <button
                  type="button"
                  onClick={() => {
                    setVerificationEmail(loginData.email || signupData.email);
                    setShowOtpView(true);
                  }}
                  className="self-start ml-11 text-xs font-bold text-green-700 hover:text-green-800 underline cursor-pointer"
                >
                  Enter verification code &rarr;
                </button>
              )}
            </div>
          )}

          {/* OTP Verification Form */}
          {showOtpView ? (
            <div className="space-y-4 animate-fade-in duration-300">
              <div className="text-center pb-1">
                <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">Verify Your Email</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enter the 6-digit code sent to <span className="font-semibold text-slate-800">{verificationEmail || 'your email'}</span>
                </p>
              </div>

              {otpNotice && (
                <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  otpNotice.type === 'error'
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : otpNotice.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}>
                  {otpNotice.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <span>{otpNotice.text}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtpSubmit} className="space-y-3">
                <div>
                  <label htmlFor="otp-input" className="block text-[10px] font-bold text-slate-700 mb-1 px-1 uppercase tracking-wider opacity-70">
                    6-Digit Verification Code
                  </label>
                  <input
                    id="otp-input"
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    autoFocus
                    className="w-full text-center tracking-[0.4em] text-2xl font-mono py-2.5 rounded-xl border border-slate-200 focus:border-green-600 focus:ring-4 focus:ring-green-600/10 bg-slate-50/40 focus:bg-white outline-none font-bold"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingOtp || otpCode.length !== 6}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-green-600/20 hover:shadow-green-600/30 transition-all flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isVerifyingOtp ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    'Verify & Sign In'
                  )}
                </button>
              </form>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResendingOtp}
                  className="text-green-600 hover:text-green-700 font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResendingOtp ? 'animate-spin' : ''}`} />
                  Resend code
                </button>

                <button
                  type="button"
                  onClick={() => setShowOtpView(false)}
                  className="text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to {activeTab === 'signup' ? 'Sign Up' : 'Log In'}
                </button>
              </div>
            </div>
          ) : showForgotView ? (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center pb-1">
                <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-sm">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  {forgotStep === 1 ? 'Reset Your Password' : 'Enter Reset Code'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {forgotStep === 1
                    ? 'Enter your account email to receive a 6-digit recovery code.'
                    : `Enter the 6-digit code sent to ${forgotEmail} and choose a new password.`}
                </p>
              </div>

              {forgotNotice && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                    forgotNotice.type === 'error'
                      ? 'bg-red-50 text-red-800 border-red-200'
                      : forgotNotice.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-blue-50 text-blue-800 border-blue-200'
                  }`}
                >
                  {forgotNotice.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <span>{forgotNotice.text}</span>
                </div>
              )}

              {forgotStep === 1 ? (
                <form onSubmit={handleForgotSubmitEmail} className="space-y-3">
                  <div>
                    <label htmlFor="forgot-email" className="block text-[10px] font-bold text-slate-700 mb-1 px-1 uppercase tracking-wider opacity-70">
                      Email address
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-green-600 transition-colors" />
                      <input
                        id="forgot-email"
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:border-green-600 focus:ring-4 focus:ring-green-600/10 bg-slate-50/30 focus:bg-white outline-none text-sm font-medium"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isForgotLoading || !forgotEmail}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-green-600/20 hover:shadow-green-600/30 transition-all flex items-center justify-center disabled:opacity-60 cursor-pointer text-sm"
                  >
                    {isForgotLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending code...
                      </span>
                    ) : (
                      'Send Recovery Code'
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleForgotSubmitReset} className="space-y-3">
                  <div>
                    <label htmlFor="forgot-otp" className="block text-[10px] font-bold text-slate-700 mb-1 px-1 uppercase tracking-wider opacity-70">
                      6-Digit Code
                    </label>
                    <input
                      id="forgot-otp"
                      type="text"
                      maxLength={6}
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      autoFocus
                      className="w-full text-center tracking-[0.4em] text-2xl font-mono py-2 rounded-xl border border-slate-200 focus:border-green-600 focus:ring-4 focus:ring-green-600/10 bg-slate-50/40 focus:bg-white outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label htmlFor="forgot-new-password" className="block text-[10px] font-bold text-slate-700 mb-1 px-1 uppercase tracking-wider opacity-70">
                      New Password (min 8 chars)
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-green-600 transition-colors" />
                      <input
                        id="forgot-new-password"
                        type={showForgotNewPassword ? 'text' : 'password'}
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-10 pr-10 py-2 rounded-xl border border-slate-200 focus:border-green-600 focus:ring-4 focus:ring-green-600/10 bg-slate-50/30 focus:bg-white outline-none text-sm font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isForgotLoading || forgotOtp.length !== 6 || forgotNewPassword.length < 8}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-green-600/20 hover:shadow-green-600/30 transition-all flex items-center justify-center disabled:opacity-60 cursor-pointer text-sm"
                  >
                    {isForgotLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Resetting password...
                      </span>
                    ) : (
                      'Save New Password'
                    )}
                  </button>
                </form>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                {forgotStep === 2 && (
                  <button
                    type="button"
                    onClick={() => { setForgotStep(1); setForgotNotice(null); }}
                    className="text-green-600 hover:text-green-700 font-semibold cursor-pointer"
                  >
                    Change Email
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setShowForgotView(false); setForgotStep(1); setForgotNotice(null); }}
                  className="text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 cursor-pointer ml-auto"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Log In
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Login Form */}
              {activeTab === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4 animate-fade-in">
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
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(loginData.email || '');
                          setForgotStep(1);
                          setForgotNotice(null);
                          setShowForgotView(true);
                          setShowOtpView(false);
                        }}
                        className="text-xs font-bold text-green-600 hover:text-green-700 transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
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
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-green-600/20 hover:shadow-green-600/30 transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-green-600/20 cursor-pointer"
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
            <form onSubmit={handleSignupSubmit} className="space-y-2.5 animate-fade-in duration-500">
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
        </>
      )}


        </div>
      </div>
    </div>
  );
};

export default AuthPage;
