import { useState, useEffect, memo } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Share2 } from 'lucide-react';
import MobileShell from '../../../components/MobileShell';
import ProfileMenu from '../../../components/ProfileMenu';
import { getWeeklyLogs } from '../../../services/supabaseService';
import type { DailyLog } from '../../../types';
import { formatDate } from '@/utils/dateUtils';



const SparkLine = memo(({ data, color }: { data: { day_offset: number; value: number }[], color: string }) => {
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
});

const MetricCard = memo(({
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
});

import { useNavigate } from 'react-router-dom';
import { useWellness } from '../../../context/WellnessContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avgOf(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

/** ISO week number for a given date */
function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// No static mock trends — all data comes from DB or shows empty state

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WeeklyReportScreen() {
  const navigate = useNavigate();
  void navigate;
  const { userId, handleWeeklyReportSave } = useWellness();
  const [reflection, setReflection] = useState('');
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);
  const [weeklyLogs, setWeeklyLogs] = useState<DailyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch real weekly logs using userId from context ──────────────────────
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getWeeklyLogs(userId)
      .then(logs => {
        if (!cancelled) setWeeklyLogs(logs);
      })
      .catch(err => {
        console.error('WeeklyReportScreen getWeeklyLogs:', err);
        if (!cancelled) setError('Could not load your weekly report. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId]);

  // ── Derive real averages from fetched logs ────────────────────────────────
  const hasData = weeklyLogs.length > 0;

  const readinessVals = weeklyLogs.map(l => l.readiness_score ?? 0);
  const sleepVals     = weeklyLogs.map(l => l.sleep_hours);
  const waterVals     = weeklyLogs.map(l => l.water_glasses * 0.25);
  const moodVals      = weeklyLogs.map(l => l.mood_score);
  const energyVals    = weeklyLogs.map(l => l.energy_score);
  const painVals      = weeklyLogs.map(l => l.pain_score ?? 0);
  const mobilityVals  = weeklyLogs.map(l => l.mobility_score ?? 0);

  // ── Build Mon-indexed sparkline data from real logs ───────────────────────
  const buildSparkline = (vals: number[]) =>
    weeklyLogs.map((log, i) => ({
      day_offset: (new Date(log.log_date).getDay() + 6) % 7,
      value: vals[i],
    })).sort((a, b) => a.day_offset - b.day_offset);

  const liveTrends = {
    sleep:    buildSparkline(sleepVals),
    water:    buildSparkline(waterVals),
    mood:     buildSparkline(moodVals),
    energy:   buildSparkline(energyVals),
    pain:     buildSparkline(painVals),
    mobility: buildSparkline(mobilityVals),
  };

  // ── Build Mon-indexed daily_readiness heatmap (7 slots) ───────────────────
  const dailyReadiness: { score: number | null }[] = Array(7).fill(null).map(() => ({ score: null }));
  weeklyLogs.forEach(log => {
    const dayIdx = (new Date(log.log_date).getDay() + 6) % 7; // Mon=0 … Sun=6
    dailyReadiness[dayIdx] = { score: log.readiness_score ?? null };
  });

  // ── Compute week label from current date ──────────────────────────────────
  const now = new Date();
  const weekNum = isoWeekNumber(now);
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmtShort = (d: Date) => formatDate(d);

  // ── Compose final report — null when no data, no hardcoded fallbacks ──────
  const report = {
    week_number: weekNum,
    start_date: fmtShort(monday),
    end_date:   fmtShort(sunday),
    averages: hasData ? {
      readiness:     Math.round(avgOf(readinessVals)),
      sleep_hours:   parseFloat(avgOf(sleepVals).toFixed(1)),
      water_litres:  parseFloat(avgOf(waterVals).toFixed(1)),
      mood_score:    parseFloat(avgOf(moodVals).toFixed(1)),
      energy_level:  parseFloat(avgOf(energyVals).toFixed(1)),
      pain_score:    parseFloat(avgOf(painVals).toFixed(1)),
      mobility_score: parseFloat(avgOf(mobilityVals).toFixed(1)),
    } : null,
    trends: liveTrends,
    daily_readiness: dailyReadiness,
    trainer_week_note: null as string | null, // fetched from DB in future; null until wired
  };

    const getDayLabel = (offset: number) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][offset];

    const getHeatmapColor = (score: number | null) => {
        if (score === null) return '#F3F4F6';
        if (score >= 70) return '#1D9E75';
        if (score >= 40) return '#EF9F27';
        return '#E24B4A';
    };

    return (
        <MobileShell className="flex flex-col h-screen bg-white font-sans relative overflow-hidden">
            {/* HEADER */}
            <header className="px-5 pt-6 pb-4 bg-white border-b border-[#E5E7EB] shrink-0 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-0.5">
                    <button onClick={(() => navigate(-1))} className="p-1 -ml-2 text-[#111827]">
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="text-[16px] font-semibold text-[#111827]">Weekly Report</h1>
                    <div className="flex items-center gap-2">
                        <button className="p-1 text-[#111827]">
                            <Share2 size={20} />
                        </button>
                        <ProfileMenu />
                    </div>
                </div>
                <span className="text-[12px] text-[#6B7280]">
                    Week {report.week_number} · {report.start_date} – {report.end_date}
                </span>
            </header>

            <main className="flex-1 overflow-y-auto px-4 pb-[100px] scrollbar-hide">

                {/* LOADING STATE */}
                {isLoading && (
                  <section className="mt-8 flex flex-col items-center text-center px-4">
                    <div className="w-8 h-8 border-2 border-[#E5E7EB] border-t-[#1D9E75] rounded-full animate-spin mb-3" />
                    <p className="text-[13px] text-[#6B7280]">Loading your weekly report…</p>
                  </section>
                )}

                {/* ERROR STATE */}
                {!isLoading && error && (
                  <section className="mt-8 flex flex-col items-center text-center px-4">
                    <div className="text-[48px] mb-3">⚠️</div>
                    <h3 className="text-[16px] font-semibold text-[#111827] mb-2">Couldn't load report</h3>
                    <p className="text-[13px] text-[#6B7280] leading-relaxed max-w-[260px]">
                      {error}
                    </p>
                  </section>
                )}

                {/* NO DATA STATE */}
                {!isLoading && !error && !hasData && (
                  <section className="mt-8 flex flex-col items-center text-center px-4">
                    <div className="text-[48px] mb-3">📋</div>
                    <h3 className="text-[16px] font-semibold text-[#111827] mb-2">No data this week</h3>
                    <p className="text-[13px] text-[#6B7280] leading-relaxed max-w-[260px]">
                      Complete your daily check-ins to unlock your weekly report. Log at least one day to see your stats here.
                    </p>
                  </section>
                )}

                {/* SECTION 1 — Week at a Glance (only when data exists) */}
                {hasData && report.averages && (
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
                                { emoji: '⚡', value: `${report.averages.energy_level}/5`, label: 'Energy' },
                            ].map(stat => (
                                <div key={stat.label} className="bg-white rounded-[10px] p-2 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex flex-col items-center">
                                    <span className="text-[16px] mb-0.5">{stat.emoji}</span>
                                    <span className="text-[12px] font-semibold text-[#111827]">{stat.value}</span>
                                    <span className="text-[9px] text-[#9CA3AF] uppercase font-bold">{stat.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
                )}

                {/* SECTION 2 — Daily Breakdown */}
                {hasData && (
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
                                            <div className="flex justify-between gap-3"><span>Sleep:</span> <span>{report.trends.sleep.find(s => s.day_offset === i)?.value ?? '–'}h</span></div>
                                        </div>
                                        {/* Tooltip Arrow */}
                                        <div className="absolute -bottom-1 left-1.2 right-1/2 ml-[-4px] w-2 h-2 bg-gray-900 rotate-45" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
                )}

                {/* SECTION 3 — Metric Trends */}
                {hasData && report.averages && (
                <section className="mt-8">
                    <h3 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.07em] mb-3">THIS WEEK'S METRICS</h3>
                    <div className="space-y-[10px]">
                        <MetricCard
                            icon="🌙" name="Sleep Duration" avg={`${report.averages.sleep_hours} hrs / night`}
                            trend="Sleep duration across the week"
                            data={report.trends.sleep} color="#7C3AED"
                        />
                        <MetricCard
                            icon="💧" name="Water Intake" avg={`${report.averages.water_litres} L / day`}
                            trend={report.averages.water_litres < 2.5 ? "Below 2.5L goal on some days" : "Hitting hydration goal"}
                            data={report.trends.water} color="#3B9EE8"
                        />
                        <MetricCard
                            icon="😊" name="Mood" avg={`${report.averages.mood_score} / 5`}
                            trend="Mood across the week"
                            data={report.trends.mood} color="#1D9E75"
                        />
                        <MetricCard
                            icon="⚡" name="Energy Level" avg={`${report.averages.energy_level} / 5`}
                            trend="Energy levels across the week"
                            data={report.trends.energy} color="#EF9F27"
                        />
                        <MetricCard
                            icon="😌" name="Pain Level" avg={`${report.averages.pain_score} / 10`}
                            trend={report.averages.pain_score < 2 ? "No significant pain this week" : "Some pain recorded — monitor closely"}
                            data={report.trends.pain} color={report.averages.pain_score >= 5 ? "#E24B4A" : "#1D9E75"}
                        />
                        <MetricCard
                            icon="🦵" name="Mobility" avg={`${report.averages.mobility_score} / 10`}
                            trend="Mobility score across the week"
                            data={report.trends.mobility} color="#1D9E75"
                        />
                    </div>
                </section>
                )}

                {/* SECTION: Daily Logs */}
                {!isLoading && !error && (
                <section className="mt-8">
                    <h3 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.07em] mb-3">DAILY LOGS</h3>
                    <div className="bg-white border-[0.5px] border-[#E5E7EB] rounded-[12px] p-[14px]">
                        {weeklyLogs.length === 0 ? (
                            <p className="text-[12px] text-[#9CA3AF] text-center py-2">No logs recorded this week.</p>
                        ) : (
                            <ul className="space-y-2">
                                {weeklyLogs.map(log => (
                                    <li key={log.log_date} className="flex justify-between items-center text-[13px] border-b border-[#F3F4F6] pb-2 last:border-0 last:pb-0">
                                        <span className="text-[#6B7280]">{log.log_date}</span>
                                        <span className="font-semibold text-[#111827]">Mood: {log.mood_score} · Readiness: {log.readiness_score ?? '—'}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>
                )}

                {/* SECTION 4 — Trainer's Week Note (hidden until DB-wired) */}
                {report.trainer_week_note && (
                    <section className="mt-8">
                        <h3 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.07em] mb-3">FROM YOUR TRAINER</h3>
                        <div className="bg-[#E1F5EE] rounded-[12px] p-[14px]">
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

                {/* SECTION 6 — Next Week Nudge card (only when data exists) */}
                {hasData && report.averages && (
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
                )}
            </main>

            {/* STICKY BOTTOM BUTTON */}
            <div className="absolute bottom-0 left-0 right-0 p-3 px-4 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.06)] z-[100]">
                <button
                    onClick={() => {
                        handleWeeklyReportSave(reflection);
                        navigate('/client/dashboard');
                    }}
                    className="w-full h-[48px] bg-[#1D9E75] text-white rounded-[10px] text-[14px] font-bold flex items-center justify-center active:scale-[0.98] transition-transform shadow-sm"
                >
                    {reflection.length > 0 ? "Save reflection & close" : "Close report"}
                </button>
            </div>

            {/* Tooltip Overlay */}
            {activeTooltip !== null && (
                <div className="fixed inset-0 z-10" onClick={() => setActiveTooltip(null)} />
            )}
        </MobileShell>
    );
}
