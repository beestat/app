import { alpha, Box, useTheme } from '@mui/material';
import { useEffect, useRef } from 'react';
import type { DashboardData, Sensor } from '../../types';
import type { FloorPlan } from './floorPlanModel';

/**
 * React lifecycle host for beestat's original floor-plan editor. The editor is
 * deliberately reused intact: its geometry editing, snapping, layer ordering,
 * keyboard behavior, and responsive sidebar have years of edge-case handling.
 */
export function ExactFloorPlanEditor({
  plan,
  plans,
  sensors,
  thermostatId,
  data,
  onChanged,
  onPlansChanged,
  onSwitch,
  onReady,
}: {
  plan: FloorPlan;
  plans: FloorPlan[];
  sensors: Record<string, Sensor>;
  thermostatId?: number;
  data?: DashboardData;
  onChanged?: (plan: FloorPlan) => void;
  onPlansChanged?: (plans: FloorPlan[]) => void;
  onSwitch?: (floorPlanId: number) => void;
  onReady?: () => void;
}) {
  const theme = useTheme();
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const legacy = (window as any).beestat;
    const dollar = (window as any).$;
    if (!host.current || !legacy?.component?.card?.floor_plan_editor || !dollar) return;

    legacy.cache.floor_plan = Object.fromEntries(plans.map((item) => [item.floor_plan_id, item]));
    legacy.cache.sensor = sensors;
    legacy.cache.thermostat = data?.thermostat ?? {};
    legacy.cache.address = data?.address ?? {};
    legacy.cache.stripe_event = data?.stripe_event ?? {};
    const user = structuredClone(data?.user ?? { user_id: 1, settings: {} });
    user.settings ??= {};
    user.settings.visualize ??= {};
    user.settings.visualize.floor_plan_id = plan.floor_plan_id;
    if (thermostatId != null) user.settings.thermostat_id = thermostatId;
    legacy.cache.user = { [String(user.user_id ?? 1)]: user };

    let changeTimer: number | undefined;
    const handleChange = () => {
      window.clearTimeout(changeTimer);
      changeTimer = window.setTimeout(() => {
        const livePlans = Object.values(legacy.cache.floor_plan ?? {}) as FloorPlan[];
        onPlansChanged?.(livePlans.map((item) => ({ ...item })));
        const live = legacy.cache.floor_plan[plan.floor_plan_id];
        if (live) onChanged?.({ ...live });
      }, 180);
    };
    const handleSwitch = () => {
      const next = Number(legacy.setting('visualize.floor_plan_id'));
      if (Number.isFinite(next) && next !== plan.floor_plan_id) onSwitch?.(next);
    };
    legacy.dispatcher.addEventListener('cache.floor_plan', handleChange);
    legacy.dispatcher.addEventListener('setting.visualize.floor_plan_id', handleSwitch);

    // Rendering the legacy component normalizes old plan records and centers
    // its view. Neither operation is a user edit, so do not let that initial
    // render enqueue a database write.
    const queueDataSave = legacy.floor_plan.queue_data_save_;
    legacy.floor_plan.queue_data_save_ = () => undefined;
    const editor = new legacy.component.card.floor_plan_editor(thermostatId);
    editor.state_.layers_sidebar.mobile_mode = window.innerWidth < 600 || editor.state_.layers_sidebar.mobile_mode === true;
    editor.render(dollar(host.current));
    const restoreQueue = window.setTimeout(() => { legacy.floor_plan.queue_data_save_ = queueDataSave; }, 0);
    host.current.dataset.editorEngine = 'beestat-exact';
    onReady?.();
    const responsiveEditor = new ResizeObserver(([entry]) => {
      const mobile = entry.contentRect.width < 600;
      if (editor.state_.layers_sidebar.mobile_mode !== mobile) {
        editor.state_.layers_sidebar.mobile_mode = mobile;
        editor.rerender();
      }
    });
    responsiveEditor.observe(host.current);

    return () => {
      window.clearTimeout(changeTimer);
      window.clearTimeout(restoreQueue);
      responsiveEditor.disconnect();
      legacy.floor_plan.queue_data_save_ = queueDataSave;
      legacy.dispatcher.removeEventListener('cache.floor_plan', handleChange);
      legacy.dispatcher.removeEventListener('setting.visualize.floor_plan_id', handleSwitch);
      legacy.dispatcher.removeEventListener('resize.floor_plan_editor');
      editor.floor_plan_?.dispose?.();
      editor.compass_?.dispose?.();
      editor.layers_sidebar_?.dispose?.();
      editor.dispose?.();
    };
    // The legacy editor owns the live plan object until its plan id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.floor_plan_id, thermostatId]);

  const themed = (color: string) => `${color} !important`;
  return <Box ref={host} sx={{
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
    overflow: 'hidden',
    '& [style*="background: rgb(47, 61, 68)"]': { background: themed(theme.palette.background.paper) },
    '& [style*="background: rgba(47, 61, 68, 0.9)"]': { background: themed(alpha(theme.palette.background.paper, .94)) },
    '& [style*="background: rgb(38, 50, 56)"]': { background: themed(theme.palette.surface.subtle) },
    '& [style*="background: rgb(55, 71, 79)"]': { background: themed(theme.palette.surface.raised) },
    '& [style*="background: rgb(35, 138, 201)"]': { background: themed(theme.palette.primary.main) },
    '& [style*="color: rgb(255, 255, 255)"]': { color: themed(theme.palette.text.primary) },
    '& [style*="color: rgb(209, 216, 224)"]': { color: themed(theme.palette.text.secondary) },
    '& [style*="color: rgb(69, 170, 242)"]': { color: themed(theme.palette.primary.light) },
    '& [style*="color: rgb(38, 50, 56)"]': { color: themed(theme.palette.text.disabled) },
    '& [title][style*="color: rgb(38, 50, 56)"]': { background: themed('transparent'), boxShadow: themed('none'), cursor: themed('default'), opacity: .58 },
    '& [style*="border-color: rgba(255, 255, 255, 0.12)"]': { borderColor: themed(theme.palette.divider) },
    '& [style*="border-color: rgba(255, 255, 255, 0.18)"]': { borderColor: themed(theme.palette.divider) },
    '& [style*="box-shadow: rgb(69, 170, 242) 3px 0px 0px inset"]': { boxShadow: themed(`${theme.palette.primary.main} 3px 0 0 inset`) },
  }} />;
}
