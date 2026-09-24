import {createIntegratedScene} from './macroIntegrated';
import {INTEGRATED_ITEMS,INTEGRATED_FOCUS_DISTANCE,defaultIntegratedFlags,integratedFlags,type IntegratedFlags,type IntegratedTarget} from '../data/integratedScene';
import { STAGES,stagedLayers,type StageFlags } from '../data/stages';
import { RingFamilies } from './RingLearning';
import type { RingPlanetId } from '../data/rings';
import { useMemo, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ArrowLeft, ArrowUpRight, Compass, Crosshair, Globe2, Layers3, Maximize2, Orbit, RotateCcw, Sparkles } from 'lucide-react';
import { BODIES } from '../data/catalog';
import { MACRO_ZONES, macroRadius, type MacroZoneId } from '../data/macroStructure';
import { COSMIC_LEVELS, SOLAR_FAMILIES, type CosmicLevelId, type SolarFamilyId } from '../data/cosmicContext';
import { CosmicCanvas } from './CosmicCanvas';
import { BODY_IDS, type StateFrame } from '../types';
import './MacroStructure.css';
import { useDwarfs } from '../hooks/useDwarfs';
import type { StateBatch } from '../ephemeris/stateProvider';
import { MACRO_LAYERS, defaultMacroLayers, macroDetailVisible, HALLEY_SOURCE, HALLEY_ORBIT, type MacroLayerVisibility, type MacroLayerId } from '../data/macroLayers';
import { createMacroPhenomena } from './macroPhenomena';
import { useMonthlyStates } from '../hooks/useMonthlyStates';
import { cometProvider } from '../ephemeris/comets';
import type { CometTracks } from '../ephemeris/cometState';
import { CometPanel, type MacroTimeControls } from './CometPanel';
import { smallBodyProvider, matchingMemberBatch } from '../ephemeris/smallBodies';
import { regionMemberById } from '../data/regionMembers';
import { RegionMembers } from './RegionMembers';
import { publicAsset } from '../data/publicAsset';

interface Props {
  stageFlags:StageFlags;
  onOpenStages:()=>void;
  onOpenEnvironment:()=>void;
  onOpenSolarActivity:()=>void;
  onOpenDust:()=>void;
  onOpenHeliosphere:()=>void;
  initialZone?:MacroZoneId;
  onOpenFamily:(id:RingPlanetId)=>void;
  initialFamily?:SolarFamilyId;
  initialMemberId?: string;
  frame: StateFrame | null;
  displayDate: string;
  timeControls: MacroTimeControls;
  isEphemeris?: boolean;
  onClose: () => void;
  onOpenReadingGuide: () => void;
  onObservePlanets: () => void;
  onExploreObject: (id: string) => void;
}

const ORBIT_AU = [0.387, 0.723, 1, 1.524, 5.203, 9.537, 19.191, 30.07];
const CAMERA_DISTANCE: Record<MacroZoneId, number> = { all: 62, planetary: 21, asteroid: 9, kuiper: 20, scattered: 34, heliosphere: 27, oort: 62 };
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

interface IntegratedOptions {flags:IntegratedFlags;target:IntegratedTarget|null;request:number;restore:number;progress:number;onFocus:(target:IntegratedTarget)=>void}

