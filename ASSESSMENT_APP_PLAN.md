# ASSESSMENT_APP_PLAN.md

## Purpose

This document defines the full build plan for the WellnessConnect Assessment Team App — the third module of the platform, sitting between the Client App and Trainer App.

---

## Role & Philosophy

The assessment team is the **gatekeeper and guardian** of the platform. They:
- Evaluate every new client before training begins
- Approve trainers before they go live
- Handle risk escalations from trainers and clients
- Conduct monthly progress audits to ensure goal alignment

**UX philosophy:** Professional, clinical, data-rich. Closer to Trainer App density than Client App softness. Desktop-first with mobile support.

**Module path:** `src/modules/assessment/`

---

## Three-App Ecosystem Flow

```
Client registers
      ↓
Assessment Team notified (first contact)
      ↓
Assessment Team evaluates client (health, fitness, goals)
      ↓
Assessment Team clears client + recommends trainer
      ↓
Trainer receives client with assessment notes
      ↓
Training begins
      ↓
Risk escalations → Assessment Team (from trainer or client)
Monthly reviews → Assessment Team audits goal alignment
```

---

## Database Schema — New Tables

### assessments
```sql
CREATE TABLE assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES profiles(id),
  assessor_id uuid REFERENCES profiles(id),
  status text CHECK (status IN ('pending', 'in_progress', 'completed', 'flagged')),
  assessment_date date,
  fitness_level text CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  health_notes text,
  trainer_recommendation text,
  recommended_trainer_id uuid REFERENCES profiles(id),
  clearance_status text CHECK (clearance_status IN ('cleared', 'conditional', 'hold')),
  created_at timestamptz DEFAULT now()
);
```

### assessor_profiles
```sql
CREATE TABLE assessor_profiles (
  id uuid PRIMARY KEY REFERENCES profiles(id),
  specialisation text,
  designation text,
  contact_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

### trainer_approvals
```sql
CREATE TABLE trainer_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid REFERENCES profiles(id),
  assessor_id uuid REFERENCES profiles(id),
  status text CHECK (status IN ('pending', 'approved', 'rejected')),
  review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

### assessment_messages
```sql
CREATE TABLE assessment_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid REFERENCES profiles(id),
  to_user_id uuid REFERENCES profiles(id),
  client_id uuid REFERENCES profiles(id),
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

### monthly_reviews
```sql
CREATE TABLE monthly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES profiles(id),
  assessor_id uuid REFERENCES profiles(id),
  review_month date,
  goal_alignment_score integer CHECK (goal_alignment_score BETWEEN 1 AND 10),
  notes text,
  action_taken text CHECK (action_taken IN ('message', 'call', 'none')),
  reviewed_at timestamptz DEFAULT now()
);
```

### escalations
```sql
CREATE TABLE escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES profiles(id),
  raised_by text CHECK (raised_by IN ('trainer', 'client')),
  source_alert_id uuid REFERENCES risk_alerts(id),
  status text CHECK (status IN ('open', 'reviewing', 'resolved')),
  assessor_id uuid REFERENCES profiles(id),
  resolution_notes text,
  created_at timestamptz DEFAULT now()
);
```

### profiles table — add assessor role
```sql
-- The existing profiles.role CHECK constraint needs 'assessor' added:
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('client', 'trainer', 'assessor'));
```

---

## Screen Map

| ID | Screen | Route | Priority |
|---|---|---|---|
| SCR-A01 | Assessment Dashboard | `/assessment/dashboard` | P1 |
| SCR-A02 | New Client Queue | `/assessment/clients/queue` | P1 |
| SCR-A03 | Client Assessment Form | `/assessment/assess/:clientId` | P1 |
| SCR-A04 | Trainer Approval Queue | `/assessment/trainer-approvals` | P2 |
| SCR-A05 | Escalations Inbox | `/assessment/escalations` | P1 |
| SCR-A06 | Messages | `/assessment/messages` | P2 |
| SCR-A07 | Monthly Review Queue | `/assessment/monthly-reviews` | P2 |
| SCR-A08 | Notifications | `/assessment/notifications` | P2 |

---

## Screen Specifications

### SCR-A01 — Assessment Dashboard
- Unreviewed new clients count (amber badge)
- Open escalations count (red badge if any)
- Pending trainer approvals count
- Monthly reviews due this week
- Recent activity feed
- Bottom nav: Dashboard / Clients / Escalations / Messages / Alerts

### SCR-A02 — New Client Queue
- List of clients with status = 'pending' in assessments table
- Each row: name, registration date, health conditions summary, goals
- Tap → opens SCR-A03
- Filter tabs: Pending / In Progress / Completed

### SCR-A03 — Client Assessment Form
- Client profile (read-only): name, goals, health conditions, age
- Fitness level selector: Beginner / Intermediate / Advanced
- Health notes textarea
- Conditions checklist (knee injury, back pain, cardiac, diabetes, etc.)
- Trainer recommendation (free text + optional trainer dropdown)
- Clearance decision: Cleared / Conditional / Hold
- Submit → creates assessments record + notifies matched trainer

### SCR-A04 — Trainer Approval Queue
- List of trainers with status = 'pending' in trainer_approvals
- Each row: name, specialisations, certification, years experience, uploaded documents
- Approve / Reject with notes
- Approved → trainer profile becomes active (profiles.role confirmed)

### SCR-A05 — Escalations Inbox
- All open escalations sorted by severity and age
- Source badge: TRAINER or CLIENT
- Each card: client name, raised by, alert summary, days open
- Tap → full context (risk alert details + client assessment history)
- Actions: Contact Client / Contact Trainer / Resolve / Pause Program

### SCR-A06 — Messages
- Direct message threads between assessor ↔ client
- Conversation list view → tap → thread view
- New message CTA
- Unread count badge on nav tab

### SCR-A07 — Monthly Review Queue
- Auto-populated list based on program start date (every 30 days)
- Each row: client name, trainer, program week, last goal alignment score
- Tap → review form: goal vs actual summary, trend, action taken
- Actions: Message Client / Log Call / No Action Needed
- Mark reviewed → logs to monthly_reviews

### SCR-A08 — Notifications
- New client registered → "Assessment required"
- Risk escalation from trainer
- Trainer approval request submitted
- Monthly review due
- Client message received

---

## Bottom Navigation (Assessment App)

| Tab | Icon | Route |
|---|---|---|
| Home | LayoutDashboard | /assessment/dashboard |
| Clients | Users | /assessment/clients/queue |
| Escalations | ShieldAlert | /assessment/escalations (red dot if open) |
| Messages | MessageSquare | /assessment/messages (badge if unread) |
| Alerts | Bell | /assessment/notifications |

---

## Client App Changes Required

1. **"Contact Assessment Team" button** in AlertsScreen → opens `assessment_messages` thread
2. **Assessor contact card** on a new Support section → shows assessor name, designation, tap to message
3. **Escalation CTA** already in RiskAlertScreen → wire to create `escalations` record

## Trainer App Changes Required

1. **"Escalate to Assessment Team"** in RiskAlertScreen → wire to `escalations` insert + notification to assessor
2. **Assessment notes** visible in AcceptDeclineScreen (SCR-T08) → read from `assessments.health_notes`

---

## Module Structure

```
src/modules/assessment/
  screens/
    AssessmentDashboardScreen.tsx      (SCR-A01)
    NewClientQueueScreen.tsx           (SCR-A02)
    ClientAssessmentFormScreen.tsx     (SCR-A03)
    TrainerApprovalQueueScreen.tsx     (SCR-A04)
    EscalationsScreen.tsx              (SCR-A05)
    MessagesScreen.tsx                 (SCR-A06)
    MonthlyReviewQueueScreen.tsx       (SCR-A07)
    AssessmentNotificationsScreen.tsx  (SCR-A08)
  components/
    AssessmentBottomNav.tsx
    ClientAssessmentCard.tsx
    EscalationCard.tsx
    MessageThread.tsx
