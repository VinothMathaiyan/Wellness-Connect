import { useRef, useState, useEffect, type ComponentType } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Users, BarChart3, MessageSquare, Bell, BarChart2, Phone, MapPin, Video } from 'lucide-react';
import type { ClientSession } from '../../../types';
import MobileShell from '../../../components/MobileShell';
import ProfileMenu from '../../../components/ProfileMenu';
import ScreenHeader from '../../../components/ScreenHeader';
import { formatDateLong } from '@/utils/dateUtils';



/* ── Helpers ─────────────────────────────────────────────── */
const formatDateShort = () => formatDateLong(new Date());

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

const getScoreColor = (s: number) => s >= 70 ? '#1D9E75' : s >= 40 ? '#EF9F27' : '#E24B4A';



/* ── NutritionCard ─────────────────────────── */
const NutritionCard = ({
  logged = 0,  onClick, dailyNutrition
}: {
  logged?: number;
  dailyNutrition?: any;
  onClick: () => void;
}) => {
  const hasData = !!dailyNutrition && dailyNutrition.calories > 0;
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-[12px] p-[14px] border border-[#E5E7EB] mb-[10px] cursor-pointer active:bg-[#F3F4F6] transition-colors"
    >
      <div className="flex items-center gap-[14px]">
        <div className="w-[48px] h-[48px] shrink-0 bg-[#FFF3E0] rounded-[10px] flex items-center justify-center text-[24px]">
          🥗
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-semibold text-[#111827]">Log your meal</h4>
          {hasData ? (
            <p className="text-[12px] text-[#1D9E75] font-medium">
              {dailyNutrition!.calories} kcal consumed today
            </p>
          ) : (
            <p className="text-[12px] text-[#6B7280]">Tap to add breakfast, lunch or dinner</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[11px] font-semibold text-[#1D9E75]">{logged} of 3 logged</span>
          <div className="flex gap-[4px]">
            {[1, 2, 3].map(i => (
              <div key={i} className={`w-[8px] h-[8px] rounded-full ${i <= logged ? 'bg-[#1D9E75]' : 'border border-[#D1D5DB]'}`} />
            ))}
          </div>
        </div>
        <div className="text-[16px] text-[#9CA3AF] ml-1">›</div>
      </div>

      {/* Macro pills — appear after first meal is saved */}
      {hasData && (
        <div className="flex gap-[6px] mt-[10px]">
          {[
            { label: 'P', value: dailyNutrition!.protein_g, color: '#10B981' },
            { label: 'C', value: dailyNutrition!.carbs_g,   color: '#F59E0B' },
            { label: 'F', value: dailyNutrition!.fat_g,     color: '#EF4444' },
          ].map(m => (
            <span
              key={m.label}
              className="flex-1 text-center rounded-[6px] py-[3px] text-[10px] font-bold"
              style={{ backgroundColor: m.color + '18', color: m.color }}
            >
              {m.label} {Math.round(m.value)}g
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── TrainingCard ────────────────────────────────────────── */
const SESSION_TYPE_LABELS: Record<string, string> = {
  yoga: 'Yoga Session',
  strength: 'Strength Training',
  cardio: 'Cardio Session',
  recovery: 'Recovery Session',
  'in-person': 'In-Person Session',
  video: 'Video Session',
  phone: 'Phone Session',
};

const TrainingCard = ({ session, onClick }: { session?: ClientSession; onClick: () => void }) => {
  const getEmoji = (t: string) => ({ yoga:'🧘', strength:'🏋️', cardio:'🏃', recovery:'💆', video:'📹', 'in-person':'🏟️', phone:'📞' }[t] ?? '🏋️');
  const getLabel = (t: string) => SESSION_TYPE_LABELS[t] ?? t;
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });

  if (!session) return (
    <div onClick={onClick} className="bg-white rounded-[12px] p-[14px] border border-[#E5E7EB] flex items-center gap-[14px] mb-[10px] cursor-pointer active:bg-[#F3F4F6] transition-colors">
      <div className="w-[48px] h-[48px] shrink-0 bg-[#F3F4F6] rounded-[10px] flex items-center justify-center text-[24px]">📅</div>
      <div className="flex-1"><h4 className="text-[13px] font-medium text-[#6B7280]">No session today</h4></div>
      <div className="text-[16px] text-[#9CA3AF]">›</div>
    </div>
  );

  const now = new Date();
  const start = new Date(session.scheduled_at);
  const end = new Date(start.getTime() + session.duration_minutes * 60000);
  const diffMin = (start.getTime() - now.getTime()) / 60000;
  const isLive = diffMin <= 10 && now < end && session.status !== 'completed';
  const isSoon = diffMin <= 10 && now < start && session.status !== 'completed';

  if (isLive || isSoon) return (
    <div onClick={onClick} className="bg-[#E1F5EE] rounded-[12px] p-[14px] border-[1.5px] border-[#1D9E75] mb-[10px] cursor-pointer">
      <div className="flex items-center gap-[14px]">
        <div className="w-[48px] h-[48px] shrink-0 bg-white rounded-[10px] flex items-center justify-center text-[24px]">{getEmoji(session.session_type)}</div>
        <div className="flex-1">
          <h4 className="text-[14px] font-semibold text-[#111827]">{getLabel(session.session_type)}</h4>
          <p className="text-[12px] text-[#6B7280]">{session.trainer_name} · {fmtTime(session.scheduled_at)} · {session.duration_minutes} min</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-[8px] h-[8px] bg-[#1D9E75] rounded-full animate-pulse" />
          <span className="text-[12px] font-semibold text-[#1D9E75]">{isLive ? 'Live now' : 'Starting soon'}</span>
        </div>
      </div>
      {session.session_type === 'video' && session.meeting_url ? (
        <button
          onClick={e => { e.stopPropagation(); window.open(session.meeting_url!, '_blank'); }}
          className="w-full h-[40px] bg-[#1D9E75] text-white text-[13px] font-semibold rounded-[8px] mt-[10px] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <Video size={14} /> Join Session
        </button>
      ) : session.session_type === 'video' ? (
        /* video but no link yet */
        <div className="w-full h-[40px] bg-gray-100 text-gray-400 text-[13px] font-semibold rounded-[8px] mt-[10px] flex items-center justify-center gap-2">
          <Video size={14} /> Meet link not yet added
        </div>
      ) : session.session_type === 'phone' ? (
        <div className="w-full h-[40px] rounded-[8px] mt-[10px] flex items-center justify-center gap-2 text-[13px] font-semibold" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
          <Phone size={14} /> Call your trainer at session time
        </div>
      ) : session.session_type === 'in-person' ? (
        <div className="w-full h-[40px] rounded-[8px] mt-[10px] flex items-center justify-center gap-2 text-[13px] font-semibold" style={{ backgroundColor: '#FFF7ED', color: '#C2410C' }}>
          <MapPin size={14} /> In-person session
        </div>
      ) : null}
    </div>
  );

  return (
    <div onClick={onClick} className="bg-white rounded-[12px] p-[14px] border border-[#E5E7EB] flex items-center gap-[14px] mb-[10px] cursor-pointer active:bg-[#F3F4F6] transition-colors">
      <div className="w-[48px] h-[48px] shrink-0 bg-[#F0F9FF] rounded-[10px] flex items-center justify-center text-[24px]">{getEmoji(session.session_type)}</div>
      <div className="flex-1">
        <h4 className="text-[14px] font-semibold text-[#111827]">{getLabel(session.session_type)}</h4>
        <p className="text-[12px] text-[#6B7280]">{session.trainer_name} · {fmtTime(session.scheduled_at)} · {session.duration_minutes} min</p>
      </div>
      <div className="px-3 py-1 border border-[#1D9E75] rounded-full text-[12px] font-bold text-[#1D9E75]">Today</div>
      <div className="text-[16px] text-[#9CA3AF]">›</div>
    </div>
  );
};

/* ── WeeklyReportCard ────────────────────────────────────── */
// Enable rule: the Weekly Report unlocks once the client has logged at least
// WEEKLY_REPORT_MIN_DAYS distinct days this week — it's a check-in, not a final
// exam, so it shouldn't wait for all 7 days or for today's check-in to be 100%.
const WeeklyReportCard = ({ weekLabel, loggedDays, teaser, onClick }: {
  weekLabel: string; loggedDays: number; teaser?: { sleep: string; mood: string; energy: string }; onClick: () => void;
}) => {
  const remaining = Math.max(0, WEEKLY_REPORT_MIN_DAYS - loggedDays);
  const unlocked = remaining === 0;

  if (!unlocked) return (
    <div className="bg-white rounded-[12px] p-[14px] border border-[#E5E7EB] flex items-center gap-[14px] mb-[10px] opacity-65">
      <div className="w-[48px] h-[48px] shrink-0 bg-[#EEF2FF] rounded-[10px] flex items-center justify-center"><BarChart2 size={24} className="text-[#4F46E5]" /></div>
      <div className="flex-1"><h4 className="text-[13px] font-semibold text-[#111827]">Weekly Report</h4><p className="text-[12px] text-[#9CA3AF]">{remaining} more daily log{remaining === 1 ? '' : 's'} to unlock</p></div>
      <div className="px-3 py-0.5 bg-gray-100 rounded-full text-[11px] font-bold text-[#9CA3AF]">{weekLabel}</div>
    </div>
  );
  return (
    <div onClick={onClick} className="bg-white rounded-[12px] p-[14px] border border-[#E5E7EB] flex items-center gap-[14px] mb-[10px] cursor-pointer active:bg-[#F3F4F6] transition-colors">
      <div className="w-[48px] h-[48px] shrink-0 bg-[#EEF2FF] rounded-[10px] flex items-center justify-center"><BarChart2 size={24} className="text-[#4F46E5]" /></div>
      <div className="flex-1">
        <h4 className="text-[13px] font-semibold text-[#111827]">Weekly Report</h4>
        <p className="text-[12px] text-[#6B7280] mb-1">This week's summary ready</p>
        {teaser && (
          <div className="flex flex-wrap gap-1">
            <span className="px-2 py-0.5 bg-[#F3F4F6] text-[10px] rounded-full">😴 Sleep {teaser.sleep}</span>
            <span className="px-2 py-0.5 bg-[#F3F4F6] text-[10px] rounded-full">😊 Mood {teaser.mood}</span>
            <span className="px-2 py-0.5 bg-[#F3F4F6] text-[10px] rounded-full">⚡ Energy {teaser.energy}</span>
          </div>
        )}
      </div>
      <div className="px-3 py-0.5 bg-[#4F46E5] rounded-full text-[11px] font-semibold text-white">View report</div>
    </div>
  );
};

/* ── HomeScreen (Main Export) ────────────────────────────── */
import { useNavigate } from 'react-router-dom';
import { useWellness } from '../../../context/WellnessContext';
import { getClientReadiness, getTodaySession, getClientUnreadCount, hasActiveWorkoutPlan, getClientTodayMealCount, getClientTodayCheckinStatus, getClientCurrentWeek, getClientPlanInfo, getWeeklyLogs } from '../../../services/supabaseService';
import { supabase } from '../../../lib/supabaseClient';
import { getUserProfile } from '../../../services/supabaseService';
import { type ProgramWeek, WEEKLY_REPORT_MIN_DAYS } from '../../../utils/program';
import ClientBottomNav from '../components/ClientBottomNav';
export default function HomeScreen() {
  const navigate = useNavigate();
  const { appState, userId, workoutProgress } = useWellness();

  // ── Live Supabase state ────────────────────────────────────────────────────
  const [readinessScore,    setReadinessScore]    = useState<number | null>(null);
  const [hasPlan,           setHasPlan]           = useState(false);
  const [todaySession,      setTodaySession]      = useState<ClientSession | null>(null);
  const [homeDataLoading,   setHomeDataLoading]   = useState(true);
  const [fetchError,        setFetchError]        = useState<'offline' | 'error' | null>(null);

  // ── Live meal count + nutrition from Supabase ─────────────────────────────
  const [mealsLoggedLive,   setMealsLoggedLive]   = useState(0);
  const [dailyNutritionLive, setDailyNutritionLive] = useState<{ calories: number; protein_g: number; carbs_g: number; fat_g: number } | null>(null);

  // ── Live check-in status from Supabase ────────────────────────────────────
  const [checkinStatus, setCheckinStatus] = useState<{ hasCheckin: boolean; done: number; total: number }>({ hasCheckin: false, done: 0, total: 7 });

  // ── Live current week from active plan ────────────────────────────────────
  const [currentWeekLive, setCurrentWeekLive] = useState<ProgramWeek | null>(null);
  const [totalWeeksLive, setTotalWeeksLive] = useState<number | null>(null);
  const [scheduledAtLive, setScheduledAtLive] = useState<string | null>(null);
  // Distinct days logged in the current week — drives the Weekly Report unlock.
  const [weekLoggedDays, setWeekLoggedDays] = useState(0);

  // ── Live user profile name ────────────────────────────────────────────────
  const [profileName, setProfileName] = useState<string>('');

  // ── Live unread alert badge — same source as AlertsScreen ─────────────────
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);

  // ── Real assessment status — replaces the mock onboarding progress banner ──
  const [assessmentInProgress, setAssessmentInProgress] = useState(false);

  useEffect(() => {
    if (!userId) { setHomeDataLoading(false); return; }

    let cancelled = false;
    setHomeDataLoading(true);
    setFetchError(null);

    Promise.all([
      getClientReadiness(userId),
      getTodaySession(userId),
      getClientUnreadCount(userId),
      hasActiveWorkoutPlan(userId),
      getClientTodayMealCount(userId),
      getClientTodayCheckinStatus(userId),
      getClientPlanInfo(userId),
      getUserProfile(userId),
      getWeeklyLogs(userId).catch(() => []),
    ]).then(([readiness, session, unreadCount, activePlan, mealData, checkin, planInfo, profile, weeklyLogs]) => {
      if (cancelled) return;
      setReadinessScore(readiness);
      setTodaySession(session);
      setUnreadAlertsCount(unreadCount);
      setHasPlan(activePlan);
      setMealsLoggedLive(mealData.count);
      setDailyNutritionLive(mealData.nutrition);
      setCheckinStatus(checkin);
      if (planInfo) {
        setCurrentWeekLive(planInfo.week);
        setTotalWeeksLive(planInfo.totalWeeks);
        setScheduledAtLive(planInfo.scheduledAt);
      }
      // Each row is a distinct log_date in the current Mon-Sun week.
      setWeekLoggedDays(weeklyLogs.length);
      if (profile?.full_name) setProfileName(profile.full_name);
    }).catch(err => {
      if (cancelled) return;
      console.error('HomeScreen data fetch:', err);
      setFetchError(!navigator.onLine ? 'offline' : 'error');
    }).finally(() => {
      if (!cancelled) setHomeDataLoading(false);
    });

    return () => { cancelled = true; };
  }, [userId]);

  // Fetch the client's real assessment status to decide whether to show a banner.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('assessments')
      .select('status, clearance_status')
      .eq('client_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        // Show the amber banner only while the assessment is still being worked on.
        setAssessmentInProgress(
          data.status === 'pending' || data.status === 'in_progress',
        );
      });
    return () => { cancelled = true; };
  }, [userId]);

  // Re-fetch badge when tab becomes visible again (e.g. returning from AlertsScreen)
  useEffect(() => {
    if (!userId) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        getClientUnreadCount(userId).then(setUnreadAlertsCount).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [userId]);

  // ── Derived display values from live Supabase data ────────────────────────
  const displayName = profileName || appState.full_name || '';

  const [showToast] = useState(false);
  const todayRef = useRef<HTMLDivElement>(null);

  const firstName = (displayName || 'User').split(' ')[0];
  const habitsDone = checkinStatus.done;
  const habitsTotal = checkinStatus.total;
  const mealsLogged = mealsLoggedLive;
  const programWeek = currentWeekLive; // number | 'not_started' | 'starts_future' | null
  const totalWeeks = totalWeeksLive ?? 12;

  const fmtShortDate = (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  // Hero plan-progress chip labels.
  const weekBig =
    typeof programWeek === 'number' ? `Week ${programWeek}`
    : programWeek === 'starts_future' ? 'Starts'
    : 'Not started';
  const weekSmall =
    typeof programWeek === 'number' ? `of ${totalWeeks}-week plan`
    : programWeek === 'starts_future' ? (fmtShortDate(scheduledAtLive) || 'soon')
    : 'Awaiting schedule';

  // Compact label for the Weekly Report badge.
  const weekBadge =
    typeof programWeek === 'number' ? `Week ${programWeek}`
    : programWeek === 'starts_future' ? 'Starts soon'
    : 'Not started';

  // Track adherence for last session
  const lastSessionAdherence = workoutProgress?.score ?? 0;
  if (lastSessionAdherence > 0) {
    console.log(`Phase 10: Last Session Adherence - ${lastSessionAdherence}%`);
  }

  return (
    <MobileShell>

        {/* Top Bar */}
        <ScreenHeader
          variant="sub"
          title="WellnessConnect"
          avatar={<ProfileMenu />}
        />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide pb-[72px]">

          {/* Offline / fetch-error banner */}
          {fetchError && (
            <div className={`mx-[16px] mt-[12px] rounded-[10px] px-[14px] py-[10px] flex items-center gap-[10px] ${fetchError === 'offline' ? 'bg-[#FEF3C7] border border-[#FCD34D]' : 'bg-[#FEE2E2] border border-[#FCA5A5]'}`}>
              <span className="text-[18px]">{fetchError === 'offline' ? '📶' : '⚠️'}</span>
              <div className="flex-1">
                <p className="text-[12px] font-semibold text-[#111827]">
                  {fetchError === 'offline' ? "You're offline" : "Couldn't load your data"}
                </p>
                <p className="text-[11px] text-[#6B7280]">
                  {fetchError === 'offline' ? 'Check your connection — data shown may be outdated.' : 'Something went wrong. Pull to refresh or try again.'}
                </p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="text-[11px] font-semibold text-[#1D9E75] shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* Toast */}
          <AnimatePresence>
            {showToast && (
              <motion.div initial={{ y: -60, opacity: 0 }} animate={{ y: 8, opacity: 1 }} exit={{ y: -60, opacity: 0 }}
                className="absolute top-[52px] left-0 right-0 z-[90] px-4 flex justify-center pointer-events-none">
                <div className="bg-[#1D9E75] text-white px-4 py-3 rounded-xl text-[13px] font-medium">
                  ✓ Assessment complete! Trainer matched.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hero */}
          <section className="bg-white pt-[16px] px-[16px] pb-[16px]">
            <div className="mb-[14px]">
              <p className="text-[14px] text-[#6B7280]">{getGreeting()},</p>
              <h2 className="text-[22px] font-bold text-[#1D9E75]">{firstName}</h2>
            </div>

            {/* Score Card — width-capped on desktop so it doesn't stretch edge to edge */}
            <div className="lg:max-w-2xl">
            {homeDataLoading ? (
              <div className="rounded-[14px] p-[14px_16px] flex items-center justify-center bg-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.06)]" style={{ minHeight: 68 }}>
                <span className="text-[13px] text-[#9CA3AF] font-medium">Loading…</span>
              </div>
            ) : readinessScore !== null ? (
              <div className="rounded-[14px] p-[14px_16px] flex items-center shadow-[0_2px_8px_rgba(29,158,117,0.20)]"
                style={{ backgroundColor: getScoreColor(readinessScore) }}>
                <div className="flex-1 flex flex-col items-center">
                  <span className="text-[22px] font-bold text-white tracking-tight">{readinessScore}/100</span>
                  <span className="text-[11px] text-white/70 font-medium">Readiness score</span>
                </div>
                {/* Plan progress only shows when this client has an active plan — never another user's data */}
                {hasPlan ? (
                  <>
                    <div className="w-[1px] h-[40px] bg-white opacity-40" />
                    <div className="flex-1 flex flex-col items-center text-center px-1">
                      <span className="text-[22px] font-bold text-white tracking-tight leading-tight">{weekBig}</span>
                      <span className="text-[11px] text-white/70 font-medium leading-tight">{weekSmall}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-[1px] h-[40px] bg-white opacity-40" />
                    <div className="flex-1 flex flex-col items-center text-center px-1">
                      <span className="text-[12px] font-semibold text-white leading-tight">No active plan yet</span>
                      <span className="text-[11px] text-white/70 font-medium leading-tight">Your trainer will assign one</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate('/client/check-in')}
                className="w-full rounded-[14px] p-[14px_16px] flex items-center gap-[12px] bg-[#F0F9FF] border border-[#BAE6FD] shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:bg-[#E0F2FE] transition-colors"
              >
                <div className="w-[40px] h-[40px] rounded-[10px] bg-[#DBEAFE] flex items-center justify-center text-[20px] shrink-0">📋</div>
                <div className="flex-1 text-left">
                  <p className="text-[14px] font-semibold text-[#111827]">Complete today's check-in</p>
                  <p className="text-[12px] text-[#6B7280]">Log your metrics to see your readiness score</p>
                </div>
                <span className="text-[16px] text-[#9CA3AF]">›</span>
              </button>
            )}
            </div>

            <button onClick={() => todayRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="mt-[12px] text-[13px] font-medium text-[#1D9E75] active:opacity-60 transition-opacity">
              Today: {habitsTotal - habitsDone} habits to complete ›
            </button>
          </section>

          {/* Assessment in-progress banner — driven by real Supabase status */}
          {assessmentInProgress && (
            <div className="px-[16px] mb-[16px]">
              <div className="bg-[#FEF3C7] border-[1.5px] border-[#FCD34D] rounded-[12px] p-[14px] shadow-sm">
                <div className="flex items-center gap-[10px]">
                  <div className="w-[36px] h-[36px] bg-[#FDE68A] rounded-[8px] flex items-center justify-center text-[18px]">🕐</div>
                  <p className="text-[13px] text-[#92400E] leading-[1.5]">
                    Your assessment is in progress. The team will contact you shortly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TODAY Section */}
          <section ref={todayRef} className="px-[16px] mt-[8px]">
            <div className="flex items-center justify-between border-b-[0.5px] border-[#E5E7EB] pb-[4px] mb-[10px]">
              <h3 className="text-[11px] font-bold text-[#6B7280] tracking-[0.07em] uppercase">Today</h3>
              <span className="text-[11px] text-[#9CA3AF] font-medium">{formatDateShort()} · {habitsDone} of {habitsTotal} tracked</span>
            </div>

            {/* Card grid wrapper — plain div below lg (mobile unchanged), 2-col grid on desktop.
                Cards keep their own mb-[10px] for vertical rhythm in both layouts. */}
            <div className="lg:grid lg:grid-cols-2 lg:gap-x-4 lg:items-start">

            {/* Nutrition Card */}
            <NutritionCard
              logged={mealsLogged}
              dailyNutrition={dailyNutritionLive ? { ...dailyNutritionLive, mealsLogged: mealsLoggedLive } : (appState as any).dailyNutrition}
              onClick={() => { console.log('Action Triggered: Log your Meal'); navigate('/client/nutrition'); }}
            />

            {/* Training Card + its view-all link grouped so they share a grid cell at lg: */}
            <div>
            <TrainingCard
              session={todaySession ?? undefined}
              onClick={() => {
                if (!todaySession) return;
                console.log('Action Triggered: View Session');
                navigate('/client/session/' + todaySession.id);
              }}
            />

            {/* View all sessions link — only when there is a session today */}
            {todaySession && (
              <div
                onClick={() => navigate('/client/sessions')}
                style={{
                  textAlign: 'center',
                  fontSize: 13,
                  color: '#166534',
                  padding: '8px',
                  cursor: 'pointer',
                }}
              >
                View all upcoming sessions ›
              </div>
            )}
            </div>

            {/* Daily Tracking Card */}
            <div onClick={() => { console.log('Action Triggered: Track Today'); navigate('/client/check-in'); }}
              className="bg-white rounded-[12px] p-[14px] border border-[#E5E7EB] flex items-center gap-[14px] mb-[10px] cursor-pointer active:bg-[#F3F4F6] transition-colors">
              <div className="w-[48px] h-[48px] shrink-0 bg-[#E6F1FB] rounded-[10px] flex items-center justify-center p-2.5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-[13px] font-semibold text-[#111827]">Daily Tracking</h4>
                <p className="text-[12px] text-[#6B7280]">{habitsDone > 0 ? `${habitsDone} of ${habitsTotal} tracked` : "Track today's habits"}</p>
              </div>
              <div className="flex flex-col items-center gap-[3px]">
                <div className="flex gap-[4px]">
                  {[1,2,3,4,5,6,7].map(d => (
                    <div key={d} className={`w-[7px] h-[7px] rounded-full border ${d <= habitsDone ? 'bg-[#1D9E75] border-[#1D9E75]' : 'border-[#D1D5DB]'}`} />
                  ))}
                </div>
                <span className="text-[10px] text-[#9CA3AF]">{habitsDone} of 7</span>
              </div>
              <div className="text-[16px] text-[#9CA3AF] ml-1">›</div>
            </div>

            {/* Weekly Report Card */}
            <WeeklyReportCard
              weekLabel={weekBadge}
              loggedDays={weekLoggedDays}
              onClick={() => { console.log('Action Triggered: View Report'); navigate('/client/report/current'); }}
            />

            </div>
          </section>
        </div>

        {/* Bottom Navigation */}
        <ClientBottomNav unreadAlertsCount={unreadAlertsCount} />

    </MobileShell>
  );
}