function MacroCanvas({ integrated, selectedMember, onSelectMember, focusRequest, restoreRequest, cometBatch, cometTracks, showActivity, frame, selected, resetCount, family, cameraView, heightScale, showPlane, layers, batch, animate, showLabels, onDistance }: { integrated:IntegratedOptions; selectedMember:string|null; onSelectMember:(id:string)=>void; focusRequest:number; restoreRequest:number; cometBatch: StateBatch | null; cometTracks: CometTracks | null; showActivity: boolean; frame: StateFrame | null; selected: MacroZoneId; resetCount: number; family?: SolarFamilyId; cameraView: MacroCameraView; heightScale: 1 | 10; showPlane: boolean; layers: MacroLayerVisibility; batch: StateBatch | null; animate: boolean; showLabels: boolean; onDistance: (distance: number) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const frameRef = useRef(frame);
  const sceneRef = useRef<{ camera: THREE.PerspectiveCamera; controls: OrbitControls; materials: Partial<Record<MacroZoneId, ZoneMaterial[]>>; plane: THREE.Mesh; guides: THREE.Line[]; restoreContext:()=>void; savedView?: { position:THREE.Vector3; target:THREE.Vector3; up:THREE.Vector3 } } | null>(null);
  frameRef.current = frame;
  const displayRef = useRef({ integrated, selectedMember, onSelectMember, focusRequest, restoreRequest, cometBatch, cometTracks, showActivity, layers, batch, animate, showPlane, heightScale, family, showLabels, onDistance });
  displayRef.current = { integrated, selectedMember, onSelectMember, focusRequest, restoreRequest, cometBatch, cometTracks, showActivity, layers, batch, animate, showPlane, heightScale, family, showLabels, onDistance };

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
    catch { element.textContent = '当前浏览器无法创建三维场景，请查看右侧结构与来源。'; return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    element.appendChild(renderer.domElement);
    let disposed=false;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a1621');
    scene.add(new THREE.HemisphereLight('#b6d8ef', '#1d3040', 1.0));
    const sunlight = new THREE.PointLight('#ffe8c1', 2.8, 0, 0); scene.add(sunlight);
    const camera = new THREE.PerspectiveCamera(44, 1, .02, 200);
    camera.position.set(32, 25, 47);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = .075; controls.minDistance = 3; controls.maxDistance = 95;
    controls.target.set(0, 0, 0);
    const materials: Partial<Record<MacroZoneId, ZoneMaterial[]>> = {};
    const remember = (id: MacroZoneId, material: ZoneMaterial) => { material.userData.baseOpacity = material.opacity; (materials[id] ??= []).push(material); return material; };
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
    sun.userData.labelRadius = .34; scene.add(sun);
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
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(index > 3 ? .13 : .09, 12, 10), new THREE.MeshStandardMaterial({ color: body.color, roughness: .8, metalness: 0 }));
      mesh.userData.labelRadius = index > 3 ? .13 : .09; scene.add(mesh);
      return mesh;
    });

    const textureLoader=new THREE.TextureLoader();
    for(const [mesh,path] of [[sun,'/textures/sun.jpg'],[planets[2],'/textures/earth.jpg']] as const)textureLoader.load(publicAsset(path),map=>{if(disposed){map.dispose();return;}map.colorSpace=THREE.SRGBColorSpace;mesh.material.map=map;mesh.material.color.set('white');mesh.material.needsUpdate=true;});

    // Category markers deliberately enlarge local phenomena; their positions are conceptual, not ephemerides.
    const moonGroups: { index: number; group: THREE.Group }[] = [];
    {
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
    addCloud('oort', makeCloud(2600, 175002, shellPoint(2000, 100000)), '#cfeaff', .15, .62);
    const phenomena = createMacroPhenomena(scene, particleTexture, element, id=>displayRef.current.onSelectMember(id));
    const integratedScene=createIntegratedScene(scene,particleTexture,element,target=>displayRef.current.integrated.onFocus(target));

    const bubble = new THREE.Mesh(new THREE.SphereGeometry(macroRadius(120), 42, 24), remember('heliosphere', new THREE.MeshBasicMaterial({ color: '#4b9fd7', transparent: true, opacity: .018, side: THREE.BackSide, depthWrite: false })));
    scene.add(bubble);
    const innerBubble = new THREE.Mesh(new THREE.SphereGeometry(macroRadius(120), 32, 20), remember('heliosphere', new THREE.MeshBasicMaterial({ color: '#316eaa', transparent: true, opacity: .035, side: THREE.BackSide, depthWrite: false })));
    scene.add(innerBubble);
    const outerGuide = new THREE.Mesh(new THREE.SphereGeometry(macroRadius(100000), 40, 20), remember('oort', new THREE.MeshBasicMaterial({ color: '#88b6d1', transparent: true, opacity: .012, side: THREE.BackSide, depthWrite: false })));
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
    const contextMaterials=new Map<THREE.Material,{opacity:number;size?:number;attenuation?:boolean}>();
    const restoreContext=()=>{for(const [material,original] of contextMaterials){material.opacity=original.opacity;if(material instanceof THREE.PointsMaterial){material.size=original.size!;material.sizeAttenuation=original.attenuation!;material.needsUpdate=true;}}contextMaterials.clear();};
    sceneRef.current = { camera, controls, materials, plane, guides,restoreContext };
    const raycaster=new THREE.Raycaster();
    let down:{x:number;y:number}|null=null;
    const pointerDown=(event:PointerEvent)=>{if(event.button===0)down={x:event.clientX,y:event.clientY};};
    const pointerUp=(event:PointerEvent)=>{
      const start=down;down=null;
      if(!start || Math.hypot(event.clientX-start.x,event.clientY-start.y)>5)return;
      const bounds=renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((event.clientX-bounds.left)/bounds.width*2-1,1-(event.clientY-bounds.top)/bounds.height*2),camera);
      const markers:THREE.Object3D[]=[];
      scene.traverse(object=>{if(!object.userData.memberId)return;let p:THREE.Object3D|null=object;while(p){if(!p.visible)return;p=p.parent;}markers.push(object);});
      const hit=raycaster.intersectObjects(markers,false)[0];
      if(hit)displayRef.current.onSelectMember(hit.object.userData.memberId);
    };
    renderer.domElement.addEventListener('pointerdown',pointerDown);
    renderer.domElement.addEventListener('pointerup',pointerUp);
    let lastIntegratedRequest=0,lastIntegratedRestore=0;
    let integratedSaved:{position:THREE.Vector3;target:THREE.Vector3;up:THREE.Vector3}|null=null;
    let previousEarth:THREE.Vector3|null=null;
    let lastFocusRequest=0;
    let lastRestoreRequest=0;
    let animation = 0;
    let lastFrame = 0;
    let demoSeconds = 0;
    let lastDistance = -1;
    const draw = (now: number) => {
      animation = requestAnimationFrame(draw);
      if (now - lastFrame < 30) return;
      if (displayRef.current.animate && lastFrame) demoSeconds += Math.min((now - lastFrame) / 1000, .1);
      lastFrame = now;
      const { showPlane, heightScale, family, showLabels, onDistance } = displayRef.current;
      const current = frameRef.current;
      planets.forEach(mesh => { mesh.visible = !!current && displayRef.current.layers.planetary; });
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
            guides[i].visible = showPlane && displayRef.current.layers.planetary && Math.abs(point.y) > .015;
          }
        }
        for (const { index, group } of moonGroups) { group.position.copy(planets[index].position); group.visible = displayRef.current.layers.moons && (camera.position.distanceTo(controls.target) < 30 || family === 'moons'); }
      }
      if (!current) { moonGroups.forEach(item => { item.group.visible = false; }); guides.forEach(item => { item.visible = false; }); }
      for (const [id, list] of Object.entries(materials)) for (const material of list) material.visible = displayRef.current.layers[id as MacroLayerId] ?? true;
      plane.visible = showPlane && displayRef.current.layers.planetary;
      const focus=displayRef.current;
      const context=sceneRef.current;
      if(focus.restoreRequest!==lastRestoreRequest){
        if(context?.savedView){controls.enableDamping=false;controls.update();controls.enableDamping=true;camera.position.copy(context.savedView.position);camera.up.copy(context.savedView.up);controls.target.copy(context.savedView.target);context.savedView=undefined;}
        lastRestoreRequest=focus.restoreRequest;
      }
      if(focus.focusRequest!==lastFocusRequest && current && focus.selectedMember && focus.batch && Math.abs(focus.batch.timeTdb-current.time)<1e-5){
        const state=focus.batch.states.find(s=>s.id===focus.selectedMember);
        if(state){
          if(context&&!context.savedView)context.savedView={position:camera.position.clone(),target:controls.target.clone(),up:camera.up.clone()};
          const p=state.position.map((v,i)=>(v-current.positions[i])/149597870.7),d=Math.hypot(...p),r=macroRadius(d);
          const target=new THREE.Vector3(p[0]/d*r,p[2]/d*r,-p[1]/d*r);
          const offset=camera.position.clone().sub(controls.target).normalize().multiplyScalar(8);
          controls.enableDamping=false;controls.update();controls.enableDamping=true;
          controls.target.copy(target);camera.position.copy(target).add(offset);lastFocusRequest=focus.focusRequest;
        }
      }
      const integration=displayRef.current.integrated;
      const earthPosition=current?planets[2].position:null;
      integratedScene.update(integration.flags,earthPosition,camera,integration.target,integration.progress);
      if(integration.restore!==lastIntegratedRestore){if(integratedSaved){controls.enableDamping=false;controls.update();camera.position.copy(integratedSaved.position);camera.up.copy(integratedSaved.up);controls.target.copy(integratedSaved.target);controls.enableDamping=true;}integratedSaved=null;previousEarth=null;lastIntegratedRestore=integration.restore;}
      if(!integration.target){integratedSaved=null;previousEarth=null;controls.minDistance=3;}
      if(integration.target&&integration.request!==lastIntegratedRequest&&(integration.target!=='earth'||earthPosition)){
        if(!integratedSaved)integratedSaved={position:camera.position.clone(),target:controls.target.clone(),up:camera.up.clone()};
        const target=integratedScene.anchors[integration.target];
        controls.enableDamping=false;controls.update();controls.minDistance=.4;camera.up.set(0,1,0);
        const offset=new THREE.Vector3(.55,.38,.74).normalize().multiplyScalar(INTEGRATED_FOCUS_DISTANCE[integration.target]);
        controls.target.copy(target);camera.position.copy(target).add(offset);controls.update();controls.enableDamping=true;
        previousEarth=integration.target==='earth'&&earthPosition?earthPosition.clone():null;lastIntegratedRequest=integration.request;
      }else if(integration.target==='earth'&&earthPosition&&previousEarth){const delta=earthPosition.clone().sub(previousEarth);camera.position.add(delta);controls.target.add(delta);previousEarth.copy(earthPosition);}
      controls.update();
      const cameraDistance = camera.position.distanceTo(controls.target);
      if (Math.abs(cameraDistance-lastDistance) > .1) { lastDistance=cameraDistance; onDistance(cameraDistance); }
      phenomena.update(current, displayRef.current.batch, displayRef.current.layers, camera.position.distanceTo(controls.target), demoSeconds, family, displayRef.current.cometBatch, displayRef.current.cometTracks, displayRef.current.showActivity, displayRef.current.selectedMember);
      scene.updateMatrixWorld(true);
      phenomena.layoutLabels(camera, element.clientWidth, element.clientHeight, showLabels&&!integration.target);
      const softenContext=!!integration.target;
      if(softenContext){scene.traverse(object=>{if(!(object instanceof THREE.Points||object instanceof THREE.Line))return;let parent:THREE.Object3D|null=object;while(parent){if(parent.userData.integrated)return;parent=parent.parent;}for(const material of Array.isArray(object.material)?object.material:[object.material]){if(!contextMaterials.has(material))contextMaterials.set(material,{opacity:material.opacity,...(material instanceof THREE.PointsMaterial?{size:material.size,attenuation:material.sizeAttenuation}:{})});const original=contextMaterials.get(material)!;material.opacity=original.opacity*.3;if(material instanceof THREE.PointsMaterial){material.size=2;if(material.sizeAttenuation){material.sizeAttenuation=false;material.needsUpdate=true;}}}});}
      else if(contextMaterials.size)restoreContext();
      integratedScene.layout(camera,element.clientWidth,element.clientHeight,showLabels);
      renderer.render(scene, camera);
    };
    animation = requestAnimationFrame(draw);
    return () => {
      renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);
      disposed=true;cancelAnimationFrame(animation); observer.disconnect(); controls.dispose(); sceneRef.current = null;
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
          object.geometry.dispose();
          const material = object.material;
          (Array.isArray(material) ? material : [material]).forEach(item => {if('map' in item&&(item.map as THREE.Texture|null)!==particleTexture)(item.map as THREE.Texture|null)?.dispose();item.dispose();});
        }
      });
      phenomena.dispose();integratedScene.dispose();
      particleTexture.dispose();
      renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  useEffect(() => {
    const context = sceneRef.current;
    if (!context) return;
    context.restoreContext();context.savedView=undefined;
    const distance = family === 'dwarfs' ? 20 : CAMERA_DISTANCE[selected];
    context.camera.up.set(0, cameraView === 'top' ? 0 : 1, cameraView === 'top' ? -1 : 0);
    if (cameraView === 'top') context.camera.position.set(.001, distance, .001);
    else if (cameraView === 'edge') context.camera.position.set(distance * .28, distance * .13, distance * .94);
    else context.camera.position.set(distance * .56, distance * .58, distance * .63);
    context.controls.target.set(0, 0, 0);
    context.controls.update();

    (context.plane.material as THREE.MeshBasicMaterial).opacity = selected === 'planetary' ? .075 : selected === 'asteroid' || selected === 'kuiper' ? .035 : .012;

    for (const [id, group] of Object.entries(context.materials)) {
      for (const material of group) {
        const base = material.userData.baseOpacity as number;
        const focused = selected === id;
        if (material instanceof THREE.PointsMaterial) {
          const baseSize = material.userData.baseSize as number;
          material.size = focused ? (id === 'oort' ? .52 : .25) : selected === 'all' ? baseSize * 1.5 : baseSize;
          material.opacity = focused ? Math.min(.95, base * 1.5) : selected === 'all' ? base : Math.min(base, .12);
        } else {
          material.opacity = focused || selected === 'all' ? base : material instanceof THREE.MeshBasicMaterial ? .003 : Math.max(.025, base * .18);
        }
      }
    }
  }, [selected, resetCount, family, cameraView]);

  return <div className="macro-canvas" ref={host} role="group" aria-label="可拖动旋转、滚轮缩放的太阳系宏观结构三维示意"/>;
}

