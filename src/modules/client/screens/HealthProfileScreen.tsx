import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Search, Check, AlertCircle, MapPin } from 'lucide-react';
import type { } from '../../../types';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import ProgressBar from '../../../components/ProgressBar';
import OnboardingLayout from '../components/OnboardingLayout';



const CITIES = [
  "Chennai", "Bangalore", "Mumbai", "Delhi", "Hyderabad", "Pune",
  "Kolkata", "Ahmedabad", "Jaipur", "Surat", "Kochi", "Coimbatore",
  "Madurai", "Visakhapatnam", "Chandigarh", "Indore", "Nagpur",
  "Bhopal", "Lucknow", "Patna", "Bhubaneswar", "Guwahati"
];

const GOAL_OPTIONS = [
  "General fitness", "Fat loss", "Muscle gain", "Flexibility",
  "Stress relief", "Rehabilitation", "Yoga"
];

const CONDITION_GROUPS = [
  {
    title: "Pain & Mobility",
    options: ["Back pain", "Knee issue", "Joint pain"]
  },
  {
    title: "Medical Conditions",
    options: ["Diabetes", "Blood pressure", "Heart condition", "Respiratory condition"]
  },
  {
    title: "Recovery & Hormonal Health",
    options: ["PCOS / PCOD", "Injury recovery"]
  }
];

const ACTIVITY_DESCRIPTIONS = [
  "Little or no exercise — mostly desk-based",
  "Light exercise 1–3 days per week",
  "Moderate exercise 3–5 days per week",
  "Hard exercise 6–7 days per week",
  "Very hard daily exercise or physical job"
];

const ACTIVITY_LABELS = ["Sedentary", "Lightly active", "Moderately active", "Active", "Very active"];

