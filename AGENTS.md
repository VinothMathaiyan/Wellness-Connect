🤖 AGENTS.md — AI Agent Operating Rules
🎯 Objective
You are an autonomous AI software engineer. Your goal is to design, build, debug, and improve the WellnessConnect ecosystem with clean, production-ready code.

#### 📍 Current Project State (Handoff Checkpoint)
* **Onboarding Flow (Steps 1-4):** Fully built and wired in `App.tsx`. Forward and 'Back' navigation is functional. User data is mapped accurately.
* **Home Dashboard (Step 5):** Fully built and wired. `readinessScore`, `habitProgress`, and `mealsLogged` now reflect **live state** from steps 6 & 7.
* **Daily Check-in (Step 6):** ✅ Built — `DailyCheckInScreen.tsx` at project root. 5-step animated wizard (Sleep → Mood → Energy → Water → Workout). On completion, updates `appState.dailyLog`, `readinessScore`, and `habitProgress` in App.tsx. Maps to `daily_metrics` table.
* **Meal Logger (Step 7):** ✅ Built — `MealLogScreen.tsx` at project root. Meal-type grid (Breakfast/Lunch/Dinner/Snack) + text description + quick-add chips. Appends to `appState.mealLogs[]`. Maps to `meal_logs` table.
* **Types:** `DailyLog` and `MealLog` added to `src/types/index.ts` with full DB column comments. `WellnessAppState` extended with `dailyLog` and `mealLogs`.
* **Remaining console.log stubs on HomeScreen:** `onViewSession`, `onFindTrainer`, `onViewWeeklyReport`, `onProfileClick`, nav "Progress", nav "Alerts".
* **Next Immediate Focus:** Build the **Session Detail Screen (Step 8)** — triggered by tapping the Training card (`onViewSession`). Or build the **Trainer Discovery Screen** (nav "Trainers" → `onFindTrainer`).

🌐 Ecosystem Awareness (CRITICAL)
The Platform: This project consists of three integrated applications: Client App (Current Focus), Trainer App, and Assessment App.

Data Integrity: All database table and column names must strictly match the definitions in the /input files. This ensures cross-app compatibility for the future Trainer and Assessment modules.

Forward Compatibility: Design all types, states, and schemas with the understanding that they will eventually be consumed by other systems in the WellnessConnect ecosystem.

🧠 Core Behavior Rules
Consult /input First: Always treat the .xlsx and .csv files in the /input folder as the Primary Source of Truth for database mapping, screen logic, and field requirements.

Think Before Acting: Analyze the task, break problems into smaller steps, and avoid unnecessary complexity.

Respect Current Architecture: Read existing files and understand the structure before making changes. DO NOT rewrite entire codebases or introduce breaking changes without reason.

🏗️ Architecture & Code Quality
Frontend: Use React with a component-based architecture. Keep components small, reusable, and separate UI from business logic.

Styling: Use Tailwind CSS. Follow established patterns: Primary Green (#10B981), rounded corners, and consistent shadows.

Clean Code: Use meaningful variable names, follow DRY principles, and maintain consistent formatting.

State Management: Ensure onboarding data persists accurately across multi-step flows (Step 1 → Step 4).

🧩 Task Execution Strategy
Understand: Read the requirement and the relevant /input logic sheet.

Verify: Check the existing implementation in /src.

Plan: Propose minimal, non-breaking changes.

Implement: Code step-by-step.

Test: Verify the result in the Integrated Browser.

Refactor: Ensure the code meets Senior Engineer standards.

🔐 Security & Performance
Never expose API keys or hardcode secrets; use environment variables.

Optimize for performance: Avoid unnecessary re-renders in React and validate all user inputs.

📚 Context Memory Strategy
README.md → Project Overview.

AGENTS.md → Operational Rules (this file).

src/types/ → Data blueprints.

🚀 Final Rule: Always act like a Senior Software Engineer who writes scalable, documented code that other developers (and agents) can easily understand and maintain.