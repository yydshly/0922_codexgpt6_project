import {SpaceMediumPanel} from './SpaceMediumPanel';
import {mediumParts,mediumLessonForView,type MediumId} from '../data/spaceMedium';
import {MaterialJourneyPanel} from './MaterialJourneyPanel';
import {materialParts,materialStepForView,MATERIAL_STEPS,type MaterialStepId} from '../data/materialJourney';
import {EnvironmentJourneyPanel} from './EnvironmentJourneyPanel';
import {ENVIRONMENT_STEPS,environmentStepForView,environmentStepParts,type EnvironmentStepId} from '../data/environmentJourney';
import {restoreFamilyContext,isolateFamilyContext,isolateLocalSystem,isolateEnvironmentContext} from './familyIsolation';
import {defaultFocusPhenomenon,focusPhenomena,focusPhenomenonTitle,memberFocusDistance} from '../data/macroNavigation';
import {AppearanceAuditPanel} from './AppearanceAuditPanel';
import {EnceladusPanel} from './EnceladusPanel';
import {defaultEnceladusChoices,type EnceladusChoices} from '../data/enceladusInterior';
import {SolarLayersPanel} from './SolarLayersPanel';
import {solarLessonParts,matchesSolarLesson,SOLAR_LESSONS} from '../data/solarLayers';
import {useErosShape} from './useErosShape';
import {ErosShapePanel} from './ErosShapePanel';
import {defaultErosShapeChoices,type ErosShapeChoices} from '../data/erosShape';
import type {ErosShapeOptions} from './macroErosShape';
import {patroclusSystemProvider} from '../ephemeris/patroclusSystem';
import {defaultPatroclusChoices,patroclusSystemState,appendPatroclusPrimary,patroclusLocal,type PatroclusChoices} from '../data/patroclusSystem';
import type {PatroclusSceneOptions} from './macroPatroclusSystem';
import {PatroclusSystemPanel} from './PatroclusSystemPanel';
import {erisSystemProvider} from '../ephemeris/erisSystem';
import {defaultErisChoices,erisSystemState,replaceErisPrimary,type ErisChoices} from '../data/erisSystem';
import type {ErisSceneOptions} from './macroErisSystem';
import {ErisSystemPanel} from './ErisSystemPanel';
import {plutoMoonProvider} from '../ephemeris/plutoMoons';
import {plutoMoonStates,type PlutoSystemId,isPlutoSmallMoon} from '../data/plutoMoons';
import {SmallBodyRingPanel} from './SmallBodyRingPanel';
import {defaultSmallRings,type SmallRingChoices,type SmallRingOptions} from '../data/smallBodyRings';
import {createHistoricalScene,type HistoricalView} from './macroHistoricalScene';
import type {CSSProperties} from 'react';
import {SceneInventory} from './SceneInventory';
import {readScenePresence,presenceText,type SceneSnapshot} from './scenePresence';
import {PHENOMENON_PARTS,defaultPhenomenonParts,type PhenomenonParts} from '../data/phenomenonParts';
import {HistoricalVisitor} from './HistoricalVisitor';
import { HomeTimeControls } from './HomeTimeControls';
import { HomeContentIndex } from './HomeContentIndex';
import type { CoverageItem } from '../data/contentCoverage';
import {LearningRoute} from './LearningRoute';
import {LEARNING_STEPS,learningMatches} from '../data/learningRoute';
import {ObservationPath} from './ObservationPath';
import {emptyHistory,recordObservation,traverseObservation,relocateBookmark,orientBookmark,type CameraBookmark,type CameraHistoryBridge,type ObservationHistory} from '../data/observationHistory';
import {macroVisualHierarchy,primaryVisibleInCloseup} from '../data/macroVisualHierarchy';
import {MacroMotionPanel} from './MacroMotionPanel';
import {DistanceComparison} from './DistanceComparison';
import {SizeComparison} from './SizeComparison';
import {MacroContentsNav} from './MacroContentsNav';
import {planetFocusLayers,planetFocusPhenomena} from '../data/macroFocus';
import {createPlanetOrbits} from './macroPlanetOrbits';
import {MacroOrbitPanel} from './MacroOrbitPanel';
import type {PlanetOrbitOptions} from '../data/macroPlanetOrbits';
import {createMacroEarth,type EarthAppearance,type CloudStatus} from './macroEarth';
import {MacroEarthPanel} from './MacroEarthPanel';
import {primaryId,primaryTarget,type PrimaryId} from '../data/macroPrimary';
import {MacroPrimaryPanel} from './MacroPrimaryPanel';
import {createPrimaryLabels} from './macroPrimaryLabels';
import {macroMemberAnchor} from '../data/macroMemberState';
import {macroCometAnchor,COMET_DEMO_ANCHOR,type CometDisplay} from '../data/macroComets';
import {macroBinaryState} from '../data/macroBinary';
import {createMacroBinary,type BinaryOptions} from './macroBinaryScene';
import {MacroBinaryPanel} from './MacroBinaryPanel';
import {macroFamilyFocusDistance,createMacroFamilies,type FamilySceneOptions} from './macroFamilyScene';
import {isMacroFamily,macroMoonStates,familyLocalPosition,familyMoonRadius,type MacroFamilyId} from '../data/macroFamilies';
import {useOverviewSatellites} from '../hooks/useOverviewSatellites';
import {satelliteParentAttitude,satelliteOverviewDirection} from './SatelliteSystem';
import {MacroFamilyPanel} from './MacroFamilyPanel';
import {createIntegratedScene} from './macroIntegrated';
import {INTEGRATED_ITEMS,INTEGRATED_FOCUS_DISTANCE,defaultIntegratedFlags,integratedFlags,type IntegratedId,type IntegratedFlags,type IntegratedTarget} from '../data/integratedScene';
import { STAGES,stagedLayers,type StageFlags } from '../data/stages';
import { RingFamilies } from './RingLearning';
import type { RingPlanetId } from '../data/rings';
import { useMemo, useEffect, useRef, useState, type RefObject, type KeyboardEvent } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ArrowLeft, ArrowUpRight, Compass, Crosshair, Globe2, Layers3, Maximize2, Orbit, RotateCcw, Sparkles } from 'lucide-react';
import { BODIES,bodyById } from '../data/catalog';
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
import { cometProvider,COMETS,isCometId,type CometId } from '../ephemeris/comets';
import { heliocentricComets,validCometTracks,type CometTracks } from '../ephemeris/cometState';
import { CometPanel, type MacroTimeControls } from './CometPanel';
import { smallBodyProvider, matchingMemberBatch } from '../ephemeris/smallBodies';
import { regionMemberById, DYNAMIC_MEMBER_IDS } from '../data/regionMembers';
import { RegionMembers } from './RegionMembers';
import { publicAsset } from '../data/publicAsset';

