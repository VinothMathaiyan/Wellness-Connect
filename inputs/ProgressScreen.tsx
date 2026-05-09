// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import {
    BarChart3,
    TrendingUp,
    CheckCircle2,
    AlertTriangle,
    AlertCircle
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';

interface ProgressScreenProps {
    userData: {
        full_name: string;
        id?: string;
        readinessScore: number;
        adherenceScore: number;
        sessionsDone: number;
        weeksActive: number;
        progressBreakdown?: {
            mobility: number;
            sleepRecovery: number;
            sessionAttendance: number;
            habitCompletion: number;
        };
        riskStatus: 'green' | 'yellow' | 'red';
        riskReason?: string | null;
        riskLastChecked?: string;
        readinessHistory: { week: string; score: number }[];
        trainerName?: string;
    };
}

export default function ProgressScreen({ userData }: ProgressScreenProps) {
    const getScoreColor = (score: number) => {
        if (score >= 70) return 'text-[#1D9E75]';
        if (score >= 40) return 'text-[#EF9F27]';
        return 'text-[#E24B4A]';
    };

    const weightData = [
        { date: "Mar 10", weight: 76.0 },
        { date: "Mar 17", weight: 75.5 },
        { date: "Mar 24", weight: 75.2 },
        { date: "Mar 31", weight: 74.8 },
        { date: "Apr 07", weight: 74.3 },
        { date: "Apr 14", weight: 73.8 },
        { date: "Apr 21", weight: 73.5 },
        { date: "Today", weight: 73.2 },
    ];

    return (
        <div className="flex flex-col gap-6 pb-20 font-inter">
            {/* SECTION 1: Score summary row */}
            <div className="grid grid-cols-2 gap-3">
                {[
                    { label: 'Readiness Score', val: userData.readinessScore, delta: '+6 from last week' },
                    { label: 'Adherence Score', val: userData.adherenceScore, delta: '+3 from last week', unit: '%' }
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
                            <p className="text-[11px] text-[#1D9E75] font-medium">↑ {score.delta}</p>
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

            {/* SECTION 3: Weight Trend */}
            <section className="space-y-3">
                <h3 className="text-[11px] font-bold text-[#6B7280] uppercase tracking-widest pl-1">WEIGHT TREND</h3>
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm space-y-4">
                    <div className="h-[160px] w-full">
                        <ResponsiveContainer width="100%" height={160} minWidth={0} debounce={100}>
                            <LineChart data={weightData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                    dy={10}
                                />
                                <YAxis
                                    hide
                                    domain={['dataMin - 1', 'dataMax + 1']}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                />
                                {/* Goal Line */}
                                <Line
                                    type="monotone"
                                    dataKey={() => 72.0}
                                    stroke="#E5E7EB"
                                    strokeDasharray="4 4"
                                    strokeWidth={1}
                                    dot={false}
                                    activeDot={false}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="weight"
                                    stroke="#1D9E75"
                                    strokeWidth={2.5}
                                    dot={{ r: 4, fill: '#1D9E75', strokeWidth: 0 }}
                                    activeDot={{ r: 6, fill: '#1D9E75', stroke: '#fff', strokeWidth: 2 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-medium text-[#111827]">
                        <span>Latest: <span className="font-bold">73.2 kg</span></span>
                        <span className="text-[#6B7280]">Started: 76.0 kg</span>
                        <span className="text-[#1D9E75]">Change: −2.8 kg</span>
                    </div>
                </div>
            </section>

            {/* SECTION 4: Weekly Readiness History */}
            <section className="space-y-3">
                <h3 className="text-[11px] font-bold text-[#6B7280] uppercase tracking-widest pl-1">READINESS HISTORY</h3>
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
                    <div className="h-[140px] w-full flex items-end justify-between gap-2 px-1">
                        {[72, 78, 82, 84, 80, 86].map((score, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                <span className={`text-[10px] font-bold ${i === 5 ? 'text-[#1D9E75]' : 'text-[#9CA3AF]'}`}>{score}</span>
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${score}%` }}
                                    className={`w-full rounded-t-md transition-all duration-300 ${i === 5 ? 'bg-[#1D9E75]' : 'bg-[#1D9E75]/20'}`}
                                />
                                <span className="text-[10px] text-[#9CA3AF] font-medium">W{i + 1}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SECTION 5: Program Stats row */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                {[
                    { label: '12 sessions completed', icon: '✓' },
                    { label: '3 weeks active', icon: '🔥' },
                    { label: '4-day streak', icon: '⚡' }
                ].map((stat, i) => (
                    <div key={i} className="whitespace-nowrap bg-[#F3F4F6] text-[#111827] rounded-full px-3 py-2 flex items-center gap-1.5 text-[11px] font-bold border border-transparent">
                        <span className="text-[#111827]">{stat.icon}</span>
                        {stat.label}
                    </div>
                ))}
            </div>
        </div>
    );
}
