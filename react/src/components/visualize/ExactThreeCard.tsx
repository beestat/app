import { Box } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Sensor, Thermostat } from '../../types';
import type { FloorPlan } from './floorPlanModel';
import { VisualizerLoader } from './VisualizerLoader';

/** React lifecycle host for Beestat's complete original 3D card and toolbar. */
export function ExactThreeCard({
  plan,
  settings,
  sensors,
  thermostats,
  preparing = false,
}: {
  plan: FloorPlan;
  settings: Record<string, any>;
  sensors: Record<string, Sensor>;
  thermostats: Record<string, Thermostat>;
  preparing?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const card = useRef<any>(undefined);
  const previousSettings = useRef<Record<string, any> | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState('Building your home, environment, and sensor visualization…');
  const rangeKey = useMemo(() => JSON.stringify([settings.range_type, settings.range_dynamic, settings.range_static]), [settings.range_dynamic, settings.range_static, settings.range_type]);
  const [renderedRangeKey, setRenderedRangeKey] = useState('');

  useEffect(() => {
    const legacy = (window as any).beestat;
    const dollar = (window as any).$;
    if (!host.current || !legacy?.component?.card?.three_d || !dollar) return;
    let mounted = true;
    let instance: any;
    let canvasObserver: MutationObserver | undefined;
    let markTimer = 0;
    let startFrame = 0;
    let startSecondFrame = 0;
    let legacyLoading = false;
    let readyFrame = 0;
    let readySecondFrame = 0;
    setLoading(true);
    setLoadingDetail('Building your home, environment, and sensor visualization…');

    const refreshRuntimeKey = () => {
      const livePlan = legacy.cache.floor_plan[plan.floor_plan_id] as FloorPlan;
      const sensorIds = livePlan.data.groups.flatMap((group) => group.rooms.map((room) => room.sensor_id)).filter(Boolean).sort();
      const runtimeKey = JSON.stringify([plan.floor_plan_id, rangeKey, sensorIds]);
      if (legacy.cache.data.three_d__runtime_key !== runtimeKey) {
        delete legacy.cache.data.three_d__runtime_sensor;
        delete legacy.cache.data.three_d__runtime_thermostat;
        legacy.cache.data.three_d__runtime_key = runtimeKey;
      }
    };
    const markCanvas = () => {
      const canvas = host.current?.querySelector('canvas');
      canvas?.setAttribute('data-native-three', 'true');
      canvas?.setAttribute('data-scene-engine', 'beestat-exact');
    };
    const initialize = () => {
      if (!mounted || !host.current) return;
      legacy.cache.floor_plan ??= {};
      legacy.cache.floor_plan[plan.floor_plan_id] = plan;
      legacy.cache.sensor = sensors;
      legacy.cache.thermostat = thermostats;
      const user = legacy.user?.get?.();
      if (user) {
        user.settings ??= {};
        user.settings.visualize = structuredClone(settings);
      }
      refreshRuntimeKey();

      instance = new legacy.component.card.three_d().set_floor_plan_id(plan.floor_plan_id);
      card.current = instance;
      const showLoading = instance.show_loading_.bind(instance);
      const hideLoading = instance.hide_loading_.bind(instance);
      instance.show_loading_ = (text: string) => {
        legacyLoading = true;
        if (mounted) {
          setLoading(true);
          setLoadingDetail(text === 'Rendering' ? 'Rendering your updated home and environment…' : 'Loading sensor history and preparing the scene…');
        }
        showLoading(text);
        // Keep the legacy loader's lifecycle semantics, but present every phase
        // through the single branded overlay owned by this React wrapper.
        instance.loading_mask_?.style?.({ display: 'none' });
        instance.contents_?.style?.({ filter: '' });
      };
      instance.hide_loading_ = () => {
        legacyLoading = false;
        hideLoading();
        if (mounted) setLoading(false);
      };
      legacy.dispatcher.addEventListener('cache.floor_plan', refreshRuntimeKey);
      // The renderer fills missing in-memory scene defaults during construction.
      // That normalization is not a user edit and must not enqueue a floor-plan
      // database write merely because the user opened Visualize.
      const queueDataSave = legacy.floor_plan.queue_data_save_;
      legacy.floor_plan.queue_data_save_ = () => undefined;
      try {
        instance.render(dollar(host.current));
      } finally {
        legacy.floor_plan.queue_data_save_ = queueDataSave;
      }
      if (!mounted) return;
      setRenderedRangeKey(rangeKey);
      host.current.dataset.sceneCardEngine = 'beestat-exact';
      canvasObserver = new MutationObserver(markCanvas);
      canvasObserver.observe(host.current, { childList: true, subtree: true });
      markCanvas();
      markTimer = window.setTimeout(markCanvas, 500);
      readyFrame = requestAnimationFrame(() => {
        readySecondFrame = requestAnimationFrame(() => {
          if (mounted && !legacyLoading) setLoading(false);
        });
      });
    };

    // Let React commit and paint the unified loader before entering the legacy
    // renderer's expensive synchronous scene construction.
    startFrame = requestAnimationFrame(() => {
      startSecondFrame = requestAnimationFrame(initialize);
    });

    return () => {
      mounted = false;
      cancelAnimationFrame(startFrame);
      cancelAnimationFrame(startSecondFrame);
      cancelAnimationFrame(readyFrame);
      cancelAnimationFrame(readySecondFrame);
      window.clearTimeout(markTimer);
      canvasObserver?.disconnect();
      legacy.dispatcher.removeEventListener('cache.floor_plan', refreshRuntimeKey);
      const staleInstance = instance;
      // Scene disposal traverses and releases a large Three.js graph. Deferring
      // it by one painted frame prevents a range-button click from being held
      // hostage before the replacement loader becomes visible.
      requestAnimationFrame(() => requestAnimationFrame(() => staleInstance?.dispose?.()));
      if (card.current === instance) card.current = undefined;
    };
    // Date-range changes intentionally recreate the card so its exact runtime
    // fetch and time-alignment logic runs with the new boundaries.
  }, [plan.floor_plan_id, rangeKey]);

  useEffect(() => {
    const legacy = (window as any).beestat;
    const user = legacy?.user?.get?.();
    if (!legacy || !user) return;
    user.settings ??= {};
    user.settings.visualize = structuredClone(settings);
    const previous = previousSettings.current;
    previousSettings.current = structuredClone(settings);
    if (!previous || !card.current) return;
    const paths = [
      'data_type',
      'heat_map_values',
      'heat_map_static.temperature.min',
      'heat_map_static.temperature.max',
      'heat_map_static.occupancy.min',
      'heat_map_static.occupancy.max',
    ];
    const get = (value: Record<string, any>, path: string) => path.split('.').reduce((item, key) => item?.[key], value);
    paths.forEach((path) => {
      if (get(previous, path) !== get(settings, path)) legacy.dispatcher.dispatchEvent(`setting.visualize.${path}`);
    });
  }, [settings]);

  const showingLoader = preparing || loading || renderedRangeKey !== rangeKey;
  return <Box data-visualizer-stage sx={{ position: 'relative', height: 548, overflow: 'hidden', borderRadius: 1 }} aria-busy={showingLoader}>
    <Box ref={host} sx={{ height: '100%', opacity: showingLoader ? 0 : 1, transition: 'opacity 160ms ease-out' }} />
    {showingLoader && <Box sx={{ position: 'absolute', inset: 0, zIndex: 10 }}><VisualizerLoader height="100%" label="Preparing 3D view" detail={preparing ? 'Updating the time period and preparing fresh sensor data…' : loadingDetail} /></Box>}
  </Box>;
}
