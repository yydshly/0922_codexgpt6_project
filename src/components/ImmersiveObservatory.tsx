import {EarthSurfaceReadout} from './EarthSurfaceReadout';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ArrowLeft, ArrowUpRight, Info, Maximize2, Pause, Play, RotateCcw, X } from 'lucide-react';
import { bodyById } from '../data/catalog';
import { ringProfile } from '../data/rings';
import { publicAsset } from '../data/publicAsset';
import { IMMERSIVE_VIEWS, immersiveCameraPose, immersiveSunDirection, type ImmersiveViewId } from '../data/immersiveViews';
import { IMMERSIVE_RING_REGIONS, SOLAR_FEATURES, solarFeatureVisibility, type EarthFraming, type RingRegionId, type SolarFeature } from '../data/immersiveDetails';
import { useImmersiveClock } from '../hooks/useImmersiveClock';
import { immersiveDate } from '../data/immersiveClock';
import type { ImmersiveEntry } from '../data/immersiveEntry';
import { ImmersiveTimeControls } from './ImmersiveTimeControls';
import { satelliteById } from '../data/satellites';
import { immersiveFamilyMembers, familyEnlargement, familyRadius, familyViewport, familyViewDirection, familyMotionBounds, fitFamilyCamera, type ImmersiveFamily } from '../data/immersiveFamilies';
import { createImmersiveFamily, familyMemberVisible } from './immersiveFamilyScene';
import type { StateFrame } from '../types';
import { referenceAttitude } from './referenceAttitude';
import { makePlanetMaterial, makeSaturnRing } from './celestialMaterials';
import { createEarthEffects } from './earthEffects';
import { makeDeepStars, makeSunAtmosphere } from './celestialEffects';
import { PanoramaTextureLoader, type TextureLoadItem } from './PanoramaTextureLoader';
import { createImmersiveRingGuide, projectRingAnchor } from './immersiveRingGuide';
import './ImmersiveObservatory.css';

interface Props { onOpenMission?: () => void; frame: StateFrame; start: number; end: number; entry: ImmersiveEntry; onClose: () => void; onReturn: (time: number) => void }
interface SceneControls { reset: () => void; retry: () => void }

