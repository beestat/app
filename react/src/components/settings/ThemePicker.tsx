import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { Check } from 'lucide-react';
import { getAppThemes } from '../../theme';

export function ThemePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <Box role="radiogroup" aria-label="Theme" sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1 }}>
    {getAppThemes().map((option) => {
      const selected = option.name === value;
      return <ButtonBase disableRipple key={option.name} role="radio" aria-checked={selected} onClick={() => onChange(option.name)} sx={{ display: 'block', textAlign: 'left', border: 2, borderColor: selected ? 'primary.main' : 'divider', borderRadius: 1, overflow: 'hidden' }}>
        <Box sx={{ bgcolor: option.background, color: option.textPrimary, p: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
            <Typography sx={{ color: 'inherit', fontWeight: 600 }}>{option.label}</Typography>
            {selected && <Check size={17} aria-hidden />}
          </Stack>
          <Typography sx={{ color: option.textSecondary, fontSize: 11, minHeight: 28, mt: .25 }}>{option.description}</Typography>
          <Stack direction="row" gap={.5} mt={1}>{[option.primary, option.colors.green.main, option.colors.orange.main, option.colors.purple.main].map((color) => <Box key={color} sx={{ bgcolor: color, width: 18, height: 5, borderRadius: 1 }} />)}</Stack>
        </Box>
      </ButtonBase>;
    })}
  </Box>;
}
