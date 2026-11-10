import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Slider, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { CalendarDays, CalendarRange, CircleHelp, Download, EllipsisVertical, RotateCcw } from 'lucide-react';
import { useState } from 'react';

interface Props {
  days?: number;
  setDays: (days: number) => void;
  onCustom?: (begin: string, end: string) => void;
  onDownload?: () => void;
  onReset?: () => void;
  resetDisabled?: boolean;
  helpUrl?: string;
  customTitle?: string;
  customDescription?: string;
  maxDays?: number;
  initialBegin?: string;
  initialEnd?: string;
  minDate?: string;
  maxDate?: string;
}

// YYYY-MM-DD in the viewer's time zone; toISOString would give tomorrow's date every evening in the Americas.
function localDate(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Short ranges label every day; longer ones label each week plus the maximum.
function dayMarks(maxDays: number) {
  const labeled = maxDays <= 7
    ? Array.from({ length: maxDays }, (_, index) => index + 1)
    : [1, ...Array.from({ length: Math.floor((maxDays - 1) / 7) }, (_, index) => (index + 1) * 7).filter((value) => maxDays - value >= 3), maxDays];
  return labeled.map((value) => ({ value, label: String(value) }));
}

function DaysSlider({ value, maxDays, onChange }: { value: number; maxDays: number; onChange: (days: number) => void }) {
  const days = Math.min(Math.max(1, Math.round(value) || 1), maxDays);
  return <Box>
    <Stack direction="row" alignItems="baseline" justifyContent="space-between" mb={.5}>
      <Typography id="chart-range-days-label" fontWeight={600}>Days</Typography>
      <Typography data-chart-range-days><Box component="span" fontWeight={600}>Past {days}</Box> day{days === 1 ? '' : 's'}</Typography>
    </Stack>
    <Box sx={{ px: 1 }}>
      <Slider
        aria-labelledby="chart-range-days-label"
        getAriaValueText={(current) => `${current} day${current === 1 ? '' : 's'}`}
        value={days}
        min={1}
        max={maxDays}
        step={1}
        marks={dayMarks(maxDays)}
        valueLabelDisplay="auto"
        onChange={(_event, next) => onChange(next as number)}
        sx={{ '& .MuiSlider-markLabel': { fontSize: 12, color: 'text.secondary' } }}
      />
    </Box>
  </Box>;
}

export function ChartRangeMenu({ days, setDays, onCustom, onDownload, onReset, resetDisabled = false, helpUrl = 'https://doc.beestat.io', customTitle = 'Custom date range', customDescription = 'Choose a custom range to display on this chart.', maxDays = 30, initialBegin, initialEnd, minDate, maxDate }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [rangeType, setRangeType] = useState<'dynamic' | 'static'>('dynamic');
  const [dynamicDays, setDynamicDays] = useState(days ?? 3);
  const today = localDate(0);
  const prior = localDate(-3);
  const [begin, setBegin] = useState(prior); const [end, setEnd] = useState(today);
  const close = () => setAnchor(null);
  const staticDays = begin && end ? Math.floor(Math.abs(Date.parse(`${end}T00:00:00Z`) - Date.parse(`${begin}T00:00:00Z`)) / 86_400_000) + 1 : 0;
  const staticFirst = begin <= end ? begin : end;
  const staticLast = begin <= end ? end : begin;
  const outsideAvailableRange = rangeType === 'static' && Boolean((minDate && staticFirst < minDate) || (maxDate && staticLast > maxDate));
  const exceedsMaximum = rangeType === 'static' && staticDays > maxDays;
  const rangeInvalid = rangeType === 'dynamic' ? !Number.isInteger(dynamicDays) || dynamicDays < 1 || dynamicDays > maxDays : !begin || !end || exceedsMaximum || outsideAvailableRange;
  const openCustom = () => { close(); setRangeType(days == null ? 'static' : 'dynamic'); setDynamicDays(days ?? dynamicDays); if (initialBegin) setBegin(initialBegin); if (initialEnd) setEnd(initialEnd); setCustomOpen(true); };
  const applyCustom = () => {
    if (rangeType === 'dynamic') setDays(dynamicDays);
    else onCustom?.(begin <= end ? begin : end, begin <= end ? end : begin);
    setCustomOpen(false);
  };
  return <>
    <IconButton aria-label="Chart menu" onClick={(event) => setAnchor(event.currentTarget)}><EllipsisVertical /></IconButton>
    <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
      {[1, 3, 7].map((value) => <MenuItem selected={days === value} key={value} onClick={() => { setDays(value); close(); }}><ListItemIcon><CalendarRange size={18} /></ListItemIcon><ListItemText>Past {value} Day{value > 1 ? 's' : ''}</ListItemText></MenuItem>)}
      <MenuItem onClick={openCustom}><ListItemIcon><CalendarDays size={18} /></ListItemIcon><ListItemText>Custom</ListItemText></MenuItem>
      <Divider sx={{ my: .5 }} />
      {onDownload && <MenuItem onClick={() => { close(); onDownload(); }}><ListItemIcon><Download size={18} /></ListItemIcon><ListItemText>Download Chart</ListItemText></MenuItem>}
      {onReset && <MenuItem disabled={resetDisabled} onClick={() => { close(); onReset(); }}><ListItemIcon><RotateCcw size={18} /></ListItemIcon><ListItemText>Reset Zoom</ListItemText></MenuItem>}
      <Divider sx={{ my: .5 }} />
      <MenuItem component="a" href={helpUrl} target="_blank"><ListItemIcon><CircleHelp size={18} /></ListItemIcon><ListItemText>Help</ListItemText></MenuItem>
    </Menu>
    <Dialog open={customOpen} onClose={() => setCustomOpen(false)} fullWidth maxWidth="xs">
      <DialogTitle>{customTitle}</DialogTitle>
      <DialogContent><Stack gap={2} pt={1}>
        <Typography>{customDescription}</Typography>
        <Typography variant="overline">Range Type</Typography>
        <ToggleButtonGroup exclusive fullWidth value={rangeType} onChange={(_event, value) => value && setRangeType(value)} color="primary">
          <ToggleButton value="dynamic">Dynamic</ToggleButton><ToggleButton value="static">Static</ToggleButton>
        </ToggleButtonGroup>
        {rangeType === 'dynamic'
          ? <DaysSlider value={dynamicDays} maxDays={maxDays} onChange={setDynamicDays} />
          : <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}><TextField fullWidth type="date" label="Start" value={begin} onChange={(event) => setBegin(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /><TextField fullWidth type="date" label="End" value={end} onChange={(event) => setEnd(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Stack>}
        {(rangeType === 'dynamic' && rangeInvalid || exceedsMaximum) && <Alert severity="error">Max range is {maxDays} days.</Alert>}
        {outsideAvailableRange && <Alert severity="error">Detail not available for this range.</Alert>}
      </Stack></DialogContent>
      <DialogActions><Button onClick={() => setCustomOpen(false)}>Cancel</Button><Button variant="contained" disabled={rangeInvalid} onClick={applyCustom}>Save</Button></DialogActions>
    </Dialog>
  </>;
}
