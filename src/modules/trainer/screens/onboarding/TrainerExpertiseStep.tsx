import { useState, useMemo } from 'react';
import { ChevronLeft, MapPin, Search, Check, Video, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { StepProps } from './TrainerOnboardingFlow';
import type { SelectionCardOption } from '../../components/SelectionCard';
import { validateStep2 } from '../../hooks/useTrainerOnboarding';
import OnboardingLayout from '../../../client/components/OnboardingLayout';
import Button from '../../../../components/Button';
import Input from '../../../../components/Input';
import ProgressBar from '../../../../components/ProgressBar';
import MultiSelectChips from '../../components/MultiSelectChips';
import SelectionCard from '../../components/SelectionCard';

const SPECIALISATIONS = [
  'Strength Training',
  'Yoga',
  'Nutrition Coaching',
  'Ayurveda',
  'Functional Fitness',
  'Cardio',
  'Rehabilitation',
];

const SESSION_TYPE_OPTIONS: SelectionCardOption[] = [
  { id: 'Virtual',   label: 'Virtual',   Icon: Video,  description: 'Video call' },
  { id: 'In-person', label: 'In-person', Icon: MapPin, description: 'Meet locally' },
  { id: 'Phone',     label: 'Phone',     Icon: Phone,  description: 'Voice call' },
];

const LANGUAGES = [
  'English',
  'Tamil',
  'Hindi',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Other',
];

const CITIES = [
  'Chennai', 'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune',
  'Kolkata', 'Ahmedabad', 'Jaipur', 'Surat', 'Kochi', 'Coimbatore',
  'Madurai', 'Visakhapatnam', 'Chandigarh', 'Indore', 'Nagpur',
  'Bhopal', 'Lucknow', 'Patna', 'Bhubaneswar', 'Guwahati', 'Remote',
];

export default function TrainerExpertiseStep({
  data,
  updateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}: StepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCitySheetOpen, setIsCitySheetOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [isCustomCity, setIsCustomCity] = useState(false);

  const filteredCities = useMemo(
    () => CITIES.filter(c => c.toLowerCase().includes(citySearch.toLowerCase())),
    [citySearch]
  );

  const clearFieldError = (field: string) => {
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleNext = () => {
    const e = validateStep2(data);
    setErrors(e);
    if (Object.keys(e).length === 0) onNext();
  };

  const selectCity = (city: string) => {
    updateData({ city });
    setIsCitySheetOpen(false);
    setIsCustomCity(false);
    setCitySearch('');
    clearFieldError('city');
  };

  const showOtherLanguageInput = data.languages.includes('Other');

  return (
    <OnboardingLayout
      header={
        <>
          <header className="flex items-center px-4 py-4">
            <button
              type="button"
              onClick={onBack}
              className="p-1 -ml-1 text-text-primary relative z-50"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex-1 flex justify-center -ml-6">
              <h1 className="text-primary font-bold text-xl tracking-tight">
                WellnessConnect
              </h1>
            </div>
          </header>
          <ProgressBar
            currentStep={currentStep}
            totalSteps={totalSteps}
            title="set up your expertise profile"
          />
        </>
      }
      footer={<Button onClick={handleNext}>Continue</Button>}
      useStandardPadding={false}
    >
      <div className="px-6 pt-4 pb-32 space-y-8">
        <p className="label-caps !text-[11px] text-text-secondary pt-2">
          Section 2 — Expertise &amp; Matching
        </p>

        {/* ── Specialisations ───────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[13px] font-medium text-text-primary">
                Specialisations
              </label>
              <span className="text-[10px] font-semibold text-red px-1.5 py-0.5 bg-red-light rounded-md">
                Required
              </span>
            </div>
            <p className="text-[12px] text-text-secondary leading-relaxed">
              Select the areas you are trained or certified in. Clients use this to find coaches that match their health and fitness goals.
            </p>
          </div>
          <MultiSelectChips
            options={SPECIALISATIONS}
            selected={data.specialisations}
            onChange={selected => {
              updateData({ specialisations: selected });
              clearFieldError('specialisations');
            }}
            error={errors.specialisations}
          />
        </div>

        {/* ── Session Types ─────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[13px] font-medium text-text-primary">
                Session types
              </label>
              <span className="text-[10px] font-semibold text-red px-1.5 py-0.5 bg-red-light rounded-md">
                Required
              </span>
            </div>
            <p className="text-[12px] text-text-secondary leading-relaxed">
              Choose how you prefer to conduct sessions. You can select multiple options based on how you work with clients.
            </p>
          </div>
          <SelectionCard
            options={SESSION_TYPE_OPTIONS}
            selected={data.sessionTypes}
            onChange={selected => {
              updateData({ sessionTypes: selected });
              clearFieldError('sessionTypes');
            }}
            error={errors.sessionTypes}
          />
        </div>

        {/* ── Languages Spoken ──────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[13px] font-medium text-text-primary">
                Languages spoken
              </label>
              <span className="text-[10px] font-semibold text-red px-1.5 py-0.5 bg-red-light rounded-md">
                Required
              </span>
            </div>
            <p className="text-[12px] text-text-secondary leading-relaxed">
              Let clients know which languages you can coach in so they can communicate comfortably during sessions.
            </p>
          </div>
          <MultiSelectChips
            options={LANGUAGES}
            selected={data.languages}
            onChange={selected => {
              updateData({ languages: selected });
              clearFieldError('languages');
              // Clear otherLanguage if "Other" is deselected
              if (!selected.includes('Other')) {
                updateData({ otherLanguage: '' });
                clearFieldError('otherLanguage');
              }
            }}
            error={errors.languages}
          />

          {/* "Other" language text input */}
          <AnimatePresence>
            {showOtherLanguageInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-1">
                  <Input
                    type="text"
                    placeholder="e.g. French, Japanese, Arabic"
                    value={data.otherLanguage}
                    onChange={e => {
                      updateData({ otherLanguage: e.target.value });
                      clearFieldError('otherLanguage');
                    }}
                    error={errors.otherLanguage}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── City / Location ───────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[13px] font-medium text-text-primary">
                City / Location
              </label>
              <span className="text-[10px] font-semibold text-red px-1.5 py-0.5 bg-red-light rounded-md">
                Required
              </span>
            </div>
            <p className="text-[12px] text-text-secondary leading-relaxed">
              Your location helps clients discover nearby coaches, especially for in-person sessions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCitySheetOpen(true)}
            className={`w-full flex items-center justify-between p-3.5 bg-input-bg border rounded-xl text-left transition-all ${
              errors.city
                ? 'border-red ring-1 ring-red/20'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <span
              className={`text-[14px] ${
                data.city ? 'text-text-primary' : 'text-text-secondary opacity-60'
              }`}
            >
              {data.city || 'Select your city or location'}
            </span>
            <MapPin
              size={18}
              className={errors.city ? 'text-red' : 'text-text-secondary'}
            />
          </button>
          {errors.city && (
            <p className="text-red text-[11px]">{errors.city}</p>
          )}
        </div>
      </div>

      {/* ── City Bottom Sheet ─────────────────────────────────────────────── */}
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
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 w-full bg-white rounded-t-3xl z-[70] flex flex-col max-h-[85%]"
            >
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto my-3 shrink-0" />

              <div className="px-6 pb-4 border-b border-gray-200 shrink-0">
                <h3 className="text-lg font-bold mb-4">Select City</h3>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search cities..."
                    className="!pl-10"
                    value={citySearch}
                    onChange={e => setCitySearch(e.target.value)}
                  />
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {filteredCities.map(city => (
                  <button
                    key={city}
                    onClick={() => selectCity(city)}
                    className="w-full flex items-center justify-between p-4 hover:bg-[#F9FAFB] rounded-xl transition-colors"
                  >
                    <span
                      className={`text-sm ${
                        data.city === city ? 'text-primary font-bold' : 'text-text-primary'
                      }`}
                    >
                      {city}
                    </span>
                    {data.city === city && (
                      <Check size={18} className="text-primary" />
                    )}
                  </button>
                ))}
                {filteredCities.length === 0 && (
                  <div className="p-8 text-center text-text-secondary text-sm">
                    No results for &quot;{citySearch}&quot;
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 shrink-0">
                <button
                  onClick={() => setIsCustomCity(true)}
                  className="w-full py-4 text-primary text-sm font-semibold hover:bg-[#E6F3F0] rounded-xl transition-colors"
                >
                  My city isn&apos;t listed
                </button>
              </div>

              <AnimatePresence>
                {isCustomCity && (
                  <motion.div
                    initial={{ opacity: 0, x: '100%' }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: '100%' }}
                    className="absolute inset-0 bg-white rounded-t-3xl p-6 flex flex-col z-[80]"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <button onClick={() => setIsCustomCity(false)}>
                        <ChevronLeft size={24} />
                      </button>
                      <h3 className="text-lg font-bold">Manual Entry</h3>
                      <div className="w-6" />
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-secondary">
                          Enter your city or location
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g. Remote, Dubai, Singapore"
                          autoFocus
                          value={data.city}
                          onChange={e => updateData({ city: e.target.value })}
                        />
                      </div>
                      <Button
                        onClick={() => {
                          if (data.city.trim()) {
                            setIsCitySheetOpen(false);
                            clearFieldError('city');
                          }
                        }}
                      >
                        Save location
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </OnboardingLayout>
  );
}
