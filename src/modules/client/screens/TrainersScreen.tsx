/**
 * Performance Strategy:
 * - Used React.memo on TrainerCard and ActiveTrainerCard to prevent unnecessary re-renders.
 * - Used local state for tab navigation to keep component self-contained and fast.
 * - Used framer-motion AnimatePresence with 'wait' to ensure smooth 60fps transitions between tabs.
 * - Optimized category filtering to only compute on active search/category changes.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
// useCallback kept: used by handleViewPlan
import { motion, AnimatePresence } from 'motion/react';
import {
    Search,
    Filter,
    AlertCircle,
    Users,
    Home,
    BarChart3,
    MessageSquare,
    Bell,
    MapPin,
    Clock,
} from 'lucide-react';
import type { TrainerProfile, User } from '../../../types';
import TrainerDetailSubScreen from './TrainerDetailSubScreen';
import TrainerGoalApprovalScreen from './TrainerGoalApprovalScreen';
import { TrainerCard } from '../components/TrainerCard';
import TrainerRecommendationCard from '../components/TrainerRecommendationCard';
import ProfileMenu from '../../../components/ProfileMenu';
import ScreenHeader from '@/components/ScreenHeader';

import { useNavigate } from 'react-router-dom';
import { useWellness } from '../../../context/WellnessContext';
import {
  getTrainerProfiles,
  getClientActiveTrainerIds,
  getRecommendedTrainers,
  getExpertPickedTrainers,
  getAssessmentRecommendations,
  getClientRecommendations,
  getClientPendingTrainerLinks,
  getTrainerCategories,
} from '../../../services/supabaseService';
import type { ClientRecommendation } from '../../../services/supabaseService';

export default function TrainersScreen() {
  const navigate = useNavigate();
  const { appState, userId } = useWellness();
  const unreadAlertsCount = (appState.notifications ?? []).filter(n => !n.isRead).length;

  // ── Live Supabase state ──────────────────────────────────────────────────────
  const [trainers,         setTrainers]         = useState<User[]>([]);
  const [activeTrainerIds, setActiveTrainerIds] = useState<string[]>([]);
  const [assessmentRecIds, setAssessmentRecIds] = useState<string[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [fetchError,       setFetchError]       = useState(false);

  // ── Recommendation state (My Trainer tab — unassigned view) ─────────────────
  const [recommended, setRecommended] = useState<TrainerProfile[]>([]);
  const [expertPicks, setExpertPicks] = useState<TrainerProfile[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError,   setRecsError]   = useState(false);

  // ── Engine + manual recommendations (Discover tab) ──────────────────────────
  const [engineRecs, setEngineRecs] = useState<ClientRecommendation[]>([]);
  const [manualRecs, setManualRecs] = useState<{ trainer_id: string; trainer: TrainerProfile }[]>([]);

  // ── Requested tab state ─────────────────────────────────────────────────────
  const [pendingLinks, setPendingLinks] = useState<{ trainer_id: string; trainer_name: string; created_at: string }[]>([]);

  // ── Category filter pills (Discover tab) — derived from live trainer data ────
  const [categories, setCategories] = useState<string[]>([]);


  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(false);

    Promise.all([
      getTrainerProfiles(),
      userId ? getClientActiveTrainerIds(userId) : Promise.resolve([]),
      userId ? getAssessmentRecommendations(userId) : Promise.resolve([]),
      userId ? getClientPendingTrainerLinks(userId) : Promise.resolve([]),
      getTrainerCategories(),
    ]).then(([profiles, activeIds, recIds, pending, cats]) => {
      if (cancelled) return;
      setTrainers(profiles);
      setActiveTrainerIds(activeIds);
      setAssessmentRecIds(recIds);
      setPendingLinks(pending);
      setCategories(cats);
    }).catch(err => {
      console.error('TrainersScreen fetch:', err);
      if (!cancelled) setFetchError(true);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [userId]);

  // Fetch recommendations (My Trainer + Discover)
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setRecsLoading(true);
    setRecsError(false);

    Promise.all([
      getRecommendedTrainers(userId),
      getExpertPickedTrainers(),
      getClientRecommendations(userId),
    ]).then(([recs, experts, clientRecs]) => {
      if (cancelled) return;
      setRecommended(recs);
      setExpertPicks(experts);
      setEngineRecs(clientRecs.engineRecs);
      setManualRecs(clientRecs.manualRecs);
    }).catch(err => {
      console.error('TrainersScreen recommendations fetch:', err);
      if (!cancelled) setRecsError(true);
    }).finally(() => {
      if (!cancelled) setRecsLoading(false);
    });

    return () => { cancelled = true; };
  }, [userId]);


  const [activeTab,         setActiveTab]         = useState<'my' | 'discover' | 'requested'>('my');
  const [searchQuery,       setSearchQuery]       = useState('');
  const [selectedCategory,  setSelectedCategory]  = useState('All');

  // Sub-screen states
  const [selectedTrainerDetail, setSelectedTrainerDetail] = useState<User | null>(null);
  const [showGoalApproval,      setShowGoalApproval]      = useState(false);

  // Split trainers: active connection vs discover list
  const activeConnections = useMemo(
    () => trainers.filter(t => activeTrainerIds.includes(t.id)),
    [trainers, activeTrainerIds],
  );

  // Recommended IDs set for deduplication
  const recommendedIds = useMemo(
    () => new Set(recommended.map(t => t.id)),
    [recommended],
  );

  // Engine + manual rec IDs for deduplication in Discover "All Trainers"
  const engineRecIds = useMemo(() => new Set(engineRecs.map(r => r.trainer_id)), [engineRecs]);
  const manualRecIds = useMemo(() => new Set(manualRecs.map(r => r.trainer_id)), [manualRecs]);

  // Discover list: exclude trainers shown in Recommended For You (My Trainer tab)
  const filteredTrainers = useMemo(() => {
    const deduped = trainers.filter(t => !recommendedIds.has(t.id));
    return deduped.filter(t => {
      const matchesSearch = t.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.specialties?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || t.specialties?.includes(selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [trainers, recommendedIds, searchQuery, selectedCategory]);

  // "All Trainers" in Discover: exclude engine + manual rec trainers + assessment recs
  const allOtherTrainers = useMemo(
    () => filteredTrainers.filter(t =>
      !engineRecIds.has(t.id) && !manualRecIds.has(t.id) && !assessmentRecIds.includes(t.id),
    ),
    [filteredTrainers, engineRecIds, manualRecIds, assessmentRecIds],
  );

  const anyExcluded = useMemo(
    () => trainers.some(t => recommendedIds.has(t.id)),
    [trainers, recommendedIds],
  );

  const toTrainerProfile = (t: User): TrainerProfile => ({
    id:               t.id,
    full_name:        t.full_name,
    city:             t.city ?? null,
    specialties:      t.specialties ?? null,
    certifications:   t.certifications ?? null,
    bio:              t.bio ?? null,
    availability:     null,
    experience_years: null,
    session_count:    t.sessionCount != null ? Number(t.sessionCount) : null,
    rating:           t.rating ?? null,
    avatar_url:       null,
    photo_url:        t.photo_url ?? null,
  });

  const handleViewPlan = useCallback((trainer: User) => {
    setSelectedTrainerDetail(trainer);
    setShowGoalApproval(true);
  }, []);

  // Format "3 days ago" for Requested tab
  const timeAgo = (isoDate: string) => {
    const diff = Date.now() - new Date(isoDate).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };


  return (
    <div className="max-w-md mx-auto w-full min-h-screen bg-gray-50 flex flex-col relative shadow-xl overflow-hidden">
      <ScreenHeader
        variant="sub"
        title="Trainers & Experts"
        onBack={() => navigate(-1)}
        avatar={<ProfileMenu />}
      >
        {/* Tabs — 3 tabs */}
        <div className="mt-4 flex bg-gray-100/50 p-1 rounded-xl w-full">
          <button
            onClick={() => setActiveTab('my')}
            className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition-all relative ${activeTab === 'my' ? 'text-[#1D9E75] bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            My Trainer
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition-all relative ${activeTab === 'discover' ? 'text-[#1D9E75] bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Discover
          </button>
          <button
            onClick={() => setActiveTab('requested')}
            className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition-all relative ${activeTab === 'requested' ? 'text-[#1D9E75] bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Requested
            {pendingLinks.length > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: '#F59E0B', color: '#ffffff' }}
              >
                {pendingLinks.length}
              </span>
            )}
          </button>
        </div>
      </ScreenHeader>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pb-24 relative">

        {/* Loading skeleton */}
        {loading && (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && fetchError && (
          <div className="p-4 pt-8 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle size={26} className="text-red-400" />
            </div>
            <p className="text-[14px] font-semibold text-gray-700">Couldn't load trainers</p>
            <p className="text-[12px] text-gray-400">Check your connection and try again.</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ════════════════ MY TRAINER TAB ════════════════ */}
          {!loading && !fetchError && activeTab === 'my' ? (
            <motion.div
              key="my-trainer"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="p-4 space-y-6"
            >
              {activeConnections.length > 0 ? (
                <div className="space-y-6">
                  {activeConnections.map(assignedTrainer => (
                    <TrainerCard
                      key={assignedTrainer.id}
                      trainer={assignedTrainer}
                      isActive={true}
                      onPrimaryAction={() => handleViewPlan(assignedTrainer)}
                      onSecondaryAction={() => navigate(`/client/messages/${assignedTrainer.id}`)}
                    />
                  ))}
                </div>
              ) : (
                /* ── Recommendation UI — no trainer assigned yet ── */
                <div className="space-y-6">

                  {/* Loading skeleton for recommendations */}
                  {recsLoading && (
                    <div className="space-y-3">
                      {[1, 2].map(i => (
                        <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 animate-pulse">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-14 h-14 rounded-full bg-gray-200 shrink-0" />
                            <div className="flex-1 space-y-2">
                              <div className="h-3 bg-gray-200 rounded w-1/2" />
                              <div className="h-3 bg-gray-200 rounded w-3/4" />
                            </div>
                          </div>
                          <div className="h-10 bg-gray-100 rounded-xl" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fetch error */}
                  {!recsLoading && recsError && (
                    <div className="flex flex-col items-center text-center gap-2 py-6">
                      <AlertCircle size={22} color="#F87171" />
                      <p className="text-[13px] text-gray-500">Couldn't load recommendations. Check your connection.</p>
                    </div>
                  )}

                  {!recsLoading && !recsError && (
                    <>
                      {/* ── Section A: Recommended For You ───────── */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <h2 className="text-[16px] font-bold text-gray-900">Recommended For You</h2>
                          <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: '#F0FDF4', color: '#166534' }}
                          >
                            Based on your goals &amp; location
                          </span>
                        </div>

                        {recommended.length > 0 ? (
                          <div className="space-y-3">
                            {recommended.map(trainer => (
                              <TrainerRecommendationCard
                                key={trainer.id}
                                trainer={trainer}
                                onViewProfile={() => {
                                  setSelectedTrainerDetail({
                                    id: trainer.id,
                                    full_name: trainer.full_name,
                                    role: 'trainer',
                                    city: trainer.city ?? undefined,
                                    specialties: trainer.specialties ?? [],
                                    rating: trainer.rating ?? undefined,
                                    photo_url: trainer.photo_url ?? null,
                                    bio: trainer.bio ?? undefined,
                                  });
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="bg-white rounded-2xl p-6 flex flex-col items-center text-center shadow-sm" style={{ border: '1px solid #F3F4F6' }}>
                            <MapPin size={28} color="#9CA3AF" className="mb-2" />
                            <p className="text-[14px] font-semibold text-gray-700 mb-1">No nearby matches yet</p>
                            <p className="text-[12px] text-gray-400 mb-4">Explore trainers in the Discover tab</p>
                            <button
                              onClick={() => setActiveTab('discover')}
                              className="font-semibold rounded-xl px-5 transition-colors"
                              style={{
                                minHeight: '44px',
                                backgroundColor: '#F0FDF4',
                                color: '#166534',
                                fontSize: '14px',
                                border: '1px solid #BBF7D0',
                              }}
                            >
                              Browse Trainers
                            </button>
                          </div>
                        )}
                      </div>

                      {/* ── Section B: Selected By Wellness Experts ─ */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-[16px] font-bold text-gray-900">Selected By Wellness Experts</h2>
                          <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                            style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}
                          >
                            Expert Pick
                          </span>
                        </div>
                        <p
                          className="mb-3"
                          style={{ fontSize: '12px', color: '#6B7280' }}
                        >
                          Recommended by our assessment team based on your health profile
                        </p>
                        <div className="space-y-3">
                          {expertPicks.map(trainer => (
                            <TrainerRecommendationCard
                              key={trainer.id}
                              trainer={trainer}
                              onViewProfile={() => {
                                setActiveTab('discover');
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </motion.div>

          /* ════════════════ DISCOVER TAB ════════════════ */
          ) : !loading && !fetchError && activeTab === 'discover' ? (
            <motion.div
              key="discover"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="p-4 space-y-5"
            >
              {/* Search */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search experts..."
                    className="w-full h-12 bg-white border border-gray-200 rounded-xl pl-10 pr-4 text-[14px] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition-all text-gray-900 placeholder:text-gray-400 font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button className="w-12 h-12 rounded-xl border border-gray-200 text-gray-500 bg-white flex items-center justify-center active:bg-gray-50 transition-colors shadow-sm">
                  <Filter size={20} />
                </button>
              </div>

              {/* Filters — "All" always first, real categories from live data after */}
              <div className="flex flex-wrap gap-2 pb-2">
                {['All', ...categories].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all shadow-sm ${
                      selectedCategory === cat
                        ? 'bg-[#1D9E75] text-white border-transparent'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    } border`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Dedupe notice */}
              {anyExcluded && (
                <p style={{ fontSize: '12px', color: '#9CA3AF' }}>
                  Personalized picks are shown in the My Trainer tab
                </p>
              )}

              {/* ── Empty state: no recommendations at all ── */}
              {manualRecs.length === 0 && engineRecs.length === 0 && !recsLoading && (
                <div
                  className="rounded-2xl p-4 flex items-start gap-3"
                  style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}
                >
                  <span className="text-xl leading-none mt-0.5">💡</span>
                  <div className="flex-1">
                    <p className="text-[13px] font-bold" style={{ color: '#92400E' }}>
                      Complete your assessment to get personalised trainer recommendations
                    </p>
                    <p className="text-[12px] mt-1" style={{ color: '#B45309' }}>
                      Our team will match you with the best trainers based on your health profile and goals.
                    </p>
                  </div>
                </div>
              )}

              {/* ── SECTION 1: Recommended by Care Team ── */}
              {manualRecs.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-[16px] font-bold" style={{ color: '#B45309' }}>
                      ⭐ Recommended by Care Team
                    </h2>
                  </div>
                  <p className="mb-3" style={{ fontSize: '12px', color: '#6B7280' }}>
                    Selected specifically for your health profile by our assessment team
                  </p>
                  <div className="space-y-3">
                    {manualRecs.map((rec) => (
                      <div key={rec.trainer_id} className="relative">
                        <div
                          className="absolute top-3 right-3 z-10 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm"
                          style={{ backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D' }}
                        >
                          Recommended by Care Team ✓
                        </div>
                        <TrainerRecommendationCard
                          trainer={rec.trainer}
                          onViewProfile={() => {
                            const u = trainers.find(t => t.id === rec.trainer_id);
                            if (u) setSelectedTrainerDetail(u);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SECTION 2: Recommended For You (Engine) ── */}
              {engineRecs.length > 0 && (
                <div>
                  {manualRecs.length > 0 && <div className="border-t border-gray-200 mb-3" />}
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-[16px] font-bold" style={{ color: '#0D9488' }}>
                      🎯 Recommended For You
                    </h2>
                  </div>
                  <p className="mb-3" style={{ fontSize: '12px', color: '#6B7280' }}>
                    Matched based on your goals, preferences and health profile
                  </p>
                  <div className="space-y-3">
                    {engineRecs.map((rec) => (
                      <div key={rec.trainer_id} className="relative">
                        {/* Match score pill */}
                        <div
                          className="absolute top-3 right-3 z-10 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm"
                          style={{ backgroundColor: '#F0FDFA', color: '#0D9488', border: '1px solid #5EEAD4' }}
                        >
                          {rec.score}% match
                        </div>
                        <TrainerRecommendationCard
                          trainer={rec.trainer}
                          onViewProfile={() => {
                            const u = trainers.find(t => t.id === rec.trainer_id);
                            if (u) setSelectedTrainerDetail(u);
                          }}
                        />
                        {/* Reason tags */}
                        {rec.reasons.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 px-4 -mt-2 pb-3">
                            {rec.reasons.map((reason, i) => (
                              <span
                                key={i}
                                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
                              >
                                {reason}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SECTION 3: All Trainers ── */}
              {allOtherTrainers.length > 0 && (
                <div>
                  {(manualRecs.length > 0 || engineRecs.length > 0) && (
                    <div className="border-t border-gray-200 mb-3" />
                  )}
                  <h2 className="text-[16px] font-bold text-gray-900 mb-3">All Trainers</h2>
                  <div className="space-y-3">
                    {allOtherTrainers.map((t) => (
                      <TrainerRecommendationCard
                        key={t.id}
                        trainer={toTrainerProfile(t)}
                        onViewProfile={() => setSelectedTrainerDetail(t)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* No results for search/filter */}
              {filteredTrainers.length === 0 && manualRecs.length === 0 && engineRecs.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-gray-500 font-medium text-[14px]">No experts found matching your criteria.</p>
                </div>
              )}
            </motion.div>

          /* ════════════════ REQUESTED TAB ════════════════ */
          ) : !loading && !fetchError && activeTab === 'requested' ? (
            <motion.div
              key="requested"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="p-4 space-y-3"
            >
              {pendingLinks.length > 0 ? (
                <>
                  <p style={{ fontSize: '12px', color: '#6B7280' }}>
                    Trainers you've requested — awaiting their response
                  </p>
                  {pendingLinks.map((link) => (
                    <div
                      key={link.trainer_id}
                      className="bg-white rounded-2xl p-4 shadow-sm"
                      style={{ border: '1px solid #F3F4F6' }}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar placeholder */}
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-bold text-[16px]"
                          style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}
                        >
                          {link.trainer_name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900 truncate" style={{ fontSize: '15px' }}>
                              {link.trainer_name}
                            </p>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                              style={{ backgroundColor: '#FEF3C7', color: '#D97706', border: '1px solid #FCD34D' }}
                            >
                              Pending ✓
                            </span>
                          </div>
                          <p className="text-[12px] text-gray-500 mt-0.5">
                            Request sent — awaiting trainer response
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <Clock size={11} color="#9CA3AF" />
                            <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                              {timeAgo(link.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="py-12 flex flex-col items-center text-center gap-3">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#F3F4F6' }}
                  >
                    <Users size={24} color="#9CA3AF" />
                  </div>
                  <p className="text-[14px] font-semibold text-gray-700">No pending requests</p>
                  <p className="text-[12px] text-gray-400">
                    When you request a trainer, it will appear here until they respond.
                  </p>
                  <button
                    onClick={() => setActiveTab('discover')}
                    className="font-semibold rounded-xl px-5 mt-2 transition-colors"
                    style={{
                      minHeight: '44px',
                      backgroundColor: '#F0FDF4',
                      color: '#166534',
                      fontSize: '14px',
                      border: '1px solid #BBF7D0',
                    }}
                  >
                    Discover Trainers
                  </button>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {selectedTrainerDetail && !showGoalApproval && (
          <TrainerDetailSubScreen
            trainer={selectedTrainerDetail}
            onBack={() => setSelectedTrainerDetail(null)}
          />
        )}
        {selectedTrainerDetail && showGoalApproval && (
          <TrainerGoalApprovalScreen
            clientId={selectedTrainerDetail.id}
            onBack={() => setShowGoalApproval(false)}
            onDone={() => {
              setShowGoalApproval(false);
              setSelectedTrainerDetail(null);
              setActiveTab('my');
              ((t) => console.log(t))(selectedTrainerDetail);
            }}
          />
        )}
      </AnimatePresence>

      {/* BOTTOM NAVIGATION BAR */}
      <nav className="absolute bottom-0 left-0 right-0 h-[56px] bg-white border-t-[0.5px] border-[#E5E7EB] flex items-center justify-around px-[10px] z-[50]">
        <NavButton label="Home"     icon={Home}     onClick={() => navigate('/client/dashboard')} />
        <NavButton label="Trainers" icon={Users}    active={true} onClick={() => navigate('/client/trainers')} />
        <NavButton label="Progress" icon={BarChart3} onClick={() => navigate('/client/progress')} />
        <NavButton label="Messages" icon={MessageSquare} onClick={() => navigate('/client/messages')} />
        <NavButton label="Alerts"   icon={Bell}     badgeContent={unreadAlertsCount} onClick={() => navigate('/client/alerts')} />
      </nav>
    </div>
  );
}

// Reused NavButton from HomeScreen UI source of truth
const NavButton = ({ label, icon: Icon, active = false, onClick, badgeContent }: { label: string; icon: React.ElementType; active?: boolean; onClick?: () => void; badgeContent?: number }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center gap-[2px] transition-all"
  >
    <div className="relative">
      <Icon size={20} strokeWidth={active ? 2.5 : 2} color={active ? '#1D9E75' : '#6B7280'} />
      {badgeContent && badgeContent > 0 && (
        <div className="absolute -top-[1.5px] -right-[1.5px] w-[6px] h-[6px] bg-[#E24B4A] rounded-full" />
      )}
    </div>
    <span className={`text-[10px] font-medium ${active ? 'text-[#1D9E75]' : 'text-[#6B7280]'}`}>{label}</span>
  </button>
);
