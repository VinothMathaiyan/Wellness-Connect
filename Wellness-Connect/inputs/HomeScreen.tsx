/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Users, BarChart3, Bell, BarChart2, Footprints } from 'lucide-react';
import { TrainingSession, WeeklyReportStatus } from '../types';

interface HomeScreenProps {
  userData: {
    full_name?: string;
    name?: string;
    readinessScore?: number;
    currentWeek?: number;
    assessmentStatus?: 'pending' | 'scheduled' | 'completed' | null;
    habitProgress?: { done: number; total: number };
    sessions?: TrainingSession[];
    checkInStatus?: 'due' | 'submitted' | 'not_due';
    unReadAlertsCount?: number;
    weeklyReportStatus?: WeeklyReportStatus;
    weeklyReportTeaser?: {
      sleep: string;
      mood: string;
      energy: string;
    };
    stepTrackingEnabled?: boolean;
    todaySteps?: {
      count: number;
      goal: number;
      isSyncing?: boolean;
    };
  };
  onViewSession: (session: any) => void;
  onStartCheckIn: () => void;
  onFindTrainer: () => void;
  onReviewGoals: () => void;
  onTrackToday: () => void;
  onTrackNutrition? : () => void;
  onTrackSteps?: () => void;
  onProfileClick?: () => void;
  onViewWeeklyReport?: () => void;
  onViewStepsDetail?: () => void;
  isStandalone?: boolean;
}

