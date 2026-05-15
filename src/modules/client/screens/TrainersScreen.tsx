/**
 * Performance Strategy:
 * - Used React.memo on TrainerCard and ActiveTrainerCard to prevent unnecessary re-renders.
 * - Used local state for tab navigation to keep component self-contained and fast.
 * - Used framer-motion AnimatePresence with 'wait' to ensure smooth 60fps transitions between tabs.
 * - Optimized category filtering to only compute on active search/category changes.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Search,
    Filter,
    AlertCircle,
    Users,
    Home,
    BarChart3,
    Bell
} from 'lucide-react';
import type { User } from '../../../types';
import TrainerDetailSubScreen from './TrainerDetailSubScreen';
import TrainerGoalApprovalScreen from './TrainerGoalApprovalScreen';
import { TrainerCard } from '../components/TrainerCard';



const CATEGORIES = ['All', 'Yoga', 'HIIT', 'Strength', 'Nutrition', 'Ayurveda', 'Wellness'];



import { useNavigate } from 'react-router-dom';
import { useWellness } from '../../../context/WellnessContext';
import { getTrainerProfiles, getClientActiveTrainerIds } from '../../../services/supabaseService';

export default function TrainersScreen() {
  const navigate = useNavigate();
  const { appState, userId } = useWellness();
  const unreadAlertsCount = (appState.notifications ?? []).filter(n => !n.isRead).length;

  // ── Live Supabase state ──────────────────────────────────────────────────────
  const [trainers,          setTrainers]          = useState<User[]>([]);
  const [activeTrainerIds,  setActiveTrainerIds]  = useState<string[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [fetchError,        setFetchError]        = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(false);

    Promise.all([
      getTrainerProfiles(),
      userId ? getClientActiveTrainerIds(userId) : Promise.resolve([]),
    ]).then(([profiles, activeIds]) => {
      if (cancelled) return;
      setTrainers(profiles);
      setActiveTrainerIds(activeIds);
    }).catch(err => {
      console.error('TrainersScreen fetch:', err);
      if (!cancelled) setFetchError(true);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [userId]);

  const [activeTab, setActiveTab] = useState<'my' | 'discover'>('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Sub-screen states
  const [selectedTrainerDetail, setSelectedTrainerDetail] = useState<User | null>(null);
  const [showGoalApproval, setShowGoalApproval] = useState(false);

  // Split trainers: active connection vs discover list
  const activeConnections = useMemo(
    () => trainers.filter(t => activeTrainerIds.includes(t.id)),
    [trainers, activeTrainerIds],
  );

  const filteredTrainers = useMemo(() => {
    return trainers.filter(t => {
      const matchesSearch = t.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.specialties?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || t.specialties?.includes(selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [trainers, searchQuery, selectedCategory]);

    const handleViewPlan = useCallback((trainer: User) => {
        setSelectedTrainerDetail(trainer);
        setShowGoalApproval(true);
    }, []);

    return (
        <div className="max-w-md mx-auto w-full min-h-screen bg-gray-50 flex flex-col relative shadow-xl overflow-hidden">
            {/* Header */}
            <header className="pt-6 px-4 pb-2 bg-white flex flex-col z-20 shrink-0">
                <h1 className="text-[20px] font-bold text-gray-900 mb-4 px-2">Trainers & Experts</h1>
                
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
                                            onSecondaryAction={() => alert('Messaging coming soon')}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-6 flex flex-col items-center justify-center pt-8">
                                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 w-full shadow-sm">
                                        <div className="bg-amber-100 p-2 rounded-xl text-amber-600 shrink-0">
                                            <AlertCircle size={20} />
                                        </div>
                                        <div className="flex-1 mt-0.5">
                                            <p className="text-[14px] font-bold text-amber-900">Matching in progress</p>
                                            <p className="text-[12px] text-amber-700/80 mt-1 leading-relaxed">
                                                Our team is carefully selecting the perfect trainer based on your goals. You'll be notified soon.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
                                        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                                            <Users size={32} className="text-gray-400" />
                                        </div>
                                        <p className="text-[15px] font-bold text-gray-600">No assigned trainer yet</p>
                                    </div>
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

                            {/* List */}
                            <div className="space-y-3 pt-1">
                                {filteredTrainers.length > 0 ? (
                                    filteredTrainers.map((t) => (
                                        <TrainerCard 
                                            key={t.id} 
                                            trainer={t} 
                                            isActive={false}
                                            onPrimaryAction={() => setSelectedTrainerDetail(t)} 
                                            onSecondaryAction={() => alert('Request Info coming soon')}
                                        />
                                    ))
                                ) : (
                                    <div className="py-12 text-center">
                                        <p className="text-gray-500 font-medium text-[14px]">No experts found matching your criteria.</p>
                                    </div>
                                )}
                            </div>
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
                <NavButton label="Home" icon={Home} onClick={() => navigate('/client/dashboard')} />
                <NavButton label="Trainers" icon={Users} active={true} onClick={() => navigate('/client/trainers')} />
                <NavButton label="Progress" icon={BarChart3} onClick={() => navigate('/client/progress')} />
                <NavButton label="Alerts" icon={Bell} badgeContent={unreadAlertsCount} onClick={() => navigate('/client/alerts')} />
            </nav>
        </div>
    );
}

// Reused NavButton from HomeScreen UI source of truth
const NavButton = ({ label, icon: Icon, active = false, onClick, badgeContent }: { label: string; icon: any; active?: boolean; onClick?: () => void; badgeContent?: number }) => (
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
