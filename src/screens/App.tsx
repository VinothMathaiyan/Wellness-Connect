import { useState } from "react";
import SignUpScreen from "./SignUpScreen";
import HealthProfileScreen from "./HealthProfileScreen";
import AssessmentBookingScreen from "./AssessmentBookingScreen";
import AccountReadyScreen from "./AccountReadyScreen";
import HomeScreen from "./HomeScreen";
import DailyCheckInScreen from "./DailyCheckInScreen";
import NutritionLogFlow from "./NutritionLogFlow";
import ProgressScreen from "./ProgressScreen";
import SessionDetailScreen from "./SessionDetailScreen";
import WeeklyReportScreen from "./WeeklyReportScreen";
import AlertsScreen from "./AlertsScreen";
import TrainersScreen from "./TrainersScreen";
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

// Stable mock session time — computed once at module level to keep renders pure
const MOCK_SESSION_AT = new Date(Date.now() + 5 * 60000).toISOString();

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'info', message: 'Your weekly report for Week 3 is ready to view.', isRead: false, time: '2h ago', actionType: 'view_report' },
  { id: 'n2', type: 'alert', message: 'Missed your hydration goal yesterday. Let\'s catch up today!', isRead: false, time: '1d ago', actionType: 'view_tracking' },
  { id: 'n3', type: 'success', message: 'You\'ve completed 5 sessions this month! Keep it up.', isRead: true, time: '3d ago' },
];

const MOCK_TRAINERS: User[] = [
  { id: 't1', full_name: 'Priya Sharma', role: 'trainer', specialties: ['Yoga', 'Ayurveda'], city: 'Mumbai', rating: 4.9, certifications: ['RYT 500', 'Ayurvedic Nutrition'], available: true },
  { id: 't2', full_name: 'David Chen', role: 'trainer', specialties: ['Strength', 'HIIT'], city: 'Remote', rating: 4.8, certifications: ['CSCS', 'NASM'], available: false },
  { id: 't3', full_name: 'Sarah Jenkins', role: 'expert', specialties: ['Nutrition', 'Wellness'], city: 'London', rating: 5.0, certifications: ['Precision Nutrition', 'Registered Dietitian'], available: true }
];

