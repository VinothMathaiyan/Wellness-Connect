import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import type { MealLog } from './src/types';

interface Props {
  onBack: () => void;
  onComplete: (log: MealLog) => void;
  existingMeals?: MealLog[];
}

const MEAL_TYPES: { type: MealLog['meal_type']; emoji: string; label: string; time: string; bg: string; accent: string }[] = [
  { type: 'breakfast', emoji: '🌅', label: 'Breakfast', time: '6 AM – 10 AM', bg: '#FFF7ED', accent: '#F59E0B' },
  { type: 'lunch',     emoji: '☀️', label: 'Lunch',     time: '12 PM – 3 PM', bg: '#ECFDF5', accent: '#1D9E75' },
  { type: 'dinner',    emoji: '🌙', label: 'Dinner',    time: '7 PM – 10 PM', bg: '#EFF6FF', accent: '#3B82F6' },
  { type: 'snack',     emoji: '🍎', label: 'Snack',     time: 'Anytime',      bg: '#FDF4FF', accent: '#A855F7' },
];

const MAX_DESC = 200;

export default function MealLogScreen({ onBack, onComplete, existingMeals = [] }: Props) {
  const [selectedType, setSelectedType] = useState<MealLog['meal_type'] | null>(null);
  const [description, setDescription]   = useState('');
  const [submitted, setSubmitted]        = useState(false);

  const alreadyLogged = (type: MealLog['meal_type']) => existingMeals.some(m => m.meal_type === type);

  const canSubmit = selectedType !== null && description.trim().length >= 3;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const log: MealLog = {
      meal_type:   selectedType!,
      description: description.trim(),
      logged_at:   new Date().toISOString(),
    };
    setSubmitted(true);
    setTimeout(() => onComplete(log), 900);
  };

  const meta = MEAL_TYPES.find(m => m.type === selectedType);

  return (
    <div className="flex flex-col min-h-screen bg-gray-200 items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative h-[800px] flex flex-col border-[12px] border-[#1E293B]">

        {/* Header */}
        <header className="h-[52px] w-full flex items-center px-[14px] bg-white shrink-0 border-b border-[#F3F4F6] relative">
          <button onClick={onBack} className="w-[36px] h-[36px] flex items-center justify-center rounded-full active:bg-[#F3F4F6] transition-colors">
            <ChevronLeft size={22} color="#111827" />
          </button>
          <h1 className="absolute left-0 right-0 text-center text-[16px] font-bold text-[#111827] pointer-events-none">
            Log a Meal
          </h1>
        </header>

        {/* Progress: meals logged today */}
        <div className="flex items-center gap-[8px] px-[20px] py-[12px] border-b border-[#F3F4F6] shrink-0">
          <span className="text-[12px] text-[#6B7280] font-medium">Today's meals:</span>
          {MEAL_TYPES.map(m => (
            <div key={m.type} className={`flex items-center gap-[3px] px-[8px] py-[2px] rounded-full text-[10px] font-semibold border transition-all ${alreadyLogged(m.type) ? 'bg-[#D1FAE5] border-[#1D9E75] text-[#1D9E75]' : 'border-[#E5E7EB] text-[#9CA3AF]'}`}>
              {m.emoji} {alreadyLogged(m.type) && '✓'}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-[20px] py-[16px] flex flex-col gap-[20px]">

          {/* Success overlay */}
          <AnimatePresence>
            {submitted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 bg-white flex flex-col items-center justify-center z-50 rounded-[2rem]">
                <CheckCircle2 size={72} color="#1D9E75" strokeWidth={1.5} />
                <h2 className="text-[22px] font-bold text-[#111827] mt-[16px]">Meal Logged!</h2>
                <p className="text-[13px] text-[#6B7280] mt-[6px]">Returning to dashboard…</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Meal type grid */}
          <section>
            <p className="text-[11px] font-bold text-[#6B7280] tracking-[0.07em] uppercase mb-[12px]">Select Meal Type</p>
            <div className="grid grid-cols-2 gap-[10px]">
              {MEAL_TYPES.map(m => {
                const logged  = alreadyLogged(m.type);
                const active  = selectedType === m.type;
                return (
                  <button
                    key={m.type}
                    onClick={() => setSelectedType(m.type)}
                    className="relative rounded-[14px] p-[16px] border-2 text-left transition-all active:scale-[0.97]"
                    style={{
                      backgroundColor: active ? m.bg : '#FAFAFA',
                      borderColor: active ? m.accent : '#E5E7EB',
                    }}>
                    {logged && (
                      <span className="absolute top-[8px] right-[8px] text-[10px] font-bold px-[6px] py-[1px] rounded-full bg-[#D1FAE5] text-[#1D9E75]">✓ logged</span>
                    )}
                    <span className="text-[28px] block mb-[6px]">{m.emoji}</span>
                    <span className="text-[14px] font-bold block" style={{ color: active ? m.accent : '#111827' }}>{m.label}</span>
                    <span className="text-[10px] text-[#9CA3AF]">{m.time}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Description input — slides in when type selected */}
          <AnimatePresence>
            {selectedType && (
              <motion.section
                key="desc"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.22 }}>
                <p className="text-[11px] font-bold text-[#6B7280] tracking-[0.07em] uppercase mb-[10px]">
                  What did you eat? <span className="text-[#9CA3AF] normal-case font-normal">(required)</span>
                </p>
                <div className="relative">
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value.slice(0, MAX_DESC))}
                    placeholder={`e.g. ${meta?.label === 'Breakfast' ? 'Oatmeal with banana and honey' : meta?.label === 'Lunch' ? 'Grilled chicken salad with olive oil' : meta?.label === 'Dinner' ? 'Dal rice with sabzi and curd' : 'Apple and a handful of almonds'}`}
                    rows={4}
                    className="w-full rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] px-[14px] py-[12px] text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] transition-all resize-none"
                  />
                  <span className="absolute bottom-[10px] right-[12px] text-[10px] text-[#9CA3AF]">{description.length}/{MAX_DESC}</span>
                </div>

                {/* Quick-add chips */}
                <div className="flex flex-wrap gap-[6px] mt-[10px]">
                  {(selectedType === 'breakfast'
                    ? ['Oats', 'Eggs', 'Idli', 'Poha', 'Smoothie']
                    : selectedType === 'lunch'
                    ? ['Rice + Dal', 'Roti + Sabzi', 'Salad', 'Sandwich', 'Khichdi']
                    : selectedType === 'dinner'
                    ? ['Dal Rice', 'Chapati + Curry', 'Soup', 'Pulao', 'Khichdi']
                    : ['Fruit', 'Nuts', 'Protein Bar', 'Yogurt', 'Tea']
                  ).map(chip => (
                    <button key={chip} onClick={() => setDescription(prev => prev ? `${prev}, ${chip}` : chip)}
                      className="px-[10px] py-[4px] rounded-full border border-[#E5E7EB] text-[11px] text-[#6B7280] bg-white active:bg-[#F3F4F6] transition-colors">
                      + {chip}
                    </button>
                  ))}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* Submit CTA */}
        <div className="px-[20px] pb-[24px] pt-[12px] border-t border-[#F3F4F6] shrink-0">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full h-[52px] rounded-[14px] text-[15px] font-bold transition-all active:scale-[0.98] ${canSubmit ? 'bg-[#1D9E75] text-white shadow-lg shadow-[#1D9E75]/30' : 'bg-[#E5E7EB] text-[#9CA3AF]'}`}>
            {selectedType ? `Log ${MEAL_TYPES.find(m => m.type === selectedType)?.label} 🍽️` : 'Select a meal type'}
          </button>
        </div>

      </div>
    </div>
  );
}
