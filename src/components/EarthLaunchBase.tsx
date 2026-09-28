import { OperationsSceneGuide } from './OperationsSceneGuide';
import { DEFAULT_OPERATIONS_GUIDES } from '../launch/operationsGuides';
import { SatelliteMissionGuide } from './SatelliteMissionGuide';
import { useBoosterPlayback } from '../launch/useBoosterPlayback';
import { BoosterDescentPanel } from './BoosterDescentPanel';
import { boosterStage } from '../launch/boosterDescent';
import { FLIGHT_RUNNING_PHASES } from '../launch/flightTelemetry';
import { SatelliteDisposalControl, SatelliteDisposalPanel, disposalStatus } from './SatelliteDisposalPanel';
import { DISPOSAL_RUNNING } from '../launch/satelliteDisposal';
import { satelliteName, type SatellitePlan } from '../launch/satellitePlan';
import { FullFlightDemoPanel } from './FullFlightDemoPanel';
import { LifecycleControl, LifecyclePanel, lifecycleStatus } from './LifecyclePanel';
import { LIFE_RUNNING } from '../launch/satelliteLifecycle';
import { OperationsControl, OperationsPanel } from './OperationsPanel';
import { rotateEarth } from '../launch/ascent';
import { OPS_RUNNING } from '../launch/satelliteOperations';
import { ReentryPanel } from './ReentryPanel';
import { REENTRY_RUNNING } from '../launch/reentry';
import { DeorbitPanel } from './DeorbitPanel';
import { DEORBIT_RUNNING } from '../launch/deorbit';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ArrowLeft, ArrowUpRight, Globe2, MapPin, RotateCcw, Rocket, Sun } from 'lucide-react';
import type { StateFrame } from '../types';
import { bodyById } from '../data/catalog';
import { BASE_LOCATIONS, LAUNCH_EARTH, LAUNCH_MISSION, LAUNCH_SITE, LAUNCH_STEPS, type BaseLocation } from '../data/launchMission';
import { baseBasis, fixedToGeodetic, fixedToScene, geodeticToFixed, localToFixed, sceneDirectionToLocal, sceneToFixed, EARTH_POLAR_M } from '../launch/coordinates';
import { createBaseScene } from '../launch/baseScene';
import { createLaunchVehicle } from '../launch/vehicleModel';
import { BASELINE_VEHICLE, compileVehicle, deriveVehicle, loadVehicle, saveVehicle, sameVehicle, engineById, type VehicleConfig } from '../launch/vehicle';
import { VehicleAssembly } from './VehicleAssembly';
import { LaunchControl, flightTime, flightPhaseName } from './LaunchControl';
import { AscentControl } from './AscentControl';
import { OrbitControl } from './OrbitControl';
import { AvoidancePanel } from './AvoidancePanel';
import { AVOIDANCE_RUNNING } from '../launch/avoidance';
import { DeploymentControl, type MissionFocus } from './DeploymentControl';
import { FlightSavePanel } from './FlightSavePanel';
import { LaunchJourneyPanel } from './LaunchJourneyPanel';
import type { MissionRequest, MissionSummary } from '../launch/missionSummary';
import { FlightEnvironmentPanel } from './FlightEnvironmentPanel';
import { FlightPhenomenaPanel } from './FlightPhenomenaPanel';
import { currentPhenomenon, flightEnvironmentReading } from '../launch/flightPhenomena';
import { atmosphereLayer, DEFAULT_ENVIRONMENT, type SpaceObjectKind } from '../launch/flightEnvironment';
import { createAscentView } from '../launch/ascentView';
import { useLiftoff } from '../launch/useLiftoff';
import { FlightTelemetryPanel } from './FlightTelemetryPanel';
import { FlightForceReadout } from './FlightForceReadout';
import { createFlightForceView } from '../launch/flightForceView';
import { ignitionReading, telemetryNumber } from '../launch/flightTelemetry';
import { createLaunchEffects } from '../launch/launchEffects';
import { immersiveDate } from '../data/immersiveClock';
import { immersiveSunDirection } from '../data/immersiveViews';
import { referenceAttitude } from './referenceAttitude';
import { makePlanetMaterial } from './celestialMaterials';
import { createEarthEffects } from './earthEffects';
import { PanoramaTextureLoader, type TextureLoadItem } from './PanoramaTextureLoader';
import { publicAsset } from '../data/publicAsset';
import launchPlanUrl from '../../docs/EARTH-TO-ORBIT-PLAN.md?url';
import './EarthLaunchBase.css';

type BaseView = 'ground' | 'earth' | 'near' | 'vehicle';
type Details = 'mission' | 'vehicle' | 'sources';
type AssemblyPart = 'all' | 'booster' | 'upper' | 'payload';
interface Props { frame: StateFrame; onClose: () => void; active?: boolean; request?: MissionRequest; onMissionChange?: (mission: MissionSummary | null) => void }
interface Bridge { reset: () => void; retryTextures: () => void }

