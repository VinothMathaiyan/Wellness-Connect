import { useState } from 'react';
import { ChevronLeft, Clock, CheckCircle2, Circle, Sunrise, Sunset, Zap, Sun } from 'lucide-react';
import type { StepProps, AvailabilitySlot } from './TrainerOnboardingFlow';
import { validateStep3 } from '../../hooks/useTrainerOnboarding';
import OnboardingLayout from '../../../client/components/OnboardingLayout';
import Button from '../../../../components/Button';
import ProgressBar from '../../../../components/ProgressBar';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// 4 AM to 11 PM (20 hours total, from 4 to 23)
const HOURS = Array.from({ length: 20 }, (_, i) => i + 4);

function formatHour(h: number) {
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour} ${period}`;
}

const TEMPLATES = [
  {
    id: 'mornings',
    title: 'Weekday mornings',
    subtitle: 'Mon–Fri · 6, 7, 8 AM · 15 slots',
    icon: Sunrise,
    color: 'bg-teal-500',
    getSlots: (): AvailabilitySlot[] => {
      const slots: AvailabilitySlot[] = [];
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].forEach(day => {
        [6, 7, 8].forEach(h => {
          slots.push({
            day,
            start_time: `${String(h).padStart(2, '0')}:00`,
            end_time: `${String(h + 1).padStart(2, '0')}:00`,
          });
        });
      });
      return slots;
    }
  },
  {
    id: 'evenings',
    title: 'Weekday evenings',
    subtitle: 'Mon–Fri · 5–8 PM · 20 slots',
    icon: Sunset,
    color: 'bg-indigo-500',
    getSlots: (): AvailabilitySlot[] => {
      const slots: AvailabilitySlot[] = [];
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].forEach(day => {
        [17, 18, 19, 20].forEach(h => {
          slots.push({
            day,
            start_time: `${String(h).padStart(2, '0')}:00`,
            end_time: `${String(h + 1).padStart(2, '0')}:00`,
          });
        });
      });
      return slots;
    }
  },
  {
    id: 'balanced',
    title: 'Balanced weekdays',
    subtitle: 'Mon–Fri · 2 morning + 2 evening · 20 slots',
    icon: Zap,
    color: 'bg-orange-400',
    getSlots: (): AvailabilitySlot[] => {
      const slots: AvailabilitySlot[] = [];
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].forEach(day => {
        [6, 7, 17, 18].forEach(h => {
          slots.push({
            day,
            start_time: `${String(h).padStart(2, '0')}:00`,
            end_time: `${String(h + 1).padStart(2, '0')}:00`,
          });
        });
      });
      return slots;
    }
  },
  {
    id: 'weekends',
    title: 'Weekends only',
    subtitle: 'Sat–Sun · all day · 30 slots',
    icon: Sun,
    color: 'bg-yellow-400',
    getSlots: (): AvailabilitySlot[] => {
      const slots: AvailabilitySlot[] = [];
      ['Sat', 'Sun'].forEach(day => {
        // 8 AM to 10 PM (15 hours * 2 days = 30 slots)
        for (let h = 8; h <= 22; h++) {
          slots.push({
            day,
            start_time: `${String(h).padStart(2, '0')}:00`,
            end_time: `${String(h + 1).padStart(2, '0')}:00`,
          });
        }
      });
      return slots;
    }
  }
];

export default function TrainerAvailabilityStep({
  data,
  updateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}: StepProps) {
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');

  const handleNext = () => {
    const e = validateStep3(data);
    if (Object.keys(e).length > 0) {
      setSubmitError(e.slots);
      return;
    }
    onNext();
  };

  const applyTemplate = (templateId: string) => {
    const t = TEMPLATES.find(t => t.id === templateId);
    if (t) {
      updateData({ availabilitySlots: t.getSlots() });
      setActiveTemplateId(templateId);
      setSubmitError('');
    }
  };

  const toggleSlot = (day: string, hour: number) => {
    setActiveTemplateId(null);
    setSubmitError('');

    const start_time = `${String(hour).padStart(2, '0')}:00`;
    const end_time = `${String(hour + 1).padStart(2, '0')}:00`;
    
    const existing = data.availabilitySlots;
    const isSelected = existing.some(s => s.day === day && s.start_time === start_time);

    if (isSelected) {
      updateData({
        availabilitySlots: existing.filter(s => !(s.day === day && s.start_time === start_time))
      });
    } else {
      updateData({
        availabilitySlots: [...existing, { day, start_time, end_time }]
      });
    }
  };

  const totalSlots = data.availabilitySlots.length;
  const uniqueDays = new Set(data.availabilitySlots.map(s => s.day)).size;

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
            title="set your weekly availability"
          />
        </>
      }
      footer={
        <Button onClick={handleNext}>
          <div className="flex items-center justify-center gap-2">
            {currentStep === totalSteps ? 'Complete Setup' : 'Continue'}
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[12px] font-medium">
              {totalSlots} slots
            </span>
          </div>
        </Button>
      }
      useStandardPadding={false}
    >
      <div className="px-6 pt-4 pb-12 space-y-8">
        
        {/* Info Banner */}
        <div className="bg-blue-light/50 border border-blue/10 p-4 rounded-xl flex gap-3">
          <Clock size={16} className="text-blue shrink-0 mt-0.5" />
          <p className="text-[12px] text-blue leading-relaxed font-medium">
            Start with a template, then tap across cells to adjust. Each filled cell = one <span className="font-semibold">1-hour</span> session clients can book.
          </p>
        </div>

        {/* ── Quick Setup ─────────────────────────────────────────────── */}
        <div className="space-y-3">
          <h3 className="label-caps !text-[11px] text-text-secondary">
            Quick Setup
          </h3>
          
          <div className="space-y-2.5">
            {TEMPLATES.map(t => {
              const isActive = activeTemplateId === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] text-left ${
                    isActive 
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm ${t.color}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-text-primary truncate">
                      {t.title}
                    </p>
                    <p className="text-[12px] text-text-secondary truncate mt-0.5">
                      {t.subtitle}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {isActive ? (
                      <CheckCircle2 size={22} className="text-primary fill-primary/10" />
                    ) : (
                      <Circle size={22} className="text-gray-300" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Your Week ────────────────────────────────────────────────── */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="label-caps !text-[11px] text-text-secondary">
              Your Week
            </h3>
            <span className="text-[12px] font-medium text-text-secondary">
              <span className="text-text-primary font-bold">{totalSlots}</span> slots · {uniqueDays} days
            </span>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm overflow-hidden">
            {/* Header Row */}
            <div className="flex mb-2">
              <div className="w-[32px] shrink-0"></div> {/* Spacer for time labels */}
              <div className="flex-1 grid grid-cols-7 gap-1">
                {DAY_LABELS.map((day, i) => (
                  <div key={i} className="text-center text-[12px] font-semibold text-text-secondary pb-1">
                    {day}
                  </div>
                ))}
              </div>
            </div>

            {/* Grid scroll container */}
            <div className="h-[320px] overflow-y-auto pr-1 -mr-1 space-y-1 hide-scrollbar">
              {HOURS.map(hour => (
                <div key={hour} className="flex items-center">
                  <div className="w-[32px] shrink-0 text-[10px] font-medium text-text-secondary text-right pr-1.5 -mt-1">
                    {formatHour(hour)}
                  </div>
                  <div className="flex-1 grid grid-cols-7 gap-1">
                    {DAYS.map(day => {
                      const start_time = `${String(hour).padStart(2, '0')}:00`;
                      const isSelected = data.availabilitySlots.some(s => s.day === day && s.start_time === start_time);
                      
                      return (
                        <button
                          key={`${day}-${hour}`}
                          type="button"
                          onClick={() => toggleSlot(day, hour)}
                          className={`h-8 rounded-[6px] transition-colors active:scale-95 ${
                            isSelected 
                              ? 'bg-primary shadow-sm' 
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                          aria-label={`Toggle ${day} ${formatHour(hour)}`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Gradient mask for scroll indication */}
            <div className="h-8 w-full bg-gradient-to-t from-white to-transparent -mt-8 relative pointer-events-none" />
          </div>
        </div>

        {/* Submit-level error */}
        {submitError && (
          <div className="bg-red-light/30 border border-red/20 p-3.5 rounded-xl">
            <p className="text-red text-[12px] font-medium text-center">
              {submitError}
            </p>
          </div>
        )}
      </div>
    </OnboardingLayout>
  );
}
