import { Box, Link as MuiLink, Stack, Typography } from '@mui/material';

const links = [
  { label: 'Help', href: 'https://doc.beestat.io' },
  { label: 'Feedback', href: 'https://community.beestat.io' },
  { label: 'Privacy', href: 'https://beestat.io/privacy.html' },
  { label: 'Newsletter', href: 'https://newsletter.beestat.io' },
  { label: 'Contact', href: 'mailto:contact@beestat.io', external: false },
];

export function AppFooter() {
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
          {links.map(({ label, href, external = true }) => (
            <MuiLink
              key={label}
              href={href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noreferrer' : undefined}
              underline="none"
              sx={{
                px: 1.25,
                py: .75,
                borderRadius: 1,
                color: 'text.secondary',
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1,
                transition: 'background-color 160ms ease, color 160ms ease',
                '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
              }}
            >
              {label}
            </MuiLink>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}
