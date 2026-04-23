import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/login/);
  });

  test('shows TCG branding', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('TCG')).toBeVisible();
    await expect(page.getByText('FreightBroker')).toBeVisible();
  });

  test('shows login form elements', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('PIN')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill('nonexistent');
    await page.getByLabel('PIN').fill('0000');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(
      page.getByText(/invalid username or pin/i),
    ).toBeVisible({ timeout: 8000 });
  });

  test('sign-in button is disabled while loading', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill('martymeddles');
    await page.getByLabel('PIN').fill('1234');

    // Intercept the auth request so it hangs long enough to observe loading state
    await page.route('**/api/auth/login', (route) => {
      // delay response to allow checking the loading state
      setTimeout(() => route.continue(), 3000);
    });

    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('button', { name: /signing in/i })).toBeDisabled();
  });
});
