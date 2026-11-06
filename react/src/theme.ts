import { alpha, createTheme, getContrastRatio } from '@mui/material/styles';

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
  name: 'beestat', label: 'OG Beestat', mode: 'dark', description: 'The familiar Beestat slate palette.',
  background: '#394b53', paper: '#2c3a41', raised: '#354851', subtle: '#253239',
  chart: '#2c3a41', tooltip: '#202c32', textPrimary: '#ffffff', textSecondary: colors.gray.light,
  divider: 'rgba(209, 216, 224, 0.16)', appBar: '#34464e', appBarText: '#ffffff',
  primary: colors.lightBlue.main, secondary: colors.teal.main, colors,
};

const midnightColors: Record<BeestatColorName, ColorRamp> = {
  red: { light: '#ff7b85', main: '#f2556f', dark: '#c83b55' }, orange: { light: '#ffad68', main: '#f58b45', dark: '#ca682e' },
  yellow: { light: '#f8d96b', main: '#eec44e', dark: '#b99634' }, green: { light: '#61d99b', main: '#38c786', dark: '#299864' },
  teal: { light: '#62d8cf', main: '#35bdb6', dark: '#238f8a' }, lightBlue: { light: '#72c4fa', main: '#4ba8e8', dark: '#337fb1' },
  blue: { light: '#7f9ff4', main: '#607fda', dark: '#465fa8' }, purple: { light: '#c18aef', main: '#9f68d3', dark: '#794da4' },
  gray: { light: '#d6dde7', main: '#9ba9ba', dark: '#718094' }, slate: { light: '#202833', main: '#181e27', dark: '#11161d' },
};

const beestatHighContrastColors: ThemeColors = {
  red: { light: '#ff8490', main: '#ff4f6d', dark: '#e83255' }, orange: { light: '#ffb36d', main: '#ff9147', dark: '#f06a18' },
  yellow: { light: '#ffe06a', main: '#ffd044', dark: '#d9a900' }, green: { light: '#67efa9', main: '#32da8a', dark: '#16aa68' },
  teal: { light: '#69e5da', main: '#2fd1c5', dark: '#0b9f98' }, lightBlue: { light: '#82ceff', main: '#49b7f5', dark: '#168bd0' },
  blue: { light: '#8ba8ff', main: '#668cff', dark: '#3c65d7' }, purple: { light: '#d09aff', main: '#b572f0', dark: '#874bc4' },
  gray: { light: '#ffffff', main: '#d9e3ec', dark: '#aebdca' }, slate: { light: '#718792', main: '#536973', dark: '#34474f' },
};

const midnightHighContrastColors: ThemeColors = {
  red: { light: '#ff8b9c', main: '#ff5c7c', dark: '#dd3458' }, orange: { light: '#ffc078', main: '#ff9b55', dark: '#dd7028' },
  yellow: { light: '#ffe986', main: '#ffd85c', dark: '#caa62c' }, green: { light: '#76f0b8', main: '#40dda0', dark: '#1baa75' },
  teal: { light: '#76eee4', main: '#38d5ca', dark: '#0ca096' }, lightBlue: { light: '#91d5ff', main: '#55bdf8', dark: '#1889cb' },
  blue: { light: '#9db5ff', main: '#728fff', dark: '#4561ca' }, purple: { light: '#dca5ff', main: '#bd78f2', dark: '#8b4bc0' },
  gray: { light: '#ffffff', main: '#dce7f2', dark: '#aab9c9' }, slate: { light: '#647383', main: '#3d4b5a', dark: '#202c38' },
};

const midnightTheme: AppThemeDefinition = {
  name: 'midnight', label: 'Midnight', mode: 'dark', description: 'A quieter dark palette for late nights.',
  background: '#10151b', paper: '#1b232d', raised: '#26313e', subtle: '#141a22', chart: '#1b232d', tooltip: '#0b0f14',
  textPrimary: '#e9eef5', textSecondary: '#a4b0bf', divider: 'rgba(233, 238, 245, 0.13)', appBar: '#151a22', appBarText: '#e9eef5',
  primary: midnightColors.lightBlue.main, secondary: midnightColors.teal.main, colors: midnightColors,
};

const beestatHighContrastTheme: AppThemeDefinition = {
  ...beestatTheme,
  name: 'beestat-high-contrast',
  label: 'OG Beestat — High Contrast',
  description: 'The Beestat palette with stronger surface and text separation.',
  background: '#202c32', paper: '#3a4c55', raised: '#4b606a', subtle: '#182228', chart: '#303f47', tooltip: '#0d1316',
  textPrimary: '#ffffff', textSecondary: '#edf2f6', divider: 'rgba(255, 255, 255, 0.34)', appBar: '#293940',
  primary: beestatHighContrastColors.lightBlue.main, secondary: beestatHighContrastColors.teal.main, colors: beestatHighContrastColors,
};

