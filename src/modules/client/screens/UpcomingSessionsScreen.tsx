import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Video,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react';
import MobileShell from '../../../components/MobileShell';
import ProfileMenu from '../../../components/ProfileMenu';
import { useWellness } from '../../../context/WellnessContext';
import { getUpcomingSessions } from '../../../services/supabaseService';
import type { ClientSession } from '../../../types';
import { formatDate, formatDateLong } from '@/utils/dateUtils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const IST = 'Asia/Kolkata';

/** Display a UTC ISO string as a time in IST, e.g. "11:00 AM" */
function formatSessionTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    timeZone: IST,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Display a UTC ISO string as a long date, e.g. "Mon, 18 May 2026" */
function formatHeaderDate(iso: string): string {
  return formatDateLong(iso);
}

/**
 * Returns the calendar date string (DD/MM/YYYY) for an ISO string.
 * Used to compare session dates without time-of-day artifacts.
 */
function toISTDateString(iso: string): string {
  return formatDate(iso);
}

type GroupKey = 'Today' | 'Tomorrow' | 'This Week' | 'Later';
const GROUP_ORDER: GroupKey[] = ['Today', 'Tomorrow', 'This Week', 'Later'];

function groupByDate(sessions: ClientSession[]): Record<GroupKey, ClientSession[]> {
  const now = Date.now();
  // Compare calendar dates in IST using en-IN locale (returns DD/MM/YYYY).
  // String equality is safe for Today/Tomorrow checks.
  const todayIST    = formatDate(now);
  const tomorrowIST = formatDate(now + 86_400_000);
  // For the 7-day window use a raw ms threshold — avoids DD/MM/YYYY string comparison
  // across month boundaries.
  const weekThresholdMs = now + 7 * 86_400_000;

  const groups: Record<GroupKey, ClientSession[]> = {
    Today: [],
    Tomorrow: [],
    'This Week': [],
    Later: [],
  };

  for (const session of sessions) {
    const sessionIST = toISTDateString(session.scheduled_at);
    const sessionMs  = new Date(session.scheduled_at).getTime();

    if (sessionIST === todayIST) {
      groups['Today'].push(session);
    } else if (sessionIST === tomorrowIST) {
      groups['Tomorrow'].push(session);
    } else if (sessionMs < weekThresholdMs) {
      groups['This Week'].push(session);
    } else {
      groups['Later'].push(session);
    }
  }

  return groups;
}

// ─── Session type icon ────────────────────────────────────────────────────────

function SessionTypeIcon({ type }: { type: string }) {
  if (type === 'video') {
    return (
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: '#DCFCE7' }}
      >
        <Video size={18} style={{ color: '#16A34A' }} />
      </div>
    );
  }
  if (type === 'phone') {
    return (
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: '#DBEAFE' }}
      >
        <Phone size={18} style={{ color: '#2563EB' }} />
      </div>
    );
  }
  // in-person or anything else
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
      style={{ backgroundColor: '#FEF3C7' }}
    >
      <MapPin size={18} style={{ color: '#D97706' }} />
    </div>
  );
}

// ─── Session type label ───────────────────────────────────────────────────────

const SESSION_LABELS: Record<string, string> = {
  video: 'Video Session',
  phone: 'Phone Session',
  'in-person': 'In-Person Session',
};

function getSessionLabel(type: string): string {
  return SESSION_LABELS[type] ?? type;
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
      <div className="h-3 bg-gray-200 rounded w-8 shrink-0" />
    </div>
  );
}

// ─── Session row ──────────────────────────────────────────────────────────────

