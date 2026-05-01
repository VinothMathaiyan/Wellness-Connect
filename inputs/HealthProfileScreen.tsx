/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Search, Check, AlertTriangle, AlertCircle, Calendar as CalendarIcon, MapPin, X } from 'lucide-react';
export interface HealthProfileData {
  dob: string | null;
  gender: string | null;
  height_value: number | null;
  height_unit: 'cm' | 'ft' | 'ft/in' | null;
  weight_value: number | null;
  weight_unit: 'kg' | 'lbs' | null;
  city: string | null;
  goals: string[];
  conditions: string[];
  activity_level: number | null;
  fitness_level: string | null;
}

interface HealthProfileScreenProps {
  onBack: () => void;
  onContinue: (data: HealthProfileData) => void;
}

const CITIES = [
  "Chennai", "Bangalore", "Mumbai", "Delhi", "Hyderabad", "Pune", 
  "Kolkata", "Ahmedabad", "Jaipur", "Surat", "Kochi", "Coimbatore", 
  "Madurai", "Visakhapatnam", "Chandigarh", "Indore", "Nagpur", 
  "Bhopal", "Lucknow", "Patna", "Bhubaneswar", "Guwahati"
];

const GOAL_OPTIONS = [
  "Weight loss", "Muscle gain", "Flexibility", "Endurance", 
  "Stress relief", "Nutrition", "Wellness", "Rehabilitation", "Yoga"
];

const CONDITION_OPTIONS = [
  "Back pain", "Knee issue", "Diabetes", "Hypertension", 
  "Heart condition", "Respiratory issue", "Arthritis", "None"
];

const ACTIVITY_DESCRIPTIONS = [
  "Little or no exercise — mostly desk-based",
  "Light exercise 1–3 days per week",
  "Moderate exercise 3–5 days per week",
  "Hard exercise 6–7 days per week",
  "Very hard daily exercise or physical job"
];

const ACTIVITY_LABELS = ["Sedentary", "Lightly active", "Moderately active", "Active", "Very active"];

