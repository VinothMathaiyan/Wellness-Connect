import { useState, useEffect } from 'react';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import MobileShell from '../../../components/MobileShell';
import TrainerBottomNav from '../components/TrainerBottomNav';
import { useWellness } from '../../../context/WellnessContext';
import { supabase } from '../../../lib/supabaseClient';
import {
  markAlertRead,
  getTrainerAllRiskAlerts,
  saveAlertNotes,
  createEscalation,
  getAssessorId,
  type TrainerRiskAlert,
} from '../../../services/supabaseService';
import { formatDate } from '@/utils/dateUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskLevel = 'red' | 'amber' | 'green';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALERT_TYPE_LABELS: Record<string, string> = {
  mood_drop:      'Mood Drop',
  sleep_drop:     'Sleep Quality Drop',
  missed_workout: 'Missed Workout Sessions',
  hydration:      'Hydration Levels Low',
  general:        'General Wellness Flag',
  low_readiness:  'Low Readiness',
  high_pain:      'High Pain',
};

function severityToRiskLevel(severity: 'low' | 'medium' | 'high'): RiskLevel {
  if (severity === 'high') return 'red';
  if (severity === 'medium') return 'amber';
  return 'green';
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RiskAlertScreen() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useWellness();

  const [alert, setAlert] = useState<TrainerRiskAlert | null>(
    (location.state as { alert?: TrainerRiskAlert } | null)?.alert ?? null,
  );
  const [isLoading, setIsLoading] = useState(!alert);
  const [notes, setNotes] = useState(
    (location.state as { alert?: TrainerRiskAlert } | null)?.alert?.trainer_notes ?? '',
  );
  const [toast, setToast] = useState<string | null>(null);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedAt, setNotesSavedAt] = useState<number | null>(null);
  const [notesError, setNotesError] = useState<string | null>(null);

  // Escalation compose state
  const [escalationNote, setEscalationNote] = useState('');
  const [escalateStatus, setEscalateStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [escalateError, setEscalateError]   = useState<string | null>(null);

  // ── On mount: resolve alert data + mark as read ──────────────────────────────
  useEffect(() => {
    const resolved = (location.state as { alert?: TrainerRiskAlert } | null)?.alert;

    if (resolved) {
      // Data came through navigation state — mark read immediately
      markAlertRead(resolved.id);
      setAlert(resolved);
      setNotes(resolved.trainer_notes ?? '');
      setIsLoading(false);
      return;
    }

    // Fallback: fetch all alerts for this trainer and filter by clientId
    if (!userId || !clientId) {
      setIsLoading(false);
      return;
    }

    getTrainerAllRiskAlerts(userId).then(alerts => {
      const match = alerts.find(a => a.client_id === clientId);
      if (match) {
        markAlertRead(match.id);
        setAlert(match);
        setNotes(match.trainer_notes ?? '');
      }
      setIsLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived values ───────────────────────────────────────────────────────────
  const riskLevel: RiskLevel = alert ? severityToRiskLevel(alert.severity) : 'amber';
  const clientName = alert?.client?.full_name ?? 'Client';

  // ── Handlers ────────────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleEscalate = async () => {
    if (!alert || !userId || !clientId || escalateStatus === 'sending' || escalateStatus === 'sent') return;
    setEscalateStatus('sending');
    setEscalateError(null);

    try {
      const [escalationRes, assessorId] = await Promise.all([
        createEscalation(clientId, 'trainer', alert.id),
        getAssessorId(),
      ]);

      if (!escalationRes.success) {
        throw new Error(escalationRes.error ?? 'Failed to escalate.');
      }

      if (assessorId) {
        await supabase.from('notifications').insert({
          type: 'risk_escalation',
          from_user_id: userId,
          to_user_id: assessorId,
          message: escalationNote.trim() || `Trainer has escalated a risk alert for client ${clientName}.`,
          is_read: false,
        });
      }

      setEscalateStatus('sent');
    } catch (err: unknown) {
      setEscalateStatus('error');
      setEscalateError(err instanceof Error ? err.message : 'Failed to escalate. Please try again.');
    }
  };

  const handleSaveNotes = async () => {
    if (!alert || isSavingNotes) return;
    setIsSavingNotes(true);
    setNotesError(null);
    const result = await saveAlertNotes(alert.id, notes);
    setIsSavingNotes(false);
    if (result.success) {
      setNotesSavedAt(Date.now());
      setTimeout(() => setNotesSavedAt(null), 3000);
    } else {
      setNotesError(result.error ?? 'Could not save notes. Please try again.');
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <MobileShell>
        <div className="flex flex-col min-h-full bg-gray-50">
          <div className="bg-white px-4 pt-6 pb-4 flex items-start gap-3 shadow-sm">
            <button
              onClick={() => navigate(-1)}
              className="mt-0.5 p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
              aria-label="Go back"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Risk Alert</h1>
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mt-1" />
            </div>
          </div>
          <div className="flex-1 px-4 pt-4 space-y-3 animate-pulse">
            <div className="h-14 bg-gray-200 rounded-2xl" />
            <div className="h-24 bg-white rounded-2xl shadow-sm" />
            <div className="h-32 bg-white rounded-2xl shadow-sm" />
          </div>
        </div>
        <TrainerBottomNav />
      </MobileShell>
    );
  }

  // ── No alert found ───────────────────────────────────────────────────────────
  if (!alert) {
    return (
      <MobileShell>
        <div className="flex flex-col min-h-full bg-gray-50">
          <div className="bg-white px-4 pt-6 pb-4 flex items-start gap-3 shadow-sm">
            <button
              onClick={() => navigate(-1)}
              className="mt-0.5 p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
              aria-label="Go back"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Risk Alert</h1>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
            <AlertTriangle size={36} className="text-gray-300" />
            <p className="text-sm text-gray-400 font-medium text-center">
              Alert not found or may have already been resolved.
            </p>
            <button
              onClick={() => navigate(-1)}
              className="mt-2 text-sm text-teal-600 font-semibold underline underline-offset-2"
            >
              Go back
            </button>
          </div>
        </div>
        <TrainerBottomNav />
      </MobileShell>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <MobileShell>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium pointer-events-none">
          <AlertTriangle size={15} />
          {toast}
        </div>
      )}

      <div className="flex flex-col min-h-full bg-gray-50">

        {/* ── 1. Header ──────────────────────────────────────────────────────── */}
        <div className="bg-white px-4 pt-6 pb-4 flex items-start gap-3 shadow-sm">
          <button
            onClick={() => navigate(-1)}
            className="mt-0.5 p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Risk Alert</h1>
            <p className="text-sm text-gray-500 mt-0.5">{clientName}</p>
          </div>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-4">

          {/* ── 2. Alert Level Badge ────────────────────────────────────────────── */}
          <div>
            {riskLevel === 'red' ? (
              <div
                className="w-full rounded-2xl p-4 flex items-center gap-3"
                style={{ backgroundColor: '#ef4444' }}
              >
                <AlertTriangle size={20} className="flex-shrink-0" style={{ color: '#ffffff' }} />
                <span className="text-[15px] font-bold" style={{ color: '#ffffff' }}>
                  Immediate Action Required
                </span>
              </div>
            ) : riskLevel === 'amber' ? (
              <div
                className="w-full rounded-2xl p-4 flex items-center gap-3"
                style={{ backgroundColor: '#fbbf24' }}
              >
                <AlertTriangle size={20} className="flex-shrink-0" style={{ color: '#78350f' }} />
                <span className="text-[15px] font-bold" style={{ color: '#78350f' }}>
                  Monitor Closely
                </span>
              </div>
            ) : (
              <div
                className="w-full rounded-2xl p-4 flex items-center gap-3"
                style={{ backgroundColor: '#d1fae5' }}
              >
                <AlertTriangle size={20} className="flex-shrink-0" style={{ color: '#065f46' }} />
                <span className="text-[15px] font-bold" style={{ color: '#065f46' }}>
                  Low Risk — Monitor
                </span>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2 px-1">
              Generated by Risk Engine · {formatDate(alert.created_at)}
            </p>
          </div>

          {/* ── 3. Alert Details ────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Alert Details
            </p>

            {/* Alert type */}
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">Type</span>
              <span className="text-sm font-semibold text-gray-800">
                {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
              </span>
            </div>

            {/* Message */}
            {alert.message && (
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">Details</span>
                <span className="text-sm text-gray-700 leading-relaxed">{alert.message}</span>
              </div>
            )}

            {/* Read status */}
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">Status</span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#d1fae5', color: '#065f46' }}
              >
                Acknowledged
              </span>
            </div>
          </div>

          {/* ── 4. Action Notes ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Your Action Notes
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Describe the action you're taking — plan adjustment, client contact, escalation reason..."
              className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-xs text-gray-400">Stored with this alert for audit trail</p>
              <p className="text-xs text-gray-400">{notes.length} characters</p>
            </div>
            <button
              onClick={handleSaveNotes}
              disabled={isSavingNotes}
              className="mt-3 w-full bg-gray-900 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
            >
              {isSavingNotes ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Notes'
              )}
            </button>
            {notesSavedAt && !notesError && (
              <p className="text-xs text-green-600 font-medium mt-2 text-center">
                Notes saved
              </p>
            )}
            {notesError && (
              <p className="text-xs text-red-600 font-medium mt-2 text-center">
                {notesError}
              </p>
            )}
          </div>

          {/* ── 5. Action Buttons ───────────────────────────────────────────────── */}
          <div className="space-y-3 pt-1">

            {/* Button A — Adjust Training Plan */}
            <div>
              <button
                onClick={() =>
                  navigate(`/trainer/program-builder/${clientId}?mode=regress`)
                }
                className="w-full bg-teal-600 text-white text-sm font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 active:opacity-90 transition-opacity"
              >
                Adjust Training Plan
              </button>
              <p className="text-xs text-gray-400 text-center mt-1.5">
                Opens Program Builder in regress mode
              </p>
            </div>

            {/* Button B — Escalate compose box */}
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
              }}
            >
              <p
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: '#dc2626' }}
              >
                Escalate to Assessment Team
              </p>
              <textarea
                rows={3}
                value={escalationNote}
                onChange={e => setEscalationNote(e.target.value)}
                placeholder="Add context for the assessment team..."
                disabled={escalateStatus === 'sent'}
                className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
              />
              <button
                onClick={handleEscalate}
                disabled={escalateStatus === 'sending' || escalateStatus === 'sent'}
                className="w-full text-sm font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-opacity"
                style={{
                  backgroundColor: escalateStatus === 'sent' ? '#9ca3af' : '#dc2626',
                  color: '#ffffff',
                  opacity: escalateStatus === 'sending' ? 0.7 : 1,
                  cursor: escalateStatus === 'sent' ? 'default' : 'pointer',
                }}
              >
                {escalateStatus === 'sending' && (
                  <span
                    className="w-4 h-4 rounded-full border-2 animate-spin"
                    style={{ borderColor: '#ffffff', borderTopColor: 'transparent' }}
                  />
                )}
                {escalateStatus === 'sending'
                  ? 'Sending...'
                  : 'Escalate to Assessment Team'}
              </button>
              {escalateStatus === 'error' && escalateError && (
                <p className="text-xs font-medium text-center" style={{ color: '#dc2626' }}>
                  {escalateError}
                </p>
              )}
              {escalateStatus === 'sent' && (
                <p className="text-xs font-medium text-center" style={{ color: '#16a34a' }}>
                  Escalation raised — Assessment team notified ✓
                </p>
              )}
            </div>

          </div>
        </div>
      </div>
      <TrainerBottomNav />
    </MobileShell>
  );
}
