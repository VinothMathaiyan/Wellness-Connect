import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import MobileShell from '../../../components/MobileShell';
import TrainerBottomNav from '../components/TrainerBottomNav';
import {
  getClientProgress,
  getClientCurrentProgram,
  getUserProfile,
} from '../../../services/supabaseService';
import type { ClientProgressRow, ClientCurrentProgram } from '../../../services/supabaseService';
import { formatDateLong } from '@/utils/dateUtils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avg(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
}

function pct(rows: ClientProgressRow[]): number | null {
  if (rows.length === 0) return null;
  const done = rows.filter(r => r.workout_done).length;
  return Math.round((done / rows.length) * 100);
}

function calcStreak(rows: ClientProgressRow[]): number {
  const dateSet = new Set(rows.map(r => r.log_date));
  let streak = 0;
  const d = new Date();
  for (;;) {
    const key = d.toISOString().split('T')[0];
    if (dateSet.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function calcProgramWeek(createdAt: string, durationWeeks: number | null): number | null {
  if (!durationWeeks) return null;
  const diffDays = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  const week = Math.floor(diffDays / 7) + 1;
  if (week < 1) return 1;
  if (week > durationWeeks) return durationWeeks;
  return week;
}

function fmtDate(dateStr: string): string {
  return formatDateLong(dateStr + 'T00:00:00');
}

function dayLabel(dateStr: string): string {
  // Weekday-only axis label (e.g. "Mon") — not a calendar date, so it stays a
  // weekday name rather than going through dateUtils. en-IN avoids en-US locale.
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
}

/** Return colour hex based on readiness score tier */
function readinessColor(score: number): string {
  if (score >= 70) return '#22c55e'; // green
  if (score >= 40) return '#f59e0b'; // amber
  return '#ef4444';                  // red
}

const PROGRAM_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  approved:          { bg: '#F0FDF4', text: '#166534', label: 'Approved' },
  active:            { bg: '#F0FDF4', text: '#166534', label: 'Active' },
  pending_review:    { bg: '#FFFBEB', text: '#92400E', label: 'Pending Review' },
  changes_requested: { bg: '#FEF2F2', text: '#991B1B', label: 'Changes Requested' },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#6B7280',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </span>
      <div style={{ flex: 1, height: 1, backgroundColor: '#F3F4F6' }} />
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        border: '1px solid #F3F4F6',
        padding: '14px 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
        {label}
      </p>
      <p style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1 }}>
        {value}
      </p>
    </div>
  );
}