export function MacroStructure({ stageFlags, onOpenStages, onOpenEnvironment, onOpenSolarActivity, onOpenDust, onOpenHeliosphere, initialZone, onOpenFamily, initialFamily, initialMemberId, timeControls, frame, displayDate, isEphemeris = true, onClose, onOpenReadingGuide, onObservePlanets, onExploreObject }: Props) {
  const [panelTab, setPanelTab] = useState<'integrated' | 'learn' | 'layers' | 'sources'>('integrated');
  const [integratedChoices,setIntegratedChoices]=useState(defaultIntegratedFlags);
  const [integratedTarget,setIntegratedTarget]=useState<IntegratedTarget|null>(null);
  const [integratedRequest,setIntegratedRequest]=useState(0),[integratedRestore,setIntegratedRestore]=useState(0);
  const [integratedProgress,setIntegratedProgress]=useState(.32),[integratedPlaying,setIntegratedPlaying]=useState(false);
  useEffect(()=>{if(!integratedPlaying)return;let raf=0,last=performance.now();const tick=(now:number)=>{const dt=(now-last)/1000;last=now;setIntegratedProgress(p=>(p+dt/20)%1);raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);},[integratedPlaying]);
  const effectiveIntegrated=integratedFlags(integratedChoices,stageFlags,!!frame&&isEphemeris);
  const focusIntegrated=(target:IntegratedTarget)=>{setScope('solar');setSelectedMember(null);setIntegratedChoices(v=>({...v,...Object.fromEntries(INTEGRATED_ITEMS.filter(i=>i.target===target).map(i=>[i.id,true]))}));setPanelTab('integrated');setIntegratedTarget(target);setIntegratedRequest(n=>n+1);};
  const leaveIntegrated=()=>{setIntegratedTarget(null);setIntegratedRestore(n=>n+1);};
  const [showLabels, setShowLabels] = useState(true);
  const [cameraDistance, setCameraDistance] = useState(62);
  const [layers, setLayers] = useState(defaultMacroLayers);
  const [animate, setAnimate] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const dwarfData = useDwarfs(frame?.time, isEphemeris);
  const smallBodyData = useMonthlyStates(smallBodyProvider, frame?.time, isEphemeris&&stageFlags.members);
  const cometData = useMonthlyStates(cometProvider, frame?.time, isEphemeris&&stageFlags.comets);
  const [cometTracks,setCometTracks]=useState<CometTracks|null>(null);
  const [trackError,setTrackError]=useState('');
  const [showActivity,setShowActivity]=useState(false);
  useEffect(()=>{
    const abort=new AbortController();
    void fetch(publicAsset('/data/comets/tracks.json'),{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error('轨迹文件读取失败');return r.json();}).then((data:CometTracks)=>{
      if(!data.tracks || data.tracks.length!==2 || data.tracks.some(t=>!['halley','67p'].includes(t.id)||!t.points.length||t.points.some(p=>p.length!==4||!p.every(Number.isFinite))))throw new Error('轨迹文件格式不兼容');
      if(!abort.signal.aborted)setCometTracks(data);
    }).catch(()=>{if(!abort.signal.aborted)setTrackError('两年轨迹暂未加载，关闭并重新打开宏观结构可重试');});
    return ()=>abort.abort();
  },[]);
  const scientificFrame = isEphemeris ? frame : null;
  const [scope, setScope] = useState<'solar' | 'cosmic'>('solar');
  const [solarTab, setSolarTab] = useState<'zones' | 'families'>(initialFamily?'families':'zones');
  const [selected, setSelected] = useState<MacroZoneId>(regionMemberById(initialMemberId)?.zone ?? initialZone ?? 'all');
  const [selectedMember,setSelectedMember]=useState<string|null>(initialMemberId ?? null);
  const [restoreRequest,setRestoreRequest]=useState(0);
  const [focusRequest,setFocusRequest]=useState(initialMemberId?1:0);
  const memberBatch=useMemo(()=>matchingMemberBatch(scientificFrame,dwarfData.batch,smallBodyData.batch),[scientificFrame,dwarfData.batch,smallBodyData.batch]);
  const chooseMember=(id:string)=>{setIntegratedTarget(null);setSelectedMember(id);setPanelTab('learn');setLayers(v=>({...v,dwarfs:true}));setFocusRequest(v=>v+1);};

  const [familyId, setFamilyId] = useState<SolarFamilyId>(initialFamily??'moons');
  const [cosmicId, setCosmicId] = useState<CosmicLevelId>('neighbors');
  const [resetCount, setResetCount] = useState(0);
  const [cameraView, setCameraView] = useState<MacroCameraView>('oblique');
  const [heightScale, setHeightScale] = useState<1 | 10>(1);
  const [showPlane, setShowPlane] = useState(true);
  const previousRegion=useRef(`${selected}/${solarTab}/${familyId}`);
  useEffect(()=>{const key=`${selected}/${solarTab}/${familyId}`;if(previousRegion.current!==key){setSelectedMember(null);previousRegion.current=key;}},[selected,solarTab,familyId]);
  const effectiveLayers=stagedLayers(layers,stageFlags);
  useEffect(()=>{setIntegratedTarget(null);},[selected,solarTab,familyId,cameraView,resetCount]);
  useEffect(()=>{if(integratedTarget&&!INTEGRATED_ITEMS.some(i=>i.target===integratedTarget&&effectiveIntegrated[i.id]))leaveIntegrated();},[integratedTarget,effectiveIntegrated.solar,effectiveIntegrated.environment,effectiveIntegrated.belts,effectiveIntegrated.dust,effectiveIntegrated.helio]);
  useEffect(()=>{if(selectedMember && (!effectiveLayers.dwarfs || (!stageFlags.members && ['vesta','haumea','makemake','eris'].includes(selectedMember)))){setSelectedMember(null);setRestoreRequest(v=>v+1);}},[stageFlags.members,effectiveLayers.dwarfs,selectedMember]);
  const focusedFamily = solarTab === 'families' ? familyId : undefined;
  const layerStatus = (id: MacroLayerId) => {
    if (!layers[id]) return '已关闭';
    if (!effectiveLayers[id]) return '阶段已隐藏';
    if ((id === 'planetary' || id === 'moons') && !scientificFrame) return '缺少历表';
    if (id === 'comets' && !isEphemeris) return '缺少历表';
    if (id === 'comets' && !cometData.batch) return cometData.error ? '加载失败' : '等待历表';
    if (id === 'dwarfs' && !isEphemeris) return '缺少历表';
    if (id === 'dwarfs' && (!dwarfData.batch || (stageFlags.members&&!smallBodyData.batch))) return (dwarfData.error || smallBodyData.error) ? '部分失败' : '部分加载';
    const expanded = macroDetailVisible(id, cameraDistance) || focusedFamily === id || (id === 'populations' && focusedFamily === 'centaurs');
    return expanded ? '已展开' : '靠近显示';
  };
  const expandedCount = MACRO_LAYERS.filter(layer => layerStatus(layer.id) === '已展开').length;
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const zone = MACRO_ZONES.find(item => item.id === selected);
  const zoneVisualMeaning = zone?.visualMeaning ?? '太阳、八大行星、6 个区域代表成员及两颗彗星取当前历表位置。彗星亮线是两年历表路径，淡线是瞬时参考椭圆；细圆环为尺度参考。彩色点云、可选双尾、太阳风及边界是示意，奥尔特云是模型推断。';
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
    event.stopPropagation();
    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), summary, a[href], [tabindex="0"]') ?? []).filter(element => element.getClientRects().length > 0 && (!element.closest('details:not([open])') || element.matches('summary')));
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && (document.activeElement === first || !dialog.current?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  return <section ref={dialog} className="macro-structure" role="dialog" aria-modal="true" aria-labelledby="macro-title" onKeyDown={onKeyDown}>
    <header className="macro-header"><div><span className="macro-eyebrow">FROM OUR SOLAR SYSTEM TO OTHER GALAXIES</span><h1 id="macro-title">从太阳系，看见更大的宇宙</h1><p>结构导览 · 返回观测恢复原镜头；主页「综合全景」可再次进入。</p></div><div className="macro-header-actions">{stageFlags.dustExplorer&&<button className="macro-reading-button" onClick={()=>focusIntegrated('dust')}>尘埃与流星</button>}{stageFlags.solarActivity&&<button className="macro-reading-button" onClick={()=>focusIntegrated('sun')}>太阳活动</button>}{(stageFlags.environment||stageFlags.nearEarth)&&<button className="macro-reading-button" onClick={()=>focusIntegrated('earth')}>近地空间</button>}<button className="macro-reading-button" onClick={onOpenStages}>阶段导览</button><button className="macro-reading-button" onClick={onOpenReadingGuide}><Sparkles size={15}/>星点与环怎么看</button><button ref={closeButton} className="macro-back" title="关闭结构图，返回原有观测镜头与时间轴设置" onClick={onClose}><ArrowLeft size={16}/>返回观测</button></div></header>
    <div className="macro-scope-tabs" role="tablist" aria-label="宇宙观察范围"><button role="tab" aria-selected={scope === 'solar'} className={scope === 'solar' ? 'active' : ''} onClick={() => setScope('solar')}><Orbit size={14}/>太阳系 · 区域与成员</button><button role="tab" aria-selected={scope === 'cosmic'} className={scope === 'cosmic' ? 'active' : ''} onClick={() => setScope('cosmic')}><Sparkles size={14}/>恒星系统与其他星系</button><span>AU → 光年 → 星系尺度</span></div>
    {scope === 'solar' && <div className="macro-preset-bar">          <div className="macro-presets" aria-label="宏观取景预设">
            <button aria-pressed={!integratedTarget && !selectedMember && solarTab === 'zones' && selected === 'all' && Object.values(effectiveLayers).every(Boolean)} onClick={() => { setResetCount(n => n + 1); setCameraView('oblique'); setHeightScale(1); setLayers(defaultMacroLayers()); setSolarTab('zones'); setSelected('all'); }}>综合全景</button>
            <button aria-pressed={!integratedTarget && !selectedMember && solarTab === 'zones' && selected === 'planetary' && MACRO_LAYERS.every(l => effectiveLayers[l.id] === !['oort','heliosphere','wind'].includes(l.id))} onClick={() => { setResetCount(n => n + 1); setCameraView('oblique'); setHeightScale(1); setLayers({ ...defaultMacroLayers(), oort: false, heliosphere: false, wind: false }); setSolarTab('zones'); setSelected('planetary'); }}>天体与轨道</button>
            <button aria-pressed={!integratedTarget && !selectedMember && solarTab === 'zones' && selected === 'heliosphere' && MACRO_LAYERS.every(l => effectiveLayers[l.id] === ['planetary','asteroid','kuiper','wind','heliosphere'].includes(l.id))} onClick={() => { setResetCount(n => n + 1); setCameraView('oblique'); setHeightScale(1); setLayers({ ...defaultMacroLayers(), oort: false, populations: false, dust: false, scattered: false, comets: false, moons: false, dwarfs: false }); setSolarTab('zones'); setSelected('heliosphere'); }}>太阳风环境</button>
          </div>
<span>先选取景，再开关图层 · 滚轮靠近</span></div>}
    <div className="macro-main">
      <nav className="macro-zone-list" aria-label={scope === 'solar' ? '太阳系结构与成员' : '宇宙邻域层次'}>
        {scope === 'solar' ? <>
          <div className="macro-list-tabs" role="group" aria-label="太阳系观察内容"><button className={solarTab === 'zones' ? 'active' : ''} onClick={() => setSolarTab('zones')}>空间区域</button><button className={solarTab === 'families' ? 'active' : ''} onClick={() => setSolarTab('families')}>天体与物质</button></div>
          <div className="macro-section-title">{solarTab === 'zones' ? '由内向外 · 结构层次' : '成员类别 · 不按同心层排列'}</div><span className="macro-scroll-cue">左右滑动<br/>查看更多区域 →</span>
          {solarTab === 'zones' ? <><button className={`macro-zone ${selected === 'all' ? 'active' : ''}`} onClick={() => {setPanelTab('integrated');setSelected('all');}} aria-pressed={selected === 'all'}><span className="macro-zone-icon"><Maximize2 size={15}/></span><span><strong>整体形态</strong><small>行星薄盘 → 远缘球壳</small></span></button>{MACRO_ZONES.map(item => <button key={item.id} className={`macro-zone ${selected === item.id ? 'active' : ''}`} onClick={() => { setPanelTab('learn');setSelected(item.id); setLayers(v => ({ ...v, [item.id]: true })); }} aria-pressed={selected === item.id}><i style={{ background: item.color }}/><span><strong>{item.name}</strong><small>{item.range}</small></span></button>)}</> : SOLAR_FAMILIES.map(item => <button key={item.id} className={`macro-zone ${familyId === item.id ? 'active' : ''}`} onClick={() => { setFamilyId(item.id); const layer = item.id === 'centaurs' ? 'populations' : item.id === 'asteroids' ? 'asteroid' : item.id; setLayers(v => ({ ...v, [layer]: true })); }} aria-pressed={familyId === item.id}><i style={{ background: '#d5bd9a' }}/><span><strong>{item.name}</strong><small>{item.keyFact}</small></span></button>)}
        </> : <><div className="macro-section-title">离开太阳系 · 三个不同尺度</div>{COSMIC_LEVELS.map((item, index) => <button key={item.id} className={`macro-zone ${cosmicId === item.id ? 'active' : ''}`} onClick={() => setCosmicId(item.id)} aria-pressed={cosmicId === item.id}><span className="macro-cosmic-index">0{index + 1}</span><span><strong>{item.name}</strong><small>{item.keyFact}</small></span></button>)}<p className="macro-side-note">“恒星系统”是一颗或多颗恒星及其成员；“星系”是包含大量恒星的更大结构。太阳系属于银河系。</p></>}
      </nav>
      <div className="macro-stage">{scope === 'solar' ? <MacroCanvas integrated={{flags:effectiveIntegrated,target:integratedTarget,request:integratedRequest,restore:integratedRestore,progress:integratedProgress,onFocus:focusIntegrated}} selectedMember={selectedMember} onSelectMember={chooseMember} focusRequest={focusRequest} restoreRequest={restoreRequest} cometBatch={cometData.batch} cometTracks={cometTracks} showActivity={showActivity} showLabels={showLabels} onDistance={setCameraDistance} frame={scientificFrame} layers={effectiveLayers} batch={memberBatch} animate={animate} selected={solarTab === 'zones' ? selected : familyId === 'asteroids' ? 'asteroid' : familyId === 'dwarfs' ? 'all' : familyId === 'centaurs' ? 'scattered' : 'planetary'} resetCount={resetCount} family={solarTab === 'families' ? familyId : undefined} cameraView={cameraView} heightScale={solarTab === 'zones' && selected === 'planetary' ? heightScale : 1} showPlane={showPlane}/> : <CosmicCanvas level={cosmicId}/>}
        <div className="macro-stage-label"><span className="macro-live-dot"/>{scope === 'cosmic' ? '宇宙邻域 · 形态示意' : solarTab === 'families' ? '太阳系成员 · 分层展示' : '太阳系宏观全景'} <span>·</span> {scope === 'solar' && !isEphemeris ? '当前为物理模式 · 实测天体已隐藏' : scope === 'solar' && displayDate ? `观测时刻 ${displayDate.replace('T', ' ')}（北京时间）` : scope === 'solar' ? '历表加载中' : '非真实相对方位'}</div>
        {scope === 'solar' && solarTab === 'families' && <div className="macro-family-key">{familyId === 'dwarfs' ? '谷神星 / 冥王星：历表位置与瞬时参考轨道；卡戎在此尺度不可分辨' : familyId === 'moons' ? '近旁小圈为卫星系统视觉标记，不表示真实比例与轨道' : familyId === 'comets' ? '哈雷 / 67P：当日历表位置 · 亮线为两年路径，淡线为参考椭圆' : familyId === 'centaurs' ? '巨行星区域与特洛伊群为种群范围示意' : familyId === 'dust' ? '太阳附近尘埃点仅示意分布，不表示实测密度' : '主带点数、大小与位置均不代表真实小行星'}</div>}
        {scope === 'solar' && <div className="macro-depth-controls" aria-label="三维观察方式"><div role="group" aria-label="宏观镜头角度">{([['oblique','斜视'],['edge','侧视'],['top','俯视']] as const).map(([id,label]) => <button key={id} className={cameraView === id ? 'active' : ''} onClick={() => setCameraView(id)} aria-pressed={cameraView === id}>{label}</button>)}</div><button className={showPlane ? 'active' : ''} onClick={() => setShowPlane(value => !value)} aria-pressed={showPlane}>黄道面 / 高度线</button>{solarTab === 'zones' && selected === 'planetary' && <button className={heightScale === 10 ? 'active enhanced' : ''} onClick={() => setHeightScale(value => value === 1 ? 10 : 1)} aria-pressed={heightScale === 10}>{heightScale === 1 ? '行星高度 ×10' : '行星高度 ×10 · 示意'}</button>}</div>}
        {scope === 'solar' && <button className="macro-reset" onClick={() => setResetCount(count => count + 1)} aria-label="复位宏观镜头" title="复位镜头"><RotateCcw size={15}/></button>}
        <div className="macro-scale-warning">{scope === 'cosmic' ? '拖动旋转 / 滚轮缩放 · 星系和恒星的画面尺寸与方位为示意' : solarTab === 'zones' && selected === 'planetary' && heightScale === 10 ? '行星黄道高度已放大 10 倍，仅为辨识；点击“行星高度 ×10”恢复真实高度' : solarTab === 'families' ? '距离对数压缩 · 天体位置见来源状态 · 彗尾、太阳风、种群点云为示意' : selected === 'scattered' ? '紫色点只示意远伸且有纵向厚度的分布 · 一点不等于一颗已发现天体' : selected === 'oort' ? '圆点示意可能的冰质小天体群；每个点都不是已观测天体，点数、位置与大小不对应实测' : selected === 'heliosphere' ? '三维轮廓表示太阳风影响区 · 实际边界并非规则球面' : selected === 'kuiper' || selected === 'asteroid' ? '点云展示环带厚度 · 点位与密度为示意，非逐体历表' : '拖动旋转 / 滚轮缩放 · 距离采用对数映射 · 行星黄道高度来自历表'}</div>
        {scope === 'cosmic' && <div className="macro-cosmic-legend">{cosmicId === 'neighbors' ? '太阳 · 半人马座 α / 比邻星 · TRAPPIST-1' : cosmicId === 'milkyway' ? '银河系旋臂 · 猎户臂支中的太阳' : '银河系 · 大麦哲伦云 · 仙女座星系'}</div>}
      </div>
      <aside className="macro-info">
        {scope === 'solar' && <><div className="macro-panel-tabs" role="group" aria-label="宏观侧栏内容">{([['integrated','全景现象'],['learn','认识这里'],['layers','图层'],['sources','来源']] as const).map(([id,name]) => <button key={id} aria-pressed={panelTab===id} onClick={() => setPanelTab(id)}>{name}{id==='layers' && <small>{Object.values(effectiveLayers).filter(Boolean).length}</small>}</button>)}</div>
        <div className="macro-layer-summary"><span>{expandedCount} 类已展开</span><span>{MACRO_LAYERS.filter(l=>layerStatus(l.id)==='靠近显示').length} 类靠近显示</span><button aria-pressed={showLabels} onClick={()=>setShowLabels(v=>!v)}>{showLabels ? '隐藏标注' : '显示标注'}</button></div></>}
        <div className="macro-info-scroll">
        {scope==='solar'&&<section className="panorama-integration" hidden={panelTab!=='integrated'} aria-label="全景现象控制">
          <h2>在同一片空间中观察</h2><p>这些效果已画入当前全景。点击场景标记或下方定位，镜头在同一画布中靠近；远景保留位置标记，近景展开细节。</p>
          <p className="panorama-scale-note">天体锚点采用当前历表；周围现象为放大示意，不是当天事件。距离仍压缩，局部尺寸不能与天体距离直接比较。</p>
          {integratedTarget&&<div className="panorama-current"><strong>当前定位：{({sun:'太阳活动',earth:'地球周围',dust:'行星际碎屑',helio:'日球层环境'}[integratedTarget])}</strong><button onClick={leaveIntegrated}>返回定位前视角</button></div>}
          <div className="panorama-choices">{INTEGRATED_ITEMS.map(item=><article key={item.id}><label><input type="checkbox" checked={integratedChoices[item.id]} disabled={!stageFlags[item.stage]} onChange={e=>setIntegratedChoices(v=>({...v,[item.id]:e.target.checked}))}/><strong>{item.title}</strong></label><small>{!stageFlags[item.stage]?'阶段已隐藏':item.target==='earth'&&!scientificFrame?'等待真实地球位置':effectiveIntegrated[item.id]?'已接入全景 · 靠近展开':'已关闭'}</small><p>{item.detail}</p><button disabled={!stageFlags[item.stage]||(item.target==='earth'&&!scientificFrame)} onClick={()=>focusIntegrated(item.target)}>定位{item.title}</button>{item.id==='dust'&&<button disabled={!stageFlags.dustExplorer||!scientificFrame} onClick={()=>focusIntegrated('earth')}>定位地球旁流星示例</button>}</article>)}</div>
          <div className="panorama-demo"><h3>现象示意进度</h3><p>默认暂停；仅控制 CME、流星短迹与中性原子示例。不同现象没有因果或同日关联；真实观测日期与原太阳风动画仍独立控制。</p><input type="range" aria-label="全景现象进度" min="0" max="1" step=".001" value={integratedProgress} onChange={e=>{setIntegratedPlaying(false);setIntegratedProgress(Number(e.target.value));}}/><button aria-pressed={integratedPlaying} onClick={()=>setIntegratedPlaying(v=>!v)}>{integratedPlaying?'暂停现象示意':'播放现象示意'}</button><button onClick={()=>{setIntegratedPlaying(false);setIntegratedProgress(.32);}}>复位现象</button></div>
          <details><summary>继续阅读独立详解与来源</summary><p>下面会打开单独的教学镜头；上方定位与开关始终留在当前全景。</p>{stageFlags.solarActivity&&<button onClick={onOpenSolarActivity}>太阳活动独立详解</button>}{(stageFlags.environment||stageFlags.nearEarth)&&<button onClick={onOpenEnvironment}>近地空间独立详解</button>}{stageFlags.dustExplorer&&<button onClick={onOpenDust}>尘埃与流星独立详解</button>}{stageFlags.heliosphereExplorer&&<button onClick={onOpenHeliosphere}>日球层独立详解</button>}<p>沿用各详解模块的 NASA 来源；本轮不增加历表目标、实测事件、粒子通量或模型预测。</p></details>
        </section>}
        {scope==='solar'&&<div className="stage-filter-note">已开启阶段：{STAGES.filter(s=>stageFlags[s.id]).map(s=>s.title.slice(5)).join('、')||'基础行星'}。<button onClick={onOpenStages}>按阶段控制与理解</button></div>}
        {scope==='solar'&&panelTab==='learn'&&stageFlags.families&&focusedFamily==='moons'&&<RingFamilies onOpen={onOpenFamily}/>}

        {scope === 'solar' && <section hidden={panelTab !== 'layers'} className="macro-layer-panel" aria-label="宏观图层">
          <h2>选择画面内容</h2><p>勾选后按当前尺度展开。靠近显示的图层保留选择，缩放时自动出现。</p>
          <div>
            <div className="macro-layer-options">{MACRO_LAYERS.map(layer => <label key={layer.id}>
              <input type="checkbox" checked={layers[layer.id]} onChange={e => setLayers(value => ({ ...value, [layer.id]: e.target.checked }))}/>
              <i style={{ background: layer.color }}/><span>{layer.id==='dwarfs'&&!stageFlags.members?'区域代表成员（2 个）':layer.name}<small>{layer.id==='dwarfs'&&!stageFlags.members?'谷神星与冥王星 · 新增四个成员已隐藏':layer.note}</small></span><em data-state={layerStatus(layer.id)}>{layerStatus(layer.id)}</em>
            </label>)}</div>
          </div>
          <button className="macro-animation" disabled={!effectiveLayers.wind} aria-pressed={animate && effectiveLayers.wind} onClick={() => setAnimate(v => !v)}>{!effectiveLayers.wind ? '太阳风展示已关闭' : animate ? '暂停太阳风示意' : '播放太阳风示意'}</button>
          <p>动画只控制太阳风示意，不改变观测日期。细节随镜头接近出现；天体大小、尾长和流动速度均作展示增强。</p>
          <p role="status">{!isEphemeris ? '当前为物理推演：宏观图隐藏实测天体，返回真实太阳系后可读取历表。' : !frame ? '行星历表读取中' : dwarfData.error ? `扩展历表未就绪：${dwarfData.error}` : dwarfData.loading ? '正在读取谷神星与冥王星历表…' : '行星、谷神星与冥王星：当前时刻历表位置'}</p>
          <p role="status">{cometData.error || (cometData.loading ? '正在读取哈雷与 67P 历表…' : cometData.batch ? '哈雷与 67P：当前时刻历表位置' : '彗星历表未启用')}</p>
          {cometData.error && <button onClick={cometData.retry}>重试彗星历表</button>}
          <p role="status">{smallBodyData.error || (smallBodyData.loading ? '正在读取灶神星与海王星外成员历表…' : smallBodyData.batch ? '新增 4 个区域成员：当日历表位置' : '区域成员历表未启用')}</p>
          {smallBodyData.error && <button onClick={smallBodyData.retry}>重试区域成员历表</button>}
          {dwarfData.error && <button onClick={dwarfData.retry}>重试扩展历表</button>}

        </section>}
        {scope === 'solar' && <>          <section hidden={panelTab !== 'sources'} className="macro-source-panel"><h2>画面从哪里来</h2><p>绿色：历表位置；蓝色：观测支持的示意；紫色：模型推断。颜色用作分类，具体边界请看下方来源。</p>
            <p>哈雷与 67P 的位置、速度来自 NASA JPL Horizons，覆盖 2026—2027 年。统一采用 TDB 时间、J2000 黄道坐标与太阳系质心几何状态；展示时扣除同一时刻太阳的状态。</p>
            <p>位置每 6 小时采样，使用速度参与插值；以未发布的 3 小时间隔检查点验证。插值差异不等于真实轨道的不确定度，当前不提供测轨误差范围。</p>
            <p>两年亮线逐日连接真实历表位置，不是一整圈轨道；完整淡线由当前状态估算，是瞬时二体参考椭圆，不是未来预报。彗尾原理示例默认关闭。</p>
            <a href={publicAsset('/data/comets/manifest.json')} target="_blank" rel="noreferrer">查看彗星来源、解版本与插值验证</a>
            <a href="https://ssd.jpl.nasa.gov/horizons/manual.html" target="_blank" rel="noreferrer">JPL Horizons：历表计算说明</a>
            <p>灶神星、妊神星、鸟神星与阋神星采用同一坐标与时间标准的 JPL 几何历表。球体、名称可点选；代表成员仅是样本，不表示整个区域的数量。三颗新增远方矮行星的卫星尚未展开。</p>
            <a href={publicAsset('/data/small-bodies/manifest.json')} target="_blank" rel="noreferrer">查看 4 个新增成员的原始来源与误差检查</a>
            <p>旧版哈雷解 {HALLEY_SOURCE.solution} / JD {HALLEY_SOURCE.epochJdTdb} 根数保留用于原理示例（倾角 {HALLEY_ORBIT.i.toFixed(2)}°），不用于当前彗核定位。</p>
            <a href={publicAsset('/data/macro/halley-sbdb.json')} target="_blank" rel="noreferrer">查看原理示例的原始根数</a>
            <a href="https://science.nasa.gov/solar-system/comets/facts/" target="_blank" rel="noreferrer">NASA：彗发、尘埃尾与离子尾</a>
            <a href="https://science.nasa.gov/learn/heat/resource/components-of-the-heliosphere/" target="_blank" rel="noreferrer">NASA：太阳风与日球层分区</a>
            <p>90 / 120 AU 为边界量级示意，不是各方向上的固定距离。宏观谷神星与冥王星轨道由当前状态估计，不是未来历表路径。</p>
          </section></>}
        <div hidden={scope === 'solar' && panelTab !== 'learn'}>
        {scope==='solar' && panelTab==='learn' && (stageFlags.structure||stageFlags.members) && <RegionMembers includeNewMembers={stageFlags.members} zone={selected} family={focusedFamily} selectedId={selectedMember} onSelect={chooseMember} onLocate={()=>setFocusRequest(v=>v+1)} onReturn={()=>{setSelectedMember(null);setRestoreRequest(v=>v+1);}} onRegion={()=>{const body=regionMemberById(selectedMember);if(body){setSolarTab('zones');setSelected(body.zone);setLayers(v=>({...v,[body.zone]:true}));setSelectedMember(null);setResetCount(v=>v+1);}}} frame={scientificFrame} batch={memberBatch} loading={dwarfData.loading||smallBodyData.loading} error={dwarfData.error||smallBodyData.error} onRetry={()=>{dwarfData.retry();smallBodyData.retry();}} time={timeControls}/>}
        {scope === 'solar' && <div className="macro-evidence-key"><span>历表位置</span><span>结构示意</span><span>模型推断</span></div>}
        {scope==='solar' && stageFlags.comets && solarTab==='families' && familyId==='comets' && <CometPanel frame={scientificFrame} batch={cometData.batch} loading={cometData.loading} error={cometData.error} onRetry={cometData.retry} time={timeControls} showActivity={showActivity} onActivity={()=>setShowActivity(v=>!v)} trackError={trackError}/>}
        {scope === 'cosmic' ? <><div className="macro-info-eyebrow">{cosmic.english}</div><h2>{cosmic.name}</h2><p className="macro-info-lead">{cosmic.description}</p><div className="macro-visual-meaning"><span>画面符号</span><p>{cosmic.visualMeaning}</p></div><div className="macro-info-facts"><div><span>尺度</span><strong>{cosmicFacts[cosmicId][0]}</strong></div><div><span>关系</span><strong>{cosmicFacts[cosmicId][1]}</strong></div><div><span>画面性质</span><strong>概念结构图，非实测星图</strong></div></div><p className="macro-evidence">{cosmic.status}</p><a className="macro-source" href={cosmic.sourceUrl} target="_blank" rel="noreferrer">查看{cosmic.sourceLabel}<ArrowUpRight size={13}/></a>{cosmicId === 'neighbors' && <a className="macro-source macro-extra-source" href="https://science.nasa.gov/exoplanets/trappist1/" target="_blank" rel="noreferrer">NASA TRAPPIST-1 七行星资料<ArrowUpRight size={13}/></a>}{cosmicId === 'galaxies' && <a className="macro-source macro-extra-source" href="https://science.nasa.gov/image-detail/hubble-uncovers-a-celestial-fossil-2/" target="_blank" rel="noreferrer">NASA 大麦哲伦云距离资料<ArrowUpRight size={13}/></a>}<div className="macro-next"><span className="macro-info-eyebrow">RETURN TO OUR SYSTEM</span><button onClick={() => setScope('solar')}><Globe2 size={15}/>返回太阳系结构<ArrowUpRight size={13}/></button></div></> : solarTab === 'families' ? <><div className="macro-info-eyebrow">{family.english}</div><h2>{family.name}</h2><p className="macro-info-lead">{family.description}</p>{familyId==='dust'&&stageFlags.dustExplorer&&<div className="macro-next"><button onClick={onOpenDust}>展开尘埃与流星演示<ArrowUpRight size={13}/></button></div>}<div className="macro-visual-meaning"><span>画面符号</span><p>{family.visualMeaning}</p></div><div className="macro-info-facts"><div><span>运行关系</span><strong>{family.keyFact}</strong></div><div><span>当前接入</span><strong>{family.status}</strong></div></div><p className="macro-evidence">成员横跨不同区域，不能把此类对象的画面示意当成逐体实测位置。</p><a className="macro-source" href={family.sourceUrl} target="_blank" rel="noreferrer">查看{family.sourceLabel}<ArrowUpRight size={13}/></a><div className="macro-next"><span className="macro-info-eyebrow">EXPLORE AN EXAMPLE</span>{family.exampleId ? <button onClick={() => onExploreObject(family.exampleId!)}><Crosshair size={15}/>查看{family.exampleName}资料<ArrowUpRight size={13}/></button> : <button onClick={onObservePlanets}><Layers3 size={15}/>进入现有天体观测<ArrowUpRight size={13}/></button>}</div></> : <><div className="macro-info-eyebrow">{zone?.english ?? 'STRUCTURE OVERVIEW'}</div><h2>{zone?.name ?? '从盘到球的太阳系'}</h2>{selected==='heliosphere'&&stageFlags.heliosphereExplorer&&<div className="macro-next"><button onClick={onOpenHeliosphere}>展开日球层与星际空间<ArrowUpRight size={13}/></button></div>}<p className="macro-info-lead">{zone?.detail ?? '太阳系没有硬质外壳。中间的行星轨道接近薄盘；柯伊伯带是有厚度的环带，散射盘有高倾角成员，奥尔特云被推断为巨大球状壳层。请逐层点选并侧视观察，不能用一个画面比例看清所有尺度。'}</p><div className="macro-visual-meaning"><span>画面符号</span><p>{zoneVisualMeaning}</p></div><div className="macro-info-facts"><div><span>距太阳</span><strong>{zone?.range ?? '1–约 100,000 AU'}</strong></div><div><span>空间形态</span><strong>{zone?.shape ?? '多层结构，不是单一几何体'}</strong></div><div><span>证据级别</span><strong>{zone?.evidenceKind ?? '观测与模型并列'}</strong></div>{selected === 'planetary' && <div><span>最大黄道高度</span><strong>{highestPlanet ? `${highestPlanet.name} 约 ${highestPlanet.heightAu.toFixed(2)} AU（相对太阳）` : '历表加载中'}</strong></div>}</div><p className="macro-evidence">{zone?.evidence ?? '行星位置来自当期历表；外层点云、日球层轮廓与奥尔特云球壳仅说明已知或推测的区域形态。'}</p>{zone ? <a className="macro-source" href={zone.sourceUrl} target="_blank" rel="noreferrer">查看{zone.sourceLabel}<ArrowUpRight size={13}/></a> : <a className="macro-source" href="https://science.nasa.gov/solar-system/solar-system-facts/" target="_blank" rel="noreferrer">NASA 太阳系整体资料<ArrowUpRight size={13}/></a>}
        <div className="macro-next"><span className="macro-info-eyebrow">EXPLORE FURTHER</span>{selected === 'all' && <button onClick={() => { setSelected('planetary'); setCameraView('edge'); setHeightScale(10); setShowPlane(true); }}><Layers3 size={15}/>侧视纵向差异（×10 示意）</button>}{selected === 'all' && <button onClick={() => { setSelected('oort'); setCameraView('edge'); setShowPlane(false); }}><Globe2 size={15}/>看外层球状结构（模型）</button>}{selected === 'planetary' || selected === 'all' ? <button onClick={onObservePlanets}><Orbit size={15}/>进入真实行星观测<ArrowUpRight size={13}/></button> : selected === 'asteroid' || selected === 'kuiper' || selected === 'scattered' ? <button onClick={() => onExploreObject(selected === 'asteroid' ? 'ceres' : selected === 'kuiper' ? 'pluto' : 'eris')}><Crosshair size={15}/>查看已收录的代表天体<ArrowUpRight size={13}/></button> : selected === 'oort' ? <button onClick={() => { setSolarTab('families'); setFamilyId('comets'); }}><Sparkles size={15}/>了解彗星与外层冰质天体<ArrowUpRight size={13}/></button> : <p>日球层是太阳风影响区；流动粒子说明太阳风向外传播；终止激波与日球层顶之间是日鞘，边界随方向与时间变化。动画不代表实测速度或等离子体计算。</p>}</div></>}
        </div></div>
      </aside>
    </div>
    <footer className="macro-footer"><Compass size={13}/>{scope === 'cosmic' ? 'AU 是太阳系内尺度；光年用于恒星和星系距离。不同镜头独立取景，画面尺寸、方位与点数不表示真实比例或实测位置；背景星点为绘制示意。' : '太阳系包含行星、卫星、矮行星、小天体、尘埃与太阳风。行星、6 个区域代表成员与两颗彗星采用历表位置；淡色椭圆是瞬时参考轨道。点云、可选双尾、风与边界是示意，奥尔特云是推断；背景星点不是实测星位。'}</footer>
  </section>;
}
