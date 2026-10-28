import { useState, useRef, type ComponentType } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft, Calendar, Minus, Plus, Moon, Zap, Check,
  Home, Users, BarChart3, MessageSquare, Bell
} from 'lucide-react';
import OnboardingLayout from '../components/OnboardingLayout';
import type { DailyLog } from '../../../types';

import { useNavigate } from 'react-router-dom';
import { useWellness } from '../../../context/WellnessContext';
import { submitDailyCheckin } from '../../../services/supabaseService';
import { formatDateLong } from '@/utils/dateUtils';
import { todayISO } from '@/utils/date';

interface Props {
  existingLog?: DailyLog | null;
}

interface DailyCheckInDraft {
  water_litres: number;
  sleep_hours: number;
  sleep_quality_score: number;
  mood_score: number;
  energy_level: number;
  pain_score: number | null;
  mobility_score: number;
  trainer_note: string;
}



const EMOJI_MOOD = [
  { value: 1, label: 'Terrible', emoji: '😫' },
  { value: 2, label: 'Bad', emoji: '🙁' },
  { value: 3, label: 'Neutral', emoji: '😐' },
  { value: 4, label: 'Good', emoji: '🙂' },
  { value: 5, label: 'Amazing', emoji: '🤩' },
];

const EMOJI_PAIN = [
  { value: 0, label: 'None', emoji: '😌', color: '#E1F5EE', textColor: '#1D9E75' },
  { value: 2, label: 'Mild', emoji: '😐', color: '#F7FEE7', textColor: '#1D9E75' },
  { value: 5, label: 'Moderate', emoji: '😕', color: '#FEF3C7', textColor: '#EF9F27' },
  { value: 7, label: 'High', emoji: '😣', color: '#FFEDD5', textColor: '#F97316' },
  { value: 10, label: 'Severe', emoji: '😫', color: '#FCEBEB', textColor: '#E24B4A' },
];

const ENERGY_LEVELS = [
  { value: 1, label: 'Drained', color: '#E24B4A', light: '#FCEBEB' },
  { value: 2, label: 'Low', color: '#EF9F27', light: '#FEF3C7' },
  { value: 3, label: 'Balanced', color: '#EF9F27', light: '#FEF3C7' },
  { value: 4, label: 'Good', color: '#1D9E75', light: '#E1F5EE' },
  { value: 5, label: 'Excellent', color: '#0F6E56', light: '#D1FAE5' },
];

