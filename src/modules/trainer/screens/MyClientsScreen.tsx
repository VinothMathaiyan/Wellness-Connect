import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronRight,
  ChevronLeft,
  Users,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileShell from '../../../components/MobileShell';
import TrainerBottomNav from '../components/TrainerBottomNav';
import { useWellness } from '../../../context/WellnessContext';
import ProfileMenu from '../../../components/ProfileMenu';
import { getTrainerClients, getPendingClientRequests, updateClientLinkStatus } from '../../../services/supabaseService';
import type { TrainerClient } from '../../../services/supabaseService';
import ScreenHeader from '@/components/ScreenHeader';
import { toISODate } from '@/utils/date';

type RiskLevel = 'red' | 'amber' | 'green';
type SortOption = 'name' | 'readiness' | 'lastActive';
type FilterRisk = 'all' | RiskLevel;

interface Client {
  id: string;
  name: string;
  initials: string;
  readinessScore: number;
  riskLevel: RiskLevel;
  lastActive: string;
  goal: string;
  hasPendingCheckin: boolean;
}

const RISK_ORDER: Record<RiskLevel, number> = { red: 0, amber: 1, green: 2 };

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name',       label: 'Name'            },
  { value: 'readiness',  label: 'Readiness Score' },
  { value: 'lastActive', label: 'Last Active'      },
];

const FILTER_RISK_OPTIONS: { value: FilterRisk; label: string }[] = [
  { value: 'all',   label: 'All'   },
  { value: 'red',   label: 'Red'   },
  { value: 'amber', label: 'Amber' },
  { value: 'green', label: 'Green' },
];

