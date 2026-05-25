import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Users, ShieldAlert, FileCheck, CalendarClock, AlertTriangle, LogOut } from 'lucide-react';
import MobileShell from '../../../components/MobileShell';
import AssessmentBottomNav from '../components/AssessmentBottomNav';
import { useWellness } from '../../../context/WellnessContext';
import { 
  getAssessorDashboardStats, 
  getNewClientQueue, 
  type Assessment 
} from '../../../services/supabaseService';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

export default function AssessmentDashboardScreen() {
  const navigate = useNavigate();
  const { userId, appState, logout } = useWellness();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close the profile menu when clicking/tapping outside of it.
  useEffect(() => {
    if (!showProfileMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await logout();
    navigate('/signup', { replace: true });
  };

  const [stats, setStats] = useState({
    newClientCount: 0,
    openEscalationCount: 0,
    pendingTrainerApprovalCount: 0,
    monthlyReviewsDueCount: 0,
  });
  const [recentActivity, setRecentActivity] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    async function fetchData() {
      setIsLoading(true);
      setError('');
      try {
        const [statsData, queueRes] = await Promise.all([
          getAssessorDashboardStats(userId!),
          getNewClientQueue(userId!)
        ]);

        if (!isMounted) return;

        if (statsData.error) throw new Error(statsData.error);
        
        setStats({
          newClientCount: statsData.newClientCount,
          openEscalationCount: statsData.openEscalationCount,
          pendingTrainerApprovalCount: statsData.pendingTrainerApprovalCount,
          monthlyReviewsDueCount: statsData.monthlyReviewsDueCount,
        });

        if (queueRes.error) {
           console.error('Failed to load recent activity', queueRes.error);
        } else {
           // Take only the last 3 for recent activity
           setRecentActivity(queueRes.data.slice(0, 3));
        }

      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load dashboard data.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const firstName = appState.full_name?.split(' ')[0] || 'Assessor';
  const initials = appState.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'AS';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return { bg: '#fef3c7', text: '#d97706' }; // amber
      case 'in_progress': return { bg: '#dbeafe', text: '#2563eb' }; // blue
      case 'completed': return { bg: '#dcfce7', text: '#16a34a' }; // green
      case 'flagged': return { bg: '#fee2e2', text: '#dc2626' }; // red
      default: return { bg: '#f3f4f6', text: '#4b5563' }; // gray
    }
  };

  return (
    <MobileShell className="bg-[#F2F8F7]">
      <div className="flex-1 overflow-y-auto pb-24">
        
        {/* Header Card */}
        <div 
          className="px-5 pt-10 pb-6 rounded-b-3xl shadow-sm text-white relative overflow-visible"
          style={{ background: 'linear-gradient(135deg, #0d9488 0%, #7c3aed 100%)' }}
        >
          <div className="flex justify-between items-start relative z-10">
            <div>
              <h1 className="text-2xl font-bold mb-1">{getGreeting()}, {firstName} 👋</h1>
              <p className="text-white/80 text-sm font-medium">Assessment Command Center</p>
            </div>
            {/* Avatar — tap to open profile menu */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(prev => !prev)}
                aria-label="Profile menu"
                className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30 text-white font-bold text-lg shadow-sm active:opacity-80 transition-opacity"
              >
                {initials}
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.12 }}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      zIndex: 1000,
                      marginTop: '8px',
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      minWidth: '200px',
                      padding: '8px 0',
                    }}
                  >
                    {/* Name + role */}
                    <div style={{ padding: '4px 16px 8px' }}>
                      <p className="truncate" style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                        {appState.full_name || 'Assessment Team'}
                      </p>
                      <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Assessor</p>
                    </div>

                    {/* Divider */}
                    <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '4px 0' }} />

                    {/* Sign out button */}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 transition-colors hover:bg-[#fef2f2]"
                      style={{ padding: '8px 16px', textAlign: 'left' }}
                    >
                      <LogOut size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                      <span style={{ color: '#ef4444', fontSize: 14, fontWeight: 600 }}>
                        Sign Out
                      </span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="px-5 mt-5 space-y-6">
          
          {/* Error Banner */}
          {error && (
            <div className="bg-red-50 p-3 rounded-lg flex items-start gap-2 border border-red-100">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Priority Action Banner */}
          {!isLoading && !error && (
            stats.openEscalationCount > 0 ? (
              <button 
                onClick={() => navigate('/assessment/escalations')}
                className="w-full bg-red-50 p-4 rounded-xl flex items-center justify-between border border-red-100 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                    <ShieldAlert size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-red-700">{stats.openEscalationCount} open escalations</p>
                    <p className="text-sm text-red-600/80">Need your attention</p>
                  </div>
                </div>
                <div className="flex items-center text-red-600 text-sm font-medium">
                  Review Now <ChevronRight size={16} className="ml-1" />
                </div>
              </button>
            ) : stats.newClientCount > 0 ? (
              <button 
                onClick={() => navigate('/assessment/clients/queue')}
                className="w-full bg-amber-50 p-4 rounded-xl flex items-center justify-between border border-amber-100 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <Users size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-amber-700">{stats.newClientCount} new clients</p>
                    <p className="text-sm text-amber-600/80">Awaiting assessment</p>
                  </div>
                </div>
                <div className="flex items-center text-amber-600 text-sm font-medium">
                  View Queue <ChevronRight size={16} className="ml-1" />
                </div>
              </button>
            ) : (
               <div className="w-full bg-emerald-50 p-4 rounded-xl flex items-center gap-3 border border-emerald-100 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <FileCheck size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-700">All clear</p>
                    <p className="text-sm text-emerald-600/80">No urgent actions today</p>
                  </div>
              </div>
            )
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/assessment/clients/queue')}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-start active:scale-95 transition-transform"
            >
              <div className="flex justify-between w-full mb-3">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Users size={18} />
                </div>
                {stats.newClientCount > 0 && (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: '#f59e0b' }}>
                    {stats.newClientCount}
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{isLoading ? '-' : stats.newClientCount}</h3>
              <p className="text-xs font-medium text-gray-500">New Clients</p>
            </button>

            <button
              onClick={() => navigate('/assessment/escalations')}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-start active:scale-95 transition-transform"
            >
              <div className="flex justify-between w-full mb-3">
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                  <ShieldAlert size={18} />
                </div>
                {stats.openEscalationCount > 0 && (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: '#ef4444' }}>
                    {stats.openEscalationCount}
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{isLoading ? '-' : stats.openEscalationCount}</h3>
              <p className="text-xs font-medium text-gray-500">Open Escalations</p>
            </button>

            <button
              onClick={() => navigate('/assessment/trainer-approvals')}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-start active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
                <FileCheck size={18} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{isLoading ? '-' : stats.pendingTrainerApprovalCount}</h3>
              <p className="text-xs font-medium text-gray-500">Trainer Approvals</p>
            </button>

            <button
              onClick={() => navigate('/assessment/monthly-reviews')}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-start active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 mb-3">
                <CalendarClock size={18} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{isLoading ? '-' : stats.monthlyReviewsDueCount}</h3>
              <p className="text-xs font-medium text-gray-500">Reviews Due</p>
            </button>
          </div>

          {/* Recent Activity */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
              <button 
                onClick={() => navigate('/assessment/clients/queue')}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                View all →
              </button>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                // Skeletons
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-3 bg-gray-200 rounded w-1/4" />
                    </div>
                  </div>
                ))
              ) : recentActivity.length > 0 ? (
                recentActivity.map(client => {
                  const colors = getStatusColor(client.status);
                  const clientInitials = client.client_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';
                  return (
                    <button 
                      key={client.id}
                      onClick={() => navigate(`/assessment/assess/${client.client_id}`)}
                      className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 active:scale-[0.98] transition-transform text-left"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: colors.bg, color: colors.text }}>
                        {clientInitials}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{client.client_name}</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium mt-1" style={{ backgroundColor: colors.bg, color: colors.text }}>
                          {client.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <ChevronRight size={18} className="text-gray-400" />
                    </button>
                  );
                })
              ) : (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                  <p className="text-gray-500 text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <AssessmentBottomNav 
        escalationCount={stats.openEscalationCount} 
        alertCount={0} 
      />
    </MobileShell>
  );
}
