import { createTheme } from '@mui/material/styles';

export const colors = {
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
} as const;

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: colors.lightBlue,
    secondary: colors.teal,
    error: colors.red,
    warning: colors.orange,
    success: colors.green,
    background: { default: colors.slate.light, paper: colors.slate.main },
    text: { primary: '#fff', secondary: colors.gray.light },
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 13,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    h5: { fontWeight: 500, fontSize: '1.1rem' },
    h6: { fontWeight: 500, fontSize: '1rem' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { backgroundColor: colors.slate.light },
        body: { minWidth: 320 },
        '*': { boxSizing: 'border-box' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0 2px 6px rgba(0,0,0,.24)',
        },
      },
    },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiIconButton: { defaultProps: { size: 'small' } },
  },
});
