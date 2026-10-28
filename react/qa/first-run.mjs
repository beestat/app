import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, storageState: 'test-results/auth-state.json' });
const calls = [];
await context.route('**/api/', async (route) => {
  let payload;
  try { payload = JSON.parse(route.request().postData() ?? '{}'); } catch { return route.continue(); }
  let batch = [payload];
  try { if (payload.batch) batch = JSON.parse(payload.batch); } catch { /* retain single call */ }
  if (batch.some((call) => call.resource === 'announcement')) {
    const response = await route.fetch();
    const body = await response.json();
    const users = body.data?.user?.settings ? [body.data.user] : Object.values(body.data?.user ?? {});
    for (const user of users) { user.settings.first_run = true; user.settings.last_read_announcement_id = 0; }
    return route.fulfill({ response, contentType: 'application/json', body: JSON.stringify(body) });
  }
  const intercepted = batch.filter((call) => (call.resource === 'user' && call.method === 'update_setting') || (call.resource === 'mailgun' && call.method === 'subscribe'));
  if (intercepted.length) {
    calls.push(...intercepted);
    const subscribed = intercepted.some((call) => call.resource === 'mailgun');
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: subscribed ? { subscribed: true } : {} }) });
  }
  return route.continue();
});

const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
const dialog = page.getByRole('dialog', { name: 'Newsletter' });
await dialog.waitFor({ timeout: 30_000 });
if (await page.getByRole('dialog', { name: 'Announcements' }).count()) throw new Error('Announcements opened over the first-run newsletter.');
await dialog.getByLabel('Email address').fill('invalid');
await dialog.getByRole('button', { name: 'Subscribe' }).click();
await dialog.getByText('Invalid email address.', { exact: true }).waitFor();
await dialog.getByLabel('Email address').fill('qa@example.com');
await dialog.getByRole('button', { name: 'Subscribe' }).click();
await dialog.getByText('You are now subscribed to the beestat newsletter!', { exact: true }).waitFor();
const firstRunCall = calls.find((call) => call.resource === 'user');
const subscribeCall = calls.find((call) => call.resource === 'mailgun');
const parsed = (call) => typeof call?.arguments === 'string' ? JSON.parse(call.arguments) : call?.arguments;
if (parsed(firstRunCall)?.key !== 'first_run' || parsed(firstRunCall)?.value !== false) throw new Error(`Missing first-run persistence: ${JSON.stringify(firstRunCall)}`);
if (parsed(subscribeCall)?.email_address !== 'qa@example.com') throw new Error(`Wrong newsletter subscription: ${JSON.stringify(subscribeCall)}`);
const geometry = await dialog.evaluate((element) => { const rect = element.getBoundingClientRect(); return { left: rect.left, right: rect.right, viewport: innerWidth }; });
if (geometry.left < 0 || geometry.right > geometry.viewport) throw new Error(`Newsletter overflows mobile: ${JSON.stringify(geometry)}`);
await dialog.getByRole('button', { name: 'Close' }).click();

console.log(JSON.stringify({ firstRunPersisted: true, subscribedIntercepted: true, validation: true, geometry }, null, 2));
await browser.close();
