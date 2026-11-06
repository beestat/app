import { Box, keyframes } from '@mui/material';

const barPulse = keyframes`
  0%, 70%, 100% { transform: scaleY(.68); opacity: .48; }
  28% { transform: scaleY(1); opacity: 1; }
`;

const beeFloat = keyframes`
  0%, 100% { transform: translateY(1px) rotate(-4deg); }
  50% { transform: translateY(-3px) rotate(4deg); }
`;

export function BeestatLoader({ size = 64, label = 'Loading' }: { size?: number; label?: string }) {
  const scale = size / 64;
  const bars = [{ left: 8, height: 25 }, { left: 21, height: 38 }, { left: 34, height: 50 }, { left: 47, height: 38 }];
  return <Box role="status" aria-label={label} data-beestat-loader sx={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, transform: `scale(${scale})`, transformOrigin: 'top left', width: 64, height: 64 }}>
      <Box sx={{ position: 'absolute', left: 4, top: 19, width: 35, height: 7, bgcolor: 'success.main', borderRadius: 1, transform: 'rotate(-32deg)', transformOrigin: 'left center' }} />
      <Box sx={{ position: 'absolute', left: 33, top: 1, width: 31, height: 7, bgcolor: 'success.main', borderRadius: 1, transform: 'rotate(32deg)', transformOrigin: 'left center' }} />
      <Box sx={{ position: 'absolute', left: 48, top: 2, width: 8, height: 17, bgcolor: 'success.main', borderRadius: '3px 3px 0 0' }} />
      {bars.map((bar, index) => <Box data-loader-bar key={bar.left} sx={{ position: 'absolute', left: bar.left, bottom: 4, width: 10, height: bar.height, bgcolor: 'colors.yellow.main', borderRadius: '4px 4px 6px 6px', transformOrigin: 'bottom center', animation: `${barPulse} 1.25s ease-in-out ${index * 110}ms infinite` }} />)}
      <Box sx={{ position: 'absolute', right: -1, bottom: 15, width: 9, height: 14, borderRadius: '55% 45% 50% 50%', bgcolor: 'colors.yellow.main', animation: `${beeFloat} 1.3s ease-in-out infinite`, '&::before': { content: '""', position: 'absolute', left: -3, top: 1, width: 6, height: 6, border: '2px solid', borderColor: 'colors.yellow.main', borderRadius: '50%' } }} />
    </Box>
  </Box>;
}
