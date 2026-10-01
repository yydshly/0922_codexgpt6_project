import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {makePilotShip} from '../flight/pilotShip';
import {createCrewCarrier,CREW_CARRIER_GEOMETRY} from '../flight/crewCarrier';
import {crewDirections,crewForceBalance,crewReturning} from '../flight/crewDirections';
import {createCrewReturnVisuals} from '../flight/crewReturnVisuals';
import {CREW_GROUND_OPTICS,crewGroundView,crewPilotView,crewCockpitReading,crewObservation} from '../flight/crewObservation';
import {createBaseScene} from '../launch/baseScene';
import {satellite,disposeEnvironmentScene} from '../flight/environmentMeshes';
import {CREW_PHASES,CREW_VEHICLE,crewIdle,type CrewSnapshot,type CrewControls} from '../flight/crewMission';
import {CREW_PILOT_THROTTLE_PHASES,CREW_PILOT_RCS_PHASES,crewObservationReady,type CrewPilotAction} from '../flight/crewPilotControl';
import {crewPilotInputAvailability,crewPilotKeyAvailable} from '../flight/crewPilotInput';
import {crewPropulsionReadout,crewPlaybackReadout} from '../flight/crewFlightReadout';
import {CrewPilotBriefing,crewMissionChapter} from './CrewPilotBriefing';
import type {CrewCommand,CrewRequest,CrewResponse} from '../flight/crewMission.worker';
import {LAUNCH_EARTH} from '../data/launchMission';
import {surfaceAt,rotateEarth,SITE_FIXED,type V3} from '../launch/ascent';
import {orbitalElements,sampleOrbit} from '../launch/orbitInsertion';
import {publicAsset} from '../data/publicAsset';
import {createEarthAtmosphere,createEarthClouds} from './earthEffects';
import './CrewedMission.css';

