import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { getTrainerApprovalStatus, saveWeeklyReflection, mondayOfWeek, type TrainerApprovalStatus } from '../services/supabaseService';
import type {
  WellnessAppState,
  DailyLog,
  User,
  NutritionMealEntry,
  MealLog,
  DailyNutrition,
  TrainingSession,
  AssessmentBooking,
  Notification,
} from '../types';

interface WorkoutProgress {
  score: number;
  notes: string;
}

interface WellnessContextType {
  appState: WellnessAppState;
  activeSession: TrainingSession | null;
  completedExercises: string[];
  workoutProgress: WorkoutProgress;

  // Auth state
  supabaseUser: SupabaseUser | null;
  userId: string | null;
  userRole: 'client' | 'trainer' | 'assessor' | null;
  isAuthLoading: boolean;

  // Assessment gate: null = loading, true = cleared (or non-client), false = pending review.
  isClientCleared: boolean | null;
  recheckClearance: () => Promise<void>;

  // Trainer approval gate. trainerApprovalStatus: null = no approval row yet
  // (mid-onboarding) or loading; isTrainerApprovalLoading distinguishes the two.
  trainerApprovalStatus: TrainerApprovalStatus | null;
  isTrainerApprovalLoading: boolean;
  recheckTrainerApproval: () => Promise<void>;

  setAppState: React.Dispatch<React.SetStateAction<WellnessAppState>>;
  setUserRole: React.Dispatch<React.SetStateAction<'client' | 'trainer' | 'assessor' | null>>;
  setActiveSession: React.Dispatch<React.SetStateAction<TrainingSession | null>>;
  setCompletedExercises: React.Dispatch<React.SetStateAction<string[]>>;
  setWorkoutProgress: React.Dispatch<React.SetStateAction<WorkoutProgress>>;

  handleSignUpSuccess: (data: Partial<WellnessAppState>) => void;
  handleHealthProfileContinue: (data: Partial<WellnessAppState>) => void;
  handleAssessmentBookingConfirm: (data: AssessmentBooking) => void;
  handleDailyCheckInComplete: (log: DailyLog) => void;
  handleNutritionLogComplete: (payload: { meals: NutritionMealEntry[]; totalCalories: number }) => void;
  handleSessionComplete: (payload: { completedCount: number; totalCount: number; adherenceScore: number; clientNotes: string }) => void;
  handleWeeklyReportSave: (reflection: string) => void;
  handleMarkAlertRead: (id: string) => void;
  handleMarkAllAlertsRead: () => void;
  handleToggleExercise: (id: string) => void;
  logout: () => Promise<void>;
}

const WellnessContext = createContext<WellnessContextType | undefined>(undefined);

// Stable mock session time — computed once at module level to keep renders pure


const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'info', message: 'Your weekly report for Week 3 is ready to view.', isRead: false, time: '2h ago', actionType: 'view_report' },
  { id: 'n2', type: 'alert', message: 'Missed your hydration goal yesterday. Let\'s catch up today!', isRead: false, time: '1d ago', actionType: 'view_tracking' },
  { id: 'n3', type: 'success', message: 'You\'ve completed 5 sessions this month! Keep it up.', isRead: true, time: '3d ago' },
];

const MOCK_TRAINERS: User[] = [
  { id: 't1', full_name: 'Priya Sharma', role: 'trainer', specialties: ['Yoga', 'Ayurveda'], city: 'Mumbai', rating: 4.9, certifications: ['RYT 500', 'Ayurvedic Nutrition'], available: true },
  { id: 't2', full_name: 'David Chen', role: 'trainer', specialties: ['Strength', 'HIIT'], city: 'Remote', rating: 4.8, certifications: ['CSCS', 'NASM'], available: false },
  { id: 't3', full_name: 'Sarah Jenkins', role: 'trainer', specialties: ['Nutrition', 'Wellness'], city: 'London', rating: 5.0, certifications: ['Precision Nutrition', 'Registered Dietitian'], available: true }
];

