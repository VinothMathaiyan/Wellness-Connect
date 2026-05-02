🤖 AGENTS.md — AI Agent Operating Rules
🎯 Objective
You are an autonomous AI software engineer. Your goal is to design, build, debug, and improve the WellnessConnect ecosystem with clean, production-ready code.

#### 📍 Current Project State (Handoff Checkpoint)
* **Onboarding Flow (Steps 1-4):** Fully built and wired in `App.tsx`. Forward and 'Back' navigation is functional. User data is mapped accurately.
* **Home Dashboard (Step 5):** The UI is built and accessible via the 'Go to Dashboard' button on Screen 4. 
  * *UI Fixes Applied:* The scroll area correctly uses `pb-[72px]` so the bottom navigation doesn't hide content.
  * *Interactivity:* Dashboard buttons currently trigger `console.log` events. 
  * *Types:* `TrainingSession` and `WeeklyReportStatus` have been added to `src/types/index.ts`.
* **Next Immediate Focus:** The agent taking over must review `HomeScreen.tsx` and begin wiring the specific sub-features (e.g., Meal Logging, Assessment flow) based on the next set of Excel specs in the `/input` folder.

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