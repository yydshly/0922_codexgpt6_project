import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ArrowLeft, ArrowUpRight, Compass, Crosshair, Globe2, Layers3, Maximize2, Orbit, RotateCcw, Sparkles } from 'lucide-react';
import { BODIES } from '../data/catalog';
import { MACRO_ZONES, macroRadius, type MacroZoneId } from '../data/macroStructure';
import { COSMIC_LEVELS, SOLAR_FAMILIES, type CosmicLevelId, type SolarFamilyId } from '../data/cosmicContext';
import { CosmicCanvas } from './CosmicCanvas';
import { BODY_IDS, type StateFrame } from '../types';
import './MacroStructure.css';

interface Props {
  frame: StateFrame | null;
  displayDate: string;
  onClose: () => void;
  onOpenReadingGuide: () => void;
  onObservePlanets: () => void;
  onExploreObject: (id: string) => void;
}

const ORBIT_AU = [0.387, 0.723, 1, 1.524, 5.203, 9.537, 19.191, 30.07];
const CAMERA_DISTANCE: Record<MacroZoneId, number> = { all: 62, planetary: 18, asteroid: 9, kuiper: 20, scattered: 34, heliosphere: 27, oort: 62 };
type ZoneMaterial = THREE.PointsMaterial | THREE.LineBasicMaterial | THREE.MeshBasicMaterial;
type MacroCameraView = 'oblique' | 'edge' | 'top';

function random(seed: number) {
  let value = seed >>> 0;
  return () => { value ^= value << 13; value ^= value >>> 17; value ^= value << 5; return (value >>> 0) / 4294967296; };
}

function makeCloud(count: number, seed: number, location: (next: () => number) => THREE.Vector3) {
  const next = random(seed);
  const points = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const position = location(next);
    points[i * 3] = position.x; points[i * 3 + 1] = position.y; points[i * 3 + 2] = position.z;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
  return geometry;
}

function discPoint(inner: number, outer: number, inclination: number) {
  return (next: () => number) => {
    const au = inner + (outer - inner) * next();
    const angle = next() * Math.PI * 2;
    const radius = macroRadius(au);
    const tilt = (next() * 2 - 1) * inclination;
    return new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle * 1.7 + next() * 2) * Math.sin(tilt) * radius, Math.sin(angle) * radius);
  };
}

function shellPoint(inner: number, outer: number) {
  return (next: () => number) => {
    const au = 10 ** (Math.log10(inner) + (Math.log10(outer) - Math.log10(inner)) * next());
    const radius = macroRadius(au), azimuth = next() * Math.PI * 2, y = next() * 2 - 1;
    const horizontal = Math.sqrt(1 - y * y);
    return new THREE.Vector3(Math.cos(azimuth) * horizontal * radius, y * radius, Math.sin(azimuth) * horizontal * radius);
  };
}

function orbitRing(au: number) {
  const radius = macroRadius(au);
  const vertices = Array.from({ length: 180 }, (_, i) => {
    const angle = i / 180 * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  });
  return new THREE.BufferGeometry().setFromPoints(vertices);
}

