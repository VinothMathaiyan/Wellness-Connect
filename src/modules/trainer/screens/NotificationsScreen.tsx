import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  Bell,
  UserPlus,
  MessageSquare,
  RefreshCw,
  Phone,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileShell from '../../../components/MobileShell';
import TrainerBottomNav from '../components/TrainerBottomNav';
import { useWellness } from '../../../context/WellnessContext';
import {
  getTrainerNotifications,
  markNotificationRead,
  updateCallbackStatus,
} from '../../../services/supabaseService';
import type { TrainerNotification } from '../../../types';

// ─── Relative time helper (no external library) ───────────────────────────────

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)  return 'Just now';
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)  return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 border-b border-gray-100 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
      <div className="h-3 bg-gray-200 rounded w-12 shrink-0 mt-1" />
    </div>
  );
}

// ─── Notification row ─────────────────────────────────────────────────────────

function NotificationRow({
  notification,
  onTap,
  onActioned,
}: {
  notification: TrainerNotification;
  onTap: () => void;
  onActioned?: (id: string) => void;
}) {
  const isInfoRequest = notification.type === 'info_request';
  const isProgramChangesRequested = notification.type === 'program_changes_requested';
  const isCallbackRequest = notification.type === 'callback_request';

  let parsedMessage = notification.message ?? '';
  let phone = '';
  let requestId = '';
  
  if (isCallbackRequest && notification.message) {
    try {
      const data = JSON.parse(notification.message);
      phone = data.phone || '';
      requestId = data.request_id || '';
    } catch {
      // fallback
    }
  }

  const preview =
    parsedMessage.length > 80 && !isCallbackRequest
      ? parsedMessage.substring(0, 80) + '…'
      : parsedMessage;

  const iconStyle = isCallbackRequest
    ? { backgroundColor: '#E0F2FE', color: '#0284C7' }
    : isInfoRequest
    ? { backgroundColor: '#DCFCE7', color: '#166534' }
    : isProgramChangesRequested
      ? { backgroundColor: '#FEF3C7', color: '#92400E' }
      : { backgroundColor: '#DBEAFE', color: '#2563EB' };
  
  const unreadBorder = isProgramChangesRequested ? '#F59E0B' : isCallbackRequest ? '#0EA5E9' : '#1D9E75';

  const [actioning, setActioning] = useState(false);

  const handleAction = async (e: React.MouseEvent, status: 'contacted' | 'resolved') => {
    e.stopPropagation(); // prevent row tap
    if (!requestId || actioning) return;
    setActioning(true);
    try {
      await updateCallbackStatus(requestId, status);
      // Mark notification as read implicitly
      await markNotificationRead(notification.id);
      if (onActioned) onActioned(notification.id);
    } catch {
      // ignore
    } finally {
      setActioning(false);
    }
  };

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={onTap}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors active:bg-gray-50"
        style={
          !notification.is_read
            ? { backgroundColor: isProgramChangesRequested ? '#FFFBEB' : isCallbackRequest ? '#F0F9FF' : '#F0FDF4', borderLeft: `3px solid ${unreadBorder}` }
            : { backgroundColor: '#ffffff', borderLeft: '3px solid transparent' }
        }
      >
        {/* Icon circle */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={iconStyle}
        >
          {isCallbackRequest
            ? <Phone size={17} />
            : isInfoRequest
            ? <UserPlus size={17} />
            : <MessageSquare size={17} />
          }
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[14px] leading-snug truncate"
            style={{ fontWeight: notification.is_read ? 500 : 700, color: '#111827' }}
          >
            {isCallbackRequest
              ? `${notification.from_name} requested a call back`
              : isInfoRequest
              ? `${notification.from_name} wants to know more about you`
              : isProgramChangesRequested
                ? 'Client requested program changes'
              : `Message from ${notification.from_name}`
            }
          </p>
          <p className="text-[12px] text-gray-500 mt-0.5 leading-snug line-clamp-2">
            {isCallbackRequest
              ? `📱 +91 ${phone}`
              : isInfoRequest
              ? (notification.from_city ?? 'Location not set')
              : isProgramChangesRequested
                ? preview
              : preview
            }
          </p>
        </div>

        {/* Time + unread dot */}
        <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
          <span className="text-[11px] text-gray-400 whitespace-nowrap">
            {relativeTime(notification.created_at)}
          </span>
          {!notification.is_read && (
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: unreadBorder }}
            />
          )}
        </div>
      </button>

      {/* Callback Actions */}
      {isCallbackRequest && !notification.is_read && (
        <div className="px-4 pb-3 pt-1 flex gap-2 pl-[60px]" style={{ backgroundColor: '#F0F9FF', borderLeft: `3px solid ${unreadBorder}` }}>
          <button
            onClick={(e) => handleAction(e, 'contacted')}
            disabled={actioning}
            className="px-3 py-1.5 rounded-lg text-[12px] font-bold border"
            style={{ borderColor: '#1D9E75', color: '#1D9E75', backgroundColor: 'white' }}
          >
            Mark Contacted
          </button>
          <button
            onClick={(e) => handleAction(e, 'resolved')}
            disabled={actioning}
            className="px-3 py-1.5 rounded-lg text-[12px] font-bold"
            style={{ backgroundColor: '#1D9E75', color: 'white' }}
          >
            Resolve
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const navigate  = useNavigate();
  const { userId } = useWellness();

  const [notifications, setNotifications] = useState<TrainerNotification[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [hasError,      setHasError]      = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setHasError(false);
    try {
      const data = await getTrainerNotifications(userId);
      setNotifications(data);
    } catch {
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Reactive unread count — updates immediately when a row is tapped
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleTap = useCallback(async (notification: TrainerNotification) => {
    // Optimistic local update — don't wait for DB
    setNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n),
    );
    try {
      await markNotificationRead(notification.id);
    } catch {
      // Non-fatal — local state already updated
      console.error('markNotificationRead failed for', notification.id);
    }
  }, []);

  const handleActioned = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <MobileShell>
      <div className="flex flex-col min-h-full bg-gray-50">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="bg-white px-4 pt-6 pb-4 flex items-center gap-3 shadow-sm">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
            </h1>
          </div>
        </div>

        {/* ── Unread summary pill ──────────────────────────────────────────── */}
        {!loading && !hasError && (
          <div className="px-4 py-3 flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: unreadCount > 0 ? '#1D9E75' : '#E5E7EB' }}
            >
              <Bell size={13} color={unreadCount > 0 ? '#ffffff' : '#6B7280'} />
            </div>
            <p className="text-[13px] font-semibold text-gray-700">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                : 'All caught up'
              }
            </p>
          </div>
        )}

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto pb-24">

          {/* Loading */}
          {loading && (
            <div className="bg-white rounded-2xl mx-4 mt-2 shadow-sm overflow-hidden">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          )}

          {/* Error */}
          {!loading && hasError && (
            <div className="flex flex-col items-center justify-center text-center gap-4 py-16 px-6">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#FEF2F2' }}
              >
                <Bell size={24} color="#F87171" />
              </div>
              <p className="text-[14px] font-semibold text-gray-700">
                Could not load notifications.
              </p>
              <button
                onClick={fetchNotifications}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-[14px]"
                style={{ backgroundColor: '#F0FDF4', color: '#166634', border: '1px solid #BBF7D0' }}
              >
                <RefreshCw size={15} />
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !hasError && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 px-8 text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#F3F4F6' }}
              >
                <Bell size={26} color="#D1D5DB" />
              </div>
              <p className="text-[14px] font-semibold text-gray-400">No notifications yet</p>
              <p className="text-[13px] text-gray-400 leading-relaxed">
                Client requests and messages will appear here
              </p>
            </div>
          )}

          {/* Notification list — unread first, then read below an "Earlier" divider */}
          {!loading && !hasError && notifications.length > 0 && (() => {
            const unread = notifications.filter(n => !n.is_read);
            const read   = notifications.filter(n => n.is_read);
            return (
              <div className="bg-white rounded-2xl mx-4 mt-2 shadow-sm overflow-hidden">
                {unread.map(n => (
                  <NotificationRow key={n.id} notification={n} onTap={() => handleTap(n)} onActioned={handleActioned} />
                ))}
                {unread.length > 0 && read.length > 0 && (
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Earlier
                    </span>
                  </div>
                )}
                {read.map(n => (
                  <NotificationRow key={n.id} notification={n} onTap={() => handleTap(n)} onActioned={handleActioned} />
                ))}
              </div>
            );
          })()}

        </div>
      </div>
      <TrainerBottomNav />
    </MobileShell>
  );
}
