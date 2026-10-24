import { useEffect, useMemo, useState } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Box, Button, Card, CardContent,
  CardHeader, Chip, Divider, IconButton, MenuItem, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import { ChevronDown, Eye, EyeOff, Layers3, Lock, LockOpen, Minus, Plus, Redo2, Save, Trash2, Undo2 } from 'lucide-react';
import { apiCall } from '../../api/client';
import { colors } from '../../theme';
import type { Sensor } from '../../types';
import { FloorPlanCanvas } from './FloorPlanCanvas';
import { entityId, floorPlanArea, type EntityType, type FloorEntity, type FloorGroup, type FloorPlan } from './floorPlanModel';

interface Selection { type: EntityType; id: string }
const entityLabels: Record<EntityType, string> = { rooms: 'Rooms', surfaces: 'Surfaces', openings: 'Openings', trees: 'Trees', lights: 'Lights' };

function clonePlan(plan: FloorPlan): FloorPlan {
  const value = structuredClone(plan);
  value.data.groups.forEach((group) => {
    group.group_id ??= crypto.randomUUID();
    (Object.keys(entityLabels) as EntityType[]).forEach((type) => { group[type] ??= [] as never; });
  });
  return value;
}

function closestGroundFloor(groups: FloorGroup[]) {
  return [...groups].sort((a, b) => Math.abs(Number(a.elevation ?? 0)) - Math.abs(Number(b.elevation ?? 0)))[0];
}