function MacroCanvas({ frame, selected, resetCount, family, cameraView, heightScale, showPlane }: { frame: StateFrame | null; selected: MacroZoneId; resetCount: number; family?: SolarFamilyId; cameraView: MacroCameraView; heightScale: 1 | 10; showPlane: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const frameRef = useRef(frame);
  const sceneRef = useRef<{ camera: THREE.PerspectiveCamera; controls: OrbitControls; materials: Partial<Record<MacroZoneId, ZoneMaterial[]>>; plane: THREE.Mesh; guides: THREE.Line[] } | null>(null);
  frameRef.current = frame;

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
    catch { element.textContent = '当前浏览器无法创建三维场景，请查看右侧结构与来源。'; return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#071019');
    const camera = new THREE.PerspectiveCamera(44, 1, .02, 200);
    camera.position.set(32, 25, 47);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = .075; controls.minDistance = 3; controls.maxDistance = 95;
    controls.target.set(0, 0, 0);
    const materials: Partial<Record<MacroZoneId, ZoneMaterial[]>> = {};
    const remember = (id: MacroZoneId, material: ZoneMaterial) => { (materials[id] ??= []).push(material); return material; };
    // Round point sprites represent a modeled distribution, never catalogued objects.
    const particleCanvas = document.createElement('canvas');
    particleCanvas.width = particleCanvas.height = 32;
    const particleContext = particleCanvas.getContext('2d');
    if (particleContext) {
      const glow = particleContext.createRadialGradient(16, 16, 1, 16, 16, 16);
      glow.addColorStop(0, 'rgba(255,255,255,1)');
      glow.addColorStop(.48, 'rgba(255,255,255,.95)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      particleContext.fillStyle = glow;
      particleContext.fillRect(0, 0, 32, 32);
    }
    const particleTexture = new THREE.CanvasTexture(particleCanvas);

    const stars = new THREE.Points(makeCloud(750, 823641, next => {
      const direction = shellPoint(65, 82)(next);
      return direction.normalize().multiplyScalar(70 + next() * 12);
    }), new THREE.PointsMaterial({ color: '#9bb6c4', map: particleTexture, size: .12, transparent: true, opacity: .38, depthWrite: false }));
    scene.add(stars);

    const sun = new THREE.Mesh(new THREE.SphereGeometry(.34, 28, 20), new THREE.MeshBasicMaterial({ color: '#ffe1a1' }));
    scene.add(sun);
    const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(.53, 24, 16), new THREE.MeshBasicMaterial({ color: '#ffc876', transparent: true, opacity: .12, depthWrite: false }));
    scene.add(sunGlow);

    for (const au of ORBIT_AU) {
      const ring = new THREE.LineLoop(orbitRing(au), remember('planetary', new THREE.LineBasicMaterial({ color: '#749fab', transparent: true, opacity: .29, depthWrite: false })));
      scene.add(ring);
    }
    const plane = new THREE.Mesh(new THREE.CircleGeometry(macroRadius(38), 96), new THREE.MeshBasicMaterial({ color: '#6b9aa4', transparent: true, opacity: .075, side: THREE.DoubleSide, depthWrite: false }));
    plane.rotation.x = -Math.PI / 2; plane.renderOrder = -1; plane.visible = showPlane; scene.add(plane);
    const guides = BODIES.filter(body => body.kind === 'planet').map(() => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#b9e6de', transparent: true, opacity: .82, depthTest: false }));
      line.visible = false; line.renderOrder = 2; scene.add(line); return line;
    });
    const planets = BODIES.filter(body => body.kind === 'planet').map((body, index) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(index > 3 ? .13 : .09, 12, 10), new THREE.MeshBasicMaterial({ color: body.color }));
      scene.add(mesh);
      return mesh;
    });

    // Category markers deliberately enlarge local phenomena; their positions are conceptual, not ephemerides.
    const moonGroups: { index: number; group: THREE.Group }[] = [];
    if (family === 'moons') {
      for (const index of [2, 4, 5, 6, 7]) {
        const group = new THREE.Group(); group.visible = false;
        for (let orbit = 0; orbit < (index === 2 ? 1 : 3); orbit++) {
          const radius = .20 + orbit * .105;
          const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 72 }, (_, point) => new THREE.Vector3(Math.cos(point / 72 * Math.PI * 2) * radius, 0, Math.sin(point / 72 * Math.PI * 2) * radius))), new THREE.LineBasicMaterial({ color: '#8fc8d7', transparent: true, opacity: .46 }));
          group.add(ring);
          const angle = orbit * 2.19 + index;
          const moon = new THREE.Mesh(new THREE.SphereGeometry(.038, 10, 8), new THREE.MeshBasicMaterial({ color: '#d4e5e4' }));
          moon.position.set(Math.cos(angle) * radius, .025 * (orbit % 2), Math.sin(angle) * radius); group.add(moon);
        }
        scene.add(group); moonGroups.push({ index, group });
      }
    }
    const addCloud = (id: MacroZoneId, geometry: THREE.BufferGeometry, color: string, size: number, opacity: number) => {
      const material = remember(id, new THREE.PointsMaterial({ color, map: particleTexture, size, transparent: true, opacity, depthWrite: false, sizeAttenuation: true }));
      material.userData.baseSize = size;
      scene.add(new THREE.Points(geometry, material));
    };
    addCloud('asteroid', makeCloud(850, 982741, discPoint(2.2, 3.2, .21)), '#d2ab78', .078, .66);
    addCloud('kuiper', makeCloud(1250, 288171, discPoint(30, 50, .30)), '#8cc7d7', .085, .62);
    addCloud('scattered', makeCloud(720, 627194, discPoint(50, 1000, .86)), '#d4baff', .075, .48);
    addCloud('oort', makeCloud(2600, 175002, shellPoint(2000, 100000)), '#cfeaff', .105, .48);
    if (family === 'centaurs') {
      addCloud('scattered', makeCloud(430, 41009, discPoint(5.5, 29, .48)), '#c6a7c8', .11, .74);
      for (const phase of [-Math.PI / 3, Math.PI / 3]) {
        const center = new THREE.Vector3(Math.cos(phase) * macroRadius(5.2), 0, Math.sin(phase) * macroRadius(5.2));
        addCloud('scattered', makeCloud(130, Math.floor((phase + 2) * 27013), next => center.clone().add(new THREE.Vector3((next() - .5) * .65, (next() - .5) * .35, (next() - .5) * .65))), '#d8b884', .12, .8);
      }
    }
    if (family === 'dust') addCloud('planetary', makeCloud(1800, 87071, discPoint(.2, 5.2, .18)), '#c8b18a', .045, .42);
    if (family === 'dwarfs') {
      for (const [au, angle, color] of [[2.77, .8, '#d8b995'], [39.5, 2.7, '#a9d1d7'], [68, 4.5, '#b5b1db']] as const) {
        const marker = new THREE.Mesh(new THREE.SphereGeometry(.11, 12, 9), new THREE.MeshBasicMaterial({ color }));
        marker.position.set(Math.cos(angle) * macroRadius(au), Math.sin(angle * 2) * .25, Math.sin(angle) * macroRadius(au)); scene.add(marker);
      }
    }
    if (family === 'comets') {
      const ellipse = Array.from({ length: 200 }, (_, i) => {
        const angle = i / 200 * Math.PI * 2;
        return new THREE.Vector3(2.1 + Math.cos(angle) * 3.5, Math.sin(angle) * 2.1, Math.sin(angle) * 2.8);
      });
      scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ellipse), new THREE.LineBasicMaterial({ color: '#9cd9e3', transparent: true, opacity: .65 })));
      const nucleus = new THREE.Mesh(new THREE.SphereGeometry(.15, 12, 9), new THREE.MeshBasicMaterial({ color: '#e6e9d2' })); nucleus.position.copy(ellipse[26]); scene.add(nucleus);
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([nucleus.position.clone(), nucleus.position.clone().add(new THREE.Vector3(1.8, .65, .8))]), new THREE.LineBasicMaterial({ color: '#a5dceb', transparent: true, opacity: .55 })));
    }


    const bubble = new THREE.Mesh(new THREE.SphereGeometry(macroRadius(120), 42, 24), remember('heliosphere', new THREE.MeshBasicMaterial({ color: '#4b9fd7', transparent: true, opacity: .055, wireframe: true, depthWrite: false })));
    scene.add(bubble);
    const innerBubble = new THREE.Mesh(new THREE.SphereGeometry(macroRadius(120), 32, 20), remember('heliosphere', new THREE.MeshBasicMaterial({ color: '#316eaa', transparent: true, opacity: .035, side: THREE.BackSide, depthWrite: false })));
    scene.add(innerBubble);
    const outerGuide = new THREE.Mesh(new THREE.SphereGeometry(macroRadius(100000), 40, 20), remember('oort', new THREE.MeshBasicMaterial({ color: '#88b6d1', transparent: true, opacity: .025, wireframe: true, depthWrite: false })));
    scene.add(outerGuide);

    const resize = () => {
      const width = element.clientWidth, height = element.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element); resize();
    sceneRef.current = { camera, controls, materials, plane, guides };
    let animation = 0;
    let lastFrame = 0;
    const draw = (now: number) => {
      animation = requestAnimationFrame(draw);
      if (now - lastFrame < 30) return;
      lastFrame = now;
      const current = frameRef.current;
      if (current) {
        for (let i = 0; i < planets.length; i++) {
          const offset = (i < 3 ? i + 1 : i + 2) * 3;
          const dx = current.positions[offset] - current.positions[0];
          const dy = current.positions[offset + 1] - current.positions[1];
          const dz = current.positions[offset + 2] - current.positions[2];
          const distance = Math.hypot(dx, dy, dz);
          if (distance > 0) {
            // JPL ECLIPJ2000 z is the signed height above the ecliptic; only this component is amplified in teaching mode.
            const radius = macroRadius(distance / 149597870.7);
            // Keep horizontal coordinates fixed while enlarging vertical separation.
            planets[i].position.set(dx / distance * radius, dz / distance * radius * heightScale, -dy / distance * radius);
            const point = planets[i].position;
            const position = guides[i].geometry.getAttribute('position') as THREE.BufferAttribute;
            position.setXYZ(0, point.x, point.y, point.z); position.setXYZ(1, point.x, 0, point.z);
            position.needsUpdate = true;
            guides[i].visible = showPlane && Math.abs(point.y) > .015;
          }
        }
        for (const { index, group } of moonGroups) { group.position.copy(planets[index].position); group.visible = true; }
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animation = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animation); observer.disconnect(); controls.dispose(); sceneRef.current = null;
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
          object.geometry.dispose();
          const material = object.material;
          (Array.isArray(material) ? material : [material]).forEach(item => item.dispose());
        }
      });
      particleTexture.dispose();
      renderer.dispose(); renderer.domElement.remove();
    };
  }, [family, heightScale, showPlane]);

  useEffect(() => {
    const context = sceneRef.current;
    if (!context) return;
    const distance = family === 'dwarfs' ? 20 : CAMERA_DISTANCE[selected];
    context.camera.up.set(0, cameraView === 'top' ? 0 : 1, cameraView === 'top' ? -1 : 0);
    if (cameraView === 'top') context.camera.position.set(.001, distance, .001);
    else if (cameraView === 'edge') context.camera.position.set(distance * .28, distance * .13, distance * .94);
    else context.camera.position.set(distance * .56, distance * .58, distance * .63);
    context.controls.target.set(0, 0, 0);
    context.controls.update();
    context.plane.visible = showPlane;
    (context.plane.material as THREE.MeshBasicMaterial).opacity = selected === 'planetary' ? .075 : selected === 'asteroid' || selected === 'kuiper' ? .035 : .012;
    if (!showPlane) context.guides.forEach(guide => { guide.visible = false; });
    for (const [id, group] of Object.entries(context.materials)) {
      for (const material of group) {
        const wireframe = material instanceof THREE.MeshBasicMaterial && material.wireframe;
        const base = id === 'heliosphere' ? wireframe ? .055 : .035 : id === 'oort' && wireframe ? .025 : id === 'planetary' ? .29 : id === 'scattered' ? .48 : id === 'asteroid' ? .66 : .62;
        const focused = selected === id;
        if (material instanceof THREE.PointsMaterial) {
          const baseSize = material.userData.baseSize as number;
          material.size = focused ? (id === 'oort' ? .52 : .25) : selected === 'all' ? baseSize * 1.5 : baseSize;
          material.opacity = focused ? Math.min(.95, base * 1.5) : selected === 'all' ? base : .025;
        } else {
          material.opacity = focused || selected === 'all' ? base : material instanceof THREE.MeshBasicMaterial ? .003 : Math.max(.025, base * .18);
        }
      }
    }
  }, [selected, resetCount, family, cameraView, heightScale, showPlane]);

  return <div className="macro-canvas" ref={host} role="img" aria-label="可拖动旋转、滚轮缩放的太阳系宏观结构三维示意"/>;
}