type CameraMode='follow'|'cockpit'|'crew'|'ground'|'orbit';
const SAVE_KEY='orbit.crewed-earth.v1';
const map:Record<string,keyof CrewControls|`${keyof CrewControls}-negative`>={KeyW:'thrust',KeyS:'thrust-negative',KeyA:'yaw',KeyD:'yaw-negative',ArrowUp:'pitch',ArrowDown:'pitch-negative',KeyQ:'roll',KeyE:'roll-negative',KeyB:'brake'};
const launchPhase=(s:CrewSnapshot)=>s.carrierStage!=='none';
const forceValue=(v:V3)=>new THREE.Vector3(...v).length();
const duration=(seconds:number)=>`${seconds<0?'−':''}${Math.floor(Math.abs(seconds)/60)}:${String(Math.floor(Math.abs(seconds)%60)).padStart(2,'0')}`;
export function CrewedMission({onClose}:{onClose:()=>void}){
  const host=useRef<HTMLDivElement>(null),platformLabel=useRef<HTMLDivElement>(null),directionLabels=useRef<HTMLDivElement>(null),partLabels=useRef<HTMLDivElement>(null),forceLabels=useRef<HTMLDivElement>(null),root=useRef<HTMLElement>(null),worker=useRef<Worker|null>(null),live=useRef<CrewSnapshot|null>(null),pending=useRef(false),held=useRef(new Set<string>());
  const [state,setState]=useState<CrewSnapshot|null>(null),[playing,setPlaying]=useState(false),[error,setError]=useState(''),[texture,setTexture]=useState('读取本地地球纹理…');
  const [cameraMode,setCameraMode]=useState<CameraMode>('follow'),[rate,setRate]=useState(60),[forces,setForces]=useState(true),[inertialOnReturn,setInertialOnReturn]=useState(false),[exit,setExit]=useState(false);
  const [checks,setChecks]=useState([false,false,false]),pilotLook=useRef<(pitch:number)=>void>(()=>{});
  const [notice,setNotice]=useState(''),[savedAvailable,setSavedAvailable]=useState(false);
  const [pressedCodes,setPressedCodes]=useState<string[]>([]),[keyboardFocused,setKeyboardFocused]=useState(false);
  const settings=useRef({cameraMode,rate,forces,inertialOnReturn,playing,exit});settings.current={cameraMode,rate,forces,inertialOnReturn,playing,exit};
  const flightKey=(code:string,down:boolean)=>{if(down===held.current.has(code))return;down?held.current.add(code):held.current.delete(code);setPressedCodes([...held.current]);};
  const clearFlightInput=()=>{if(!held.current.size)return;held.current.clear();setPressedCodes([]);};
  const command=(c:CrewCommand)=>{clearFlightInput();worker.current?.postMessage({type:'command',command:c} satisfies CrewRequest);};
  const takeOver=()=>{if(!live.current?.pilot.active)setNotice('已切换为自主任务：后续点火、分离、开伞与回收由你授权，完整自动故事不再自行推进。可随时恢复飞控辅助。');command('takeover');};
  const pilotAction=(action:CrewPilotAction)=>{clearFlightInput();worker.current?.postMessage({type:'pilot-action',action} satisfies CrewRequest);};
  const throttle=(value:number)=>{flightKey('KeyW',false);flightKey('KeyS',false);worker.current?.postMessage({type:'throttle',value} satisfies CrewRequest);};
  const control=():CrewControls=>{const a=crewIdle();for(const code of held.current){const key=map[code];if(!key)continue;if(key==='brake')a.brake=true;else if(key.endsWith('-negative'))a[key.replace('-negative','') as 'thrust'|'yaw'|'pitch'|'roll']-=1;else a[key as 'thrust'|'yaw'|'pitch'|'roll']+=1;}return a;};
  const download=()=>{if(!live.current)return;const data={schema:1,vehicle:CREW_VEHICLE,scope:'原创载人教学任务；真实地球常数与本地参考大气，非实飞认证、落区预报或可恢复存档。',...live.current};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='crewed-earth-mission.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const requestExit=()=>{command('pause');setExit(true);};
  const restore=()=>{command('pause');try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)throw Error('没有可恢复的载人任务存档。');worker.current?.postMessage({type:'restore',data:JSON.parse(raw)} satisfies CrewRequest);}catch(error){setNotice(`恢复失败，当前任务保留：${String(error)}`);}};
  useEffect(()=>{if(state?.serviceAttached&&cameraMode==='ground')setCameraMode('follow');},[state?.serviceAttached,cameraMode]);
  useEffect(()=>{
    const w=new Worker(new URL('../flight/crewMission.worker.ts',import.meta.url),{type:'module'});worker.current=w;
    try{setSavedAvailable(!!localStorage.getItem(SAVE_KEY));}catch{setNotice('浏览器存储不可用，可下载记录；当前任务仍能运行。');}
    w.onmessage=(e:MessageEvent<CrewResponse>)=>{pending.current=false;const response=e.data;
      if(response.type==='error'){clearFlightInput();setError(response.message);setPlaying(false);}
      else if(response.type==='notice')setNotice(response.message);
      else if(response.type==='save'){try{localStorage.setItem(SAVE_KEY,JSON.stringify(response.data));setSavedAvailable(true);setNotice(`已保存 T ${duration(response.data.state.time)} · ${response.data.state.phase==='failed'?'任务停止 · 未完成':CREW_PHASES[response.data.state.phase].title}。恢复后保持暂停。`);}catch{setNotice('浏览器存档写入失败，当前任务保留。可以下载记录后继续。');}}
      else if(response.type==='state'){if(!response.playing||response.state.automatic!==live.current?.automatic||response.state.phase!==live.current?.phase)clearFlightInput();else for(const code of held.current)if(!crewPilotKeyAvailable(response.state,code))flightKey(code,false);live.current=response.state;setState(response.state);setPlaying(response.playing);}
    };
    w.onerror=()=>{pending.current=false;clearFlightInput();setError('任务计算线程异常，当前画面已停止。可重新进入任务。');setPlaying(false);};
    const hidden=()=>{if(document.hidden)command('pause');},blur=()=>clearFlightInput();
    document.addEventListener('visibilitychange',hidden);window.addEventListener('blur',blur);root.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return()=>{w.terminate();worker.current=null;live.current=null;document.removeEventListener('visibilitychange',hidden);window.removeEventListener('blur',blur);};
  },[]);
  useEffect(()=>{clearFlightInput();},[cameraMode]);
  useEffect(()=>{
    const mount=host.current!;let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true});}catch{setError('无法启动三维显示，请检查浏览器 WebGL 支持。');return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setClearColor('#081321');renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.shadowMap.enabled=true;mount.append(renderer.domElement);
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,1,.04,6e7),sun=new THREE.Vector3(...surfaceAt(SITE_FIXED).up).add(new THREE.Vector3(.2,.2,.1)).normalize();
    scene.add(new THREE.HemisphereLight('#b7d7ff','#463f32',.85));const light=new THREE.DirectionalLight('#fff0d8',3.0);light.position.copy(sun).multiplyScalar(180);scene.add(light);
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-100,right:100,top:100,bottom:-100,near:1,far:600});light.shadow.normalBias=.2;light.shadow.bias=-.0005;
    const ship=makePilotShip({crewCouch:true});scene.add(ship.group);
    const groundCamera=new THREE.PerspectiveCamera(CREW_GROUND_OPTICS.fovDeg,2,CREW_GROUND_OPTICS.nearM,6e7);
    const groundTarget=new THREE.WebGLRenderTarget(640,320,{depthBuffer:true});groundTarget.texture.colorSpace=THREE.SRGBColorSpace;
    const optics=new THREE.Group();optics.name='fixed-base-camera';ship.group.add(optics);
    const opticsBody=new THREE.Mesh(new THREE.BoxGeometry(.22,.26,.36),new THREE.MeshStandardMaterial({color:'#7a8589',metalness:.6,roughness:.45}));opticsBody.position.set(CREW_GROUND_OPTICS.position[0],CREW_GROUND_OPTICS.position[1],.02);optics.add(opticsBody);
    const lens=new THREE.Mesh(new THREE.CircleGeometry(.075,24),new THREE.MeshPhysicalMaterial({color:'#246276',metalness:.45,roughness:.1,clearcoat:1}));lens.position.set(CREW_GROUND_OPTICS.position[0],CREW_GROUND_OPTICS.position[1],.22);optics.add(lens);
    // Thin capsule panels keep their PBR shading; the broad pad shadow map must not speckle their skin.
    ship.group.traverse(node=>{if(node instanceof THREE.Mesh)node.receiveShadow=false;});
    const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),reflection=pmrem.fromScene(room,.12);room.dispose();pmrem.dispose();scene.environment=reflection.texture;
    const platform=satellite();platform.name='orbiting-teaching-platform';const pod=new THREE.Mesh(new THREE.CylinderGeometry(2,2,12,32),new THREE.MeshStandardMaterial({color:'#d9dfdc',metalness:.4,roughness:.45}));pod.rotation.x=Math.PI/2;pod.position.z=5;platform.add(pod);scene.add(platform);
    let alive=true;
    const loader=new THREE.TextureLoader(),earth=new THREE.Group();scene.add(earth);
    const day=loader.load(publicAsset('/textures/earth-day-8k.jpg'),()=>{if(alive)setTexture('本地静态地球纹理');},undefined,()=>{if(alive)setTexture('地球纹理加载失败，使用基础球体');});day.colorSpace=THREE.SRGBColorSpace;
    const globe=new THREE.Mesh(new THREE.SphereGeometry(1,96,64),new THREE.MeshStandardMaterial({map:day,roughness:1}));globe.rotation.x=Math.PI/2;earth.add(globe);
    const clouds=createEarthClouds(loader),atmosphere=createEarthAtmosphere();clouds.rotation.x=Math.PI/2;clouds.material.uniforms.sunDirection.value.copy(sun);atmosphere.material.uniforms.sunDirection.value.copy(sun);earth.add(clouds,atmosphere);
    earth.scale.set(LAUNCH_EARTH.semiMajorM,LAUNCH_EARTH.semiMajorM,LAUNCH_EARTH.semiMajorM*(1-1/LAUNCH_EARTH.inverseFlattening));
    let seed=71;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const starPositions:number[]=[];for(let i=0;i<1300;i++){const z=random()*2-1,a=random()*Math.PI*2,r=Math.sqrt(1-z*z);starPositions.push(r*Math.cos(a)*2.5e7,r*Math.sin(a)*2.5e7,z*2.5e7);}
    const starCanvas=document.createElement('canvas');starCanvas.width=starCanvas.height=32;const ctx=starCanvas.getContext('2d')!,gradient=ctx.createRadialGradient(16,16,0,16,16,16);gradient.addColorStop(0,'#ffffffff');gradient.addColorStop(.3,'#ffffffb0');gradient.addColorStop(1,'#ffffff00');ctx.fillStyle=gradient;ctx.fillRect(0,0,32,32);
    const stars=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3)),new THREE.PointsMaterial({color:'#c7d8f2',size:45000,map:new THREE.CanvasTexture(starCanvas),transparent:true,depthWrite:false,opacity:.72}));scene.add(stars);
    const carrier=createCrewCarrier();ship.group.add(carrier.root);
    const launchBase=createBaseScene({vehicleRadiusM:CREW_CARRIER_GEOMETRY.radiusM});launchBase.vehicle.root.visible=false;launchBase.setSkyVisible(false);
    launchBase.root.traverse(node=>{if(node instanceof THREE.Light)node.visible=false;});scene.add(launchBase.root);
    const ground=new THREE.Group();scene.add(ground);const plane=new THREE.Mesh(new THREE.PlaneGeometry(20000,20000,1,1),new THREE.MeshStandardMaterial({color:'#54644b',roughness:1}));plane.rotation.x=-Math.PI/2;plane.receiveShadow=true;ground.add(plane);
    const returnVisuals=createCrewReturnVisuals();ship.group.add(returnVisuals.body,returnVisuals.attitudeBody);scene.add(returnVisuals.parachutes);
    const grid=new THREE.GridHelper(80,16,'#809270','#647458');grid.position.y=.02;ground.add(grid);
    const partLinesGeometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(4*6),3)),partLines=new THREE.LineSegments(partLinesGeometry,new THREE.LineBasicMaterial({color:'#d3dedb',transparent:true,opacity:.65}));scene.add(partLines);
    const hotMaterial=new THREE.MeshBasicMaterial({color:'#ff9b49',transparent:true,opacity:.2,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
    const heatEnvelope=new THREE.Mesh(new THREE.SphereGeometry(2.65,40,24,0,Math.PI*2,0,Math.PI/2),hotMaterial);heatEnvelope.rotation.x=Math.PI/2;heatEnvelope.position.z=-.15;ship.group.add(heatEnvelope);
    const arrowColors=[0xc7b3e5,0xffc576,0x73b4ec,0xb6dc9c,0xe7ece0];const arrows=arrowColors.map(color=>{const a=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(5,0,0),15,color,2,1);scene.add(a);return a;});
    const directionArrows={forward:new THREE.ArrowHelper(new THREE.Vector3(0,0,-1),new THREE.Vector3(),15,0xe0e980,2,1),
      inertial:new THREE.ArrowHelper(new THREE.Vector3(0,0,-1),new THREE.Vector3(),24,0x65e4d4,2,1),
      air:new THREE.ArrowHelper(new THREE.Vector3(0,0,-1),new THREE.Vector3(),21,0x9ac6e9,2,1),
      platform:new THREE.ArrowHelper(new THREE.Vector3(0,0,-1),new THREE.Vector3(),18,0xe4a6d3,2,1),
      shield:new THREE.ArrowHelper(new THREE.Vector3(0,0,1),new THREE.Vector3(),13,0xf0b798,2,1)};
    scene.add(...Object.values(directionArrows));
    const trailGeometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(9000),3)),trailLine=new THREE.Line(trailGeometry,new THREE.LineBasicMaterial({color:'#bba777',transparent:true,opacity:.6}));scene.add(trailLine);
    const orbitGeometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(257*3),3)),orbitLine=new THREE.Line(orbitGeometry,new THREE.LineBasicMaterial({color:'#7daabc',transparent:true,opacity:.45}));scene.add(orbitLine);
    const updateLine=(geometry:THREE.BufferGeometry,points:THREE.Vector3[])=>{const attr=geometry.getAttribute('position'),count=Math.min(points.length,attr.count);for(let i=0;i<count;i++)attr.setXYZ(i,...points[i].toArray());attr.needsUpdate=true;geometry.setDrawRange(0,count);geometry.computeBoundingSphere();};
    trailGeometry.setDrawRange(0,0);orbitGeometry.setDrawRange(0,0);
    const beacon=new THREE.Mesh(new THREE.OctahedronGeometry(50000),new THREE.MeshBasicMaterial({color:'#f5d390',wireframe:true,depthTest:false}));scene.add(beacon);
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=10;controls.maxDistance=3e7;
    let lastMode='',lastPhase='',lastTime=-Infinity,lastFeed=-Infinity,lastFeedKey='',last=performance.now(),frame=0,transition=true,manualOrbit=false,pointer:{id:number;x:number;y:number}|null=null;const head=new THREE.Vector2(),crewViewAngles=new THREE.Vector2(.695,.50);
    pilotLook.current=pitch=>head.set(0,pitch);
    const cancel=()=>{manualOrbit=true;transition=false;};controls.addEventListener('start',cancel);
    const down=(e:PointerEvent)=>{if(!['cockpit','crew'].includes(settings.current.cameraMode)||e.button!==0)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);};
    const move=(e:PointerEvent)=>{if(pointer?.id!==e.pointerId)return;const mode=settings.current.cameraMode;
      if(mode==='cockpit'){head.x=THREE.MathUtils.clamp(head.x-(e.clientX-pointer.x)*.003,-.75,.75);head.y=THREE.MathUtils.clamp(head.y-(e.clientY-pointer.y)*.003,-.70,.55);}
      else if(mode==='crew'){crewViewAngles.x=THREE.MathUtils.clamp(crewViewAngles.x-(e.clientX-pointer.x)*.003,.20,1.05);crewViewAngles.y=THREE.MathUtils.clamp(crewViewAngles.y+(e.clientY-pointer.y)*.003,.25,.65);}
      pointer={id:e.pointerId,x:e.clientX,y:e.clientY};};
    const up=()=>{pointer=null;};renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);
    const resize=()=>{const rect=mount.getBoundingClientRect();if(rect.width&&rect.height){renderer.setSize(rect.width,rect.height);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();}};const observer=new ResizeObserver(resize);observer.observe(mount);resize();
    const lost=(e:Event)=>{e.preventDefault();command('pause');setError('三维显示中断，任务已暂停。请重新进入场景。');};renderer.domElement.addEventListener('webglcontextlost',lost);
    const animate=(now:number)=>{
      if(!alive)return;frame=requestAnimationFrame(animate);const dt=Math.min(.1,(now-last)/1000);last=now;const s=live.current,o=settings.current;
      if(!s)return;
      if(!pending.current&&o.playing&&!document.hidden&&!o.exit){pending.current=true;worker.current?.postMessage({type:'tick',seconds:dt,rate:o.rate,input:control()} satisfies CrewRequest);}
      const origin=new THREE.Vector3(...s.position),q=new THREE.Quaternion(...s.attitude),upVector=new THREE.Vector3(...surfaceAt(s.position).up),localGround=new THREE.Vector3(...s.position).addScaledVector(upVector,-s.altitudeM).sub(origin);
      const sky=Math.exp(-Math.max(0,s.altitudeM)/16000);renderer.setClearColor(new THREE.Color('#081321').lerp(new THREE.Color('#7199b2'),sky));stars.material.opacity=.72*(1-sky);
      // The hull and all engine outlets use the force solver's attitude. Only the camera is smoothed.
      const firstView=lastMode==='';ship.group.quaternion.copy(q);ship.group.position.set(0,0,0);
      const launching=launchPhase(s);ship.serviceGroup.visible=s.serviceAttached;ship.heatShield.visible=!s.serviceAttached;
      ship.serviceGroup.traverse(node=>{if(node.name==='service-solar-wing'||node.name==='service-solar-cells')node.visible=!launching;});
      carrier.update(s);
      const returnFrame=returnVisuals.update(s),returning=crewReturning(s.phase,s.serviceAttached);
      optics.visible=!s.serviceAttached;
      heatEnvelope.visible=s.heatFluxWm2!==null;hotMaterial.opacity=s.heatFluxWm2===null?0:Math.min(.5,.06+s.heatFluxWm2/2e6);
      ship.cockpit.pilot.setView(o.cameraMode==='cockpit');ship.cockpit.controls({...control(),brake:control().brake},!s.automatic,s.properG);
      ship.cockpit.pilot.head.rotation.set(head.y,head.x,0,'YXZ');
      const cockpitReading=crewCockpitReading(s);ship.cockpit.update(cockpitReading);
      const rcsTranslation=['approach','observe','return-ready'].includes(s.phase)?new THREE.Vector3(...s.thrust).applyQuaternion(q.clone().invert()).divideScalar(CREW_VEHICLE.rcsThrustN):new THREE.Vector3();
      ship.updatePropulsion({position:new THREE.Vector3(),velocity:new THREE.Vector3(...s.velocity),attitude:q,angularVelocity:new THREE.Vector3(...s.angularVelocity),rcsTorque:new THREE.Vector3(...s.attitudeEffort),rcsTranslation,mainThrust:s.mainFraction,fuel:s.serviceFuelKg,time:s.time,contact:null,firing:forceValue(s.thrust)/CREW_VEHICLE.mainThrustN},!launching&&s.serviceAttached);
      earth.position.copy(origin).negate();earth.rotation.z=7.292115e-5*s.time;
      // The finite tangent plane is a close landing reference, not terrain to overlay on the globe.
      ground.visible=!launching&&s.altitudeM<1000;ground.position.copy(localGround);ground.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),upVector);
      launchBase.root.visible=launching&&s.altitudeM<15000;
      light.castShadow=launchBase.root.visible||s.altitudeM<15000;
      if(launchBase.root.visible){const site=rotateEarth(SITE_FIXED,s.time),siteFrame=surfaceAt(site),siteUp=new THREE.Vector3(...siteFrame.up),east=new THREE.Vector3(...siteFrame.east);
        launchBase.root.position.set(...site).sub(origin);launchBase.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(east,siteUp,east.clone().cross(siteUp)));
        launchBase.setLaunchPose(0,s.released,.22+.78*THREE.MathUtils.smoothstep(s.time,-3,1));}
      platform.position.set(...s.targetPosition).sub(origin);platform.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...s.targetVelocity).normalize());platform.visible=!launching&&s.serviceAttached;
      grid.visible=s.altitudeM<120;
      const east=new THREE.Vector3(...surfaceAt(s.position).east),north=upVector.clone().cross(east),right=east.clone().multiplyScalar(.57).addScaledVector(north,-.82);
      const forceVectors=[s.gravity,s.thrust,s.drag,s.chuteForce,s.contactForce],forceLengths:number[]=[];
      forceVectors.forEach((f,i)=>{const direction=new THREE.Vector3(...f),n=direction.length(),length=returning?Math.max(1,Math.min(18,10*n/Math.max(1,forceValue(s.gravity)))):8+Math.log10(Math.max(1,n))*3;forceLengths.push(length);
        arrows[i].visible=o.forces&&o.cameraMode==='follow'&&n>1;
        if(returning)arrows[i].position.copy(right).multiplyScalar(-[10,13,16,19,18][i]).addScaledVector(upVector,i===0?6:0);else arrows[i].position.set(-7-i*4,0,launching?28:0).applyQuaternion(q);
        if(n>1){arrows[i].setDirection(direction.normalize());arrows[i].setLength(length,Math.min(1.3,length*.3),Math.min(.7,length*.2));}});
      const directions=crewDirections(s),vectorEntries={forward:directions.forward,inertial:directions.inertialVelocity,air:directions.airRelativeVelocity,platform:directions.platformRelativeVelocity,shield:directions.heatShield};
      const directionLengths={forward:returning?3:15,inertial:returning?12:24,air:returning?8:21,platform:18,shield:returning?2.5:13};
      for(const key of Object.keys(directionArrows) as (keyof typeof directionArrows)[]){const a=directionArrows[key],vector=vectorEntries[key];a.visible=o.forces&&o.cameraMode==='follow'&&vector.length()>.05&&
          (key==='air'?s.density>1e-8&&directions.airRelativeVelocity.length()>.05:key==='platform'?['approach','observe','return-ready'].includes(s.phase):key==='shield'?!s.serviceAttached:key==='inertial'?!returning||o.inertialOnReturn:true);
        a.position.set(key==='forward'?0:key==='shield'?0:7,key==='air'?-6:key==='platform'?6:0,key==='forward'?-5.5:key==='shield'?1:launching?28:0).applyQuaternion(q);
        if(returning&&key==='shield')a.position.copy(returnFrame.shield).applyQuaternion(q);
        if(returning&&['air','inertial'].includes(key))a.position.copy(right).multiplyScalar(key==='air'?13:18).addScaledVector(upVector,3);
        if(vector.length()>.05){a.setDirection(vector.clone().normalize());a.setLength(directionLengths[key],returning?.8:2,returning?.4:1);}}
      const partPoints=[returnFrame.nose,returnFrame.shield,returnFrame.nozzles[0],returnFrame.footBottoms[0]].map(p=>p.clone().applyQuaternion(q));
      const partEnds=partPoints.map((p,i)=>p.clone().addScaledVector(right,[8,-7,8,-10][i]).addScaledVector(upVector,[2,.5,1,-.5][i]));
      partLines.visible=!s.serviceAttached&&o.cameraMode==='follow';
      const partsAttr=partLinesGeometry.getAttribute('position');for(let i=0;i<4;i++){partsAttr.setXYZ(i*2,...partPoints[i].toArray());partsAttr.setXYZ(i*2+1,...partEnds[i].toArray());}partsAttr.needsUpdate=true;partLinesGeometry.computeBoundingSphere();
      partLinesGeometry.setDrawRange(0,s.altitudeM<120?8:6);
      if(s.time!==lastTime){lastTime=s.time;updateLine(trailGeometry,s.trail.map(p=>new THREE.Vector3(...p).sub(origin)));updateLine(orbitGeometry,s.altitudeM>80000?sampleOrbit(orbitalElements(s.position,s.velocity)).map(p=>new THREE.Vector3(...p).sub(origin)):[]);}
      trailLine.visible=o.cameraMode==='orbit';orbitLine.visible=o.cameraMode==='orbit';beacon.visible=o.cameraMode==='orbit';
      if(lastMode!==o.cameraMode||lastPhase!==s.phase){manualOrbit=false;transition=true;lastMode=o.cameraMode;lastPhase=s.phase;}
      controls.enabled=['follow','orbit'].includes(o.cameraMode);
      const sensor=crewGroundView(s);groundCamera.position.copy(sensor.position);groundCamera.quaternion.copy(sensor.orientation);groundCamera.up.copy(sensor.up);
      ship.cockpit.setGroundFeed(sensor.available?groundTarget.texture:null);
      let eye=new THREE.Vector3(),target=new THREE.Vector3(),desiredQ:THREE.Quaternion|undefined;
      if(o.cameraMode==='cockpit'){const pilot=crewPilotView(s.attitude,ship.cockpit.eye,head,ship.cockpit.pilot.head.position);eye.copy(pilot.position);desiredQ=pilot.orientation;target.copy(eye).addScaledVector(pilot.forward,20);}
      else if(o.cameraMode==='ground'){eye.copy(sensor.position);desiredQ=sensor.orientation;target.copy(eye).addScaledVector(sensor.forward,20);}
      else if(o.cameraMode==='crew'){const {x:yaw,y:pitch}=crewViewAngles;target.set(0,.90,-2.68);eye.copy(target).add(new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(1.78));eye.applyQuaternion(q);target.applyQuaternion(q);}
      else if(o.cameraMode==='orbit'){eye.copy(earth.position).add(upVector.clone().multiplyScalar(1.9e7)).add(new THREE.Vector3(0,4e6,5e6));target.copy(earth.position);}
      else{eye.set(launching?95:38,launching?30:20,launching?35:48).applyQuaternion(ship.group.quaternion);target.set(0,0,launching?28:0).applyQuaternion(ship.group.quaternion);
        if(returning){const main=s.mainChuteFraction>0&&!['landing','touchdown','complete'].includes(s.phase);
          eye.copy(upVector).multiplyScalar(main?28:12).addScaledVector(east,main?65:30).addScaledVector(north,main?45:24);target.copy(upVector).multiplyScalar(main?16:2);}}
      if(['cockpit','ground'].includes(o.cameraMode)){
        // A mounted POV stays at the actual eye/lens, including during craft rotation and restore.
        camera.position.copy(eye);camera.quaternion.copy(desiredQ!);camera.up.copy(new THREE.Vector3(0,1,0).applyQuaternion(desiredQ!));controls.target.copy(target);transition=false;
      }else if(!manualOrbit){
        const blend=firstView?1:1-Math.exp(-dt*10);
        if(firstView)camera.position.copy(eye);
        else if(camera.position.distanceTo(eye)>10000){
          // Globe-to-cabin zoom stays outside Earth: interpolate direction and radius, not a chord through the globe.
          const current=camera.position.clone().sub(earth.position),goal=eye.clone().sub(earth.position),radius=Math.exp(THREE.MathUtils.lerp(Math.log(current.length()),Math.log(goal.length()),blend));
          const rotation=new THREE.Quaternion().setFromUnitVectors(current.clone().normalize(),goal.clone().normalize());
          current.normalize().applyQuaternion(new THREE.Quaternion().slerp(rotation,blend));camera.position.copy(earth.position).addScaledVector(current,radius);
        }else camera.position.lerp(eye,blend);
        controls.target.lerp(target,blend);
        const temp=new THREE.PerspectiveCamera();temp.position.copy(camera.position);temp.up.copy(o.cameraMode==='crew'||o.cameraMode==='cockpit'?new THREE.Vector3(0,1,0).applyQuaternion(ship.group.quaternion):upVector);temp.lookAt(controls.target);camera.up.copy(temp.up);
        camera.quaternion.slerp(desiredQ??temp.quaternion,blend);if(camera.position.distanceTo(eye)<.02)transition=false;
      }
      if(manualOrbit&&controls.enabled)controls.update();camera.fov=o.cameraMode==='crew'?68:o.cameraMode==='cockpit'?72:o.cameraMode==='ground'?CREW_GROUND_OPTICS.fovDeg:55;camera.updateProjectionMatrix();
      // One renderer; refresh only a visible on-board feed and never render a monitor into itself.
      const feedKey=[s.time,s.phase,...s.position,...s.attitude,...s.thrust,s.mainChuteFraction].join('|');
      if(!sensor.available)lastFeedKey='';
      if(sensor.available&&['cockpit','crew'].includes(o.cameraMode)&&now-lastFeed>100&&feedKey!==lastFeedKey){
        const shown=ship.cockpit.groundDisplay.visible;ship.cockpit.groundDisplay.visible=false;renderer.setRenderTarget(groundTarget);renderer.render(scene,groundCamera);renderer.setRenderTarget(null);ship.cockpit.groundDisplay.visible=shown;lastFeed=now;lastFeedKey=feedKey;
      }
      renderer.render(scene,camera);
      if(platformLabel.current){const projected=platform.position.clone().project(camera),visible=platform.visible&&s.distanceM<3000&&projected.z>=-1&&projected.z<=1&&Math.abs(projected.x)<.92&&Math.abs(projected.y)<.84;platformLabel.current.hidden=!visible;platformLabel.current.style.left=`${(projected.x*.5+.5)*mount.clientWidth}px`;platformLabel.current.style.top=`${(-projected.y*.5+.5)*mount.clientHeight}px`;platformLabel.current.textContent=`教学平台 · ${s.distanceM.toFixed(1)} m`;}
      if(directionLabels.current){for(const label of directionLabels.current.querySelectorAll<HTMLElement>('[data-vector]')){
        const key=label.dataset.vector as keyof typeof directionArrows,a=directionArrows[key],vector=vectorEntries[key];
        const end=a.position.clone().addScaledVector(vector.clone().normalize(),directionLengths[key]).project(camera);
        label.hidden=!a.visible||end.z< -1||end.z>1||Math.abs(end.x)>.94||Math.abs(end.y)>.9;
        label.style.left=`${(end.x*.5+.5)*mount.clientWidth}px`;label.style.top=`${(-end.y*.5+.5)*mount.clientHeight}px`;
      }}
      const projectLabel=(label:HTMLElement,point:THREE.Vector3,visible:boolean)=>{const end=point.clone().project(camera);label.hidden=!visible||end.z< -1||end.z>1||Math.abs(end.x)>.94||Math.abs(end.y)>.9;label.style.left=`${(end.x*.5+.5)*mount.clientWidth}px`;label.style.top=`${(-end.y*.5+.5)*mount.clientHeight}px`;};
      partLabels.current?.querySelectorAll<HTMLElement>('[data-part]').forEach((label,i)=>projectLabel(label,partEnds[i],partLines.visible&&(i!==3||s.altitudeM<120)));
      const forceNames=['重力','推力','气动阻力','伞拉力','地面支撑/缓冲'];
      forceLabels.current?.querySelectorAll<HTMLElement>('[data-force]').forEach((label,i)=>{const f=new THREE.Vector3(...forceVectors[i]),end=arrows[i].position.clone().addScaledVector(f.normalize(),forceLengths[i]);label.textContent=`${forceNames[i]} ${(forceValue(forceVectors[i])/1000).toFixed(1)} kN`;projectLabel(label,end,arrows[i].visible&&returning);});
      mount.dataset.phase=s.phase;mount.dataset.time=String(s.time);mount.dataset.cameraMode=o.cameraMode;mount.dataset.transition=String(transition);
      mount.dataset.attitudeError=String(ship.group.quaternion.angleTo(q));mount.dataset.carrier=carrier.root.visible?'shared-authored':'separated';
      mount.dataset.altitude=String(s.altitudeM);mount.dataset.mainFraction=String(s.mainFraction);mount.dataset.capsuleRcsJets=String(returnVisuals.attitudeJets.filter(j=>j.flame.visible).length);mount.dataset.capsuleRcsFuel=String(s.capsuleRcsFuelKg);mount.dataset.attitudeSource=s.attitudeSource;
      mount.dataset.canopyArea=String(s.chuteAreaM2);mount.dataset.inertialVisible=String(directionArrows.inertial.visible);
      mount.dataset.footClearance=String(s.lowestPointClearanceM);mount.dataset.landingTilt=String(s.landingTiltDeg);mount.dataset.recoveryReady=String(s.recoveryReady);
      mount.dataset.pilotPose=ship.cockpit.pilot.group.userData.pose;mount.dataset.pilotEyeError=String(o.cameraMode==='cockpit'?camera.position.distanceTo(eye):0);
      mount.dataset.groundRange=sensor.rangeM===null?'none':String(sensor.rangeM);mount.dataset.groundDownAngle=String(sensor.downAngleDeg);mount.dataset.groundFeed=ship.cockpit.groundDisplay.userData.source;
      mount.dataset.cameraForward=JSON.stringify(new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).toArray());mount.dataset.cameraUp=JSON.stringify(camera.up.toArray());
      mount.dataset.instrumentMode=cockpitReading.mode;mount.dataset.instrumentPrimary=String(cockpitReading.distance);mount.dataset.instrumentVertical=String(cockpitReading.closing);mount.dataset.instrumentClearance=String(cockpitReading.clearanceM??'');
      mount.dataset.pilotRoute=s.pilot.active?'self-directed':s.fullDemo?'automatic-demo':'legacy-authorized';mount.dataset.controlMode=s.automatic?'assisted':'manual';mount.dataset.pendingAction=s.pilot.pendingAction??'';mount.dataset.throttle=String(s.pilot.throttle);
    };frame=requestAnimationFrame(animate);
    return()=>{alive=false;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',up);renderer.domElement.removeEventListener('webglcontextlost',lost);ship.cockpit.setGroundFeed(null);groundTarget.dispose();disposeEnvironmentScene(scene);reflection.dispose();light.shadow.dispose();renderer.dispose();renderer.domElement.remove();};
  },[]);
  const keyDown=(e:React.KeyboardEvent)=>{
    if(e.key==='Escape'){e.preventDefault();if(exit){setExit(false);host.current?.parentElement?.focus();}else requestExit();return;}
    if(e.code==='Space'&&e.target instanceof HTMLElement&&!e.target.closest('button,input,select,a,summary')){e.preventDefault();command(playing?'pause':'resume');return;}
    if(!exit&&map[e.code]&&e.target instanceof HTMLElement&&!e.target.closest('button,input,select,a,summary')){e.preventDefault();if(playing&&state&&!state.automatic&&!state.pilot.pendingAction&&crewPilotKeyAvailable(state,e.code))flightKey(e.code,true);}
    if(e.key==='Tab'){const scope=exit?root.current!.querySelector('.crew-overlay')!:root.current!,nodes=[...scope.querySelectorAll<HTMLElement>('button:not(:disabled),select,input,a[href],summary,[tabindex="0"]')].filter(n=>n.getClientRects().length),first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
  };
  const press=(label:string,code:string)=><button data-flight-key={code} aria-pressed={pressedCodes.includes(code)} title={state?.automatic?'先接管驾驶，再继续模拟并按住控制':!playing?'当前暂停，继续模拟后可控制':undefined} disabled={!playing||!state||state.automatic||!!state.pilot.pendingAction||!crewPilotKeyAvailable(state,code)||exit} onPointerDown={e=>{e.preventDefault();if(!playing||!state||state.automatic||state.pilot.pendingAction||!crewPilotKeyAvailable(state,code))return;flightKey(code,true);e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={()=>flightKey(code,false)} onPointerCancel={()=>flightKey(code,false)} onLostPointerCapture={()=>flightKey(code,false)} onKeyDown={e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();flightKey(code,true);}}} onKeyUp={e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();flightKey(code,false);}}} onBlur={()=>flightKey(code,false)}>{label}</button>;
  const s=state,p=s?CREW_PHASES[s.phase]:null,enabled=checks.every(Boolean)&&!!s,directions=s?crewDirections(s):null,returning=s?crewReturning(s.phase,s.serviceAttached):false,balance=s?crewForceBalance(s):null,observation=s?crewObservation(s):null;
  const availability=s?crewPilotInputAvailability(s):null;
  const pilotRoute=!!s?.pilot.active,flightControl=!!availability?.flight,throttlePhase=!!s&&CREW_PILOT_THROTTLE_PHASES.includes(s.phase),rcsPhase=!!s&&CREW_PILOT_RCS_PHASES.includes(s.phase),throttleEnabled=!!availability?.throttle&&!s?.automatic&&playing&&!s?.pilot.pendingAction;
  const checkpoint=s?.pilot.actions.find(a=>a.action===s.pilot.pendingAction),orbit=s?orbitalElements(s.position,s.velocity):null;
  const propulsion=s?crewPropulsionReadout(s):null,playback=s?crewPlaybackReadout(s,playing,rate):null,observationReady=!!s&&crewObservationReady(s),terminal=!!s&&['failed','complete'].includes(s.phase);
  const phaseTitle=s?.phase==='failed'?'任务停止 · 未完成':p?.title??'准备载人任务…';
  const phaseInstructions=s&&['failed','complete'].includes(s.phase)?p?.action:pilotRoute?'自主任务：你决定关键步骤，飞控辅助负责当前阶段的制导；也可以接管姿态与可用发动机。':p?.action;
  const inputHint=rcsPhase?availability?.rcs?'W/S 正反平移 · B 相对平台减速':'服务舱推进剂耗尽，平移与相对制动不可用':throttlePhase?availability?.throttle?'W/S 增减油门（松手后保持）':'当前推力控制不可用，先核对授权与推进剂':'此段没有平移与主推力设备';
  const angle=(value:number|null|undefined)=>value==null?'—':`${value.toFixed(1)}°`;
  const chapter=s?crewMissionChapter(s):0;
  return <section className="crewed-mission" role="dialog" aria-modal="true" aria-label="地球出发 · 载人飞行任务" ref={root} onKeyDown={keyDown} onKeyUp={e=>flightKey(e.code,false)}>
    <header className="crew-header" inert={exit}><button onClick={requestExit}>← 返回探索</button><div className="crew-brand"><small>BLUE HORIZON / CREWED FLIGHT</small>地球出发 · 第一次载人任务</div><div><span>连续计算 · 原创教学载具</span><button onClick={()=>{command('pause');download();}}>下载任务记录</button></div></header>
    <div className="crew-layout" inert={exit}>
      <div className="crew-stage" tabIndex={0} aria-label="三维飞行画面，接管后可使用驾驶按键，空格暂停或继续" onFocus={e=>setKeyboardFocused(e.target===e.currentTarget)} onBlur={()=>{setKeyboardFocused(false);clearFlightInput();}} onPointerDown={()=>host.current?.parentElement?.focus()}>
        <div className="crew-canvas" ref={host}/><div className="crew-platform-label" ref={platformLabel} hidden/><div className="crew-direction-labels" ref={directionLabels}><span data-vector="forward" hidden>船头方向</span><span data-vector="inertial" hidden>地心速度</span><span data-vector="air" hidden>相对空气速度</span><span data-vector="platform" hidden>相对平台速度</span><span data-vector="shield" hidden>热盾朝向</span></div>
        <div className="crew-part-labels" ref={partLabels}><span data-part="nose" hidden>船头 / 伞绳吊点</span><span data-part="shield" hidden>尾部 · 底部热盾</span><span data-part="nozzle" hidden>软着陆喷口</span><span data-part="feet" hidden>接地支脚 / 缓冲</span></div>
        <div className="crew-force-labels" ref={forceLabels}>{['gravity','thrust','drag','chute','contact'].map(name=><span key={name} data-force={name} hidden/>)}</div>
        <div className="crew-status"><small>{texture} · T {s?duration(s.time):'—'}</small><h1>{phaseTitle}</h1><p>{s?.phase==='countdown'?propulsion?.title:p?.why}</p><p className="crew-current-control">{pilotRoute?'自主任务 · ':s?.fullDemo?'完整自动演示 · ':''}{s?.phase==='failed'?'任务已停止':s?.phase==='complete'?'任务已完成':s?.automatic?'飞控辅助执行 · 驾驶员监控':'本人驾驶 · 1× 物理时间'}{!playing&&s&&!terminal?(checkpoint?' · 教学检查点已暂停':observationReady?' · 等待记录观察':s.phase!=='ground'?' · 已暂停':''):''}</p></div>
        {flightControl&&<div className="crew-key-hint" data-keyboard-focused={keyboardFocused}>{s?.automatic?'飞控辅助执行；接管后可操作。':!playing?'模拟暂停，点击继续后可驾驶。':keyboardFocused?'键盘已接入主画面：':'键盘未接入：点击主画面或右侧「启用键盘」。'}<br/>{inputHint} · {availability?.attitude?'A/D 偏航 · ↑↓ 俯仰 · Q/E 滚转':'当前无主动转姿能力'} · 空格暂停</div>}
        {forces&&cameraMode==='follow'&&<div className="crew-force-legend">紫：重力　橙：推力　蓝：气动阻力<br/>绿：伞拉力　白：地面作用力<br/>黄绿：船头　青：地心速度　粉：相对平台速度<br/>浅蓝：相对空气速度　浅橙：热盾朝向<br/>{returning?'力箭头按重量缩放；长箭头截短，小力保留标记，以 kN 为准。':'方向辅助线仅在外部跟随显示；长度为示意。'}<br/>{returning?'箭头移到舱旁方便读数，不表示施力点。':''}</div>}
        {s&&['cockpit','ground','crew'].includes(cameraMode)&&<div className="crew-view-note"><b>{cameraMode==='ground'?'舱底摄像头 · 固定镜头':cameraMode==='cockpit'?'驾驶员舷窗 · 约束卧姿':'返回舱内 · 驾驶员与承力座椅'}</b><span>{cameraMode==='ground'?observation?.feedDescription:cameraMode==='cockpit'?`${observation?.windowDescription} 拖动画面可转头；下方仪表显示当前阶段读数。`:'头部靠近船头，双腿屈曲、脚固定在脚托；人物随舱体转姿。'}</span></div>}
        {returning&&s&&<div className="crew-return-motion"><b>{['touchdown','complete'].includes(s.phase)?'已接地 · 缓冲 / 支撑':s.verticalMS<-.05?'正在下降':s.verticalMS>.05?'正在上升':'竖直近乎停稳'}</b><span>{balance?.explanation}</span></div>}
        <div className="crew-hud"><div>{returning?'参考点离地高度':'高度'}<b>{s?s.altitudeM<1000?`${s.altitudeM.toFixed(2)} m`:`${(s.altitudeM/1000).toFixed(2)} km`:'—'}</b></div><div>{s&&['approach','observe','return-ready'].includes(s.phase)?'平台相对速率':'垂直速度'}<b>{s?(s&&['approach','observe','return-ready'].includes(s.phase)?s.relativeSpeedMS:s.verticalMS).toFixed(2):'—'} m/s</b></div><div>乘员过载<b>{s?s.properG.toFixed(2):'—'} g</b></div></div>
        <nav className="crew-camera" aria-label="载人任务镜头">{([['follow','外部跟随'],['cockpit','驾驶员视角'],['crew','舱内看驾驶员'],['ground','对地摄像'],['orbit','轨道全景']] as const).map(([mode,label])=><button key={mode} data-camera={mode} disabled={mode==='ground'&&(!s||s.serviceAttached)} title={mode==='ground'&&s?.serviceAttached?'服务舱分离后启用舱底摄像头':undefined} aria-pressed={cameraMode===mode} onClick={()=>setCameraMode(mode)}>{label}</button>)}{cameraMode==='cockpit'&&<><button data-look="instruments" onClick={()=>pilotLook.current(-.60)}>看仪表</button><button data-look="forward" onClick={()=>pilotLook.current(0)}>回正视线</button></>}<button aria-pressed={forces} onClick={()=>setForces(v=>!v)}>受力与速度方向</button></nav>
      </div>
      <aside className="crew-side"><small className="crew-section-label">MISSION / 任务与操作</small><h2>{phaseTitle}</h2><p>{phaseInstructions}</p>
        <div className="crew-timeline">{['准备','发射入轨','在轨观察','返回下降','着陆回收'].map((name,i)=><span key={name} aria-current={chapter===i?'step':undefined}>{name}</span>)}</div>
        {s&&(pilotRoute||s.phase==='failed'||s.phase==='complete')&&<CrewPilotBriefing state={s} playing={playing}/>}
        {s&&['failed','complete'].includes(s.phase)&&<section className="crew-terminal-card" aria-label="任务结束操作">
          {s.phase==='failed'&&<p role="alert" className="crew-warning">{s.message}</p>}
          <p>{s.phase==='failed'?'飞行已停止，当前状态没有回退；恢复仅使用你保存过的任务。':'本次实际结果已保留，下载记录用于回顾；重新开始会从地面准备进入。'}</p>
          <div className="crew-actions"><button data-terminal-download onClick={download}>下载本次结果</button>{s.phase==='failed'&&<button data-terminal-restore disabled={!savedAvailable||!!error} onClick={restore}>恢复已保存任务</button>}<button data-terminal-restart onClick={requestExit}>重新开始／结束</button></div>
        </section>}
        {returning&&s&&<div className="crew-return-summary"><p><b>当前只返回乘员舱</b>；服务舱和它的主发动机已经分离。宽底是热盾，窄头是船头与伞绳吊点，舷窗在舱体侧面。返回舱保留独立姿态喷口与推进剂；近地软着陆喷口另有专用储备。</p><p>{['touchdown','complete'].includes(s.phase)?'高度是返回舱参考点离地高度，至少一个支脚角点已首次触地，其他支脚随缓冲逐渐承载；参考点不会降到 0 m。':s.phase==='return-coast'?'离轨后仍在高空滑行，独立喷口逐渐完成热盾转姿；120 km 为教学阶段界线，并非空气突然出现。':s.phase==='entry'?'热盾迎风朝向相对空气运动，船头在后方；角度来自连续转姿计算。':'相对共转空气的速度用于阻力与伞拉力；此模型没有额外风场。'}</p><label className="crew-inertial-toggle"><input type="checkbox" checked={inertialOnReturn} onChange={e=>setInertialOnReturn(e.target.checked)}/>额外显示地心速度箭头（含地球自转）</label></div>}
        {s?.phase==='ground'&&!pilotRoute?<><p>你是返回舱内的驾驶员。乘火箭入轨，接近教学平台，辨认舱段、太阳能翼与天线，然后返回零海拔教学陆地。</p><div className="crew-checks">{['已检查驾驶员座椅与约束带','已了解推进剂与开伞/软着陆设备','已明确观察目标与返回任务'].map((label,i)=><label key={label}><input type="checkbox" checked={checks[i]} onChange={e=>setChecks(old=>old.map((x,j)=>j===i?e.target.checked:x))}/>{label}</label>)}</div><button className="crew-primary crew-start-demo" disabled={!enabled||!!error} onClick={()=>command('start-demo')}>开始完整自动演示 →</button><button className="crew-start-pilot" data-pilot-start disabled={!enabled||!!error} onClick={()=>command('start-pilot')}>自主任务 · 我来操作 →</button><p>自动演示贯通全部故事。自主任务由你决定点火、分离、返回、开伞与回收；飞控辅助可以随时切换为本人驾驶。</p></>:<>{!terminal&&<div className="crew-actions"><button className="crew-pause" disabled={!!error||!!checkpoint} onClick={()=>command(playing?'pause':'resume')}>{playing?'暂停':checkpoint?'等待步骤授权':'继续模拟'}</button></div>}
        {pilotRoute&&s&&!['failed','complete'].includes(s.phase)&&<section className="crew-pilot-card" aria-label="自主任务控制" data-pilot-route="self-directed" data-control-mode={s.automatic?'assisted':'manual'} data-pending-action={s.pilot.pendingAction??''}>
          <h3>自主任务 · 关键步骤由你决定</h3><p>{s.automatic?'飞控辅助已开启：系统稳定姿态、执行当前段制导。':'本人驾驶：姿态输入及可用发动机直接参与计算，时间固定 1×。'}恢复辅助不会代你授权后续任务步骤。</p>
          {checkpoint&&<div className="crew-checkpoint" role="status"><b>教学检查点 · 模拟时钟已暂停</b><span>下一动作：{checkpoint.label}</span><span>{checkpoint.allowed?'确认后继续当前任务。':`当前条件未满足：${checkpoint.reason}`}</span></div>}
          {s.pilot.actions.length>0&&<div className="crew-pilot-actions">{s.pilot.actions.map(action=><div key={action.action}><button data-pilot-action={action.action} className={action.action===s.pilot.pendingAction?'crew-primary':undefined} disabled={!action.allowed||!!error} onClick={()=>pilotAction(action.action)}>{action.label}</button><p>{action.reason}</p></div>)}</div>}
          {s.phase==='observe'&&<p>平台结构观察需要你记录；满足距离、相对速度和指向条件后，可点击下方记录按钮。</p>}
          {flightControl&&<><div className="crew-actions"><button className="crew-takeover" data-control-toggle data-pilot-takeover={s.automatic?"true":undefined} data-pilot-assist={!s.automatic?"true":undefined} disabled={!!error} onClick={()=>s.automatic?takeOver():command('automatic')}>{s.automatic?'接管姿态与推力':'恢复飞控辅助'}</button></div>
            {throttlePhase&&<div className="crew-throttle"><label htmlFor="crew-throttle">{s.automatic?'手动油门预设':'本人油门指令'} <output>{Math.round(s.pilot.throttle*100)}%</output></label><input id="crew-throttle" data-throttle-control data-pilot-throttle type="range" min="0" max="1" step=".01" value={s.pilot.throttle} disabled={!throttleEnabled} onChange={e=>throttle(Number(e.target.value))}/><div className="crew-actions"><button data-pilot-stop disabled={!throttleEnabled} onClick={()=>throttle(0)}>停推 · 油门归零</button></div><p className="crew-real-thrust">{playing?'实际推力':'暂停时刻推力'} {(forceValue(s.thrust)/1000).toFixed(1)} kN · {propulsion?.title}</p><p>{!s.pilot.engineEnabled?'当前发动机未获授权；先按任务条件授权点火。':s.automatic?'接管后可调油门；辅助模式由系统调节推力。':'W/S 每秒增减 20% 油门，松手后保持；0% 关推力，飞船继续按惯性与受力运动。'}</p></div>}
            <p className="crew-control-authority" data-attitude-available={availability?.attitude}>{availability?.attitudeReason}</p>
            <div className="crew-input-feedback" data-held-keys={pressedCodes.join(',')}><span>{s.automatic?'辅助驾驶中，手动输入未接入。':!playing?'模拟暂停，驾驶输入未接入。':pressedCodes.length?`正在输入：${pressedCodes.map(code=>({KeyW:rcsPhase?'正向平移':'增油门',KeyS:rcsPhase?'反向平移':'减油门',KeyA:'左偏航',KeyD:'右偏航',ArrowUp:'俯仰',ArrowDown:'俯仰',KeyQ:'左滚转',KeyE:'右滚转',KeyB:'相对减速'}[code]??code)).join(' · ')}`:'未按驾驶键，按住按钮或启用键盘。'}</span><button data-pilot-focus disabled={s.automatic||!playing} onClick={()=>host.current?.parentElement?.focus()}>启用键盘</button></div>
            <p>{inputHint}；{availability?.attitude?'A/D 偏航、↑↓ 俯仰、Q/E 滚转。':''}先接管，再继续模拟并按住控制。</p>
            <div className="crew-control-grid">{(rcsPhase||throttlePhase)&&<>{press(rcsPhase?'推进 W':'增油门 W','KeyW')}{press(rcsPhase?'反推 S':'减油门 S','KeyS')}{rcsPhase&&press('相对减速 B','KeyB')}</>}{press('左偏航 A','KeyA')}{press('右偏航 D','KeyD')}{press('抬头 ↑','ArrowUp')}{press('低头 ↓','ArrowDown')}{press('左滚转 Q','KeyQ')}{press('右滚转 E','KeyE')}</div>
            {!rcsPhase&&!throttlePhase&&<p>此段通过姿态喷口控制朝向；没有主发动机推进。错误姿态会改变方向与受力，但本版未计算热盾偏转造成的材料损伤。</p>}
          </>}
        </section>}
        {!pilotRoute&&flightControl&&<div className="crew-actions"><button className="crew-takeover" onClick={()=>s?.automatic?takeOver():command('automatic')}>{s?.automatic?'接管当前阶段驾驶':'恢复飞控辅助'}</button></div>}
        {s?.phase==='observe'&&<button className="crew-primary crew-record-observation" disabled={!observationReady||!!error} onClick={()=>command('observe')}>记录平台结构观察</button>}{!pilotRoute&&s?.phase==='return-ready'&&<button className="crew-primary" onClick={()=>command('return')}>确认返回，执行离轨</button>}{!pilotRoute&&s?.phase==='drogue'&&!s.fullDemo&&<button className="crew-primary" disabled={s.altitudeM>=4000||s.groundSpeedMS>=120||s.dynamicPressurePa>=10000} onClick={()=>command('main-chute')}>条件满足时授权主伞</button>}{!pilotRoute&&s?.phase==='touchdown'&&<button className="crew-primary" disabled={!s.recoveryReady} onClick={()=>command('recover')}>检查并发送回收信号</button>}
        {s&&orbit&&!['ground','countdown','ascent','upper','touchdown','complete','failed'].includes(s.phase)&&<dl className="crew-readings crew-orbit-readings"><div><dt>当前近地点高度</dt><dd>{(orbit.periapsisM/1000).toFixed(1)} km</dd></div><div><dt>当前远地点高度</dt><dd>{orbit.apoapsisM===null?'开放轨道':`${(orbit.apoapsisM/1000).toFixed(1)} km`}</dd></div><div><dt>轨道倾角</dt><dd>{orbit.inclinationDeg.toFixed(2)}°</dd></div><div><dt>参考轨道类型</dt><dd>{orbit.bound?'束缚轨道':'开放轨迹'}</dd></div></dl>}
        {s&&orbit&&!['ground','countdown','ascent','upper','touchdown','complete','failed'].includes(s.phase)&&<p className="crew-orbit-note">近远地点由当前地心位置、速度按双体轨道即时估算，高度相对地球赤道半径；负近地点表示轨迹进入地球，并非已安全入轨。返回有阻力时，不是落点预报。</p>}
        <label className="crew-rate">辅助播放倍率<select value={rate} disabled={terminal||!!s&&!s.automatic} onChange={e=>{clearFlightInput();setRate(Number(e.target.value));}}>{[1,10,60,180].map(x=><option key={x} value={x}>{x}×</option>)}</select></label>{playback&&<div className="crew-playback-readout" data-selected-rate={playback.requested} data-adopted-rate={playback.adopted}><b>选择 {playback.requested}× · 当前采用 {playback.adopted===0?'时钟暂停':`${playback.adopted}×`}</b><span>{playback.reason}</span></div>}<p className="crew-propulsion-note">倍率表示计算推进设置；设备计算跟不上时，实际播放会更慢。{pilotRoute?'关键步骤暂停等你授权；恢复辅助保留所选倍率。':'完整自动演示按故事继续推进。'}</p></>}
        <details className="crew-save"><summary>保存与恢复任务</summary><p>保存会暂停并覆盖本浏览器的载人任务存档。恢复会替换当前未保存进度，核对后再点击继续；不影响卫星案例存档。</p><div className="crew-actions"><button disabled={!s||!!error} onClick={()=>command('save')}>保存当前任务</button><button disabled={!savedAvailable||!!error} onClick={restore}>恢复浏览器存档</button></div></details>
        {notice&&<div role="status"><p>{notice}</p><button className="crew-dismiss-notice" onClick={()=>setNotice('')}>关闭提示</button></div>}{error&&<p role="alert" className="crew-warning">{error}</p>}
        {s&&!s.serviceAttached&&<details open className="crew-landing-checks"><summary>接地与回收条件</summary><dl className="crew-readings"><div><dt>船头相对竖直倾角</dt><dd>{s.landingTiltDeg.toFixed(2)}°</dd></div><div><dt>支脚状态</dt><dd>{s.landingLegsDeployed?'已展开':'未展开'}</dd></div><div><dt>实体最低点离地</dt><dd>{s.lowestPointClearanceM.toFixed(2)} m</dd></div><div><dt>首次接地倾角</dt><dd>{s.touchdownTiltDeg===null?'尚未接地':`${s.touchdownTiltDeg.toFixed(2)}°`}</dd></div></dl><p>先检测支脚角点与舱体，接地倾角须≤15°、角速率≤5°/s，接地点垂直速度≤3 m/s、水平≤5 m/s；随后缓冲停稳才能回收。均为本模型教学阈值。</p>{['touchdown','complete','failed'].includes(s.phase)&&<ul>{s.recoveryChecks.map(c=><li key={c.label} data-passed={c.passed}>{c.passed?'已满足':'未满足'} · {c.label}</li>)}</ul>}<p>“任务完成”表示教学流程检查通过；热防护材料、结构损伤、生命保障与乘员健康尚未计算。</p></details>}
        {s&&<><dl className="crew-readings"><div><dt>地心惯性速度</dt><dd>{s.orbitalSpeedMS.toFixed(1)} m/s</dd></div><div><dt>相对地面垂直速度</dt><dd>{s.verticalMS.toFixed(2)} m/s</dd></div><div><dt>当前整体质量</dt><dd>{(s.massKg/1000).toFixed(2)} t</dd></div>{launchPhase(s)&&<div><dt>当前火箭剩余推进剂</dt><dd>{(s.launchFuelKg/1000).toFixed(2)} t</dd></div>}<div><dt>服务舱推进剂</dt><dd>{s.serviceFuelKg.toFixed(1)} kg{s.serviceAttached?'':' · 已随服务舱分离'}</dd></div><div><dt>返回舱姿态专用推进剂</dt><dd>{s.capsuleRcsFuelKg.toFixed(2)} kg</dd></div><div><dt>软着陆专用推进剂</dt><dd>{s.landingFuelKg.toFixed(1)} kg</dd></div></dl>
        <details open className="crew-attitude-card"><summary>谁在控制船头方向？</summary><p>{s.attitudeSource}。船体通过连续角运动转向，不会把现有速度一起转过去。</p><dl className="crew-readings"><div><dt>实际角速率</dt><dd>{(forceValue(s.angularVelocity)*180/Math.PI).toFixed(3)} °/s</dd></div><div><dt>实际合力矩 · 船体坐标</dt><dd>{forceValue(s.attitudeTorqueNm).toFixed(1)} N·m</dd></div><div><dt>气动 / 伞恢复力矩</dt><dd>{forceValue(s.passiveTorqueNm).toFixed(1)} N·m</dd></div></dl><p>{!s.automatic?'驾驶员输入产生转动力矩；松手停止主动转向输入，气动、伞与姿态阻尼仍参与受力。':returning?'返回舱喷口在迎风或吊挂姿态稳定后待机，偏角大时辅助纠正。':launchPhase(s)?'火箭制导给出目标方向，实际推力沿当前发动机轴；需要时间完成转姿。':'服务舱喷口产生转动力矩；旋转船体和用平移推力改变航迹分别控制。'}这里采用有效转动惯量与简化力矩，未求解真实飞控和完整气动系数。</p></details>
        <details open className="crew-direction-card"><summary>船头、运动与受力方向</summary><p>{directions?.description}</p><dl className="crew-readings"><div><dt>船头与{returning?'空气相对':'地心'}速度夹角</dt><dd>{angle(returning?directions?.forwardAirDeg:directions?.forwardVelocityDeg)}</dd></div><div><dt>推力与{returning?'空气相对':'地心'}速度夹角</dt><dd>{angle(returning?directions?.thrustAirDeg:directions?.thrustVelocityDeg)}</dd></div>{!s.serviceAttached&&<div><dt>热盾与相对空气速度夹角</dt><dd>{angle(directions?.heatShieldAirDeg)}</dd></div>}<div><dt>相对空气速率</dt><dd>{directions?.airRelativeVelocity.length().toFixed(2)} m/s</dd></div></dl><p>0° 表示同向，180° 表示反向；相对速率小于 0.05 m/s 或没有推力时不显示相应角度。青色始终采用地心惯性参照，返回段默认隐藏，可在上方单独打开；浅蓝表示共转空气参照。</p></details>
        {returning&&<details open className="crew-force-balance"><summary>为什么向下走，却向上受力？</summary><p>{balance?.explanation}</p><dl className="crew-readings"><div><dt>竖直合力 · 上为正</dt><dd>{((balance?.verticalN??0)/1000).toFixed(2)} kN</dd></div><div><dt>下降速度变化率 · 上为正</dt><dd>{balance?.verticalAccelerationMS2.toFixed(2)} m/s²</dd></div><div><dt>当前有效开伞面积</dt><dd>{['touchdown','complete'].includes(s.phase)?'已接地卸载':`${s.chuteAreaM2.toFixed(1)} m²`}</dd></div><div><dt>伞型</dt><dd>{s.mainChuteFraction>0?'主伞':s.drogueFraction>0?'减速伞':'未开伞'}</dd></div></dl><p>合力包括重力、推力、阻力、伞拉力和地面作用力。下降速度变化率采用地面参照，扣除地球自转与局部竖直方向变化；伞拉力和发动机推力是两项不同的力。</p></details>}
        <details open><summary>当前受力与空气参数</summary><dl className="crew-readings"><div><dt>重力</dt><dd>{(forceValue(s.gravity)/1000).toFixed(1)} kN</dd></div><div><dt>推力</dt><dd>{(forceValue(s.thrust)/1000).toFixed(1)} kN</dd></div><div><dt>气动阻力</dt><dd>{(forceValue(s.drag)/1000).toFixed(1)} kN</dd></div><div><dt>降落伞拉力</dt><dd>{(forceValue(s.chuteForce)/1000).toFixed(1)} kN</dd></div><div><dt>地面作用力</dt><dd>{(forceValue(s.contactForce)/1000).toFixed(1)} kN</dd></div><div><dt>空气密度</dt><dd>{s.density.toExponential(2)} kg/m³</dd></div><div><dt>动压</dt><dd>{(s.dynamicPressurePa/1000).toFixed(2)} kPa</dd></div><div><dt>迎风热流 · 非温度</dt><dd>{s.heatFluxWm2===null?'此段不估算':`${(s.heatFluxWm2/1000).toFixed(0)} kW/m²`}</dd></div></dl></details>
        {['approach','observe','return-ready'].includes(s.phase)&&<details open><summary>平台相对运动与人工操作</summary><dl className="crew-readings"><div><dt>平台中心距离</dt><dd>{s.distanceM.toFixed(1)} m</dd></div><div><dt>平台相对速率</dt><dd>{s.relativeSpeedMS.toFixed(3)} m/s</dd></div><div><dt>船头偏角</dt><dd>{s.pointingDeg.toFixed(1)}°</dd></div><div><dt>控制对象</dt><dd>返回舱与服务舱</dd></div></dl><p>相对平台停稳不等于停止绕地。只转船头不会把原来的速度一起转过去；平移推力逐渐改变航迹。控制按钮位于上方自主任务操作区。</p></details>}
        {(s.inspection||s.touchdownSpeedMS!==null)&&<div className="crew-report"><h3>本次实际记录</h3>{s.inspection&&<p>平台观察：{s.inspection.distanceM.toFixed(1)} m、相对速率 {s.inspection.relativeSpeedMS.toFixed(3)} m/s。记录了舱段、太阳能翼和通信天线的结构观察条件。</p>}{s.touchdownSpeedMS!==null&&<p>接地垂直速度 {s.touchdownSpeedMS.toFixed(2)} m/s，水平速度 {s.touchdownHorizontalMS?.toFixed(2)} m/s。{s.phase==='failed'?'未判定安全着陆。':s.phase==='complete'?'教学接地检查与回收信号已完成，不等于实飞安全认证。':'正在检查与缓冲。'}</p>}<button onClick={download}>下载本次任务结果</button></div>}
        <details open className="crew-observation-card"><summary>驾驶员怎样观察与着陆？</summary><p>乘员由承力座椅、头部侧垫、五点约束带和脚托固定，头部靠近船头、双腿屈曲。身体和座椅一起随飞船转姿；舷窗视角来自同一人物的眼睛，不把镜头翻转来假装看见地面。</p><p>{observation?.windowDescription}</p><dl className="crew-readings"><div><dt>默认视线与当地向下夹角</dt><dd>{angle(observation?.gazeDownDeg)}</dd></div><div><dt>舱底镜头与当地向下夹角</dt><dd>{angle(observation?.downAngleDeg)}</dd></div><div><dt>镜头中心至参考地表</dt><dd>{!observation?.available?'尚未启用':observation.rangeM==null?'未指向地面':observation.rangeM<1000?`${observation.rangeM.toFixed(2)} m`:`${(observation.rangeM/1000).toFixed(2)} km`}</dd></div></dl><p>{observation?.feedDescription}</p><div className="crew-actions"><button onClick={()=>setCameraMode('crew')}>查看座椅与驾驶员</button><button onClick={()=>setCameraMode('cockpit')}>进入舷窗与仪表</button><button disabled={!s||s.serviceAttached} onClick={()=>setCameraMode('ground')}>放大对地摄像</button></div><p>发射读高度、竖直速度和火箭推进剂；在轨读平台距离、接近速度和服务舱资源；返回读参考点高度、最低点净空、下降速度、倾角与过载。竖直速度向上为正。摄像头随舱体朝向，不能代替导航、雷达或安全着陆判定。</p><small>卧姿与约束原则参考 <a href="https://www.nasa.gov/reference/crew-systems/" target="_blank" rel="noreferrer">NASA 猎户座乘员座椅资料</a>；本载具、摄像头安装与着陆方式为原创教学设计，未模拟生命保障、人体受力或热环境对镜头的损伤。</small></details>
        <details><summary>驾驶员与自动驾驶分工</summary><p>同一个三维驾驶员在整个任务中保持座椅约束。驾驶员视角可拖动转头，舱内镜头展示完整人物和操纵器；舱底画面是独立摄像头，不是透过热盾观察。</p><p>完整自动演示由系统完成流程。自主任务将步骤授权与飞行控制分开：你决定点火、分离、开伞和回收，飞控辅助执行当前段制导；各飞行阶段可以接管姿态，可用发动机阶段还可控制油门，在轨可正反平移。返回滑行、再入和伞降段只有姿态喷口，不提供虚构主发动机。恢复辅助保留当前位置、速度与资源，并等待你授权后续步骤。切换镜头不会改变飞船朝向、推进剂或任务进度。</p></details>
        <details><summary>完整规划与本版边界</summary><p>①任务与载具 → ②共同地心状态 → ③发射连续交接 → ④在轨驾驶 → ⑤平台观察 → ⑥再入、开伞、软着陆与回收。</p><p>本版已接入上述教学流程。载具质量、发动机、平台轨道安排与阈值为原创假设；不是某型号实飞复刻。</p><p>载人流程使用独立的质量与资源；火箭外形与发射基地复用已有细节模型，适配载人接口和尺寸。</p><p>地球常数与参考大气来自已有本地资料。尚未计算真实地形和落区天气、伞绳弹性、完整热防护与生命保障、备份伞故障或回收人员作业；地表为零海拔教学陆地。</p><p>发射、在轨与返回姿态共用连续角运动；推力沿实际船体发动机轴。返回舱有独立姿态喷口，气动与伞吊挂采用简化恢复力矩和有效标量惯量。接地采用有限时长缓冲近似。服务舱与火箭分离后的处置需另做任务，未假装与返回舱一起着陆。</p><p><a href="https://www.nasa.gov/missions/artemis/how-to-fly-nasas-orion-spacecraft/" target="_blank" rel="noreferrer">NASA：旋转与平移操控</a><br/><a href="https://www.nasa.gov/general/how-do-spacecraft-slow-down-we-asked-a-nasa-technologist-episode-22/" target="_blank" rel="noreferrer">NASA：反推与大气减速</a><br/><a href="https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/The_return_home" target="_blank" rel="noreferrer">ESA：返回、开伞与软着陆</a></p></details>
        <details><summary>本次阶段记录 · 不跳转任务</summary><ol className="crew-events">{s.events.map((e,i)=><li key={i}>T {duration(e.time)} · {e.label}</li>)}</ol></details>
        {s.phase!=='ground'&&<button className="crew-restart" onClick={()=>{command('pause');setExit(true);}}>结束或重新开始</button>}</>}
      </aside>
    </div><footer className="crew-footer" inert={exit}>同一任务时钟、地心位置速度与独立资源账本 · 镜头不驱动飞船 · 三维箭头大小为显示比例 · 自主任务全流程授权，各飞行段可接管姿态，可用发动机段可调推力</footer>
    {exit&&<div className="crew-overlay" role="alertdialog" aria-modal="true" aria-label="结束载人任务"><div><h2>{s?.phase==='failed'?'本次任务已停止':s?.phase==='complete'?'本次任务已完成':'当前任务已暂停'}</h2><p>返回或重开会结束本次进度。可先保存可恢复的浏览器存档；下载记录用于回顾分析。</p>{notice&&<p role="status">{notice}</p>}<div className="crew-actions"><button autoFocus onClick={()=>setExit(false)}>留在任务中</button><button disabled={!s||!!error} onClick={()=>command('save')}>保存当前任务</button><button onClick={download}>下载记录</button><button onClick={()=>{setExit(false);setChecks([false,false,false]);setNotice('');command('reset');setCameraMode('follow');pilotLook.current(0);}}>重新开始</button><button onClick={onClose}>返回探索</button></div></div></div>}
  </section>;
}
