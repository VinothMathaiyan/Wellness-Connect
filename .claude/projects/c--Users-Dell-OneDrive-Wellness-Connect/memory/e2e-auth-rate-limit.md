---
name: e2e-auth-rate-limit
description: Playwright e2e tests must reuse saved sessions, not log in per test, to avoid Supabase auth rate limits
metadata:
  type: project
---

The Playwright e2e suite (~47 tests) was flaky because every test called `loginAs()` which ran the full UI OTP flow, and each login fires TWO Supabase auth calls (`signUp` + `signInWithPassword` in SignUpScreen.tsx). ~94 auth calls per run from one IP trips Supabase's per-IP auth rate limit — symptom is `loginAs` timing out at `waitForURL` in random tests, getting worse across back-to-back runs.

**Why:** Supabase Auth rate-limits the token/signup endpoints per IP over a time window.

**How to apply:** `e2e/auth.setup.ts` (the `setup` project, a dependency of `chromium`) logs in once per role and saves the session to `e2e/.auth/<role>.json`. `loginAs()` now REPLAYS that session via `addInitScript` into localStorage (Supabase persists its session there) and navigates straight to the role's landing route — zero auth network calls. Do NOT add new per-test UI logins; add the role to the setup project instead. Only 3 roles are minted: client, trainer, assessor. Local `retries` is set to 1 as a backstop.

Also: e2e assertions on dashboard labels must use `getByText(..., { exact: true })` — loose `text=` matching collides case-insensitively with urgent-banner copy (e.g. "Open Escalations" stat card vs. "13 open escalations" banner).
