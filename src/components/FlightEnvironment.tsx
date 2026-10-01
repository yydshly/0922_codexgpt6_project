import { createPilotLesson, advancePilotLesson, createPilotReport, LESSONS, type PilotLesson, type PilotReport } from '../flight/flightStory';
import { PilotLessonPanel } from './PilotLessonPanel';
import './FlightJourney.css';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ArrowLeft, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Crosshair, Eye, Pause, Play, RotateCcw } from 'lucide-react';
import { createFlightState, ENVIRONMENTS, FLIGHT_STEP, stepFlight, targetReading, type EnvironmentId, type FlightInput } from '../flight/flightPractice';
import { disposeEnvironmentScene, makeEnvironment } from '../flight/environmentMeshes';
import { makePilotShip } from '../flight/pilotShip';
import { pointingInput } from '../flight/attitudeControl';
import { brakingGuidance, directionOnScreen, steeringToTarget, type BrakeGuidance } from '../flight/flightGuidance';
import { BrakeReference } from './BrakeReference';
import { advanceApproachMission, createApproachMission, APPROACH_PHASES, APPROACH_RULES, type ApproachMission } from '../flight/approachMission';
import { SHIP_COLLISION_RADIUS } from '../flight/flightPractice';
import { ApproachMissionPanel } from './ApproachMissionPanel';
import './FlightEnvironment.css';
import { AutopilotPanel } from './AutopilotPanel';
import { createAutopilot, engageAutopilot, takeOverAutopilot, autopilotInput, idleInput, hasManualInput, AUTOPILOT_LABELS, type Autopilot } from '../flight/autopilot';
import { FreeExploration } from './FreeExploration';

type View = 'follow' | 'window';
type Action = 'forward'|'reverse'|'left'|'right'|'up'|'down'|'rollLeft'|'rollRight'|'brake';
interface Readout { distance: number; clearance: number; closing: number; speed: number; fuel: number; time: number; firing: number; contact: string|null; bearing:number; targetCue:string; navigation:BrakeGuidance; driftAngle:number; mission:ApproachMission|null; lesson:PilotLesson|null; autopilot:Autopilot }
interface Bridge { reset:()=>void; aim:()=>void; camera:()=>void; inspect:()=>void; shipDetail:()=>void; centerView:()=>void; startMission:()=>void; beginSurvey:()=>void; leaveMission:()=>void; startAuto:()=>void; takeover:()=>void }
const KEYS:Record<string,Action>={KeyW:'forward',KeyS:'reverse',KeyA:'left',KeyD:'right',ArrowUp:'up',ArrowDown:'down',KeyQ:'rollLeft',KeyE:'rollRight',KeyB:'brake'};

