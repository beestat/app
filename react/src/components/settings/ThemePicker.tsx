import { Box, ButtonBase, Checkbox, FormControlLabel, Stack, Typography } from '@mui/material';
import { Check } from 'lucide-react';
import { getSelectableThemes } from '../../theme';

interface ThemePickerProps {
  value: string;
  highContrast: boolean;
  onChange: (value: string) => void;
  onHighContrastChange: (value: boolean) => void;
}

export function ThemePicker({ value, highContrast, onChange, onHighContrastChange }: ThemePickerProps) {
  const baseValue = value.startsWith('midnight') || value === 'true-black' ? 'midnight' : 'beestat';
  return <Box>
    <Box role="radiogroup" aria-label="Theme" sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1, maxWidth: 520 }}>
      {getSelectableThemes().map((option) => {
        const selected = option.name === baseValue;
        return <ButtonBase disableRipple key={option.name} role="radio" aria-label={option.label} aria-checked={selected} onClick={() => onChange(option.name)} sx={{ display: 'block', textAlign: 'left', border: 2, borderColor: selected ? 'primary.main' : 'transparent', borderRadius: 1.25, overflow: 'hidden', boxShadow: 1 }}>
          <Box sx={{ width: '100%', height: '100%', bgcolor: option.background, color: option.textPrimary, p: 1.25 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
              <Typography sx={{ color: 'inherit', fontWeight: 600 }}>{option.label}</Typography>
              {selected && <Check size={17} aria-hidden />}
            </Stack>
            <Typography sx={{ color: option.textSecondary, fontSize: 11, minHeight: 28, mt: .25 }}>{option.description}</Typography>
            <Stack direction="row" gap={.5} mt={1}>{[option.primary, option.colors.green.main, option.colors.orange.main, option.colors.purple.main].map((color) => <Box key={color} sx={{ bgcolor: color, width: 18, height: 5, borderRadius: 1 }} />)}</Stack>
          </Box>
        </ButtonBase>;
      })}
    </Box>
    <FormControlLabel sx={{ mt: 1, ml: 0, alignItems: 'flex-start' }} control={<Checkbox checked={highContrast} onChange={(event) => onHighContrastChange(event.target.checked)} />} label={<Box sx={{ pt: .5 }}><Typography>High Contrast</Typography><Typography variant="caption" color="text.secondary">Increase separation between surfaces, controls, and text.</Typography></Box>} />
  </Box>;
}
