# FEATURE_STATUS.md
# WellnessConnect — Master Status Document
*Last updated: 24 May 2026*

---

## 🔗 Key URLs

| What | URL |
|---|---|
| Production | https://wellness-connect-sigma.vercel.app |
| Dev/Testing (team) | https://wellness-connect-git-dev-vinothm13579-7150s-projects.vercel.app |
| GitHub | https://github.com/VinothMathaiyan/Wellness-Connect |
| Supabase | https://uixomxtprmievgzznbpz.supabase.co |
| Admin Portal | /admin on any URL |

**Dev/Preview login:** Any 10-digit number + OTP `123456` → select role
**Production login:** Real Indian mobile number → real Twilio SMS OTP
**Admin login:** admin@wellnessconnect.in / WellnessAdmin@2026

---

## 🌿 Branch Strategy

| Branch | Environment | OTP | Use for |
|---|---|---|---|
| main | Production | Real SMS | Real users |
| dev | Preview | 123456 bypass | Team testing |

Workflow: develop on dev → test → merge to main → auto-deploys to production

---

## ✅ COMPLETED

### Infrastructure
- React 19 + Vite + Tailwind CSS + TypeScript ✅
- Supabase backend — all tables live ✅
- @/ alias wired (vite.config.ts + tsconfig.app.json) ✅
- GitHub repo connected with auto-deploy on push ✅
- Vercel deployment — production + dev/preview environments ✅
- E2E Test Suite — 47/47 passing, session-cached, stable ✅
- dev branch — team testing environment ✅

### Authentication
- Phone OTP auth flow (shared across all 3 apps) ✅
- Real Twilio SMS OTP — production ✅
- Dev bypass 123456 — dev branch + local only (VITE_USE_DEV_OTP) ✅
- Route guards — unauthenticated redirects to /signup ✅
- Route guards — cross-role protection ✅
- Role selection → profiles upsert ✅
- otpUtils.ts — phone normalisation, E.164 format, Indian number handling ✅

### Admin Portal (NEW — 24 May 2026)
- Route: /admin (standalone, no auth guard) ✅
- Login: hardcoded credentials (admin@wellnessconnect.in / WellnessAdmin@2026) ✅
- Add Assessor form — full name + phone → preregistered_assessors table ✅
- Assessors list — name, phone, Active/Inactive badge, Not yet signed in tag ✅
- Deactivate/Activate toggle per assessor ✅
- Sign Out button ✅

### Assessor Pre-Registration Flow (NEW — 24 May 2026)
- preregistered_assessors table (no auth FK — separate from profiles) ✅
- Admin pre-registers assessor by phone number ✅
- On OTP login: phone match → skip role selection → Assessment Dashboard ✅
- Profile auto-linked on first login ✅
- preregistered_assessors.linked = true after first login ✅

### Utilities
- src/utils/dateUtils.ts — single source of truth for all date formatting ✅
  - formatDate() → DD/MM/YYYY
  - formatDateTime() → DD/MM/YYYY, HH:MM
  - formatDateLong() → Mon, 24 May 2026
  - formatRelativeDate() → Today / Yesterday / N days ago
  - formatDateIST() + formatDateTimeIST() → timezone-safe, forces Asia/Kolkata
  - toInputDateValue() → YYYY-MM-DD (for input[type=date])
- DD/MM/YYYY format applied across all 3 apps ✅
- src/utils/otpUtils.ts — IS_DEV_OTP, normalisePhone, validatePhone, validateOtp ✅

### Client App — All Screens
| Screen | Route | Data |
|---|---|---|
| HomeScreen | /client/home | ✅ Real |
| DailyCheckInScreen | /client/checkin | ✅ → daily_metrics |
| NutritionLogFlow | /client/nutrition | ✅ → meal_logs |
| ProgressScreen | /client/progress | ✅ Real |
| WeeklyReportScreen | /client/weekly-report | ✅ Wired |
| TrainersScreen (Discover + My Trainer) | /client/trainers | ✅ Real + recommendation logic |
| SessionDetailScreen | /client/session/:id | ✅ |
| HealthProfileScreen | /client/health-profile | ✅ → profiles |
| AssessmentBookingScreen | /client/assessment-booking | ✅ |
| AccountReadyScreen | /client/account-ready | ✅ |
| AlertsScreen | /client/alerts | ✅ |
| ClientMessagesScreen | /client/messages | ✅ Bidirectional |
| ClientMessageThreadScreen | /client/messages/:userId | ✅ |
| ProgramApprovalScreen | /client/program-approval | ✅ |
| UpcomingSessionsScreen | /client/upcoming-sessions | ✅ |

### Trainer App — All Screens
| Screen | Route | Data |
|---|---|---|
| TrainerDashboard (T05) | /trainer/dashboard | ✅ Real |
| MyClientsScreen (T06) | /trainer/clients | ✅ Real |
| ClientDetailScreen (T07) | /trainer/client/:clientId | ✅ Real |
| AcceptDeclineScreen (T08) | /trainer/client-request/:clientId | ✅ Wired |
| SessionLogScreen (T09) | /trainer/session-log/:clientId | ✅ Wired |
| ProgramBuilderScreen (T10) | /trainer/program-builder/:clientId | ✅ Real |
| ScheduleSessionScreen (T10A) | /trainer/schedule-session/:clientId? | ✅ |
| WeeklyPlanScreen (T11) | /trainer/weekly-plan/:clientId | ✅ |
| CheckinReviewScreen (T12) | /trainer/checkin-review/:clientId | ✅ Real |
| RiskMonitorScreen (T13) | /trainer/risk-monitor | ✅ Real |
| RiskAlertScreen (T14) | /trainer/risk-alert/:clientId | ✅ Wired |
| ClientProgressView (T15) | /trainer/client-progress/:clientId | ✅ Built |
| NotificationsScreen (T16) | /trainer/notifications | ✅ |
| TrainerMessagesScreen | /trainer/messages | ✅ Bidirectional |
| TrainerMessageThreadScreen | /trainer/messages/:userId | ✅ |