function MetricRow({ label, value, suffix = '', note }: { label: string; value: number | null; suffix?: string; note?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: '1px solid #F9FAFB',
      }}
    >
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#374151', margin: 0 }}>{label}</p>
        {note && (
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>{note}</p>
        )}
      </div>
      <span
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: value !== null ? '#111827' : '#9CA3AF',
          marginLeft: 12,
          whiteSpace: 'nowrap',
        }}
      >
        {value !== null ? `${value}${suffix}` : '--'}
      </span>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ClientProgressView() {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();

  const [clientName, setClientName]   = useState<string>('Client');
  const [rows30, setRows30]           = useState<ClientProgressRow[]>([]);
  const [program, setProgram]         = useState<ClientCurrentProgram | null | undefined>(undefined);
  const [isLoading, setIsLoading]     = useState(true);
  const [fetchError, setFetchError]   = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;

    let mounted = true;
    setIsLoading(true);
    setFetchError(null);

    Promise.all([
      getClientProgress(clientId, 30),
      getClientCurrentProgram(clientId),
      getUserProfile(clientId).catch(() => null),
    ])
      .then(([progressResult, prog, profile]) => {
        if (!mounted) return;
        if (progressResult.error) {
          setFetchError(progressResult.error);
        } else {
          setRows30(progressResult.data);
        }
        setProgram(prog);
        if (profile?.full_name) setClientName(profile.full_name);
      })
      .catch(err => {
        if (!mounted) return;
        console.error('ClientProgressView fetch error:', err);
        setFetchError('Failed to load progress data.');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => { mounted = false; };
  }, [clientId]);

  // ── Derived data ─────────────────────────────────────────────────────────────

  // Last 7 days for avg readiness KPI
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenKey = sevenDaysAgo.toISOString().split('T')[0];
  const rows7 = rows30.filter(r => r.log_date >= sevenKey);

  const avgReadiness7 = avg(rows7.map(r => r.readiness_score));
  const adherencePct  = pct(rows30);
  const totalCheckins = rows30.length;
  const streak        = calcStreak(rows30);

  // Last 14 days for bar chart
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  const fourteenKey = fourteenDaysAgo.toISOString().split('T')[0];
  const rows14 = rows30.filter(r => r.log_date >= fourteenKey);

  // Build a map so we can show empty slots for missing days
  const dateMap = new Map<string, number | null>();
  rows14.forEach(r => dateMap.set(r.log_date, r.readiness_score));

  const chartDays: Array<{ key: string; score: number | null }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    chartDays.push({ key, score: dateMap.has(key) ? (dateMap.get(key) ?? null) : null });
  }

  // Metric averages last 30 days
  const avgSleep  = avg(rows30.map(r => r.sleep_hours));
  const avgEnergy = avg(rows30.map(r => r.energy_score));
  const avgMood   = avg(rows30.map(r => r.mood_score));
  const avgPain   = avg(rows30.map(r => r.pain_score));

  // Recent check-ins (last 5, newest first)
  const recent5 = [...rows30]
    .sort((a, b) => b.log_date.localeCompare(a.log_date))
    .slice(0, 5);

  // Program week
  const programWeek = program
    ? calcProgramWeek(program.created_at, program.duration_weeks)
    : null;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <MobileShell className="bg-[#F2F8F7]">

      {/* ── Sticky Header ──────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #F3F4F6',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '6px',
            marginLeft: -6,
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: '#111827',
          }}
          aria-label="Go back"
        >
          <ChevronLeft size={22} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {clientName}
          </p>
          <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>Progress Overview</p>
        </div>
      </div>

      {/* ── Scrollable Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-24">

        {isLoading ? (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ backgroundColor: '#E5E7EB', borderRadius: 16, height: 80 }} />
            ))}
          </div>
        ) : fetchError ? (
          <div
            style={{
              margin: 20,
              backgroundColor: '#FEF2F2',
              borderRadius: 16,
              padding: '20px 16px',
              textAlign: 'center',
            }}
          >
            <Activity size={28} style={{ color: '#DC2626', marginBottom: 8 }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#991B1B', margin: 0 }}>
              Failed to load progress
            </p>
            <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{fetchError}</p>
          </div>
        ) : (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Section 1: KPI Grid ─────────────────────────────────────────────── */}
            <div>
              <SectionHeader title="Summary (Last 7–30 Days)" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <KpiCard
                  label="Avg Readiness (7d)"
                  value={avgReadiness7 !== null ? String(avgReadiness7) : '--'}
                />
                <KpiCard
                  label="Adherence"
                  value={adherencePct !== null ? `${adherencePct}%` : '--'}
                />
                <KpiCard
                  label="Total Check-ins"
                  value={String(totalCheckins)}
                />
                <KpiCard
                  label="Current Streak"
                  value={streak > 0 ? `${streak}d` : '--'}
                />
              </div>
            </div>

            {/* ── Section 2: Readiness Trend (14 days) ───────────────────────────── */}
            <div>
              <SectionHeader title="Readiness Trend (14 Days)" />
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  border: '1px solid #F3F4F6',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  padding: '16px 12px 12px',
                }}
              >
                {rows14.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>No check-ins in the last 14 days</p>
                  </div>
                ) : (
                  <>
                    {/* Bar chart */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: 4,
                        height: 80,
                        marginBottom: 6,
                      }}
                    >
                      {chartDays.map(({ key, score }) => (
                        <div
                          key={key}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'flex-end',
                            height: '100%',
                          }}
                        >
                          <div
                            style={{
                              width: '100%',
                              borderRadius: '4px 4px 0 0',
                              backgroundColor:
                                score !== null
                                  ? readinessColor(score)
                                  : '#E5E7EB',
                              height:
                                score !== null
                                  ? `${Math.max((score / 100) * 100, 8)}%`
                                  : '8%',
                              minHeight: 3,
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    {/* X-axis labels — show every other day to avoid crowding */}
                    <div style={{ display: 'flex', gap: 4 }}>
                      {chartDays.map(({ key }, idx) => (
                        <div key={key} style={{ flex: 1, textAlign: 'center' }}>
                          {idx % 2 === 0 && (
                            <span style={{ fontSize: 9, color: '#9CA3AF' }}>
                              {dayLabel(key)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Legend */}
                    <div
                      style={{
                        display: 'flex',
                        gap: 12,
                        marginTop: 10,
                        flexWrap: 'wrap',
                      }}
                    >
                      {[
                        { color: '#22c55e', label: '≥70 Good' },
                        { color: '#f59e0b', label: '40–69 Fair' },
                        { color: '#ef4444', label: '<40 Low' },
                      ].map(({ color, label }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
                          <span style={{ fontSize: 10, color: '#6B7280' }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Section 3: Metric Averages ──────────────────────────────────────── */}
            <div>
              <SectionHeader title="Metric Averages (30 Days)" />
              {rows30.length === 0 ? (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    border: '1px solid #F3F4F6',
                    padding: '20px 16px',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>No data in the last 30 days</p>
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    border: '1px solid #F3F4F6',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    padding: '4px 16px',
                  }}
                >
                  <MetricRow label="Sleep" value={avgSleep} suffix=" hrs" />
                  <MetricRow label="Energy" value={avgEnergy} suffix="/10" />
                  <MetricRow label="Mood" value={avgMood} suffix="/10" />
                  <div style={{ padding: '10px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#374151', margin: 0 }}>Pain</p>
                        <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>lower is better</p>
                      </div>
                      <span style={{ fontSize: 18, fontWeight: 700, color: avgPain !== null ? '#111827' : '#9CA3AF', marginLeft: 12 }}>
                        {avgPain !== null ? `${avgPain}/10` : '--'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Section 4: Recent Check-ins ─────────────────────────────────────── */}
            <div>
              <SectionHeader title="Recent Check-ins" />
              {recent5.length === 0 ? (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    border: '1px solid #F3F4F6',
                    padding: '20px 16px',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>No check-ins yet</p>
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    border: '1px solid #F3F4F6',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Table header */}
                  <div
                    style={{
                      display: 'flex',
                      padding: '8px 14px',
                      backgroundColor: '#F9FAFB',
                      borderBottom: '1px solid #F3F4F6',
                    }}
                  >
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date</span>
                    <span style={{ width: 64, textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Readiness</span>
                    <span style={{ width: 48, textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Done</span>
                  </div>

                  {recent5.map((row, idx) => (
                    <div
                      key={row.log_date}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 14px',
                        borderBottom: idx < recent5.length - 1 ? '1px solid #F9FAFB' : 'none',
                      }}
                    >
                      <span style={{ flex: 1, fontSize: 13, color: '#374151', fontWeight: 500 }}>
                        {fmtDate(row.log_date)}
                      </span>
                      <span
                        style={{
                          width: 64,
                          textAlign: 'center',
                          fontSize: 14,
                          fontWeight: 700,
                          color:
                            row.readiness_score !== null
                              ? readinessColor(row.readiness_score)
                              : '#9CA3AF',
                        }}
                      >
                        {row.readiness_score ?? '--'}
                      </span>
                      <span
                        style={{
                          width: 48,
                          textAlign: 'center',
                          fontSize: 15,
                          color: row.workout_done ? '#22c55e' : '#EF4444',
                        }}
                      >
                        {row.workout_done ? '✓' : '✗'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Section 5: Current Program ──────────────────────────────────────── */}
            <div>
              <SectionHeader title="Current Program" />
              {program === undefined ? (
                /* Still loading program separately — show skeleton */
                <div style={{ backgroundColor: '#E5E7EB', borderRadius: 16, height: 80 }} />
              ) : program === null ? (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    border: '1px solid #F3F4F6',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    padding: '20px 16px',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>
                    No program assigned
                  </p>
                  <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 14px' }}>
                    Create a workout program for this client
                  </p>
                  <button
                    onClick={() => navigate(`/trainer/program-builder/${clientId}`)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#0D9488',
                      backgroundColor: '#F0FDFA',
                      border: '1px solid #CCFBF1',
                      borderRadius: 12,
                      padding: '8px 16px',
                      cursor: 'pointer',
                    }}
                  >
                    Create Program <ChevronRight size={14} />
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    border: '1px solid #F3F4F6',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0, flex: 1 }}>
                      {program.name ?? 'Untitled Program'}
                    </p>
                    {(() => {
                      const badge = PROGRAM_BADGE[program.status] ?? { bg: '#F3F4F6', text: '#6B7280', label: program.status };
                      return (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: badge.bg,
                            color: badge.text,
                            borderRadius: 999,
                            padding: '3px 8px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>

                  {programWeek !== null && program.duration_weeks !== null && (
                    <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 12px' }}>
                      Week {programWeek} of {program.duration_weeks}
                    </p>
                  )}

                  {program.sessions_per_week !== null && (
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 14px' }}>
                      {program.sessions_per_week}× per week
                      {program.duration_weeks !== null && ` · ${program.duration_weeks} weeks total`}
                    </p>
                  )}

                  <button
                    onClick={() => navigate(`/trainer/program-builder/${clientId}`)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#0D9488',
                      backgroundColor: '#F0FDFA',
                      border: '1px solid #CCFBF1',
                      borderRadius: 12,
                      padding: '7px 14px',
                      cursor: 'pointer',
                    }}
                  >
                    Edit Program
                  </button>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      <TrainerBottomNav />
    </MobileShell>
  );
}