function SessionRow({
  session,
  onTap,
}: {
  session: ClientSession;
  onTap: () => void;
}) {
  const isCancelled = session.status === 'cancelled';

  return (
    <button
      onClick={isCancelled ? undefined : onTap}
      disabled={isCancelled}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-gray-100 last:border-b-0 transition-colors active:bg-gray-50"
      style={{
        opacity: isCancelled ? 0.5 : 1,
        cursor: isCancelled ? 'default' : 'pointer',
        backgroundColor: '#ffffff',
      }}
    >
      <SessionTypeIcon type={session.session_type} />

      {/* Centre — session info */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[14px] font-semibold text-[#111827] truncate"
          style={isCancelled ? { textDecoration: 'line-through' } : {}}
        >
          {getSessionLabel(session.session_type)}
        </p>
        <p className="text-[12px] text-[#6B7280] mt-0.5">
          {formatSessionTime(session.scheduled_at)} · {session.duration_minutes} min
        </p>
        <p className="text-[12px] text-[#9CA3AF]">{session.trainer_name}</p>
      </div>

      {/* Right — status indicator */}
      {isCancelled ? (
        <span
          style={{
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            borderRadius: 999,
            padding: '2px 8px',
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Cancelled
        </span>
      ) : (
        <ChevronRight size={18} style={{ color: '#9CA3AF', flexShrink: 0 }} />
      )}
    </button>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function UpcomingSessionsScreen() {
  const navigate = useNavigate();
  const { userId } = useWellness();

  const [sessions, setSessions] = useState<ClientSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fetchSessions = () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    setHasError(false);
    getUpcomingSessions(userId)
      .then(data => {
        setSessions(data);
      })
      .catch(() => {
        setHasError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const groups = groupByDate(sessions);
  const hasAnySessions = sessions.length > 0;

  return (
    <MobileShell className="bg-[#F9FAFB]">
      {/* Header */}
      <div
        className="sticky top-0 z-40 flex items-center gap-3 px-4 py-4 border-b border-gray-100"
        style={{ backgroundColor: '#ffffff' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft size={22} style={{ color: '#111827' }} />
        </button>
        <p className="text-[17px] font-bold text-[#111827]">Upcoming Sessions</p>
        <div className="ml-auto">
          <ProfileMenu />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {/* Loading state */}
        {loading && (
          <div
            className="rounded-2xl overflow-hidden mx-4 mt-4 border border-gray-100"
            style={{ backgroundColor: '#ffffff' }}
          >
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {/* Error state */}
        {!loading && hasError && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
            <p className="text-[15px] font-semibold text-[#111827]">
              Could not load sessions.
            </p>
            <button
              onClick={fetchSessions}
              className="px-5 py-2 rounded-full text-[13px] font-semibold text-white"
              style={{ backgroundColor: '#1D9E75' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !hasError && !hasAnySessions && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center px-6">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#F0FDF4' }}
            >
              <Calendar size={28} style={{ color: '#1D9E75' }} />
            </div>
            <p className="text-[15px] font-semibold text-[#111827]">
              No upcoming sessions
            </p>
            <p className="text-[13px] text-[#6B7280]">
              Your trainer will schedule sessions for you
            </p>
          </div>
        )}

        {/* Session groups */}
        {!loading && !hasError && hasAnySessions &&
          GROUP_ORDER.map(groupKey => {
            const groupSessions = groups[groupKey];
            if (groupSessions.length === 0) return null;

            return (
              <div key={groupKey} className="mt-5 mx-4">
                {/* Group label with date of first session */}
                <div className="flex items-baseline justify-between mb-2 px-1">
                  <p
                    className="text-[11px] font-bold uppercase tracking-[0.07em]"
                    style={{ color: '#6B7280' }}
                  >
                    {groupKey}
                  </p>
                  {groupKey !== 'Today' && groupKey !== 'Tomorrow' && (
                    <p className="text-[11px] text-[#9CA3AF]">
                      {formatHeaderDate(groupSessions[0].scheduled_at)}
                    </p>
                  )}
                </div>

                <div
                  className="rounded-2xl overflow-hidden border border-gray-100"
                  style={{ backgroundColor: '#ffffff' }}
                >
                  {groupSessions.map(session => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      onTap={() => navigate(`/client/session/${session.id}`)}
                    />
                  ))}
                </div>
              </div>
            );
          })
        }
      </div>
    </MobileShell>
  );
}
