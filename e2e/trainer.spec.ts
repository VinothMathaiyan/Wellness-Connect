import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Trainer App', () => {

  test('lands on trainer dashboard after login', async ({ page }) => {
    await loginAs(page, 'trainer');
    await expect(page).toHaveURL(/trainer\/dashboard/);
    await expect(page.locator('text=VinothTest')).toBeVisible();
  });

  test('dashboard shows active clients count > 0', async ({ page }) => {
    await loginAs(page, 'trainer');
    await expect(page.locator('text=Active Clients')).toBeVisible();
  });

  test('dashboard shows this week check-ins strip', async ({ page }) => {
    await loginAs(page, 'trainer');
    await expect(page.locator("text=This Week")).toBeVisible();
  });

  test('my clients screen shows active clients', async ({ page }) => {
    await loginAs(page, 'trainer');
    await page.goto('/trainer/clients');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Client two')).toBeVisible();
    await expect(page.locator('text=TestClient One')).toBeVisible();
  });

  test('client detail screen loads', async ({ page }) => {
    await loginAs(page, 'trainer');
    await page.goto('/trainer/clients');
    await page.waitForLoadState('networkidle');
    await page.locator('text=Client two').first().click();
    await page.waitForURL(/trainer\/client\//);
    await expect(page.locator('text=Readiness').first()).toBeVisible();
  });

  test('risk monitor screen loads', async ({ page }) => {
    await loginAs(page, 'trainer');
    await page.goto('/trainer/risk-monitor');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Risk Monitor').first()).toBeVisible();
  });

  test('client progress view loads', async ({ page }) => {
    await loginAs(page, 'trainer');
    await page.goto('/trainer/clients');
    await page.waitForLoadState('networkidle');
    await page.locator('text=Client two').first().click();
    await page.waitForURL(/trainer\/client\//);
    await page.locator('text=View Full Progress').click();
    await page.waitForURL(/client-progress/);
    await expect(page.locator('text=Progress Overview')).toBeVisible();
  });

  test('trainer bottom nav has correct tabs', async ({ page }) => {
    await loginAs(page, 'trainer');
    // DEV nav bar at the top duplicates these words, so target the last (bottom-nav) match.
    const navLabels = ['Home', 'Clients', 'Risk', 'Schedule', 'Alerts'];
    for (const label of navLabels) {
      await expect(page.locator(`text=${label}`).last()).toBeVisible();
    }
  });

  test('notifications screen loads', async ({ page }) => {
    await loginAs(page, 'trainer');
    await page.goto('/trainer/notifications');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/signup/);
  });

});
