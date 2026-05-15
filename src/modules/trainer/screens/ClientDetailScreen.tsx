import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  Edit,
  ChevronRight,
  Minus,
  User,
  Calendar,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import MobileShell from '../../../components/MobileShell';
import { useWellness } from '../../../context/WellnessContext';
import { getClientDetail, getClientCheckins } from '../../../services/supabaseService';

// ─── Types ──────────────────────────────────────────────────────────────────

type RiskLevel = 'red' | 'amber' | 'green' | 'none';
type RecommendationType = 'advance' | 'review' | 'regress' | 'simplify';
type SessionStatus = 'Completed' | 'No-show' | 'Cancelled';
type SessionType = 'Video' | 'In-person' | 'Phone';

interface ClientDetail {
  id: string;
  name: string;
  initials: string;
  clientRef: string;
  city: string;
  goals: string[];
  programWeek: number;
  programTotal: number;
  riskLevel: RiskLevel;
  riskMessage: string;
  readinessScore: number;
  readinessDelta: number;
  adherenceScore: number;
  adherenceDelta: number;
  recommendation: RecommendationType;
  recommendationText: string;
  lastCheckin: {
    date: string;
    reviewed: boolean;
    mobility: number;
    pain: number;
    energy: number;
    freeText: string;
  };
  sessions: { date: string; type: SessionType; status: SessionStatus }[];
  program: {
    name: string;
    weekNumber: number;
    totalWeeks: number;
    sessionsPerWeek: number;
    approvalStatus: 'approved' | 'pending' | 'draft';
  };
  isSessionToday: boolean;
}

// ─── Config Maps ─────────────────────────────────────────────────────────────

const RECOMMENDATION_CONFIG: Record<
  RecommendationType,
  { label: string; bg: string; text: string; border: string; Icon: React.ElementType }
