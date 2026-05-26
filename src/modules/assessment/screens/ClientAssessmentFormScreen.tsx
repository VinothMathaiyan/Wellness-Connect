import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Loader2, AlertTriangle } from 'lucide-react';
import MobileShell from '../../../components/MobileShell';
import ProfileMenu from '@/components/ProfileMenu';
import AssessmentBottomNav from '../components/AssessmentBottomNav';
import { useWellness } from '../../../context/WellnessContext';
import { supabase } from '../../../lib/supabaseClient';
import { submitAssessment } from '../../../services/supabaseService';

// ── Constants ─────────────────────────────────────────────────────────────────

const CONDITION_OPTIONS = [
  'Knee injury',
  'Back pain',
  'Cardiac',
  'Diabetes',
  'Hypertension',
  'Obesity',
  'Post-surgery',
  'Other',
] as const;

const FITNESS_LEVELS: { value: 'beginner' | 'intermediate' | 'advanced'; label: string }[] = [
  { value: 'beginner',     label: 'Beginner'     },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced'     },
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
    label: 'Cleared',
    description: 'Client is ready to begin training',
    activeBg: '#f0fdf4',
    activeBorder: '#86efac',
    activeText: '#16a34a',
  },
  {
    value: 'conditional',
    icon: '⚠️',
    label: 'Conditional',
    description: 'Training with restrictions',
    activeBg: '#fffbeb',
    activeBorder: '#fcd34d',
    activeText: '#d97706',
  },
  {
    value: 'hold',
    icon: '🚫',
    label: 'Hold',
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
  city: string | null;
}

interface ClientHealthProfile {
  goals: string[] | null;
  medical_conditions: string[] | null;
  fitness_level: string | null;
  dob: string | null;
  gender: string | null;
}

interface ExistingAssessment {
  fitness_level: 'beginner' | 'intermediate' | 'advanced' | null;
  health_notes: string | null;
  trainer_recommendation: string | null;
  clearance_status: 'cleared' | 'conditional' | 'hold' | null;
}

