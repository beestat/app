import { Box, Grid, Stack, Typography } from '@mui/material';
import { Check, Eye, EyeOff, Thermometer, TrendingDown, TrendingUp } from 'lucide-react';
import { memo } from 'react';
import type { Sensor, Thermostat } from '../../types';
import { colors } from '../../theme';
import { formatTemperature } from '../../utils/format';
import { DashboardCard } from '../common/DashboardCard';

export const SensorsCard = memo(function SensorsCard({ sensors, thermostat }: { sensors: Sensor[]; thermostat: Thermostat }) {
  const sorted = [...sensors].sort((a, b) => a.type === 'thermostat' ? -1 : b.type === 'thermostat' ? 1 : a.name.localeCompare(b.name));
  return (
    <DashboardCard title="Sensors" subheader={`${sensors.filter((item) => item.in_use).length} participating`}>
      <Grid container spacing={1}>
        {sorted.map((sensor) => {
          const delta = sensor.temperature === null ? 0 : sensor.temperature - thermostat.temperature;
          return <Grid key={sensor.sensor_id} size={{ xs: 12, sm: 6, lg: 12 }}><Box sx={{ bgcolor: 'background.default', p: 1.25, borderRadius: 1 }}>
            <Typography noWrap fontWeight={500}>{sensor.name}{sensor.type === 'thermostat' ? ' (Thermostat)' : ''}</Typography>
            <Stack direction="row" alignItems="center" mt={.75}>
              <Thermometer size={18} /><Typography sx={{ fontSize: 18, ml: .5 }}>{formatTemperature(sensor.temperature, thermostat.temperature_unit)}</Typography>
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
