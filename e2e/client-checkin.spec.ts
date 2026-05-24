import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Client — Daily Check-in Flow', () => {
  test('client can log in and reach dashboard', async ({ page }) => {
    await loginAs(page, 'client');
    await expect(page).toHaveURL(/client\/dashboard/);
    await expect(page.getByText('Good')).toBeVisible(); // greeting
  });

  test('client can submit a daily check-in', async ({ page }) => {
    await loginAs(page, 'client');

    // Entry point on the dashboard is a tappable card (div onClick), not a link.
    // The "Daily Tracking" card navigates to /client/check-in.
    await page.getByRole('heading', { name: 'Daily Tracking' }).click();
    await page.waitForURL(/client\/check-in/);

    // The form is 4 steps sharing one primary button: "Next →" on steps 1-3,
    // then "✓ Submit Log" on step 4. Mood/energy/sleep-quality default to 0,
    // which the DB check constraints reject, so a valid value must be picked
    // on each step before submitting.
    const next = page.getByRole('button', { name: /Next/ });

    // Step 1 — Sleep quality (sleep hours defaults to 8h).
    await page.getByRole('button', { name: 'Refreshed' }).click();
    await next.click();

    // Step 2 — Mood.
    await page.getByRole('button', { name: 'Amazing' }).click();
    await next.click();

    // Step 3 — Energy level.
    await page.getByRole('button', { name: 'Excellent' }).click();
    await next.click();

    // Step 4 — Submit.
    await page.getByRole('button', { name: /Submit/ }).click();

    await page.waitForURL(/client\/dashboard/, { timeout: 8000 });
    await expect(page).toHaveURL(/client\/dashboard/);
  });

  test('client can view progress screen', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/client/progress');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Progress', level: 1 })).toBeVisible();
    await expect(page.getByText('Readiness Score')).toBeVisible();
  });

  test('client alerts screen loads with assessment team section', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/client/alerts');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Assessment Team').first()).toBeVisible();
  });
});
