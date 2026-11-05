import { getContrastRatio } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { createAppTheme, getAppThemes, getSelectableThemes } from './theme';

describe('application themes', () => {
  it('exposes two base choices backed by four appearance combinations', () => {
    expect(getSelectableThemes().map(({ name }) => name)).toEqual(['beestat', 'midnight']);
    expect(getAppThemes().map(({ name }) => name)).toEqual(['beestat', 'beestat-high-contrast', 'midnight', 'midnight-high-contrast']);
  });

  it.each(getAppThemes().map(({ name }) => name))('%s uses the strongest contrast color for semantic controls', (name) => {
    const theme = createAppTheme(name);
    for (const key of ['primary', 'secondary', 'error', 'warning', 'success', 'info'] as const) {
      const palette = theme.palette[key];
      const selected = getContrastRatio(palette.main, palette.contrastText);
      const strongest = Math.max(getContrastRatio(palette.main, '#fff'), getContrastRatio(palette.main, '#101418'));
      expect(selected).toBeCloseTo(strongest, 4);
      expect(selected).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(getAppThemes().map(({ name }) => name))('%s separates cards from the page without an inset edge', (name) => {
    const definition = getAppThemes().find((candidate) => candidate.name === name)!;
    expect(definition.paper).not.toBe(definition.background);
    const card = createAppTheme(name).components?.MuiCard?.styleOverrides?.root as Record<string, unknown>;
    expect(String(card.boxShadow)).not.toContain('inset');
  });
});
