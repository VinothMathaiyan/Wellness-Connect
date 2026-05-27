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
} from 'lucide-react';
import type { TrainerProfile, User } from '../../../types';
import TrainerDetailSubScreen from './TrainerDetailSubScreen';
import TrainerGoalApprovalScreen from './TrainerGoalApprovalScreen';
import { TrainerCard } from '../components/TrainerCard';
import TrainerRecommendationCard from '../components/TrainerRecommendationCard';
import ProfileMenu from '../../../components/ProfileMenu';

const CATEGORIES = ['All', 'Yoga', 'HIIT', 'Strength', 'Nutrition', 'Ayurveda', 'Wellness'];

import { useNavigate } from 'react-router-dom';
import { useWellness } from '../../../context/WellnessContext';
import {
  getTrainerProfiles,
  getClientActiveTrainerIds,
  getRecommendedTrainers,
  getExpertPickedTrainers,
  getAssessmentRecommendations,
} from '../../../services/supabaseService';

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


  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(false);

    Promise.all([
      getTrainerProfiles(),
      userId ? getClientActiveTrainerIds(userId) : Promise.resolve([]),
      userId ? getAssessmentRecommendations(userId) : Promise.resolve([]),
    ]).then(([profiles, activeIds, recIds]) => {
      if (cancelled) return;
      setTrainers(profiles);
      setActiveTrainerIds(activeIds);
      setAssessmentRecIds(recIds);
    }).catch(err => {
      console.error('TrainersScreen fetch:', err);
      if (!cancelled) setFetchError(true);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [userId]);

  // Fetch recommendations
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setRecsLoading(true);
    setRecsError(false);

    Promise.all([
      getRecommendedTrainers(userId),
      getExpertPickedTrainers(),
    ]).then(([recs, experts]) => {
      if (cancelled) return;
      setRecommended(recs);
      setExpertPicks(experts);
    }).catch(err => {
      console.error('TrainersScreen recommendations fetch:', err);
      if (!cancelled) setRecsError(true);
    }).finally(() => {
      if (!cancelled) setRecsLoading(false);
    });

    return () => { cancelled = true; };
  }, [userId]);


  const [activeTab,         setActiveTab]         = useState<'my' | 'discover'>('my');
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

  // Discover list: exclude trainers shown in Recommended For You
  const filteredTrainers = useMemo(() => {
    const deduped = trainers.filter(t => !recommendedIds.has(t.id));
    return deduped.filter(t => {
      const matchesSearch = t.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.specialties?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || t.specialties?.includes(selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [trainers, recommendedIds, searchQuery, selectedCategory]);

  const anyExcluded = useMemo(
    () => trainers.some(t => recommendedIds.has(t.id)),
    [trainers, recommendedIds],
  );

  // Discover split: assessment-team recommendations (ordered by display_order)
  // vs all other trainers. Recommendations respect the active search/category.
  const assessmentRecommendedTrainers = useMemo(
    () => assessmentRecIds
      .map(id => filteredTrainers.find(t => t.id === id))
      .filter((t): t is User => !!t),
    [assessmentRecIds, filteredTrainers],
  );

  const otherTrainers = useMemo(
    () => filteredTrainers.filter(t => !assessmentRecIds.includes(t.id)),
    [filteredTrainers, assessmentRecIds],
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


  return (
    <div className="max-w-md mx-auto w-full min-h-screen bg-gray-50 flex flex-col relative shadow-xl overflow-hidden">
      {/* Header */}
      <header className="pt-6 px-4 pb-2 bg-white flex flex-col z-20 shrink-0">
        <div className="flex items-center justify-between mb-4 px-2">
          <h1 className="text-[20px] font-bold text-gray-900">Trainers & Experts</h1>
          <ProfileMenu />
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100/50 p-1 rounded-xl w-full">
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
        </div>
      </header>

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
          ) : !loading && !fetchError ? (
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

              {/* Filters */}
              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                {CATEGORIES.map((cat) => (
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

              {/* List of trainers — View Profile only */}
              {filteredTrainers.length > 0 ? (
                <div className="space-y-5 pt-1">

                  {/* ── Recommended by Assessment Team ── */}
                  {assessmentRecommendedTrainers.length > 0 && (
                    <div>
                      <h2 className="text-[16px] font-bold" style={{ color: '#B45309' }}>
                        ⭐ Recommended by Assessment Team
                      </h2>
                      <p className="mb-3" style={{ fontSize: '12px', color: '#6B7280' }}>
                        Selected specifically for your health profile
                      </p>
                      <div className="space-y-3">
                        {assessmentRecommendedTrainers.map((t) => (
                          <div key={t.id} className="relative">
                            <div
                              className="absolute top-3 right-3 z-10 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm"
                              style={{ backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D' }}
                            >
                              Recommended ✓
                            </div>
                            <TrainerRecommendationCard
                              trainer={toTrainerProfile(t)}
                              onViewProfile={() => setSelectedTrainerDetail(t)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── All Trainers ── */}
                  {otherTrainers.length > 0 && (
                    <div>
                      {assessmentRecommendedTrainers.length > 0 && (
                        <>
                          <div className="border-t border-gray-200 mb-3" />
                          <h2 className="text-[16px] font-bold text-gray-900 mb-3">All Trainers</h2>
                        </>
                      )}
                      <div className="space-y-3">
                        {otherTrainers.map((t) => (
                          <TrainerRecommendationCard
                            key={t.id}
                            trainer={toTrainerProfile(t)}
                            onViewProfile={() => setSelectedTrainerDetail(t)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-gray-500 font-medium text-[14px]">No experts found matching your criteria.</p>
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