```

---

## Supabase Service Functions Required

```ts
// assessments
getNewClientQueue(assessorId)
getClientAssessmentHistory(clientId)
submitAssessment(assessorId, clientId, data)
updateAssessmentStatus(assessmentId, status)

// trainer approvals
getPendingTrainerApprovals()
submitTrainerApproval(assessorId, trainerId, status, notes)

// escalations
getOpenEscalations(assessorId)
createEscalation(clientId, raisedBy, sourceAlertId)
resolveEscalation(escalationId, notes)

// messages
getMessageThreads(assessorId)
getMessageThread(assessorId, clientId)
sendMessage(fromUserId, toUserId, clientId, message)

// monthly reviews
getMonthlyReviewQueue(assessorId)
submitMonthlyReview(assessorId, clientId, data)

// notifications
getAssessorNotifications(assessorId)
markNotificationRead(notificationId)
```

---

## Build Order

| Step | Task |
|---|---|
| 1 | Run DB schema migrations in Supabase |
| 2 | Add assessor role to profiles table |
| 3 | Create assessment supabase service functions |
| 4 | SCR-A01 + SCR-A02 — Dashboard + New Client Queue |
| 5 | SCR-A03 — Client Assessment Form |
| 6 | SCR-A04 — Trainer Approval Queue |
| 7 | SCR-A05 — Escalations Inbox |
| 8 | SCR-A06 — Messages |
| 9 | SCR-A07 — Monthly Review Queue |
| 10 | SCR-A08 — Notifications + AssessmentBottomNav |
| 11 | Wire Client App changes (contact + escalation) |
| 12 | Wire Trainer App changes (escalation + assessment notes) |

---

## Test Users Required

After DB migration, insert:
- 1 assessor profile (role = 'assessor') with phone for dev bypass login
- Link to existing test clients (Client two, TestClient One) with pending assessments

---

## Key Rules (from MASTER_RULES.md)

- Module path: `src/modules/assessment/`
- All screens end in `Screen.tsx`
- Use `useWellness()` for auth context (userId, userRole)
- Supabase functions in `src/services/supabaseService.ts`
- No Redux / Zustand — WellnessContext only
- Relative imports for supabaseClient
- No dynamic Tailwind color classes — inline style fallbacks for all dynamic colors
- React Router v7: `useNavigate()`, `useParams()`, `useLocation()`
