import { alpha, Card, Stack, Typography, useTheme } from '@mui/material';
import { BeestatLoader } from '../common/BeestatLoader';

export function VisualizerLoader({ label, detail, height = 548 }: { label: string; detail: string; height?: number | string }) {
  const theme = useTheme();
  return <Card role="status" aria-live="polite" sx={{ height, display: 'grid', placeItems: 'center', overflow: 'hidden', background: `radial-gradient(circle at 50% 42%, ${alpha(theme.palette.primary.main, .13)}, transparent 34%), ${theme.palette.surface.chart}` }}>
    <Stack alignItems="center" gap={1.5} sx={{ px: 3, textAlign: 'center' }}>
      <BeestatLoader size={72} label={label} />
      <Typography fontWeight={600}>{label}</Typography>
      <Typography color="text.secondary" variant="caption">{detail}</Typography>
    </Stack>
  </Card>;
}
