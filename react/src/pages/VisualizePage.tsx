import { Box, Button, Card, CardContent, CardHeader, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Plus, X } from 'lucide-react';
import { apiBatch, apiCall, config } from '../api/client';
import { useDashboard } from '../state/DashboardContext';
import { VisualizeSettingsCard } from '../components/visualize/VisualizeSettingsCard';
import { ExactFloorPlanEditor } from '../components/visualize/ExactFloorPlanEditor';
import type { FloorPlan } from '../components/visualize/floorPlanModel';
import { ExactThreeCard } from '../components/visualize/ExactThreeCard';
import { FloorPlanCreateDialog, type FloorPlanDraft } from '../components/visualize/FloorPlanCreateDialog';
import { LazyMount } from '../components/common/LazyMount';
import { VisualizerLoader } from '../components/visualize/VisualizerLoader';
import { preloadLegacyVisualizer } from '../components/visualize/legacyVisualizer';

export function VisualizePage() {
  const { data, thermostatId } = useDashboard();
  const [visualizeState, setVisualizeState] = useState<Record<string, any>>({});
  const [savedPlan, setSavedPlan] = useState<FloorPlan>();
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [preparing3d, setPreparing3d] = useState(false);
  const [legacyReady, setLegacyReady] = useState(() => Boolean((window as any).beestat?.component?.card?.three_d));
  const [legacyError, setLegacyError] = useState<string>();
  const pendingRangeUpdates = useRef(new Map<string, unknown>());
  const rangeFrame = useRef(0);
  const rangeSecondFrame = useRef(0);
  const [createOpen, setCreateOpen] = useState(false); const [creating, setCreating] = useState(false); const [createError, setCreateError] = useState<string>(); const [deleteOpen, setDeleteOpen] = useState(false); const [deleting, setDeleting] = useState(false);
  useEffect(() => { setVisualizeState(structuredClone(data?.user?.settings?.visualize ?? {})); }, [data?.user?.settings?.visualize]);
  useEffect(() => { setFloorPlans(Object.values(data?.floor_plan ?? {}) as FloorPlan[]); }, [data?.floor_plan]);
  useEffect(() => { void preloadLegacyVisualizer().then(() => setLegacyReady(true)).catch((error) => setLegacyError(error instanceof Error ? error.message : 'Unable to load the visualizer.')); }, []);
  const visualize = visualizeState;
  const hasFloorPlan = visualize.floor_plan_id != null || floorPlans[0]?.floor_plan_id != null;
  const sourcePlan = floorPlans.find((plan) => plan.floor_plan_id === visualize.floor_plan_id) ?? floorPlans[0];
  const activePlan = savedPlan?.floor_plan_id === sourcePlan?.floor_plan_id ? savedPlan : sourcePlan;
  const storePlan = (next: FloorPlan) => { setSavedPlan(next); setFloorPlans((items) => [...items.filter((item) => item.floor_plan_id !== next.floor_plan_id), next]); };
  const commitSettings = (updates: Array<[string, unknown]>) => {
    setVisualizeState((current) => {
      const next = structuredClone(current);
      updates.forEach(([key, value]) => { const parts = key.replace(/^visualize\./, '').split('.'); let target = next; parts.slice(0, -1).forEach((part) => { target[part] ??= {}; target = target[part]; }); target[parts.at(-1)!] = value; });
      return next;
    });
    updates.forEach(([key, value]) => { void apiCall({ resource: 'user', method: 'update_setting', arguments: { key, value } }); });
  };
  const updateSetting = (key: string, value: unknown) => {
    if (!key.startsWith('visualize.range_') || !activePlan) {
      commitSettings([[key, value]]);
      return;
    }
    pendingRangeUpdates.current.set(key, value);
    // Stop the exact legacy render loop in the click handler, before React's
    // deferred settings effect and before the next expensive WebGL frame can
    // begin. The scene is resumed after its replacement runtime data lands.
    const activeThree = (window as any).beestat?.component?.card?.three_d?.active_instance_;
    if (activeThree?.scene_) activeThree.scene_.animation_paused_ = true;
    // Commit the loader before scheduling any teardown or scene construction.
    // React's normal event batching can otherwise combine this with the heavy
    // range update and leave the old frame frozen on screen for several seconds.
    setPreparing3d(true);
    cancelAnimationFrame(rangeFrame.current);
    cancelAnimationFrame(rangeSecondFrame.current);
    rangeFrame.current = requestAnimationFrame(() => {
      rangeSecondFrame.current = requestAnimationFrame(() => {
        const updates = [...pendingRangeUpdates.current.entries()];
        pendingRangeUpdates.current.clear();
        commitSettings(updates);
        setPreparing3d(false);
      });
    });
  };
  useEffect(() => () => { cancelAnimationFrame(rangeFrame.current); cancelAnimationFrame(rangeSecondFrame.current); }, []);
  const switchPlan = (floorPlanId: number | null) => { setSavedPlan(undefined); updateSetting('visualize.floor_plan_id', floorPlanId); };
  const createPlan = async (draft: FloorPlanDraft) => {
    setCreating(true); setCreateError(undefined);
    try {
      const distanceUnit = String(data?.user?.settings?.units?.distance ?? 'ft'); const ceilingHeight = draft.ceilingHeight * (distanceUnit === 'm' ? 39.37007874 : 12); const ordinals = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth']; let elevation = draft.basement ? -ceilingHeight : 0; let floor = draft.basement ? 0 : 1;
      const groups = Array.from({ length: draft.floorCount }, () => { const group = { name: floor === 0 ? 'Basement' : `${ordinals[floor - 1]} Floor`, elevation, height: ceilingHeight, rooms: [] }; floor += 1; elevation += ceilingHeight; return group; });
      const attributes = { name: draft.name, ...(draft.addressId == null ? {} : { address_id: draft.addressId }), data: { groups } };
      const response = await apiBatch<{ new_floor_plan: { floor_plan_id: number }; floor_plan: Record<string, FloorPlan> }>([{ resource: 'floor_plan', method: 'create', alias: 'new_floor_plan', arguments: { attributes } }, { resource: 'floor_plan', method: 'read_id', alias: 'floor_plan', arguments: {} }]);
      const id = Number(response.new_floor_plan.floor_plan_id); const nextPlans = Object.values(response.floor_plan ?? {}); setFloorPlans(nextPlans); setSavedPlan(nextPlans.find((item) => item.floor_plan_id === id)); switchPlan(id); setCreateOpen(false);
    } catch (error) { setCreateError(error instanceof Error ? error.message : 'Unable to create the floor plan.'); } finally { setCreating(false); }
  };
  const deletePlan = async () => {
    if (!activePlan) return; setDeleting(true);
    try { const response = await apiBatch<{ floor_plan: Record<string, FloorPlan> }>([{ resource: 'floor_plan', method: 'delete', alias: 'deleted', arguments: { id: activePlan.floor_plan_id } }, { resource: 'floor_plan', method: 'read_id', alias: 'floor_plan', arguments: {} }]); const nextPlans = Object.values(response.floor_plan ?? {}); setFloorPlans(nextPlans); switchPlan(nextPlans[0]?.floor_plan_id ?? null); setDeleteOpen(false); } finally { setDeleting(false); }
  };
  const showAffiliate = hasFloorPlan && visualize.hide_affiliate === false && !config.isDemo;
  if (legacyError) return <Box pb={2}><Card><CardContent><Typography color="error">{legacyError}</Typography></CardContent></Card></Box>;
  if (!legacyReady) return <Box pb={2}><VisualizerLoader label="Loading visualizer" detail="Preparing the exact floor plan and 3D tools…" /></Box>;
  return <Box pb={2} sx={{ '& canvas': { maxWidth: '100%' } }}>
    <Box sx={{ minWidth: 0 }}>
      {!activePlan && <><Card sx={{ mb: 2 }}><CardHeader title="Visualize" /><CardContent sx={{ textAlign: 'center' }}><Button variant="contained" color="success" size="large" startIcon={<Plus />} onClick={() => setCreateOpen(true)}><Stack><span>Get started now!</span><Typography variant="caption">Create my first floor plan</Typography></Stack></Button></CardContent></Card><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>{['https://player.vimeo.com/video/751478276', 'https://player.vimeo.com/video/1173706545'].map((src) => <Box key={src} component="iframe" src={src} title="Visualize walkthrough" allow="autoplay; fullscreen; picture-in-picture" sx={{ width: '100%', border: 0, aspectRatio: '16 / 9' }} />)}</Box></>}
      {activePlan && <Box mb={2}><LazyMount minHeight={548} deferUntilIdle fallback={<VisualizerLoader label="Loading floor plan" detail="Preparing the exact editor and drawing tools…" />}><ExactFloorPlanEditor key={activePlan.floor_plan_id} plan={activePlan as FloorPlan} plans={floorPlans} sensors={data?.sensor ?? {}} thermostatId={thermostatId} data={data} onChanged={storePlan} onPlansChanged={setFloorPlans} onSwitch={switchPlan} /></LazyMount></Box>}
      {showAffiliate && <Card sx={{ mb: 2 }}><CardHeader title="Need more sensors?" action={<IconButton aria-label="Dismiss sensor offer" onClick={() => updateSetting('visualize.hide_affiliate', true)}><X /></IconButton>} /><CardContent><Button component="a" href="https://amzn.to/3SprUVB" target="_blank" rel="noreferrer" variant="contained" color="success" startIcon={<ExternalLink />}><Stack alignItems="flex-start"><span>SmartSensor 2 Pack</span><Typography variant="caption">Amazon Affiliate</Typography></Stack></Button></CardContent></Card>}
      {hasFloorPlan && <Box mb={2}><VisualizeSettingsCard initial={visualize} temperatureUnit={String(data?.user?.settings?.units?.temperature ?? '°F')} onChange={updateSetting} /></Box>}
      {activePlan && <Box mb={2}><LazyMount minHeight={500} rootMargin="-25% 0px" threshold={0.5} deferUntilIdle fallback={<VisualizerLoader label="Preparing 3D view" detail="Building your home, environment, and sensor visualization…" />}><ExactThreeCard plan={activePlan as FloorPlan} settings={visualize} sensors={data?.sensor ?? {}} thermostats={data?.thermostat ?? {}} preparing={preparing3d} /></LazyMount></Box>}
    </Box>
    <FloorPlanCreateDialog open={createOpen} defaultFloors={Math.max(1, Math.min(8, Number(data?.thermostat?.[String(thermostatId)]?.property?.stories ?? 1)))} distanceUnit={String(data?.user?.settings?.units?.distance ?? 'ft')} addresses={data?.address ?? {}} busy={creating} error={createError} onClose={() => setCreateOpen(false)} onCreate={(draft) => void createPlan(draft)} />
    <Dialog open={deleteOpen} onClose={deleting ? undefined : () => setDeleteOpen(false)}><DialogTitle>Delete Floor Plan</DialogTitle><DialogContent><Typography>Are you sure you want to delete “{activePlan?.name}”? This cannot be undone.</Typography></DialogContent><DialogActions><Button color="inherit" disabled={deleting} onClick={() => setDeleteOpen(false)}>Cancel</Button><Button color="error" variant="contained" disabled={deleting} onClick={() => void deletePlan()}>{deleting ? 'Deleting…' : 'Delete Floor Plan'}</Button></DialogActions></Dialog>
  </Box>;
}
