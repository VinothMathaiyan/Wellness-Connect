import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Loader2, AlertTriangle, Check, Search, X, Star, Sparkles } from 'lucide-react';
import type { TrainingPreferences } from '../../../types';
import MobileShell from '../../../components/MobileShell';
import ProfileMenu from '@/components/ProfileMenu';
import AssessmentBottomNav from '../components/AssessmentBottomNav';
import { useWellness } from '../../../context/WellnessContext';
import { supabase } from '../../../lib/supabaseClient';
import {
  upsertClientProfile,
  notifyClientProfileUpdated,
  completeAssessment,
  getScoredTrainerRecommendations,
  getAssessmentRecommendations,
  saveAssessmentRecommendations,
} from '../../../services/supabaseService';

// ── Option constants ────────────────────────────────────────────────────────────

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

// Section B
const GOAL_OPTIONS = [
  'Weight Loss', 'Muscle Gain', 'General Fitness', 'Flexibility',
  'Rehabilitation', 'Mobility', 'Athletic Performance', 'Stress Reduction',
];
const GOAL_PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];
const TRAINING_STYLE_OPTIONS = [
  'Yoga', 'Strength Training', 'HIIT', 'Cardio', 'Pilates',
  'Functional Training', 'CrossFit', 'Rehab Training', 'Mobility Training',
];
const SESSION_INTENSITY_OPTIONS = ['Low', 'Medium', 'High'];
const COACHING_STYLE_OPTIONS = ['Motivational', 'Strict', 'Supportive', 'Educational'];

// Section C
const FITNESS_LEVEL_OPTIONS: { value: 'beginner' | 'intermediate' | 'advanced'; label: string }[] = [
  { value: 'beginner',     label: 'Beginner'     },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced'     },
];
const ACTIVITY_LEVEL_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'Sedentary' },
  { value: 2, label: 'Lightly Active' },
  { value: 3, label: 'Moderately Active' },
  { value: 4, label: 'Very Active' },
];
const WEEKLY_FREQUENCY_OPTIONS = ['1-2', '3-4', '5-6', 'Daily'];

// Section D
const MEDICAL_CONDITION_OPTIONS = [
  'Diabetes', 'Hypertension', 'Heart Condition', 'Asthma',
  'Arthritis', 'PCOS', 'Obesity', 'None',
];
const INJURY_OPTIONS = [
  'Knee Injury', 'Back Pain', 'Shoulder Injury', 'Neck Pain', 'Hip Injury', 'None',
];

// Section E
const SESSION_MODE_OPTIONS = ['Online', 'Offline', 'Hybrid'];
const PREFERRED_TIME_OPTIONS = ['Early Morning', 'Morning', 'Afternoon', 'Evening', 'Night'];
const PREFERRED_DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const EQUIPMENT_OPTIONS = ['Dumbbells', 'Resistance Bands', 'Treadmill', 'None'];

// Section F
const TRAINER_GENDER_OPTIONS = ['Male', 'Female', 'No Preference'];
const TRAINER_LANGUAGE_OPTIONS = ['English', 'Tamil', 'Hindi', 'Malayalam', 'Telugu', 'Kannada'];
const TRAINER_EXPERIENCE_OPTIONS = ['Junior', 'Mid-Level', 'Senior', 'Any'];

// Section G
const SLEEP_QUALITY_OPTIONS = ['Poor', 'Average', 'Good'];
const STRESS_LEVEL_OPTIONS = ['Low', 'Moderate', 'High'];
const MOTIVATION_OPTIONS = ['Low', 'Medium', 'High'];

const CLEARANCE_OPTIONS: {
  value: 'cleared' | 'conditional' | 'hold';
  icon: string;
  label: string;
  description: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
}[] = [
  {
    value: 'cleared',
    icon: '✅',
    label: 'Clear for Training',
    description: 'Client is ready to begin training',
    activeBg: '#f0fdf4',
    activeBorder: '#86efac',
    activeText: '#16a34a',
  },
  {
    value: 'conditional',
    icon: '⚠️',
    label: 'Conditional Clearance',
    description: 'Training with restrictions',
    activeBg: '#fffbeb',
    activeBorder: '#fcd34d',
    activeText: '#d97706',
  },
  {
    value: 'hold',
    icon: '🚫',
    label: 'Put on Hold',
    description: 'Not cleared — requires further review',
    activeBg: '#fef2f2',
    activeBorder: '#fca5a5',
    activeText: '#dc2626',
  },
];

// ── Local types ───────────────────────────────────────────────────────────────

interface ProfileRow {
  id: string;
  full_name: string;
  phone_number: string | null;
  city: string | null;
}

