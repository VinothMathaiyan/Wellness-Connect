import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, Loader2, AlertTriangle, Users } from 'lucide-react';
import MobileShell from '../../../components/MobileShell';
import ProfileMenu from '@/components/ProfileMenu';
import AssessmentBottomNav from '../components/AssessmentBottomNav';
import { useWellness } from '../../../context/WellnessContext';
import { supabase } from '../../../lib/supabaseClient';
import {
  approveTrainer,
  getPendingTrainerApprovals,
  rejectTrainer,
  type TrainerApproval,
} from '../../../services/supabaseService';

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterTab = 'pending' | 'approved' | 'rejected';

/** TrainerApproval extended with the extra profile fields the direct query returns. */
interface ApprovalCard extends TrainerApproval {
  city: string | null;
  specialties: string[] | null;
}

/** Shape of a row returned by the approved/rejected direct query (before mapping). */
type ReviewedRow = Omit<TrainerApproval, 'trainer_name'> & {
  trainer: {
    full_name: string;
    city: string | null;
    specialties: string[] | null;
  } | Array<{
    full_name: string;
    city: string | null;
    specialties: string[] | null;
  }> | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<
  'pending' | 'approved' | 'rejected',
  { bg: string; text: string; label: string }
> = {
  pending:  { bg: '#fef3c7', text: '#d97706', label: 'Pending'  },
  approved: { bg: '#dcfce7', text: '#16a34a', label: 'Approved' },
  rejected: { bg: '#fee2e2', text: '#dc2626', label: 'Rejected' },
};

const TABS: { value: FilterTab; label: string; activeColor: string }[] = [
  { value: 'pending',  label: 'Pending',  activeColor: '#d97706' },
  { value: 'approved', label: 'Approved', activeColor: '#16a34a' },
  { value: 'rejected', label: 'Rejected', activeColor: '#dc2626' },
];

const EMPTY_MESSAGES: Record<FilterTab, string> = {
  pending:  'No trainers awaiting approval',
  approved: 'No approved trainers yet',
  rejected: 'No rejected trainers',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysAgo(dateString: string): string {
  const days = Math.floor((Date.now() - new Date(dateString).getTime()) / 86_400_000);
  if (days === 0) return 'Submitted today';
  if (days === 1) return 'Submitted 1 day ago';
  return `Submitted ${days} days ago`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0] ?? '')
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TrainerApprovalQueueScreen() {
  const navigate = useNavigate();
  const { userId } = useWellness();

  // List data
  const [approvals, setApprovals] = useState<ApprovalCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState('');

  // UI state
  const [activeTab, setActiveTab]   = useState<FilterTab>('pending');
  const [triggerFetch, setTriggerFetch] = useState(0);

  // Accordion state — one card open at a time
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [notes, setNotes]               = useState('');
  const [actionTarget, setActionTarget] = useState<'approved' | 'rejected' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError]   = useState('');

  // ── Fetch ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    let isMounted = true;

    async function fetchAll() {
      setIsLoading(true);
      setError('');
      try {
        const [pendingRes, reviewedRes] = await Promise.all([
          getPendingTrainerApprovals(),
          supabase
            .from('trainer_approvals')
            .select(`
              id, trainer_id, assessor_id, status, review_notes, reviewed_at, created_at,
              trainer:profiles!trainer_approvals_trainer_id_fkey ( full_name, city, specialties )
            `)
            .in('status', ['approved', 'rejected'])
            .order('reviewed_at', { ascending: false }),
        ]);

        if (!isMounted) return;

        if (pendingRes.error) throw new Error(pendingRes.error);
        if (reviewedRes.error) throw new Error(reviewedRes.error.message);

        // Pending — getPendingTrainerApprovals only joins full_name; pad missing fields
        const pendingCards: ApprovalCard[] = pendingRes.data.map(p => ({
          ...p,
          city: null,
          specialties: null,
        }));

        // Approved / Rejected — direct query includes city + specialties
        const reviewedRows = (reviewedRes.data ?? []) as unknown as ReviewedRow[];
        const reviewedCards: ApprovalCard[] = reviewedRows.map(row => {
          const t = Array.isArray(row.trainer) ? row.trainer[0] : row.trainer;
          return {
            ...row,
            trainer_name: t?.full_name ?? 'Unknown',
            city: t?.city ?? null,
            specialties: t != null && Array.isArray(t.specialties)
              ? (t.specialties as string[])
              : null,
          };
        });

        setApprovals([...pendingCards, ...reviewedCards]);
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load approvals.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchAll();
    return () => { isMounted = false; };
  }, [triggerFetch]);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const displayedList = useMemo(
    () => approvals.filter(a => a.status === activeTab),
    [approvals, activeTab],
  );

  const pendingCount = useMemo(
    () => approvals.filter(a => a.status === 'pending').length,
    [approvals],
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleExpand = (id: string, existingNotes: string | null) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      setNotes(existingNotes ?? '');
      setActionError('');
    }
  };

  const handleAction = async (trainerId: string, action: 'approved' | 'rejected') => {
    if (!userId) return;
    if (action === 'rejected' && !notes.trim()) {
      // The trainer's resubmission flow surfaces these notes verbatim, so a
      // rejection without a reason would leave the trainer with no guidance.
      setActionError('Please provide a reason for rejection.');
      return;
    }
    setActionTarget(action);
    setActionLoading(true);
    setActionError('');
    try {
      if (action === 'approved') {
        // assessor_id is derived server-side from auth.uid() inside the RPC.
        await approveTrainer(trainerId);
      } else {
        await rejectTrainer(trainerId, notes.trim());
      }
      setExpandedId(null);
      setNotes('');
      setTriggerFetch(t => t + 1);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setActionLoading(false);
      setActionTarget(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <MobileShell className="bg-[#F2F8F7]">

      {/* ── Header ── */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-5 pt-10 pb-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-700 active:scale-95 transition-transform"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Trainer Approvals</h1>
            <p className="text-sm font-medium text-gray-500">
              {isLoading ? '—' : `${pendingCount} pending review`}
            </p>
          </div>
          <div className="ml-auto">
            <ProfileMenu />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl mt-4">
          {TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.value ? 'bg-white shadow-sm' : ''
              }`}
              style={{ color: activeTab === tab.value ? tab.activeColor : '#6b7280' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto p-5 pb-24">

        {/* Load error banner */}
        {error && (
          <div className="bg-red-50 p-3 rounded-lg flex items-start gap-2 border border-red-100 mb-4">
            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading ? (
          <div className="space-y-3">
            {Array(4).fill(0).map((_, i) => (
              <div
                key={i}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 animate-pulse"
              >
                <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-2/5" />
                </div>
                <div className="w-16 h-5 bg-gray-200 rounded-full shrink-0" />
              </div>
            ))}
          </div>

        ) : displayedList.length > 0 ? (

          <div className="space-y-3">
            {displayedList.map(card => {
              const isExpanded  = expandedId === card.id;
              const statusMeta  = STATUS_META[card.status];
              const initials    = getInitials(card.trainer_name);
              const specialties = card.specialties ?? [];

              return (
                <div
                  key={card.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  {/* ── Card header — always visible, tappable ── */}
                  <button
                    onClick={() => handleExpand(card.id, card.review_notes)}
                    className="w-full p-4 flex items-center gap-3 text-left active:bg-gray-50 transition-colors"
                  >
                    {/* Avatar */}
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0"
                      style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}
                    >
                      {initials}
                    </div>

                    {/* Info block */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-[15px] truncate">
                        {card.trainer_name}
                      </p>
                      {card.city && (
                        <p className="text-xs text-gray-500 mt-0.5">{card.city}</p>
                      )}
                      {specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {specialties.map((s, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: '#f3f4f6', color: '#4b5563' }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-[11px] text-gray-400 mt-1">
                        {daysAgo(card.created_at)}
                      </p>
                    </div>

                    {/* Status badge + chevron */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="text-[10px] font-bold px-2 py-1 rounded-full"
                        style={{ backgroundColor: statusMeta.bg, color: statusMeta.text }}
                      >
                        {statusMeta.label.toUpperCase()}
                      </span>
                      <ChevronDown
                        size={16}
                        className="text-gray-400"
                        style={{
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                        }}
                      />
                    </div>
                  </button>

                  {/* ── Expanded panel ── */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 space-y-3">

                      {/* Reviewed cards: show stored review notes read-only */}
                      {card.status !== 'pending' && card.review_notes && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs font-semibold text-gray-500 mb-1">
                            Review Notes
                          </p>
                          <p className="text-sm text-gray-700">{card.review_notes}</p>
                        </div>
                      )}

                      {/* Pending cards: editable notes + action buttons */}
                      {card.status === 'pending' && (
                        <>
                          <textarea
                            value={notes}
                            onChange={e => {
                              setNotes(e.target.value);
                              setActionError('');
                            }}
                            placeholder="Add review notes..."
                            rows={3}
                            className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                          />

                          {/* Action error */}
                          {actionError && (
                            <div className="flex items-start gap-2 bg-red-50 p-2.5 rounded-lg border border-red-100">
                              <AlertTriangle
                                className="text-red-500 shrink-0 mt-0.5"
                                size={14}
                              />
                              <p className="text-xs text-red-700">{actionError}</p>
                            </div>
                          )}

                          {/* Approve / Reject */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(card.trainer_id, 'approved')}
                              disabled={actionLoading}
                              className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                              style={{
                                backgroundColor: actionLoading ? '#9ca3af' : '#16a34a',
                                color: '#ffffff',
                              }}
                            >
                              {actionLoading && actionTarget === 'approved' && (
                                <Loader2 size={14} className="animate-spin" />
                              )}
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(card.trainer_id, 'rejected')}
                              disabled={actionLoading}
                              className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                              style={{
                                backgroundColor: actionLoading ? '#9ca3af' : '#dc2626',
                                color: '#ffffff',
                              }}
                            >
                              {actionLoading && actionTarget === 'rejected' && (
                                <Loader2 size={14} className="animate-spin" />
                              )}
                              Reject
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
              <Users size={22} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">{EMPTY_MESSAGES[activeTab]}</p>
          </div>
        )}

      </div>

      <AssessmentBottomNav />
    </MobileShell>
  );
}
