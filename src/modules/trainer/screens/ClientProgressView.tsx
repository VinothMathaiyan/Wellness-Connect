import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import MobileShell from '../../../components/MobileShell';
import TrainerBottomNav from '../components/TrainerBottomNav';
import { getClientProgressOverview } from '../../../services/supabaseService';
import type { ClientProgressOverview } from '../../../services/supabaseService';
import { formatDateLong } from '@/utils/dateUtils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  active:            { bg: '#F0FDF4', text: '#166534', label: 'Active' },
  pending_review:    { bg: '#FFFBEB', text: '#92400E', label: 'Pending Review' },
  cancelled:         { bg: '#F3F4F6', text: '#6B7280', label: 'Cancelled' },
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

  const [data, setData]           = useState<ClientProgressOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!clientId) return;
    let mounted = true;
    setIsLoading(true);
    setFetchError(null);

    getClientProgressOverview(clientId)
      .then(result => {
        if (mounted) setData(result);
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

  useEffect(() => load(), [load]);

  // ── Derived display values ───────────────────────────────────────────────────
  const clientName = data?.clientName ?? 'Client';
  const summary    = data?.summary;
  const trend      = data?.readinessTrend14d ?? [];
  const metrics    = data?.metricAverages30d;
  const recent     = data?.recentCheckins ?? [];
  const program    = data?.currentProgram ?? null;

  const hasTrendData = trend.some(d => d.readiness_score !== null);
  // 1..5 metric scales are doubled for the design's "/10" display (see CLAUDE.md note).
  const energyOutOf10 = metrics?.energyScore != null ? Math.round(metrics.energyScore * 2) : null;
  const moodOutOf10   = metrics?.moodScore   != null ? Math.round(metrics.moodScore   * 2) : null;
  const hasMetricData =
    metrics != null &&
    (metrics.sleepHours !== null || metrics.energyScore !== null || metrics.moodScore !== null || metrics.painScore !== null);

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
            <p style={{ fontSize: 12, color: '#DC2626', margin: '4px 0 14px' }}>{fetchError}</p>
            <button
              onClick={() => load()}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#991B1B',
                backgroundColor: '#FFFFFF',
                border: '1px solid #FECACA',
                borderRadius: 12,
                padding: '8px 16px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Section 1: KPI Grid ─────────────────────────────────────────────── */}
            <div>
              <SectionHeader title="Summary (Last 7–30 Days)" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <KpiCard
                  label="Avg Readiness (7d)"
                  value={summary?.avgReadiness7d != null ? String(summary.avgReadiness7d) : '--'}
                />
                <KpiCard
                  label="Adherence"
                  value={summary?.adherencePct != null ? `${summary.adherencePct}%` : '--'}
                />
                <KpiCard
                  label="Total Check-ins"
                  value={String(summary?.totalCheckins30d ?? 0)}
                />
                <KpiCard
                  label="Current Streak"
                  value={
                    summary && summary.currentStreak > 0
                      ? `${summary.currentStreak} ${summary.currentStreak === 1 ? 'day' : 'days'}`
                      : '--'
                  }
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
                {/* Bar chart — always rendered (placeholder bars when no data) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 4,
                    height: 80,
                    marginBottom: 6,
                  }}
                >
                  {trend.map(({ log_date, readiness_score }) => (
                    <div
                      key={log_date}
                      style={{ flex: 1, display: 'flex', alignItems: 'flex-end', height: '100%' }}
                    >
                      <div
                        style={{
                          width: '100%',
                          borderRadius: '4px 4px 0 0',
                          backgroundColor:
                            readiness_score !== null ? readinessColor(readiness_score) : '#E5E7EB',
                          height:
                            readiness_score !== null
                              ? `${Math.max((readiness_score / 100) * 100, 8)}%`
                              : '8%',
                          minHeight: 3,
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* X-axis labels — show every other day to avoid crowding */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {trend.map(({ log_date }, idx) => (
                    <div key={log_date} style={{ flex: 1, textAlign: 'center' }}>
                      {idx % 2 === 0 && (
                        <span style={{ fontSize: 9, color: '#9CA3AF' }}>{dayLabel(log_date)}</span>
                      )}
                    </div>
                  ))}
                </div>

                {!hasTrendData && (
                  <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', margin: '10px 0 0' }}>
                    No check-ins yet
                  </p>
                )}

                {/* Legend */}
                <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
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
              </div>
            </div>

            {/* ── Section 3: Metric Averages ──────────────────────────────────────── */}
            <div>
              <SectionHeader title="Metric Averages (30 Days)" />
              {!hasMetricData ? (
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
                  <MetricRow label="Sleep" value={metrics?.sleepHours ?? null} suffix=" hrs" />
                  <MetricRow label="Energy" value={energyOutOf10} suffix="/10" />
                  <MetricRow label="Mood" value={moodOutOf10} suffix="/10" />
                  <div style={{ padding: '10px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#374151', margin: 0 }}>Pain</p>
                        <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>lower is better</p>
                      </div>
                      <span style={{ fontSize: 18, fontWeight: 700, color: metrics?.painScore != null ? '#111827' : '#9CA3AF', marginLeft: 12 }}>
                        {metrics?.painScore != null ? `${metrics.painScore.toFixed(1)}/10` : '--'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Section 4: Recent Check-ins ─────────────────────────────────────── */}
            <div>
              <SectionHeader title="Recent Check-ins" />
              {recent.length === 0 ? (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    border: '1px solid #F3F4F6',
                    padding: '20px 16px',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>No check-ins logged yet</p>
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

                  {recent.map((row, idx) => (
                    <div
                      key={row.log_date}
                      style={{
                        padding: '10px 14px',
                        borderBottom: idx < recent.length - 1 ? '1px solid #F9FAFB' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ flex: 1, fontSize: 13, color: '#374151', fontWeight: 500 }}>
                        {fmtDate(row.log_date)}
                      </span>
                      <span
                        style={{
                          width: 64,
                          textAlign: 'center',
                          fontSize: 14,
                          fontWeight: 700,
                          color: row.readiness_score !== null ? readinessColor(row.readiness_score) : '#9CA3AF',
                        }}
                      >
                        {row.readiness_score ?? '--'}
                      </span>
                      <span
                        style={{
                          width: 48,
                          textAlign: 'center',
                          fontSize: 15,
                          color:
                            row.workout_done === true ? '#22c55e'
                            : row.workout_done === false ? '#EF4444'
                            : '#9CA3AF',
                        }}
                      >
                        {row.workout_done === true ? '✓' : row.workout_done === false ? '✗' : '--'}
                      </span>
                      </div>
                      {row.note_for_trainer && (
                        <p style={{ fontSize: 12, color: '#6B7280', fontStyle: 'italic', margin: '4px 0 0', lineHeight: 1.4 }}>
                          Note: {row.note_for_trainer}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Section 5: Current Program ──────────────────────────────────────── */}
            <div>
              <SectionHeader title="Current Program" />
              {program === null ? (
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
                    No active program
                  </p>
                  <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 14px' }}>
                    Assign a workout program for this client
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
                    Assign one <ChevronRight size={14} />
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
                      {program.templateName ?? 'Unnamed program'}
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

                  {program.durationWeeks !== null && (
                    <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 4px' }}>
                      Week {program.weekOfPlan ?? '—'} of {program.durationWeeks}
                    </p>
                  )}

                  {program.sessionsPerWeek !== null && (
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 14px' }}>
                      {program.sessionsPerWeek}× per week
                      {program.durationWeeks !== null && ` · ${program.durationWeeks} weeks total`}
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
