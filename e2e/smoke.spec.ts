import { test, expect } from '@playwright/test';
import { loginAs, TEST_ACCOUNTS } from './helpers/auth';

test.describe('smoke', () => {
  test('signup screen loads', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByText('WellnessConnect')).toBeVisible();
    await expect(page.getByText('Step 1 of 4')).toBeVisible();
    await expect(page.getByPlaceholder(/name/i)).toBeVisible();
  });

  test('test accounts are defined', async () => {
    expect(Object.keys(TEST_ACCOUNTS)).toContain('client');
    expect(TEST_ACCOUNTS.trainer.phone).toMatch(/^\d{10}$/);
  });
});

// Example of using the shared login helper. Tagged so it can be skipped while
// the dev OTP/redirect flow is being finalized: `npx playwright test --grep-invert @auth`
test('@auth client can sign in', async ({ page }) => {
  await loginAs(page, 'client');
  await expect(page).toHaveURL(/\/client\//);
});
