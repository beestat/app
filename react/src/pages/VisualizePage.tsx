import { Alert, Box, CircularProgress } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { config } from '../api/client';
import { useDashboard } from '../state/DashboardContext';

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
  const root = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('Loading the visualizer engine…');
  useEffect(() => {
    if (!data || !thermostatId || !root.current) return;
    let stylesheet = document.querySelector<HTMLLinkElement>('link[data-visualizer-style]');
    if (!stylesheet) { stylesheet = document.createElement('link'); stylesheet.rel = 'stylesheet'; stylesheet.href = '/css/dashboard.css'; stylesheet.dataset.visualizerStyle = 'true'; document.head.appendChild(stylesheet); }
    let cancelled = false; const instances: any[] = []; let restoreSetAttribute: (() => void) | undefined;
    void loadEngine().then(() => {
      if (cancelled || !root.current) return;
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
      const parent = window.$(root.current);
      const add = (component: any) => { const wrapper = window.$.createElement('div').style('margin-bottom', '16px'); parent.appendChild(wrapper); component.render(wrapper); instances.push(component); };
      const originalSetAttribute = Element.prototype.setAttribute;
      Element.prototype.setAttribute = function(name: string, value: string) {
        return originalSetAttribute.call(this, name, name === 'src' && value.startsWith('img/') ? `/${value}` : value);
      };
      restoreSetAttribute = () => { Element.prototype.setAttribute = originalSetAttribute; };
      if (user.settings.visualize.floor_plan_id != null) {
        add(new engine.component.card.floor_plan_editor(thermostatId));
        add(new engine.component.card.visualize_settings());
        if (user.settings.visualize.hide_affiliate === false && !config.isDemo) add(new engine.component.card.visualize_affiliate(thermostatId));
        add(new engine.component.card.three_d().set_floor_plan_id(user.settings.visualize.floor_plan_id));
      } else {
        add(new engine.component.card.visualize_intro(thermostatId));
        add(new engine.component.card.visualize_video());
      }
      setState('ready');
    }).catch((error) => { if (!cancelled) { setMessage(error instanceof Error ? error.message : 'Unable to load the visualizer.'); setState('error'); } });
    return () => { cancelled = true; restoreSetAttribute?.(); instances.reverse().forEach((instance) => { try { instance.dispose(); } catch { /* legacy cleanup is best effort */ } }); if (root.current) root.current.replaceChildren(); stylesheet?.remove(); };
  }, [data, thermostatId]);
  return <Box py={2} sx={{ '& canvas': { maxWidth: '100%' } }}>
    {state === 'loading' && <Box sx={{ minHeight: 500, display: 'grid', placeItems: 'center' }}><Box textAlign="center"><CircularProgress /><Box mt={2}>{message}</Box></Box></Box>}
    {state === 'error' && <Alert severity="error">{message}</Alert>}
    <Box ref={root} sx={{ display: state === 'ready' ? 'block' : 'none', minWidth: 0 }} />
  </Box>;
}
