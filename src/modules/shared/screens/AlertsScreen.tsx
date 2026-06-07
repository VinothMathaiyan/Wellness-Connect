/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Performance Strategy:
 * - List Rendering: Used `React.memo` for the individual `AlertItem` components to prevent 
 *   unnecessary re-renders of the entire list when a single alert's read status changes.
 * - Transition Handling: Used Framer Motion for smooth sub-100ms enter/exit transitions 
 *   without relying on heavy DOM manipulations.
 * - Extensibility: For scaling to extremely large notification histories, this structure 
 *   is cleanly decoupled and ready to be wrapped in a virtualization library (like `react-window`)
 *   if pagination or infinite scrolling is added later.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Home,
    Users,
    BarChart3,
    Bell,
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
    ClipboardList,
    XCircle,
    Calendar,
    MessageSquare,
    ShieldAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ClientNotification, Notification } from '../../../types';
import ProfileMenu from '../../../components/ProfileMenu';
import ScreenHeader from '@/components/ScreenHeader';



const AlertItem = React.memo(({
    notification,
    onMarkRead,
    onAction
}: {
    notification: Notification;
    onMarkRead: (id: string) => void;
    onAction: (notification: Notification) => void;
}) => {
    const isUnread = !notification.isRead;
    const isUrgent = notification.type === 'alert';

    // Subtle amber for urgent or unread items, teal/green for read/completed items.
    const isAmber = isUnread || isUrgent;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={() => {
                if (isUnread) onMarkRead(notification.id);
                onAction(notification);
            }}
            className={`rounded-[12px] p-[14px] border-[1.5px] flex items-center gap-[14px] mb-[10px] cursor-pointer active:scale-[0.98] transition-all relative ${isAmber
                    ? 'bg-[#FEF3C7] border-[#FCD34D] shadow-sm'
                    : 'bg-white border-[#1D9E75]/20'
                }`}
        >
            {/* Icon Area */}
            <div className={`w-[40px] h-[40px] shrink-0 rounded-[10px] flex items-center justify-center ${isAmber ? 'bg-[#FDE68A] text-[#D97706]' : 'bg-[#E1F5EE] text-[#1D9E75]'
                }`}>
                {isUrgent ? <AlertTriangle size={20} /> : (isUnread ? <Bell size={20} /> : <CheckCircle2 size={20} />)}
            </div>

            {/* Typography matches "Daily Tracking" cards */}
            <div className="flex-1 min-w-0">
                <h4 className={`text-[13px] leading-[1.4] mb-0.5 ${isAmber ? 'font-bold text-[#111827]' : 'font-semibold text-[#374151]'}`}>
                    {notification.message}
                </h4>
                <div className="flex items-center gap-2">
                    <span className={`text-[12px] ${isAmber ? 'text-[#D97706] font-medium' : 'text-[#6B7280]'}`}>
                        {notification.time}
                    </span>
                    {isUrgent && (
                        <span className="text-[10px] font-bold text-[#E24B4A] tracking-wider uppercase flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#E24B4A] animate-pulse" />
                            Urgent
                        </span>
                    )}
                </div>
            </div>

            {/* Action Indicator */}
            <div className="flex flex-col items-end gap-1 shrink-0">
                {isUnread && !isUrgent && <div className="w-[8px] h-[8px] bg-[#EF9F27] rounded-full mb-1 animate-pulse" />}
                {notification.actionType && <ChevronRight size={18} className={isAmber ? "text-[#D97706]" : "text-[#9CA3AF]"} />}
            </div>
        </motion.div>
    );
});

import { useNavigate } from 'react-router-dom';
import { useWellness } from '../../../context/WellnessContext';
import {
  getClientNotifications,
  getRiskAlerts,
  markAlertRead,
  markClientNotificationRead,
  sendAssessmentMessage,
  createEscalation,
  getAssessorId,
} from '../../../services/supabaseService';

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function getClientNotificationDisplay(notification: ClientNotification): {
  Icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  title: string;
  unreadBorder: string;
} {
  if (notification.type === 'session_cancelled') {
    return {
      Icon: XCircle,
      iconColor: '#DC2626',
      iconBg: '#FEE2E2',
      title: 'Session cancelled',
      unreadBorder: '#DC2626',
    };
  }

  if (notification.type === 'session_scheduled') {
    return {
      Icon: Calendar,
      iconColor: '#2563EB',
      iconBg: '#DBEAFE',
      title: 'Session scheduled',
      unreadBorder: '#2563EB',
    };
  }

  if (notification.type === 'profile_updated') {
    return {
      Icon: ClipboardList,
      iconColor: '#7C3AED',
      iconBg: '#EDE9FE',
      title: 'Assessment team updated your profile',
      unreadBorder: '#7C3AED',
    };
  }

  if (notification.type === 'assessment_complete') {
    const cleared = (notification.message ?? '').toLowerCase().includes('cleared for training');
    return cleared
      ? {
          Icon: CheckCircle2,
          iconColor: '#16A34A',
          iconBg: '#DCFCE7',
          title: 'Your assessment is complete!',
          unreadBorder: '#16A34A',
        }
      : {
          Icon: ShieldAlert,
          iconColor: '#D97706',
          iconBg: '#FEF3C7',
          title: 'Your assessment needs further review',
          unreadBorder: '#D97706',
        };
  }

  return {
    Icon: ClipboardList,
    iconColor: '#166534',
    iconBg: '#DCFCE7',
    title: 'New program assigned',
    unreadBorder: '#166534',
  };
}