### Assessment App — All Screens
| Screen | Route | Data |
|---|---|---|
| AssessmentDashboard (SCR-A01) | /assessment/dashboard | ✅ + Logout dropdown |
| NewClientQueue (SCR-A02) | /assessment/clients/queue | ✅ |
| ClientAssessmentForm (SCR-A03) | /assessment/assess/:clientId | ✅ |
| TrainerApprovalQueue (SCR-A04) | /assessment/trainer-approvals | ✅ |
| EscalationsScreen (SCR-A05) | /assessment/escalations | ✅ |
| MessagesScreen (SCR-A06) | /assessment/messages | ✅ Bidirectional |
| MonthlyReviewQueue (SCR-A07) | /assessment/monthly-reviews | ✅ |
| AssessmentNotifications (SCR-A08) | /assessment/notifications | ✅ |

### Messaging — All Directions
- Client ↔ Assessment Team ✅ bidirectional
- Trainer ↔ Assessment Team ✅ bidirectional
- Unread badges + thread previews ✅
- NOTE: Client ↔ Trainer direct messaging not yet built (goes via Assessment Team)

### UX Fixes Applied
- Assessment Dashboard logout dropdown (avatar tap → name/role/Sign Out) ✅
- overflow-hidden → overflow-visible fix on Assessment header ✅
- Bottom nav overlap on submit buttons ✅
- Schedule session scroll + button visibility ✅
- Program Builder chip colors ✅
- Notifications sort — unread first ✅
- Date input companion text DD/MM/YYYY ✅
- Messaging reply flows ✅
- DB test data cleaned ✅

---

## 📋 PENDING ROADMAP

| Priority | Item | Notes |
|---|---|---|
| 1 | Twilio account upgrade | Trial = verified numbers only. Upgrade to reach any Indian number |
| 2 | Passive tracking | Step count, HRV, sleep from device sensors |
| 3 | Adherence engine | Deeper session completion logic |
| 4 | Risk trigger engine | Auto-generate risk alerts from data thresholds |
| 5 | Meal image scanning | AI — photo → macros |
| 6 | Client ↔ Trainer direct messaging | Currently only via Assessment Team |
| 7 | T17/T18 Payment screens | Post-MVP |
| 8 | Admin portal — real Supabase Auth | Replace hardcoded credentials |

---

## ⚠️ KNOWN GAPS (do not fix unless instructed)

- pain_score column missing from daily_metrics — hardcoded to 0, TODO in code
- client_profiles table needed for full health data (dob, gender, height, weight)
- user_metadata.role not set — role lives in profiles table only
- isAuthLoading guard missing in App.tsx — can cause null userId on hard refresh
- PDF export on ClientProgressView (T15) — post-MVP
- Twilio trial: only pre-verified numbers receive SMS until account upgraded
- Admin portal RLS: preregistered_assessors has open RLS policy (anon read/write) — must lock down when admin moves to real Supabase Auth
- Admin credentials hardcoded in client bundle — visible in browser dev tools — fix before real users

---

## 🧪 TEST ACCOUNTS

| Name | Role | Phone | OTP (Dev) | OTP (Prod) |
|---|---|---|---|---|
| VinothTest | Trainer | 9200000002 | 123456 | Real SMS* |
| TestClient One | Trainer | 9200000001 | 123456 | Real SMS* |
| Alex Johnson | Client | 9100000001 | 123456 | Real SMS* |
| Client two | Client | 9300000099 | 123456 | Real SMS* |
| Michael Torres | Client (pending) | 9400000003 | 123456 | Real SMS* |
| Assessment Team | Assessor | 9500000001 | 123456 | Real SMS* |
| Test Assessor | Assessor (pre-reg) | 9600000001 | 123456 | Real SMS* |

*Production SMS: Twilio trial — add numbers at Twilio Console → Verified Caller IDs
Supabase Project: uixomxtprmievgzznbpz
Sarah Chen (Client two) has test data: daily_metrics (readiness=34), risk_alert (high), workout_plan

---

## 🏗️ ARCHITECTURE QUICK REFERENCE

- Framework: React 19 + Vite + TypeScript + Tailwind CSS
- Routing: React Router v7 — useNavigate(), useParams(), useLocation()
- State: WellnessContext ONLY — no Redux/Zustand/MobX
- DB: Supabase — async/await, typed, all functions in src/services/supabaseService.ts
- Auth: Supabase Phone Auth → Twilio SMS
- Module paths:
  src/modules/client/
  src/modules/trainer/
  src/modules/assessment/
  src/modules/admin/
- Shared utils: src/utils/dateUtils.ts | src/utils/otpUtils.ts
- Tailwind rule: NEVER dynamic classes — always inline style fallback for dynamic colors
- Imports: use @/ alias (configured in vite.config.ts + tsconfig.app.json)
