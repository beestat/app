import { useMemo, useState } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Box, Button, Card, CardContent,
  CardHeader, Chip, Divider, IconButton, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import { ChevronDown, Eye, EyeOff, Layers3, Lock, LockOpen, Save, Trash2, Undo2 } from 'lucide-react';
import { apiCall } from '../../api/client';
import { colors } from '../../theme';
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

export function FloorPlanEditorCard({ plan: source, onSaved }: { plan: FloorPlan; onSaved?: (plan: FloorPlan) => void }) {
  const initialPlan = useMemo(() => clonePlan(source), [source]);
  const [expanded, setExpanded] = useState(false);
  const [plan, setPlan] = useState(initialPlan);
  const [saved, setSaved] = useState(() => JSON.stringify(initialPlan.data));
  const [groupId, setGroupId] = useState(() => closestGroundFloor(source.data.groups)?.group_id);
  const [selection, setSelection] = useState<Selection>();
  const [saving, setSaving] = useState(false);
  const group = plan.data.groups.find((item) => item.group_id === groupId) ?? plan.data.groups[0];
  const dirty = JSON.stringify(plan.data) !== saved;
  const selectedEntity = useMemo(() => {
    if (!selection || !group) return undefined;
    return group[selection.type].find((entity) => entityId(selection.type, entity) === selection.id);
  }, [group, selection]);

  const mutateGroup = (change: (draft: FloorGroup) => void) => setPlan((current) => {
    const next = clonePlan(current); const draft = next.data.groups.find((item) => item.group_id === group.group_id)!; change(draft); return next;
  });
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
  const save = async () => {
    setSaving(true);
    try {
      await apiCall({ resource: 'floor_plan', method: 'update', arguments: { attributes: { floor_plan_id: plan.floor_plan_id, data: plan.data } } });
      setSaved(JSON.stringify(plan.data));
      onSaved?.(structuredClone(plan));
      if (window.beestat?.cache?.floor_plan?.[plan.floor_plan_id]) window.beestat.cache.floor_plan[plan.floor_plan_id].data = structuredClone(plan.data);
    } finally { setSaving(false); }
  };

  return <Card>
    <CardHeader title="Floor Plan" action={<Stack direction="row" gap={.5}>{dirty && <Chip size="small" color="warning" label="Unsaved" />}<Tooltip title="Undo unsaved changes"><span><IconButton aria-label="Undo unsaved floor-plan changes" disabled={!dirty} onClick={() => { setPlan(clonePlan({ ...plan, data: JSON.parse(saved) })); setSelection(undefined); }}><Undo2 /></IconButton></span></Tooltip><Tooltip title="Save floor plan"><span><IconButton aria-label="Save floor plan" disabled={!dirty || saving} onClick={() => void save()}><Save /></IconButton></span></Tooltip></Stack>} />
    <CardContent sx={{ pt: 0 }}>
      <Button fullWidth onClick={() => setExpanded((value) => !value)} sx={{ minHeight: 49, px: 1.5, bgcolor: colors.lightBlue.main, color: '#fff', justifyContent: 'space-between', '&:hover': { bgcolor: colors.lightBlue.main } }}>
        <Stack direction="row" gap={1.5} alignItems="center"><Layers3 /><Box textAlign="left"><Typography fontWeight={600}>{plan.name}</Typography><Typography variant="caption">{plan.data.groups.length} Floors · {floorPlanArea(plan).toLocaleString()} ft²</Typography></Box></Stack>
        <ChevronDown style={{ transform: expanded ? 'rotate(180deg)' : undefined }} />
      </Button>
      {expanded && group && <>
        <Box mt={1} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 250px' }, bgcolor: colors.slate.dark }}>
          <FloorPlanCanvas group={group} selection={selection} onSelect={setSelection} onAdd={addEntity} onMove={(type, id, x, y) => mutateGroup((draft) => {
            const entity = draft[type].find((item) => entityId(type, item) === id);
            if (!entity) return;
            if (type === 'openings') {
              const dx = x - entity.x; const dy = y - entity.y;
              const opening = entity as FloorEntity & { points: Array<{ x: number; y: number }> };
              opening.points = opening.points.map((point) => ({ x: point.x + dx, y: point.y + dy }));
            }
            entity.x = Math.round(x); entity.y = Math.round(y);
          })} />
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
            <Tooltip title="Delete selected object"><IconButton aria-label="Delete selected object" color="error" onClick={removeSelected}><Trash2 /></IconButton></Tooltip>
          </> : <>
            <TextField fullWidth size="small" label="Floor Name" value={group.name ?? ''} onChange={(event) => mutateGroup((draft) => { draft.name = event.target.value; })} />
            <TextField fullWidth size="small" label="Elevation (ft)" type="number" value={Number(group.elevation ?? 0) / 12} onChange={(event) => mutateGroup((draft) => { draft.elevation = Number(event.target.value) * 12; })} />
            <TextField fullWidth size="small" label="Ceiling Height (ft)" type="number" value={Number(group.height ?? 96) / 12} onChange={(event) => mutateGroup((draft) => { draft.height = Number(event.target.value) * 12; })} />
          </>}
        </Stack>
      </>}
    </CardContent>
  </Card>;
}
