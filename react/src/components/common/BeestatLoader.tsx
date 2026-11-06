import { Box, keyframes } from '@mui/material';

const barPulse = keyframes`
  0%, 68%, 100% { transform: translateY(0); opacity: 0; }
  34% { transform: translateY(-1px); opacity: .34; }
`;

const beeFloat = keyframes`
  0%, 100% { transform: translate(0, 0) rotate(0); opacity: 0; }
  50% { transform: translate(1px, -1px) rotate(1deg); opacity: .3; }
`;

const parts = [
  { x: 37, y: 216, width: 66, height: 152 },
  { x: 131, y: 159, width: 67, height: 262 },
  { x: 226, y: 120, width: 67, height: 355 },
  { x: 321, y: 159, width: 67, height: 262 },
] as const;

export function BeestatLoader({ size = 64, label = 'Loading' }: { size?: number; label?: string }) {
  const ratio = size / 512;
  const image = (x = 0, y = 0) => ({
    position: 'absolute' as const,
    left: -x * ratio,
    top: -y * ratio,
    width: size,
    height: size,
    maxWidth: 'none',
    objectFit: 'contain' as const,
  });

  return <Box role="status" aria-label={label} data-beestat-loader sx={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
    <Box component="img" data-loader-part="base" src="/favicon.png" alt="" aria-hidden sx={image()} />
    {parts.map((part, index) => <Box data-loader-part={`bar-${index + 1}`} key={part.x} sx={{ position: 'absolute', left: part.x * ratio, top: part.y * ratio, width: part.width * ratio, height: part.height * ratio, overflow: 'hidden', transformOrigin: 'bottom center', filter: 'brightness(1.18)', animation: `${barPulse} 1.65s ease-in-out ${index * 120}ms infinite`, '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0 } }}>
      <Box component="img" src="/favicon.png" alt="" aria-hidden sx={image(part.x, part.y)} />
    </Box>)}
    <Box data-loader-part="bee" sx={{ position: 'absolute', left: 414 * ratio, top: 194 * ratio, width: 98 * ratio, height: 176 * ratio, overflow: 'hidden', transformOrigin: 'center', filter: 'brightness(1.18)', animation: `${beeFloat} 1.65s ease-in-out infinite`, '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0 } }}>
      <Box component="img" src="/favicon.png" alt="" aria-hidden sx={image(414, 194)} />
    </Box>
  </Box>;
}