function ProgramNotificationItem({
  notification,
  onTap,
}: {
  notification: ClientNotification;
  onTap: (notification: ClientNotification) => void;
}) {
  const display = getClientNotificationDisplay(notification);
  const Icon = display.Icon;
  const isUnread = !notification.is_read;
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      onClick={() => onTap(notification)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full rounded-[12px] p-[14px] border-[1.5px] flex items-center gap-[14px] mb-[10px] cursor-pointer active:scale-[0.98] transition-all text-left"
      style={{
        backgroundColor: hovered ? '#F9FAFB' : isUnread ? '#ffffff' : '#F9FAFB',
        cursor: 'pointer',
        borderColor: isUnread ? '#E5E7EB' : '#F3F4F6',
        opacity: isUnread ? 1 : 0.82,
        borderLeft: isUnread
          ? `3px solid ${display.unreadBorder}`
          : '3px solid transparent',
      }}
    >
      <div
        className="w-[40px] h-[40px] shrink-0 rounded-[10px] flex items-center justify-center"
        style={{ backgroundColor: display.iconBg }}
      >
        <Icon size={20} color={display.iconColor} />
      </div>

      <div className="flex-1 min-w-0">
        <h4
          className="text-[13px] leading-[1.4] mb-0.5"
          style={{ fontWeight: isUnread ? 700 : 600, color: isUnread ? '#111827' : '#374151' }}
        >
          {display.title}
        </h4>
        {notification.message && (
          <p className="text-[12px] leading-snug line-clamp-2" style={{ color: isUnread ? '#4B5563' : '#6B7280' }}>
            {notification.message}
          </p>
        )}
        <span className="text-[12px] mt-1 block" style={{ color: isUnread ? '#6B7280' : '#9CA3AF' }}>
          {relativeTime(notification.created_at)}
        </span>
      </div>

      {isUnread && (
        <span
          className="w-[8px] h-[8px] rounded-full shrink-0"
          style={{ backgroundColor: display.unreadBorder }}
        />
      )}
    </button>
  );
}