interface ClientForm {
  // A
  dob: string;
  gender: string;
  height_cm: string;
  weight_kg: string;
  // B
  goals: string[];
  secondary_goals: string[];
  goal_priority: string;
  training_styles: string[];
  session_intensity_pref: string;
  coaching_style_pref: string;
  // C
  fitness_level: string;
  activity_level: number | null;
  weekly_frequency: string;
  // D
  medical_conditions: string[];
  injuries: string[];
  rehab_required: boolean;
  medical_certified_required: boolean;
  doctor_clearance: boolean;
  // E
  session_mode: string;
  preferred_times: string[];
  preferred_days: string[];
  equipment_available: string[];
  // F
  trainer_gender_pref: string;
  trainer_languages: string[];
  trainer_experience_pref: string;
  // G
  sleep_quality: string;
  stress_level: string;
  motivation_level: string;
  // H
  assessment_notes: string;
}

interface AssessmentForm {
  health_notes: string;
  fitness_level: 'beginner' | 'intermediate' | 'advanced' | null;
  trainer_recommendation: string;
}

interface ExistingAssessment {
  id: string;
  fitness_level: 'beginner' | 'intermediate' | 'advanced' | null;
  health_notes: string | null;
  trainer_recommendation: string | null;
  clearance_status: 'cleared' | 'conditional' | 'hold' | null;
}

interface TrainerPoolItem {
  id: string;
  full_name: string;
  rating: number | null;
  specialties: string[] | null;
  bio: string | null;
}

interface SuggestedTrainer {
  id: string;
  full_name: string;
  reason: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calculateAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Underweight', color: '#2563eb' };
  if (bmi < 25)   return { label: 'Normal',      color: '#16a34a' };
  if (bmi < 30)   return { label: 'Overweight',  color: '#d97706' };
  return { label: 'Obese', color: '#dc2626' };
}

// Normalise the lowercase DB defaults back to their UI label.
function normalisePref(raw: string | null | undefined): string {
  if (!raw) return '';
  const map: Record<string, string> = {
    no_preference: 'No Preference',
    any: 'Any',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  };
  return map[raw] ?? raw;
}

const EMPTY_FORM: ClientForm = {
  dob: '', gender: '', height_cm: '', weight_kg: '',
  goals: [], secondary_goals: [], goal_priority: '',
  training_styles: [], session_intensity_pref: '', coaching_style_pref: '',
  fitness_level: '', activity_level: null, weekly_frequency: '',
  medical_conditions: [], injuries: [],
  rehab_required: false, medical_certified_required: false, doctor_clearance: false,
  session_mode: '', preferred_times: [], preferred_days: [], equipment_available: [],
  trainer_gender_pref: '', trainer_languages: [], trainer_experience_pref: '',
  sleep_quality: '', stress_level: '', motivation_level: '',
  assessment_notes: '',
};

