import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, Plus, Camera, Trash2, CheckCircle2, Upload, RefreshCw, ImageIcon, AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { FoodItem, MealLog, NutritionMealEntry } from '../../../types';
import MobileShell from '../../../components/MobileShell';
import { useWellness } from '../../../context/WellnessContext';
import { IS_DEV_OTP } from '../../../utils/otpUtils';
import {
  insertMealLog,
  analyseMealImage,
  getMockMealAnalysis,
  type MealAnalysisResult,
} from '../../../services/supabaseService';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAL = '#00897B';      // primary
const ERROR = '#ef4444';     // error
const AMBER = '#f59e0b';     // warning
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

type MealKind = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type Step = 'capture' | 'analysing' | 'review' | 'done';

const MEAL_META: Record<MealKind, { label: string; emoji: string; accent: string; bg: string }> = {
  breakfast: { label: 'Breakfast', emoji: '🥞', accent: '#F59E0B', bg: '#FFF7ED' },
  lunch: { label: 'Lunch', emoji: '🥗', accent: '#10B981', bg: '#ECFDF5' },
  dinner: { label: 'Dinner', emoji: '🍲', accent: '#3B82F6', bg: '#EFF6FF' },
  snack: { label: 'Snack', emoji: '🍎', accent: '#A855F7', bg: '#FDF4FF' },
};

const CONFIDENCE_META: Record<'high' | 'medium' | 'low', { label: string; color: string; bg: string }> = {
  high: { label: 'High confidence', color: '#10B981', bg: '#ECFDF5' },
  medium: { label: 'Estimated', color: AMBER, bg: '#FFFBEB' },
  low: { label: 'Low confidence — please verify', color: ERROR, bg: '#FEF2F2' },
};

/** Pick a sensible default meal type based on the current time of day. */
function defaultMealKind(): MealKind {
  const h = new Date().getHours();
  if (h >= 5 && h <= 10) return 'breakfast';
  if (h >= 11 && h <= 14) return 'lunch';
  if (h >= 15 && h <= 17) return 'snack';
  if (h >= 18 && h <= 22) return 'dinner';
  return 'snack';
}

/** Read a File as a base64 string, stripping the `data:...;base64,` prefix. */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.readAsDataURL(file);
  });
}