const midnightHighContrastTheme: AppThemeDefinition = {
  ...midnightTheme,
  name: 'midnight-high-contrast',
  label: 'Midnight — High Contrast',
  description: 'Midnight with maximum surface and text separation.',
  background: '#000000', paper: '#18212b', raised: '#293746', subtle: '#090d12', chart: '#111820', tooltip: '#000000',
  textPrimary: '#ffffff', textSecondary: '#e1e8f0', divider: 'rgba(255, 255, 255, 0.38)', appBar: '#0b1016',
  primary: midnightHighContrastColors.lightBlue.main, secondary: midnightHighContrastColors.teal.main, colors: midnightHighContrastColors,
};

export function getSelectableThemes() { return [beestatTheme, midnightTheme]; }
export function getAppThemes() { return [beestatTheme, beestatHighContrastTheme, midnightTheme, midnightHighContrastTheme]; }
export function getAppThemeDefinition(name?: string) { return getAppThemes().find((candidate) => candidate.name === name) ?? beestatTheme; }
const darkContrastText = '#101418';
const contrastText = (background: string) => getContrastRatio(background, '#fff') >= getContrastRatio(background, darkContrastText) ? '#fff' : darkContrastText;

export function createAppTheme(name?: string) {
  const definition = getAppThemeDefinition(name);
  const linkStates = (className: string) => [`a.${className}:link`, `a.${className}:visited`, `a.${className}:focus`, `a.${className}:hover`, `a.${className}:active`].join(',');
  const subtleBorder = definition.divider;
  const cardShadow = definition.mode === 'dark'
    ? '0 1px 2px rgba(0,0,0,.22), 0 8px 24px rgba(0,0,0,.13)'
    : '0 1px 2px rgba(34,48,58,.08), 0 8px 24px rgba(34,48,58,.08)';
  const floatingShadow = definition.mode === 'dark'
    ? '0 12px 36px rgba(0,0,0,.38), 0 2px 8px rgba(0,0,0,.24)'
    : '0 12px 36px rgba(34,48,58,.16), 0 2px 8px rgba(34,48,58,.10)';
  const theme = createTheme({
    palette: {
      mode: definition.mode,
      primary: { main: definition.primary, contrastText: contrastText(definition.primary) }, secondary: { main: definition.secondary, contrastText: contrastText(definition.secondary) },
      error: { ...definition.colors.red, contrastText: contrastText(definition.colors.red.main) }, warning: { ...definition.colors.orange, contrastText: contrastText(definition.colors.orange.main) },
      success: { ...definition.colors.green, contrastText: contrastText(definition.colors.green.main) }, info: { ...definition.colors.lightBlue, contrastText: contrastText(definition.colors.lightBlue.main) },
      divider: definition.divider, background: { default: definition.background, paper: definition.paper },
      text: { primary: definition.textPrimary, secondary: definition.textSecondary },
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: 'Montserrat, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 13,
      fontWeightLight: 300, fontWeightRegular: 400, fontWeightMedium: 500, fontWeightBold: 600,
      body1: { fontSize: '13px', lineHeight: 'normal', fontWeight: 400 }, body2: { fontSize: '13px', lineHeight: 'normal', fontWeight: 400 },
      button: { fontSize: '13px', lineHeight: 'normal', fontWeight: 500, letterSpacing: '.005em' }, caption: { fontSize: '11px', lineHeight: 'normal', fontWeight: 400 },
      overline: { fontSize: '12px', lineHeight: 'normal', fontWeight: 600, letterSpacing: '.025em', textTransform: 'none' },
      h5: { fontWeight: 600, fontSize: '15px', lineHeight: '24px', letterSpacing: '.005em' }, h6: { fontWeight: 600, fontSize: '14px', lineHeight: '24px', letterSpacing: '.005em' },
    },
    components: {
      MuiCssBaseline: { styleOverrides: {
        html: { backgroundColor: definition.background, colorScheme: definition.mode, '--beestat-surface-tooltip': definition.tooltip, '--beestat-text-primary': definition.textPrimary, '--beestat-text-secondary': definition.textSecondary },
        body: { minWidth: 320 }, '*, *::before, *::after': { boxSizing: 'border-box' }, '::selection': { backgroundColor: alpha(definition.primary, .42) }, '.MuiButtonBase-root > input.PrivateSwitchBase-input': { visibility: 'visible' },
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
      MuiAppBar: { styleOverrides: { root: { borderBottom: `1px solid ${subtleBorder}`, boxShadow: definition.mode === 'dark' ? '0 4px 16px rgba(0,0,0,.12)' : '0 4px 16px rgba(34,48,58,.09)' } } },
      MuiCard: { styleOverrides: { root: { backgroundImage: 'none', borderRadius: 10, boxShadow: cardShadow } } },
      MuiCardHeader: { styleOverrides: { root: { padding: 16 }, action: { alignSelf: 'center', marginTop: 0, marginRight: -4 } } },
      MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minHeight: 32, borderRadius: 7, textTransform: 'none', transition: 'background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, color 160ms ease' }, contained: { '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,.16)' } }, outlined: { borderColor: subtleBorder } } },
      MuiToggleButton: { styleOverrides: { root: { minHeight: 32, borderColor: subtleBorder, borderRadius: 7, backgroundColor: definition.subtle, color: definition.textPrimary, fontSize: '13px', fontWeight: 500, textTransform: 'none', transition: 'background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, color 160ms ease', '&:hover': { backgroundColor: definition.raised }, '&.Mui-selected': { backgroundColor: definition.primary, color: contrastText(definition.primary), boxShadow: `inset 0 0 0 1px ${alpha(definition.textPrimary, .08)}` }, '&.Mui-selected:hover': { backgroundColor: definition.primary } } } },
      MuiButtonBase: { styleOverrides: { root: { '&.Mui-focusVisible': { outline: `2px solid ${definition.primary}`, outlineOffset: 2 } } } },
      MuiChip: { styleOverrides: { root: { borderRadius: 7, fontWeight: 500 }, label: { fontSize: '12px' } } }, MuiIconButton: { defaultProps: { size: 'small' }, styleOverrides: { root: { transition: 'background-color 160ms ease, color 160ms ease' } } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 7, backgroundColor: alpha(definition.textPrimary, definition.mode === 'dark' ? .025 : .015), transition: 'background-color 160ms ease, box-shadow 160ms ease', '&:hover': { backgroundColor: alpha(definition.textPrimary, definition.mode === 'dark' ? .045 : .025) }, '&.Mui-focused': { boxShadow: `0 0 0 3px ${alpha(definition.primary, .14)}` }, '& .MuiOutlinedInput-notchedOutline': { borderColor: subtleBorder } } } },
      MuiDialog: { styleOverrides: { paper: { width: 'calc(100% - 32px)', margin: 16, backgroundImage: 'none', border: `1px solid ${subtleBorder}`, borderRadius: 12, boxShadow: floatingShadow } } },
      MuiDialogTitle: { styleOverrides: { root: { padding: '20px 20px 12px', fontSize: '16px', fontWeight: 600 } } },
      MuiDialogContent: { styleOverrides: { root: { padding: '8px 20px 20px', '&.MuiDialogContent-dividers': { padding: '16px 20px', borderColor: subtleBorder } } } },
      MuiDialogActions: { styleOverrides: { root: { gap: 8, padding: '12px 20px 20px', '& > :not(style) ~ :not(style)': { marginLeft: 0 } } } },
      MuiMenu: { styleOverrides: { paper: { backgroundImage: 'none', border: `1px solid ${subtleBorder}`, borderRadius: 10, boxShadow: floatingShadow, marginTop: 4 } } },
      MuiMenuItem: { styleOverrides: { root: { gap: 12, minHeight: 36, margin: '2px 4px', borderRadius: 6, transition: 'background-color 140ms ease' } } },
      MuiListItemIcon: { styleOverrides: { root: { minWidth: 32 } } },
      MuiTooltip: { styleOverrides: { tooltip: { backgroundColor: definition.tooltip, border: `1px solid ${subtleBorder}`, borderRadius: 7, boxShadow: floatingShadow, color: definition.textPrimary, fontSize: '12px', padding: '8px 10px' }, arrow: { color: definition.tooltip } } },
      MuiSnackbarContent: { styleOverrides: { root: { backgroundColor: definition.raised, border: `1px solid ${subtleBorder}`, borderRadius: 8, boxShadow: floatingShadow, color: definition.textPrimary } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 8 } } },
      MuiDivider: { styleOverrides: { root: { borderColor: subtleBorder } } },
    },
  });
  theme.name = definition.name; theme.label = definition.label;
  theme.palette.appBar = theme.palette.augmentColor({ color: { main: definition.appBar, contrastText: definition.appBarText } });
  theme.palette.colors = Object.fromEntries(Object.entries(definition.colors).map(([key, ramp]) => [key, theme.palette.augmentColor({ color: ramp })])) as typeof theme.palette.colors;
  theme.palette.surface = { raised: definition.raised, subtle: definition.subtle, chart: definition.chart, tooltip: definition.tooltip };
  return theme;
}

export const theme = createAppTheme('beestat');