/** Parent-centred moving scene. Publish planet and satellite states at one coherent epoch. */
export function ImmersiveObservatory({ frame: entryFrame, start, end, entry, onReturn: returnToPanorama, onOpenMission }: Props) {
  const host = useRef<HTMLDivElement>(null), root = useRef<HTMLDivElement>(null);
  const bridge = useRef<SceneControls | null>(null);
  const ringMarker = useRef<HTMLDivElement>(null);
  const memberLabels = useRef(new Map<string, HTMLButtonElement>());
  const [enlarged, setEnlarged] = useState(false), [distanceLines, setDistanceLines] = useState(true);
  const [familyFocus, setFamilyFocus] = useState(entry.focusId ?? 'all');
  const [viewId, setViewId] = useState<ImmersiveViewId>(entry.viewId);
  const [auto, setAuto] = useState(false), [clean, setClean] = useState(false), [info, setInfo] = useState(false);
  const [stars, setStars] = useState(true), [fill, setFill] = useState(true);
  const [textures, setTextures] = useState<TextureLoadItem[]>([]), [failure, setFailure] = useState('');
  const [sceneRevision, setSceneRevision] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [earthFraming, setEarthFraming] = useState<EarthFraming>('limb');
  const [earthClouds, setEarthClouds] = useState(true), [earthAtmosphere, setEarthAtmosphere] = useState(true);
  const [ringRegion, setRingRegion] = useState<RingRegionId | null>(null);
  const [solarFeature, setSolarFeature] = useState<SolarFeature>('all');
  const view = IMMERSIVE_VIEWS.find(v => v.id === viewId)!;
  const familyParent = view.family ? view.body as ImmersiveFamily : null;
  const clock = useImmersiveClock(entryFrame, start, end, familyParent === 'saturn');
  const frame = clock.frame, date = immersiveDate(frame.time);
  const members = useMemo(() => familyParent ? immersiveFamilyMembers(familyParent, frame, clock.satellites ?? []) : [], [familyParent, frame, clock.satellites]);
  const memberKey = members.map(m => m.id).join(',');
  const onClose = () => { clock.pause(); returnToPanorama(frame.time); };
  const focusId = members.some(m => m.id === familyFocus) ? familyFocus : 'all';
  const focusMember = members.find(m => m.id === focusId);
  const readoutBody = focusMember ?? bodyById[view.body];
  const familyReady = familyParent === 'earth' || (familyParent === 'saturn' && members.length === 4);
  const region = IMMERSIVE_RING_REGIONS.find(r => r.id === ringRegion);
  const feature = SOLAR_FEATURES.find(f => f.id === solarFeature)!;
  const latest = useRef({ viewId, auto, stars, fill, clean, earthFraming, earthClouds, earthAtmosphere, ringRegion, solarFeature, enlarged, distanceLines, focusId, frame, members, playing: clock.playing });
  latest.current = { viewId, auto, stars, fill, clean, earthFraming, earthClouds, earthAtmosphere, ringRegion, solarFeature, enlarged, distanceLines, focusId, frame, members, playing: clock.playing };
  const formatKm = (value: number) => value.toLocaleString('zh-CN', { maximumFractionDigits: 0 });

  useEffect(() => { root.current?.querySelector<HTMLButtonElement>('button')?.focus(); }, []);
  useEffect(() => {
    const container = host.current;
    if (!container) return;
    setFailure(''); setTextures([]); setDistanceKm(0);
    let members = latest.current.members;
    let displayedTime = frame.time;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); }
    catch { clock.pause(); setFailure('三维画面暂时无法启动，请重试或返回全景。'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = view.body === 'sun' ? .8 : 1.08;
    renderer.setClearColor('#03060b');
    container.appendChild(renderer.domElement);
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('aria-label', '沉浸三维画面：拖动旋转，滚轮缩放，方向键旋转，加减键缩放');
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(42, 1, familyParent ? .0001 : .01, 2000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = .07; controls.enablePan = false;
    controls.minDistance = view.body === 'saturn' ? 2.6 : 1.16; controls.maxDistance = 14;
    controls.rotateSpeed = .42; controls.zoomSpeed = .55;
    controls.autoRotateSpeed = .28;
    const loader = new PanoramaTextureLoader(setTextures);
    const body = bodyById[view.body], group = new THREE.Group();
    referenceAttitude(body, frame.time, group.quaternion);
    const sunlight = immersiveSunDirection(frame, view.body);
    const material = makePlanetMaterial(body, loader);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), material);
    group.add(globe); scene.add(group);
    const ringGuide = view.body === 'saturn' && !familyParent ? createImmersiveRingGuide() : null;
    if (ringGuide) group.add(ringGuide.root);
    if (view.body === 'saturn') {
      const rings = makeSaturnRing(loader); group.add(rings);
      // Sample the same ring opacity when tracing sunlight from the surface to the equatorial plane.
      material.uniforms.immRingMap = rings.material.uniforms.ringMap;
      material.uniforms.immRingBounds = rings.material.uniforms.ringBounds;
      material.uniforms.immWorldToLocal = { value: new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(group.quaternion).invert()) };
      material.fragmentShader = material.fragmentShader.replace('uniform sampler2D dayMap;', `uniform sampler2D dayMap;
        uniform sampler2D immRingMap; uniform vec2 immRingBounds; uniform mat3 immWorldToLocal;`)
        .replace('vec3 light = albedo *', `vec3 localSun = normalize(immWorldToLocal * sunDirection);
        float planeTravel = abs(localSun.y) > .00001 ? -vLocal.y / localSun.y : -1.;
        vec3 ringHit = vLocal + localSun * planeTravel;
        float ringR = length(ringHit.xz);
        if (planeTravel > 0. && ringR > immRingBounds.x && ringR < immRingBounds.y) {
          float opacity = texture2D(immRingMap, vec2((ringR-immRingBounds.x)/(immRingBounds.y-immRingBounds.x), .5)).a;
          // Leave the Cassini division open, matching the reference geometry.
          if (${ringProfile('saturn')!.bands.map(band => `(ringR >= ${(band.innerKm / body.radiusKm).toFixed(8)} && ringR <= ${(band.outerKm / body.radiusKm).toFixed(8)})`).join(' || ')}) daylight *= 1. - .82 * opacity;
        }
        vec3 light = albedo *`);
    }
    if (view.body === 'earth') {
      const { clouds, atmosphere } = createEarthEffects(loader); group.add(clouds, atmosphere);
      material.uniforms.cloudShadowMap.value.dispose();
      material.uniforms.cloudShadowMap = clouds.material.uniforms.cloudMap;
      material.uniforms.cloudShadowReady = clouds.material.uniforms.cloudMapReady;
      material.uniforms.showCloudShadows.value = 1;
      material.uniforms.earthWorldToLocal.value.setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(group.quaternion).invert());
    }
    if (view.body === 'sun') {
      const atmosphere = makeSunAtmosphere();
      atmosphere.traverse(object => {
        if (object.name === 'Illustrative prominence') {
          const mat = (object as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material;
          mat.color.setRGB(1.6, .08, .008); mat.opacity *= .55;
        }
      });
      group.add(atmosphere);
    }
    const family = familyParent ? createImmersiveFamily(members, familyParent, frame, loader) : null;
    if (family) { scene.add(family.root); family.sync(members, frame); }
    const sky = makeDeepStars(); scene.add(sky);
    sky.traverse(object => {
      if (object instanceof THREE.Points) {
        const brightness = object.geometry.getAttribute('aCeBrightness');
        for (let i = 0; i < brightness.count; i++) brightness.setX(i, brightness.getX(i) * .45);
      }
    });
    group.traverse(object => {
      const mat = (object as THREE.Mesh).material as THREE.ShaderMaterial | undefined;
      if (mat?.uniforms?.sunDirection) mat.uniforms.sunDirection.value.copy(sunlight);
    });
    let disposed = false, raf = 0, last = performance.now(), lastReadout = 0;
    let currentView = latest.current.viewId, currentFraming = latest.current.earthFraming, transition = 1;
    let currentFocus = latest.current.focusId, currentEnlarged = latest.current.enlarged, currentPlaying = latest.current.playing;
    const getPose = () => {
      if (!familyParent) return immersiveCameraPose(latest.current.viewId, latest.current.frame, latest.current.earthFraming);
      const focused = members.find(m => m.id === latest.current.focusId);
      const pole = new THREE.Vector3(0, 1, 0).applyQuaternion(group.quaternion);
      const direction = familyViewDirection(familyParent, members, sunlight, pole);
      // The overview reserves room for enlarged moons too; switching scale never moves their centres or the camera.
      let bounds = (focused ? [focused] : members).map(member => ({ position: member.position,
        radius: member.parent && familyParent === 'saturn' ? 2.4 : familyRadius(member, familyParent, focused ? latest.current.enlarged : true) * 1.04 }));
      if (!focused && latest.current.playing) {
        // Leave space around the parent for an entire revolution; no visible synthetic orbit is created.
        bounds = familyMotionBounds(members, familyParent);
      }
      return fitFamilyCamera(bounds, direction, pole, familyViewport(container.clientWidth, container.clientHeight));
    };
    let pose = getPose();
    let offsetX = view.body === 'earth' && currentFraming === 'limb' ? .2 : .085, startOffsetX = offsetX, targetOffsetX = offsetX;
    let startPosition = pose.position.clone(), startUp = pose.up.clone(), startTarget = pose.target.clone();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const updateProjection = () => {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      if (familyParent) {
        const viewport = familyViewport(w, h);
        camera.fov = 42;
        camera.setViewOffset(w, h, w / 2 - (viewport.left + viewport.right) / 2, h / 2 - (viewport.top + viewport.bottom) / 2, w, h);
      } else {
        camera.fov = w < h ? Math.min(95, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(view.body === 'saturn' ? 50 : 42) / 2) / camera.aspect))) : pose.fov;
        camera.setViewOffset(w, h, w > 800 ? -w * offsetX : 0, 0, w, h);
      }
      camera.updateProjectionMatrix();
    };
    const limits = () => {
      if (!familyParent) return;
      const focused = members.find(m => m.id === latest.current.focusId);
      controls.minDistance = focused ? (focused.parent && familyParent === 'saturn' ? 2.6 : familyRadius(focused, familyParent, latest.current.enlarged) * 1.2) : .1;
      controls.maxDistance = 500;
    };
    const reset = () => {
      pose = getPose(); limits();
      startPosition = camera.position.clone(); startUp = camera.up.clone(); startTarget = controls.target.clone(); transition = reduced ? 1 : 0;
      startOffsetX = offsetX; targetOffsetX = view.body === 'earth' && latest.current.earthFraming === 'limb' ? .2 : .085;
      if (reduced) { camera.position.copy(pose.position); camera.up.copy(pose.up); controls.target.copy(pose.target); offsetX = targetOffsetX; }
      updateProjection();
    };
    let lastWidth = 0, lastHeight = 0;
    const resize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h); updateProjection();
      if (familyParent && (lastWidth !== w || lastHeight !== h)) {
        pose = getPose(); camera.position.copy(pose.position); camera.up.copy(pose.up); controls.target.copy(pose.target); transition = 1; controls.update();
      }
      lastWidth = w; lastHeight = h;
    };
    camera.position.copy(pose.position); camera.up.copy(pose.up); camera.fov = pose.fov;
    controls.target.copy(pose.target); limits(); controls.update();
    bridge.current = { reset, retry: () => loader.retryFailed() };
    const interrupt = () => { transition = 1; setAuto(false); };
    controls.addEventListener('start', interrupt);
    const keyboard = (event: KeyboardEvent) => {
      const rotations: Record<string, [THREE.Vector3, number]> = {
        ArrowLeft: [camera.up, .055], ArrowRight: [camera.up, -.055],
        ArrowUp: [new THREE.Vector3().crossVectors(camera.up, camera.position.clone().sub(controls.target)).normalize(), .055],
        ArrowDown: [new THREE.Vector3().crossVectors(camera.up, camera.position.clone().sub(controls.target)).normalize(), -.055],
      };
      if (rotations[event.key]) {
        event.preventDefault(); interrupt();
        camera.position.sub(controls.target).applyAxisAngle(...rotations[event.key]).add(controls.target); controls.update();
      } else if (['+', '=', '-'].includes(event.key)) {
        event.preventDefault(); interrupt();
        camera.position.sub(controls.target).multiplyScalar(event.key === '-' ? 1.1 : .9).clampLength(controls.minDistance, controls.maxDistance).add(controls.target); controls.update();
      }
    };
    renderer.domElement.addEventListener('keydown', keyboard);
    const lost = (event: Event) => { event.preventDefault(); clock.pause(); setAuto(false); setFailure('三维画面连接中断，点击重新建立画面。'); cancelAnimationFrame(raf); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    const tick = (now: number) => {
      if (disposed) return;
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, .05); last = now;
      if (document.hidden) return;
      if (displayedTime !== latest.current.frame.time) {
        const oldAnchor = members.find(m => m.id === currentFocus)?.position.clone() ?? new THREE.Vector3();
        members = latest.current.members;
        const newAnchor = members.find(m => m.id === currentFocus)?.position ?? new THREE.Vector3();
        const followDelta = newAnchor.clone().sub(oldAnchor);
        camera.position.add(followDelta); controls.target.add(followDelta);
        startPosition.add(followDelta); startTarget.add(followDelta); pose.position.add(followDelta); pose.target.add(followDelta);
        referenceAttitude(body, latest.current.frame.time, group.quaternion);
        sunlight.copy(immersiveSunDirection(latest.current.frame, view.body));
        group.traverse(object => {
          const mat = (object as THREE.Mesh).material as THREE.ShaderMaterial | undefined;
          if (mat?.uniforms?.sunDirection) mat.uniforms.sunDirection.value.copy(sunlight);
        });
        const inverse = new THREE.Matrix4().makeRotationFromQuaternion(group.quaternion).invert();
        material.uniforms.immWorldToLocal?.value.setFromMatrix4(inverse);
        material.uniforms.earthWorldToLocal?.value.setFromMatrix4(inverse);
        family?.sync(members, latest.current.frame);
        displayedTime = latest.current.frame.time;
      }
      if (familyParent && currentFocus === 'all' && !currentPlaying && latest.current.playing) reset();
      currentPlaying = latest.current.playing;
      if (currentView !== latest.current.viewId || currentFraming !== latest.current.earthFraming || currentFocus !== latest.current.focusId || (currentEnlarged !== latest.current.enlarged && latest.current.focusId !== 'all')) {
        currentView = latest.current.viewId; currentFraming = latest.current.earthFraming; currentFocus = latest.current.focusId; reset();
      }
      currentEnlarged = latest.current.enlarged;
      if (transition < 1) {
        transition = Math.min(1, transition + dt / 1.4);
        const t = transition * transition * (3 - 2 * transition);
        const startDelta = startPosition.clone().sub(startTarget), endDelta = pose.position.clone().sub(pose.target);
        const direction = startDelta.clone().normalize().lerp(endDelta.clone().normalize(), t).normalize();
        controls.target.copy(startTarget).lerp(pose.target, t);
        camera.position.copy(direction.multiplyScalar(THREE.MathUtils.lerp(startDelta.length(), endDelta.length(), t))).add(controls.target);
        camera.up.copy(startUp).lerp(pose.up, t).normalize();
        offsetX = THREE.MathUtils.lerp(startOffsetX, targetOffsetX, t);
        updateProjection();
      }
      controls.autoRotate = latest.current.auto && transition === 1;
      controls.update(dt);
      if (family && familyParent) {
        family.update(latest.current.enlarged, latest.current.distanceLines && !latest.current.clean && latest.current.focusId === 'all', latest.current.fill);
        // Keep the free camera outside every displayed body; also stay outside the principal ring region.
        for (const member of members) {
          const bound = member.parent && familyParent === 'saturn' ? 2.6 : familyRadius(member, familyParent, latest.current.enlarged) * 1.12;
          const delta = camera.position.clone().sub(member.position);
          if (delta.length() < bound) { if (!delta.lengthSq()) delta.copy(camera.up); camera.position.copy(member.position).add(delta.setLength(bound)); }
        }
        camera.lookAt(controls.target); camera.updateMatrixWorld();
        const occupied: { x: number; y: number; w: number; h: number }[] = [];
        for (const member of members) {
          const label = memberLabels.current.get(member.id);
          if (!label) continue;
          const ndc = member.position.clone().project(camera);
          const pointX = (ndc.x + 1) * container.clientWidth / 2, pointY = (1 - ndc.y) * container.clientHeight / 2;
          const visible = !latest.current.clean && familyMemberVisible(member, members, camera, familyParent, latest.current.enlarged);
          const w = label.offsetWidth, h = label.offsetHeight;
          const x = THREE.MathUtils.clamp(pointX + 12, 8, container.clientWidth - w - 8);
          let y = pointY - h - 12;
          for (const item of occupied) if (x < item.x + item.w + 8 && x + w + 8 > item.x && y < item.y + item.h + 6 && y + h + 6 > item.y) y = item.y - h - 8;
          const inContent = container.clientWidth > 800 ? x > Math.min(375, container.clientWidth * .35) && y > 145 && y + h < container.clientHeight - 195 : y > 310 && y + h < container.clientHeight - 205;
          label.style.visibility = visible && inContent ? 'visible' : 'hidden';
          label.style.left = `${x}px`; label.style.top = `${y}px`;
          label.style.setProperty('--anchor-x', `${pointX - x}px`); label.style.setProperty('--anchor-y', `${pointY - y}px`);
          if (visible && inContent) occupied.push({ x, y, w, h });
        }
      }
      sky.position.copy(camera.position); sky.visible = latest.current.stars;
      const solarVisibility = solarFeatureVisibility(latest.current.solarFeature);
      group.traverse(object => {
        if (object.name === 'earth-clouds') object.visible = latest.current.earthClouds;
        if (object.name === 'earth-atmosphere') object.visible = latest.current.earthAtmosphere;
        if (object.name === 'Turbulent corona') object.visible = solarVisibility.corona;
        if (object.name === 'Illustrative prominence') object.visible = solarVisibility.prominence;
        const mat = (object as THREE.Mesh).material as THREE.ShaderMaterial | undefined;
        if (mat?.uniforms?.presentationLight) mat.uniforms.presentationLight.value = latest.current.fill ? .55 : 0;
        if (mat?.uniforms?.ambientLevel) mat.uniforms.ambientLevel.value = latest.current.fill ? .018 : .002;
      });
      material.uniforms.showCloudShadows.value = latest.current.earthClouds ? 1 : 0;
      const ringPoint = ringGuide?.update(latest.current.clean ? null : latest.current.ringRegion, camera, group.quaternion);
      if (ringMarker.current) {
        const ndc = ringPoint ? projectRingAnchor(ringPoint, camera) : null;
        const x = ndc ? (ndc.x + 1) * container.clientWidth / 2 : -1;
        const y = ndc ? (1 - ndc.y) * container.clientHeight / 2 : -1;
        ringMarker.current.style.visibility = ndc && y > 125 && y < container.clientHeight - 210 ? 'visible' : 'hidden';
        ringMarker.current.style.left = `${x}px`; ringMarker.current.style.top = `${y}px`;
        ringMarker.current.dataset.side = x > container.clientWidth - 180 ? 'left' : 'right';
      }
      renderer.render(scene, camera);
      if (now - lastReadout > 300) { setDistanceKm(camera.position.distanceTo(members.find(m => m.id === latest.current.focusId)?.position ?? new THREE.Vector3()) * body.radiusKm); lastReadout = now; }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      disposed = true; cancelAnimationFrame(raf); observer.disconnect(); controls.dispose(); loader.dispose();
      bridge.current = null;
      renderer.domElement.removeEventListener('keydown', keyboard);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      const materials = new Set<THREE.Material>(), geometries = new Set<THREE.BufferGeometry>(), maps = new Set<THREE.Texture>();
      scene.traverse(object => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) geometries.add(mesh.geometry);
        if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(mat => materials.add(mat));
      });
      materials.forEach(mat => {
        mat.userData.disposed = true;
        Object.values((mat as THREE.ShaderMaterial).uniforms ?? {}).forEach(u => { if (u.value instanceof THREE.Texture) maps.add(u.value); });
        mat.dispose();
      });
      maps.forEach(map => map.dispose()); geometries.forEach(geometry => geometry.dispose());
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }, [view.body, view.family, sceneRevision, familyParent, memberKey]);

  const failed = textures.filter(t => t.status === 'error').length;
  const pending = textures.filter(t => t.status === 'loading').length;
  return <div ref={root} className={`immersive-observatory ${clean ? 'imm-clean' : ''} ${familyParent ? 'imm-family-view' : ''}`} role="dialog" aria-modal="true" aria-label="沉浸观景" data-view={viewId} onKeyDown={event => {
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); const dateClose = root.current?.querySelector<HTMLButtonElement>('[aria-label="收起日期面板"]'); if (dateClose) dateClose.click(); else if (clean) setClean(false); else if (info) setInfo(false); else onClose(); }
    if (event.key === 'Tab') {
      const focusable = Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],canvas[tabindex]') ?? []).filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
      const index = focusable.indexOf(document.activeElement as HTMLElement);
      event.preventDefault(); focusable[(index + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length]?.focus();
    }
  }}>
    <div className="imm-canvas" ref={host}/>
    <div className="imm-vignette" aria-hidden="true"/>
    <header className="imm-header">
      <button onClick={onClose} className="imm-back"><ArrowLeft size={16}/>返回全景</button>
      <div className="imm-brand">ORBIT <span>沉浸观景</span></div>{onOpenMission && <button onClick={onOpenMission} title="返回独立任务保存的时刻，靠近本次任务的卫星">本次卫星 · 任务近景</button>}
      <button onClick={() => setClean(v => !v)} aria-pressed={clean}><Maximize2 size={15}/>{clean ? '显示界面' : '纯画面'}</button>
    </header>
    {clean && <div className="imm-pure-clock"><span>{date.replace('T', ' ')} · 北京时间 · {clock.playing ? '天体运动中' : '已暂停'}</span>{clock.playing && <button onClick={clock.pause}>暂停天体运动</button>}</div>}
    {familyParent && <div className="imm-scale-badge" role="status" data-scale={enlarged ? 'enlarged' : 'physical'}>
      <strong>{enlarged ? `卫星半径 ×${familyEnlargement(familyParent)}` : '真实比例 · 大小与距离统一'}</strong>
      <span>{enlarged ? '母星与环不放大 · 所有中心距离不变' : '小圆点仅用于定位 · 不代表天体大小'}</span>
    </div>}
    {familyParent && !clean && members.map(member => <button key={member.id} className="imm-member-label" data-member={member.id}
      ref={element => { if (element) memberLabels.current.set(member.id, element); else memberLabels.current.delete(member.id); }}
      style={{ visibility: 'hidden' }} onClick={() => { setAuto(false); setFamilyFocus(member.id); }} aria-label={`靠近${member.name}`}>
      <i aria-hidden="true"/>{member.name}{enlarged && !member.parent && <small>×{familyEnlargement(familyParent)}</small>}
    </button>)}
    {!clean && <>
      <div className="imm-snapshot"><i/>三维自由取景 <span>{clock.loading ? '等待读取 · 保留上次有效时刻' : clock.playing ? '历表播放中' : '已暂停'} · {date.replace('T', ' ')}（北京时间）</span></div>
      <div className="imm-distance"><span>虚拟镜头 · 距{readoutBody.name}中心</span><strong>{distanceKm ? `${formatKm(distanceKm)} km` : '准备取景…'}</strong><small>{distanceKm ? `约 ${(distanceKm / readoutBody.radiusKm).toFixed(2)} 倍${focusMember && !focusMember.parent && focusMember.id !== 'moon' ? '体积等效' : '平均'}半径` : ''}</small></div>
      {!familyParent && view.body === 'saturn' && region && <div className="imm-ring-marker" ref={ringMarker} style={{ visibility: 'hidden' }} aria-hidden="true"><i/><span>{region.name} · 指认标记</span></div>}
      <section className="imm-story" key={viewId}>
        <span className="imm-kicker">{view.subtitle}</span>{entry.notice && viewId === entry.viewId && <p className="imm-entry-notice">{entry.notice}</p>}
        <h1>{familyParent && focusMember ? `近看${focusMember.name}` : !familyParent && view.body === 'earth' && earthFraming === 'globe' ? '回望地球' : view.title}</h1>
        <p>{familyParent && focusMember ? `镜头已经靠近${focusMember.name}，其他成员仍在同一片空间的原位置。返回同景可以重新比较大小与距离；靠近后的视大小不能直接与上一画面相比。` : !familyParent && view.body === 'earth' && earthFraming === 'globe' ? '拉远镜头，把完整的地球收入视野。观察同一个球体的海陆、云层和昼夜交界，再靠近边缘比较大气。' : view.description}</p>
        <div className="imm-study" aria-label="当前天体观察操作">
          {familyParent && <>
            <div className="imm-study-options" aria-label="同景比例"><button aria-pressed={!enlarged} onClick={() => setEnlarged(false)}>真实比例</button><button aria-pressed={enlarged} onClick={() => setEnlarged(true)}>卫星放大 ×{familyEnlargement(familyParent)}</button></div>
            <p className="imm-study-note">{familyParent === 'earth' ? '两者相隔约几十个地球半径，真实同景中球体很小是正常现象。' : '这里展示 3 颗代表卫星；更多已收录卫星可在全景目录中查询。'} 名称旁的点仅供定位。</p>
            <div className="imm-family-roster" aria-label="选择天体靠近观察">
              <button aria-pressed={focusId === 'all'} onClick={() => { setAuto(false); setFamilyFocus('all'); }}>返回{familyParent === 'earth' ? '地月' : '家族'}同景</button>
              {members.map(member => <button key={member.id} aria-pressed={focusId === member.id} onClick={() => { setAuto(false); setFamilyFocus(member.id); }}>{member.name}<span>靠近 ↗</span></button>)}
            </div>

            {focusMember ? <div className="imm-family-facts" role="status">
              <strong>{focusMember.name} · {focusMember.parent ? '母星' : '天然卫星'}</strong>
              <dl><div><dt>{focusMember.parent || focusMember.id === 'moon' ? '平均半径' : '体积等效半径'}</dt><dd>{formatKm(focusMember.radiusKm)} km</dd></div>
              {!focusMember.parent && <><div><dt>距{bodyById[familyParent].name}中心</dt><dd>{formatKm(focusMember.distanceKm)} km</dd></div><div><dt>相对{bodyById[familyParent].name}速度</dt><dd>{focusMember.speedKmS.toFixed(3)} km/s</dd></div><div><dt>公转周期 · 参考值</dt><dd>{focusMember.periodDays.toFixed(3)} 天</dd></div></>}
              </dl><small>参数保持真实值，不随辅助放大改变。天体运动由时间控制，镜头环绕单独控制。</small>
            </div> : <div className="imm-family-facts"><strong>同一时刻 · 同一距离尺度</strong>{members.filter(m => !m.parent).map(member => <div className="imm-family-distance" key={member.id}><span>{member.name}</span><span>{formatKm(member.distanceKm)} km</span></div>)}<small>以上为距{bodyById[familyParent].name}中心的距离。</small></div>}
            <div className="imm-study-options"><button aria-pressed={distanceLines} onClick={() => setDistanceLines(v => !v)}>距离连线 {distanceLines ? '开' : '关'}</button></div>
            <p className="imm-study-note">播放同景时镜头拉远，为公转留出空间；暂停后可复位当前构图。虚线只是中心距离连线，不是轨道。{familyParent === 'saturn' ? '卫星表面与同步自转为参考示意；未计算相互掩食。' : '月面为静态贴图；未计算地月相互掩食。'}</p>
          </>}
          {!familyParent && view.body === 'earth' && <>
            <div className="imm-study-options" aria-label="地球取景"><button aria-pressed={earthFraming === 'globe'} onClick={() => { setAuto(false); setEarthFraming('globe'); }}>完整球体</button><button aria-pressed={earthFraming === 'limb'} onClick={() => { setAuto(false); setEarthFraming('limb'); }}>大气边缘</button></div>
            <div className="imm-study-options" aria-label="地球外观图层"><button aria-pressed={earthClouds} onClick={() => setEarthClouds(v => !v)}>云层 {earthClouds ? '开' : '关'}</button><button aria-pressed={earthAtmosphere} onClick={() => setEarthAtmosphere(v => !v)}>大气 {earthAtmosphere ? '开' : '关'}</button></div>
            <p className="imm-study-note">试着关闭云层辨认海陆，再开关大气比较边缘。云图静态，大气为散射近似。</p>
          </>}
          {!familyParent && view.body === 'saturn' && <>
            <span className="imm-study-label">从内向外认识主环</span>
            <div className="imm-study-options" aria-label="土星环分区">{IMMERSIVE_RING_REGIONS.map(item => <button key={item.id} aria-pressed={ringRegion === item.id} onClick={() => setRingRegion(value => value === item.id ? null : item.id)}>{item.name}</button>)}</div>
            {region ? <div className="imm-study-note" role="status"><strong>{region.name} · 距土星中心 {formatKm(region.innerKm)}–{formatKm(region.outerKm)} km</strong><p>{region.text}</p><small>高亮与虚线用于指认，可再点选中项取消。</small></div> : <p className="imm-study-note">选择一个分区，画面同步标出它的位置。环绕时标记跟随环面，不跟随屏幕。</p>}
          </>}
          {view.body === 'sun' && <>
            <span className="imm-study-label">分开观察太阳结构</span>
            <div className="imm-study-options" aria-label="太阳结构">{SOLAR_FEATURES.map(item => <button key={item.id} aria-pressed={solarFeature === item.id} onClick={() => setSolarFeature(item.id)}>{item.name}</button>)}</div>
            <p className="imm-study-note" role="status">{feature.text}</p>
          </>}
        </div>
        <button className="imm-info-button" onClick={() => setInfo(v => !v)} aria-expanded={info} aria-controls="imm-details"><Info size={14}/>{info ? '收起说明' : '这个视角看到了什么'}<ArrowUpRight size={14}/></button>
      </section>
      {info && <aside className="imm-details" id="imm-details" aria-label="视角与科学依据">
        <div><h2>看懂这个视角</h2><button aria-label="关闭视角说明" onClick={() => setInfo(false)}><X size={17}/></button></div>
        <p>{view.boundary}</p>{view.body==='earth'&&<EarthSurfaceReadout host={host}/>}
        <dl><div><dt>当前主体</dt><dd>{bodyById[view.body].name}</dd></div><div><dt>平均半径</dt><dd>{bodyById[view.body].radiusKm.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} km</dd></div><div><dt>镜头距{readoutBody.name}中心</dt><dd>{distanceKm.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} km</dd></div></dl>
        <p>进入时承接全景日期，默认暂停。播放天体运动后，位置、光照与参考自转共同随时间更新；镜头环绕独立控制。返回全景带回当前日期，恢复进入前的播放状态。{familyParent ? '同景天体共享同一距离尺度。辅助放大只改变卫星外观，靠近取景会改变视大小。' : '不同天体独立取景，不能按画面大小比较直径。'}</p>
        <label><input type="checkbox" checked={fill} onChange={e => setFill(e.target.checked)}/>暗面辅助补光 <small>展示增强</small></label>
        <label><input type="checkbox" checked={stars} onChange={e => setStars(e.target.checked)}/>背景星点 <small>氛围示意，非实测星位</small></label>
        <p className="imm-fineprint">{familyParent === 'saturn' ? '土星用静态贴图；卫星用程序化外观与面向母星的同步自转近似，不是实测表面经度。' : '表面为静态贴图。'}星点与明亮天体同屏不代表真实相机曝光。</p>
        <a href={view.source} target="_blank" rel="noreferrer">{view.sourceTitle} ↗</a>
        {view.body === 'saturn' && <a href={ringProfile('saturn')!.sourceUrl} target="_blank" rel="noreferrer">NASA / NSSDCA · 环分区边界数值 ↗</a>}
        {familyParent === 'saturn' && <><a href={publicAsset('/data/satellites/manifest.json')} target="_blank" rel="noreferrer">本地卫星历表 · 来源、范围与采样说明 ↗</a><a href={satelliteById.titan.parameterSourceUrl} target="_blank" rel="noreferrer">NASA / NAIF · 卫星半径依据 ↗</a><a href={satelliteById.titan.orbitalPeriodSourceUrl} target="_blank" rel="noreferrer">JPL · 卫星参考周期 ↗</a><a href="https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturniansatfact.html" target="_blank" rel="noreferrer">NASA / NSSDCA · 自转与公转参考 ↗</a></>}
        {focusMember && !focusMember.parent && <a href={focusMember.sourceUrl} target="_blank" rel="noreferrer">{focusMember.name} · 资料来源 ↗</a>}
        <a href={publicAsset('/textures/sources.json')} target="_blank" rel="noreferrer">贴图来源与署名 ↗</a>
        <a href="https://ssd.jpl.nasa.gov/horizons/" target="_blank" rel="noreferrer">JPL · 位置与光照方向依据 ↗</a>
      </aside>}
      <footer className="imm-footer">
        <div className="imm-actions"><ImmersiveTimeControls clock={clock} start={start} end={end} entryTime={entryFrame.time}/><div><button onClick={() => setAuto(v => !v)} aria-pressed={auto}>{auto ? <Pause size={14}/> : <Play size={14}/>} {auto ? '停止镜头环绕' : '镜头环绕'}</button><button onClick={() => { setAuto(false); bridge.current?.reset(); }}><RotateCcw size={14}/>复位视角</button></div></div>
        <div className="imm-view-groups" aria-label="取景类别"><button aria-pressed={!familyParent} onClick={() => { if (familyParent) { setAuto(false); setViewId('saturn-rings'); } }}>天体近景</button><button aria-pressed={!!familyParent} onClick={() => { if (!familyParent) { setAuto(false); setFamilyFocus('all'); setEnlarged(false); setViewId('earth-moon'); } }}>天体关系 · 同景</button></div>
        <nav className="imm-views" aria-label="沉浸取景角度">{IMMERSIVE_VIEWS.filter(preset => !!preset.family === !!familyParent).map(preset => <button key={preset.id} aria-pressed={preset.id === viewId} onClick={() => { setAuto(false); setFamilyFocus('all'); setEnlarged(false); setViewId(preset.id); }}><span className={`imm-thumb imm-thumb-${preset.body}`} style={{ backgroundImage: `url(${bodyById[preset.body].texture})` }} aria-hidden="true"/><span><small>0{IMMERSIVE_VIEWS.indexOf(preset) + 1} / {bodyById[preset.body].name}</small><strong>{preset.title}</strong></span><ArrowUpRight size={16}/></button>)}</nav>
        <p className="imm-caption">拖动环看 · 滚轮靠近 · 天体运动随时间 / 镜头环绕独立 · 非实时影像</p>
      </footer>
    </>}
    {(clock.loading || clock.error || clock.atEnd) && <div className="imm-family-data-status" role={clock.error ? 'alert' : 'status'}>
      <strong>{clock.error ? '历表未就绪，保留最后有效画面' : clock.atEnd ? '已到历表末端，天体运动已暂停' : '正在读取同一时刻的历表，请稍候…'}</strong>
      {clock.error && <><span>{clock.error}</span><button onClick={clock.retry}>重试历表</button></>}
      {familyParent === 'saturn' && !familyReady && <span>卫星位置尚未就绪，当前只显示母星。</span>}
    </div>}
    {(pending > 0 || failed > 0) && <div className="imm-load-status" role="status">{failed ? `${failed} 项外观素材加载失败` : `正在准备 ${pending} 项外观素材…`}{failed > 0 && <button onClick={() => bridge.current?.retry()}>重试素材</button>}</div>}
    {failure && <div className="imm-failure" role="alert"><p>{failure}</p><button onClick={() => setSceneRevision(v => v + 1)}>重新建立画面</button><button onClick={onClose}>返回全景</button></div>}
  </div>;
}
