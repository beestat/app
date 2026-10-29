import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  storageState: 'test-results/auth-state.json',
  viewport: { width: 390, height: 844 },
});
const writes = [];

await context.route('**/api/', async (route) => {
  let calls = [];
  try {
    const payload = JSON.parse(route.request().postData() ?? '{}');
    const batch = payload.batch ? JSON.parse(payload.batch) : undefined;
    calls = batch ? (Array.isArray(batch) ? batch : Object.values(batch)) : [payload];
  } catch {
    return route.continue();
  }
  const intercepted = calls.filter((call) =>
    (call?.resource === 'user' && call?.method === 'update_setting')
    || (call?.resource === 'thermostat' && call?.method === 'set_reported_system_types'));
  if (!intercepted.length) return route.continue();
  for (const call of intercepted) {
    writes.push({
      resource: call.resource,
      method: call.method,
      arguments: typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments,
    });
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
});

const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/compare', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Comparison Settings', { exact: true }).waitFor({ timeout: 90_000 });
await page.locator('[role="progressbar"]').first().waitFor({ state: 'detached', timeout: 90_000 }).catch(() => {});

await page.getByRole('button', { name: 'Global', exact: true }).click();
await page.getByRole('button', { name: 'All', exact: true }).click();
if (!await page.getByText('Any property type', { exact: true }).isVisible()
  || !await page.getByText('Any region', { exact: true }).isVisible()) {
  throw new Error('Comparison filters did not immediately update their legacy summary.');
}

await page.getByRole('button', { name: 'My Home options' }).click();
const help = page.getByRole('menuitem', { name: 'Help', exact: true });
if (await help.getAttribute('href') !== 'https://doc.beestat.io/cc594772031e41a58ff38e04e66cf0ec') {
  throw new Error(`My Home help URL differs from legacy: ${await help.getAttribute('href')}`);
}
await page.getByRole('menuitem', { name: 'Change System Type' }).click();

const dialog = page.getByRole('dialog', { name: 'Change System Type' });
await dialog.waitFor();
const expectedOptions = { Heat: 7, 'Auxiliary Heat': 4, Cool: 3 };
for (const [title, count] of Object.entries(expectedOptions)) {
  const section = dialog.getByText(title, { exact: true }).locator('..');
  if (await section.getByRole('button').count() !== count) {
    throw new Error(`${title} system type options differ from legacy.`);
  }
}
if (await dialog.getByRole('button', { name: /\[Detected\]/ }).count() < 2) {
  throw new Error('Detected system types are not identified in the dialog.');
}

const heatSection = dialog.getByText('Heat', { exact: true }).locator('..');
const heatButtons = heatSection.getByRole('button');
let replacement;
for (let index = 0; index < await heatButtons.count(); index += 1) {
  const button = heatButtons.nth(index);
  if (await button.getAttribute('aria-pressed') === 'false') {
    replacement = (await button.innerText()).replace(' [Detected]', '').toLowerCase();
    await button.click();
    break;
  }
}
if (!replacement) throw new Error('Could not choose a different heat system type.');
await dialog.getByRole('button', { name: 'Save', exact: true }).click();
await dialog.waitFor({ state: 'detached' });

const settingWrites = writes.filter((write) => write.method === 'update_setting');
const systemWrite = writes.find((write) => write.method === 'set_reported_system_types');
if (!settingWrites.some((write) => write.arguments?.key === 'comparison_region' && write.arguments?.value === 'global')
  || !settingWrites.some((write) => write.arguments?.key === 'comparison_property_type' && write.arguments?.value === 'all')) {
  throw new Error(`Comparison setting writes differ from legacy: ${JSON.stringify(settingWrites)}`);
}
if (Number(systemWrite?.arguments?.thermostat_id) !== 34012
  || systemWrite?.arguments?.system_types?.heat !== replacement
  || !['gas', 'electric', 'oil', 'none'].includes(systemWrite?.arguments?.system_types?.auxiliary_heat)
  || !['compressor', 'geothermal', 'none'].includes(systemWrite?.arguments?.system_types?.cool)) {
  throw new Error(`System type write differs from legacy: ${JSON.stringify(systemWrite)}`);
}

console.log(JSON.stringify({ filters: ['global', 'all'], dialogOptions: expectedOptions, replacement, writes }, null, 2));
await browser.close();
