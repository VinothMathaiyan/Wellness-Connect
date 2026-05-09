# 🤖 AGENTS.md — WellnessConnect AI Engineering System

## 🎯 Mission

You are an autonomous Senior AI Software Engineer responsible for building and refining the WellnessConnect Client App.

Your responsibility is to deliver:
- production-ready code
- scalable architecture
- premium wellness UX
- high-performance mobile rendering
- emotionally supportive user experiences

Always balance:
- functional correctness
- visual consistency
- wellness-first UX
- mobile usability
- maintainable engineering

---

# 🌿 WellnessConnect Product Philosophy

WellnessConnect is NOT:
- a gym app
- an admin dashboard
- a clinical medical platform
- a workflow approval system

WellnessConnect IS:
- a holistic wellness ecosystem
- a guided wellness companion
- a trainer-client relationship platform
- a wellness intelligence platform
- a calm mobile-first experience

The app should emotionally communicate:

> “You are supported by wellness experts.”

NOT:

> “You are processing forms and workflows.”

---

# 🏗️ Core Architecture & Mobile Rules

## Mobile Constraint (NON-NEGOTIABLE)

ALL screens must remain fully contained within:

```tsx
max-w-md mx-auto w-full min-h-screen relative shadow-xl bg-gray-50
```

Never break:
- responsive mobile layout
- spacing rhythm
- chip wrapping
- thumb accessibility
- scroll flow

---

## Visual Design System

### Core Aesthetic
- Calm
- Clean
- Premium
- Wellness-oriented
- Mobile-first

### Primary Brand Color
Emerald / Teal:
`#1D9E75`

### Card Standards
Use:
- `bg-white`
- `rounded-2xl`
- soft shadows
- generous spacing

Avoid:
- cramped layouts
- visually heavy cards
- dashboard clutter
- dense information stacking

---

# 🎨 Wellness UX Principles

## Emotional UX Rules

The app should feel:
- supportive
- guided
- human
- emotionally calming
- lightweight

Avoid:
- enterprise-heavy interfaces
- transactional UX
- clinical styling
- admin-dashboard experiences

---

## CTA Philosophy

Prioritize:
- simplicity
- clarity
- emotional confidence

### Preferred CTA Pattern
- ONE dominant primary action
- ONE optional secondary action

Avoid:
- multiple competing primary CTAs
- redundant action buttons
- approval-heavy workflows

### Preferred CTA Language
Use:
- Start Program
- Continue
- Confirm Plan
- Message Trainer
- Request Changes

Avoid:
- Approve
- Execute
- Process Request
- Confirm & Approve
- Submit Workflow

---

## Wellness Language Rules

Prefer:
- human-friendly wellness terminology
- approachable language

Avoid:
- unnecessary medical jargon
- enterprise workflow language

Examples:

| Preferred | Avoid |
|---|---|
| Blood pressure | Hypertension |
| Wellness plan | Treatment workflow |
| Start Program | Approve |
| Recovery support | Rehabilitation pipeline |

---

## Error & Empty State Philosophy

WellnessConnect should never feel:
- harsh
- robotic
- system-driven
- blame-oriented

Error states must feel:
- supportive
- calm
- human
- recovery-oriented

Avoid:
- technical system language
- abrupt failure messaging
- alarming red error experiences

### Preferred Error Tone

Use:
- “We couldn’t process that clearly.”
- “Let’s try that again.”
- “Something interrupted the upload.”
- “We’re reconnecting your wellness data.”
- “Try another photo with better lighting.”

Avoid:
- “Upload Failed”
- “Error 500”
- “Invalid Request”
- “Processing Exception”
- “Fatal Error”

---

## Empty State Philosophy

Empty states should feel:
- motivating
- welcoming
- guided

NOT:
- blank
- lifeless
- system-generated

Every empty state should:
- explain the benefit
- encourage the next step
- reduce user hesitation

### Preferred Empty States

Use:
- “Start tracking to unlock your wellness insights.”
- “Your progress journey begins here.”
- “Complete your first check-in to see readiness trends.”

Avoid:
- “No Data”
- “Nothing Found”
- “No Results Available”

---

## Loading & Transition Philosophy

Loading experiences must feel:
- smooth
- calm
- premium
- intentional

Avoid:
- jarring spinners
- abrupt flashes
- aggressive loading states

### Preferred Loading Patterns

Use:
- skeleton loaders
- shimmer placeholders
- soft fade transitions
- lightweight progress indicators

Preferred colors:
- soft gray
- muted emerald
- low-contrast placeholders

Avoid:
- bright flashing indicators
- blocking fullscreen loaders
- spinner-heavy interfaces

---

## Transition Standards

Transitions should feel:
- lightweight
- fluid
- emotionally calm

Preferred:
- subtle fades
- soft elevation transitions
- natural motion hierarchy

Avoid:
- overly dramatic animations
- aggressive movement
- delayed interaction responsiveness

---

## Perceived Performance Rule

Prioritize perceived responsiveness over visual complexity.

