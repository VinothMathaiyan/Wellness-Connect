# Memory Index

- [E2E auth rate limit](e2e-auth-rate-limit.md) — Playwright tests reuse saved sessions (setup project) instead of logging in per test; avoids Supabase per-IP auth throttling.
- [Trainer assessment embed](trainer-assessment-embed.md) — no FK between trainer_client_links and assessments; clearance filtering must embed through profiles, not a direct inner join.
