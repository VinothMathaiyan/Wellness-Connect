import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Users, BarChart3, Bell, BarChart2 } from 'lucide-react';
import type { TrainingSession, WeeklyReportStatus } from './src/types';

interface HomeScreenProps {
  userData: {
    full_name?: string;
    readinessScore?: number;
    currentWeek?: number;
    assessmentStatus?: 'pending' | 'scheduled' | 'completed' | null;
    habitProgress?: { done: number; total: number };
    sessions?: TrainingSession[];
    weeklyReportStatus?: WeeklyReportStatus;
    weeklyReportTeaser?: { sleep: string; mood: string; energy: string };
    unReadAlertsCount?: number;
    mealsLogged?: number;
  };
  onViewSession: (s: any) => void;
  onStartCheckIn: () => void;
  onFindTrainer: () => void;
  onReviewGoals: () => void;
  onTrackToday: () => void;
  onTrackNutrition?: () => void;
  onProfileClick?: () => void;
  onViewWeeklyReport?: () => void;
}

/* ── Helpers ─────────────────────────────────────────────── */
const formatDateShort = () =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date());

const getScoreColor = (s: number) => s >= 70 ? '#1D9E75' : s >= 40 ? '#EF9F27' : '#E24B4A';

/* ── NavButton ───────────────────────────────────────────── */
const NavButton = ({ label, icon: Icon, active = false, onClick, badge }: {
  label: string; icon: any; active?: boolean; onClick?: () => void; badge?: number;
}) => (
  <button onClick={onClick} className="flex flex-col items-center justify-center gap-[2px] transition-all min-w-[56px]">
    <div className="relative">
      <Icon size={20} strokeWidth={active ? 2.5 : 2} color={active ? '#1D9E75' : '#6B7280'} />
      {badge && badge > 0 && (
        <div className="absolute -top-[1.5px] -right-[1.5px] w-[6px] h-[6px] bg-[#E24B4A] rounded-full" />
      )}
    </div>
    <span className={`text-[10px] font-medium ${active ? 'text-[#1D9E75]' : 'text-[#6B7280]'}`}>{label}</span>
  </button>
);

/* ── NutritionCard ───────────────────────────────────────── */
const NutritionCard = ({ logged = 0, onClick }: { logged?: number; onClick: () => void }) => (
  <div
    onClick={onClick}
    className="bg-white rounded-[12px] p-[14px] border border-[#E5E7EB] flex items-center gap-[14px] mb-[10px] cursor-pointer active:bg-[#F3F4F6] transition-colors"
  >
    <div className="w-[48px] h-[48px] shrink-0 bg-[#FFF3E0] rounded-[10px] flex items-center justify-center text-[24px]">
      🥗
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="text-[13px] font-semibold text-[#111827]">Log your meal</h4>
      <p className="text-[12px] text-[#6B7280]">Tap to add breakfast, lunch or dinner</p>
    </div>
    <div className="flex flex-col items-end gap-1 shrink-0">
      <span className="text-[11px] font-semibold text-[#1D9E75]">{logged} of 3 logged</span>
      <div className="flex gap-[4px]">
        {[1,2,3].map(i => (
          <div key={i} className={`w-[8px] h-[8px] rounded-full ${i <= logged ? 'bg-[#1D9E75]' : 'border border-[#D1D5DB]'}`} />
        ))}
      </div>
    </div>
    <div className="text-[16px] text-[#9CA3AF] ml-1">›</div>
  </div>
);

/* ── TrainingCard ────────────────────────────────────────── */
const TrainingCard = ({ session, onClick }: { session?: TrainingSession; onClick: () => void }) => {
  const getEmoji = (t: string) => ({ yoga:'🧘', strength:'🏋️', cardio:'🏃', recovery:'💆' }[t] ?? '🏋️');
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '');

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
          <h4 className="text-[14px] font-semibold text-[#111827]">{session.session_name}</h4>
          <p className="text-[12px] text-[#6B7280]">{session.trainer_name} · {fmtTime(session.scheduled_at)} · {session.duration_minutes} min</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-[8px] h-[8px] bg-[#1D9E75] rounded-full animate-pulse" />
          <span className="text-[12px] font-semibold text-[#1D9E75]">{isLive ? 'Live now' : 'Starting soon'}</span>
        </div>
      </div>
      <button onClick={e => { e.stopPropagation(); console.log('Action Triggered: Join Session'); if (session.meeting_url) window.open(session.meeting_url, '_blank'); }}
        className="w-full h-[40px] bg-[#1D9E75] text-white text-[13px] font-semibold rounded-[8px] mt-[10px] active:scale-[0.98] transition-transform">
        Join Session
      </button>
    </div>
  );

  return (
    <div onClick={onClick} className="bg-white rounded-[12px] p-[14px] border border-[#E5E7EB] flex items-center gap-[14px] mb-[10px] cursor-pointer active:bg-[#F3F4F6] transition-colors">
      <div className="w-[48px] h-[48px] shrink-0 bg-[#F0F9FF] rounded-[10px] flex items-center justify-center text-[24px]">{getEmoji(session.session_type)}</div>
      <div className="flex-1">
        <h4 className="text-[14px] font-semibold text-[#111827]">{session.session_name}</h4>
        <p className="text-[12px] text-[#6B7280]">{session.trainer_name} · {fmtTime(session.scheduled_at)} · {session.duration_minutes} min</p>
      </div>
      <div className="px-3 py-1 border border-[#1D9E75] rounded-full text-[12px] font-bold text-[#1D9E75]">Today</div>
      <div className="text-[16px] text-[#9CA3AF]">›</div>
    </div>
  );
};