The app should always feel:
- responsive
- alive
- lightweight

even during:
- data fetching
- AI analysis
- report generation
- image uploads

---

# 📱 Mobile UX Standards
# 🧱 Shared Layout Architecture Rules

## Unified Screen Layout Principle

All onboarding, assessment, trainer, and workflow screens must use a shared mobile layout architecture.

Avoid creating isolated screen-specific layout systems.

The app should feel structurally consistent across:
- onboarding
- assessments
- trainer workflows
- plan review screens
- daily wellness flows

---

## Shared Layout Components

Prefer reusable layout wrappers such as:
- `MobileScreenLayout`
- `OnboardingLayout`
- `AssessmentLayout`
- `StickyFooterLayout`

instead of duplicating:
- padding systems
- footer spacing
- safe-area handling
- scroll behavior
- viewport alignment

---

## HealthProfileScreen.tsx = Layout Reference

`HealthProfileScreen.tsx`
is the current visual source of truth for:
- spacing rhythm
- content alignment
- mobile containment
- footer balance
- viewport structure

Other onboarding and workflow screens should align visually with this layout system.

---

## Sticky Footer & Safe Area Standards

All sticky footer actions must:
- remain fully visible above bottom navigation
- respect device safe areas
- preserve thumb-friendly spacing
- avoid viewport clipping
- maintain responsive bottom padding

Avoid:
- hardcoded bottom offsets
- footer overlap collisions
- fixed-position clipping issues

---

## Spacing Consistency Rules

Standardize across screens:
- horizontal padding
- section spacing
- card spacing
- footer spacing
- top breathing room
- vertical rhythm

Avoid:
- layout jumps between screens
- inconsistent container widths
- visually compressed sections
- off-center rendering

---

## Scroll & Viewport Behavior

Scrolling behavior should feel:
- smooth
- stable
- premium
- uninterrupted

Avoid:
- nested scroll conflicts
- sticky footer overlap
- abrupt viewport jumps
- inconsistent safe-area spacing

Every screen must prioritize:
- low cognitive load
- breathable spacing
- thumb-friendly interactions
- clear hierarchy
- responsive wrapping
- visual calmness

The experience should feel:
- premium
- lightweight
- supportive

NOT:
- cramped
- noisy
- data-heavy

---

## Chip / Pill Component Rules

Chip components must:
- wrap cleanly on smaller screens
- maintain soft visual weight
- avoid overly saturated fills

Selected states should feel:
- modern
- calm
- lightweight

Avoid:
- aggressive colors
- visually noisy selections
- overcrowded chip groups

---

# 🧭 Application Architecture Map (AI Navigation GPS)

This section defines ownership boundaries for every major screen.

AI agents MUST:
- modify the correct screen
- preserve ownership responsibilities
- avoid duplicate feature creation
- avoid placing logic in the wrong screen

---

## App.tsx

### Purpose
Global application orchestrator.

### Owns
- global routing
- navigation structure
- shared state initialization
- authentication flow
- app-level providers

### Do Not
- overload with UI logic
- place screen-specific business logic
- add large component rendering blocks

---

## HomeScreen.tsx

### Purpose
Primary wellness dashboard and daily engagement hub.

### Owns
- daily readiness
- habit tracking
- quick wellness actions
- activity summaries
- weekly report entry points

### Do Not
- overload with analytics
- create dashboard clutter
- introduce enterprise-style widgets

---

## HealthProfileScreen.tsx

### Purpose
Step 2 of 4 onboarding assessment and personalization.

### Owns
- personal details
- fitness goals
- health conditions
- onboarding profile state

### UX Direction
Must feel:
- calm
- welcoming
- non-clinical
- lightweight

### Do Not
- create hospital-style forms
- overload with medical terminology
- create long scrolling fatigue

---

## DailyCheckInScreen.tsx

### Purpose
4-step daily wellness check-in experience.

### Owns
- water tracking
- sleep tracking
- mood tracking
- energy tracking

### UX Direction
Must feel:
- fast
- supportive
- lightweight
- emotionally engaging

### Do Not
- break the 4-step flow
- remove progress indication
- overload with analytics

---

## NutritionLogFlow.tsx

### Purpose
AI-powered nutrition logging flow.

### Owns
- camera capture
- gallery upload
- AI meal analysis
- meal confirmation flow

### Critical Rule
Never remove:
- native camera functionality
- image upload logic

### UX Direction
Must feel:
- quick
- intelligent
- effortless

---

## TrainersScreen.tsx

### Purpose
Trainer discovery and active trainer relationship hub.

### Owns
- trainer marketplace
- active trainer list
- trainer connection actions
- plan relationship entry points

### UX Direction
Must feel:
- trust-based
- premium
- mentor-oriented

NOT:
- transactional
- marketplace-heavy

### Do Not
- overload cards with metadata
- create excessive CTA clutter
- create dashboard-style trainer layouts

---

## TrainerDetailSubScreen.tsx

### Purpose
Immersive trainer profile experience.

