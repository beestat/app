import { createTheme, getContrastRatio } from '@mui/material/styles';

export const colorNames = ['red', 'orange', 'yellow', 'green', 'teal', 'lightBlue', 'blue', 'purple', 'gray', 'slate'] as const;
export type BeestatColorName = (typeof colorNames)[number];
export type ColorRamp = { light: string; main: string; dark: string };
export type ThemeColors = Record<BeestatColorName, ColorRamp>;

export const colors: ThemeColors = {
  red: { light: '#fc5c65', main: '#eb3b5a', dark: '#c82844' },
  orange: { light: '#fd9644', main: '#fa8231', dark: '#ef6306' },
  yellow: { light: '#fed330', main: '#f7b731', dark: '#f6ae18' },
  green: { light: '#26de81', main: '#20bf6b', dark: '#20b364' },
  teal: { light: '#2bcbba', main: '#0fb9b1', dark: '#00867e' },
  lightBlue: { light: '#45aaf2', main: '#238ac9', dark: '#1272ae' },
  blue: { light: '#4b7bec', main: '#3867d6', dark: '#1f4ebd' },
  purple: { light: '#a55eea', main: '#8854d0', dark: '#6f3bb7' },
  gray: { light: '#d1d8e0', main: '#a5b1c2', dark: '#8c9bb1' },
  slate: { light: '#37474f', main: '#2f3d44', dark: '#263238' },
};

export interface AppThemeDefinition {
  name: string; label: string; mode: 'light' | 'dark'; description: string;
  background: string; paper: string; raised: string; subtle: string; chart: string; tooltip: string;
  textPrimary: string; textSecondary: string; divider: string; appBar: string; appBarText: string;
  primary: string; secondary: string; colors: ThemeColors;
}

const beestatTheme: AppThemeDefinition = {
  name: 'beestat', label: 'Beestat', mode: 'dark', description: 'The familiar Beestat slate palette.',
  background: colors.slate.light, paper: colors.slate.main, raised: '#33444c', subtle: colors.slate.dark,
  chart: colors.slate.main, tooltip: colors.slate.dark, textPrimary: '#ffffff', textSecondary: colors.gray.light,
  divider: 'rgba(209, 216, 224, 0.14)', appBar: colors.slate.light, appBarText: '#ffffff',
  primary: colors.lightBlue.main, secondary: colors.teal.main, colors,
};

const midnightColors: Record<BeestatColorName, ColorRamp> = {
  red: { light: '#ff7b85', main: '#f2556f', dark: '#c83b55' }, orange: { light: '#ffad68', main: '#f58b45', dark: '#ca682e' },
  yellow: { light: '#f8d96b', main: '#eec44e', dark: '#b99634' }, green: { light: '#61d99b', main: '#38c786', dark: '#299864' },
  teal: { light: '#62d8cf', main: '#35bdb6', dark: '#238f8a' }, lightBlue: { light: '#72c4fa', main: '#4ba8e8', dark: '#337fb1' },
  blue: { light: '#7f9ff4', main: '#607fda', dark: '#465fa8' }, purple: { light: '#c18aef', main: '#9f68d3', dark: '#794da4' },
  gray: { light: '#d6dde7', main: '#9ba9ba', dark: '#718094' }, slate: { light: '#202833', main: '#181e27', dark: '#11161d' },
};

const midnightTheme: AppThemeDefinition = {
  name: 'midnight', label: 'Midnight', mode: 'dark', description: 'A quieter, higher-contrast dark theme.',
  background: '#11151b', paper: '#1a2029', raised: '#222b36', subtle: '#151a22', chart: '#1a2029', tooltip: '#0d1117',
  textPrimary: '#e9eef5', textSecondary: '#a4b0bf', divider: 'rgba(233, 238, 245, 0.13)', appBar: '#151a22', appBarText: '#e9eef5',
  primary: midnightColors.lightBlue.main, secondary: midnightColors.teal.main, colors: midnightColors,
};

