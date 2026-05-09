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

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Home,
    Users,
    BarChart3,
    Bell,
    AlertTriangle,
    CheckCircle2,
    ChevronRight
} from 'lucide-react';
import type { Notification } from '../types';

interface AlertsScreenProps {
    notifications: Notification[];
    onMarkRead: (id: string) => void;
    onMarkAllRead: () => void;
    onAction: (notification: Notification) => void;
    onGoHome?: () => void;
    onFindTrainer?: () => void;
    onViewProgress?: () => void;
    onProfileClick?: () => void;
}

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

export default function AlertsScreen({
    notifications,
    onMarkRead,
    onMarkAllRead,
    onAction,
    onGoHome,
    onFindTrainer,
    onViewProgress,
    onProfileClick
}: AlertsScreenProps) {

    const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

    return (
        <div className="max-w-md mx-auto w-full min-h-screen relative shadow-xl bg-gray-50 flex flex-col">

            {/* ZONE 1 — TOP BAR */}
            <header className="h-[52px] w-full flex items-center justify-between px-[20px] bg-white border-b-[0.5px] border-[#E5E7EB] shrink-0 sticky top-0 z-20">
                <div className="w-[36px]" />
                <h1 className="text-[16px] font-semibold text-[#111827]">Alerts</h1>
                <button
                    onClick={onProfileClick}
                    className="w-[36px] h-[36px] rounded-full bg-white border-[1.5px] border-[#1D9E75] flex items-center justify-center text-[14px] font-semibold text-[#1D9E75] active:bg-[#F0F9FF] transition-colors"
                >
                    V
                </button>
            </header>

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
                        disabled={unreadCount === 0}
                        onClick={onMarkAllRead}
                        className={`text-[12px] font-semibold transition-colors active:scale-95 ${unreadCount === 0 ? 'text-[#9CA3AF] opacity-50 cursor-not-allowed' : 'text-[#1D9E75] hover:text-[#0F6E56]'
                            }`}
                    >
                        Mark all as read
                    </button>
                </div>

                {/* Feed Generation */}
                {notifications.length > 0 ? (
                    <div className="flex flex-col">
                        <AnimatePresence initial={false}>
                            {notifications.map((n) => (
                                <AlertItem
                                    key={n.id}
                                    notification={n}
                                    onMarkRead={onMarkRead}
                                    onAction={onAction}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
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
            </div>

            {/* BOTTOM NAVIGATION BAR */}
            <nav className="absolute bottom-0 left-0 right-0 h-[56px] bg-white border-t-[0.5px] border-[#E5E7EB] flex items-center justify-around px-[10px] z-[50]">
                <NavButton label="Home" icon={Home} onClick={onGoHome} />
                <NavButton label="Trainers" icon={Users} onClick={onFindTrainer} />
                <NavButton label="Progress" icon={BarChart3} onClick={onViewProgress} />
                <NavButton label="Alerts" icon={Bell} active={true} badgeContent={unreadCount} />
            </nav>
        </div>
    );
}

// Reused NavButton from HomeScreen UI source of truth
const NavButton = ({ label, icon: Icon, active = false, onClick, badgeContent }: { label: string; icon: any; active?: boolean; onClick?: () => void; badgeContent?: number }) => (
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