function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [appState, setAppState] = useState<WellnessAppState>({
    notifications: MOCK_NOTIFICATIONS,
    trainers: MOCK_TRAINERS,
    connections: [{ trainer_id: 't1', status: 'active', type: 'yoga' }]
  });
  // ─── Step 8: Session Detail ─────────────────────────────────────────────────
  const [activeSession, setActiveSession] = useState<TrainingSession | null>(null);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [workoutProgress, setWorkoutProgress] = useState({ score: 0, notes: '' });

  // ─── Step 1: Sign Up ────────────────────────────────────────────────────────
  const handleSignUpSuccess = (data: Partial<WellnessAppState>) => {
    setAppState(prev => ({ ...prev, ...data }));
    setCurrentStep(2);
  };

  // ─── Step 2: Health Profile ─────────────────────────────────────────────────
  const handleHealthProfileBack = () => { setCurrentStep(1); };
  const handleHealthProfileContinue = (data: Partial<WellnessAppState>) => {
    setAppState(prev => ({ ...prev, ...data }));
    setCurrentStep(3);
  };

  // ─── Step 3: Assessment Booking ─────────────────────────────────────────────
  const handleAssessmentBookingBack = () => { setCurrentStep(2); };
  const handleAssessmentBookingConfirm = (data: AssessmentBooking) => {
    setAppState(prev => ({ ...prev, ...data, assessmentStatus: data.status ?? 'scheduled' }));
    setCurrentStep(4);
  };

  // ─── Step 4: Account Ready ──────────────────────────────────────────────────
  const handleGoToDashboard = (clientId: string) => {
    console.log('Navigating to Dashboard with Client ID:', clientId);
    setCurrentStep(5);
  };

  // ─── Step 6: Daily Check-In ────────────────────────────────────
  const handleDailyCheckInComplete = (log: DailyLog) => {
    setAppState(prev => ({
      ...prev,
      dailyLog: log,
      readinessScore: log.readiness_score ?? prev.readinessScore,
      habitProgress: { done: 5, total: 5 },
    }));
    setCurrentStep(5);
  };

  // ─── Step 7: Nutrition Log (NutritionLogFlow) ──────────────────
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

    // Build day-level nutrition delta from this save
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
    setCurrentStep(5);
  };

  // ─── Step 8: Session Complete Handler ─────────────────────────────
  const handleSessionComplete = (payload: { completedCount: number; totalCount: number; adherenceScore: number; clientNotes: string }) => {
    setWorkoutProgress({ score: payload.adherenceScore, notes: payload.clientNotes });
    setCurrentStep(5);
  };

  // ─── Step 9: Weekly Report Handler ──────────────────────────────────────────
  const handleWeeklyReportSave = (reflection: string) => {
    console.log('Saved reflection:', reflection);
    setCurrentStep(5);
  };

  // ─── Step 9: Trainers Handler ───────────────────────────────────────────────
  const handleViewTrainerProfile = (trainer: User) => {
    console.log('View Trainer Profile:', trainer.full_name);
  };

  // ─── Step 10: Alerts Handler ────────────────────────────────────────────────
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

  const handleAlertAction = (notification: Notification) => {
    console.log('Alert Action Triggered:', notification);
    if (notification.actionType === 'view_report') setCurrentStep(12);
    else if (notification.actionType === 'view_tracking') setCurrentStep(6);
  };

  return (
    <>
      {currentStep === 1 && (
        <SignUpScreen onSuccess={handleSignUpSuccess} initialData={appState} />
      )}

      {currentStep === 2 && (
        <HealthProfileScreen
          onBack={handleHealthProfileBack}
          onContinue={handleHealthProfileContinue}
          initialData={appState}
        />
      )}

      {currentStep === 3 && (
        <AssessmentBookingScreen
          onBack={handleAssessmentBookingBack}
          onConfirm={handleAssessmentBookingConfirm}
          initialData={appState}
        />
      )}

      {currentStep === 4 && (
        <AccountReadyScreen
          userData={{
            full_name: appState.full_name ?? '',
            goals_json: appState.goals ?? [],
            fitness_level: appState.fitness_level ?? '',
          }}
          onGoToDashboard={handleGoToDashboard}
        />
      )}

      {currentStep === 5 && (
        <HomeScreen
          userData={{
            full_name: appState.full_name ?? '',
            readinessScore: appState.readinessScore ?? 84,
            currentWeek: 4,
            assessmentStatus: appState.assessmentStatus ?? 'pending',
            habitProgress: appState.habitProgress ?? { done: 1, total: 5 },
            mealsLogged: appState.dailyNutrition?.mealsLogged ?? (appState.mealLogs ?? []).length,
            weeklyReportStatus: 'ready',
            weeklyReportTeaser: { sleep: '6.5h', mood: '4.2', energy: '7.5' },
            unReadAlertsCount: (appState.notifications ?? []).filter(n => !n.isRead).length,
            sessions: [{
              session_id: 'mock-001',
              session_name: 'Power Yoga Flow',
              session_type: 'yoga',
              trainer_name: 'Priya Sharma',
              scheduled_at: MOCK_SESSION_AT,
              duration_minutes: 45,
              status: 'upcoming',
              meeting_url: 'https://meet.example.com/session',
              exercises: [
                { id: 'ex1', name: 'Sun Salutation', instructions: 'Start with 5 rounds to warm up the body.', client_completed: false },
                { id: 'ex2', name: 'Warrior Sequence', instructions: 'Warrior I, II, and Reverse Warrior. Hold each for 5 breaths.', client_completed: false },
                { id: 'ex3', name: 'Downward Dog Variations', instructions: 'Include 3-legged dog and knee-to-nose transitions.', client_completed: false },
                { id: 'ex4', name: "Child's Pose / Savasana", instructions: 'Cool down and final resting pose for 5 minutes.', client_completed: false }
              ]
            }],
          }}
          dailyNutrition={appState.dailyNutrition}
          workoutProgress={workoutProgress}
          onViewSession={(s) => { setActiveSession(s); setCurrentStep(8); }}
          onStartCheckIn={() => setCurrentStep(6)}
          onFindTrainer={() => setCurrentStep(9)}
          onReviewGoals={() => console.log('Action Triggered: Review Goals')}
          onTrackToday={() => setCurrentStep(6)}
          onTrackNutrition={() => setCurrentStep(7)}
          onProfileClick={() => console.log('Action Triggered: Profile')}
          onViewWeeklyReport={() => setCurrentStep(12)}
          onViewAlerts={() => setCurrentStep(10)}
          onViewProgress={() => setCurrentStep(11)}
        />
      )}

      {currentStep === 6 && (
        <DailyCheckInScreen
          onBack={() => setCurrentStep(5)}
          onComplete={handleDailyCheckInComplete}
          existingLog={appState.dailyLog}
        />
      )}

      {currentStep === 7 && (
        <NutritionLogFlow
          onBack={() => setCurrentStep(5)}
          onComplete={handleNutritionLogComplete}
        />
      )}

      {currentStep === 8 && activeSession && (
        <SessionDetailScreen
          session={activeSession}
          onBack={() => setCurrentStep(5)}
          onCompleteSession={handleSessionComplete}
          completedExercises={completedExercises}
          onToggleExercise={(id) => {
            setCompletedExercises(prev => 
              prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
            );
          }}
          userInitials={(
            (appState.full_name ?? 'U')
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
          )}
        />
      )}

      {currentStep === 9 && (
        <TrainersScreen
          trainers={appState.trainers}
          connections={appState.connections}
          onViewProfile={handleViewTrainerProfile}
          onBack={() => setCurrentStep(5)}
          onGoHome={() => setCurrentStep(5)}
          onFindTrainer={() => setCurrentStep(9)}
          onViewProgress={() => setCurrentStep(11)}
          onViewAlerts={() => setCurrentStep(10)}
          unreadAlertsCount={(appState.notifications ?? []).filter(n => !n.isRead).length}
        />
      )}

      {currentStep === 10 && (
        <AlertsScreen
          notifications={appState.notifications ?? []}
          onMarkRead={handleMarkAlertRead}
          onMarkAllRead={handleMarkAllAlertsRead}
          onAction={handleAlertAction}
          onGoHome={() => setCurrentStep(5)}
          onFindTrainer={() => setCurrentStep(9)}
          onViewProgress={() => setCurrentStep(11)}
          onProfileClick={() => console.log('Action Triggered: Profile')}
        />
      )}

      {currentStep === 11 && (
        <ProgressScreen
          onGoHome={() => setCurrentStep(5)}
          onFindTrainer={() => setCurrentStep(9)}
          onViewAlerts={() => setCurrentStep(10)}
          onProfileClick={() => console.log('Action Triggered: Profile')}
          unreadAlertsCount={(appState.notifications ?? []).filter(n => !n.isRead).length}
        />
      )}

      {currentStep === 12 && (
        <WeeklyReportScreen
          report={{
            week_number: 4,
            start_date: "Oct 16",
            end_date: "Oct 22",
            averages: {
              readiness: 84,
              sleep_hours: 6.5,
              water_litres: 2.1,
              mood_score: 4.2,
              energy_level: 7.5,
              pain_score: 1.2,
              mobility_score: 8.5,
              steps: 8450
            },
            trends: {
              best_day: "Wed",
              consistent_metric: "Sleep",
              sleep: [{day_offset:0, value:6}, {day_offset:1, value:6.5}, {day_offset:2, value:7.5}, {day_offset:3, value:7}, {day_offset:4, value:6.5}, {day_offset:5, value:8}, {day_offset:6, value:7}],
              water: [{day_offset:0, value:2}, {day_offset:1, value:1.5}, {day_offset:2, value:2.5}, {day_offset:3, value:2.2}, {day_offset:4, value:1.8}, {day_offset:5, value:2.6}, {day_offset:6, value:2.1}],
              mood: [{day_offset:0, value:3}, {day_offset:1, value:4}, {day_offset:2, value:5}, {day_offset:3, value:4}, {day_offset:4, value:4}, {day_offset:5, value:5}, {day_offset:6, value:4}],
              energy: [{day_offset:0, value:6}, {day_offset:1, value:7}, {day_offset:2, value:8}, {day_offset:3, value:6}, {day_offset:4, value:7}, {day_offset:5, value:9}, {day_offset:6, value:8}],
              pain: [{day_offset:0, value:2}, {day_offset:1, value:1}, {day_offset:2, value:0}, {day_offset:3, value:1}, {day_offset:4, value:2}, {day_offset:5, value:0}, {day_offset:6, value:1}],
              mobility: [{day_offset:0, value:7}, {day_offset:1, value:8}, {day_offset:2, value:9}, {day_offset:3, value:8}, {day_offset:4, value:8}, {day_offset:5, value:9}, {day_offset:6, value:9}],
              steps: [{day_offset:0, value:7000}, {day_offset:1, value:8500}, {day_offset:2, value:10000}, {day_offset:3, value:8000}, {day_offset:4, value:7500}, {day_offset:5, value:12000}, {day_offset:6, value:9000}]
            },
            daily_readiness: [{score: 75}, {score: 82}, {score: 90}, {score: 85}, {score: 78}, {score: 92}, {score: 86}],
            trainer_week_note: "Great consistency this week! Your mobility is improving well. Let's keep the focus on hydration."
          }}
          onBack={() => setCurrentStep(5)}
          onSave={handleWeeklyReportSave}
        />
      )}

    </>
  );
}

export default App;
