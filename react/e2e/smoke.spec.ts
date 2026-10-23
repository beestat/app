import { expect, test } from '@playwright/test';

test('dashboard renders the primary navigation and cards', async ({ page }) => {
  test.skip(!process.env.BEESTAT_FORCE_LOGIN_URL, 'Set BEESTAT_FORCE_LOGIN_URL for authenticated QA.');
  await page.goto(process.env.BEESTAT_FORCE_LOGIN_URL!);
  await page.goto('/react/index.php');
  await expect(page.getByRole('link', { name: /beestat/i })).toBeVisible();
  await expect(page.getByText('Thermostat Detail')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Sensors')).toBeVisible();
  await expect(page.getByText('Alerts')).toBeVisible();
});
