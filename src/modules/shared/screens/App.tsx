import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WellnessProvider } from '../../../context/WellnessContext';
import { useWellness } from '../../../context/WellnessContext';
import ErrorBoundary from '../../../components/ErrorBoundary';

import SignUpScreen from './SignUpScreen';
import RoleSelectionScreen from './RoleSelectionScreen';
import HealthProfileScreen from '../../client/screens/HealthProfileScreen';
import AssessmentBookingScreen from '../../client/screens/AssessmentBookingScreen';
import AccountReadyScreen from '../../client/screens/AccountReadyScreen';
import HomeScreen from '../../client/screens/HomeScreen';
import DailyCheckInScreen from '../../client/screens/DailyCheckInScreen';
import NutritionLogFlow from '../../client/screens/NutritionLogFlow';
import ProgressScreen from '../../client/screens/ProgressScreen';
import SessionDetailScreen from '../../client/screens/SessionDetailScreen';
import WeeklyReportScreen from '../../client/screens/WeeklyReportScreen';
import AlertsScreen from './AlertsScreen';
import TrainersScreen from '../../client/screens/TrainersScreen';
import TrainerDashboard from '../../trainer/screens/TrainerDashboard';
import TrainerOnboardingFlow from '../../trainer/screens/onboarding/TrainerOnboardingFlow';
import TrainerWelcomeScreen from '../../trainer/screens/TrainerWelcomeScreen';
import TrainerSetupCompleteScreen from '../../trainer/screens/TrainerSetupCompleteScreen';
import MyClientsScreen from '../../trainer/screens/MyClientsScreen';
import ClientDetailScreen from '../../trainer/screens/ClientDetailScreen';
import AcceptDeclineScreen from '../../trainer/screens/AcceptDeclineScreen';
import SessionLogScreen from '../../trainer/screens/SessionLogScreen';
import CheckinReviewScreen from '../../trainer/screens/CheckinReviewScreen';
import ProgramBuilderScreen from '../../trainer/screens/ProgramBuilderScreen';
import WeeklyPlanScreen from '../../trainer/screens/WeeklyPlanScreen';
import RiskMonitorScreen from '../../trainer/screens/RiskMonitorScreen';
import RiskAlertScreen from '../../trainer/screens/RiskAlertScreen';
import NotificationsScreen from '../../trainer/screens/NotificationsScreen';
import ScheduleSessionScreen from '../../trainer/screens/ScheduleSessionScreen';
import DevNav from '../../../components/DevNav';

function AppRoutes() {
  const { isAuthLoading } = useWellness();

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/signup" element={<SignUpScreen />} />
      <Route path="/role-selection" element={<RoleSelectionScreen />} />
      <Route path="/onboarding/profile" element={<HealthProfileScreen />} />
      <Route path="/onboarding/assessment" element={<AssessmentBookingScreen />} />
      <Route path="/onboarding/ready" element={<AccountReadyScreen />} />
      <Route path="/client/dashboard" element={<HomeScreen />} />
      <Route path="/client/check-in" element={<DailyCheckInScreen existingLog={null} />} />
      <Route path="/client/nutrition" element={<NutritionLogFlow />} />
      <Route path="/client/session/:sessionId" element={<SessionDetailScreen />} />
      <Route path="/client/trainers" element={<TrainersScreen />} />
      <Route path="/client/alerts" element={<AlertsScreen />} />
      <Route path="/client/progress" element={<ProgressScreen />} />
      <Route path="/client/report/:weekId" element={<WeeklyReportScreen />} />
      <Route path="/trainer/welcome" element={<TrainerWelcomeScreen />} />
      <Route path="/trainer/onboarding" element={<TrainerOnboardingFlow />} />
      <Route path="/trainer/setup-complete" element={<TrainerSetupCompleteScreen />} />
      <Route path="/trainer/dashboard" element={<TrainerDashboard />} />
      <Route path="/trainer/clients" element={<MyClientsScreen />} />
      <Route path="/trainer/client/:clientId" element={<ClientDetailScreen />} />
      <Route path="/trainer/client-request/:clientId" element={<AcceptDeclineScreen />} />
      <Route path="/trainer/session-log/:clientId" element={<SessionLogScreen />} />
      <Route path="/trainer/checkin-review/:clientId" element={<CheckinReviewScreen />} />
      <Route path="/trainer/program-builder/:clientId" element={<ProgramBuilderScreen />} />
      <Route path="/trainer/weekly-plan/:clientId" element={<WeeklyPlanScreen />} />
      <Route path="/trainer/risk-monitor" element={<RiskMonitorScreen />} />
      <Route path="/trainer/risk-alert/:clientId" element={<RiskAlertScreen />} />
      <Route path="/trainer/notifications" element={<NotificationsScreen />} />
      <Route path="/trainer/schedule-session" element={<ScheduleSessionScreen />} />
      <Route path="/trainer/schedule-session/:clientId" element={<ScheduleSessionScreen />} />
      <Route path="*" element={<Navigate to="/signup" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <WellnessProvider>
        <BrowserRouter>
          {import.meta.env.DEV && <DevNav />}
          <div style={{ paddingTop: import.meta.env.DEV ? '36px' : '0' }}>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </div>
        </BrowserRouter>
      </WellnessProvider>
    </ErrorBoundary>
  );
}

export default App;
