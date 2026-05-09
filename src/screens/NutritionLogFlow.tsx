import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, Plus, Camera, Trash2, CheckCircle2, Upload, RefreshCw,
} from 'lucide-react';
import type { FoodItem, MealLog, NutritionMealEntry } from '../types';
import { Badge } from "../components/Common";
import MobileShell from '../components/MobileShell';

// ─── Constants ────────────────────────────────────────────────────────────────

type MealKind = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_META: Record<MealKind, { label: string; emoji: string; accent: string; bg: string }> = {
  breakfast: { label: 'Breakfast', emoji: '🥞', accent: '#F59E0B', bg: '#FFF7ED' },
  lunch: { label: 'Lunch', emoji: '🥗', accent: '#10B981', bg: '#ECFDF5' },
  dinner: { label: 'Dinner', emoji: '🍲', accent: '#3B82F6', bg: '#EFF6FF' },
  snack: { label: 'Snack', emoji: '🍎', accent: '#A855F7', bg: '#FDF4FF' },
};


/** Detected ingredient shape returned by mock AI extractor */
interface DetectedIngredient {
  ingredient_name: string;
  weight_g: number;
  calories: number;
  macros_json: { protein_g: number; carbs_g: number; fat_g: number };
}

/** Map DetectedIngredient → FoodItem */
function toFoodItem(d: DetectedIngredient, idx: number): FoodItem {
  return {
    id: `det-${idx}-${Date.now()}`,
    name: d.ingredient_name,
    quantity: d.weight_g,
    unit: 'g',
    calories: d.calories,
    protein: d.macros_json.protein_g,
    carbs: d.macros_json.carbs_g,
    fat: d.macros_json.fat_g,
    confidence: 'High',
  };
}

/** Mock AI extraction — returns DetectedIngredient[] after a delay */
async function mockExtractIngredients(blob: Blob): Promise<DetectedIngredient[]> {
  void blob;
  return [
    { ingredient_name: 'Grilled Chicken', weight_g: 200, calories: 330, macros_json: { protein_g: 58, carbs_g: 0, fat_g: 9 } },
    { ingredient_name: 'Fresh Avocado', weight_g: 75, calories: 120, macros_json: { protein_g: 2, carbs_g: 6, fat_g: 12 } },
    { ingredient_name: 'Boiled Rice', weight_g: 150, calories: 165, macros_json: { protein_g: 4, carbs_g: 35, fat_g: 1 } },
  ];
}

// ─── SVG Donut Chart ──────────────────────────────────────────────────────────

