import { Box, keyframes } from '@mui/material';

const barPulse = keyframes`
  0%, 70%, 100% { transform: scaleY(.82); opacity: .72; }
  35% { transform: scaleY(1); opacity: 1; }
`;

const beeFloat = keyframes`
  0%, 100% { transform: translate(0, 1px) rotate(-1deg); }
  50% { transform: translate(1px, -2px) rotate(2deg); }
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
    <Box component="img" data-loader-part="roof" src="/favicon.png" alt="" aria-hidden sx={{ ...image(), clipPath: 'polygon(0 34%, 47% 6%, 53% 6%, 63% 13%, 63% 10%, 65% 7%, 74% 7%, 76% 10%, 76% 21%, 89% 28%, 90% 33%, 85% 39%, 51% 19%, 5% 46%, 2% 46%, 0 39%)' }} />
    {parts.map((part, index) => <Box data-loader-part={`bar-${index + 1}`} key={part.x} sx={{ position: 'absolute', left: part.x * ratio, top: part.y * ratio, width: part.width * ratio, height: part.height * ratio, overflow: 'hidden', transformOrigin: 'bottom center', animation: `${barPulse} 1.2s ease-in-out ${index * 110}ms infinite`, '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 1 } }}>
      <Box component="img" src="/favicon.png" alt="" aria-hidden sx={image(part.x, part.y)} />
    </Box>)}
    <Box data-loader-part="bee" sx={{ position: 'absolute', left: 414 * ratio, top: 194 * ratio, width: 98 * ratio, height: 176 * ratio, overflow: 'hidden', transformOrigin: 'center', animation: `${beeFloat} 1.2s ease-in-out infinite`, '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}>
      <Box component="img" src="/favicon.png" alt="" aria-hidden sx={image(414, 194)} />
    </Box>
  </Box>;
}
