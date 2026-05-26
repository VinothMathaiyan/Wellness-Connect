import { useState, useEffect } from 'react';
import { Plus, Trash2, Send, CheckCircle, ChevronLeft, AlertTriangle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import MobileShell from '../../../components/MobileShell';
import TrainerBottomNav from '../components/TrainerBottomNav';
import { useWellness } from '../../../context/WellnessContext';
import { getClientDetail, updatePlanTrainerNote, getClientSessions } from '../../../services/supabaseService';
import { formatDateLong } from '@/utils/dateUtils';
import type { TrainerClientSession } from '../../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExerciseRow {
  name: string;
  sets: string;
  reps: string;
  notes: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_EXERCISES = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format session time in 12-hour format with IST timezone */
function formatSessionTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Derive current week number from plan creation date */
function computeWeekNumber(createdAt: string): number {
  const startMs = new Date(createdAt).getTime();
  const diffWeeks = Math.ceil((Date.now() - startMs) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, diffWeeks);
}

/**
 * Pack focus + trainerNote into a single trainer_note string.
 * Split on this sentinel when loading so both fields round-trip cleanly.
 */
const NOTE_SEPARATOR = '\n\n---trainer-note---\n\n';

function packNote(focus: string, note: string): string {
  return `${focus}${NOTE_SEPARATOR}${note}`;
}

function unpackNote(raw: string): { focus: string; note: string } {
  const parts = raw.split(NOTE_SEPARATOR);
  return { focus: parts[0] ?? '', note: parts[1] ?? '' };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyRow(): ExerciseRow {
  return { name: '', sets: '', reps: '', notes: '' };
}

function fromMock(e: { name: string; sets: number; reps: number; notes: string }): ExerciseRow {
  return { name: e.name, sets: String(e.sets), reps: String(e.reps), notes: e.notes };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WeeklyPlanScreen() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { userId } = useWellness();

  // ── Remote data ─────────────────────────────────────────────────────────────
  const [clientName, setClientName] = useState('Client');
  const [weekLabel, setWeekLabel] = useState('Current Week');
  const [nextSession, setNextSession] = useState<TrainerClientSession | null>(null);
  const [sessions, setSessions] = useState<TrainerClientSession[]>([]);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [focus, setFocus] = useState('');
  const [exercises, setExercises] = useState<ExerciseRow[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [trainerNote, setTrainerNote] = useState('');

  // ── Submit state ────────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // ── Fetch client + plan on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (!userId || !clientId) { setIsLoadingPlan(false); return; }
    
    Promise.all([
      getClientDetail(clientId, userId),
      getClientSessions(clientId, userId)
    ]).then(([ { profile, currentPlan }, allSessions ]) => {
      if (profile?.full_name) setClientName(profile.full_name);
      
      setSessions(allSessions);
      const upcoming = allSessions.filter(s => s.status === 'scheduled' && new Date(s.scheduled_at).getTime() >= Date.now());
      if (upcoming.length > 0) {
        setNextSession(upcoming[0]);
      }

      if (currentPlan) {
        const tpl = currentPlan.template as { duration_weeks?: number } | null;
        const weekNum = computeWeekNumber((currentPlan as any).created_at ?? new Date().toISOString());
        const totalWeeks = tpl?.duration_weeks ?? '?';
        setWeekLabel(`Week ${weekNum} of ${totalWeeks}`);
        if (currentPlan.trainer_note) {
          const { focus: f, note: n } = unpackNote(currentPlan.trainer_note);
          setFocus(f);
          setTrainerNote(n);
        }
      }
      setIsLoadingPlan(false);
    });
  }, [userId, clientId]);

  // ── Exercise row handlers ───────────────────────────────────────────────────

  const updateRow = (index: number, field: keyof ExerciseRow, value: string) =>
    setExercises(prev =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );

  const removeRow = (index: number) =>
    setExercises(prev => prev.filter((_, i) => i !== index));

  const addRow = () => {
    if (exercises.length < MAX_EXERCISES) setExercises(prev => [...prev, emptyRow()]);
  };

  // ── Toast / submit ──────────────────────────────────────────────────────────

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handlePublish = async () => {
    if (!focus.trim() || isSubmitting) return;
    if (!userId || !clientId) {
      setSubmitError('Session expired — please log in again.');
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);

    const success = await updatePlanTrainerNote(
      userId,
      clientId,
      packNote(focus.trim(), trainerNote.trim()),
    );

    setIsSubmitting(false);

    if (success) {
      showToast('Weekly plan published successfully');
      setTimeout(() => navigate(-1), 2000);
    } else {
      setSubmitError('Failed to publish plan. Please try again.');
    }
  };

  const canPublish = focus.trim().length > 0 && !isSubmitting;

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
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              Weekly Plan Update
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isLoadingPlan ? '...' : `${clientName} — ${weekLabel}`}
            </p>
          </div>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-3">

          {/* ── Week Indicator ────────────────────────────────────────────────── */}
          <div className="flex flex-col items-center py-3">
            <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-teal-50 text-teal-700 text-sm font-semibold border border-teal-100">
              {weekLabel}
            </span>
            {nextSession ? (
              <p className="text-xs text-teal-600 font-medium mt-2">
                Next Session: {formatDateLong(nextSession.scheduled_at)} at {formatSessionTime(nextSession.scheduled_at)}
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-2">
                You are updating the plan for the current week
              </p>
            )}
          </div>

          {/* ── Weekly Calendar Strip ─────────────────────────────────────────── */}
          {(() => {
            const hasSession = (day: Date) => sessions.some(s => {
              const sessionDate = new Date(s.scheduled_at);
              return sessionDate.toDateString() === day.toDateString();
            });
            
            const today = new Date();
            const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
            const currentDayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - currentDayOfWeek);
            
            return (
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '8px',
                }}>
                  {Array.from({ length: 7 }).map((_, i) => {
                    const day = new Date(weekStart);
                    day.setDate(weekStart.getDate() + i);
                    const dayNum = day.getDate();
                    const hasSesh = hasSession(day);
                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '8px 4px',
                          borderRadius: '8px',
                          backgroundColor: i === currentDayOfWeek ? '#F0FDFA' : 'transparent',
                          borderLeft: i === currentDayOfWeek ? '2px solid #14B8A6' : 'none',
                        }}
                      >
                        <div style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280', marginBottom: '4px' }}>
                          {dayLabels[i]}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
                          {dayNum}
                        </div>
                        {hasSesh && (
                          <div style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: '#00897B',
                            margin: '2px auto 0'
                          }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── This Week's Focus ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              This Week's Focus
            </label>
            <textarea
              rows={3}
              value={focus}
              onChange={e => setFocus(e.target.value)}
              placeholder="e.g. Focus on rebuilding confidence with bodyweight movements after last week's soreness..."
              className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Published to the client's home dashboard
            </p>
          </div>

          {/* ── Exercise List ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-medium text-gray-700 mb-0 block">
              Exercises This Week
            </label>
            <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '2px', marginBottom: '12px' }}>
              Optional — leave blank if not planning exercises this week
            </p>

            <div className="space-y-2">
              {exercises.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {/* Exercise name */}
                  <input
                    type="text"
                    value={row.name}
                    onChange={e => updateRow(idx, 'name', e.target.value)}
                    placeholder="Exercise name"
                    className="flex-1 min-w-0 rounded-xl border border-gray-200 px-2.5 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  {/* Sets */}
                  <input
                    type="number"
                    value={row.sets}
                    onChange={e => updateRow(idx, 'sets', e.target.value)}
                    placeholder="Sets"
                    min={1}
                    className="w-14 rounded-xl border border-gray-200 px-2 py-2 text-xs text-center text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  {/* Reps */}
                  <input
                    type="number"
                    value={row.reps}
                    onChange={e => updateRow(idx, 'reps', e.target.value)}
                    placeholder="Reps"
                    min={1}
                    className="w-14 rounded-xl border border-gray-200 px-2 py-2 text-xs text-center text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  {/* Notes */}
                  <input
                    type="text"
                    value={row.notes}
                    onChange={e => updateRow(idx, 'notes', e.target.value)}
                    placeholder="Notes (optional)"
                    className="flex-1 min-w-0 rounded-xl border border-gray-200 px-2.5 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    aria-label="Remove exercise"
                    className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            {exercises.length < MAX_EXERCISES && (
              <button
                type="button"
                onClick={addRow}
                className="mt-3 w-full py-2.5 rounded-xl border border-teal-200 text-teal-600 text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-teal-50 transition-colors active:bg-teal-100"
              >
                <Plus size={15} />
                Add Exercise
              </button>
            )}
          </div>

          {/* ── Trainer's Note ────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Trainer's Note
            </label>
            <textarea
              rows={3}
              value={trainerNote}
              onChange={e => setTrainerNote(e.target.value)}
              placeholder="Write a personal note for the client — encouragement, reminders, or coaching cues..."
              className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Shown as 'Trainer's Note' in the client's session detail view
            </p>
          </div>

          {/* ── Publish ───────────────────────────────────────────────────────── */}
          <div className="pt-1">
            {submitError && (
              <div className="mb-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium">{submitError}</p>
              </div>
            )}
            <button
              onClick={handlePublish}
              disabled={!canPublish}
              className="w-full bg-teal-600 text-white text-sm font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Publish Weekly Plan
                </>
              )}
            </button>
            <p className="text-xs text-gray-400 text-center mt-2">
              The client will be notified when the plan is published
            </p>
          </div>

        </div>
      </div>
      <TrainerBottomNav />
    </MobileShell>
  );
}
