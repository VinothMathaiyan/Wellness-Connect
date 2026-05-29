import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Search, Check, AlertCircle, MapPin } from 'lucide-react';
import type { TrainingPreferences } from '../../../types';
import { supabase } from '../../../lib/supabaseClient';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import ProgressBar from '../../../components/ProgressBar';
import OnboardingLayout from '../components/OnboardingLayout';
import { useNavigate } from 'react-router-dom';
import { useWellness } from '../../../context/WellnessContext';
import { upsertClientProfile, createAssessmentRequest } from '../../../services/supabaseService';

const CITIES = [
  "Chennai", "Bangalore", "Mumbai", "Delhi", "Hyderabad", "Pune",
  "Kolkata", "Ahmedabad", "Jaipur", "Surat", "Kochi", "Coimbatore",
  "Madurai", "Visakhapatnam", "Chandigarh", "Indore", "Nagpur",
  "Bhopal", "Lucknow", "Patna", "Bhubaneswar", "Guwahati"
];

// SECTION 2 — Goals (max 3)
const GOAL_OPTIONS = [
  "Weight Loss", "Muscle Gain", "General Fitness", "Flexibility",
  "Rehabilitation", "Mobility", "Athletic Performance", "Stress Reduction",
];

// SECTION 2 — Training styles → training_preferences.training_styles
const TRAINING_STYLE_OPTIONS = [
  "Yoga", "Strength Training", "HIIT", "Cardio",
  "Pilates", "Functional Training", "Rehab Training", "Mobility Training",
];

// SECTION 3 — Schedule
const SESSION_MODE_OPTIONS = ["Online", "In-Person", "Either"];
const PREFERRED_TIME_OPTIONS = ["Early Morning", "Morning", "Afternoon", "Evening", "Night"];