const daylightColors: Record<BeestatColorName, ColorRamp> = {
  red: { light: '#ef6678', main: '#d9435b', dark: '#ad3046' }, orange: { light: '#f49a58', main: '#dc7431', dark: '#ad5725' },
  yellow: { light: '#e7c555', main: '#c79e21', dark: '#977616' }, green: { light: '#4bc68a', main: '#259e68', dark: '#18764c' },
  teal: { light: '#47c2b8', main: '#218f89', dark: '#166d68' }, lightBlue: { light: '#5aafe8', main: '#287fb9', dark: '#1d608e' },
  blue: { light: '#6e91e8', main: '#4669c4', dark: '#34509a' }, purple: { light: '#ad78dc', main: '#8552b7', dark: '#653d8d' },
  gray: { light: '#8897a8', main: '#687789', dark: '#4d5a68' }, slate: { light: '#e6ebf0', main: '#ffffff', dark: '#d6dde5' },
};

const daylightTheme: AppThemeDefinition = {
  name: 'daylight', label: 'Daylight', mode: 'light', description: 'A clean light palette for bright rooms.',
  background: '#eef2f6', paper: '#ffffff', raised: '#ffffff', subtle: '#e4eaf0', chart: '#ffffff', tooltip: '#263238',
  textPrimary: '#22303a', textSecondary: '#5d6d7a', divider: 'rgba(34, 48, 58, 0.14)', appBar: '#2f3d44', appBarText: '#ffffff',
  primary: daylightColors.lightBlue.main, secondary: daylightColors.teal.main, colors: daylightColors,
};

const trueBlackTheme: AppThemeDefinition = {
  ...midnightTheme, name: 'true-black', label: 'True Black', description: 'An OLED-friendly theme with pure black foundations.',
  background: '#000000', paper: '#080a0d', raised: '#11151a', subtle: '#050607', chart: '#080a0d', tooltip: '#000000', appBar: '#000000',
};

const honeycombTheme: AppThemeDefinition = {
  ...daylightTheme, name: 'honeycomb', label: 'Honeycomb', description: 'A warm, softly tinted take on Beestat.',
  background: '#fff8e7', paper: '#fffdf8', raised: '#ffffff', subtle: '#f5ead2', chart: '#fffdf8', tooltip: '#30291d',
  textPrimary: '#30291d', textSecondary: '#6f6250', divider: 'rgba(48, 41, 29, 0.15)', appBar: '#3d3425', appBarText: '#ffffff',
  primary: daylightColors.orange.main, secondary: daylightColors.purple.main,
};

export function getAppThemes() { return [beestatTheme, midnightTheme, trueBlackTheme, daylightTheme, honeycombTheme]; }
export function getAppThemeDefinition(name?: string) { return getAppThemes().find((candidate) => candidate.name === name) ?? beestatTheme; }
const contrastText = (background: string) => getContrastRatio(background, '#fff') >= 3 ? '#fff' : '#111';