function parseDaysAgo(s: string): number {
  if (s === 'Today') return 0;
  const match = s.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

const RISK_STRIPE: Record<RiskLevel, string> = {
  red:   'bg-red-500',
  amber: 'bg-amber-400',
  green: 'bg-emerald-500',
};

const RISK_INITIALS_BG: Record<RiskLevel, string> = {
  red:   'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
  green: 'bg-emerald-100 text-emerald-700',
};

const RISK_SCORE_BADGE: Record<RiskLevel, string> = {
  red:   'bg-red-100 text-red-600',
  amber: 'bg-amber-100 text-amber-700',
  green: 'bg-emerald-100 text-emerald-700',
};

const FILTER_CHIP_ACTIVE: Record<FilterRisk, string> = {
  all:   'bg-teal-500 text-white border-teal-500',
  red:   'bg-red-500 text-white border-red-500',
  amber: 'bg-amber-400 text-white border-amber-400',
  green: 'bg-emerald-500 text-white border-emerald-500',
};

// Inline style fallbacks — Tailwind JIT cannot guarantee runtime generation
// of classes that appear only inside Record maps.
const RISK_STRIPE_STYLE: Record<RiskLevel, React.CSSProperties> = {
  red:   { backgroundColor: '#ef4444' },
  amber: { backgroundColor: '#f59e0b' },
  green: { backgroundColor: '#10b981' },
};

const RISK_INITIALS_STYLE: Record<RiskLevel, React.CSSProperties> = {
  red:   { backgroundColor: '#fee2e2', color: '#b91c1c' },
  amber: { backgroundColor: '#fef3c7', color: '#92400e' },
  green: { backgroundColor: '#d1fae5', color: '#065f46' },
};

const RISK_SCORE_STYLE: Record<RiskLevel, React.CSSProperties> = {
  red:   { backgroundColor: '#fee2e2', color: '#b91c1c' },
  amber: { backgroundColor: '#fef3c7', color: '#92400e' },
  green: { backgroundColor: '#d1fae5', color: '#065f46' },
};

const FILTER_CHIP_ACTIVE_STYLE: Record<FilterRisk, React.CSSProperties> = {
  all:   { backgroundColor: '#0d9488', color: '#ffffff' },
  red:   { backgroundColor: '#ef4444', color: '#ffffff' },
  amber: { backgroundColor: '#f59e0b', color: '#ffffff' },
  green: { backgroundColor: '#10b981', color: '#ffffff' },
};

const FILTER_CHIP_INACTIVE_STYLE: React.CSSProperties = { backgroundColor: '#f3f4f6', color: '#4b5563' };

// Single initial only — first letter of full_name
const getInitials = (name: string): string =>
  name?.charAt(0).toUpperCase() ?? '?';

function readinessToRisk(score: number | null): RiskLevel {
  if (score === null) return 'green';
  if (score < 40) return 'red';
  if (score < 65) return 'amber';
  return 'green';
}

function formatLastActive(logDate: string | null): string {
  if (!logDate) return 'No data';
  const today = new Date();
  const date  = new Date(logDate);
  // Compare calendar dates only
  const todayStr = toISODate(today);
  const diff = Math.floor(
    (new Date(todayStr).getTime() - new Date(logDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  return `${diff} days ago`;
}

export default function MyClientsScreen() {
  const navigate = useNavigate();
  const { userId } = useWellness();

  const [clients, setClients]           = useState<Client[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [actioningId, setActioningId]   = useState<string | null>(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState('');
  const [searchQuery, setSearchQuery]   = useState('');
  const [filterRisk, setFilterRisk]     = useState<FilterRisk>('all');
  const [sortBy, setSortBy]             = useState<SortOption | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const loadClients = async () => {
    if (!userId) return;
    setIsLoading(true);
    setError('');
    try {
      const [data, pendingData] = await Promise.all([
        getTrainerClients(userId),
        getPendingClientRequests(userId).catch(() => []),
      ]);
      const mapped: Client[] = data.map((c) => ({
        id:                 c.id,
        name:               c.full_name,
        initials:           getInitials(c.full_name),
        readinessScore:     c.latest_readiness ?? 0,
        riskLevel:          readinessToRisk(c.latest_readiness),
        lastActive:         formatLastActive(c.last_active),
        goal:               c.city ?? 'General',
        hasPendingCheckin:  c.has_pending_checkin,
      }));
      setClients(mapped);
      setPendingRequests(pendingData);
    } catch (err: unknown) {
      console.error('MyClients error:', err);
      setError('Could not load clients.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Accept a pending request → activate the client. The DB stores the active
  // state as 'active' (the "accepted" action maps to status 'active').
  const handleAcceptRequest = async (clientId: string) => {
    if (!userId || actioningId) return;
    setActioningId(clientId);
    const ok = await updateClientLinkStatus(userId, clientId, 'active');
    if (ok) await loadClients();
    setActioningId(null);
  };

  // Decline a pending request → mark the link 'declined' and refresh.
  const handleDeclineRequest = async (clientId: string) => {
    if (!userId || actioningId) return;
    setActioningId(clientId);
    const ok = await updateClientLinkStatus(userId, clientId, 'declined');
    if (ok) await loadClients();
    setActioningId(null);
  };

  const activeFilterCount = (filterRisk !== 'all' ? 1 : 0) + (sortBy !== null ? 1 : 0);

  const visibleClients = useMemo(() => {
    let result = [...clients];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q));
    }

    if (filterRisk !== 'all') {
      result = result.filter(c => c.riskLevel === filterRisk);
    }

    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'readiness') {
      result.sort((a, b) => a.readinessScore - b.readinessScore);
    } else if (sortBy === 'lastActive') {
      result.sort((a, b) => parseDaysAgo(b.lastActive) - parseDaysAgo(a.lastActive));
    } else {
      result.sort((a, b) => RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel]);
    }

    return result;
  }, [clients, searchQuery, filterRisk, sortBy]);

  return (
    <MobileShell className="bg-[#F2F8F7]">

      {/* ─── Sticky Header ─────────────────────────────────────────────────────── */}
      <ScreenHeader
        variant="sub"
        title="My Clients"
        subtitle={
          pendingRequests.length > 0
            ? `${clients.length} active · ${pendingRequests.length} pending`
            : `${clients.length} active clients`
        }
        onBack={() => navigate(-1)}
        avatar={<ProfileMenu />}
      >
        {/* Search + Filter row */}
        <div className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search clients…"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-8 py-2.5 text-[14px] text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-300 transition-colors"
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-text-secondary hover:text-text-primary transition-colors"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setIsFilterOpen(true)}
            className={`relative px-3.5 rounded-xl border flex items-center justify-center transition-colors ${
              activeFilterCount > 0
                ? 'bg-teal-50 border-teal-200 text-teal-700'
                : 'bg-gray-50 border-gray-200 text-text-secondary'
            }`}
            aria-label="Open filters"
          >
            <SlidersHorizontal size={17} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] bg-teal-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </ScreenHeader>

      {/* ─── Client List ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  backgroundColor: '#e5e7eb',
                  borderRadius: '16px',
                  height: '72px',
                  animation: 'pulse 2s infinite',
                }}
              />
            ))}
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center gap-4"
          >
            <Users size={40} className="text-gray-300" />
            <p className="text-[15px] font-semibold text-text-primary">{error}</p>
            <button
              onClick={loadClients}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-[14px] font-semibold"
              style={{ backgroundColor: '#F0FDF4', color: '#166634', border: '1px solid #BBF7D0' }}
            >
              <RefreshCw size={15} />
              Retry
            </button>
          </motion.div>
        ) : clients.length === 0 && pendingRequests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <Users size={40} className="text-gray-300 mb-3" />
            <p className="text-[15px] font-semibold text-text-primary">No active clients yet</p>
            <p className="text-[13px] text-text-secondary mt-1">
              Clients who connect with you will appear here
            </p>
          </motion.div>
        ) : visibleClients.length === 0 && pendingRequests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <Users size={40} className="text-gray-300 mb-3" />
            <p className="text-[15px] font-semibold text-text-primary">No clients found</p>
            <p className="text-[13px] text-text-secondary mt-1">
              Try adjusting your search or filters
            </p>
          </motion.div>
        ) : (
          <div>
            {/* ─── Pending Requests ─────────────────────────────────────────────────── */}
            {pendingRequests.length > 0 && (
              <div className="mb-6">
                <h2 className="text-[13px] font-bold text-text-secondary uppercase tracking-wider mb-3 ml-1">
                  Requests ({pendingRequests.length})
                </h2>
                <div className="space-y-2">
                  {pendingRequests.map((req) => {
                    const clientName = req.client?.full_name ?? 'Unknown Client';
                    const initials = getInitials(clientName);
                    const busy = actioningId === req.client_id;
                    return (
                      <motion.div
                        key={req.client_id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                      >
                        <div className="flex items-stretch">
                          <div
                            className="w-1.5 shrink-0"
                            style={{ backgroundColor: '#f59e0b' }}
                          />
                          <div className="flex-1 flex items-center gap-3 px-3.5 py-3.5">
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
                              style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
                            >
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <p className="text-[14px] font-bold text-text-primary leading-tight truncate">
                                {clientName}
                              </p>
                              <span
                                className="inline-flex items-center self-start mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
                                style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}
                              >
                                PENDING
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Accept / Decline actions */}
                        <div className="flex gap-2 px-3.5 pb-3.5">
                          <button
                            type="button"
                            onClick={() => handleAcceptRequest(req.client_id)}
                            disabled={busy}
                            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-60 transition-colors"
                            style={{ backgroundColor: '#1D9E75' }}
                          >
                            {busy ? 'Saving…' : 'Accept'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeclineRequest(req.client_id)}
                            disabled={busy}
                            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold disabled:opacity-60 transition-colors"
                            style={{ border: '1.5px solid #EF4444', color: '#EF4444', backgroundColor: 'white' }}
                          >
                            Decline
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── Active Clients ───────────────────────────────────────────────────── */}
            {visibleClients.length > 0 && (
              <>
                <h2 className="text-[13px] font-bold text-text-secondary uppercase tracking-wider mb-3 ml-1">
                  Active Clients ({visibleClients.length})
                </h2>
                <div className="space-y-2">
                  {visibleClients.map((client, idx) => (

                    <motion.button
                      key={client.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.035 }}
                      onClick={() => navigate(`/trainer/client/${client.id}`)}
                      className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 flex items-stretch overflow-hidden text-left active:scale-[0.985] transition-transform"
                    >
                      {/* Colored risk stripe */}
                      <div
                        className={`w-1.5 shrink-0 ${RISK_STRIPE[client.riskLevel]}`}
                        style={RISK_STRIPE_STYLE[client.riskLevel]}
                      />

                      <div className="flex-1 flex items-center gap-3 px-3.5 py-3.5">
                        {/* Initials avatar */}
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${RISK_INITIALS_BG[client.riskLevel]}`}
                          style={RISK_INITIALS_STYLE[client.riskLevel]}
                        >
                          {client.initials}
                        </div>

                        {/* Name + last active */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <p className="text-[14px] font-bold text-text-primary leading-tight truncate">
                              {client.name}
                            </p>
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                              style={{ backgroundColor: '#D1FAE5', color: '#047857' }}
                            >
                              Active
                            </span>
                            {client.lastActive === 'No data' ? (
                              <span style={{
                                fontSize: 11,
                                backgroundColor: '#F3F4F6',
                                color: '#6B7280',
                                borderRadius: 999,
                                padding: '2px 8px',
                                fontWeight: 600,
                                flexShrink: 0,
                              }}>
                                No check-ins yet
                              </span>
                            ) : client.hasPendingCheckin ? (
                              <span style={{
                                fontSize: 11,
                                backgroundColor: '#FEF3C7',
                                color: '#D97706',
                                borderRadius: 999,
                                padding: '2px 8px',
                                fontWeight: 600,
                                flexShrink: 0,
                              }}>
                                Check-in pending
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[12px] text-text-secondary mt-0.5">
                            Last active {client.lastActive}
                          </p>
                        </div>

                        {/* Readiness score + chevron */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[12px] font-bold px-2.5 py-0.5 rounded-full ${RISK_SCORE_BADGE[client.riskLevel]}`}
                            style={RISK_SCORE_STYLE[client.riskLevel]}
                          >
                            {client.readinessScore}
                          </span>
                          <ChevronRight size={18} className="text-gray-300 shrink-0 ml-1" />
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ─── Filter / Sort Bottom Sheet ─────────────────────────────────────────── */}
      <AnimatePresence>
        {isFilterOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterOpen(false)}
              className="absolute inset-0 bg-black/30 z-50"
            />

            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg z-50 px-5 pt-5 pb-10"
            >
              {/* Handle bar */}
              <div className="w-9 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[16px] font-bold text-text-primary">Filter & Sort</h3>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-text-secondary"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Filter by Risk */}
              <div className="mb-6">
                <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-3">
                  Filter by Risk
                </p>
                <div className="flex gap-2 flex-wrap">
                  {FILTER_RISK_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setFilterRisk(value)}
                      className={`px-4 py-2 rounded-xl text-[13px] font-semibold border transition-colors ${
                        filterRisk === value
                          ? FILTER_CHIP_ACTIVE[value]
                          : 'bg-gray-50 text-text-secondary border-gray-200'
                      }`}
                      style={filterRisk === value ? FILTER_CHIP_ACTIVE_STYLE[value] : FILTER_CHIP_INACTIVE_STYLE}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort by */}
              <div>
                <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-3">
                  Sort by
                </p>
                <div className="flex gap-2 flex-wrap">
                  {SORT_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setSortBy(sortBy === value ? null : value)}
                      className={`px-4 py-2 rounded-xl text-[13px] font-semibold border transition-colors ${
                        sortBy === value
                          ? 'bg-teal-500 text-white border-teal-500'
                          : 'bg-gray-50 text-text-secondary border-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <TrainerBottomNav />
    </MobileShell>
  );
}

