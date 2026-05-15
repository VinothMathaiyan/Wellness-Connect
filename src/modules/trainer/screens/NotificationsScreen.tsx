import { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import {
  ChevronLeft,
  Bell,
  UserPlus,
  Clock,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  Zap,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileShell from '../../../components/MobileShell';
import { useWellness } from '../../../context/WellnessContext';
import {
  getTrainerClients,
  getPendingClientRequests,
  type TrainerClient,
} from '../../../services/supabaseService';

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationType =
  | 'new_client_request'
  | 'session_reminder'
  | 'checkin_ready'
  | 'risk_flag_red'
  | 'risk_flag_amber'
  | 'client_goal_approval'
  | 'plan_suggestion'
  | 'session_no_show';

type NotificationGroup = 'today' | 'earlier';

interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  subtitle: string;
  time: string;
  isRead: boolean;
  group: NotificationGroup;
}

// ─── Mock notification content ────────────────────────────────────────────────
// Content stays mock until a notifications table exists in the DB.
// Navigation destinations are resolved dynamically from real client IDs.

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: '1',
    type: 'risk_flag_red',
    title: 'Red Risk Flag — Sarah Chen',
    subtitle: 'Pain levels elevated for 3 consecutive days',
    time: '10 min ago',
    isRead: false,
    group: 'today',
  },
  {
    id: '2',
    type: 'checkin_ready',
    title: 'Check-in submitted — Ravi Kumar',
    subtitle: 'Readiness score: 41 · Needs review',
    time: '1 hr ago',
    isRead: false,
    group: 'today',
  },
  {
    id: '3',
    type: 'session_no_show',
    title: 'No-show — Michael Torres',
    subtitle: 'Did not attend 9:00 AM session today',
    time: '3 hrs ago',
    isRead: false,
    group: 'today',
  },
  {
    id: '4',
    type: 'new_client_request',
    title: 'New client request — Kavya Reddy',
    subtitle: 'Rehabilitation · Beginner · Chennai',
    time: 'Yesterday',
    isRead: true,
    group: 'earlier',
  },
  {
    id: '5',
    type: 'client_goal_approval',
    title: 'Program approved — Priya Sharma',
    subtitle: 'Client approved the 12-week program',
    time: 'Yesterday',
    isRead: true,
    group: 'earlier',
  },
  {
    id: '6',
    type: 'plan_suggestion',
    title: 'Plan suggestion — Michael Torres',
    subtitle: 'Engine 5.4 recommends reviewing intensity',
    time: '2 days ago',
    isRead: true,
    group: 'earlier',
  },
];

// ─── Navigation resolution ────────────────────────────────────────────────────

/** Extract the client name from a notification title (part after " — ") */
function extractClientName(title: string): string | null {
  const idx = title.indexOf(' — ');
  return idx !== -1 ? title.slice(idx + 3).trim() : null;
}

/**
 * Resolve a real navigation destination for a notification.
 * Falls back to /trainer/dashboard when the client ID can't be found.
 */
function resolveDestination(
  type: NotificationType,
  title: string,
  activeMap: Map<string, string>,
  pendingMap: Map<string, string>,
): string {
  const name = extractClientName(title);
  const activeId  = name ? activeMap.get(name)  : null;
  const pendingId = name ? pendingMap.get(name) : null;
  const anyId = activeId ?? pendingId;

  switch (type) {
    case 'risk_flag_red':
    case 'risk_flag_amber':
      return anyId ? `/trainer/risk-alert/${anyId}` : '/trainer/risk-monitor';
    case 'checkin_ready':
      return anyId ? `/trainer/checkin-review/${anyId}` : '/trainer/dashboard';
    case 'session_no_show':
      return anyId ? `/trainer/session-log/${anyId}` : '/trainer/dashboard';
    case 'new_client_request':
      return pendingId ? `/trainer/client-request/${pendingId}` : '/trainer/dashboard';
    case 'client_goal_approval':
      return anyId ? `/trainer/program-builder/${anyId}` : '/trainer/dashboard';
    case 'plan_suggestion':
      return anyId ? `/trainer/client/${anyId}` : '/trainer/dashboard';
    case 'session_reminder':
      return '/trainer/dashboard';
    default:
      return '/trainer/dashboard';
  }
}

// ─── Style config ─────────────────────────────────────────────────────────────

const TYPE_ICON: Record<NotificationType, React.ElementType> = {
  new_client_request:   UserPlus,
  session_reminder:     Clock,
  checkin_ready:        ClipboardList,
  risk_flag_red:        AlertTriangle,
  risk_flag_amber:      AlertTriangle,
  client_goal_approval: CheckCircle,
  plan_suggestion:      Zap,
  session_no_show:      XCircle,
};

