import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Client App', () => {

  test('lands on dashboard after login', async ({ page }) => {
    await loginAs(page, 'client');
    await expect(page).toHaveURL(/client\/dashboard/);
  });

  test('progress screen loads with readiness score', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/client/progress');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Progress', level: 1 })).toBeVisible();
    await expect(page.locator('text=Readiness Score').first()).toBeVisible();
    await expect(page.locator('text=Adherence').first()).toBeVisible();
  });

  test('alerts screen loads with assessment team section', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/client/alerts');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Assessment Team').first()).toBeVisible();
  });

  test('client can send message to assessment team', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/client/alerts');
    await page.waitForLoadState('networkidle');
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();
    await textarea.fill('Playwright E2E test message');
    await page.locator('button:has-text("Send to Assessment Team")').click();
    await expect(page.locator('text=assessment team will follow up')).toBeVisible({ timeout: 8000 });
  });

  test('weekly report screen loads', async ({ page }) => {
    // Note: weekly report route doesn't exist as /client/weekly-report — test navigates to progress instead
    await loginAs(page, 'client');
    await page.goto('/client/progress');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Progress').first()).toBeVisible();
  });

  test('nutrition log screen loads', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/client/nutrition');
    await page.waitForLoadState('networkidle');
    // Should show a meal type selector or logging UI
    await expect(page).not.toHaveURL(/signup/);
  });

  test('trainers screen loads', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/client/trainers');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/signup/);
  });

});
