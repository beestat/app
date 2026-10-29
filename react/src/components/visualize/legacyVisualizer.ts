const libraries = [
  '/js/lib/rocket/rocket.js',
  '/js/lib/moment/moment.js',
  '/js/lib/threejs/threejs.js',
  '/js/lib/three-csg-ts/three-csg-ts.global.js',
  '/js/lib/suncalc/suncalc.js',
  '/js/lib/clipper/clipper.js',
  '/js/lib/polylabel/polylabel.js',
];

const components = [
  '/js/beestat.js',
  '/js/beestat/extend.js',
  '/js/beestat/debounce.js',
  '/js/beestat/dispatcher.js',
  '/js/beestat/cache.js',
  '/js/beestat/clone.js',
  '/js/beestat/style.js',
  '/js/beestat/weather.js',
  '/js/beestat/api.js',
  '/js/beestat/platform.js',
  '/js/beestat/user.js',
  '/js/beestat/setting.js',
  '/js/beestat/temperature.js',
  '/js/beestat/distance.js',
  '/js/beestat/area.js',
  '/js/beestat/address.js',
  '/js/beestat/floor_plan.js',
  '/js/component.js',
  '/js/component/card.js',
  '/js/component/loading.js',
  '/js/component/icon.js',
  '/js/component/menu.js',
  '/js/component/menu_item.js',
  '/js/component/input.js',
  '/js/component/input/text.js',
  '/js/component/input/checkbox.js',
  '/js/component/input/radio.js',
  '/js/component/input/select.js',
  '/js/component/input/range.js',
  '/js/component/tile_group.js',
  '/js/component/tile.js',
  '/js/component/tile/floor_plan.js',
  '/js/component/tile/floor_plan_group.js',
  '/js/component/title.js',
  '/js/component/floor_plan_entity.js',
  '/js/component/floor_plan_entity/room.js',
  '/js/component/floor_plan_entity/surface.js',
  '/js/component/floor_plan_entity/opening.js',
  '/js/component/floor_plan_entity/tree.js',
  '/js/component/floor_plan_entity/light.js',
  '/js/component/floor_plan_entity/point.js',
  '/js/component/floor_plan_entity/wall.js',
  '/js/component/floor_plan.js',
  '/js/component/floor_plan_layers_sidebar.js',
  '/js/component/compass.js',
  '/js/component/radio_group.js',
  '/js/component/modal.js',
  '/js/component/modal/create_floor_plan.js',
  '/js/component/modal/update_floor_plan.js',
  '/js/component/modal/delete_floor_plan.js',
  '/js/component/modal/change_floor_plan.js',
  '/js/component/modal/floor_plan_elevation_help.js',
  '/js/component/card/floor_plan_editor.js',
  '/js/component/scene.js',
  '/js/component/scene/interaction.js',
  '/js/component/scene/texture.js',
  '/js/component/scene/light.js',
  '/js/component/scene/weather.js',
  '/js/component/scene/floor_plan.js',
  '/js/component/scene/opening.js',
  '/js/component/scene/layout.js',
  '/js/component/scene/roof.js',
  '/js/component/scene/tree.js',
  '/js/component/scene/environment.js',
  '/js/component/card/three_d.js',
];

let loading: Promise<void> | undefined;

function loadClassicScripts(sources: string[]) {
  return Promise.all(sources.map((source) => new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-visualizer-source="${source}"]`);
    if (existing?.dataset.loaded === 'true') { resolve(); return; }
    const script = existing ?? document.createElement('script');
    script.dataset.visualizerSource = source;
    script.async = false;
    script.src = source;
    script.addEventListener('load', () => { script.dataset.loaded = 'true'; resolve(); }, { once: true });
    script.addEventListener('error', () => { script.remove(); reject(new Error(`Unable to load ${source}`)); }, { once: true });
    if (!existing) document.head.appendChild(script);
  }))).then(() => undefined);
}

function loadModule(source: string) {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = source;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => { script.remove(); reject(new Error(`Unable to load ${source}`)); }, { once: true });
    document.head.appendChild(script);
  });
}

export function preloadLegacyVisualizer() {
  loading ??= loadClassicScripts(libraries)
    .then(() => loadModule(`/js/lib/straight-skeleton/wrapper.js?${encodeURIComponent(String((window as any).commit ?? ''))}`))
    .then(() => loadClassicScripts(components))
    .catch((error) => { loading = undefined; throw error; });
  return loading;
}
