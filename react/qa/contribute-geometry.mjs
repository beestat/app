import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json' });
const results = [];
for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  for (const [kind, url] of [['legacy', 'https://dev.app.beestat.io/?layer=contribute'], ['react', 'https://dev.app.beestat.io/react/index.php#/contribute']]) {
    const page = await context.newPage();
    await page.setViewportSize(viewport);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.getByText('Recurring Contribution Status', { exact: true }).waitFor({ timeout: 90_000 });
    await page.waitForTimeout(500);
    results.push(await page.evaluate(({ kind, viewport }) => {
      const rect = (element) => { const box = element?.getBoundingClientRect(); return box && Object.fromEntries(['x', 'y', 'width', 'height', 'right', 'bottom'].map((key) => [key, Math.round(box[key] * 10) / 10])); };
      const exactText = (text) => [...document.querySelectorAll('*')].find((element) => element.children.length === 0 && element.textContent?.trim() === text);
      const cardFor = (title) => { let element = exactText(title); while (element?.parentElement && element.parentElement.getBoundingClientRect().width < innerWidth - 40) element = element.parentElement; return rect(element); };
      return {
        kind, viewport,
        cards: ['Contribute', 'Benefits', 'Recurring Contribution Status', 'Merch!'].map((title) => [title, cardFor(title)]),
        buttons: [...document.querySelectorAll('button, a')].filter((element) => /Join the|One-Time Gift|Manage Support|Buy Sticker/.test(element.textContent ?? '')).map((element) => [element.textContent?.trim(), rect(element)]),
        images: [...document.querySelectorAll('img')].filter((element) => /sticker/i.test(element.alt)).map(rect),
        statusAncestors: ['Supporter', 'Not a Supporter'].map((text) => {
          let element = exactText(text);
          return [text, Array.from({ length: 4 }, () => { element = element?.parentElement; return rect(element); })];
        }),
        textRects: ['Supporter', 'Not a Supporter', 'Manage Support'].map((text) => [text, [...document.querySelectorAll('*')].filter((element) => element.children.length === 0 && element.textContent?.trim() === text).map(rect)]),
      };
    }, { kind, viewport }));
    await page.screenshot({ path: `test-results/parity/${kind}-contribute-${viewport.width}.png`, fullPage: true });
    await page.close();
  }
}
console.log(JSON.stringify(results, null, 2));
for (const viewport of [1440, 390]) {
  const legacy = results.find((result) => result.kind === 'legacy' && result.viewport.width === viewport);
  const react = results.find((result) => result.kind === 'react' && result.viewport.width === viewport);
  const headerOffset = viewport === 390 ? -9 : 0;
  for (const title of ['Contribute', 'Benefits', 'Recurring Contribution Status', 'Merch!']) {
    const legacyCard = legacy.cards.find(([name]) => name === title)[1];
    const reactCard = react.cards.find(([name]) => name === title)[1];
    if (Math.abs(reactCard.y - (legacyCard.y + headerOffset)) > 3) throw new Error(`${title} vertical position differs from legacy at ${viewport}px: ${JSON.stringify({ legacyCard, reactCard, headerOffset })}`);
  }
}
await browser.close();
