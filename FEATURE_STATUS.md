# WellnessConnect — Feature Status

Last audited: 2026-05-14 (Phase 5 client screens wired — HomeScreen, TrainersScreen, SessionDetailScreen, AlertsScreen; DB migrations run — daily_metrics score columns, client_profiles table, workout_templates program columns)
Audit method: source files read directly (not inferred from chat history)

Legend:
  ✅ Wired to Supabase — real DB calls, no mock data for core functionality
  ⏳ Mock only / Partial — hardcoded data, context mock, or only partially wired
  ❌ Not built — file does not exist or is empty / not routed

---

## Trainer App Screens

Screen                    | Route                                | Status   | Notes
--------------------------|--------------------------------------|----------|------------------------------------------------------
TrainerDashboard          | /trainer/dashboard                   | ✅        | getTrainerProfile, getTrainerClients, getTrainerRiskAlerts, getTrainerTodaySessions
MyClientsScreen           | /trainer/clients                     | ✅        | getTrainerClients, getPendingClientRequests
ClientDetailScreen        | /trainer/client/:clientId            | ✅        | getClientDetail, getClientCheckins
AcceptDeclineScreen       | /trainer/client-request/:clientId    | ✅        | getPendingClientRequests, updateClientLinkStatus
CheckinReviewScreen       | /trainer/checkin-review/:clientId    | ✅        | getClientCheckins
SessionLogScreen          | /trainer/session-log/:clientId       | ✅        | insertSessionLog — wired 2026-05-14
ProgramBuilderScreen      | /trainer/program-builder/:clientId   | ✅        | getClientDetail, createWorkoutProgram — wired 2026-05-14
WeeklyPlanScreen          | /trainer/weekly-plan/:clientId       | ✅        | getClientDetail, updatePlanTrainerNote — wired 2026-05-14
RiskMonitorScreen         | /trainer/risk-monitor                | ✅        | getTrainerAllRiskAlerts — wired 2026-05-14
RiskAlertScreen           | /trainer/risk-alert/:clientId        | ✅        | getTrainerAllRiskAlerts, markAlertRead — wired 2026-05-14
ScheduleSessionScreen     | /trainer/schedule-session/:clientId  | ✅        | getTrainerClients, scheduleSession — wired 2026-05-14
TrainerSetupCompleteScreen| /trainer/setup-complete              | ✅        | saveTrainerOnboarding → profiles table
NotificationsScreen       | /trainer/notifications               | ⏳        | Nav targets resolve real UUIDs; notification content is mock — no notifications table in DB
TrainerOnboardingFlow     | /trainer/onboarding                  | ⏳        | UI only — data saved by TrainerSetupCompleteScreen on completion
TrainerWelcomeScreen      | /trainer/welcome                     | ⏳        | Static landing page — no DB call needed by design
ClientProgressView        | /trainer/client-progress/:clientId   | ❌        | Not built, not routed in App.tsx

---

## Client App Screens

Screen                    | Route                        | Status   | Notes
--------------------------|------------------------------|----------|------------------------------------------------------
DailyCheckInScreen        | /client/check-in             | ✅        | upsertDailyMetrics (daily_metrics upsert) — wired 2026-05-14
NutritionLogFlow          | /client/nutrition            | ✅        | insertMealLog (meal_logs insert) — wired 2026-05-14
ProgressScreen            | /client/progress             | ✅        | getWeeklyLogs via useProgressData hook — wired 2026-05-14; weight/adherence mock (no table)
WeeklyReportScreen        | /client/report/:weekId       | ✅        | getWeeklyLogs drives averages + heatmap — wired 2026-05-14; trends/pain/mobility/steps mock (no DB columns)
HealthProfileScreen       | /onboarding/profile          | ✅        | Partial — updates profiles (city + goals); full health data pending client_profiles migration
TrainerGoalApprovalScreen | (embedded in TrainersScreen) | ✅        | fetchTrainingProgram, submitProgramApproval
HomeScreen                | /client/dashboard            | ✅        | readinessScore ← daily_metrics (getClientReadiness); todaySession ← workout_plans (getClientTodaySession) — wired 2026-05-14; other fields still context mock
TrainersScreen            | /client/trainers             | ✅        | getTrainerProfiles (profiles) + getClientActiveTrainerIds (trainer_client_links) — wired 2026-05-14
SessionDetailScreen       | /client/session/:sessionId   | ✅        | getClientSession (workout_plans) — wired 2026-05-14; context activeSession used when available, DB fetch on refresh/direct URL; exercises[] empty (planned_exercises post-MVP)
AlertsScreen              | /client/alerts               | ✅        | getRiskAlerts (risk_alerts) + markAlertRead on tap/mark-all — wired 2026-05-14; no new service function needed
AssessmentBookingScreen   | /onboarding/assessment       | ⏳        | Mock only — no bookings table in DB
AccountReadyScreen        | /onboarding/ready            | ⏳        | Static screen — no DB write needed by design
MealLogScreen             | (not routed)                 | ⏳        | Mock only — kept as manual fallback log path (no camera); wire to insertMealLog when needed
TrainerDetailSubScreen    | (embedded in TrainersScreen) | ⏳        | Mock only — no Supabase calls

