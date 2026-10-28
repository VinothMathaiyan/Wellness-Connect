import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react';
import MobileShell from '../../../components/MobileShell';
import ProfileMenu from '@/components/ProfileMenu';
import ScreenHeader from '@/components/ScreenHeader';
import AssessmentBottomNav from '../components/AssessmentBottomNav';
import { useWellness } from '../../../context/WellnessContext';
import { supabase } from '../../../lib/supabaseClient';
import {
  getMonthlyReviewQueue,
  submitMonthlyReview,
  type MonthlyReview,
} from '../../../services/supabaseService';
import { formatDate } from '@/utils/dateUtils';

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterTab = 'due' | 'reviewed';
type ActionTaken = 'message' | 'call' | 'none';

interface ReviewedClient {
  id: string;
  client_id: string;
  client_name: string;
  trainer_name: string | null;
  goal_alignment_score: number;
  notes: string | null;
  action_taken: ActionTaken;
  reviewed_at: string;
}

interface FormState {
  score: number | null;
  notes: string;
  action: ActionTaken | null;
  isSubmitting: boolean;
  error: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getScoreColors(score: number): { color: string; bg: string; border: string } {
  if (score <= 4) return { color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' };
  if (score <= 7) return { color: '#d97706', bg: '#fef3c7', border: '#fcd34d' };
  return { color: '#16a34a', bg: '#dcfce7', border: '#86efac' };
}

const ACTION_META: Record<ActionTaken, { label: string; selectedBg: string; selectedText: string; selectedBorder: string }> = {
  message: {
    label: '💬 Message Client',
    selectedBg: '#eff6ff',
    selectedText: '#2563eb',
    selectedBorder: '#93c5fd',
  },
  call: {
    label: '📞 Log Call',
    selectedBg: '#f5f3ff',
    selectedText: '#7c3aed',
    selectedBorder: '#c4b5fd',
  },
  none: {
    label: '✓ No Action Needed',
    selectedBg: '#f0fdfa',
    selectedText: '#0f766e',
    selectedBorder: '#5eead4',
  },
};

const ACTION_BADGE: Record<ActionTaken, { bg: string; text: string; label: string }> = {
  message: { bg: '#dbeafe', text: '#2563eb', label: 'Message' },
  call:    { bg: '#ede9fe', text: '#7c3aed', label: 'Call'    },
  none:    { bg: '#f3f4f6', text: '#4b5563', label: 'No Action' },
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

function weeksFromDate(isoDate: string): number {
  const start = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return Math.max(1, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MonthlyReviewQueueScreen() {
  const navigate = useNavigate();
  const { userId } = useWellness();

  const [tab, setTab] = useState<FilterTab>('due');
  const [dueClients, setDueClients] = useState<MonthlyReview[]>([]);
  const [reviewedClients, setReviewedClients] = useState<ReviewedClient[]>([]);
  const [linkedAtMap, setLinkedAtMap] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Accordion: one open at a time
  const [openClientId, setOpenClientId] = useState<string | null>(null);
  // Per-client form state
  const [forms, setForms] = useState<Record<string, FormState>>({});

  // Reviewed cards: expanded notes state
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  const currentMonthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  )
    .toISOString()
    .split('T')[0];

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;

    async function fetchData() {
      setIsLoading(true);
      setError('');
      try {
        const [dueRes, reviewedRes, linksRes] = await Promise.all([
          getMonthlyReviewQueue(userId!),
          supabase
            .from('monthly_reviews')
            .select(`
              id, client_id, review_month, goal_alignment_score,
              notes, action_taken, reviewed_at,
              client:profiles!monthly_reviews_client_id_fkey ( full_name )
            `)
            .eq('assessor_id', userId)
            .gte('review_month', currentMonthStart)
            .order('reviewed_at', { ascending: false }),
          supabase
            .from('trainer_client_links')
            .select('client_id, created_at')
            .eq('status', 'active'),
        ]);

        if (!isMounted) return;

        if (dueRes.error) throw new Error(dueRes.error);
        setDueClients(dueRes.data);

        if (reviewedRes.error) {
          console.error('Monthly reviews query:', reviewedRes.error.message);
        } else {
          type ReviewRow = {
            id: string;
            client_id: string;
            review_month: string;
            goal_alignment_score: number;
            notes: string | null;
            action_taken: ActionTaken;
            reviewed_at: string;
            client: { full_name: string } | Array<{ full_name: string }> | null;
          };
          const rows = (reviewedRes.data ?? []) as unknown as ReviewRow[];
          setReviewedClients(
            rows.map(r => ({
              id: r.id,
              client_id: r.client_id,
              client_name: Array.isArray(r.client)
                ? (r.client[0]?.full_name ?? 'Unknown')
                : (r.client?.full_name ?? 'Unknown'),
              trainer_name: null,
              goal_alignment_score: r.goal_alignment_score,
              notes: r.notes,
              action_taken: r.action_taken,
              reviewed_at: r.reviewed_at,
            })),
          );
        }

        if (!linksRes.error && linksRes.data) {
          const map = new Map<string, string>();
          for (const row of linksRes.data as Array<{ client_id: string; created_at: string }>) {
            map.set(row.client_id, row.created_at);
          }
          setLinkedAtMap(map);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load data.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [userId, currentMonthStart]);

  // ── Form helpers ─────────────────────────────────────────────────────────────

  function getForm(clientId: string): FormState {
    return (
      forms[clientId] ?? {
        score: null,
        notes: '',
        action: null,
        isSubmitting: false,
        error: '',
      }
    );
  }

  function updateForm(clientId: string, patch: Partial<FormState>) {
    setForms(prev => ({
      ...prev,
      [clientId]: { ...getForm(clientId), ...patch },
    }));
  }

  function toggleAccordion(clientId: string) {
    setOpenClientId(prev => (prev === clientId ? null : clientId));
  }

  async function handleSubmit(client: MonthlyReview) {
    const form = getForm(client.client_id);
    if (form.score === null || form.action === null || !userId) return;

    updateForm(client.client_id, { isSubmitting: true, error: '' });

    const res = await submitMonthlyReview(userId, client.client_id, {
      goal_alignment_score: form.score,
      notes: form.notes,
      action_taken: form.action,
    });

    if (!res.success) {
      updateForm(client.client_id, {
        isSubmitting: false,
        error: res.error ?? 'Failed to submit. Please try again.',
      });
      return;
    }

    // Move client from Due → Reviewed in local state
    const newReviewed: ReviewedClient = {
      id: `local-${Date.now()}`,
      client_id: client.client_id,
      client_name: client.client_name,
      trainer_name: client.trainer_name,
      goal_alignment_score: form.score,
      notes: form.notes || null,
      action_taken: form.action,
      reviewed_at: new Date().toISOString(),
    };

    setDueClients(prev => prev.filter(c => c.client_id !== client.client_id));
    setReviewedClients(prev => [newReviewed, ...prev]);
    setOpenClientId(null);
    updateForm(client.client_id, {
      score: null,
      notes: '',
      action: null,
      isSubmitting: false,
      error: '',
    });
    setTab('reviewed');
  }

  // ── Render helpers ────────────────────────────────────────────────────────────

  function renderScoreSelector(clientId: string) {
    const form = getForm(clientId);
    return (
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
          Goal Alignment Score
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
            const selected = form.score === n;
            const colors = getScoreColors(n);
            return (
              <button
                key={n}
                type="button"
                onClick={() => updateForm(clientId, { score: n })}
                className="w-9 h-9 rounded-full text-sm font-bold transition-all active:scale-95"
                style={
                  selected
                    ? {
                        backgroundColor: colors.bg,
                        color: colors.color,
                        border: `2px solid ${colors.border}`,
                      }
                    : {
                        backgroundColor: '#f9fafb',
                        color: '#9ca3af',
                        border: '2px solid #e5e7eb',
                      }
                }
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderActionSelector(clientId: string) {
    const form = getForm(clientId);
    const actions: ActionTaken[] = ['message', 'call', 'none'];
    return (
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
          Action Taken
        </p>
        <div className="flex gap-2">
          {actions.map(a => {
            const meta = ACTION_META[a];
            const selected = form.action === a;
            return (
              <button
                key={a}
                type="button"
                onClick={() => updateForm(clientId, { action: a })}
                className="flex-1 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all active:scale-95 text-center leading-tight"
                style={
                  selected
                    ? {
                        backgroundColor: meta.selectedBg,
                        color: meta.selectedText,
                        border: `1.5px solid ${meta.selectedBorder}`,
                      }
                    : {
                        backgroundColor: '#f9fafb',
                        color: '#6b7280',
                        border: '1.5px solid #e5e7eb',
                      }
                }
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderDueCard(client: MonthlyReview) {
    const isOpen = openClientId === client.client_id;
    const form = getForm(client.client_id);
    const linkedAt = linkedAtMap.get(client.client_id);
    const programWeek = linkedAt ? weeksFromDate(linkedAt) : null;
    const initials = getInitials(client.client_name);
    const canSubmit = form.score !== null && form.action !== null && !form.isSubmitting;

    return (
      <div
        key={client.client_id}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      >
        {/* Card header — always visible */}
        <button
          type="button"
          onClick={() => toggleAccordion(client.client_id)}
          className="w-full p-4 flex items-center gap-3 text-left active:bg-gray-50 transition-colors"
        >
          {/* Avatar */}
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
            style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}
          >
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{client.client_name}</p>
            {client.trainer_name && (
              <p className="text-xs text-gray-500 mt-0.5">Trainer: {client.trainer_name}</p>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {programWeek !== null && (
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: '#f0f9ff', color: '#0369a1' }}
                >
                  Week {programWeek} of program
                </span>
              )}
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#fef3c7', color: '#d97706' }}
              >
                Due this month
              </span>
            </div>
          </div>

          {/* Chevron */}
          <div style={{ color: '#9ca3af' }}>
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>

        {/* Accordion: Review form */}
        {isOpen && (
          <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
            {/* Score selector */}
            {renderScoreSelector(client.client_id)}

            {/* Notes */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                Notes
              </p>
              <textarea
                rows={3}
                placeholder="Add review notes..."
                value={form.notes}
                onChange={e => updateForm(client.client_id, { notes: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-400 focus:bg-white transition-colors resize-none"
              />
            </div>

            {/* Action selector */}
            {renderActionSelector(client.client_id)}

            {/* Submit error */}
            {form.error && (
              <div
                className="px-3 py-2 rounded-xl text-xs border"
                style={{
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  borderColor: '#fecaca',
                }}
              >
                {form.error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => handleSubmit(client)}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              style={
                canSubmit
                  ? { backgroundColor: '#0d9488', color: '#ffffff' }
                  : { backgroundColor: '#d1d5db', color: '#9ca3af', cursor: 'not-allowed' }
              }
            >
              {form.isSubmitting ? (
                <>
                  <span
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                    style={{ borderTopColor: 'transparent' }}
                  />
                  Saving…
                </>
              ) : (
                'Complete Review'
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderReviewedCard(client: ReviewedClient) {
    const initials = getInitials(client.client_name);
    const scoreColors = getScoreColors(client.goal_alignment_score);
    const badge = ACTION_BADGE[client.action_taken];
    const isExpanded = expandedNoteId === client.id;

    return (
      <div
        key={client.id}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3"
      >
        {/* Top row */}
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
            style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{client.client_name}</p>
            {client.trainer_name && (
              <p className="text-xs text-gray-500 mt-0.5">Trainer: {client.trainer_name}</p>
            )}
          </div>
        </div>

        {/* Score + action row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              backgroundColor: scoreColors.bg,
              color: scoreColors.color,
              border: `1px solid ${scoreColors.border}`,
            }}
          >
            Score: {client.goal_alignment_score}/10
          </div>
          <span
            className="px-2.5 py-1 rounded-full text-[10px] font-semibold"
            style={{ backgroundColor: badge.bg, color: badge.text }}
          >
            {badge.label}
          </span>
        </div>

        {/* Notes */}
        {client.notes && (
          <div>
            <p
              className={`text-xs text-gray-600 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}
            >
              {client.notes}
            </p>
            {client.notes.length > 100 && (
              <button
                type="button"
                onClick={() => setExpandedNoteId(prev => (prev === client.id ? null : client.id))}
                className="text-xs font-medium mt-1"
                style={{ color: '#0d9488' }}
              >
                {isExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-[10px] text-gray-400">
          Reviewed {formatDate(client.reviewed_at)}
        </p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <MobileShell className="bg-[#F2F8F7]">
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Header */}
        <ScreenHeader
          variant="sub"
          title="Monthly Reviews"
          subtitle={!isLoading && `${dueClients.length} due this month`}
          onBack={() => navigate(-1)}
          avatar={<ProfileMenu />}
        />

        {/* Filter tabs */}
        <div className="px-5 mt-4">
          <div
            className="flex rounded-xl p-1"
            style={{ backgroundColor: '#e5e7eb' }}
          >
            {(['due', 'reviewed'] as FilterTab[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={
                  tab === t
                    ? { backgroundColor: '#ffffff', color: '#0d9488', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                    : { backgroundColor: 'transparent', color: '#6b7280' }
                }
              >
                {t === 'due' ? `Due${!isLoading ? ` (${dueClients.length})` : ''}` : `Reviewed${!isLoading ? ` (${reviewedClients.length})` : ''}`}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 mt-4 space-y-3">
          {/* Global error */}
          {error && (
            <div
              className="p-3 rounded-xl text-sm border"
              style={{ backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}
            >
              {error}
            </div>
          )}

          {/* Loading skeletons */}
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3 animate-pulse"
              >
                <div className="w-11 h-11 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-2/5" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            ))}

          {/* Due tab */}
          {!isLoading && !error && tab === 'due' && (
            <>
              {dueClients.length > 0 ? (
                <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3 lg:items-start">
                  {dueClients.map(client => renderDueCard(client))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: '#dcfce7' }}
                  >
                    <ClipboardList size={28} style={{ color: '#16a34a' }} />
                  </div>
                  <p className="font-semibold text-gray-700">All clients reviewed this month 🎉</p>
                  <p className="text-xs text-gray-400 mt-1">Nothing left in the queue</p>
                </div>
              )}
            </>
          )}

          {/* Reviewed tab */}
          {!isLoading && !error && tab === 'reviewed' && (
            <>
              {reviewedClients.length > 0 ? (
                <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3 lg:items-start">
                  {reviewedClients.map(client => renderReviewedCard(client))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: '#f3f4f6' }}
                  >
                    <ClipboardList size={28} style={{ color: '#9ca3af' }} />
                  </div>
                  <p className="text-gray-500 text-sm">No reviews completed this month yet</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <AssessmentBottomNav />
    </MobileShell>
  );
}
