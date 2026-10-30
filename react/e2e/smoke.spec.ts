import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';

// Authenticate with a force-login URL when given, otherwise reuse the session
// saved by qa/compare.mjs or qa/login.mjs.
const authStatePath = 'test-results/auth-state.json';
const forceLoginUrl = process.env.BEESTAT_FORCE_LOGIN_URL;
const hasAuthState = existsSync(authStatePath);

if (!forceLoginUrl && hasAuthState) test.use({ storageState: authStatePath });

test.beforeEach(async ({ page }) => {
  test.skip(!forceLoginUrl && !hasAuthState, 'Set BEESTAT_FORCE_LOGIN_URL or run qa/login.mjs for authenticated QA.');
  if (forceLoginUrl) await page.goto(forceLoginUrl);
});

test('dashboard renders the primary navigation and cards', async ({ page }) => {
  await page.goto('/react/index.php#/detail');
  await expect(page.getByText(/System - Ziebee II/).first()).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole('link', { name: /beestat/i })).toBeVisible();
  await expect(page.getByText('Thermostat Detail')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText('Sensors')).toBeVisible();
  await expect(page.getByText('Alerts')).toBeVisible();
});

const routes = [
  ['analyze', 'Thermostat Summary'],
  ['visualize', 'Visualize Settings'],
  ['compare', 'Comparison Settings'],
  ['air-quality', 'Air Quality Detail'],
  ['settings', 'Manage Thermostats'],
  ['contribute', 'Benefits'],
] as const;

for (const [route, heading] of routes) {
  test(`${route} renders without page errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/react/index.php#/${route}`);
    await expect(page.getByText(heading, { exact: false }).first()).toBeVisible({ timeout: 90_000 });
    expect(errors).toEqual([]);
  });
}