export const WellnessProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appState, setAppState] = useState<WellnessAppState>({
    notifications: MOCK_NOTIFICATIONS,
    trainers: MOCK_TRAINERS,
    connections: [{ trainer_id: 't1', status: 'active', type: 'yoga' }]
  });

  const [activeSession, setActiveSession] = useState<TrainingSession | null>(null);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [workoutProgress, setWorkoutProgress] = useState<WorkoutProgress>({ score: 0, notes: '' });

  // Auth state
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'client' | 'trainer' | 'assessor' | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Assessment gate clearance — see isClientCleared in the context type.
  const [isClientCleared, setIsClientCleared] = useState<boolean | null>(null);

  // Trainer approval gate — see trainerApprovalStatus in the context type.
  const [trainerApprovalStatus, setTrainerApprovalStatus] = useState<TrainerApprovalStatus | null>(null);
  const [isTrainerApprovalLoading, setIsTrainerApprovalLoading] = useState(true);

  useEffect(() => {
    // Resolve the role: prefer user_metadata.role (fast, no network), but fall
    // back to the profiles table when it's empty — user_metadata.role is not
    // written at signup (known gap), so without this fallback the role is lost
    // on a hard refresh and role-based route guards can't enforce.
    const resolveRole = async (
      user: SupabaseUser,
    ): Promise<'client' | 'trainer' | 'assessor' | null> => {
      const metaRole = user.user_metadata?.role as
        | 'client'
        | 'trainer'
        | 'assessor'
        | undefined;
      if (metaRole) return metaRole;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      return (profile?.role as 'client' | 'trainer' | 'assessor' | null) ?? null;
    };

    // Initial session restore.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        if (session?.user) {
          setSupabaseUser(session.user);
          setUserId(session.user.id);
          setUserRole(await resolveRole(session.user));
        }
      } catch (err) {
        console.error('WellnessContext session restore:', err);
      } finally {
        setIsAuthLoading(false);
      }
    });

    // Subsequent auth events (sign-in, sign-out, token refresh).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const user = session.user;
        setSupabaseUser(user);
        setUserId(user.id);
        // Defer the role lookup — awaiting another Supabase call directly
        // inside the auth callback can deadlock.
        setTimeout(() => {
          void resolveRole(user)
            .then(setUserRole)
            .catch(err => console.error('WellnessContext auth change:', err));
        }, 0);
      } else {
        setSupabaseUser(null);
        setUserId(null);
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Assessment gate clearance ───────────────────────────────────────────────
  // A client is "cleared" once the assessment team sets clearance_status to
  // 'cleared' or 'conditional'. Trainers / assessors are always treated as
  // cleared. A client with no assessment row yet is treated as not cleared.
  const fetchClearance = async (
    uid: string,
    role: 'client' | 'trainer' | 'assessor',
  ): Promise<boolean> => {
    if (role !== 'client') return true;
    const { data } = await supabase
      .from('assessments')
      .select('clearance_status')
      .eq('client_id', uid)
      .maybeSingle();
    return data?.clearance_status === 'cleared' || data?.clearance_status === 'conditional';
  };

  useEffect(() => {
    let cancelled = false;
    // Reset to loading whenever the signed-in user / role changes.
    setIsClientCleared(null);

    if (!userId || !userRole) return;

    fetchClearance(userId, userRole)
      .then(cleared => { if (!cancelled) setIsClientCleared(cleared); })
      .catch(err => {
        console.error('WellnessContext clearance check:', err);
        // Fail closed for clients so an unverified account isn't let through.
        if (!cancelled) setIsClientCleared(userRole !== 'client');
      });

    return () => { cancelled = true; };
  }, [userId, userRole]);

  // Re-run the clearance lookup on demand (e.g. the pending screen's poll or
  // "Check status" tap, or when an assessment_complete notification arrives).
  const recheckClearance = async (): Promise<void> => {
    if (!userId || !userRole) return;
    try {
      const cleared = await fetchClearance(userId, userRole);
      setIsClientCleared(cleared);
    } catch (err) {
      console.error('WellnessContext recheckClearance:', err);
    }
  };

  // ── Trainer approval gate ───────────────────────────────────────────────────
  // Mirrors the clearance gate: fetch on user/role change; expose a poll-friendly
  // recheck so the pending screen can keep the guard in sync after approval.
  useEffect(() => {
    let cancelled = false;
    setTrainerApprovalStatus(null);

    if (!userId || !userRole) return;
    if (userRole !== 'trainer') {
      setIsTrainerApprovalLoading(false);
      return;
    }

    setIsTrainerApprovalLoading(true);
    getTrainerApprovalStatus(userId)
      .then(({ status }) => { if (!cancelled) setTrainerApprovalStatus(status); })
      .catch(err => console.error('WellnessContext trainer approval:', err))
      .finally(() => { if (!cancelled) setIsTrainerApprovalLoading(false); });

    return () => { cancelled = true; };
  }, [userId, userRole]);

  const recheckTrainerApproval = async (): Promise<void> => {
    if (!userId || userRole !== 'trainer') return;
    try {
      const { status } = await getTrainerApprovalStatus(userId);
      setTrainerApprovalStatus(status);
    } catch (err) {
      console.error('WellnessContext recheckTrainerApproval:', err);
    }
  };

  const handleSignUpSuccess = (data: Partial<WellnessAppState>) => {
    setAppState(prev => ({ ...prev, ...data }));
  };

  const handleHealthProfileContinue = (data: Partial<WellnessAppState>) => {
    setAppState(prev => ({ ...prev, ...data }));
  };

  const handleAssessmentBookingConfirm = (data: AssessmentBooking) => {
    setAppState(prev => ({ ...prev, ...data, assessmentStatus: data.status ?? 'scheduled' }));
  };

  const handleDailyCheckInComplete = (log: DailyLog) => {
    setAppState(prev => ({
      ...prev,
      dailyLog: log,
      readinessScore: log.readiness_score ?? prev.readinessScore,
      habitProgress: { done: 5, total: 5 },
    }));
  };

  const handleNutritionLogComplete = (payload: { meals: NutritionMealEntry[]; totalCalories: number }) => {
    const newLogs: MealLog[] = payload.meals
      .filter(m => m.items.length > 0)
      .map(m => ({
        meal_type: (['breakfast', 'lunch', 'dinner', 'snack'].includes(m.type.toLowerCase())
          ? m.type.toLowerCase()
          : 'snack') as MealLog['meal_type'],
        description: m.items.map(i => i.name).join(', '),
        total_calories: m.items.reduce((s, i) => s + i.calories, 0),
        macros_json: {
          protein_g: m.items.reduce((s, i) => s + i.protein, 0),
          carbs_g: m.items.reduce((s, i) => s + i.carbs, 0),
          fat_g: m.items.reduce((s, i) => s + i.fat, 0),
        },
        logged_at: new Date().toISOString(),
      }));

    const delta: DailyNutrition = newLogs.reduce(
      (acc, log) => ({
        calories:    acc.calories    + log.total_calories,
        protein_g:   acc.protein_g   + log.macros_json.protein_g,
        carbs_g:     acc.carbs_g     + log.macros_json.carbs_g,
        fat_g:       acc.fat_g       + log.macros_json.fat_g,
        mealsLogged: acc.mealsLogged + 1,
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, mealsLogged: 0 }
    );

    setAppState(prev => {
      const prev_dn = prev.dailyNutrition ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, mealsLogged: 0 };
      return {
        ...prev,
        mealLogs: [...(prev.mealLogs ?? []), ...newLogs],
        dailyNutrition: {
          calories:    prev_dn.calories    + delta.calories,
          protein_g:   prev_dn.protein_g   + delta.protein_g,
          carbs_g:     prev_dn.carbs_g     + delta.carbs_g,
          fat_g:       prev_dn.fat_g       + delta.fat_g,
          mealsLogged: prev_dn.mealsLogged + delta.mealsLogged,
        },
      };
    });
  };

  const handleSessionComplete = (payload: { completedCount: number; totalCount: number; adherenceScore: number; clientNotes: string }) => {
    setWorkoutProgress({ score: payload.adherenceScore, notes: payload.clientNotes });
  };

  const handleWeeklyReportSave = async (reflection: string) => {
    if (!userId) return;
    try {
      await saveWeeklyReflection(userId, mondayOfWeek(), reflection);
    } catch (err) {
      console.error('handleWeeklyReportSave:', err);
    }
  };

  const handleMarkAlertRead = (id: string) => {
    setAppState(prev => ({
      ...prev,
      notifications: (prev.notifications ?? []).map(n => 
        n.id === id ? { ...n, isRead: true } : n
      )
    }));
  };

  const handleMarkAllAlertsRead = () => {
    setAppState(prev => ({
      ...prev,
      notifications: (prev.notifications ?? []).map(n => ({ ...n, isRead: true }))
    }));
  };

  const handleToggleExercise = (id: string) => {
    setCompletedExercises(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  /**
   * Signs the user out of Supabase and resets all local context state.
   * Navigation after logout is handled by the calling component so it can
   * use navigate(..., { replace: true }) to clear browser history.
   *
   * Note: onAuthStateChange already clears userId / userRole / supabaseUser
   * when a SIGNED_OUT event fires, but we also explicitly reset the rest of
   * the app state so stale data does not persist for the next session.
   */
  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
    setAppState({
      notifications: MOCK_NOTIFICATIONS,
      trainers: MOCK_TRAINERS,
      connections: [{ trainer_id: 't1', status: 'active', type: 'yoga' }],
    });
    setActiveSession(null);
    setCompletedExercises([]);
    setWorkoutProgress({ score: 0, notes: '' });
  };

  return (
    <WellnessContext.Provider
      value={{
        appState,
        activeSession,
        completedExercises,
        workoutProgress,
        supabaseUser,
        userId,
        userRole,
        isAuthLoading,
        isClientCleared,
        recheckClearance,
        trainerApprovalStatus,
        isTrainerApprovalLoading,
        recheckTrainerApproval,
        setAppState,
        setUserRole,
        setActiveSession,
        setCompletedExercises,
        setWorkoutProgress,
        handleSignUpSuccess,
        handleHealthProfileContinue,
        handleAssessmentBookingConfirm,
        handleDailyCheckInComplete,
        handleNutritionLogComplete,
        handleSessionComplete,
        handleWeeklyReportSave,
        handleMarkAlertRead,
        handleMarkAllAlertsRead,
        handleToggleExercise,
        logout,
      }}
    >
      {children}
    </WellnessContext.Provider>
  );
};

export const useWellness = () => {
  const context = useContext(WellnessContext);
  if (context === undefined) {
    throw new Error('useWellness must be used within a WellnessProvider');
  }
  return context;
};
