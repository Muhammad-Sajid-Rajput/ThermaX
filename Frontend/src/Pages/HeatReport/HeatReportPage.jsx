import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import MiniMap from '../../components/map/MiniMap';
import { detectAreaName, submitHeatReport } from '../../services/api';
import {
  MapPin,
  Camera,
  Clock,
  AlertTriangle,
  CheckCircle,
  Upload,
  User,
  Thermometer,
  FileText,
  Flame,
} from 'lucide-react';
const steps = [
  { id: 1, label: 'Location' },
  { id: 2, label: 'Severity' },
  { id: 3, label: 'Evidence' },
  { id: 4, label: 'Review' },
];
const causes = [
  'Sparse tree canopy',
  'Heat-retaining pavement',
  'Industrial roof reflection',
  'Crowded transit stop',
  'Low ventilation corridor',
];
function HeatReport() {
  const { user, isAuthenticated, requireAuth } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  // Check if user is authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      requireAuth('/auth');
      return;
    }
  }, [isAuthenticated, requireAuth]);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    latitude: 24.8532,
    longitude: 67.0284,
    areaName: 'Saddar',
    severity: '',
    causes: [],
    observedAt: '2026-04-25T08:10',
    description: '',
  });
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);
  const marker = useMemo(
    () => ({
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      label: form.areaName || 'Report location',
    }),
    [form.areaName, form.latitude, form.longitude]
  );
  const validateStep = (currentStep) => {
    const nextErrors = {};
    if (currentStep === 1) {
      if (!form.latitude || !form.longitude) {
        nextErrors.location = 'Latitude and longitude are required.';
      }
    }
    if (currentStep === 2) {
      if (!form.severity) {
        nextErrors.severity = 'Select a severity level from 1 to 5.';
      }
    }
    if (currentStep === 3) {
      if (!form.description.trim()) {
        nextErrors.description =
          'Describe what the observer is experiencing on-site.';
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };
  const updateForm = (patch) =>
    setForm((current) => ({
      ...current,
      ...patch,
    }));
  const handleNext = () => {
    if (!validateStep(step)) {
      return;
    }
    setStep((current) => Math.min(current + 1, 4));
  };
  const handleAutoDetect = async () => {
    setIsLocating(true);
    try {
      const areaName = await detectAreaName(
        Number(form.latitude),
        Number(form.longitude)
      );
      updateForm({ areaName });
      toast.success(`Area detected: ${areaName}`);
    } catch (err) {
      toast.error('Failed to detect area');
    } finally {
      setIsLocating(false);
    }
  };
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        updateForm({ latitude, longitude });
        try {
          const areaName = await detectAreaName(latitude, longitude);
          updateForm({ areaName });
          toast.success('Location updated successfully');
        } catch (err) {
          toast.success('Coordinates updated, but failed to detect area name');
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        toast.error('Failed to get location:' + error.message);
      }
    );
  };
  const handleSubmit = async () => {
    if (!validateStep(3)) {
      setStep(3);
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await submitHeatReport({
        ...form,
        image: selectedFile,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      });
      setShowSuccessModal(true);
      setTimeout(() => {
        navigate('/my-reports');
      }, 3000);
    } catch (err) {
      toast.error('Submission failed');
      setIsSubmitting(false);
    }
  };
  const activeStep = steps.find((item) => item.id === step);
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
            className="absolute inset-0 flex items-center"
            aria-hidden="true"
          >
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-between">
            {steps.map((item) => (
              <div key={item.id} className="flex flex-col items-center">
                <button
                  onClick={() => item.id <= step && setStep(item.id)}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
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
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div className="text-sm text-green-700">
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
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-600" />
                Location Information
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <MapPin className="w-4 h-4 text-green-500" />
                    Latitude
                  </label>
                  <input
                    type="number"
                    value={form.latitude}
                    onChange={(event) =>
                      updateForm({ latitude: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    placeholder="24.8607"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <MapPin className="w-4 h-4 text-green-500" />
                    Longitude
                  </label>
                  <input
                    type="number"
                    value={form.longitude}
                    onChange={(event) =>
                      updateForm({ longitude: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    placeholder="67.0011"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isLocating}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLocating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-500/30 border-t-slate-700 rounded-full animate-spin"></div>
                      Getting location...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4" />
                      Use My Location
                    </>
                  )}
                </button>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <MapPin className="w-4 h-4 text-green-500" />
                  Area name
                </label>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input
                    type="text"
                    value={form.areaName}
                    onChange={(event) =>
                      updateForm({ areaName: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    placeholder="Enter area name"
                  />
                  <button
                    type="button"
                    onClick={handleAutoDetect}
                    disabled={isLocating}
                    className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-green-600/25 transition-all hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
                  >
                    {isLocating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Detecting...
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4" />
                        Auto-detect
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Clock className="w-4 h-4 text-green-500" />
                  Observation time
                </label>
                <input
                  type="datetime-local"
                  value={form.observedAt}
                  onChange={(event) =>
                    updateForm({ observedAt: event.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                />
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
              <div className="grid gap-4 sm:grid-cols-5">
                {[1, 2, 3, 4, 5].map((severity) => {
                  const severityColors = {
                    1: 'bg-emerald-50 border-emerald-200 text-emerald-700',
                    2: 'bg-green-50 border-green-200 text-green-700',
                    3: 'bg-yellow-50 border-yellow-200 text-yellow-700',
                    4: 'bg-green-50 border-green-200 text-green-700',
                    5: 'bg-red-50 border-red-200 text-red-700',
                  };
                  const severityIcons = {
                    1: '😌',
                    2: '😐',
                    3: '😰',
                    4: '🥵',
                    5: '🔥',
                  };
                  return (
                    <button
                      key={severity}
                      type="button"
                      onClick={() => updateForm({ severity: String(severity) })}
                      className={`relative rounded-xl border-2 p-4 text-center transition-all hover:scale-105 ${
                        form.severity === String(severity)
                          ? 'border-green-500 bg-green-500 text-white shadow-lg shadow-green-500/25 ring-2 ring-green-500/20'
                          : severityColors[severity]
                      }`}
                    >
                      <div className="text-3xl mb-2">
                        {severityIcons[severity]}
                      </div>
                      <div className="text-2xl font-bold">{severity}</div>
                      <div className="text-xs font-semibold mt-1">
                        {severity === 1
                          ? 'Mild'
                          : severity === 2
                            ? 'Moderate'
                            : severity === 3
                              ? 'High'
                              : severity === 4
                                ? 'Severe'
                                : 'Extreme'}
                      </div>
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
                  Describe your observation and optionally upload a photo
                </p>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <FileText className="w-4 h-4 text-green-500" />
                  Field notes
                </label>
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(event) =>
                    updateForm({ description: event.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 resize-none"
                  placeholder="Describe radiant heat, pedestrian exposure, shade availability, and any visible surface conditions..."
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Be specific about temperature, time of day, and
                    environmental conditions
                  </span>
                  <span>{form.description.length}/500</span>
                </div>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Camera className="w-4 h-4 text-green-500" />
                  Photo evidence
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setSelectedFile(event.target.files?.[0] ?? null)
                    }
                    className="sr-only"
                    id="photo-upload"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="group flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 cursor-pointer transition-all hover:border-green-500 hover:bg-green-50"
                  >
                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-green-500 transition-colors mb-3" />
                    <span className="text-sm font-medium text-slate-700 mb-1">
                      {selectedFile
                        ? selectedFile.name
                        : 'Click to upload or drag and drop'}
                    </span>
                    <span className="text-xs text-slate-500">
                      PNG, JPG, GIF up to 10MB
                    </span>
                  </label>
                </div>
                {previewUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200">
                    <img
                      alt="Selected upload preview"
                      className="w-full h-64 object-cover"
                      src={previewUrl}
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
                    >
                      <span className="text-slate-600 text-lg leading-none">
                        ×
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                    <Camera className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">
                      Image preview will appear here
                    </p>
                  </div>
                )}
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
              <div className="grid gap-4 md:grid-cols-3">
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
                    <p className="font-semibold text-slate-900">
                      Level {form.severity || 'Not set'}
                    </p>
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
                  {form.description || 'No description provided yet.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-sm">
                  <Camera className="w-3 h-3" />
                  {selectedFile ? selectedFile.name : 'No photo attached'}
                </span>
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
          </div>
        </div>
        {/* Sidebar Map Section — sticky on desktop */}
        <div className="space-y-6 lg:w-72 lg:shrink-0 lg:sticky lg:top-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-600" />
              Location Preview
            </h3>
            <MiniMap marker={marker} />
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
                • Step 3 adds qualitative evidence and optional image upload
              </p>
              <p>• Step 4 reviews the payload before it enters moderation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-300">
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
