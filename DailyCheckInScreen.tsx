import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import type { DailyLog } from './src/types';

interface Props {
  onBack: () => void;
  onComplete: (log: DailyLog) => void;
  existingLog?: DailyLog;
}

const MOOD_OPTIONS = [
  { score: 1, emoji: '😔', label: 'Low' },
  { score: 2, emoji: '😕', label: 'Meh' },
  { score: 3, emoji: '😐', label: 'Okay' },
  { score: 4, emoji: '🙂', label: 'Good' },
  { score: 5, emoji: '😄', label: 'Great' },
];

const ENERGY_OPTIONS = [
  { score: 1, label: 'Drained', color: '#E24B4A' },
  { score: 2, label: 'Low',     color: '#EF9F27' },
  { score: 3, label: 'Okay',    color: '#F5C842' },
  { score: 4, label: 'High',    color: '#8BC34A' },
  { score: 5, label: 'Peak',    color: '#1D9E75' },
];

const STEP_META = [
  { icon: '😴', title: 'Sleep', subtitle: 'How many hours did you sleep last night?' },
  { icon: '😊', title: 'Mood',  subtitle: 'How are you feeling right now?' },
  { icon: '⚡', title: 'Energy', subtitle: "What's your energy level today?" },
  { icon: '💧', title: 'Hydration', subtitle: 'How many glasses of water so far?' },
  { icon: '🏋️', title: 'Workout', subtitle: 'Did you complete a workout today?' },
];

function computeScore(s: Omit<DailyLog, 'log_date' | 'readiness_score'>): number {
  const sleep  = Math.round(((s.sleep_hours - 4) / 6) * 30);
  const mood   = Math.round((s.mood_score   / 5) * 25);
  const energy = Math.round((s.energy_score / 5) * 25);
  const water  = Math.round(Math.min(s.water_glasses / 8, 1) * 10);
  const workout = s.workout_done ? 10 : 0;
  return Math.min(100, Math.max(0, sleep + mood + energy + water + workout));
}

const getScoreColor = (n: number) => n >= 70 ? '#1D9E75' : n >= 40 ? '#EF9F27' : '#E24B4A';
const getScoreLabel = (n: number) => n >= 70 ? 'Great day ahead! 🚀' : n >= 40 ? 'Keep pushing! 💪' : 'Rest & recover 🛌';

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
};

