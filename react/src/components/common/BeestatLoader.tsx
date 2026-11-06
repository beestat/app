import { Box, keyframes } from '@mui/material';

const fillPulse = keyframes`
  0%, 72%, 100% { filter: brightness(1); opacity: 0; }
  36% { filter: brightness(1.55); opacity: .58; }
`;

const parts = [
  { x: 39, y: 302, width: 63, height: 65 },
  { x: 133, y: 272, width: 64, height: 149 },
  { x: 228, y: 301, width: 64, height: 174 },
  { x: 322, y: 242, width: 65, height: 179 },
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
    {parts.map((part, index) => <Box data-loader-part={`fill-${index + 1}`} key={part.x} sx={{ position: 'absolute', left: part.x * ratio, top: part.y * ratio, width: part.width * ratio, height: part.height * ratio, overflow: 'hidden', animation: `${fillPulse} 1.4s ease-in-out ${index * 120}ms infinite`, '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0 } }}>
      <Box component="img" src="/favicon.png" alt="" aria-hidden sx={image(part.x, part.y)} />
    </Box>)}
  </Box>;
}