const SLEEP_QUALITY_ICONS = [
  { value: 1, label: 'Restless' },
  { value: 2, label: 'Poor' },
  { value: 3, label: 'Fair' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Refreshed' },
];

import ClientBottomNav from '../components/ClientBottomNav';

export default function DailyCheckInScreen({ existingLog }: Props) {
  const navigate = useNavigate();
  const { userId, handleDailyCheckInComplete } = useWellness();
  const [currentStep, setCurrentStep] = useState(1);
  const [logDate, setLogDate] = useState(() => todayISO());
  const [log, setLog] = useState<DailyCheckInDraft>({
    water_litres: existingLog?.water_litres ?? 0,
    sleep_hours: existingLog?.sleep_hours ?? 8,
    sleep_quality_score: 0,
    mood_score: existingLog?.mood_score ?? 0,
    energy_level: existingLog?.energy_score ?? 0,
    pain_score: null,
    mobility_score: 5,
    trainer_note: '',
  });
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [lastAddedWater, setLastAddedWater] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const waterGoal = 2.5;

  const handleUpdate = (updates: Partial<DailyCheckInDraft>) => {
    setLog(prev => ({ ...prev, ...updates }));
  };

  const computeReadinessScore = () => {
    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
    const sleepPts    = Math.round((clamp(log.sleep_hours, 4, 10) - 4) / 6 * 20);           // max 20
    const qualityPts  = Math.round(((log.sleep_quality_score || 0) / 5) * 10);               // max 10
    const moodPts     = Math.round(((log.mood_score || 0) / 5) * 15);                        // max 15
    const energyPts   = Math.round(((log.energy_level || 0) / 5) * 15);                      // max 15
    const painPts     = Math.round((1 - ((log.pain_score ?? 0) / 10)) * 20);                 // max 20, INVERTED
    const mobilityPts = Math.round(((log.mobility_score || 0) / 10) * 10);                   // max 10
    const waterPts    = Math.round(Math.min(log.water_litres / 2.5, 1) * 10);                // max 10
    return clamp(sleepPts + qualityPts + moodPts + energyPts + painPts + mobilityPts + waterPts, 0, 100);
  };

  const handleComplete = async () => {
    if (isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);

    const dailyLog = {
      log_date: logDate,
      sleep_hours: log.sleep_hours,
      sleep_quality_score: log.sleep_quality_score,
      mood_score: log.mood_score,
      energy_score: log.energy_level,
      water_litres: log.water_litres,
      workout_done: false,
      pain_score: log.pain_score ?? null,
      mobility_score: log.mobility_score,
      readiness_score: computeReadinessScore(),
      note_for_trainer: log.trainer_note || null,
    };

    if (userId) {
      const ok = await submitDailyCheckin(userId, dailyLog);
      if (!ok) {
        setSubmitError('Failed to save check-in. Please try again.');
        setIsSubmitting(false);
        return;
      }
    }

    handleDailyCheckInComplete(dailyLog);
    navigate('/client/dashboard');
  };

  const doneCount = [
    (log.water_litres || 0) > 0,
    (log.sleep_hours || 0) > 0,
    (log.mood_score || 0) > 0,
    (log.energy_level || 0) > 0,
    (log.pain_score !== null && log.pain_score !== undefined),
    (log.mobility_score !== null && log.mobility_score !== undefined),
    (log.sleep_quality_score || 0) > 0
  ].filter(Boolean).length;

  const waterConsumed = log.water_litres || 0;
  const waterProgress = Math.min((waterConsumed / waterGoal) * 100, 100);

  const formatDateLabel = (dateStr: string) => formatDateLong(dateStr);

  return (
    <OnboardingLayout
      header={
        <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
          <div className="grid h-[52px] w-full grid-cols-[64px_1fr_96px] items-center px-4">
            <button onClick={() => {
              if (currentStep > 1) setCurrentStep(currentStep - 1);
              else navigate(-1);
            }} className="flex h-9 w-9 items-center justify-center rounded-full text-[#111827] active:bg-gray-100">
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-center text-[16px] font-semibold text-[#111827]">Daily Tracking Log</h1>
            <div className="justify-self-end rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-600 transition-colors duration-500">
              Step {currentStep} of 4
            </div>
          </div>
          
          <div className="flex justify-center pb-3">
            <button
              type="button"
              onClick={() => {
                const input = dateInputRef.current;
                if (!input) return;
                try { input.showPicker(); } catch { input.click(); }
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full active:bg-emerald-50 transition-colors"
            >
              <Calendar size={14} className="text-[#1D9E75] shrink-0" />
              <span className="text-[12px] font-medium text-[#1D9E75]">{formatDateLabel(logDate)}</span>
            </button>
            <input
              ref={dateInputRef}
              type="date"
              className="w-0 h-0 opacity-0 absolute pointer-events-none"
              value={logDate}
              max={todayISO()}
              onChange={(e) => { if (e.target.value) setLogDate(e.target.value); }}
            />
          </div>
        </header>
      }
      footer={
         <div className="flex gap-3">
           {currentStep > 1 && (
             <button onClick={() => setCurrentStep(currentStep - 1)}
               className="h-[52px] px-6 bg-white border-2 border-gray-200 text-[#111827] rounded-2xl text-[15px] font-bold flex items-center justify-center active:bg-gray-50 transition-colors">
               Back
             </button>
           )}
           <button
             onClick={() => {
               if (currentStep < 4) setCurrentStep(currentStep + 1);
               else handleComplete();
             }}
             disabled={isSubmitting}
             className="btn-primary flex-1 h-[52px] rounded-2xl text-[15px] font-bold active:scale-[0.98] shadow-lg shadow-emerald-500/25 disabled:opacity-60 flex items-center justify-center gap-2"
           >
             {currentStep === 4 && isSubmitting ? (
               <>
                 <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                 Saving…
               </>
             ) : (
               currentStep === 4 ? '✓ Submit Log' : 'Next →'
             )}
           </button>
         </div>
      }
      bottomNavigation={
        <ClientBottomNav />
      }
      useStandardPadding={false}
    >
        <div className="px-[16px] py-4 space-y-[12px]">
          
          {currentStep === 1 && (
            <>
              {/* CARD 1 — WATER INTAKE */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-col items-center text-center mb-[14px]">
                  <h4 className="text-[15px] font-bold text-[#111827] mb-1">Water Intake</h4>
                  <div className="flex items-center gap-1.5 min-h-[20px] justify-center">
                    <span className={`text-[13px] font-semibold ${waterConsumed >= waterGoal ? 'text-[#1D9E75]' : 'text-[#3B9EE8]'}`}>
                      {waterConsumed.toFixed(2)} L of {waterGoal} L
                    </span>
                    {waterConsumed > waterGoal && (
                      <motion.div 
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="px-2 py-0.5 bg-[#D1FAE5] text-[#1D9E75] text-[10px] font-bold rounded-full"
                      >
                        Goal exceeded ✓
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center space-y-6">
                  {/* Progress Bar centered */}
                  <div className="w-[85%] h-[8px] bg-[#E5E7EB] rounded-[4px] overflow-hidden">
                    <motion.div 
                      className={`h-full ${waterConsumed >= waterGoal ? 'bg-[#1D9E75]' : 'bg-[#3B9EE8]'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${waterProgress}%` }}
                    />
                  </div>
                  
                  {/* 2x2 Centered Grid for Add Buttons */}
                  <div className="grid grid-cols-2 gap-3 w-[85%]">
                    {[150, 250, 500, 1000].map(amt => (
                      <button
                        key={amt}
                        onClick={() => {
                          const val = amt / 1000;
                          handleUpdate({ water_litres: waterConsumed + val });
                          setLastAddedWater(prev => [...prev, val]);
                        }}
                        className="h-[48px] bg-white border border-[#D1D5DB] rounded-[10px] text-[14px] font-semibold text-[#111827] active:bg-[#E1F5EE] active:border-[#1D9E75] active:text-[#0F6E56] transition-all flex items-center justify-center"
                      >
                        + {amt >= 1000 ? (amt/1000) + ' L' : amt + ' ml'}
                      </button>
                    ))}
                  </div>
                </div>

                {waterConsumed > 0 && (
                  <div className="flex justify-center mt-5">
                    <button 
                      onClick={() => {
                        const last = lastAddedWater[lastAddedWater.length - 1];
                        if (last !== undefined) {
                          handleUpdate({ water_litres: Math.max(0, waterConsumed - last) });
                          setLastAddedWater(prev => prev.slice(0, -1));
                        }
                      }}
                      className="text-[12px] text-[#6B7280] underline hover:text-[#111827] transition-colors"
                    >
                      Undo last entry
                    </button>
                  </div>
                )}
              </div>

              {/* CARD 2 — SLEEP DURATION & QUALITY */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                 <div className="flex justify-between items-center mb-1">
                   <h4 className="text-[15px] font-bold text-[#111827]">Sleep</h4>
                   <span className="text-[13px] font-semibold text-[#111827]">{(log.sleep_hours || 8).toFixed(1)} hrs</span>
                 </div>
                 <p className="text-[12px] text-[#9CA3AF] italic mb-[10px]">How many hours did you sleep last night?</p>

                 <div className="flex flex-col items-center py-2">
                    <div className="relative w-[180px] h-[100px] flex justify-center items-end overflow-hidden mb-4 mt-2">
                       <svg width="180" height="180" className="absolute top-0">
                          <path 
                            d="M10,90 A80,80 0 0,1 170,90" 
                            fill="none" stroke="#E5E7EB" strokeWidth="10" strokeLinecap="round"
                          />
                          <motion.path 
                            d="M10,90 A80,80 0 0,1 170,90" 
                            fill="none" stroke="#7C3AED" strokeWidth="10" strokeLinecap="round"
                            strokeDasharray="251.32"
                            strokeDashoffset={251.32 - (Math.min(log.sleep_hours || 8, 12) / 12) * 251.32}
                            transition={{ type: 'spring', damping: 25 }}
                          />
                       </svg>
                       <div className="flex flex-col items-center z-10 mb-2">
                          <span className="text-[24px] mb-1">🌙</span>
                          <span className="text-[20px] font-bold text-[#111827]">
                             {Math.floor(log.sleep_hours || 8)}h {Math.round(((log.sleep_hours || 8) % 1) * 60).toString().padStart(2, '0')}m
                          </span>
                       </div>
                    </div>

                    <div className="flex items-center gap-8 mb-6 mt-2">
                       <button 
                         onClick={() => handleUpdate({ sleep_hours: Math.max(0.5, (log.sleep_hours || 8) - 0.5) })}
                         className="w-[44px] h-[44px] border-[1.5px] border-[#D1D5DB] rounded-full flex items-center justify-center text-[#111827] active:bg-gray-100 bg-white shadow-sm"
                       >
                         <Minus size={20} />
                       </button>
                       <span className="text-[22px] font-bold text-[#111827] w-20 text-center">{(log.sleep_hours || 8)} hrs</span>
                       <button 
                         onClick={() => handleUpdate({ sleep_hours: Math.min(12, (log.sleep_hours || 8) + 0.5) })}
                         className="w-[44px] h-[44px] border-[1.5px] border-[#D1D5DB] rounded-full flex items-center justify-center text-[#111827] active:bg-gray-100 bg-white shadow-sm"
                       >
                         <Plus size={20} />
                       </button>
                    </div>

                    <div className="w-full pt-5 border-t border-[#E5E7EB]">
                       <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.06em] block mb-4 text-center">SLEEP QUALITY</span>
                       <div className="flex justify-between w-full px-1">
                          {SLEEP_QUALITY_ICONS.map(sq => (
                            <button
                              key={sq.value}
                              onClick={() => handleUpdate({ sleep_quality_score: sq.value })}
                              className="flex flex-col items-center gap-1.5"
                            >
                               <div className={`w-[48px] h-[48px] rounded-full flex items-center justify-center transition-all ${log.sleep_quality_score === sq.value ? 'bg-[#EEEDFE] scale-110' : 'bg-[#F3F4F6]'}`}>
                                  <Moon 
                                    size={20} 
                                    className={log.sleep_quality_score === sq.value ? 'text-[#7C3AED]' : 'text-[#9CA3AF]'} 
                                    fill={log.sleep_quality_score === sq.value ? 'currentColor' : 'none'} 
                                  />
                               </div>
                               <span className={`text-[10px] font-medium leading-tight ${log.sleep_quality_score === sq.value ? 'text-[#7C3AED] font-bold' : 'text-[#6B7280]'}`}>{sq.label}</span>
                            </button>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              {/* CARD 3 — MOOD */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col items-center">
                 <div className="flex flex-col items-center text-center mb-6">
                   <h4 className="text-[17px] font-bold text-[#111827]">How are you feeling?</h4>
                   <p className="text-[13px] text-[#9CA3AF] mt-1">Select the emoji that best matches your mood</p>
                 </div>
                 <div className="flex w-full max-w-[360px] items-start justify-between gap-2">
                    {EMOJI_MOOD.map(m => (
                      <button
                        key={m.value}
                        onClick={() => handleUpdate({ mood_score: m.value })}
                        className="flex w-[60px] flex-col items-center gap-2"
                        aria-pressed={log.mood_score === m.value}
                      >
                         <span className={`flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 text-[29px] leading-none transition-all duration-200 ${
                           log.mood_score === m.value
                             ? 'bg-emerald-50 border-emerald-500 scale-105 shadow-md shadow-emerald-500/15'
                             : 'bg-gray-50 border-transparent'
                         }`}>
                           {['😫', '🙁', '😐', '🙂', '🤩'][m.value - 1]}
                         </span>
                         <span className={`text-[10px] font-semibold leading-tight ${
                           log.mood_score === m.value ? 'text-emerald-600' : 'text-[#9CA3AF]'
                         }`}>
                            {m.label}
                         </span>
                      </button>
                    ))}
                 </div>
                 {log.mood_score > 0 && (
                   <div className="mt-5 px-4 py-2 bg-emerald-50 rounded-full">
                     <span className="text-[13px] font-semibold text-emerald-600">Feeling {EMOJI_MOOD.find(m => m.value === log.mood_score)?.label}</span>
                   </div>
                 )}
              </div>
            </>
          )}

          {currentStep === 3 && (
            <>
              {/* CARD 4 — ENERGY LEVEL */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                 <div className="flex justify-between items-center mb-1">
                   <h4 className="text-[15px] font-bold text-[#111827]">Energy Level</h4>
                   <span className="text-[13px] font-semibold" style={{ color: ENERGY_LEVELS.find(e => e.value === log.energy_level)?.color }}>
                      {ENERGY_LEVELS.find(e => e.value === log.energy_level)?.label || ''}
                   </span>
                 </div>
                 <p className="text-[12px] text-[#9CA3AF] italic mb-[10px]">How energised do you feel right now?</p>
                 <div className="flex justify-between mt-4">
                    {ENERGY_LEVELS.map(lv => (
                      <button
                        key={lv.value}
                        onClick={() => handleUpdate({ energy_level: lv.value })}
                        className="flex flex-col items-center w-[52px] gap-2 py-2 rounded-[12px] transition-all border-[1.5px]"
                        style={{ 
                          backgroundColor: log.energy_level === lv.value ? lv.light : 'transparent',
                          borderColor: log.energy_level === lv.value ? lv.color : '#E5E7EB'
                        }}
                      >
                         <div className="flex flex-col items-center min-h-[30px] justify-center mt-1">
                            {[...Array(lv.value)].map((_, i) => (
                              <Zap 
                                key={i} size={10} 
                                className={log.energy_level === lv.value ? '' : 'text-[#9CA3AF]'} 
                                style={{ color: log.energy_level === lv.value ? lv.color : undefined, fill: log.energy_level === lv.value ? 'currentColor' : 'none' }} 
                              />
                            ))}
                         </div>
                         <span className={`text-[10px] mb-1 ${log.energy_level === lv.value ? 'font-bold' : 'text-[#6B7280]'}`} style={{ color: log.energy_level === lv.value ? lv.color : undefined }}>
                            {lv.label}
                         </span>
                      </button>
                    ))}
                 </div>
              </div>

              {/* CARD 5 — PAIN LEVEL */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                 <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-[15px] font-bold text-[#111827]">Pain level compared to yesterday</h4>
                    </div>
                    <span className="text-[13px] font-semibold" style={{ color: EMOJI_PAIN.find(p => p.value === log.pain_score)?.textColor }}>
                      {EMOJI_PAIN.find(p => p.value === log.pain_score)?.label || ''}
                    </span>
                 </div>
                 <p className="text-[12px] text-[#9CA3AF] italic mb-[10px]">0 = much better, 10 = much worse</p>
                 <div className="flex justify-between mt-4">
                    {EMOJI_PAIN.map(p => (
                      <button
                        key={p.value}
                        onClick={() => handleUpdate({ pain_score: p.value })}
                        className="flex flex-col items-center w-[52px] gap-2 py-3 rounded-[12px] transition-all border-[1.5px]"
                        style={{ 
                          backgroundColor: log.pain_score === p.value ? p.color : 'transparent',
                          borderColor: log.pain_score === p.value ? 'transparent' : '#E5E7EB'
                        }}
                      >
                         <span className={`text-[28px] transition-transform ${log.pain_score === p.value ? 'scale-115' : ''}`}>
                            {p.emoji}
                         </span>
                         <span className={`text-[10px] ${log.pain_score === p.value ? 'font-bold' : 'text-[#6B7280]'}`}>
                            {p.label}
                         </span>
                      </button>
                    ))}
                 </div>
              </div>

              {/* CARD 6 — MOBILITY */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                 <div className="flex justify-between items-center mb-1">
                   <div className="flex items-center gap-1.5">
                      <h4 className="text-[15px] font-bold text-[#111827]">How well are you moving compared to yesterday?</h4>
                   </div>
                   <span className="text-[13px] font-bold text-[#1D9E75]">{(log.mobility_score || 5)}/10</span>
                 </div>
                 <p className="text-[12px] text-[#9CA3AF] italic mb-[10px]">1 = much worse, 10 = much better</p>

                 <div className="relative pt-8 pb-4">
                    <div className="h-[8px] w-full bg-[#E5E7EB] rounded-[4px] relative overflow-hidden">
                       <div className="h-full bg-[#1D9E75]" style={{ width: `${(log.mobility_score || 5) * 10}%` }} />
                    </div>
                    <input 
                      type="range" min="1" max="10" step="1"
                      className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                      value={log.mobility_score || 5}
                      onChange={(e) => handleUpdate({ mobility_score: parseInt(e.target.value) })}
                    />
                    <div 
                      className="absolute top-2 w-[28px] h-[28px] bg-white border-[3px] border-[#1D9E75] rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.2)] flex items-center justify-center pointer-events-none"
                      style={{ left: `calc(${(log.mobility_score || 5) * 10}% - 14px)` }}
                    >
                       <div className="absolute -top-8 bg-[#1D9E75] text-white text-[11px] px-2 py-0.5 rounded-full font-bold">
                          {log.mobility_score || 5}
                       </div>
                    </div>
                    <div className="flex justify-between mt-4">
                       <span className="text-[11px] font-medium text-[#9CA3AF]">Stiff</span>
                       <span className="text-[11px] font-medium text-[#9CA3AF]">Moderate</span>
                       <span className="text-[11px] font-medium text-[#9CA3AF]">Full range</span>
                    </div>
                 </div>
              </div>
            </>
          )}

          {currentStep === 4 && (
            <>
              {/* Submit error */}
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-700 font-medium">
                  {submitError}
                </div>
              )}

              {/* CARD 7 — NOTE FOR TRAINER */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                 <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[13px] font-bold text-[#111827] uppercase">NOTE FOR TRAINER</h4>
                      <span className="px-2 py-0.5 border border-[#D1D5DB] text-[#6B7280] text-[10px] font-medium rounded-full">Optional</span>
                    </div>
                 </div>
                 <div className="relative">
                    <textarea 
                      className="w-full min-h-[100px] bg-[#F9FAFB] border border-[#D1D5DB] rounded-[12px] p-3.5 text-[14px] placeholder:italic placeholder:text-[#9CA3AF] outline-none focus:min-h-[140px] focus:border-[#1D9E75] transition-all duration-300"
                      placeholder="Share any wins, concerns or training feedback..."
                      maxLength={1000}
                      value={log.trainer_note || ''}
                      onChange={(e) => handleUpdate({ trainer_note: e.target.value })}
                    />
                    <span className="absolute bottom-3 right-4 text-[11px] text-[#9CA3AF] font-medium">
                      {(log.trainer_note || '').length} / 1000
                    </span>
                 </div>
              </div>

              {/* CARD 8 — TODAY AT A GLANCE */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                 <h4 className="text-[15px] font-bold text-[#111827] mb-6">Today at a glance</h4>
                 <div className="flex justify-between px-2">
                    {[
                      { label: 'Water', emoji: '💧', active: (log.water_litres || 0) > 0 },
                      { label: 'Sleep', emoji: '🌙', active: (log.sleep_hours || 0) > 0 },
                      { label: 'Quality', emoji: '💤', active: (log.sleep_quality_score || 0) > 0 },
                      { label: 'Mood', emoji: '😊', active: (log.mood_score || 0) > 0 },
                      { label: 'Energy', emoji: '⚡', active: (log.energy_level || 0) > 0 },
                      { label: 'Pain', emoji: '😌', active: (log.pain_score !== null && log.pain_score !== undefined) },
                      { label: 'Mobility', emoji: '🦵', active: (log.mobility_score !== null && log.mobility_score !== undefined) },
                    ].map(it => (
                      <div key={it.label} className="flex flex-col items-center gap-1.5">
                         <span className="text-[24px] mb-1 leading-none">{it.emoji}</span>
                         <span className="text-[10px] font-medium text-[#9CA3AF]">{it.label}</span>
                          {it.active ? (
                            <div className="w-[18px] h-[18px] rounded-full bg-[#1D9E75] flex items-center justify-center mt-1">
                              <Check size={12} className="text-white" strokeWidth={3} />
                            </div>
                          ) : (
                            <div className="w-[18px] h-[18px] rounded-full border-2 border-[#D1D5DB] mt-1" />
                          )}
                      </div>
                    ))}
                 </div>
                 {doneCount >= 7 && (
                   <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-8 p-3 bg-[#E1F5EE] rounded-[10px] flex items-center justify-center"
                   >
                      <span className="text-[13px] font-bold text-[#0F6E56]">All sections complete — great work today! 🎉</span>
                   </motion.div>
                 )}
              </div>
            </>
          )}

        </div>
    </OnboardingLayout>
  );
}
