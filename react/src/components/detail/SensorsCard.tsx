import { Box, Grid, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { Check, CircleHelp, Eye, EyeOff, MoreVertical, Thermometer, TrendingDown, TrendingUp } from 'lucide-react';
import { memo, useState } from 'react';
import type { Sensor, Thermostat } from '../../types';
import { colors } from '../../theme';
import { formatTemperature } from '../../utils/format';
import { DashboardCard } from '../common/DashboardCard';

export const SensorsCard = memo(function SensorsCard({ sensors, thermostat }: { sensors: Sensor[]; thermostat: Thermostat }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const sorted = [...sensors].sort((a, b) => a.type === 'thermostat' ? -1 : b.type === 'thermostat' ? 1 : a.name.localeCompare(b.name));
  const temperature = (value: number | null) => formatTemperature(value, thermostat.temperature_unit).replace(/°[FC]$/, '');
  return (
    <DashboardCard title="Sensors" action={<><IconButton aria-label="Sensors menu" onClick={(event) => setAnchor(event.currentTarget)}><MoreVertical /></IconButton><Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}><MenuItem component="a" href="https://doc.beestat.io" target="_blank"><ListItemIcon><CircleHelp size={18} /></ListItemIcon><ListItemText>Help</ListItemText></MenuItem></Menu></>}>
      <Grid container spacing={1}>
        {sorted.map((sensor) => {
          const delta = sensor.temperature === null ? 0 : sensor.temperature - thermostat.temperature;
          return <Grid key={sensor.sensor_id} size={sensor.type === 'thermostat' ? 12 : 6}><Box sx={{ bgcolor: 'background.default', p: 1.25, borderRadius: 0 }}>
            <Typography noWrap fontWeight={500}>{sensor.name}{sensor.type === 'thermostat' ? ' (Thermostat)' : ''}</Typography>
            <Stack direction="row" alignItems="center" mt={.75}>
              <Thermometer size={18} /><Typography sx={{ fontSize: 18, ml: .5 }}>{temperature(sensor.temperature)}</Typography>
              {delta < 0 && <TrendingDown size={18} color={colors.blue.main} />}{delta > 0 && <TrendingUp size={18} color={colors.red.main} />}
              <Box sx={{ flex: 1 }} />
              {sensor.occupancy === true ? <Eye size={19} aria-label="Occupied" /> : sensor.occupancy === false ? <EyeOff size={19} color={colors.slate.light} aria-label="Unoccupied" /> : null}
              <Check size={19} color={sensor.in_use ? '#fff' : colors.slate.light} aria-label={sensor.in_use ? 'Participating' : 'Not participating'} />
            </Stack>
          </Box></Grid>;
        })}
      </Grid>
    </DashboardCard>
  );
});
