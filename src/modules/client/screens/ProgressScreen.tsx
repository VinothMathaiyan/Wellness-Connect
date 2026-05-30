/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Performance Strategy:
 * - Data Isolation: Uses custom `useProgressData` hook to separate static/API data from UI rendering.
 * - Optimized Chart Rendering: Uses `ResponsiveContainer` with debounce to prevent resize thrashing.
 * - Animation Boundaries: Employs Framer Motion only on localized components (like the history bars)
 *   to avoid triggering repaints across the entire complex flex layout.
 * - SVGs over DOM elements: Uses a clean inline SVG for the circular progress gauges rather than 
 *   heavy charting libraries for simple scores, saving significant bundle size and DOM nodes.
 */

import React from 'react';
import { motion } from 'motion/react';
import {
    Home,
    Users,
    BarChart3,
    MessageSquare,
    Bell,
    CheckCircle2,
    AlertTriangle,
    AlertCircle
} from 'lucide-react';
import { useProgressData } from '../../../hooks/useProgressData';
import MobileShell from '../../../components/MobileShell';
import ProfileMenu from '../../../components/ProfileMenu';
import ScreenHeader from '@/components/ScreenHeader';





import { useNavigate } from 'react-router-dom';
import { useWellness } from '../../../context/WellnessContext';

