import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, Loader2, AlertTriangle, ShieldAlert } from 'lucide-react';
import MobileShell from '../../../components/MobileShell';
import ProfileMenu from '@/components/ProfileMenu';
import ScreenHeader from '@/components/ScreenHeader';
import AssessmentBottomNav from '../components/AssessmentBottomNav';
import { useWellness } from '../../../context/WellnessContext';
import { supabase } from '../../../lib/supabaseClient';
import {
  getOpenEscalations,
  resolveEscalation,
  updateEscalationStatus,
  type Escalation,
} from '../../../services/supabaseService';

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterTab = 'open' | 'reviewing' | 'resolved';

/** Shape returned by the resolved direct query before client_name is mapped. */
type EscalationRow = Omit<Escalation, 'client_name'> & {
  client: { full_name: string } | Array<{ full_name: string }> | null;
};

interface LinkedAlertData {
  message: string;
  severity: string;
  alert_type: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SOURCE_BADGE: Record<'trainer' | 'client', { bg: string; text: string; label: string }> = {
  trainer: { bg: '#dbeafe', text: '#2563eb', label: 'TRAINER' },
  client:  { bg: '#ede9fe', text: '#7c3aed', label: 'CLIENT'  },
};

const STATUS_META: Record<
  'open' | 'reviewing' | 'resolved',
  { bg: string; text: string; label: string }
> = {
  open:      { bg: '#fee2e2', text: '#dc2626', label: 'Open'      },
  reviewing: { bg: '#fef3c7', text: '#d97706', label: 'Reviewing' },
  resolved:  { bg: '#dcfce7', text: '#16a34a', label: 'Resolved'  },
};

const SEVERITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  low:    { bg: '#f0fdf4', border: '#86efac', text: '#16a34a' },
  medium: { bg: '#fffbeb', border: '#fcd34d', text: '#d97706' },
  high:   { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' },
};
const SEVERITY_DEFAULT = { bg: '#f3f4f6', border: '#d1d5db', text: '#4b5563' };

const TABS: { value: FilterTab; label: string; activeColor: string }[] = [
  { value: 'open',      label: 'Open',      activeColor: '#dc2626' },
  { value: 'reviewing', label: 'Reviewing', activeColor: '#d97706' },
  { value: 'resolved',  label: 'Resolved',  activeColor: '#16a34a' },
];

const EMPTY_MESSAGES: Record<FilterTab, string> = {
  open:      'No open escalations',
  reviewing: 'No escalations under review',
  resolved:  'All clear — no resolved escalations yet',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysOpen(dateString: string): string {
  const days = Math.floor((Date.now() - new Date(dateString).getTime()) / 86_400_000);
  if (days === 0) return 'Opened today';
  if (days === 1) return '1 day open';
  return `${days} days open`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EscalationsScreen() {
  const navigate = useNavigate();
  const { userId } = useWellness();

  // List data
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState('');

  // UI state
  const [activeTab, setActiveTab]         = useState<FilterTab>('open');
  const [triggerFetch, setTriggerFetch]   = useState(0);

  // Accordion state
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [notes, setNotes]                 = useState('');
  const [actionTarget, setActionTarget]   = useState<'reviewing' | 'resolved' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError]     = useState('');

  // Linked alert cache — key = source_alert_id
  // undefined = not yet fetched; null = fetched, not found; LinkedAlertData = found
  const [alertCache, setAlertCache] = useState<Record<string, LinkedAlertData | null>>({});

  // ── Fetch ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!userId) return;

    const assessorId = userId;
    let isMounted = true;

    async function fetchAll() {
      setIsLoading(true);
      setError('');
      try {
        const [openRes, resolvedRes] = await Promise.all([
          getOpenEscalations(assessorId),
          supabase
            .from('escalations')
            .select(`
              id, client_id, raised_by, source_alert_id, status,
              assessor_id, resolution_notes, created_at,
              client:profiles!escalations_client_id_fkey ( full_name )
            `)
            .eq('status', 'resolved')
            .order('created_at', { ascending: false }),
        ]);

        if (!isMounted) return;

        if (openRes.error) throw new Error(openRes.error);
        if (resolvedRes.error) throw new Error(resolvedRes.error.message);

        // Map resolved rows (join → client_name)
        const resolvedRows = (resolvedRes.data ?? []) as unknown as EscalationRow[];
        const resolvedCards: Escalation[] = resolvedRows.map(row => ({
          ...row,
          client_name: Array.isArray(row.client)
            ? (row.client[0]?.full_name ?? 'Unknown')
            : (row.client?.full_name ?? 'Unknown'),
        }));

        setEscalations([...openRes.data, ...resolvedCards]);
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load escalations.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchAll();
    return () => { isMounted = false; };
  }, [userId, triggerFetch]);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const displayedList = useMemo(
    () => escalations.filter(e => e.status === activeTab),
    [escalations, activeTab],
  );

  const openCount = useMemo(
    () => escalations.filter(e => e.status === 'open').length,
    [escalations],
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleExpand = async (esc: Escalation) => {
    if (expandedId === esc.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(esc.id);
    setNotes(esc.resolution_notes ?? '');
    setActionError('');

    // Lazily fetch linked alert on first expand
    if (esc.source_alert_id && !(esc.source_alert_id in alertCache)) {
      const sourceId = esc.source_alert_id;
      const { data } = await supabase
        .from('risk_alerts')
        .select('message, severity, alert_type')
        .eq('id', sourceId)
        .maybeSingle();
      setAlertCache(prev => ({
        ...prev,
        [sourceId]: data as LinkedAlertData | null,
      }));
    }
  };

  const handleAction = async (esc: Escalation, action: 'reviewing' | 'resolved') => {
    if (action === 'resolved' && !notes.trim()) {
      setActionError('Resolution notes are required to resolve.');
      return;
    }
    setActionTarget(action);
    setActionLoading(true);
    setActionError('');
    try {
      let result: { success: boolean; error?: string };
      if (action === 'resolved') {
        // task spec: Resolve calls resolveEscalation
        result = await resolveEscalation(esc.id, notes.trim());
      } else {
        result = await updateEscalationStatus(esc.id, 'reviewing');
      }
      if (!result.success) throw new Error(result.error ?? 'Action failed.');
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
        title="Escalations"
        subtitle={
          <span style={{ color: openCount > 0 ? '#dc2626' : '#6b7280' }}>
            {isLoading ? '—' : `${openCount} open`}
          </span>
        }
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

        {/* Load error */}
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
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 animate-pulse"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-5 bg-gray-200 rounded-full w-16" />
                </div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-1" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
              </div>
            ))}
          </div>

        ) : displayedList.length > 0 ? (

          <div className="space-y-3">
            {displayedList.map(esc => {
              const isExpanded   = expandedId === esc.id;
              const statusMeta   = STATUS_META[esc.status];
              const sourceMeta   = SOURCE_BADGE[esc.raised_by];
              const linkedAlert  = esc.source_alert_id ? alertCache[esc.source_alert_id] : undefined;
              const severityColor = linkedAlert
                ? (SEVERITY_COLORS[linkedAlert.severity] ?? SEVERITY_DEFAULT)
                : SEVERITY_DEFAULT;
              const canAct = esc.status === 'open' || esc.status === 'reviewing';

              return (
                <div
                  key={esc.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  {/* ── Card header ── */}
                  <button
                    onClick={() => handleExpand(esc)}
                    className="w-full p-4 text-left active:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      {/* Left: source badge + name + days */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: sourceMeta.bg, color: sourceMeta.text }}
                          >
                            {sourceMeta.label}
                          </span>
                          {/* Linked alert chip */}
                          {esc.source_alert_id && (
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: '#fef3c7', color: '#d97706' }}
                            >
                              ⚠ Linked alert
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-gray-900 text-[15px] truncate">
                          {esc.client_name}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {daysOpen(esc.created_at)}
                        </p>
                      </div>

                      {/* Right: status badge + chevron */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
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
                    </div>
                  </button>

                  {/* ── Expanded panel ── */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 space-y-3">

                      {/* Escalation context */}
                      <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                        <p className="text-xs font-semibold text-gray-500">Escalation Context</p>
                        <p className="text-sm text-gray-700">
                          Raised by:{' '}
                          <span className="font-semibold capitalize">{esc.raised_by}</span>
                        </p>
                        <p className="text-sm text-gray-700">
                          Opened: <span className="font-semibold">{daysOpen(esc.created_at)}</span>
                        </p>
                      </div>

                      {/* Linked alert detail (fetched lazily) */}
                      {esc.source_alert_id && linkedAlert && (
                        <div
                          className="rounded-xl p-3"
                          style={{
                            backgroundColor: severityColor.bg,
                            border: `1px solid ${severityColor.border}`,
                          }}
                        >
                          <p
                            className="text-xs font-semibold mb-1 uppercase"
                            style={{ color: severityColor.text }}
                          >
                            ⚠ Linked Alert —{' '}
                            {linkedAlert.alert_type.replace(/_/g, ' ')}
                          </p>
                          <p className="text-sm text-gray-700">{linkedAlert.message}</p>
                        </div>
                      )}

                      {/* Linked alert — still loading (key exists but undefined = not yet cached) */}
                      {esc.source_alert_id && !(esc.source_alert_id in alertCache) && (
                        <div className="flex items-center gap-2 text-gray-400 text-xs">
                          <Loader2 size={12} className="animate-spin" />
                          Loading linked alert…
                        </div>
                      )}

                      {/* Resolved cards: read-only resolution notes, no buttons */}
                      {esc.status === 'resolved' && esc.resolution_notes && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs font-semibold text-gray-500 mb-1">
                            Resolution Notes
                          </p>
                          <p className="text-sm text-gray-700">{esc.resolution_notes}</p>
                        </div>
                      )}

                      {/* Action area — only for open / reviewing */}
                      {canAct && (
                        <>
                          <textarea
                            value={notes}
                            onChange={e => {
                              setNotes(e.target.value);
                              setActionError('');
                            }}
                            placeholder="Add resolution notes..."
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

                          <div className="flex gap-2">
                            {/* Mark Reviewing — shown for open escalations */}
                            {esc.status === 'open' && (
                              <button
                                onClick={() => handleAction(esc, 'reviewing')}
                                disabled={actionLoading}
                                className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                                style={{
                                  backgroundColor: actionLoading ? '#9ca3af' : '#d97706',
                                  color: '#ffffff',
                                }}
                              >
                                {actionLoading && actionTarget === 'reviewing' && (
                                  <Loader2 size={14} className="animate-spin" />
                                )}
                                Mark Reviewing
                              </button>
                            )}

                            {/* Resolve — shown for open and reviewing */}
                            <button
                              onClick={() => handleAction(esc, 'resolved')}
                              disabled={actionLoading}
                              className={`py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform ${
                                esc.status === 'open' ? 'flex-1' : 'w-full'
                              }`}
                              style={{
                                backgroundColor: actionLoading ? '#9ca3af' : '#16a34a',
                                color: '#ffffff',
                              }}
                            >
                              {actionLoading && actionTarget === 'resolved' && (
                                <Loader2 size={14} className="animate-spin" />
                              )}
                              Resolve
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
              <ShieldAlert size={22} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">{EMPTY_MESSAGES[activeTab]}</p>
          </div>
        )}

      </div>

      <AssessmentBottomNav escalationCount={openCount} alertCount={0} />
    </MobileShell>
  );
}