// Array fields where selecting "None" clears the rest.
type ArrayField =
  | 'goals' | 'secondary_goals' | 'training_styles'
  | 'medical_conditions' | 'injuries'
  | 'preferred_times' | 'preferred_days' | 'equipment_available'
  | 'trainer_languages';

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClientAssessmentFormScreen() {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();
  const { userId } = useWellness();

  // Data
  const [profile, setProfile]         = useState<ProfileRow | null>(null);
  const [hasClientProfile, setHasClientProfile] = useState(false);
  const [isLoading, setIsLoading]     = useState(true);
  const [loadError, setLoadError]     = useState('');

  // Sections A–H — editable client profile
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved]       = useState(false);
  const [profileError, setProfileError]       = useState('');

  // Assessment decision
  const [assessmentForm, setAssessmentForm] = useState<AssessmentForm>({
    health_notes: '',
    fitness_level: null,
    trainer_recommendation: '',
  });
  const [decidingStatus, setDecidingStatus] = useState<'cleared' | 'conditional' | 'hold' | null>(null);
  const [decisionError, setDecisionError]   = useState('');

  // Trainer assignment (recommended trainers — max 2)
  const [assessmentId, setAssessmentId]     = useState<string | null>(null);
  const [allTrainers, setAllTrainers]       = useState<TrainerPoolItem[]>([]);
  const [autoSuggested, setAutoSuggested]   = useState<SuggestedTrainer[]>([]);
  const [selectedTrainers, setSelectedTrainers] = useState<string[]>([]);
  const [showTrainerModal, setShowTrainerModal] = useState(false);
  const [trainerSearch, setTrainerSearch]   = useState('');

  // ── Fetch on mount ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!clientId) return;

    const id = clientId; // narrow to string
    let isMounted = true;

    async function fetchAll() {
      setIsLoading(true);
      setLoadError('');
      try {
        const [profileRes, healthRes, assessmentRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, phone_number, city')
            .eq('id', id)
            .maybeSingle(),
          supabase
            .from('client_profiles')
            .select(`
              dob, gender, height_cm, weight_kg, activity_level, fitness_level,
              goals, medical_conditions, training_preferences, injuries,
              rehab_required, medical_certified_required, doctor_clearance,
              trainer_gender_pref, trainer_languages, trainer_experience_pref,
              coaching_style_pref, session_intensity_pref, weekly_frequency,
              preferred_days, preferred_times, equipment_available,
              sleep_quality, stress_level, motivation_level, assessment_notes
            `)
            .eq('user_id', id)
            .maybeSingle(),
          supabase
            .from('assessments')
            .select('id, fitness_level, health_notes, trainer_recommendation, clearance_status')
            .eq('client_id', id)
            .maybeSingle(),
        ]);

        if (!isMounted) return;

        if (profileRes.error) throw new Error(profileRes.error.message);

        setProfile(profileRes.data as ProfileRow | null);

        const h = healthRes.data as Record<string, unknown> | null;
        setHasClientProfile(!!h);

        if (h) {
          const tp = (h.training_preferences ?? {}) as TrainingPreferences;
          const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
          const str = (v: unknown): string => (typeof v === 'string' ? v : '');
          setForm({
            dob:                    str(h.dob),
            gender:                 str(h.gender),
            height_cm:              h.height_cm != null ? String(h.height_cm) : '',
            weight_kg:              h.weight_kg != null ? String(h.weight_kg) : '',
            goals:                  arr(h.goals),
            secondary_goals:        arr(tp.secondary_goals),
            goal_priority:          str(tp.goal_priority),
            training_styles:        arr(tp.training_styles),
            session_intensity_pref: normalisePref(str(h.session_intensity_pref)),
            coaching_style_pref:    str(h.coaching_style_pref),
            fitness_level:          str(h.fitness_level),
            activity_level:         typeof h.activity_level === 'number' ? h.activity_level : null,
            weekly_frequency:       str(h.weekly_frequency),
            medical_conditions:     arr(h.medical_conditions),
            injuries:               arr(h.injuries),
            rehab_required:             h.rehab_required === true,
            medical_certified_required: h.medical_certified_required === true,
            doctor_clearance:           h.doctor_clearance === true,
            session_mode:           str(tp.session_mode),
            preferred_times:        arr(h.preferred_times),
            preferred_days:         arr(h.preferred_days),
            equipment_available:    arr(h.equipment_available),
            trainer_gender_pref:    normalisePref(str(h.trainer_gender_pref)),
            trainer_languages:      arr(h.trainer_languages),
            trainer_experience_pref: normalisePref(str(h.trainer_experience_pref)),
            sleep_quality:          str(h.sleep_quality),
            stress_level:           str(h.stress_level),
            motivation_level:       str(h.motivation_level),
            assessment_notes:       str(h.assessment_notes),
          });
        }

        // Pre-populate the assessment decision section from any existing row.
        const existing = assessmentRes.data as ExistingAssessment | null;
        if (existing) {
          setAssessmentId(existing.id);
          setAssessmentForm({
            health_notes:           existing.health_notes ?? '',
            fitness_level:          existing.fitness_level ?? null,
            trainer_recommendation: existing.trainer_recommendation ?? '',
          });
        }

        // ── Trainer assignment data — auto-suggestions, full pool, existing recs ──
        const [suggested, trainerPoolRes, existingRecs] = await Promise.all([
          getScoredTrainerRecommendations(id),
          supabase
            .from('profiles')
            .select('id, full_name, rating, specialties, bio')
            .eq('role', 'trainer')
            .eq('is_active', true),
          getAssessmentRecommendations(id),
        ]);

        if (!isMounted) return;

        setAutoSuggested(
          suggested.slice(0, 3).map(s => ({
            id:        s.trainer.id,
            full_name: s.trainer.full_name,
            reason:    s.reason,
          })),
        );
        setAllTrainers((trainerPoolRes.data ?? []) as TrainerPoolItem[]);
        setSelectedTrainers(existingRecs.slice(0, 2));
      } catch (err: unknown) {
        if (isMounted) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load client data.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchAll();
    return () => { isMounted = false; };
  }, [clientId]);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const age = calculateAge(form.dob);

  const bmi = (() => {
    const h = parseFloat(form.height_cm);
    const w = parseFloat(form.weight_kg);
    if (isNaN(h) || isNaN(w) || h <= 0) return null;
    const m = h / 100;
    return Math.round((w / (m * m)) * 10) / 10;
  })();

  const canDecide =
    assessmentForm.fitness_level !== null &&
    assessmentForm.health_notes.trim().length > 0;

  // Trainer assignment derived helpers
  const suggestedIds = new Set(autoSuggested.map(s => s.id));
  const trainerById = (id: string): TrainerPoolItem | undefined =>
    allTrainers.find(t => t.id === id);
  const filteredTrainerPool = allTrainers.filter(t => {
    const q = trainerSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      t.full_name.toLowerCase().includes(q) ||
      (t.specialties ?? []).some(s => s.toLowerCase().includes(q))
    );
  });
  const initials = (name: string) =>
    name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  // ── Form mutators ─────────────────────────────────────────────────────────────

  const setField = <K extends keyof ClientForm>(key: K, value: ClientForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setProfileSaved(false);
  };

  // Toggle a value in an array field. Selecting "None" clears the rest, and
  // selecting any other value clears "None".
  const toggleArray = (key: ArrayField, value: string) => {
    setForm(prev => {
      const cur = prev[key];
      let next: string[];
      if (value === 'None') {
        next = cur.includes('None') ? [] : ['None'];
      } else {
        const without = cur.filter(v => v !== 'None');
        next = without.includes(value) ? without.filter(v => v !== value) : [...without, value];
      }
      return { ...prev, [key]: next };
    });
    setProfileSaved(false);
  };

  const addTrainer = (id: string) => {
    setSelectedTrainers(prev => (prev.includes(id) || prev.length >= 2 ? prev : [...prev, id]));
    setProfileSaved(false);
  };

  const removeTrainer = (id: string) => {
    setSelectedTrainers(prev => prev.filter(t => t !== id));
    setProfileSaved(false);
  };

  // ── Save (Sections A–H) ─────────────────────────────────────────────────────

  const handleSaveProfile = async () => {
    if (!clientId || !userId) return;
    setIsSavingProfile(true);
    setProfileError('');
    setProfileSaved(false);
    try {
      const training_preferences: TrainingPreferences = {
        training_styles: form.training_styles,
        session_mode:    form.session_mode || '',
        secondary_goals: form.secondary_goals,
        goal_priority:   form.goal_priority || '',
      };

      const result = await upsertClientProfile(
        clientId,
        {
          dob:                        form.dob || null,
          gender:                     form.gender || null,
          height_cm:                  form.height_cm ? Number(form.height_cm) : null,
          weight_kg:                  form.weight_kg ? Number(form.weight_kg) : null,
          goals:                      form.goals,
          training_preferences,
          fitness_level:              form.fitness_level || null,
          activity_level:             form.activity_level,
          weekly_frequency:           form.weekly_frequency || null,
          medical_conditions:         form.medical_conditions,
          injuries:                   form.injuries,
          rehab_required:             form.rehab_required,
          medical_certified_required: form.medical_certified_required,
          doctor_clearance:           form.doctor_clearance,
          preferred_times:            form.preferred_times,
          preferred_days:             form.preferred_days,
          equipment_available:        form.equipment_available,
          trainer_gender_pref:        form.trainer_gender_pref || null,
          trainer_languages:          form.trainer_languages,
          trainer_experience_pref:    form.trainer_experience_pref || null,
          coaching_style_pref:        form.coaching_style_pref || null,
          session_intensity_pref:     form.session_intensity_pref || null,
          sleep_quality:              form.sleep_quality || null,
          stress_level:               form.stress_level || null,
          motivation_level:           form.motivation_level || null,
          assessment_notes:           form.assessment_notes || null,
        },
        null, // city is owned by the client profile screen — leave untouched
      );

      if (!result.ok) throw new Error(result.errorMessage ?? 'Save failed.');

      // Persist the assessor's trainer recommendations. Non-fatal.
      if (assessmentId) {
        const recSaved = await saveAssessmentRecommendations(assessmentId, selectedTrainers);
        if (!recSaved) console.warn('handleSaveProfile: trainer recommendations failed to save');
      }

      setHasClientProfile(true);
      await notifyClientProfileUpdated(clientId, userId);
      setProfileSaved(true);
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleClearance = async (status: 'cleared' | 'conditional' | 'hold') => {
    if (!clientId || !userId || decidingStatus) return;
    if (!canDecide) {
      setDecisionError('Add a fitness level assessment and assessment notes before deciding.');
      return;
    }
    setDecidingStatus(status);
    setDecisionError('');
    try {
      const result = await completeAssessment(userId, clientId, {
        fitness_level:          assessmentForm.fitness_level,
        health_notes:           assessmentForm.health_notes,
        trainer_recommendation: assessmentForm.trainer_recommendation,
        clearance_status:       status,
      });
      if (!result.success) throw new Error(result.error ?? 'Could not save decision.');
      navigate('/assessment/clients/queue');
    } catch (err: unknown) {
      setDecisionError(err instanceof Error ? err.message : 'Could not save decision.');
      setDecidingStatus(null);
    }
  };

  // ── Reusable chip renderers ───────────────────────────────────────────────────

  const SELECTED_TEAL  = { backgroundColor: '#f0fdfa', border: '1.5px solid #5eead4', color: '#0d9488' };
  const UNSELECTED      = { backgroundColor: '#ffffff', border: '1.5px solid #e5e7eb', color: '#6b7280' };
  const SELECTED_RED    = { backgroundColor: '#fef2f2', border: '1.5px solid #fca5a5', color: '#dc2626' };

  const fieldLabel = (text: string) => (
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{text}</label>
  );

  const multiChips = (
    options: string[],
    selected: string[],
    onToggle: (v: string) => void,
    redWhenSelected = false,
  ) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {options.map(opt => {
        const isSel = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold active:scale-95 transition-transform"
            style={isSel ? (redWhenSelected ? SELECTED_RED : SELECTED_TEAL) : UNSELECTED}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );

  const singleChips = (
    options: string[],
    value: string,
    onSelect: (v: string) => void,
  ) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {options.map(opt => {
        const isSel = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold active:scale-95 transition-transform"
            style={isSel ? SELECTED_TEAL : UNSELECTED}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );

  const yesNoToggle = (value: boolean, onSelect: (v: boolean) => void) => (
    <div className="flex gap-2 mt-2">
      {[{ label: 'Yes', val: true }, { label: 'No', val: false }].map(o => {
        const isSel = value === o.val;
        return (
          <button
            key={o.label}
            type="button"
            onClick={() => { onSelect(o.val); setProfileSaved(false); }}
            className="px-5 py-2 rounded-lg text-xs font-semibold active:scale-95 transition-transform"
            style={isSel ? SELECTED_TEAL : UNSELECTED}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );

  const sectionCard = (title: string, subtitle: string | null, children: React.ReactNode) => (
    <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-5">
      <div>
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  const bmiInfo = bmi !== null ? bmiCategory(bmi) : null;

  return (
    <MobileShell className="bg-[#F2F8F7]">

      {/* ── Header ── */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-5 pt-10 pb-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-700 active:scale-95 transition-transform"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Assessment</h1>
            {profile && (
              <p className="text-sm font-medium text-gray-500">{profile.full_name}</p>
            )}
          </div>
          <div className="ml-auto">
            <ProfileMenu />
          </div>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto pb-24">

        {/* Load error */}
        {loadError && (
          <div className="mx-5 mt-4 bg-red-50 p-3 rounded-lg flex items-start gap-2 border border-red-100">
            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
            <p className="text-sm text-red-700">{loadError}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: '#0d9488', borderTopColor: 'transparent' }}
            />
          </div>
        ) : (
          <div className="px-5 pt-4 space-y-6">

            {!hasClientProfile && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-700 font-medium">
                  Client hasn't filled this in — you can complete it during the assessment call.
                </p>
              </div>
            )}

            {/* ════ SECTION A — Basic Profile ════ */}
            {sectionCard('A · Basic Profile', 'Pre-filled from the client — editable', (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    {fieldLabel('Full Name')}
                    <p className="text-sm font-medium text-gray-900 mt-1">{profile?.full_name ?? '—'}</p>
                  </div>
                  <div>
                    {fieldLabel('Phone')}
                    <p className="text-sm font-medium text-gray-900 mt-1">{profile?.phone_number || 'Not provided'}</p>
                  </div>
                </div>

                <div>
                  {fieldLabel('Date of Birth')}
                  <input
                    type="date"
                    value={form.dob}
                    onChange={e => setField('dob', e.target.value)}
                    className="w-full mt-1.5 rounded-xl border border-gray-200 p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  {age !== null && <p className="text-xs text-gray-500 mt-1">Age: {age} years</p>}
                </div>

                <div>
                  {fieldLabel('Gender')}
                  {singleChips(GENDER_OPTIONS, form.gender, v => setField('gender', v))}
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    {fieldLabel('Height (cm)')}
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="Not filled"
                      value={form.height_cm}
                      onChange={e => setField('height_cm', e.target.value)}
                      className="w-full mt-1.5 rounded-xl border border-gray-200 p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                  </div>
                  <div className="flex-1">
                    {fieldLabel('Weight (kg)')}
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="Not filled"
                      value={form.weight_kg}
                      onChange={e => setField('weight_kg', e.target.value)}
                      className="w-full mt-1.5 rounded-xl border border-gray-200 p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                  </div>
                </div>

                {/* BMI (read-only, colour coded) */}
                <div>
                  {fieldLabel('BMI (auto-calculated)')}
                  {bmiInfo ? (
                    <div
                      className="mt-1.5 rounded-xl px-3 py-2.5 flex items-center justify-between"
                      style={{ backgroundColor: `${bmiInfo.color}14`, border: `1px solid ${bmiInfo.color}40` }}
                    >
                      <span className="text-sm font-bold" style={{ color: bmiInfo.color }}>{bmi?.toFixed(1)}</span>
                      <span className="text-xs font-semibold" style={{ color: bmiInfo.color }}>{bmiInfo.label}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 mt-1.5">Enter height and weight to calculate</p>
                  )}
                </div>
              </>
            ))}

            {/* ════ SECTION B — Fitness Goals & Preferences ════ */}
            {sectionCard('B · Fitness Goals & Preferences', null, (
              <>
                <div>
                  {fieldLabel('Primary Goals')}
                  {multiChips(GOAL_OPTIONS, form.goals, v => toggleArray('goals', v))}
                </div>
                <div>
                  {fieldLabel('Secondary Goals')}
                  {multiChips(GOAL_OPTIONS, form.secondary_goals, v => toggleArray('secondary_goals', v))}
                </div>
                <div>
                  {fieldLabel('Goal Priority')}
                  {singleChips(GOAL_PRIORITY_OPTIONS, form.goal_priority, v => setField('goal_priority', v))}
                </div>
                <div>
                  {fieldLabel('Preferred Training Styles')}
                  {multiChips(TRAINING_STYLE_OPTIONS, form.training_styles, v => toggleArray('training_styles', v))}
                </div>
                <div>
                  {fieldLabel('Preferred Session Intensity')}
                  {singleChips(SESSION_INTENSITY_OPTIONS, form.session_intensity_pref, v => setField('session_intensity_pref', v))}
                </div>
                <div>
                  {fieldLabel('Preferred Coaching Style')}
                  {singleChips(COACHING_STYLE_OPTIONS, form.coaching_style_pref, v => setField('coaching_style_pref', v))}
                </div>
              </>
            ))}

            {/* ════ SECTION C — Fitness & Activity Level ════ */}
            {sectionCard('C · Fitness & Activity Level', 'Assessed during the call', (
              <>
                <div>
                  {fieldLabel('Current Fitness Level')}
                  {singleChips(
                    FITNESS_LEVEL_OPTIONS.map(f => f.label),
                    FITNESS_LEVEL_OPTIONS.find(f => f.value === form.fitness_level)?.label ?? '',
                    label => {
                      const match = FITNESS_LEVEL_OPTIONS.find(f => f.label === label);
                      setField('fitness_level', match ? match.value : '');
                    },
                  )}
                </div>
                <div>
                  {fieldLabel('Activity Level')}
                  {singleChips(
                    ACTIVITY_LEVEL_OPTIONS.map(a => a.label),
                    ACTIVITY_LEVEL_OPTIONS.find(a => a.value === form.activity_level)?.label ?? '',
                    label => {
                      const match = ACTIVITY_LEVEL_OPTIONS.find(a => a.label === label);
                      setField('activity_level', match ? match.value : null);
                    },
                  )}
                </div>
                <div>
                  {fieldLabel('Weekly Workout Frequency')}
                  {singleChips(WEEKLY_FREQUENCY_OPTIONS, form.weekly_frequency, v => setField('weekly_frequency', v))}
                </div>
              </>
            ))}

            {/* ════ SECTION D — Medical Conditions & Injuries ════ */}
            {sectionCard('D · Medical Conditions & Injuries', 'Critical for trainer matching', (
              <>
                <div>
                  {fieldLabel('Existing Medical Conditions')}
                  {multiChips(MEDICAL_CONDITION_OPTIONS, form.medical_conditions, v => toggleArray('medical_conditions', v), true)}
                </div>
                <div>
                  {fieldLabel('Existing Injuries')}
                  {multiChips(INJURY_OPTIONS, form.injuries, v => toggleArray('injuries', v), true)}
                </div>
                <div>
                  {fieldLabel('Rehabilitation Required')}
                  {yesNoToggle(form.rehab_required, v => setField('rehab_required', v))}
                </div>
                <div>
                  {fieldLabel('Requires Medical-Certified Trainer')}
                  {yesNoToggle(form.medical_certified_required, v => setField('medical_certified_required', v))}
                </div>
                <div>
                  {fieldLabel('Doctor Clearance Available')}
                  {yesNoToggle(form.doctor_clearance, v => setField('doctor_clearance', v))}
                </div>
              </>
            ))}

            {/* ════ SECTION E — Session Preferences ════ */}
            {sectionCard('E · Session Preferences', null, (
              <>
                <div>
                  {fieldLabel('Session Mode')}
                  {singleChips(SESSION_MODE_OPTIONS, form.session_mode, v => setField('session_mode', v))}
                </div>
                <div>
                  {fieldLabel('Preferred Times')}
                  {multiChips(PREFERRED_TIME_OPTIONS, form.preferred_times, v => toggleArray('preferred_times', v))}
                </div>
                <div>
                  {fieldLabel('Preferred Days')}
                  {multiChips(PREFERRED_DAY_OPTIONS, form.preferred_days, v => toggleArray('preferred_days', v))}
                </div>
                <div>
                  {fieldLabel('Home Equipment')}
                  {multiChips(EQUIPMENT_OPTIONS, form.equipment_available, v => toggleArray('equipment_available', v))}
                </div>
              </>
            ))}

            {/* ════ SECTION F — Trainer Preferences ════ */}
            {sectionCard('F · Trainer Preferences', null, (
              <>
                <div>
                  {fieldLabel('Preferred Trainer Gender')}
                  {singleChips(TRAINER_GENDER_OPTIONS, form.trainer_gender_pref, v => setField('trainer_gender_pref', v))}
                </div>
                <div>
                  {fieldLabel('Preferred Languages')}
                  {multiChips(TRAINER_LANGUAGE_OPTIONS, form.trainer_languages, v => toggleArray('trainer_languages', v))}
                </div>
                <div>
                  {fieldLabel('Preferred Experience Level')}
                  {singleChips(TRAINER_EXPERIENCE_OPTIONS, form.trainer_experience_pref, v => setField('trainer_experience_pref', v))}
                </div>
                <div>
                  {fieldLabel('Preferred Coaching Style')}
                  {singleChips(COACHING_STYLE_OPTIONS, form.coaching_style_pref, v => setField('coaching_style_pref', v))}
                </div>
              </>
            ))}

            {/* ════ SECTION G — Lifestyle & Wellness ════ */}
            {sectionCard('G · Lifestyle & Wellness', null, (
              <>
                <div>
                  {fieldLabel('Sleep Quality')}
                  {singleChips(SLEEP_QUALITY_OPTIONS, form.sleep_quality, v => setField('sleep_quality', v))}
                </div>
                <div>
                  {fieldLabel('Stress Level')}
                  {singleChips(STRESS_LEVEL_OPTIONS, form.stress_level, v => setField('stress_level', v))}
                </div>
                <div>
                  {fieldLabel('Motivation Consistency')}
                  {singleChips(MOTIVATION_OPTIONS, form.motivation_level, v => setField('motivation_level', v))}
                </div>
              </>
            ))}

            {/* ════ SECTION H — Assessor Notes ════ */}
            {sectionCard('H · Assessor Notes', 'These notes are internal — not visible to client', (
              <div>
                {fieldLabel('Internal Assessment Notes')}
                <textarea
                  value={form.assessment_notes}
                  onChange={e => setField('assessment_notes', e.target.value)}
                  placeholder="Internal notes about this client's assessment..."
                  className="w-full mt-1.5 rounded-xl border border-gray-200 p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                  style={{ minHeight: '90px' }}
                />
              </div>
            ))}

            {/* Save profile error */}
            {profileError && (
              <div className="bg-red-50 p-3 rounded-lg flex items-start gap-2 border border-red-100">
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                <p className="text-sm text-red-700">{profileError}</p>
              </div>
            )}

            {/* Save profile button */}
            <div className="space-y-1">
              <button
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                style={{ backgroundColor: profileSaved ? '#16a34a' : '#0d9488' }}
              >
                {isSavingProfile && <Loader2 size={16} className="animate-spin" />}
                {profileSaved && !isSavingProfile && <Check size={16} />}
                {isSavingProfile ? 'Saving…' : profileSaved ? 'Profile Saved' : 'Save Profile Changes'}
              </button>
              {profileSaved && (
                <p className="text-xs text-center text-gray-500">
                  The client has been notified to review their details.
                </p>
              )}
            </div>

            {/* ════ Assessment Decision ════ */}
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-5">
              <h2 className="text-base font-bold text-gray-900">Assessment Decision</h2>

              {/* Assessment notes */}
              <div>
                {fieldLabel('Assessment Notes')}
                <textarea
                  value={assessmentForm.health_notes}
                  onChange={e => setAssessmentForm(prev => ({ ...prev, health_notes: e.target.value }))}
                  placeholder="Observations, limitations, medical considerations..."
                  className="w-full mt-1.5 rounded-xl border border-gray-200 p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                  style={{ minHeight: '100px' }}
                />
              </div>

              {/* Fitness level assessment */}
              <div>
                {fieldLabel('Fitness Level Assessment')}
                <div className="flex gap-2 mt-2">
                  {FITNESS_LEVEL_OPTIONS.map(({ value, label }) => {
                    const selected = assessmentForm.fitness_level === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAssessmentForm(prev => ({ ...prev, fitness_level: value }))}
                        className="flex-1 py-3 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
                        style={
                          selected
                            ? { backgroundColor: '#f0fdfa', border: '2px solid #0d9488', color: '#0d9488' }
                            : { backgroundColor: '#ffffff', border: '2px solid #e5e7eb', color: '#6b7280' }
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Trainer recommendation */}
              <div>
                {fieldLabel('Trainer Recommendation')}
                <textarea
                  value={assessmentForm.trainer_recommendation}
                  onChange={e => setAssessmentForm(prev => ({ ...prev, trainer_recommendation: e.target.value }))}
                  placeholder="Recommended training approach, restrictions, trainer notes..."
                  className="w-full mt-1.5 rounded-xl border border-gray-200 p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                  style={{ minHeight: '80px' }}
                />
              </div>

              {/* ── Assign Recommended Trainers ── */}
              <div>
                {fieldLabel('Assign Recommended Trainers')}

                {/* Engine suggestions */}
                {autoSuggested.length > 0 && (
                  <div className="mt-2 rounded-xl p-3 border" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles size={14} style={{ color: '#d97706' }} />
                      <p className="text-xs font-bold" style={{ color: '#b45309' }}>Engine Suggestions</p>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-2">Based on client preferences:</p>
                    <div className="space-y-2">
                      {autoSuggested.map(s => {
                        const isSelected = selectedTrainers.includes(s.id);
                        const isFull = selectedTrainers.length >= 2;
                        return (
                          <div key={s.id} className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">{s.full_name}</p>
                              <p className="text-[11px] text-gray-500 truncate">{s.reason}</p>
                            </div>
                            {isSelected ? (
                              <span className="text-[11px] font-semibold px-2 py-1 rounded-lg shrink-0" style={{ backgroundColor: '#f0fdfa', color: '#0d9488' }}>
                                Added
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={isFull}
                                onClick={() => addTrainer(s.id)}
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg shrink-0 active:scale-95 transition-transform disabled:opacity-40"
                                style={{ backgroundColor: '#0d9488', color: '#ffffff' }}
                              >
                                Add to Recommendation
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Current selection */}
                <div className="mt-3">
                  {selectedTrainers.length === 0 ? (
                    <div className="rounded-xl p-3 text-sm font-medium" style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
                      No trainers assigned yet
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedTrainers.map(id => {
                        const t = trainerById(id);
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full"
                            style={{ backgroundColor: '#f0fdfa', color: '#0d9488', border: '1.5px solid #5eead4' }}
                          >
                            {t?.full_name ?? 'Trainer'}
                            <button type="button" onClick={() => removeTrainer(id)} className="active:scale-90 transition-transform">
                              <X size={13} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => { setTrainerSearch(''); setShowTrainerModal(true); }}
                  className="w-full mt-3 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  style={{ backgroundColor: '#f0fdfa', color: '#0d9488', border: '1.5px solid #5eead4' }}
                >
                  <Search size={16} /> Browse &amp; Assign Trainers
                </button>
              </div>

              {/* Clearance decision */}
              <div>
                {fieldLabel('Clearance Decision')}
                {!canDecide && (
                  <p className="text-xs text-gray-400 mt-1">
                    Select a fitness level and add assessment notes to enable a decision.
                  </p>
                )}
                <div className="space-y-2 mt-2">
                  {CLEARANCE_OPTIONS.map(({ value, icon, label, description, activeBg, activeBorder, activeText }) => {
                    const isThisDeciding = decidingStatus === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={decidingStatus !== null || !canDecide}
                        onClick={() => handleClearance(value)}
                        className="w-full p-4 rounded-xl flex items-center gap-3 text-left active:scale-[0.98] transition-transform disabled:opacity-60"
                        style={
                          isThisDeciding
                            ? { backgroundColor: activeBg, border: `2px solid ${activeBorder}` }
                            : { backgroundColor: '#ffffff', border: '2px solid #e5e7eb' }
                        }
                      >
                        <span className="text-xl leading-none">{icon}</span>
                        <div className="flex-1">
                          <p className="font-semibold text-sm" style={{ color: isThisDeciding ? activeText : '#374151' }}>
                            {label}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: isThisDeciding ? activeText : '#9ca3af' }}>
                            {description}
                          </p>
                        </div>
                        {isThisDeciding && <Loader2 size={18} className="animate-spin" style={{ color: activeText }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Decision error */}
              {decisionError && (
                <div className="bg-red-50 p-3 rounded-lg flex items-start gap-2 border border-red-100">
                  <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                  <p className="text-sm text-red-700">{decisionError}</p>
                </div>
              )}
            </section>

          </div>
        )}
      </div>

      {/* ── Trainer assignment modal ── */}
      {showTrainerModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={() => setShowTrainerModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full flex flex-col overflow-hidden"
            style={{ maxWidth: '480px', maxHeight: '80vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900">Assign Trainers (max 2)</h3>
                <button onClick={() => setShowTrainerModal(false)} className="text-gray-400 active:scale-90 transition-transform">
                  <X size={20} />
                </button>
              </div>
              <div className="relative mt-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={trainerSearch}
                  onChange={e => setTrainerSearch(e.target.value)}
                  placeholder="Search by name or specialisation..."
                  className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2">
              {filteredTrainerPool.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No trainers match your search.</p>
              ) : (
                filteredTrainerPool.map(t => {
                  const isSelected = selectedTrainers.includes(t.id);
                  const isFull = selectedTrainers.length >= 2;
                  return (
                    <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ backgroundColor: '#f0fdfa', color: '#0d9488' }}
                      >
                        {initials(t.full_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-gray-900 truncate">{t.full_name}</p>
                          {suggestedIds.has(t.id) && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: '#fffbeb', color: '#b45309' }}>
                              ⭐ Suggested
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">
                          {(t.specialties ?? []).join(', ') || 'No specialisations listed'}
                        </p>
                        {t.rating != null && (
                          <div className="flex items-center gap-0.5 mt-0.5">
                            <Star size={11} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                            <span className="text-[11px] font-medium text-gray-600">{Number(t.rating).toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      {isSelected ? (
                        <button
                          type="button"
                          onClick={() => removeTrainer(t.id)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 active:scale-95 transition-transform"
                          style={{ backgroundColor: '#ffffff', color: '#dc2626', border: '1.5px solid #fca5a5' }}
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isFull}
                          onClick={() => addTrainer(t.id)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 active:scale-95 transition-transform disabled:opacity-40"
                          style={{ backgroundColor: '#0d9488', color: '#ffffff' }}
                        >
                          Add
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowTrainerModal(false)}
                className="w-full py-3 rounded-xl text-white font-bold text-sm active:scale-[0.98] transition-transform"
                style={{ backgroundColor: '#0d9488' }}
              >
                Save Selection ({selectedTrainers.length}/2)
              </button>
            </div>
          </div>
        </div>
      )}

      <AssessmentBottomNav />
    </MobileShell>
  );
}
