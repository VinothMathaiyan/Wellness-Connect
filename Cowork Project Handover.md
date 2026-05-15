WellnessConnect — Cowork Project Handover

What Is This Project
WellnessConnect is a modular wellness platform built with React 19, TypeScript, Vite, Tailwind CSS, and Supabase. It has two apps — a Client App and a Trainer Command Center — sharing one Supabase backend.

Files Cowork Must Read First
Before asking me to do anything, read these files from the repo:

File                    | What it covers
------------------------|---------------------------------------------------------------
CLAUDE.md               | Module structure, naming rules, forbidden actions, routing rules
MASTER_RULES.md         | Global rules for all AI agents on this project
FEATURE_STATUS.md       | What's done, in progress, and pending
TRAINER_UX_STANDARDS.md | Trainer app design philosophy — data density, triage hierarchy
CLIENT_UX_STANDARDS.md  | Client app design philosophy — calm, minimal, supportive
DESIGN_SYSTEM.md        | Shared UI tokens — border radius, shadows, buttons, icons

Tech Stack Rules (Non-Negotiable)

Routing: React Router v7 — useNavigate(), useParams(), useLocation() from react-router-dom. Never React Native Navigation.
State: WellnessContext only. No Redux, Zustand, MobX, or Recoil.
Database: Supabase only. async/await. Typed responses. Relative imports (e.g. ../../../lib/supabaseClient) — @/ alias may not resolve.
Tailwind dynamic colors: Never className={`bg-${color}-500`}. Always add style={{ backgroundColor: '#hex' }} fallback.
TypeScript: No any. Reuse types from src/types/index.ts. No duplicate types.
All DB functions go in src/services/supabaseService.ts.


Module Structure
src/
  modules/
    client/screens/
    trainer/screens/
    shared/screens/
  services/
    supabaseService.ts     ← all DB functions here
  types/
    index.ts               ← single source of truth for types
  lib/
    supabaseClient.ts

Supabase Project

URL: https://uixomxtprmievgzznbpz.supabase.co
Tables: profiles, daily_metrics, meal_logs, trainer_client_links, workout_templates, planned_exercises, workout_plans, workout_logs, exercise_sets, risk_alerts, trainer_feedback

Test users:
ID              | Name           | Role
----------------|----------------|------------------
4b3d3f45-...    | VinothTest      | trainer
11111111-...    | Alex Johnson    | client
22222222-...    | Sarah Chen      | client
33333333-...    | Michael Torres  | client (pending)

Sarah Chen has seeded data: daily_metrics (readiness=34), risk_alert (general/high), workout_plan (12-Week Rehabilitation Foundation).
Dev auth bypass: Phone = any 10 digits → OTP = 123456


What Has Been Built
Last audited: 2026-05-14 (source files read directly — not inferred from chat history)

Trainer App

Screen                  | Route                                | Supabase Status
------------------------|--------------------------------------|--------------------------------------------------
TrainerDashboard        | /trainer/dashboard                   | ✅ Live — getTrainerProfile, getTrainerClients, getTrainerRiskAlerts, getTrainerTodaySessions
MyClientsScreen         | /trainer/clients                     | ✅ Live — getTrainerClients, getPendingClientRequests
ClientDetailScreen      | /trainer/client/:clientId            | ✅ Live — getClientDetail, getClientCheckins
AcceptDeclineScreen     | /trainer/client-request/:clientId    | ✅ Live — getPendingClientRequests, updateClientLinkStatus
CheckinReviewScreen     | /trainer/checkin-review/:clientId    | ✅ Live — getClientCheckins
SessionLogScreen        | /trainer/session-log/:clientId       | ✅ Live — insertSessionLog
ProgramBuilderScreen    | /trainer/program-builder/:clientId   | ✅ Live — getClientDetail, createWorkoutProgram
WeeklyPlanScreen        | /trainer/weekly-plan/:clientId       | ✅ Live — getClientDetail, updatePlanTrainerNote
RiskMonitorScreen       | /trainer/risk-monitor                | ✅ Live — getTrainerAllRiskAlerts
RiskAlertScreen         | /trainer/risk-alert/:clientId        | ✅ Live — getTrainerAllRiskAlerts, markAlertRead
ScheduleSessionScreen   | /trainer/schedule-session/:clientId  | ✅ Live — getTrainerClients, scheduleSession
TrainerSetupCompleteScreen | /trainer/setup-complete           | ✅ Live — saveTrainerOnboarding → profiles table
NotificationsScreen     | /trainer/notifications               | ⏳ Partial — nav targets resolve real UUIDs via getTrainerClients + getPendingClientRequests; notification content is mock (no notifications table in DB)
TrainerOnboardingFlow   | /trainer/onboarding                  | ⏳ UI only — collects data; persisted by TrainerSetupCompleteScreen
TrainerWelcomeScreen    | /trainer/welcome                     | ⏳ Static landing — no DB call needed by design
ClientProgressView      | /trainer/client-progress/:clientId   | ❌ Not built, not routed

Client App

