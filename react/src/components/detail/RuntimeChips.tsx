import { Box } from '@mui/material';
import { formatRuntime, type EquipmentCode, type RuntimeChartData } from './runtimeData';

function RuntimeChip({ label, labelColor, segments }: { label: string; labelColor: string; segments: { text: string; color: string }[] }) {
  if (!segments.length) return null;
  return <Box component="span" sx={{ display: 'inline-flex', overflow: 'hidden', borderRadius: 1, mr: .5, mb: .5, fontSize: 13, lineHeight: 'normal' }}>
    <Box component="span" sx={{ bgcolor: labelColor, px: 1, py: .25, fontWeight: 600 }}>{label}</Box>
    {segments.map((segment) => <Box component="span" key={segment.text} sx={{ bgcolor: segment.color, px: 1, py: .25 }}>{segment.text}</Box>)}
  </Box>;
}

const segment = (data: RuntimeChartData, code: EquipmentCode) => data.totals[code] > 0 ? [{ text: formatRuntime(data.totals[code]), color: data.equipment[code].color }] : [];
// Legacy chips are labeled with the stage-1 series name minus its digit, so they follow the thermostat's naming.
const chipLabel = (data: RuntimeChartData, code: EquipmentCode) => data.equipment[code].name.replace(/\d/, '').trim();

export function RuntimeChips({ data, summary = false }: { data: RuntimeChartData; summary?: boolean }) {
  const accessories = (['humidifier', 'dehumidifier', 'ventilator', 'economizer'] as EquipmentCode[]).flatMap((code) => data.totals[code] > 0 ? [{ text: `${data.equipment[code].name} ${formatRuntime(data.totals[code])}`, color: data.equipment[code].color }] : []);
  return <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: 1 }}>
    <RuntimeChip label={chipLabel(data, 'compressor_cool_1')} labelColor={data.equipment.compressor_cool_1.color} segments={[...segment(data, 'compressor_cool_1'), ...segment(data, 'compressor_cool_2')]} />
    <RuntimeChip label={chipLabel(data, 'compressor_heat_1')} labelColor={data.equipment.compressor_heat_1.color} segments={[...segment(data, 'compressor_heat_1'), ...segment(data, 'compressor_heat_2')]} />
    <RuntimeChip label={chipLabel(data, 'auxiliary_heat_1')} labelColor={data.equipment.auxiliary_heat_1.color} segments={[...segment(data, 'auxiliary_heat_1'), ...segment(data, 'auxiliary_heat_2')]} />
    {!summary && <RuntimeChip label="Fan" labelColor={data.equipment.fan.color} segments={segment(data, 'fan')} />}
    {!summary && <RuntimeChip label="Accessory" labelColor={data.equipment.humidifier.color} segments={accessories} />}
  </Box>;
}