/* ── WeeklyReportCard ────────────────────────────────────── */
const WeeklyReportCard = ({ status, weekNumber, teaser, onClick }: {
  status: WeeklyReportStatus; weekNumber: number; teaser?: { sleep: string; mood: string; energy: string }; onClick: () => void;
}) => {
  if (status === 'no_data') return (
    <div className="bg-white rounded-[12px] p-[14px] border border-[#E5E7EB] flex items-center gap-[14px] mb-[10px] opacity-65">
      <div className="w-[48px] h-[48px] shrink-0 bg-[#EEF2FF] rounded-[10px] flex items-center justify-center"><BarChart2 size={24} className="text-[#4F46E5]" /></div>
      <div className="flex-1"><h4 className="text-[13px] font-semibold text-[#111827]">Weekly Report</h4><p className="text-[12px] text-[#9CA3AF]">Keep logging daily to unlock your first summary</p></div>
      <div className="px-3 py-0.5 bg-gray-100 rounded-full text-[11px] font-bold text-[#9CA3AF]">Week {weekNumber}</div>
    </div>
  );
  return (
    <div onClick={onClick} className="bg-white rounded-[12px] p-[14px] border border-[#E5E7EB] flex items-center gap-[14px] mb-[10px] cursor-pointer active:bg-[#F3F4F6] transition-colors">
      <div className="w-[48px] h-[48px] shrink-0 bg-[#EEF2FF] rounded-[10px] flex items-center justify-center"><BarChart2 size={24} className="text-[#4F46E5]" /></div>
      <div className="flex-1">
        <h4 className="text-[13px] font-semibold text-[#111827]">Weekly Report</h4>
        <p className="text-[12px] text-[#6B7280] mb-1">Week {weekNumber} summary ready</p>
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
export default function HomeScreen({
  userData, onViewSession, onFindTrainer, onTrackToday, onTrackNutrition, onProfileClick, onViewWeeklyReport,
}: HomeScreenProps) {
  const [showToast, setShowToast] = useState(false);
  const todayRef = useRef<HTMLDivElement>(null);

  const firstName = (userData.full_name || 'User').split(' ')[0];
  const initial = firstName[0].toUpperCase();
  const score = userData.readinessScore ?? 84;
  const habitsDone = userData.habitProgress?.done ?? 1;
  const habitsTotal = userData.habitProgress?.total ?? 7;
  const assessmentStatus = userData.assessmentStatus ?? 'pending';
  const mealsLogged = userData.mealsLogged ?? 1;

  return (
    <div className="flex flex-col min-h-screen bg-gray-200 items-center justify-center p-4">
      {/* Device Frame */}
      <div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative h-[800px] flex flex-col border-[12px] border-[#1E293B]">

        {/* Top Bar */}
        <header className="h-[52px] w-full flex items-center justify-between px-[20px] bg-white shrink-0 border-b border-[#F3F4F6]">
          <div className="w-[36px]" />
          <h1 className="text-[16px] font-bold text-[#111827]">WellnessConnect</h1>
          <button
            onClick={() => { console.log('Action Triggered: Profile'); onProfileClick?.(); }}
            className="w-[36px] h-[36px] rounded-full bg-white border-[1.5px] border-[#1D9E75] flex items-center justify-center text-[14px] font-bold text-[#1D9E75] active:bg-[#F0F9FF] transition-colors"
          >
            {initial}
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide pb-[72px]">

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
              <p className="text-[14px] text-[#6B7280]">Good morning,</p>
              <h2 className="text-[22px] font-bold text-[#1D9E75]">{firstName}</h2>
            </div>

            {/* Score Card */}
            <div className="rounded-[14px] p-[14px_16px] flex items-center shadow-[0_2px_8px_rgba(29,158,117,0.20)]"
              style={{ backgroundColor: getScoreColor(score) }}>
              <div className="flex-1 flex flex-col items-center">
                <span className="text-[22px] font-bold text-white tracking-tight">{score}/100</span>
                <span className="text-[11px] text-white/70 font-medium">Readiness score</span>
              </div>
              <div className="w-[1px] h-[40px] bg-white opacity-40" />
              <div className="flex-1 flex flex-col items-center">
                <span className="text-[22px] font-bold text-white tracking-tight">Week {userData.currentWeek ?? 4}</span>
                <span className="text-[11px] text-white/70 font-medium">of 12-week plan</span>
              </div>
            </div>

            <button onClick={() => todayRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="mt-[12px] text-[13px] font-medium text-[#1D9E75] active:opacity-60 transition-opacity">
              Today: {habitsTotal - habitsDone} habits to complete ›
            </button>
          </section>

          {/* Assessment Card (amber) */}
          {assessmentStatus !== 'completed' && (
            <div className="px-[16px] mb-[16px]">
              <div className="bg-[#FEF3C7] border-[1.5px] border-[#FCD34D] rounded-[12px] p-[14px] shadow-sm">
                <div className="flex items-center gap-[10px] mb-[6px]">
                  <div className="w-[36px] h-[36px] bg-[#FDE68A] rounded-[8px] flex items-center justify-center text-[18px]">🕐</div>
                  <h4 className="text-[14px] font-semibold text-[#111827]">
                    {assessmentStatus === 'pending' ? 'Assessment call pending' : 'Assessment scheduled'}
                  </h4>
                </div>
                <p className="text-[12px] text-[#6B7280] leading-[1.5]">
                  {assessmentStatus === 'pending'
                    ? 'Our team will call you within 24 hours to complete your health review.'
                    : 'Assessment scheduled — we\'ll call you at your preferred time.'}
                </p>
                {/* 3-step progress tracker */}
                <div className="mt-[12px] flex items-center text-[10px] font-medium">
                  <div className="flex flex-col items-center">
                    <div className="w-[8px] h-[8px] rounded-full bg-[#1D9E75]" />
                    <span className="mt-[4px] text-[#0F6E56]">Profile created</span>
                  </div>
                  <div className="flex-1 h-[1px] bg-[#1D9E75] mx-[-4px]" />
                  <div className="flex flex-col items-center">
                    <div className="w-[8px] h-[8px] rounded-full bg-[#EF9F27]" />
                    <span className="mt-[4px] text-[#854F0B] font-bold">Assessment call</span>
                  </div>
                  <div className="flex-1 h-[1px] bg-[#D1D5DB] mx-[-4px]" />
                  <div className="flex flex-col items-center">
                    <div className="w-[8px] h-[8px] rounded-full bg-[#D1D5DB]" />
                    <span className="mt-[4px] text-[#9CA3AF]">Trainer matched</span>
                  </div>
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

            {/* Nutrition Card */}
            <NutritionCard
              logged={mealsLogged}
              onClick={() => { console.log('Action Triggered: Log your Meal'); onTrackNutrition?.(); }}
            />

            {/* Training Card */}
            <TrainingCard
              session={userData.sessions?.[0]}
              onClick={() => { console.log('Action Triggered: View Session'); onViewSession(userData.sessions?.[0] ?? null); }}
            />

            {/* Daily Tracking Card */}
            <div onClick={() => { console.log('Action Triggered: Track Today'); onTrackToday(); }}
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
              status={userData.weeklyReportStatus ?? 'no_data'}
              weekNumber={userData.currentWeek ?? 1}
              teaser={userData.weeklyReportTeaser}
              onClick={() => { console.log('Action Triggered: View Report'); onViewWeeklyReport?.(); }}
            />
          </section>
        </div>

        {/* Bottom Navigation — fixed inside device frame */}
        <nav className="absolute bottom-0 left-0 right-0 h-[60px] bg-white border-t border-[#E5E7EB] flex items-center justify-around px-[10px] z-50 rounded-b-[2rem]">
          <NavButton label="Home" icon={Home} active={true} onClick={() => console.log('Action Triggered: Nav Home')} />
          <NavButton label="Trainers" icon={Users} onClick={() => { console.log('Action Triggered: Nav Trainers'); onFindTrainer(); }} />
          <NavButton label="Progress" icon={BarChart3} onClick={() => console.log('Action Triggered: Nav Progress')} />
          <NavButton label="Alerts" icon={Bell} badge={userData.unReadAlertsCount} onClick={() => console.log('Action Triggered: Nav Alerts')} />
        </nav>

      </div>
    </div>
  );
}
