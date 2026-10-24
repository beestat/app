import { memo, useMemo, useRef, useState } from 'react';
import { Box, IconButton, Stack, Tooltip } from '@mui/material';
import { Grid3X3, Lightbulb, RotateCcw, TreePine, ZoomIn, ZoomOut } from 'lucide-react';
import { colors } from '../../theme';
import { entityBounds, entityId, type EntityType, type FloorEntity, type FloorGroup, type FloorPoint } from './floorPlanModel';

interface Selection { type: EntityType; id: string }
const points = (value: FloorPoint[]) => value.map((point) => `${point.x},${point.y}`).join(' ');

function kelvinColor(kelvin = 4000) {
  if (kelvin <= 2700) return '#fed330';
  if (kelvin <= 4000) return '#fff2c0';
  return '#d8eeff';
}

export const FloorPlanCanvas = memo(function FloorPlanCanvas({ group, selection, onSelect }: {
  group: FloorGroup;
  selection?: Selection;
  onSelect: (selection?: Selection) => void;
}) {
  const frame = useMemo(() => entityBounds(group), [group]);
  const fitted = useMemo(() => {
    const padding = 80;
    return { x: frame.x - padding, y: frame.y - padding, width: frame.width + padding * 2, height: frame.height + padding * 2 };
  }, [frame]);
  const [view, setView] = useState(fitted);
  const [grid, setGrid] = useState(true);
  const drag = useRef<{ x: number; y: number; viewX: number; viewY: number } | undefined>(undefined);
  const selected = (type: EntityType, entity: FloorEntity) => selection?.type === type && selection.id === entityId(type, entity);
  const choose = (event: React.PointerEvent, type: EntityType, entity: FloorEntity) => {
    event.stopPropagation(); onSelect({ type, id: entityId(type, entity) });
  };
  const zoom = (factor: number) => setView((current) => ({ x: current.x + current.width * (1 - factor) / 2, y: current.y + current.height * (1 - factor) / 2, width: current.width * factor, height: current.height * factor }));

  return <Box sx={{ position: 'relative', height: { xs: 420, md: 500 }, bgcolor: colors.slate.dark, overflow: 'hidden', touchAction: 'none' }}>
    <svg
      width="100%" height="100%" viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`} preserveAspectRatio="xMidYMid meet"
      onPointerDown={(event) => { if (event.button !== 0) return; drag.current = { x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y }; event.currentTarget.setPointerCapture(event.pointerId); onSelect(undefined); }}
      onPointerMove={(event) => { if (!drag.current) return; const rect = event.currentTarget.getBoundingClientRect(); setView((current) => ({ ...current, x: drag.current!.viewX - (event.clientX - drag.current!.x) * current.width / rect.width, y: drag.current!.viewY - (event.clientY - drag.current!.y) * current.height / rect.height })); }}
      onPointerUp={() => { drag.current = undefined; }} onPointerCancel={() => { drag.current = undefined; }}
      aria-label={`${group.name ?? 'Floor'} editor`}
    >
      <defs>
        <pattern id="minor-grid" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M 12 0 L 0 0 0 12" fill="none" stroke="#0f5b5b" strokeWidth=".5" /></pattern>
        <pattern id="major-grid" width="60" height="60" patternUnits="userSpaceOnUse"><rect width="60" height="60" fill="url(#minor-grid)" /><path d="M 60 0 L 0 0 0 60" fill="none" stroke="#0b7774" strokeWidth="1" /></pattern>
      </defs>
      {grid && <rect x={view.x} y={view.y} width={view.width} height={view.height} fill="url(#major-grid)" />}
      {group.surfaces.filter((entity) => !entity.editor_hidden).map((entity) => <polygon key={entity.surface_id} transform={`translate(${entity.x} ${entity.y})`} points={points(entity.points)} fill={entity.color ?? colors.gray.main} fillOpacity={selected('surfaces', entity) ? .7 : .5} stroke={selected('surfaces', entity) ? '#fff' : colors.gray.main} strokeWidth={selected('surfaces', entity) ? 3 : 2} onPointerDown={(event) => choose(event, 'surfaces', entity)} />)}
      {group.rooms.filter((entity) => !entity.editor_hidden).map((entity) => <polygon key={entity.room_id} transform={`translate(${entity.x} ${entity.y})`} points={points(entity.points)} fill={colors.blue.main} fillOpacity={selected('rooms', entity) ? .7 : .5} stroke={selected('rooms', entity) ? '#fff' : colors.gray.main} strokeWidth={selected('rooms', entity) ? 3 : 2} onPointerDown={(event) => choose(event, 'rooms', entity)} />)}
      {group.openings.filter((entity) => !entity.editor_hidden && entity.points.length > 1).map((entity) => <line key={entity.opening_id} x1={entity.points[0].x} y1={entity.points[0].y} x2={entity.points[1].x} y2={entity.points[1].y} stroke={entity.type === 'door' ? colors.orange.light : entity.type === 'window' ? colors.lightBlue.light : colors.gray.light} strokeWidth={selected('openings', entity) ? 7 : 4} strokeLinecap="round" onPointerDown={(event) => choose(event, 'openings', entity)} />)}
      {group.trees.filter((entity) => !entity.editor_hidden).map((entity) => <circle key={entity.tree_id} cx={entity.x} cy={entity.y} r={Number(entity.diameter ?? 72) / 2} fill={colors.green.main} fillOpacity={selected('trees', entity) ? .7 : .5} stroke={selected('trees', entity) ? '#fff' : colors.gray.main} strokeWidth={2} onPointerDown={(event) => choose(event, 'trees', entity)} />)}
      {group.lights.filter((entity) => !entity.editor_hidden).map((entity) => <circle key={entity.light_id} cx={entity.x} cy={entity.y} r={8} fill={kelvinColor(Number(entity.temperature_k))} fillOpacity={selected('lights', entity) ? .85 : .65} stroke={selected('lights', entity) ? '#fff' : colors.gray.main} strokeWidth={2} onPointerDown={(event) => choose(event, 'lights', entity)} />)}
    </svg>
    <Stack sx={{ position: 'absolute', left: 16, top: 16 }} gap={.5}>
      <Tooltip title="Fit floor plan"><IconButton onClick={() => setView(fitted)} sx={{ bgcolor: colors.slate.light }}><RotateCcw size={19} /></IconButton></Tooltip>
      <Tooltip title="Zoom in"><IconButton onClick={() => zoom(.8)} sx={{ bgcolor: colors.slate.light }}><ZoomIn size={19} /></IconButton></Tooltip>
      <Tooltip title="Zoom out"><IconButton onClick={() => zoom(1.25)} sx={{ bgcolor: colors.slate.light }}><ZoomOut size={19} /></IconButton></Tooltip>
      <Tooltip title="Toggle grid"><IconButton onClick={() => setGrid((value) => !value)} color={grid ? 'primary' : 'default'} sx={{ bgcolor: colors.slate.light }}><Grid3X3 size={19} /></IconButton></Tooltip>
    </Stack>
    <Stack direction="row" sx={{ position: 'absolute', left: 70, top: 16 }} gap={.5}>
      <Tooltip title="Trees"><IconButton sx={{ bgcolor: colors.slate.light }}><TreePine size={19} /></IconButton></Tooltip>
      <Tooltip title="Lights"><IconButton sx={{ bgcolor: colors.slate.light }}><Lightbulb size={19} /></IconButton></Tooltip>
    </Stack>
  </Box>;
});
