import { useMemo, useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  Menu, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import {
  CalendarDays, Eye, HelpCircle, LockKeyhole, MoreVertical, MoveHorizontal,
  Pencil, Thermometer,
} from 'lucide-react';
import { colors } from '../../theme';
import { DashboardCard } from '../common/DashboardCard';

type VisualizeSettings = Record<string, any>;

function nested(value: Record<string, any>, path: string, fallback: unknown) {
  let current: any = value;
  for (const key of path.split('.')) current = current?.[key];
  return current ?? fallback;
}

function toInputDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [month, day, year] = value.split('/').map(Number);
  return year && month && day ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
}

function toLegacyDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return `${month}/${day}/${year}`;
}

function SettingTile({ active, color, icon, label, onClick }: {
  active: boolean; color: string; icon: React.ReactNode; label: string; onClick: () => void;
}) {
  return <Button
    onClick={onClick}
    startIcon={icon}
    sx={{
      minWidth: 0, minHeight: 33, px: 1.5, justifyContent: 'flex-start', color: '#fff',
      bgcolor: active ? color : colors.slate.light,
      '&:hover': { bgcolor: color },
    }}
  >{label}</Button>;
}

export function VisualizeSettingsCard({ initial, temperatureUnit, onChange }: {
  initial: VisualizeSettings;
  temperatureUnit: string;
  onChange: (key: string, value: unknown) => void;
}) {
  const [settings, setSettings] = useState(() => ({
    data_type: nested(initial, 'data_type', 'temperature'),
    heat_map_values: nested(initial, 'heat_map_values', 'dynamic'),
    heat_map_static: nested(initial, 'heat_map_static', { temperature: { min: 70, max: 80 }, occupancy: { min: 0, max: 100 } }),
    range_type: nested(initial, 'range_type', 'dynamic'),
    range_dynamic: Number(nested(initial, 'range_dynamic', 7)),
    range_static: nested(initial, 'range_static', { begin: '', end: '' }),
  }));
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customBegin, setCustomBegin] = useState(() => toInputDate(String(settings.range_static.begin ?? '')));
  const [customEnd, setCustomEnd] = useState(() => toInputDate(String(settings.range_static.end ?? '')));
  const dataType = String(settings.data_type) as 'temperature' | 'occupancy';
  const unit = temperatureUnit.includes('C') ? '°C' : '°F';
  const convertFromF = (value: number) => unit === '°C' ? Math.round(((value - 32) * 5 / 9) * 10) / 10 : value;
  const convertToF = (value: number) => unit === '°C' ? Math.round((value * 9 / 5 + 32) * 10) / 10 : value;
  const staticRange = useMemo(() => settings.range_static as { begin?: string; end?: string }, [settings.range_static]);

  const update = (key: string, value: unknown) => {
    setSettings((current) => {
      const next = structuredClone(current);
      const parts = key.replace(/^visualize\./, '').split('.');
      let target: any = next;
      parts.slice(0, -1).forEach((part) => { target[part] ??= {}; target = target[part]; });
      target[parts.at(-1)!] = value;
      return next;
    });
    onChange(key, value);
  };
  const selectRange = (days: number) => {
    update('visualize.range_type', 'dynamic');
    update('visualize.range_dynamic', days);
  };
  const saveCustom = () => {
    if (!customBegin || !customEnd || customBegin > customEnd) return;
    update('visualize.range_type', 'static');
    update('visualize.range_static.begin', toLegacyDate(customBegin));
    update('visualize.range_static.end', toLegacyDate(customEnd));
    setCustomOpen(false);
  };
  const staticMin = Number(nested(settings, `heat_map_static.${dataType}.min`, dataType === 'temperature' ? 70 : 0));
  const staticMax = Number(nested(settings, `heat_map_static.${dataType}.max`, dataType === 'temperature' ? 80 : 100));

  return <>
    <DashboardCard
      title="Visualize Settings"
      action={<>
        <IconButton aria-label="Visualize settings menu" onClick={(event) => setMenu(event.currentTarget)}><MoreVertical /></IconButton>
        <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)}>
          <MenuItem component="a" href="https://doc.beestat.io/24f548ddd7fc464d846e113470f80c35" target="_blank" onClick={() => setMenu(null)}><HelpCircle size={18} /> Help</MenuItem>
        </Menu>
      </>}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(350px, 100%), 1fr))', gap: 2 }}>
        <Stack gap={2}>
          <Box>
            <Typography variant="overline" display="block" mb={1}>Data Type</Typography>
            <Stack direction="row" gap={1} flexWrap="wrap">
              <SettingTile active={dataType === 'temperature'} color={colors.green.main} icon={<Thermometer size={19} />} label="Temperature" onClick={() => update('visualize.data_type', 'temperature')} />
              <SettingTile active={dataType === 'occupancy'} color={colors.green.main} icon={<Eye size={19} />} label="Occupancy" onClick={() => update('visualize.data_type', 'occupancy')} />
            </Stack>
          </Box>
          <Box>
            <Typography variant="overline" display="block" mb={1}>Heat Map Values</Typography>
            <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
              <SettingTile active={settings.heat_map_values === 'dynamic'} color={colors.orange.main} icon={<MoveHorizontal size={19} />} label="Dynamic" onClick={() => update('visualize.heat_map_values', 'dynamic')} />
              <SettingTile active={settings.heat_map_values === 'static'} color={colors.orange.main} icon={<LockKeyhole size={19} />} label="Static" onClick={() => update('visualize.heat_map_values', 'static')} />
              {settings.heat_map_values === 'static' && <Stack direction="row" gap={1} alignItems="center">
                <TextField size="small" type="number" value={convertFromF(staticMin)} inputProps={{ step: dataType === 'temperature' ? .1 : 1 }} sx={{ width: 76 }} onChange={(event) => update(`visualize.heat_map_static.${dataType}.min`, dataType === 'temperature' ? convertToF(Number(event.target.value)) : Number(event.target.value))} />
                <span>to</span>
                <TextField size="small" type="number" value={convertFromF(staticMax)} inputProps={{ step: dataType === 'temperature' ? .1 : 1 }} sx={{ width: 76 }} onChange={(event) => update(`visualize.heat_map_static.${dataType}.max`, dataType === 'temperature' ? convertToF(Number(event.target.value)) : Number(event.target.value))} />
                <span>{dataType === 'temperature' ? unit : '%'}</span>
              </Stack>}
            </Stack>
          </Box>
        </Stack>
        <Box>
          <Typography variant="overline" display="block" mb={1}>Time Period</Typography>
          <Stack direction="row" gap={1} flexWrap="wrap" mb={1}>
            {([[0, 'Today'], [1, 'Yesterday'], [7, '7 Day Average']] as const).map(([days, label]) => <SettingTile key={days} active={settings.range_type === 'dynamic' && settings.range_dynamic === days} color={colors.purple.main} icon={<CalendarDays size={19} />} label={label} onClick={() => selectRange(days)} />)}
          </Stack>
          <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
            <SettingTile active={settings.range_type === 'static'} color={colors.purple.main} icon={<CalendarDays size={19} />} label="Custom" onClick={() => setCustomOpen(true)} />
            {settings.range_type === 'static' && <>
              <Typography sx={{ px: 1 }}>{staticRange.begin} to {staticRange.end}</Typography>
              <IconButton aria-label="Edit custom range" onClick={() => setCustomOpen(true)} sx={{ bgcolor: colors.slate.light }}><Pencil size={18} /></IconButton>
            </>}
          </Stack>
        </Box>
      </Box>
    </DashboardCard>
    <Dialog open={customOpen} onClose={() => setCustomOpen(false)} fullWidth maxWidth="xs">
      <DialogTitle>Custom Time Period</DialogTitle>
      <DialogContent><Stack gap={2} pt={1}><TextField label="Begin" type="date" value={customBegin} onChange={(event) => setCustomBegin(event.target.value)} InputLabelProps={{ shrink: true }} /><TextField label="End" type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} InputLabelProps={{ shrink: true }} /></Stack></DialogContent>
      <DialogActions><Button onClick={() => setCustomOpen(false)}>Cancel</Button><Button variant="contained" disabled={!customBegin || !customEnd || customBegin > customEnd} onClick={saveCustom}>Apply</Button></DialogActions>
    </Dialog>
  </>;
}
