import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, AlertTriangle, Users } from 'lucide-react';
import MobileShell from '../../../components/MobileShell';
import ProfileMenu from '@/components/ProfileMenu';
import ScreenHeader from '@/components/ScreenHeader';
import AssessmentBottomNav from '../components/AssessmentBottomNav';
import { useWellness } from '../../../context/WellnessContext';
import { getNewClientQueue, type Assessment } from '../../../services/supabaseService';
import { supabase } from '../../../lib/supabaseClient';

type FilterTab = 'pending' | 'in_progress' | 'completed';

/** Per-client snapshot of the health profile, shown as badges on each queue card. */
interface ClientProfileSummary {
  fitness_level: string | null;
  conditionCount: number;
  incomplete: boolean;
}

export default function NewClientQueueScreen() {
  const navigate = useNavigate();
  const { userId } = useWellness();
  
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const [queue, setQueue] = useState<Assessment[]>([]);
  const [completed, setCompleted] = useState<Assessment[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, ClientProfileSummary>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    async function fetchData() {
      setIsLoading(true);
      setError('');
      try {
        // Fetch pending and in_progress
        const queueRes = await getNewClientQueue(userId!);
        if (queueRes.error) throw new Error(queueRes.error);
        
        // Fetch completed — shared across the assessment team (any assessor).
        // Inner-join the client profile + role filter so only role='client'
        // assessments show, consistent with the live queue.
        const { data: completedData, error: completedError } = await supabase
          .from('assessments')
          .select(`
            id, client_id, assessor_id, status, assessment_date,
            fitness_level, health_notes, trainer_recommendation,
            recommended_trainer_id, clearance_status, created_at,
            client:profiles!assessments_client_id_fkey!inner ( full_name, role )
          `)
          .eq('status', 'completed')
          .eq('client.role', 'client')
          .order('created_at', { ascending: false });

        if (completedError) throw new Error(completedError.message);

        if (!isMounted) return;

        setQueue(queueRes.data);

        const mappedCompleted = (completedData || [])
          // Belt-and-suspenders: keep only client-role rows even if the
          // embedded role filter is ever relaxed.
          .filter((row: any) => {
            const client = Array.isArray(row.client) ? row.client[0] : row.client;
            return client?.role === 'client';
          })
          .map((row: any) => ({
            ...row,
            client_name: Array.isArray(row.client)
              ? (row.client[0]?.full_name ?? 'Unknown')
              : (row.client?.full_name ?? 'Unknown'),
          }));

        setCompleted(mappedCompleted as Assessment[]);

        // Fetch each client's health profile to render status badges on cards.
        const clientIds = Array.from(
          new Set([
            ...queueRes.data.map(q => q.client_id),
            ...mappedCompleted.map((c: Assessment) => c.client_id),
          ]),
        );

        if (clientIds.length > 0) {
          const { data: profileRows } = await supabase
            .from('client_profiles')
            .select('user_id, dob, gender, fitness_level, medical_conditions')
            .in('user_id', clientIds);

          if (isMounted) {
            const map: Record<string, ClientProfileSummary> = {};
            for (const row of (profileRows ?? []) as Array<{
              user_id: string;
              dob: string | null;
              gender: string | null;
              fitness_level: string | null;
              medical_conditions: string[] | null;
            }>) {
              map[row.user_id] = {
                fitness_level: row.fitness_level ?? null,
                conditionCount: Array.isArray(row.medical_conditions)
                  ? row.medical_conditions.length
                  : 0,
                incomplete: !row.dob || !row.gender,
              };
            }
            // Clients with no client_profiles row at all are incomplete too.
            for (const id of clientIds) {
              if (!map[id]) {
                map[id] = { fitness_level: null, conditionCount: 0, incomplete: true };
              }
            }
            setProfileMap(map);
          }
        }

      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load queue.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const displayedList = useMemo(() => {
    if (activeTab === 'completed') return completed;
    // Pending tab surfaces the full live queue (pending + in_progress);
    // the In Progress tab narrows to in_progress only.
    if (activeTab === 'in_progress') return queue.filter(item => item.status === 'in_progress');
    return queue;
  }, [activeTab, queue, completed]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return { bg: '#fef3c7', text: '#d97706' }; // amber
      case 'in_progress': return { bg: '#dbeafe', text: '#2563eb' }; // blue
      case 'completed': return { bg: '#dcfce7', text: '#16a34a' }; // green
      case 'flagged': return { bg: '#fee2e2', text: '#dc2626' }; // red
      default: return { bg: '#f3f4f6', text: '#4b5563' }; // gray
    }
  };

  const calculateDaysAgo = (dateString: string) => {
    const diff = new Date().getTime() - new Date(dateString).getTime();
    const days = Math.floor(diff / (1000 * 3600 * 24));
    if (days === 0) return 'Registered today';
    if (days === 1) return 'Registered 1 day ago';
    return `Registered ${days} days ago`;
  };

  const emptyMessages = {
    pending: 'No clients awaiting assessment',
    in_progress: 'No assessments in progress',
    completed: 'No completed assessments'
  };

  return (
    <MobileShell className="bg-[#F2F8F7]">
      {/* Header */}
      <ScreenHeader
        variant="sub"
        title="Client Queue"
        subtitle={`${queue.filter(q => q.status === 'pending').length} awaiting assessment`}
        onBack={() => navigate(-1)}
        avatar={<ProfileMenu />}
      >
        {/* Filter Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl mt-5">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'pending' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setActiveTab('in_progress')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'in_progress' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
          >
            In Progress
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'completed' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
          >
            Completed
          </button>
        </div>
      </ScreenHeader>

      <div className="flex-1 overflow-y-auto p-5 pb-24">
        {error && (
          <div className="bg-red-50 p-3 rounded-lg flex items-start gap-2 border border-red-100 mb-4">
            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : displayedList.length > 0 ? (
          <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3 lg:items-start">
            {displayedList.map(client => {
              const colors = getStatusColor(client.status);
              const summary = profileMap[client.client_id];
              const clientInitials = client.client_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';
              
              return (
                <button
                  key={client.id}
                  onClick={() => navigate(`/assessment/assess/${client.client_id}`)}
                  className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0" style={{ backgroundColor: colors.bg, color: colors.text }}>
                    {clientInitials}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-[15px]">{client.client_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{calculateDaysAgo(client.created_at)}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                       <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: colors.bg, color: colors.text }}>
                         {client.status.replace('_', ' ').toUpperCase()}
                       </span>
                       {summary?.fitness_level && (
                         <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold capitalize" style={{ backgroundColor: '#f0fdfa', color: '#0d9488' }}>
                           {summary.fitness_level}
                         </span>
                       )}
                       {summary && summary.conditionCount > 0 && (
                         <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
                           {summary.conditionCount} condition{summary.conditionCount > 1 ? 's' : ''}
                         </span>
                       )}
                       {summary?.incomplete && (
                         <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
                           Profile incomplete
                         </span>
                       )}
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-400 shrink-0" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
              <Users size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm font-medium">{emptyMessages[activeTab]}</p>
          </div>
        )}
      </div>

      <AssessmentBottomNav />
    </MobileShell>
  );
}