/** Map an AI-detected food into the editable FoodItem shape used by the review UI. */
function toFoodItem(
  f: MealAnalysisResult['foods'][number],
  idx: number,
  confidence: MealAnalysisResult['confidence'],
): FoodItem {
  return {
    id: `ai-${idx}-${Date.now()}`,
    name: f.name,
    portion: f.portion,
    quantity: 1,
    unit: 'serving',
    calories: Math.round(f.calories) || 0,
    protein: Math.round(f.protein_g) || 0,
    carbs: Math.round(f.carbs_g) || 0,
    fat: Math.round(f.fat_g) || 0,
    confidence: confidence === 'high' ? 'High' : confidence === 'medium' ? 'Medium' : 'Low',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NutritionLogFlow() {
  const navigate = useNavigate();
  const { userId, handleNutritionLogComplete } = useWellness();

  const [step, setStep] = useState<Step>('capture');
  const [mealKind, setMealKind] = useState<MealKind>(defaultMealKind());

  // Image + analysis state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<MealAnalysisResult['confidence']>('high');
  const [mealName, setMealName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<FoodItem[]>([]);

  // Status state
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSummary, setSavedSummary] = useState<{ name: string; calories: number } | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const meta = MEAL_META[mealKind];

  // ── Derived totals (auto-calculated from food items) ──
  const totals = items.reduce(
    (a, i) => ({ cal: a.cal + i.calories, pro: a.pro + i.protein, carb: a.carb + i.carbs, fat: a.fat + i.fat }),
    { cal: 0, pro: 0, carb: 0, fat: 0 }
  );

  const revokePreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  // ── Handle a selected image file → analyse ──
  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);

    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image too large. Please use a smaller photo.');
      return;
    }

    revokePreview();
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setPreviewUrl(url);
    setStep('analysing');

    try {
      let result: MealAnalysisResult | null;
      if (IS_DEV_OTP) {
        // Dev bypass — mock data so the flow works without Anthropic API credits.
        // 2s delay keeps the "Analysing…" screen visible for UX testing.
        await new Promise(resolve => setTimeout(resolve, 2000));
        result = getMockMealAnalysis(mealKind);
      } else {
        const base64 = await fileToBase64(file);
        result = await analyseMealImage(base64, file.type || 'image/jpeg');
      }

      if (!result) {
        setError("Couldn't analyse this image. Please try a clearer photo.");
        setStep('capture');
        return;
      }

      setMealName(result.meal_name || `${meta.label}`);
      setConfidence(result.confidence ?? 'medium');
      setNotes(result.notes ?? '');
      setItems(result.foods.map((f, i) => toFoodItem(f, i, result.confidence ?? 'medium')));
      setStep('review');
    } catch (err) {
      console.error('[NutritionLogFlow] analysis error:', err);
      setError("Couldn't analyse this image. Please try a clearer photo.");
      setStep('capture');
    }
  };

  // ── Item editing ──
  const handleEditField = (id: string, field: keyof FoodItem, val: string | number) =>
    setItems(prev => prev.map(i => (i.id === id ? { ...i, [field]: val } : i)));

  const handleDeleteItem = (id: string) =>
    setItems(prev => prev.filter(i => i.id !== id));

  const handleAddItem = () =>
    setItems(prev => [...prev, {
      id: `manual-${Date.now()}`,
      name: '',
      portion: '',
      quantity: 1,
      unit: 'serving',
      calories: 0, protein: 0, carbs: 0, fat: 0,
      confidence: 'Medium',
    }]);

  // ── Save to meal_logs ──
  const handleLogMeal = async () => {
    if (isSaving || items.length === 0) return;
    setError(null);
    setIsSaving(true);

    const payload: MealLog = {
      meal_type: mealKind,
      description: items.map(i => i.name).filter(Boolean).join(', '),
      total_calories: totals.cal,
      macros_json: { protein_g: totals.pro, carbs_g: totals.carb, fat_g: totals.fat },
      logged_at: new Date().toISOString(),
      meal_name: mealName.trim() || undefined,
      notes: notes.trim() || undefined,
      foods: items.map(i => ({
        name: i.name,
        portion: i.portion ?? '',
        calories: i.calories,
        protein_g: i.protein,
        carbs_g: i.carbs,
        fat_g: i.fat,
      })),
    };

    if (userId) {
      const ok = await insertMealLog(userId, payload);
      if (!ok) {
        setError('Failed to save meal. Please try again.');
        setIsSaving(false);
        return;
      }
    }

    // Keep the dashboard nutrition aggregate in sync (local state only).
    const entry: NutritionMealEntry = {
      type: mealKind,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      items,
    };
    handleNutritionLogComplete({ meals: [entry], totalCalories: totals.cal });

    setSavedSummary({ name: payload.meal_name || meta.label, calories: totals.cal });
    setIsSaving(false);
    setStep('done');
  };

  // ── Reset for another meal ──
  const handleLogAnother = () => {
    revokePreview();
    setPreviewUrl(null);
    setItems([]);
    setMealName('');
    setNotes('');
    setConfidence('high');
    setError(null);
    setSavedSummary(null);
    setMealKind(defaultMealKind());
    setStep('capture');
  };

  const handleRetake = () => {
    revokePreview();
    setPreviewUrl(null);
    setItems([]);
    setMealName('');
    setNotes('');
    setError(null);
    setStep('capture');
  };

  const handleBack = () => {
    if (step === 'review') {
      handleRetake();
    } else {
      navigate('/client/dashboard');
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // STEP — Capture
  // ════════════════════════════════════════════════════════════════════════════
  const renderCapture = () => (
    <div className="flex flex-col h-full bg-[#F9FAFB]">
      <header className="h-[52px] flex items-center px-4 bg-white border-b border-[#F3F4F6] shrink-0">
        <button onClick={handleBack} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-[#F3F4F6] relative z-10">
          <ChevronLeft size={22} color="#111827" />
        </button>
        <h1 className="flex-1 text-center text-[16px] font-bold text-[#111827] -ml-9">Log a Meal</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {/* Meal type picker */}
        <div>
          <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-3">Which meal?</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(MEAL_META) as [MealKind, typeof MEAL_META['lunch']][]).map(([kind, m]) => (
              <button
                key={kind}
                onClick={() => setMealKind(kind)}
                className="relative rounded-[14px] p-4 text-left border-2 transition-all active:scale-[0.97]"
                style={{
                  backgroundColor: mealKind === kind ? m.bg : '#fff',
                  borderColor: mealKind === kind ? m.accent : '#E5E7EB',
                }}
              >
                {mealKind === kind && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 size={14} style={{ color: m.accent }} />
                  </div>
                )}
                <span className="text-[26px] block mb-1">{m.emoji}</span>
                <span className="text-[14px] font-bold block" style={{ color: mealKind === kind ? m.accent : '#374151' }}>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Snap-the-meal illustration */}
        <div className="rounded-2xl border-2 border-dashed border-[#E5E7EB] bg-white flex flex-col items-center justify-center gap-2 py-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: TEAL + '15' }}>
            <Camera size={30} style={{ color: TEAL }} />
          </div>
          <p className="text-[14px] font-bold text-[#111827]">Snap or upload your meal</p>
          <p className="text-[12px] text-[#9CA3AF] text-center px-8">Claude AI will identify the foods and estimate nutrition for you.</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: ERROR + '12' }}>
            <AlertTriangle size={16} style={{ color: ERROR }} className="mt-0.5 shrink-0" />
            <p className="text-[12px] font-medium" style={{ color: ERROR }}>{error}</p>
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => { void handleFile(e.target.files?.[0]); e.target.value = ''; }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { void handleFile(e.target.files?.[0]); e.target.value = ''; }}
        />

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="w-full h-[52px] rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ backgroundColor: TEAL, boxShadow: `0 8px 20px ${TEAL}44` }}
          >
            <Camera size={18} /> Take Photo
          </button>
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="w-full h-[48px] rounded-xl border-2 border-dashed border-[#E5E7EB] text-[#6B7280] font-semibold text-[14px] flex items-center justify-center gap-2 active:bg-[#F3F4F6] transition-colors"
          >
            <Upload size={16} /> Choose from Gallery
          </button>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // STEP — Analysing
  // ════════════════════════════════════════════════════════════════════════════
  const renderAnalysing = () => (
    <div className="flex flex-col h-full bg-[#0d0d0d]">
      <div className="flex-1 relative flex flex-col items-center justify-center">
        {previewUrl && (
          <img src={previewUrl} alt="meal" className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm" />
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative flex flex-col items-center gap-5">
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ backgroundColor: TEAL }}
          >
            <ImageIcon size={32} color="white" />
          </motion.div>
          <div className="text-center">
            <p className="text-white text-[16px] font-bold">Analysing your meal…</p>
            <p className="text-white/60 text-[12px] mt-1">
              {IS_DEV_OTP ? 'Demo mode — using sample meal data' : 'Claude AI is identifying foods and calculating nutrition'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // STEP — Review & Edit
  // ════════════════════════════════════════════════════════════════════════════
  const renderReview = () => {
    const conf = CONFIDENCE_META[confidence];
    return (
      <div className="flex flex-col h-full bg-[#F9FAFB]">
        <header className="h-[52px] flex items-center px-4 bg-white border-b border-[#F3F4F6] shrink-0">
          <button onClick={handleBack} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-[#F3F4F6] relative z-10">
            <ChevronLeft size={22} color="#111827" />
          </button>
          <h1 className="flex-1 text-center text-[16px] font-bold text-[#111827] -ml-9">Review Meal</h1>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Image preview */}
          {previewUrl && (
            <img src={previewUrl} alt="meal" className="w-full rounded-2xl object-cover" style={{ height: 120 }} />
          )}

          {/* Meal name + confidence */}
          <div className="space-y-2">
            <input
              type="text"
              value={mealName}
              onChange={e => setMealName(e.target.value)}
              placeholder="Meal name"
              className="w-full text-[18px] font-bold text-[#111827] bg-transparent outline-none border-b border-[#E5E7EB] focus:border-[#00897B] pb-1 transition-all"
            />
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={{ backgroundColor: conf.bg, color: conf.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: conf.color }} />
              {conf.label}
            </span>
          </div>

          {/* Food items */}
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.div
                  key={item.id} layout
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.18 }}
                  className="bg-white rounded-2xl p-4 border border-[#E5E7EB] shadow-sm"
                >
                  {/* Row 1: name + delete */}
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <input
                      type="text" value={item.name} placeholder="Food name"
                      onChange={e => handleEditField(item.id, 'name', e.target.value)}
                      className="text-[14px] font-bold text-[#111827] bg-transparent outline-none border-b border-transparent focus:border-[#00897B] transition-all min-w-0 flex-1"
                    />
                    <button onClick={() => handleDeleteItem(item.id)} className="p-1 active:scale-90 transition-all shrink-0" style={{ color: ERROR }}>
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Row 2: portion + calories */}
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text" value={item.portion ?? ''} placeholder="portion (e.g. 1 cup)"
                      onChange={e => handleEditField(item.id, 'portion', e.target.value)}
                      className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-[12px] text-[#374151] outline-none focus:ring-1 focus:ring-[#00897B]"
                    />
                    <div className="flex items-center bg-[#F3F4F6] rounded-lg px-2 py-1.5 focus-within:ring-1 focus-within:ring-[#00897B]">
                      <input
                        type="number" value={item.calories}
                        onChange={e => handleEditField(item.id, 'calories', parseInt(e.target.value) || 0)}
                        className="w-12 text-[13px] font-black text-[#111827] bg-transparent outline-none text-right"
                      />
                      <span className="text-[10px] text-[#9CA3AF] ml-1 font-semibold">kcal</span>
                    </div>
                  </div>

                  {/* Row 3: macros */}
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { field: 'protein' as const, label: 'Protein' },
                      { field: 'carbs' as const, label: 'Carbs' },
                      { field: 'fat' as const, label: 'Fat' },
                    ]).map(({ field, label }) => (
                      <div key={field} className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-2 py-1.5 focus-within:ring-1 focus-within:ring-[#00897B]">
                        <p className="text-[9px] font-bold text-[#9CA3AF] uppercase mb-0.5">{label}</p>
                        <div className="flex items-baseline">
                          <input
                            type="number" value={item[field]}
                            onChange={e => handleEditField(item.id, field, parseInt(e.target.value) || 0)}
                            className="w-full text-[13px] font-bold text-[#111827] bg-transparent outline-none"
                          />
                          <span className="text-[10px] text-[#9CA3AF] font-semibold">g</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <button onClick={handleAddItem}
              className="w-full py-4 rounded-xl border-2 border-dashed border-[#E5E7EB] text-[#6B7280] text-[13px] font-semibold flex items-center justify-center gap-2 active:bg-[#F3F4F6] transition-colors">
              <Plus size={16} /> Add food manually
            </button>
          </div>

          {/* Totals (auto-calculated) */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">Total</p>
            <div className="flex items-end gap-1 mb-3">
              <span className="text-[36px] font-black leading-none" style={{ color: TEAL }}>{totals.cal}</span>
              <span className="text-[14px] font-bold text-[#9CA3AF] mb-1">kcal</span>
            </div>
            <div className="flex items-center justify-between">
              {[
                { l: 'Protein', v: totals.pro },
                { l: 'Carbs', v: totals.carb },
                { l: 'Fat', v: totals.fat },
              ].map(m => (
                <div key={m.l} className="flex flex-col items-center flex-1">
                  <span className="text-[15px] font-black text-[#111827]">{m.v}g</span>
                  <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">{m.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">Notes</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes about this meal…"
              rows={2}
              className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[13px] text-[#374151] outline-none focus:ring-1 focus:ring-[#00897B] resize-none"
            />
          </div>

          {error && (
            <p className="text-[12px] font-medium text-center" style={{ color: ERROR }}>{error}</p>
          )}
        </div>

        {/* CTAs */}
        <div className="px-4 pb-5 pt-3 shrink-0 border-t border-[#F3F4F6] bg-white space-y-2">
          <button onClick={handleLogMeal} disabled={isSaving || items.length === 0}
            className="w-full h-[52px] rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 transition-all"
            style={{ backgroundColor: TEAL, boxShadow: `0 8px 20px ${TEAL}44` }}>
            {isSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <CheckCircle2 size={18} /> Log Meal
              </>
            )}
          </button>
          <button onClick={handleRetake} disabled={isSaving}
            className="w-full h-[46px] rounded-xl border-2 border-[#E5E7EB] text-[#6B7280] font-semibold text-[14px] flex items-center justify-center gap-2 active:bg-[#F3F4F6] disabled:opacity-50 transition-colors">
            <RefreshCw size={15} /> Retake Photo
          </button>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════════════
  // STEP — Done
  // ════════════════════════════════════════════════════════════════════════════
  const renderDone = () => (
    <div className="flex flex-col h-full bg-[#F9FAFB] items-center justify-center px-6">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
        style={{ backgroundColor: TEAL }}
      >
        <CheckCircle2 size={40} color="white" />
      </motion.div>
      <h2 className="text-[22px] font-black text-[#111827] mb-1">Meal logged! ✓</h2>
      {savedSummary && (
        <p className="text-[14px] text-[#6B7280] text-center mb-8">
          <span className="font-bold text-[#111827]">{savedSummary.name}</span> · {savedSummary.calories} kcal
        </p>
      )}
      <div className="w-full space-y-2">
        <button onClick={handleLogAnother}
          className="w-full h-[52px] rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          style={{ backgroundColor: TEAL, boxShadow: `0 8px 20px ${TEAL}44` }}>
          <Plus size={18} /> Log another meal
        </button>
        <button onClick={() => navigate('/client/dashboard')}
          className="w-full h-[46px] rounded-xl border-2 border-[#E5E7EB] text-[#6B7280] font-semibold text-[14px] active:bg-[#F3F4F6] transition-colors">
          Done
        </button>
      </div>
    </div>
  );

  // ─── Return ───────────────────────────────────────────────────────────────
  return (
    <MobileShell>
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={step} className="absolute inset-0"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {step === 'capture' && renderCapture()}
            {step === 'analysing' && renderAnalysing()}
            {step === 'review' && renderReview()}
            {step === 'done' && renderDone()}
          </motion.div>
        </AnimatePresence>
      </div>
    </MobileShell>
  );
}
