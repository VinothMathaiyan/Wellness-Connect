import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, Loader2, AlertTriangle, Users } from 'lucide-react';
import MobileShell from '../../../components/MobileShell';
import ProfileMenu from '@/components/ProfileMenu';
import ScreenHeader from '@/components/ScreenHeader';
import AssessmentBottomNav from '../components/AssessmentBottomNav';
import { useWellness } from '../../../context/WellnessContext';
import { supabase } from '../../../lib/supabaseClient';
import {
  approveTrainer,
  flattenTrainerApprovalProfile,
  getPendingTrainerApprovals,
  rejectTrainer,
  TRAINER_APPROVAL_PROFILE_SELECT,
  type TrainerApproval,
  type TrainerApprovalDetail,
} from '../../../services/supabaseService';

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterTab = 'pending' | 'approved' | 'rejected';

/** Full approval row + flattened trainer profile detail used by every tab. */
type ApprovalCard = TrainerApprovalDetail;

/** Shape of a row returned by the approved/rejected direct query (before mapping). */
type ReviewedRow = Omit<TrainerApproval, 'trainer_name'> & {
  trainer: Record<string, unknown> | Array<Record<string, unknown>> | null;
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

// ── Detail panel sub-components ────────────────────────────────────────────────

/** Single label / value row. Renders nothing when the value is empty. */
function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-800 text-right">{value}</span>
    </div>
  );
}

/** Chip list row. Renders nothing when the list is empty. */
function ChipRow({ label, values }: { label: string; values: string[] | null | undefined }) {
  const list = (values ?? []).filter(Boolean);
  if (list.length === 0) return null;
  return (
    <div className="py-1.5 space-y-1.5">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {list.map((v, i) => (
          <span
            key={i}
            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: '#f3f4f6', color: '#4b5563' }}
          >
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Read-only detail panel showing everything the assessor needs to decide. */
function TrainerDetailPanel({ card }: { card: ApprovalCard }) {
  const certBadges: { label: string; on: boolean }[] = [
    { label: 'Rehab certified', on: card.rehab_certified === true },
    { label: 'Medical certified', on: card.medical_certified === true },
  ];

  return (
    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
      {/* Photo + contact */}
      <div className="flex items-center gap-3">
        {card.photo_url ? (
          <img
            src={card.photo_url}
            alt={card.trainer_name}
            className="w-14 h-14 rounded-full object-cover shrink-0"
          />
        ) : (
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center font-bold shrink-0"
            style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}
          >
            {getInitials(card.trainer_name)}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-bold text-gray-900 text-sm truncate">{card.trainer_name}</p>
          {card.phone_number && (
            <p className="text-xs text-gray-500 mt-0.5">{card.phone_number}</p>
          )}
          {card.city && <p className="text-xs text-gray-500">{card.city}</p>}
        </div>
      </div>

      {/* Certification flags */}
      <div className="flex flex-wrap gap-1.5">
        {certBadges.map(b => (
          <span
            key={b.label}
            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={
              b.on
                ? { backgroundColor: '#dcfce7', color: '#16a34a' }
                : { backgroundColor: '#f3f4f6', color: '#9ca3af' }
            }
          >
            {b.on ? '✓ ' : '✕ '}{b.label}
          </span>
        ))}
      </div>

      {/* Bio */}
      {card.bio && (
        <div className="py-1.5">
          <span className="text-xs text-gray-500">Bio</span>
          <p className="text-sm text-gray-700 mt-1 leading-relaxed break-words">{card.bio}</p>
        </div>
      )}

      {/* Single-value rows */}
      <div className="divide-y divide-gray-100">
        <DetailRow label="Experience" value={card.experience_years != null ? `${card.experience_years} yrs` : null} />
        <DetailRow label="Session intensity" value={card.session_intensity} />
        <DetailRow label="Max clients" value={card.max_clients} />
      </div>

      {/* Chip rows */}
      <ChipRow label="Specialties" values={card.specialties} />
      <ChipRow label="Certifications" values={card.certifications} />
      <ChipRow label="Languages" values={card.languages} />
      <ChipRow label="Coaching styles" values={card.coaching_styles} />
      <ChipRow label="Focus areas" values={card.focus_areas} />
      <ChipRow label="Session types" values={card.session_types} />
    </div>
  );
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
              trainer:profiles!trainer_approvals_trainer_id_fkey ( ${TRAINER_APPROVAL_PROFILE_SELECT} )
            `)
            .in('status', ['approved', 'rejected'])
            .order('reviewed_at', { ascending: false }),
        ]);

        if (!isMounted) return;

        if (pendingRes.error) throw new Error(pendingRes.error);
        if (reviewedRes.error) throw new Error(reviewedRes.error.message);

        // Pending — already flattened to TrainerApprovalDetail by the service.
        const pendingCards: ApprovalCard[] = pendingRes.data;

        // Approved / Rejected — flatten the joined profile the same way so every
        // tab carries the full detail set for the expandable panel.
        const reviewedRows = (reviewedRes.data ?? []) as unknown as ReviewedRow[];
        const reviewedCards: ApprovalCard[] = reviewedRows.map(row =>
          flattenTrainerApprovalProfile(row as Parameters<typeof flattenTrainerApprovalProfile>[0]),
        );

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
      <ScreenHeader
        variant="sub"
        title="Trainer Approvals"
        subtitle={isLoading ? '—' : `${pendingCount} pending review`}
        onBack={() => navigate(-1)}
        avatar={<ProfileMenu />}
      >
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
      </ScreenHeader>

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

                      {/* Full trainer detail — visible for every status */}
                      <TrainerDetailPanel card={card} />

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
