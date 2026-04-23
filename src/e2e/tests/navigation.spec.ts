import { test, expect } from '@playwright/test';

/** Helper: log in as the primary admin user. */
async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Username').fill('martymeddles');
  await page.getByLabel('PIN').fill('1234');
  await page.getByRole('button', { name: /sign in/i }).click();
  // Wait until we leave the login page
  await expect(page).not.toHaveURL(/login/, { timeout: 8000 });
}

test.describe('Authenticated navigation', () => {
  test('dashboard loads after login', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('top nav contains all primary tabs', async ({ page }) => {
    await loginAsAdmin(page);
    const tabs = ['Dashboard', 'Load Board', 'Contract Tracker', 'Decisions Queue', 'Parameters', 'Integrations'];
    for (const tab of tabs) {
      await expect(page.getByRole('link', { name: tab })).toBeVisible();
    }
  });

  test('navigates to Load Board', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('link', { name: 'Load Board' }).click();
    await expect(page).toHaveURL('/board');
  });

  test('navigates to Contract Tracker', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('link', { name: 'Contract Tracker' }).click();
    await expect(page).toHaveURL('/tracker');
  });

  test('navigates to Decisions Queue', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('link', { name: 'Decisions Queue' }).click();
    await expect(page).toHaveURL('/decisions');
  });

  test('navigates to Parameters', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('link', { name: 'Parameters' }).click();
    await expect(page).toHaveURL('/parameters');
  });
});
