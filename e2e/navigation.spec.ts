import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Navigation & Route Guards', () => {

  test('unauthenticated user redirected to signup from client route', async ({ page }) => {
    await page.goto('/client/dashboard');
    await expect(page).toHaveURL(/signup/);
  });

  test('unauthenticated user redirected to signup from trainer route', async ({ page }) => {
    await page.goto('/trainer/dashboard');
    await expect(page).toHaveURL(/signup/);
  });

  test('unauthenticated user redirected to signup from assessment route', async ({ page }) => {
    await page.goto('/assessment/dashboard');
    await expect(page).toHaveURL(/signup/);
  });

  test('assessor cannot access trainer routes', async ({ page }) => {
    await loginAs(page, 'assessor');
    await page.goto('/trainer/dashboard');
    await expect(page).not.toHaveURL(/trainer\/dashboard/);
  });

  test('trainer cannot access client routes', async ({ page }) => {
    await loginAs(page, 'trainer');
    await page.goto('/client/dashboard');
    await expect(page).not.toHaveURL(/client\/dashboard/);
  });

  test('client cannot access trainer routes', async ({ page }) => {
    await loginAs(page, 'client');
    await page.goto('/trainer/dashboard');
    await expect(page).not.toHaveURL(/trainer\/dashboard/);
  });

  test('trainer daily summary navigates correctly', async ({ page }) => {
    await loginAs(page, 'trainer');
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    await page.goto(`/trainer/daily-summary/${dateStr}`);
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/signup/);
  });

});