export default function AlertsScreen() {
  const navigate = useNavigate();
  const { userId, appState, supabaseUser } = useWellness();

  // Derive avatar initial — same logic as HomeScreen.
  // Falls back to email first character if full_name not yet in appState
  // (e.g. direct navigation after page refresh before profile fetch resolves).
  const fullName = (appState.full_name as string) || '';
  const firstName = fullName.split(' ')[0] || '';
  const avatarInitial = firstName
    ? firstName[0].toUpperCase()
    : (supabaseUser?.email?.[0]?.toUpperCase() ?? '?');

  // ── Live Supabase state ──────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [clientNotifications, setClientNotifications] = useState<ClientNotification[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [fetchError,    setFetchError]    = useState(false);

  // ── Assessment team contact ───────────────────────────────────────────────
  const [assessmentMessage, setAssessmentMessage] = useState('');
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    let cancelled = false;
    setLoading(true);
    setFetchError(false);

    Promise.all([
      getRiskAlerts(userId),
      getClientNotifications(userId),
    ]).then(([alerts, notifs]) => {
      if (cancelled) return;
      const mapped: Notification[] = alerts.map(a => ({
        id:         a.id,
        type:       a.severity === 'high' ? 'alert' : 'info',
        message:    a.message,
        isRead:     a.is_read,
        time:       relativeTime(a.created_at),
      }));
      setNotifications(mapped);
      setClientNotifications(notifs);
    }).catch(() => {
      if (!cancelled) setFetchError(true);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [userId]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleMarkRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
    markAlertRead(id); // fire-and-forget — DB stays in sync
  };

  const handleMarkAllRead = () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    const unreadClientIds = clientNotifications.filter(n => !n.is_read).map(n => n.id);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setClientNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    unreadIds.forEach(id => markAlertRead(id));
    if (userId) {
      unreadClientIds.forEach(id => markClientNotificationRead(id, userId));
    }
  };

  const onAction = (n: Notification) => {
    if (n.actionType === 'view_report') navigate('/client/report/current');
    else if (n.actionType === 'view_tracking') navigate('/client/check-in');
  };

  const handleClientNotificationTap = async (notification: ClientNotification) => {
    if (!userId) return;

    // Optimistic mark-read
    setClientNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n),
    );

    try {
      await markClientNotificationRead(notification.id, userId);
    } catch {
      console.error('markClientNotificationRead failed for', notification.id);
    }

    if (notification.type === 'program_assigned') {
      // Programs are active on creation — no approval step. Send the client to
      // their dashboard, where the active program is shown.
      navigate('/client/dashboard');
    } else if (notification.type === 'session_cancelled') {
      navigate('/client/sessions');
    } else if (notification.type === 'session_scheduled') {
      navigate('/client/sessions');
    } else if (notification.type === 'profile_updated') {
      navigate('/onboarding/profile');
    } else if (notification.type === 'assessment_complete') {
      const cleared = (notification.message ?? '').toLowerCase().includes('cleared for training');
      navigate(cleared ? '/client/trainers' : '/client/dashboard');
    }
  };

  const handleSendToAssessmentTeam = async () => {
    if (!userId || sendStatus === 'sending' || sendStatus === 'sent') return;
    if (!assessmentMessage.trim()) {
      setSendError('Please enter a message.');
      return;
    }

    setSendStatus('sending');
    setSendError(null);

    try {
      const assessorId = await getAssessorId();
      if (!assessorId) throw new Error('Assessment team unavailable. Please try again later.');

      const [msgRes, escRes] = await Promise.all([
        sendAssessmentMessage(userId, assessorId, assessmentMessage.trim(), userId),
        createEscalation(userId, 'client'),
      ]);

      if (!msgRes.success) throw new Error(msgRes.error ?? 'Failed to send message.');
      if (!escRes.success) throw new Error(escRes.error ?? 'Failed to raise escalation.');

      setSendStatus('sent');
      setAssessmentMessage('');
    } catch (err: unknown) {
      setSendStatus('error');
      setSendError(err instanceof Error ? err.message : 'Failed to contact assessment team.');
    }
  };

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.isRead).length + clientNotifications.filter(n => !n.is_read).length,
    [clientNotifications, notifications],
  );

    return (
        <div className="max-w-md mx-auto w-full min-h-screen relative shadow-xl bg-gray-50 flex flex-col">

            {/* ZONE 1 — TOP BAR — tab destination: title-only header, no back arrow */}
            <ScreenHeader
                variant="sub"
                title="Alerts"
                avatar={<ProfileMenu />}
            />

            {/* MAIN LIST AREA */}
            <div className="flex-1 overflow-y-auto px-[16px] pb-[80px] scrollbar-hide">

                {/* Sub-header Controls */}
                <div className="flex justify-between items-center py-[16px]">
                    <div className="flex items-center gap-2">
                        <h2 className="text-[11px] font-bold text-[#6B7280] tracking-[0.07em] uppercase">
                            ALL NOTIFICATIONS
                        </h2>
                    </div>
                    <button
                        disabled={unreadCount === 0 || loading}
                        onClick={handleMarkAllRead}
                        className={`text-[12px] font-semibold transition-colors active:scale-95 ${unreadCount === 0 || loading ? 'text-[#9CA3AF] opacity-50 cursor-not-allowed' : 'text-[#1D9E75] hover:text-[#0F6E56]'
                            }`}
                    >
                        Mark all as read
                    </button>
                </div>

                {/* Loading skeleton */}
                {loading && (
                    <div className="space-y-3 pt-1">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-[12px] p-[14px] border border-[#E5E7EB] flex items-center gap-[14px] animate-pulse">
                                <div className="w-[40px] h-[40px] rounded-[10px] bg-gray-200 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Error state */}
                {!loading && fetchError && (
                    <div className="flex flex-col items-center justify-center py-20 px-10 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-400">
                            <AlertTriangle size={28} strokeWidth={1.5} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-[14px] font-bold text-[#111827]">Couldn't load alerts</h3>
                            <p className="text-[12px] text-[#6B7280] leading-relaxed">
                                Check your connection and try again.
                            </p>
                        </div>
                    </div>
                )}

                {/* Feed Generation */}
                {!loading && !fetchError && notifications.length > 0 && (
                    <div className="flex flex-col">
                        <AnimatePresence initial={false}>
                            {notifications.map((n) => (
                                <AlertItem
                                    key={n.id}
                                    notification={n}
                                    onMarkRead={handleMarkRead}
                                    onAction={onAction}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {!loading && !fetchError && clientNotifications.length > 0 && (
                    <section className="pt-[12px]">
                        <h2
                            className="text-[11px] font-bold tracking-[0.07em] uppercase mb-[10px]"
                            style={{ color: '#6B7280' }}
                        >
                            PROGRAM UPDATES
                        </h2>
                        {clientNotifications.map(notification => (
                            <ProgramNotificationItem
                                key={notification.id}
                                notification={notification}
                                onTap={handleClientNotificationTap}
                            />
                        ))}
                    </section>
                )}

                {!loading && !fetchError && notifications.length === 0 && clientNotifications.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 px-10 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-[#E5E7EB]/40 flex items-center justify-center text-[#9CA3AF]">
                            <Bell size={32} strokeWidth={1.5} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-[14px] font-bold text-[#111827]">No notifications yet</h3>
                            <p className="text-[12px] text-[#6B7280] leading-relaxed">
                                You'll be notified about sessions, scores and updates here.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Assessment Team CTA ─────────────────────────────────────── */}
                {!loading && !fetchError && (
                    <section className="mt-6 mb-2">
                        <div
                            className="rounded-2xl p-4 space-y-3"
                            style={{
                                backgroundColor: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                            }}
                        >
                            <p
                                className="text-[11px] font-bold uppercase tracking-wider"
                                style={{ color: '#166534' }}
                            >
                                Contact Assessment Team
                            </p>
                            <textarea
                                rows={3}
                                value={assessmentMessage}
                                onChange={e => setAssessmentMessage(e.target.value)}
                                placeholder="Describe your concern..."
                                disabled={sendStatus === 'sent'}
                                className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
                            />
                            <button
                                onClick={handleSendToAssessmentTeam}
                                disabled={sendStatus === 'sending' || sendStatus === 'sent'}
                                className="w-full text-sm font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-opacity"
                                style={{
                                    backgroundColor: sendStatus === 'sent' ? '#9ca3af' : '#0d9488',
                                    color: '#ffffff',
                                    opacity: sendStatus === 'sending' ? 0.7 : 1,
                                    cursor: sendStatus === 'sent' ? 'default' : 'pointer',
                                }}
                            >
                                {sendStatus === 'sending' && (
                                    <span
                                        className="w-4 h-4 rounded-full border-2 animate-spin"
                                        style={{ borderColor: '#ffffff', borderTopColor: 'transparent' }}
                                    />
                                )}
                                {sendStatus === 'sending'
                                    ? 'Sending...'
                                    : 'Send to Assessment Team →'}
                            </button>
                            {sendStatus === 'error' && sendError && (
                                <p className="text-xs font-medium text-center" style={{ color: '#dc2626' }}>
                                    {sendError}
                                </p>
                            )}
                            {sendStatus === 'sent' && (
                                <p className="text-xs font-medium text-center" style={{ color: '#0d9488' }}>
                                    Your message has been sent. The assessment team will follow up with you. ✓
                                </p>
                            )}
                        </div>
                    </section>
                )}
            </div>

            {/* BOTTOM NAVIGATION BAR */}
            <nav className="absolute bottom-0 left-0 right-0 h-[56px] bg-white border-t-[0.5px] border-[#E5E7EB] flex items-center justify-around px-[10px] z-[50]">
                <NavButton label="Home" icon={Home} onClick={() => navigate('/client/dashboard')} />
                <NavButton label="Trainers" icon={Users} onClick={() => navigate('/client/trainers')} />
                <NavButton label="Progress" icon={BarChart3} onClick={() => navigate('/client/progress')} />
                <NavButton label="Messages" icon={MessageSquare} onClick={() => navigate('/client/messages')} />
                <NavButton label="Alerts" icon={Bell} active={true} badgeContent={unreadCount} />
            </nav>
        </div>
    );
}

// Reused NavButton from HomeScreen UI source of truth
const NavButton = ({ label, icon: Icon, active = false, onClick, badgeContent }: { label: string; icon: LucideIcon; active?: boolean; onClick?: () => void; badgeContent?: number }) => (
    <button
        onClick={onClick}
        className="flex flex-col items-center justify-center gap-[2px] transition-all"
    >
        <div className="relative">
            <Icon size={20} strokeWidth={active ? 2.5 : 2} color={active ? '#1D9E75' : '#6B7280'} />
            {badgeContent && badgeContent > 0 && (
                <div className="absolute -top-[1.5px] -right-[1.5px] w-[6px] h-[6px] bg-[#E24B4A] rounded-full" />
            )}
        </div>
        <span className={`text-[10px] font-medium ${active ? 'text-[#1D9E75]' : 'text-[#6B7280]'}`}>{label}</span>
    </button>
);
