import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ArrowLeft, ArrowUpRight, Eye, Info, Maximize2, Pause, Play, RotateCcw, X } from 'lucide-react';
import { bodyById } from '../data/catalog';
import { ringProfile } from '../data/rings';
import { publicAsset } from '../data/publicAsset';
import { IMMERSIVE_VIEWS, immersiveCameraPose, immersiveSunDirection, type ImmersiveViewId } from '../data/immersiveViews';
import type { StateFrame } from '../types';
import { referenceAttitude } from './referenceAttitude';
import { makePlanetMaterial, makeSaturnRing } from './celestialMaterials';
import { createEarthEffects } from './earthEffects';
import { makeDeepStars, makeSunAtmosphere } from './celestialEffects';
import { PanoramaTextureLoader, type TextureLoadItem } from './PanoramaTextureLoader';
import './ImmersiveObservatory.css';

interface Props { frame: StateFrame; date: string; onClose: () => void }
interface SceneControls { reset: () => void; retry: () => void }

/** A local, body-centred observation snapshot. No new ephemeris, fake orbit or spacecraft state. */
export function ImmersiveObservatory({ frame, date, onClose }: Props) {
  const host = useRef<HTMLDivElement>(null), root = useRef<HTMLDivElement>(null);
  const bridge = useRef<SceneControls | null>(null);
  const [viewId, setViewId] = useState<ImmersiveViewId>('saturn-rings');
  const [auto, setAuto] = useState(false), [clean, setClean] = useState(false), [info, setInfo] = useState(false);
  const [stars, setStars] = useState(true), [fill, setFill] = useState(true);
  const [textures, setTextures] = useState<TextureLoadItem[]>([]), [failure, setFailure] = useState('');
  const [sceneRevision, setSceneRevision] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const view = IMMERSIVE_VIEWS.find(v => v.id === viewId)!;
  const latest = useRef({ viewId, auto, stars, fill });
  latest.current = { viewId, auto, stars, fill };

  useEffect(() => { root.current?.querySelector<HTMLButtonElement>('button')?.focus(); }, []);
  useEffect(() => {
    const container = host.current;
    if (!container) return;
    setFailure(''); setTextures([]);
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); }
    catch { setFailure('三维画面暂时无法启动，请重试或返回全景。'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = view.body === 'sun' ? .8 : 1.08;
    renderer.setClearColor('#03060b');
    container.appendChild(renderer.domElement);
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('aria-label', '沉浸三维画面：拖动旋转，滚轮缩放，方向键旋转，加减键缩放');
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(42, 1, .01, 1400);
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
    let currentView = latest.current.viewId, transition = 1;
    let pose = immersiveCameraPose(currentView, frame);
    let startPosition = pose.position.clone(), startUp = pose.up.clone();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const resize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h); camera.aspect = w / h;
      camera.fov = w < h ? Math.min(95, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(view.body === 'saturn' ? 50 : 42) / 2) / camera.aspect))) : pose.fov;
      // Leave quiet space for the title; portrait screens use a centred composition.
      camera.setViewOffset(w, h, w > 800 ? -w * (view.body === 'earth' ? .2 : .085) : 0, 0, w, h);
      camera.updateProjectionMatrix();
    };
    const reset = () => {
      pose = immersiveCameraPose(latest.current.viewId, frame);
      startPosition = camera.position.clone(); startUp = camera.up.clone(); transition = reduced ? 1 : 0;
      if (reduced) { camera.position.copy(pose.position); camera.up.copy(pose.up); }
      resize();
    };
    camera.position.copy(pose.position); camera.up.copy(pose.up); camera.fov = pose.fov;
    controls.target.copy(pose.target); controls.update();
    bridge.current = { reset, retry: () => loader.retryFailed() };
    const interrupt = () => { transition = 1; setAuto(false); };
    controls.addEventListener('start', interrupt);
    const keyboard = (event: KeyboardEvent) => {
      const rotations: Record<string, [THREE.Vector3, number]> = {
        ArrowLeft: [camera.up, .055], ArrowRight: [camera.up, -.055],
        ArrowUp: [new THREE.Vector3().crossVectors(camera.up, camera.position).normalize(), .055],
        ArrowDown: [new THREE.Vector3().crossVectors(camera.up, camera.position).normalize(), -.055],
      };
      if (rotations[event.key]) {
        event.preventDefault(); interrupt();
        camera.position.applyAxisAngle(...rotations[event.key]); controls.update();
      } else if (['+', '=', '-'].includes(event.key)) {
        event.preventDefault(); interrupt();
        camera.position.multiplyScalar(event.key === '-' ? 1.1 : .9).clampLength(controls.minDistance, controls.maxDistance); controls.update();
      }
    };
    renderer.domElement.addEventListener('keydown', keyboard);
    const lost = (event: Event) => { event.preventDefault(); setFailure('三维画面连接中断，点击重新建立画面。'); cancelAnimationFrame(raf); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    const tick = (now: number) => {
      if (disposed) return;
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, .05); last = now;
      if (document.hidden) return;
      if (currentView !== latest.current.viewId) { currentView = latest.current.viewId; reset(); }
      if (transition < 1) {
        transition = Math.min(1, transition + dt / 1.4);
        const t = transition * transition * (3 - 2 * transition);
        const direction = startPosition.clone().normalize().lerp(pose.position.clone().normalize(), t).normalize();
        camera.position.copy(direction.multiplyScalar(THREE.MathUtils.lerp(startPosition.length(), pose.position.length(), t)));
        camera.up.copy(startUp).lerp(pose.up, t).normalize();
      }
      controls.autoRotate = latest.current.auto && transition === 1;
      controls.update(dt);
      sky.position.copy(camera.position); sky.visible = latest.current.stars;
      group.traverse(object => {
        const mat = (object as THREE.Mesh).material as THREE.ShaderMaterial | undefined;
        if (mat?.uniforms?.presentationLight) mat.uniforms.presentationLight.value = latest.current.fill ? .55 : 0;
        if (mat?.uniforms?.ambientLevel) mat.uniforms.ambientLevel.value = latest.current.fill ? .018 : .002;
      });
      renderer.render(scene, camera);
      if (now - lastReadout > 300) { setDistanceKm(camera.position.length() * body.radiusKm); lastReadout = now; }
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
  }, [view.body, frame, sceneRevision]);

  const failed = textures.filter(t => t.status === 'error').length;
  const pending = textures.filter(t => t.status === 'loading').length;
  return <div ref={root} className={`immersive-observatory ${clean ? 'imm-clean' : ''}`} role="dialog" aria-modal="true" aria-label="沉浸观景" data-view={viewId} onKeyDown={event => {
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); if (clean) setClean(false); else if (info) setInfo(false); else onClose(); }
    if (event.key === 'Tab') {
      const focusable = Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],canvas[tabindex]') ?? []).filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
      const index = focusable.indexOf(document.activeElement as HTMLElement);
      event.preventDefault(); focusable[(index + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length]?.focus();
    }
  }}>
    <div className="imm-canvas" ref={host}/>
    <div className="imm-vignette" aria-hidden="true"/>
    <header className="imm-header">
      <button onClick={onClose} className="imm-back"><ArrowLeft size={16}/>返回全景</button>
      <div className="imm-brand">ORBIT <span>沉浸观景</span></div>
      <button onClick={() => setClean(v => !v)} aria-pressed={clean}><Maximize2 size={15}/>{clean ? '显示界面' : '纯画面'}</button>
    </header>
    {!clean && <>
      <div className="imm-snapshot"><i/>三维自由取景 <span>定格 · {date.replace('T', ' ')}（北京时间）</span></div>
      <section className="imm-story" key={viewId}>
        <span className="imm-kicker">{view.subtitle}</span>
        <h1>{view.title}</h1>
        <p>{view.description}</p>
        <button className="imm-info-button" onClick={() => setInfo(v => !v)} aria-expanded={info} aria-controls="imm-details"><Info size={14}/>{info ? '收起说明' : '这个视角看到了什么'}<ArrowUpRight size={14}/></button>
      </section>
      {info && <aside className="imm-details" id="imm-details" aria-label="视角与科学依据">
        <div><h2>看懂这个视角</h2><button aria-label="关闭视角说明" onClick={() => setInfo(false)}><X size={17}/></button></div>
        <p>{view.boundary}</p>
        <dl><div><dt>当前主体</dt><dd>{bodyById[view.body].name}</dd></div><div><dt>平均半径</dt><dd>{bodyById[view.body].radiusKm.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} km</dd></div><div><dt>镜头距天体中心</dt><dd>{distanceKm.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} km</dd></div></dl>
        <p>沿用主页最后有效时刻的历表光照方向与参考轴向；镜头位置由取景预设确定。日期已定格，缓慢环绕只移动镜头。不同天体独立取景，不能按画面大小比较直径。</p>
        <label><input type="checkbox" checked={fill} onChange={e => setFill(e.target.checked)}/>暗面辅助补光 <small>展示增强</small></label>
        <label><input type="checkbox" checked={stars} onChange={e => setStars(e.target.checked)}/>背景星点 <small>氛围示意，非实测星位</small></label>
        <p className="imm-fineprint">表面为静态贴图；星点与明亮天体同屏不代表真实相机曝光。</p>
        <a href={view.source} target="_blank" rel="noreferrer">{view.sourceTitle} ↗</a>
        <a href={publicAsset('/textures/sources.json')} target="_blank" rel="noreferrer">贴图来源与署名 ↗</a>
        <a href="https://ssd.jpl.nasa.gov/horizons/" target="_blank" rel="noreferrer">JPL · 位置与光照方向依据 ↗</a>
      </aside>}
      <footer className="imm-footer">
        <div className="imm-actions"><span><Eye size={14}/>拖动环看 · 滚轮靠近</span><div><button onClick={() => setAuto(v => !v)} aria-pressed={auto}>{auto ? <Pause size={14}/> : <Play size={14}/>} {auto ? '停止环绕' : '缓慢环绕'}</button><button onClick={() => { setAuto(false); bridge.current?.reset(); }}><RotateCcw size={14}/>复位视角</button></div></div>
        <nav className="imm-views" aria-label="沉浸取景角度">{IMMERSIVE_VIEWS.map((preset, i) => <button key={preset.id} aria-pressed={preset.id === viewId} onClick={() => { setAuto(false); setViewId(preset.id); }}><span className={`imm-thumb imm-thumb-${preset.body}`} style={{ backgroundImage: `url(${bodyById[preset.body].texture})` }} aria-hidden="true"/><span><small>0{i + 1} / {bodyById[preset.body].name}</small><strong>{preset.title}</strong></span><ArrowUpRight size={16}/></button>)}</nav>
        <p className="imm-caption">有科学依据的三维场景 · 虚拟镜头与外观近似 · 非实时影像</p>
      </footer>
    </>}
    {(pending > 0 || failed > 0) && <div className="imm-load-status" role="status">{failed ? `${failed} 项外观素材加载失败` : `正在准备 ${pending} 项外观素材…`}{failed > 0 && <button onClick={() => bridge.current?.retry()}>重试素材</button>}</div>}
    {failure && <div className="imm-failure" role="alert"><p>{failure}</p><button onClick={() => setSceneRevision(v => v + 1)}>重新建立画面</button><button onClick={onClose}>返回全景</button></div>}
  </div>;
}