const TrainingCard = ({ session, onClick }: { session?: TrainingSession; onClick: () => void }) => {
  if (!session) {
    return (
      <div 
        onClick={onClick}
        className="bg-white rounded-[12px] p-[14px] border border-[#E5E7EB] flex items-center gap-[14px] mb-[10px] cursor-pointer active:bg-[#F3F4F6] transition-colors relative"
      >
        <div className="w-[48px] h-[48px] shrink-0 bg-[#F3F4F6] rounded-[10px] flex items-center justify-center text-[24px]">
          📅
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-medium text-[#6B7280]">No session today</h4>
          <p className="text-[11px] text-[#9CA3AF]">Next: Thu, 1 May · 6:00 PM</p>
        </div>
        <div className="text-[16px] text-[#9CA3AF] ml-auto">›</div>
      </div>
    );
  }

  const now = new Date();
  const startTime = new Date(session.scheduled_at);
  const endTime = new Date(startTime.getTime() + session.duration_minutes * 60 * 1000);
  const diffMinutes = (startTime.getTime() - now.getTime()) / (1000 * 60);

  const isCompleted = session.status === 'completed';
  const isLive = !isCompleted && (diffMinutes <= 10 && now < endTime);
  const isSoon = !isCompleted && diffMinutes <= 10 && now < startTime;
  const isUpcoming = !isCompleted && !isLive && !isSoon;

  const getEmoji = (type: string) => {
    switch (type) {
      case 'yoga': return '🧘';
      case 'strength': return '🏋️';
      case 'cardio': return '🏃';
      case 'recovery': return '💆';
      default: return '🏋️';
    }
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '');
  };

  if (isCompleted) {
    return (
      <div 
        onClick={onClick}
        className="bg-white rounded-[12px] p-[14px] border border-[#E5E7EB] flex items-center gap-[14px] mb-[10px] cursor-pointer active:bg-[#F3F4F6] transition-colors relative"
      >
        <div className="w-[48px] h-[48px] shrink-0 bg-[#F3F4F6] rounded-[10px] flex items-center justify-center text-[24px] grayscale opacity-50">
          {getEmoji(session.session_type)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[14px] font-semibold text-[#9CA3AF]">
            <span className="text-[#1D9E75]">✓</span> {session.session_name}
          </h4>
          <p className="text-[12px] text-[#9CA3AF]">
            {session.trainer_name} · {formatTime(session.scheduled_at)} · {session.duration_minutes} min
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="px-2 py-0.5 bg-[#F3F4F6] rounded-full text-[12px] font-medium text-[#9CA3AF]">Done</div>
          <div className="text-[16px] text-[#9CA3AF]">›</div>
        </div>
      </div>
    );
  }

  if (isLive || isSoon) {
    return (
      <div 
        onClick={(e) => {
          // If clicking the button specifically, we handle that elsewhere or thespec says only clicking button join session
          // But tapping card area above button navigates to T2.
          onClick();
        }}
        className="bg-[#E1F5EE] rounded-[12px] p-[14px] border-[1.5px] border-[#1D9E75] mb-[10px] cursor-pointer relative"
      >
        <div className="flex items-center gap-[14px]">
          <div className="w-[48px] h-[48px] shrink-0 bg-white rounded-[10px] flex items-center justify-center text-[24px]">
            {getEmoji(session.session_type)}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[14px] font-semibold text-[#111827]">{session.session_name}</h4>
            <p className="text-[12px] text-[#6B7280]">
              {session.trainer_name} · {formatTime(session.scheduled_at)} · {session.duration_minutes} min
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5">
              <div className="w-[8px] h-[8px] bg-[#1D9E75] rounded-full animate-pulse" />
              <span className={`text-[12px] font-semibold ${isLive ? 'text-[#1D9E75]' : 'text-[#EF9F27]'}`}>
                {isLive ? 'Live now' : 'Starting soon'}
              </span>
            </div>
            <div className="text-[16px] text-[#9CA3AF]">›</div>
          </div>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (session.meeting_url) window.open(session.meeting_url, '_blank');
          }}
          className="w-full h-[40px] bg-[#1D9E75] text-white text-[13px] font-semibold rounded-[8px] mt-[10px] active:scale-[0.98] transition-transform"
        >
          Join Session
        </button>
      </div>
    );
  }

  // Upcoming State
  const diffInHours = diffMinutes / 60;
  const progressPercent = Math.max(0, Math.min(100, (1 - diffInHours / 24) * 100));

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-[12px] p-[14px] border border-[#E5E7EB] mb-[10px] cursor-pointer active:bg-[#F3F4F6] transition-colors relative"
    >
      <div className="flex items-center gap-[14px]">
        <div className="w-[48px] h-[48px] shrink-0 bg-[#F0F9FF] rounded-[10px] flex items-center justify-center text-[24px]">
          {getEmoji(session.session_type)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[14px] font-semibold text-[#111827]">{session.session_name}</h4>
          <p className="text-[12px] text-[#6B7280]">
            {session.trainer_name} · {formatTime(session.scheduled_at)} · {session.duration_minutes} min
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="px-3 py-1 border border-[#1D9E75] rounded-full text-[12px] font-bold text-[#1D9E75]">Today</div>
          <div className="text-[16px] text-[#9CA3AF]">›</div>
        </div>
      </div>
      <div className="w-full h-[4px] bg-[#E5E7EB] rounded-[2px] mt-[10px] overflow-hidden">
        <div className="h-full bg-[#1D9E75]" style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
  );
};

export default function HomeScreen({ 
  userData, 
  onViewSession, 
  onStartCheckIn, 
  onFindTrainer, 
  onReviewGoals, 
  onTrackToday,
  onProfileClick,
  onViewWeeklyReport,
  onViewStepsDetail,
  isStandalone = false
}: HomeScreenProps) {
  const [showAssessmentToast, setShowAssessmentToast] = useState(false);
  const todayRef = useRef<HTMLDivElement>(null);

  const firstName = (userData.full_name || userData.name || "Vinoth").split(' ')[0];
  const initial = firstName[0].toUpperCase();
  const score = userData.readinessScore || 0;
  const habitsDone = userData.habitProgress?.done || 0;
  const habitsTotal = userData.habitProgress?.total || 7;
  const assessmentStatus = userData.assessmentStatus || 'pending';

  useEffect(() => {
    if (assessmentStatus === 'completed') {
      const hasSeenToast = localStorage.getItem('assessment_complete_toast_seen');
      if (!hasSeenToast) {
        setShowAssessmentToast(true);
        localStorage.setItem('assessment_complete_toast_seen', 'true');
        const timer = setTimeout(() => setShowAssessmentToast(false), 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [assessmentStatus]);

  const scrollToToday = () => {
    todayRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getScoreBg = (s: number) => {
    if (s >= 70) return '#1D9E75';
    if (s >= 40) return '#EF9F27';
    return '#E24B4A';
  };

  const formatDateShort = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
    return new Intl.DateTimeFormat('en-GB', options).format(new Date()); // Mon, 27 Apr
  };

  return (
    <div className={`flex flex-col h-full bg-[#FFFFFF] ${isStandalone ? 'p-0' : ''}`}>
      {/* Toast Notification */}
      <AnimatePresence>
        {showAssessmentToast && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] px-5 flex justify-center pointer-events-none"
          >
            <div className="bg-[#1D9E75] text-white px-4 py-3 rounded-xl shadow-lg border border-[#1D9E75] flex items-center gap-3">
              <span className="text-[13px] font-medium">✓ Assessment complete! Your trainer has been matched.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`flex-1 overflow-y-auto scrollbar-hide ${isStandalone ? 'pb-[56px]' : ''}`}>
        {/* ZONE 1 — TOP BAR */}
        {isStandalone && (
          <header className="h-[52px] w-full flex items-center justify-between px-[20px] bg-white shrink-0">
            <div className="w-[36px]" />
            <h1 className="text-[16px] font-semibold text-[#111827]">WellnessConnect</h1>
            <button 
              onClick={onProfileClick}
              className="w-[36px] h-[36px] rounded-full bg-white border-[1.5px] border-[#1D9E75] flex items-center justify-center text-[14px] font-semibold text-[#1D9E75] active:bg-[#F0F9FF] transition-colors"
            >
              {initial}
            </button>
          </header>
        )}

        {/* ZONE 2 — HERO BANNER */}
        <section className="bg-white pt-[16px] px-[16px] pb-[16px]">
          <div className="mb-[16px]">
            <p className="text-[14px] text-[#6B7280]">Good morning,</p>
            <h2 className="text-[22px] font-bold text-[#1D9E75]">{firstName}</h2>
          </div>

          <div 
            className="rounded-[14px] p-[14px_16px] flex items-center shadow-[0_2px_8px_rgba(29,158,117,0.20)]"
            style={{ backgroundColor: getScoreBg(score) }}
          >
            <div className="flex-1 flex flex-col items-center">
              <div className="flex items-center gap-1.5 h-[24px]">
                <span className="text-[20px] font-bold text-white tracking-tight">{score}/{habitsTotal === 5 ? '100' : '100'}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6"/><path d="M3 22v-6h6"/><path d="M21 13A9 9 0 1 1 3 11a9 9 0 0 1 18 2z"/>
                </svg>
              </div>
              <span className="text-[11px] text-white/70 font-medium">Readiness score</span>
            </div>
            <div className="w-[1px] h-[40px] bg-white opacity-40" />
            <div className="flex-1 flex flex-col items-center">
              <div className="h-[24px] flex items-center">
                <span className="text-[20px] font-bold text-white tracking-tight">Week {userData.currentWeek || 1}</span>
              </div>
              <span className="text-[11px] text-white/70 font-medium">of 12-week plan</span>
            </div>
          </div>

          <button 
            onClick={scrollToToday}
            className="mt-[12px] flex items-center gap-1 text-[13px] font-medium text-[#1D9E75] active:opacity-60 transition-opacity"
          >
            {habitsDone === habitsTotal ? (
              <span>Today: All habits complete ✓</span>
            ) : (
              <span>Today: {habitsTotal - habitsDone} habits to complete ›</span>
            )}
          </button>
        </section>

        {/* ZONE 3 — ASSESSMENT STATUS CARD */}
        {assessmentStatus !== 'completed' && (
          <div className="px-[16px] mb-[16px]">
            <div className="bg-[#FEF3C7] border-[1.5px] border-[#FCD34D] rounded-[12px] p-[14px] shadow-sm">
              <div className="flex items-center gap-[10px] mb-[4px]">
                <div className="w-[36px] h-[36px] bg-[#FDE68A] rounded-[8px] flex items-center justify-center">
                  <span className="text-[18px]">🕐</span>
                </div>
                <h4 className="text-[14px] font-semibold text-[#111827]">
                  {assessmentStatus === 'pending' ? 'Assessment call pending' : 'Assessment scheduled'}
                </h4>
              </div>
              <p className="text-[12px] text-[#6B7280] leading-[1.5]">
                {assessmentStatus === 'pending' 
                  ? 'Our team will call you within 24 hours to complete your health review.' 
                  : 'Assessment scheduled — Mon, 27 Apr · 10:30 AM. We\'ll call you then.'}
              </p>

              {/* Progress Tracker */}
              <div className="mt-[12px] flex items-center text-[10px] font-medium leading-tight">
                <div className="flex flex-col items-center">
                  <div className="w-[8px] h-[8px] rounded-full bg-[#1D9E75]" />
                  <span className="mt-[4px] text-[#0F6E56]">Profile created</span>
                </div>
                <div className="flex-1 h-[1px] bg-[#1D9E75] mx-[-4px]" />
                <div className="flex flex-col items-center">
                  <div className="w-[8px] h-[8px] rounded-full bg-[#EF9F27]" />
                  <span className="mt-[4px] text-[#854F0B] font-bold">
                    {assessmentStatus === 'scheduled' ? 'Scheduled ✓' : 'Assessment call'}
                  </span>
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

        {/* ZONE 4 — TODAY SECTION */}
        <section ref={todayRef} className="px-[16px] mt-[16px]">
          <div className="flex items-center justify-between border-b-[0.5px] border-[#E5E7EB] pb-[4px] mb-[10px]">
            <h3 className="text-[11px] font-bold text-[#6B7280] tracking-[0.07em] uppercase">TODAY</h3>
            <span className="text-[11px] text-[#9CA3AF] font-medium">
              {formatDateShort()} · {habitsDone} of {habitsTotal} tracked
            </span>
          </div>

          <div className="flex flex-col">
            {/* CARD 1 — TRAINING */}
            <TrainingCard 
              session={userData.sessions ? userData.sessions[0] : undefined}
              onClick={() => onViewSession(userData.sessions ? userData.sessions[0] : null)}
            />

            {/* CARD 2 — DAILY TRACKING */}
            <div 
              onClick={onTrackToday}
              className={`bg-white rounded-[12px] p-[14px] border border-[#E5E7EB] flex items-center gap-[14px] mb-[10px] cursor-pointer active:bg-[#F3F4F6] transition-colors relative ${habitsDone === 5 ? 'bg-[#F0FDF4] border-[#1D9E75]/10' : ''}`}
            >
              <div className="w-[48px] h-[48px] shrink-0 bg-[#E6F1FB] rounded-[10px] flex items-center justify-center p-2.5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[13px] font-semibold text-[#111827]">Daily Tracking</h4>
                <p className={`text-[12px] ${habitsDone === 5 ? 'text-[#1D9E75]' : 'text-[#6B7280]'}`}>
                  {habitsDone === 5 ? 'Great work today!' : habitsDone > 0 ? `${habitsDone} of ${habitsTotal} tracked` : 'Track today\'s habits'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5 min-w-[70px]">
                {habitsDone === 7 ? (
                  <div className="px-2 py-0.5 bg-[#D1FAE5] text-[#1D9E75] text-[10px] font-bold rounded-full">All done ✓</div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="flex gap-[4px]">
                      {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                        <div 
                          key={d} 
                          className={`w-[8px] h-[8px] rounded-full border ${d <= habitsDone ? 'bg-[#1D9E75] border-[#1D9E75]' : 'border-[#D1D5DB]'}`} 
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-[#9CA3AF] font-medium mt-[2px]">{habitsDone} of 7</span>
                  </div>
                )}
                <div className="text-[16px] text-[#9CA3AF]">›</div>
              </div>
            </div>

            {/* CARD 3 — STEPS */}
            {userData.stepTrackingEnabled && (
              <StepsCard 
                steps={userData.todaySteps?.count || 0}
                goal={userData.todaySteps?.goal || 10000}
                isSyncing={userData.todaySteps?.isSyncing}
                onClick={onViewStepsDetail || (() => {})}
              />
            )}

            {/* CARD 4 — WEEKLY REPORT */}
            <WeeklyReportCard 
              status={userData.weeklyReportStatus || 'no_data'} 
              weekNumber={userData.currentWeek || 1}
              teaser={userData.weeklyReportTeaser}
              onClick={onViewWeeklyReport || (() => {})} 
            />
          </div>
        </section>
      </div>

      {/* BOTTOM NAVIGATION BAR */}
      {isStandalone && (
        <nav className="fixed bottom-0 left-0 right-0 h-[56px] bg-white border-t-[0.5px] border-[#E5E7EB] flex items-center justify-around px-[10px] z-[50]">
          <NavButton label="Home" icon={Home} active={true} />
          <NavButton label="Trainers" icon={Users} onClick={onFindTrainer} />
          <NavButton label="Progress" icon={BarChart3} />
          <NavButton label="Alerts" icon={Bell} badgeContent={userData.unReadAlertsCount} />
        </nav>
      )}
    </div>
  );
}

const StepsCard = ({ steps, goal, isSyncing, onClick }: { steps: number; goal: number; isSyncing?: boolean; onClick: () => void }) => {
  const percentage = Math.min(100, Math.round((steps / goal) * 100));
  const radius = 16;
  const stroke = 4;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-[12px] p-[12px_14px] border border-[#E5E7EB] flex items-center gap-[14px] mb-[10px] cursor-pointer active:bg-[#F3F4F6] transition-colors"
    >
      <div className="shrink-0 text-[#185FA5]">
        <Footprints size={20} />
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="text-[13px] font-semibold text-[#111827] leading-none">Steps</h4>
        <p className="text-[10px] text-[#9CA3AF] mt-[2px]">Today</p>
      </div>

      <div className="text-right">
        {isSyncing ? (
          <div className="flex flex-col items-end">
            <motion.span 
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-[14px] font-bold text-[#185FA5]"
            >
              Syncing…
            </motion.span>
          </div>
        ) : (
          <div className="flex flex-col items-end">
            <span className="text-[20px] font-bold text-[#185FA5] leading-none">{steps.toLocaleString()}</span>
            <span className="text-[10px] text-[#6B7280] mt-[2px]">{percentage}% of goal</span>
          </div>
        )}
      </div>

      <div className="relative w-[36px] h-[36px] flex items-center justify-center shrink-0">
        <svg height="36" width="36" className="transform -rotate-90">
          <circle
            stroke="#E5E7EB"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx="18"
            cy="18"
          />
          <motion.circle
            stroke="#185FA5"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: isSyncing ? circumference : strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx="18"
            cy="18"
          />
        </svg>
        <span className="absolute text-[8px] font-bold text-[#6B7280]">%</span>
      </div>

      <div className="text-[16px] text-[#9CA3AF] shrink-0 ml-[-4px]">›</div>
    </div>
  );
};

const WeeklyReportCard = ({ 
  status, 
  weekNumber, 
  teaser, 
  onClick 
}: { 
  status: WeeklyReportStatus; 
  weekNumber: number; 
  teaser?: { sleep: string; mood: string; energy: string; };
  onClick: () => void;
}) => {
  if (status === 'generating') {
    return (
      <div className="bg-white rounded-[12px] p-[14px] border border-[#E5E7EB] flex items-center gap-[14px] mb-[10px] cursor-default opacity-80">
        <div className="w-[48px] h-[48px] shrink-0 bg-[#EEF2FF] rounded-[10px] flex items-center justify-center">
          <BarChart2 size={24} className="text-[#4F46E5]" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-semibold text-[#111827]">Weekly Report</h4>
          <p className="text-[12px] text-[#6B7280]">Generating your Week {weekNumber} summary…</p>
        </div>
        <div className="w-[12px] h-[12px] border-[1.5px] border-[#6B7280] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'no_data') {
    return (
      <div className="bg-white rounded-[12px] p-[14px] border border-[#E5E7EB] flex items-center gap-[14px] mb-[10px] cursor-default opacity-65">
        <div className="w-[48px] h-[48px] shrink-0 bg-[#EEF2FF] rounded-[10px] flex items-center justify-center">
          <BarChart2 size={24} className="text-[#4F46E5]" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-semibold text-[#111827]">Weekly Report</h4>
          <p className="text-[12px] text-[#9CA3AF]">Keep logging daily to unlock your first weekly summary</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="px-3 py-0.5 bg-gray-100 rounded-full text-[11px] font-bold text-[#9CA3AF]">Week {weekNumber}</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-[12px] p-[14px] border border-[#E5E7EB] flex items-center gap-[14px] mb-[10px] cursor-pointer active:bg-[#F3F4F6] transition-colors"
    >
      <div className="w-[48px] h-[48px] shrink-0 bg-[#EEF2FF] rounded-[10px] flex items-center justify-center">
        <BarChart2 size={24} className="text-[#4F46E5]" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-[13px] font-semibold text-[#111827]">Weekly Report</h4>
        <p className="text-[12px] text-[#6B7280] mb-1.5">Week {weekNumber} summary is ready</p>
        {teaser && (
          <div className="flex flex-wrap gap-1.5">
            <span className="px-2 py-0.5 bg-[#F3F4F6] text-[#111827] text-[10px] rounded-full whitespace-nowrap">😴 Sleep {teaser.sleep}</span>
            <span className="px-2 py-0.5 bg-[#F3F4F6] text-[#111827] text-[10px] rounded-full whitespace-nowrap">😊 Mood {teaser.mood}</span>
            <span className="px-2 py-0.5 bg-[#F3F4F6] text-[#111827] text-[10px] rounded-full whitespace-nowrap">⚡ Energy {teaser.energy}</span>
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="px-3 py-0.5 bg-[#4F46E5] rounded-full text-[11px] font-semibold text-white">View report</div>
        <div className="text-[16px] text-[#9CA3AF]">›</div>
      </div>
    </div>
  );
};

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
