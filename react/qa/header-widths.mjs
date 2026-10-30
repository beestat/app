import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

// Captures the legacy and React headers at the widths where legacy changes layout.
await mkdir('test-results/side-by-side', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json' });
for (const width of [320, 390, 600, 1000]) {
  for (const [kind, url] of [['legacy', 'https://dev.app.beestat.io/'], ['react', 'https://dev.app.beestat.io/react/index.php#/detail']]) {
    const page = await context.newPage();
    await page.setViewportSize({ width, height: 700 });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.getByText(/System - /).first().waitFor({ timeout: 45_000 }).catch(() => console.log(`${kind} ${width}: ready text not found`));
    await page.waitForTimeout(1_000);
    await page.screenshot({ path: `test-results/side-by-side/header-${kind}-${width}.png`, clip: { x: 0, y: 0, width, height: 64 } });
    await page.close();
    console.log(`${kind} ${width}`);
  }
}
await browser.close();
