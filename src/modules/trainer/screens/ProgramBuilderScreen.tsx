import { useState, useEffect } from 'react';
import { Plus, Trash2, Send, CheckCircle, ChevronLeft, Minus, AlertTriangle } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import MobileShell from '../../../components/MobileShell';
import { useWellness } from '../../../context/WellnessContext';
import { getClientDetail, createWorkoutProgram } from '../../../services/supabaseService';

// ─── Constants ────────────────────────────────────────────────────────────────

const FOCUS_AREA_OPTIONS = [
  'Strength', 'Mobility', 'Knee-safe', 'Low-impact',
  'Core', 'Cardiovascular', 'Flexibility', 'Balance',
  'Rehabilitation', 'Weight Loss', 'Endurance', 'Posture',
];

const MAX_GOALS = 6;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProgramBuilderScreen() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userId } = useWellness();

  const isRegressMode = searchParams.get('mode') === 'regress';

  // ── Remote data ─────────────────────────────────────────────────────────────
  const [clientName, setClientName] = useState('Client');
  const [isLoadingProgram, setIsLoadingProgram] = useState(true);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [programName, setProgramName] = useState('');
  const [durationWeeks, setDurationWeeks] = useState('12');
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  // goals and focusAreas are UI-only — no DB columns yet
  const [goals, setGoals] = useState<string[]>(['', '']);
  const [focusAreas, setFocusAreas] = useState<string[]>(
    isRegressMode ? ['Low-impact', 'Rehabilitation'] : [],
  );
  const [clientNotes, setClientNotes] = useState('');

  // ── Submit state ────────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // ── Fetch client + existing program on mount ─────────────────────────────────
  useEffect(() => {
    if (!userId || !clientId) { setIsLoadingProgram(false); return; }
    getClientDetail(clientId, userId).then(({ profile, currentPlan }) => {
      if (profile?.full_name) setClientName(profile.full_name);
      if (currentPlan) {
        const tpl = currentPlan.template as { name?: string; duration_weeks?: number } | null;
        if (tpl?.name) setProgramName(tpl.name);
        if (tpl?.duration_weeks) setDurationWeeks(String(tpl.duration_weeks));
        if (currentPlan.trainer_note) setClientNotes(currentPlan.trainer_note);
      }
      setIsLoadingProgram(false);
    });
  }, [userId, clientId]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const updateGoal = (index: number, value: string) =>
    setGoals(prev => prev.map((g, i) => (i === index ? value : g)));

  const removeGoal = (index: number) =>
    setGoals(prev => prev.filter((_, i) => i !== index));

  const addGoal = () => {
    if (goals.length < MAX_GOALS) setGoals(prev => [...prev, '']);
  };

  const toggleFocusArea = (area: string) =>
    setFocusAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area],
    );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSend = async () => {
    if (!programName.trim() || !durationWeeks.trim() || isSubmitting) return;
    if (!userId || !clientId) {
      setSubmitError('Session expired — please log in again.');
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);

    const success = await createWorkoutProgram(userId, clientId, {
      name: programName.trim(),
      duration_weeks: Math.max(1, parseInt(durationWeeks, 10) || 1),
      trainer_note: clientNotes.trim() || null,
      // goals, focusAreas, sessionsPerWeek: UI-only, not persisted until schema is extended
    });

    setIsSubmitting(false);

    if (success) {
      showToast('Program sent for client approval');
      setTimeout(() => navigate(-1), 2000);
    } else {
      setSubmitError('Failed to send program. Please try again.');
    }
  };

  const canSend = programName.trim().length > 0 && durationWeeks.trim().length > 0 && !isSubmitting;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <MobileShell>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium pointer-events-none">
          <CheckCircle size={15} />
          {toast}
        </div>
      )}

      <div className="flex flex-col min-h-full bg-gray-50">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="bg-white px-4 pt-6 pb-4 flex items-start gap-3 shadow-sm">
          <button
            onClick={() => navigate(-1)}
            className="mt-0.5 p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Program Builder</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isLoadingProgram ? '...' : clientName}
            </p>
          </div>
        </div>

        {/* ── Regress Mode Banner ─────────────────────────────────────────────── */}
        {isRegressMode && (
          <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <p className="text-sm font-semibold text-amber-800">
              Regress Mode — reducing load based on risk alert
            </p>
          </div>
        )}

        {/* ── Scrollable body ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-10 space-y-3">

          {/* ── Program Name ──────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Program Name
            </label>
            <input
              type="text"
              value={programName}
              onChange={e => setProgramName(e.target.value)}
              placeholder="e.g. 12-Week Rehabilitation Foundation"
              className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              This name will be visible to the client
            </p>
          </div>

          {/* ── Duration ──────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Duration (weeks)
            </label>
            <input
              type="number"
              min={1}
              max={52}
              value={durationWeeks}
              onChange={e => setDurationWeeks(e.target.value)}
              placeholder="12"
              className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Used to calculate program end date
            </p>
          </div>

          {/* ── Sessions per Week ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              Sessions per Week
            </label>
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => setSessionsPerWeek(s => Math.max(1, s - 1))}
                disabled={sessionsPerWeek <= 1}
                aria-label="Decrease sessions per week"
                className="w-9 h-9 rounded-full border border-teal-600 text-teal-600 flex items-center justify-center disabled:opacity-40 active:bg-teal-50 transition-colors"
              >
                <Minus size={16} />
              </button>
              <span className="text-2xl font-bold text-gray-900 w-6 text-center tabular-nums">
                {sessionsPerWeek}
              </span>
              <button
                type="button"
                onClick={() => setSessionsPerWeek(s => Math.min(7, s + 1))}
                disabled={sessionsPerWeek >= 7}
                aria-label="Increase sessions per week"
                className="w-9 h-9 rounded-full border border-teal-600 text-teal-600 flex items-center justify-center disabled:opacity-40 active:bg-teal-50 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Used to calculate adherence score
            </p>
          </div>

          {/* ── Program Goals ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              Program Goals
            </label>
            <div className="space-y-2">
              {goals.map((goal, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={goal}
                    onChange={e => updateGoal(idx, e.target.value)}
                    placeholder="e.g. Improve knee stability"
                    className="flex-1 rounded-xl border border-gray-200 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeGoal(idx)}
                    aria-label="Remove goal"
                    className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {goals.length < MAX_GOALS && (
              <button
                type="button"
                onClick={addGoal}
                className="mt-3 flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
              >
                <Plus size={15} />
                Add Goal
              </button>
            )}

            <p className="text-xs text-gray-400 mt-3">
              Goals are shown to the client for approval
            </p>
          </div>

          {/* ── Focus Areas ───────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Focus Areas
            </label>
            <div className="flex flex-wrap gap-2">
              {FOCUS_AREA_OPTIONS.map(area => {
                const isSelected = focusAreas.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleFocusArea(area)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {area}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Helps match client to the right program type
            </p>
          </div>

          {/* ── Notes for Client ──────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Notes for Client
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Only visible to the client — not shared with the Assessment Team
            </p>
            <textarea
              rows={4}
              value={clientNotes}
              onChange={e => setClientNotes(e.target.value)}
              placeholder="Add any instructions, encouragement, or context the client should know about this program..."
              className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-xs text-gray-400 text-right mt-1.5">
              {clientNotes.length} characters
            </p>
          </div>

          {/* ── Send for Approval ─────────────────────────────────────────────── */}
          <div className="pt-1">
            {submitError && (
              <div className="mb-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium">{submitError}</p>
              </div>
            )}
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="w-full bg-teal-600 text-white text-sm font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send for Client Approval
                </>
              )}
            </button>
            <p className="text-xs text-gray-400 text-center mt-2 leading-relaxed px-4">
              The client will be notified and must approve before the program becomes active
            </p>
          </div>

        </div>
      </div>
    </MobileShell>
  );
}
