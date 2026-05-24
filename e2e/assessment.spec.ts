import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Assessment App', () => {

  test('assessor lands on assessment dashboard', async ({ page }) => {
    await loginAs(page, 'assessor');
    await expect(page).toHaveURL(/assessment\/dashboard/);
    await expect(page.locator('text=Assessment Command Center')).toBeVisible();
  });

  test('dashboard stats cards are visible', async ({ page }) => {
    await loginAs(page, 'assessor');
    // exact match: the urgent banner repeats these words lowercase
    // (e.g. "13 open escalations"), which a loose text= match collides with.
    await expect(page.getByText('New Clients', { exact: true })).toBeVisible();
    await expect(page.getByText('Open Escalations', { exact: true })).toBeVisible();
    await expect(page.getByText('Trainer Approvals', { exact: true })).toBeVisible();
    await expect(page.getByText('Reviews Due', { exact: true })).toBeVisible();
  });

  test('client queue shows pending and completed tabs', async ({ page }) => {
    await loginAs(page, 'assessor');
    await page.goto('/assessment/clients/queue');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Client Queue').first()).toBeVisible();
    await expect(page.locator('text=Pending').first()).toBeVisible();
    await expect(page.locator('text=Completed').first()).toBeVisible();
  });

  test('completed tab shows assessed clients', async ({ page }) => {
    await loginAs(page, 'assessor');
    await page.goto('/assessment/clients/queue');
    await page.waitForLoadState('networkidle');
    await page.locator('text=Completed').first().click();
    await expect(page.locator('text=COMPLETED').first()).toBeVisible();
  });

  test('assessment form loads for a client', async ({ page }) => {
    await loginAs(page, 'assessor');
    await page.goto('/assessment/clients/queue');
    await page.waitForLoadState('networkidle');
    // Each queue entry is a <button> with an uppercase "PENDING" status badge
    // (the lowercase "Pending" tab is excluded by the case-sensitive regex).
    const pendingCards = page.getByRole('button').filter({ hasText: /PENDING/ });
    const cardCount = await pendingCards.count();
    if (cardCount > 0) {
      await pendingCards.first().click();
      await page.waitForURL(/assessment\/assess\//, { timeout: 10000 });
      await expect(page.locator('text=Fitness Level')).toBeVisible();
      await expect(page.locator('text=Clearance Status')).toBeVisible();
    } else {
      test.skip(); // no pending clients right now
    }
  });

  test('escalations screen loads with filter tabs', async ({ page }) => {
    await loginAs(page, 'assessor');
    await page.goto('/assessment/escalations');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Escalations').first()).toBeVisible();
    await expect(page.locator('text=Open').first()).toBeVisible();
    await expect(page.locator('text=Reviewing').first()).toBeVisible();
    await expect(page.locator('text=Resolved').first()).toBeVisible();
  });

  test('messages screen loads with threads', async ({ page }) => {
    await loginAs(page, 'assessor');
    await page.goto('/assessment/messages');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Messages').first()).toBeVisible();
  });

  test('message thread opens on tap', async ({ page }) => {
    await loginAs(page, 'assessor');
    await page.goto('/assessment/messages');
    await page.waitForLoadState('networkidle');
    const firstThread = page.locator('[class*="card"], [class*="row"]').first();
    if (await firstThread.isVisible()) {
      await firstThread.click();
      await page.waitForURL(/assessment\/messages\/.+/);
      await expect(page.locator('text=Assessment conversation').first()).toBeVisible();
    }
  });

  test('monthly reviews shows due clients', async ({ page }) => {
    await loginAs(page, 'assessor');
    await page.goto('/assessment/monthly-reviews');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Monthly Reviews').first()).toBeVisible();
    await expect(page.locator('text=Due').first()).toBeVisible();
  });

  test('trainer approvals screen loads', async ({ page }) => {
    await loginAs(page, 'assessor');
    await page.goto('/assessment/trainer-approvals');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Trainer Approvals')).toBeVisible();
  });

  test('assessment bottom nav has correct tabs', async ({ page }) => {
    await loginAs(page, 'assessor');
    // DEV nav bar at the top duplicates these words, so target the last (bottom-nav) match.
    const assessmentNavLabels = ['Clients', 'Escalations', 'Messages'];
    for (const label of assessmentNavLabels) {
      await expect(page.locator(`text=${label}`).last()).toBeVisible();
    }
  });

});