export function MacroStructure({ frame, displayDate, onClose, onOpenReadingGuide, onObservePlanets, onExploreObject }: Props) {
  const [scope, setScope] = useState<'solar' | 'cosmic'>('solar');
  const [solarTab, setSolarTab] = useState<'zones' | 'families'>('zones');
  const [selected, setSelected] = useState<MacroZoneId>('all');
  const [familyId, setFamilyId] = useState<SolarFamilyId>('moons');
  const [cosmicId, setCosmicId] = useState<CosmicLevelId>('neighbors');
  const [resetCount, setResetCount] = useState(0);
  const [cameraView, setCameraView] = useState<MacroCameraView>('oblique');
  const [heightScale, setHeightScale] = useState<1 | 10>(1);
  const [showPlane, setShowPlane] = useState(true);
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const zone = MACRO_ZONES.find(item => item.id === selected);
  const zoneVisualMeaning = zone?.visualMeaning ?? '中央亮球和八颗彩色小球分别标记太阳与行星，行星方位来自当前历表；细环只提示轨道尺度，彩色点云与透明球壳说明其他区域的模型形态，不是逐体坐标。';
  const highestPlanet = frame ? BODIES.filter(body => body.kind === 'planet').map(body => ({ name: body.name, heightAu: Math.abs(frame.positions[BODY_IDS.indexOf(body.id) * 3 + 2] - frame.positions[2]) / 149597870.7 })).reduce((highest, current) => current.heightAu > highest.heightAu ? current : highest) : null;
  const family = SOLAR_FAMILIES.find(item => item.id === familyId)!;
  const cosmic = COSMIC_LEVELS.find(item => item.id === cosmicId)!;
  const cosmicFacts: Record<CosmicLevelId, [string, string]> = {
    neighbors: ['4.24–约 40 光年', '不同恒星各有自己的行星系统'],
    milkyway: ['距银河系中心约 2.6 万光年', '太阳系属于银河系猎户臂支'],
    galaxies: ['约 16.2 万–250 万光年', '跨星系尺度，远大于恒星间距离'],
  };

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButton.current?.focus({ preventScroll: true });
    return () => { if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); };
  }, []);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); return; }
    if (event.key === ' ') event.stopPropagation();
    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]') ?? []).filter(element => element.getClientRects().length > 0);
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && (document.activeElement === first || !dialog.current?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  return <section ref={dialog} className="macro-structure" role="dialog" aria-modal="true" aria-labelledby="macro-title" onKeyDown={onKeyDown}>
    <header className="macro-header"><div><span className="macro-eyebrow">FROM OUR SOLAR SYSTEM TO OTHER GALAXIES</span><h1 id="macro-title">从太阳系，看见更大的宇宙</h1><p>结构导览 · 返回观测恢复原镜头；右上角「宏观结构」可再次进入。</p></div><div className="macro-header-actions"><button className="macro-reading-button" onClick={onOpenReadingGuide}><Sparkles size={15}/>星点与环怎么看</button><button ref={closeButton} className="macro-back" title="关闭结构图，返回原有观测镜头与时间轴设置" onClick={onClose}><ArrowLeft size={16}/>返回观测</button></div></header>
    <div className="macro-scope-tabs" role="tablist" aria-label="宇宙观察范围"><button role="tab" aria-selected={scope === 'solar'} className={scope === 'solar' ? 'active' : ''} onClick={() => setScope('solar')}><Orbit size={14}/>太阳系 · 区域与成员</button><button role="tab" aria-selected={scope === 'cosmic'} className={scope === 'cosmic' ? 'active' : ''} onClick={() => setScope('cosmic')}><Sparkles size={14}/>恒星系统与其他星系</button><span>AU → 光年 → 星系尺度</span></div>
    <div className="macro-main">
      <nav className="macro-zone-list" aria-label={scope === 'solar' ? '太阳系结构与成员' : '宇宙邻域层次'}>
        {scope === 'solar' ? <>
          <div className="macro-list-tabs" role="group" aria-label="太阳系观察内容"><button className={solarTab === 'zones' ? 'active' : ''} onClick={() => setSolarTab('zones')}>空间区域</button><button className={solarTab === 'families' ? 'active' : ''} onClick={() => setSolarTab('families')}>天体与物质</button></div>
          <div className="macro-section-title">{solarTab === 'zones' ? '由内向外 · 结构层次' : '成员类别 · 不按同心层排列'}</div><span className="macro-scroll-cue">左右滑动<br/>查看更多区域 →</span>
          {solarTab === 'zones' ? <><button className={`macro-zone ${selected === 'all' ? 'active' : ''}`} onClick={() => setSelected('all')} aria-pressed={selected === 'all'}><span className="macro-zone-icon"><Maximize2 size={15}/></span><span><strong>整体形态</strong><small>行星薄盘 → 远缘球壳</small></span></button>{MACRO_ZONES.map(item => <button key={item.id} className={`macro-zone ${selected === item.id ? 'active' : ''}`} onClick={() => setSelected(item.id)} aria-pressed={selected === item.id}><i style={{ background: item.color }}/><span><strong>{item.name}</strong><small>{item.range}</small></span></button>)}</> : SOLAR_FAMILIES.map(item => <button key={item.id} className={`macro-zone ${familyId === item.id ? 'active' : ''}`} onClick={() => setFamilyId(item.id)} aria-pressed={familyId === item.id}><i style={{ background: '#d5bd9a' }}/><span><strong>{item.name}</strong><small>{item.keyFact}</small></span></button>)}
        </> : <><div className="macro-section-title">离开太阳系 · 三个不同尺度</div>{COSMIC_LEVELS.map((item, index) => <button key={item.id} className={`macro-zone ${cosmicId === item.id ? 'active' : ''}`} onClick={() => setCosmicId(item.id)} aria-pressed={cosmicId === item.id}><span className="macro-cosmic-index">0{index + 1}</span><span><strong>{item.name}</strong><small>{item.keyFact}</small></span></button>)}<p className="macro-side-note">“恒星系统”是一颗或多颗恒星及其成员；“星系”是包含大量恒星的更大结构。太阳系属于银河系。</p></>}
      </nav>
      <div className="macro-stage">{scope === 'solar' ? <MacroCanvas frame={frame} selected={solarTab === 'zones' ? selected : familyId === 'asteroids' ? 'asteroid' : familyId === 'dwarfs' ? 'all' : familyId === 'centaurs' ? 'scattered' : 'planetary'} resetCount={resetCount} family={solarTab === 'families' ? familyId : undefined} cameraView={cameraView} heightScale={heightScale} showPlane={showPlane}/> : <CosmicCanvas level={cosmicId}/>}
        <div className="macro-stage-label"><span className="macro-live-dot"/>{scope === 'cosmic' ? '宇宙邻域 · 形态示意' : solarTab === 'families' ? '太阳系成员 · 类别说明' : '三维结构示意'} <span>·</span> {scope === 'solar' && displayDate ? `行星方位 ${displayDate.replace('T', ' ')}（北京时间）` : scope === 'solar' ? '历表加载中' : '非真实相对方位'}</div>
        {scope === 'solar' && solarTab === 'families' && <div className="macro-family-key">{familyId === 'dwarfs' ? '示例参考半径：谷神星 2.77 AU · 冥王星 39.5 AU · 阋神星 68 AU' : familyId === 'moons' ? '近旁小圈为卫星系统视觉标记，不表示真实比例与轨道' : familyId === 'comets' ? '倾斜长椭圆与彗尾为典型形态示意，并非 67P 轨道' : familyId === 'centaurs' ? '巨行星区域与特洛伊群为种群范围示意' : familyId === 'dust' ? '太阳附近尘埃点仅示意分布，不表示实测密度' : '主带点数、大小与位置均不代表真实小行星'}</div>}
        {scope === 'solar' && <div className="macro-depth-controls" aria-label="三维观察方式"><div role="group" aria-label="宏观镜头角度">{([['oblique','斜视'],['edge','侧视'],['top','俯视']] as const).map(([id,label]) => <button key={id} className={cameraView === id ? 'active' : ''} onClick={() => setCameraView(id)} aria-pressed={cameraView === id}>{label}</button>)}</div><button className={showPlane ? 'active' : ''} onClick={() => setShowPlane(value => !value)} aria-pressed={showPlane}>黄道面 / 高度线</button>{solarTab === 'zones' && selected === 'planetary' && <button className={heightScale === 10 ? 'active enhanced' : ''} onClick={() => setHeightScale(value => value === 1 ? 10 : 1)} aria-pressed={heightScale === 10}>{heightScale === 1 ? '行星高度 ×10' : '行星高度 ×10 · 示意'}</button>}</div>}
        {scope === 'solar' && <button className="macro-reset" onClick={() => setResetCount(count => count + 1)} aria-label="复位宏观镜头" title="复位镜头"><RotateCcw size={15}/></button>}
        <div className="macro-scale-warning">{scope === 'cosmic' ? '拖动旋转 / 滚轮缩放 · 星系和恒星的画面尺寸与方位为示意' : solarTab === 'zones' && selected === 'planetary' && heightScale === 10 ? '行星黄道高度已放大 10 倍，仅为辨识；点击“行星高度 ×10”恢复真实高度' : solarTab === 'families' ? '类别标记与示例轨迹为示意 · 仅行星方位和真实高度来自历表' : selected === 'scattered' ? '紫色点只示意远伸且有纵向厚度的分布 · 一点不等于一颗已发现天体' : selected === 'oort' ? '圆点示意可能的冰质小天体群；每个点都不是已观测天体，点数、位置与大小不对应实测' : selected === 'heliosphere' ? '三维轮廓表示太阳风影响区 · 实际边界并非规则球面' : selected === 'kuiper' || selected === 'asteroid' ? '点云展示环带厚度 · 点位与密度为示意，非逐体历表' : '拖动旋转 / 滚轮缩放 · 距离采用对数映射 · 行星黄道高度来自历表'}</div>
        {scope === 'cosmic' && <div className="macro-cosmic-legend">{cosmicId === 'neighbors' ? '太阳 · 半人马座 α / 比邻星 · TRAPPIST-1' : cosmicId === 'milkyway' ? '银河系旋臂 · 猎户臂支中的太阳' : '银河系 · 大麦哲伦云 · 仙女座星系'}</div>}
      </div>
      <aside className="macro-info">{scope === 'cosmic' ? <><div className="macro-info-eyebrow">{cosmic.english}</div><h2>{cosmic.name}</h2><p className="macro-info-lead">{cosmic.description}</p><div className="macro-visual-meaning"><span>画面符号</span><p>{cosmic.visualMeaning}</p></div><div className="macro-info-facts"><div><span>尺度</span><strong>{cosmicFacts[cosmicId][0]}</strong></div><div><span>关系</span><strong>{cosmicFacts[cosmicId][1]}</strong></div><div><span>画面性质</span><strong>概念结构图，非实测星图</strong></div></div><p className="macro-evidence">{cosmic.status}</p><a className="macro-source" href={cosmic.sourceUrl} target="_blank" rel="noreferrer">查看{cosmic.sourceLabel}<ArrowUpRight size={13}/></a>{cosmicId === 'neighbors' && <a className="macro-source macro-extra-source" href="https://science.nasa.gov/exoplanets/trappist1/" target="_blank" rel="noreferrer">NASA TRAPPIST-1 七行星资料<ArrowUpRight size={13}/></a>}{cosmicId === 'galaxies' && <a className="macro-source macro-extra-source" href="https://science.nasa.gov/image-detail/hubble-uncovers-a-celestial-fossil-2/" target="_blank" rel="noreferrer">NASA 大麦哲伦云距离资料<ArrowUpRight size={13}/></a>}<div className="macro-next"><span className="macro-info-eyebrow">RETURN TO OUR SYSTEM</span><button onClick={() => setScope('solar')}><Globe2 size={15}/>返回太阳系结构<ArrowUpRight size={13}/></button></div></> : solarTab === 'families' ? <><div className="macro-info-eyebrow">{family.english}</div><h2>{family.name}</h2><p className="macro-info-lead">{family.description}</p><div className="macro-visual-meaning"><span>画面符号</span><p>{family.visualMeaning}</p></div><div className="macro-info-facts"><div><span>运行关系</span><strong>{family.keyFact}</strong></div><div><span>当前接入</span><strong>{family.status}</strong></div></div><p className="macro-evidence">成员横跨不同区域，不能把此类对象的画面示意当成逐体实测位置。</p><a className="macro-source" href={family.sourceUrl} target="_blank" rel="noreferrer">查看{family.sourceLabel}<ArrowUpRight size={13}/></a><div className="macro-next"><span className="macro-info-eyebrow">EXPLORE AN EXAMPLE</span>{family.exampleId ? <button onClick={() => onExploreObject(family.exampleId!)}><Crosshair size={15}/>查看{family.exampleName}资料<ArrowUpRight size={13}/></button> : <button onClick={onObservePlanets}><Layers3 size={15}/>进入现有天体观测<ArrowUpRight size={13}/></button>}</div></> : <><div className="macro-info-eyebrow">{zone?.english ?? 'STRUCTURE OVERVIEW'}</div><h2>{zone?.name ?? '从盘到球的太阳系'}</h2><p className="macro-info-lead">{zone?.detail ?? '太阳系没有硬质外壳。中间的行星轨道接近薄盘；柯伊伯带是有厚度的环带，散射盘有高倾角成员，奥尔特云被推断为巨大球状壳层。请逐层点选并侧视观察，不能用一个画面比例看清所有尺度。'}</p><div className="macro-visual-meaning"><span>画面符号</span><p>{zoneVisualMeaning}</p></div><div className="macro-info-facts"><div><span>距太阳</span><strong>{zone?.range ?? '1–约 100,000 AU'}</strong></div><div><span>空间形态</span><strong>{zone?.shape ?? '多层结构，不是单一几何体'}</strong></div><div><span>证据级别</span><strong>{zone?.evidenceKind ?? '观测与模型并列'}</strong></div>{selected === 'planetary' && <div><span>最大黄道高度</span><strong>{highestPlanet ? `${highestPlanet.name} 约 ${highestPlanet.heightAu.toFixed(2)} AU（相对太阳）` : '历表加载中'}</strong></div>}</div><p className="macro-evidence">{zone?.evidence ?? '行星位置来自当期历表；外层点云、日球层轮廓与奥尔特云球壳仅说明已知或推测的区域形态。'}</p>{zone ? <a className="macro-source" href={zone.sourceUrl} target="_blank" rel="noreferrer">查看{zone.sourceLabel}<ArrowUpRight size={13}/></a> : <a className="macro-source" href="https://science.nasa.gov/solar-system/solar-system-facts/" target="_blank" rel="noreferrer">NASA 太阳系整体资料<ArrowUpRight size={13}/></a>}
        <div className="macro-next"><span className="macro-info-eyebrow">EXPLORE FURTHER</span>{selected === 'all' && <button onClick={() => { setSelected('planetary'); setCameraView('edge'); setHeightScale(10); setShowPlane(true); }}><Layers3 size={15}/>侧视纵向差异（×10 示意）</button>}{selected === 'all' && <button onClick={() => { setSelected('oort'); setCameraView('edge'); setShowPlane(false); }}><Globe2 size={15}/>看外层球状结构（模型）</button>}{selected === 'planetary' || selected === 'all' ? <button onClick={onObservePlanets}><Orbit size={15}/>进入真实行星观测<ArrowUpRight size={13}/></button> : selected === 'asteroid' || selected === 'kuiper' || selected === 'scattered' ? <button onClick={() => onExploreObject(selected === 'asteroid' ? 'ceres' : selected === 'kuiper' ? 'pluto' : 'eris')}><Crosshair size={15}/>查看已收录的代表天体<ArrowUpRight size={13}/></button> : selected === 'oort' ? <button onClick={() => { setSolarTab('families'); setFamilyId('comets'); }}><Sparkles size={15}/>了解彗星与外层冰质天体<ArrowUpRight size={13}/></button> : <p>日球层是太阳风影响区；当前仅展示概念边界，尚未模拟太阳风粒子。</p>}</div></>}
      </aside>
    </div>
    <footer className="macro-footer"><Compass size={13}/>{scope === 'cosmic' ? 'AU 是太阳系内尺度；光年用于恒星和星系距离。不同镜头独立取景，画面尺寸、方位与点数不表示真实比例或实测位置；背景星点为绘制示意。' : '太阳系包含行星、卫星、矮行星、小天体、尘埃与太阳风。宏观粒子不是已知天体坐标；只有行星方位来自当前历表，奥尔特云仍是模型推断；背景星点不是实测星位。'}</footer>
  </section>;
}
