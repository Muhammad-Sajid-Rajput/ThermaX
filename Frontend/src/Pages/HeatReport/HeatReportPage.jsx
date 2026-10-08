import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import MiniMap from './MiniMap';
import { detectAreaName, submitHeatReport, buildReportFormData, getSubmissionErrorMessage } from '../../services/api';
import UploadProgress from '../../components/ui/UploadProgress';
import { fetchCurrentWeather } from '../../services/weatherService';
import useWeather from '../../hooks/data/useWeather';
import useUserLocationStore from '../../stores/userLocationStore';
import {
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  User,
  Thermometer,
  FileText,
  Flame,
  Navigation,
  Check,
} from 'lucide-react';
import { isLocationInPakistan } from '../../utils/city';

const getLocalDateTimeString = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};
const steps = [
  { id: 1, label: 'Location' },
  { id: 2, label: 'Severity' },
  { id: 3, label: 'Evidence' },
  { id: 4, label: 'Review' },
];
const causes = [
  'Lack of trees or shade',
  'Hot asphalt or paved roads',
  'Metal roofs reflecting heat',
  'Crowded bus or transit stop',
  'Blocked breeze or trapped heat',
];

const SEVERITY_LEVELS = [
  {
    level: 1,
    label: 'Mild',
    emoji: '😌',
    colorBar: 'bg-emerald-500',
    activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm',
    activeBg: 'bg-emerald-50/60',
    activeTile: 'bg-emerald-100 text-emerald-800',
    activeText: 'text-emerald-900',
  },
  {
    level: 2,
    label: 'Moderate',
    emoji: '😐',
    colorBar: 'bg-amber-400',
    activeBorder: 'border-amber-400 ring-2 ring-amber-400/20 shadow-sm',
    activeBg: 'bg-amber-50/60',
    activeTile: 'bg-amber-100 text-amber-800',
    activeText: 'text-amber-900',
  },
  {
    level: 3,
    label: 'High',
    emoji: '😰',
    colorBar: 'bg-amber-500',
    activeBorder: 'border-amber-500 ring-2 ring-amber-500/20 shadow-sm',
    activeBg: 'bg-amber-50/70',
    activeTile: 'bg-amber-100 text-amber-900',
    activeText: 'text-amber-950',
  },
  {
    level: 4,
    label: 'Severe',
    emoji: '🥵',
    colorBar: 'bg-orange-500',
    activeBorder: 'border-orange-500 ring-2 ring-orange-500/20 shadow-sm',
    activeBg: 'bg-orange-50/70',
    activeTile: 'bg-orange-100 text-orange-950',
    activeText: 'text-orange-950',
  },
  {
    level: 5,
    label: 'Extreme',
    emoji: '🔥',
    colorBar: 'bg-red-500',
    activeBorder: 'border-red-500 ring-2 ring-red-500/20 shadow-sm',
    activeBg: 'bg-red-50/70',
    activeTile: 'bg-red-100 text-red-950',
    activeText: 'text-red-950',
  },
];

