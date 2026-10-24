import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, IconButton, Slider, Stack, Tooltip, Typography } from '@mui/material';
import { Eye, EyeOff, Home, Layers3, Pause, Play, Rotate3D, Tags } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { colors } from '../../theme';
import { entityBounds, type FloorGroup, type FloorPlan, type FloorPoint } from './floorPlanModel';
import type { Sensor } from '../../types';
import { useVisualizeRuntime } from './useVisualizeRuntime';

type SceneResources = { renderer: THREE.WebGLRenderer; controls: OrbitControls; scene: THREE.Scene; frame: number; resize: ResizeObserver; render: () => void; animate: () => void; rooms: Map<string, THREE.MeshStandardMaterial>; groups: Map<string, THREE.Group>; sun: THREE.DirectionalLight; hemisphere: THREE.HemisphereLight };

function polygonShape(points: FloorPoint[], offsetX = 0, offsetY = 0) {
  const shape = new THREE.Shape();
  points.forEach((point, index) => {
    const x = offsetX + point.x; const y = -(offsetY + point.y);
    if (index === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  });
  shape.closePath();
  return shape;
}

function material(color: THREE.ColorRepresentation, roughness = .72) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, side: THREE.DoubleSide });
}

function textSprite(text: string) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const context = canvas.getContext('2d')!; context.fillStyle = 'rgba(30,42,49,.84)'; context.roundRect(4, 4, 504, 120, 18); context.fill();
  context.font = '600 46px Montserrat, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillStyle = '#fff'; context.fillText(text, 256, 64, 470);
  const texture = new THREE.CanvasTexture(canvas); texture.encoding = THREE.sRGBEncoding;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })); sprite.scale.set(120, 30, 1); sprite.renderOrder = 5; sprite.userData.visualizeKind = 'label'; return sprite;
}

function addWeather(scene: THREE.Scene, center: THREE.Vector3, extent: number, settings: Record<string, unknown>) {
  const rainDensity = Number(settings.rain_density ?? 0); const snowDensity = Number(settings.snow_density ?? 0); const starDensity = Number(settings.star_density ?? 0);
  const addParticles = (count: number, color: THREE.ColorRepresentation, size: number, yMin: number, yMax: number, kind: string) => {
    if (!count) return;
    const values = new Float32Array(count * 3); let seed = Number(settings.seed ?? 1) || 1;
    const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    for (let index = 0; index < count; index += 1) { values[index * 3] = center.x + (random() - .5) * extent * 2.2; values[index * 3 + 1] = yMin + random() * (yMax - yMin); values[index * 3 + 2] = center.z + (random() - .5) * extent * 2.2; }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(values, 3));
    const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color, size, transparent: true, opacity: .72, depthWrite: false })); points.userData.visualizeKind = kind; scene.add(points);
  };
  addParticles(Math.min(600, Math.round(rainDensity * 260)), '#9bd6ff', 2.2, 20, extent, 'environment');
  addParticles(Math.min(500, Math.round(snowDensity * 220)), '#ffffff', 4.5, 15, extent, 'environment');
  addParticles(Math.min(450, Math.round(starDensity * 100)), '#e8f2ff', 2.5, extent * .45, extent * 1.7, 'stars');
}

function addExtrudedShape(parent: THREE.Group, shape: THREE.Shape, depth: number, elevation: number, color: THREE.ColorRepresentation) {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material(color));
  mesh.position.y = elevation;
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.visualizeKind = 'structure';
  parent.add(mesh);
  return mesh;
}

function addWall(parent: THREE.Group, a: FloorPoint, b: FloorPoint, elevation: number, height: number, color: THREE.ColorRepresentation) {
  const dx = b.x - a.x; const dz = b.y - a.y; const length = Math.hypot(dx, dz);
  if (length < .1) return;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(length, height, 6), material(color));
  mesh.position.set((a.x + b.x) / 2, elevation + height / 2, (a.y + b.y) / 2);
  mesh.rotation.y = -Math.atan2(dz, dx);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.visualizeKind = 'structure';
  parent.add(mesh);
}

