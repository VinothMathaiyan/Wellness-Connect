import { Page, BrowserContext } from '@playwright/test';
import { readFileSync } from 'fs';
import path from 'path';

type Cookie = Parameters<BrowserContext['addCookies']>[0][number];

export const TEST_ACCOUNTS = {
  client: { phone: '9300000099', name: 'Client two', otp: '123456' },
  client2: { phone: '9200000001', name: 'TestClient One', otp: '123456' },
  trainer: { phone: '9200000002', name: 'VinothTest', otp: '123456' },
  assessor: { phone: '9500000001', name: 'Assessment Team', otp: '123456' },
};

export type Role = keyof typeof TEST_ACCOUNTS;

// Where the setup project saves one Supabase session per role.
export const AUTH_DIR = path.resolve(process.cwd(), 'e2e/.auth');
export const stateFile = (role: Role) => path.join(AUTH_DIR, `${role}.json`);

// Landing route per role — mirrors the post-login redirect in SignUpScreen.
const LANDING: Record<Role, string> = {
  client: '/client/dashboard',
  client2: '/client/dashboard',
  trainer: '/trainer/dashboard',
  assessor: '/assessment/dashboard',
};

/**
 * Full UI OTP login. Hits Supabase auth twice per call (signUp + signIn), so it
 * is rate-limited per IP. Used ONCE per role by e2e/auth.setup.ts to mint a
 * session — never call it from individual tests (that is what loginAs is for).
 */
export async function uiLogin(page: Page, role: Role) {
  const account = TEST_ACCOUNTS[role];
  await page.goto('/signup');
  await page.waitForLoadState('networkidle');

  // Fill name + phone
  const nameInput = page.locator('input[placeholder*="name"], input[type="text"]').first();
  await nameInput.fill(account.name);
  const phoneInput = page.locator('input[placeholder*="phone"], input[type="tel"]').first();
  await phoneInput.fill(account.phone);

  // Check terms checkbox if visible
  const checkbox = page.locator('input[type="checkbox"]').first();
  if (await checkbox.isVisible()) await checkbox.check();

  // Click continue / send OTP
  await page.locator('button:has-text("Continue"), button:has-text("Send OTP")').first().click();
  await page.waitForTimeout(1000);

  // Fill OTP (6 individual inputs)
  const otpInputs = page.locator('input[maxlength="1"]');
  const count = await otpInputs.count();
  if (count === 6) {
    for (let i = 0; i < 6; i++) {
      await otpInputs.nth(i).fill(account.otp[i]);
    }
  } else {
    // Single OTP input
    await page.locator('input[placeholder*="OTP"], input[placeholder*="otp"]').first().fill(account.otp);
  }

  await page.waitForURL(/\/(client|trainer|assessment)\//, { timeout: 15000 });
}

/**
 * Fast login used by every test. Replays the cached Supabase session (saved by
 * the setup project) into localStorage BEFORE any app script runs — Supabase
 * persists its session there — then navigates straight to the role's landing
 * screen. Makes zero auth network calls, so it never trips Supabase's per-IP
 * rate limit no matter how many tests run in parallel.
 */
export async function loginAs(page: Page, role: Role) {
  const state = JSON.parse(readFileSync(stateFile(role), 'utf-8')) as {
    cookies?: Cookie[];
    origins?: Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }>;
  };

  const entries = state.origins?.[0]?.localStorage ?? [];
  // addInitScript runs before the page's own scripts on every navigation, so
  // the session is in place when the Supabase client initializes.
  await page.context().addInitScript((items: Array<{ name: string; value: string }>) => {
    for (const { name, value } of items) window.localStorage.setItem(name, value);
  }, entries);

  if (state.cookies && state.cookies.length) await page.context().addCookies(state.cookies);

  await page.goto(LANDING[role]);
  await page.waitForLoadState('networkidle');
}

export async function logout(page: Page) {
  await page.goto('/signup');
  await page.waitForLoadState('networkidle');
}