export default function HealthProfileScreen({ onBack, onContinue }: HealthProfileScreenProps) {
  // Form State
  const [formData, setFormData] = useState({
    dobDay: '',
    dobMonth: '',
    dobYear: '',
    gender: '' as any,
    heightValue: '', // can be cm or feet
    heightInches: '', // for ft/in mode
    heightUnit: 'cm' as 'cm' | 'ft/in',
    weightValue: '',
    weightUnit: 'kg' as 'kg' | 'lbs',
    city: '',
    fitnessGoals: [] as string[],
    conditions: [] as string[],
    activityLevel: 0, // 1-5
    fitnessLevel: '' as any
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCitySheetOpen, setIsCitySheetOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [isCustomCity, setIsCustomCity] = useState(false);
  const [showConfirmBack, setShowConfirmBack] = useState(false);

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
  const validate = (runAll = false) => {
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

    // Gender (Optional)
    // No specific validation required if blank

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

    // City, Goals, Activity, Fitness (All Optional)
    // No blocking validation required

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormFilledEnough = useMemo(() => {
    return formData.dobDay || formData.dobMonth || formData.dobYear || formData.gender || formData.heightValue || formData.weightValue || formData.city || formData.fitnessGoals.length > 0 || formData.activityLevel > 0 || formData.fitnessLevel;
  }, [formData]);

  const canContinue = true; // Always enabled as per user request

  // Handlers
  const handleToggleGoal = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      fitnessGoals: prev.fitnessGoals.includes(goal) 
        ? prev.fitnessGoals.filter(g => g !== goal) 
        : [...prev.fitnessGoals, goal]
    }));
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

  const handleContinue = () => {
    if (validate(true)) {
      onContinue({
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
        fitness_level: formData.fitnessLevel || null
      });
    }
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
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center px-4 py-4 border-b border-border-light bg-white sticky top-0 z-20">
        <button 
          onClick={() => isFormFilledEnough ? setShowConfirmBack(true) : onBack()} 
          className="p-1 -ml-1 text-text-primary"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-center font-semibold text-[18px] mr-6">Your health profile</h1>
      </header>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-border-light">
        <div className="h-full bg-primary w-1/2 transition-all duration-500" />
      </div>
      
      <div className="px-6 py-3 bg-white">
        <p className="text-[12px] text-text-secondary">
          Step 2 of 4 — helps us match you with the right trainer
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-32 pt-2 space-y-10 scrollbar-hide">
        
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
              <div className="relative">
                <input 
                  type="number"
                  placeholder="DD"
                  maxLength={2}
                  className={`input-field text-center ${errors.dateOfBirth ? 'border-red-400' : ''}`}
                  value={formData.dobDay}
                  onChange={(e) => setFormData(prev => ({ ...prev, dobDay: e.target.value.slice(0, 2) }))}
                />
              </div>
              <div className="relative">
                <input 
                  type="number"
                  placeholder="MM"
                  maxLength={2}
                  className={`input-field text-center ${errors.dateOfBirth ? 'border-red-400' : ''}`}
                  value={formData.dobMonth}
                  onChange={(e) => setFormData(prev => ({ ...prev, dobMonth: e.target.value.slice(0, 2) }))}
                />
              </div>
              <div className="relative">
                <input 
                  type="number"
                  placeholder="YYYY"
                  maxLength={4}
                  className={`input-field text-center ${errors.dateOfBirth ? 'border-red-400' : ''}`}
                  value={formData.dobYear}
                  onChange={(e) => setFormData(prev => ({ ...prev, dobYear: e.target.value.slice(0, 4) }))}
                />
              </div>
            </div>
            {age !== null && !errors.dateOfBirth && (
              <p className="text-[11px] text-text-secondary">Age: {age} years</p>
            )}
            {errors.dateOfBirth && <p className="text-red text-[11px] mt-1">{errors.dateOfBirth}</p>}
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
                  className={`flex items-center gap-3 p-3 border rounded-xl transition-all ${
                    formData.gender === opt 
                      ? 'border-primary bg-green-light/20 text-primary font-medium' 
                      : 'border-border-light text-text-secondary'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.gender === opt ? 'border-primary' : 'border-border'}`}>
                    {formData.gender === opt && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="text-[12px]">{opt}</span>
                </button>
              ))}
            </div>
            {errors.gender && <p className="text-red text-[11px] mt-1">{errors.gender}</p>}
          </div>

          {/* Height */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <label className="text-[13px] font-medium text-text-primary">Height</label>
                <span className="text-[10px] text-text-secondary font-medium px-2 py-0.5 bg-input-bg rounded-md">Optional</span>
              </div>
              <div className="flex bg-input-bg rounded-lg p-0.5 border border-border-light overflow-hidden">
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
                <input 
                  type="number"
                  placeholder="170"
                  className={`input-field ${errors.height ? 'border-red ring-1 ring-red/20' : ''}`}
                  value={formData.heightValue}
                  onChange={(e) => setFormData(prev => ({ ...prev, heightValue: e.target.value }))}
                />
              ) : (
                <>
                  <div className="flex-1 flex items-center bg-input-bg border border-border-light rounded-xl overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                    <input 
                      type="number" 
                      placeholder="5" 
                      className="w-full bg-transparent p-3 text-[14px] outline-none"
                      value={formData.heightValue}
                      onChange={(e) => setFormData(prev => ({ ...prev, heightValue: e.target.value }))}
                    />
                    <span className="pr-3 text-[11px] font-bold text-text-secondary">ft</span>
                  </div>
                  <div className="flex-1 flex items-center bg-input-bg border border-border-light rounded-xl overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                    <input 
                      type="number" 
                      placeholder="10" 
                      className="w-full bg-transparent p-3 text-[14px] outline-none"
                      value={formData.heightInches}
                      onChange={(e) => setFormData(prev => ({ ...prev, heightInches: e.target.value }))}
                    />
                    <span className="pr-3 text-[11px] font-bold text-text-secondary">in</span>
                  </div>
                </>
              )}
            </div>
            {errors.height && <p className="text-red text-[11px] mt-1">{errors.height}</p>}
          </div>

          {/* Weight */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <label className="text-[13px] font-medium text-text-primary">Weight</label>
                <span className="text-[10px] text-text-secondary font-medium px-2 py-0.5 bg-input-bg rounded-md">Optional</span>
              </div>
              <div className="flex bg-input-bg rounded-lg p-0.5 border border-border-light overflow-hidden">
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
            <div className="relative">
              <input 
                type="number"
                step="0.1"
                placeholder={formData.weightUnit === 'kg' ? "70" : "154"}
                className={`input-field ${errors.weight ? 'border-red ring-1 ring-red/20' : ''}`}
                value={formData.weightValue}
                onChange={(e) => setFormData(prev => ({ ...prev, weightValue: e.target.value }))}
              />
            </div>
            {errors.weight && <p className="text-red text-[11px] mt-1">{errors.weight}</p>}
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
              className={`w-full flex items-center justify-between p-3.5 bg-input-bg border rounded-xl text-left transition-all ${
                errors.city ? 'border-red ring-1 ring-red/20' : 'border-border-light'
              }`}
            >
              <span className={`text-[14px] ${formData.city ? 'text-text-primary' : 'text-text-secondary opacity-60'}`}>
                {formData.city || "Select your city"}
              </span>
              <MapPin size={18} className="text-text-secondary" />
            </button>
            {errors.city && <p className="text-red text-[11px] mt-1">{errors.city}</p>}
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
          </div>
          <div className="flex flex-wrap gap-2.5">
            {GOAL_OPTIONS.map(goal => (
              <button
                key={goal}
                onClick={() => handleToggleGoal(goal)}
                className={`px-4 py-2 rounded-full text-[12px] font-medium transition-all ${
                  formData.fitnessGoals.includes(goal)
                    ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                    : 'bg-[#F3F4F6] text-[#6B7280] border border-[#D1D5DB]/50'
                }`}
              >
                {goal}
              </button>
            ))}
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
          {errors.fitnessGoals && <p className="text-red text-[11px] mt-1">{errors.fitnessGoals}</p>}
        </section>

        {/* SECTION 3: HEALTH CONDITIONS */}
        <section className="space-y-6">
          <div className="space-y-1">
            <div className="flex justify-between items-end">
              <h2 className="label-caps !text-[11px] text-text-secondary">Section 3 — Health Conditions</h2>
              <span className="text-[10px] text-text-secondary font-medium px-2 py-0.5 bg-input-bg rounded-md">Optional</span>
            </div>
            <p className="text-[13px] font-medium text-text-primary pt-2">Any existing health conditions?</p>
            <p className="text-[12px] text-text-secondary">This helps us ensure your program is safe. Select all that apply.</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {CONDITION_OPTIONS.map(cond => (
              <button
                key={cond}
                onClick={() => handleToggleCondition(cond)}
                className={`px-4 py-2 rounded-full text-[12px] font-medium transition-all ${
                  formData.conditions.includes(cond)
                    ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                    : 'bg-[#F3F4F6] text-[#6B7280] border border-[#D1D5DB]/50'
                }`}
              >
                {cond}
              </button>
            ))}
          </div>
          {(formData.conditions.includes("Heart condition") || formData.conditions.includes("Respiratory issue")) && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-light/30 border border-red/20 p-4 rounded-xl flex gap-3"
            >
              <div className="text-red shrink-0 pt-0.5">🔴</div>
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
                  border: 2px solid #1D9E75;
                  border-radius: 50%;
                  cursor: pointer;
                  -webkit-appearance: none;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                input[type='range']::-moz-range-thumb {
                  width: 24px;
                  height: 24px;
                  background: white;
                  border: 2px solid #1D9E75;
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
              <div className="bg-[#F9FAFB] p-4 rounded-xl border border-border-light text-center">
                <p className="text-[13px] font-semibold text-primary mb-1">{ACTIVITY_LABELS[formData.activityLevel - 1]}</p>
                <p className="text-[12px] text-text-secondary">{ACTIVITY_DESCRIPTIONS[formData.activityLevel - 1]}</p>
              </div>
            )}
            {errors.activityLevel && <p className="text-red text-[11px] mt-1">{errors.activityLevel}</p>}
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
            <div className="flex bg-input-bg border border-border-light rounded-xl p-1 gap-1">
              {["Beginner", "Intermediate", "Advanced"].map(level => (
                <button
                  key={level}
                  onClick={() => setFormData(prev => ({ ...prev, fitnessLevel: level }))}
                  className={`flex-1 py-3.5 rounded-lg text-[13px] font-medium transition-all ${
                    formData.fitnessLevel === level
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-transparent text-text-secondary hover:bg-white/50'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            {errors.fitnessLevel && <p className="text-red text-[11px] mt-1">{errors.fitnessLevel}</p>}
          </div>
        </section>

      </div>

      {/* CTA Button */}
      <div className="absolute bottom-0 w-full p-6 bg-white border-t border-border-light z-30 pb-10">
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className={`w-full btn-primary h-[52px] ${!canContinue ? 'opacity-50 cursor-not-allowed grayscale' : 'shadow-lg shadow-primary/20 active:scale-[0.98]'}`}
        >
          Continue
        </button>
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
              <div className="w-12 h-1 bg-border rounded-full mx-auto my-3 shrink-0" />
              
              <div className="px-6 pb-4 border-b border-border-light">
                <h3 className="text-lg font-bold mb-4">Select City</h3>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Search cities..."
                    className="w-full bg-[#F3F4F6] pl-10 pr-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
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

              <div className="p-4 border-t border-border-light">
                <button 
                  onClick={() => setIsCustomCity(true)}
                  className="w-full py-4 text-primary text-sm font-semibold hover:bg-green-light/20 rounded-xl transition-colors"
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
                        <input 
                          type="text"
                          className="input-field"
                          placeholder="e.g. Pune"
                          autoFocus
                          value={formData.city}
                          onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        />
                      </div>
                      <button 
                        className="btn-primary w-full"
                        onClick={() => {
                          if (formData.city) setIsCitySheetOpen(false);
                        }}
                      >
                        Save city
                      </button>
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
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmBack(false)}
                  className="flex-1 py-3.5 border border-border rounded-xl text-sm font-medium text-text-primary"
                >
                  Stay
                </button>
                <button
                  onClick={() => {
                    setShowConfirmBack(false);
                    onBack();
                  }}
                  className="flex-1 py-3.5 bg-red text-white rounded-xl text-sm font-medium"
                >
                  Go back
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
