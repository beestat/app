import { Box, Card, CircularProgress, Stack, Typography } from '@mui/material';

export function VisualizerLoader({ label, detail, height = 548 }: { label: string; detail: string; height?: number | string }) {
  return <Card role="status" aria-live="polite" sx={{ height, display: 'grid', placeItems: 'center', overflow: 'hidden', background: 'radial-gradient(circle at 50% 42%, rgba(69,170,242,.13), transparent 34%), #2f3d44' }}>
    <Stack alignItems="center" gap={1.5} sx={{ px: 3, textAlign: 'center' }}>
      <Box component="img" src="/favicon.png" alt="" sx={{ width: 52, height: 52, opacity: .95 }} />
      <CircularProgress size={30} thickness={4} aria-hidden="true" />
      <Typography fontWeight={600}>{label}</Typography>
      <Typography color="text.secondary" variant="caption">{detail}</Typography>
    </Stack>
  </Card>;
}