import { useNavigate } from 'react-router-dom';
import { useWellness } from '../../../context/WellnessContext';
import { upsertClientProfile } from '../../../services/supabaseService';

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
    conditions: initialData?.conditions || ([] as string[]),
    activityLevel: initialData?.activity_level || 0,
    fitnessLevel: initialData?.fitness_level || ''
  });

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
    return formData.dobDay || formData.dobMonth || formData.dobYear || formData.gender || formData.heightValue || formData.weightValue || formData.city || formData.fitnessGoals.length > 0 || formData.activityLevel > 0 || formData.fitnessLevel;
  }, [formData]);

  const canContinue = true;

  const handleToggleGoal = (goal: string) => {
    setFormData(prev => {
      const isSelected = prev.fitnessGoals.includes(goal);
      if (isSelected) {
        return {
          ...prev,
          fitnessGoals: prev.fitnessGoals.filter(g => g !== goal)
        };
      } else {
        if (prev.fitnessGoals.length >= 3) return prev;
        return {
          ...prev,
          fitnessGoals: [...prev.fitnessGoals, goal]
        };
      }
    });
  };

  const handleToggleCondition = (condition: string) => {
    setFormData(prev => {
      if (condition === "None") return { ...prev, conditions: ["None"] };
      const filtered = prev.conditions.filter(c => c !== "None");
      return {
        ...prev,
        conditions: filtered.includes(condition)
          ? filtered.filter(c => c !== condition)
          : [...filtered, condition]
      };
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

    // Compute height_cm regardless of input unit
    let height_cm: number | null = null;
    if (formData.heightValue) {
      if (formData.heightUnit === 'cm') {
        height_cm = parseFloat(formData.heightValue);
      } else {
        const ft = parseInt(formData.heightValue);
        const inch = parseInt(formData.heightInches || '0');
        if (!isNaN(ft)) height_cm = Math.round(ft * 30.48 + inch * 2.54);
      }
    }

    // Compute weight_kg regardless of input unit
    let weight_kg: number | null = null;
    if (formData.weightValue) {
      const val = parseFloat(formData.weightValue);
      if (!isNaN(val)) {
        weight_kg = formData.weightUnit === 'kg' ? val : Math.round((val / 2.20462) * 10) / 10;
      }
    }

    // Update WellnessContext (unchanged behaviour)
    handleHealthProfileContinue({
      dob: dobString || null,
      gender: formData.gender || null,
      height_value: formData.heightValue ? parseFloat(formData.heightValue) : null,
      height_unit: formData.heightUnit,
      weight_value: formData.weightValue ? parseFloat(formData.weightValue) : null,
      weight_unit: formData.weightUnit,
      city: formData.city || null,
      goals: formData.fitnessGoals,
      conditions: formData.conditions,
      activity_level: formData.activityLevel || null,
      fitness_level: formData.fitnessLevel || null,
    });

    // Persist all fields to Supabase
    if (userId) {
      const payload = {
        dob:                dobString || null,
        gender:             formData.gender || null,
        height_cm,
        weight_kg,
        medical_conditions: formData.conditions.filter(c => c !== 'None'),
        activity_level:     formData.activityLevel || null,
        fitness_level:      formData.fitnessLevel || null,
        goals:              formData.fitnessGoals,
      };
      console.log('[HealthProfile] Saving to Supabase:', { userId, payload, city: formData.city });

      const ok = await upsertClientProfile(userId, payload, formData.city || null);

      if (!ok) {
        setIsSaving(false);
        setSaveError('Could not save your profile. Please check your connection and try again.');
        return;
      }
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
                console.log('Back button clicked. isFormFilledEnough:', isFormFilledEnough);
                if (isFormFilledEnough) {
                  setShowConfirmBack(true);
                } else {
                  console.log('Calling navigate(-1)');
                  navigate(-1);
                }
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
              Don't worry, our assessment team can help you complete any missing details during your review call.
            </p>
          </motion.div>

          {/* SECTION 1: PERSONAL DETAILS */}
          <section className="space-y-6">
            <h2 className="label-caps !text-[11px] text-text-secondary">Section 1 — Personal Details</h2>

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
                  error={errors.dateOfBirth ? '' : undefined} // Only show the main error below
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

          {/* SECTION 2: FITNESS GOALS */}
          <section className="space-y-6">
            <div className="space-y-1">
              <div className="flex justify-between items-end">
                <h2 className="label-caps !text-[11px] text-text-secondary">Section 2 — Fitness Goals</h2>
                <span className="text-[10px] text-text-secondary font-medium px-2 py-0.5 bg-input-bg rounded-md">Optional</span>
              </div>
              <p className="text-[13px] font-medium text-text-primary pt-2">What are your fitness goals?</p>
              <p className="text-[12px] text-text-secondary">Select up to 3 goals</p>
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
          </section>

          {/* SECTION 3: HEALTH CONDITIONS */}
          <section className="space-y-6">
            <div className="space-y-1">
              <div className="flex justify-between items-end">
                <h2 className="label-caps !text-[11px] text-text-secondary">Section 3 — Health Conditions</h2>
                <span className="text-[10px] text-text-secondary font-medium px-2 py-0.5 bg-input-bg rounded-md">Optional</span>
              </div>
              <p className="text-[13px] font-medium text-text-primary pt-2">Any existing health conditions?</p>
              <p className="text-[12px] text-text-secondary">This helps us personalize your wellness plan safely. Select all that apply.</p>
            </div>

            <div className="space-y-5">
              {CONDITION_GROUPS.map(group => (
                <div key={group.title} className="space-y-2.5">
                  <h3 className="text-[11px] font-medium text-text-secondary/60 tracking-wide">{group.title}</h3>
                  <div className="flex flex-wrap gap-2.5">
                    {group.options.map(cond => (
                      <button
                        key={cond}
                        onClick={() => handleToggleCondition(cond)}
                        className={`px-4 py-2 rounded-full text-[12px] font-medium transition-all ${formData.conditions.includes(cond)
                            ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                            : 'bg-[#F3F4F6] text-[#6B7280] border border-[#D1D5DB]/50'
                          }`}
                      >
                        {cond}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="pt-1 border-t border-gray-100/60">
                <button
                  onClick={() => handleToggleCondition("None")}
                  className={`px-4 py-2 rounded-full text-[12px] font-medium transition-all ${formData.conditions.includes("None")
                      ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                      : 'bg-[#F3F4F6] text-[#6B7280] border border-[#D1D5DB]/50'
                    }`}
                >
                  None
                </button>
              </div>
            </div>

            {(formData.conditions.includes("Heart condition") || formData.conditions.includes("Respiratory condition")) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-light/30 border border-red-500/20 p-4 rounded-xl flex gap-3"
              >
                <div className="text-red-500 shrink-0 pt-0.5">🔴</div>
                <p className="text-[12px] text-red-dark leading-relaxed font-medium">
                  Clients with cardiac or respiratory conditions require medical clearance before starting a program. Our assessment team will guide you.
                </p>
              </motion.div>
            )}
          </section>

          {/* SECTION 4: ACTIVITY & FITNESS LEVEL */}
          <section className="space-y-10">
            <h2 className="label-caps !text-[11px] text-text-secondary">Section 4 — Activity & Fitness Level</h2>

            {/* Activity Level Slider */}
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <label className="text-[13px] font-medium text-text-primary">Current activity level</label>
                <span className="text-[10px] text-text-secondary font-medium px-2 py-0.5 bg-input-bg rounded-md">Optional</span>
              </div>
              <div className="px-2">
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary slider-thumb"
                  value={formData.activityLevel === 0 ? 2 : formData.activityLevel}
                  onChange={(e) => setFormData(prev => ({ ...prev, activityLevel: parseInt(e.target.value) }))}
                />
                <style>{`
                  input[type='range']::-webkit-slider-thumb {
                    width: 24px;
                    height: 24px;
                    background: white;
                    border: 2px solid #00A99D;
                    border-radius: 50%;
                    cursor: pointer;
                    -webkit-appearance: none;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                  }
                  input[type='range']::-moz-range-thumb {
                    width: 24px;
                    height: 24px;
                    background: white;
                    border: 2px solid #00A99D;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                  }
                `}</style>
                <div className="relative mt-4 h-12">
                  <div className="absolute inset-0 flex justify-between pointer-events-none">
                    {ACTIVITY_LABELS.map((label, i) => (
                      <div
                        key={label}
                        className="flex flex-col items-center"
                        style={{ width: '1%', minWidth: '60px', marginLeft: i === 0 ? '-15px' : '0', marginRight: i === 4 ? '-15px' : '0' }}
                      >
                        <span
                          className={`text-[9px] font-semibold leading-tight text-center transition-colors ${formData.activityLevel === i + 1 ? 'text-primary' : 'text-text-secondary opacity-60'}`}
                          style={{ width: '60px' }}
                        >
                          {label.split(' ').map((word, wi) => (
                            <span key={wi} className="block">{word}</span>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {formData.activityLevel > 0 && (
                <div className="bg-[#F9FAFB] p-4 rounded-xl border border-gray-300 text-center">
                  <p className="text-[13px] font-semibold text-primary mb-1">{ACTIVITY_LABELS[formData.activityLevel - 1]}</p>
                  <p className="text-[12px] text-text-secondary">{ACTIVITY_DESCRIPTIONS[formData.activityLevel - 1]}</p>
                </div>
              )}
            </div>

            {/* Fitness Level */}
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[13px] font-medium text-text-primary">How would you describe your fitness level?</label>
                  <span className="text-[10px] text-text-secondary font-medium px-2 py-0.5 bg-input-bg rounded-md shrink-0">Optional</span>
                </div>
                <p className="text-[11px] text-text-secondary font-normal">Be honest — this helps us set the right starting intensity for you</p>
              </div>
              <div className="flex bg-input-bg border border-gray-300 rounded-xl p-1 gap-1">
                {["Beginner", "Intermediate", "Advanced"].map(level => (
                  <button
                    key={level}
                    onClick={() => setFormData(prev => ({ ...prev, fitnessLevel: level }))}
                    className={`flex-1 py-3.5 rounded-lg text-[13px] font-medium transition-all ${formData.fitnessLevel === level
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-transparent text-text-secondary hover:bg-white/50'
                      }`}
                  >
                    {level}
                  </button>
                ))}
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
