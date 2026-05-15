import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Bell,
  AlertTriangle,
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
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileShell from '../../../components/MobileShell';
import { useWellness } from '../../../context/WellnessContext';
import {
  getTrainerProfile,
  getTrainerClients,
  getTrainerRiskAlerts,
  getTrainerTodaySessions,
} from '../../../services/supabaseService';

export default function TrainerDashboard() {
  const navigate = useNavigate();
  const { userId } = useWellness();

  const [trainerName, setTrainerName] = useState('Trainer');
  const [clientCount, setClientCount] = useState(0);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // TODO: Wire to real schedule data from Supabase
  const upcomingDays = [
    { day: 'Mon', date: '15', count: 4 },
    { day: 'Tue', date: '16', count: 6 },
    { day: 'Wed', date: '17', count: 3 },
    { day: 'Thu', date: '18', count: 5 },
    { day: 'Fri', date: '19', count: 2 },
    { day: 'Sat', date: '20', count: 0 },
    { day: 'Sun', date: '21', count: 1 },
  ];

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const [profile, clients, riskAlerts, sessions] = await Promise.all([
          getTrainerProfile(userId),
          getTrainerClients(userId),
          getTrainerRiskAlerts(userId),
          getTrainerTodaySessions(userId),
        ]);
        if (profile?.full_name) setTrainerName(profile.full_name);
        setClientCount(clients?.length ?? 0);
        setAlerts(riskAlerts);
        setTodaySessions(sessions);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
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

  const prioritySession = todaySessions[0] ?? null;
  const remainingCount = todaySessions.length - 1;

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
              <button
                onClick={() => navigate('/trainer/notifications')}
                className="relative p-2 rounded-full bg-white/15 backdrop-blur-sm active:bg-white/25 transition-colors"
              >
                <Bell size={18} className="text-white" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white pointer-events-none">
                  3
                </span>
              </button>
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/30 bg-white/20">
                <img src="https://i.pravatar.cc/150?u=trainer" alt="Profile" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          <div className="relative z-10">
            <h1 className="text-white text-[22px] font-bold tracking-tight leading-tight">
              Good Morning, {trainerName} 👋
            </h1>
            <p className="text-white/80 text-[13px] font-medium mt-1">
              {alerts.length > 0
                ? `${alerts.length} client${alerts.length === 1 ? '' : 's'} require attention today`
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

              {/* ─── 2. Critical Alerts ────────────────────────────────────────────────── */}
              <div className="space-y-2.5">
                {alerts.length === 0 ? (
                  <div className="p-3.5 rounded-2xl border border-gray-100 bg-white flex items-center gap-3 shadow-sm">
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>No active alerts</p>
                  </div>
                ) : (
                  alerts.map((alert, idx) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.08 }}
                      className={`p-3.5 rounded-2xl border flex items-start gap-3 shadow-sm ${
                        alert.severity === 'high'
                          ? 'bg-red-50 border-red-100 text-red-900'
                          : 'bg-amber-50 border-amber-100 text-amber-900'
                      }`}
                    >
                      <AlertTriangle
                        size={16}
                        className={`shrink-0 mt-0.5 ${alert.severity === 'high' ? 'text-red-500' : 'text-amber-500'}`}
                      />
                      <div className="flex-1">
                        <p style={{ fontWeight: '600', fontSize: '14px' }} className="leading-tight mb-1.5">
                          {alert.message}
                        </p>
                        <button
                          onClick={() => navigate('/trainer/risk-monitor')}
                          style={{ color: '#0d9488', fontSize: '13px', fontWeight: '600' }}
                          className="flex items-center gap-1"
                        >
                          Open Risk Center → <ArrowUpRight size={11} />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

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
                    <div className="flex items-center gap-1 text-green-600 mb-1 bg-green-50 px-1.5 py-0.5 rounded text-[10px] font-bold">
                      <TrendingUp size={10} /> +2
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => navigate('/trainer/client-request/pending-001')}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col text-left active:scale-[0.97] transition-transform"
                >
                  <div className="flex items-center gap-2 text-text-secondary mb-2">
                    <ClipboardList size={14} />
                    <span className="text-[12px] font-medium">Pending Check-ins</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-[24px] font-bold text-amber-600">4</span>
                    <span className="text-[11px] font-medium text-text-secondary mb-1">To review</span>
                  </div>
                </button>
              </div>

              {/* ─── 4. Today's Priority Session ───────────────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[13px] font-bold text-text-secondary uppercase tracking-wider ml-1">
                    Priority Session
                  </h3>
                  <button
                    onClick={() => console.log('Next Up — coming soon')}
                    className="text-[11px] font-semibold text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100"
                  >
                    Next Up
                  </button>
                </div>

                {prioritySession ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                  >
                    <div className="p-4 flex items-start gap-3">
                      <div className="relative shrink-0">
                        <img
                          src={prioritySession.client?.photo_url ?? 'https://i.pravatar.cc/150?u=client'}
                          alt={prioritySession.client?.full_name ?? 'Client'}
                          className="w-14 h-14 rounded-xl object-cover bg-gray-100"
                        />
                        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border-2 border-white shadow-sm ${getReadinessColor(0)}`}>
                          N/A
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[16px] font-bold text-text-primary leading-tight">
                          {prioritySession.client?.full_name ?? 'Unknown Client'}
                        </h4>
                        <p className="text-[13px] text-text-secondary font-medium flex items-center gap-1.5 mt-1">
                          <Clock size={12} />
                          {formatTime(prioritySession.scheduled_at)} · {prioritySession.template?.session_type ?? 'Session'}
                        </p>
                        <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${getReadinessColor(0)}`}>
                          <Activity size={10} />
                          Readiness N/A
                        </div>
                      </div>
                    </div>

                    {/* TODO: Wire 'Update Weekly Plan' CTA to /trainer/weekly-plan/:clientId when session cards are expanded */}
                    <div className="grid grid-cols-2 gap-2 px-4 py-3 border-t border-gray-50">
                      <button
                        onClick={() => navigate(`/trainer/client/${prioritySession.client?.id ?? '1'}`)}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold text-text-secondary bg-gray-50 hover:bg-gray-100 transition-colors active:scale-95"
                      >
                        <Activity size={15} /> View Client
                      </button>
                      <button className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-sm shadow-teal-200 active:scale-95 transition-all">
                        <Video size={15} /> Join Session
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', padding: '16px' }}>
                      No sessions scheduled for today
                    </p>
                  </div>
                )}
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

              {/* ─── Quick Actions Row ─────────────────────────────────────────────────── */}
              <div className="-mx-5 px-5 overflow-x-auto hide-scrollbar">
                <div className="flex gap-2 min-w-max pb-1">
                  <button className="flex items-center gap-1.5 bg-teal-500/10 text-teal-700 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors active:bg-teal-500/20">
                    <Plus size={15} /> Add Program
                  </button>
                  <button className="flex items-center gap-1.5 bg-white border border-gray-200 text-text-primary px-4 py-2.5 rounded-xl text-[13px] font-medium shadow-sm transition-colors active:bg-gray-50">
                    <MessageSquare size={15} className="text-text-secondary" /> Message
                  </button>
                  <button className="flex items-center gap-1.5 bg-white border border-gray-200 text-text-primary px-4 py-2.5 rounded-xl text-[13px] font-medium shadow-sm transition-colors active:bg-gray-50">
                    <FileText size={15} className="text-text-secondary" /> Reports
                  </button>
                </div>
              </div>

              {/* ─── 6. Upcoming Load — TODO: wire to real schedule ────────────────────── */}
              <div>
                <h3 className="text-[13px] font-bold text-text-secondary uppercase tracking-wider mb-3 ml-1">
                  Upcoming Load
                </h3>
                <div className="-mx-5 px-5 overflow-x-auto hide-scrollbar">
                  <div className="flex gap-2 min-w-max pb-1">
                    {upcomingDays.map((day, idx) => (
                      <div
                        key={idx}
                        className={`w-[52px] h-[70px] rounded-2xl border flex flex-col items-center justify-center gap-1 ${
                          day.count > 0 ? 'bg-white border-gray-200 shadow-sm' : 'bg-transparent border-gray-200 opacity-50'
                        }`}
                      >
                        <span className="text-[10px] font-medium text-text-secondary uppercase">{day.day}</span>
                        <span className="text-[15px] font-bold text-text-primary">{day.date}</span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: Math.min(day.count, 3) }).map((_, i) => (
                            <div key={i} className="w-1 h-1 rounded-full bg-teal-500" />
                          ))}
                          {day.count > 3 && <div className="w-1 h-1 rounded-full bg-teal-400 opacity-60" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ─── 7. Weekly Insight — TODO: wire to AI insights API ─────────────────── */}
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 p-4 rounded-2xl border border-teal-100 flex items-start gap-3 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                  <Sparkles size={15} className="text-teal-600" />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-teal-900 mb-1">Weekly Insight</h4>
                  <p className="text-[13px] text-teal-800/80 leading-relaxed font-medium">
                    Clients with a readiness score below 60 on Mondays have a higher drop-off rate. Consider adjusting intensity for Sarah.
                  </p>
                </div>
              </div>

            </div>
          </motion.div>
        )}

      </div>
    </MobileShell>
  );
}