> = {
  advance:  { label: 'Advance',  bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-100', Icon: TrendingUp   },
  review:   { label: 'Review',   bg: 'bg-yellow-50',  text: 'text-yellow-800',  border: 'border-yellow-100',  Icon: AlertTriangle },
  regress:  { label: 'Regress',  bg: 'bg-red-50',     text: 'text-red-800',     border: 'border-red-100',     Icon: TrendingDown  },
  simplify: { label: 'Simplify', bg: 'bg-orange-50',  text: 'text-orange-800',  border: 'border-orange-100',  Icon: Minus         },
};

const STATUS_BADGE: Record<SessionStatus, string> = {
  'Completed': 'bg-emerald-50 text-emerald-700',
  'No-show':   'bg-red-50 text-red-600',
  'Cancelled': 'bg-gray-100 text-gray-500',
};

const TYPE_CHIP: Record<SessionType, string> = {
  'Video':     'bg-blue-50 text-blue-700',
  'In-person': 'bg-teal-50 text-teal-700',
  'Phone':     'bg-purple-50 text-purple-700',
};

const APPROVAL_BADGE: Record<'approved' | 'pending' | 'draft', string> = {
  approved: 'bg-emerald-50 text-emerald-700',
  pending:  'bg-amber-50 text-amber-700',
  draft:    'bg-gray-100 text-gray-500',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapSeverityToRisk(severity?: string): RiskLevel {
  if (severity === 'high') return 'red';
  if (severity === 'medium') return 'amber';
  if (severity === 'low') return 'green';
  return 'none';
}

function formatCheckinDate(logDate?: string): string {
  if (!logDate) return DEV_MOCK_CLIENT.lastCheckin.date;
  try {
    return new Date(logDate).toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return DEV_MOCK_CLIENT.lastCheckin.date;
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider whitespace-nowrap">
        {title}
      </span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

function DeltaChip({ delta }: { delta: number }) {
  const positive = delta >= 0;
  return (
    <span className={`text-[11px] font-bold flex items-center gap-0.5 ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
      {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {positive ? `+${delta}` : `${delta}`}
    </span>
  );
}

function ScoreBar({
  label,
  value,
  maxValue = 10,
  redAbove,
}: {
  label: string;
  value: number;
  maxValue?: number;
  redAbove?: number;
}) {
  const isRed = redAbove !== undefined && value > redAbove;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] font-medium text-text-secondary w-16 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isRed ? 'bg-red-400' : 'bg-teal-400'}`}
          style={{ width: `${(value / maxValue) * 100}%` }}
        />
      </div>
      <span className={`text-[12px] font-bold w-5 text-right shrink-0 ${isRed ? 'text-red-500' : 'text-text-primary'}`}>
        {value}
      </span>
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ClientDetailScreen() {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();
  const { userId } = useWellness();

  const [clientData, setClientData] = useState<any>(null);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [effortScore, setEffortScore] = useState<number | null>(null);
  const [showFullNote, setShowFullNote] = useState(false);

  useEffect(() => {
    if (!userId || !clientId) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const [detail, history] = await Promise.all([
          getClientDetail(clientId, userId),
          getClientCheckins(clientId),
        ]);
        setClientData(detail);
        setCheckins(history);
      } catch (err) {
        console.error('ClientDetail load error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [userId, clientId]);

  // Build merged client object — DB data overrides mock fallback where available
  const dbProfile  = clientData?.profile;
  const dbAlert    = clientData?.activeAlert;
  const dbMetrics  = clientData?.latestMetrics;
  const dbPlan     = clientData?.currentPlan;

  const client: ClientDetail = {
    ...DEV_MOCK_CLIENT,
    ...(dbProfile && {
      name:     dbProfile.full_name ?? DEV_MOCK_CLIENT.name,
      initials: getInitials(dbProfile.full_name ?? '') || DEV_MOCK_CLIENT.initials,
      city:     dbProfile.city ?? DEV_MOCK_CLIENT.city,
      goals:    dbProfile.specialties ?? DEV_MOCK_CLIENT.goals,
    }),
    riskLevel:    dbAlert ? mapSeverityToRisk(dbAlert.severity) : DEV_MOCK_CLIENT.riskLevel,
    riskMessage:  dbAlert?.message ?? DEV_MOCK_CLIENT.riskMessage,
    readinessScore: dbMetrics?.readiness_score ?? DEV_MOCK_CLIENT.readinessScore,
    lastCheckin: {
      ...DEV_MOCK_CLIENT.lastCheckin,
      date:     formatCheckinDate(dbMetrics?.log_date),
      mobility: dbMetrics?.mood_score ?? DEV_MOCK_CLIENT.lastCheckin.mobility,
      // TODO: add pain_score column to daily_metrics
      pain:     DEV_MOCK_CLIENT.lastCheckin.pain,
      energy:   dbMetrics?.energy_score ?? DEV_MOCK_CLIENT.lastCheckin.energy,
    },
    program: {
      ...DEV_MOCK_CLIENT.program,
      name:            dbPlan?.template?.name ?? DEV_MOCK_CLIENT.program.name,
      totalWeeks:      dbPlan?.template?.duration_weeks ?? DEV_MOCK_CLIENT.program.totalWeeks,
      sessionsPerWeek: dbPlan?.template?.sessions_per_week ?? DEV_MOCK_CLIENT.program.sessionsPerWeek,
      approvalStatus: (() => {
        if (dbPlan?.status === 'approved') return 'approved';
        if (dbPlan?.status === 'pending_review') return 'pending';
        return DEV_MOCK_CLIENT.program.approvalStatus;
      })(),
    },
  };

  const rec     = RECOMMENDATION_CONFIG[client.recommendation];
  const RecIcon = rec.Icon;

  return (
    <MobileShell className="bg-[#F2F8F7]">

      {/* ─── Sticky Header ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft size={22} className="text-text-primary" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[17px] font-bold text-text-primary leading-tight truncate">{client.name}</p>
          <p className="text-[11px] text-text-secondary mt-0.5">{client.clientRef}</p>
        </div>
        {client.riskLevel === 'red' && (
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
        )}
        {client.riskLevel === 'amber' && (
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
        )}
      </div>

      {/* ─── Scrollable Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-32">
        {isLoading ? (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                style={{ backgroundColor: '#e5e7eb', borderRadius: '16px', height: '80px' }}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="px-4 pt-4 pb-6 space-y-4"
          >

            {/* ── 1. Client Profile Header ─────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start gap-3 mb-3">
                <button
                  onClick={() => console.log('View full profile')}
                  className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-[15px] font-bold shrink-0 active:scale-95 transition-transform"
                >
                  {client.initials || <User size={20} />}
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[17px] font-bold text-text-primary leading-tight">{client.name}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[11px] font-medium text-text-secondary bg-gray-100 px-2 py-0.5 rounded-full">
                      {client.clientRef}
                    </span>
                    <span className="text-[12px] text-text-secondary">{client.city}</span>
                  </div>
                </div>
              </div>

              {/* Goal chips */}
              <div className="-mx-1 flex gap-1.5 overflow-x-auto hide-scrollbar pb-1 mb-2">
                {client.goals.map(goal => (
                  <span
                    key={goal}
                    className="shrink-0 text-[12px] font-semibold text-teal-700 bg-teal-50 border border-teal-100 px-3 py-1 rounded-full"
                  >
                    {goal}
                  </span>
                ))}
              </div>

              <p className="text-[12px] text-text-secondary font-medium">
                Week {client.programWeek} of {client.programTotal}
              </p>
            </div>

            {/* ── 2. Risk Flag Banner ───────────────────────────────────────────────── */}
            {client.riskLevel === 'red' && (
              <div
                className="w-full bg-red-500 rounded-2xl p-4 mb-1 cursor-pointer"
                style={{ backgroundColor: '#ef4444' }}
                onClick={() => navigate(`/trainer/risk-alert/${clientId}`)}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-white mt-0.5 shrink-0" size={20} style={{ color: '#ffffff' }} />
                  <div>
                    <p className="text-white font-bold text-sm" style={{ color: '#ffffff' }}>
                      Immediate Attention Required
                    </p>
                    <p className="text-red-100 text-sm mt-0.5" style={{ color: '#fecaca' }}>
                      {client.riskMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {client.riskLevel === 'amber' && (
              <div
                className="w-full bg-amber-400 rounded-2xl p-4 mb-1 cursor-pointer"
                style={{ backgroundColor: '#fbbf24' }}
                onClick={() => navigate(`/trainer/risk-alert/${clientId}`)}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-amber-900 mt-0.5 shrink-0" size={20} style={{ color: '#78350f' }} />
                  <div>
                    <p className="text-amber-900 font-bold text-sm" style={{ color: '#78350f' }}>
                      Monitor Closely
                    </p>
                    <p className="text-amber-800 text-sm mt-0.5" style={{ color: '#92400e' }}>
                      {client.riskMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {client.riskLevel === 'green' && (
              <div className="flex justify-start">
                <span className="text-[12px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <CheckCircle size={13} /> On Track
                </span>
              </div>
            )}

            {/* ── 3. Readiness + Adherence ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2">Readiness</p>
                <div className="flex items-end justify-between">
                  <span className={`text-[28px] font-bold leading-none ${scoreColor(client.readinessScore)}`}>
                    {client.readinessScore}
                  </span>
                  <DeltaChip delta={client.readinessDelta} />
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2">Adherence</p>
                <div className="flex items-end justify-between">
                  <span className={`text-[28px] font-bold leading-none ${scoreColor(client.adherenceScore)}`}>
                    {client.adherenceScore}%
                  </span>
                  <DeltaChip delta={client.adherenceDelta} />
                </div>
              </div>
            </div>

            {/* ── 4. Engine 5.4 Recommendation ─────────────────────────────────────── */}
            <div className={`rounded-2xl border p-4 ${rec.bg} ${rec.border}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full bg-white/60 flex items-center justify-center shrink-0`}>
                  <RecIcon size={16} className={rec.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${rec.text} opacity-70`}>
                      Engine 5.4
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/50 ${rec.text}`}>
                      {rec.label}
                    </span>
                  </div>
                  <p className={`text-[13px] font-semibold leading-snug ${rec.text}`}>
                    {client.recommendationText}
                  </p>
                </div>
                <button
                  onClick={() => console.log('Approve recommendation')}
                  className={`shrink-0 text-[12px] font-bold px-3 py-1.5 rounded-xl bg-white/70 ${rec.text} active:bg-white transition-colors`}
                >
                  Approve
                </button>
              </div>
            </div>

            {/* ── 5. Last Check-in Summary ──────────────────────────────────────────── */}
            <div>
              <SectionHeader title="Last Check-In" />
              <button
                onClick={() => navigate(`/trainer/checkin-review/${clientId}`)}
                className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-left active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-text-secondary" />
                    <span className="text-[13px] font-semibold text-text-primary">{client.lastCheckin.date}</span>
                  </div>
                  {!client.lastCheckin.reviewed && (
                    <span className="text-[11px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full">
                      Unreviewed
                    </span>
                  )}
                </div>

                <div className="space-y-2.5 mb-3">
                  <ScoreBar label="Mobility" value={client.lastCheckin.mobility} />
                  <ScoreBar label="Pain"     value={client.lastCheckin.pain}     redAbove={6} />
                  <ScoreBar label="Energy"   value={client.lastCheckin.energy}   />
                </div>

                <div>
                  <p className={`text-[12px] text-text-secondary italic leading-relaxed ${!showFullNote ? 'line-clamp-2' : ''}`}>
                    "{client.lastCheckin.freeText}"
                  </p>
                  {client.lastCheckin.freeText.length > 60 && (
                    <button
                      onClick={e => { e.stopPropagation(); setShowFullNote(v => !v); }}
                      className="text-[11px] font-semibold text-teal-600 mt-1"
                    >
                      {showFullNote ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              </button>
            </div>

            {/* ── 6. Session History ────────────────────────────────────────────────── */}
            <div>
              <SectionHeader title="Sessions — Last 4 Weeks" />
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {client.sessions.map((session, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 px-4 py-3 ${idx < client.sessions.length - 1 ? 'border-b border-gray-50' : ''}`}
                  >
                    <Clock size={13} className="text-text-secondary shrink-0" />
                    <p className="text-[13px] font-medium text-text-primary flex-1 min-w-0 truncate">
                      {session.date}
                    </p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${TYPE_CHIP[session.type]}`}>
                      {session.type}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS_BADGE[session.status]}`}>
                      {session.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 7. Training Program Quick View ───────────────────────────────────── */}
            <div>
              <SectionHeader title="Current Program" />
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-[14px] font-bold text-text-primary leading-snug flex-1">
                    {client.program.name}
                  </p>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${APPROVAL_BADGE[client.program.approvalStatus]}`}>
                    {client.program.approvalStatus.charAt(0).toUpperCase() + client.program.approvalStatus.slice(1)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[12px] text-text-secondary font-medium mb-3">
                  <span>Week {client.program.weekNumber} of {client.program.totalWeeks}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span>{client.program.sessionsPerWeek}×/week</span>
                </div>
                <button
                  onClick={() => navigate(`/trainer/program-builder/${clientId}`)}
                  className="flex items-center gap-1.5 text-[13px] font-semibold text-teal-600 bg-teal-50 border border-teal-100 px-4 py-2 rounded-xl active:bg-teal-100 transition-colors"
                >
                  <Edit size={14} /> Edit Program
                </button>
              </div>
            </div>

            {/* ── 8. Log Session Note + Trainer Effort Score ────────────────────────── */}
            <div className="space-y-3">
              <button
                onClick={() => console.log('Log Session Note')}
                disabled={!client.isSessionToday}
                className="w-full py-3.5 rounded-2xl text-[15px] font-bold bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-sm shadow-teal-200 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Log Session Note
              </button>
              <button
                onClick={() => navigate(`/trainer/schedule-session/${clientId}`)}
                className="w-full py-3.5 rounded-2xl text-[15px] font-bold border-2 border-teal-600 text-teal-600 bg-white active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Calendar size={17} />
                Schedule Session
              </button>

              {client.isSessionToday && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <p className="text-[12px] font-bold text-text-secondary uppercase tracking-wider mb-3">
                    Rate today's effort
                  </p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(score => (
                      <button
                        key={score}
                        onClick={() => {
                          setEffortScore(score);
                          console.log('Effort score:', score);
                        }}
                        className={`flex-1 h-10 rounded-xl text-[14px] font-bold transition-all active:scale-95 ${
                          effortScore === score
                            ? 'bg-teal-500 text-white shadow-sm shadow-teal-200'
                            : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </motion.div>
        )}
      </div>
    </MobileShell>
  );
}

// DEV FALLBACK — remove after real client data exists
const DEV_MOCK_CLIENT: ClientDetail = {
  id: '2',
  name: 'Sarah Chen',
  initials: 'SC',
  clientRef: 'CL-2024-0042',
  city: 'Chennai',
  goals: ['Rehabilitation', 'Mobility'],
  programWeek: 4,
  programTotal: 12,
  riskLevel: 'red',
  riskMessage: 'Immediate attention required — pain levels elevated',
  readinessScore: 34,
  readinessDelta: -8,
  adherenceScore: 61,
  adherenceDelta: -5,
  recommendation: 'regress',
  recommendationText: 'Reduce load. Client showing stress indicators.',
  lastCheckin: {
    date: 'Mon, 12 May',
    reviewed: false,
    mobility: 5,
    pain: 8,
    energy: 3,
    freeText: "Knee feels tight after yesterday's session. Struggled with the lunges.",
  },
  sessions: [
    { date: 'Mon 5 May · 9:00 AM',  type: 'Video',     status: 'Completed' },
    { date: 'Wed 7 May · 9:00 AM',  type: 'Video',     status: 'No-show'   },
    { date: 'Mon 28 Apr · 9:00 AM', type: 'In-person', status: 'Completed' },
    { date: 'Wed 30 Apr · 9:00 AM', type: 'Video',     status: 'Cancelled' },
  ],
  program: {
    name: '12-Week Rehabilitation Foundation',
    weekNumber: 4,
    totalWeeks: 12,
    sessionsPerWeek: 3,
    approvalStatus: 'approved',
  },
  isSessionToday: true,
};