function DonutChart({ value, total, color, label, unit }: {
  value: number; total: number; color: string; label: string; unit: string;
}) {
  const size = 80; const sw = 10; const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r; const cx = size / 2;
  const pct = total > 0 ? Math.min(value / total, 1) : 0;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#F3F4F6" strokeWidth={sw} />
        <motion.circle
          cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cx})`}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - pct) }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ strokeDasharray: circ }}
        />
        <text x={cx} y={cx} textAnchor="middle" dominantBaseline="middle"
          fontSize="13" fontWeight="800" fill="#111827">{value}{unit}</text>
      </svg>
      <span className="text-[11px] font-semibold text-[#6B7280]">{label}</span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface NutritionLogFlowProps {
  onBack: () => void;
  onComplete?: (payload: { meals: NutritionMealEntry[]; totalCalories: number }) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NutritionLogFlow({ onBack, onComplete }: NutritionLogFlowProps) {
  const [subScreen, setSubScreen] = useState<1 | 2 | 3>(1);
  const [mealKind, setMealKind] = useState<MealKind | null>(null);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [saved, setSaved] = useState(false);

  // ── Camera states ──
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryObjectUrlRef = useRef<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  // 'live' → showing camera | 'frozen' → confirm/retake | 'processing' → AI spinner
  type CapturePhase = 'live' | 'frozen' | 'processing';
  const [capturePhase, setCapturePhase] = useState<CapturePhase>('live');
  const [frozenDataUrl, setFrozenDataUrl] = useState<string | null>(null);

  // ── Start camera ──
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera unavailable';
      setCameraError(msg);
      console.warn('[NutritionLogFlow] getUserMedia error:', msg);
    }
  }, []);

  // ── Stop camera ──
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  const revokeGalleryObjectUrl = useCallback(() => {
    if (galleryObjectUrlRef.current) {
      URL.revokeObjectURL(galleryObjectUrlRef.current);
      galleryObjectUrlRef.current = null;
    }
  }, []);

  // ── Mount / unmount camera with subScreen 1 ──
  useEffect(() => {
    if (subScreen === 1 && capturePhase === 'live') {
      // Camera startup is an external browser API sync; state updates happen inside the async helper.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startCamera();
    } else {
      stopCamera();
    }
    return () => { stopCamera(); };
  }, [subScreen, capturePhase, startCamera, stopCamera, revokeGalleryObjectUrl]);

  useEffect(() => {
    return () => { revokeGalleryObjectUrl(); };
  }, [revokeGalleryObjectUrl]);

  // ── Shutter: freeze frame ──
  const handleShutter = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height);
    revokeGalleryObjectUrl();
    setFrozenDataUrl(c.toDataURL('image/jpeg', 0.85));
    stopCamera();
    setCapturePhase('frozen');
  };

  // ── Retake ──
  const handleRetake = () => {
    revokeGalleryObjectUrl();
    setFrozenDataUrl(null);
    setCapturePhase('live');
    startCamera();
  };

  // ── Confirm → process ──
  const handleConfirmCapture = async () => {
    setCapturePhase('processing');
    const blob = await (async () => {
      if (canvasRef.current) {
        return new Promise<Blob>((resolve, reject) => {
          canvasRef.current!.toBlob(
            b => b ? resolve(b) : reject(new Error('Unable to capture meal image')),
            'image/jpeg',
            0.85
          );
        });
      }
      return new Blob();
    })();
    const [results] = await Promise.all([
      mockExtractIngredients(blob),
      new Promise(r => setTimeout(r, 2000)), // ≥2 s processing guarantee
    ]);
    setItems((results as DetectedIngredient[]).map(toFoodItem));
    setCapturePhase('live'); // reset for next time
    setSubScreen(2);
  };

  // ── Gallery fallback (file input) ──
  const handleGallery = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      revokeGalleryObjectUrl();
      const url = URL.createObjectURL(file);
      galleryObjectUrlRef.current = url;
      setFrozenDataUrl(url);
      stopCamera();
      setCapturePhase('frozen');
    };
    input.click();
  };

  // ── Derived macros ──
  const totals = items.reduce(
    (a, i) => ({ cal: a.cal + i.calories, pro: a.pro + i.protein, carb: a.carb + i.carbs, fat: a.fat + i.fat }),
    { cal: 0, pro: 0, carb: 0, fat: 0 }
  );

  const handleDeleteItem = (id: string) =>
    setItems(prev => prev.filter(i => i.id !== id));

  const handleEditField = (id: string, field: keyof FoodItem, val: string | number) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: val } : i));

  const handleAddItem = () => {
    const newItem: FoodItem = {
      id: `new-${Date.now()}`, name: 'New Item',
      quantity: 100, unit: 'g', calories: 0, protein: 0, carbs: 0, fat: 0, confidence: 'Medium',
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleConfirmSave = () => {
    if (!mealKind) return;
    const payload: MealLog = {
      meal_type: mealKind,
      description: items.map(i => i.name).join(', '),
      total_calories: totals.cal,
      macros_json: { protein_g: totals.pro, carbs_g: totals.carb, fat_g: totals.fat },
      logged_at: new Date().toISOString(),
    };
    console.log('[meal_logs] Saving payload:', payload);
    setSaved(true);
    const entry: NutritionMealEntry = { type: mealKind, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }), items };
    setTimeout(() => { onComplete?.({ meals: [entry], totalCalories: totals.cal }); }, 1200);
  };

  const meta = mealKind ? MEAL_META[mealKind] : null;

  // ════════════════════════════════════════════════════════════════════════════
  // SUB-SCREEN 1 — Capture
  // ════════════════════════════════════════════════════════════════════════════
  const renderCapture = () => (
    <div className="flex flex-col h-full bg-[#F9FAFB]">
      {/* Header */}
      <header className="h-[52px] flex items-center px-4 bg-white border-b border-[#F3F4F6] shrink-0">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-[#F3F4F6]">
          <ChevronLeft size={22} color="#111827" />
        </button>
        <h1 className="flex-1 text-center text-[16px] font-bold text-[#111827] -ml-9">Log a Meal</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
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

        {/* Camera viewfinder */}
        <div className="rounded-2xl overflow-hidden bg-[#0d0d0d] relative" style={{ height: 240 }}>
          {/* Hidden canvas for frame capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Live video feed */}
          {capturePhase === 'live' && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!cameraReady && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/30">
                  <Camera size={44} strokeWidth={1} />
                  <p className="text-[12px] font-medium tracking-wide">Starting camera…</p>
                </div>
              )}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
                  <Camera size={32} strokeWidth={1} className="text-white/30" />
                  <p className="text-white/60 text-[11px] text-center">{cameraError}</p>
                  <button onClick={startCamera} className="text-[#10B981] text-[12px] font-bold underline">Retry</button>
                </div>
              )}
              {cameraReady && (
                <>
                  {[['top-3 left-3 border-t-2 border-l-2'], ['top-3 right-3 border-t-2 border-r-2'],
                    ['bottom-3 left-3 border-b-2 border-l-2'], ['bottom-3 right-3 border-b-2 border-r-2']
                  ].map(([pos], i) => (
                    <div key={i} className={`absolute w-7 h-7 border-white/70 rounded-sm ${pos}`} />
                  ))}
                </>
              )}
            </>
          )}

          {/* Frozen frame — confirm / retake */}
          {capturePhase === 'frozen' && frozenDataUrl && (
            <>
              <img src={frozenDataUrl} className="w-full h-full object-cover" alt="captured meal" />
              <div className="absolute inset-0 bg-black/40 flex items-end justify-center pb-4 gap-3">
                <button
                  onClick={handleRetake}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white/20 backdrop-blur text-white text-[13px] font-semibold border border-white/30"
                >
                  <RefreshCw size={14} /> Retake
                </button>
                <button
                  onClick={handleConfirmCapture}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-white text-[13px] font-bold"
                  style={{ backgroundColor: meta?.accent ?? '#10B981' }}
                >
                  <CheckCircle2 size={14} /> Confirm
                </button>
              </div>
            </>
          )}

          {/* Processing overlay */}
          {capturePhase === 'processing' && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
                <div className="w-12 h-12 rounded-full border-[3px] border-[#10B981] border-t-transparent" />
              </motion.div>
              <p className="text-white text-[14px] font-semibold tracking-wide">Processing Image…</p>
              <p className="text-white/50 text-[11px]">AI is analysing your meal</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-3 pb-4">
          {capturePhase === 'live' && (
            <>
              <button
                onClick={handleShutter}
                disabled={!mealKind || !cameraReady}
                className="w-full h-[52px] rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
                style={{ backgroundColor: meta?.accent ?? '#10B981', boxShadow: `0 8px 20px ${meta?.accent ?? '#10B981'}44` }}
              >
                <Camera size={18} />
                Take Photo
              </button>
              <button
                onClick={handleGallery}
                disabled={!mealKind}
                className="w-full h-[48px] rounded-xl border-2 border-dashed border-[#E5E7EB] text-[#6B7280] font-semibold text-[14px] flex items-center justify-center gap-2 active:bg-[#F3F4F6] transition-colors disabled:opacity-40"
              >
                <Upload size={16} />
                Upload from Gallery
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // SUB-SCREEN 2 — Review & Edit
  // ════════════════════════════════════════════════════════════════════════════
  const renderReviewEdit = () => (
    <div className="flex flex-col h-full bg-[#F9FAFB]">
      {/* Header */}
      <header className="h-[52px] flex items-center px-4 bg-white border-b border-[#F3F4F6] shrink-0">
        <button onClick={() => setSubScreen(1)} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-[#F3F4F6]">
          <ChevronLeft size={22} color="#111827" />
        </button>
        <div className="flex-1 text-center -ml-9">
          <h1 className="text-[16px] font-bold text-[#111827]">{meta?.label ?? 'Meal'} · AI Detected</h1>
          <p className="text-[11px] text-[#6B7280]">{items.length} item{items.length !== 1 ? 's' : ''} found</p>
        </div>
      </header>

      {/* Totals banner */}
      <div className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{ backgroundColor: meta?.bg ?? '#ECFDF5' }}>
        {[
          { l: 'Calories', v: totals.cal, u: 'kcal' },
          { l: 'Protein', v: totals.pro, u: 'g' },
          { l: 'Carbs', v: totals.carb, u: 'g' },
          { l: 'Fat', v: totals.fat, u: 'g' },
        ].map(m => (
          <div key={m.l} className="flex flex-col items-center">
            <span className="text-[15px] font-black" style={{ color: meta?.accent ?? '#10B981' }}>{m.v}{m.u}</span>
            <span className="text-[9px] font-bold text-[#9CA3AF] uppercase">{m.l}</span>
          </div>
        ))}
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.id} layout
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.18 }}
              className="bg-white rounded-2xl p-4 border border-[#E5E7EB] shadow-sm"
            >
              {/* Row 1: name + badge + delete */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    type="text" value={item.name}
                    onChange={e => handleEditField(item.id, 'name', e.target.value)}
                    className="text-[14px] font-bold text-[#111827] bg-transparent outline-none border-b border-transparent focus:border-[#10B981] transition-all min-w-0 flex-1"
                  />
                  <Badge text={item.confidence ?? 'High'} color={item.confidence === 'High' ? 'green' : 'amber'} size="xs" />
                </div>
                <button onClick={() => handleDeleteItem(item.id)} className="ml-2 p-1 text-red-400 hover:text-red-600 active:scale-90 transition-all shrink-0">
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Row 2: qty + unit + calories */}
              <div className="flex items-center gap-2">
                <input
                  type="number" value={item.quantity}
                  onChange={e => handleEditField(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                  className="w-14 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-2 py-1 text-[12px] font-bold text-center outline-none focus:ring-1 focus:ring-[#10B981]"
                />
                <div className="flex bg-[#F3F4F6] rounded-lg p-0.5 gap-0.5">
                  {(['g', 'ml', 'pcs'] as const).map(u => (
                    <button key={u} onClick={() => handleEditField(item.id, 'unit', u)}
                      className={`px-2 py-1 text-[9px] font-black rounded transition-all ${item.unit === u ? 'bg-white text-[#111827] shadow-sm' : 'text-[#9CA3AF]'}`}>
                      {u.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="flex-1" />
                <div className="flex items-center bg-[#F3F4F6] rounded-lg px-2 py-1 focus-within:ring-1 focus-within:ring-[#10B981]">
                  <input
                    type="number" value={item.calories}
                    onChange={e => handleEditField(item.id, 'calories', parseInt(e.target.value) || 0)}
                    className="w-12 text-[13px] font-black text-[#111827] bg-transparent outline-none text-right"
                  />
                  <span className="text-[10px] text-[#9CA3AF] ml-1 font-semibold">kcal</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add Item button */}
        <button onClick={handleAddItem}
          className="w-full py-4 rounded-xl border-2 border-dashed border-[#E5E7EB] text-[#6B7280] text-[13px] font-semibold flex items-center justify-center gap-2 active:bg-[#F3F4F6] transition-colors">
          <Plus size={16} />
          + Add Item
        </button>
      </div>

      {/* CTA */}
      <div className="px-4 pb-5 pt-3 shrink-0 border-t border-[#F3F4F6] bg-white">
        <button onClick={() => setSubScreen(3)} disabled={items.length === 0}
          className="w-full h-[52px] rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40 transition-all"
          style={{ backgroundColor: meta?.accent ?? '#10B981', boxShadow: `0 8px 20px ${meta?.accent ?? '#10B981'}44` }}>
          Review Summary →
        </button>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // SUB-SCREEN 3 — Summary
  // ════════════════════════════════════════════════════════════════════════════
  const renderSummary = () => {
    const macroKcal = totals.pro * 4 + totals.carb * 4 + totals.fat * 9 || 1;
    return (
      <div className="flex flex-col h-full bg-[#F9FAFB]">
        {/* Header */}
        <header className="h-[52px] flex items-center px-4 bg-white border-b border-[#F3F4F6] shrink-0">
          <button onClick={() => setSubScreen(2)} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-[#F3F4F6]">
            <ChevronLeft size={22} color="#111827" />
          </button>
          <h1 className="flex-1 text-center text-[16px] font-bold text-[#111827] -ml-9">Nutrition Summary</h1>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {/* Calorie hero */}
          <div className="rounded-2xl p-5 flex flex-col items-center" style={{ backgroundColor: meta?.bg ?? '#ECFDF5' }}>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: (meta?.accent ?? '#10B981') + 'AA' }}>
              Total Calories
            </p>
            <motion.span
              initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, delay: 0.05 }}
              className="text-[52px] font-black leading-none"
              style={{ color: meta?.accent ?? '#10B981' }}
            >
              {totals.cal}
            </motion.span>
            <span className="text-[13px] font-medium mt-1" style={{ color: (meta?.accent ?? '#10B981') + '99' }}>
              kcal · {meta?.emoji} {meta?.label}
            </span>
          </div>

          {/* Circular macro chart */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] py-5 px-4">
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-5 text-center">Macro Breakdown</p>
            <div className="flex justify-around items-center">
              <DonutChart value={totals.pro} total={macroKcal / 4} color="#10B981" label="Protein" unit="g" />
              <DonutChart value={totals.carb} total={macroKcal / 4} color="#F59E0B" label="Carbs" unit="g" />
              <DonutChart value={totals.fat} total={macroKcal / 9} color="#EF4444" label="Fat" unit="g" />
            </div>
          </div>

          {/* Item summary list */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] px-4 py-3">
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-3">{items.length} Items</p>
            {items.map((item, i) => (
              <div key={item.id} className={`flex items-center justify-between py-3 ${i < items.length - 1 ? 'border-b border-[#F3F4F6]' : ''}`}>
                <div>
                  <p className="text-[13px] font-semibold text-[#111827]">{item.name}</p>
                  <p className="text-[11px] text-[#9CA3AF]">{item.quantity}{item.unit} · P:{item.protein}g C:{item.carbs}g F:{item.fat}g</p>
                </div>
                <span className="text-[13px] font-bold ml-3 shrink-0" style={{ color: meta?.accent ?? '#10B981' }}>{item.calories} kcal</span>
              </div>
            ))}
          </div>
        </div>

        {/* Confirm & Save */}
        <div className="px-4 pb-5 pt-3 shrink-0 border-t border-[#F3F4F6] bg-white">
          <AnimatePresence mode="wait">
            {saved ? (
              <motion.div key="saved" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="w-full h-[52px] rounded-xl bg-[#10B981] flex items-center justify-center gap-2">
                <CheckCircle2 size={20} color="white" />
                <span className="text-white font-bold text-[15px]">Saved to Diary!</span>
              </motion.div>
            ) : (
              <motion.button key="cta" onClick={handleConfirmSave}
                className="w-full h-[52px] rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                style={{ backgroundColor: meta?.accent ?? '#10B981', boxShadow: `0 8px 20px ${meta?.accent ?? '#10B981'}44` }}>
                <CheckCircle2 size={18} />
                Confirm & Save
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  // ─── Return ───────────────────────────────────────────────────────────────
  return (
    <MobileShell>
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <AnimatePresence mode="wait">
            {subScreen === 1 && (
              <motion.div key="s1" className="absolute inset-0"
                initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}>
                {renderCapture()}
              </motion.div>
            )}
            {subScreen === 2 && (
              <motion.div key="s2" className="absolute inset-0"
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}>
                {renderReviewEdit()}
              </motion.div>
            )}
            {subScreen === 3 && (
              <motion.div key="s3" className="absolute inset-0"
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
                transition={{ type: 'spring', damping: 24, stiffness: 200 }}>
                {renderSummary()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
    </MobileShell>
  );
}
