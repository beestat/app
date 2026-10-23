import { chromium } from 'playwright';
import { createInterface } from 'node:readline';
import { mkdir } from 'node:fs/promises';

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
const iterator = lines[Symbol.asyncIterator]();
process.stdout.write('Force-login URL: ');
const { value: suppliedUrl } = await iterator.next();
lines.close();
if (!/^https?:\/\/dev\.app\.beestat\.io\/api\//.test(suppliedUrl ?? '')) throw new Error('A valid dev force-login URL is required.');

await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await context.newPage();
const loginUrl = suppliedUrl.replace(/^http:/, 'https:');
let failure = '';

for (let attempt = 1; attempt <= 2; attempt += 1) {
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  const sessionCookie = (await context.cookies('https://dev.app.beestat.io')).find((cookie) => cookie.name === 'session_key');
  if (sessionCookie) {
    await context.storageState({ path: 'test-results/auth-state.json' });
    console.log(`authenticated on attempt ${attempt}`);
    await browser.close();
    process.exit(0);
  }
  const body = (await page.locator('body').innerText().catch(() => '')).slice(0, 500);
  failure = body.includes('Lock wait timeout') ? 'database lock wait timeout' : body || 'no session cookie returned';
  if (attempt < 2) await page.waitForTimeout(2_000);
}

await browser.close();
throw new Error(`Force login failed after 2 attempts: ${failure}`);
