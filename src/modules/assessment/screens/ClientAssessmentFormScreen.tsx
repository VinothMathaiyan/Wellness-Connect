import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Loader2, AlertTriangle, Check, Search, X, Star, Sparkles } from 'lucide-react';
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

// ── Constants ─────────────────────────────────────────────────────────────────

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'] as const;

const GOAL_OPTIONS = [
  'General fitness',
  'Fat loss',
  'Muscle gain',
  'Flexibility',
  'Stress relief',
  'Rehabilitation',
  'Yoga',
] as const;

const CONDITION_OPTIONS = [
  'Back pain',
  'Knee issue',
  'Joint pain',
  'Diabetes',
  'Blood pressure',
  'Heart condition',
  'Respiratory condition',
  'PCOS / PCOD',
  'Injury recovery',
  'Other',
] as const;

const FITNESS_LEVELS: { value: 'beginner' | 'intermediate' | 'advanced'; label: string }[] = [
  { value: 'beginner',     label: 'Beginner'     },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced'     },
];

const ACTIVITY_LEVELS: { value: number; label: string }[] = [
  { value: 1, label: '1 — Sedentary' },
  { value: 2, label: '2 — Lightly active' },
  { value: 3, label: '3 — Moderately active' },
  { value: 4, label: '4 — Active' },
  { value: 5, label: '5 — Very active' },
];

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

interface ProfileForm {
  dob: string;
  gender: string;
  height_cm: string;
  weight_kg: string;
  activity_level: number | null;
  fitness_level: string;
  goals: string[];
  medical_conditions: string[];
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

const EMPTY_PROFILE: ProfileForm = {
  dob: '',
  gender: '',
  height_cm: '',
  weight_kg: '',
  activity_level: null,
  fitness_level: '',
  goals: [],
  medical_conditions: [],
};

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

