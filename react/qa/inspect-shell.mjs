import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 1440, height: 1000 } });
const errors = [];
const failedResponses = [];
const page = await context.newPage();
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });
await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('System - Ziebee II', { exact: true }).waitFor({ timeout: 90_000 });
const desktopNavigation = await page.locator('nav').first().getByRole('link').allTextContents();
const activeDesktopRoute = await page.locator('a[aria-current="page"]').first().textContent();
await page.getByRole('button', { name: 'Open menu' }).click();
const menuItems = await page.getByRole('menuitem').allTextContents();
const menuBadges = await page.locator('.MuiMenu-root .MuiBadge-badge').allTextContents();
const menuGeometry = await page.evaluate(() => {
  const button = document.querySelector('button[aria-label="Open menu"]')?.getBoundingClientRect();
  const paper = document.querySelector('.MuiMenu-paper')?.getBoundingClientRect();
  const item = document.querySelector('.MuiMenuItem-root');
  const icon = item?.firstElementChild?.getBoundingClientRect();
  const text = item ? [...item.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) : undefined;
  const range = text ? document.createRange() : undefined;
  if (text) range.selectNodeContents(text);
  const label = range?.getBoundingClientRect();
  return { rightEdgeDelta: button && paper ? Math.round(paper.right - button.right) : null, iconLabelGap: icon && label ? Math.round(label.left - icon.right) : null };
});
await page.screenshot({ path: 'test-results/parity/react-shell-menu.png', fullPage: true });
await page.getByRole('menuitem', { name: /Announcements/ }).click();
await page.getByRole('dialog', { name: 'Announcements' }).waitFor();
const announcements = { dialog: await page.getByRole('dialog', { name: 'Announcements' }).isVisible(), route: new URL(page.url()).hash };
await page.keyboard.press('Escape');

const mobile = await context.newPage();
await mobile.setViewportSize({ width: 320, height: 844 });
await mobile.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await mobile.getByText('System - Ziebee II', { exact: true }).waitFor({ timeout: 90_000 });
const mobileNavigation = await mobile.locator('nav').last().getByRole('link').allTextContents();
const visibleMobileNavigation = await mobile.locator('nav').last().getByRole('link').evaluateAll((links) => links.filter((link) => { const rect = link.getBoundingClientRect(); return rect.width > 0 && rect.height > 0; }).length);
const activeMobileRoute = await mobile.locator('nav').last().locator('a[aria-current="page"]').textContent();
await mobile.getByRole('button', { name: 'Open menu' }).click();
const mobileMenuItems = await mobile.getByRole('menuitem').allTextContents();
await mobile.screenshot({ path: 'test-results/parity/react-shell-menu-mobile.png', fullPage: true });

if (!announcements.dialog || announcements.route !== '#/detail' || visibleMobileNavigation !== 5 || Math.abs(menuGeometry.rightEdgeDelta ?? 99) > 2 || (menuGeometry.iconLabelGap ?? 0) < 10) throw new Error(JSON.stringify({ announcements, visibleMobileNavigation, menuGeometry }));
console.log(JSON.stringify({ desktopNavigation, activeDesktopRoute, menuItems, menuBadges, menuGeometry, announcements, mobileNavigation, visibleMobileNavigation, activeMobileRoute, mobileMenuItems, errors, failedResponses }, null, 2));
await browser.close();
