/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Share2, Target, CheckCircle2 } from 'lucide-react';
import { WeeklyReport } from '../types';

interface WeeklyReportScreenProps {
    report: WeeklyReport;
    onBack: () => void;
    onSave: (reflection: string) => void;
}

const SparkLine = ({ data, color }: { data: { day_offset: number; value: number }[], color: string }) => {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data.map(d => d.value), 1);
    const width = 300;
    const height = 40;
    const points = data.map((d, i) => `${(i / 6) * width},${height - (d.value / max) * height}`).join(' ');

    return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
            <defs>
                <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                </linearGradient>
            </defs>
            <path
                d={`M0,${height} ${points} L${width},${height} Z`}
                fill={`url(#gradient-${color})`}
            />
            <motion.polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
            />
        </svg>
    );
};

export default function WeeklyReportScreen({ report, onBack, onSave }: WeeklyReportScreenProps) {
    const [reflection, setReflection] = useState(report.client_reflection || '');
    const [activeTooltip, setActiveTooltip] = useState<number | null>(null);

    const getDayLabel = (offset: number) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][offset];

    const getHeatmapColor = (score: number | null) => {
        if (score === null) return '#F3F4F6';
        if (score >= 70) return '#1D9E75';
        if (score >= 40) return '#EF9F27';
        return '#E24B4A';
    };

    const MetricCard = ({
        icon,
        name,
        avg,
        trend,
        data,
        color
    }: {
        icon: string;
        name: string;
        avg: string;
        trend: string;
        data: { day_offset: number; value: number }[];
        color: string;
    }) => {
        const hasEnoughData = data.length >= 3;

        return (
            <div className="bg-white border-[0.5px] border-[#E5E7EB] rounded-[12px] p-[14px]">
                <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[16px]">{icon}</span>
                        <span className="text-[13px] font-semibold text-[#111827]">{name}</span>
                    </div>
                    <span className="text-[13px] font-semibold" style={{ color }}>{avg}</span>
                </div>
                {!hasEnoughData ? (
                    <p className="text-[11px] text-[#9CA3AF] mt-1">Not enough data logged this week</p>
                ) : (
                    <>
                        <p className="text-[11px] text-[#6B7280] mb-3">{trend}</p>
                        <div className="mt-2 h-[40px] w-full">
                            <SparkLine data={data} color={color} />
                        </div>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-screen bg-white font-sans max-w-[375px] mx-auto relative overflow-hidden">
            {/* HEADER */}
            <header className="px-5 pt-6 pb-4 bg-white border-b border-[#E5E7EB] shrink-0 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-0.5">
                    <button onClick={onBack} className="p-1 -ml-2 text-[#111827]">
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="text-[16px] font-semibold text-[#111827]">Weekly Report</h1>
                    <button className="p-1 -mr-2 text-[#111827]">
                        <Share2 size={20} />
                    </button>
                </div>
                <span className="text-[12px] text-[#6B7280]">
                    Week {report.week_number} · {report.start_date} – {report.end_date}
                </span>
            </header>

            <main className="flex-1 overflow-y-auto px-4 pb-[100px] scrollbar-hide">
                {/* SECTION 1 — Week at a Glance */}
                <section className="mt-4">
                    <div className="bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] rounded-[14px] p-4 flex flex-col items-center">
                        <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-[0.07em] mb-4">WEEK {report.week_number} OVERVIEW</span>

                        <div className="relative w-[100px] h-[100px] flex items-center justify-center mb-5">
                            <svg width="100" height="100" className="absolute">
                                <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="6" opacity="0.5" />
                                <motion.circle
                                    cx="50" cy="50" r="40" fill="none" stroke="#4F46E5" strokeWidth="6"
                                    strokeDasharray="251.3"
                                    strokeDashoffset={251.3 - (report.averages.readiness / 100) * 251.3}
                                    strokeLinecap="round"
                                    transform="rotate(-90 50 50)"
                                    initial={{ strokeDashoffset: 251.3 }}
                                    animate={{ strokeDashoffset: 251.3 - (report.averages.readiness / 100) * 251.3 }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                />
                            </svg>
                            <div className="flex flex-col items-center">
                                <span className="text-[11px] text-[#6B7280]">Avg Readiness</span>
                                <span className="text-[28px] font-bold text-[#4F46E5] leading-none">{report.averages.readiness}</span>
                                <span className="text-[11px] text-[#6B7280]">/100</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 w-full">
                            {[
                                { emoji: '😴', value: `${report.averages.sleep_hours}h`, label: 'Sleep' },
                                { emoji: '💧', value: `${report.averages.water_litres}L`, label: 'Water' },
                                { emoji: '😊', value: `${report.averages.mood_score}/5`, label: 'Mood' },
                                { emoji: '⚡', value: `${report.averages.energy_level}/10`, label: 'Energy' },
                            ].map(stat => (
                                <div key={stat.label} className="bg-white rounded-[10px] p-2 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex flex-col items-center">
                                    <span className="text-[16px] mb-0.5">{stat.emoji}</span>
                                    <span className="text-[12px] font-semibold text-[#111827]">{stat.value}</span>
                                    <span className="text-[9px] text-[#9CA3AF] uppercase font-bold">{stat.label}</span>
                                </div>
                            ))}
                        </div>

                        <p className="mt-4 text-[12px] text-[#6B7280] italic text-center leading-relaxed">
                            "Your best day was {report.trends.best_day} · Most consistent metric: {report.trends.consistent_metric}"
                        </p>
                    </div>
                </section>

                {/* SECTION 2 — Daily Breakdown */}
                <section className="mt-8">
                    <h3 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.07em] mb-3">DAILY BREAKDOWN</h3>
                    <div className="flex justify-between items-end relative h-[60px]">
                        {report.daily_readiness.map((d, i) => (
                            <div key={i} className="flex flex-col items-center gap-1.5 relative">
                                <span className="text-[10px] text-[#6B7280]">{getDayLabel(i)}</span>
                                <button
                                    onClick={() => setActiveTooltip(activeTooltip === i ? null : i)}
                                    className="w-[36px] h-[36px] rounded-[8px] flex items-center justify-center transition-transform active:scale-95"
                                    style={{ backgroundColor: getHeatmapColor(d.score) }}
                                >
                                    <span className="text-[10px] font-bold text-white">
                                        {d.score !== null ? d.score : '–'}
                                    </span>
                                </button>

                                {activeTooltip === i && d.score !== null && (
                                    <div className="absolute bottom-[48px] bg-gray-900 text-white p-2 rounded-lg text-[10px] z-20 min-w-[80px] shadow-lg pointer-events-none">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex justify-between gap-3"><span>Score:</span> <span>{d.score}</span></div>
                                            <div className="flex justify-between gap-3"><span>Sleep:</span> <span>{report.trends.sleep.find(s => s.day_offset === i)?.value || '–'}h</span></div>
                                            <div className="flex justify-between gap-3"><span>Stress:</span> <span>Low</span></div>
                                        </div>
                                        {/* Tooltip Arrow */}
                                        <div className="absolute -bottom-1 left-1.2 right-1/2 ml-[-4px] w-2 h-2 bg-gray-900 rotate-45" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* SECTION 3 — Metric Trends */}
                <section className="mt-8">
                    <h3 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.07em] mb-3">THIS WEEK'S METRICS</h3>
                    <div className="space-y-[10px]">
                        <MetricCard
                            icon="🌙" name="Sleep Duration" avg={`${report.averages.sleep_hours} hrs / night`}
                            trend={`Best sleep on ${report.trends.best_day === 'Mon' ? 'Monday' : report.trends.best_day === 'Wed' ? 'Wednesday' : 'mid-week'}`}
                            data={report.trends.sleep} color="#7C3AED"
                        />
                        <MetricCard
                            icon="💧" name="Water Intake" avg={`${report.averages.water_litres} L / day`}
                            trend="Below 2.5L goal on some days"
                            data={report.trends.water} color="#3B9EE8"
                        />
                        <MetricCard
                            icon="😊" name="Mood" avg={`${report.averages.mood_score} / 5`}
                            trend="Mood was highest mid-week"
                            data={report.trends.mood} color="#1D9E75"
                        />
                        <MetricCard
                            icon="⚡" name="Energy Level" avg={`${report.averages.energy_level} / 10`}
                            trend="Dipped mid-week"
                            data={report.trends.energy} color="#EF9F27"
                        />
                        <MetricCard
                            icon="😌" name="Pain Level" avg={`Low (${report.averages.pain_score} / 10)`}
                            trend={report.averages.pain_score < 2 ? "No significant pain events this week" : "Low pain recorded"}
                            data={report.trends.pain} color={report.averages.pain_score >= 5 ? "#E24B4A" : "#1D9E75"}
                        />
                        <MetricCard
                            icon="🦵" name="Mobility" avg={`${report.averages.mobility_score} / 10`}
                            trend="Steadily improving week on week"
                            data={report.trends.mobility} color="#1D9E75"
                        />
                        <MetricCard
                            icon="👟" name="Steps" avg={`${report.averages.steps.toLocaleString()} / day`}
                            trend="Consistency is key!"
                            data={report.trends.steps} color="#185FA5"
                        />
                    </div>
                </section>

                {/* SECTION 4 — Trainer's Week Note */}
                {report.trainer_week_note && (
                    <section className="mt-8">
                        <h3 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.07em] mb-3">FROM YOUR TRAINER</h3>
                        <div className="bg-[#E1F5EE] rounded-[12px] p-[14px]">
                            <span className="text-[11px] font-bold text-[#0F6E56] block mb-2">Priya Sharma · Week {report.week_number} note</span>
                            <p className="text-[13px] text-[#111827] leading-relaxed">
                                {report.trainer_week_note}
                            </p>
                        </div>
                    </section>
                )}

                {/* SECTION 5 — Your Weekly Reflection */}
                <section className="mt-8">
                    <h3 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.07em] mb-3">YOUR REFLECTION</h3>
                    <div className="bg-white border-[0.5px] border-[#E5E7EB] rounded-[12px] p-[14px]">
                        <h4 className="text-[14px] font-semibold text-[#111827] mb-1">How does this week feel overall?</h4>
                        <p className="text-[12px] text-[#9CA3AF] leading-relaxed mb-4">
                            Optional — add a personal note about your week. Only you can see this.
                        </p>
                        <div className="relative">
                            <textarea
                                className="w-full min-h-[100px] bg-[#F9FAFB] border-[0.5px] border-[#D1D5DB] rounded-[10px] p-3 text-[13px] placeholder:italic placeholder:text-[#9CA3AF] outline-none focus:min-h-[160px] focus:border-[#1D9E75] transition-all duration-300"
                                placeholder="Any wins, struggles, things you noticed, or goals for next week…"
                                maxLength={500}
                                value={reflection}
                                onChange={(e) => setReflection(e.target.value)}
                            />
                            <span className="absolute bottom-2 right-3 text-[10px] text-[#9CA3AF] font-medium">
                                {reflection.length} / 500
                            </span>
                        </div>
                    </div>
                </section>

                {/* SECTION 6 — Next Week Nudge card */}
                <section className="mt-8 mb-4">
                    <div className="bg-[#F0FDF4] border-[0.5px] border-[#BBF7D0] rounded-[12px] p-[14px] flex items-start gap-4">
                        <div className="w-[32px] h-[32px] shrink-0 bg-white rounded-full flex items-center justify-center text-[18px]">
                            🎯
                        </div>
                        <div className="flex-1">
                            <h4 className="text-[13px] font-semibold text-[#111827] mb-0.5">Next week's focus</h4>
                            <p className="text-[12px] text-[#6B7280] leading-relaxed">
                                {report.averages.water_litres < 2.5
                                    ? "Your water intake averaged below goal — aim for 2.5L daily next week."
                                    : report.averages.sleep_hours < 7
                                        ? "Try to get just 30 minutes more sleep each night to help recovery."
                                        : "Sleep was your strongest metric — keep the routine going."}
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            {/* STICKY BOTTOM BUTTON */}
            <div className="absolute bottom-0 left-0 right-0 p-3 px-4 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.06)] z-[100]">
                <button
                    onClick={() => onSave(reflection)}
                    className="w-full h-[48px] bg-[#1D9E75] text-white rounded-[10px] text-[14px] font-bold flex items-center justify-center active:scale-[0.98] transition-transform shadow-sm"
                >
                    {reflection.length > 0 ? "Save reflection & close" : "Close report"}
                </button>
            </div>

            {/* Tooltip Overlay */}
            {activeTooltip !== null && (
                <div className="fixed inset-0 z-10" onClick={() => setActiveTooltip(null)} />
            )}
        </div>
    );
}