export function FloorPlanEditorCard({ plan: source, sensors, onSaved }: { plan: FloorPlan; sensors: Record<string, Sensor>; onSaved?: (plan: FloorPlan) => void }) {
  const initialPlan = useMemo(() => clonePlan(source), [source]);
  const [expanded, setExpanded] = useState(false);
  const [plan, setPlan] = useState(initialPlan);
  const [saved, setSaved] = useState(() => JSON.stringify(initialPlan.data));
  const [groupId, setGroupId] = useState(() => closestGroundFloor(source.data.groups)?.group_id);
  const [selection, setSelection] = useState<Selection>();
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<FloorPlan[]>([]);
  const [future, setFuture] = useState<FloorPlan[]>([]);
  const group = plan.data.groups.find((item) => item.group_id === groupId) ?? plan.data.groups[0];
  const dirty = JSON.stringify(plan.data) !== saved;
  const selectedEntity = useMemo(() => {
    if (!selection || !group) return undefined;
    return group[selection.type].find((entity) => entityId(selection.type, entity) === selection.id);
  }, [group, selection]);

  const checkpoint = () => { setHistory((items) => [...items.slice(-49), clonePlan(plan)]); setFuture([]); };
  const mutatePlan = (change: (draft: FloorPlan) => void, record = true) => setPlan((current) => {
    if (record) { setHistory((items) => [...items.slice(-49), clonePlan(current)]); setFuture([]); }
    const next = clonePlan(current); change(next); return next;
  });
  const mutateGroup = (change: (draft: FloorGroup) => void, record = true) => mutatePlan((draft) => { const floor = draft.data.groups.find((item) => item.group_id === group.group_id); if (floor) change(floor); }, record);
  const mutateEntity = (change: (draft: FloorEntity) => void) => {
    if (!selection) return;
    mutateGroup((draft) => { const entity = draft[selection.type].find((item) => entityId(selection.type, item) === selection.id); if (entity) change(entity); });
  };
  const addEntity = (type: EntityType) => {
    const id = crypto.randomUUID();
    mutateGroup((draft) => {
      const common = { x: 400, y: 250, name: '', editor_hidden: false, editor_locked: false };
      if (type === 'rooms') draft.rooms.push({ ...common, room_id: id, ceiling_height: Number(draft.height ?? 96), points: [{ x: -60, y: -45 }, { x: 60, y: -45 }, { x: 60, y: 45 }, { x: -60, y: 45 }] });
      else if (type === 'surfaces') draft.surfaces.push({ ...common, surface_id: id, color: '#9a9a96', points: [{ x: -60, y: -45 }, { x: 60, y: -45 }, { x: 60, y: 45 }, { x: -60, y: 45 }] });
      else if (type === 'openings') draft.openings.push({ ...common, opening_id: id, type: 'window', width: 36, points: [{ x: 382, y: 250 }, { x: 418, y: 250 }] });
      else if (type === 'trees') draft.trees.push({ ...common, tree_id: id, type: 'round', diameter: 72, height: 120 });
      else draft.lights.push({ ...common, light_id: id, elevation: 72, intensity: 'normal', temperature_k: 4000 });
    });
    setSelection({ type, id });
  };
  const removeSelected = () => {
    if (!selection) return;
    mutateGroup((draft) => { const index = draft[selection.type].findIndex((item) => entityId(selection.type, item) === selection.id); if (index >= 0) draft[selection.type].splice(index, 1); });
    setSelection(undefined);
  };
  const addPoint = () => mutateEntity((entity) => {
    const polygon = entity as FloorEntity & { points?: Array<{ x: number; y: number }> }; if (!polygon.points || polygon.points.length < 2) return;
    let edge = 0; let longest = -1;
    polygon.points.forEach((point, index) => { const next = polygon.points![(index + 1) % polygon.points!.length]; const length = Math.hypot(next.x - point.x, next.y - point.y); if (length > longest) { longest = length; edge = index; } });
    const next = polygon.points[(edge + 1) % polygon.points.length]; const point = polygon.points[edge]; polygon.points.splice(edge + 1, 0, { x: Math.round((point.x + next.x) / 2), y: Math.round((point.y + next.y) / 2) });
  });
  const removePoint = () => mutateEntity((entity) => { const polygon = entity as FloorEntity & { points?: Array<{ x: number; y: number }> }; if (polygon.points && polygon.points.length > 3) polygon.points.pop(); });
  const addFloor = () => {
    const id = crypto.randomUUID(); const top = Math.max(...plan.data.groups.map((item) => Number(item.elevation ?? 0) + Number(item.height ?? 96)), 0);
    mutatePlan((draft) => { draft.data.groups.push({ group_id: id, name: `Floor ${draft.data.groups.length + 1}`, elevation: top, height: 96, rooms: [], surfaces: [], openings: [], trees: [], lights: [] }); });
    setGroupId(id); setSelection(undefined);
  };
  const removeFloor = () => {
    if (plan.data.groups.length <= 1) return; const index = plan.data.groups.findIndex((item) => item.group_id === group.group_id); const replacement = plan.data.groups[index > 0 ? index - 1 : 1];
    mutatePlan((draft) => { draft.data.groups = draft.data.groups.filter((item) => item.group_id !== group.group_id); }); setGroupId(replacement.group_id); setSelection(undefined);
  };
  const save = async () => {
    setSaving(true);
    try {
      await apiCall({ resource: 'floor_plan', method: 'update', arguments: { attributes: { floor_plan_id: plan.floor_plan_id, data: plan.data } } });
      setSaved(JSON.stringify(plan.data));
      setHistory([]); setFuture([]);
      onSaved?.(structuredClone(plan));
      if (window.beestat?.cache?.floor_plan?.[plan.floor_plan_id]) window.beestat.cache.floor_plan[plan.floor_plan_id].data = structuredClone(plan.data);
    } finally { setSaving(false); }
  };
  const undo = () => { const previous = history.at(-1); if (!previous) return; setFuture((items) => [clonePlan(plan), ...items].slice(0, 50)); setHistory((items) => items.slice(0, -1)); setPlan(previous); setSelection(undefined); };
  const redo = () => { const next = future[0]; if (!next) return; setHistory((items) => [...items.slice(-49), clonePlan(plan)]); setFuture((items) => items.slice(1)); setPlan(next); setSelection(undefined); };
  useEffect(() => {
    if (!expanded) return;
    const keys = (event: KeyboardEvent) => {
      const editing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); }
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); if (dirty && !saving) void save(); }
      else if (!editing && (event.key === 'Delete' || event.key === 'Backspace')) removeSelected();
      else if (event.key === 'Escape') setSelection(undefined);
    };
    window.addEventListener('keydown', keys); return () => window.removeEventListener('keydown', keys);
  });

  return <Card>
    <CardHeader title="Floor Plan" action={<Stack direction="row" gap={.5}>{dirty && <Chip size="small" color="warning" label="Unsaved" />}<Tooltip title="Undo"><span><IconButton aria-label="Undo floor-plan change" disabled={!history.length} onClick={undo}><Undo2 /></IconButton></span></Tooltip><Tooltip title="Redo"><span><IconButton aria-label="Redo floor-plan change" disabled={!future.length} onClick={redo}><Redo2 /></IconButton></span></Tooltip><Tooltip title="Save floor plan"><span><IconButton aria-label="Save floor plan" disabled={!dirty || saving} onClick={() => void save()}><Save /></IconButton></span></Tooltip></Stack>} />
    <CardContent sx={{ pt: 0 }}>
      <Button fullWidth onClick={() => setExpanded((value) => !value)} sx={{ minHeight: 49, px: 1.5, bgcolor: colors.lightBlue.main, color: '#fff', justifyContent: 'space-between', '&:hover': { bgcolor: colors.lightBlue.main } }}>
        <Stack direction="row" gap={1.5} alignItems="center"><Layers3 /><Box textAlign="left"><Typography fontWeight={600}>{plan.name}</Typography><Typography variant="caption">{plan.data.groups.length} Floors · {floorPlanArea(plan).toLocaleString()} ft²</Typography></Box></Stack>
        <ChevronDown style={{ transform: expanded ? 'rotate(180deg)' : undefined }} />
      </Button>
      {expanded && group && <>
        <Box mt={1} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 250px' }, bgcolor: colors.slate.dark }}>
          <FloorPlanCanvas group={group} selection={selection} onSelect={setSelection} onAdd={addEntity} onMoveStart={checkpoint} onMovePoint={(type, id, pointIndex, x, y) => mutateGroup((draft) => {
            const entity = draft[type].find((item) => entityId(type, item) === id) as (FloorEntity & { points?: Array<{ x: number; y: number }> }) | undefined;
            const point = entity?.points?.[pointIndex]; if (!point) return;
            point.x = Math.round(x); point.y = Math.round(y);
          }, false)} onMove={(type, id, x, y) => mutateGroup((draft) => {
            const entity = draft[type].find((item) => entityId(type, item) === id);
            if (!entity) return;
            if (type === 'openings') {
              const dx = x - entity.x; const dy = y - entity.y;
              const opening = entity as FloorEntity & { points: Array<{ x: number; y: number }> };
              opening.points = opening.points.map((point) => ({ x: point.x + dx, y: point.y + dy }));
            }
            entity.x = Math.round(x); entity.y = Math.round(y);
          }, false)} />
          <Box sx={{ p: 1, maxHeight: { xs: 360, lg: 500 }, overflow: 'auto', borderLeft: { lg: `1px solid ${colors.slate.light}` } }}>
            {plan.data.groups.map((item) => <Accordion key={item.group_id} expanded={item.group_id === group.group_id} onChange={() => { setGroupId(item.group_id); setSelection(undefined); }} disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ChevronDown size={18} />}><Typography color={item.group_id === group.group_id ? colors.lightBlue.light : 'inherit'} fontWeight={600}>{item.name || 'Floor'}</Typography></AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                {(Object.keys(entityLabels) as EntityType[]).map((type) => <Accordion key={type} disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ChevronDown size={16} />} sx={{ minHeight: 36, '& .MuiAccordionSummary-content': { my: .5 } }}><Typography variant="caption" fontWeight={600}>{entityLabels[type]} ({item[type].length})</Typography></AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    {item[type].map((entity, index) => {
                      const id = entityId(type, entity); const active = selection?.type === type && selection.id === id;
                      return <Stack key={id} direction="row" alignItems="center" onClick={() => setSelection({ type, id })} sx={{ pl: 2, minHeight: 32, bgcolor: active ? 'rgba(69,170,242,.16)' : undefined, cursor: 'pointer' }}>
                        <Typography variant="caption" noWrap sx={{ flex: 1 }}>{entity.name || `${entityLabels[type].slice(0, -1)} ${index + 1}`}</Typography>
                        <IconButton aria-label={entity.editor_hidden ? 'Show' : 'Hide'} onClick={(event) => { event.stopPropagation(); setSelection({ type, id }); mutateGroup((draft) => { const target = draft[type].find((value) => entityId(type, value) === id); if (target) target.editor_hidden = !target.editor_hidden; }); }}>{entity.editor_hidden ? <EyeOff size={15} /> : <Eye size={15} />}</IconButton>
                        <IconButton aria-label={entity.editor_locked ? 'Unlock' : 'Lock'} onClick={(event) => { event.stopPropagation(); setSelection({ type, id }); mutateGroup((draft) => { const target = draft[type].find((value) => entityId(type, value) === id); if (target) target.editor_locked = !target.editor_locked; }); }}>{entity.editor_locked ? <Lock size={15} /> : <LockOpen size={15} />}</IconButton>
                      </Stack>;
                    })}
                  </AccordionDetails>
                </Accordion>)}
              </AccordionDetails>
            </Accordion>)}
          </Box>
        </Box>
        <Divider />
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} mt={1}>
          {selectedEntity ? <>
            <TextField fullWidth size="small" label="Name" value={String(selectedEntity.name ?? '')} onChange={(event) => mutateEntity((entity) => { entity.name = event.target.value; })} />
            <TextField fullWidth size="small" label="X (in)" type="number" value={selectedEntity.x} onChange={(event) => mutateEntity((entity) => { entity.x = Number(event.target.value); })} />
            <TextField fullWidth size="small" label="Y (in)" type="number" value={selectedEntity.y} onChange={(event) => mutateEntity((entity) => { entity.y = Number(event.target.value); })} />
            {selection?.type === 'rooms' && <TextField fullWidth size="small" select label="Sensor" value={String(selectedEntity.sensor_id ?? '')} onChange={(event) => mutateEntity((entity) => { if (event.target.value) entity.sensor_id = Number(event.target.value); else delete entity.sensor_id; })}><MenuItem value="">No sensor</MenuItem>{Object.values(sensors).map((sensor) => <MenuItem key={sensor.sensor_id} value={String(sensor.sensor_id)}>{sensor.name}</MenuItem>)}</TextField>}
            {selection?.type === 'surfaces' && <><TextField size="small" label="Color" type="color" value={String(selectedEntity.color ?? '#9a9a96')} onChange={(event) => mutateEntity((entity) => { entity.color = event.target.value; })} sx={{ minWidth: 100 }} /><TextField size="small" label="Height (in)" type="number" value={Number(selectedEntity.height ?? 0)} onChange={(event) => mutateEntity((entity) => { entity.height = Number(event.target.value); })} /></>}
            {selection?.type === 'openings' && <><TextField size="small" select label="Type" value={String(selectedEntity.type ?? 'empty')} onChange={(event) => mutateEntity((entity) => { entity.type = event.target.value; })}>{['empty', 'door', 'window', 'glass'].map((value) => <MenuItem key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</MenuItem>)}</TextField><TextField size="small" label="Height (in)" type="number" value={Number(selectedEntity.height ?? 60)} onChange={(event) => mutateEntity((entity) => { entity.height = Number(event.target.value); })} /><TextField size="small" label="Elevation (in)" type="number" value={Number(selectedEntity.elevation ?? 0)} onChange={(event) => mutateEntity((entity) => { entity.elevation = Number(event.target.value); })} /></>}
            {selection?.type === 'trees' && <><TextField size="small" select label="Type" value={String(selectedEntity.type ?? 'round')} onChange={(event) => mutateEntity((entity) => { entity.type = event.target.value; })}>{['round', 'oval', 'pine'].map((value) => <MenuItem key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</MenuItem>)}</TextField><TextField size="small" label="Diameter (in)" type="number" value={Number(selectedEntity.diameter ?? 72)} onChange={(event) => mutateEntity((entity) => { entity.diameter = Number(event.target.value); })} /><TextField size="small" label="Height (in)" type="number" value={Number(selectedEntity.height ?? 120)} onChange={(event) => mutateEntity((entity) => { entity.height = Number(event.target.value); })} /></>}
            {selection?.type === 'lights' && <><TextField size="small" select label="Intensity" value={String(selectedEntity.intensity ?? 'normal')} onChange={(event) => mutateEntity((entity) => { entity.intensity = event.target.value; })}>{['dim', 'normal', 'bright'].map((value) => <MenuItem key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</MenuItem>)}</TextField><TextField size="small" label="Elevation (in)" type="number" value={Number(selectedEntity.elevation ?? 72)} onChange={(event) => mutateEntity((entity) => { entity.elevation = Number(event.target.value); })} /><TextField size="small" label="Temperature (K)" type="number" value={Number(selectedEntity.temperature_k ?? 4000)} onChange={(event) => mutateEntity((entity) => { entity.temperature_k = Number(event.target.value); })} /></>}
            {(selection?.type === 'rooms' || selection?.type === 'surfaces') && <Stack direction="row"><Tooltip title="Add point to longest edge"><IconButton aria-label="Add shape point" onClick={addPoint}><Plus /></IconButton></Tooltip><Tooltip title="Remove last point"><span><IconButton aria-label="Remove shape point" disabled={!(selectedEntity.points as unknown[] | undefined)?.length || (selectedEntity.points as unknown[]).length <= 3} onClick={removePoint}><Minus /></IconButton></span></Tooltip></Stack>}
            <Tooltip title="Delete selected object"><IconButton aria-label="Delete selected object" color="error" onClick={removeSelected}><Trash2 /></IconButton></Tooltip>
          </> : <>
            <TextField fullWidth size="small" label="Floor Name" value={group.name ?? ''} onChange={(event) => mutateGroup((draft) => { draft.name = event.target.value; })} />
            <TextField fullWidth size="small" label="Elevation (ft)" type="number" value={Number(group.elevation ?? 0) / 12} onChange={(event) => mutateGroup((draft) => { draft.elevation = Number(event.target.value) * 12; })} />
            <TextField fullWidth size="small" label="Ceiling Height (ft)" type="number" value={Number(group.height ?? 96) / 12} onChange={(event) => mutateGroup((draft) => { draft.height = Number(event.target.value) * 12; })} />
            <Button startIcon={<Plus />} onClick={addFloor}>Add Floor</Button>
            <Button color="error" startIcon={<Trash2 />} disabled={plan.data.groups.length <= 1} onClick={removeFloor}>Delete Floor</Button>
          </>}
        </Stack>
      </>}
    </CardContent>
  </Card>;
}