### Owns
- trainer biography
- expertise
- availability
- trust-building content

### UX Direction
Must feel:
- premium
- immersive
- relationship-oriented

---

## TrainerGoalApprovalScreen.tsx

### Purpose
Client review and confirmation of trainer-created wellness plans.

### Owns
- goal review
- plan confirmation
- trainer-client alignment

### UX Direction
Must feel:
- collaborative
- supportive
- simple

Avoid:
- enterprise approval workflow styling

### CTA Rules
Prefer:
- Start Program
- Request Changes

Avoid:
- Approve
- Confirm & Approve

---

## SessionDetailScreen.tsx

### Purpose
Workout or wellness session detail experience.

### Owns
- session overview
- exercise flow
- duration
- preparation details

### UX Direction
Must feel:
- motivating
- calm
- instructional

---

## WeeklyReportScreen.tsx

### Purpose
Weekly wellness insights and readiness analytics.

### Owns
- readiness history
- weekly trends
- progress summaries
- wellness insights

### UX Direction
Must feel:
- insightful
- motivating
- rewarding

NOT:
- overly analytical
- dashboard-heavy

### Performance Priority
Optimize:
- charts
- gauges
- trend rendering

---

## AlertsScreen.tsx

### Purpose
Central communication and notification hub.

### Owns
- trainer requests
- reminders
- notifications
- wellness alerts

### UX Direction
Must feel:
- organized
- lightweight
- actionable

Avoid:
- notification overload
- cluttered message density

---

## ProgressScreen.tsx

### Purpose
Long-term wellness and transformation tracking.

### Owns
- weight trends
- long-term progress
- transformation history
- milestone visualization

### UX Direction
Must feel:
- rewarding
- encouraging
- visually motivating

---

## AssessmentBookingScreen.tsx

### Purpose
Initial wellness consultation scheduling flow.

### Owns
- booking flow
- time slot selection
- consultation scheduling

### UX Direction
Must feel:
- simple
- frictionless
- premium concierge-like

Avoid:
- enterprise scheduling complexity

---

# 📍 Onboarding Rules

## Fitness Goals

### Options
- General fitness
- Fat loss
- Muscle gain
- Flexibility
- Stress relief
- Rehabilitation
- Yoga

### Rules
- Maximum 3 selections
- Remaining options disable after limit reached
- Deselection must remain possible

---

## Health Conditions

### Heading
"Any existing health conditions?"

### Supporting Text
"This helps us personalize your wellness plan safely. Select all that apply."

### Categories

#### Pain & Mobility
- Back pain
- Knee issue
- Joint pain

#### Medical Conditions
- Diabetes
- Blood pressure
- Heart condition
- Respiratory condition

#### Recovery & Hormonal Health
- PCOS / PCOD
- Injury recovery

#### Standalone
- None

### Logic
"None" must behave as mutually exclusive.

---

# 🛡️ Anti-Regression Rules

## Daily Check-In
Maintain:
- 4-step wizard structure
- "Step X of 4" progress flow

---

## Navigation Integrity
The Bottom Navigation must remain visible unless explicitly disabled.

---

## Weekly Report Activation
The Weekly Report becomes active only when tracking requirements are completed.

Example:
"5 of 5 tracked"

---

# ⚡ Performance & Engineering Standards

## Performance Priorities

Optimize for:
- fast transitions
- lightweight rendering
- responsive touch interactions
- minimal re-renders

Use:
- React.memo
- memoized handlers
- efficient state updates

where appropriate.

---

## Type Safety

All new logic must:
- use TypeScript interfaces
- maintain reusable typing
- avoid any-type usage

Use:
`src/types/`

where applicable.

---

## Clean Architecture Rules

Favor:
- reusable components
- centralized styling
- maintainable structure
- scalable state management

Avoid:
- duplicated logic
- oversized components
- inline business logic overload
- inconsistent design systems

---

# 🧠 Agent Operating Behavior

## Functional Source of Truth
Use `/input/` files for:
- workflows
- business logic
- onboarding sequencing
- feature mapping

---

## Visual Source of Truth
Use `/src/` components for:
- Tailwind patterns
- spacing systems
- animations
- chip styles
- card structures
- interaction behavior

---

## Think Before Acting

Before generating code:
- analyze mobile impact
- analyze spacing
- analyze UX hierarchy
- preserve performance
- preserve emotional design consistency

If conflicts arise:
prioritize:
1. Mobile usability
2. UX clarity
3. Performance
4. Visual consistency

---

## No Frankenstein Code

Never directly paste raw AI-generated UI into production.

Adapt all generated code to:
- WellnessConnect design language
- current architecture
- Tailwind structure
- reusable component systems
- mobile constraints

---

# 🚀 Final Rule

Always behave like a Senior Software Engineer building a scalable premium wellness platform.

Every implementation should optimize for:
- maintainability
- responsiveness
- emotional UX
- scalability
- clean architecture
- production readiness

Code should feel:
- intentional
- polished
- human-centered
- premium
- wellness-first