export default function HealthProfileScreen() {
  const navigate = useNavigate();
  const { appState, handleHealthProfileContinue, userId } = useWellness();
  const initialData = appState;
  // Parse initial DOB
  const initDob = initialData?.dob ? initialData.dob.split('-') : ['', '', ''];

  const [formData, setFormData] = useState({
    dobDay: initDob[2] || '',
    dobMonth: initDob[1] || '',
    dobYear: initDob[0] || '',
    gender: initialData?.gender || '',
    heightValue: initialData?.height_value ? String(initialData.height_value) : '',
    heightInches: '',
    heightUnit: initialData?.height_unit || 'cm',
    weightValue: initialData?.weight_value ? String(initialData.weight_value) : '',
    weightUnit: initialData?.weight_unit || 'kg',
    city: initialData?.city || '',
    fitnessGoals: initialData?.goals || ([] as string[]),
  });

  // Training preferences (closed-ended) — saved to client_profiles.training_preferences
  const [trainingPrefs, setTrainingPrefs] = useState<TrainingPreferences>({
    training_styles: [],
    session_mode: '',
    preferred_times: [],
  });

  // Pre-populate training preferences from DB if already saved
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('client_profiles')
      .select('training_preferences')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const prefs = data?.training_preferences as TrainingPreferences | null;
        if (prefs) {
          setTrainingPrefs({
            training_styles: prefs.training_styles ?? [],
            session_mode:    prefs.session_mode ?? '',
            preferred_times: prefs.preferred_times ?? [],
          });
        }
      });
    return () => { cancelled = true; };
  }, [userId]);

  const toggleTrainingStyle = (style: string) => {
    setTrainingPrefs(prev => {
      const current = prev.training_styles ?? [];
      return {
        ...prev,
        training_styles: current.includes(style)
          ? current.filter(s => s !== style)
          : [...current, style],
      };
    });
  };

  const togglePreferredTime = (slot: string) => {
    setTrainingPrefs(prev => {
      const current = prev.preferred_times ?? [];
      return {
        ...prev,
        preferred_times: current.includes(slot)
          ? current.filter(s => s !== slot)
          : [...current, slot],
      };
    });
  };

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCitySheetOpen, setIsCitySheetOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [isCustomCity, setIsCustomCity] = useState(false);
  const [showConfirmBack, setShowConfirmBack] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Computed DOB string
  const dobString = useMemo(() => {
    if (!formData.dobYear || !formData.dobMonth || !formData.dobDay) return '';
    const y = formData.dobYear.padStart(4, '0');
    const m = formData.dobMonth.padStart(2, '0');
    const d = formData.dobDay.padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [formData.dobDay, formData.dobMonth, formData.dobYear]);

  // Age calculation
  const age = useMemo(() => {
    if (!dobString || dobString.length < 10) return null;
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }, [dobString]);

  // Compute height_cm / weight_kg from whichever unit is active
  const heightCm = useMemo<number | null>(() => {
    if (!formData.heightValue) return null;
    if (formData.heightUnit === 'cm') {
      const v = parseFloat(formData.heightValue);
      return isNaN(v) ? null : v;
    }
    const ft = parseInt(formData.heightValue);
    const inch = parseInt(formData.heightInches || '0');
    if (isNaN(ft)) return null;
    return Math.round(ft * 30.48 + inch * 2.54);
  }, [formData.heightValue, formData.heightInches, formData.heightUnit]);

  const weightKg = useMemo<number | null>(() => {
    if (!formData.weightValue) return null;
    const v = parseFloat(formData.weightValue);
    if (isNaN(v)) return null;
    return formData.weightUnit === 'kg' ? v : Math.round((v / 2.20462) * 10) / 10;
  }, [formData.weightValue, formData.weightUnit]);

  // Auto-calculated BMI (display only — `bmi` is a generated DB column)
  const bmi = useMemo<number | null>(() => {
    if (!heightCm || !weightKg || heightCm <= 0) return null;
    const m = heightCm / 100;
    return Math.round((weightKg / (m * m)) * 10) / 10;
  }, [heightCm, weightKg]);

  // Validation
  const validate = () => {
    const newErrors: Record<string, string> = {};

    // DOB (Optional)
    if (formData.dobDay || formData.dobMonth || formData.dobYear) {
      if (!formData.dobDay || !formData.dobMonth || !formData.dobYear) {
        newErrors.dateOfBirth = "Please complete your date of birth or leave blank";
      } else {
        const d = parseInt(formData.dobDay);
        const m = parseInt(formData.dobMonth);
        const y = parseInt(formData.dobYear);
        if (isNaN(d) || d < 1 || d > 31 || isNaN(m) || m < 1 || m > 12 || isNaN(y) || y < 1920 || y > new Date().getFullYear()) {
          newErrors.dateOfBirth = "Please enter a valid date";
        } else if (age !== null) {
          if (age < 16) newErrors.dateOfBirth = "You must be at least 16 years old to use WellnessConnect";
          else if (age > 80) newErrors.dateOfBirth = "Please contact us directly for personalised support";
        }
      }
    }

    // Height (Optional)
    if (formData.heightValue) {
      if (formData.heightUnit === 'cm') {
        const val = parseFloat(formData.heightValue);
        if (isNaN(val) || val < 50 || val > 250) {
          newErrors.height = "Height must be between 50 cm and 250 cm";
        }
      } else {
        const ft = parseInt(formData.heightValue);
        const inch = parseInt(formData.heightInches || '0');
        if (isNaN(ft) || ft < 1 || ft > 8 || isNaN(inch) || inch < 0 || inch > 11) {
          newErrors.height = "Please enter a valid height";
        } else {
          const cm = Math.round(ft * 30.48 + inch * 2.54);
          if (cm < 50 || cm > 250) newErrors.height = "Please enter a valid height";
        }
      }
    }

    // Weight (Optional)
    if (formData.weightValue) {
      if (formData.weightUnit === 'kg') {
        const val = parseFloat(formData.weightValue);
        if (isNaN(val) || val < 20 || val > 300) {
          newErrors.weight = "Weight must be between 20 kg and 300 kg";
        }
      } else {
        const val = parseFloat(formData.weightValue);
        if (isNaN(val) || val < 44 || val > 661) {
          newErrors.weight = "Please enter a valid weight";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormFilledEnough = useMemo(() => {
    return formData.dobDay || formData.dobMonth || formData.dobYear || formData.gender ||
      formData.heightValue || formData.weightValue || formData.city ||
      formData.fitnessGoals.length > 0 ||
      (trainingPrefs.training_styles?.length ?? 0) > 0 ||
      !!trainingPrefs.session_mode ||
      (trainingPrefs.preferred_times?.length ?? 0) > 0;
  }, [formData, trainingPrefs]);

  const canContinue = true;

  const handleToggleGoal = (goal: string) => {
    setFormData(prev => {
      const isSelected = prev.fitnessGoals.includes(goal);
      if (isSelected) {
        return { ...prev, fitnessGoals: prev.fitnessGoals.filter(g => g !== goal) };
      }
      if (prev.fitnessGoals.length >= 3) return prev;
      return { ...prev, fitnessGoals: [...prev.fitnessGoals, goal] };
    });
  };

  const toggleHeightUnit = () => {
    setFormData(prev => {
      if (prev.heightUnit === 'cm') {
        const cm = parseFloat(prev.heightValue);
        if (isNaN(cm)) return { ...prev, heightUnit: 'ft/in', heightValue: '', heightInches: '' };
        const ft = Math.floor(cm / 30.48);
        const inch = Math.round((cm / 30.48 - ft) * 12);
        return { ...prev, heightUnit: 'ft/in', heightValue: String(ft), heightInches: String(inch) };
      } else {
        const ft = parseInt(prev.heightValue);
        const inch = parseInt(prev.heightInches || '0');
        if (isNaN(ft)) return { ...prev, heightUnit: 'cm', heightValue: '', heightInches: '' };
        const cm = Math.round(ft * 30.48 + inch * 2.54);
        return { ...prev, heightUnit: 'cm', heightValue: String(cm), heightInches: '' };
      }
    });
  };

  const toggleWeightUnit = () => {
    setFormData(prev => {
      const val = parseFloat(prev.weightValue);
      if (isNaN(val)) return { ...prev, weightUnit: prev.weightUnit === 'kg' ? 'lbs' : 'kg', weightValue: '' };
      if (prev.weightUnit === 'kg') {
        return { ...prev, weightUnit: 'lbs', weightValue: String(Math.round(val * 2.20462)) };
      } else {
        return { ...prev, weightUnit: 'kg', weightValue: String(Math.round(val / 2.20462 * 10) / 10) };
      }
    });
  };

  const handleContinue = async () => {
    if (!validate()) return;
    setSaveError(null);
    setIsSaving(true);

    // Update WellnessContext (keep the simplified subset)
    handleHealthProfileContinue({
      dob: dobString || null,
      gender: formData.gender || null,
      height_value: formData.heightValue ? parseFloat(formData.heightValue) : null,
      height_unit: formData.heightUnit,
      weight_value: formData.weightValue ? parseFloat(formData.weightValue) : null,
      weight_unit: formData.weightUnit,
      city: formData.city || null,
      goals: formData.fitnessGoals,
      training_preferences: {
        training_styles: trainingPrefs.training_styles ?? [],
        session_mode:    trainingPrefs.session_mode || '',
        preferred_times: trainingPrefs.preferred_times ?? [],
      },
    });

    // Persist the simplified client-owned fields to Supabase. Medical
    // conditions, fitness level and activity level are intentionally omitted —
    // the assessment team owns those, so we never overwrite them here.
    if (userId) {
      const payload = {
        dob:        dobString || null,
        gender:     formData.gender || null,
        height_cm:  heightCm,
        weight_kg:  weightKg,
        goals:      formData.fitnessGoals,
        training_preferences: {
          training_styles: trainingPrefs.training_styles ?? [],
          session_mode:    trainingPrefs.session_mode || '',
          preferred_times: trainingPrefs.preferred_times ?? [],
        },
      };
      console.log('[HealthProfile] Saving to Supabase:', { userId, payload, city: formData.city });

      const result = await upsertClientProfile(userId, payload, formData.city || null);

      if (!result.ok) {
        setIsSaving(false);
        setSaveError(`Save failed: ${result.errorMessage ?? 'Unknown error'}`);
        return;
      }

      // Auto-create the assessment record so this client surfaces in the
      // Assessment App queue. Silent + non-blocking.
      await createAssessmentRequest(userId);
    } else {
      console.warn('[HealthProfile] No userId — skipping Supabase save');
    }

    setIsSaving(false);
    navigate('/onboarding/assessment');
  };

  const filteredCities = useMemo(() => {
    return CITIES.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));
  }, [citySearch]);

  const selectCity = (city: string) => {
    setFormData(prev => ({ ...prev, city }));
    setIsCitySheetOpen(false);
    setIsCustomCity(false);
    setCitySearch('');
  };

  return (
    <OnboardingLayout
      header={
        <>
          <header className="flex items-center px-4 py-4">
            <button
              type="button"
              onClick={() => {
                if (isFormFilledEnough) setShowConfirmBack(true);
                else navigate(-1);
              }}
              className="p-1 -ml-1 text-text-primary relative z-50"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex-1 flex justify-center -ml-6">
              <h1 className="text-primary font-bold text-xl tracking-tight">WellnessConnect</h1>
            </div>
          </header>
          <ProgressBar
            currentStep={2}
            totalSteps={4}
            title="helps us match you with the right trainer"
          />
        </>
      }
      footer={
        <div className="space-y-2">
          {saveError && (
            <p className="text-[12px] text-red-600 text-center font-medium px-2">{saveError}</p>
          )}
          <Button onClick={handleContinue} disabled={!canContinue || isSaving}>
            {isSaving ? 'Saving…' : 'Continue'}
          </Button>
        </div>
      }
      useStandardPadding={false}
    >
      <div className="space-y-10">

          {/* Support Banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-light/50 border border-blue/10 p-4 rounded-xl flex gap-3"
          >
            <div className="text-blue shrink-0 pt-0.5"><AlertCircle size={20} /></div>
            <p className="text-[12px] text-blue leading-relaxed font-medium">
              Just a few basics — our assessment team will go through the detailed health questions with you during your review call.
            </p>
          </motion.div>

          {/* SECTION 1: ABOUT YOU */}
          <section className="space-y-6">
            <h2 className="label-caps !text-[11px] text-text-secondary">Section 1 — About You</h2>

            {/* DOB */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[13px] font-medium text-text-primary">Date of birth</label>
                <span className="text-[10px] text-text-secondary font-medium px-2 py-0.5 bg-input-bg rounded-md">Optional</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  placeholder="DD"
                  maxLength={2}
                  className="text-center"
                  value={formData.dobDay}
                  onChange={(e) => setFormData(prev => ({ ...prev, dobDay: e.target.value.slice(0, 2) }))}
                  error={errors.dateOfBirth ? '' : undefined}
                />
                <Input
                  type="number"
                  placeholder="MM"
                  maxLength={2}
                  className="text-center"
                  value={formData.dobMonth}
                  onChange={(e) => setFormData(prev => ({ ...prev, dobMonth: e.target.value.slice(0, 2) }))}
                />
                <Input
                  type="number"
                  placeholder="YYYY"
                  maxLength={4}
                  className="text-center"
                  value={formData.dobYear}
                  onChange={(e) => setFormData(prev => ({ ...prev, dobYear: e.target.value.slice(0, 4) }))}
                />
              </div>
              {age !== null && !errors.dateOfBirth && (
                <p className="text-[11px] text-text-secondary">Age: {age} years</p>
              )}
              {errors.dateOfBirth && <p className="text-red-500 text-[11px] mt-1">{errors.dateOfBirth}</p>}
            </div>

            {/* Gender */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[13px] font-medium text-text-primary">Gender</label>
                <span className="text-[10px] text-text-secondary font-medium px-2 py-0.5 bg-input-bg rounded-md">Optional</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {["Male", "Female", "Non-binary", "Prefer not to say"].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setFormData(prev => ({ ...prev, gender: opt }))}
                    className={`flex items-center gap-3 p-3 border rounded-xl transition-all ${formData.gender === opt
                        ? 'border-primary bg-green-light/20 text-primary font-medium'
                        : 'border-gray-300 text-text-secondary'
                      }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.gender === opt ? 'border-primary' : 'border-gray-300'}`}>
                      {formData.gender === opt && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <span className="text-[12px]">{opt}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Height */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <label className="text-[13px] font-medium text-text-primary">Height</label>
                  <span className="text-[10px] text-text-secondary font-medium px-2 py-0.5 bg-input-bg rounded-md">Optional</span>
                </div>
                <div className="flex bg-input-bg rounded-lg p-0.5 border border-gray-300 overflow-hidden">
                  <button
                    onClick={() => formData.heightUnit !== 'cm' && toggleHeightUnit()}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${formData.heightUnit === 'cm' ? 'bg-white shadow-sm text-primary' : 'text-text-secondary'}`}
                  >
                    cm
                  </button>
                  <button
                    onClick={() => formData.heightUnit !== 'ft/in' && toggleHeightUnit()}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${formData.heightUnit === 'ft/in' ? 'bg-white shadow-sm text-primary' : 'text-text-secondary'}`}
                  >
                    ft/in
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                {formData.heightUnit === 'cm' ? (
                  <Input
                    type="number"
                    placeholder="170"
                    value={formData.heightValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, heightValue: e.target.value }))}
                    error={errors.height}
                  />
                ) : (
                  <>
                    <div className="flex-1 relative">
                      <Input
                        type="number"
                        placeholder="5"
                        value={formData.heightValue}
                        onChange={(e) => setFormData(prev => ({ ...prev, heightValue: e.target.value }))}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-text-secondary">ft</span>
                    </div>
                    <div className="flex-1 relative">
                      <Input
                        type="number"
                        placeholder="10"
                        value={formData.heightInches}
                        onChange={(e) => setFormData(prev => ({ ...prev, heightInches: e.target.value }))}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-text-secondary">in</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Weight */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <label className="text-[13px] font-medium text-text-primary">Weight</label>
                  <span className="text-[10px] text-text-secondary font-medium px-2 py-0.5 bg-input-bg rounded-md">Optional</span>
                </div>
                <div className="flex bg-input-bg rounded-lg p-0.5 border border-gray-300 overflow-hidden">
                  <button
                    onClick={() => formData.weightUnit !== 'kg' && toggleWeightUnit()}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${formData.weightUnit === 'kg' ? 'bg-white shadow-sm text-primary' : 'text-text-secondary'}`}
                  >
                    kg
                  </button>
                  <button
                    onClick={() => formData.weightUnit !== 'lbs' && toggleWeightUnit()}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${formData.weightUnit === 'lbs' ? 'bg-white shadow-sm text-primary' : 'text-text-secondary'}`}
                  >
                    lbs
                  </button>
                </div>
              </div>
              <Input
                type="number"
                step="0.1"
                placeholder={formData.weightUnit === 'kg' ? "70" : "154"}
                value={formData.weightValue}
                onChange={(e) => setFormData(prev => ({ ...prev, weightValue: e.target.value }))}
                error={errors.weight}
              />
              {/* Auto-calculated BMI (read-only) */}
              {bmi !== null && (
                <div className="bg-green-light/20 border border-primary/15 rounded-xl px-3 py-2 mt-1">
                  <p className="text-[12px] font-semibold text-primary">Your BMI: {bmi.toFixed(1)}</p>
                </div>
              )}
            </div>

            {/* City */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[13px] font-medium text-text-primary">City</label>
                <span className="text-[10px] text-text-secondary font-medium px-2 py-0.5 bg-input-bg rounded-md">Optional</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCitySheetOpen(true)}
                className={`w-full flex items-center justify-between p-3.5 bg-input-bg border rounded-xl text-left transition-all ${errors.city ? 'border-red-500 ring-1 ring-red-500/20' : 'border-gray-300'
                  }`}
              >
                <span className={`text-[14px] ${formData.city ? 'text-text-primary' : 'text-text-secondary opacity-60'}`}>
                  {formData.city || "Select your city"}
                </span>
                <MapPin size={18} className="text-text-secondary" />
              </button>
              {errors.city && <p className="text-red-500 text-[11px] mt-1">{errors.city}</p>}
            </div>
          </section>

          {/* SECTION 2: YOUR FITNESS GOALS */}
          <section className="space-y-6">
            <h2 className="label-caps !text-[11px] text-text-secondary">Section 2 — Your Fitness Goals</h2>

            {/* Q1 — Main goals (max 3) */}
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-[13px] font-medium text-text-primary">What's your main fitness goal?</p>
                <p className="text-[12px] text-text-secondary">Select up to 3</p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {GOAL_OPTIONS.map(goal => {
                  const isSelected = formData.fitnessGoals.includes(goal);
                  const isDisabled = !isSelected && formData.fitnessGoals.length >= 3;
                  return (
                    <button
                      key={goal}
                      onClick={() => !isDisabled && handleToggleGoal(goal)}
                      disabled={isDisabled}
                      className={`px-4 py-2 rounded-full text-[12px] font-medium transition-all ${
                        isSelected
                          ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                          : isDisabled
                          ? 'bg-[#F3F4F6] text-[#D1D5DB] border border-[#E5E7EB] cursor-not-allowed opacity-50'
                          : 'bg-[#F3F4F6] text-[#6B7280] border border-[#D1D5DB]/50'
                        }`}
                    >
                      {goal}
                    </button>
                  );
                })}
              </div>
              {formData.fitnessGoals.includes("Rehabilitation") && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-light/30 border border-amber/20 p-4 rounded-xl flex gap-3"
                >
                  <div className="text-amber shrink-0 pt-0.5">⚠️</div>
                  <p className="text-[12px] text-amber-dark leading-relaxed font-medium">
                    Our assessment team will take extra care during your health review given your rehabilitation goal.
                  </p>
                </motion.div>
              )}
            </div>

            {/* Q2 — Training styles (multi-select) */}
            <div className="space-y-3">
              <label className="text-[13px] font-medium text-text-primary">What type of training interests you?</label>
              <div className="flex flex-wrap gap-2.5">
                {TRAINING_STYLE_OPTIONS.map(style => {
                  const isSelected = (trainingPrefs.training_styles ?? []).includes(style);
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => toggleTrainingStyle(style)}
                      className={`px-4 py-2 rounded-full text-[12px] font-medium transition-all ${
                        isSelected
                          ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                          : 'bg-[#F3F4F6] text-[#6B7280] border border-[#D1D5DB]/50'
                      }`}
                    >
                      {style}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* SECTION 3: YOUR SCHEDULE */}
          <section className="space-y-6">
            <h2 className="label-caps !text-[11px] text-text-secondary">Section 3 — Your Schedule</h2>

            {/* Q3 — Session mode (single select) */}
            <div className="space-y-3">
              <label className="text-[13px] font-medium text-text-primary">How do you prefer to train?</label>
              <div className="flex flex-wrap gap-2.5">
                {SESSION_MODE_OPTIONS.map(opt => {
                  const isSelected = trainingPrefs.session_mode === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setTrainingPrefs(prev => ({ ...prev, session_mode: opt }))}
                      className={`px-4 py-2 rounded-full text-[12px] font-medium transition-all ${
                        isSelected
                          ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                          : 'bg-[#F3F4F6] text-[#6B7280] border border-[#D1D5DB]/50'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Q4 — Preferred times (multi-select) */}
            <div className="space-y-3">
              <label className="text-[13px] font-medium text-text-primary">When are you available?</label>
              <div className="flex flex-wrap gap-2.5">
                {PREFERRED_TIME_OPTIONS.map(slot => {
                  const isSelected = (trainingPrefs.preferred_times ?? []).includes(slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => togglePreferredTime(slot)}
                      className={`px-4 py-2 rounded-full text-[12px] font-medium transition-all ${
                        isSelected
                          ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                          : 'bg-[#F3F4F6] text-[#6B7280] border border-[#D1D5DB]/50'
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

        </div>

        {/* City Bottom Sheet */}
        <AnimatePresence>
          {isCitySheetOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 z-[60]"
                onClick={() => setIsCitySheetOpen(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="absolute bottom-0 w-full bg-white rounded-t-3xl z-[70] flex flex-col max-h-[85%]"
              >
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto my-3 shrink-0" />

                <div className="px-6 pb-4 border-b border-gray-200">
                  <h3 className="text-lg font-bold mb-4">Select City</h3>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search cities..."
                      className="!pl-10"
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                    />
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                  {filteredCities.map(city => (
                    <button
                      key={city}
                      onClick={() => selectCity(city)}
                      className="w-full flex items-center justify-between p-4 hover:bg-[#F9FAFB] rounded-xl transition-colors"
                    >
                      <span className={`text-sm ${formData.city === city ? 'text-primary font-bold' : 'text-text-primary'}`}>{city}</span>
                      {formData.city === city && <Check size={18} className="text-primary" />}
                    </button>
                  ))}

                  {filteredCities.length === 0 && (
                    <div className="p-8 text-center text-text-secondary text-sm">
                      No results for "{citySearch}"
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-gray-200">
                  <button
                    onClick={() => setIsCustomCity(true)}
                    className="w-full py-4 text-primary text-sm font-semibold hover:bg-[#E6F3F0] rounded-xl transition-colors"
                  >
                    My city isn't listed
                  </button>
                </div>

                <AnimatePresence>
                  {isCustomCity && (
                    <motion.div
                      initial={{ opacity: 0, x: "100%" }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: "100%" }}
                      className="absolute inset-0 bg-white rounded-t-3xl p-6 flex flex-col z-[80]"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <button onClick={() => setIsCustomCity(false)}><ChevronLeft size={24} /></button>
                        <h3 className="text-lg font-bold">Manual Entry</h3>
                        <div className="w-6" />
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-text-secondary">Enter your city name</label>
                          <Input
                            type="text"
                            placeholder="e.g. Pune"
                            autoFocus
                            value={formData.city}
                            onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                          />
                        </div>
                        <Button
                          onClick={() => {
                            if (formData.city) setIsCitySheetOpen(false);
                          }}
                        >
                          Save city
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {showConfirmBack && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] flex items-center justify-center px-6 bg-black/40"
              onClick={() => setShowConfirmBack(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full bg-white rounded-2xl p-6 shadow-xl"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold mb-2">Go back?</h3>
                <p className="text-text-secondary text-sm mb-6 leading-relaxed">
                  Progress on this step will be lost.
                </p>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setShowConfirmBack(false)}
                    className="flex-1 py-3.5 border border-gray-300 rounded-xl text-sm font-medium text-text-primary"
                  >
                    Stay
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmBack(false);
                      navigate(-1);
                    }}
                    className="flex-1 py-3.5 bg-[#DC2626] text-white rounded-xl text-sm font-semibold shadow-sm active:scale-[0.98] transition-all"
                  >
                    Go back
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
    </OnboardingLayout>
  );
}