const TYPE_ICON_STYLE: Record<NotificationType, string> = {
  new_client_request:   'bg-blue-100 text-blue-600',
  session_reminder:     'bg-teal-100 text-teal-600',
  checkin_ready:        'bg-purple-100 text-purple-600',
  risk_flag_red:        'bg-red-100 text-red-600',
  risk_flag_amber:      'bg-amber-100 text-amber-700',
  client_goal_approval: 'bg-green-100 text-green-600',
  plan_suggestion:      'bg-teal-100 text-teal-600',
  session_no_show:      'bg-red-100 text-red-600',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function GroupHeader({ label }: { label: string }) {
  return (
    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-2 mt-4 first:mt-0">
      {label}
    </p>
  );
}

function NotificationRow({
  notification,
  onTap,
}: {
  notification: AppNotification;
  onTap: () => void;
}) {
  const Icon = TYPE_ICON[notification.type];
  const iconStyle = TYPE_ICON_STYLE[notification.type];

  return (
    <button
      onClick={onTap}
      className={`w-full flex items-start gap-3 px-4 py-3.5 text-left border-b border-gray-100 last:border-b-0 transition-colors active:bg-gray-50 ${
        !notification.isRead
          ? 'bg-teal-50 border-l-2 border-l-teal-400'
          : 'bg-white'
      }`}
    >
      {/* Icon circle */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconStyle}`}>
        <Icon size={17} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-[14px] leading-snug truncate ${
          !notification.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-800'
        }`}>
          {notification.title}
        </p>
        <p className="text-[12px] text-gray-500 mt-0.5 leading-snug line-clamp-2">
          {notification.subtitle}
        </p>
      </div>

      {/* Time + unread dot */}
      <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
        <span className="text-[11px] text-gray-400 whitespace-nowrap">{notification.time}</span>
        {!notification.isRead && (
          <span className="w-2 h-2 rounded-full bg-teal-500" />
        )}
      </div>
    </button>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const navigate = useNavigate();
  const { userId } = useWellness();

  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);

  // Real client ID maps — built on mount so navigation targets use actual UUIDs
  const [activeMap, setActiveMap]   = useState<Map<string, string>>(new Map());
  const [pendingMap, setPendingMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!userId) return;

    Promise.all([
      getTrainerClients(userId),
      getPendingClientRequests(userId),
    ]).then(([active, pending]) => {
      const aMap = new Map<string, string>();
      for (const c of active as TrainerClient[]) {
        const p = c.profile as { id: string; full_name: string };
        if (p?.full_name) aMap.set(p.full_name, p.id);
      }

      const pMap = new Map<string, string>();
      for (const r of pending as Array<{ client: { id: string; full_name: string } | null }>) {
        if (r.client?.full_name) pMap.set(r.client.full_name, r.client.id);
      }

      setActiveMap(aMap);
      setPendingMap(pMap);
    });
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllAsRead = () =>
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

  const handleTap = (notification: AppNotification) => {
    flushSync(() => {
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n),
      );
    });
    const dest = resolveDestination(notification.type, notification.title, activeMap, pendingMap);
    navigate(dest);
  };

  const todayItems   = notifications.filter(n => n.group === 'today');
  const earlierItems = notifications.filter(n => n.group === 'earlier');

  return (
    <MobileShell>
      <div className="flex flex-col min-h-full bg-gray-50">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="bg-white px-4 pt-6 pb-4 flex items-center gap-3 shadow-sm">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[13px] font-semibold text-teal-600 active:opacity-70 transition-opacity"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* ── Unread count summary ────────────────────────────────────────────── */}
        {unreadCount > 0 ? (
          <div className="px-4 py-3 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
              <Bell size={13} className="text-white" />
            </div>
            <p className="text-[13px] font-semibold text-gray-700">
              {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
            </p>
          </div>
        ) : (
          <div className="px-4 py-3 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
              <Bell size={13} className="text-gray-500" />
            </div>
            <p className="text-[13px] font-medium text-gray-400">All caught up</p>
          </div>
        )}

        {/* ── Notification list ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 pb-10">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                <Bell size={26} className="text-gray-300" />
              </div>
              <p className="text-[14px] font-semibold text-gray-400">No notifications yet</p>
              <p className="text-[13px] text-gray-400 text-center px-8 leading-relaxed">
                Risk alerts, check-in updates, and session reminders will appear here.
              </p>
            </div>
          ) : (
            <>
              {todayItems.length > 0 && (
                <div>
                  <GroupHeader label="Today" />
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {todayItems.map(n => (
                      <NotificationRow key={n.id} notification={n} onTap={() => handleTap(n)} />
                    ))}
                  </div>
                </div>
              )}

              {earlierItems.length > 0 && (
                <div>
                  <GroupHeader label="Earlier" />
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {earlierItems.map(n => (
                      <NotificationRow key={n.id} notification={n} onTap={() => handleTap(n)} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MobileShell>
  );
}
