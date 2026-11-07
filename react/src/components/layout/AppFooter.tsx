import { Box, Link as MuiLink, Stack, Typography } from '@mui/material';

const links = [
  { label: 'Help', href: 'https://doc.beestat.io' },
  { label: 'Feedback', href: 'https://community.beestat.io' },
  { label: 'Privacy', href: 'https://beestat.io/privacy.html' },
  { label: 'Newsletter' },
  { label: 'Contact', href: 'mailto:contact@beestat.io', external: false },
];

const linkSx = {
  px: 1.25,
  py: .75,
  border: 0,
  borderRadius: 1,
  bgcolor: 'transparent',
  color: 'text.secondary',
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1,
  cursor: 'pointer',
  transition: 'background-color 160ms ease, color 160ms ease',
  '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
};

export function AppFooter({ onNewsletter }: { onNewsletter: () => void }) {
  return (
    <Box component="footer" sx={{ mt: 2, py: { xs: 2.5, sm: 3 }, borderTop: 1, borderColor: 'divider' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="space-between" gap={{ xs: 2, sm: 3 }}>
        <Stack direction="row" alignItems="center" gap={1.25}>
          <Box component="img" src="/favicon.png" alt="" aria-hidden sx={{ width: 28, height: 28 }} />
          <Box>
            <Typography sx={{ color: 'text.primary', fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>beestat</Typography>
            <Typography variant="caption" color="text.secondary">Thermostat data, made useful.</Typography>
          </Box>
        </Stack>
        <Stack component="nav" aria-label="Footer" direction="row" justifyContent="center" flexWrap="wrap" gap={.5}>
          {links.map(({ label, href, external = true }) => href ? (
            <MuiLink key={label} href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} underline="none" sx={linkSx}>{label}</MuiLink>
          ) : (
            <MuiLink key={label} component="button" type="button" onClick={onNewsletter} underline="none" sx={linkSx}>{label}</MuiLink>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}
