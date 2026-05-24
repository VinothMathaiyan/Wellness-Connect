import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Loader2,
  AlertTriangle,
  Bell,
  UserPlus,
  ShieldAlert,
  BadgeCheck,
  CalendarClock,
  MessageSquare,
} from 'lucide-react';
import type { ElementType } from 'react';
import MobileShell from '../../../components/MobileShell';
import AssessmentBottomNav from '../components/AssessmentBottomNav';
import { useWellness } from '../../../context/WellnessContext';
import { supabase } from '../../../lib/supabaseClient';
import {
  getAssessorNotifications,
  type AssessorNotification,
} from '../../../services/supabaseService';

// ── Icon config per notification type ─────────────────────────────────────────

interface IconConfig {
  Icon: ElementType;
  color: string;
  bg: string;
}

const ICON_MAP: Record<string, IconConfig> = {
  new_client_registered:    { Icon: UserPlus,      color: '#0d9488', bg: '#ccfbf1' },
  risk_escalation:          { Icon: ShieldAlert,    color: '#dc2626', bg: '#fee2e2' },
  trainer_approval_request: { Icon: BadgeCheck,     color: '#2563eb', bg: '#dbeafe' },
  monthly_review_due:       { Icon: CalendarClock,  color: '#d97706', bg: '#fef3c7' },
  message:                  { Icon: MessageSquare,  color: '#7c3aed', bg: '#ede9fe' },
};

const DEFAULT_ICON: IconConfig = { Icon: Bell, color: '#6b7280', bg: '#f3f4f6' };

function getIconConfig(type: string): IconConfig {
  return ICON_MAP[type] ?? DEFAULT_ICON;
}

// ── Tap destinations per notification type ────────────────────────────────────

const DESTINATION_MAP: Record<string, string> = {
  new_client_registered:    '/assessment/clients/queue',
  risk_escalation:          '/assessment/escalations',
  trainer_approval_request: '/assessment/trainer-approvals',
  monthly_review_due:       '/assessment/monthly-reviews',
  message:                  '/assessment/messages',
};

// ── Relative time helper ──────────────────────────────────────────────────────

function relativeTime(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  return `${weeks} weeks ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AssessmentNotificationsScreen() {
  const navigate = useNavigate();
  const { userId } = useWellness();

  const [notifications, setNotifications] = useState<AssessorNotification[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [error, setError]                 = useState('');
  const [unreadCount, setUnreadCount]     = useState(0);

  // ── Fetch + bulk mark read ────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError('');

    try {
      const result = await getAssessorNotifications(userId);
      if (result.error) throw new Error(result.error);

      setNotifications(result.data);
      const unread = result.data.filter(n => !n.is_read).length;
      setUnreadCount(unread);

      // Bulk mark all unread as read
      if (unread > 0) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('to_user_id', userId)
          .eq('is_read', false);

        // Optimistically update local state
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true })),
        );
        setUnreadCount(0);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ── Tap handler ───────────────────────────────────────────────────────────

  const handleTap = (notification: AssessorNotification) => {
    const destination = DESTINATION_MAP[notification.type];
    if (destination) {
      navigate(destination);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

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
            <h1 className="text-xl font-bold text-gray-900 leading-tight">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm font-medium" style={{ color: '#0d9488' }}>
                {unreadCount} unread
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto p-5 pb-24">

        {/* Error */}
        {error && (
          <div className="bg-red-50 p-3 rounded-lg flex items-start gap-2 border border-red-100 mb-4">
            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading ? (
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => (
              <div
                key={i}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>

        ) : notifications.length > 0 ? (

          <div className="space-y-3">
            {notifications.map(notification => {
              const { Icon, color, bg } = getIconConfig(notification.type);
              const isUnread = !notification.is_read;
              const hasDest = notification.type in DESTINATION_MAP;

              return (
                <button
                  key={notification.id}
                  onClick={() => handleTap(notification)}
                  disabled={!hasDest}
                  className={`w-full text-left bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-colors ${
                    hasDest ? 'active:bg-gray-50 cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div className="flex items-start gap-3 p-4">

                    {/* Unread dot */}
                    <div className="flex items-center shrink-0 pt-1" style={{ width: '8px' }}>
                      {isUnread && (
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: '#0d9488',
                          }}
                        />
                      )}
                    </div>

                    {/* Type icon */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: bg }}
                    >
                      <Icon size={18} style={{ color }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm leading-snug ${
                          isUnread
                            ? 'font-bold text-gray-900'
                            : 'font-normal text-gray-700'
                        }`}
                      >
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {relativeTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
              <Bell size={22} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">
              You're all caught up — no notifications
            </p>
          </div>
        )}
      </div>

      <AssessmentBottomNav alertCount={unreadCount} />
    </MobileShell>
  );
}
