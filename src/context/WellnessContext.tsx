import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
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
  userRole: 'client' | 'trainer' | null;
  isAuthLoading: boolean;

  setAppState: React.Dispatch<React.SetStateAction<WellnessAppState>>;
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
  const [userRole, setUserRole] = useState<'client' | 'trainer' | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        setUserId(session.user.id);
        const role = session.user.user_metadata?.role as 'client' | 'trainer' | undefined;
        setUserRole(role ?? null);
      }
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        setUserId(session.user.id);
        const role = session.user.user_metadata?.role as 'client' | 'trainer' | undefined;
        setUserRole(role ?? null);
      } else {
        setSupabaseUser(null);
        setUserId(null);
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const handleWeeklyReportSave = (reflection: string) => {
    console.log('Saved reflection:', reflection);
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
        setAppState,
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
        handleToggleExercise
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
