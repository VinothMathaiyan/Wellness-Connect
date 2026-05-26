import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { WellnessProvider } from '../../../context/WellnessContext';
import { useWellness } from '../../../context/WellnessContext';
import ErrorBoundary from '../../../components/ErrorBoundary';

import SignUpScreen from './SignUpScreen';
import RoleSelectionScreen from './RoleSelectionScreen';
import HealthProfileScreen from '../../client/screens/HealthProfileScreen';
import AssessmentBookingScreen from '../../client/screens/AssessmentBookingScreen';
import AccountReadyScreen from '../../client/screens/AccountReadyScreen';
import AssessmentPendingScreen from '../../client/screens/AssessmentPendingScreen';
import HomeScreen from '../../client/screens/HomeScreen';
import DailyCheckInScreen from '../../client/screens/DailyCheckInScreen';
import NutritionLogFlow from '../../client/screens/NutritionLogFlow';
import ProgressScreen from '../../client/screens/ProgressScreen';
import SessionDetailScreen from '../../client/screens/SessionDetailScreen';
import UpcomingSessionsScreen from '../../client/screens/UpcomingSessionsScreen';
import ProgramApprovalScreen from '../../client/screens/ProgramApprovalScreen';
import WeeklyReportScreen from '../../client/screens/WeeklyReportScreen';
import AlertsScreen from './AlertsScreen';
import TrainersScreen from '../../client/screens/TrainersScreen';
import ClientMessagesScreen from '../../client/screens/ClientMessagesScreen';
import ClientMessageThreadScreen from '../../client/screens/ClientMessageThreadScreen';
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
import ClientProgressView from '../../trainer/screens/ClientProgressView';
import DailyCheckinSummaryScreen from '../../trainer/screens/DailyCheckinSummaryScreen';
import TrainerMessagesScreen from '../../trainer/screens/TrainerMessagesScreen';
import TrainerMessageThreadScreen from '../../trainer/screens/TrainerMessageThreadScreen';
import AssessmentDashboardScreen from '../../assessment/screens/AssessmentDashboardScreen';
import NewClientQueueScreen from '../../assessment/screens/NewClientQueueScreen';
import ClientAssessmentFormScreen from '../../assessment/screens/ClientAssessmentFormScreen';
import TrainerApprovalQueueScreen from '../../assessment/screens/TrainerApprovalQueueScreen';
import EscalationsScreen from '../../assessment/screens/EscalationsScreen';
import MessagesScreen from '../../assessment/screens/MessagesScreen';
import MessageThreadScreen from '../../assessment/screens/MessageThreadScreen';
import MonthlyReviewQueueScreen from '../../assessment/screens/MonthlyReviewQueueScreen';
import AssessmentNotificationsScreen from '../../assessment/screens/AssessmentNotificationsScreen';
import AdminDashboardScreen from '../../admin/screens/AdminDashboardScreen';
import DevNav from '../../../components/DevNav';

function AppRoutes() {
  const { isAuthLoading, userId, userRole, isClientCleared } = useWellness();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Wait for auth to hydrate
    if (isAuthLoading) return;

    const path = location.pathname;

    // Public routes — never redirect. /admin has its own login gate and must
    // be reachable without an OTP session.
    const publicPrefixes = ['/signup', '/role-selection', '/onboarding', '/admin'];
    if (publicPrefixes.some(p => path.startsWith(p))) return;

    // Not logged in — send to signup
    if (!userId) {
      navigate('/signup', { replace: true });
      return;
    }

    // Wait for role to resolve
    if (!userRole) return;

    // Role-based path enforcement
    if (userRole === 'assessor' && !path.startsWith('/assessment')) {
      navigate('/assessment/dashboard', { replace: true });
      return;
    }
    if (userRole === 'trainer' && !path.startsWith('/trainer') && !path.startsWith('/onboarding')) {
      navigate('/trainer/dashboard', { replace: true });
      return;
    }
    if (userRole === 'client') {
      // Assessment gate — wait for the clearance lookup before deciding.
      if (isClientCleared === null) return;

      const onOnboarding = path.startsWith('/onboarding');

      if (!isClientCleared) {
        // Not yet cleared: only the pending screen and the health-profile
        // (onboarding) flow are reachable. Everything else → pending screen.
        if (path !== '/client/pending' && !onOnboarding) {
          navigate('/client/pending', { replace: true });
        }
        return;
      }

      // Cleared: keep them in the client area. The pending screen owns its own
      // redirect to the dashboard (so its "you're cleared" success can play), so
      // we don't redirect away from /client/pending here.
      if (!path.startsWith('/client') && !onOnboarding) {
        navigate('/client/dashboard', { replace: true });
        return;
      }
    }
  }, [userId, userRole, isClientCleared, isAuthLoading, location.pathname, navigate]);

  // Hold protected client routes behind a spinner until clearance resolves, so
  // gated content never flashes before the redirect to /client/pending.
  const awaitingClearance =
    userRole === 'client' &&
    isClientCleared === null &&
    location.pathname.startsWith('/client') &&
    location.pathname !== '/client/pending';

  if (isAuthLoading || awaitingClearance) {
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
      <Route path="/client/pending" element={<AssessmentPendingScreen />} />
      <Route path="/client/dashboard" element={<HomeScreen />} />
      <Route path="/client/check-in" element={<DailyCheckInScreen existingLog={null} />} />
      <Route path="/client/nutrition" element={<NutritionLogFlow />} />
      <Route path="/client/session/:sessionId" element={<SessionDetailScreen />} />
      <Route path="/client/sessions" element={<UpcomingSessionsScreen />} />
      <Route path="/client/program-approval/:planId" element={<ProgramApprovalScreen />} />
      <Route path="/client/trainers" element={<TrainersScreen />} />
      <Route path="/client/alerts" element={<AlertsScreen />} />
      <Route path="/client/progress" element={<ProgressScreen />} />
      <Route path="/client/messages" element={<ClientMessagesScreen />} />
      <Route path="/client/messages/:userId" element={<ClientMessageThreadScreen />} />
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
      <Route path="/trainer/client-progress/:clientId" element={<ClientProgressView />} />
      <Route path="/trainer/daily-summary/:date" element={<DailyCheckinSummaryScreen />} />
      <Route path="/trainer/messages" element={<TrainerMessagesScreen />} />
      <Route path="/trainer/messages/:userId" element={<TrainerMessageThreadScreen />} />
      <Route path="/assessment/dashboard" element={<AssessmentDashboardScreen />} />
      <Route path="/assessment/clients/queue" element={<NewClientQueueScreen />} />
      <Route path="/assessment/assess/:clientId" element={<ClientAssessmentFormScreen />} />
      <Route path="/assessment/trainer-approvals" element={<TrainerApprovalQueueScreen />} />
      <Route path="/assessment/escalations" element={<EscalationsScreen />} />
      <Route path="/assessment/messages" element={<MessagesScreen />} />
      <Route path="/assessment/messages/:userId" element={<MessageThreadScreen />} />
      <Route path="/assessment/monthly-reviews" element={<MonthlyReviewQueueScreen />} />
      <Route path="/assessment/notifications" element={<AssessmentNotificationsScreen />} />
      <Route path="/admin" element={<AdminDashboardScreen />} />
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
