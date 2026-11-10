import { describe, expect, it } from 'vitest';
import { migrateLegacyUrl, routerBasename } from './appUrl';

const at = (pathname: string, search = '', hash = '') => ({ pathname, search, hash });

describe('routerBasename', () => {
  it('uses the index.php prefix only when the page was reached through it', () => {
    expect(routerBasename('/analyze')).toBe('');
    expect(routerBasename('/')).toBe('');
    expect(routerBasename('/index.php')).toBe('/index.php');
    expect(routerBasename('/index.php/air-quality')).toBe('/index.php');
    expect(routerBasename('/index.phpx')).toBe('');
  });
});

describe('migrateLegacyUrl', () => {
  it('leaves clean URLs alone', () => {
    expect(migrateLegacyUrl(at('/analyze', '?platform=ios'))).toBeUndefined();
  });

  it('moves former hash routes to paths and keeps their query', () => {
    expect(migrateLegacyUrl(at('/', '', '#/air-quality'))).toBe('/air-quality');
    expect(migrateLegacyUrl(at('/', '?platform=ios', '#/visualize?embedded=1'))).toBe('/visualize?platform=ios&embedded=1');
  });

  it('maps classic ?layer= links to the shared path', () => {
    expect(migrateLegacyUrl(at('/', '?layer=air_quality&platform=android'))).toBe('/air-quality?platform=android');
    expect(migrateLegacyUrl(at('/index.php', '?layer=glenwood_enroll'))).toBe('/index.php/glenwood');
    expect(migrateLegacyUrl(at('/', '?layer=unknown'))).toBeUndefined();
  });
});