---

## supabaseService.ts Functions

Function                  | Table(s)                          | Direction | Status
--------------------------|-----------------------------------|-----------|--------
getUserProfile            | profiles                          | READ      | ✅
getWeeklyLogs             | daily_metrics                     | READ      | ✅
fetchTrainingProgram      | workout_plans, workout_templates  | READ      | ✅
submitProgramApproval     | workout_plans                     | WRITE     | ✅
getRiskAlerts             | risk_alerts                       | READ      | ✅
markAlertRead             | risk_alerts                       | WRITE     | ✅
getTrainerClients         | trainer_client_links, profiles    | READ      | ✅
addTrainerFeedback        | trainer_feedback                  | WRITE     | ✅
getClientDetail           | profiles, daily_metrics, risk_alerts, workout_plans | READ | ✅
getClientCheckins         | daily_metrics                     | READ      | ✅
updateClientLinkStatus    | trainer_client_links              | WRITE     | ✅
getPendingClientRequests  | trainer_client_links, profiles    | READ      | ✅
getTrainerAllRiskAlerts   | risk_alerts, profiles             | READ      | ✅
insertSessionLog          | workout_logs                      | WRITE     | ✅
scheduleSession           | workout_plans                     | WRITE     | ✅
createWorkoutProgram      | workout_templates, workout_plans  | WRITE     | ✅
updatePlanTrainerNote     | workout_plans                     | WRITE     | ✅
getTrainerProfile         | profiles                          | READ      | ✅
getTrainerRiskAlerts      | risk_alerts, profiles             | READ      | ✅
getTrainerTodaySessions   | workout_plans, profiles, workout_templates | READ | ✅
upsertDailyMetrics        | daily_metrics                     | WRITE     | ✅ Added 2026-05-14
insertMealLog             | meal_logs                         | WRITE     | ✅ Added 2026-05-14
getClientReadiness        | daily_metrics                     | READ      | ✅ Added 2026-05-14
getClientTodaySession     | workout_plans, workout_templates  | READ      | ✅ Added 2026-05-14
getTrainerProfiles        | profiles                          | READ      | ✅ Added 2026-05-14
getClientActiveTrainerIds | trainer_client_links              | READ      | ✅ Added 2026-05-14
getClientSession          | workout_plans, workout_templates  | READ      | ✅ Added 2026-05-14

Total: 27 functions — all present and used by at least one screen.

---

## Known Gaps (Do Not Fix Unless Instructed)

Gap                                              | Impact
-------------------------------------------------|------------------------------------------------------
pain_score, mobility_score, sleep_quality_score missing from daily_metrics | ✅ FIXED 2026-05-14 — columns added via migration 20260514_daily_metrics_score_columns.sql; DailyCheckInScreen can now persist these fields
client_profiles table does not exist            | ✅ FIXED 2026-05-14 — table created via migration 20260514_create_client_profiles.sql; HealthProfileScreen can now save dob, gender, height, weight, conditions
goals, focusAreas, sessionsPerWeek missing from workout_templates | ✅ FIXED 2026-05-14 — columns added via migration 20260514_workout_templates_program_columns.sql; ProgramBuilderScreen fields now persist
user_metadata.role not set during signup        | WellnessContext userRole always null; role lives in profiles table only
isAuthLoading guard missing in App.tsx          | ✅ FIXED 2026-05-14 — AppRoutes component gates route render until session hydrates
notifications table does not exist              | NotificationsScreen content permanently mock until table is created
MealLogScreen not routed                        | Kept as manual fallback entry point (no camera); route and wire when needed
TrainerSelectionScreen                          | Deleted (was 0 bytes, no references) — rebuild from scratch when the feature is scoped
ClientProgressView not built                    | Route /trainer/client-progress/:clientId not in App.tsx
Payment screens (T17/T18)                       | Post-MVP, not started
Twilio SMS OTP                                  | Production only, dev bypass (123456) is sufficient for now
