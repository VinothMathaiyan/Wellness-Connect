import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronRight,
  ChevronLeft,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileShell from '../../../components/MobileShell';
import { useWellness } from '../../../context/WellnessContext';
import { getTrainerClients } from '../../../services/supabaseService';

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

const getInitials = (name: string) =>
  name.split(' ')
    .map((n: string) => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);

export default function MyClientsScreen() {
  const navigate = useNavigate();
  const { userId } = useWellness();

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery]   = useState('');
  const [filterRisk, setFilterRisk]     = useState<FilterRisk>('all');
  const [sortBy, setSortBy]             = useState<SortOption | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getTrainerClients(userId)
      .then((data: any[]) => {
        if (import.meta.env.DEV && (!data || data.length === 0)) {
          setClients(DEV_MOCK_CLIENTS);
          return;
        }
        const mapped = (data ?? []).map((link: any) => ({
          id: link.profile?.id ?? link.client?.id ?? '',
          name: link.profile?.full_name ?? link.client?.full_name ?? 'Unknown',
          initials: getInitials(link.profile?.full_name ?? link.client?.full_name ?? ''),
          readinessScore: 0,
          riskLevel: 'green' as const,
          lastActive: 'Recently',
          goal: 'General',
        }));
        setClients(mapped);
      })
      .catch((err: unknown) => console.error('MyClients error:', err))
      .finally(() => setIsLoading(false));
  }, [userId]);

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
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-5 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-text-primary"
            aria-label="Go back"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1">
            <h1 className="text-[18px] font-bold text-text-primary leading-tight">My Clients</h1>
            <p className="text-[12px] text-text-secondary mt-0.5">
              {clients.length} active clients
            </p>
          </div>
        </div>

        {/* Search + Filter row */}
        <div className="flex gap-2">
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
      </div>

      {/* ─── Client List ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
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
        ) : visibleClients.length === 0 ? (
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
                    <p className="text-[14px] font-bold text-text-primary leading-tight truncate">
                      {client.name}
                    </p>
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
                    <ChevronRight size={15} className="text-gray-300" />
                  </div>
                </div>
              </motion.button>
            ))}
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

    </MobileShell>
  );
}

// DEV FALLBACK — remove after real client data exists
const DEV_MOCK_CLIENTS: Client[] = [
  { id: '1', name: 'Alex Johnson',   initials: 'AJ', readinessScore: 88, riskLevel: 'green', lastActive: '1 day ago',  goal: 'Strength'      },
  { id: '2', name: 'Sarah Chen',     initials: 'SC', readinessScore: 34, riskLevel: 'red',   lastActive: '3 days ago', goal: 'Rehabilitation' },
  { id: '3', name: 'Michael Torres', initials: 'MT', readinessScore: 52, riskLevel: 'amber', lastActive: '2 days ago', goal: 'Weight Loss'    },
  { id: '4', name: 'Priya Sharma',   initials: 'PS', readinessScore: 76, riskLevel: 'green', lastActive: 'Today',      goal: 'Yoga'           },
  { id: '5', name: 'Ravi Kumar',     initials: 'RK', readinessScore: 41, riskLevel: 'amber', lastActive: '5 days ago', goal: 'Cardio'         },
  { id: '6', name: 'Ananya Bose',    initials: 'AB', readinessScore: 29, riskLevel: 'red',   lastActive: '6 days ago', goal: 'Nutrition'      },
];