export default function ProgressScreen() {
  const navigate = useNavigate();
  void navigate;
  const { appState, userId } = useWellness();
  const unreadAlertsCount = (appState.notifications ?? []).filter(n => !n.isRead).length;
    const { userData, isLoading, fetchError } = useProgressData(userId);
    const hasData = userData.readinessHistory.length > 0;

    const getScoreColor = (score: number) => {
        if (score >= 70) return 'text-[#1D9E75]';
        if (score >= 40) return 'text-[#EF9F27]';
        return 'text-[#E24B4A]';
    };

    const initial = (appState.full_name || 'U').split(' ')[0][0].toUpperCase();

    return (
        <MobileShell>
            {/* Top Navigation Bar */}
            <div className="shrink-0 sticky top-0 z-20">
                <ScreenHeader
                    variant="sub"
                    title="Progress"
                    avatar={<ProfileMenu />}
                />
            </div>

            {/* Main scrollable content area */}
            <div className="flex-1 overflow-y-auto px-[16px] py-[16px] pb-[80px] scrollbar-hide space-y-6 bg-gray-50">

                {/* Loading skeleton */}
                {isLoading && (
                    <div className="space-y-3 animate-pulse">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="h-[90px] bg-gray-200 rounded-xl" />
                            <div className="h-[90px] bg-gray-200 rounded-xl" />
                        </div>
                        <div className="h-[44px] bg-gray-200 rounded-xl" />
                        <div className="h-[180px] bg-gray-200 rounded-xl" />
                    </div>
                )}

                {/* Error state */}
                {!isLoading && fetchError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-700 font-medium">
                        {fetchError}
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && !fetchError && !hasData && (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                        <span className="text-[40px] mb-3">📊</span>
                        <h3 className="text-[16px] font-bold text-[#111827] mb-1">No data yet</h3>
                        <p className="text-[13px] text-[#6B7280]">Start logging your check-ins to see your progress here.</p>
                    </div>
                )}

                {/* Sections hidden while loading or when no data */}
                {!isLoading && !fetchError && hasData && <>

                {/* SECTION 1: Score summary row */}
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { label: 'Readiness Score', val: userData.readinessScore, delta: userData.readinessDelta, unit: '' },
                        { label: 'Adherence Score', val: userData.adherenceScore, delta: userData.adherenceDelta, unit: '%' }
                    ].map((score, i) => (
                        <div key={i} className="bg-white border border-[#E5E7EB] rounded-xl p-4 space-y-3 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-[#6B7280] font-medium leading-tight">{score.label}</span>
                                <div className="w-8 h-8 relative flex items-center justify-center">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                                        <circle cx="20" cy="20" r="18" fill="none" stroke="#F3F4F6" strokeWidth="3" />
                                        <circle
                                            cx="20" cy="20" r="18" fill="none"
                                            stroke={score.val >= 70 ? '#1D9E75' : score.val >= 40 ? '#EF9F27' : '#E24B4A'}
                                            strokeWidth="3"
                                            strokeDasharray={113.1}
                                            strokeDashoffset={113.1 - (score.val / 100) * 113.1}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h4 className={`text-[24px] font-bold ${getScoreColor(score.val)} leading-none`}>
                                    {score.val}{score.unit}
                                </h4>
                                <p className="text-[11px] text-[#1D9E75] font-medium">
                                    {score.delta != null ? `↑ ${score.delta} from last week` : '-- from last week'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* SECTION 2: Risk status banner */}
                <div className={`px-4 py-3 rounded-xl flex items-center gap-2 border shadow-sm ${userData.riskStatus === 'green'
                        ? 'bg-[#E1F5EE] border-[#1D9E75]/20 text-[#0F6E56]'
                        : userData.riskStatus === 'yellow'
                            ? 'bg-[#FEF3C7] border-[#EF9F27]/20 text-[#854F0B]'
                            : 'bg-[#FCEBEB] border-[#E24B4A]/20 text-[#A32D2D]'
                    }`}>
                    {userData.riskStatus === 'green' ? <CheckCircle2 size={16} /> : userData.riskStatus === 'yellow' ? <AlertTriangle size={16} /> : <AlertCircle size={16} />}
                    <span className="text-[12px] font-semibold">
                        {userData.riskStatus === 'green'
                            ? "✓ No injury risk detected · Last checked today"
                            : userData.riskStatus === 'yellow'
                                ? "⚠ Yellow flag active · Trainer has been notified"
                                : "🚨 Red flag — Assessment team has been alerted"}
                    </span>
                </div>

                {/* Weight Trend deferred to post-MVP passive tracking (steps, HRV, weight). */}

                {/* SECTION 4: Weekly Readiness History */}
                <section className="space-y-3">
                    <h3 className="text-[11px] font-bold text-[#6B7280] uppercase tracking-widest pl-1">READINESS HISTORY</h3>
                    <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
                        <div className="h-[140px] w-full flex items-end justify-between gap-2 px-1">
                            {userData.readinessHistory.map((item, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                    <span className={`text-[10px] font-bold ${i === userData.readinessHistory.length - 1 ? 'text-[#1D9E75]' : 'text-[#9CA3AF]'}`}>{item.score}</span>
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${item.score}%` }}
                                        className={`w-full rounded-t-md transition-all duration-300 ${i === userData.readinessHistory.length - 1 ? 'bg-[#1D9E75]' : 'bg-[#1D9E75]/20'}`}
                                    />
                                    <span className="text-[10px] text-[#9CA3AF] font-medium">{item.week}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* SECTION 5: Program Stats row */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                    {[
                        { label: `${userData.sessionsDone} sessions completed`, icon: '✓' },
                        { label: `${userData.weeksActive} weeks active`, icon: '🔥' },
                        { label: `${userData.streak}-day streak`, icon: '⚡' }
                    ].map((stat, i) => (
                        <div key={i} className="whitespace-nowrap bg-[#F3F4F6] text-[#111827] rounded-full px-3 py-2 flex items-center gap-1.5 text-[11px] font-bold border border-transparent">
                            <span className="text-[#111827]">{stat.icon}</span>
                            {stat.label}
                        </div>
                    ))}
                </div>

                </>}
            </div>

            {/* BOTTOM NAVIGATION BAR */}
            <nav className="absolute bottom-0 left-0 right-0 h-[56px] bg-white border-t-[0.5px] border-[#E5E7EB] flex items-center justify-around px-[10px] z-[50]">
                <NavButton label="Home" icon={Home} onClick={() => navigate('/client/dashboard')} />
                <NavButton label="Trainers" icon={Users} onClick={() => navigate('/client/trainers')} />
                <NavButton label="Progress" icon={BarChart3} active={true} />
                <NavButton label="Messages" icon={MessageSquare} onClick={() => navigate('/client/messages')} />
                <NavButton label="Alerts" icon={Bell} onClick={() => navigate('/client/alerts')} badgeContent={unreadAlertsCount} />
            </nav>
        </MobileShell>
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
