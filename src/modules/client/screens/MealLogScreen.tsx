import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Plus, Trash2, CheckCircle2, Clock } from 'lucide-react';
import type { MealLog } from '../../../types';
import MobileShell from '../../../components/MobileShell';

// ── Types ────────────────────────────────────────────────────────────────────

type ViewPhase = 'select' | 'build' | 'summary';
type MealType  = MealLog['meal_type'];

interface Ingredient {
  id: string;
  name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

// ── Static Data ───────────────────────────────────────────────────────────────

const MEAL_META: Record<MealType, { emoji: string; label: string; accent: string; bg: string; defaultTime: string }> = {
  breakfast: { emoji: '🌅', label: 'Breakfast', accent: '#F59E0B', bg: '#FFF7ED', defaultTime: '08:00' },
  lunch:     { emoji: '☀️', label: 'Lunch',     accent: '#1D9E75', bg: '#ECFDF5', defaultTime: '13:00' },
  dinner:    { emoji: '🌙', label: 'Dinner',    accent: '#3B82F6', bg: '#EFF6FF', defaultTime: '20:00' },
  snack:     { emoji: '🍎', label: 'Snack',     accent: '#A855F7', bg: '#FDF4FF', defaultTime: '16:00' },
};

const SEED_INGREDIENTS: Record<MealType, Ingredient[]> = {
  breakfast: [
    { id: 'b1', name: 'Oats (cooked)',  grams: 180, calories: 166, protein_g: 6,  carbs_g: 28, fat_g: 3 },
    { id: 'b2', name: 'Banana',         grams: 120, calories: 107, protein_g: 1,  carbs_g: 27, fat_g: 0 },
    { id: 'b3', name: 'Whole Milk',     grams: 200, calories: 122, protein_g: 6,  carbs_g: 10, fat_g: 6 },
  ],
  lunch: [
    { id: 'l1', name: 'Cooked Rice',    grams: 200, calories: 260, protein_g: 5,  carbs_g: 56, fat_g: 1 },
    { id: 'l2', name: 'Dal (toor)',      grams: 150, calories: 127, protein_g: 9,  carbs_g: 22, fat_g: 1 },
    { id: 'l3', name: 'Sabzi (mixed)',  grams: 100, calories: 85,  protein_g: 3,  carbs_g: 12, fat_g: 3 },
  ],
  dinner: [
    { id: 'd1', name: 'Chapati',        grams: 60,  calories: 150, protein_g: 4,  carbs_g: 28, fat_g: 3 },
    { id: 'd2', name: 'Paneer Curry',   grams: 150, calories: 220, protein_g: 15, carbs_g: 8,  fat_g: 14 },
    { id: 'd3', name: 'Curd',           grams: 100, calories: 61,  protein_g: 3,  carbs_g: 5,  fat_g: 3  },
  ],
  snack: [
    { id: 's1', name: 'Almonds',        grams: 30,  calories: 173, protein_g: 6,  carbs_g: 6,  fat_g: 15 },
    { id: 's2', name: 'Apple',          grams: 150, calories: 78,  protein_g: 0,  carbs_g: 21, fat_g: 0  },
  ],
};

// ── SVG Donut Chart ───────────────────────────────────────────────────────────

function DonutChart({ pct, color, label, value }: { pct: number; color: string; label: string; value: string }) {
  const size = 76;
  const sw   = 9;
  const r    = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const cx   = size / 2;
  return (
    <div className="flex flex-col items-center gap-[5px]">
      <svg width={size} height={size}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#F3F4F6" strokeWidth={sw} />
        <motion.circle
          cx={cx} cy={cx} r={r} fill="none"
          stroke={color} strokeWidth={sw}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - Math.min(pct, 1)) }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{ strokeDasharray: circ }}
        />
        <text x={cx} y={cx + 1} textAnchor="middle" dominantBaseline="middle"
          fontSize="12" fontWeight="700" fill="#111827">{value}</text>
      </svg>
      <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>{label}</span>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
  onComplete: (log: MealLog) => void;
  existingMeals?: MealLog[];
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MealLogScreen({ onBack, onComplete, existingMeals = [] }: Props) {
  const [phase,       setPhase]       = useState<ViewPhase>('select');
  const [mealType,    setMealType]    = useState<MealType | null>(null);
  const [items,       setItems]       = useState<Ingredient[]>([]);
  const [loggedAt,    setLoggedAt]    = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName,     setNewName]     = useState('');
  const [newCal,      setNewCal]      = useState('');
  const [submitted,   setSubmitted]   = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // ── Derived totals ──────────────────────────────────────────────────────────
  const totalCal  = items.reduce((s, i) => s + i.calories,  0);
  const totalProt = items.reduce((s, i) => s + i.protein_g, 0);
  const totalCarb = items.reduce((s, i) => s + i.carbs_g,   0);
  const totalFat  = items.reduce((s, i) => s + i.fat_g,     0);
  const macroKcal = totalProt * 4 + totalCarb * 4 + totalFat * 9;
  const protPct   = macroKcal > 0 ? (totalProt * 4) / macroKcal : 0;
  const carbPct   = macroKcal > 0 ? (totalCarb * 4) / macroKcal : 0;
  const fatPct    = macroKcal > 0 ? (totalFat  * 9) / macroKcal : 0;

  const meta = mealType ? MEAL_META[mealType] : null;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSelectType = (type: MealType) => {
    setMealType(type);
    setItems(SEED_INGREDIENTS[type].map(i => ({ ...i })));
    setLoggedAt(MEAL_META[type].defaultTime);
    setPhase('build');
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const addItem = () => {
    if (!newName.trim() || !newCal) return;
    const cal = Math.max(0, parseInt(newCal, 10));
    setItems(prev => [...prev, {
      id: `c-${Date.now()}`,
      name:      newName.trim(),
      grams:     100,
      calories:  cal,
      protein_g: Math.round((cal * 0.30) / 4),
      carbs_g:   Math.round((cal * 0.40) / 4),
      fat_g:     Math.round((cal * 0.30) / 9),
    }]);
    setNewName(''); setNewCal(''); setShowAddForm(false);
  };

  const handleConfirm = () => {
    if (!mealType) return;
    const now = new Date();
    const [h, m] = loggedAt.split(':').map(Number);
    now.setHours(h, m, 0, 0);
    setSubmitted(true);
    setTimeout(() => onComplete({
      meal_type:      mealType,
      description:    items.map(i => i.name).join(', '),
      total_calories: totalCal,
      macros_json:    { protein_g: totalProt, carbs_g: totalCarb, fat_g: totalFat },
      logged_at:      now.toISOString(),
    }), 1000);
  };

  const handleBack = () => {
    if (phase === 'select')  return onBack();
    if (phase === 'build')   { setPhase('select'); setShowAddForm(false); }
    if (phase === 'summary') setPhase('build');
  };

  const phaseIndex = { select: 0, build: 1, summary: 2 }[phase];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <MobileShell>

        {/* ── Header ── */}
        <header className="h-[52px] w-full flex items-center px-[14px] bg-white shrink-0 border-b border-[#F3F4F6] relative">
          <button onClick={handleBack} className="w-[36px] h-[36px] flex items-center justify-center rounded-full active:bg-[#F3F4F6] transition-colors z-10">
            <ChevronLeft size={22} color="#111827" />
          </button>
          <h1 className="absolute left-0 right-0 text-center text-[16px] font-bold text-[#111827] pointer-events-none">
            {phase === 'select'  ? 'Log a Meal' :
             phase === 'build'   ? `${meta?.label} Builder` :
                                   'Review & Confirm'}
          </h1>
          {phase === 'build' && meta && (
            <div className="absolute right-[14px] flex flex-col items-end">
              <motion.span key={totalCal} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className="text-[18px] font-bold" style={{ color: meta.accent }}>{totalCal}</motion.span>
              <span className="text-[9px] text-[#9CA3AF] font-medium">kcal</span>
            </div>
          )}
        </header>

        {/* ── Progress Pills ── */}
        <div className="flex gap-[6px] px-[20px] py-[10px] border-b border-[#F3F4F6] shrink-0">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-[3px] flex-1 rounded-full transition-all duration-500"
              style={{ backgroundColor: i <= phaseIndex ? (meta?.accent ?? '#1D9E75') : '#E5E7EB' }} />
          ))}
        </div>

        {/* ── Success Overlay ── */}
        <AnimatePresence>
          {submitted && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-white flex flex-col items-center justify-center z-50">
              <CheckCircle2 size={72} color="#1D9E75" strokeWidth={1.5} />
              <h2 className="text-[22px] font-bold text-[#111827] mt-[16px]">Meal Saved!</h2>
              <p className="text-[13px] text-[#6B7280] mt-[6px]">{totalCal} kcal · Returning to dashboard…</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════════════════════
            PHASE 1 — Meal Type Selector
        ══════════════════════════════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {phase === 'select' && (
            <motion.div key="select"
              initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
              className="flex-1 overflow-y-auto px-[20px] pt-[16px] pb-[20px]">

              {existingMeals.length > 0 && (
                <div className="flex flex-wrap gap-[6px] mb-[16px]">
                  <span className="text-[11px] text-[#9CA3AF] font-medium self-center">Today:</span>
                  {existingMeals.map(m => (
                    <span key={m.logged_at}
                      className="px-[8px] py-[2px] rounded-full text-[10px] font-semibold bg-[#D1FAE5] text-[#1D9E75] border border-[#1D9E75]">
                      {MEAL_META[m.meal_type].emoji} {MEAL_META[m.meal_type].label} · {m.total_calories} kcal
                    </span>
                  ))}
                </div>
              )}

              <p className="text-[11px] font-bold text-[#6B7280] tracking-[0.07em] uppercase mb-[12px]">What are you eating?</p>

              <div className="grid grid-cols-2 gap-[10px]">
                {(Object.entries(MEAL_META) as [MealType, typeof MEAL_META['breakfast']][]).map(([type, m]) => {
                  const prev = existingMeals.find(e => e.meal_type === type);
                  return (
                    <button key={type} onClick={() => handleSelectType(type)}
                      className="relative rounded-[16px] p-[16px] border-2 text-left transition-all active:scale-[0.97] hover:shadow-md"
                      style={{ backgroundColor: m.bg, borderColor: m.accent + '55' }}>
                      {prev && <span className="absolute top-[8px] right-[8px] text-[9px] font-bold px-[5px] py-[1px] rounded-full bg-[#D1FAE5] text-[#1D9E75]">✓</span>}
                      <span className="text-[32px] block mb-[8px]">{m.emoji}</span>
                      <span className="text-[15px] font-bold block" style={{ color: m.accent }}>{m.label}</span>
                      <span className="text-[10px] text-[#9CA3AF]">
                        {prev ? `${prev.total_calories} kcal logged` : m.defaultTime.replace(':', ':')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              PHASE 2 — Ingredient Builder (Scanner View)
          ══════════════════════════════════════════════════════════════════════ */}
          {phase === 'build' && meta && (
            <motion.div key="build"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.22 }}
              className="flex-1 overflow-hidden flex flex-col">

              {/* Live calorie banner */}
              <div className="px-[20px] py-[12px] shrink-0" style={{ backgroundColor: meta.bg }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.06em] uppercase mb-[2px]" style={{ color: meta.accent + 'AA' }}>Total Energy</p>
                    <div className="flex items-end gap-[3px]">
                      <motion.span key={totalCal} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                        className="text-[28px] font-bold leading-none" style={{ color: meta.accent }}>{totalCal}</motion.span>
                      <span className="text-[11px] pb-[3px] font-medium" style={{ color: meta.accent + '88' }}>kcal</span>
                    </div>
                  </div>
                  <div className="flex gap-[14px]">
                    {[['P', totalProt, 'g'], ['C', totalCarb, 'g'], ['F', totalFat, 'g']].map(([k, v, u]) => (
                      <div key={String(k)} className="flex flex-col items-center">
                        <span className="text-[10px] text-[#6B7280] font-medium">{k}</span>
                        <span className="text-[14px] font-bold text-[#111827]">{v}{u}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Item list */}
              <div className="flex-1 overflow-y-auto px-[16px] py-[10px]">
                <p className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.07em] uppercase mb-[10px]">
                  {items.length} item{items.length !== 1 ? 's' : ''} detected
                </p>

                <AnimatePresence initial={false}>
                  {items.map(item => (
                    <motion.div key={item.id} layout
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.18 }}
                      className="flex items-center gap-[10px] bg-[#F9FAFB] rounded-[12px] px-[12px] py-[10px] mb-[8px] border border-[#E5E7EB]">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#111827] truncate">{item.name}</p>
                        <p className="text-[10px] text-[#9CA3AF]">{item.grams}g · P:{item.protein_g}g C:{item.carbs_g}g F:{item.fat_g}g</p>
                      </div>
                      <span className="text-[14px] font-bold shrink-0" style={{ color: meta.accent }}>{item.calories}</span>
                      <span className="text-[10px] text-[#9CA3AF] shrink-0">kcal</span>
                      <button onClick={() => removeItem(item.id)}
                        className="w-[28px] h-[28px] flex items-center justify-center rounded-full bg-[#FEE2E2] active:bg-[#FECACA] transition-colors shrink-0">
                        <Trash2 size={13} color="#EF4444" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Inline Add Item form */}
                <AnimatePresence>
                  {showAddForm && (
                    <motion.div key="addform"
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mb-[8px]">
                      <div className="bg-white border-2 rounded-[12px] p-[12px]" style={{ borderColor: meta.accent }}>
                        <p className="text-[11px] font-bold mb-[8px]" style={{ color: meta.accent }}>Add Item</p>
                        <input ref={nameRef} value={newName} onChange={e => setNewName(e.target.value)}
                          placeholder="Item name (e.g. Brown Rice)"
                          className="w-full rounded-[8px] border border-[#E5E7EB] px-[10px] py-[8px] text-[13px] placeholder:text-[#9CA3AF] focus:outline-none mb-[8px]"
                          style={{ borderColor: newName ? meta.accent + '66' : undefined }}
                          onKeyDown={e => e.key === 'Enter' && nameRef.current?.blur()} />
                        <div className="flex gap-[8px]">
                          <input type="number" value={newCal} onChange={e => setNewCal(e.target.value)}
                            placeholder="Calories (kcal)"
                            className="flex-1 rounded-[8px] border border-[#E5E7EB] px-[10px] py-[8px] text-[13px] focus:outline-none"
                            onKeyDown={e => e.key === 'Enter' && addItem()} />
                          <button onClick={addItem} disabled={!newName.trim() || !newCal}
                            className="px-[18px] rounded-[8px] text-[13px] font-bold text-white transition-all disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF]"
                            style={{ backgroundColor: newName.trim() && newCal ? meta.accent : undefined }}>
                            Add
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* + Add Item CTA */}
                <button
                  onClick={() => { setShowAddForm(s => !s); if (!showAddForm) setTimeout(() => nameRef.current?.focus(), 120); }}
                  className="w-full h-[44px] rounded-[10px] border-2 border-dashed flex items-center justify-center gap-[6px] text-[13px] font-semibold transition-all active:scale-[0.98]"
                  style={{ borderColor: meta.accent + '66', color: meta.accent }}>
                  <Plus size={15} />
                  {showAddForm ? 'Cancel' : '+ Add Item'}
                </button>
              </div>

              {/* Next CTA */}
              <div className="px-[20px] pb-[20px] pt-[12px] border-t border-[#F3F4F6] shrink-0">
                <button onClick={() => setPhase('summary')} disabled={items.length === 0}
                  className="w-full h-[52px] rounded-[14px] text-[15px] font-bold text-white flex items-center justify-center gap-[6px] transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{ backgroundColor: meta.accent, boxShadow: `0 8px 20px ${meta.accent}44` }}>
                  Review & Confirm <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              PHASE 3 — Macro Summary View
          ══════════════════════════════════════════════════════════════════════ */}
          {phase === 'summary' && meta && (
            <motion.div key="summary"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.22 }}
              className="flex-1 overflow-y-auto px-[20px] py-[16px] flex flex-col gap-[12px]">

              {/* Calorie hero */}
              <div className="rounded-[16px] p-[16px] flex flex-col items-center relative overflow-hidden"
                style={{ backgroundColor: meta.bg }}>
                <span className="text-[10px] font-bold tracking-[0.06em] uppercase mb-[4px]"
                  style={{ color: meta.accent + 'AA' }}>Total Calories</span>
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, delay: 0.06 }}
                  className="text-[52px] font-bold leading-none" style={{ color: meta.accent }}>
                  {totalCal}
                </motion.span>
                <span className="text-[13px] font-medium mt-[2px]" style={{ color: meta.accent + '99' }}>
                  kcal · {meta.emoji} {meta.label}
                </span>
              </div>

              {/* Macro donut charts */}
              <div className="bg-white rounded-[16px] border border-[#E5E7EB] py-[16px] flex justify-around items-center">
                <DonutChart pct={protPct} color="#1D9E75" label="Protein" value={`${totalProt}g`} />
                <DonutChart pct={carbPct} color="#F59E0B" label="Carbs"   value={`${totalCarb}g`} />
                <DonutChart pct={fatPct}  color="#EF4444" label="Fat"     value={`${totalFat}g`} />
              </div>

              {/* Item summary list */}
              <div className="bg-[#F9FAFB] rounded-[14px] border border-[#E5E7EB] px-[14px] py-[10px]">
                <p className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.07em] uppercase mb-[8px]">{items.length} Items</p>
                {items.map((item, idx) => (
                  <div key={item.id}
                    className={`flex items-center justify-between py-[8px] ${idx < items.length - 1 ? 'border-b border-[#EBEBEB]' : ''}`}>
                    <span className="text-[13px] text-[#374151] flex-1 truncate">{item.name}</span>
                    <span className="text-[12px] font-semibold ml-[8px] shrink-0" style={{ color: meta.accent }}>
                      {item.calories} kcal
                    </span>
                  </div>
                ))}
              </div>

              {/* Time picker */}
              <div className="bg-white rounded-[14px] border border-[#E5E7EB] px-[14px] py-[12px] flex items-center gap-[10px]">
                <div className="w-[36px] h-[36px] rounded-[8px] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: meta.bg }}>
                  <Clock size={18} style={{ color: meta.accent }} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.06em]">Log Time</p>
                  <p className="text-[11px] text-[#9CA3AF]">Tap to adjust</p>
                </div>
                <input type="time" value={loggedAt} onChange={e => setLoggedAt(e.target.value)}
                  className="text-[15px] font-semibold text-[#111827] border-none outline-none bg-transparent cursor-pointer" />
              </div>

              {/* Confirm CTA */}
              <div className="mt-auto pt-[4px]">
                <button onClick={handleConfirm}
                  className="w-full h-[52px] rounded-[14px] text-[15px] font-bold text-white transition-all active:scale-[0.98]"
                  style={{ backgroundColor: meta.accent, boxShadow: `0 8px 20px ${meta.accent}44` }}>
                  Confirm &amp; Save 🍽️
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

    </MobileShell>
  );
}
