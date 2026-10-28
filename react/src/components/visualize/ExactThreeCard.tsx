import { Box } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Sensor, Thermostat } from '../../types';
import type { FloorPlan } from './floorPlanModel';
import { VisualizerLoader } from './VisualizerLoader';
import { apiBatch } from '../../api/client';

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
  const runtimeRequest = useRef(0);
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
    let pointerInsideScene = false;
    let readyFrame = 0;
    let readySecondFrame = 0;
    setLoading(true);
    setLoadingDetail('Building your home, environment, and sensor visualization…');

    const shouldPauseScene = () => !pointerInsideScene && instance?.scene_?.controls_?.autoRotate !== true;
    const handlePointerContext = (event: PointerEvent) => {
      pointerInsideScene = Boolean(host.current?.contains(event.target as Node));
      if (instance?.scene_) instance.scene_.animation_paused_ = shouldPauseScene();
    };
    document.addEventListener('pointerover', handlePointerContext, true);

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
      // Runtime range changes do not alter any floor-plan geometry. The legacy
      // card rebuilt the complete Three scene whenever its runtime caches
      // changed, which froze the main thread and discarded useful GPU work.
      // Keep the exact renderer and scene, and only replace the data it reads.
      legacy.dispatcher.removeEventListener('cache.data.three_d__runtime_sensor', instance.handle_runtime_data_change_);
      legacy.dispatcher.removeEventListener('cache.data.three_d__runtime_thermostat', instance.handle_runtime_data_change_);
      instance.handle_runtime_data_change_ = legacy.debounce(() => {
        if (instance.disposed_ || !instance.scene_) return;
        delete instance.data_;
        instance.scene_.data_ = instance.get_data_();
        instance.scene_.data_type_ = legacy.setting('visualize.data_type');
        instance.scene_.gradient_ = instance.get_gradient_();
        instance.scene_.heat_map_min_ = instance.get_heat_map_min_();
        instance.scene_.heat_map_max_ = instance.get_heat_map_max_();
        instance.try_align_time_to_recent_data_();
        instance.scene_.set_date(instance.date_m_);
        instance.update_hud_();
        instance.scene_.pause_after_frame_ = shouldPauseScene();
        instance.scene_.after_next_frame_ = () => { if (mounted) setLoading(false); };
        instance.scene_.animation_paused_ = false;
      }, 10);
      legacy.dispatcher.addEventListener(['cache.data.three_d__runtime_sensor', 'cache.data.three_d__runtime_thermostat'], instance.handle_runtime_data_change_);
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
      instance.scene_.animation_paused_ = shouldPauseScene();
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
      document.removeEventListener('pointerover', handlePointerContext, true);
      legacy.dispatcher.removeEventListener('cache.floor_plan', refreshRuntimeKey);
      const staleInstance = instance;
      // Scene disposal traverses and releases a large Three.js graph. Deferring
      // it by one painted frame prevents a range-button click from being held
      // hostage before the replacement loader becomes visible.
      requestAnimationFrame(() => requestAnimationFrame(() => staleInstance?.dispose?.()));
      if (card.current === instance) card.current = undefined;
    };
    // The scene remains mounted across date-range changes; the settings effect
    // below refreshes its runtime streams without rebuilding its geometry.
  }, [plan.floor_plan_id]);

  useEffect(() => {
    const legacy = (window as any).beestat;
    const user = legacy?.user?.get?.();
    if (!legacy || !user) return;
    user.settings ??= {};
    user.settings.visualize = structuredClone(settings);
    const previous = previousSettings.current;
    previousSettings.current = structuredClone(settings);
    if (!previous || !card.current) return;
    const instance = card.current;
    const get = (value: Record<string, any>, path: string) => path.split('.').reduce((item, key) => item?.[key], value);
    const paths = [
      'data_type',
      'heat_map_values',
      'heat_map_static.temperature.min',
      'heat_map_static.temperature.max',
      'heat_map_static.occupancy.min',
      'heat_map_static.occupancy.max',
    ];
    paths.forEach((path) => {
      if (get(previous, path) !== get(settings, path)) legacy.dispatcher.dispatchEvent(`setting.visualize.${path}`);
    });
    const rangeChanged = ['range_type', 'range_dynamic', 'range_static.begin', 'range_static.end']
      .some((path) => get(previous, path) !== get(settings, path));
    if (!rangeChanged) return;

    const request = ++runtimeRequest.current;
    instance.scene_.animation_paused_ = true;
    setLoading(true);
    setLoadingDetail('Loading sensor history and updating the existing scene…');
    const sensorIds = Object.keys(legacy.floor_plan.get_sensor_ids_map(plan.floor_plan_id));
    const thermostatIds = Object.keys(legacy.floor_plan.get_thermostat_ids_map(plan.floor_plan_id));
    const beginning = new Date();
    const ending = new Date();
    if (settings.range_type === 'static' && settings.range_static?.begin && settings.range_static?.end) {
      const [beginMonth, beginDay, beginYear] = String(settings.range_static.begin).split('/').map(Number);
      const [endMonth, endDay, endYear] = String(settings.range_static.end).split('/').map(Number);
      beginning.setFullYear(beginYear, beginMonth - 1, beginDay);
      ending.setFullYear(endYear, endMonth - 1, endDay);
    } else {
      const days = Number(settings.range_dynamic ?? 7);
      beginning.setDate(beginning.getDate() - days);
      if (days === 0 || days === 1) ending.setTime(beginning.getTime());
      else ending.setDate(ending.getDate() - 1);
    }
    beginning.setHours(0, 0, 0, 0);
    ending.setHours(23, 59, 59, 0);
    const range = [beginning.toISOString(), ending.toISOString()];
    const calls = [
      ...sensorIds.map((sensorId) => ({ resource: 'runtime_sensor', method: 'read', alias: `runtime_sensor_${sensorId}`, arguments: { attributes: { sensor_id: sensorId, timestamp: { value: range, operator: 'between' } } } })),
      ...thermostatIds.map((thermostatId) => ({ resource: 'runtime_thermostat', method: 'read', alias: `runtime_thermostat_${thermostatId}`, arguments: { attributes: { thermostat_id: thermostatId, timestamp: { value: range, operator: 'between' } } } })),
    ];
    void apiBatch<Record<string, any[]>>(calls).then((response) => {
      if (request !== runtimeRequest.current || instance !== card.current) return;
      const runtimeSensors = sensorIds.flatMap((sensorId) => response[`runtime_sensor_${sensorId}`] ?? []);
      const runtimeThermostats = thermostatIds.flatMap((thermostatId) => response[`runtime_thermostat_${thermostatId}`] ?? []);
      const runtimeKey = JSON.stringify([plan.floor_plan_id, rangeKey, sensorIds.slice().sort()]);
      const moment = (window as any).moment;
      if (moment) {
        const now = moment().minute(Math.floor(moment().minute() / 5) * 5).second(0);
        instance.date_m_ = settings.range_type === 'static'
          ? moment(`${settings.range_static?.begin} 00:00:00`).hour(now.hour()).minute(now.minute()).second(0)
          : moment().subtract(Number(settings.range_dynamic ?? 7), 'day').hour(now.hour()).minute(now.minute()).second(0);
      }
      legacy.cache.data.three_d__runtime_key = runtimeKey;
      legacy.cache.set('data.three_d__runtime_sensor', runtimeSensors);
      legacy.cache.set('data.three_d__runtime_thermostat', runtimeThermostats);
      setRenderedRangeKey(rangeKey);
    }).catch(() => {
      if (request !== runtimeRequest.current) return;
      if (instance.scene_) instance.scene_.animation_paused_ = !host.current?.matches(':hover') && instance.scene_.controls_?.autoRotate !== true;
      setRenderedRangeKey(rangeKey);
      setLoading(false);
    });
  }, [settings]);

  const showingLoader = preparing || loading || renderedRangeKey !== rangeKey;
  // The exact renderer owns a 500px drawing surface. Keep the lifecycle host
  // at that same height so its bottom-anchored watermark and date scrubber
  // remain over the scene instead of falling into space beneath the canvas.
  return <Box data-visualizer-stage sx={{ position: 'relative', height: 500, overflow: 'hidden', borderRadius: 1 }} aria-busy={showingLoader}>
    <Box ref={host} sx={{ height: '100%', opacity: showingLoader ? 0 : 1, transition: 'opacity 160ms ease-out' }} />
    {showingLoader && <Box sx={{ position: 'absolute', inset: 0, zIndex: 10 }}><VisualizerLoader height="100%" label="Preparing 3D view" detail={preparing ? 'Updating the time period and preparing fresh sensor data…' : loadingDetail} /></Box>}
  </Box>;
}
