import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 }, storageState: 'test-results/auth-state.json' });
const results = [];
for (const [kind, enrollmentUrl, reportUrl] of [
  ['legacy', 'https://dev.app.beestat.io/?layer=glenwood_enroll', 'https://dev.app.beestat.io/?layer=detail'],
  ['react', 'https://dev.app.beestat.io/react/index.php#/glenwood-enrollment', 'https://dev.app.beestat.io/react/index.php#/glenwood-report'],
]) {
  const page = await context.newPage();
  for (const [pageName, url, titles] of [['enrollment', enrollmentUrl, ['Privacy', 'Enrollment']], ['report', reportUrl, ['Run Report']]]) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    if (kind === 'legacy' && pageName === 'report') {
      await page.getByText('System - Ziebee II', { exact: true }).waitFor({ timeout: 90_000 });
      await page.mouse.click(1408, 32);
      await page.getByText('Glenwood Report', { exact: true }).click();
    }
    await page.getByText(titles[0], { exact: true }).first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(250);
    results.push(await page.evaluate(({ kind, pageName, titles }) => {
      const rect = (element) => { const box = element?.getBoundingClientRect(); return box && Object.fromEntries(['x', 'y', 'width', 'height', 'right', 'bottom'].map((key) => [key, Math.round(box[key] * 10) / 10])); };
      const exact = (text) => [...document.querySelectorAll('*')].find((element) => element.children.length === 0 && element.textContent?.trim() === text);
      const card = (title) => {
        let element = exact(title);
        if (kind === 'react') {
          element = [...document.querySelectorAll('*')].find((candidate) => candidate.children.length === 0 && candidate.textContent?.trim() === title && candidate.closest('.MuiCard-root'));
          return rect(element?.closest('.MuiCard-root'));
        }
        while (element?.parentElement && element.parentElement.getBoundingClientRect().width < innerWidth - 40) element = element.parentElement;
        return rect(element?.parentElement);
      };
      return { kind, pageName, cards: Object.fromEntries(titles.map((title) => [title, card(title)])), controls: [...document.querySelectorAll('input, button')].map(rect) };
    }, { kind, pageName, titles }));
  }
  await page.close();
}

console.log(JSON.stringify(results, null, 2));
const legacy = results.filter((result) => result.kind === 'legacy');
const react = results.filter((result) => result.kind === 'react');
for (const legacyPage of legacy) {
  const reactPage = react.find((result) => result.pageName === legacyPage.pageName);
  for (const [title, legacyCard] of Object.entries(legacyPage.cards)) {
    const reactCard = reactPage.cards[title];
    if (Math.abs(reactCard.y - legacyCard.y) > 3 || Math.abs(reactCard.height - legacyCard.height) > 3) throw new Error(`${title} geometry differs: ${JSON.stringify({ legacyCard, reactCard })}`);
  }
}
await browser.close();