function HeatReport() {
  const { isAuthenticated, requireAuth } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  // Check if user is authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      requireAuth('/login');
      return;
    }
  }, [isAuthenticated, requireAuth]);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadError, setUploadError] = useState(null); // safe message string after a failed submission
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    latitude: '',
    longitude: '',
    areaName: '',
    severity: '',
    causes: [],
    observedAt: getLocalDateTimeString(),
    description: '',
  });
  const userLat = useUserLocationStore((s) => s.lat);
  const userLng = useUserLocationStore((s) => s.lng);
  const geoStatus = useUserLocationStore((s) => s.status);
  const requestLocation = useUserLocationStore((s) => s.requestLocation);
  const appliedUserGeo = useRef(false);

  const mapCenter = useMemo(
    () => [
      Number(form.latitude) || userLat || 30.3753,
      Number(form.longitude) || userLng || 69.3451,
    ],
    [form.latitude, form.longitude, userLat, userLng]
  );

  const isInPakistan = useMemo(
    () => isLocationInPakistan(form.latitude, form.longitude),
    [form.latitude, form.longitude]
  );

  const validateStep = (currentStep) => {
    const nextErrors = {};
    if (currentStep === 1) {
      if (!form.latitude || !form.longitude) {
        nextErrors.location = 'Latitude and longitude are required.';
      } else if (!isLocationInPakistan(form.latitude, form.longitude)) {
        nextErrors.location = 'Report location must be within Pakistan.';
      }
    }
    if (currentStep === 2) {
      if (!form.severity) {
        nextErrors.severity = 'Select a severity level from 1 to 5.';
      }
    }
    if (currentStep === 3) {
      // Field notes description is optional — no mandatory error
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };
  const updateForm = (patch) =>
    setForm((current) => ({
      ...current,
      ...patch,
    }));

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (userLat == null || userLng == null || appliedUserGeo.current) {
      return;
    }
    appliedUserGeo.current = true;
    const applyLocation = async () => {
      updateForm({ latitude: userLat, longitude: userLng });
      try {
        const areaName = await detectAreaName(userLat, userLng);
        if (areaName) {
          updateForm({ areaName });
        }
      } catch {
        /* area name optional */
      }
    };
    applyLocation();
  }, [userLat, userLng]);

  const { data: ambientWeather, isLoading: weatherLoading } = useWeather(
    form.latitude,
    form.longitude,
    { save: false, enabled: step >= 1 && form.latitude != null }
  );

  const handleNext = () => {
    if (!validateStep(step)) {
      return;
    }
    setStep((current) => Math.min(current + 1, 4));
  };
  const handleGetLocation = async () => {
    setIsLocating(true);
    appliedUserGeo.current = false;
    const coords = await requestLocation({ force: true });
    if (!coords) {
      const err = useUserLocationStore.getState().error;
      toast.error(err || 'Failed to get location');
      setIsLocating(false);
      return;
    }
    updateForm({ latitude: coords.lat, longitude: coords.lng });
    try {
      const areaName = await detectAreaName(coords.lat, coords.lng);
      if (areaName) {
        updateForm({ areaName });
      }
      toast.success(areaName ? `Location: ${areaName}` : 'Location updated');
    } catch {
      toast.success('Coordinates updated');
    } finally {
      setIsLocating(false);
      appliedUserGeo.current = true;
    }
  };

  const handleCoordsBlur = async () => {
    if (form.latitude && form.longitude && !form.areaName) {
      try {
        const areaName = await detectAreaName(Number(form.latitude), Number(form.longitude));
        if (areaName) {
          updateForm({ areaName });
        }
      } catch {
        /* optional */
      }
    }
  };
  const handleSubmit = async () => {
    if (!validateStep(3)) {
      setStep(3);
      return;
    }
    setIsSubmitting(true);
    setUploadError(null);
    try {
      let temperature;
      try {
        const weather = await fetchCurrentWeather(
          Number(form.latitude),
          Number(form.longitude),
          { save: true }
        );
        temperature = weather.heatIndex ?? weather.temperature;
      } catch {
        temperature = ambientWeather?.heatIndex ?? ambientWeather?.temperature;
      }

      const reportPayload = {
        ...form,
        description: form.description.trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        temperature,
      };
      const body = buildReportFormData(reportPayload);

      setUploadProgress(null);
      await submitHeatReport(body, {
        onUploadProgress: (event) => {
          if (event.total) {
            setUploadProgress(Math.round((event.loaded * 100) / event.total));
          }
        },
      });
      setUploadProgress(null);
      setShowSuccessModal(true);
      setTimeout(() => {
        navigate('/my-reports');
      }, 3000);
    } catch (err) {
      // Distinguish network failure / server error / validation error with
      // safe, meaningful text — only the status code and a server-provided
      // message string ever reach the UI (see getSubmissionErrorMessage).
      const message = getSubmissionErrorMessage(err);
      setUploadError(message);
      toast.error(message);
      setUploadProgress(null);
      setIsSubmitting(false);
    }
  };
  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Submit Heat Report
          </h1>
          <p className="text-slate-600">
            Report urban heat observations and help identify problem areas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Live</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
            <Flame className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-slate-700">
              Step {step} of {steps.length}
            </span>
          </div>
        </div>
      </div>
      {/* Progress Stepper */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="relative">
          <div
            className="absolute top-5 left-0 right-0 -translate-y-1/2 px-5"
            aria-hidden="true"
          >
            <div className="w-full border-t-2 border-slate-200"></div>
          </div>
          <div className="relative flex justify-between">
            {steps.map((item) => (
              <div key={item.id} className="flex flex-col items-center">
                <button
                  onClick={() => item.id <= step && setStep(item.id)}
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                    item.id === step
                      ? 'border-green-500 bg-green-500 text-white shadow-lg shadow-green-500/25'
                      : item.id < step
                        ? 'border-green-500 bg-green-500 text-white cursor-pointer hover:bg-green-600'
                        : 'border-slate-300 bg-white text-slate-500'
                  }`}
                  disabled={item.id > step}
                >
                  {item.id < step ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{item.id}</span>
                  )}
                </button>
                <span
                  className={`mt-2 text-xs font-medium text-center max-w-15 ${
                    item.id === step
                      ? 'text-green-600'
                      : item.id < step
                        ? 'text-green-600'
                        : 'text-slate-500'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Error Display */}
      {errors.location || errors.severity || errors.description ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">
            <p className="font-semibold mb-1">
              Please complete the required fields:
            </p>
            <ul className="list-disc list-inside space-y-1">
              {errors.location && <li>• {errors.location}</li>}
              {errors.severity && <li>• {errors.severity}</li>}
              {errors.description && <li>• {errors.description}</li>}
            </ul>
          </div>
        </div>
      ) : null}
      {/* Form Content Grid */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Main Form Section — takes available width */}
        <div className="flex-1 min-w-0 space-y-6">
          {step === 1 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-600" />
                  Location Information
                </h3>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isLocating || geoStatus === 'loading'}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-green-50 border border-green-200 px-3.5 py-2 text-xs font-semibold text-green-700 shadow-xs hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                >
                  {isLocating || geoStatus === 'loading' ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-green-600/30 border-t-green-700 rounded-full animate-spin"></div>
                      Detecting location...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3.5 h-3.5 text-green-600" />
                      Use My Location
                    </>
                  )}
                </button>
              </div>

              {form.latitude && form.longitude && !isInPakistan && (
                <div className="rounded-xl border border-red-300 bg-red-50/90 p-3.5 text-xs text-red-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900">
                      Coordinates are outside Pakistan
                    </p>
                    <p className="mt-0.5 text-red-800 leading-relaxed">
                      ThermaX covers all locations across Pakistan. Please provide coordinates within Pakistan.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <MapPin className="w-4 h-4 text-green-500" />
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={form.latitude ?? ''}
                    onChange={(event) =>
                      updateForm({ latitude: event.target.value })
                    }
                    onBlur={handleCoordsBlur}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    placeholder="e.g. 24.8607"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <MapPin className="w-4 h-4 text-green-500" />
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={form.longitude ?? ''}
                    onChange={(event) =>
                      updateForm({ longitude: event.target.value })
                    }
                    onBlur={handleCoordsBlur}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    placeholder="e.g. 67.0011"
                  />
                </div>
              </div>

              {(geoStatus === 'loading' && !form.latitude) && (
                <p className="text-sm text-slate-500 flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-green-500/30 border-t-green-600 rounded-full animate-spin" />
                  Detecting your location for this report…
                </p>
              )}

              {ambientWeather && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                  <p className="font-semibold">Live weather at your location</p>
                  <p className="mt-1">
                    {ambientWeather.temperature}°C
                    {ambientWeather.heatIndex != null && (
                      <> · heat index {ambientWeather.heatIndex}°C</>
                    )}{' '}
                    · {ambientWeather.humidity}% humidity · {ambientWeather.condition}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <MapPin className="w-4 h-4 text-green-500" />
                  Area Name
                </label>
                <input
                  type="text"
                  value={form.areaName ?? ''}
                  onChange={(event) =>
                    updateForm({ areaName: event.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  placeholder="e.g. Saddar, Latifabad, Gulshan-e-Iqbal"
                />
                <p className="text-xs text-slate-400">
                  Auto-populated with your exact area name, or type to customize.
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Clock className="w-4 h-4 text-green-500" />
                  Observation Time
                </label>
                <input
                  type="datetime-local"
                  value={form.observedAt ?? ''}
                  onChange={(event) =>
                    updateForm({ observedAt: event.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                />
                <p className="text-xs text-slate-400">
                  Auto-selected to current date and time. Click to adjust if reporting past observation.
                </p>
              </div>
            </div>
          ) : null}
          {step === 2 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-green-600" />
                  Heat Severity Level
                </h3>
                <p className="text-sm text-slate-600">
                  Rate the heat intensity on a scale of 1 (mild) to 5 (extreme)
                </p>
              </div>

              <div className="grid grid-cols-5 gap-2.5 sm:gap-4">
                {SEVERITY_LEVELS.map((item) => {
                  const isSelected = form.severity === String(item.level);
                  return (
                    <button
                      key={item.level}
                      type="button"
                      onClick={() => updateForm({ severity: String(item.level) })}
                      className={`group relative flex flex-col items-center justify-between pt-4 pb-3 px-2 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden ${
                        isSelected
                          ? `${item.activeBorder} ${item.activeBg} -translate-y-0.5 shadow-sm`
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs hover:-translate-y-0.5'
                      }`}
                    >
                      {/* Top colored accent line */}
                      <div
                        className={`absolute top-0 inset-x-0 h-1 transition-all ${
                          isSelected ? item.colorBar : 'bg-transparent group-hover:bg-slate-200'
                        }`}
                      />

                      {/* Check badge when selected */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-3" />
                        </div>
                      )}

                      {/* Emoji Icon Container */}
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl mb-2 transition-transform duration-200 group-hover:scale-110 select-none ${
                          isSelected ? item.activeTile : 'bg-slate-50 text-slate-700'
                        }`}
                      >
                        {item.emoji}
                      </div>

                      {/* Severity Number */}
                      <span
                        className={`text-xl sm:text-2xl font-black tracking-tight leading-none ${
                          isSelected ? item.activeText : 'text-slate-900'
                        }`}
                      >
                        {item.level}
                      </span>

                      {/* Severity Label */}
                      <span
                        className={`text-[11px] sm:text-xs font-semibold mt-1 transition-colors ${
                          isSelected ? item.activeText : 'text-slate-500'
                        }`}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <AlertTriangle className="w-4 h-4 text-green-500" />
                  Likely causes
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {causes.map((cause) => {
                    const checked = form.causes.includes(cause);
                    return (
                      <label
                        key={cause}
                        className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-all ${
                          checked
                            ? 'border-green-500 bg-green-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              updateForm({
                                causes: checked
                                  ? form.causes.filter((item) => item !== cause)
                                  : [...form.causes, cause],
                              })
                            }
                            className="sr-only"
                          />
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              checked
                                ? 'border-green-500 bg-green-500'
                                : 'border-slate-300'
                            }`}
                          >
                            {checked && (
                              <CheckCircle className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                          {cause}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
          {step === 3 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  Field Evidence
                </h3>
                <p className="text-sm text-slate-600">
                  Describe your on-site observations (optional)
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <FileText className="w-4 h-4 text-green-500" />
                    Field notes
                  </label>
                  <span className="text-xs text-slate-400 font-medium">Optional</span>
                </div>
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(event) =>
                    updateForm({ description: event.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 resize-none"
                  placeholder="Describe radiant heat, pedestrian exposure, shade availability, or visible conditions (optional)..."
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Be specific about temperature, time of day, and
                    environmental conditions if available
                  </span>
                  <span>{form.description.length}/500</span>
                </div>
              </div>
            </div>
          ) : null}
          {step === 4 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Review & Submit
                </h3>
                <p className="text-sm text-slate-600">
                  Review your heat report before submitting to the moderation
                  queue
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-linear-to-br from-green-50 to-emerald-50 border border-green-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <h4 className="text-sm font-semibold text-green-800">
                      Location
                    </h4>
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-900">
                      {form.areaName || 'Not specified'}
                    </p>
                    <p className="text-sm text-slate-600 font-mono">
                      {form.latitude}, {form.longitude}
                    </p>
                    {!isInPakistan && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        <AlertTriangle className="w-3 h-3" /> Outside Pakistan
                      </span>
                    )}
                  </div>
                </div>
                <div className="rounded-xl bg-linear-to-br from-green-50 to-emerald-50 border border-green-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Thermometer className="w-4 h-4 text-green-600" />
                    <h4 className="text-sm font-semibold text-green-800">
                      Severity
                    </h4>
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span>Level {form.severity || 'Not set'}</span>
                      {form.severity &&
                        SEVERITY_LEVELS.find((s) => String(s.level) === String(form.severity)) && (
                          <span className="text-sm font-medium text-slate-600">
                            · {SEVERITY_LEVELS.find((s) => String(s.level) === String(form.severity)).label} {SEVERITY_LEVELS.find((s) => String(s.level) === String(form.severity)).emoji}
                          </span>
                        )}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl bg-linear-to-br from-sky-50 to-blue-50 border border-sky-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Thermometer className="w-4 h-4 text-sky-600" />
                    <h4 className="text-sm font-semibold text-sky-800">
                      Ambient (API)
                    </h4>
                  </div>
                  <div className="space-y-1 text-sm text-slate-700">
                    {weatherLoading ? (
                      <p>Loading live weather…</p>
                    ) : ambientWeather ? (
                      <>
                        <p>
                          <span className="font-semibold">
                            {ambientWeather.temperature}°C
                          </span>{' '}
                          · HI {ambientWeather.heatIndex}°C
                        </p>
                        <p>
                          {ambientWeather.humidity}% humidity · UV{' '}
                          {ambientWeather.uv}
                        </p>
                        <p className="text-slate-500">{ambientWeather.condition}</p>
                      </>
                    ) : (
                      <p className="text-slate-500">Weather unavailable</p>
                    )}
                  </div>
                </div>
                <div className="rounded-xl bg-linear-to-br from-amber-50 to-orange-50 border border-amber-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h4 className="text-sm font-semibold text-amber-800">
                      Likely Causes
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {form.causes.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {form.causes.map((cause) => (
                          <span
                            key={cause}
                            className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-xs font-medium"
                          >
                            <CheckCircle className="w-3 h-3" />
                            {cause}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic">
                        No causes selected
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <h4 className="text-sm font-semibold text-slate-800">
                    Field Notes
                  </h4>
                </div>
                <p className="text-sm leading-relaxed text-slate-700">
                  {form.description || 'No description provided (optional).'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-lg text-sm">
                  <CheckCircle className="w-3 h-3" />
                  Ready for moderation queue
                </span>
              </div>
            </div>
          ) : null}
          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(current - 1, 1))}
              disabled={step === 1}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-200 shadow-sm transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Previous
            </button>
            <div className="flex items-center gap-3">
              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-500/25 transition-all hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                >
                  Continue
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-500/25 transition-all hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Submit report
                    </>
                  )}
                </button>
              )}
            </div>
            {/* Upload progress + failure — visible while the photo is being sent */}
            <UploadProgress progress={uploadProgress} error={uploadError} />
          </div>
        </div>
        {/* Sidebar Map Section — sticky on desktop */}
        <div className="space-y-6 lg:w-72 lg:shrink-0 lg:sticky lg:top-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-600" />
              Location Preview
            </h3>
            <MiniMap center={mapCenter} />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-green-600" />
              Form Guide
            </h3>
            <div className="space-y-3 text-sm text-slate-600">
              <p>• Step 1 validates location coordinates and area metadata</p>
              <p>
                • Step 2 captures severity and likely causes for hotspot
                modeling
              </p>
              <p>
                • Step 3 adds qualitative field notes and on-site observations (optional)
              </p>
              <p>• Step 4 reviews the payload before it enters moderation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-fade-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Report Submitted!
              </h3>
              <p className="text-slate-600 mb-6">
                Your heat report has been submitted successfully and is now in the moderation queue.
              </p>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="w-5 h-5 border-2 border-slate-300 border-t-green-500 rounded-full animate-spin" />
                <span>Redirecting to My Reports...</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default HeatReport;
