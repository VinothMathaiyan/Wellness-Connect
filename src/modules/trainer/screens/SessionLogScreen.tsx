import { useState, useEffect, useRef } from 'react';
import { Save, Clock, AlertTriangle, CheckCircle, X, ChevronLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import MobileShell from '../../../components/MobileShell';
import TrainerBottomNav from '../components/TrainerBottomNav';
import { useWellness } from '../../../context/WellnessContext';
import { insertSessionLog } from '../../../services/supabaseService';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_CLIENTS: Record<string, string> = {
  '1': 'Alex Johnson',
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PREDEFINED_EXERCISES = [
  'Squats', 'Lunges', 'Hip Bridges', 'Deadlifts', 'Rows',
  'Shoulder Press', 'Plank', 'Walking', 'Cycling', 'Stretching',
  'Foam Rolling', 'Resistance Bands', 'Core Work', 'Balance Training',
];

type SessionStatus = '' | 'completed' | 'no_show' | 'cancelled' | 'cancelled_trainer';

interface DraftData {
  notes: string;
  date: string;
  status: SessionStatus;
  exercises: string[];
  effortScore: number | null;
  savedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SessionLogScreen() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { userId } = useWellness();

  const clientName = MOCK_CLIENTS[clientId ?? ''] ?? 'Client';
  const draftKey = `session-draft-${clientId}`;

  const today = toLocalDateString(new Date());
  const sevenDaysAgo = toLocalDateString(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  // ── Form state ──────────────────────────────────────────────────────────────
  const [date, setDate] = useState(today);
  const [status, setStatus] = useState<SessionStatus>('');
  const [notes, setNotes] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [effortScore, setEffortScore] = useState<number | null>(null);

  // ── Draft state ─────────────────────────────────────────────────────────────
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [restoredAt, setRestoredAt] = useState<string | null>(null);

  // ── Submit state ────────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Toast state ─────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null);

  // Keep a ref to latest form values so the interval closure doesn't go stale
  const formRef = useRef({ notes, date, status, exercises: selectedExercises, effortScore });
  useEffect(() => {
    formRef.current = { notes, date, status, exercises: selectedExercises, effortScore };
  });

  // Restore draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft: DraftData = JSON.parse(raw);
        if (draft.notes) setNotes(draft.notes);
        if (draft.date) setDate(draft.date);
        if (draft.status) setStatus(draft.status);
        if (Array.isArray(draft.exercises)) setSelectedExercises(draft.exercises);
        if (draft.effortScore !== undefined) setEffortScore(draft.effortScore);
        setRestoredAt(draft.savedAt);
      }
    } catch {
      // ignore corrupt draft
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save every 30 seconds — interval is stable; reads values via ref
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date().toISOString();
      const { notes, date, status, exercises, effortScore } = formRef.current;
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ notes, date, status, exercises, effortScore, savedAt: now }),
        );
        setDraftSavedAt(now);
      } catch {
        // ignore storage quota errors
      }
    }, 30000);

    return () => clearInterval(id);
  // draftKey is stable for the lifetime of this component (depends only on clientId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const toggleExercise = (ex: string) =>
    setSelectedExercises(prev =>
      prev.includes(ex) ? prev.filter(e => e !== ex) : [...prev, ex],
    );

  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !customInput.trim()) return;
    e.preventDefault();
    const val = customInput.trim();
    if (!selectedExercises.includes(val)) {
      setSelectedExercises(prev => [...prev, val]);
    }
    setCustomInput('');
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const clearDraft = () => {
    try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
    setRestoredAt(null);
    setNotes('');
    setDate(today);
    setStatus('');
    setSelectedExercises([]);
    setEffortScore(null);
    setDraftSavedAt(null);
  };

  const handleSave = async () => {
    if (!status || isSubmitting) return;
    if (!userId || !clientId) {
      setSubmitError('Unable to save — session expired. Please log in again.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const success = await insertSessionLog(userId, clientId, {
      session_date: date,
      status,
      notes,
      exercises: selectedExercises,
      effort_score: effortScore,
    });

    setIsSubmitting(false);

    if (success) {
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
      showToast('Session note saved successfully');
      setTimeout(() => navigate(`/trainer/client/${clientId}`), 1500);
    } else {
      setSubmitError('Failed to save session note. Please try again.');
    }
  };

  // ── Computed ────────────────────────────────────────────────────────────────
  const customExercises = selectedExercises.filter(ex => !PREDEFINED_EXERCISES.includes(ex));

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
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Log Session Note</h1>
            <p className="text-sm text-gray-500 mt-0.5">{clientName}</p>
          </div>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-3">

          {/* Draft restored banner */}
          {restoredAt && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-amber-600 flex-shrink-0" />
                <span className="text-sm text-amber-800">
                  Draft restored from {formatTime(restoredAt)}
                </span>
              </div>
              <button
                onClick={clearDraft}
                className="text-xs text-amber-700 underline underline-offset-2 flex-shrink-0"
              >
                Clear draft
              </button>
            </div>
          )}

          {/* ── Session Date ──────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Session Date
            </label>
            <input
              type="date"
              value={date}
              min={sevenDaysAgo}
              max={today}
              onChange={e => setDate(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              You can log notes for sessions within the last 7 days
            </p>
          </div>

          {/* ── Session Status ────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Session Status
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as SessionStatus)}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="" disabled>Select status...</option>
              <option value="completed">Completed</option>
              <option value="no_show">Client No-show</option>
              <option value="cancelled">Cancelled by Client</option>
              <option value="cancelled_trainer">Cancelled by Trainer</option>
            </select>

            {status === 'no_show' && (
              <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 font-medium">
                  No-show will be recorded against client adherence
                </p>
              </div>
            )}
          </div>

          {/* ── Session Notes ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Session Notes
            </label>
            <p className="text-xs text-gray-400 mb-2">
              This note is visible to the Assessment Team and your client
            </p>
            <textarea
              rows={5}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Describe what was covered, client's response, observations, anything the assessment team should know..."
              className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <div className="flex items-center justify-between mt-1.5">
              {draftSavedAt ? (
                <span className="text-xs text-gray-400">
                  Draft saved at {formatTime(draftSavedAt)}
                </span>
              ) : (
                <span />
              )}
              <span className="text-xs text-gray-400">{notes.length} characters</span>
            </div>
          </div>

          {/* ── Exercises Covered ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Exercises Covered
            </label>

            <div className="flex flex-wrap gap-2 mb-3">
              {PREDEFINED_EXERCISES.map(ex => {
                const isSelected = selectedExercises.includes(ex);
                return (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => toggleExercise(ex)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {ex}
                  </button>
                );
              })}

              {customExercises.map(ex => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => toggleExercise(ex)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-teal-600 text-white"
                >
                  + {ex}
                  <X size={10} />
                </button>
              ))}
            </div>

            <input
              type="text"
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={handleCustomKeyDown}
              placeholder="Add custom exercise..."
              className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-xs text-gray-400 mt-1" style={{ color: '#9ca3af' }}>
              Press Enter to add to the list
            </p>

            {selectedExercises.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {selectedExercises.length} exercise{selectedExercises.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* ── Trainer Effort Score ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Rate Client Effort (optional)
            </label>
            <p className="text-xs text-gray-400 mb-3">1 = minimal effort · 5 = maximum effort</p>
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setEffortScore(prev => (prev === n ? null : n))}
                  className={`w-11 h-11 rounded-xl text-sm font-bold border transition-colors ${
                    effortScore === n
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-teal-400'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* ── Save ─────────────────────────────────────────────────────────── */}
          <div className="pt-1">
            {submitError && (
              <div className="mb-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium">{submitError}</p>
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={!status || isSubmitting}
              className="w-full bg-teal-600 text-white text-sm font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Session Note
                </>
              )}
            </button>
            <p className="text-xs text-gray-400 text-center mt-2">
              Saving will notify the Assessment Team of a readiness signal update
            </p>
          </div>

        </div>
      </div>
      <TrainerBottomNav />
    </MobileShell>
  );
}
