# WellnessConnect — Feature Status

Last audited: 2026-05-20 (Phase 7 — Program notification tap fixed (session_cancelled/session_scheduled navigation + dashboard fallback for program_assigned), ProgramNotificationItem hover state added, getLatestPendingPlan status filter expanded to active+pending_review+approved, getClientUnreadCount added (risk_alerts + notifications combined), HomeScreen badge now counts both sources + visibilitychange refetch; createWorkoutProgram upsert fixed: changes_requested added to status filter, cancelOtherPlans cleanup added to both UPDATE and INSERT paths, INSERT path now returns plan id for cleanup, field defaults hardened)
Audit method: source files read directly (not inferred from chat history)

Legend:
  ✅ Wired to Supabase — real DB calls, no mock data for core functionality
  ⏳ Mock only / Partial — hardcoded data, context mock, or only partially wired
  ❌ Not built — file does not exist or is empty / not routed

---

## Trainer App Screens

Screen                    | Route                                | Status   | Notes
--------------------------|--------------------------------------|----------|------------------------------------------------------
TrainerDashboard          | /trainer/dashboard                   | ✅        | getTrainerProfile, getTrainerClients, getTrainerRiskAlerts, getTrainerTodaySessions, getWeeklyCheckinSummary — Upcoming Load replaced with live This Week's Check-ins strip 2026-05-22
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
NotificationsScreen       | /trainer/notifications               | ✅        | Rewritten 2026-05-16 — live DB calls via getTrainerNotifications + markNotificationRead; requires notifications table in DB (SQL provided)
TrainerOnboardingFlow     | /trainer/onboarding                  | ✅        | bio + yearsOfExperience now passed in navigate state; TrainerSetupCompleteScreen reads them correctly
TrainerWelcomeScreen      | /trainer/welcome                     | ⏳        | Static landing page — no DB call needed by design
ClientProgressView        | /trainer/client-progress/:clientId   | ✅        | Built 2026-05-22 — reuses getClientProgress + new getClientCurrentProgram; 5 sections: KPI grid, 14d readiness chart, 30d metric avgs, recent check-ins, current program
DailyCheckinSummaryScreen | /trainer/daily-summary/:date         | ✅        | Built 2026-05-22 — getDailyCheckinDetail; per-client cards with readiness score, workout done, sleep/energy/mood; taps to /trainer/client-progress/:clientId

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
TrainerDetailSubScreen    | (embedded in TrainersScreen) | ✅        | Rewritten 2026-05-16 — calls getTrainerProfile on mount; avatar/bio/availability/certifications/session_count/experience_years all dynamic

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
getRecommendedTrainers    | profiles, trainer_client_links, client_profiles | READ | ✅ Added 2026-05-16
getExpertPickedTrainers   | profiles                          | READ      | ✅ Added 2026-05-16
getClientLinkStatusMap    | trainer_client_links              | READ      | ✅ Added 2026-05-16
hasInfoRequestToday       | notifications                     | READ      | ✅ Added 2026-05-16 (requires notifications table)
sendInfoRequest           | notifications                     | WRITE     | ✅ Added 2026-05-16 (requires notifications table)
sendMessage               | messages, notifications           | WRITE     | ✅ Added 2026-05-16 (requires messages + notifications tables)
getTrainerNotifications   | notifications, profiles           | READ      | ✅ Added 2026-05-16 (requires notifications table)
markNotificationRead      | notifications                     | WRITE     | ✅ Added 2026-05-16 (requires notifications table)
getUnreadNotificationCount| notifications                     | READ      | ✅ Added 2026-05-16 — returns count of unread notifications for trainer bell badge
getClientUnreadCount      | risk_alerts + notifications       | READ      | ✅ Added 2026-05-20 — combined unread count (risk_alerts + program/session notifications) for client bell badge
getClientCurrentProgram   | workout_plans, workout_templates  | READ      | ✅ Added 2026-05-22 — trainer view of client's current non-terminal program; used by ClientProgressView
getWeeklyCheckinSummary   | trainer_client_links, daily_metrics | READ    | ✅ Added 2026-05-22 — Mon–Sun check-ins for all active clients; drives dashboard week strip
getDailyCheckinDetail     | trainer_client_links, daily_metrics | READ    | ✅ Added 2026-05-22 — check-ins on a specific date for all active clients; used by DailyCheckinSummaryScreen

Total: 40 functions — all present and used by at least one screen.

---

## Alert System — How It Works

### Overview
WellnessConnect has **two separate alert/notification systems** that serve different audiences and are backed by different DB tables.

---

### System 1: Risk Alerts (`risk_alerts` table) — Client-facing

**Purpose:** Notify the client of health or behaviour risks flagged by their trainer.

**DB Table: `risk_alerts`**

| Column       | Type                                                      | Notes                                   |
|--------------|-----------------------------------------------------------|-----------------------------------------|
| id           | uuid (PK)                                                 | Auto-generated                          |
| client_id    | uuid (FK → auth.users)                                    | The client receiving the alert          |
| trainer_id   | uuid (FK → auth.users)                                    | The trainer who raised the alert        |
| alert_type   | enum: mood_drop, sleep_drop, missed_workout, hydration, general | Category of the alert          |
| message      | text                                                      | Human-readable alert text shown to client |
| severity     | enum: low, medium, high                                   | Drives UI colour (amber = medium, red = high) |
| is_read      | boolean (default false)                                   | Flipped to true when client taps or marks all read |
| created_at   | timestamptz                                               | Used to compute relative timestamps ("2h ago") |

**Who creates rows:** Trainers create them manually (e.g., from RiskMonitorScreen / RiskAlertScreen), or they could be system-generated post-MVP.

