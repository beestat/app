import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  storageState: 'test-results/auth-state.json',
  viewport: { width: 390, height: 844 },
});

await context.route('**/api/', async (route) => {
  let calls = [];
  try {
    const request = JSON.parse(route.request().postData() ?? '{}');
    calls = request.batch ? JSON.parse(request.batch) : [request];
  } catch { return route.continue(); }
  if (!calls.some((call) => call.alias === 'user')) return route.continue();
  const response = await route.fetch();
  const payload = await response.json();
  payload.data.stripe_event = {};
  const user = payload.data.user?.settings ? payload.data.user : Object.values(payload.data.user ?? {})[0];
  if (user) user.patreon_status = null;
  return route.fulfill({ response, contentType: 'application/json', body: JSON.stringify(payload) });
});

const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.goto('https://dev.app.beestat.io/react/index.php#/contribute', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByRole('button', { name: 'Continue to Payment' }).waitFor({ timeout: 90_000 });
await page.evaluate(() => {
  window.__openedByContributionTest = [];
  window.open = (...args) => { window.__openedByContributionTest.push(args); return null; };
});

await page.getByText('Give $24.00 / year until I cancel.', { exact: true }).waitFor();
await page.getByRole('button', { name: '$3.00 / month' }).click();
await page.getByRole('button', { name: 'Give Monthly' }).click();
await page.getByText('Give $3.00 / month until I cancel.', { exact: true }).waitFor();
await page.getByRole('button', { name: 'Continue to Payment' }).click();

const options = page.getByRole('button', { name: 'More ways to contribute' });
await options.click();
await page.getByRole('menuitem', { name: 'One-Time Gift' }).click();
await page.getByRole('button', { name: 'Connect Account' }).click();
await page.getByRole('button', { name: /Buy Sticker 2-Pack/ }).click();

const opened = await page.evaluate(() => window.__openedByContributionTest.map(([url, target, features]) => ({ url, target, features })));
if (opened.length !== 4) throw new Error(`Contribution actions did not open four destinations: ${JSON.stringify(opened)}`);

const payment = new URL(opened[0].url, page.url());
if (payment.searchParams.get('resource') !== 'stripe_payment_link' || payment.searchParams.get('method') !== 'open') throw new Error(`Wrong recurring payment endpoint: ${opened[0].url}`);
const paymentArguments = JSON.parse(payment.searchParams.get('arguments'));
const paymentAttributes = paymentArguments.attributes;
if (paymentAttributes.amount !== 300 || paymentAttributes.currency !== 'usd' || paymentAttributes.interval !== 'month' || !paymentAttributes.prefilled_email || Number(paymentAttributes.client_reference_id) !== 1) throw new Error(`Wrong recurring payment attributes: ${JSON.stringify(paymentAttributes)}`);

const oneTime = new URL(opened[1].url);
if (oneTime.host !== 'donate.stripe.com' || !oneTime.pathname.includes('test_') || oneTime.searchParams.get('prefilled_email') !== paymentAttributes.prefilled_email || Number(oneTime.searchParams.get('client_reference_id')) !== 1) throw new Error(`Wrong one-time gift URL: ${opened[1].url}`);

const patreon = new URL(opened[2].url, page.url());
if (patreon.searchParams.get('resource') !== 'patreon' || patreon.searchParams.get('method') !== 'authorize') throw new Error(`Wrong Patreon authorization URL: ${opened[2].url}`);

const merchandise = new URL(opened[3].url);
if (merchandise.host !== 'buy.stripe.com' || !merchandise.pathname.includes('test_') || merchandise.searchParams.get('prefilled_email') !== paymentAttributes.prefilled_email) throw new Error(`Wrong merchandise URL: ${opened[3].url}`);
if (opened.some((item) => item.target !== '_blank') || errors.length) throw new Error(`Contribution interaction errors: ${JSON.stringify({ opened, errors })}`);

console.log(JSON.stringify({ recurring: paymentAttributes, oneTime: oneTime.pathname, patreon: true, merchandise: merchandise.pathname, errors }, null, 2));
await browser.close();
