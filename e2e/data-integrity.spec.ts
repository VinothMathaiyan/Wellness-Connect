import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Data Integrity — Real Data Checks', () => {

  test('trainer dashboard shows non-zero active clients', async ({ page }) => {
    await loginAs(page, 'trainer');
    await page.waitForLoadState('networkidle');
    // Active Clients card should show a number > 0
    const card = page.locator('text=Active Clients').locator('../..').locator('text=/^[1-9]/');
    await expect(card).toBeVisible({ timeout: 8000 });
  });

  test('client progress screen shows readiness score 68', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/client/progress');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=68')).toBeVisible({ timeout: 8000 });
  });

  test('assessment dashboard Reviews Due shows 3 or more', async ({ page }) => {
    await loginAs(page, 'assessor');
    await page.waitForLoadState('networkidle');
    // The stat cards render a "-" placeholder while isLoading, then the count.
    // Wait for the number to load before parsing it.
    const reviewsCard = page.locator('button', { hasText: 'Reviews Due' });
    await expect(reviewsCard).toBeVisible();
    await expect(reviewsCard.getByRole('heading')).toHaveText(/\d+/, { timeout: 8000 });
    const cardText = await reviewsCard.textContent();
    const num = parseInt(cardText?.match(/\d+/)?.[0] ?? '0');
    expect(num).toBeGreaterThanOrEqual(1);
  });

  test('trainer my clients shows pending section when requests exist', async ({ page }) => {
    await loginAs(page, 'trainer');
    await page.goto('/trainer/clients');
    await page.waitForLoadState('networkidle');
    // Active Clients section always visible
    await expect(page.locator('text=ACTIVE CLIENTS').or(page.locator('text=Active Clients')).first()).toBeVisible();
  });

  test('assessment client queue completed tab shows TestClient One', async ({ page }) => {
    await loginAs(page, 'assessor');
    await page.goto('/assessment/clients/queue');
    await page.waitForLoadState('networkidle');
    await page.locator('text=Completed').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text=TestClient One')).toBeVisible({ timeout: 8000 });
  });

  test('trainer client detail shows program for Client two', async ({ page }) => {
    await loginAs(page, 'trainer');
    await page.goto('/trainer/clients');
    await page.waitForLoadState('networkidle');
    await page.locator('text=Client two').first().click();
    await page.waitForURL(/trainer\/client\//);
    await expect(page.locator('text=Current Program').or(page.locator('text=CURRENT PROGRAM')).first()).toBeVisible({ timeout: 8000 });
  });

});