interface FormState {
  fitness_level: 'beginner' | 'intermediate' | 'advanced' | null;
  health_notes: string;
  trainer_recommendation: string;
  clearance_status: 'cleared' | 'conditional' | 'hold' | null;
  flagged_conditions: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClientAssessmentFormScreen() {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();
  const { userId } = useWellness();

  // Data
  const [profile, setProfile]           = useState<ProfileRow | null>(null);
  const [healthProfile, setHealthProfile] = useState<ClientHealthProfile | null>(null);
  const [isLoading, setIsLoading]        = useState(true);
  const [loadError, setLoadError]        = useState('');

  // Form
  const [form, setForm] = useState<FormState>({
    fitness_level:      null,
    health_notes:       '',
    trainer_recommendation: '',
    clearance_status:   null,
    flagged_conditions: [],
  });

  // Submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError]   = useState('');

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
            .select('id, full_name, city')
            .eq('id', id)
            .maybeSingle(),
          supabase
            .from('client_profiles')
            .select('goals, medical_conditions, fitness_level, dob, gender')
            .eq('user_id', id)
            .maybeSingle(),
          supabase
            .from('assessments')
            .select('*')
            .eq('client_id', id)
            .maybeSingle(),
        ]);

        if (!isMounted) return;

        if (profileRes.error) throw new Error(profileRes.error.message);

        setProfile(profileRes.data as ProfileRow | null);

        const health = healthRes.data as ClientHealthProfile | null;
        setHealthProfile(health);

        // Pre-populate conditions from client health profile
        const medConditions: string[] = Array.isArray(health?.medical_conditions)
          ? (health!.medical_conditions as string[])
          : [];

        // Pre-populate form from existing assessment (if any)
        const existing = assessmentRes.data as ExistingAssessment | null;
        if (existing) {
          setForm({
            fitness_level:          existing.fitness_level ?? null,
            health_notes:           existing.health_notes ?? '',
            trainer_recommendation: existing.trainer_recommendation ?? '',
            clearance_status:       existing.clearance_status ?? null,
            flagged_conditions:     medConditions,
          });
        } else {
          setForm(prev => ({ ...prev, flagged_conditions: medConditions }));
        }
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

  const canSubmit =
    form.fitness_level !== null &&
    form.clearance_status !== null &&
    form.health_notes.trim().length > 0;

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() ?? '?';

  const age = healthProfile?.dob ? calculateAge(healthProfile.dob) : null;
  const goals: string[]        = Array.isArray(healthProfile?.goals) ? (healthProfile!.goals as string[]) : [];
  const medConditions: string[] = Array.isArray(healthProfile?.medical_conditions) ? (healthProfile!.medical_conditions as string[]) : [];

  // ── Handlers ────────────────────────────────────────────────────────────────

  const toggleCondition = (cond: string) => {
    setForm(prev => ({
      ...prev,
      flagged_conditions: prev.flagged_conditions.includes(cond)
        ? prev.flagged_conditions.filter(c => c !== cond)
        : [...prev.flagged_conditions, cond],
    }));
  };

  const handleSubmit = async () => {
    if (!canSubmit || !userId || !clientId) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const result = await submitAssessment(userId, clientId, {
        fitness_level:          form.fitness_level!,
        health_notes:           form.health_notes,
        trainer_recommendation: form.trainer_recommendation,
        clearance_status:       form.clearance_status!,
      });
      if (!result.success) throw new Error(result.error ?? 'Submission failed.');
      navigate('/assessment/clients/queue');
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setIsSubmitting(false);
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
          <div className="px-5 pt-4 space-y-5">

            {/* ── Client Profile Card (read-only) ── */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              {/* Avatar + name row */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0"
                  style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}
                >
                  {initials}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{profile?.full_name ?? '—'}</p>
                  {profile?.city && (
                    <p className="text-sm text-gray-500">{profile.city}</p>
                  )}
                </div>
              </div>

              {/* Age + gender */}
              {(age !== null || healthProfile?.gender) && (
                <div className="flex gap-4 mb-3 text-sm text-gray-600">
                  {age !== null && (
                    <span>Age: <span className="font-semibold text-gray-800">{age}</span></span>
                  )}
                  {healthProfile?.gender && (
                    <span>Gender: <span className="font-semibold text-gray-800 capitalize">{healthProfile.gender}</span></span>
                  )}
                </div>
              )}

              {/* Goals chips */}
              {goals.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {goals.map((goal, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ backgroundColor: '#f0fdfa', color: '#0d9488' }}
                    >
                      {goal}
                    </span>
                  ))}
                </div>
              )}

              {/* Medical condition chips */}
              {medConditions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {medConditions.map((cond, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ backgroundColor: '#fffbeb', color: '#d97706' }}
                    >
                      {cond}
                    </span>
                  ))}
                </div>
              )}

              {/* Empty health profile state */}
              {!healthProfile && (
                <p className="text-sm text-gray-400 italic">No health profile submitted yet</p>
              )}
            </div>

            {/* ── Section 1: Fitness Level ── */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Fitness Level</p>
              <div className="flex gap-2">
                {FITNESS_LEVELS.map(({ value, label }) => {
                  const selected = form.fitness_level === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setForm(prev => ({ ...prev, fitness_level: value }))}
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

            {/* ── Section 2: Health Notes ── */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Health Notes</p>
              <textarea
                value={form.health_notes}
                onChange={e => setForm(prev => ({ ...prev, health_notes: e.target.value }))}
                placeholder="Observations, limitations, medical considerations..."
                className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                style={{ minHeight: '100px' }}
              />
            </div>

            {/* ── Section 3: Conditions Checklist ── */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Flag Conditions</p>
              {/* Horizontal scroll, hide scrollbar */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {CONDITION_OPTIONS.map(cond => {
                  const selected = form.flagged_conditions.includes(cond);
                  return (
                    <button
                      key={cond}
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

            {/* ── Section 4: Trainer Recommendation ── */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Trainer Recommendation</p>
              <textarea
                value={form.trainer_recommendation}
                onChange={e => setForm(prev => ({ ...prev, trainer_recommendation: e.target.value }))}
                placeholder="Recommended training approach, restrictions, trainer notes..."
                className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                style={{ minHeight: '100px' }}
              />
            </div>

            {/* ── Section 5: Clearance Decision ── */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Clearance Status</p>
              <div className="space-y-2">
                {CLEARANCE_OPTIONS.map(({ value, icon, label, description, activeBg, activeBorder, activeText }) => {
                  const selected = form.clearance_status === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setForm(prev => ({ ...prev, clearance_status: value }))}
                      className="w-full p-4 rounded-xl flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
                      style={
                        selected
                          ? { backgroundColor: activeBg, border: `2px solid ${activeBorder}` }
                          : { backgroundColor: '#ffffff', border: '2px solid #e5e7eb' }
                      }
                    >
                      <span className="text-xl leading-none">{icon}</span>
                      <div>
                        <p
                          className="font-semibold text-sm"
                          style={{ color: selected ? activeText : '#374151' }}
                        >
                          {label}
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: selected ? activeText : '#9ca3af' }}
                        >
                          {description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit error */}
            {submitError && (
              <div className="bg-red-50 p-3 rounded-lg flex items-start gap-2 border border-red-100">
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            )}

            {/* ── Submit Button ── */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              style={{
                backgroundColor: canSubmit && !isSubmitting ? '#0d9488' : '#9ca3af',
              }}
            >
              {isSubmitting && <Loader2 size={18} className="animate-spin" />}
              {isSubmitting ? 'Saving...' : 'Submit Assessment'}
            </button>

          </div>
        )}
      </div>

      <AssessmentBottomNav />
    </MobileShell>
  );
}
