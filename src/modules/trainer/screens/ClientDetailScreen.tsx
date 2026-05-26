import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit,
  User,
  Calendar,
  Activity,
  ClipboardList,
  StickyNote,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import MobileShell from '../../../components/MobileShell';
import TrainerBottomNav from '../components/TrainerBottomNav';
import { useWellness } from '../../../context/WellnessContext';
import {
  getClientDetail,
  getClientSessions,
  cancelSession,
  updateSessionNote,
  markSessionComplete,
} from '../../../services/supabaseService';
import type { TrainerClientSession } from '../../../types';
import { formatDateLong, formatDate } from '@/utils/dateUtils';

// ─── Types ──────────────────────────────────────────────────────────────────

type RiskLevel = 'red' | 'amber' | 'green' | 'none';

interface ClientView {
  id: string;
  name: string;
  initials: string;
  city: string | null;
  goals: string[];
  photoUrl: string | null;
  riskLevel: RiskLevel;
  riskMessage: string | null;
  readinessScore: number | null;
  readinessDelta: number | null;
  adherenceScore: number | null;
  adherenceDelta: number | null;
  lastCheckin: {
    date: string;
    mobility: number | null;
    pain: number | null;
    energy: number | null;
  } | null;
  program: {
    name: string | null;
    totalWeeks: number | null;
    sessionsPerWeek: number | null;
    approvalStatus: string | null;
    currentWeek: number | null;
  } | null;
}

// ─── Config Maps ─────────────────────────────────────────────────────────────