function addHipRoof(parent: THREE.Group, group: FloorGroup, color: THREE.ColorRepresentation) {
  const roomPoints = group.rooms.flatMap((room) => room.points.map((point) => ({ x: room.x + point.x, y: room.y + point.y })));
  if (!roomPoints.length) return;
  const left = Math.min(...roomPoints.map((point) => point.x)); const right = Math.max(...roomPoints.map((point) => point.x));
  const top = Math.min(...roomPoints.map((point) => point.y)); const bottom = Math.max(...roomPoints.map((point) => point.y));
  const width = right - left; const depth = bottom - top; const base = Math.max(...group.rooms.map((room) => Number(group.elevation ?? 0) + Number(room.elevation ?? 0) + Number(room.height ?? room.ceiling_height ?? group.height ?? 96)));
  const rise = Math.max(18, Math.min(42, Math.min(width, depth) * .22)); const centerX = (left + right) / 2; const centerZ = (top + bottom) / 2;
  const vertices: number[] = []; const triangle = (...values: number[]) => vertices.push(...values);
  if (width >= depth) {
    const inset = Math.min(depth / 2, width / 2); const ridgeLeft = left + inset; const ridgeRight = right - inset;
    triangle(left, base, top, right, base, top, ridgeRight, base + rise, centerZ, ridgeRight, base + rise, centerZ, ridgeLeft, base + rise, centerZ, left, base, top);
    triangle(left, base, bottom, ridgeLeft, base + rise, centerZ, ridgeRight, base + rise, centerZ, ridgeRight, base + rise, centerZ, right, base, bottom, left, base, bottom);
    triangle(left, base, top, ridgeLeft, base + rise, centerZ, left, base, bottom, right, base, top, right, base, bottom, ridgeRight, base + rise, centerZ);
  } else {
    const inset = Math.min(width / 2, depth / 2); const ridgeTop = top + inset; const ridgeBottom = bottom - inset;
    triangle(left, base, top, centerX, base + rise, ridgeTop, centerX, base + rise, ridgeBottom, centerX, base + rise, ridgeBottom, left, base, bottom, left, base, top);
    triangle(right, base, top, right, base, bottom, centerX, base + rise, ridgeBottom, centerX, base + rise, ridgeBottom, centerX, base + rise, ridgeTop, right, base, top);
    triangle(left, base, top, right, base, top, centerX, base + rise, ridgeTop, left, base, bottom, centerX, base + rise, ridgeBottom, right, base, bottom);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals();
  const roof = new THREE.Mesh(geometry, material(color, .82)); roof.castShadow = true; roof.receiveShadow = true; roof.userData.visualizeKind = 'roof'; parent.add(roof);
}

function addGroup(root: THREE.Group, group: FloorGroup, appearance: Record<string, unknown>, visible: boolean, rooms: Map<string, THREE.MeshStandardMaterial>, roomObjects: THREE.Mesh[], showLabels: boolean) {
  const layer = new THREE.Group(); layer.name = group.group_id; layer.visible = visible; root.add(layer);
  const elevation = Number(group.elevation ?? 0); const defaultHeight = Number(group.height ?? 96);
  group.surfaces.filter((item) => !item.editor_hidden && item.points.length >= 3).forEach((surface) => {
    addExtrudedShape(layer, polygonShape(surface.points, surface.x, surface.y), Math.max(.8, Number(surface.height ?? 0)), elevation + Number(surface.elevation ?? 0), surface.color ?? '#9a9a96').userData.visualizeKind = 'environment';
  });
  group.rooms.filter((item) => !item.editor_hidden && item.points.length >= 3).forEach((room) => {
    const roomElevation = elevation + Number(room.elevation ?? 0); const height = Number(room.height ?? room.ceiling_height ?? defaultHeight);
    const floor = addExtrudedShape(layer, polygonShape(room.points, room.x, room.y), 2, roomElevation, '#38464d');
    floor.userData.visualizeKind = 'room';
    floor.userData.roomId = room.room_id; roomObjects.push(floor);
    rooms.set(room.room_id, floor.material as THREE.MeshStandardMaterial);
    if (showLabels && room.name) {
      const label = textSprite(room.name); const xs = room.points.map((point) => point.x); const ys = room.points.map((point) => point.y);
      label.position.set(room.x + (Math.min(...xs) + Math.max(...xs)) / 2, roomElevation + height + 24, room.y + (Math.min(...ys) + Math.max(...ys)) / 2); layer.add(label);
    }
    room.points.forEach((point, index) => {
      const next = room.points[(index + 1) % room.points.length];
      addWall(layer, { x: room.x + point.x, y: room.y + point.y }, { x: room.x + next.x, y: room.y + next.y }, roomElevation + 2, height, String(appearance.siding_color ?? '#9b8b78'));
    });
    // Preserve the full room footprint as a roof deck. Pitched roof facets are
    // added in the next geometry stage, while this closes every volume and
    // prevents the open-top artifact during the migration.
    addExtrudedShape(layer, polygonShape(room.points, room.x, room.y), 3, roomElevation + height, String(appearance.roof_color ?? '#3a3a3a')).userData.visualizeKind = 'roof';
  });
  group.openings.filter((item) => !item.editor_hidden && item.points.length === 2).forEach((opening) => {
    const [a, b] = opening.points; const width = Math.hypot(b.x - a.x, b.y - a.y); const height = Number(opening.height ?? (opening.type === 'window' ? 60 : 78));
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, 3), material(opening.type === 'window' ? '#b9d7e8' : String(opening.color ?? '#7a573b'), .4));
    mesh.position.set((a.x + b.x) / 2, elevation + Number(opening.elevation ?? 0) + height / 2, (a.y + b.y) / 2);
    mesh.rotation.y = -Math.atan2(b.y - a.y, b.x - a.x); mesh.userData.visualizeKind = 'structure'; layer.add(mesh);
  });
  group.trees.filter((item) => !item.editor_hidden).forEach((tree) => {
    const height = Math.max(36, Number(tree.height ?? 120)); const radius = Math.max(12, Number(tree.diameter ?? 72) / 2);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(3, radius * .12), Math.max(4, radius * .16), height * .45, 8), material('#5a341d'));
    trunk.position.set(tree.x, elevation + height * .225, tree.y); trunk.castShadow = true; trunk.userData.visualizeKind = 'environment'; layer.add(trunk);
    const crownGeometry = tree.type === 'pine' ? new THREE.ConeGeometry(radius, height * .7, 8) : new THREE.IcosahedronGeometry(radius, 1);
    const crown = new THREE.Mesh(crownGeometry, material('#315f2b')); crown.position.set(tree.x, elevation + height * .68, tree.y); crown.scale.y = tree.type === 'oval' ? 1.25 : 1; crown.castShadow = true; crown.userData.visualizeKind = 'environment'; layer.add(crown);
  });
  group.lights.filter((item) => !item.editor_hidden).forEach((light) => {
    const fixture = new THREE.Mesh(new THREE.SphereGeometry(4, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffe7a8' }));
    fixture.position.set(light.x, elevation + Number(light.elevation ?? 72), light.y); fixture.userData.visualizeKind = 'environment'; layer.add(fixture);
    const point = new THREE.PointLight('#ffe2a1', light.intensity === 'bright' ? .8 : light.intensity === 'dim' ? .25 : .5, 220, 2); point.position.copy(fixture.position); point.userData.visualizeKind = 'environment'; layer.add(point);
  });
  if (String(appearance.roof_style ?? 'hip') !== 'flat') addHipRoof(layer, group, String(appearance.roof_color ?? '#3a3a3a'));
  return layer;
}

function heatColor(value: number, min: number, max: number) {
  const percentage = max === min ? .5 : Math.max(0, Math.min(1, (value - min) / (max - min)));
  const stops = ['#3867d6', '#2bcbba', '#fed330', '#eb3b5a']; const scaled = percentage * (stops.length - 1); const index = Math.min(stops.length - 2, Math.floor(scaled));
  return new THREE.Color(stops[index]).lerp(new THREE.Color(stops[index + 1]), scaled - index);
}

function formatTime(minutes: number) { const hour = Math.floor(minutes / 60); const minute = minutes % 60; return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`; }

export function NativeThreeScene({ plan, settings, sensors }: { plan: FloorPlan; settings: Record<string, any>; sensors: Record<string, Sensor> }) {
  const host = useRef<HTMLDivElement>(null);
  const resources = useRef<SceneResources | undefined>(undefined);
  const [visibleGroups, setVisibleGroups] = useState(() => new Set(plan.data.groups.map((group) => group.group_id)));
  const [autoRotate, setAutoRotate] = useState(false);
  const [showEnvironment, setShowEnvironment] = useState(() => String(plan.data.scene?.mode ?? 'environment') === 'environment');
  const [showLabels, setShowLabels] = useState(false);
  const [minute, setMinute] = useState(() => { const now = new Date(); return now.getHours() * 60 + Math.floor(now.getMinutes() / 5) * 5; });
  const [playing, setPlaying] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>();
  const runtime = useVisualizeRuntime(plan, sensors, settings);
  const dataType = settings.data_type === 'occupancy' ? 'occupancy' : 'temperature';
  const limits = useMemo(() => settings.heat_map_values === 'static'
    ? { min: Number(settings.heat_map_static?.[dataType]?.min ?? (dataType === 'temperature' ? 70 : 0)), max: Number(settings.heat_map_static?.[dataType]?.max ?? (dataType === 'temperature' ? 80 : 100)) }
    : { min: runtime.data.min[dataType], max: runtime.data.max[dataType] }, [dataType, runtime.data, settings.heat_map_static, settings.heat_map_values]);

  useEffect(() => {
    if (!host.current) return;
    const container = host.current; const scene = new THREE.Scene(); scene.background = new THREE.Color('#1d2a31'); scene.fog = new THREE.Fog('#1d2a31', 1200, 3000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.domElement.dataset.nativeThree = 'true'; container.appendChild(renderer.domElement);
    const camera = new THREE.PerspectiveCamera(55, 1, 1, 5000); const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = false; controls.maxPolarAngle = Math.PI / 2.05; controls.minDistance = 120; controls.maxDistance = 2400;
    const bounds = plan.data.groups.map(entityBounds); const left = Math.min(...bounds.map((item) => item.x)); const right = Math.max(...bounds.map((item) => item.x + item.width)); const top = Math.min(...bounds.map((item) => item.y)); const bottom = Math.max(...bounds.map((item) => item.y + item.height));
    const roomPoints = plan.data.groups.flatMap((group) => group.rooms.flatMap((room) => room.points.map((point) => ({ x: room.x + point.x, y: room.y + point.y }))));
    const focusLeft = roomPoints.length ? Math.min(...roomPoints.map((point) => point.x)) : left; const focusRight = roomPoints.length ? Math.max(...roomPoints.map((point) => point.x)) : right; const focusTop = roomPoints.length ? Math.min(...roomPoints.map((point) => point.y)) : top; const focusBottom = roomPoints.length ? Math.max(...roomPoints.map((point) => point.y)) : bottom;
    const center = new THREE.Vector3((focusLeft + focusRight) / 2, 0, (focusTop + focusBottom) / 2); const extent = Math.max(focusRight - focusLeft, focusBottom - focusTop, 400); controls.target.copy(center); camera.position.set(center.x + extent * .95, extent * .75, center.z + extent * .95); controls.update(); controls.saveState();
    const hemisphere = new THREE.HemisphereLight('#dce9ff', '#263d27', 1.35); scene.add(hemisphere); const sun = new THREE.DirectionalLight('#fff1d5', 1.35); sun.position.set(-500, 900, 400); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); scene.add(sun);
    const rooms = new Map<string, THREE.MeshStandardMaterial>(); const groups = new Map<string, THREE.Group>(); const roomObjects: THREE.Mesh[] = []; const root = new THREE.Group(); root.position.copy(center); root.rotation.y = -THREE.MathUtils.degToRad(Number(plan.data.appearance?.rotation ?? 0)); scene.add(root); const model = new THREE.Group(); model.position.set(-center.x, 0, -center.z); root.add(model); const appearance = plan.data.appearance ?? {}; plan.data.groups.forEach((group) => groups.set(group.group_id, addGroup(model, group, appearance, visibleGroups.has(group.group_id), rooms, roomObjects, plan.data.scene?.show_labels !== false)));
    const groundColor = new THREE.Color(String(appearance.ground_color ?? '#294f28')).multiplyScalar(.4); const ground = new THREE.Mesh(new THREE.PlaneGeometry(extent * 3.4, extent * 3.4), material(groundColor)); ground.rotation.x = -Math.PI / 2; ground.position.set(center.x, -1, center.z); ground.receiveShadow = true; ground.userData.visualizeKind = 'environment'; scene.add(ground);
    addWeather(scene, center, extent, (plan.data.scene?.settings as Record<string, unknown> | undefined) ?? {});
    let active = true; const render = () => { if (active) renderer.render(scene, camera); }; const animate = () => { if (!active || !controls.autoRotate) return; controls.update(); render(); resources.current!.frame = requestAnimationFrame(animate); };
    controls.addEventListener('change', render);
    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2(); const selectRoom = (event: MouseEvent) => { const rect = renderer.domElement.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1); raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObjects(roomObjects, false)[0]; setSelectedRoomId(hit?.object.userData.roomId); };
    renderer.domElement.addEventListener('click', selectRoom);
    const resize = new ResizeObserver(([entry]) => { const width = Math.max(1, entry.contentRect.width); const height = 500; renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); render(); }); resize.observe(container);
    resources.current = { renderer, controls, scene, frame: 0, resize, render, animate, rooms, groups, sun, hemisphere }; render();
    return () => { active = false; cancelAnimationFrame(resources.current?.frame ?? 0); resize.disconnect(); controls.removeEventListener('change', render); renderer.domElement.removeEventListener('click', selectRoom); controls.dispose(); scene.traverse((object) => { const mesh = object as THREE.Mesh; mesh.geometry?.dispose(); const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []; materials.forEach((item) => item.dispose()); }); renderer.dispose(); renderer.domElement.remove(); resources.current = undefined; };
  }, [plan]);

  useEffect(() => { if (!resources.current) return; resources.current.groups.forEach((object, id) => { object.visible = visibleGroups.has(id); }); resources.current.render(); }, [visibleGroups, plan]);

  useEffect(() => { if (!resources.current) return; resources.current.controls.autoRotate = autoRotate; cancelAnimationFrame(resources.current.frame); if (autoRotate) resources.current.frame = requestAnimationFrame(resources.current.animate); else resources.current.render(); }, [autoRotate]);
  useEffect(() => {
    if (!resources.current) return;
    resources.current.scene.traverse((object) => { if (object.userData.visualizeKind === 'environment' || object.userData.visualizeKind === 'stars') object.visible = showEnvironment; });
    resources.current.render();
  }, [showEnvironment, plan]);
  useEffect(() => { if (!resources.current) return; resources.current.scene.traverse((object) => { if (object.userData.visualizeKind === 'label') object.visible = showLabels; }); resources.current.render(); }, [showLabels, plan]);
  useEffect(() => {
    if (!resources.current) return;
    const daylight = Math.max(0, Math.sin(((minute - 360) / 720) * Math.PI)); const twilight = Math.max(0, Math.sin(((minute - 300) / 840) * Math.PI));
    const settings = (plan.data.scene?.settings as Record<string, unknown> | undefined) ?? {}; const darkness = Math.max(0, Math.min(2, Number(settings.cloud_darkness ?? 0)));
    const daySky = new THREE.Color('#263b46').multiplyScalar(1 - darkness * .16); const nightSky = new THREE.Color('#07111d'); const sky = nightSky.clone().lerp(daySky, twilight);
    resources.current.scene.background = sky; if (resources.current.scene.fog instanceof THREE.Fog) { resources.current.scene.fog.color.copy(sky); resources.current.scene.fog.near = Number(settings.fog_density ?? 0) > 0 ? 350 : 1200; }
    resources.current.sun.intensity = daylight * .9 * Math.max(.28, 1 - darkness * .32); resources.current.sun.color.set(daylight < .25 ? '#ff9b66' : '#fff1d5');
    const angle = ((minute - 360) / 720) * Math.PI; resources.current.sun.position.set(Math.cos(angle) * 900, Math.max(20, Math.sin(angle) * 1000), Math.sin(angle) * 550);
    resources.current.hemisphere.intensity = .18 + twilight * .48; resources.current.hemisphere.color.set(twilight < .3 ? '#6684aa' : '#dce9ff');
    resources.current.scene.traverse((object) => { if (object.userData.visualizeKind === 'stars') object.visible = showEnvironment && twilight < .5; });
    plan.data.groups.forEach((group) => group.rooms.forEach((room) => {
      const roomMaterial = resources.current?.rooms.get(room.room_id); if (!roomMaterial) return;
      const value = room.sensor_id == null ? undefined : runtime.data.series[dataType][room.sensor_id]?.[minute];
      roomMaterial.color.set(value == null ? '#38464d' : heatColor(value, limits.min, limits.max)); roomMaterial.needsUpdate = true;
    }));
    resources.current.render();
  }, [dataType, limits.max, limits.min, minute, plan, runtime.data, showEnvironment]);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setMinute((value) => (value + 5) % 1440), 120);
    return () => window.clearInterval(timer);
  }, [playing]);
  const reset = () => resources.current?.controls.reset();
  const selectedRoom = plan.data.groups.flatMap((group) => group.rooms).find((room) => room.room_id === selectedRoomId);
  const selectedValue = selectedRoom?.sensor_id == null ? undefined : runtime.data.series[dataType][selectedRoom.sensor_id]?.[minute];
  return <Box ref={host} sx={{ position: 'relative', height: 500, bgcolor: colors.slate.dark, overflow: 'hidden', '& canvas': { display: 'block', width: '100%', height: '500px' } }}>
    <Stack direction="row" alignItems="center" gap={.5} sx={{ position: 'absolute', zIndex: 2, top: 8, left: 12, right: 12, minWidth: 0 }}>
      <Tooltip title="Floor visibility"><IconButton sx={{ bgcolor: colors.slate.light }}><Layers3 size={19} /></IconButton></Tooltip>
      {plan.data.groups.map((group, index) => <Tooltip key={group.group_id} title={group.name ?? `Floor ${index + 1}`}><IconButton aria-label={`Toggle ${group.name ?? `floor ${index + 1}`}`} onClick={() => setVisibleGroups((current) => { const next = new Set(current); if (next.has(group.group_id)) next.delete(group.group_id); else next.add(group.group_id); return next; })} sx={{ bgcolor: visibleGroups.has(group.group_id) ? colors.lightBlue.main : colors.slate.light, width: 32, height: 32 }}><Typography variant="caption" fontWeight={700}>{index + 1}</Typography></IconButton></Tooltip>)}
      <IconButton aria-label={playing ? 'Pause visualization' : 'Play visualization'} onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={19} /> : <Play size={19} />}</IconButton>
      <Slider aria-label="Visualization time" min={0} max={1435} step={5} value={minute} onChange={(_, value) => setMinute(value as number)} sx={{ flex: 1, minWidth: 60 }} />
      <Typography variant="caption" sx={{ minWidth: { xs: 60, sm: 72 }, textAlign: 'right' }}>{formatTime(minute)}</Typography>
    </Stack>
    <Stack gap={.5} sx={{ position: 'absolute', zIndex: 2, top: 56, left: 12 }}>
      <Tooltip title="Reset camera"><IconButton onClick={reset} sx={{ bgcolor: colors.slate.light }}><Home size={19} /></IconButton></Tooltip>
      <Tooltip title="Toggle environment"><IconButton aria-label="Toggle environment" color={showEnvironment ? 'primary' : 'default'} onClick={() => setShowEnvironment((value) => !value)} sx={{ bgcolor: colors.slate.light }}>{showEnvironment ? <Eye size={19} /> : <EyeOff size={19} />}</IconButton></Tooltip>
      <Tooltip title="Auto rotate"><IconButton color={autoRotate ? 'primary' : 'default'} onClick={() => setAutoRotate((value) => !value)} sx={{ bgcolor: colors.slate.light }}><Rotate3D size={19} /></IconButton></Tooltip>
      <Tooltip title="Room labels"><IconButton aria-label="Toggle room labels" color={showLabels ? 'primary' : 'default'} onClick={() => setShowLabels((value) => !value)} sx={{ bgcolor: colors.slate.light }}><Tags size={19} /></IconButton></Tooltip>
    </Stack>
    <Stack direction="row" gap={1} sx={{ position: 'absolute', zIndex: 2, right: 14, bottom: 10, bgcolor: 'rgba(38,50,56,.8)', px: 1, borderRadius: 1 }}><Typography variant="caption">{dataType === 'temperature' ? `${limits.min.toFixed(1)}° – ${limits.max.toFixed(1)}°` : `${Math.round(limits.min)}% – ${Math.round(limits.max)}%`}</Typography>{runtime.isFetching && <Typography variant="caption">Fetching…</Typography>}</Stack>
    {selectedRoom && <Box sx={{ position: 'absolute', zIndex: 2, right: 18, top: 58, bgcolor: 'rgba(38,50,56,.9)', p: 1.5, borderRadius: 1, minWidth: 170 }}><Typography fontWeight={600}>{selectedRoom.name || 'Room'}</Typography><Typography variant="caption">{selectedRoom.sensor_id ? sensors[String(selectedRoom.sensor_id)]?.name ?? `Sensor ${selectedRoom.sensor_id}` : 'No sensor'}</Typography>{selectedValue != null && <Typography mt={.5}>{dataType === 'temperature' ? `${selectedValue.toFixed(1)}°` : `${Math.round(selectedValue)}% occupied`}</Typography>}</Box>}
  </Box>;
}
