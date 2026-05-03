import { useState } from 'react';
import SignUpScreen from '../SignUpScreen';
import HealthProfileScreen from '../HealthProfileScreen';
import AssessmentBookingScreen from '../AssessmentBookingScreen';
import AccountReadyScreen from '../AccountReadyScreen';
import HomeScreen from '../HomeScreen';
import type { WellnessAppState } from './types';

function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [appState, setAppState] = useState<WellnessAppState>({});

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
  const handleAssessmentBookingConfirm = (data: { preferred_time: string; status: 'confirmed' }) => {
    setAppState(prev => ({ ...prev, ...data }));
    setCurrentStep(4);
  };

  // ─── Step 4: Account Ready ──────────────────────────────────────────────────
  const handleGoToDashboard = (clientId: string) => {
    console.log('Navigating to Dashboard with Client ID:', clientId);
    setCurrentStep(5);
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
            readinessScore: 84,
            currentWeek: 4,
            assessmentStatus: 'pending',
            habitProgress: { done: 1, total: 7 },
            mealsLogged: 1,
            weeklyReportStatus: 'no_data',
            unReadAlertsCount: 0,
            sessions: [{
              session_id: 'mock-001',
              session_name: 'Power Yoga Flow',
              session_type: 'yoga',
              trainer_name: 'Priya Sharma',
              scheduled_at: new Date(Date.now() + 5 * 60000).toISOString(),
              duration_minutes: 45,
              status: 'upcoming',
              meeting_url: 'https://meet.example.com/session',
            }],
          }}
          onViewSession={(s) => console.log('Action Triggered: View Session', s)}
          onStartCheckIn={() => console.log('Action Triggered: Start Check-In')}
          onFindTrainer={() => console.log('Action Triggered: Find Trainer')}
          onReviewGoals={() => console.log('Action Triggered: Review Goals')}
          onTrackToday={() => console.log('Action Triggered: Track Today')}
          onTrackNutrition={() => console.log('Action Triggered: Log your Meal')}
          onProfileClick={() => console.log('Action Triggered: Profile')}
          onViewWeeklyReport={() => console.log('Action Triggered: View Report')}
        />
      )}
    </>
  );
}

export default App;
