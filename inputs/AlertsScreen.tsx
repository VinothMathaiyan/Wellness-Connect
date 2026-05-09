/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    CheckCircle2,
    AlertTriangle,
    Bell,
    Trash2,
    ChevronRight,
    MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Notification } from '../src/types';

interface AlertsScreenProps {
    notifications: Notification[];
    onMarkRead: (id: string) => void;
    onMarkAllRead: () => void;
    onAction: (notification: Notification) => void;
}

export default function AlertsScreen({
    notifications,
    onMarkRead,
    onMarkAllRead,
    onAction
}: AlertsScreenProps) {
    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="flex flex-col h-full bg-background -mx-4 -mt-4">
            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto pb-24">
                {/* Header with Mark All Read */}
                <div className="px-5 py-4 flex justify-between items-center bg-white border-b border-border-light sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <h2 className="text-[14px] font-bold text-text-primary uppercase tracking-wider">ALL NOTIFICATIONS</h2>
                        {unreadCount > 0 && (
                            <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <button
                        disabled={unreadCount === 0}
                        onClick={onMarkAllRead}
                        className={`text-[12px] font-semibold transition-colors ${unreadCount === 0 ? 'text-text-secondary opacity-40 cursor-default' : 'text-primary hover:text-primary-dark'
                            }`}
                    >
                        Mark all read
                    </button>
                </div>

                {notifications.length > 0 ? (
                    <div className="divide-y divide-border-light bg-white">
                        <AnimatePresence initial={false}>
                            {notifications.map((n) => (
                                <motion.div
                                    key={n.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    onClick={() => {
                                        if (!n.isRead) onMarkRead(n.id);
                                        onAction(n);
                                    }}
                                    className={`px-5 py-4 flex gap-4 cursor-pointer transition-all active:bg-input-bg/70 ${!n.isRead ? 'bg-[#F9FAFB]' : 'bg-white'
                                        }`}
                                >
                                    {/* Unread Dot */}
                                    <div className="pt-1.5 shrink-0">
                                        <div className={`w-2 h-2 rounded-full ${!n.isRead ? 'bg-primary' : 'bg-border'}`} />
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <p className={`text-[13px] leading-[1.45] ${!n.isRead ? 'text-text-primary font-medium' : 'text-text-secondary font-normal'}`}>
                                            {/* We can dangerously set HTML or just handle bold keys if we had structured data. 
                          For now, we'll just display the message as is, 
                          but the prompt suggested bolding key values. 
                          I'll simulate it by rendering a slightly cleaner message component if needed. */}
                                            {n.message}
                                        </p>
                                        <div className="flex items-center gap-2 pt-0.5">
                                            <span className="text-[11px] text-text-secondary opacity-60 font-medium">{n.time}</span>
                                            {n.type === 'alert' && (
                                                <div className="flex items-center gap-1 text-red text-[10px] font-bold">
                                                    <AlertTriangle size={10} />
                                                    URGENT
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {n.actionType && (
                                        <div className="self-center text-border-light">
                                            <ChevronRight size={16} />
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-10 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-input-bg flex items-center justify-center text-text-secondary/40">
                            <Bell size={32} strokeWidth={1.5} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-[15px] font-bold text-text-primary">No notifications yet</h3>
                            <p className="text-[13px] text-text-secondary leading-relaxed">
                                You'll be notified about sessions, scores and updates here.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