**Who reads them:**
- **Client AlertsScreen** (`/client/alerts`) — full list, sorted newest first
- **Client HomeScreen** (`/client/dashboard`) — unread count drives the bell badge in the bottom nav

**Service functions:**
- `getRiskAlerts(clientId)` — fetches all alerts for the logged-in client, ordered by `created_at DESC`
- `markAlertRead(alertId)` — sets `is_read = true` on a single row
- `getTrainerAllRiskAlerts(trainerId)` — fetches all alerts the trainer has raised (across all clients), used in RiskMonitorScreen
- `getClientDetail(clientId, trainerId)` — includes the most recent unread alert as part of trainer's client card

**When alerts appear:**
- Any time a trainer inserts a row in `risk_alerts` targeting that client's UUID
- Currently: manual insertion only (trainer triage workflow or direct SQL)
- Post-MVP: automated rules (e.g., mood_score < 3 for 2 consecutive days → auto-insert `mood_drop` alert)

**UI Behaviour (AlertsScreen):**
- Unread alerts → amber card with pulse dot + bold text
- High severity alerts (`severity = 'high'`) → amber card + "URGENT" red label + `AlertTriangle` icon
- Tap a card → marks it read immediately (optimistic update) + fires `markAlertRead` to DB
- "Mark all as read" button → marks all unread in one go
- Loading skeleton shown while fetching
- Empty state shown if no alerts exist
- Error state shown if fetch fails (network/Supabase error)

**Avatar logic (fixed 2026-05-16):**
Reads `appState.full_name` from WellnessContext, falls back to `supabaseUser.email[0]` if name not yet loaded.

---

### System 2: Notifications (`notifications` table) — Trainer-facing

**Purpose:** Notify the trainer of client actions — primarily "Request Call Back" and "Message" from the client's TrainerDetailSubScreen.

**DB Table: `notifications`**

| Column       | Type                  | Notes                                                    |
|--------------|-----------------------|----------------------------------------------------------|
| id           | uuid (PK)             | Auto-generated                                           |
| sender_id    | uuid (FK → auth.users)| The client who triggered the notification                |
| recipient_id | uuid (FK → auth.users)| The trainer being notified                               |
| type         | text                  | e.g., 'info_request', 'message'                          |
| message      | text                  | Content of the notification                              |
| is_read      | boolean (default false)| Flipped to true when trainer reads it                   |
| created_at   | timestamptz           |                                                          |

**Who creates rows:**
- `sendInfoRequest(clientId, trainerId)` — called when client taps "Request Call Back" on TrainerDetailSubScreen; includes 24hr dedup check via `hasInfoRequestToday`
- `sendMessage(senderId, recipientId, text)` — called when client sends a message via the bottom sheet modal; also inserts into `messages` table

**Who reads them:**
- **Trainer NotificationsScreen** (`/trainer/notifications`) — full list of incoming notifications

**Service functions:**
- `hasInfoRequestToday(clientId, trainerId)` — checks if a row with type='info_request' already exists today (dedup guard)
- `sendInfoRequest(clientId, trainerId)` — inserts a row with type='info_request'
- `sendMessage(senderId, recipientId, text)` — inserts into both `messages` and `notifications`
- `getTrainerNotifications(trainerId)` — fetches all notifications for the trainer, joins sender's `full_name` from profiles
- `markNotificationRead(notificationId)` — sets `is_read = true`

**Status:** Code is fully wired. DB tables (`notifications`, `messages`) must exist in Supabase. SQL was provided in chat 2026-05-16.

---

### Key Distinction

| | risk_alerts | notifications |
|---|---|---|
| Audience | Client | Trainer |
| Raised by | Trainer (or system) | Client |
| Screen | AlertsScreen + HomeScreen badge | NotificationsScreen |
| Read tracking | is_read per alert | is_read per notification |
| Auto-dedup | No | Yes — 24hr guard for info_request |

---

## Known Gaps (Do Not Fix Unless Instructed)

Gap                                              | Impact
-------------------------------------------------|------------------------------------------------------
pain_score, mobility_score, sleep_quality_score missing from daily_metrics | ✅ FIXED 2026-05-14 — columns added via migration 20260514_daily_metrics_score_columns.sql; DailyCheckInScreen can now persist these fields
client_profiles table does not exist            | ✅ FIXED 2026-05-14 — table created via migration 20260514_create_client_profiles.sql; HealthProfileScreen can now save dob, gender, height, weight, conditions
goals, focusAreas, sessionsPerWeek missing from workout_templates | ✅ FIXED 2026-05-14 — columns added via migration 20260514_workout_templates_program_columns.sql; ProgramBuilderScreen fields now persist
user_metadata.role not set during signup        | WellnessContext userRole always null; role lives in profiles table only
isAuthLoading guard missing in App.tsx          | ✅ FIXED 2026-05-14 — AppRoutes component gates route render until session hydrates
notifications + messages tables do not exist    | ⚠️ PENDING — NotificationsScreen code is complete; SQL must be run in Supabase (notifications table + messages table + RLS policies + profiles column additions: availability jsonb, experience_years integer, session_count integer). SQL was provided in chat 2026-05-16.
MealLogScreen not routed                        | Kept as manual fallback entry point (no camera); route and wire when needed
TrainerSelectionScreen                          | Deleted (was 0 bytes, no references) — rebuild from scratch when the feature is scoped
ClientProgressView not built                    | ✅ FIXED 2026-05-22 — T15 complete; route registered, screen built, wired from ClientDetailScreen
Payment screens (T17/T18)                       | Post-MVP, not started
Twilio SMS OTP                                  | Production only, dev bypass (123456) is sufficient for now
