/**
 * URLs and version switching shared with the classic app (js/layer.js).
 *
 * Both apps are served by the root index.php at the same paths, so switching
 * versions keeps the visitor on the same page. Until the server rewrites clean
 * paths to index.php, /index.php/analyze reaches the same page; the router uses
 * that prefix as its basename so links keep working there too.
 */

/** Classic layer name -> shared path. Keep in sync with beestat.layer.paths in js/layer.js. */
export const classicLayerPaths: Record<string, string> = {
  detail: '/detail',
  analyze: '/analyze',
  visualize: '/visualize',
  compare: '/compare',
  air_quality: '/air-quality',
  settings: '/settings',
  contribute: '/contribute',
  glenwood_enroll: '/glenwood',
  glenwood_report: '/glenwood-report',
};

export function routerBasename(pathname = window.location.pathname) {
  return /^\/index\.php(\/|$)/.test(pathname) ? '/index.php' : '';
}

/**
 * Rewrites old-style URLs before the router reads them: the React app's former
 * hash routes (#/air-quality) and classic ?layer=air_quality links.
 */
export function migrateLegacyUrl(location: Pick<Location, 'pathname' | 'search' | 'hash'> = window.location) {
  const basename = routerBasename(location.pathname);
  const query = new URLSearchParams(location.search);
  let path: string | undefined;
  if (location.hash.startsWith('#/')) {
    const [hashPath, hashQuery] = location.hash.slice(1).split('?');
    path = hashPath;
    new URLSearchParams(hashQuery ?? '').forEach((value, key) => query.set(key, value));
  }
  const layer = query.get('layer');
  if (layer && classicLayerPaths[layer]) {
    path ??= classicLayerPaths[layer];
    query.delete('layer');
  }
  if (path == null) return undefined;
  const search = query.toString();
  return `${basename}${path}${search ? `?${search}` : ''}`;
}

export type UiVersion = 'new' | 'classic';
export const uiVersionSetting = 'ui.version';

/** Remembers the choice on this device (read by index.php before either app loads). */
export function rememberUiVersion(version: UiVersion) {
  try { window.localStorage.setItem('beestat.ui', version); } catch { /* Private mode: the account setting still applies. */ }
}
