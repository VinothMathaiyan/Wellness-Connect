import { useState, useEffect } from 'react';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import MobileShell from '../../../components/MobileShell';
import { useWellness } from '../../../context/WellnessContext';
import {
  markAlertRead,
  getTrainerAllRiskAlerts,
  type TrainerRiskAlert,
} from '../../../services/supabaseService';

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskLevel = 'red' | 'amber' | 'green';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALERT_TYPE_LABELS: Record<string, string> = {
  mood_drop:      'Mood Drop',
  sleep_drop:     'Sleep Quality Drop',
  missed_workout: 'Missed Workout Sessions',
  hydration:      'Hydration Levels Low',
  general:        'General Wellness Flag',
};

function severityToRiskLevel(severity: 'low' | 'medium' | 'high'): RiskLevel {
  if (severity === 'high') return 'red';
  if (severity === 'medium') return 'amber';
  return 'green';
}

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString([], {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
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
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // ── On mount: resolve alert data + mark as read ──────────────────────────────
  useEffect(() => {
    const resolved = (location.state as { alert?: TrainerRiskAlert } | null)?.alert;

    if (resolved) {
      // Data came through navigation state — mark read immediately
      markAlertRead(resolved.id);
      setAlert(resolved);
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

  const handleEscalate = () => {
    showToast('Escalated to Assessment Team. They will be notified.');
    setTimeout(() => navigate(-1), 2000);
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
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-10 space-y-4">

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

            {/* Button B — Escalate (red only) */}
            <div>
              <button
                onClick={handleEscalate}
                disabled={riskLevel !== 'red'}
                className={`w-full border-2 border-red-500 text-red-600 text-sm font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-opacity ${
                  riskLevel !== 'red' ? 'opacity-40 cursor-not-allowed' : 'active:opacity-80'
                }`}
              >
                <AlertTriangle size={16} />
                Escalate to Assessment Team
              </button>
              {riskLevel !== 'red' && (
                <p className="text-xs text-gray-400 text-center mt-1.5">
                  Escalation available for critical alerts only
                </p>
              )}
            </div>

          </div>
        </div>
      </div>
    </MobileShell>
  );
}