const APPROVAL_BADGE: Record<string, string> = {
  approved: 'bg-emerald-50 text-emerald-700',
  pending:  'bg-amber-50 text-amber-700',
  pending_review: 'bg-amber-50 text-amber-700',
  draft:    'bg-gray-100 text-gray-500',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapSeverityToRisk(severity?: string): RiskLevel {
  if (severity === 'high') return 'red';
  if (severity === 'medium') return 'amber';
  if (severity === 'low') return 'green';
  return 'none';
}

function formatCheckinDate(logDate?: string): string {
  if (!logDate) return '';
  const formatted = formatDateLong(logDate);
  return formatted === '—' ? '' : formatted;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatSessionDate(isoString: string): string {
  return formatDateLong(isoString);
}

function formatSessionTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const SESSION_TYPE_LABEL: Record<string, string> = {
  video:      'Video',
  phone:      'Phone',
  'in-person': 'In-person',
};

function scoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
}

function calculateProgramWeek(
  createdAt: string,
  durationWeeks: number | null,
): number | null {
  if (!durationWeeks) return null;
  const start = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;
  if (week < 1) return 1;
  if (week > durationWeeks) return durationWeeks;
  return week;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider whitespace-nowrap">
        {title}
      </span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

function ScoreBar({
  label,
  value,
  maxValue = 10,
  redAbove,
}: {
  label: string;
  value: number | null;
  maxValue?: number;
  redAbove?: number;
}) {
  if (value === null) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-[12px] font-medium text-text-secondary w-16 shrink-0">{label}</span>
        <div className="flex-1 bg-gray-100 rounded-full h-1.5" />
        <span className="shrink-0 whitespace-nowrap text-right" style={{ color: '#9ca3af', fontSize: '12px' }}>No data</span>
      </div>
    );
  }
  const isRed = redAbove !== undefined && value > redAbove;
  // Inline hex fallbacks — tailwind.config overrides `red` to a single hex,
  // so utility classes like `bg-red-400` are not generated. See CLAUDE.md.
  const fillColor = isRed ? '#f87171' : '#2dd4bf'; // red-400 / teal-400
  const textColor = isRed ? '#ef4444' : '#1F2937'; // red-500 / text-primary
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] font-medium text-text-secondary w-16 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${(value / maxValue) * 100}%`,
            backgroundColor: fillColor,
          }}
        />
      </div>
      <span
        className="text-[12px] font-bold w-5 text-right shrink-0"
        style={{ color: textColor }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ClientDetailScreen() {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();
  const location = useLocation();
  const { userId } = useWellness();

  interface DailyMetricsRow {
    readiness_score: number | null;
    log_date: string;
    mobility_score: number | null;
    pain_score: number | null;
    energy_score: number | null;
    mood_score: number | null;
  }

  interface ClientDetailResponse {
    profile: { id: string; full_name: string; city: string | null; specialties: string[] | null; photo_url: string | null } | null;
    latestMetrics: DailyMetricsRow | null;
    previousMetrics: DailyMetricsRow | null;
    activeAlert: { severity: string; message: string } | null;
    currentPlan: { id: string; status: string; created_at: string; template: { name: string; duration_weeks: number; sessions_per_week: number } | null } | null;
    clientGoals: string[];
    adherence: {
      currentScore: number | null;
      previousScore: number | null;
      delta: number | null;
    };
  }

  const [clientData, setClientData] = useState<ClientDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [sessions, setSessions]         = useState<TrainerClientSession[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError]   = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const [sessionsExpanded, setSessionsExpanded] = useState(false);
  const [editingNoteSessionId, setEditingNoteSessionId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const loadClientData = useCallback(async () => {
    if (!userId || !clientId) return;
    setIsLoading(true);
    try {
      const detail = await getClientDetail(clientId, userId);
      setClientData(detail as ClientDetailResponse);
    } catch (err) {
      console.error('ClientDetail load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, clientId]);

  // Initial load + re-load when userId or clientId changes (e.g. auth hydration)
  useEffect(() => {
    loadClientData();
  }, [loadClientData]);

  // Re-load every time this route is navigated to (location.key changes on each visit)
  useEffect(() => {
    if (!clientId || !userId) return;
    loadClientData();
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!clientId || !userId) return;
    getClientSessions(clientId, userId).then(setSessions);
  }, [clientId, userId]);

  const handleCancelConfirm = async (sessionId: string) => {
    if (!clientId || !userId) return;
    const trainerId = userId;
    const cId       = clientId;
    setCancellingId(sessionId);
    setCancelError(null);
    try {
      await cancelSession(sessionId, trainerId, cId);
      setSessions(prev =>
        prev.map(s => s.id === sessionId ? { ...s, status: 'cancelled' } : s),
      );
      setConfirmingId(null);
    } catch {
      setCancelError('Could not cancel. Try again.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleMarkComplete = async (sessionId: string) => {
    if (!clientId || !userId || !clientData?.currentPlan?.id) return;
    setCompletingId(sessionId);
    setCompleteError(null);
    try {
      await markSessionComplete(sessionId, clientId, clientData.currentPlan.id, '', 'trainer');
      setSessions(prev =>
        prev.map(s => s.id === sessionId ? { ...s, status: 'completed' } : s),
      );
    } catch {
      setCompleteError('Could not complete. Try again.');
    } finally {
      setCompletingId(null);
    }
  };

  const beginEditNote = (sessionId: string, currentNote: string | null) => {
    setEditingNoteSessionId(sessionId);
    setNoteText(currentNote ?? '');
    setNoteError(null);
  };

  const cancelEditNote = () => {
    setEditingNoteSessionId(null);
    setNoteText('');
    setNoteError(null);
  };

  const saveNote = async (sessionId: string) => {
    if (!userId) return;
    setSavingNote(true);
    setNoteError(null);
    try {
      const trimmed = noteText.trim();
      const payload = trimmed.length > 0 ? trimmed : null;
      await updateSessionNote(sessionId, userId, payload);
      setSessions(prev =>
        prev.map(s =>
          s.id === sessionId
            ? { ...s, trainer_note: payload }
            : s,
        ),
      );
      setEditingNoteSessionId(null);
      setNoteText('');
    } catch {
      setNoteError('Could not save. Try again.');
    } finally {
      setSavingNote(false);
    }
  };

  const dbProfile          = clientData?.profile ?? null;
  const dbAlert            = clientData?.activeAlert ?? null;
  const dbMetrics          = clientData?.latestMetrics ?? null;
  const dbPreviousMetrics  = clientData?.previousMetrics ?? null;
  const dbPlan             = clientData?.currentPlan ?? null;
  const clientGoals        = clientData?.clientGoals ?? [];

  const readinessDelta: number | null = (
    dbMetrics?.readiness_score != null &&
    dbPreviousMetrics?.readiness_score != null
  )
    ? dbMetrics.readiness_score - dbPreviousMetrics.readiness_score
    : null;

  const nowMs = Date.now();
  const upcomingScheduled = sessions
    .filter(s => s.status === 'scheduled' && new Date(s.scheduled_at).getTime() >= nowMs)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const nextUpcomingSession: TrainerClientSession | null = upcomingScheduled[0] ?? null;
  const moreUpcomingCount = Math.max(upcomingScheduled.length - 1, 0);
  const pastCount = sessions.filter(
    s => s.status === 'completed' || s.status === 'cancelled',
  ).length;

  const client: ClientView = {
    id: dbProfile?.id ?? clientId ?? '',
    name: dbProfile?.full_name ?? 'Unknown Client',
    initials: dbProfile?.full_name ? getInitials(dbProfile.full_name) : '?',
    city: dbProfile?.city ?? null,
    goals: clientGoals,
    photoUrl: dbProfile?.photo_url ?? null,
    readinessScore: dbMetrics?.readiness_score ?? null,
    readinessDelta: readinessDelta,
    adherenceScore: clientData?.adherence?.currentScore ?? null,
    adherenceDelta: clientData?.adherence?.delta ?? null,
    riskLevel: dbAlert ? mapSeverityToRisk(dbAlert.severity) : 'none',
    riskMessage: dbAlert?.message ?? null,
    lastCheckin: dbMetrics ? {
      date: formatCheckinDate(dbMetrics.log_date),
      mobility: dbMetrics.mobility_score ?? null,
      pain: dbMetrics.pain_score ?? null,
      energy: dbMetrics.energy_score ?? null,
    } : null,
    program: dbPlan ? {
      name: dbPlan.template?.name ?? null,
      totalWeeks: dbPlan.template?.duration_weeks ?? null,
      sessionsPerWeek: dbPlan.template?.sessions_per_week ?? null,
      approvalStatus: dbPlan.status ?? null,
      currentWeek: calculateProgramWeek(
        dbPlan.created_at,
        dbPlan.template?.duration_weeks ?? null,
      ),
    } : null,
  };

  // ── Inline render helper for a single session card ─────────────────────────
  const renderSession = (session: TrainerClientSession, isLast: boolean) => {
    const isScheduled   = session.status === 'scheduled';
    const isCancelled   = session.status === 'cancelled';
    const isCompleted   = session.status === 'completed';
    const isConfirming  = confirmingId === session.id;
    const isCancelling  = cancellingId === session.id;
    const isCompleting  = completingId === session.id;
    const isEditingNote = editingNoteSessionId === session.id;
    const canHaveNote   = isCompleted || isCancelled;
    const note          = session.trainer_note;

    // ── Time-gate: can only complete on or after session date (from midnight IST) ──
    const sessionDate = new Date(session.scheduled_at);
    const now = new Date();
    const sessionDay = new Date(sessionDate);
    sessionDay.setHours(0, 0, 0, 0);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const canComplete = todayStart >= sessionDay;

    return (
      <div
        key={session.id}
        style={{
          padding: '12px 16px',
          borderBottom: isLast ? 'none' : '1px solid #F9FAFB',
          opacity: isCancelled ? 0.6 : 1,
        }}
      >
        {/* Row: date/type info + action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Clock size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />

          {/* Date + type */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0 }}>
              {formatSessionDate(session.scheduled_at)} · {formatSessionTime(session.scheduled_at)}
            </p>
            <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>
              {SESSION_TYPE_LABEL[session.session_type] ?? session.session_type} · {session.duration_minutes} min
            </p>
          </div>

          {/* Right side — status-dependent action */}
          {isScheduled && (
            isConfirming ? (
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => handleCancelConfirm(session.id)}
                  disabled={isCancelling}
                  style={{
                    fontSize: 12,
                    color: '#ffffff',
                    backgroundColor: '#DC2626',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    cursor: isCancelling ? 'default' : 'pointer',
                    opacity: isCancelling ? 0.6 : 1,
                  }}
                >
                  {isCancelling ? '…' : 'Confirm'}
                </button>
                <button
                  onClick={() => { setConfirmingId(null); setCancelError(null); }}
                  style={{
                    fontSize: 12,
                    color: '#6B7280',
                    backgroundColor: 'transparent',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    cursor: 'pointer',
                  }}
                >
                  Keep
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => canComplete && handleMarkComplete(session.id)}
                  disabled={isCompleting || !canComplete}
                  style={{
                    fontSize: 12,
                    color: canComplete ? '#ffffff' : '#9CA3AF',
                    backgroundColor: canComplete ? '#10B981' : '#E5E7EB',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    cursor: (isCompleting || !canComplete) ? 'default' : 'pointer',
                    opacity: (isCompleting || !canComplete) ? 0.6 : 1,
                  }}
                  title={canComplete ? undefined : `Available from ${formatDate(session.scheduled_at)}`}
                >
                  {isCompleting ? '…' : 'Complete'}
                </button>
                <button
                  onClick={() => { setConfirmingId(session.id); setCancelError(null); }}
                  style={{
                    fontSize: 12,
                    color: '#DC2626',
                    border: '1px solid #DC2626',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            )
          )}

          {isCancelled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>Cancelled</span>
              <span
                onClick={() => navigate(`/trainer/schedule-session/${clientId}`)}
                style={{
                  fontSize: 12,
                  color: '#166534',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Reschedule
              </span>
            </div>
          )}

          {isCompleted && (
            <span style={{ fontSize: 12, color: '#059669', fontWeight: 600, flexShrink: 0 }}>
              Completed
            </span>
          )}
        </div>

        {/* Inline errors */}
        {cancelError && isConfirming && (
          <p style={{ fontSize: 11, color: '#DC2626', marginTop: 4, marginLeft: 23 }}>
            {cancelError}
          </p>
        )}
        {completeError && (
          <p style={{ fontSize: 11, color: '#DC2626', marginTop: 4, marginLeft: 23 }}>
            {completeError}
          </p>
        )}
        {!canComplete && isScheduled && !isConfirming && (
          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, marginLeft: 23 }}>
            Available from {formatDate(session.scheduled_at)}
          </p>
        )}

        {/* Inline trainer note — only on completed/cancelled sessions */}
        {canHaveNote && !isEditingNote && note === null && (
          <button
            type="button"
            onClick={() => beginEditNote(session.id, null)}
            style={{
              marginTop: 8,
              marginLeft: 23,
              color: '#166534',
              fontSize: 12,
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            + Add note
          </button>
        )}

        {canHaveNote && !isEditingNote && note !== null && (
          <button
            type="button"
            onClick={() => beginEditNote(session.id, note)}
            style={{
              marginTop: 8,
              marginLeft: 23,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <StickyNote size={12} style={{ color: '#9CA3AF', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#6B7280' }}>
              {note.length > 60 ? `${note.substring(0, 60)}...` : note}
            </span>
          </button>
        )}

        {canHaveNote && isEditingNote && (
          <div style={{ marginTop: 8, marginLeft: 23 }}>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Add a note about this session..."
              style={{
                width: '100%',
                fontSize: 13,
                color: '#111827',
                border: '1px solid #E5E7EB',
                borderRadius: 8,
                padding: '8px 10px',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 6,
              }}
            >
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                {noteText.length}/500 chars
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={cancelEditNote}
                  disabled={savingNote}
                  style={{
                    fontSize: 12,
                    color: '#6B7280',
                    backgroundColor: 'transparent',
                    border: '1px solid #D1D5DB',
                    borderRadius: 8,
                    padding: '4px 10px',
                    cursor: savingNote ? 'default' : 'pointer',
                    opacity: savingNote ? 0.6 : 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => saveNote(session.id)}
                  disabled={savingNote}
                  style={{
                    fontSize: 12,
                    color: '#ffffff',
                    backgroundColor: '#166534',
                    border: 'none',
                    borderRadius: 8,
                    padding: '4px 10px',
                    cursor: savingNote ? 'default' : 'pointer',
                    opacity: savingNote ? 0.6 : 1,
                  }}
                >
                  {savingNote ? '…' : 'Save Note'}
                </button>
              </div>
            </div>
            {noteError && (
              <p style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>
                {noteError}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <MobileShell className="bg-[#F2F8F7]">

      {/* ─── Sticky Header ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft size={22} className="text-text-primary" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[17px] font-bold text-text-primary leading-tight truncate">{client.name}</p>
        </div>
        {client.riskLevel === 'red' && (
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
        )}
        {client.riskLevel === 'amber' && (
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
        )}
      </div>

      {/* ─── Scrollable Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-32">
        {isLoading ? (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                style={{ backgroundColor: '#e5e7eb', borderRadius: '16px', height: '80px' }}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="px-4 pt-4 pb-6 space-y-4"
          >

            {/* ── 1. Client Profile Header ─────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start gap-3 mb-3">
                {client.photoUrl ? (
                  <img
                    src={client.photoUrl}
                    alt={client.name}
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-[15px] font-bold shrink-0">
                    {client.initials || <User size={20} />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-[17px] font-bold text-text-primary leading-tight">{client.name}</h2>
                  {client.city && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[12px] text-text-secondary">{client.city}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Goal chips — hide if empty */}
              {client.goals.length > 0 && (
                <div className="-mx-1 flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
                  {client.goals.map(goal => (
                    <span
                      key={goal}
                      className="shrink-0 text-[12px] font-semibold text-teal-700 bg-teal-50 border border-teal-100 px-3 py-1 rounded-full"
                    >
                      {goal}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── 2. Risk Flag Banner ───────────────────────────────────────────────── */}
            {client.riskLevel === 'red' && (
              <div
                className="w-full rounded-2xl p-4 mb-1 cursor-pointer"
                style={{ backgroundColor: '#ef4444' }}
                onClick={() => navigate(`/trainer/risk-alert/${clientId}`)}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 shrink-0" size={20} style={{ color: '#ffffff' }} />
                  <div>
                    <p className="font-bold text-sm" style={{ color: '#ffffff' }}>
                      Immediate Attention Required
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: '#fecaca' }}>
                      {client.riskMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {client.riskLevel === 'amber' && (
              <div
                className="w-full rounded-2xl p-4 mb-1 cursor-pointer"
                style={{ backgroundColor: '#fbbf24' }}
                onClick={() => navigate(`/trainer/risk-alert/${clientId}`)}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 shrink-0" size={20} style={{ color: '#78350f' }} />
                  <div>
                    <p className="font-bold text-sm" style={{ color: '#78350f' }}>
                      Monitor Closely
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: '#92400e' }}>
                      {client.riskMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {client.riskLevel === 'none' && (
              <div
                className="flex items-center gap-3"
                style={{ backgroundColor: '#F0FDF4', borderRadius: 12, padding: '12px 16px' }}
              >
                <CheckCircle size={18} style={{ color: '#166534', flexShrink: 0 }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: '#166534', margin: 0 }}>
                  No active alerts
                </p>
              </div>
            )}

            {client.riskLevel === 'green' && (
              <div className="flex justify-start">
                <span className="text-[12px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <CheckCircle size={13} /> On Track
                </span>
              </div>
            )}

            {/* ── 3. Readiness + Adherence ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2">Readiness</p>
                <div className="flex items-end justify-between gap-2">
                  <span className={`text-[28px] font-bold leading-none ${client.readinessScore !== null ? scoreColor(client.readinessScore) : 'text-text-secondary'}`}>
                    {client.readinessScore !== null ? client.readinessScore : <span style={{ color: '#9ca3af', fontSize: '12px' }}>No data</span>}
                  </span>
                  {client.readinessDelta !== null && (
                    <span
                      style={{
                        backgroundColor:
                          client.readinessDelta > 0 ? '#F0FDF4'
                          : client.readinessDelta < 0 ? '#FEE2E2'
                          : '#F3F4F6',
                        color:
                          client.readinessDelta > 0 ? '#166534'
                          : client.readinessDelta < 0 ? '#DC2626'
                          : '#6B7280',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 999,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        flexShrink: 0,
                      }}
                    >
                      {client.readinessDelta > 0 && <TrendingUp size={11} />}
                      {client.readinessDelta < 0 && <TrendingDown size={11} />}
                      {client.readinessDelta === 0 && <Minus size={11} />}
                      {client.readinessDelta > 0
                        ? `+${client.readinessDelta}`
                        : `${client.readinessDelta}`}
                    </span>
                  )}
                </div>
              </div>
              {client.adherenceScore === null ? (
                /* Empty state — no sessions in the last 30 days */
                <div
                  className="rounded-2xl shadow-sm border border-gray-100 p-4"
                  style={{ backgroundColor: '#F9FAFB' }}
                >
                  <p
                    className="text-[11px] font-bold uppercase tracking-wider mb-2"
                    style={{ color: '#6B7280' }}
                  >
                    Adherence
                  </p>
                  <div className="flex items-center gap-2">
                    <Activity size={16} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                    <span
                      className="text-[13px] font-medium"
                      style={{ color: '#6B7280' }}
                    >
                      Not enough data yet
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 11,
                      color: '#9CA3AF',
                      marginTop: 4,
                      marginBottom: 0,
                    }}
                  >
                    Need at least 1 session in the last 30 days
                  </p>
                </div>
              ) : (
                /* Live score — tier-coloured value + optional delta chip */
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2">
                    Adherence
                  </p>
                  <div className="flex items-end justify-between gap-2">
                    <span
                      className="text-[28px] font-bold leading-none"
                      style={{
                        color:
                          client.adherenceScore >= 80 ? '#166534'
                          : client.adherenceScore >= 60 ? '#D97706'
                          : '#DC2626',
                      }}
                    >
                      {client.adherenceScore}%
                    </span>
                    {client.adherenceDelta !== null && (
                      <span
                        style={{
                          backgroundColor:
                            client.adherenceDelta > 0 ? '#F0FDF4'
                            : client.adherenceDelta < 0 ? '#FEE2E2'
                            : '#F3F4F6',
                          color:
                            client.adherenceDelta > 0 ? '#166534'
                            : client.adherenceDelta < 0 ? '#DC2626'
                            : '#6B7280',
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 999,
                          marginLeft: 8,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          flexShrink: 0,
                        }}
                      >
                        {client.adherenceDelta > 0 && <TrendingUp size={11} />}
                        {client.adherenceDelta < 0 && <TrendingDown size={11} />}
                        {client.adherenceDelta === 0 && <Minus size={11} />}
                        {client.adherenceDelta > 0
                          ? `+${client.adherenceDelta}%`
                          : client.adherenceDelta < 0
                            ? `${client.adherenceDelta}%`
                            : '0'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── 3b. View Full Progress ────────────────────────────────────────────── */}
            <button
              onClick={() => navigate(`/trainer/client-progress/${clientId}`)}
              className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between active:scale-[0.99] transition-transform text-left"
            >
              <div className="flex items-center gap-3">
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: '#F0FDFA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Activity size={18} style={{ color: '#0D9488' }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>
                    View Full Progress
                  </p>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>
                    Trends, metric history, readiness chart
                  </p>
                </div>
              </div>
              <ChevronLeft size={18} style={{ color: '#9CA3AF', transform: 'rotate(180deg)', flexShrink: 0 }} />
            </button>

            {/* ── 4. Last Check-in Summary ──────────────────────────────────────────── */}
            <div>
              <SectionHeader title="Last Check-In" />
              {client.lastCheckin === null ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                  <ClipboardList size={28} style={{ color: '#9CA3AF', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>
                    No check-ins yet
                  </p>
                  <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                    Client hasn&apos;t submitted a check-in
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => navigate(`/trainer/checkin-review/${clientId}`)}
                  className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-left active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={13} className="text-text-secondary" />
                    <span className="text-[13px] font-semibold text-text-primary">{client.lastCheckin.date}</span>
                  </div>

                  <div className="space-y-2.5">
                    <ScoreBar label="Mobility" value={client.lastCheckin.mobility} />
                    <ScoreBar label="Pain"     value={client.lastCheckin.pain}     redAbove={6} />
                    <ScoreBar label="Energy"   value={client.lastCheckin.energy}   />
                  </div>
                </button>
              )}
            </div>

            {/* ── 6. Session History ────────────────────────────────────────────────── */}
            <div>
              <button
                type="button"
                onClick={() => setSessionsExpanded(prev => !prev)}
                aria-expanded={sessionsExpanded}
                className="w-full flex items-center gap-2 mb-3 bg-transparent border-0 p-0"
                style={{ cursor: 'pointer' }}
              >
                <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider whitespace-nowrap">
                  SESSIONS
                </span>
                <div className="flex-1 h-px bg-gray-100" />
                {sessionsExpanded
                  ? <ChevronUp size={16} className="text-text-secondary shrink-0" />
                  : <ChevronDown size={16} className="text-text-secondary shrink-0" />
                }
              </button>

              {sessions.length === 0 ? (
                /* No sessions at all — preserve existing empty state */
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div style={{ padding: '20px 16px', textAlign: 'center' }}>
                    <p style={{ fontSize: 13, color: '#9CA3AF' }}>No sessions yet</p>
                  </div>
                </div>
              ) : sessionsExpanded ? (
                /* Expanded — full list */
                <>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {sessions.map((session, idx) =>
                      renderSession(session, idx === sessions.length - 1),
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSessionsExpanded(false)}
                    style={{
                      marginTop: 8,
                      color: '#166534',
                      fontSize: 13,
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                    }}
                  >
                    Show less ▲
                  </button>
                </>
              ) : nextUpcomingSession ? (
                /* Collapsed — only the next upcoming session */
                <>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {renderSession(nextUpcomingSession, true)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSessionsExpanded(true)}
                    style={{
                      marginTop: 8,
                      color: '#166534',
                      fontSize: 13,
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                    }}
                  >
                    {moreUpcomingCount} more upcoming, {pastCount} past · View all ›
                  </button>
                </>
              ) : (
                /* Collapsed — no upcoming session */
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                  <Calendar size={28} style={{ color: '#9CA3AF', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>
                    No upcoming sessions
                  </p>
                </div>
              )}

              {/* Schedule Session button — always visible inside Sessions */}
              <button
                onClick={() => navigate(`/trainer/schedule-session/${clientId}`)}
                className="mt-3 w-full py-3.5 rounded-2xl text-[15px] font-bold border-2 border-teal-600 text-teal-600 bg-white active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Calendar size={17} />
                Schedule Session
              </button>
            </div>

            {/* ── 6. Training Program Quick View ───────────────────────────────────── */}
            <div>
              <SectionHeader title="Current Program" />
              {client.program === null ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>No program assigned</p>
                  <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4, marginBottom: 12 }}>Create a workout program for this client</p>
                  <button
                    onClick={() => navigate(`/trainer/program-builder/${clientId}`)}
                    className="mx-auto flex items-center gap-1.5 text-[13px] font-semibold text-teal-600 bg-teal-50 border border-teal-100 px-4 py-2 rounded-xl active:bg-teal-100 transition-colors"
                  >
                    <Edit size={14} /> Create Program
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <p className="text-[14px] font-bold text-text-primary leading-snug flex-1">
                      {client.program.name ?? 'Untitled Program'}
                    </p>
                    {client.program.approvalStatus && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${APPROVAL_BADGE[client.program.approvalStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                        {client.program.approvalStatus.charAt(0).toUpperCase() + client.program.approvalStatus.slice(1).replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  {client.program.currentWeek !== null && client.program.totalWeeks !== null && (
                    <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 12px' }}>
                      Week {client.program.currentWeek} of {client.program.totalWeeks}
                    </p>
                  )}
                  {client.program.sessionsPerWeek !== null && (
                    <div className="flex items-center gap-3 text-[12px] text-text-secondary font-medium mb-3">
                      <span>{client.program.sessionsPerWeek}×/week</span>
                      {client.program.totalWeeks !== null && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          <span>{client.program.totalWeeks} weeks</span>
                        </>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => navigate(`/trainer/program-builder/${clientId}`)}
                    className="flex items-center gap-1.5 text-[13px] font-semibold text-teal-600 bg-teal-50 border border-teal-100 px-4 py-2 rounded-xl active:bg-teal-100 transition-colors"
                  >
                    <Edit size={14} /> Edit Program
                  </button>
                </div>
              )}
            </div>

          </motion.div>
        )}
      </div>
      <TrainerBottomNav />
    </MobileShell>
  );
}
