import { Alert, Box, CircularProgress } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { apiCall, config } from '../api/client';
import { useDashboard } from '../state/DashboardContext';
import { VisualizeSettingsCard } from '../components/visualize/VisualizeSettingsCard';
import { FloorPlanEditorCard } from '../components/visualize/FloorPlanEditorCard';
import type { FloorPlan } from '../components/visualize/floorPlanModel';
import { NativeThreeScene } from '../components/visualize/NativeThreeScene';

declare global { interface Window { __BEESTAT_REACT_HOST__?: boolean; beestat?: any; $?: any; THREE?: any; beestat_api_key_local?: string; environment?: string; is_demo?: boolean; commit?: string; } }

let enginePromise: Promise<void> | undefined;

function loadScript(src: string, type?: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[data-visualizer-src="${CSS.escape(src)}"]`)) return resolve();
    const script = document.createElement('script');
    script.src = src; script.dataset.visualizerSrc = src;
    if (type === 'module') script.type = 'module';
    script.onload = () => resolve(); script.onerror = () => reject(new Error(`Unable to load ${src}`));
    document.head.appendChild(script);
  });
}

function loadEngine() {
  if (enginePromise) return enginePromise;
  enginePromise = (async () => {
    window.__BEESTAT_REACT_HOST__ = true;
    window.beestat_api_key_local = config.apiKey; window.environment = config.environment; window.is_demo = config.isDemo; window.commit = config.commit;
    const response = await fetch('/react/legacy-assets.php', { credentials: 'include' });
    if (!response.ok) throw new Error(`Unable to load visualizer assets (${response.status}).`);
    const html = await response.text();
    const documentFragment = new DOMParser().parseFromString(`<html><head>${html}</head></html>`, 'text/html');
    const scripts = [...documentFragment.querySelectorAll('script[src]')];
    for (const script of scripts) await loadScript(script.getAttribute('src')!, script.getAttribute('type') ?? undefined);
  })();
  return enginePromise;
}

export function VisualizePage() {
  const { data, thermostatId } = useDashboard();
  const editorRoot = useRef<HTMLDivElement>(null);
  const sceneRoot = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('Loading the visualizer engine…');
  const nativeScene = new URLSearchParams(window.location.search).has('native_scene');
  const [visualizeState, setVisualizeState] = useState<Record<string, any>>({});
  useEffect(() => { setVisualizeState(structuredClone(data?.user?.settings?.visualize ?? {})); }, [data?.user?.settings?.visualize]);
  useEffect(() => {
    if (!data || !thermostatId || !editorRoot.current || !sceneRoot.current) return;
    if (nativeScene) {
      editorRoot.current.replaceChildren(); sceneRoot.current.replaceChildren(); setState('ready');
      return;
    }
    let stylesheet = document.querySelector<HTMLLinkElement>('link[data-visualizer-style]');
    if (!stylesheet) { stylesheet = document.createElement('link'); stylesheet.rel = 'stylesheet'; stylesheet.href = '/css/dashboard.css'; stylesheet.dataset.visualizerStyle = 'true'; document.head.appendChild(stylesheet); }
    let cancelled = false; const instances: any[] = []; let restoreSetAttribute: (() => void) | undefined;
    void loadEngine().then(() => {
      if (cancelled || !editorRoot.current || !sceneRoot.current) return;
      const engine = window.beestat;
      // Legacy 3D assets use document-relative img/... paths. The React entry
      // lives under /react/, so resolve only Three.js-managed assets at root.
      window.THREE?.DefaultLoadingManager?.setURLModifier((url: string) => url.startsWith('img/') ? `/${url}` : url);
      for (const [key, value] of Object.entries(data)) {
        // The React context normalizes user.read_id to a single user, while the
        // legacy visualizer cache still expects the original id-keyed map.
        const cacheValue = key === 'user' && value?.user_id ? { [value.user_id]: value } : value;
        engine.cache.set(key, cacheValue, false);
      }
      const user = engine.user.get(); user.settings ??= {}; user.settings.thermostat_id = thermostatId; user.settings.visualize ??= {};
      const floorPlans = Object.values(data.floor_plan ?? {}) as any[];
      user.settings.visualize.floor_plan_id ??= floorPlans[0]?.floor_plan_id;
      const add = (parentElement: HTMLDivElement, component: any) => { const wrapper = window.$.createElement('div').style('margin-bottom', '16px'); window.$(parentElement).appendChild(wrapper); component.render(wrapper); instances.push(component); };
      const originalSetAttribute = Element.prototype.setAttribute;
      Element.prototype.setAttribute = function(name: string, value: string) {
        return originalSetAttribute.call(this, name, name === 'src' && value.startsWith('img/') ? `/${value}` : value);
      };
      restoreSetAttribute = () => { Element.prototype.setAttribute = originalSetAttribute; };
      if (user.settings.visualize.floor_plan_id != null) {
        if (user.settings.visualize.hide_affiliate === false && !config.isDemo) add(sceneRoot.current, new engine.component.card.visualize_affiliate(thermostatId));
        if (!nativeScene) add(sceneRoot.current, new engine.component.card.three_d().set_floor_plan_id(user.settings.visualize.floor_plan_id));
      } else {
        add(editorRoot.current, new engine.component.card.visualize_intro(thermostatId));
        add(sceneRoot.current, new engine.component.card.visualize_video());
      }
      setState('ready');
    }).catch((error) => { if (!cancelled) { setMessage(error instanceof Error ? error.message : 'Unable to load the visualizer.'); setState('error'); } });
    return () => { cancelled = true; restoreSetAttribute?.(); instances.reverse().forEach((instance) => { try { instance.dispose(); } catch { /* legacy cleanup is best effort */ } }); editorRoot.current?.replaceChildren(); sceneRoot.current?.replaceChildren(); stylesheet?.remove(); };
  }, [data, nativeScene, thermostatId]);
  const floorPlans = Object.values(data?.floor_plan ?? {}) as any[];
  const visualize = nativeScene ? visualizeState : (data?.user?.settings?.visualize ?? {});
  const hasFloorPlan = visualize.floor_plan_id != null || floorPlans[0]?.floor_plan_id != null;
  const activePlan = floorPlans.find((plan) => plan.floor_plan_id === visualize.floor_plan_id) ?? floorPlans[0];
  const updateSetting = (key: string, value: unknown) => {
    if (nativeScene) {
      setVisualizeState((current) => {
        const next = structuredClone(current); const parts = key.replace(/^visualize\./, '').split('.'); let target = next;
        parts.slice(0, -1).forEach((part) => { target[part] ??= {}; target = target[part]; }); target[parts.at(-1)!] = value; return next;
      });
      void apiCall({ resource: 'user', method: 'update_setting', arguments: { key, value } });
    } else if (window.beestat?.setting) window.beestat.setting(key, value);
  };
  return <Box py={2} sx={{ '& canvas': { maxWidth: '100%' } }}>
    {state === 'loading' && <Box sx={{ minHeight: 500, display: 'grid', placeItems: 'center' }}><Box textAlign="center"><CircularProgress /><Box mt={2}>{message}</Box></Box></Box>}
    {state === 'error' && <Alert severity="error">{message}</Alert>}
    <Box sx={{ display: state === 'ready' ? 'block' : 'none', minWidth: 0 }}>
      <Box ref={editorRoot} />
      {activePlan && <Box mb={2}><FloorPlanEditorCard plan={activePlan as FloorPlan} /></Box>}
      {hasFloorPlan && <Box mb={2}><VisualizeSettingsCard initial={visualize} temperatureUnit={String(data?.user?.settings?.units?.temperature ?? '°F')} onChange={updateSetting} /></Box>}
      {nativeScene && activePlan && <Box mb={2}><NativeThreeScene plan={activePlan as FloorPlan} settings={visualize} sensors={data?.sensor ?? {}} /></Box>}
      <Box ref={sceneRoot} />
    </Box>
  </Box>;
}