export default function DailyCheckInScreen({ onBack, onComplete, existingLog }: Props) {
  const [step, setStep]           = useState(0);
  const [dir,  setDir]            = useState(1);
  const [sleep, setSleep]         = useState(existingLog?.sleep_hours  ?? 7);
  const [mood,  setMood]          = useState(existingLog?.mood_score    ?? 0);
  const [energy, setEnergy]       = useState(existingLog?.energy_score  ?? 0);
  const [water, setWater]         = useState(existingLog?.water_glasses ?? 4);
  const [workout, setWorkout]     = useState<boolean | null>(existingLog != null ? existingLog.workout_done : null);

  const isSummary = step === 5;
  const progress  = isSummary ? 100 : (step / 5) * 100;

  const canNext = () => {
    if (step === 1) return mood   > 0;
    if (step === 2) return energy > 0;
    if (step === 4) return workout !== null;
    return true;
  };

  const go = (d: 1 | -1) => { setDir(d); setStep(s => s + d); };
  const handleBack = () => step === 0 ? onBack() : go(-1);

  const handleDone = () => {
    const raw = { sleep_hours: sleep, mood_score: mood, energy_score: energy, water_glasses: water, workout_done: workout ?? false };
    onComplete({ log_date: new Date().toISOString().split('T')[0], ...raw, readiness_score: computeScore(raw) });
  };

  const score = computeScore({ sleep_hours: sleep, mood_score: mood || 3, energy_score: energy || 3, water_glasses: water, workout_done: workout ?? false });

  return (
    <div className="flex flex-col min-h-screen bg-gray-200 items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative h-[800px] flex flex-col border-[12px] border-[#1E293B]">

        {/* Header */}
        <header className="h-[52px] w-full flex items-center px-[14px] bg-white shrink-0 border-b border-[#F3F4F6] relative">
          <button onClick={handleBack} className="w-[36px] h-[36px] flex items-center justify-center rounded-full active:bg-[#F3F4F6] transition-colors">
            <ChevronLeft size={22} color="#111827" />
          </button>
          <h1 className="absolute left-0 right-0 text-center text-[16px] font-bold text-[#111827] pointer-events-none">
            {isSummary ? "Today's Readiness" : 'Daily Check-in'}
          </h1>
        </header>

        {/* Progress bar */}
        <div className="h-[3px] bg-[#F3F4F6] shrink-0">
          <motion.div className="h-full bg-[#1D9E75]" animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: 'easeInOut' }} />
        </div>

        {/* Step dots */}
        {!isSummary && (
          <div className="flex justify-center gap-[8px] py-[10px] shrink-0">
            {STEP_META.map((m, i) => (
              <div key={m.title} className={`w-[7px] h-[7px] rounded-full transition-all duration-300 ${i === step ? 'bg-[#1D9E75] w-[18px]' : i < step ? 'bg-[#1D9E75]/40' : 'bg-[#E5E7EB]'}`} />
            ))}
          </div>
        )}

        {/* Slides */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence custom={dir} mode="wait">
            <motion.div
              key={step}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: 'easeInOut' }}
              className="absolute inset-0 flex flex-col px-[24px] pt-[20px] pb-[24px]"
            >

              {/* ── Step 0: Sleep ── */}
              {step === 0 && (
                <div className="flex flex-col flex-1">
                  <div className="text-[48px] text-center mb-[6px]">{STEP_META[0].icon}</div>
                  <h2 className="text-[20px] font-bold text-[#111827] text-center mb-[4px]">{STEP_META[0].title}</h2>
                  <p className="text-[13px] text-[#6B7280] text-center mb-[32px]">{STEP_META[0].subtitle}</p>

                  <div className="flex flex-col items-center gap-[20px] flex-1 justify-center">
                    <div className="w-[120px] h-[120px] rounded-full border-[4px] border-[#1D9E75] flex flex-col items-center justify-center bg-[#F0FDF8]">
                      <span className="text-[36px] font-bold text-[#1D9E75]">{sleep}</span>
                      <span className="text-[12px] text-[#6B7280] font-medium">hours</span>
                    </div>

                    <input
                      type="range" min={4} max={10} step={0.5} value={sleep}
                      onChange={e => setSleep(Number(e.target.value))}
                      className="w-full accent-[#1D9E75]"
                    />
                    <div className="flex justify-between w-full text-[11px] text-[#9CA3AF]">
                      <span>4 hrs</span><span>10 hrs</span>
                    </div>

                    <div className="flex gap-[6px] flex-wrap justify-center">
                      {[5,6,7,8,9].map(h => (
                        <button key={h} onClick={() => setSleep(h)}
                          className={`px-[14px] py-[8px] rounded-full text-[13px] font-semibold border transition-all ${sleep === h ? 'bg-[#1D9E75] text-white border-[#1D9E75]' : 'border-[#E5E7EB] text-[#6B7280]'}`}>
                          {h}h
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 1: Mood ── */}
              {step === 1 && (
                <div className="flex flex-col flex-1">
                  <div className="text-[48px] text-center mb-[6px]">{STEP_META[1].icon}</div>
                  <h2 className="text-[20px] font-bold text-[#111827] text-center mb-[4px]">{STEP_META[1].title}</h2>
                  <p className="text-[13px] text-[#6B7280] text-center mb-[32px]">{STEP_META[1].subtitle}</p>

                  <div className="flex justify-around items-end flex-1 max-h-[220px]">
                    {MOOD_OPTIONS.map(opt => (
                      <button key={opt.score} onClick={() => setMood(opt.score)}
                        className="flex flex-col items-center gap-[8px] group">
                        <motion.div
                          animate={{ scale: mood === opt.score ? 1.2 : 1 }}
                          className={`w-[52px] h-[52px] rounded-full flex items-center justify-center text-[28px] border-2 transition-all ${mood === opt.score ? 'border-[#1D9E75] bg-[#F0FDF8] shadow-md' : 'border-[#E5E7EB] bg-[#F9FAFB]'}`}>
                          {opt.emoji}
                        </motion.div>
                        <span className={`text-[10px] font-medium ${mood === opt.score ? 'text-[#1D9E75]' : 'text-[#9CA3AF]'}`}>{opt.label}</span>
                      </button>
                    ))}
                  </div>

                  {mood === 0 && <p className="text-[12px] text-[#9CA3AF] text-center mt-[24px]">Tap an emoji to continue</p>}
                </div>
              )}

              {/* ── Step 2: Energy ── */}
              {step === 2 && (
                <div className="flex flex-col flex-1">
                  <div className="text-[48px] text-center mb-[6px]">{STEP_META[2].icon}</div>
                  <h2 className="text-[20px] font-bold text-[#111827] text-center mb-[4px]">{STEP_META[2].title}</h2>
                  <p className="text-[13px] text-[#6B7280] text-center mb-[32px]">{STEP_META[2].subtitle}</p>

                  <div className="flex gap-[8px] items-end justify-center flex-1 max-h-[180px]">
                    {ENERGY_OPTIONS.map((opt, i) => {
                      const active = energy >= opt.score;
                      const barH = 40 + i * 20;
                      return (
                        <button key={opt.score} onClick={() => setEnergy(opt.score)} className="flex flex-col items-center gap-[6px]">
                          <motion.div
                            animate={{ height: barH, backgroundColor: active ? opt.color : '#E5E7EB' }}
                            transition={{ duration: 0.2 }}
                            className="w-[40px] rounded-[8px]"
                            style={{ height: barH }}
                          />
                          <span className={`text-[9px] font-medium ${energy === opt.score ? 'text-[#111827]' : 'text-[#9CA3AF]'}`}>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {energy === 0 && <p className="text-[12px] text-[#9CA3AF] text-center mt-[24px]">Tap a bar to select</p>}
                </div>
              )}

              {/* ── Step 3: Water ── */}
              {step === 3 && (
                <div className="flex flex-col flex-1">
                  <div className="text-[48px] text-center mb-[6px]">{STEP_META[3].icon}</div>
                  <h2 className="text-[20px] font-bold text-[#111827] text-center mb-[4px]">{STEP_META[3].title}</h2>
                  <p className="text-[13px] text-[#6B7280] text-center mb-[32px]">{STEP_META[3].subtitle}</p>

                  <div className="flex flex-col items-center gap-[24px] flex-1 justify-center">
                    <div className="flex items-center gap-[28px]">
                      <button onClick={() => setWater(w => Math.max(0, w - 1))}
                        className="w-[52px] h-[52px] rounded-full bg-[#F3F4F6] text-[28px] font-bold text-[#6B7280] flex items-center justify-center active:scale-90 transition-transform">−</button>
                      <div className="flex flex-col items-center">
                        <span className="text-[52px] font-bold text-[#185FA5] leading-none">{water}</span>
                        <span className="text-[12px] text-[#6B7280]">glasses</span>
                      </div>
                      <button onClick={() => setWater(w => Math.min(8, w + 1))}
                        className="w-[52px] h-[52px] rounded-full bg-[#E6F1FB] text-[28px] font-bold text-[#185FA5] flex items-center justify-center active:scale-90 transition-transform">+</button>
                    </div>

                    <div className="flex gap-[6px]">
                      {[...Array(8)].map((_, i) => (
                        <button key={i} onClick={() => setWater(i + 1)}
                          className={`w-[26px] h-[32px] rounded-[6px] border-2 transition-all ${i < water ? 'bg-[#185FA5] border-[#185FA5]' : 'border-[#D1D5DB]'}`}>
                          {i < water && <span className="text-white text-[10px]">💧</span>}
                        </button>
                      ))}
                    </div>
                    <p className="text-[12px] text-[#9CA3AF]">Goal: 8 glasses per day</p>
                  </div>
                </div>
              )}

              {/* ── Step 4: Workout ── */}
              {step === 4 && (
                <div className="flex flex-col flex-1">
                  <div className="text-[48px] text-center mb-[6px]">{STEP_META[4].icon}</div>
                  <h2 className="text-[20px] font-bold text-[#111827] text-center mb-[4px]">{STEP_META[4].title}</h2>
                  <p className="text-[13px] text-[#6B7280] text-center mb-[32px]">{STEP_META[4].subtitle}</p>

                  <div className="flex gap-[12px] flex-1 items-center justify-center max-h-[200px]">
                    {[{ val: true, emoji: '✅', label: 'Yes, I did!', bg: '#F0FDF8', border: '#1D9E75', text: '#1D9E75' },
                      { val: false, emoji: '😅', label: 'Not today', bg: '#F9FAFB', border: '#D1D5DB', text: '#6B7280' }]
                      .map(opt => (
                        <button key={String(opt.val)} onClick={() => setWorkout(opt.val)}
                          className="flex-1 h-[140px] rounded-[16px] flex flex-col items-center justify-center gap-[10px] border-2 transition-all active:scale-[0.97]"
                          style={{ backgroundColor: workout === opt.val ? opt.bg : '#F9FAFB', borderColor: workout === opt.val ? opt.border : '#E5E7EB' }}>
                          <span className="text-[40px]">{opt.emoji}</span>
                          <span className="text-[14px] font-semibold" style={{ color: workout === opt.val ? opt.text : '#6B7280' }}>{opt.label}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* ── Step 5: Summary ── */}
              {isSummary && (
                <div className="flex flex-col flex-1 items-center">
                  <p className="text-[13px] text-[#6B7280] mb-[16px]">Here's your readiness for today</p>

                  {/* Score ring */}
                  <div className="w-[140px] h-[140px] rounded-full flex flex-col items-center justify-center mb-[24px] shadow-lg"
                    style={{ backgroundColor: getScoreColor(score), boxShadow: `0 8px 24px ${getScoreColor(score)}44` }}>
                    <motion.span
                      className="text-[44px] font-bold text-white leading-none"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}>
                      {score}
                    </motion.span>
                    <span className="text-[12px] text-white/70 font-medium">/ 100</span>
                  </div>

                  <p className="text-[15px] font-semibold text-[#111827] mb-[20px]">{getScoreLabel(score)}</p>

                  {/* Metric chips */}
                  <div className="grid grid-cols-2 gap-[10px] w-full mb-[24px]">
                    {[
                      { label: 'Sleep',    value: `${sleep}h`,             emoji: '😴' },
                      { label: 'Mood',     value: MOOD_OPTIONS[mood - 1]?.label ?? '—',  emoji: '😊' },
                      { label: 'Energy',   value: ENERGY_OPTIONS[energy - 1]?.label ?? '—', emoji: '⚡' },
                      { label: 'Water',    value: `${water} glasses`,      emoji: '💧' },
                      { label: 'Workout',  value: workout ? 'Done ✓' : 'Rest day', emoji: '🏋️' },
                    ].map(m => (
                      <div key={m.label} className="bg-[#F9FAFB] rounded-[12px] p-[12px] border border-[#E5E7EB]">
                        <p className="text-[11px] text-[#9CA3AF] mb-[2px]">{m.emoji} {m.label}</p>
                        <p className="text-[13px] font-semibold text-[#111827]">{m.value}</p>
                      </div>
                    ))}
                  </div>

                  <button onClick={handleDone}
                    className="w-full h-[52px] bg-[#1D9E75] text-white text-[15px] font-bold rounded-[14px] active:scale-[0.98] transition-transform shadow-lg shadow-[#1D9E75]/30 mt-auto">
                    Save & Back to Dashboard
                  </button>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Next CTA (not on summary) */}
        {!isSummary && (
          <div className="px-[24px] pb-[24px] shrink-0">
            <button
              onClick={() => go(1)}
              disabled={!canNext()}
              className={`w-full h-[52px] rounded-[14px] text-[15px] font-bold transition-all active:scale-[0.98] ${canNext() ? 'bg-[#1D9E75] text-white shadow-lg shadow-[#1D9E75]/30' : 'bg-[#E5E7EB] text-[#9CA3AF]'}`}>
              {step === 4 ? 'See my score →' : 'Continue →'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
