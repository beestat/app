import { CssBaseline, ThemeProvider } from '@mui/material';
import { useMemo, type ReactNode } from 'react';
import { createAppTheme } from '../../theme';
import { useDashboard } from '../../state/DashboardContext';

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { data } = useDashboard();
  const configured = String(data?.user?.settings?.ui?.theme ?? 'beestat');
  const base = configured === 'midnight' || configured === 'midnight-high-contrast' || configured === 'true-black' ? 'midnight' : 'beestat';
  const highContrast = Boolean(data?.user?.settings?.ui?.high_contrast) || configured.endsWith('-high-contrast');
  const requested = highContrast ? `${base}-high-contrast` : base;
  const theme = useMemo(() => createAppTheme(requested), [requested]);

  return <ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider>;
}
