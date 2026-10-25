import { useEffect, useMemo, useRef } from 'react';
import type { Sensor, Thermostat } from '../../types';
import type { FloorPlan } from './floorPlanModel';

/** React lifecycle host for Beestat's complete original 3D card and toolbar. */
export function ExactThreeCard({
  plan,
  settings,
  sensors,
  thermostats,
}: {
  plan: FloorPlan;
  settings: Record<string, any>;
  sensors: Record<string, Sensor>;
  thermostats: Record<string, Thermostat>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const card = useRef<any>(undefined);
  const previousSettings = useRef<Record<string, any> | undefined>(undefined);
  const rangeKey = useMemo(() => JSON.stringify([settings.range_type, settings.range_dynamic, settings.range_static]), [settings.range_dynamic, settings.range_static, settings.range_type]);

  useEffect(() => {
    const legacy = (window as any).beestat;
    const dollar = (window as any).$;
    if (!host.current || !legacy?.component?.card?.three_d || !dollar) return;

    legacy.cache.floor_plan ??= {};
    legacy.cache.floor_plan[plan.floor_plan_id] = plan;
    legacy.cache.sensor = sensors;
    legacy.cache.thermostat = thermostats;
    const user = legacy.user?.get?.();
    if (user) {
      user.settings ??= {};
      user.settings.visualize = structuredClone(settings);
    }
    delete legacy.cache.data.three_d__runtime_sensor;
    delete legacy.cache.data.three_d__runtime_thermostat;

    const instance = new legacy.component.card.three_d().set_floor_plan_id(plan.floor_plan_id);
    card.current = instance;
    instance.render(dollar(host.current));
    host.current.dataset.sceneCardEngine = 'beestat-exact';
    const markCanvas = () => {
      const canvas = host.current?.querySelector('canvas');
      canvas?.setAttribute('data-native-three', 'true');
      canvas?.setAttribute('data-scene-engine', 'beestat-exact');
    };
    const canvasObserver = new MutationObserver(markCanvas);
    canvasObserver.observe(host.current, { childList: true, subtree: true });
    markCanvas();
    const markTimer = window.setTimeout(markCanvas, 500);

    return () => {
      window.clearTimeout(markTimer);
      canvasObserver.disconnect();
      instance.dispose?.();
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

  return <div ref={host} />;
}
