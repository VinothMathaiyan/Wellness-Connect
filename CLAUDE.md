# CLAUDE.md

This file provides operational guidance to Claude Code when working inside the WellnessConnect repository.

Claude Code is the PRIMARY implementation agent for this project.

Claude Code should focus on:

* implementation
* safe refactoring
* repository maintenance
* component generation
* Supabase integration
* navigation updates
* modular architecture enforcement

Claude Code should NOT behave as a product strategist or redesign the system architecture unless explicitly requested.

---

# PROJECT OVERVIEW

WellnessConnect is a modular wellness ecosystem built with:

* React 19
* TypeScript
* Vite
* Tailwind CSS
* Supabase

The platform contains:

1. Client Application
2. Trainer Command Center
3. Shared Authentication & Onboarding
4. Unified Supabase backend

---

# CURRENT DEVELOPMENT PHASE

## Active Sprint
- [Done ] Complete module folder restructuring
- [ Yet to start] Wire shared OTP auth via Supabase
- [ Yet to start] Replace mock data in client wellness flows
- [ Work in progress] Scaffold trainer dashboard shell

---

# MODULE STRUCTURE

Use module-based architecture ONLY.

```txt
src/
  modules/
    client/
    trainer/
    shared/
```

---

# RESPONSIBILITY OF EACH MODULE

## client/

Contains:

* client-facing screens
* client-specific components
* wellness tracking flows
* nutrition
* daily check-ins
* progress tracking

---

## trainer/

Contains:

* trainer dashboard
* client management
* risk monitoring
* adherence tracking
* workout prescription
* intervention tools

Trainer App Philosophy:

* information dense
* operational
* analytical
* mobile-first operational workflow
* optimized for quick trainer actions on-the-go
* future desktop portal planned separately

---

## shared/

Contains:

* OTP authentication
* role selection
* shared alerts
* onboarding
* reusable flows

---

# STATE MANAGEMENT RULES

* Always use WellnessContext.
* Do NOT introduce:

  * Redux
  * Zustand
  * MobX
  * Recoil

Keep state centralized and predictable.

---

# DATABASE RULES

Use:

```ts
@/lib/supabaseClient
```

Requirements:

* Use async/await only
* Use typed responses
* Replace mock implementations fully
* Do NOT maintain parallel mock + live systems

---

# IMPORT RULES

Prefer alias imports:

```ts
@/components
@/services
@/modules
@/hooks
@/types
```

Avoid deep relative imports like:

```ts
../../../components
```

unless unavoidable.

---

# FILE NAMING CONVENTIONS

Screens:

* PascalCase
* Must end with Screen.tsx

Examples:

* HomeScreen.tsx
* TrainerDashboardScreen.tsx

Hooks:

* useSomething.ts

Services:

* somethingService.ts

Context:

* SomethingContext.tsx

Types:

* something.types.ts

---

# UI/UX RULES

## Client App

Design philosophy:

* calm
* minimal
* supportive
* low friction

Use:

* soft spacing
* readable typography
* emotionally supportive copy

---

## Trainer App

Design philosophy:

* command center
* analytical
* high information density

Prioritize:

* data visibility
* quick actions
* triage workflows

If there is conflict between:

* visual beauty
  and
* operational clarity

ALWAYS prioritize:
DATA VISIBILITY.

---

Add this section to CLAUDE.md under the UI/UX RULES section:

# TAILWIND COLOR RULES

NEVER construct Tailwind color classes dynamically:
  ❌ className={`bg-${color}-500`}
  ❌ className={`text-${level}-700`}

ALWAYS write complete class strings:
  ✅ className="bg-red-500"
  ✅ condition ? 'bg-red-500' : 'bg-green-500'
  ✅ const COLORS = { red: 'bg-red-500', green: 'bg-green-500' }

If a color class only appears in a conditional or map, 
add an inline style={{ backgroundColor: '#...' }} fallback 
on any element that is critical to UX (banners, alerts, 
risk indicators).

Never move color mapping dictionaries to external .ts files 
outside the component — Tailwind JIT cannot scan them.

# IMPLEMENTATION RULES

Claude Code should:

* make incremental changes only
* preserve existing behavior
* avoid unnecessary rewrites
* reuse components whenever possible
* avoid duplicate logic
* keep code readable for non-developers

---

# FORBIDDEN ACTIONS