export function createAppTheme(name?: string) {
  const definition = getAppThemeDefinition(name);
  const linkStates = (className: string) => [`a.${className}:link`, `a.${className}:visited`, `a.${className}:focus`, `a.${className}:hover`, `a.${className}:active`].join(',');
  const theme = createTheme({
    palette: {
      mode: definition.mode,
      primary: { main: definition.primary, contrastText: contrastText(definition.primary) }, secondary: { main: definition.secondary, contrastText: contrastText(definition.secondary) },
      error: { ...definition.colors.red, contrastText: contrastText(definition.colors.red.main) }, warning: { ...definition.colors.orange, contrastText: contrastText(definition.colors.orange.main) },
      success: { ...definition.colors.green, contrastText: contrastText(definition.colors.green.main) }, info: { ...definition.colors.lightBlue, contrastText: contrastText(definition.colors.lightBlue.main) },
      divider: definition.divider, background: { default: definition.background, paper: definition.paper },
      text: { primary: definition.textPrimary, secondary: definition.textSecondary },
    },
    shape: { borderRadius: 6 },
    typography: {
      fontFamily: 'Montserrat, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 13,
      fontWeightLight: 300, fontWeightRegular: 400, fontWeightMedium: 500, fontWeightBold: 600,
      body1: { fontSize: '13px', lineHeight: 'normal', fontWeight: 300 }, body2: { fontSize: '13px', lineHeight: 'normal', fontWeight: 300 },
      button: { fontSize: '13px', lineHeight: 'normal', fontWeight: 400 }, caption: { fontSize: '11px', lineHeight: 'normal', fontWeight: 300 },
      overline: { fontSize: '13px', lineHeight: 'normal', fontWeight: 600, letterSpacing: 0, textTransform: 'none' },
      h5: { fontWeight: 500, fontSize: '15px', lineHeight: '24px' }, h6: { fontWeight: 600, fontSize: '14px', lineHeight: '24px' },
    },
    components: {
      MuiCssBaseline: { styleOverrides: {
        html: { backgroundColor: definition.background, colorScheme: definition.mode, '--beestat-surface-tooltip': definition.tooltip, '--beestat-text-primary': definition.textPrimary, '--beestat-text-secondary': definition.textSecondary },
        body: { minWidth: 320 }, '*, *::before, *::after': { boxSizing: 'border-box' }, '.MuiButtonBase-root > input.PrivateSwitchBase-input': { visibility: 'visible' },
        [linkStates('MuiButton-textPrimary')]: { color: definition.primary },
        [linkStates('MuiButton-containedPrimary')]: { color: contrastText(definition.primary) },
        [linkStates('MuiButton-containedSecondary')]: { color: contrastText(definition.secondary) },
        [linkStates('MuiButton-containedSuccess')]: { color: contrastText(definition.colors.green.main) },
        [linkStates('MuiButton-containedError')]: { color: contrastText(definition.colors.red.main) },
        [linkStates('MuiButton-containedWarning')]: { color: contrastText(definition.colors.orange.main) },
        [linkStates('MuiButton-containedInfo')]: { color: contrastText(definition.colors.lightBlue.main) },
        [linkStates('MuiMenuItem-root')]: { color: definition.textPrimary },
      } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiCard: { styleOverrides: { root: { backgroundImage: 'none', boxShadow: definition.mode === 'dark' ? '0 2px 6px rgba(0,0,0,.24)' : '0 2px 10px rgba(34,48,58,.10)' } } },
      MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minHeight: 32, textTransform: 'none' } } },
      MuiToggleButton: { styleOverrides: { root: { minHeight: 32, borderColor: definition.divider, color: definition.textPrimary, fontSize: '13px', fontWeight: 400, textTransform: 'none' } } },
      MuiChip: { styleOverrides: { label: { fontSize: '13px' } } }, MuiIconButton: { defaultProps: { size: 'small' } },
      MuiDialog: { styleOverrides: { paper: { backgroundImage: 'none' } } },
      MuiDialogTitle: { styleOverrides: { root: { fontSize: '16px', fontWeight: 600 } } },
      MuiMenu: { styleOverrides: { paper: { backgroundImage: 'none' } } },
      MuiMenuItem: { styleOverrides: { root: { gap: 12, minHeight: 36 } } },
      MuiListItemIcon: { styleOverrides: { root: { minWidth: 32 } } },
      MuiTooltip: { styleOverrides: { tooltip: { backgroundColor: definition.tooltip, boxShadow: '0 2px 8px rgba(0,0,0,.24)', color: definition.textPrimary, fontSize: '12px', padding: '8px 10px' }, arrow: { color: definition.tooltip } } },
      MuiSnackbarContent: { styleOverrides: { root: { backgroundColor: definition.raised, color: definition.textPrimary } } },
    },
  });
  theme.name = definition.name; theme.label = definition.label;
  theme.palette.appBar = theme.palette.augmentColor({ color: { main: definition.appBar, contrastText: definition.appBarText } });
  theme.palette.colors = Object.fromEntries(Object.entries(definition.colors).map(([key, ramp]) => [key, theme.palette.augmentColor({ color: ramp })])) as typeof theme.palette.colors;
  theme.palette.surface = { raised: definition.raised, subtle: definition.subtle, chart: definition.chart, tooltip: definition.tooltip };
  return theme;
}

export const theme = createAppTheme('beestat');