export function EarthLaunchBase({ frame, onClose, active = true, request, onMissionChange }: Props) {
  const root = useRef<HTMLElement>(null), host = useRef<HTMLDivElement>(null), bridge = useRef<Bridge | null>(null);
  const labels = useRef(new Map<string, HTMLButtonElement>());
  const [view, setView] = useState<BaseView>('ground'), [location, setLocation] = useState<BaseLocation>('pad');
  const [details, setDetails] = useState<Details>('mission'), [teachingLight, setTeachingLight] = useState(true);
  const [failure, setFailure] = useState(''), [revision, setRevision] = useState(0), [textures, setTextures] = useState<TextureLoadItem[]>([]);
  const [altitudeM, setAltitudeM] = useState(0);
  const [eyeLevel, setEyeLevel] = useState(false);
  const [initialSave] = useState(() => loadVehicle());
  const [draft, setDraft] = useState<VehicleConfig>(() => initialSave.kind === 'loaded' ? initialSave.value.draft : { ...BASELINE_VEHICLE });
  const [applied, setApplied] = useState<VehicleConfig>(() => initialSave.kind === 'loaded' ? initialSave.value.applied : { ...BASELINE_VEHICLE });
  const [lastSaved, setLastSaved] = useState({ draft, applied });
  const [configStatus, setConfigStatus] = useState(initialSave.kind === 'error' ? initialSave.message : initialSave.kind === 'loaded' ? '已恢复此浏览器保存的草稿与发射台配置。' : '');
  const [exploded, setExploded] = useState(false);
  const [assemblyPart, setAssemblyPart] = useState<AssemblyPart>('all');
  const [flightMode, setFlightMode] = useState(false), [checked, setChecked] = useState(false), [followRocket, setFollowRocket] = useState(true);
  const flight = useLiftoff(applied, frame.time, config => { setApplied(config); setDraft(config); });
  const [boosterFocus,setBoosterFocus]=useState(false);
  const boosterPlayback=useBoosterPlayback(flight.boosterRecord,boosterFocus),boosterSample=boosterPlayback.sample;
  const closeBooster=()=>{setBoosterFocus(false);boosterPlayback.follow();};
  const replayBooster=(restart=false)=>{flight.send({type:'pause',value:true});if(restart)boosterPlayback.restart();else boosterPlayback.toggle();};
  const [demoPlan, setDemoPlan] = useState<SatellitePlan>('unpowered');
  const displayVehicle = useMemo(() => flight.demo.active ? { ...BASELINE_VEHICLE, satellitePlan: flight.demo.plan } : applied, [flight.demo.active, flight.demo.plan, applied]);
  const [journeyPanel, setJourneyPanel] = useState(false);
  const [satelliteGuide,setSatelliteGuide]=useState(false);
  const [operationsGuides,setOperationsGuides]=useState(DEFAULT_OPERATIONS_GUIDES);
  const powerMarker=useRef<HTMLDivElement>(null),observationMarker=useRef<HTMLDivElement>(null),contactMarker=useRef<HTMLDivElement>(null);
  const openSatelliteGuide=()=>{closeBooster();flight.send({type:'pause',value:true});setSatelliteGuide(true);};
  const [phenomenaPanel, setPhenomenaPanel] = useState(false);
  const [avoidancePanel, setAvoidancePanel] = useState(false);
  const [operationsPanel, setOperationsPanel] = useState(false);
  const [reentryPanel, setReentryPanel] = useState(false);
  const [deorbitPanel, setDeorbitPanel] = useState(false);
  const [telemetryPanel, setTelemetryPanel] = useState(false);
  const [forceOverlay, setForceOverlay] = useState(false);
  const [savePanel, setSavePanel] = useState(false), [missionFocus, setMissionFocus] = useState<MissionFocus>('pair'), [cleanView, setCleanView] = useState(false);
  const focusMission = (focus: MissionFocus) => { closeBooster(); setMissionFocus(flight.state.operations ? 'satellite' : focus); setEnvironmentOverview(false); setEnvironmentPanel(false); setFollowRocket(true); };
  const immersiveMission = () => { focusMission('satellite'); setCleanView(true); setSavePanel(false); };
  const continueDeployment = () => { flight.send({ type: 'continue-deployment' }); focusMission('pair'); };
  const openSavePanel = () => { closeBooster(); flight.send({ type: 'pause', value: true }); setCleanView(false); setJourneyPanel(false); setPhenomenaPanel(false); setStep4Guide(false); setEnvironmentPanel(false); setSavePanel(true); };
  const saveFlight = () => { openSavePanel(); flight.send({ type: 'save' }); };
  const satelliteMarker = useRef<HTMLButtonElement>(null);
  const flightRef = useRef(flight); flightRef.current = flight;
  const [step4Guide, setStep4Guide] = useState(false), [environmentPanel, setEnvironmentPanel] = useState(false), [environmentOverview, setEnvironmentOverview] = useState(false);
  const [environmentOptions, setEnvironmentOptions] = useState({ ...DEFAULT_ENVIRONMENT }), [environmentKind, setEnvironmentKind] = useState<SpaceObjectKind | 'all'>('all');
  useEffect(() => { if (environmentPanel || savePanel || step4Guide) setPhenomenaPanel(false); }, [environmentPanel, savePanel, step4Guide]);
  useEffect(() => { if (environmentPanel || savePanel || step4Guide || phenomenaPanel || journeyPanel || cleanView) setTelemetryPanel(false); }, [environmentPanel, savePanel, step4Guide, phenomenaPanel, journeyPanel, cleanView]);
  const flightMarker = useRef<HTMLButtonElement>(null), boosterMarker = useRef<HTMLDivElement>(null);
  const periMarker = useRef<HTMLDivElement>(null), apoMarker = useRef<HTMLDivElement>(null);
  const ascentMode = !!flight.state.ascent, orbitMode = !!flight.state.orbit, deploymentMode = !!flight.state.deployment;
  const orbitOverview = () => { closeBooster(); setEnvironmentOverview(true); setEnvironmentPanel(false); };
  const continueOrbit = () => { flight.send({ type: 'continue-orbit' }); orbitOverview(); };
  const followFlight = () => { closeBooster(); if (flight.state.deployment) setMissionFocus(flight.state.operations ? 'satellite' : 'carrier'); setEnvironmentOverview(false); setFollowRocket(true); };
  const continueAscent = () => { setStep4Guide(false); flight.send({ type: 'continue-ascent' }); followFlight(); };
  const quickAscent = () => { setView('ground'); setLocation('pad'); setFlightMode(true); setStep4Guide(false); followFlight(); flight.send({ type: 'preview-ascent' }); };
  const flightLocked = flight.demo.active || flight.state.phase !== 'ready';
  const enterFlight = () => { setStep4Guide(false); setView('ground'); setLocation('pad'); setEyeLevel(false); setFlightMode(true); };
  const resetFlight = () => { closeBooster(); setOperationsPanel(false); setReentryPanel(false); setDeorbitPanel(false); setAvoidancePanel(false); setForceOverlay(false); setTelemetryPanel(false); setPhenomenaPanel(false); setCleanView(false); setMissionFocus('pair'); flight.reset(); setChecked(false); setEnvironmentOverview(false); setEnvironmentPanel(false); };
  const openAssembly = () => { if (flightLocked) return; setFlightMode(false); setView('vehicle'); };
  const openJourney = () => { closeBooster(); flight.send({ type: 'pause', value: true }); setJourneyPanel(true); setPhenomenaPanel(false); setSavePanel(false); setStep4Guide(false); setEnvironmentPanel(false); setCleanView(false); };
  const openPhenomena = () => { closeBooster(); flight.send({ type: 'pause', value: true }); setPhenomenaPanel(true); setJourneyPanel(false); setSavePanel(false); setStep4Guide(false); setEnvironmentPanel(false); setCleanView(false); };
  const phenomenon = currentPhenomenon(flight.state);
  const environmentReading = flightEnvironmentReading(flight.state);
  const openAvoidance = () => { closeBooster(); setReentryPanel(false); setDeorbitPanel(false); setTelemetryPanel(false); setPhenomenaPanel(false); setJourneyPanel(false); setSavePanel(false); setStep4Guide(false); setEnvironmentPanel(false); setCleanView(false); setAvoidancePanel(true); if (!flight.state.deployment?.avoidance) flight.send({ type: 'analyze-avoidance' }); };
  useEffect(() => { if (telemetryPanel || phenomenaPanel || journeyPanel || savePanel || step4Guide || environmentPanel || cleanView) setAvoidancePanel(false); }, [telemetryPanel, phenomenaPanel, journeyPanel, savePanel, step4Guide, environmentPanel, cleanView]);
  const openDeorbit = () => { closeBooster(); setReentryPanel(false); setAvoidancePanel(false); setTelemetryPanel(false); setPhenomenaPanel(false); setJourneyPanel(false); setSavePanel(false); setStep4Guide(false); setEnvironmentPanel(false); setCleanView(false); setDeorbitPanel(true); if (!flight.state.deployment?.deorbit) flight.send({ type: 'analyze-deorbit' }); };
  useEffect(() => { if (telemetryPanel || phenomenaPanel || journeyPanel || savePanel || step4Guide || environmentPanel || cleanView) setDeorbitPanel(false); }, [telemetryPanel, phenomenaPanel, journeyPanel, savePanel, step4Guide, environmentPanel, cleanView]);
  const openReentry = () => { setDeorbitPanel(false); setAvoidancePanel(false); setTelemetryPanel(false); setPhenomenaPanel(false); setJourneyPanel(false); setSavePanel(false); setStep4Guide(false); setEnvironmentPanel(false); setCleanView(false); setReentryPanel(true); setEnvironmentOptions(v => ({ ...v, aerodynamic: true })); focusMission('carrier'); if (!flight.state.reentry) flight.send({ type: 'prepare-reentry' }); };
  useEffect(() => { if (telemetryPanel || phenomenaPanel || journeyPanel || savePanel || step4Guide || environmentPanel || cleanView) setReentryPanel(false); }, [telemetryPanel, phenomenaPanel, journeyPanel, savePanel, step4Guide, environmentPanel, cleanView]);
  const openOperations = () => { setReentryPanel(false); setDeorbitPanel(false); setAvoidancePanel(false); setTelemetryPanel(false); setPhenomenaPanel(false); setJourneyPanel(false); setSavePanel(false); setStep4Guide(false); setEnvironmentPanel(false); setCleanView(false); setForceOverlay(false); setTeachingLight(false); setEnvironmentOptions(v => ({ ...v, objects: false })); focusMission('satellite'); setOperationsPanel(true); if (!flight.state.operations) flight.send({ type: 'prepare-operations' }); };
  useEffect(() => { if (telemetryPanel || phenomenaPanel || journeyPanel || savePanel || step4Guide || environmentPanel || cleanView) setOperationsPanel(false); }, [telemetryPanel, phenomenaPanel, journeyPanel, savePanel, step4Guide, environmentPanel, cleanView]);
  const openMaintenance = () => { openOperations(); if (flight.state.satelliteEquipment) { if (!flight.state.satelliteDisposal) flight.send({type:'prepare-disposal'}); } else if (!flight.state.lifecycle) flight.send({type:'prepare-maintenance'}); };
  const openTelemetry = () => { closeBooster(); if (flight.state.operations) { openOperations(); return; } setPhenomenaPanel(false); setJourneyPanel(false); setSavePanel(false); setStep4Guide(false); setEnvironmentPanel(false); setCleanView(false); setTelemetryPanel(true); };
  const forceViewAvailable = !boosterFocus && !flight.state.operations && flightMode && followRocket && !environmentOverview && !cleanView && (!deploymentMode || missionFocus === 'carrier');
  const showForces = (value: boolean) => { setForceOverlay(value); if (value) { setCleanView(false); setView('ground'); setLocation('pad'); setEyeLevel(false); setFlightMode(true); followFlight(); } };
  const returnToOperation = () => { setJourneyPanel(false); enterFlight(); requestAnimationFrame(() => { const panel = root.current?.querySelector<HTMLElement>('.launch-sidebar'); panel?.scrollTo({top:0}); panel?.querySelector<HTMLButtonElement>('.launch-flight-actions button:not(:disabled)')?.focus(); }); };
  const editing = view === 'vehicle', appliedStats = deriveVehicle(displayVehicle), draftStats = deriveVehicle(draft);
  const dirty = !sameVehicle(draft, lastSaved.draft) || !sameVehicle(applied, lastSaved.applied);
  const updateDraft = (config: VehicleConfig) => { setDraft(config); setConfigStatus(''); };
  const persist = (nextApplied = applied) => {
    const result = saveVehicle(draft, nextApplied); setConfigStatus(result.message);
    if (result.ok) setLastSaved({ draft: { ...draft }, applied: { ...nextApplied } });
    return result;
  };
  const restore = () => {
    const result = loadVehicle();
    if (result.kind !== 'loaded') { setConfigStatus(result.message); return; }
    setDraft(result.value.draft); setApplied(result.value.applied); setLastSaved({ draft: result.value.draft, applied: result.value.applied });
    setConfigStatus('已读取保存的草稿与发射台配置。');
  };
  const applyVehicle = () => {
    const snapshot = compileVehicle(draft); setApplied(snapshot.config);
    const result = persist(snapshot.config);
    setConfigStatus(`配置已应用到发射台；尚未点火。${result.ok ? '同时已保存到此浏览器。' : result.message}`);
    setView('ground'); setLocation('pad'); setEyeLevel(false); setDetails('vehicle');
    setChecked(false);
  };
  const openBooster=()=>{setBoosterFocus(true);boosterPlayback.open();if(flight.boosterRecord?.status!=='flying')flight.send({type:'pause',value:true});setJourneyPanel(false);setSavePanel(false);setTelemetryPanel(false);setPhenomenaPanel(false);setReentryPanel(false);setOperationsPanel(false);setAvoidancePanel(false);setDeorbitPanel(false);setEnvironmentPanel(false);setStep4Guide(false);setCleanView(false);setForceOverlay(false);setEnvironmentOverview(false);setView('ground');setFlightMode(true);setFollowRocket(true);};
  useEffect(()=>{if(boosterFocus&&(journeyPanel||savePanel||telemetryPanel||phenomenaPanel||reentryPanel||operationsPanel||avoidancePanel||deorbitPanel||environmentPanel||step4Guide||cleanView)){setBoosterFocus(false);}},[boosterFocus,journeyPanel,savePanel,telemetryPanel,phenomenaPanel,reentryPanel,operationsPanel,avoidancePanel,deorbitPanel,environmentPanel,step4Guide,cleanView]);
  const latest = useRef({ boosterSample, operationsGuides, view, location, teachingLight, eyeLevel, draft, applied: displayVehicle, exploded, assemblyPart, flightMode, followRocket, environmentOptions, environmentOverview, environmentKind, missionFocus, forceOverlay, forceViewAvailable, avoidancePanel: boosterFocus || avoidancePanel || deorbitPanel || reentryPanel || operationsPanel }); latest.current = { boosterSample, operationsGuides, view, location, teachingLight, eyeLevel, draft, applied: displayVehicle, exploded, assemblyPart, flightMode, followRocket, environmentOptions, environmentOverview, environmentKind, missionFocus, forceOverlay, forceViewAvailable, avoidancePanel: boosterFocus || avoidancePanel || deorbitPanel || reentryPanel || operationsPanel };
  const demoUi = useRef<null | { view: BaseView; flightMode: boolean; missionFocus: MissionFocus; overview: boolean; light: boolean; location: BaseLocation; eyeLevel: boolean; followRocket: boolean; environmentOptions: typeof DEFAULT_ENVIRONMENT; cleanView: boolean; forceOverlay: boolean }>(null);
  const startDemo = () => { closeBooster();
    demoUi.current = { view, flightMode, missionFocus, overview: environmentOverview, light: teachingLight, location, eyeLevel, followRocket, environmentOptions, cleanView, forceOverlay };
    setJourneyPanel(false); setSavePanel(false); setTelemetryPanel(false); setPhenomenaPanel(false); setReentryPanel(false); setOperationsPanel(false); setAvoidancePanel(false); setDeorbitPanel(false); setStep4Guide(false); setEnvironmentPanel(false); setCleanView(false);
    setForceOverlay(false); setView('ground'); setLocation('pad'); setEyeLevel(false); setFlightMode(true); setFollowRocket(true); setEnvironmentOptions(v => ({ ...v, aerodynamic: true, objects: false }));
    flight.send({ type: 'demo-start', plan: demoPlan });
  };
  const navigateDemo = (command: {type:'demo-revisit';chapter:number}|{type:'demo-plan';plan:SatellitePlan}) => {
    setJourneyPanel(false); setSavePanel(false); setTelemetryPanel(false); setPhenomenaPanel(false); setReentryPanel(false); setOperationsPanel(false); setAvoidancePanel(false); setDeorbitPanel(false); setEnvironmentPanel(false); setStep4Guide(false); setCleanView(false); setForceOverlay(false);
    closeBooster(); flight.send(command);
  };
  const exitDemo = () => { closeBooster();
    flight.send({ type: 'demo-exit' }); setJourneyPanel(false); setTelemetryPanel(false); setOperationsPanel(false); setReentryPanel(false);
    const old = demoUi.current; if (old) { setView(old.view); setFlightMode(old.flightMode); setMissionFocus(old.missionFocus); setEnvironmentOverview(old.overview); setTeachingLight(old.light); setLocation(old.location); setEyeLevel(old.eyeLevel); setFollowRocket(old.followRocket); setEnvironmentOptions(old.environmentOptions); setCleanView(old.cleanView); setForceOverlay(old.forceOverlay); }
    demoUi.current = null;
  };
  useEffect(() => {
    if (!flight.demo.active || boosterFocus) return;
    const s = flight.state;
    setMissionFocus(s.operations ? 'satellite' : s.deployment && !s.reentry && !s.deployment.deorbit ? 'pair' : 'carrier');
    setEnvironmentOverview(s.phase === 'orbit-coast' || s.phase === 'reentry-coast' || s.phase === 'disposal-coast' || !!s.operations && !s.satelliteDisposal && !['ops-ready', 'ops-align', 'ops-power-ready', 'life-closing', 'life-retired', 'life-observed'].includes(s.phase));
    setTeachingLight(!s.operations); setFollowRocket(true);
  }, [flight.demo.active, flight.demo.chapter, flight.state.phase, boosterFocus]);
  const selected = BASE_LOCATIONS.find(p => p.id === location)!;
  const setBaseLocation = (next: BaseLocation) => { if (flightLocked) return; setFlightMode(false); setLocation(next); setView('ground'); setEyeLevel(false); };
  const textureErrors = textures.filter(t => t.status === 'error').length;

  useEffect(() => { setChecked(false); }, [applied]);
  useEffect(() => { if (active) root.current?.querySelector<HTMLButtonElement>('button')?.focus(); else flightRef.current.send({ type: 'pause', value: true }); }, [active]);
  useEffect(() => { if (!flight.restoredCount) return; closeBooster(); setOperationsPanel(false); setReentryPanel(false); setDeorbitPanel(false); setAvoidancePanel(false); setFlightMode(flight.state.phase !== 'ready'); setView('ground'); setStep4Guide(false); setEnvironmentPanel(false); setEnvironmentOverview(false); setMissionFocus(flight.state.operations ? 'satellite' : 'pair'); setCleanView(false); setTeachingLight(!flight.state.operations); if (flight.state.operations) setEnvironmentOptions(v => ({ ...v, objects: false })); }, [flight.restoredCount]);
  useEffect(() => { if (!active || !request) return; if (request.view === 'overview') { setFlightMode(true); setView('ground'); setCleanView(false); orbitOverview(); } else if (request.view === 'satellite' && flightRef.current.state.deployment?.released) { setFlightMode(true); setView('ground'); immersiveMission(); } }, [active, request]);
  useEffect(() => { const d = flight.state.deployment; onMissionChange?.(d ? { time: flight.state.time, baseTime: flight.baseTime, released: d.released, verified: d.verified, satelliteMassKg: d.satellite.massKg, altitudeKm: d.satellite.altitudeM / 1000 } : null); }, [active, flight.state.phase, flight.paused, flight.restoredCount]);
  useEffect(() => {
    const element = host.current; if (!element || !active) return;
    let renderer: THREE.WebGLRenderer;
    setFailure(''); setTextures([]);
    try { renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true }); }
    catch { setFailure('三维画面暂时无法启动。可以重建画面或返回观测。'); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
    element.appendChild(renderer.domElement); renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('aria-label', '发射基地三维画面：拖动旋转，滚轮缩放，方向键转动，加减键缩放');
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(44, 1, .3, 26000);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = .09; controls.enablePan = false; controls.rotateSpeed = .5;
    const base = createBaseScene(); scene.add(base.root);
    const exhaust = createLaunchEffects(); base.root.add(exhaust.root);
    const forceView = createFlightForceView(); scene.add(forceView.root);
    const workshop = new THREE.Group(), workshopVehicle = createLaunchVehicle(); workshop.add(workshopVehicle.root); scene.add(workshop);
    const workshopFloor = new THREE.Mesh(new THREE.CircleGeometry(52, 96), new THREE.MeshStandardMaterial({ color: '#1a303b', roughness: .85 }));
    workshopFloor.rotation.x = -Math.PI / 2; workshopFloor.position.y = -1; workshop.add(workshopFloor);
    const grid = new THREE.GridHelper(100, 20, '#345863', '#233f4b'); grid.position.y = -.98; workshop.add(grid);
    const studioFill = new THREE.HemisphereLight('#c2def0', '#3c4550', 2.5), studioKey = new THREE.DirectionalLight('#ffe2b5', 3), studioRim = new THREE.DirectionalLight('#80c8ff', 2);
    studioKey.position.set(30, 70, 50); studioRim.position.set(-40, 55, -35); workshop.add(studioFill, studioKey, studioRim);
    const reflections = new THREE.PMREMGenerator(renderer);
    let environmentMap: THREE.WebGLRenderTarget | undefined;
    let environmentLight: boolean | undefined;
    const earthRoot = new THREE.Group(), globeGroup = new THREE.Group(); earthRoot.add(globeGroup); scene.add(earthRoot);
    globeGroup.quaternion.copy(referenceAttitude(bodyById.earth, frame.time));
    let baseTextureItems: TextureLoadItem[] = [], ascentTextureItems: TextureLoadItem[] = [];
    const loader = new PanoramaTextureLoader(items => { baseTextureItems = items; setTextures([...baseTextureItems, ...ascentTextureItems]); });
    const ascentLoader = new PanoramaTextureLoader(items => { ascentTextureItems = items; setTextures([...baseTextureItems, ...ascentTextureItems]); });
    const material = makePlanetMaterial(bodyById.earth, loader);
    material.uniforms.presentationLight.value = .25;
    const ascentView = createAscentView(ascentLoader); scene.add(ascentView.root); ascentView.root.visible = false;
    const sunlight = immersiveSunDirection(frame, 'earth'); material.uniforms.sunDirection.value.copy(sunlight);
    const geometry = new THREE.SphereGeometry(1, 160, 96), position = geometry.getAttribute('position');
    // Geodetic latitudes follow the bundled equirectangular map; model is a WGS84 ellipsoid.
    const flattening = 1 / LAUNCH_EARTH.inverseFlattening, e2 = flattening * (2 - flattening);
    for (let i = 0; i < position.count; i++) {
      const y = position.getY(i), n = 1 / Math.sqrt(1 - e2 * y * y);
      position.setXYZ(i, position.getX(i) * n, y * n * (1 - e2), position.getZ(i) * n);
    }
    geometry.computeVertexNormals(); globeGroup.add(new THREE.Mesh(geometry, material));
    const effects = createEarthEffects(loader); globeGroup.add(effects.clouds, effects.atmosphere);
    for (const mesh of [effects.clouds, effects.atmosphere]) { mesh.scale.y = EARTH_POLAR_M / LAUNCH_EARTH.semiMajorM; mesh.material.uniforms.sunDirection.value.copy(sunlight); }
    const sitePosition = fixedToScene(geodeticToFixed({ ...LAUNCH_SITE, altitudeM: 18000 }), frame.time).divideScalar(LAUNCH_EARTH.semiMajorM);
    const surface = fixedToScene(geodeticToFixed(LAUNCH_SITE), frame.time).divideScalar(LAUNCH_EARTH.semiMajorM);
    const basis = baseBasis(), up = fixedToScene(basis.up, frame.time), south = fixedToScene(basis.south, frame.time), east = fixedToScene(basis.east, frame.time);
    // A fixed screen-size reticle locates the site; never draw it as another physical sphere.
    const locator = new THREE.Points(new THREE.BufferGeometry().setFromPoints([sitePosition]), new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false, transparent: true,
      vertexShader: 'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=12.;}',
      fragmentShader: 'void main(){vec2 p=gl_PointCoord-.5;float r=length(p);if(r>.48||(r<.30&&min(abs(p.x),abs(p.y))>.07))discard;gl_FragColor=vec4(1.,.81,.47,1.);}',
    })); earthRoot.add(locator);
    const sunLocal = sceneDirectionToLocal(sunlight, frame.time), teachingSun = new THREE.Vector3(-.65, .4, .55).normalize();
    const groundAnchors = new Map(BASE_LOCATIONS.filter(p => p.id !== 'overview').map(p => [p.id, new THREE.Vector3(...p.target).add(new THREE.Vector3(0, p.id === 'pad' ? 49 : 28, 0))]));
    let stopped = false, raf = 0, lastReadout = 0, currentView = latest.current.view, currentLocation = latest.current.location;
    let currentEyeLevel = latest.current.eyeLevel;
    let currentAssemblyPart = latest.current.assemblyPart;
    let currentDraft: VehicleConfig | undefined, currentApplied: VehicleConfig | undefined, currentExploded: boolean | undefined;
    let currentLight: boolean | undefined;
    let currentFlightMode = latest.current.flightMode, currentFollow = latest.current.followRocket, followedHeight = 0, lastFlightTime = NaN;
    let currentAscent = !!flightRef.current.state.ascent;
    let currentBoosterMode=false,currentBoosterPoint=false;
    let currentOverview = latest.current.environmentOverview, currentFocus = latest.current.missionFocus, currentLower = false;
    let viewOffsetX = 0, viewOffsetY = 0;
    const ground = () => latest.current.view === 'ground';
    const applyPose = () => {
      const v = latest.current.view, selection = BASE_LOCATIONS.find(p => p.id === latest.current.location)!;
      base.root.visible = v === 'ground'; earthRoot.visible = v === 'earth' || v === 'near'; workshop.visible = v === 'vehicle';
      if (v === 'vehicle') {
        scene.background = new THREE.Color('#0c1923'); scene.fog = new THREE.Fog('#0c1923', 130, 400);
        camera.up.set(0, 1, 0); camera.near = .1; camera.far = 600; controls.minDistance = 3; controls.maxDistance = 240; controls.maxPolarAngle = Math.PI * .7;
        controls.target.set(0, latest.current.exploded ? 39 : 30, 0); camera.position.copy(controls.target).add(latest.current.exploded ? new THREE.Vector3(65, 7, 105) : new THREE.Vector3(55, 6, 89));
        if (latest.current.assemblyPart === 'booster') { controls.target.set(0, 1.5, 0); camera.position.set(6, 2.1, 10); }
        if (latest.current.assemblyPart === 'upper') { controls.target.set(0, 50, 0); camera.position.set(16, 51, 28); }
        if (latest.current.assemblyPart === 'payload') { controls.target.set(0, 69, 0); camera.position.set(-4.5, 71, 8); }
      } else if (v === 'ground') {
        camera.up.set(0, 1, 0); camera.near = 1; camera.far = 26000; controls.minDistance = 25; controls.maxDistance = 1400; controls.maxPolarAngle = Math.PI * .78;
        controls.target.set(...selection.target);
        const portraitPad = camera.aspect < .85 && selection.id === 'pad';
        const offset = portraitPad ? new THREE.Vector3(100, 45, 160) : new THREE.Vector3(...selection.offset).multiplyScalar(Math.max(1, 1 / camera.aspect));
        camera.position.copy(controls.target).add(offset);
        if (selection.id === 'pad' && latest.current.eyeLevel) camera.position.set(-55, 2.2, 105);
        if (latest.current.flightMode && !flightRef.current.state.ascent) {
          const height = latest.current.followRocket ? flightRef.current.state.heightM : 0;
          controls.target.set(0, latest.current.followRocket ? 38 + height : 95, 0);
          camera.position.copy(controls.target).add(latest.current.followRocket ? new THREE.Vector3(115, 28, 170) : new THREE.Vector3(240, 30, 340));
          followedHeight = height;
        }
        if (latest.current.flightMode && flightRef.current.state.ascent) {
          camera.near = .5; camera.far = 55000000; controls.minDistance = 45; controls.maxDistance = 32000000; controls.maxPolarAngle = Math.PI;
          controls.target.set(0, 30, 0); const distance = Math.max(1200, flightRef.current.state.ascent.altitudeM * 2);
          camera.position.copy(controls.target).add(latest.current.followRocket ? new THREE.Vector3(115, 28, 170) : new THREE.Vector3(distance * .6, distance * .2, distance));
          if (flightRef.current.state.deployment && !latest.current.environmentOverview) {
            const focus = latest.current.missionFocus, d = flightRef.current.state.deployment!;
            const distance = focus === 'pair' ? Math.max(90, d.separationM * 1.6) : focus === 'satellite' ? 9 : 60;
            controls.minDistance = focus === 'satellite' ? 2 : 8; controls.target.set(0, 0, 0);
            camera.position.set(distance * .8, distance * .25, distance);
            if (flightRef.current.state.reentry?.lower && !flightRef.current.state.operations && focus === 'carrier' || flightRef.current.state.satelliteDisposal?.entryAt && focus === 'satellite') {
              const b = baseBasis(), here = baseBasis(fixedToGeodetic(new THREE.Vector3(...flightRef.current.state.ascent!.fixedPosition)));
              const local = (v: THREE.Vector3) => new THREE.Vector3(v.dot(b.east), v.dot(b.up), v.dot(b.south));
              camera.up.copy(local(here.up)); controls.maxPolarAngle = Math.PI * .49;
              camera.position.copy(local(here.up).multiplyScalar(28)).addScaledVector(local(here.east), 36).addScaledVector(local(here.south), 48);
            }
          }
          if (latest.current.environmentOverview) {
            const basis = baseBasis(), earthLocal = new THREE.Vector3(-basis.origin.dot(basis.east), -basis.origin.dot(basis.up), -basis.origin.dot(basis.south));
            controls.target.copy(earthLocal);
            // The frame update below translates to the exact moving Earth centre.
            camera.position.copy(controls.target).add(new THREE.Vector3(.3, 3.3, 1.4).multiplyScalar(LAUNCH_EARTH.semiMajorM * Math.max(1, 1 / camera.aspect)));
            const o = flightRef.current.state.operations;
            if (o) {
              const fixedSun = new THREE.Vector3(...rotateEarth(o.sunDirection, -flightRef.current.state.time));
              const light = new THREE.Vector3(fixedSun.dot(basis.east), fixedSun.dot(basis.up), fixedSun.dot(basis.south)).normalize();
              // Face the current spacecraft hemisphere so explanatory links do not start hidden behind Earth.
              const fixed = new THREE.Vector3(...flightRef.current.state.deployment!.satellite.fixedPosition);
              const radial = new THREE.Vector3(fixed.dot(basis.east),fixed.dot(basis.up),fixed.dot(basis.south)).normalize();
              const tangent = new THREE.Vector3().crossVectors(radial,new THREE.Vector3(0,1,0));
              if(tangent.lengthSq()<1e-8)tangent.crossVectors(radial,new THREE.Vector3(1,0,0));
              const side = radial.clone().multiplyScalar(.9).addScaledVector(tangent.normalize(),.65).addScaledVector(light,.1).normalize();
              camera.position.copy(controls.target).addScaledVector(side, LAUNCH_EARTH.semiMajorM * 3.7 * Math.max(1, 1 / camera.aspect));
            }
            controls.minDistance = LAUNCH_EARTH.semiMajorM * 1.2;
          }
        }
        currentLight = undefined;
      } else {
        camera.near = .00003; camera.far = 30; controls.maxPolarAngle = Math.PI; scene.fog = null; scene.background = new THREE.Color('#030910');
        if (v === 'earth') {
          controls.target.set(0, 0, 0); camera.up.copy(fixedToScene(new THREE.Vector3(0, 0, 1), frame.time));
          camera.position.copy(up).multiplyScalar(3.4).addScaledVector(east, .4).multiplyScalar(Math.max(1, 1 / camera.aspect)); controls.minDistance = 1.2; controls.maxDistance = 8;
        } else {
          controls.target.copy(surface); camera.up.copy(up); camera.position.copy(surface).addScaledVector(up, .17).addScaledVector(south, .23).addScaledVector(east, .10);
          controls.minDistance = .08; controls.maxDistance = 2;
        }
      }
      const selectedBooster=latest.current.boosterSample;
      if(selectedBooster){const b=baseBasis(),here=baseBasis(fixedToGeodetic(new THREE.Vector3(...selectedBooster.fixedPosition)));const local=(v:THREE.Vector3)=>new THREE.Vector3(v.dot(b.east),v.dot(b.up),v.dot(b.south));camera.up.copy(local(here.up));camera.near=.2;camera.far=55000000;controls.target.set(0,0,0);controls.minDistance=selectedBooster.model==='entry'?8:45;controls.maxDistance=32000000;controls.maxPolarAngle=Math.PI*.49;const k=selectedBooster.model==='entry'?1:2.2;camera.position.copy(local(here.up).multiplyScalar(28*k)).addScaledVector(local(here.east),36*k).addScaledVector(local(here.south),48*k);}
      currentBoosterMode=!!selectedBooster;currentBoosterPoint=selectedBooster?.model==='entry';
      camera.updateProjectionMatrix(); controls.update();
      currentView = v; currentLocation = latest.current.location; currentEyeLevel = latest.current.eyeLevel; currentAssemblyPart = latest.current.assemblyPart;
      currentFlightMode = latest.current.flightMode; currentFollow = latest.current.followRocket; currentAscent = !!flightRef.current.state.ascent;
      currentOverview = latest.current.environmentOverview; currentFocus = latest.current.missionFocus;
      currentLower = (!!flightRef.current.state.reentry?.lower && !flightRef.current.state.operations || !!flightRef.current.state.satelliteDisposal?.entryAt);
    };
    const resize = () => { const w = element.clientWidth, h = element.clientHeight; if (!w || !h) return; renderer.setSize(w, h); camera.aspect = w / h; viewOffsetX = -1; applyPose(); };
    const observer = new ResizeObserver(resize); observer.observe(element); resize(); applyPose();
    bridge.current = { reset: applyPose, retryTextures: () => { loader.retryFailed(); ascentLoader.retryFailed(); } };
    const keyboard = (event: KeyboardEvent) => {
      const offset = camera.position.clone().sub(controls.target);
      if (event.key === '+' || event.key === '=' || event.key === '-') { event.preventDefault(); offset.multiplyScalar(event.key === '-' ? 1.12 : 1 / 1.12); }
      else if (event.key.startsWith('Arrow')) {
        event.preventDefault(); const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
        const axis = horizontal ? camera.up : new THREE.Vector3().crossVectors(camera.up, offset).normalize();
        offset.applyAxisAngle(axis, ['ArrowLeft', 'ArrowUp'].includes(event.key) ? .07 : -.07);
      } else return;
      offset.clampLength(controls.minDistance, controls.maxDistance); camera.position.copy(controls.target).add(offset); controls.update();
    };
    renderer.domElement.addEventListener('keydown', keyboard);
    let pointerStart = new THREE.Vector2();
    const down = (e: PointerEvent) => { pointerStart.set(e.clientX, e.clientY); };
    const pick = (e: PointerEvent) => {
      if (!ground() || latest.current.flightMode || Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect(); const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), camera);
      const hit = ray.intersectObject(base.root, true)[0]; let object: THREE.Object3D | null = hit?.object ?? null;
      while (object) { if (object.userData.baseLocation) { setLocation(object.userData.baseLocation); break; } object = object.parent; }
    };
    renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointerup', pick);
    const lost = (event: Event) => { event.preventDefault(); stopped = true; cancelAnimationFrame(raf); flightRef.current.send({ type: 'pause', value: true }); setFailure('三维画面连接中断，试飞已暂停；位置与时刻已保留。恢复画面后可继续模拟。'); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    const tick = (now: number) => {
      if (stopped) return; raf = requestAnimationFrame(tick); if (document.hidden) return;
      if (currentBoosterMode !== !!latest.current.boosterSample || currentBoosterPoint !== (latest.current.boosterSample?.model==='entry') || currentView !== latest.current.view || currentLocation !== latest.current.location || currentEyeLevel !== latest.current.eyeLevel || currentAssemblyPart !== latest.current.assemblyPart || (latest.current.view === 'vehicle' && currentExploded !== latest.current.exploded) || currentFlightMode !== latest.current.flightMode || currentFollow !== latest.current.followRocket || currentAscent !== !!flightRef.current.state.ascent || currentOverview !== latest.current.environmentOverview || currentFocus !== latest.current.missionFocus || currentLower !== ((!!flightRef.current.state.reentry?.lower && !flightRef.current.state.operations || !!flightRef.current.state.satelliteDisposal?.entryAt))) applyPose();
      if (currentDraft !== latest.current.draft || currentExploded !== latest.current.exploded) {
        workshopVehicle.update(latest.current.draft, latest.current.exploded, true);
        currentDraft = latest.current.draft; currentExploded = latest.current.exploded;
      }
      if (currentApplied !== latest.current.applied) { base.vehicle.update(latest.current.applied); currentApplied = latest.current.applied; renderer.shadowMap.needsUpdate = true; }
      // Shift the framing into the uncovered part of the canvas without changing object positions.
      const panelRect = latest.current.avoidancePanel ? root.current?.querySelector('.avoidance-panel,.booster-descent-panel')?.getBoundingClientRect() : undefined;
      const worldRect = element.getBoundingClientRect();
      const panelOverlap = panelRect && panelRect.left > worldRect.left + 260 ? Math.max(0, worldRect.right - panelRect.left + 16) : 0;
      const framingPair = !latest.current.boosterSample && !!flightRef.current.state.deployment && latest.current.missionFocus === 'pair' && !latest.current.environmentOverview;
      const titleRect = framingPair ? root.current?.querySelector('.launch-world-title')?.getBoundingClientRect() : undefined;
      const hudRect = framingPair ? root.current?.querySelector('.launch-hud')?.getBoundingClientRect() : undefined;
      const reserveTop = titleRect ? Math.max(0, titleRect.bottom - worldRect.top + 24) : 0;
      const reserveBottom = hudRect ? Math.max(0, worldRect.bottom - hudRect.top + 24) : 0;
      const offsetY = framingPair ? (reserveBottom - reserveTop) / 2 : 0;
      if (viewOffsetX !== panelOverlap / 2 || viewOffsetY !== offsetY) {
        viewOffsetX = panelOverlap / 2; viewOffsetY = offsetY;
        if (viewOffsetX || viewOffsetY) camera.setViewOffset(element.clientWidth, element.clientHeight, viewOffsetX, viewOffsetY, element.clientWidth, element.clientHeight);
        else camera.clearViewOffset();
      }
      const flightState = flightRef.current.state;
      let forceCenter = new THREE.Vector3(0, flightState.heightM + 38.1, 0);
      const showForceArrows = latest.current.forceOverlay && latest.current.forceViewAvailable;
      const inAscent = latest.current.flightMode && !!flightState.ascent;
      ascentView.root.visible = inAscent;
      base.setSkyVisible(!inAscent);
      if (inAscent) {
        const pose = ascentView.update(flightState, latest.current.applied, latest.current.teachingLight ? teachingSun : sunLocal, latest.current.environmentOptions, latest.current.environmentOverview, latest.current.environmentKind, latest.current.missionFocus, showForceArrows, latest.current.boosterSample, flightRef.current.boosterRecord?.samples, latest.current.operationsGuides);
        forceCenter = pose.center;
        base.root.position.copy(pose.origin).negate(); base.root.visible = !latest.current.boosterSample && !flightState.reentry && flightState.ascent!.altitudeM < 4000 && !latest.current.environmentOverview; base.vehicle.root.visible = false;
        exhaust.update(flightState, latest.current.applied, element.clientHeight * renderer.getPixelRatio(), true);
        base.updateLight(latest.current.teachingLight ? teachingSun : sunLocal, latest.current.teachingLight);
        earthRoot.visible = workshop.visible = false;
        const focus = !latest.current.boosterSample && latest.current.environmentOverview ? pose.planetCenter : pose.center;
        const delta = focus.clone().sub(controls.target); camera.position.add(delta); controls.target.copy(focus);
        if (!latest.current.boosterSample && flightState.deployment && latest.current.missionFocus === 'pair' && !latest.current.environmentOverview) {
          // Keep both centres framed as they drift apart, preserving the user's viewing direction and zoom-out.
          const halfVertical = THREE.MathUtils.degToRad(camera.fov / 2);
          const halfHorizontal = Math.atan(Math.tan(halfVertical) * Math.max(1, element.clientWidth - panelOverlap) / element.clientHeight);
          const availableVertical = Math.atan(Math.tan(halfVertical) * Math.max(200, element.clientHeight - reserveTop - reserveBottom) / element.clientHeight);
          const required = (flightState.deployment.separationM / 2 + 15) * 1.18 / Math.sin(Math.min(availableVertical, halfHorizontal));
          controls.minDistance = Math.max(8, required);
          const offset = camera.position.clone().sub(controls.target);
          if (offset.length() < required) camera.position.copy(controls.target).add(offset.setLength(required));
        }
        scene.background = !latest.current.boosterSample && latest.current.environmentOverview ? new THREE.Color('#030910') : pose.sky; scene.fog = null; scene.environment = null;
        camera.updateMatrixWorld();
        const occupied = [...(root.current?.querySelectorAll<HTMLElement>('.launch-world-title,.launch-views,.launch-scene-tools,.launch-environment-summary,.launch-hud,.launch-next-action,.flight-environment-panel,.flight-telemetry-panel,.flight-phenomena-panel,.launch-force-legend,.avoidance-panel,.booster-descent-panel,.operations-scene-guide') ?? [])].map(el => el.getBoundingClientRect());
        for (const [label, position] of [[flightMarker.current, pose.carrierCenter], [satelliteMarker.current, pose.satelliteCenter], [periMarker.current, pose.periCenter], [apoMarker.current, pose.apoCenter], [boosterMarker.current, pose.boosterCenter], [powerMarker.current, ascentView.operationAnchors.power], [observationMarker.current, ascentView.operationAnchors.observation], [contactMarker.current, ascentView.operationAnchors.contact]] as const) {
          if (!label) continue;
          const projected = position?.clone().project(camera), sight = position?.clone().sub(camera.position), toEarth = pose.planetCenter.clone().sub(camera.position);
          const along = sight ? toEarth.dot(sight.clone().normalize()) : -1;
          const occluded = sight && along > 0 && along < sight.length() && toEarth.lengthSq() - along ** 2 < (LAUNCH_EARTH.semiMajorM * .996) ** 2;
          const visible = !!projected && !occluded && projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < .94 && Math.abs(projected.y) < .88;
          if (projected) { label.style.left = `${(projected.x + 1) * element.clientWidth / 2}px`; label.style.top = `${(1 - projected.y) * element.clientHeight / 2}px`; }
          let rect = label.getBoundingClientRect();
          const overlaps = (box:DOMRect) => occupied.some(r => box.left < r.right + 5 && box.right > r.left - 5 && box.top < r.bottom + 5 && box.bottom > r.top - 5);
          let covered = overlaps(rect);
          // Keep the short numbered captions readable beside the spacecraft's larger click target.
          if(visible&&covered&&projected&&label.classList.contains('launch-operation-marker')) {
            const y=(1-projected.y)*element.clientHeight/2;
            for(const dy of [28,-28,56,-56]) {
              label.style.top=`${y+dy}px`;rect=label.getBoundingClientRect();
              covered=overlaps(rect)||rect.top<worldRect.top+10||rect.bottom>worldRect.bottom-10;
              if(!covered)break;
            }
          }
          label.style.visibility = visible && !covered ? 'visible' : 'hidden';
          if (visible && !covered) occupied.push(rect);
        }
        if (lastFlightTime !== flightState.time) { renderer.shadowMap.needsUpdate = true; lastFlightTime = flightState.time; }
      } else {
      base.root.position.set(0, 0, 0); base.vehicle.root.visible = true;
      base.setLaunchPose(flightState.heightM, flightState.released, flightState.phase === 'ready' ? 0 : Math.max(0, Math.min(1, (flightState.time + 10) / 3)));
      exhaust.update(latest.current.flightMode ? flightState : null, latest.current.applied, element.clientHeight * renderer.getPixelRatio());
      if (latest.current.flightMode && latest.current.followRocket) {
        const dy = flightState.heightM - followedHeight; controls.target.y += dy; camera.position.y += dy; followedHeight = flightState.heightM;
      }
      if (lastFlightTime !== flightState.time) { renderer.shadowMap.needsUpdate = true; lastFlightTime = flightState.time; }
      }
      controls.update();
      forceView.update(flightState, forceCenter, camera, showForceArrows);
      if (inAscent) { /* Camera and background share the moving render origin. */ } else if (ground()) {
        camera.position.y = Math.max(2, camera.position.y);
        if (currentLight !== latest.current.teachingLight) {
          const fog = base.updateLight(latest.current.teachingLight ? teachingSun : sunLocal, latest.current.teachingLight);
          if (environmentLight !== latest.current.teachingLight) {
            environmentMap?.dispose(); environmentMap = reflections.fromScene(base.environment, .06, .1, 26000);
            environmentLight = latest.current.teachingLight;
          }
          scene.environment = environmentMap?.texture ?? null; scene.environmentIntensity = .38;
          scene.background = fog; scene.fog = new THREE.Fog(fog, 450, 6500); renderer.shadowMap.needsUpdate = true; currentLight = latest.current.teachingLight;
        }
      } else if (latest.current.view === 'vehicle') { camera.position.y = Math.max(2, camera.position.y); }
      else if (camera.position.length() < 1.012) { camera.position.setLength(1.012); }
      camera.updateMatrixWorld(); locator.visible = !ground() && camera.position.clone().sub(sitePosition).dot(up) > 0;
      const canvasRect = element.getBoundingClientRect();
      const avoid = [...(root.current?.querySelectorAll<HTMLElement>('.launch-world-title,.launch-views,.launch-scene-tools,.launch-hud,.launch-scene-footer') ?? [])].map(el => el.getBoundingClientRect());
      for (const [id, label] of labels.current) {
        const anchor = ground() ? groundAnchors.get(id as BaseLocation) : id === 'site' ? sitePosition : null;
        const ndc = anchor?.clone().project(camera);
        const x = ndc ? (ndc.x + 1) * element.clientWidth / 2 : 0, y = ndc ? (1 - ndc.y) * element.clientHeight / 2 : 0;
        const left = canvasRect.left + x - label.offsetWidth / 2, right = left + label.offsetWidth, bottom = canvasRect.top + y, top = bottom - label.offsetHeight;
        const covered = avoid.some(r => left < r.right + 5 && right > r.left - 5 && top < r.bottom + 5 && bottom > r.top - 5);
        const visible = latest.current.view !== 'vehicle' && !covered && ndc && ndc.z > -1 && ndc.z < 1 && Math.abs(ndc.x) < .9 && Math.abs(ndc.y) < .85 && (ground() || camera.position.clone().sub(sitePosition).dot(up) > 0);
        label.style.visibility = visible ? 'visible' : 'hidden';
        if (ndc) { label.style.left = `${x}px`; label.style.top = `${y}px`; }
      }
      renderer.render(scene, camera);
      if (now - lastReadout > 250 && latest.current.view !== 'vehicle' && !inAscent) {
        const fixed = ground() ? localToFixed(camera.position) : sceneToFixed(camera.position.clone().multiplyScalar(LAUNCH_EARTH.semiMajorM), frame.time);
        setAltitudeM(fixedToGeodetic(fixed).altitudeM); lastReadout = now;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true; cancelAnimationFrame(raf); observer.disconnect(); controls.dispose(); loader.dispose(); ascentLoader.dispose(); bridge.current = null;
      renderer.domElement.removeEventListener('keydown', keyboard); renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointerup', pick); renderer.domElement.removeEventListener('webglcontextlost', lost);
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(ascentView.operationMaterials), maps = new Set<THREE.Texture>();
      scene.traverse(object => {
        const mesh = object as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry);
        if (mesh.material) for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(mat);
        if (object instanceof THREE.Light && 'shadow' in object) (object.shadow as THREE.LightShadow | undefined)?.dispose();
      });
      for (const mat of materials) {
        mat.userData.disposed = true;
        for (const value of Object.values(mat)) if (value instanceof THREE.Texture) maps.add(value);
        for (const uniform of Object.values((mat as THREE.ShaderMaterial).uniforms ?? {})) if (uniform.value instanceof THREE.Texture) maps.add(uniform.value);
        mat.dispose();
      }
      maps.forEach(map => map.dispose()); geometries.forEach(g => g.dispose()); environmentMap?.dispose(); reflections.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [frame, revision, active]);

  return <section hidden={!active} className={`${cleanView ? 'launch-clean' : ''} launch-base ${editing ? 'launch-assembly-mode' : ''} ${flightMode ? 'launch-flight-mode' : ''}`} ref={root} role="dialog" aria-modal="true" aria-labelledby="launch-base-title" onKeyDown={event => {
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); if (operationsPanel) setOperationsPanel(false); else if (reentryPanel) setReentryPanel(false); else if (deorbitPanel) setDeorbitPanel(false); else if (avoidancePanel) setAvoidancePanel(false); else if (telemetryPanel) setTelemetryPanel(false); else if (phenomenaPanel) setPhenomenaPanel(false); else if (journeyPanel) setJourneyPanel(false); else if (step4Guide) setStep4Guide(false); else if (savePanel) setSavePanel(false); else if (environmentPanel) setEnvironmentPanel(false); else if (cleanView) setCleanView(false); else onClose(); }
    if (event.key === 'Tab') {
      const items = [...(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), select, input, a[href], summary, canvas[tabindex="0"]') ?? [])].filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }} onKeyUp={event => event.stopPropagation()}>
    <header className="launch-header"><button onClick={onClose}><ArrowLeft size={15}/>{flightLocked ? '返回太阳系 · 保留任务' : '返回观测'}</button><div><span>ORBIT / EARTH LAUNCH PROGRAM</span><h1 id="launch-base-title">从地球启航</h1></div>{!flight.demo.active && <label className="launch-demo-choice">演示方案<select aria-label="全程演示的卫星方案" value={demoPlan} onChange={e=>setDemoPlan(e.target.value as SatellitePlan)}><option value="unpowered">E01 · 无推进留轨</option><option value="powered">E02 · 动力离轨</option></select></label>}<button className="launch-demo-entry" disabled={!flight.ready || !!failure || !!flight.error} onClick={flight.demo.finished ? openJourney : flight.demo.active ? () => flight.send({type:'pause',value:!flight.demo.paused}) : startDemo}>{flight.demo.finished ? '演示结束 · 查看结果' : flight.demo.active ? flight.demo.paused ? '继续全程演示' : '暂停全程演示' : '▶ 从头到尾演示'}</button><button disabled={flight.demo.active} title={flight.demo.active ? '演示使用临时任务；退出后再保存原任务' : undefined} aria-expanded={savePanel} onClick={() => savePanel ? setSavePanel(false) : openSavePanel()}>飞行存档</button>{deploymentMode && <button onClick={() => setCleanView(v => !v)}>{cleanView ? '显示任务面板' : '沉浸画面'}</button>}<button disabled={flight.demo.active} className="launch-step4-entry" onClick={() => ascentMode ? setEnvironmentPanel(true) : setStep4Guide(true)}>{ascentMode ? '飞行环境与说明' : '04 上升与分级 →'}</button></header>
    {savePanel && <div className="launch-save-backdrop" aria-hidden="true"/>}
    {savePanel && <FlightSavePanel ready={flight.ready} paused={flight.paused} time={flight.state.time} phase={flightPhaseName(flight.state)} saved={flight.saved} status={flight.storageStatus} onSave={saveFlight} onRestore={raw => flight.send({ type: 'restore', raw })} onClose={() => setSavePanel(false)}/>}
    {journeyPanel && <LaunchJourneyPanel booster={flight.boosterRecord} state={flight.state} ready={!flight.demo.active && flight.ready && !failure} error={flight.error || failure} onClose={() => setJourneyPanel(false)} onCurrent={returnToOperation} onAssembly={() => { setJourneyPanel(false); openAssembly(); }} onSave={openSavePanel}/>}
    {phenomenaPanel && <FlightPhenomenaPanel state={flight.state} record={flight.ascentRecord} options={environmentOptions} onChange={setEnvironmentOptions} onClose={() => setPhenomenaPanel(false)} onEnvironment={() => { setPhenomenaPanel(false); setEnvironmentPanel(true); }}/> }
    {telemetryPanel && <FlightTelemetryPanel state={flight.state} config={displayVehicle} ready={flight.ready && !flight.error && !failure} paused={flight.paused} forces={forceOverlay} forcesVisible={forceViewAvailable} onForces={showForces} onPause={() => flight.send({ type: 'pause', value: !flight.paused })} onClose={() => setTelemetryPanel(false)} onPhenomena={openPhenomena}/>}
    {operationsPanel && (flight.state.satelliteDisposal ? <SatelliteDisposalPanel state={flight.state} onClose={()=>setOperationsPanel(false)} onSatellite={()=>focusMission('satellite')} onOverview={orbitOverview}/> : flight.state.lifecycle ? <LifecyclePanel state={flight.state} paused={flight.paused} onClose={() => setOperationsPanel(false)} onSatellite={() => focusMission('satellite')} onOverview={orbitOverview}/> : <OperationsPanel onGuide={openSatelliteGuide} state={flight.state} paused={flight.paused} onClose={() => setOperationsPanel(false)} onSatellite={() => focusMission('satellite')} onOverview={orbitOverview}/>)}
    {reentryPanel && !flight.state.operations && deploymentMode && <ReentryPanel onOperations={openOperations} state={flight.state} paused={flight.paused} rate={flight.rate} ready={flight.ready && !flight.error && !failure} effects={environmentOptions.aerodynamic} onEffects={value => setEnvironmentOptions(v => ({ ...v, aerodynamic: value }))} send={flight.send} onClose={() => setReentryPanel(false)} onCarrier={() => focusMission('carrier')} onSatellite={() => focusMission('satellite')} onOverview={orbitOverview}/>}
    {deorbitPanel && deploymentMode && <DeorbitPanel onReentry={openReentry} state={flight.state} paused={flight.paused} rate={flight.rate} ready={flight.ready && !flight.error && !failure} send={flight.send} onClose={() => setDeorbitPanel(false)} onCarrier={() => focusMission('carrier')} onOverview={orbitOverview}/>}
    {avoidancePanel && deploymentMode && <AvoidancePanel onDeorbit={openDeorbit} state={flight.state} paused={flight.paused} rate={flight.rate} ready={flight.ready && !flight.error && !failure} send={flight.send} onClose={() => setAvoidancePanel(false)} onCarrier={() => focusMission('carrier')} onPair={() => focusMission('pair')} onOverview={orbitOverview}/>}
    <div className="launch-layout">
      <aside className="launch-sidebar"><button className="launch-satellite-guide-entry" onClick={openSatelliteGuide}>卫星任务 · 用途与能力<small>做什么 · 怎么做 · 范围与限制</small></button>{flight.boosterRecord && <button className="launch-booster-entry" aria-pressed={boosterFocus} onClick={openBooster}>一级去向 · 跟随与回看 ↗<small>{flight.boosterRecord.status==='surface-reference'?'已记录到地表参考面':'分离后的独立运动与参数'}</small></button>}<button className="launch-journey-entry" aria-expanded={journeyPanel} onClick={openJourney}>任务总览与验收<span>阶段进度与本次结果 ↗</span></button><button className="launch-phenomena-entry" aria-expanded={phenomenaPanel} onClick={openPhenomena}>沿途现象 · 喷焰、空气与受热 ↗</button><button className="launch-telemetry-entry" aria-expanded={flight.state.operations ? operationsPanel : telemetryPanel} onClick={openTelemetry}>{flight.state.satelliteDisposal ? '卫星离轨与再入参数 ↗' : flight.state.lifecycle ? '维护与退役参数 ↗' : flight.state.operations ? '卫星工作参数 ↗' : '全程飞行参数 ↗'}<small>{flight.state.satelliteDisposal ? '轨道、燃料、空气与热流' : flight.state.lifecycle ? '能源维护、处置条件与在轨结果' : flight.state.operations ? '发电、电池、数据与通信窗口' : '运动、受力、空气、受热与燃料 · 可边飞边看'}</small></button>
        {flight.demo.active ? <FullFlightDemoPanel booster={flight.boosterRecord} busy={flight.demoPending} demo={flight.demo} state={flight.state} onPause={() => flight.send({type:'pause',value:!flight.demo.paused})} onSpeed={value => flight.send({type:'demo-speed',value})} onExit={exitDemo} onResults={openJourney} onRevisit={chapter=>navigateDemo({type:'demo-revisit',chapter})} onPlan={plan=>navigateDemo({type:'demo-plan',plan})}/> : flightMode && flight.state.satelliteDisposal ? <SatelliteDisposalControl state={flight.state} paused={flight.paused} ready={flight.ready && !failure} error={flight.error} rate={flight.rate} send={flight.send} onOpen={openOperations} onSatellite={()=>focusMission('satellite')} onOverview={orbitOverview} onSave={saveFlight} onReset={resetFlight} onResults={openJourney}/> : flightMode && flight.state.lifecycle ? <LifecycleControl state={flight.state} paused={flight.paused} rate={flight.rate} ready={flight.ready && !failure} error={flight.error} send={flight.send} onOpen={openOperations} onOverview={orbitOverview} onSatellite={() => focusMission('satellite')} onSave={saveFlight} onReset={resetFlight} onResults={openJourney}/> : flightMode && flight.state.operations ? <OperationsControl onGuide={openSatelliteGuide} onMaintenance={openMaintenance} state={flight.state} paused={flight.paused} rate={flight.rate} ready={flight.ready && !failure} error={flight.error} send={flight.send} onOpen={openOperations} onOverview={orbitOverview} onSatellite={() => focusMission('satellite')} onSave={saveFlight} onReset={resetFlight}/> : flightMode && deploymentMode ? <DeploymentControl onOperations={openOperations} onReentry={openReentry} onDeorbit={openDeorbit} onAnalysis={openAvoidance} state={flight.state} rate={flight.rate} paused={flight.paused} ready={flight.ready && !failure} error={flight.error || (failure ? '请先重建三维画面。' : '')} send={flight.send} onFocus={focusMission} onOverview={orbitOverview} onImmersive={immersiveMission} onSave={saveFlight} onReset={resetFlight}/> : flightMode && orbitMode ? <OrbitControl state={flight.state} rate={flight.rate} paused={flight.paused} ready={flight.ready && !failure} error={flight.error || (failure ? '请先重建三维画面。' : '')} onRate={value => flight.send({ type: 'rate', value })} onPause={() => flight.send({ type: 'pause', value: !flight.paused })} onCutoff={() => flight.send({ type: 'cutoff' })} onCoast={() => flight.send({ type: 'coast' })} onReset={resetFlight} onOverview={orbitOverview} onContinue={continueDeployment}/> : flightMode && ascentMode ? <AscentControl state={flight.state} rate={flight.rate} paused={flight.paused} ready={flight.ready && !failure} error={flight.error || (failure ? '请先重建三维画面。' : '')} onPause={() => flight.send({ type: 'pause', value: !flight.paused })} onRate={value => flight.send({ type: 'rate', value })} onSeparate={() => flight.send({ type: 'separate' })} onReset={resetFlight} onContinue={continueOrbit}/> : flightMode ? <LaunchControl config={displayVehicle} state={flight.state} paused={flight.paused} ready={flight.ready && !failure} error={flight.error || (failure ? '请先重建三维画面，再继续试飞。' : '')} checked={checked} onCheck={() => setChecked(true)} onStart={() => { flight.send({ type: 'pause', value: false }); flight.send({ type: 'start' }); }} onPause={() => flight.send({ type: 'pause', value: !flight.paused })} onCancel={() => flight.send({ type: 'cancel' })} onReset={resetFlight} onContinue={continueAscent}/> : editing ? <VehicleAssembly config={draft} onChange={updateDraft} onSave={() => persist()} onLoad={restore} onReset={() => { setDraft({ ...BASELINE_VEHICLE }); setConfigStatus('已恢复基准草稿，尚未覆盖保存或发射台配置。'); }} onApply={applyVehicle} status={configStatus} dirty={dirty}/> : <>
        <div className="launch-intro"><span className="launch-kicker">你的第一座航天基地</span><h2>{LAUNCH_SITE.name}</h2><p>探索从脚下的地球开始。认识发射场，准备把第一颗卫星送入轨道。</p></div>
        <nav className="launch-locations" aria-label="查看基地设施">{BASE_LOCATIONS.map((p, i) => <button key={p.id} onClick={() => setBaseLocation(p.id)} aria-pressed={view === 'ground' && location === p.id}><span>{i === 0 ? '↗' : `0${i}`}</span><span>{p.label}</span><ArrowUpRight size={14}/></button>)}</nav>
        <div className="launch-detail-tabs" role="group" aria-label="任务资料">{([['mission', '任务目标'], ['vehicle', '载具方案'], ['sources', '来源与边界']] as const).map(([id, label]) => <button key={id} aria-pressed={details === id} onClick={() => setDetails(id)}>{label}</button>)}</div>
        <div className="launch-details" aria-live="polite">
          {details === 'mission' && <><span className="launch-kicker">任务 {displayVehicle.satellitePlan==='powered'?'E02':'E01'} / 尚未开始飞行</span><h3>{LAUNCH_MISSION.name}</h3><dl><div><dt>目标轨道高度</dt><dd>400 <small>km</small></dd></div><div><dt>目标轨道倾角</dt><dd>28.5 <small>°</small></dd></div><div><dt>基准无人载荷</dt><dd>500 <small>kg</small></dd></div></dl><p>入轨标准：近地点和远地点都在 380–420 km，倾角误差不超过 1°；关机后完整绕地球一圈。当前可体验六步：地球基地、组装、点火、上升分级、入轨验证、释放卫星。各检查点会停下来，等你确认进入下一步；顶部可保存飞行。</p></>}
          {details === 'vehicle' && <><span className="launch-kicker">当前发射台配置 / {applied.satellitePlan === 'powered' ? 'E02' : 'E01'} / 未点火</span><h3>两级火箭 ＋ {appliedStats.payloadKg} kg 载荷</h3><dl><div><dt>箭体高度 / 直径</dt><dd>60 / 3.7 <small>m</small></dd></div><div><dt>整箭初始质量</dt><dd data-applied-mass>{(appliedStats.wetKg / 1000).toFixed(2)} <small>t</small></dd></div><div><dt>一级海平面推力</dt><dd>{(appliedStats.stages[0].thrustN / 1e6).toFixed(1)} <small>MN</small></dd></div><div><dt>估算起飞推重比</dt><dd>{appliedStats.twr.toFixed(2)}</dd></div></dl><p>{engineById(applied.boosterEngine).name} / {engineById(applied.upperEngine).name}。一级加注 {applied.boosterFillPercent}%，二级加注 {applied.upperFillPercent}%。</p><p>这些是教学参数，非真实火箭规格。配置已用于发射台、离台与上升分级计算；静态检查通过不等于已经能入轨。</p></>}
          {details === 'sources' && <><span className="launch-kicker">先区分实测与设定</span><h3>位置有依据，基地是教学场景</h3><p>{LAUNCH_SITE.description}地面局部采用米制平面，全球定位使用 WGS84 椭球。</p><p>地球朝向沿用现有 IAU 线性参考，未接入 UT1、极移及高精度地形；云图与大气效果非实时天气；地面天空、海岸与建筑也都是教学表现。</p><a href="https://www.nasa.gov/reference/launch-complex-39b/" target="_blank" rel="noreferrer">发射场设施参考 · NASA ↗</a><a href={LAUNCH_EARTH.source} target="_blank" rel="noreferrer">WGS84 参数来源 ↗</a><a href={publicAsset('/textures/sources.json')} target="_blank" rel="noreferrer">地球贴图来源 ↗</a><a href={launchPlanUrl} download="从地球启航六步规划.md">任务范围与验证约定 ↗</a></>}
        </div>
        {configStatus && <p className="launch-config-status" role="status">{configStatus}</p>}
        <div className="launch-next"><Rocket size={19}/><div><strong>第 2 步 · 组装你的载具</strong><p>选择发动机、加注量与载荷，检查参数后应用到发射台。</p></div><button onClick={openAssembly}>开始组装 →</button></div>
        <div className="launch-next"><Rocket size={19}/><div><strong>第 3 步 · 检查、点火与离台</strong><p>使用已应用配置开始试飞，上升约 150 m 后暂停查看。</p></div><button onClick={enterFlight}>准备发射 →</button></div>
        </>}
      </aside>
      <div className="launch-world">
        <div className="launch-canvas" ref={host}/>{!boosterFocus && ascentMode && !flight.state.operations && (!followRocket || environmentOverview || deploymentMode && missionFocus !== 'carrier') && <button ref={flightMarker} className="launch-ascent-marker" onClick={followFlight}>{flight.state.reentry?.lower ? '等效物体 · 地表参考下降' : deploymentMode ? '运载二级 · 靠近观察' : '运载火箭定位 · 靠近观察'}</button>}{!boosterFocus && deploymentMode && flight.state.deployment!.released && (environmentOverview || missionFocus !== 'satellite') && <button ref={satelliteMarker} className="launch-ascent-marker launch-satellite-marker" onClick={() => focusMission('satellite')}>{flight.state.satelliteDisposal ? `E02 · ${disposalStatus(flight.state)}` : flight.state.lifecycle?.mode === 'retired' ? 'E01 已退役 · 仍在轨' : `${satelliteName(flight.state)} 卫星 · 靠近观察`}</button>}
        {!boosterFocus && orbitMode && environmentOverview && <><div ref={periMarker} className="launch-apsis-marker">预测近地点 · {(flight.state.orbit!.elements.periapsisM / 1000).toFixed(1)} km</div>{flight.state.orbit!.elements.apoapsisM !== null && <div ref={apoMarker} className="launch-apsis-marker">预测远地点 · {(flight.state.orbit!.elements.apoapsisM! / 1000).toFixed(1)} km</div>}</>}
        {!boosterFocus && ascentMode && !flight.state.operations && !flight.state.reentry && flight.state.ascent!.detached && <div ref={boosterMarker} className="launch-booster-marker">本次分离一级 · 模拟位置</div>}
        {!boosterFocus && flightMode && flight.state.phase.startsWith('ops-') && <>
          {operationsGuides.power&&<div ref={powerMarker} className="launch-operation-marker power">01 · 对日方向（非距离）</div>}
          {operationsGuides.observation&&<div ref={observationMarker} className="launch-operation-marker observation">02 · 星下点方向</div>}
          {operationsGuides.contact&&<div ref={contactMarker} className="launch-operation-marker contact">03 · {flight.state.operations?.transmitting?'数据下传':'可见站 · 未下传'}</div>}
          {!cleanView&&!operationsPanel&&!journeyPanel&&!savePanel&&!environmentPanel&&!phenomenaPanel&&!telemetryPanel&&<OperationsSceneGuide state={flight.state} options={operationsGuides} onChange={setOperationsGuides} onGuide={openSatelliteGuide} onOverview={()=>{orbitOverview();requestAnimationFrame(()=>bridge.current?.reset());}} overview={environmentOverview}/>}
        </>}
        <nav className="launch-views" aria-label="地球与基地视角">{boosterSample ? <><button aria-pressed="true">一级 · {boosterPlayback.time===null?'当前记录':boosterPlayback.playing?'过程回放中':'历史回看'}</button><button onClick={closeBooster}>返回主任务画面</button></> : deploymentMode ? <>{([['pair', '二级与卫星'], ['carrier', '二级'], ['satellite', `${satelliteName(flight.state)} 卫星`]] as const).filter(([id]) => !flight.state.operations || id === 'satellite').map(([id, text]) => <button key={id} disabled={id === 'satellite' && !flight.state.deployment!.released} aria-pressed={!environmentOverview && missionFocus === id} onClick={() => focusMission(id)}>{text}</button>)}<button aria-pressed={environmentOverview} onClick={orbitOverview}>轨道全景</button>{cleanView && <button disabled={!flight.ready || !['deploying', 'deployed-coast', ...AVOIDANCE_RUNNING, ...DEORBIT_RUNNING, ...REENTRY_RUNNING, ...OPS_RUNNING, ...LIFE_RUNNING, ...DISPOSAL_RUNNING].includes(flight.state.phase)} onClick={() => flight.send({ type: 'pause', value: !flight.paused })}>{!['deploying', 'deployed-coast', ...AVOIDANCE_RUNNING, ...DEORBIT_RUNNING, ...REENTRY_RUNNING, ...OPS_RUNNING, ...LIFE_RUNNING, ...DISPOSAL_RUNNING].includes(flight.state.phase) ? '结果已冻结' : flight.paused ? '继续' : '暂停'}</button>}</> : flightMode ? <><button aria-pressed={followRocket && !environmentOverview} onClick={followFlight}>跟随火箭</button><button aria-pressed={!followRocket && !environmentOverview} onClick={() => { setEnvironmentOverview(false); setFollowRocket(false); }}>{ascentMode ? '航迹远景' : '地面机位'}</button>{ascentMode && <button aria-pressed={environmentOverview && (!orbitMode || environmentPanel)} onClick={() => { setEnvironmentOverview(true); setEnvironmentPanel(true); }}>环境总览</button>}{orbitMode && <button aria-pressed={environmentOverview && !environmentPanel} onClick={orbitOverview}>轨道全景</button>}</> : editing ? <><button aria-pressed="true"><Rocket size={14}/>组装预览</button><button onClick={() => setBaseLocation('pad')}>返回发射台</button></> : ([['ground', '基地现场'], ['earth', '地球定位'], ['near', '近地视角']] as const).map(([id, label]) => <button key={id} aria-pressed={view === id} onClick={() => setView(id)}>{id === 'ground' ? <MapPin size={14}/> : <Globe2 size={14}/>} {label}</button>)}</nav>
        <div className="launch-scene-tools"><button onClick={() => bridge.current?.reset()} aria-label="复位基地视角" title="复位视角"><RotateCcw size={16}/></button>{editing && <button aria-pressed={exploded} onClick={() => { setExploded(v => !v); setAssemblyPart('all'); }}>{exploded ? '合拢箭体' : '展开部件'}</button>}{!flightMode && view === 'ground' && location === 'pad' && <button aria-pressed={eyeLevel} onClick={() => setEyeLevel(v => !v)}>{eyeLevel ? '返回近景' : '地面仰望'}</button>}{view === 'ground' && <button disabled={!!flight.state.operations || flight.baseTime !== frame.time} title={flight.state.operations ? '太阳方向与发电、地影共用任务计算，不使用教学日光覆盖' : flight.baseTime !== frame.time ? '存档日期不同，此次恢复使用教学日光' : undefined} aria-pressed={teachingLight} onClick={() => setTeachingLight(v => !v)}><Sun size={14}/>{flight.state.operations ? '任务太阳 · 与发电同步' : teachingLight ? '教学日光' : '该时刻太阳'}</button>}</div>
        {boosterSample ? <div className="launch-world-title" data-booster-scene><span>本次分离一级 · 无动力参考路线</span><h2>{boosterStage(boosterSample)}</h2><p>{boosterSample.model==='entry'?'线框标记是等效计算质点，不代表箭体或碎片外形；热流包络为假彩色。':'保持分离时的位置与速度；外观朝向为示意，未求解翻滚。'}</p><strong>一级 T+{boosterSample.time.toFixed(2)} s · {boosterPlayback.time===null?'当前记录':boosterPlayback.playing?'过程回放中':'历史回看'}</strong><small>主任务 T+{flight.state.time.toFixed(2)} s，二级与卫星另行计算</small></div> : <div className="launch-world-title">{flight.demo.active && <strong data-demo-scene>自动演示 · {flight.demo.chapter + 1}/7 · {flight.demo.finished ? '已结束' : flight.demo.paused ? '已暂停' : '运行中'}</strong>}{(flight.state.reentry?.lower && !flight.state.operations || flight.state.satelliteDisposal?.entryAt) && <strong>计算质点 · 不代表完整航天器；网格为 0 m 椭球参考面，非真实地形或残骸落区</strong>}<span>{flight.state.satelliteDisposal ? 'E02 / 任务结束与动力离轨 · 教学模型' : flight.state.lifecycle ? 'P5 / 维护与退役 · 无推进 E01' : flight.state.operations ? 'P4 / 卫星工作 · 同一次飞行' : flight.state.reentry ? 'P3 / 二级再入 · 同一次飞行' : deploymentMode ? '06 / 卫星部署 · 同一次飞行' : orbitMode ? '05 / 入轨与关机 · 教学辅助制导' : ascentMode ? '04 / 三维上升 · 向东姿态辅助' : flightMode ? '03 / 离台试飞 · 竖直姿态辅助' : editing ? '02 / 载具配置 · 教学预览' : view === 'ground' ? 'COAST 01 / 地面设施 · 教学布局' : '同一基地 · 地球上的位置'}</span><h2>{!flight.state.operations && flight.state.reentry && missionFocus === 'satellite' && !environmentOverview ? `${satelliteName(flight.state)} 卫星 · 独立在轨` : flightMode ? flightPhaseName(flight.state) : editing ? '你的第一枚运载火箭。' : view === 'ground' ? selected.title : view === 'earth' ? '我们的起点，在这里。' : '从太空回望出发点。'}</h2><p>{!flight.state.operations && flight.state.reentry && missionFocus === 'satellite' && !environmentOverview ? `当前镜头跟随 ${satelliteName(flight.state)} 卫星，高度 ${(flight.state.deployment!.satellite.altitudeM / 1000).toFixed(1)} km。右侧再入曲线与受热读数属于下降中的二级；卫星没有接受离轨推力。` : flightMode ? (flight.state.phase === 'ignition' ? ignitionReading(flight.state).label : flight.state.message) : editing ? '在左侧选择部件，预览和参数同步变化。展开只用于认识结构，不表示实际分级或飞行。' : view === 'ground' ? selected.description : '只切换观察镜头，基地与样机仍留在地面。金色标记用于定位，不代表基地实际尺寸。'}</p>{view === 'ground' && <small className="launch-pad-status"><i/>{flightMode ? `${flightTime(flight.state.time)}${flight.paused ? ' · 已暂停' : ''}` : '静置展示 · 未点火'}</small>}</div>}
        {editing && <div className="launch-assembly-legend"><span><strong>从上到下</strong> · 整流罩 / 卫星 / 二级 / 一级</span><span>{exploded ? '青色量条：推进剂加注比例' : '完整外形 · 点击“展开部件”查看内部部件'}</span><span>{draft.boosterEngine === 'b-light' ? '一级双喷口' : '一级四喷口'} · {draftStats.payloadKg} kg 载荷</span><span>{sameVehicle(draft, applied) ? '与发射台配置一致' : '正在预览草稿，尚未应用到发射台'}</span></div>}
        {editing && <nav className="launch-assembly-focus" aria-label="查看载具部件">{([['all', '整箭'], ['booster', '一级喷口'], ['upper', '二级'], ['payload', '卫星载荷']] as const).map(([id, name]) => <button key={id} aria-pressed={assemblyPart === id} onClick={() => { setAssemblyPart(id); if (id !== 'all') setExploded(true); }}>{name}</button>)}</nav>}
        <div className="launch-map-labels">{[...BASE_LOCATIONS.filter(p => p.id !== 'overview').map(p => ({ id: p.id, label: p.label })), { id: 'site', label: '海岸教学基地 · 返回地面' }].map(item => <button key={item.id} ref={el => { if (el) labels.current.set(item.id, el); else labels.current.delete(item.id); }} onClick={() => setBaseLocation(item.id === 'site' ? 'overview' : item.id as BaseLocation)}><i/>{item.label}</button>)}</div>
        {step4Guide && <section className="launch-step4-guide" aria-label="第4步入口"><header><small>04 / 上升与分级</small><button onClick={() => setStep4Guide(false)} aria-label="关闭第4步说明">关闭</button></header><h3>从离台，继续到高空。</h3><p>向东转弯 → 一级燃尽 → 你执行分离 → 二级点火。沿途认识空气、云层、大气与近地空间物体。</p>
          {flight.state.phase === 'ready' ? <><p>你可以从点火完整体验，也可以先计算离台结果，直接进入第 4 步。两条路径使用同一配置与受力计算。</p><button className="launch-primary" onClick={quickAscent} disabled={!flight.ready || !!failure || !!flight.error}>直接体验第 4 步 →</button><small>使用已应用配置，先计算倒计时及离台耗油；进入后暂停，等你开始上升。未应用的组装草稿不参与。</small><button onClick={enterFlight}>从检查点火完整体验</button></> : flight.state.phase === 'complete' ? <><p>离台已经完成，当前燃料和速度已保留。</p><button className="launch-primary" onClick={continueAscent} disabled={!flight.ready || !!failure || !!flight.error}>继续第 4 步：上升与分级 →</button></> : <><p>当前：{flightPhaseName(flight.state)}。完成约 150 m 离台后，画面右侧会出现继续入口；已有试飞不会被快速入口覆盖。</p><button onClick={() => { setStep4Guide(false); enterFlight(); }}>查看当前试飞</button></>}
          <p>本步到二级点火后 30 秒停止复查。完成后可继续第 5 步入轨关机；验证通过后进入第 6 步释放卫星。</p></section>}
        {!boosterFocus && flightMode && !flight.state.operations && !environmentPanel && !phenomenaPanel && !telemetryPanel && !journeyPanel && !savePanel && !step4Guide && <button className="launch-environment-summary" onClick={openTelemetry}><strong>飞行参数 · {phenomenon.title}</strong><span className="telemetry-summary-values">动压 {telemetryNumber(environmentReading.dynamicPressurePa / 1000)} kPa · 阻力 {telemetryNumber(Math.abs(flight.state.dragN) / 1000)} kN</span><span>空气密度 {telemetryNumber(environmentReading.density, 4)} kg/m³ · 展开参数 →</span></button>}
        {ascentMode && environmentPanel && <FlightEnvironmentPanel state={flight.state} options={environmentOptions} onChange={setEnvironmentOptions} overview={environmentOverview} onOverview={() => setEnvironmentOverview(true)} onFollow={followFlight} onClose={() => setEnvironmentPanel(false)} kind={environmentKind} onKind={setEnvironmentKind}/>}
        {!boosterFocus && !flight.demo.active && flightMode && !step4Guide && !environmentPanel && <div className="launch-next-action">
          {flight.state.phase === 'complete' && <><small>离台已完成 · 下一步可用</small><button className="launch-primary" onClick={continueAscent} disabled={!flight.ready || !!failure || !!flight.error}>继续第 4 步：上升与分级 →</button></>}
          {flight.state.phase === 'orbit-complete' && <><small>一圈验证通过 · 释放你的卫星</small><button className="launch-primary" onClick={continueDeployment} disabled={!flight.ready || !!failure || !!flight.error}>继续第 6 步：部署卫星 →</button></>}
          {flight.state.phase === 'ascent-complete' && <><small>二级检查完成 · 下一步可用</small><button className="launch-primary" onClick={continueOrbit} disabled={!flight.ready || !!failure || !!flight.error}>继续第 5 步：入轨与关机 →</button></>}
          {orbitMode && flight.state.phase === 'orbit-review' && <><small>关机已完成 · 需要实际绕地验证</small><button className="launch-primary" onClick={() => flight.send({ type: 'coast' })} disabled={!flight.ready || !!failure || !!flight.error}>开始无动力滑行验证 →</button></>}
          {ascentMode && flight.paused && ['ascent', 'separating', 'upper-burn'].includes(flight.state.phase) && <><small>模拟暂停 · 镜头可以自由拖动</small><button className="launch-primary" onClick={() => flight.send({ type: 'pause', value: false })} disabled={!flight.ready || !!failure || !!flight.error}>开始 / 继续上升 →</button></>}
          {flight.state.phase === 'stage-ready' && <><small>一级燃尽 · 等待你的操作</small><button className="launch-primary" onClick={() => flight.send({ type: 'separate' })} disabled={!flight.ready || !!failure || !!flight.error}>执行一级分离 →</button></>}
        </div>}
        {ascentMode && <div className="launch-environment-caption">{boosterSample ? '橙线：一级已算对地航迹 · 80 km 以下等效质点 · 地表网格是参考面，不是真实地形或回收平台' : flight.state.satelliteDisposal ? 'E02 自带推进器；喷流放大示意 · 进入大气后为等效质点，非完整卫星 · 橙线为已算航迹，热流包络非材料烧毁结论' : flight.state.lifecycle ? '轨道线：卫星二体参考 · 绿线：结束指令窗口 · 灰色定位点：已退役 · 无主动离轨' : flight.state.operations ? '金色曲线：参考轨道 · 黄色箭头：对日 · 橙线：星下点 · 绿线：通信 · 橙/绿虚线仅为方向或可见关系 · 青点：放大教学站' : flight.state.reentry ? '橙线：二级已算下降航迹 · 青线：卫星参考轨道 · 其他点线为合成环境 · 迎风包络为热流假彩色，非烧毁结论' : flight.state.deployment?.deorbit ? '青线：二级二体参考轨道 · 低于 80 km 的段尚未求解 · 蓝白排放点为放大示意，非凝结云' : deploymentMode ? '青线：二级预测轨道 · 金线：卫星预测轨道（释放后）· 轨道全景标记放大，近景尺寸以米计' : orbitMode ? '青线：当前二体关机预测 · 灰色虚线：400 km 目标圆 · 金线：对地历史航迹 · 定位标记放大' : environmentOverview ? `近地环境教学总览 · ${environmentOptions.objects ? '彩色点与细线为合成示例，标记放大；数量不代表现实密度' : '空间物体示意已隐藏'} · 金色航迹为本次飞行` : environmentOptions.aerodynamic ? '橙色箭体头部：气动作用着色示意，非火光或温度图 · 喷流按压力与节流量示意' : '低空云团为教学布置；青线与箭头为气流/阻力提示 · 喷流形态为示意'}</div>}
        {boosterSample && flight.boosterRecord && <BoosterDescentPanel record={flight.boosterRecord} sample={boosterSample} replaying={boosterPlayback.time!==null} playing={boosterPlayback.playing} ended={boosterPlayback.ended} rate={boosterPlayback.rate} canReplay={boosterPlayback.canReplay} onPlayback={()=>replayBooster()} onRestart={()=>replayBooster(true)} onRate={boosterPlayback.setRate} onFollow={boosterPlayback.follow} missionTime={flight.state.time} paused={flight.paused} running={flight.demo.active?!flight.demo.finished&&!flight.demo.error:FLIGHT_RUNNING_PHASES.includes(flight.state.phase)} onSeek={time=>{flight.send({type:'pause',value:true});boosterPlayback.seek(time);}} onPause={()=>flight.send({type:'pause',value:!flight.paused})} onClose={closeBooster}/>}
        {failure && <div className="launch-error" role="alert"><h3>需要恢复三维画面</h3><p>{failure}</p><button onClick={() => setRevision(v => v + 1)}>重建三维画面</button><button onClick={onClose}>返回观测</button></div>}
        {textureErrors > 0 && <div className="launch-texture-status" role="status">地球贴图有 {textureErrors} 项未就绪 <button onClick={() => bridge.current?.retryTextures()}>重试贴图</button></div>}
        {forceOverlay && forceViewAvailable && <aside className="launch-force-legend" aria-label="主画面受力图图例"><header><span>三维受力图</span><button onClick={() => setForceOverlay(false)}>关闭受力图</button></header><FlightForceReadout state={flight.state}/><p>本帧共同比例 · 箭头位置为示意<br/>颜色与参数对应，拖动画面观察方向。</p></aside>}
        {boosterSample ? <div className="launch-hud launch-booster-hud"><div><span>一级高度 / 相对空气速度</span><strong>{(boosterSample.altitudeM/1000).toFixed(3)} km / {boosterSample.airSpeedMS.toFixed(1)} m/s</strong><small>当前画面和右侧读数均属于一级</small></div><div><span>一级质量 / 推力</span><strong>{(flight.boosterRecord!.massKg/1000).toFixed(2)} t / 0 N</strong><small>消耗型参考路线 · 未求解材料结局</small></div></div> : <div className="launch-hud">{flight.state.operations ? <><div><span>卫星电池 / 当前环境</span><strong>{(flight.state.operations.energyJ/flight.state.operations.capacityJ*100).toFixed(1)}% / {flight.state.operations.shadow ? '地影' : '日照'}</strong><small>{flight.state.operations.generationW.toFixed(0)} W {flight.state.lifecycle ? '接入功率' : '发电'} · {flight.state.operations.loadW.toFixed(0)} W 用电</small></div><div><span>{flight.state.satelliteDisposal || flight.state.lifecycle ? '业务状态 / 空间处置' : '机上待传 / 地面已收'}</span><strong>{flight.state.satelliteDisposal ? disposalStatus(flight.state) : flight.state.lifecycle ? lifecycleStatus(flight.state) : `${flight.state.operations.bufferMB.toFixed(0)} / ${flight.state.operations.deliveredMB.toFixed(0)} MB`}</strong><small>{(flight.state.deployment!.satellite.altitudeM/1000).toFixed(1)} km · {flight.rate} 倍 · {[...OPS_RUNNING, ...LIFE_RUNNING, ...DISPOSAL_RUNNING].includes(flight.state.phase) ? flight.paused ? '暂停' : '计算中' : '检查点冻结'}</small></div></> : deploymentMode ? <><div><span>{flight.state.reentry ? '二级高度 / 相对空气速度' : `${satelliteName(flight.state)} 卫星 / 运载二级 · 中心间距`}</span><strong>{flight.state.reentry ? `${(flight.state.ascent!.altitudeM / 1000).toFixed(2)} km / ${(flight.state.ascent!.airSpeedMS / 1000).toFixed(3)} km/s` : `${flight.state.deployment!.separationM.toFixed(1)} m`}</strong><small>{flight.state.deployment!.released ? '已独立飞行 · ' : '尚未释放 · '}{flightTime(flight.state.time)} · {!['deploying', 'deployed-coast', ...AVOIDANCE_RUNNING, ...DEORBIT_RUNNING, ...REENTRY_RUNNING, ...OPS_RUNNING, ...LIFE_RUNNING, ...DISPOSAL_RUNNING].includes(flight.state.phase) ? '检查点已冻结' : flight.paused ? '已暂停' : '运动中'}</small></div><div><span>卫星高度 / 质量</span><strong>{(flight.state.deployment!.satellite.altitudeM / 1000).toFixed(1)} km / {flight.state.deployment!.satellite.massKg.toFixed(1)} kg</strong><small>{flight.state.deployment!.verified ? '120 秒部署检查通过' : '尚未完成部署检查'} · {flight.rate} 倍</small></div></> : ascentMode && flightMode ? <><div><span>地球椭球面高度 / 向上速度</span><strong>{(flight.state.ascent!.altitudeM / 1000).toFixed(2)} km / {flight.state.speedMS.toFixed(0)} m/s</strong><small>地球曲率按实际半径；云层与星点为示意</small></div><div><span>{flight.state.ascent!.stage === 0 ? '一级上升' : '二级与载荷'} · {flight.rate} 倍速</span><strong>{(flight.state.massKg / 1000).toFixed(2)} t / {(flight.state.thrustN / 1000).toFixed(0)} kN</strong><small>当前质量 / 推力 · {flight.state.phase === 'orbit-complete' ? '一圈验证通过' : orbitMode ? '以滑行结果判定' : '尚未判定入轨'}</small></div></> : flightMode ? <><div><span>相对发射台升高 / 向上速度</span><strong>{flight.state.heightM.toFixed(1)} m / {flight.state.speedMS.toFixed(1)} m/s</strong><small>飞行高度；地面到喷口另含 8.1 m 平台高度</small></div><div><span>一级剩余推进剂 / 发动机推力</span><strong>{(flight.state.fuelKg / 1000).toFixed(2)} t / {(flight.state.thrustN / 1e6).toFixed(2)} MN</strong><small>{flight.state.released ? '支撑已释放' : '支撑锁定'} · {flight.paused ? '模拟暂停' : flight.state.phase === 'complete' ? '结果已冻结' : '教学参数'}</small></div></> : editing ? <><div><span>当前草稿 · 整箭初始质量</span><strong>{(draftStats.wetKg / 1000).toFixed(2)} t</strong><small>含推进剂、结构、整流罩与载荷</small></div><div><span>静态配置检查</span><strong>{draftStats.canApply ? '可应用 · 未飞行验证' : '需调整配置'}</strong><small>完整箭体高 60 m；展开间距为示意</small></div></> : <><div><span>基地坐标 · 教学选址</span><strong>28.500° N / 80.600° W</strong><small>{LAUNCH_SITE.region} · 地面高度 0 m（椭球）</small></div><div><span>镜头高度 · 非飞行高度</span><strong>{altitudeM < 10000 ? `${Math.max(0, altitudeM).toFixed(0)} m` : `${(altitudeM / 1000).toFixed(0)} km`}</strong><small>{view === 'ground' && teachingLight ? '教学日光便于观察，不改变基准日期' : '按基准日期计算太阳方向'}</small></div></>}</div>}
        <div className="launch-scene-footer"><span>{flightMode ? '拖动旋转 · 滚轮靠近 · 独立试飞时钟' : '拖动旋转 · 滚轮靠近 · 点选设施'}</span><span>发射基准 {immersiveDate(flight.baseTime).replace('T', ' ')}（北京时间）· 任务时刻另加 T</span></div>
      </div>
    </div>
    {satelliteGuide && <SatelliteMissionGuide state={flight.state} config={displayVehicle} onClose={()=>setSatelliteGuide(false)} onParameters={()=>{setSatelliteGuide(false);openTelemetry();}} onOverview={()=>{setSatelliteGuide(false);setJourneyPanel(false);setSavePanel(false);setTelemetryPanel(false);setPhenomenaPanel(false);setReentryPanel(false);setDeorbitPanel(false);setAvoidancePanel(false);setOperationsPanel(false);orbitOverview();}}/>}
    <footer className="launch-stages" aria-label="地球出发六步进度">{LAUNCH_STEPS.map((step, index) => <button key={step} disabled={flight.demo.active || ((index === 4 || index === 5) && (!flight.ready || !!flight.error || !!failure)) || (index === 5 && !deploymentMode && flight.state.phase !== 'orbit-complete') || (index === 4 && !orbitMode && flight.state.phase !== 'ascent-complete') || (index < 2 && flightLocked) || (index === 2 && ascentMode)} onClick={() => index === 5 ? deploymentMode ? focusMission('pair') : continueDeployment() : index === 4 ? orbitMode ? orbitOverview() : continueOrbit() : index === 0 ? setBaseLocation('pad') : index === 1 ? openAssembly() : index === 3 ? ascentMode ? setEnvironmentPanel(true) : setStep4Guide(true) : enterFlight()} aria-current={index === (flightMode ? deploymentMode ? 5 : orbitMode ? 4 : ascentMode ? 3 : 2 : editing ? 1 : 0) ? 'step' : undefined}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step}</strong><small>{index === 0 ? '查看基地' : index === 1 ? '编辑与保存' : index === 2 ? '离台试飞' : index === 3 ? ascentMode ? '环境与操作说明' : '可进入 · 查看两种路径' : index === 4 ? orbitMode ? '预测轨道与滑行验证' : flight.state.phase === 'ascent-complete' ? '已解锁 · 继续入轨' : '完成第 4 步后开启' : deploymentMode ? '部署 / 观察 / 保存' : flight.state.phase === 'orbit-complete' ? '已解锁 · 释放卫星' : '入轨验证通过后开启'}</small></button>)}</footer>
  </section>;
}
