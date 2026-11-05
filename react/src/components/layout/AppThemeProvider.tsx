import { CssBaseline, ThemeProvider, useMediaQuery } from '@mui/material';
import { useMemo, type ReactNode } from 'react';
import { createAppTheme, getAppThemeDefinition } from '../../theme';
import { useDashboard } from '../../state/DashboardContext';

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { data } = useDashboard();
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const configured = String(data?.user?.settings?.ui?.theme ?? 'beestat');
  const requested = configured === 'auto' ? (prefersDark ? 'midnight' : 'daylight') : configured;
  const definition = getAppThemeDefinition(requested);
  const theme = useMemo(() => createAppTheme(definition.name), [definition.name]);

  return <ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider>;
}