Claude Code must NOT:

* rewrite unrelated files
* redesign screens unless requested
* remove functionality during refactors
* introduce new dependencies without approval
* add new state libraries
* create duplicate components
* break navigation flows
* rename files unnecessarily
* change database schema without instruction

---

# ROUTING & NAVIGATION — IMPORTANT

This project uses React Router v7 (web), NOT React Native Navigation or @react-navigation/native.

Correct patterns:
- Navigation: useNavigate() from 'react-router-dom'
- Route params: useParams<{ clientId: string }>() from 'react-router-dom'
- Back: navigate(-1)
- Forward: navigate('/trainer/client/123')
- Links: <Link to="/trainer/clients"> or navigate('/trainer/clients')

NEVER use:
- useNavigation() from @react-navigation/native
- navigation.navigate('RouteName')
- NavigationProp types
- Stack.Navigator, Tab.Navigator patterns

Route structure is defined in App.tsx.
Trainer routes follow the pattern: /trainer/<screen>
Client routes: /client/<screen>

---

# SUPABASE INTEGRATION RULES

When migrating from mock data:

1. Remove mock implementation completely
2. Replace with Supabase query
3. Maintain same response shape where possible
4. Keep UI behavior unchanged

Add this under the SUPABASE INTEGRATION RULES section in CLAUDE.md:

# KNOWN SUPABASE GAPS — POST-MVP TASKS

1. user_metadata.role not set during signup
   - Currently role is stored in profiles table only
   - WellnessContext.userRole reads from user_metadata via onAuthStateChange
   - Fix: call supabase.auth.updateUser({ data: { role: selectedRole } })
     inside handleRoleSelect in RoleSelectionScreen after successful upsert
   - This ensures onAuthStateChange auto-reflects correct role on refresh

2. userId null risk on page refresh
   - If user refreshes at /role-selection before session hydrates,
     userId is null and profiles upsert silently fails
   - Fix: add isAuthLoading guard in App.tsx to show loading screen
     while WellnessContext hydrates the session

3. client_profiles table needed
   - HealthProfileScreen collects fields with no matching profiles columns
   - Pending migration: client_profiles table
---

# ERROR HANDLING

Always:

* handle loading states
* handle empty states
* handle Supabase failures gracefully

Avoid:

* silent failures
* console-only error handling

---

# TYPESCRIPT RULES

* Avoid using any
* Prefer explicit typing
* Reuse existing types
* Use src/types/index.ts as source of truth

Do NOT create duplicate domain types.

---

# COMPONENT STRATEGY

Shared reusable UI:

```txt
src/components/
```

Module-specific reusable UI:

```txt
src/modules/client/components/
src/modules/trainer/components/
```

---

# VALIDATION CHECKLIST

Before completing tasks:

* verify imports
* verify navigation
* verify TypeScript passes
* verify no duplicate components
* verify screens still render
* verify existing flows remain functional

---

# DEVELOPMENT PRIORITIES

Current implementation priority:

1. Module restructuring
2. Shared authentication
3. Role-based navigation
4. Supabase integration
5. Trainer dashboard
6. Risk alert system
7. Workout prescription system

---

# IMPORTANT WORKFLOW RULE

Claude Code should prefer:
SMALL SAFE CHANGES

instead of:
large repository-wide rewrites.

Incremental implementation is mandatory.

# REFERENCE DOCUMENTS
For deeper context, refer to:
- Architecture: docs/architecture/ARCHITECTURE.md
- Module Structure: docs/architecture/MODULE_STRUCTURE.md
- Database Schema: docs/database/SCHEMA.md
- DB Relationships: docs/database/DATABASE_RELATIONSHIPS.md
- AI Rules: docs/ai-rules/MASTER_RULES.md
- UX Standards: docs/ux/CLIENT_UX_STANDARDS.md
- Design System: docs/ux/DESIGN_SYSTEM.md
- Assessment App: docs/assessment/ASSESSMENT_APP_PLAN.md

# CURRENT STATUS
- Module restructuring: ✅ Done
- Trainer app scaffolding: 🔄 In progress
- Client app: 🔄 Partially complete
- Shared OTP auth (Supabase): ⏳ Not started
- Mock data replacement: ⏳ Not started

# WHEN IN DOUBT
- Ask before making structural changes
- Prefer doing less over doing more
- Never assume a missing file should be created