import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {

  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Activity,
  Users,
  MessageSquare,
  FileText,
  ChevronRight,
  Plus,
  Video,
  ClipboardList,
  Sparkles,
  Clock,
  ArrowUpRight,
  Zap,
  LogOut,
  Phone,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileShell from '../../../components/MobileShell';
import TrainerBottomNav from '../components/TrainerBottomNav';
import { useWellness } from '../../../context/WellnessContext';
import {
  getTrainerProfile,
  getTrainerClients,
  getTrainerAlertSummary,
  getTrainerTodaySessions,
  getUnreadNotificationCount,
  getPendingCheckinsCount,
  getWeeklyCheckinSummary,
  getCallbackRequests,
  updateCallbackStatus,
  getPendingClientRequests,
} from '../../../services/supabaseService';
import type { WeeklyCheckinRow } from '../../../services/supabaseService';

export default function TrainerDashboard() {
  const navigate = useNavigate();
  const { userId, logout } = useWellness();

  const [trainerName, setTrainerName] = useState('Trainer');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [trainerAvatarSrc, setTrainerAvatarSrc] = useState<string | null>(null);
  const [clientCount, setClientCount] = useState(0);
  const [pendingClientsCount, setPendingClientsCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingCheckinsCount, setPendingCheckinsCount] = useState(0);
  const [weeklyCheckins, setWeeklyCheckins] = useState<WeeklyCheckinRow[]>([]);
  const [callbackRequests, setCallbackRequests] = useState<any[]>([]);

  // Week strip — Mon–Sun of the current week, computed on mount
  // Always use local date arithmetic — never .toISOString() which returns UTC.
  const toLocalDateStr = (d: Date): string => {
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };
  const todayStr = toLocalDateStr(new Date());
  const weekDays = (() => {
    const today = new Date();
    const dow = today.getDay(); // 0=Sun, 1=Mon … 6=Sat
    const diff = dow === 0 ? -6 : 1 - dow; // shift back to Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    const labels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
    return labels.map((label, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = toLocalDateStr(d);
      return {
        label,
        date: d.getDate(),
        dateStr,
        isToday:  dateStr === todayStr,
        isFuture: dateStr > todayStr,
      };
    });
  })();

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await logout();
    navigate('/', { replace: true });
  };

  const refreshUnreadCount = async () => {
    if (!userId) return;
    try {
      const count = await getUnreadNotificationCount(userId);
      setUnreadCount(count);
    } catch (err) {
      console.error('Badge count error:', err);
    }
  };

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setIsLoading(true);
      try {
        // getTrainerClients throws on DB error (unlike the other helpers which return
        // fallback values).  Isolate it with .catch so a single RLS / schema miss
        // cannot block the name + session data from rendering.
        const [profile, clients, alertSummary, sessions, badgeCount, pendingCheckins, weeklyCheckinsResult, callbacks, pendingLinks] = await Promise.all([
          getTrainerProfile(userId),
          getTrainerClients(userId).catch(() => []),
          getTrainerAlertSummary(userId),
          getTrainerTodaySessions(userId),
          getUnreadNotificationCount(userId),
          getPendingCheckinsCount(userId).catch(() => 0),
          getWeeklyCheckinSummary(userId).catch(() => ({ data: [] as WeeklyCheckinRow[] })),
          getCallbackRequests(userId).catch(() => []),
          getPendingClientRequests(userId).catch(() => []),
        ]);
        // Always set name — fall back to 'Trainer' only if profile is null
        setTrainerName(profile?.full_name ?? 'Trainer');
        // avatar_url may be a base64 data URI or a remote URL — both are valid src values
        setTrainerAvatarSrc(profile?.avatar_url ?? profile?.photo_url ?? null);
        setClientCount(clients.length);
        setPendingClientsCount(pendingLinks.length);
        setUrgentCount(alertSummary.urgentCount);
        setTodaySessions(sessions);
        setUnreadCount(badgeCount);
        setPendingCheckinsCount(pendingCheckins);
        setWeeklyCheckins(weeklyCheckinsResult.data);
        setCallbackRequests(callbacks);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [userId]);

  const handleMarkContacted = async (requestId: string) => {
    try {
      await updateCallbackStatus(requestId, 'contacted');
      setCallbackRequests(prev => prev.filter(r => r.id !== requestId));
    } catch {
      // ignore
    }
  };

  // Refetch badge count when the tab becomes visible again (e.g. after returning
  // from NotificationsScreen where the trainer may have read notifications).
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshUnreadCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const getReadinessColor = (score: number) => {
    if (score === 0) return 'bg-gray-100 text-gray-500';
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 60) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '--:--';
    }
  };

  const remainingCount = Math.max(0, todaySessions.length - 1);

  return (
    <MobileShell className="bg-[#F2F8F7]">
      <div className="flex-1 overflow-y-auto pb-32">

        {/* ─── Branded Operational Header — always shown ─────────────────────────── */}
        <div className="relative bg-gradient-to-br from-teal-600 via-emerald-500 to-teal-700 px-5 pt-6 pb-7 rounded-b-3xl overflow-hidden shadow-md">
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute bottom-0 -left-6 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Zap size={15} className="text-white" />
              </div>
              <span className="text-white font-bold text-[15px] tracking-tight">WellnessConnect</span>
            </div>
            <div className="flex items-center gap-2.5">
              {/* Avatar — tap to open profile menu */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfileMenu(prev => !prev)}
                  className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/30 bg-white/20 flex items-center justify-center active:opacity-80 transition-opacity"
                  aria-label="Profile menu"
                >
                  {trainerAvatarSrc ? (
                    <img
                      src={trainerAvatarSrc}
                      alt={trainerName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '15px' }}>
                      {trainerName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>

                {/* Backdrop — closes menu on outside tap */}
                <AnimatePresence>
                  {showProfileMenu && (
                    <>
                      <div
                        onClick={() => setShowProfileMenu(false)}
                        style={{
                          position: 'fixed',
                          inset: 0,
                          zIndex: 99,
                          backgroundColor: 'transparent',
                        }}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.12 }}
                        style={{
                          position: 'fixed',
                          top: '60px',
                          right: '16px',
                          zIndex: 100,
                          backgroundColor: '#ffffff',
                          borderRadius: '12px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                          minWidth: '200px',
                          overflow: 'hidden',
                          border: '1px solid #E5E7EB',
                        }}
                      >
                        {/* Trainer name row */}
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-[13px] font-semibold text-[#111827] truncate">
                            {trainerName}
                          </p>
                          <p className="text-[11px] text-[#6B7280] mt-0.5">Trainer</p>
                        </div>

                        {/* Log out button */}
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-left active:bg-red-50 transition-colors"
                        >
                          <LogOut size={15} style={{ color: '#DC2626', flexShrink: 0 }} />
                          <span style={{ color: '#DC2626', fontSize: 14, fontWeight: 600 }}>
                            Log out
                          </span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="relative z-10">
            <h1 className="text-white text-[22px] font-bold tracking-tight leading-tight">
              Good Morning, {trainerName} 👋
            </h1>
            <p className="text-white/80 text-[13px] font-medium mt-1">
              {urgentCount > 0
                ? `${urgentCount} client${urgentCount === 1 ? '' : 's'} require attention today`
                : 'All clients are on track today'}
            </p>
          </div>
        </div>

        {/* ─── Loading Skeleton ───────────────────────────────────────────────────── */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 16px', marginTop: '20px' }}>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  backgroundColor: '#e5e7eb',
                  borderRadius: '16px',
                  height: '64px',
                  animation: 'pulse 2s infinite',
                }}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-5 pt-5 pb-8 space-y-5">

              {/* ─── 2. Client Alert Triage Banner ─────────────────────────────────────── */}
              {urgentCount > 0 ? (
                <div
                  className="flex items-start gap-3 shadow-sm"
                  style={{ backgroundColor: '#FEF3C7', borderRadius: '12px', padding: '12px 16px', border: '1px solid #FDE68A' }}
                >
                  <AlertTriangle size={18} style={{ color: '#D97706', flexShrink: 0, marginTop: '1px' }} />
                  <div className="flex-1">
                    <p style={{ fontWeight: 700, fontSize: '14px', color: '#92400E' }}>
                      {urgentCount} client{urgentCount === 1 ? '' : 's'} need{urgentCount === 1 ? 's' : ''} attention
                    </p>
                    <button
                      onClick={() => navigate('/trainer/risk-monitor')}
                      className="flex items-center gap-1 mt-1"
                      style={{ color: '#B45309', fontSize: '13px', fontWeight: 600 }}
                    >
                      Review in Risk Monitor <ArrowUpRight size={11} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => navigate('/trainer/risk-monitor')}
                  className="flex items-start gap-3 shadow-sm w-full text-left active:opacity-80 transition-opacity"
                  style={{ backgroundColor: '#F0FDF4', borderRadius: '12px', padding: '12px 16px', border: '1px solid #BBF7D0' }}
                >
                  <CheckCircle size={18} style={{ color: '#16A34A', flexShrink: 0, marginTop: '1px' }} />
                  <div className="flex-1">
                    <p style={{ fontWeight: 600, fontSize: '14px', color: '#15803D' }}>
                      All clients are on track today
                    </p>
                    <span className="flex items-center gap-1 mt-0.5" style={{ color: '#16A34A', fontSize: '13px', fontWeight: 600 }}>
                      View Risk Monitor <ArrowUpRight size={11} />
                    </span>
                  </div>
                </button>
              )}

              {/* ─── 3. KPI Cards ──────────────────────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate('/trainer/clients')}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col text-left active:scale-[0.97] transition-transform"
                >
                  <div className="flex items-center gap-2 text-text-secondary mb-2">
                    <Users size={14} />
                    <span className="text-[12px] font-medium">Active Clients</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-[24px] font-bold text-text-primary">{clientCount}</span>
                    {pendingClientsCount > 0 && (
                      <div className="flex items-center gap-1 text-amber-600 mb-1 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        <TrendingUp size={10} /> +{pendingClientsCount} pending
                      </div>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => navigate('/trainer/clients')}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col text-left active:scale-[0.97] transition-transform"
                >
                  <div className="flex items-center gap-2 text-text-secondary mb-2">
                    <ClipboardList size={14} />
                    <span className="text-[12px] font-medium">Pending Check-ins</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-[24px] font-bold text-amber-600">{isLoading ? 0 : pendingCheckinsCount}</span>
                    <span className="text-[11px] font-medium text-text-secondary mb-1">To review</span>
                  </div>
                </button>
              </div>

              {/* ─── 5. Session Summary Shortcut ───────────────────────────────────────── */}
              {remainingCount > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-semibold text-text-primary">
                      +{remainingCount} more sessions today
                    </p>
                    <p className="text-[12px] text-text-secondary mt-0.5">
                      {todaySessions.slice(1).map((s: any) => s.client?.full_name?.split(' ')[0] ?? '').filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate('/trainer/schedule-session')}
                      className="text-[12px] font-semibold text-teal-600 flex items-center gap-0.5 bg-teal-50 px-3 py-2 rounded-xl border border-teal-100 active:bg-teal-100 transition-colors"
                    >
                      Full Schedule <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              )}

              {/* ─── Pending Callback Requests ─────────────────────────────────────────── */}
              {callbackRequests.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#BAE6FD] shadow-sm overflow-hidden">
                  <div className="bg-[#F0F9FF] px-4 py-3 border-b border-[#BAE6FD] flex items-center gap-2">
                    <Phone size={16} className="text-[#0284C7]" />
                    <h3 className="text-[13px] font-bold text-[#0369A1] uppercase tracking-wider">
                      {callbackRequests.length} call back request{callbackRequests.length === 1 ? '' : 's'} pending
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {callbackRequests.map(req => (
                      <div key={req.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-[14px] font-bold text-gray-900">{req.client_name}</p>
                          <p className="text-[13px] text-gray-500 font-medium">📱 +91 {req.client_phone}</p>
                        </div>
                        <button
                          onClick={() => handleMarkContacted(req.id)}
                          className="px-3 py-1.5 rounded-lg text-[12px] font-bold border active:bg-gray-50"
                          style={{ borderColor: '#1D9E75', color: '#1D9E75' }}
                        >
                          Mark Contacted
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── 6. This Week's Check-ins ──────────────────────────────────────────── */}
              <div>
                <h3 className="text-[13px] font-bold text-text-secondary uppercase tracking-wider mb-3 ml-1">
                  This Week's Check-ins
                </h3>
                <div className="-mx-5 px-5 overflow-x-auto hide-scrollbar">
                  <div className="flex gap-2 min-w-max pb-1">
                    {weekDays.map((day) => {
                      const dayCheckins = weeklyCheckins.filter(c => c.log_date === day.dateStr);
                      return (
                        <button
                          key={day.dateStr}
                          onClick={() => {
                            if (!day.isFuture) {
                              navigate(`/trainer/daily-summary/${day.dateStr}`);
                            }
                          }}
                          disabled={day.isFuture}
                          className="w-[52px] rounded-2xl border bg-white border-gray-200 shadow-sm flex flex-col items-center justify-center gap-1 active:opacity-70 transition-opacity"
                          style={{
                            minHeight: '70px',
                            paddingTop: '8px',
                            paddingBottom: '8px',
                            opacity: day.isFuture ? 0.4 : 1,
                            cursor: day.isFuture ? 'default' : 'pointer',
                          }}
                        >
                          <span
                            className="text-[10px] font-medium uppercase"
                            style={{ color: '#6B7280' }}
                          >
                            {day.label}
                          </span>

                          {day.isToday ? (
                            <span
                              className="font-bold text-white flex items-center justify-center rounded-full"
                              style={{
                                backgroundColor: '#0d9488',
                                width: '26px',
                                height: '26px',
                                fontSize: '13px',
                                lineHeight: 1,
                              }}
                            >
                              {day.date}
                            </span>
                          ) : (
                            <span
                              className="font-bold"
                              style={{
                                fontSize: '15px',
                                color: day.isFuture ? '#9CA3AF' : '#111827',
                              }}
                            >
                              {day.date}
                            </span>
                          )}

                          {/* Readiness dots — one per client who checked in */}
                          <div
                            className="flex gap-0.5 flex-wrap justify-center"
                            style={{ maxWidth: '44px', minHeight: '8px' }}
                          >
                            {dayCheckins.slice(0, 3).map((c, i) => (
                              <div
                                key={i}
                                className="rounded-full"
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  backgroundColor:
                                    c.readiness_score == null
                                      ? '#9CA3AF'
                                      : c.readiness_score >= 70
                                        ? '#22c55e'
                                        : c.readiness_score >= 40
                                          ? '#f59e0b'
                                          : '#ef4444',
                                }}
                              />
                            ))}
                            {dayCheckins.length > 3 && (
                              <div
                                className="rounded-full"
                                style={{ width: '6px', height: '6px', backgroundColor: '#9CA3AF', opacity: 0.6 }}
                              />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Legend for check-in dots */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  padding: '4px 0 8px 0',
                  opacity: 0.7
                }}>
                  <div style={{ 
                    width: '8px', height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: '#f59e0b'  
                  }} />
                  <span style={{ 
                    fontSize: '11px', 
                    color: '#6b7280',
                    fontFamily: 'Arial, sans-serif'
                  }}>
                    Each dot represents a client check-in on that day
                  </span>
                </div>

                {weeklyCheckins.length === 0 && (
                  <p
                    className="text-center mt-2"
                    style={{ fontSize: '12px', color: '#9CA3AF' }}
                  >
                    No check-ins logged this week
                  </p>
                )}
              </div>

              {/* ─── 7. Weekly Insight — TODO: wire to AI insights API ─────────────────── */}
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 p-4 rounded-2xl border border-teal-100 flex items-start gap-3 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                  <Sparkles size={15} className="text-teal-600" />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-teal-900 mb-1">Weekly Insight</h4>
                  <p className="text-[13px] text-teal-800/80 leading-relaxed font-medium">
                    Review your clients' readiness trends to adjust training intensity for the week ahead.
                  </p>
                </div>
              </div>

            </div>
          </motion.div>
        )}

      </div>

      <TrainerBottomNav riskAlertCount={urgentCount} notifCount={unreadCount} />
    </MobileShell>
  );
}