  // Section A — editable health profile
  const [profileForm, setProfileForm] = useState<ProfileForm>(EMPTY_PROFILE);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved]       = useState(false);
  const [profileError, setProfileError]       = useState('');

  // Section B — assessment decision
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
            .select('dob, gender, height_cm, weight_kg, activity_level, fitness_level, goals, medical_conditions')
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

        const health = healthRes.data as Partial<{
          dob: string | null;
          gender: string | null;
          height_cm: number | null;
          weight_kg: number | null;
          activity_level: number | null;
          fitness_level: string | null;
          goals: string[] | null;
          medical_conditions: string[] | null;
        }> | null;

        setHasClientProfile(!!health);

        if (health) {
          setProfileForm({
            dob:                health.dob ?? '',
            gender:             health.gender ?? '',
            height_cm:          health.height_cm != null ? String(health.height_cm) : '',
            weight_kg:          health.weight_kg != null ? String(health.weight_kg) : '',
            activity_level:     health.activity_level ?? null,
            fitness_level:      health.fitness_level ?? '',
            goals:              Array.isArray(health.goals) ? health.goals : [],
            medical_conditions: Array.isArray(health.medical_conditions) ? health.medical_conditions : [],
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

  const age = calculateAge(profileForm.dob);
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

  // ── Handlers ────────────────────────────────────────────────────────────────

  const setProfileField = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setProfileForm(prev => ({ ...prev, [key]: value }));
    setProfileSaved(false);
  };

  const toggleGoal = (goal: string) => {
    setProfileForm(prev => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal],
    }));
    setProfileSaved(false);
  };

  const toggleCondition = (cond: string) => {
    setProfileForm(prev => ({
      ...prev,
      medical_conditions: prev.medical_conditions.includes(cond)
        ? prev.medical_conditions.filter(c => c !== cond)
        : [...prev.medical_conditions, cond],
    }));
    setProfileSaved(false);
  };

  const addTrainer = (id: string) => {
    setSelectedTrainers(prev => {
      if (prev.includes(id) || prev.length >= 2) return prev;
      return [...prev, id];
    });
    setProfileSaved(false);
  };

  const removeTrainer = (id: string) => {
    setSelectedTrainers(prev => prev.filter(t => t !== id));
    setProfileSaved(false);
  };

  const handleSaveProfile = async () => {
    if (!clientId || !userId) return;
    setIsSavingProfile(true);
    setProfileError('');
    setProfileSaved(false);
    try {
      const result = await upsertClientProfile(
        clientId,
        {
          dob:                profileForm.dob || null,
          gender:             profileForm.gender || null,
          height_cm:          profileForm.height_cm ? Number(profileForm.height_cm) : null,
          weight_kg:          profileForm.weight_kg ? Number(profileForm.weight_kg) : null,
          medical_conditions: profileForm.medical_conditions,
          activity_level:     profileForm.activity_level,
          fitness_level:      profileForm.fitness_level || null,
          goals:              profileForm.goals,
        },
        null, // city is owned by the client profile screen — leave untouched
      );

      if (!result.ok) throw new Error(result.errorMessage ?? 'Save failed.');

      // Persist the assessor's trainer recommendations. Non-fatal: a failure
      // here must not block the profile save the assessor just confirmed.
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

  // ── Render ───────────────────────────────────────────────────────────────────

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

            {/* ════ SECTION A — Client Health Profile (editable) ════ */}
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-5">
              <div>
                <h2 className="text-base font-bold text-gray-900">Client Health Profile</h2>
                {!hasClientProfile && (
                  <p className="text-xs text-amber-600 font-medium mt-1">
                    Client hasn't filled this in — you can complete it below.
                  </p>
                )}
              </div>

              {/* Full name (read only) */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name</label>
                <p className="text-sm font-medium text-gray-900 mt-1">{profile?.full_name ?? '—'}</p>
              </div>

              {/* Phone (read only) */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</label>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {profile?.phone_number || 'Not provided'}
                </p>
              </div>

              {/* Date of birth */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</label>
                <input
                  type="date"
                  value={profileForm.dob}
                  onChange={e => setProfileField('dob', e.target.value)}
                  className="w-full mt-1.5 rounded-xl border border-gray-200 p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                {age !== null && (
                  <p className="text-xs text-gray-500 mt-1">Age: {age} years</p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</label>
                <select
                  value={profileForm.gender}
                  onChange={e => setProfileField('gender', e.target.value)}
                  className="w-full mt-1.5 rounded-xl border border-gray-200 p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <option value="">Not filled by client</option>
                  {GENDER_OPTIONS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {/* Height + Weight */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Height (cm)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Not filled"
                    value={profileForm.height_cm}
                    onChange={e => setProfileField('height_cm', e.target.value)}
                    className="w-full mt-1.5 rounded-xl border border-gray-200 p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Weight (kg)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="Not filled"
                    value={profileForm.weight_kg}
                    onChange={e => setProfileField('weight_kg', e.target.value)}
                    className="w-full mt-1.5 rounded-xl border border-gray-200 p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>

              {/* Activity level */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Activity Level</label>
                <select
                  value={profileForm.activity_level ?? ''}
                  onChange={e => setProfileField('activity_level', e.target.value ? Number(e.target.value) : null)}
                  className="w-full mt-1.5 rounded-xl border border-gray-200 p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <option value="">Not filled by client</option>
                  {ACTIVITY_LEVELS.map(a => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>

              {/* Fitness level */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fitness Level</label>
                <select
                  value={profileForm.fitness_level}
                  onChange={e => setProfileField('fitness_level', e.target.value)}
                  className="w-full mt-1.5 rounded-xl border border-gray-200 p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <option value="">Not filled by client</option>
                  {FITNESS_LEVELS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              {/* Health goals */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Health Goals</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {GOAL_OPTIONS.map(goal => {
                    const selected = profileForm.goals.includes(goal);
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => toggleGoal(goal)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold active:scale-95 transition-transform"
                        style={
                          selected
                            ? { backgroundColor: '#f0fdfa', border: '1.5px solid #5eead4', color: '#0d9488' }
                            : { backgroundColor: '#ffffff', border: '1.5px solid #e5e7eb', color: '#6b7280' }
                        }
                      >
                        {goal}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Medical conditions */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Medical Conditions</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {CONDITION_OPTIONS.map(cond => {
                    const selected = profileForm.medical_conditions.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => toggleCondition(cond)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold active:scale-95 transition-transform"
                        style={
                          selected
                            ? { backgroundColor: '#fef2f2', border: '1.5px solid #fca5a5', color: '#dc2626' }
                            : { backgroundColor: '#ffffff', border: '1.5px solid #e5e7eb', color: '#6b7280' }
                        }
                      >
                        {cond}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Save profile error */}
              {profileError && (
                <div className="bg-red-50 p-3 rounded-lg flex items-start gap-2 border border-red-100">
                  <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                  <p className="text-sm text-red-700">{profileError}</p>
                </div>
              )}

              {/* Save profile button */}
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
            </section>

            {/* ════ SECTION B — Assessment Decision ════ */}
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-5">
              <h2 className="text-base font-bold text-gray-900">Assessment Decision</h2>

              {/* Assessment notes */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assessment Notes</label>
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
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fitness Level Assessment</label>
                <div className="flex gap-2 mt-2">
                  {FITNESS_LEVELS.map(({ value, label }) => {
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
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Trainer Recommendation</label>
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
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assign Recommended Trainers</label>

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
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Clearance Decision</label>
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
