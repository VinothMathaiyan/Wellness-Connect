import { test as setup } from '@playwright/test';
import { uiLogin, stateFile, Role } from './helpers/auth';

/**
 * Auth setup project. Runs once before the test suite: performs a real UI OTP
 * login for each role and saves its Supabase session to e2e/.auth/<role>.json.
 * Every test then replays these sessions via loginAs() instead of logging in
 * itself — so the whole suite makes ~3 auth calls total instead of ~47, well
 * under Supabase's per-IP rate limit.
 */
const ROLES: Role[] = ['client', 'trainer', 'assessor'];

for (const role of ROLES) {
  setup(`authenticate ${role}`, async ({ page }) => {
    await uiLogin(page, role);
    await page.context().storageState({ path: stateFile(role) });
  });
}