type FlightEnvironmentProps={onClose:()=>void;onStory?:()=>void;story?:{onReport:(report:PilotReport)=>void}};
export function FlightEnvironment(props:FlightEnvironmentProps) {
  const [exploring,setExploring]=useState(!props.story);
  if(exploring)return <FreeExploration onClose={props.onClose} onStory={props.onStory} onPractice={()=>setExploring(false)}/>;
  return <FlightPracticeEnvironment {...props} onExplore={props.story?undefined:()=>setExploring(true)}/>;
}
function FlightPracticeEnvironment({onClose,onStory,story,onExplore}:FlightEnvironmentProps&{onExplore?:()=>void}) {
  const root=useRef<HTMLDivElement>(null),host=useRef<HTMLDivElement>(null), marker=useRef<HTMLDivElement>(null);
  const noseMarker=useRef<HTMLDivElement>(null),velocityMarker=useRef<HTMLDivElement>(null);
  const bridge=useRef<Bridge|null>(null), held=useRef(new Set<Action>()), keys=useRef(new Set<Action>());
  const [environment,setEnvironment]=useState<EnvironmentId>('earth'),[view,setView]=useState<View>(story?'window':'follow');
  const [playing,setPlaying]=useState(true),[guides,setGuides]=useState(true),[clouds,setClouds]=useState(true),[atmosphere,setAtmosphere]=useState(true),[stars,setStars]=useState(true);
  const [revision,setRevision]=useState(0),[failure,setFailure]=useState(''),[textureState,setTextureState]=useState<'loading'|'ready'|'error'>('loading');
  const [reading,setReading]=useState<Readout>({distance:125,clearance:103,closing:0,speed:0,fuel:100,time:0,firing:0,contact:null,bearing:0,targetCue:'目标在船头前方',navigation:brakingGuidance(createFlightState(),[]),driftAngle:0,mission:null,lesson:null,autopilot:createAutopilot()});
  const missionEnded=!!reading.mission&&reading.mission.status!=='running';
  const [viewFocus,setViewFocus]=useState('飞船'),[drawer,setDrawer]=useState(true);
  const settings=useRef({view,playing,guides,clouds,atmosphere,stars});settings.current={view,playing,guides,clouds,atmosphere,stars};
  const config=ENVIRONMENTS.find(item=>item.id===environment)!;
  const release=()=>{held.current.clear();keys.current.clear();};
  useEffect(()=>{if(!playing)release();},[playing]);
  useEffect(()=>{
    const keyup=(event:KeyboardEvent)=>{const action=KEYS[event.code];if(action)keys.current.delete(action);};
    const blur=()=>release();const hidden=()=>{if(document.hidden){release();setPlaying(false);}};
    window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',hidden);
    host.current?.focus({preventScroll:true});
    return()=>{release();window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',hidden);};
  },[]);

  useEffect(()=>{
    const mount=host.current;if(!mount)return;
    release();setFailure('');setTextureState('loading');setViewFocus('飞船');
    let alive=true,frameId=0,previous=performance.now(),accumulator=0,lastReading=0;
    let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true,powerPreference:'high-performance'});}catch{setFailure('三维显示初始化失败。请确认浏览器支持 WebGL，或重试。');return;}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;renderer.setClearColor('#03080d');
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-label','可拖动的三维太空练习场');mount.prepend(renderer.domElement);
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,1,.15,180000000);
    const sunDirection=new THREE.Vector3(-.6,.85,.55).normalize();
    scene.add(new THREE.HemisphereLight('#91b2d3','#22202a',.5));
    const light=new THREE.DirectionalLight('#fff1d8',3.1);light.position.copy(sunDirection).multiplyScalar(1000);scene.add(light);
    light.castShadow=true;light.shadow.mapSize.set(2048,2048);
    Object.assign(light.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:1,far:160});
    light.shadow.bias=-.00015;light.shadow.normalBias=.025;scene.add(light.target);
    let texturesReady=0,textureFailed=false;
    const environmentScene=makeEnvironment(environment,scene,sunDirection,ok=>{if(alive){if(ok)texturesReady++;else textureFailed=true;setTextureState(textureFailed?'error':texturesReady>=(environment==='earth'?2:1)?'ready':'loading');}});
    const ship=makePilotShip();scene.add(ship.group);
    // Restrict soft observation reflections to the craft; do not illuminate planetary nightsides.
    const reflectionRoom=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
    const reflection=pmrem.fromScene(reflectionRoom,.12);reflectionRoom.dispose();pmrem.dispose();
    ship.group.traverse(object=>{if(object instanceof THREE.Mesh){
      for(const material of (Array.isArray(object.material)?object.material:[object.material]))if(material instanceof THREE.MeshStandardMaterial){material.envMap=reflection.texture;material.envMapIntensity=material.transparent?.12:.45;}
    }});
    let state=createFlightState(),lookAtTarget=false;
    let mission:ApproachMission|null=null;
    let autopilot=createAutopilot(),appliedInput=idleInput(),assistedAim=false;
    let lesson=story?createPilotLesson():null;
    if(story)state.attitude.setFromAxisAngle(new THREE.Vector3(0,1,0),-.35);
    const observationZone=new THREE.Group();observationZone.position.copy(environmentScene.target.position);scene.add(observationZone);
    for(const clearance of [APPROACH_RULES.minClearance,APPROACH_RULES.maxClearance]){
      const radius=environmentScene.targetRadius+SHIP_COLLISION_RADIUS+clearance;
      const points=Array.from({length:96},(_,i)=>{const a=i/96*Math.PI*2;return new THREE.Vector3(Math.cos(a)*radius,Math.sin(a)*radius,0);});
      for(let axis=0;axis<3;axis++){
        const circle=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#80c7b3',transparent:true,opacity:clearance===15?.16:.24,depthWrite:false}));
        if(axis===1)circle.rotation.x=Math.PI/2;if(axis===2)circle.rotation.y=Math.PI/2;observationZone.add(circle);
      }
    }
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.09;controls.enablePan=false;controls.minDistance=15;controls.maxDistance=900;
    const headLook=new THREE.Vector2(),headRotation=new THREE.Quaternion();
    let headPointer:{id:number;x:number;y:number}|null=null;
    const startLooking=(event:PointerEvent)=>{if(settings.current.view!=='window'||event.button!==0)return;headPointer={id:event.pointerId,x:event.clientX,y:event.clientY};renderer.domElement.setPointerCapture(event.pointerId);};
    const lookAround=(event:PointerEvent)=>{
      if(!headPointer||event.pointerId!==headPointer.id||settings.current.view!=='window')return;
      headLook.x=THREE.MathUtils.clamp(headLook.x-(event.clientX-headPointer.x)*.003,-1,1);
      headLook.y=THREE.MathUtils.clamp(headLook.y-(event.clientY-headPointer.y)*.003,-.42,.42);
      headPointer={id:event.pointerId,x:event.clientX,y:event.clientY};
    };
    const stopLooking=()=>{headPointer=null;};
    window.addEventListener('blur',stopLooking);renderer.domElement.addEventListener('pointerdown',startLooking);renderer.domElement.addEventListener('pointermove',lookAround);
    renderer.domElement.addEventListener('pointerup',stopLooking);renderer.domElement.addEventListener('pointercancel',stopLooking);renderer.domElement.addEventListener('lostpointercapture',stopLooking);
    const resetCamera=()=>{lookAtTarget=false;setViewFocus('飞船');controls.target.copy(state.position).add(new THREE.Vector3(0,0,-16));camera.position.copy(state.position).add(new THREE.Vector3(17,12,34));camera.up.set(0,1,0);controls.update();};
    resetCamera();
    const lineGeometry=new THREE.BufferGeometry().setFromPoints([state.position,environmentScene.target.position]);
    const line=new THREE.Line(lineGeometry,new THREE.LineDashedMaterial({color:'#abcab9',transparent:true,opacity:.42,dashSize:2,gapSize:2,depthWrite:false}));scene.add(line);
    let previousView:View='follow';
    const publish=()=>{
      const t=targetReading(state,environmentScene.target.position,environmentScene.targetRadius);
      const steering=steeringToTarget(state,environmentScene.target.position),navigation=brakingGuidance(state,environmentScene.obstacles);
      const forward=new THREE.Vector3(0,0,-1).applyQuaternion(state.attitude);
      const driftAngle=navigation.speed>=.05?THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(forward.dot(state.velocity)/navigation.speed,-1,1))):0;
      const telemetry={...t,speed:navigation.speed,fuel:state.fuel,time:state.time,firing:state.firing,contact:state.contact,bearing:steering.bearing,targetCue:assistedAim?'姿态喷口正在辅助对准，驾驶键可接管':steering.cue,navigation,driftAngle,mission:mission?{...mission}:null,lesson:lesson?{...lesson,completed:[...lesson.completed]}:null,autopilot:{...autopilot}};
      ship.cockpit.update(telemetry);setReading(telemetry);
    };
    const startMission=()=>{
      release();assistedAim=false;autopilot=createAutopilot();state=createFlightState();state.attitude.setFromAxisAngle(new THREE.Vector3(0,1,0),-.35);
      mission=createApproachMission(state,environmentScene.target.position,environmentScene.targetRadius);
      accumulator=0;headLook.set(0,0);resetCamera();setView('window');setGuides(true);setPlaying(true);setDrawer(true);publish();
      mount.focus({preventScroll:true});
    };
    bridge.current={
      reset:()=>{assistedAim=false;autopilot=createAutopilot();if(story){release();mission=null;state=createFlightState();state.attitude.setFromAxisAngle(new THREE.Vector3(0,1,0),-.35);lesson=createPilotLesson();headLook.set(0,0);accumulator=0;resetCamera();setView('window');publish();return;}if(mission){startMission();return;}release();state=createFlightState();accumulator=0;resetCamera();publish();},
      startMission,
      startAuto:()=>{
        if(state.contact||(mission&&mission.status!=='running'))return;
        if(!mission){
          if(targetReading(state,environmentScene.target.position,environmentScene.targetRadius).clearance<40)return;
          mission=createApproachMission(state,environmentScene.target.position,environmentScene.targetRadius);
          if(lesson)lesson.phase='approach';
        }
        release();assistedAim=false;engageAutopilot(autopilot);setPlaying(true);setGuides(true);publish();mount.focus({preventScroll:true});
      },
      takeover:()=>{if(!autopilot.enabled)return;release();takeOverAutopilot(autopilot);publish();},
      beginSurvey:()=>{if(!lesson||lesson.phase!=='ready'||state.velocity.length()>.15||targetReading(state,environmentScene.target.position,environmentScene.targetRadius).clearance<=40)return;release();lesson.phase='approach';mission=createApproachMission(state,environmentScene.target.position,environmentScene.targetRadius);headLook.set(0,0);setView('window');setPlaying(true);publish();mount.focus({preventScroll:true});},
      leaveMission:()=>{release();assistedAim=false;takeOverAutopilot(autopilot);mission=null;accumulator=0;setPlaying(!state.contact);publish();mount.focus({preventScroll:true});},
      aim:()=>{if(state.contact||state.fuel<=0||(mission&&mission.status!=='running'))return;release();takeOverAutopilot(autopilot);if(mission)mission.assistedAimCount++;if(lesson)lesson.aimedByHelper=true;assistedAim=true;setPlaying(true);publish();},
      camera:()=>resetCamera(),
      centerView:()=>{headLook.set(0,0);stopLooking();},
      inspect:()=>{previousView='follow';lookAtTarget=true;setViewFocus(config.target);controls.target.copy(environmentScene.target.position);camera.position.copy(environmentScene.target.position).add(new THREE.Vector3(70,35,100));camera.up.set(0,1,0);controls.update();},
      shipDetail:()=>{
        previousView='follow';lookAtTarget=false;setViewFocus('飞船细节');
        const distance=26/Math.min(camera.aspect,1);
        controls.target.copy(state.position).add(new THREE.Vector3(0,0,.7));
        camera.position.copy(state.position).add(new THREE.Vector3(1,.72,-1.35).normalize().multiplyScalar(distance));
        camera.up.set(0,1,0);controls.update();
      }
    };
    const resize=()=>{const {width,height}=mount.getBoundingClientRect();if(width&&height){renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();}};
    const observer=new ResizeObserver(resize);observer.observe(mount);resize();
    const contextLost=(event:Event)=>{event.preventDefault();release();setPlaying(false);setFailure('三维显示被浏览器中断。点击重新载入练习场恢复。');};
    renderer.domElement.addEventListener('webglcontextlost',contextLost);
    const labelPoint=new THREE.Vector3(),lastShipPosition=new THREE.Vector3(),cameraDelta=new THREE.Vector3();
    const forwardDirection=new THREE.Vector3();
    const placeIndicator=(element:HTMLDivElement|null,direction:THREE.Vector3,enabled:boolean)=>{
      if(!element)return;
      const point=enabled?directionOnScreen(direction,camera):null;
      element.style.display=point?'block':'none';if(!point)return;
      element.style.left=`${(point.x*.5+.5)*100}%`;element.style.top=`${(-point.y*.5+.5)*100}%`;
      element.dataset.edge=String(point.offscreen);element.dataset.behind=String(point.behind);
      element.dataset.side=point.x<-.65?'left':point.x>.65?'right':'center';
      element.style.setProperty('--arrow-angle',`${point.angle}rad`);
    };
    const animate=(now:number)=>{
      if(!alive)return;
      frameId=requestAnimationFrame(animate);
      const dt=Math.min(.1,Math.max(0,(now-previous)/1000));previous=now;
      const options=settings.current;
      const active=(action:Action)=>keys.current.has(action)||held.current.has(action);
      const manualInput:FlightInput={thrust:Number(active('forward'))-Number(active('reverse')),yaw:Number(active('left'))-Number(active('right')),pitch:Number(active('up'))-Number(active('down')),roll:Number(active('rollLeft'))-Number(active('rollRight')),brake:active('brake')};
      if(hasManualInput(manualInput)){assistedAim=false;takeOverAutopilot(autopilot);}
      let input=appliedInput;
      lastShipPosition.copy(state.position);
      if(options.playing&&!document.hidden&&!state.contact&&(!mission||mission.status==='running')){
        accumulator+=dt;
        while(accumulator>=FLIGHT_STEP){
          if(assistedAim&&(state.fuel<=0||(steeringToTarget(state,environmentScene.target.position).bearing<.15&&state.angularVelocity.length()<.003)))assistedAim=false;
          input=autopilot.enabled?autopilotInput(autopilot,state,environmentScene.target.position,environmentScene.targetRadius,environmentScene.obstacles,FLIGHT_STEP):assistedAim?{...idleInput(),...pointingInput(state.attitude,environmentScene.target.position.clone().sub(state.position))}:manualInput;
          if(!autopilot.enabled&&!assistedAim&&hasManualInput(input))autopilot.manualSeconds+=FLIGHT_STEP;
          appliedInput=input;stepFlight(state,input,FLIGHT_STEP,environmentScene.obstacles);environmentScene.update(FLIGHT_STEP);accumulator-=FLIGHT_STEP;
          if(lesson&&!autopilot.enabled)advancePilotLesson(lesson,state,input,FLIGHT_STEP,headLook.length(),steeringToTarget(state,environmentScene.target.position).bearing);
          if(mission){advanceApproachMission(mission,state,environmentScene.target.position,environmentScene.targetRadius,environmentScene.obstacles);if(mission.status!=='running'){if(autopilot.enabled){autopilot.enabled=false;autopilot.phase=mission.status==='success'?'complete':'blocked';autopilot.message=mission.hint;}release();setPlaying(false);accumulator=0;publish();break;}}
          if(state.contact){accumulator=0;break;}
        }
      }else{accumulator=0;state.firing=0;input=appliedInput=idleInput();}
      ship.cockpit.controls(options.playing&&!state.contact&&(!mission||mission.status==='running')?input:{thrust:0,yaw:0,pitch:0,roll:0,brake:false},!autopilot.enabled);ship.cockpit.pilot.setView(options.view==='window');
      ship.group.position.copy(state.position);ship.group.quaternion.copy(state.attitude);
      light.target.position.copy(state.position);light.position.copy(state.position).addScaledVector(sunDirection,80);
      ship.updatePropulsion(state,options.playing);
      if(options.view!==previousView){if(options.view==='follow'&&!lookAtTarget)resetCamera();headLook.set(0,0);stopLooking();release();previousView=options.view;}
      const nextFov=options.view==='window'?72:48;if(camera.fov!==nextFov){camera.fov=nextFov;camera.updateProjectionMatrix();}
      controls.enabled=options.view==='follow';
      // Keep the same model visible: the camera sits inside its actual window opening.
      ship.group.visible=true;
      if(options.view==='window'){
        camera.position.copy(ship.cockpit.eye).applyQuaternion(state.attitude).add(state.position);
        headRotation.setFromEuler(new THREE.Euler(headLook.y,headLook.x,0,'YXZ'));
        camera.quaternion.copy(state.attitude).multiply(headRotation);camera.up.copy(new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion));
      }else{
        ship.group.visible=true;
        if(!lookAtTarget){cameraDelta.copy(state.position).sub(lastShipPosition);camera.position.add(cameraDelta);controls.target.add(cameraDelta);}
        controls.update();
      }
      if(environmentScene.clouds)environmentScene.clouds.visible=options.clouds;
      if(environmentScene.atmosphere)environmentScene.atmosphere.visible=options.atmosphere;
      environmentScene.stars.visible=options.stars;
      line.visible=options.guides;
      observationZone.visible=options.guides&&!!mission;
      const positions=line.geometry.getAttribute('position');positions.setXYZ(0,state.position.x,state.position.y,state.position.z);positions.setXYZ(1,...environmentScene.target.position.toArray() as [number,number,number]);positions.needsUpdate=true;line.geometry.computeBoundingSphere();line.computeLineDistances();
      camera.updateMatrixWorld();
      labelPoint.copy(environmentScene.target.position).sub(camera.position);
      placeIndicator(marker.current,labelPoint,options.guides);
      forwardDirection.set(0,0,-1).applyQuaternion(state.attitude);
      placeIndicator(noseMarker.current,forwardDirection,options.guides&&options.view==='window');
      placeIndicator(velocityMarker.current,state.velocity,options.guides&&options.view==='window'&&state.velocity.length()>=.05);
      renderer.render(scene,camera);
      if(now-lastReading>100){publish();lastReading=now;}
    };
    publish();frameId=requestAnimationFrame(animate);
    return()=>{alive=false;cancelAnimationFrame(frameId);release();bridge.current=null;observer.disconnect();controls.dispose();environmentScene.dispose();disposeEnvironmentScene(scene);reflection.dispose();light.shadow.dispose();renderer.domElement.removeEventListener('webglcontextlost',contextLost);window.removeEventListener('blur',stopLooking);renderer.domElement.removeEventListener('pointerdown',startLooking);renderer.domElement.removeEventListener('pointermove',lookAround);renderer.domElement.removeEventListener('pointerup',stopLooking);renderer.domElement.removeEventListener('pointercancel',stopLooking);renderer.domElement.removeEventListener('lostpointercapture',stopLooking);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
  },[environment,revision]);

  const holdButton=(label:string,action:Action,icon?:React.ReactNode)=> <button type="button" aria-label={label} disabled={!playing||!!reading.contact||!!failure||missionEnded} onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);bridge.current?.takeover();held.current.add(action);}} onPointerUp={()=>held.current.delete(action)} onPointerCancel={()=>held.current.delete(action)} onLostPointerCapture={()=>held.current.delete(action)} onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();bridge.current?.takeover();held.current.add(action);}}} onKeyUp={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();held.current.delete(action);}}} onBlur={()=>held.current.delete(action)}>{icon}{label}</button>;
  const chooseEnvironment=(id:EnvironmentId)=>{if(id===environment)return;release();setEnvironment(id);setPlaying(true);setView('follow');};
  return <div className="flight-environment" ref={root} role="dialog" aria-modal="true" aria-label="三维飞船环境与操控练习" onKeyDown={event=>{
    event.stopPropagation();
    if(event.key==='Escape'){onClose();return;}
    if(event.key==='Tab'){
      const items=Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,[tabindex="0"]')??[]).filter(el=>el.getClientRects().length>0);
      const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
  }}>
    <header className="flight-env-header"><button onClick={onClose}><ArrowLeft size={16}/>{story?'返回探索（新航程）':'返回全景'}</button><span className="flight-env-brand">ORBIT <small>飞船环境 · 3D</small></span><button onClick={()=>setDrawer(value=>!value)} aria-expanded={drawer}>{drawer?'收起操作区':'展开操作区'}</button></header>
    <div className={`flight-env-body ${drawer?'':'flight-env-wide'}`}>
      <section className={`flight-env-stage ${view==='window'?'flight-env-piloting':''}`}  ref={host} data-mission={!!reading.mission} data-story={!!story} tabIndex={0} aria-label="三维驾驶画面，拖动观察；W S 推进，A D 转向，上下键俯仰，Q E 滚转，B 减速，空格暂停" onPointerDown={event=>{if(event.target instanceof HTMLCanvasElement)host.current?.focus({preventScroll:true});}} onKeyDown={event=>{
        if(event.target!==host.current)return;
        if(event.code==='Space'){event.preventDefault();if(!missionEnded&&!reading.contact&&!failure)setPlaying(value=>!value);release();return;}
        const action=KEYS[event.code];if(action){event.preventDefault();if(playing&&!reading.contact&&!missionEnded&&!failure){bridge.current?.takeover();keys.current.add(action);}}
      }} onBlur={release}>
        <div className="flight-env-heading"><span>交互三维场景 / {config.subtitle}</span><h1>{config.title}</h1><p>{view==='window'?'拖动环顾舱内 · 按键控制飞船':'拖动绕看 · 滚轮靠近 · 飞船可操控'}</p></div>
        {view==='window'&&<div className="flight-env-window"><div className="flight-env-cockpit-heading"><strong>座舱驾驶 · 前向观察窗</strong><span>{reading.targetCue} · 船头偏角 {reading.bearing.toFixed(0)}°</span><button onClick={()=>{bridge.current?.centerView();host.current?.focus({preventScroll:true});}}>回正视线</button></div><div className="flight-env-sight" aria-hidden="true"><i/></div><div className="flight-env-pilot-data"><span>目标距离 <b>{reading.distance.toFixed(1)} m</b></span><span>接近速度 <b>{reading.closing.toFixed(2)} m/s</b></span><span>推进剂 <b>{reading.fuel.toFixed(1)} kg</b></span></div></div>}
        <div className="flight-env-marker" ref={marker}><span><b>{config.target}</b>{reading.mission&&<small className="flight-env-zone-label">观察区 · 余量 15–30 m · 辅助</small>}<small className="flight-env-edge-label">视野外</small><small className="flight-env-rear-label">视线后方</small></span><i/></div>
        <div className="flight-env-vector flight-env-nose" ref={noseMarker} aria-hidden="true"><i/><span>船头</span></div>
        <div className="flight-env-vector flight-env-velocity" ref={velocityMarker} aria-hidden="true"><i/><span>滑行</span></div>
        {view==='window'&&!reading.contact&&!reading.mission&&!story&&<div className="flight-env-pilot-guidance" data-level={reading.navigation.level}><strong>{reading.navigation.title}</strong><span>{reading.navigation.level==='idle'||reading.navigation.level==='fuel'?reading.navigation.instruction:`按住 B · 预计滑行 ${(reading.navigation.stoppingDistance??0).toFixed(1)} m 后停止`}</span></div>}
        {reading.lesson&&!reading.mission&&<div className="flight-pilot-cue"><strong>地面引导 · {LESSONS[reading.lesson.phase].title}{playing?'':' · 已暂停'}</strong><p>{LESSONS[reading.lesson.phase].action}</p><small>W / S 推进 · A / D 转向 · B 减速 · 空格暂停</small></div>}
        {reading.mission&&<div className="flight-env-mission-hud" data-status={reading.mission.status}>
          <strong>{missionEnded?(reading.mission.status==='success'?'接近完成 · 已暂停':'任务结束 · 已暂停'):`接近任务 · ${reading.autopilot.enabled?AUTOPILOT_LABELS[reading.autopilot.phase]:APPROACH_PHASES.find(p=>p.id===reading.mission?.phase)?.label}${playing?'':' · 已暂停'}`}</strong>
          <span>{reading.autopilot.enabled?(!playing?'自动驾驶已暂停，继续后恢复。':reading.autopilot.message):reading.mission.hint}</span>
          {!missionEnded&&<small>余量 {reading.clearance.toFixed(1)} m · 速率 {reading.speed.toFixed(2)} m/s · 保持 {reading.mission.heldFor.toFixed(1)} / 5 s</small>}
          <div>{reading.autopilot.enabled&&<button className="flight-auto-hud-takeover" onClick={()=>bridge.current?.takeover()}>接管驾驶</button>}{reading.mission.phase==='align'&&!missionEnded&&!reading.autopilot.enabled&&<button onClick={()=>{bridge.current?.aim();host.current?.focus({preventScroll:true});}}>辅助对准目标</button>}{(missionEnded||!drawer)&&<button onClick={()=>{setDrawer(true);requestAnimationFrame(()=>root.current?.querySelector(".flight-env-panel")?.scrollTo({top:0}));}}>{missionEnded?'查看本次结果':'查看任务条件'}</button>}</div>
        </div>}
        <div className="flight-env-toolbar"><button className={view==='follow'&&viewFocus==='飞船'?'active':''} aria-pressed={view==='follow'&&viewFocus==='飞船'} onClick={()=>{release();setView('follow');bridge.current?.camera();}}><Eye size={14}/>机外跟随</button><button className={view==='window'?'active':''} aria-pressed={view==='window'} onClick={()=>{release();setView('window');host.current?.focus({preventScroll:true});}}>座舱驾驶</button><button aria-pressed={view==='follow'&&viewFocus===config.target} onClick={()=>{release();setView('follow');bridge.current?.inspect();}}><Crosshair size={14}/>近看目标</button><button aria-pressed={view==='follow'&&viewFocus==='飞船细节'} onClick={()=>{release();setView('follow');bridge.current?.shipDetail();}}>近看飞船</button><button aria-label="复位观察镜头" onClick={()=>{setView('follow');bridge.current?.camera();}}><RotateCcw size={14}/></button></div>
        <div className="flight-env-status"><i/>{missionEnded?'任务结束':reading.contact?'练习暂停':playing?(reading.firing>.001?'推进中':reading.speed<.05?'相对停稳':'惯性滑行'):'已暂停'} · {view==='window'?'驾驶座 · 可环顾':`镜头：${viewFocus}`}<small>{textureState==='loading'?'纹理读取中…':textureState==='error'?'部分纹理失败，可重新载入':'本地纹理 · 静态资料'}</small></div>
        {(failure||(reading.contact&&!reading.mission))&&<div className="flight-env-alert" role="alert"><strong>{failure?'显示需要恢复':'练习已暂停'}</strong><p>{failure||reading.contact}</p><button onClick={()=>failure?setRevision(v=>v+1):(bridge.current?.reset(),setPlaying(true))}>{failure?'重新载入练习场':'重置飞船'}</button></div>}
        <div className="flight-env-hint">局部惯性练习 · 未接引力与实际轨道 · 范围 1.5 km</div>
      </section>
      {drawer&&<aside className="flight-env-panel" aria-label="飞船控制与环境说明">
        {!reading.mission&&<><p className="flight-env-eyebrow">SPACEFLIGHT / ENVIRONMENT LAB</p><h2>{story?'蓝色地平线 · 飞船巡视':'自动接近，随时亲自驾驶'}</h2></>}
        {onExplore&&<button className="flight-return-exploration" onClick={onExplore}>返回连续探索 · 开始新航程</button>}
        {!story&&<nav className="flight-env-presets" aria-label="三维练习环境">{ENVIRONMENTS.map(item=><button key={item.id} className={environment===item.id?'active':''} aria-pressed={environment===item.id} onClick={()=>chooseEnvironment(item.id)}><span>{item.id==='earth'?'01':item.id==='moon'?'02':'03'}</span>{item.subtitle.split(' · ')[0]}</button>)}</nav>}
        {!story&&!reading.mission&&<p className="flight-env-description">{config.description}</p>}
        {onStory&&<div className="flight-story-entry"><button className="flight-story-open" onClick={onStory}>启航故事 · 从发射到亲自驾驶 →</button><p>开始新的训练故事：发射、现象、操控、巡视与报告。当前局部练习不会保留。</p></div>}
        <AutopilotPanel pilot={reading.autopilot} playing={playing} ended={missionEnded} canStart={!failure&&!reading.contact&&!missionEnded&&(!!reading.mission||reading.clearance>=40)} onStart={()=>bridge.current?.startAuto()} onTakeover={()=>bridge.current?.takeover()}/>
        {reading.lesson&&!reading.mission&&<PilotLessonPanel lesson={reading.lesson} speed={reading.speed} firing={reading.firing} clearance={reading.clearance} paused={!playing} onAim={()=>{bridge.current?.aim();host.current?.focus({preventScroll:true});}} onApproach={()=>bridge.current?.beginSurvey()}/>}
        {(!story||reading.mission)&&<ApproachMissionPanel mission={reading.mission} target={config.target} playing={playing} automaticHint={reading.autopilot.enabled?(playing?reading.autopilot.message:"自动驾驶已暂停，继续练习后恢复。"):undefined} onStart={()=>{story?bridge.current?.reset():bridge.current?.startMission();setPlaying(true);}} onLeave={()=>story?onClose():bridge.current?.leaveMission()}/>}
        {story&&reading.lesson&&reading.mission?.status==='success'&&reading.mission.result&&<button className="flight-story-report-action" onClick={()=>story.onReport(createPilotReport(reading.lesson!,reading.mission!.result!,reading.time,reading.fuel,reading.autopilot))}>记录当前位置，提交巡视报告 →</button>}
        <div className="flight-env-readout"><span>目标中心距离<strong>{reading.distance.toFixed(1)} <small>m</small></strong></span><span>接近速度<strong>{reading.closing.toFixed(2)} <small>m/s</small></strong></span><span>当前速率<strong>{reading.speed.toFixed(2)} <small>m/s</small></strong></span><span>推进剂<strong>{reading.fuel.toFixed(1)} <small>kg</small></strong></span></div>
        <p className="flight-env-clearance">保守接触余量 {reading.clearance.toFixed(1)} m · T + {reading.time.toFixed(1)} s<br/>接近速度为正表示靠近，为负表示远离。</p>
        {!story&&!reading.mission&&<div className="flight-env-guidance-summary" data-level={reading.navigation.level}><strong>{reading.contact?'练习已暂停':reading.navigation.title}</strong><span>{reading.contact?'重置后可重新尝试':reading.navigation.instruction}</span>{reading.speed>=.05&&<small>船头与滑行方向相差 {reading.driftAngle.toFixed(0)}° · 转向不会立即改变惯性</small>}</div>}
        <BrakeReference reading={reading.navigation}/><div className="flight-env-main-actions"><button onClick={()=>{release();setPlaying(value=>!value);}} disabled={!!reading.contact||!!failure||missionEnded}>{playing?<Pause size={14}/>:<Play size={14}/>} {missionEnded?'任务已结束':playing?'暂停练习':'继续练习'}</button><button onClick={()=>{bridge.current?.reset();setPlaying(true);}}>重置</button></div>
        <div className="flight-env-controls"><div className="flight-env-control-title"><h3>飞船操控</h3><button onClick={()=>{bridge.current?.aim();host.current?.focus({preventScroll:true});}} disabled={!!reading.contact||missionEnded}>对准目标</button></div><div className="flight-env-thrust">{holdButton('推进 · W','forward',<ArrowUp size={14}/>)}{holdButton('反推 · S','reverse',<ArrowDown size={14}/>)}</div><div className="flight-env-turn">{holdButton('左转 · A','left',<ChevronLeft size={12}/>)}{holdButton('抬头 · ↑','up')}{holdButton('右转 · D','right',<ChevronRight size={12}/>)}{holdButton('左滚 · Q','rollLeft')}{holdButton('低头 · ↓','down')}{holdButton('右滚 · E','rollRight')}</div><div className="flight-env-brake">{holdButton('按住减速 · B','brake')}</div><p>蓝色箭头是船头，琥珀色圆标是实际滑行方向；低速时隐藏滑行标记。目标离开视野后，边缘箭头仍保留方向；“视线后方”表示需要转身寻找。</p><p>座舱前窗观察环境，仪表帮助判断距离与运动；目标框是导航提示。拖动环顾不改变飞船朝向，可用「回正视线」重新看向船头。</p><p>按钮按住生效。也可先点击三维画面，再用键盘驾驶。松开推进后仍会滑行；转动镜头不改变飞船朝向。减速为辅助反向推力，会消耗燃料。</p></div>
        <details className="flight-env-layers"><summary>环境图层与说明</summary><label><input type="checkbox" checked={guides} onChange={e=>setGuides(e.target.checked)}/>导航标记与参考线</label><label><input type="checkbox" checked={stars} onChange={e=>setStars(e.target.checked)}/>背景星点（观察增强）</label>{environment==='earth'&&<><label><input type="checkbox" checked={clouds} onChange={e=>setClouds(e.target.checked)}/>静态云层</label><label><input type="checkbox" checked={atmosphere} onChange={e=>setAtmosphere(e.target.checked)}/>大气边缘</label></>}<p>真实三维模型与局部位置。天体是静置环境背景，目标位置、岩体形状与自转均为教学设定，未接入实时轨道；姿态通过有限角加速度起转和制转，喷口消耗推进剂。切换环境会重置本练习，不影响原发射任务。</p><p>飞船为原创教学构型：前向和侧向观察窗与舱内驾驶位置对应，仪表读取同一练习状态；机外可近看热控外壳、隔热毯、喷口与电池片。当前未模拟密封结构和生命保障。材质反射和暗部补光用于观察细节，不代表某型号实拍或工程结构验证。</p><p>纹理来自项目已收录的 Solar System Scope / INOVE（CC BY 4.0）；云层不是实时天气，小天体复用月面纹理作视觉说明。</p><a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noreferrer">贴图来源 ↗</a>{textureState==='error'&&<button onClick={()=>setRevision(v=>v+1)}>重新载入纹理</button>}</details>
      </aside>}
    </div>
  </div>;
}