interface Props {
  active?:boolean;
  onSpeedChange:(speed:number)=>void;
  onHomeTool:(tool:'atlas'|'plan'|'progress'|'data'|'physics')=>void;
  initialCosmic?:CosmicLevelId;
  initialPanel?:'integrated'|'learn';
  returnLabel?:string;
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

interface IntegratedOptions {familyContext:boolean;intent:IntegratedId|null;erosShape:ErosShapeOptions;patroclus:PatroclusSceneOptions;eris:ErisSceneOptions;smallRings:SmallRingOptions;parts:PhenomenonParts;planetFocus:boolean;planetOrbits:PlanetOrbitOptions;earth:EarthAppearance&{retry:number;onStatus:(status:CloudStatus)=>void};comets:CometDisplay;binary:BinaryOptions;families:FamilySceneOptions;flags:IntegratedFlags;target:IntegratedTarget|null;request:number;restore:number;progress:number;onFocus:(target:IntegratedTarget,intent?:IntegratedId)=>void}

interface ObservationBookmark {
 key:string;title:string;camera:CameraBookmark|null;
 progress:number;familyContext:boolean;intent:IntegratedId|null;target:IntegratedTarget|null;member:string|null;zone:MacroZoneId;tab:'zones'|'families';family:SolarFamilyId;view:MacroCameraView;
 height:1|10;plane:boolean;layers:MacroLayerVisibility;choices:IntegratedFlags;parts:PhenomenonParts;smallRings:SmallRingChoices;erosShape:ErosShapeChoices;eris:ErisChoices;patroclus:PatroclusChoices;planetFocus:boolean;
 enceladus:EnceladusChoices;familyRings:boolean;familyEnhanced:boolean;familyOrbits:boolean;binaryCenter:boolean;binaryOrbits:boolean;familySelected:string|null;binarySelected:PlutoSystemId|null;binarySmall:boolean;binaryEnhanced:boolean;showActivity:boolean;
 panel:'integrated'|'learn'|'layers'|'sources'|'coverage';
}

function MacroCanvas({ historical,onPresence,active, historyBridge, integrated, selectedMember, onSelectMember, focusRequest, restoreRequest, cometBatch, cometTracks, showActivity, frame, selected, resetCount, family, cameraView, heightScale, showPlane, layers, batch, animate, showLabels, onDistance }: { historical:HistoricalView|null;onPresence:(snapshot:SceneSnapshot)=>void;active:boolean; historyBridge:RefObject<CameraHistoryBridge>; integrated:IntegratedOptions; selectedMember:string|null; onSelectMember:(id:string)=>void; focusRequest:number; restoreRequest:number; cometBatch: StateBatch | null; cometTracks: CometTracks | null; showActivity: boolean; frame: StateFrame | null; selected: MacroZoneId; resetCount: number; family?: SolarFamilyId; cameraView: MacroCameraView; heightScale: 1 | 10; showPlane: boolean; layers: MacroLayerVisibility; batch: StateBatch | null; animate: boolean; showLabels: boolean; onDistance: (distance: number) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const activeRef=useRef(active);activeRef.current=active;
  const frameRef = useRef(frame);
  const sceneRef = useRef<{ camera: THREE.PerspectiveCamera; controls: OrbitControls; materials: Partial<Record<MacroZoneId, ZoneMaterial[]>>; plane: THREE.Mesh; guides: THREE.Line[]; restoreContext:()=>void; savedView?: { position:THREE.Vector3; target:THREE.Vector3; up:THREE.Vector3 } } | null>(null);
  frameRef.current = frame;
  const displayRef = useRef({ historical,onPresence,integrated, selectedMember, onSelectMember, focusRequest, restoreRequest, cometBatch, cometTracks, showActivity, layers, batch, animate, showPlane, heightScale, family, showLabels, onDistance });
  displayRef.current = { historical,onPresence,integrated, selectedMember, onSelectMember, focusRequest, restoreRequest, cometBatch, cometTracks, showActivity, layers, batch, animate, showPlane, heightScale, family, showLabels, onDistance };

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
    const familyHidden=new Map<THREE.Object3D,boolean>();
    const familyLight=new THREE.DirectionalLight('#ffe8c1',2.8);familyLight.visible=false;scene.add(familyLight,familyLight.target);
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
    stars.userData.background=true;scene.add(stars);

    const sun = new THREE.Mesh(new THREE.SphereGeometry(.34, 28, 20), new THREE.MeshBasicMaterial({ color: '#ffe1a1' }));
    sun.userData.sceneElement='sun';sun.userData.primaryId='sun'; sun.userData.labelRadius = .34; scene.add(sun);
    const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(.53, 24, 16), new THREE.MeshBasicMaterial({ color: '#ffc876', transparent: true, opacity: .12, depthWrite: false }));
    scene.add(sunGlow);

    const scaleRings:THREE.LineLoop[]=[];
    for (const au of ORBIT_AU) {
      const ring = new THREE.LineLoop(orbitRing(au), remember('planetary', new THREE.LineBasicMaterial({ color: '#749fab', transparent: true, opacity: .29, depthWrite: false })));
      scaleRings.push(ring);scene.add(ring);
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
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(index > 3 ? .13 : .09, 48, 32), new THREE.MeshStandardMaterial({ color: body.color, roughness: .8, metalness: 0 }));
      mesh.userData.sceneElement='planetary';mesh.userData.primaryId=body.id; mesh.userData.labelRadius = index > 3 ? .13 : .09; scene.add(mesh);
      return mesh;
    });

    const primaryMeshes=Object.fromEntries([['sun',sun],...BODIES.filter(b=>b.kind==='planet').map((b,i)=>[b.id,planets[i]])]) as Record<PrimaryId,THREE.Mesh>;
    const primaryLabels=createPrimaryLabels(element,primaryMeshes,id=>displayRef.current.integrated.onFocus(primaryTarget(id)));
    const textureLoader=new THREE.TextureLoader();
    const earthEffects=createMacroEarth(planets[2],textureLoader,status=>displayRef.current.integrated.earth.onStatus(status));
    let cloudRetry=displayRef.current.integrated.earth.retry;
    for(const [mesh,path] of [[sun,bodyById.sun.texture!] as const,...BODIES.filter(b=>b.kind==='planet').map((b,i)=>[planets[i],b.texture!] as const)])textureLoader.load(path,map=>{if(disposed){map.dispose();return;}map.colorSpace=THREE.SRGBColorSpace;mesh.material.map=map;mesh.material.color.set('white');mesh.material.needsUpdate=true;});

    const addCloud = (id: MacroZoneId, geometry: THREE.BufferGeometry, color: string, size: number, opacity: number) => {
      const material = remember(id, new THREE.PointsMaterial({ color, map: particleTexture, size, transparent: true, opacity, depthWrite: false, sizeAttenuation: true }));
      material.userData.baseSize = size;
      const cloud=new THREE.Points(geometry,material);cloud.userData.sceneElement=id;scene.add(cloud);
    };
    addCloud('asteroid', makeCloud(850, 982741, discPoint(2.2, 3.2, .21)), '#d2ab78', .078, .66);
    addCloud('kuiper', makeCloud(1250, 288171, discPoint(30, 50, .30)), '#8cc7d7', .085, .62);
    addCloud('scattered', makeCloud(720, 627194, discPoint(50, 1000, .86)), '#d4baff', .075, .48);
    addCloud('oort', makeCloud(2600, 175002, shellPoint(2000, 100000)), '#cfeaff', .15, .62);
    const planetOrbits=createPlanetOrbits(scene);
    const phenomena = createMacroPhenomena(scene, particleTexture, element, id=>displayRef.current.onSelectMember(id));
    const binaryScene=createMacroBinary(scene,element,id=>displayRef.current.integrated.binary.onSelect(id),()=>displayRef.current.integrated.binary.onFocus());
    const familyScene=createMacroFamilies(scene,element,id=>displayRef.current.integrated.families.onSelect(id),id=>displayRef.current.integrated.families.onFocus(id));
    const integratedScene=createIntegratedScene(scene,particleTexture,element,(target,intent)=>displayRef.current.integrated.onFocus(target,intent));

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
    let historyAnchor:THREE.Vector3|null=null;
    historyBridge.current.capture=()=>({position:camera.position.toArray(),target:controls.target.toArray(),up:camera.up.toArray(),anchor:historyAnchor?.toArray()??null,minDistance:controls.minDistance});
    const raycaster=new THREE.Raycaster();
    let down:{x:number;y:number}|null=null;
    const pointerDown=(event:PointerEvent)=>{if(event.button===0)down={x:event.clientX,y:event.clientY};};
    const pointerUp=(event:PointerEvent)=>{
      const start=down;down=null;if(displayRef.current.historical)return;
      if(!start || Math.hypot(event.clientX-start.x,event.clientY-start.y)>5)return;
      const bounds=renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((event.clientX-bounds.left)/bounds.width*2-1,1-(event.clientY-bounds.top)/bounds.height*2),camera);
      const markers:THREE.Object3D[]=[];
      scene.traverse(object=>{if(!object.userData.memberId&&!object.userData.familyMoon&&!object.userData.binaryId)return;let p:THREE.Object3D|null=object;while(p){if(!p.visible)return;p=p.parent;}markers.push(object);});
      const hit=raycaster.intersectObjects([...markers,...planets.filter(p=>p.visible),...(sun.visible?[sun]:[])],false)[0];
      if(hit?.object.userData.binaryId)displayRef.current.integrated.binary.onSelect(hit.object.userData.binaryId);
      else if(hit?.object.userData.familyMoon)displayRef.current.integrated.families.onSelect(hit.object.userData.familyMoon);
      else if(hit?.object.userData.primaryId)displayRef.current.integrated.onFocus(primaryTarget(hit.object.userData.primaryId));
      else if(hit?.object.userData.memberId)displayRef.current.onSelectMember(hit.object.userData.memberId);
    };
    renderer.domElement.addEventListener('pointerdown',pointerDown);
    renderer.domElement.addEventListener('pointerup',pointerUp);
    let lastIntegratedRequest=0,lastIntegratedRestore=0;
    let integratedSaved:{position:THREE.Vector3;target:THREE.Vector3;up:THREE.Vector3}|null=null;
    let previousParent:THREE.Vector3|null=null;
    let lastFocusRequest=0;
    let previousMember:THREE.Vector3|null=null;
    let lastRestoreRequest=0;
    let animation = 0;
    let lastFrame = 0;
    let demoSeconds = 0;
    let lastDistance = -1,lastPresence=0,lastPresenceKey='';
    const historicalScene=new THREE.Scene();historicalScene.background=new THREE.Color('#081521');
    let historicalGeometry:ReturnType<typeof createHistoricalScene>|null=null,historicalView='';
    let savedCurrent:{position:THREE.Vector3;target:THREE.Vector3;up:THREE.Vector3;min:number;max:number}|null=null;

    const draw = (now: number) => {
      animation = requestAnimationFrame(draw);
      if(!activeRef.current){lastFrame=now;return;}
      if (now - lastFrame < 30) return;
      if (displayRef.current.animate && lastFrame) demoSeconds += Math.min((now - lastFrame) / 1000, .1);
      lastFrame = now;
      const history=displayRef.current.historical;
      if(history){
        if(!savedCurrent){savedCurrent={position:camera.position.clone(),target:controls.target.clone(),up:camera.up.clone(),min:controls.minDistance,max:controls.maxDistance};element.dataset.scenario='historical';}
        if(history.manifest&&!historicalGeometry)historicalGeometry=createHistoricalScene(historicalScene,element,history.manifest);
        if(historicalView!==history.view){historicalView=history.view;controls.enableDamping=false;controls.update();controls.target.set(0,0,0);camera.up.set(0,1,0);camera.position.set(...(history.view==='top'?[0,12,.001]:history.view==='edge'?[10,.05,0]:[6,5,8]) as [number,number,number]);controls.minDistance=1;controls.maxDistance=30;controls.update();controls.enableDamping=true;}
        controls.update();historicalGeometry?.update(history.time,camera,element.clientWidth,element.clientHeight);renderer.render(historicalScene,camera);return;
      }
      if(savedCurrent){controls.enableDamping=false;controls.update();camera.position.copy(savedCurrent.position);camera.up.copy(savedCurrent.up);controls.target.copy(savedCurrent.target);controls.minDistance=savedCurrent.min;controls.maxDistance=savedCurrent.max;controls.update();controls.enableDamping=true;savedCurrent=null;historicalView='';historicalGeometry?.dispose();historicalGeometry=null;element.dataset.scenario='current';}
      restoreFamilyContext(familyHidden);
      const { showPlane, heightScale, family, showLabels, onDistance } = displayRef.current;
      const current = frameRef.current;
      planets.forEach(mesh => { mesh.visible = !!current && displayRef.current.layers.planetary; });
      if (current) {
        sun.quaternion.copy(satelliteParentAttitude(bodyById.sun,current.time));
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
            planets[i].quaternion.copy(satelliteParentAttitude(BODIES.filter(b=>b.kind==='planet')[i],current.time));
            const point = planets[i].position;
            const position = guides[i].geometry.getAttribute('position') as THREE.BufferAttribute;
            position.setXYZ(0, point.x, point.y, point.z); position.setXYZ(1, point.x, 0, point.z);
            position.needsUpdate = true;
            guides[i].visible = showPlane && displayRef.current.layers.planetary && Math.abs(point.y) > .015;
          }
        }

      }
      if (!current) { guides.forEach(item => { item.visible = false; }); }
      for (const [id, list] of Object.entries(materials)) for (const material of list) material.visible = displayRef.current.layers[id as MacroLayerId] ?? true;
      plane.visible = showPlane && displayRef.current.layers.planetary;
      const focus=displayRef.current;
      const context=sceneRef.current;
      if(focus.restoreRequest!==lastRestoreRequest){
        if(context?.savedView){controls.enableDamping=false;controls.update();controls.enableDamping=true;camera.position.copy(context.savedView.position);camera.up.copy(context.savedView.up);controls.target.copy(context.savedView.target);context.savedView=undefined;}
        lastRestoreRequest=focus.restoreRequest;
      }
      const integration=displayRef.current.integrated;
      // Both focus routes preserve the first overview when users move between targets.
      if(focus.selectedMember&&integratedSaved&&context){context.savedView=integratedSaved;integratedSaved=null;}
      if(integration.target&&context?.savedView){integratedSaved=context.savedView;context.savedView=undefined;}
      if(!focus.selectedMember){previousMember=null;if(context&&!integration.target)context.savedView=undefined;}
      const memberPoint=focus.selectedMember?macroMemberAnchor(current,focus.batch,focus.selectedMember):null;
      const memberPosition=memberPoint?new THREE.Vector3(...memberPoint):null;
      // Frame both separated bodies; local geometry is enlarged with the selected primary by 1.5.
      if(memberPosition&&focus.selectedMember==='patroclus'&&integration.patroclus.enabled&&integration.patroclus.choices.moon&&integration.patroclus.state)memberPosition.add(new THREE.Vector3(...patroclusLocal(integration.patroclus.state.relative)).multiplyScalar(.75));
      if(focus.focusRequest!==lastFocusRequest && memberPosition){
        if(context&&!context.savedView)context.savedView={position:camera.position.clone(),target:controls.target.clone(),up:camera.up.clone()};
        const memberDirection=focus.selectedMember==='patroclus'&&integration.patroclus.state?memberPosition.clone().cross(new THREE.Vector3(0,1,0)).normalize().multiplyScalar(.6).add(new THREE.Vector3(0,.8,0)).normalize():focus.selectedMember==='eris'&&integration.eris.state?satelliteOverviewDirection([{position:integration.eris.state.relative,velocity:integration.eris.state.velocity}],memberPosition.clone().negate()):camera.position.clone().sub(controls.target).normalize();
        const offset=memberDirection.multiplyScalar(memberFocusDistance(focus.selectedMember));
        controls.enableDamping=false;controls.update();controls.enableDamping=true;
        controls.minDistance=focus.selectedMember==='eros'?.55:1;controls.target.copy(memberPosition);camera.position.copy(memberPosition).add(offset);controls.update();
        previousMember=memberPosition.clone();lastFocusRequest=focus.focusRequest;
      }else if(memberPosition&&previousMember){
        const delta=memberPosition.clone().sub(previousMember);camera.position.add(delta);controls.target.add(delta);previousMember.copy(memberPosition);
      }
      const medium=integration.flags.helio?mediumLessonForView(integration.target,integration.intent,integration.parts):null;
      const material=materialStepForView(integration.target,integration.intent,integration.parts,integration.families.selected,integration.families.enceladus);
      const materialDust=material&&['stream','meteor','zodiacal'].includes(material.id);
      const journeyCandidate=environmentStepForView(integration.target,integration.intent,integration.parts);
      const journey=journeyCandidate&&integration.flags[journeyCandidate.intent]?journeyCandidate:null;
      const isolatedLocal=!integration.familyContext?(integration.target==='pluto-system'?'pluto-system':focus.selectedMember):null;
      const primary=primaryId(integration.target);
      const localParent=isMacroFamily(integration.target)?integration.target:primary&&primary!=='sun'?primary:null;
      const isolatedFamily=localParent&&!integration.intent&&!integration.familyContext?localParent:null;
      const isolatedPrimary=primary??(isMacroFamily(integration.target)?integration.target:null);
      sun.visible=primaryVisibleInCloseup('sun',isolatedPrimary);sunGlow.visible=false; // Atmospheric light is controlled by the solar layers, not a duplicate glow.
      planets.forEach(mesh=>{mesh.visible=!!current&&displayRef.current.layers.planetary&&primaryVisibleInCloseup(mesh.userData.primaryId as PrimaryId,isolatedPrimary);});
      if(isolatedPrimary){plane.visible=false;guides.forEach(g=>{g.visible=false;});}
      if(cloudRetry!==integration.earth.retry){cloudRetry=integration.earth.retry;earthEffects.retry();}
      earthEffects.update(integration.earth);
      const earthPosition=current?planets[2].position:null;
      for(const ring of scaleRings)ring.visible=displayRef.current.layers.planetary&&integration.planetOrbits.scales;
      const parentPositions=Object.fromEntries(BODIES.filter(b=>b.kind==='planet').map((b,i)=>[b.id,planets[i].position]));
      const orbitFocus=primary??(isMacroFamily(integration.target)?integration.target:null);
      planetOrbits.update(current,integration.planetOrbits,displayRef.current.layers.planetary,orbitFocus,parentPositions,heightScale);
      binaryScene.update({...integration.binary,enabled:integration.binary.enabled&&!integration.planetFocus},camera,integration.target);
      const cometPoint=isCometId(integration.target)?macroCometAnchor(current,displayRef.current.cometBatch,integration.target):null;
      const followsBody=!!primary||isMacroFamily(integration.target)||integration.target==='pluto-system'||isCometId(integration.target);
      const enceladusRequested=integration.target==='saturn'&&integration.families.selected==='enceladus';
      const enceladusState=current&&integration.families.enabled&&integration.families.moons?integration.families.states.find(m=>m.id==='enceladus'):undefined;
      const enceladusRadius=enceladusState?familyMoonRadius(enceladusState.radiusKm,'saturn'):0;
      const enceladusCenter=enceladusRequested&&enceladusState?parentPositions.saturn.clone().add(new THREE.Vector3(...familyLocalPosition(enceladusState.position,'saturn'))).add(new THREE.Vector3(0,-enceladusRadius*.55,0)):null;
      const followingPosition=enceladusRequested?enceladusCenter:primary?(current?primaryMeshes[primary].position:null):isCometId(integration.target)?(cometPoint?new THREE.Vector3(...cometPoint):null):integration.target==='pluto-system'?(integration.binary.state?binaryScene.anchor:null):current&&isMacroFamily(integration.target)?parentPositions[integration.target]:null;
      familyScene.update(current,{...integration.families,states:material?.id==='e-ring'?integration.families.states.filter(m=>m.id==='enceladus'):integration.families.states,isolate:!!isolatedFamily,moons:integration.families.moons,enabled:integration.families.enabled},camera,isMacroFamily(primary)?primary:isMacroFamily(integration.target)?integration.target:null,parentPositions);
      integratedScene.update(medium?{solar:false,environment:false,belts:false,dust:false,helio:true}:materialDust?{solar:false,environment:false,belts:false,dust:integration.flags.dust,helio:false}:journey?{solar:journey.intent==='solar',environment:journey.intent==='environment',belts:false,dust:false,helio:false}:integration.flags,earthPosition,camera,integration.target,integration.progress,integration.parts,current?parentPositions.jupiter:null,integration.families.enabled?integration.families.states.find(m=>m.id==='io'):undefined,integration.intent);
      if(integration.restore!==lastIntegratedRestore){if(integratedSaved){controls.enableDamping=false;controls.update();camera.position.copy(integratedSaved.position);camera.up.copy(integratedSaved.up);controls.target.copy(integratedSaved.target);controls.enableDamping=true;}integratedSaved=null;previousParent=null;lastIntegratedRestore=integration.restore;}
      if(!integration.target){integratedSaved=null;previousParent=null;controls.minDistance=focus.selectedMember==='eros'?.55:focus.selectedMember?1:3;}
      if(integration.target&&integration.request!==lastIntegratedRequest&&(!followsBody||followingPosition)){
        if(!integratedSaved)integratedSaved={position:camera.position.clone(),target:controls.target.clone(),up:camera.up.clone()};
        const target=medium?new THREE.Vector3():material?.id==='zodiacal'?new THREE.Vector3():enceladusRequested?followingPosition!:primary?followingPosition!:integration.target==='comet-demo'?new THREE.Vector3(...COMET_DEMO_ANCHOR):isCometId(integration.target)?followingPosition!:integration.target==='pluto-system'?binaryScene.anchor:isMacroFamily(integration.target)?familyScene.anchors[integration.target]:integratedScene.anchors[integration.target as keyof typeof integratedScene.anchors];
        controls.enableDamping=false;controls.update();controls.minDistance=enceladusRequested?enceladusRadius*4:.4;camera.up.set(0,1,0);
        const members=isCometId(integration.target)?heliocentricComets(current,displayRef.current.cometBatch).filter(s=>s.id===integration.target):integration.target==='pluto-system'&&integration.binary.state?[{position:integration.binary.state.relative,velocity:integration.binary.state.velocity}]:isMacroFamily(integration.target)?integration.families.states.filter(s=>s.parentId===integration.target):[];
        const direction=enceladusRequested?new THREE.Vector3(.65,.25,1).normalize():primary&&primary!=='sun'?target.clone().negate().normalize().multiplyScalar(.35).add(new THREE.Vector3(0,.85,0)).normalize():integration.target==='comet-demo'?new THREE.Vector3(...COMET_DEMO_ANCHOR).cross(new THREE.Vector3(0,1,0)).normalize().add(new THREE.Vector3(0,.5,0)).normalize():members.length&&integration.target!=='earth'?satelliteOverviewDirection(members,target.clone().negate()):new THREE.Vector3(.55,.38,.74).normalize();
        // Start the Earth-Moon pair at equal camera depth so its shared size scale
        // is easy to read. Orbiting the camera is still free perspective viewing.
        if(integration.target==='earth'&&!integration.intent&&members.length){const separation=new THREE.Vector3(...familyLocalPosition(members[0].position,'earth')).normalize();direction.addScaledVector(separation,-direction.dot(separation));if(direction.lengthSq()<1e-8)direction.crossVectors(separation,new THREE.Vector3(0,1,0));direction.normalize();}
        if(journey?.target==='earth'||journey?.target==='jupiter')direction.copy(target).normalize().cross(new THREE.Vector3(0,1,0)).add(new THREE.Vector3(0,.45,0)).normalize();
        if(medium?.id==='currentSheet')direction.set(.6,.2,.78).normalize();
        const offset=direction.multiplyScalar(medium?16:material?.id==='meteor'?.8:material?.id==='zodiacal'?10:material?.id==='e-ring'?2.1:journey?.id==='jupiter-aurora'?.8:journey?.id==='jupiter-magnet'?4.5:journey?.id==='io-torus'?2:journey?.id==='aurora'?.55:journey?.id==='sun'?1.8:enceladusRequested?enceladusRadius*8.5:integration.target==='sun'&&SOLAR_LESSONS.some(s=>matchesSolarLesson(integration.parts,s.id))?1.8:integration.target==='pluto-system'&&integration.binary.smallMoons?24:isMacroFamily(integration.target)&&!integration.intent?macroFamilyFocusDistance(integration.target,integration.families.moons?integration.families.states:[],direction,camera.aspect,integration.families.rings):INTEGRATED_FOCUS_DISTANCE[integration.target]);
        controls.target.copy(target);camera.position.copy(target).add(offset);controls.update();controls.enableDamping=true;
        previousParent=followingPosition?followingPosition.clone():null;lastIntegratedRequest=integration.request;
      }else if(followingPosition&&previousParent){const delta=followingPosition.clone().sub(previousParent);camera.position.add(delta);controls.target.add(delta);previousParent.copy(followingPosition);}
      historyAnchor=(followingPosition??memberPosition??(integration.target==='earth'?earthPosition:null))?.clone()??null;
      if(historyBridge.current.pendingKey!==historyBridge.current.route)historyBridge.current.pending=null;
      const pending=historyBridge.current.pending;
      if(pending&&(!pending.anchor||historyAnchor)){
        const view=relocateBookmark(pending,historyAnchor?.toArray()??null);
        controls.enableDamping=false;controls.update();camera.position.fromArray(view.position);camera.up.fromArray(view.up);controls.target.fromArray(view.target);controls.minDistance=view.minDistance;controls.update();controls.enableDamping=true;
        historyBridge.current.pending=null;
      }
      controls.update();
      const cameraDistance = camera.position.distanceTo(controls.target);
      if (Math.abs(cameraDistance-lastDistance) > .1) { lastDistance=cameraDistance; onDistance(cameraDistance); }
      phenomena.update(current, displayRef.current.batch, displayRef.current.layers, camera.position.distanceTo(controls.target), demoSeconds, family, displayRef.current.cometBatch, displayRef.current.cometTracks, displayRef.current.showActivity, displayRef.current.selectedMember,binaryScene.visible,integration.comets,integration.smallRings,integration.eris,integration.patroclus,integration.erosShape);
      if(medium)isolateEnvironmentContext(scene,medium.id==='chargedParticles'?'none':'sun',familyHidden);
      else if(materialDust)isolateEnvironmentContext(scene,material.id==='meteor'?'earth':material.id==='zodiacal'?'sun-earth':'sun',familyHidden);
      else if(journey)isolateEnvironmentContext(scene,journey.target,familyHidden);
      else if(isolatedFamily)isolateFamilyContext(scene,isolatedFamily,familyHidden);
      else if(isolatedLocal)isolateLocalSystem(scene,isolatedLocal,familyHidden);
      const near=enceladusRequested?Math.max(.000001,enceladusRadius*.1):.02;if(camera.near!==near){camera.near=near;camera.updateProjectionMatrix();}
      const localLightAnchor=material?.id==='meteor'?earthPosition:journey?.target==='jupiter'?parentPositions.jupiter:journey?.target==='earth'?earthPosition:isolatedLocal?(isolatedLocal==='pluto-system'?binaryScene.anchor:memberPosition):null;
      familyLight.visible=!!current&&(!!isolatedFamily||!!localLightAnchor);sunlight.visible=!familyLight.visible;
      if(localLightAnchor){familyLight.target.position.copy(localLightAnchor);familyLight.position.copy(localLightAnchor).addScaledVector(localLightAnchor.clone().normalize(),-10);}
      if(isolatedFamily&&current){const i=BODY_IDS.indexOf(isolatedFamily)*3;const lightDirection=new THREE.Vector3(current.positions[0]-current.positions[i],current.positions[2]-current.positions[i+2],-(current.positions[1]-current.positions[i+1])).normalize();familyLight.target.position.copy(parentPositions[isolatedFamily]);familyLight.position.copy(parentPositions[isolatedFamily]).addScaledVector(lightDirection,10);}
      scene.updateMatrixWorld(true);
      // Clear all old placements before any module reads same-frame obstacles.
      for(const label of element.querySelectorAll<HTMLElement>('.macro-world-label,.macro-label-leader'))label.style.visibility='hidden';
      const hierarchy=macroVisualHierarchy(cameraDistance,integration.target,focus.selectedMember);
      element.dataset.labelLevel=hierarchy.regionLabels?'regions':'bodies';
      stars.position.copy(camera.position);
      // Selected member labels take precedence over surrounding planet labels in a close-up.
      if(focus.selectedMember)phenomena.layoutLabels(camera,element.clientWidth,element.clientHeight,showLabels,focus.selectedMember);
      primaryLabels.layout(camera,element.clientWidth,element.clientHeight,showLabels&&!!current,primary,hierarchy.regionLabels);
      if(!focus.selectedMember)phenomena.layoutLabels(camera, element.clientWidth, element.clientHeight, showLabels,isCometId(integration.target)||integration.target==='comet-demo'?integration.target:null);
      const softenContext=!!integration.target||!!focus.selectedMember;
      if(softenContext){scene.traverse(object=>{if(object.userData.background||!(object instanceof THREE.Points||object instanceof THREE.Line))return;let parent:THREE.Object3D|null=object;while(parent){if(parent.userData.integrated)return;parent=parent.parent;}for(const material of Array.isArray(object.material)?object.material:[object.material]){if(!contextMaterials.has(material))contextMaterials.set(material,{opacity:material.opacity,...(material instanceof THREE.PointsMaterial?{size:material.size,attenuation:material.sizeAttenuation}:{})});const original=contextMaterials.get(material)!;material.opacity=original.opacity*.10;if(material instanceof THREE.PointsMaterial){material.size=1.2;if(material.sizeAttenuation){material.sizeAttenuation=false;material.needsUpdate=true;}}}});}
      else if(contextMaterials.size)restoreContext();
      integratedScene.layout(camera,element.clientWidth,element.clientHeight,showLabels);
      familyScene.layout(camera,element.clientWidth,element.clientHeight,showLabels&&!integration.planetFocus&&!hierarchy.regionLabels);
      binaryScene.layout(camera,element.clientWidth,element.clientHeight,showLabels&&!medium&&!materialDust&&!journey&&!hierarchy.regionLabels&&!isolatedFamily&&(!isolatedLocal||isolatedLocal==='pluto-system'));
      if(now-lastPresence>600){lastPresence=now;const snapshot=readScenePresence(scene,camera),key=JSON.stringify(snapshot);if(key!==lastPresenceKey){lastPresenceKey=key;displayRef.current.onPresence(snapshot);}}
      renderer.render(scene, camera);
    };
    animation = requestAnimationFrame(draw);
    return () => {
      renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);
      disposed=true;cancelAnimationFrame(animation); observer.disconnect(); controls.dispose(); sceneRef.current = null;historyBridge.current.capture=null;historyBridge.current.pending=null;
      historicalGeometry?.dispose();earthEffects.dispose();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
          object.geometry.dispose();
          const material = object.material;
          (Array.isArray(material) ? material : [material]).forEach(item => {if('map' in item&&(item.map as THREE.Texture|null)!==particleTexture)(item.map as THREE.Texture|null)?.dispose();item.dispose();});
        }
      });
      primaryLabels.dispose();phenomena.dispose();integratedScene.dispose();familyScene.dispose();binaryScene.dispose();
      particleTexture.dispose();
      renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  useEffect(() => {
    const context = sceneRef.current;
    if (!context) return;
    context.restoreContext();if(!displayRef.current.integrated.target&&!displayRef.current.selectedMember)context.savedView=undefined;
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

export function MacroStructure({ active=true,onSpeedChange,onHomeTool,initialPanel,initialCosmic,returnLabel,stageFlags, onOpenStages, onOpenEnvironment, onOpenSolarActivity, onOpenDust, onOpenHeliosphere, initialZone, onOpenFamily, initialFamily, initialMemberId, timeControls, frame, displayDate, isEphemeris = true, onClose, onOpenReadingGuide, onObservePlanets, onExploreObject }: Props) {
  const [erisChoices,setErisChoices]=useState(defaultErisChoices);
  const [erosShapeChoices,setErosShapeChoices]=useState(defaultErosShapeChoices);
  const [patroclusChoices,setPatroclusChoices]=useState(defaultPatroclusChoices);
  const [smallRingChoices,setSmallRingChoices]=useState(defaultSmallRings);
  const [sceneSnapshot,setSceneSnapshot]=useState<SceneSnapshot>({});
  const [phenomenonParts,setPhenomenonParts]=useState(defaultPhenomenonParts);
  const [learningIndex,setLearningIndex]=useState<number|null>(null);
  const [sizeComparisonOpen,setSizeComparisonOpen]=useState(false);
  const [distanceComparisonOpen,setDistanceComparisonOpen]=useState(false);
  const infoScroll=useRef<HTMLDivElement>(null);
  const historyBridge=useRef<CameraHistoryBridge>({capture:null,pending:null,pendingKey:'',route:''});
  const capturedObservation=useRef<ObservationBookmark|null>(null),restoringObservation=useRef(false);
  const [observationHistory,setObservationHistory]=useState<ObservationHistory<ObservationBookmark>>(emptyHistory);
  const [planetFocus,setPlanetFocus]=useState(false);
  const [planetOrbitOptions,setPlanetOrbitOptions]=useState<PlanetOrbitOptions>({orbits:true,scales:false,direction:false});
  const [earthAppearance,setEarthAppearance]=useState<EarthAppearance>({clouds:true,atmosphere:true});
  const [cloudStatus,setCloudStatus]=useState<CloudStatus>('loading');
  const [cloudRetry,setCloudRetry]=useState(0);
  const [panelTab, setPanelTab] = useState<'integrated' | 'learn' | 'layers' | 'sources' | 'coverage'>(initialPanel??'integrated');
  const [integratedChoices,setIntegratedChoices]=useState(defaultIntegratedFlags);
  const [familyContext,setFamilyContext]=useState(false);
  const [focusIntent,setFocusIntent]=useState<IntegratedId|null>(null);
  const [integratedTarget,setIntegratedTarget]=useState<IntegratedTarget|null>(null);
  const [integratedRequest,setIntegratedRequest]=useState(0),[integratedRestore,setIntegratedRestore]=useState(0);
  const [integratedProgress,setIntegratedProgress]=useState(.32),[integratedPlaying,setIntegratedPlaying]=useState(false);
  useEffect(()=>{if(!active||!integratedPlaying)return;let raf=0,last=performance.now();const tick=(now:number)=>{const dt=(now-last)/1000;last=now;setIntegratedProgress(p=>(p+dt/20)%1);raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);},[active,integratedPlaying]);
  const effectiveIntegrated=planetFocusPhenomena(integratedFlags(integratedChoices,stageFlags,!!frame&&isEphemeris),planetFocus);
  const focusIntegrated=(target:IntegratedTarget,intent:IntegratedId|null=defaultFocusPhenomenon(target))=>{setFamilyContext(false);setFocusIntent(intent);setFamilySelected(null);if(!primaryId(target))setPlanetFocus(false);setScope('solar');if(primaryId(target)||isMacroFamily(target))setLayers(v=>({...v,planetary:true}));setSelectedMember(null);setIntegratedChoices(v=>focusPhenomena(v,target,intent));setPanelTab('integrated');setIntegratedTarget(target);setIntegratedRequest(n=>n+1);};
  const leaveIntegrated=()=>{setFocusIntent(null);setIntegratedPlaying(false);setIntegratedTarget(null);setIntegratedRestore(n=>n+1);};
  const [enceladusChoices,setEnceladusChoices]=useState(defaultEnceladusChoices);
  const [familyRings,setFamilyRings]=useState(true),[familyEnhanced,setFamilyEnhanced]=useState(true),[familyOrbits,setFamilyOrbits]=useState(false),[familySelected,setFamilySelected]=useState<string|null>(null);
  const familyData=useOverviewSatellites(frame?.time,isEphemeris&&stageFlags.families);
  const familyStates=useMemo(()=>macroMoonStates(isEphemeris?frame:null,familyData.states),[frame,isEphemeris,familyData.states]);
  const activeFamily=!focusIntent&&isMacroFamily(integratedTarget)?integratedTarget:null;
  const focusFamily=(id:MacroFamilyId)=>{setFamilyContext(false);setLayers(v=>({...v,planetary:true,moons:true}));setFamilySelected(null);focusIntegrated(id,null);};
  const selectFamilyMoon=(id:string)=>{const moon=familyStates.find(m=>m.id===id);if(!moon)return;focusFamily(moon.parentId);setFamilySelected(id);};
  const selectedMoon=familyStates.find(m=>m.id===familySelected);
  const [showLabels, setShowLabels] = useState(true);
  const [cameraDistance, setCameraDistance] = useState(62);
  const [layers, setLayers] = useState(defaultMacroLayers);
  const [animate, setAnimate] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const dwarfData = useDwarfs(frame?.time, isEphemeris);
  const binaryState=useMemo(()=>macroBinaryState(isEphemeris?frame:null,dwarfData.batch),[frame,isEphemeris,dwarfData.batch]);
  const [binaryCenter,setBinaryCenter]=useState(true),[binaryOrbits,setBinaryOrbits]=useState(true),[binarySelected,setBinarySelected]=useState<PlutoSystemId|null>(null);
  const plutoMoonsData=useMonthlyStates(plutoMoonProvider,frame?.time,isEphemeris&&stageFlags.families);
  const plutoStates=useMemo(()=>plutoMoonStates(binaryState,plutoMoonsData.batch),[binaryState,plutoMoonsData.batch]);
  const [binarySmall,setBinarySmall]=useState(true),[binaryEnhanced,setBinaryEnhanced]=useState(true);
  const focusBinary=()=>{setLayers(v=>({...v,moons:true}));focusIntegrated('pluto-system');};
  const binaryOptions:BinaryOptions={smallMoons:binarySmall,enhanced:binaryEnhanced,moonStates:plutoStates,state:binaryState,enabled:stageFlags.families&&layers.moons,center:binaryCenter,orbits:binaryOrbits,selected:binarySelected,onFocus:focusBinary,onSelect:id=>{setBinarySelected(id);if(integratedTarget!=='pluto-system')focusBinary();}};
  const smallBodyData = useMonthlyStates(smallBodyProvider, frame?.time, isEphemeris&&stageFlags.members);
  const erisData=useMonthlyStates(erisSystemProvider,frame?.time,isEphemeris&&stageFlags.members);
  const erosShapeData=useErosShape(stageFlags.members);
  const patroclusData=useMonthlyStates(patroclusSystemProvider,frame?.time,isEphemeris&&stageFlags.members);
  const patroclusState=useMemo(()=>patroclusSystemState(isEphemeris?frame:null,patroclusData.batch),[frame,isEphemeris,patroclusData.batch]);
  const erisState=useMemo(()=>erisSystemState(isEphemeris?frame:null,erisData.batch),[frame,isEphemeris,erisData.batch]);
  const cometData = useMonthlyStates(cometProvider, frame?.time, isEphemeris&&stageFlags.comets);
  const [cometPaths,setCometPaths]=useState(true),[cometOrbits,setCometOrbits]=useState(true),[cometDirection,setCometDirection]=useState(false);
  const focusComet=(id:CometId)=>{setLayers(v=>({...v,comets:true}));focusIntegrated(id);};
  const cometControls={selected:isCometId(integratedTarget)?integratedTarget:null,paths:cometPaths,orbits:cometOrbits,direction:cometDirection,enabled:stageFlags.comets,date:displayDate,onFocus:focusComet,onDemo:()=>{setShowActivity(true);setLayers(v=>({...v,comets:true}));focusIntegrated('comet-demo');},onPaths:()=>setCometPaths(v=>!v),onOrbits:()=>setCometOrbits(v=>!v),onDirection:()=>setCometDirection(v=>!v)};
  const [cometTracks,setCometTracks]=useState<CometTracks|null>(null);
  const [trackError,setTrackError]=useState('');
  const [trackRetry,setTrackRetry]=useState(0);
  const [showActivity,setShowActivity]=useState(false);
  useEffect(()=>{
    const abort=new AbortController();setTrackError('');
    void fetch(publicAsset('/data/comets/tracks.json'),{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error('轨迹文件读取失败');return r.json();}).then((data:CometTracks)=>{
      if(!validCometTracks(data))throw new Error('轨迹文件格式不兼容');
      if(!abort.signal.aborted)setCometTracks(data);
    }).catch(()=>{if(!abort.signal.aborted)setTrackError('两年轨迹暂未加载，请点击重试轨迹');});
    return ()=>abort.abort();
  },[trackRetry]);
  const scientificFrame = isEphemeris ? frame : null;
  const [scope, setScope] = useState<'solar' | 'cosmic'>(initialCosmic?'cosmic':'solar');
  const [solarTab, setSolarTab] = useState<'zones' | 'families'>(initialFamily?'families':'zones');
  const [selected, setSelected] = useState<MacroZoneId>(regionMemberById(initialMemberId)?.zone ?? initialZone ?? 'all');
  const [selectedMember,setSelectedMember]=useState<string|null>(initialMemberId ?? null);
  const [restoreRequest,setRestoreRequest]=useState(0);
  const [focusRequest,setFocusRequest]=useState(initialMemberId?1:0);
  const memberBatch=useMemo(()=>appendPatroclusPrimary(scientificFrame,replaceErisPrimary(scientificFrame,matchingMemberBatch(scientificFrame,dwarfData.batch,smallBodyData.batch),erisData.batch),patroclusData.batch),[scientificFrame,dwarfData.batch,smallBodyData.batch,erisData.batch,patroclusData.batch]);
  const localSystemView=!!selectedMember||integratedTarget==='pluto-system'||(!focusIntent&&(isMacroFamily(integratedTarget)||!!primaryId(integratedTarget)&&primaryId(integratedTarget)!=='sun'));
  const chooseMember=(id:string)=>{setFamilyContext(false);if(id==='menoetius'){setPatroclusChoices(v=>({...v,selected:'menoetius'}));id='patroclus';}else if(id==='patroclus')setPatroclusChoices(v=>({...v,selected:'patroclus'}));if(id==='dysnomia'){setErisChoices(v=>({...v,selected:'dysnomia'}));id='eris';}else if(id==='eris')setErisChoices(v=>({...v,selected:'eris'}));setPlanetFocus(false);if(isCometId(id)){focusComet(id);return;}setIntegratedTarget(null);setSelectedMember(id);setPanelTab(v=>v==='learn'?'learn':'integrated');setLayers(v=>({...v,dwarfs:true}));setFocusRequest(v=>v+1);};

  const [familyId, setFamilyId] = useState<SolarFamilyId>(initialFamily??'moons');
  const [cosmicId, setCosmicId] = useState<CosmicLevelId>(initialCosmic??'neighbors');
  const [resetCount, setResetCount] = useState(0);
  const [cameraView, setCameraView] = useState<MacroCameraView>('oblique');
  const [heightScale, setHeightScale] = useState<1 | 10>(1);
  const [showPlane, setShowPlane] = useState(true);
  const previousRegion=useRef(`${selected}/${solarTab}/${familyId}/${cameraView}/${resetCount}`);
  useEffect(()=>{const key=`${selected}/${solarTab}/${familyId}/${cameraView}/${resetCount}`;if(previousRegion.current!==key){if(!restoringObservation.current)setSelectedMember(null);previousRegion.current=key;}},[selected,solarTab,familyId,cameraView,resetCount]);
  useEffect(()=>{if(scope!=='solar'||solarTab!=='zones'||!['all','planetary'].includes(selected))setPlanetFocus(false);},[scope,solarTab,selected]);
  const staged=stagedLayers(layers,stageFlags);
  const effectiveLayers=planetFocusLayers(staged,planetFocus);
  useEffect(()=>{if(!restoringObservation.current)setIntegratedTarget(null);},[selected,solarTab,familyId,cameraView,resetCount]);
  useEffect(()=>{if(integratedTarget&&!(primaryId(integratedTarget)&&(primaryId(integratedTarget)==='sun'||effectiveLayers.planetary))&&!((isCometId(integratedTarget)||(integratedTarget==='comet-demo'&&showActivity))&&effectiveLayers.comets)&&!(integratedTarget==='pluto-system'&&binaryOptions.enabled)&&!(isMacroFamily(integratedTarget)&&stageFlags.families&&effectiveLayers.planetary)&&!(integratedTarget==='jupiter'&&focusIntent==='environment'&&effectiveIntegrated.environment)&&!INTEGRATED_ITEMS.some(i=>i.target===integratedTarget&&effectiveIntegrated[i.id]))leaveIntegrated();},[integratedTarget,focusIntent,effectiveIntegrated.solar,effectiveIntegrated.environment,effectiveIntegrated.belts,effectiveIntegrated.dust,effectiveIntegrated.helio,stageFlags.families,effectiveLayers.planetary,binaryOptions.enabled,effectiveLayers.comets,showActivity]);
  useEffect(()=>{if(selectedMember && (!effectiveLayers.dwarfs || (!stageFlags.members && DYNAMIC_MEMBER_IDS.some(id=>id===selectedMember)))){setSelectedMember(null);setRestoreRequest(v=>v+1);}},[stageFlags.members,effectiveLayers.dwarfs,selectedMember]);
  useEffect(()=>{if(focusIntent&&!effectiveIntegrated[focusIntent])leaveIntegrated();},[focusIntent,effectiveIntegrated.solar,effectiveIntegrated.environment,effectiveIntegrated.belts,effectiveIntegrated.dust,effectiveIntegrated.helio]);
  const environmentCandidate=environmentStepForView(integratedTarget,focusIntent,phenomenonParts);
  const ioReady=stageFlags.families&&familyStates.some(m=>m.id==='io');
  useEffect(()=>{if(environmentCandidate?.id==='io-torus'&&!ioReady)leaveIntegrated();},[environmentCandidate?.id,ioReady]);
  const environmentStep=environmentCandidate&&effectiveIntegrated[environmentCandidate.intent]&&(environmentCandidate.id!=='io-torus'||ioReady)?environmentCandidate:null;
  const materialCandidate=materialStepForView(integratedTarget,focusIntent,phenomenonParts,familySelected,enceladusChoices);
  const materialStep=materialCandidate&&stageFlags[materialCandidate.stage]?materialCandidate:null;
  const mediumStep=effectiveIntegrated.helio?mediumLessonForView(integratedTarget,focusIntent,phenomenonParts):null;
  const chooseMedium=(id:MediumId)=>{if(!stageFlags.heliosphereExplorer)return;setLearningIndex(null);setIntegratedPlaying(false);setPhenomenonParts(p=>mediumParts(p,id));focusIntegrated('helio','helio');};
  const observationTitle=mediumStep?.title??materialStep?.title??environmentStep?.title??(integratedTarget?(focusIntent?focusPhenomenonTitle(focusIntent,integratedTarget)??'空间现象':primaryId(integratedTarget)?`${bodyById[primaryId(integratedTarget)!].name}本体`:isMacroFamily(integratedTarget)?`${integratedTarget==='earth'?'地月系统':`${bodyById[integratedTarget].name}卫星系统`}${selectedMoon?` · ${selectedMoon.name}`:''}`:integratedTarget==='pluto-system'?(binarySmall?'冥王星卫星家族':'冥王星—卡戎'):isCometId(integratedTarget)?COMETS.find(c=>c.id===integratedTarget)!.name:integratedTarget==='comet-demo'?'彗尾活动示例':INTEGRATED_ITEMS.find(i=>i.target===integratedTarget)?.title??'空间现象'):selectedMember?regionMemberById(selectedMember)?.name??'区域成员':solarTab==='families'?SOLAR_FAMILIES.find(f=>f.id===familyId)!.name:MACRO_ZONES.find(z=>z.id===selected)?.name??'太阳系整体结构');
  const observationKey=JSON.stringify([integratedTarget,selectedMember,selected,solarTab,familyId,cameraView,resetCount,familySelected,binarySelected,focusIntent,environmentStep?.id??null,materialStep?.id??null,mediumStep?.id??null]);
  historyBridge.current.route=observationKey;
  const chooseEnvironmentStep=(id:EnvironmentStepId)=>{const step=ENVIRONMENT_STEPS.find(s=>s.id===id)!;if(!stageFlags[step.stage]||!scientificFrame||timeControls.loading||timeControls.error||id==='io-torus'&&!ioReady)return;setLearningIndex(null);setIntegratedPlaying(false);setIntegratedProgress(0);setPhenomenonParts(v=>environmentStepParts(v,id));focusIntegrated(step.target,step.intent);};
  const materialCometReady=!!macroCometAnchor(scientificFrame,cometData.batch,'halley');
  const materialMoonReady=stageFlags.families&&familyStates.some(m=>m.id==='enceladus');
  const chooseMaterialStep=(id:MaterialStepId)=>{
    const step=MATERIAL_STEPS.find(s=>s.id===id)!;
    if(!stageFlags[step.stage]||!scientificFrame||timeControls.loading||timeControls.error||id==='comet'&&!materialCometReady||['plume','e-ring'].includes(id)&&!materialMoonReady)return;
    setLearningIndex(null);setIntegratedPlaying(false);setIntegratedProgress(id==='meteor'?.93:0);
    setPhenomenonParts(v=>materialParts(v,id));
    if(id==='comet')focusComet('halley');
    else if(id==='plume'||id==='e-ring'){setEnceladusChoices(v=>({...v,jets:true,cutaway:false,eRing:id==='e-ring'}));setLayers(v=>({...v,planetary:true,moons:true}));setFamilyRings(id==='e-ring');setFamilyOrbits(false);focusFamily('saturn');setFamilySelected(id==='plume'?'enceladus':null);}
    else focusIntegrated(id==='meteor'?'earth':'dust','dust');
  };
  const captureObservation=():ObservationBookmark=>({key:observationKey,title:observationTitle,camera:historyBridge.current.pending??historyBridge.current.capture?.()??null,progress:integratedProgress,familyContext,intent:focusIntent,target:integratedTarget,member:selectedMember,zone:selected,tab:solarTab,family:familyId,view:cameraView,height:heightScale,plane:showPlane,layers:{...layers},choices:{...integratedChoices},parts:{...phenomenonParts},smallRings:{...smallRingChoices},erosShape:{...erosShapeChoices},eris:{...erisChoices},patroclus:{...patroclusChoices},planetFocus,enceladus:{...enceladusChoices},familyRings,familyEnhanced,familyOrbits,binaryCenter,binaryOrbits,familySelected,binarySelected,binarySmall,binaryEnhanced,showActivity,panel:panelTab});
  const captureNavigation=()=>{if(scope==='solar'&&!restoringObservation.current)capturedObservation.current=captureObservation();};
  useEffect(()=>{
    // Region selection can also clear a focused object in a passive effect. Record
    // only the settled route, using the camera captured before the user gesture.
    const timer=window.setTimeout(()=>{
      if(scope!=='solar'){setObservationHistory(emptyHistory());capturedObservation.current=null;}
      else if(!restoringObservation.current&&capturedObservation.current&&capturedObservation.current.key!==observationKey){const previous=capturedObservation.current;setObservationHistory(h=>recordObservation(h,previous));capturedObservation.current=null;historyBridge.current.pending=null;}
      restoringObservation.current=false;
    },0);
    return()=>window.clearTimeout(timer);
  },[observationKey,scope]);
  const observationBlocked=(entry:ObservationBookmark|undefined)=>{
    if(!entry)return '';
    const target=entry.target;
    const materialEntry=materialStepForView(target,entry.intent,entry.parts,entry.familySelected,entry.enceladus);if(materialEntry&&['plume','e-ring'].includes(materialEntry.id)&&!materialMoonReady)return '等待土卫二当前历表';
    if(environmentStepForView(target,entry.intent,entry.parts)?.id==='io-torus'&&!ioReady)return '等待已开启卫星阶段的木卫一历表';
    if((target&&target!=='sun'&&target!=='dust'&&target!=='helio'&&target!=='comet-demo'||entry.member)&&(!scientificFrame||timeControls.loading||!!timeControls.error))return '等待当前日期的真实历表';
    if(((isMacroFamily(target)&&!entry.intent)||target==='pluto-system')&&!stageFlags.families)return '请先开启阶段 04 卫星家族';
    if((isCometId(target)||target==='comet-demo')&&!stageFlags.comets)return '请先开启阶段 02 彗星';
    if(entry.member&&(!stageFlags.structure&&!stageFlags.members||DYNAMIC_MEMBER_IDS.some(id=>id===entry.member)&&!stageFlags.members))return '请先开启对应区域成员阶段';
    if(entry.intent&&!stageFlags[INTEGRATED_ITEMS.find(i=>i.id===entry.intent)!.stage])return '请先开启对应现象阶段';
    if(target==='sun'&&!stageFlags.solarActivity||target==='dust'&&!stageFlags.dustExplorer||target==='helio'&&!stageFlags.heliosphereExplorer)return '请先开启对应现象阶段';
    if(entry.member&&!macroMemberAnchor(scientificFrame,memberBatch,entry.member))return '等待该成员当前日期的历表';
    if(isCometId(target)&&!macroCometAnchor(scientificFrame,cometData.batch,target))return '等待彗星当前日期的历表';
    if(target==='pluto-system'&&isPlutoSmallMoon(entry.binarySelected)&&!plutoStates.some(s=>s.id===entry.binarySelected))return '等待所选小卫星当前日期历表';
    if(target==='pluto-system'&&!binaryState)return '等待双体当前日期的历表';
    return '';
  };
  const traverseHistory=(direction:'back'|'forward')=>{
    const entry=(direction==='back'?observationHistory.past:observationHistory.future).at(-1);
    if(!entry||observationBlocked(entry))return;
    const result=traverseObservation(observationHistory,captureObservation(),direction);if(!result)return;
    restoringObservation.current=true;capturedObservation.current=null;setObservationHistory(result.history);
    historyBridge.current.pending=entry.camera;
    historyBridge.current.pendingKey=JSON.stringify([entry.target,entry.member,entry.zone,entry.tab,entry.family,entry.view,resetCount+1,entry.familySelected,entry.binarySelected,entry.intent,environmentStepForView(entry.target,entry.intent,entry.parts)?.id??null,materialStepForView(entry.target,entry.intent,entry.parts,entry.familySelected,entry.enceladus)?.id??null,mediumLessonForView(entry.target,entry.intent,entry.parts)?.id??null]);
    setIntegratedPlaying(false);setIntegratedProgress(entry.progress);
    setSelected(entry.zone);setSolarTab(entry.tab);setFamilyId(entry.family);setCameraView(entry.view);setHeightScale(entry.height);setShowPlane(entry.plane);setLayers({...entry.layers});setIntegratedChoices({...entry.choices});setPhenomenonParts({...entry.parts});setSmallRingChoices({...entry.smallRings});setErosShapeChoices({...entry.erosShape});setErisChoices({...entry.eris});setPatroclusChoices({...entry.patroclus});setPlanetFocus(entry.planetFocus);setShowActivity(entry.showActivity);setPanelTab(entry.panel);
    setFamilyRings(entry.familyRings);setFamilyEnhanced(entry.familyEnhanced);setFamilyOrbits(entry.familyOrbits);setBinaryCenter(entry.binaryCenter);setBinaryOrbits(entry.binaryOrbits);setFamilyContext(entry.familyContext);setFocusIntent(entry.intent);setIntegratedTarget(entry.target);setSelectedMember(entry.member);setFamilySelected(entry.familySelected);setEnceladusChoices({...entry.enceladus});setBinarySelected(entry.binarySelected);setBinarySmall(entry.binarySmall);setBinaryEnhanced(entry.binaryEnhanced);
    setIntegratedRequest(n=>n+1);setFocusRequest(n=>n+1);setResetCount(n=>n+1);
  };
  const changeObservationAngle=(view:MacroCameraView)=>{
    const bookmark=historyBridge.current.capture?.();
    if((integratedTarget||selectedMember)&&bookmark){
      restoringObservation.current=true;capturedObservation.current=null;
      historyBridge.current.pending=orientBookmark(bookmark,view);
      historyBridge.current.pendingKey=JSON.stringify([integratedTarget,selectedMember,selected,solarTab,familyId,view,resetCount+1,familySelected,binarySelected,focusIntent,environmentStep?.id??null,materialStep?.id??null,mediumStep?.id??null]);
      setResetCount(n=>n+1);
    }
    setCameraView(view);
  };
  const resetObservationCamera=()=>{
    if(integratedTarget||selectedMember){restoringObservation.current=true;capturedObservation.current=null;historyBridge.current.pending=null;setCameraView('oblique');if(integratedTarget)setIntegratedRequest(n=>n+1);else setFocusRequest(n=>n+1);}
    setResetCount(n=>n+1);
  };
  const restorePanorama=()=>{
    setScope('solar');setIntegratedTarget(null);setSelectedMember(null);setFamilySelected(null);setBinarySelected(null);
    setPlanetFocus(false);setResetCount(n=>n+1);setCameraView('oblique');setHeightScale(1);setShowPlane(true);setShowLabels(true);
    setLayers(defaultMacroLayers());setIntegratedChoices(defaultIntegratedFlags());setPhenomenonParts(defaultPhenomenonParts());setSmallRingChoices(defaultSmallRings());setErosShapeChoices(defaultErosShapeChoices());setEnceladusChoices(defaultEnceladusChoices());setErisChoices(defaultErisChoices());setPatroclusChoices(defaultPatroclusChoices());setPlanetOrbitOptions({orbits:true,scales:false,direction:false});
    setFamilyContext(false);setBinarySmall(true);setBinaryEnhanced(true);setFamilyRings(true);setFamilyOrbits(false);setSolarTab('zones');setSelected('all');setPanelTab('integrated');
    infoScroll.current?.scrollTo({top:0});
  };
  const learningReason=(index:number)=>{
    const step=LEARNING_STEPS[index];if(!step)return '';
    const missing=step.stages.filter(id=>!stageFlags[id]);if(missing.length)return `请开启 ${missing.map(id=>STAGES.find(s=>s.id===id)!.title).join('、')}`;
    const d=step.destination;
    if(d.kind==='cosmic'||d.kind==='zone')return d.kind==='zone'&&d.id==='planetary'&&(!scientificFrame||timeControls.loading||timeControls.error)?'等待当前日期的真实历表':'';
    if(!scientificFrame||timeControls.loading||timeControls.error)return '等待当前日期的真实历表';
    if(d.kind==='member'&&!macroMemberAnchor(scientificFrame,memberBatch,d.id))return '等待该成员当前日期的历表';
    if(d.kind==='target'){
      if(isCometId(d.id)&&!macroCometAnchor(scientificFrame,cometData.batch,d.id))return '等待彗星当前日期的历表';
      if(d.id==='pluto-system'&&!binaryState)return '等待冥王星双体历表';
      if(isMacroFamily(d.id)&&!familyStates.some(m=>m.parentId===d.id))return '等待该家族当前日期的卫星历表';
    }
    return '';
  };
  const goLearning=(index:number)=>{
    const step=LEARNING_STEPS[index];if(!step||learningReason(index))return;
    setFamilyContext(false);setFocusIntent(null);setLearningIndex(index);restoringObservation.current=true;capturedObservation.current=null;historyBridge.current.pending=null;
    setIntegratedTarget(null);setSelectedMember(null);setFamilySelected(null);setBinarySelected(null);
    setPlanetFocus(false);setHeightScale(1);setCameraView('oblique');setShowPlane(true);setSolarTab('zones');setPanelTab('integrated');
    // A chosen lesson applies its own presentation, without changing time or stage gates.
    setIntegratedChoices({solar:false,environment:false,belts:false,dust:false,helio:false});
    const nextLayers=defaultMacroLayers();
    const d=step.destination;
    setPlanetOrbitOptions({orbits:d.kind==='zone',scales:false,direction:false});setFamilyOrbits(d.kind==='target'&&isMacroFamily(d.id));setShowPlane(d.kind==='zone');
    if(d.kind==='target'||d.kind==='member'){for(const key of Object.keys(nextLayers) as MacroLayerId[])nextLayers[key]=false;nextLayers.planetary=d.kind==='target'&&(!!primaryId(d.id)||isMacroFamily(d.id));nextLayers.moons=d.kind==='target'&&(isMacroFamily(d.id)||d.id==='pluto-system');nextLayers.comets=d.kind==='target'&&isCometId(d.id);nextLayers.dwarfs=d.kind==='member';}
    if(d.kind==='cosmic'){setScope('cosmic');setCosmicId(d.id);}
    else {
      setScope('solar');
      if(d.kind==='zone'){setSelected(d.id);if(d.id==='planetary'){nextLayers.oort=false;nextLayers.heliosphere=false;nextLayers.wind=false;setPlanetFocus(true);}}
      else if(d.kind==='member'){setSelected(regionMemberById(d.id)!.zone);setSelectedMember(d.id);setFocusRequest(n=>n+1);}
      else {setSelected('planetary');setIntegratedTarget(d.id);setIntegratedRequest(n=>n+1);}
    }
    setLayers(nextLayers);setResetCount(n=>n+1);
    dialog.current?.querySelectorAll<HTMLDetailsElement>('.observation-path > details[open]').forEach(e=>{e.open=false;e.querySelector<HTMLElement>('summary')?.focus();});
    requestAnimationFrame(()=>{infoScroll.current?.scrollTo({top:0});dialog.current?.querySelector<HTMLElement>('.learning-lesson')?.focus({preventScroll:true});});
  };
  const learningFollowing=learningIndex!==null&&learningMatches(LEARNING_STEPS[learningIndex],{scope,zone:selected,tab:solarTab,target:integratedTarget,member:selectedMember,cosmic:cosmicId,phenomenon:integratedTarget?focusIntent:null});
  const readLearning=()=>{
    if(learningIndex===null)return;
    const d=LEARNING_STEPS[learningIndex].destination;
    setPanelTab(d.kind==='zone'?'learn':'integrated');
    requestAnimationFrame(()=>{
      const selector=d.kind==='zone'||d.kind==='cosmic'?'.macro-learning-detail':d.kind==='member'?'.region-members':isMacroFamily(d.id)?'[aria-label="全景卫星与环系"]' :d.id==='pluto-system'?'.panorama-binary':isCometId(d.id)?'.panorama-comets':'.panorama-primary';
      const root=infoScroll.current,target=root?.querySelector<HTMLElement>(selector);
      if(root&&target){root.scrollTo({top:root.scrollTop+target.getBoundingClientRect().top-root.getBoundingClientRect().top-12,behavior:'instant'});target.tabIndex=-1;target.focus({preventScroll:true});}
    });
  };
  const returnLesson=()=>{infoScroll.current?.scrollTo({top:0});dialog.current?.querySelector<HTMLElement>('.learning-lesson')?.focus({preventScroll:true});};
  const learningProps={index:learningIndex,following:learningFollowing,reason:learningReason,onGo:goLearning,onExit:()=>{setLearningIndex(null);restorePanorama();},onFinish:()=>setLearningIndex(null),onStages:()=>{dialog.current?.querySelectorAll<HTMLDetailsElement>('.observation-path > details[open]').forEach(e=>{e.open=false;e.querySelector<HTMLElement>('summary')?.focus();});onOpenStages();},onRead:readLearning};
  const observationHint=integratedTarget?(primaryId(integratedTarget)?'看球面与昼夜，再从资料进入卫星系统；外观使用静态贴图，球体已经放大。':isMacroFamily(integratedTarget)||integratedTarget==='pluto-system'?'比较母星与卫星的运行关系；选择卫星阅读相对参数，日期控制仍是同一条时间轴。':isCometId(integratedTarget)?'对照当前彗核、两年历表路径和参考椭圆；彗尾活动另有示例。':'观察环境和现象的空间关系；放大形态与演示进度不代表当天实测。'):selectedMember?'查看此天体的位置与所属区域；点云是分布示意，不代表每一个真实成员。':solarTab==='families'?'按成员类别理解太阳系；此处分类与空间区域并不是一一对应。':selected==='planetary'?'先斜视与侧视比较轨道方向，再选择地球靠近；距离压缩与高度增强请看画面标记。':'先理解区域之间的关系，再走进行星区域；外层球壳和点云需结合证据说明阅读。';
  const focusedFamily = solarTab === 'families' ? familyId : undefined;
  const layerStatus = (id: MacroLayerId) => {
    if (!layers[id]) return '已关闭';
    if (!staged[id]) return '阶段已隐藏';
    if(planetFocus&&id!=='planetary')return '专注中隐藏';
    if ((id === 'planetary' || id === 'moons') && !scientificFrame) return '缺少历表';
    if (id === 'comets' && !isEphemeris) return '缺少历表';
    if (id === 'comets' && !cometData.batch) return cometData.error ? '加载失败' : '等待历表';
    if (id === 'dwarfs' && !isEphemeris) return '缺少历表';
    if (id === 'dwarfs' && (!dwarfData.batch || (stageFlags.members&&!smallBodyData.batch))) return (dwarfData.error || smallBodyData.error) ? '部分失败' : '部分加载';
    const expanded = macroDetailVisible(id, cameraDistance) || focusedFamily === id || (id === 'populations' && focusedFamily === 'centaurs');
    return sceneSnapshot[id]?.rendered ? presenceText(sceneSnapshot,id) : expanded&&['moons','dust','populations'].includes(id)?'近景细节待展开':expanded?'等待资料 / 尚未绘制':'靠近显示';
  };
  const expandedCount = Object.values(sceneSnapshot).filter(row=>row.inView>0).length;
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const zone = MACRO_ZONES.find(item => item.id === selected);
  const zoneVisualMeaning = zone?.visualMeaning ?? '太阳、八大行星、12 个区域代表成员及三颗彗星取当前历表位置。行星彩色曲线与彗星淡线是瞬时参考轨道，彗星亮线是两年历表路径；灰蓝圆环为可选尺度参考。彩色点云、可选双尾、太阳风及边界是示意，奥尔特云是模型推断。';
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
    if(active)closeButton.current?.focus({ preventScroll: true });
    return () => { if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); };
  }, []);
  const [showHistory,setShowHistory]=useState(false);
  const [historicalView,setHistoricalView]=useState<HistoricalView|null>(null);
  const [historicalViewport,setHistoricalViewport]=useState({left:0,top:92,width:800,height:600});
  useEffect(()=>{if(!showHistory)return;const elements=[...dialog.current!.querySelectorAll<HTMLElement>('button,input,select,summary,a')].map(element=>({element,inert:element.inert}));for(const {element} of elements)element.inert=true;return()=>{for(const {element,inert} of elements)element.inert=inert;};},[showHistory]);
  const openHistory=()=>{if(frame)timeControls.onSeek(frame.time);setShowHistory(true);};
  const visitHomeContent=(row:CoverageItem)=>{
    setPlanetFocus(false);
    if(row.id==='E01'){focusIntegrated(stageFlags.solarActivity?'sun':'body:sun');return;}
    if(row.id==='E02'){focusIntegrated('body:earth');return;}
    if(row.id==='E03'){focusFamily('earth');return;}
    if(row.id==='E04'){focusFamily('saturn');return;}
    if(row.id==='E07'){chooseMember('eros');setPanelTab('integrated');return;}
    if(row.id==='E08'){chooseMember('achilles');setPanelTab('integrated');return;}
    if(row.id==='E09'){chooseMember('chariklo');setPanelTab('integrated');return;}
    if(row.id==='E10'){chooseMember('quaoar');setPanelTab('integrated');return;}
    if(row.id==='E11'){chooseMember('sedna');setPanelTab('integrated');return;}
    if(row.id==='E12'){focusComet('hale-bopp');return;}
    if(row.id==='E20'){openHistory();return;}
    if(row.id==='E14'){focusIntegrated('dust');return;}
    if(row.id==='E16'){focusIntegrated('earth');return;}
    if(row.id==='E17'){setPanelTab('integrated');requestAnimationFrame(()=>infoScroll.current?.querySelector('.panorama-motion')?.scrollIntoView({block:'start'}));return;}
    const entry=row.entry;if(!entry)return;
    requestAnimationFrame(()=>infoScroll.current?.scrollTo({top:0}));
    setSelectedMember(null);setIntegratedTarget(null);setPanelTab('learn');
    if(entry.kind==='cosmic'){setScope('cosmic');setCosmicId(entry.id);}
    else{setScope('solar');if(entry.kind==='zone'){setSolarTab('zones');setSelected(entry.id);if(entry.id!=='all')setLayers(v=>({...v,[entry.id]:true}));}else{setSolarTab('families');setFamilyId(entry.id);setLayers(v=>({...v,dwarfs:true}));}}
  };
  const phenomenonStatus=(id:typeof INTEGRATED_ITEMS[number]['id'])=>{const item=INTEGRATED_ITEMS.find(i=>i.id===id)!;if(!stageFlags[item.stage])return '阶段已隐藏';if(!integratedChoices[id])return '已关闭';if(planetFocus)return '专注中隐藏';if(item.target==='earth'&&!scientificFrame)return '等待真实地球位置';if(PHENOMENON_PARTS.filter(p=>p.group===id).every(p=>!phenomenonParts[p.id]))return '细分效果已关闭';return presenceText(sceneSnapshot,id==='dust'?'stream':id);};
  const erisStatus=!stageFlags.members?'阶段 03 已隐藏':!stageFlags.families?'阶段 04 已隐藏':planetFocus?'专注行星中隐藏':!effectiveLayers.dwarfs?'区域成员图层已关闭':erisData.error?'家族历表加载失败 · 可重试':!erisState?'等待阋神星家族当前历表':!erisChoices.moon?'阋卫一已关闭':presenceText(sceneSnapshot,'eris-system');
  const focusEris=()=>{if(!stageFlags.members||!stageFlags.families){onOpenStages();return;}chooseMember('eris');setErisChoices(v=>({...v,moon:true}));setPanelTab('integrated');requestAnimationFrame(()=>infoScroll.current?.querySelector('[data-eris-system]')?.scrollIntoView({block:'start'}));};
  const erisPanel=<ErisSystemPanel state={erisState} choices={erisChoices} enabled={stageFlags.members&&stageFlags.families} active={selectedMember==='eris'} status={erisStatus} error={erisData.error} onRetry={erisData.retry} onLocate={focusEris} onSelect={id=>setErisChoices(v=>({...v,selected:id}))} onChange={key=>setErisChoices(v=>({...v,[key]:!v[key],selected:key==='moon'?'eris':v.selected}))} onStages={onOpenStages} time={timeControls}/>;
  const patroclusStatus=!stageFlags.members?'阶段 03 已隐藏':!stageFlags.families?'阶段 04 已隐藏':planetFocus?'专注行星中隐藏':!effectiveLayers.dwarfs?'区域成员图层已关闭':patroclusData.error?'家族历表加载失败 · 可重试':!patroclusState?'等待双小行星当前历表':!patroclusChoices.moon?'伴星 Menoetius已关闭':presenceText(sceneSnapshot,'patroclus-system');
  const focusPatroclus=()=>{if(!stageFlags.members||!stageFlags.families){onOpenStages();return;}chooseMember('patroclus');setPatroclusChoices(v=>({...v,moon:true}));setPanelTab('integrated');requestAnimationFrame(()=>infoScroll.current?.querySelector('[data-patroclus-system]')?.scrollIntoView({block:'start'}));};
  const patroclusPanel=<PatroclusSystemPanel state={patroclusState} choices={patroclusChoices} enabled={stageFlags.members&&stageFlags.families} active={selectedMember==='patroclus'} status={patroclusStatus} error={patroclusData.error} onRetry={patroclusData.retry} onLocate={focusPatroclus} onSelect={id=>setPatroclusChoices(v=>({...v,selected:id}))} onChange={key=>setPatroclusChoices(v=>({...v,[key]:!v[key],selected:key==='moon'?'patroclus':v.selected}))} onStages={onOpenStages} time={timeControls}/>;
  const enceladusReady=familyStates.some(m=>m.id==='enceladus');
  const enceladusStatus=!stageFlags.families?'阶段 04 已隐藏':planetFocus?'专注行星中隐藏':!effectiveLayers.planetary?'行星图层已关闭':!effectiveLayers.moons?'卫星图层已关闭':!enceladusReady?(familyData.error?'卫星历表读取失败 · 可重试':'等待土卫二当前历表'):!enceladusChoices.jets&&!(activeFamily==='saturn'&&familySelected==='enceladus'&&enceladusChoices.cutaway&&(enceladusChoices.ice||enceladusChoices.ocean||enceladusChoices.core))?'细节已关闭 · 保留卫星本体':presenceText(sceneSnapshot,'enceladus-detail');
  const focusEnceladus=()=>{if(!stageFlags.families){onOpenStages();return;}selectFamilyMoon('enceladus');setPanelTab('integrated');requestAnimationFrame(()=>infoScroll.current?.querySelector('[data-enceladus]')?.scrollIntoView({block:'start'}));};
  const enceladusPanel=<EnceladusPanel choices={enceladusChoices} enabled={stageFlags.families} ready={enceladusReady} active={activeFamily==='saturn'&&familySelected==='enceladus'} status={enceladusStatus} error={!enceladusReady?familyData.error:''} onRetry={familyData.retry} onLocate={focusEnceladus} onParent={()=>focusFamily('saturn')} onChange={patch=>setEnceladusChoices(v=>({...v,...patch}))}/>;
  const erosShapeReady=!!macroMemberAnchor(scientificFrame,memberBatch,'eros');
  const erosShapeStatus=!stageFlags.members?'阶段 03 已隐藏':planetFocus?'专注行星中隐藏':!effectiveLayers.dwarfs?'区域成员图层已关闭':!erosShapeReady?'等待爱神星当前历表':erosShapeData.error?'形状读取失败 · 可重试':!erosShapeData.data?'正在读取 PDS 形状资料':!erosShapeChoices.shape?'同体积球形对照中':presenceText(sceneSnapshot,'eros-shape');
  const focusErosShape=()=>{if(!stageFlags.members){onOpenStages();return;}chooseMember('eros');setPanelTab('integrated');requestAnimationFrame(()=>infoScroll.current?.querySelector('[data-eros-shape]')?.scrollIntoView({block:'start'}));};
  const erosShapePanel=<ErosShapePanel data={erosShapeData.data} choices={erosShapeChoices} error={erosShapeData.error} enabled={stageFlags.members} ready={erosShapeReady} active={selectedMember==='eros'} status={erosShapeStatus} onLocate={focusErosShape} onRetry={erosShapeData.retry} onChange={key=>setErosShapeChoices(v=>({...v,[key]:!v[key]}))} onBinary={focusPatroclus}/>;
  const smallRingsReady=!!macroMemberAnchor(scientificFrame,memberBatch,'chariklo');
  const smallRingsStatus=!stageFlags.members?'阶段 03 已隐藏':!stageFlags.families?'阶段 04 已隐藏':planetFocus?'专注行星中隐藏':!effectiveLayers.dwarfs?'区域成员图层已关闭':!smallRingsReady?'等待女凯龙星当前历表':!smallRingChoices.inner&&!smallRingChoices.outer?'双环均已关闭':presenceText(sceneSnapshot,'small-rings');
  const focusSmallRings=()=>{if(!stageFlags.members||!stageFlags.families){onOpenStages();return;}chooseMember('chariklo');setPanelTab('integrated');requestAnimationFrame(()=>infoScroll.current?.querySelector('[data-small-rings]')?.scrollIntoView({block:'start'}));};
  const smallRingPanel=<SmallBodyRingPanel choices={smallRingChoices} enabled={stageFlags.families&&stageFlags.members} ready={smallRingsReady} active={selectedMember==='chariklo'} status={smallRingsStatus} onChange={key=>setSmallRingChoices(v=>({...v,[key]:!v[key]}))} onLocate={focusSmallRings} onStages={onOpenStages}/>;
  const locateLayer=(id:MacroLayerId|'sun'|'rings')=>{setPlanetFocus(false);if(id==='sun'){focusIntegrated('body:sun');return;}if(id==='rings'){if(!stageFlags.families){onOpenStages();return;}setFamilyRings(true);focusFamily('saturn');return;}if(!stagedLayers(defaultMacroLayers(),stageFlags)[id]){onOpenStages();return;}setLayers(v=>({...v,[id]:true}));if(id==='planetary'){focusIntegrated('body:earth');return;}if(id==='moons'){focusFamily('earth');return;}if(id==='dwarfs'){chooseMember('pluto');setPanelTab('integrated');return;}if(id==='comets'){focusComet('hale-bopp');return;}if(id==='dust'){focusIntegrated('dust');return;}if(id==='populations'){chooseMember('achilles');setPanelTab('integrated');return;}setScope('solar');setIntegratedTarget(null);setSelectedMember(null);setSolarTab('zones');setSelected(id==='wind'?'planetary':id);setPanelTab('learn');setResetCount(n=>n+1);};
  const readyIds=new Set([...(scientificFrame?BODY_IDS:[]),...familyData.states.map(s=>s.id),...(memberBatch?.states.map(s=>s.id)??[]),...(cometData.batch?.states.map(s=>s.id)??[]),...plutoStates.map(s=>s.id),...(erisState&&stageFlags.families?['dysnomia']:[]),...(patroclusState&&stageFlags.families?['menoetius']:[])]);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if(showHistory){event.stopPropagation();return;}
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); const opened=dialog.current?.querySelector<HTMLDetailsElement>('.macro-tools-menu[open], .observation-path > details[open]'); if(opened){opened.open=false;opened.querySelector<HTMLElement>('summary')?.focus();}else if(returnLabel)onClose(); return; }
    event.stopPropagation();
    if(event.code==='Space'&&!(event.target instanceof HTMLElement&&event.target.closest('input,select,textarea,button,a,summary,[contenteditable=true]'))){event.preventDefault();timeControls.onToggle();return;}
    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, a[href], [tabindex="0"]') ?? []).filter(element => element.getClientRects().length > 0 && (!element.closest('details:not([open])') || element.matches('summary')));
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && (document.activeElement === first || !dialog.current?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  return <><section data-history={showHistory} aria-hidden={showHistory||undefined} style={{'--history-left':historicalViewport.left+'px','--history-top':historicalViewport.top+'px','--history-width':historicalViewport.width+'px','--history-height':historicalViewport.height+'px'} as CSSProperties} ref={dialog} className="macro-structure" role="region" aria-label="太阳系全景主页" aria-labelledby="macro-title" onKeyDown={onKeyDown} onPointerDownCapture={event=>{if(showHistory)return;captureNavigation();dialog.current?.querySelectorAll<HTMLDetailsElement>('.macro-tools-menu[open], .observation-path > details[open]').forEach(details=>{if(!details.contains(event.target as Node))details.open=false;});}} onClickCapture={event=>{if(event.detail===0)captureNavigation();}}>
    <header className="macro-header"><div className="macro-title"><h1 id="macro-title">太阳系全景</h1></div><div className="macro-scope-tabs" role="tablist" aria-label="宇宙观察范围"><button role="tab" aria-selected={scope === 'solar'} className={scope === 'solar' ? 'active' : ''} onClick={() => setScope('solar')}><Orbit size={14}/>太阳系 · 区域与成员</button><button role="tab" aria-selected={scope === 'cosmic'} className={scope === 'cosmic' ? 'active' : ''} onClick={() => setScope('cosmic')}><Sparkles size={14}/>恒星系统与其他星系</button><span>AU → 光年 → 星系尺度</span></div><div className="macro-header-actions"><details className="macro-tools-menu"><summary>更多工具</summary><div className="macro-tools-popover" onClick={event=>{if((event.target as HTMLElement).closest('button')){const details=event.currentTarget.closest('details');if(details){details.open=false;details.querySelector<HTMLElement>('summary')?.focus();}}}}><p>统一全景 · 细节与资料入口</p><button onClick={()=>onHomeTool('atlas')}> 太阳系图鉴</button><button onClick={()=>onHomeTool('plan')}> 整体规划</button><button onClick={()=>onHomeTool('progress')}> 建设记录</button><button onClick={()=>onHomeTool('data')}> 数据与实现</button><button onClick={()=>onHomeTool('physics')}> 物理验证</button>{stageFlags.dustExplorer&&<button className="macro-reading-button" onClick={()=>focusIntegrated('dust')}>尘埃与流星</button>}{stageFlags.solarActivity&&<button className="macro-reading-button" onClick={()=>focusIntegrated('sun')}>太阳活动</button>}{(stageFlags.environment||stageFlags.nearEarth)&&<button className="macro-reading-button" onClick={()=>focusIntegrated('earth')}>近地空间</button>}<button className="macro-reading-button" onClick={onOpenStages}>阶段导览</button><button className="macro-reading-button" onClick={onOpenReadingGuide}><Sparkles size={15}/>星点与环怎么看</button></div></details><button ref={closeButton} className="macro-back" title={returnLabel??"进入可切换真实比例的精细天体观测；可返回此处继续"} onClick={onClose}><ArrowLeft size={16}/>{returnLabel??'精细观测'}</button></div></header>

    <div className="macro-toolbar">{scope === 'solar' && <div className="macro-preset-bar">          <div className="macro-presets" aria-label="宏观取景预设">
            <button aria-pressed={!integratedTarget && !selectedMember && solarTab === 'zones' && selected === 'all' && Object.values(effectiveLayers).every(Boolean)} onClick={restorePanorama}>综合全景</button>
            <button aria-pressed={!integratedTarget && !selectedMember && solarTab === 'zones' && selected === 'planetary' && MACRO_LAYERS.every(l => effectiveLayers[l.id] === !['oort','heliosphere','wind'].includes(l.id))} onClick={() => { setPlanetFocus(false); setResetCount(n => n + 1); setCameraView('oblique'); setHeightScale(1); setLayers({ ...defaultMacroLayers(), oort: false, heliosphere: false, wind: false }); setSolarTab('zones'); setSelected('planetary'); }}>天体与轨道</button>
            <button aria-pressed={!integratedTarget && !selectedMember && solarTab === 'zones' && selected === 'heliosphere' && MACRO_LAYERS.every(l => effectiveLayers[l.id] === ['planetary','asteroid','kuiper','wind','heliosphere'].includes(l.id))} onClick={() => { setPlanetFocus(false); setResetCount(n => n + 1); setCameraView('oblique'); setHeightScale(1); setLayers({ ...defaultMacroLayers(), oort: false, populations: false, dust: false, scattered: false, comets: false, moons: false, dwarfs: false }); setSolarTab('zones'); setSelected('heliosphere'); }}>太阳风环境</button>
          </div>
</div>}
</div>
    <div className="macro-main">
      <nav className="macro-zone-list" aria-label={scope === 'solar' ? '太阳系结构与成员' : '宇宙邻域层次'}>
        {scope === 'solar' ? <>
          <div className="macro-list-tabs" role="group" aria-label="太阳系观察内容"><button className={solarTab === 'zones' ? 'active' : ''} onClick={() => setSolarTab('zones')}>空间区域</button><button className={solarTab === 'families' ? 'active' : ''} onClick={() => {setSolarTab('families');setPanelTab('learn');}}>天体与物质</button></div>
          <div className="macro-section-title">{solarTab === 'zones' ? '由内向外 · 结构层次' : '成员类别 · 不按同心层排列'}</div><span className="macro-scroll-cue">左右滑动<br/>查看更多区域 →</span>
          {solarTab === 'zones' ? <><button className={`macro-zone ${!integratedTarget&&!selectedMember&&selected === 'all' ? 'active' : ''}`} onClick={() => {setSelectedMember(null);setIntegratedTarget(null);setResetCount(n=>n+1);setPanelTab('integrated');setSelected('all');}} aria-pressed={!integratedTarget&&!selectedMember&&selected === 'all'}><span className="macro-zone-icon"><Maximize2 size={15}/></span><span><strong>整体形态</strong><small>行星薄盘 → 远缘球壳</small></span></button>{MACRO_ZONES.map(item => <button key={item.id} className={`macro-zone ${!integratedTarget&&!selectedMember&&selected === item.id ? 'active' : ''}`} onClick={() => { setSelectedMember(null);setIntegratedTarget(null);setResetCount(n=>n+1);setPanelTab('learn');setSelected(item.id); setLayers(v => ({ ...v, [item.id]: true })); }} aria-pressed={!integratedTarget&&!selectedMember&&selected === item.id}><i style={{ background: item.color }}/><span><strong>{item.name}</strong><small>{item.range}</small></span></button>)}</> : SOLAR_FAMILIES.map(item => <button key={item.id} className={`macro-zone ${!integratedTarget&&!selectedMember&&familyId === item.id ? 'active' : ''}`} onClick={() => { setSelectedMember(null);setIntegratedTarget(null);setResetCount(n=>n+1);setPanelTab('learn');setFamilyId(item.id); const layer = item.id === 'centaurs' ? 'populations' : item.id === 'asteroids' ? 'asteroid' : item.id; setLayers(v => ({ ...v, [layer]: true })); }} aria-pressed={!integratedTarget&&!selectedMember&&familyId === item.id}><i style={{ background: '#d5bd9a' }}/><span><strong>{item.name}</strong><small>{item.keyFact}</small></span></button>)}
        </> : <><div className="macro-section-title">离开太阳系 · 三个不同尺度</div>{COSMIC_LEVELS.map((item, index) => <button key={item.id} className={`macro-zone ${cosmicId === item.id ? 'active' : ''}`} onClick={() => setCosmicId(item.id)} aria-pressed={cosmicId === item.id}><span className="macro-cosmic-index">0{index + 1}</span><span><strong>{item.name}</strong><small>{item.keyFact}</small></span></button>)}<p className="macro-side-note">“恒星系统”是一颗或多颗恒星及其成员；“星系”是包含大量恒星的更大结构。太阳系属于银河系。</p></>}
      </nav>
      <div className="macro-stage">{scope === 'solar' ? <MacroCanvas historical={historicalView} onPresence={setSceneSnapshot} active={active} historyBridge={historyBridge} integrated={{familyContext,intent:focusIntent,erosShape:{data:erosShapeData.data,choices:erosShapeChoices},patroclus:{state:patroclusState,enabled:stageFlags.members&&stageFlags.families,choices:patroclusChoices},eris:{state:erisState,enabled:stageFlags.members&&stageFlags.families,choices:erisChoices},smallRings:{...smallRingChoices,enabled:stageFlags.families&&stageFlags.members},parts:phenomenonParts,planetFocus,planetOrbits:planetOrbitOptions,earth:{...earthAppearance,retry:cloudRetry,onStatus:setCloudStatus},comets:cometControls,binary:binaryOptions,families:{enceladus:enceladusChoices,enabled:stageFlags.families&&effectiveLayers.planetary,moons:effectiveLayers.moons,rings:familyRings,enhanced:familyEnhanced,orbits:familyOrbits,selected:familySelected,onSelect:selectFamilyMoon,onFocus:focusFamily,states:familyStates},flags:effectiveIntegrated,target:integratedTarget,request:integratedRequest,restore:integratedRestore,progress:integratedProgress,onFocus:(target,intent)=>{if(target==='jupiter'&&intent==='environment')chooseEnvironmentStep(environmentStep?.target==='jupiter'?environmentStep.id:'jupiter-magnet');else focusIntegrated(target,intent);}}} selectedMember={selectedMember} onSelectMember={chooseMember} focusRequest={focusRequest} restoreRequest={restoreRequest} cometBatch={cometData.batch} cometTracks={cometTracks} showActivity={showActivity} showLabels={showLabels} onDistance={setCameraDistance} frame={scientificFrame} layers={effectiveLayers} batch={memberBatch} animate={animate} selected={solarTab === 'zones' ? selected : familyId === 'asteroids' ? 'asteroid' : familyId === 'dwarfs' ? 'all' : familyId === 'centaurs' ? 'scattered' : 'planetary'} resetCount={resetCount} family={solarTab === 'families' ? familyId : undefined} cameraView={cameraView} heightScale={solarTab === 'zones' && selected === 'planetary' ? heightScale : 1} showPlane={showPlane}/> : <CosmicCanvas active={active&&!showHistory} level={cosmicId}/>}
        <div className="macro-current-target" role="status">当前观察 · {scope==='solar'?observationTitle:COSMIC_LEVELS.find(l=>l.id===cosmicId)!.name}{scope==='solar'&&localSystemView&&<small>{activeFamily?(activeFamily==='earth'?'地月本体大小同比例 · 距离压缩':'母星与卫星本体大小同比例 · 远处间距压缩'):integratedTarget==='pluto-system'?'双体大小与局部间距同比例 · 小卫星可辨识放大':'局部模型独立缩放 · 不能与全景球体比较'}{familyContext?' · 其他成员使用全景尺度，不可与卫星轨道直接比较':' · 其他成员暂隐，返回全景恢复'}</small>}{scope==='solar'&&!localSystemView&&<small>{environmentStep?'联系示意 · 无关成员暂隐，退出定位恢复 · 非当天实况':focusIntent?'空间现象为教学示意 · 不是当天观测影像':'全景球体不共用大小比例 · 日心距离压缩 · 真实数值请查看参数与大小比较'}</small>}</div>
        <div className="macro-stage-label"><span className="macro-live-dot"/>{scope === 'cosmic' ? '宇宙邻域 · 形态示意' : solarTab === 'families' ? '太阳系成员 · 分层展示' : '太阳系宏观全景'} <span>·</span> {scope === 'solar' && !isEphemeris ? '当前为物理模式 · 实测天体已隐藏' : scope === 'solar' && displayDate ? `观测时刻 ${displayDate.replace('T', ' ')}（北京时间）` : scope === 'solar' ? '历表加载中' : '非真实相对方位'}</div>
        {scope === 'solar' && solarTab === 'families' && <div className="macro-family-key">{integratedTarget==='pluto-system'?'冥王星与卫星随 JPL 日期运动 · 绿色十字是近似双体质心':familyId === 'dwarfs' ? '谷神星 / 冥王星：历表位置与瞬时参考轨道；卡戎可在全景现象中靠近展开' : familyId === 'moons' ? '卫星使用当日历表相对位置 · 球体与局部距离作展示缩放' : familyId === 'comets' ? '哈雷 / 67P：当日历表位置 · 亮线为两年路径，淡线为参考椭圆' : familyId === 'centaurs' ? '具名天体使用历表 · 周围点群仅示意种群范围' : familyId === 'dust' ? '太阳附近尘埃点仅示意分布，不表示实测密度' : '具名小天体使用历表 · 主带背景点数与大小为示意'}</div>}
        {scope === 'solar' && <div className="macro-depth-controls" aria-label="三维观察方式"><div role="group" aria-label="宏观镜头角度">{([['oblique','斜视'],['edge','侧视'],['top','俯视']] as const).map(([id,label]) => <button key={id} className={cameraView === id ? 'active' : ''} onClick={() => changeObservationAngle(id)} aria-pressed={cameraView === id}>{label}</button>)}</div><button className={showPlane ? 'active' : ''} onClick={() => setShowPlane(value => !value)} aria-pressed={showPlane}>黄道面 / 高度线</button>{!integratedTarget&&!selectedMember&&solarTab === 'zones' && selected === 'planetary' && <button className={heightScale === 10 ? 'active enhanced' : ''} onClick={() => setHeightScale(value => value === 1 ? 10 : 1)} aria-pressed={heightScale === 10}>{heightScale === 1 ? '行星高度 ×10' : '行星高度 ×10 · 示意'}</button>}</div>}
        {scope === 'solar' && <button className="macro-reset" onClick={resetObservationCamera} aria-label="复位宏观镜头" title="复位镜头"><RotateCcw size={15}/></button>}
        <div className="macro-scale-warning">{mediumStep?'参考原理图 · 长度、颜色和疏密为绘图选值 · 不按观测时间变化':primaryId(integratedTarget)?'定位当前天体 · 可用右侧开关显示其他成员 · 不同局部尺度不能混作实际距离':isMacroFamily(integratedTarget)?(focusIntent?'近地现象按说明放大 · 不代表当日实测':integratedTarget==='earth'?'月球绕地球的参考轨道 · 地月本体大小同比例，距离压缩':'母星与卫星本体大小同比例 · 远处间距压缩，环不是轨道线'):selectedMember?(selectedMember==='patroclus'?'双小行星：同一 JPL 解 · 两体半径与局部间距同一比例 · 日心距离压缩':selectedMember==='eris'?'阋神星—阋卫一：同一 JPL 卫星解 · 局部球体与间距同一比例 · 日心距离压缩':selectedMember==='chariklo'?'女凯龙星：本体历表定位 · 双环尺寸为 2014 参考模型 · 环面朝向示意':'当前成员按历表随日期运行 · 球体放大 / 距离压缩 · 细线为参考椭圆'):integratedTarget==='comet-demo'?'固定近太阳教学示例 · 不代表当前三颗彗星 的位置、尾长与活动':isCometId(integratedTarget)?'彗核位置来自历表 · 球体放大 / 距离压缩 · 金色箭头仅为背日方向':integratedTarget==='pluto-system' ? (binarySmall&&binaryEnhanced?'冥王星全家族 · 四颗小卫星标记放大 · 局部相对距离同一比例':'冥王星系统 · 局部半径与间距同一比例 · 日心距离仍压缩') : scope === 'cosmic' ? '拖动旋转 / 滚轮缩放 · 星系和恒星的画面尺寸与方位为示意' : solarTab === 'zones' && selected === 'planetary' && heightScale === 10 ? '行星黄道高度已放大 10 倍，仅为辨识；点击“行星高度 ×10”恢复真实高度' : solarTab === 'families' ? '距离对数压缩 · 天体位置见来源状态 · 彗尾、太阳风、种群点云为示意' : selected === 'scattered' ? '紫色点只示意远伸且有纵向厚度的分布 · 一点不等于一颗已发现天体' : selected === 'oort' ? '圆点示意可能的冰质小天体群；每个点都不是已观测天体，点数、位置与大小不对应实测' : selected === 'heliosphere' ? '三维轮廓表示太阳风影响区 · 实际边界并非规则球面' : selected === 'kuiper' || selected === 'asteroid' ? '点云展示环带厚度 · 点位与密度为示意，非逐体历表' : (cameraDistance>=42?'远景优先区域标注 · 靠近展开天体名称 · 距离对数压缩':'拖动旋转 / 滚轮缩放 · 距离对数压缩 · 行星黄道高度来自历表')}</div>
        {scope === 'cosmic' && <div className="macro-cosmic-legend">{cosmicId === 'neighbors' ? '太阳 · 半人马座 α / 比邻星 · TRAPPIST-1' : cosmicId === 'milkyway' ? '银河系旋臂 · 猎户臂支中的太阳' : '银河系 · 大麦哲伦云 · 仙女座星系'}</div>}
      </div>
      <aside className="macro-info" aria-label="观察操作与说明">
    <ObservationPath title={scope==='cosmic'?COSMIC_LEVELS.find(l=>l.id===cosmicId)!.name:observationTitle} hint={observationHint} back={scope==='solar'?observationHistory.past.at(-1)?.title:undefined} forward={scope==='solar'?observationHistory.future.at(-1)?.title:undefined} backReason={observationBlocked(observationHistory.past.at(-1))} forwardReason={observationBlocked(observationHistory.future.at(-1))} onBack={()=>traverseHistory('back')} onForward={()=>traverseHistory('forward')} onLesson={learningIndex===null?undefined:returnLesson} learning={<LearningRoute {...learningProps} mode="map"/>}/>
        {scope==='solar'&&localSystemView&&<label className="macro-family-context"><input type="checkbox" checked={familyContext} onChange={e=>setFamilyContext(e.target.checked)}/>显示其他太阳系成员（不同距离尺度）</label>}
        {scope==='solar'&&planetFocus&&<div className="macro-focus-banner" role="status"><span>专注行星 · 其他内容暂时隐藏</span><button onClick={()=>setPlanetFocus(false)}>恢复其他内容</button></div>}
        {scope === 'solar' && <><div className="macro-panel-tabs" role="group" aria-label="宏观侧栏内容">{([['integrated','全景现象'],['coverage','内容总表'],['learn','认识这里'],['layers','场景清单'],['sources','来源']] as const).map(([id,name]) => <button key={id} aria-pressed={panelTab===id} onClick={() => {setPanelTab(id);if(id==='coverage'||id==='layers')requestAnimationFrame(()=>infoScroll.current?.scrollTo({top:0}));}}>{name}</button>)}</div>
        <div className="macro-layer-summary"><span>{expandedCount} 类图形在视野内</span><span>{MACRO_LAYERS.filter(l=>layerStatus(l.id)==='靠近显示').length} 类靠近显示</span><button aria-pressed={showLabels} onClick={()=>setShowLabels(v=>!v)}>{showLabels ? '隐藏标注' : '显示标注'}</button></div></>}
        {scope==='solar'&&panelTab==='integrated'&&<MacroContentsNav scroller={infoScroll} stages={stageFlags}/>}
        <div className="macro-info-scroll" ref={infoScroll}>
        {scope==='solar'&&panelTab==='coverage'&&<HomeContentIndex stages={stageFlags} ready={readyIds.size} onVisit={visitHomeContent} onStages={onOpenStages}/>}
        {!['coverage','layers'].includes(panelTab)&&<LearningRoute {...learningProps} mode="lesson"/>}
        {scope==='solar'&&<section className="panorama-integration" hidden={panelTab!=='integrated'} aria-label="全景现象控制">
          <h2>在同一片空间中观察</h2><p>主体、区域与环境属于同一个场景。右上“场景清单”可核对实际显隐；家族和具名成员近景默认暂隐其他成员，右侧可重新显示；返回全景恢复。点击场景标记或下方定位，镜头在同一画布中靠近；远景保留位置标记，近景展开细节。</p>
          <p className="panorama-scale-note">天体锚点采用当前历表；周围现象为放大示意，不是当天事件。距离仍压缩，局部尺寸不能与天体距离直接比较。</p>
          {integratedTarget&&<div className="panorama-current"><strong>当前定位：{observationTitle}</strong><button onClick={leaveIntegrated}>返回定位前视角</button></div>}
          <EnvironmentJourneyPanel current={environmentStep&&effectiveIntegrated[environmentStep.intent]?environmentStep:null} stages={stageFlags} ioReady={ioReady} ioError={familyData.error.split('；').find(e=>e.startsWith('木星卫星'))??''} onRetryIo={familyData.retry} ready={!!scientificFrame&&!timeControls.loading&&!timeControls.error} playing={integratedPlaying} progress={integratedProgress} onStep={chooseEnvironmentStep} onPlaying={()=>setIntegratedPlaying(v=>!v)} onReset={()=>{setIntegratedProgress(0);setIntegratedPlaying(true);}} onStages={onOpenStages}/>
          <SpaceMediumPanel current={mediumStep} enabled={stageFlags.heliosphereExplorer} onLesson={chooseMedium} onExit={()=>{setPhenomenonParts(p=>({...p,parkerField:false,currentSheet:false,photonRays:false,chargedParticles:false,neutralAtoms:false}));leaveIntegrated();}} onStages={onOpenStages}/>
          <MaterialJourneyPanel current={materialStep} stages={stageFlags} ready={!!scientificFrame&&!timeControls.loading&&!timeControls.error} cometReady={materialCometReady} moonReady={materialMoonReady} progress={integratedProgress} playing={integratedPlaying} onStep={chooseMaterialStep} onPlaying={()=>setIntegratedPlaying(v=>!v)} onReset={()=>{setIntegratedProgress(0);setIntegratedPlaying(true);}} onProgress={value=>{setIntegratedPlaying(false);setIntegratedProgress(value);}} onStages={onOpenStages}/>
          <MacroOrbitPanel focused={planetFocus} canFocus={!!scientificFrame&&layers.planetary&&!selectedMember&&(!integratedTarget||!!primaryId(integratedTarget))&&solarTab==='zones'&&['all','planetary'].includes(selected)} onFocusToggle={()=>setPlanetFocus(v=>!v)} options={planetOrbitOptions} enabled={!!scientificFrame} onChange={key=>setPlanetOrbitOptions(v=>({...v,[key]:!v[key]}))} onOverview={()=>{setScope('solar');setSolarTab('zones');setSelected('planetary');setCameraView('oblique');setHeightScale(1);setLayers(v=>({...v,planetary:true}));setResetCount(n=>n+1);}} onEdge={()=>{setScope('solar');setSolarTab('zones');setSelected('planetary');setCameraView('edge');setHeightScale(1);setShowPlane(true);setLayers(v=>({...v,planetary:true}));setResetCount(n=>n+1);}}/>
          <MacroMotionPanel frame={scientificFrame} date={displayDate} time={timeControls} onFocus={id=>focusIntegrated(primaryTarget(id))}/>
          <AppearanceAuditPanel/>
          <MacroPrimaryPanel autoReveal={learningIndex===null} active={primaryId(integratedTarget)} frame={scientificFrame} date={displayDate} time={timeControls} onFocus={id=>focusIntegrated(primaryTarget(id))} onFamily={focusFamily} familiesEnabled={stageFlags.families}/>
          <section className="panorama-families panorama-distances"><h3>尺度与距离 · 空间有多空旷？</h3><p>把两颗天体的大小和真实距离放在同一把尺上，再对照八大行星的真实距离与全景压缩方式。</p><button disabled={!scientificFrame||timeControls.loading||!!timeControls.error} onClick={()=>setDistanceComparisonOpen(true)}>打开尺度与距离比较</button>{(!scientificFrame||timeControls.loading||!!timeControls.error)&&<p>等待当前观测日期的有效历表；请先完成加载或返回真实太阳系模式。</p>}</section>
          <section className="panorama-families panorama-sizes"><h3>天体大小 · 用同一把尺比较</h3><p>全景球体经过放大，不宜直接比较。打开参考直径统一比例的双球窗口，选择太阳、行星或月球。</p><button onClick={()=>setSizeComparisonOpen(true)}>打开天体大小比较</button></section>
          <MacroEarthPanel options={earthAppearance} status={cloudStatus} enabled={!!scientificFrame} onClouds={()=>setEarthAppearance(v=>({...v,clouds:!v.clouds}))} onAtmosphere={()=>setEarthAppearance(v=>({...v,atmosphere:!v.atmosphere}))} onRetry={()=>setCloudRetry(v=>v+1)} onFocus={()=>focusIntegrated(primaryTarget('earth'))}/>
          <div className="panorama-members">
          {!stageFlags.structure&&!stageFlags.members&&<><h3>区域代表成员</h3><p>相关阶段尚未开启。可在阶段导览中开启“宏观结构”或“区域成员”，再查看已接入成员。</p><button onClick={onOpenStages}>打开阶段导览</button></>}
        {scope==='solar' && panelTab==='integrated' && (stageFlags.structure||stageFlags.members) && <RegionMembers autoReveal={learningIndex===null} date={displayDate} onBinary={stageFlags.families?focusBinary:undefined} includeNewMembers={stageFlags.members} zone="all" selectedId={selectedMember} onSelect={chooseMember} onLocate={()=>setFocusRequest(v=>v+1)} onReturn={()=>{setSelectedMember(null);setRestoreRequest(v=>v+1);}} onRegion={()=>{const body=regionMemberById(selectedMember);if(body){setPanelTab('learn');setSolarTab('zones');setSelected(body.zone);setLayers(v=>({...v,[body.zone]:true}));setSelectedMember(null);setResetCount(v=>v+1);}}} frame={scientificFrame} batch={memberBatch} loading={dwarfData.loading||smallBodyData.loading||erisData.loading||patroclusData.loading} error={dwarfData.error||smallBodyData.error||erisData.error||patroclusData.error} onRetry={()=>{dwarfData.retry();smallBodyData.retry();erisData.retry();patroclusData.retry();}} time={timeControls}/>}
          </div>
          <section className="panorama-families panorama-comets" aria-label="全景彗星观察"><CometPanel onHistory={openHistory} scene={cometControls} frame={scientificFrame} batch={cometData.batch} loading={cometData.loading} error={cometData.error} onRetry={()=>{cometData.retry();setTrackRetry(n=>n+1);}} time={timeControls} showActivity={showActivity} onActivity={()=>setShowActivity(v=>!v)} trackError={trackError}/></section>
          {erisPanel}
          {erosShapePanel}
          {patroclusPanel}
          {smallRingPanel}
          <MacroFamilyPanel enabled={stageFlags.families} frame={scientificFrame} date={displayDate} states={familyStates} active={activeFamily} selected={selectedMoon} loading={familyData.loading} error={familyData.error} onRetry={familyData.retry} onFocus={focusFamily} onSelect={selectFamilyMoon} moons={layers.moons} rings={familyRings} enhanced={familyEnhanced} orbits={familyOrbits} onMoons={()=>setLayers(v=>({...v,moons:!v.moons}))} onRings={()=>setFamilyRings(v=>!v)} onEnhanced={()=>setFamilyEnhanced(v=>!v)} onOrbits={()=>setFamilyOrbits(v=>!v)} time={timeControls}/>
          {enceladusPanel}
          <MacroBinaryPanel options={binaryOptions} active={integratedTarget==='pluto-system'} date={displayDate} time={timeControls} loading={dwarfData.loading||plutoMoonsData.loading} error={dwarfData.error||plutoMoonsData.error} onRetry={()=>{dwarfData.retry();plutoMoonsData.retry();}} onSmallMoons={()=>{setBinarySmall(v=>!v);setBinarySelected(null);if(integratedTarget==='pluto-system')setIntegratedRequest(n=>n+1);}} onEnhanced={()=>setBinaryEnhanced(v=>!v)} onCenter={()=>setBinaryCenter(v=>!v)} onOrbits={()=>setBinaryOrbits(v=>!v)}/>
          <div className="panorama-choices">{INTEGRATED_ITEMS.map(item=><article key={item.id} data-panorama-phenomenon={item.id}><label><input type="checkbox" checked={integratedChoices[item.id]} disabled={!stageFlags[item.stage]} onChange={e=>setIntegratedChoices(v=>({...v,[item.id]:e.target.checked}))}/><strong>{item.title}</strong></label><small>{phenomenonStatus(item.id)}</small><p>{item.detail}</p>{item.id==='solar'&&<SolarLayersPanel parts={phenomenonParts} enabled={stageFlags.solarActivity&&integratedChoices.solar} onLesson={id=>{setPhenomenonParts(v=>solarLessonParts(v,id));focusIntegrated('sun');}} onActivities={()=>{setPhenomenonParts(v=>({...v,chromosphere:false,transition:false,sunspots:false,prominence:false,corona:true,flare:true,cme:true}));setIntegratedPlaying(false);setIntegratedProgress(.32);focusIntegrated('sun');}}/>}<div className="phenomenon-parts">{PHENOMENON_PARTS.filter(p=>p.group===item.id).map(part=><label key={part.id}><input type="checkbox" aria-label={part.name} checked={phenomenonParts[part.id]} disabled={!stageFlags[item.stage]||!integratedChoices[item.id]} onChange={e=>setPhenomenonParts(v=>({...v,[part.id]:e.target.checked}))}/>{part.name}</label>)}</div><button disabled={!stageFlags[item.stage]||(item.target==='earth'&&!scientificFrame)} onClick={()=>focusIntegrated(item.target,item.id)}>定位{item.id==='environment'?'地球环境':item.title}</button>{item.id==='environment'&&<button disabled={!stageFlags.environment||!scientificFrame} onClick={()=>chooseEnvironmentStep('jupiter-magnet')}>定位木星环境</button>}{item.id==='dust'&&<button disabled={!stageFlags.dustExplorer||!scientificFrame} onClick={()=>focusIntegrated('earth','dust')}>定位地球旁流星示例</button>}</article>)}</div>
          <div className="panorama-demo"><h3>现象示意进度</h3><p>默认暂停；仅控制耀斑、CME、太阳风来流、流星短迹与中性原子示例。不同现象没有因果或同日关联；真实观测日期与原太阳风动画仍独立控制。</p><input type="range" aria-label="全景现象进度" min="0" max="1" step=".001" value={integratedProgress} onChange={e=>{setIntegratedPlaying(false);setIntegratedProgress(Number(e.target.value));}}/><button aria-pressed={integratedPlaying} onClick={()=>setIntegratedPlaying(v=>!v)}>{integratedPlaying?'暂停现象示意':'播放现象示意'}</button><button onClick={()=>{setIntegratedPlaying(false);setIntegratedProgress(.32);}}>复位现象</button></div>
          <details className="panorama-reading"><summary>继续阅读独立详解与来源</summary><p>下面会打开单独的教学镜头；上方定位与开关始终留在当前全景。</p>{stageFlags.solarActivity&&<button onClick={onOpenSolarActivity}>太阳活动独立详解</button>}{(stageFlags.environment||stageFlags.nearEarth)&&<button onClick={onOpenEnvironment}>近地空间独立详解</button>}{stageFlags.dustExplorer&&<button onClick={onOpenDust}>尘埃与流星独立详解</button>}{stageFlags.heliosphereExplorer&&<button onClick={onOpenHeliosphere}>日球层独立详解</button>}<p>沿用各详解模块的 NASA 来源；本轮不增加历表目标、实测事件、粒子通量或模型预测。</p></details>
        </section>}
        {scope==='solar'&&<div className="stage-filter-note">已开启阶段：{STAGES.filter(s=>stageFlags[s.id]).map(s=>s.title.slice(5)).join('、')||'基础行星'}。<button onClick={onOpenStages}>按阶段控制与理解</button></div>}
        {scope==='solar'&&panelTab==='learn'&&stageFlags.families&&focusedFamily==='moons'&&<RingFamilies onOpen={onOpenFamily}/>}

        {scope === 'solar' && <section hidden={panelTab !== 'layers'} className="macro-layer-panel" aria-label="宏观图层">
          <SceneInventory onEnceladus={focusEnceladus} enceladusStatus={enceladusStatus} onErosShape={focusErosShape} erosShapeStatus={erosShapeStatus} onPatroclus={focusPatroclus} patroclusStatus={patroclusStatus} onEris={focusEris} erisStatus={erisStatus} onPluto={()=>{if(!stageFlags.families){onOpenStages();return;}setBinarySmall(true);focusBinary();requestAnimationFrame(()=>infoScroll.current?.querySelector('.panorama-binary')?.scrollIntoView({block:'start'}));}} plutoStatus={!stageFlags.families?'阶段 04 已隐藏':planetFocus?'专注行星中隐藏':!layers.moons?'卫星图层已关闭':plutoMoonsData.error?'历表加载失败 · 可重试':!plutoStates.length?'等待当前历表':!binarySmall?'已收起四颗小卫星':presenceText(sceneSnapshot,'pluto-small-moons')} smallRingsStatus={smallRingsStatus} onSmallRings={focusSmallRings} ringsStatus={!stageFlags.families?'阶段已隐藏':planetFocus?'专注中隐藏':!familyRings?'已关闭':!layers.planetary?'行星图层已关闭':!scientificFrame?'等待历表':presenceText(sceneSnapshot,'rings')} snapshot={sceneSnapshot} status={layerStatus} phenomenonStatus={phenomenonStatus} onLocate={locateLayer} onPhenomenon={id=>{const item=INTEGRATED_ITEMS.find(i=>i.id===id)!;if(!stageFlags[item.stage]){onOpenStages();return;}focusIntegrated(item.target,item.id);requestAnimationFrame(()=>infoScroll.current?.querySelector(`[data-panorama-phenomenon="${id}"]`)?.scrollIntoView({block:'start'}));}} onHistory={openHistory}/><h3>全景图层开关</h3><p>勾选后按当前尺度展开。靠近显示的图层保留选择，缩放时自动出现。</p>
          <div>
            <div className="macro-layer-options">{MACRO_LAYERS.map(layer => <label key={layer.id}>
              <input type="checkbox" checked={layers[layer.id]} onChange={e => setLayers(value => ({ ...value, [layer.id]: e.target.checked }))}/>
              <i style={{ background: layer.color }}/><span>{layer.id==='dwarfs'&&!stageFlags.members?'区域代表成员（2 个）':layer.name}<small>{layer.id==='dwarfs'&&!stageFlags.members?'谷神星与冥王星 · 其余十个成员已隐藏':layer.note}</small></span><em data-state={layerStatus(layer.id)}>{layerStatus(layer.id)}</em>
            </label>)}</div>
          </div>
          <button className="macro-animation" disabled={!effectiveLayers.wind} aria-pressed={animate && effectiveLayers.wind} onClick={() => setAnimate(v => !v)}>{!effectiveLayers.wind ? '太阳风展示已关闭' : animate ? '暂停太阳风示意' : '播放太阳风示意'}</button>
          <p>动画只控制太阳风示意，不改变观测日期。细节随镜头接近出现；天体大小、尾长和流动速度均作展示增强。</p>
          <p role="status">{!isEphemeris ? '当前为物理推演：宏观图隐藏实测天体，返回真实太阳系后可读取历表。' : !frame ? '行星历表读取中' : dwarfData.error ? `扩展历表未就绪：${dwarfData.error}` : dwarfData.loading ? '正在读取谷神星与冥王星历表…' : '行星、谷神星与冥王星：当前时刻历表位置'}</p>
          <p role="status">{cometData.error || (cometData.loading ? '正在读取三颗彗星历表…' : cometData.batch ? '哈雷、67P 与海尔—波普：当前时刻历表位置' : '彗星历表未启用')}</p>
          {cometData.error && <button onClick={cometData.retry}>重试彗星历表</button>}
          <p role="status">{smallBodyData.error || (smallBodyData.loading ? '正在读取区域小天体与海王星外成员历表…' : smallBodyData.batch ? '10 个扩展区域成员：当日历表位置' : '区域成员历表未启用')}</p>
          {smallBodyData.error && <button onClick={smallBodyData.retry}>重试区域成员历表</button>}
          {dwarfData.error && <button onClick={dwarfData.retry}>重试扩展历表</button>}

        </section>}
        {scope === 'solar' && <>          <section hidden={panelTab !== 'sources'} className="macro-source-panel"><h2>画面从哪里来</h2><p>绿色：历表位置；蓝色：观测支持的示意；紫色：模型推断。颜色用作分类，具体边界请看下方来源。</p>
            <p>哈雷、67P 与海尔—波普的位置、速度来自 NASA JPL Horizons，覆盖 2026—2027 年。统一采用 TDB 时间、J2000 黄道坐标与太阳系质心几何状态；展示时扣除同一时刻太阳的状态。</p>
            <p>位置每 6 小时采样，使用速度参与插值；以未发布的 3 小时间隔检查点验证。插值差异不等于真实轨道的不确定度，当前不提供测轨误差范围。</p>
            <p>两年亮线逐日连接真实历表位置，不是一整圈轨道；完整淡线由当前状态估算，是瞬时二体参考椭圆，不是未来预报。彗尾原理示例默认关闭。</p>
            <a href={publicAsset('/data/comets/manifest.json')} target="_blank" rel="noreferrer">查看彗星来源、解版本与插值验证</a>
            <a href="https://ssd.jpl.nasa.gov/horizons/manual.html" target="_blank" rel="noreferrer">JPL Horizons：历表计算说明</a>
            <p>灶神星、妊神星、鸟神星、阋神星、爱神星、阿喀琉斯、埃涅阿斯、女凯龙星、夸奥尔和塞德娜采用同一坐标与时间标准的 JPL 几何历表。球体、名称可点选；代表成员仅是样本，不表示整个区域的数量。三颗新增远方矮行星的卫星尚未展开。</p>
            <a href={publicAsset('/data/small-bodies/manifest.json')} target="_blank" rel="noreferrer">查看 10 个扩展成员的原始来源与误差检查</a>
            <p>旧版哈雷解 {HALLEY_SOURCE.solution} / JD {HALLEY_SOURCE.epochJdTdb} 根数保留用于原理示例（倾角 {HALLEY_ORBIT.i.toFixed(2)}°），不用于当前彗核定位。</p>
            <a href={publicAsset('/data/macro/halley-sbdb.json')} target="_blank" rel="noreferrer">查看原理示例的原始根数</a>
            <a href="https://science.nasa.gov/solar-system/comets/facts/" target="_blank" rel="noreferrer">NASA：彗发、尘埃尾与离子尾</a>
            <a href="https://science.nasa.gov/learn/heat/resource/components-of-the-heliosphere/" target="_blank" rel="noreferrer">NASA：太阳风与日球层分区</a>
            <p>90 / 120 AU 为边界量级示意，不是各方向上的固定距离。宏观谷神星与冥王星轨道由当前状态估计，不是未来历表路径。</p>
          </section></>}
        <div className="macro-learning-detail" hidden={scope === 'solar' && panelTab !== 'learn'}>
        {scope==='solar'&&panelTab==='learn'&&selectedMember==='eros'&&erosShapePanel}
        {scope==='solar'&&panelTab==='learn'&&selectedMember==='chariklo'&&smallRingPanel}
        {scope==='solar'&&panelTab==='learn'&&selectedMember==='eris'&&erisPanel}
        {scope==='solar'&&panelTab==='learn'&&selectedMember==='patroclus'&&patroclusPanel}
        {scope==='solar' && panelTab==='learn' && (stageFlags.structure||stageFlags.members) && <RegionMembers autoReveal={learningIndex===null} date={displayDate} onBinary={stageFlags.families?focusBinary:undefined} includeNewMembers={stageFlags.members} zone={selected} family={focusedFamily} selectedId={selectedMember} onSelect={chooseMember} onLocate={()=>setFocusRequest(v=>v+1)} onReturn={()=>{setSelectedMember(null);setRestoreRequest(v=>v+1);}} onRegion={()=>{const body=regionMemberById(selectedMember);if(body){setSolarTab('zones');setSelected(body.zone);setLayers(v=>({...v,[body.zone]:true}));setSelectedMember(null);setResetCount(v=>v+1);}}} frame={scientificFrame} batch={memberBatch} loading={dwarfData.loading||smallBodyData.loading||erisData.loading||patroclusData.loading} error={dwarfData.error||smallBodyData.error||erisData.error||patroclusData.error} onRetry={()=>{dwarfData.retry();smallBodyData.retry();erisData.retry();patroclusData.retry();}} time={timeControls}/>}
        {scope === 'solar' && <div className="macro-evidence-key"><span>历表位置</span><span>结构示意</span><span>模型推断</span></div>}
        {scope==='solar' && panelTab==='learn' && stageFlags.comets && solarTab==='families' && familyId==='comets' && <CometPanel onHistory={openHistory} scene={cometControls} frame={scientificFrame} batch={cometData.batch} loading={cometData.loading} error={cometData.error} onRetry={()=>{cometData.retry();setTrackRetry(n=>n+1);}} time={timeControls} showActivity={showActivity} onActivity={()=>setShowActivity(v=>!v)} trackError={trackError}/>}
        {scope === 'cosmic' ? <><div className="macro-info-eyebrow">{cosmic.english}</div><h2>{cosmic.name}</h2><p className="macro-info-lead">{cosmic.description}</p><div className="macro-visual-meaning"><span>画面符号</span><p>{cosmic.visualMeaning}</p></div><div className="macro-info-facts"><div><span>尺度</span><strong>{cosmicFacts[cosmicId][0]}</strong></div><div><span>关系</span><strong>{cosmicFacts[cosmicId][1]}</strong></div><div><span>画面性质</span><strong>概念结构图，非实测星图</strong></div></div><p className="macro-evidence">{cosmic.status}</p><a className="macro-source" href={cosmic.sourceUrl} target="_blank" rel="noreferrer">查看{cosmic.sourceLabel}<ArrowUpRight size={13}/></a>{cosmicId === 'neighbors' && <a className="macro-source macro-extra-source" href="https://science.nasa.gov/exoplanets/trappist1/" target="_blank" rel="noreferrer">NASA TRAPPIST-1 七行星资料<ArrowUpRight size={13}/></a>}{cosmicId === 'galaxies' && <a className="macro-source macro-extra-source" href="https://science.nasa.gov/image-detail/hubble-uncovers-a-celestial-fossil-2/" target="_blank" rel="noreferrer">NASA 大麦哲伦云距离资料<ArrowUpRight size={13}/></a>}<div className="macro-next"><span className="macro-info-eyebrow">RETURN TO OUR SYSTEM</span><button onClick={() => setScope('solar')}><Globe2 size={15}/>返回太阳系结构<ArrowUpRight size={13}/></button></div></> : solarTab === 'families' ? <><div className="macro-info-eyebrow">{family.english}</div><h2>{family.name}</h2><p className="macro-info-lead">{family.description}</p>{familyId==='dust'&&stageFlags.dustExplorer&&<div className="macro-next"><button onClick={onOpenDust}>展开尘埃与流星演示<ArrowUpRight size={13}/></button></div>}<div className="macro-visual-meaning"><span>画面符号</span><p>{family.visualMeaning}</p></div><div className="macro-info-facts"><div><span>运行关系</span><strong>{family.keyFact}</strong></div><div><span>当前接入</span><strong>{family.status}</strong></div></div><p className="macro-evidence">成员横跨不同区域，不能把此类对象的画面示意当成逐体实测位置。</p><a className="macro-source" href={family.sourceUrl} target="_blank" rel="noreferrer">查看{family.sourceLabel}<ArrowUpRight size={13}/></a><div className="macro-next"><span className="macro-info-eyebrow">EXPLORE AN EXAMPLE</span>{family.exampleId ? <button onClick={() => onExploreObject(family.exampleId!)}><Crosshair size={15}/>查看{family.exampleName}资料<ArrowUpRight size={13}/></button> : <button onClick={onObservePlanets}><Layers3 size={15}/>进入现有天体观测<ArrowUpRight size={13}/></button>}</div></> : <><div className="macro-info-eyebrow">{zone?.english ?? 'STRUCTURE OVERVIEW'}</div><h2>{zone?.name ?? '从盘到球的太阳系'}</h2>{selected==='heliosphere'&&stageFlags.heliosphereExplorer&&<div className="macro-next"><button onClick={onOpenHeliosphere}>展开日球层与星际空间<ArrowUpRight size={13}/></button></div>}<p className="macro-info-lead">{zone?.detail ?? '太阳系没有硬质外壳。中间的行星轨道接近薄盘；柯伊伯带是有厚度的环带，散射盘有高倾角成员，奥尔特云被推断为巨大球状壳层。请逐层点选并侧视观察，不能用一个画面比例看清所有尺度。'}</p><div className="macro-visual-meaning"><span>画面符号</span><p>{zoneVisualMeaning}</p></div><div className="macro-info-facts"><div><span>距太阳</span><strong>{zone?.range ?? '1–约 100,000 AU'}</strong></div><div><span>空间形态</span><strong>{zone?.shape ?? '多层结构，不是单一几何体'}</strong></div><div><span>证据级别</span><strong>{zone?.evidenceKind ?? '观测与模型并列'}</strong></div>{selected === 'planetary' && <div><span>最大黄道高度</span><strong>{highestPlanet ? `${highestPlanet.name} 约 ${highestPlanet.heightAu.toFixed(2)} AU（相对太阳）` : '历表加载中'}</strong></div>}</div><p className="macro-evidence">{zone?.evidence ?? '行星位置来自当期历表；外层点云、日球层轮廓与奥尔特云球壳仅说明已知或推测的区域形态。'}</p>{zone ? <a className="macro-source" href={zone.sourceUrl} target="_blank" rel="noreferrer">查看{zone.sourceLabel}<ArrowUpRight size={13}/></a> : <a className="macro-source" href="https://science.nasa.gov/solar-system/solar-system-facts/" target="_blank" rel="noreferrer">NASA 太阳系整体资料<ArrowUpRight size={13}/></a>}
        <div className="macro-next"><span className="macro-info-eyebrow">EXPLORE FURTHER</span>{selected === 'all' && <button onClick={() => { setSelected('planetary'); setCameraView('edge'); setHeightScale(10); setShowPlane(true); }}><Layers3 size={15}/>侧视纵向差异（×10 示意）</button>}{selected === 'all' && <button onClick={() => { setSelected('oort'); setCameraView('edge'); setShowPlane(false); }}><Globe2 size={15}/>看外层球状结构（模型）</button>}{selected === 'planetary' || selected === 'all' ? <button onClick={onObservePlanets}><Orbit size={15}/>进入真实行星观测<ArrowUpRight size={13}/></button> : selected === 'asteroid' || selected === 'kuiper' || selected === 'scattered' ? <button onClick={() => onExploreObject(selected === 'asteroid' ? 'ceres' : selected === 'kuiper' ? 'pluto' : 'eris')}><Crosshair size={15}/>查看已收录的代表天体<ArrowUpRight size={13}/></button> : selected === 'oort' ? <button onClick={() => { setSolarTab('families'); setFamilyId('comets'); }}><Sparkles size={15}/>了解彗星与外层冰质天体<ArrowUpRight size={13}/></button> : <p>日球层是太阳风影响区；流动粒子说明太阳风向外传播；终止激波与日球层顶之间是日鞘，边界随方向与时间变化。动画不代表实测速度或等离子体计算。</p>}</div></>}
        </div></div>
      </aside>
    </div>
    {distanceComparisonOpen&&<DistanceComparison frame={scientificFrame} onClose={()=>setDistanceComparisonOpen(false)}/>}
    {sizeComparisonOpen&&<SizeComparison onClose={()=>setSizeComparisonOpen(false)}/>}
    <HomeTimeControls date={displayDate} time={timeControls} onSpeed={onSpeedChange}/>
    <footer className="macro-footer"><Compass size={13}/>{scope === 'cosmic' ? 'AU 是太阳系内尺度；光年用于恒星和星系距离。不同镜头独立取景，画面尺寸、方位与点数不表示真实比例或实测位置；背景星点为绘制示意。' : '太阳系包含行星、卫星、矮行星、小天体、尘埃与太阳风。行星、12 个区域代表成员与三颗彗星采用历表位置；淡色椭圆是瞬时参考轨道。点云、可选双尾、风与边界是示意，奥尔特云是推断；背景星点不是实测星位。'}</footer>
  </section>{showHistory&&<HistoricalVisitor onView={setHistoricalView} onViewport={setHistoricalViewport} onClose={()=>setShowHistory(false)}/>}</>;
}
