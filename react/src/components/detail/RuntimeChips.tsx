import { Box } from '@mui/material';
import { equipment, formatRuntime, type EquipmentCode, type RuntimeChartData } from './runtimeData';

function RuntimeChip({ label, labelColor, segments }: { label: string; labelColor: string; segments: { text: string; color: string }[] }) {
  if (!segments.length) return null;
  return <Box component="span" sx={{ display: 'inline-flex', overflow: 'hidden', borderRadius: 1, mr: .5, mb: .5, fontSize: 13, lineHeight: 1.45 }}>
    <Box component="span" sx={{ bgcolor: labelColor, px: 1, py: .25, fontWeight: 600 }}>{label}</Box>
    {segments.map((segment) => <Box component="span" key={segment.text} sx={{ bgcolor: segment.color, px: 1, py: .25 }}>{segment.text}</Box>)}
  </Box>;
}

const segment = (data: RuntimeChartData, code: EquipmentCode) => data.totals[code] > 0 ? [{ text: formatRuntime(data.totals[code]), color: equipment[code].color }] : [];

export function RuntimeChips({ data }: { data: RuntimeChartData }) {
  const accessories = (['humidifier', 'dehumidifier', 'ventilator', 'economizer'] as EquipmentCode[]).flatMap((code) => data.totals[code] > 0 ? [{ text: `${equipment[code].name} ${formatRuntime(data.totals[code])}`, color: equipment[code].color }] : []);
  return <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: .5 }}>
    <RuntimeChip label="Cool" labelColor={equipment.compressor_cool_1.color} segments={[...segment(data, 'compressor_cool_1'), ...segment(data, 'compressor_cool_2')]} />
    <RuntimeChip label="Heat" labelColor={equipment.compressor_heat_1.color} segments={[...segment(data, 'compressor_heat_1'), ...segment(data, 'compressor_heat_2')]} />
    <RuntimeChip label="Aux" labelColor={equipment.auxiliary_heat_1.color} segments={[...segment(data, 'auxiliary_heat_1'), ...segment(data, 'auxiliary_heat_2')]} />
    <RuntimeChip label="Fan" labelColor={equipment.fan.color} segments={segment(data, 'fan')} />
    <RuntimeChip label="Accessory" labelColor={equipment.humidifier.color} segments={accessories} />
  </Box>;
}