Screen                  | Route                      | Supabase Status
------------------------|----------------------------|--------------------------------------------------
DailyCheckInScreen      | /client/check-in           | ✅ Live — upsertDailyMetrics (daily_metrics upsert)
NutritionLogFlow        | /client/nutrition          | ✅ Live — insertMealLog (meal_logs insert)
ProgressScreen          | /client/progress           | ✅ Live (via useProgressData hook) — getWeeklyLogs; weight/adherence remain mock (no table)
WeeklyReportScreen      | /client/report/:weekId     | ✅ Partial — getWeeklyLogs drives averages + heatmap; trends/pain/mobility/steps mock (no DB columns)
HealthProfileScreen     | /onboarding/profile        | ✅ Partial — updates profiles (city + goals); full health data blocked on client_profiles migration
TrainerGoalApprovalScreen | (embedded in TrainersScreen) | ✅ Live — fetchTrainingProgram, submitProgramApproval
HomeScreen              | /client/dashboard          | ✅ Partial — readinessScore + todaySession live via Supabase (wired 2026-05-14); other fields still context mock
TrainersScreen          | /client/trainers           | ✅ Live — getTrainerProfiles + getClientActiveTrainerIds (wired 2026-05-14)
SessionDetailScreen     | /client/session/:sessionId | ✅ Live — getClientSession (workout_plans) wired 2026-05-14; context used when available, DB fetch on refresh/direct URL; exercises[] empty until planned_exercises is wired
AlertsScreen            | /client/alerts             | ✅ Live — getRiskAlerts + markAlertRead wired 2026-05-14; RiskAlert mapped to Notification type in-screen
AssessmentBookingScreen | /onboarding/assessment     | ⏳ Mock only — no bookings table; confirm writes mock data to context only
AccountReadyScreen      | /onboarding/ready          | ⏳ Static — no DB write needed by design
MealLogScreen           | (not routed)               | ⏳ Mock only — kept as manual fallback log path (no camera); wire to insertMealLog when needed
TrainerDetailSubScreen  | (embedded in TrainersScreen) | ⏳ Mock only — no Supabase calls


What Needs to Be Done Next

Phase 5 — Client App remaining screens

HomeScreen (/client/dashboard)
  - ✅ readinessScore — wired 2026-05-14 (getClientReadiness → daily_metrics)
  - ✅ todaySession — wired 2026-05-14 (getClientTodaySession → workout_plans)
  - ⏳ habitProgress from daily_metrics — still mock (not in scope for this task)

TrainersScreen (/client/trainers)
  - ✅ Wired 2026-05-14 — getTrainerProfiles (profiles where role = 'trainer')
  - ✅ Wired 2026-05-14 — getClientActiveTrainerIds (trainer_client_links where status = 'active')

SessionDetailScreen (/client/session/:sessionId)
  - ✅ Wired 2026-05-14 — getClientSession (workout_plans by sessionId)
  - ✅ Context activeSession still used when navigating in-app (no extra fetch)
  - ⏳ exercises[] empty — planned_exercises table not yet queried (post-MVP)

AlertsScreen (/client/alerts)
  - ✅ Wired 2026-05-14 — getRiskAlerts fetches risk_alerts for userId
  - ✅ markAlertRead called on tap (single) and mark-all; DB stays in sync
  - RiskAlert → Notification mapped in-screen: severity='high' → type='alert', else 'info'

Phase 6 — Screens pending DB migrations

AssessmentBookingScreen — needs a bookings or assessment_bookings table
NotificationsScreen (Trainer) — needs a notifications table to remove mock content

Phase 7 — Screens to decide on

MealLogScreen — kept as manual fallback entry point (no camera); route and wire to insertMealLog when needed
TrainerSelectionScreen — deleted (was 0 bytes, no references); rebuild from scratch when feature is scoped
ClientProgressView (/trainer/client-progress/:clientId) — not built yet


Known Gaps — Do Not Fix Unless Instructed

pain_score, mobility_score, sleep_quality_score — ✅ FIXED 2026-05-14 — columns added to daily_metrics; migration: 20260514_daily_metrics_score_columns.sql
client_profiles table needed — ✅ FIXED 2026-05-14 — table created; migration: 20260514_create_client_profiles.sql; HealthProfileScreen can now save dob, gender, height, weight, conditions
goals, focusAreas, sessionsPerWeek — ✅ FIXED 2026-05-14 — columns added to workout_templates; migration: 20260514_workout_templates_program_columns.sql
user_metadata.role not set during signup — role lives in profiles table only; WellnessContext reads from user_metadata which is always null
isAuthLoading guard missing in App.tsx — ✅ FIXED 2026-05-14 — AppRoutes gates route render until session hydrates
notifications table does not exist — NotificationsScreen content will remain mock until table is created
MealLogScreen not routed — kept as manual fallback log path; wire when needed
TrainerSelectionScreen — deleted; no references, rebuild when feature is scoped
ClientProgressView (T15) — screen not built yet
T17/T18 Payment screens — post-MVP
Twilio SMS OTP — production only, not needed now


Implementation Rules for Cowork

Make small, incremental changes only — no large rewrites
Do not touch unrelated files
Do not rename files unless explicitly asked
Do not change the database schema without instruction
Do not add new dependencies without approval
Always ask before structural changes
Prefer doing less over doing more when uncertain
Every screen must handle: loading state, empty state, and Supabase error state

Repo location: C:\Users\Dell\OneDrive\Wellness-Connect
