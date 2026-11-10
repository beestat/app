import { Box, alpha, useTheme } from '@mui/material';
import type { ReactNode } from 'react';
import { BeestatLoader } from './BeestatLoader';

/**
 * Keeps the current chart on screen while a replacement range loads: the old
 * content dims and softens under a centered loader instead of collapsing to a
 * blank loading box. Mirrors legacy's blurred chart behind a status message.
 */
export function RefreshOverlay({ active, label, children }: { active: boolean; label: string; children: ReactNode }) {
  const theme = useTheme();
  return <Box data-refresh-overlay={active ? 'active' : 'idle'} aria-busy={active} sx={{ position: 'relative' }}>
    <Box sx={{ transition: 'opacity 160ms ease, filter 160ms ease', opacity: active ? .45 : 1, filter: active ? 'blur(1.5px) saturate(.7)' : 'none', pointerEvents: active ? 'none' : undefined }}>
      {children}
    </Box>
    {active && <Box sx={{ position: 'absolute', inset: 0, zIndex: 2, display: 'grid', placeItems: 'center', bgcolor: alpha(theme.palette.background.paper, .18), borderRadius: 1 }}>
      <BeestatLoader label={label} />
    </Box>}
  </Box>;
}

/**
 * TanStack placeholder that keeps the previous range's data visible while a new
 * range for the same thermostat loads. Switching thermostats still shows the
 * full loading state, so one home's data never appears under another's name.
 * Assumes the thermostat id is the second query-key entry.
 */
export function keepPreviousForThermostat(thermostatId: unknown) {
  return <T,>(previous: T | undefined, previousQuery?: { queryKey: readonly unknown[] }) => previousQuery?.queryKey[1] === thermostatId ? previous : undefined;
}
