import '@mui/material/styles';
import type { PaletteColor, PaletteColorOptions } from '@mui/material/styles';
import type { BeestatColorName } from './theme';

declare module '@mui/material/styles' {
  interface Theme { name: string; label: string; }
  interface ThemeOptions { name?: string; label?: string; }
  interface Palette {
    appBar: PaletteColor;
    colors: Record<BeestatColorName, PaletteColor>;
    surface: { raised: string; subtle: string; chart: string; tooltip: string };
  }
  interface PaletteOptions {
    appBar?: PaletteColorOptions;
    colors?: Partial<Record<BeestatColorName, PaletteColorOptions>>;
    surface?: Partial<{ raised: string; subtle: string; chart: string; tooltip: string }>;
  }
}

export {};
