import { useEffect,useRef,useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makePilotShip } from '../flight/pilotShip';
import { makeExplorationWorld } from '../flight/explorationWorld';
import { disposeEnvironmentScene } from '../flight/environmentMeshes';
import { ExplorationSession,explorationTimeRate,EXPLORATION_DESTINATIONS as destinations } from '../flight/exploration';
import { FLIGHT_STEP,targetReading,type FlightInput } from '../flight/flightPractice';
import { steeringToTarget } from '../flight/flightGuidance';
import { idleInput } from '../flight/autopilot';
import './FlightEnvironment.css';
import './FreeExploration.css';
import { OBSERVATIONS,ObservationCameraTransition,lookPose } from '../flight/explorationObservation';
import { ExplorationObservationPanel } from './ExplorationObservationPanel';
import { attitudeActivity } from '../flight/attitudeControl';
import { EXPLORATION_STORIES,narrativeCue,narrativeArrivalCount } from '../flight/explorationNarrative';
import { createExplorationNotebook,openExplorationPart,saveExplorationNote,canSaveExplorationNote,type ExplorationNotebook } from '../flight/explorationNotebook';
import { ExplorationNarrationLog,type NarrationEntry } from '../flight/explorationNarrationLog';
import { ExplorationNarrationPanel } from './ExplorationNarrationPanel';
import { buildExplorationReport,firstCompletedReturn,type ExplorationReport } from '../flight/explorationReport';
import { ExplorationReportPanel } from './ExplorationReportPanel';
import { downloadExplorationReport } from '../flight/downloadExplorationReport';
import { ExplorationTransitionDialog,type ExplorationTransition } from './ExplorationTransitionDialog';

type CameraMode='follow'|'cockpit'|'map'|'inspect';
type Control='forward'|'reverse'|'left'|'right'|'up'|'down'|'rollLeft'|'rollRight'|'brake';
const keyMap:Record<string,Control>={KeyW:'forward',KeyS:'reverse',KeyA:'left',KeyD:'right',ArrowUp:'up',ArrowDown:'down',KeyQ:'rollLeft',KeyE:'rollRight',KeyB:'brake'};
function snapshot(s:ExplorationSession,book:ExplorationNotebook,log:ExplorationNarrationLog){
  const state=s.state,target=s.destination,reading=targetReading(state,target.position,target.radius);
  return {id:target.id,previewId:s.previewId,staying:s.staying,status:s.status,message:s.message,time:state.time,fuel:state.fuel,speed:state.velocity.length(),position:state.position.toArray(),travel:s.distanceTravelled,
    cue:narrativeCue(s,false),pausedCue:narrativeCue(s,true),arrivalCount:narrativeArrivalCount(s),completedReturn:firstCompletedReturn(s.visits,s.destinations),book,canSaveNote:canSaveExplorationNote(book,s),remaining:s.remainingTourIds(),narration:log.entries,discardedNarration:log.discarded,
    heading:THREE.MathUtils.radToDeg(Math.atan2(new THREE.Vector3(0,0,-1).applyQuaternion(state.attitude).x,-new THREE.Vector3(0,0,-1).applyQuaternion(state.attitude).z)),
    rotationRate:THREE.MathUtils.radToDeg(state.angularVelocity.length()),turning:attitudeActivity(state.angularVelocity,state.rcsTorque),activeRate:explorationTimeRate(s,4,idleInput()),
    contact:state.contact,firing:state.firing,automatic:s.pilot.enabled,tour:[...s.tour],visits:[...s.visits],route:s.route.slice(s.routeIndex).map(p=>p.toArray()),heldFor:s.heldFor,dwell:s.dwell,...reading};
}
type Readout=ReturnType<typeof snapshot>;
const initial=new ExplorationSession();

export function FreeExploration({onClose,onPractice,onStory}:{onClose:()=>void;onPractice:()=>void;onStory?:()=>void}){
  const root=useRef<HTMLDivElement>(null),host=useRef<HTMLDivElement>(null),session=useRef<ExplorationSession|null>(null);
  const notebook=useRef(createExplorationNotebook());
  const notebookDetails=useRef<HTMLDetailsElement>(null);
  const narration=useRef(new ExplorationNarrationLog()),narrationDetails=useRef<HTMLDetailsElement>(null);
  const [reviewedNarration,setReviewedNarration]=useState<NarrationEntry|null>(null);
  const reportDetails=useRef<HTMLDetailsElement>(null);
  const [report,setReport]=useState<ExplorationReport|null>(null);
  const [transition,setTransition]=useState<{intent:ExplorationTransition;report:ExplorationReport;resume:boolean}|null>(null);
  const transitionFocus=useRef<HTMLElement|null>(null);
  const partLabels=useRef(new Map<string,HTMLButtonElement>());
  const held=useRef(new Set<Control>()),labels=useRef(new Map<string,HTMLButtonElement>());
  const [reading,setReading]=useState<Readout>(()=>snapshot(initial,notebook.current,narration.current)),[playing,setPlaying]=useState(true),[cameraMode,setCameraMode]=useState<CameraMode>('follow');
  const [rate,setRate]=useState(4),[guides,setGuides]=useState(true),[drawer,setDrawer]=useState(true),[revision,setRevision]=useState(0);
  const [autoInspect,setAutoInspect]=useState(true),[part,setPart]=useState<string|null>(null),[cameraRequest,setCameraRequest]=useState(0);
  const [error,setError]=useState(''),[textures,setTextures]=useState('环境纹理读取中…');
  const settings=useRef({playing,cameraMode,rate,guides,autoInspect,cameraRequest});settings.current={playing,cameraMode,rate,guides,autoInspect,cameraRequest};
  const target=destinations.find(d=>d.id===reading.id)!,previewTarget=destinations.find(d=>d.id===reading.previewId)!;
  const release=()=>held.current.clear();
  const emit=()=>{if(session.current)setReading(snapshot(session.current,notebook.current,narration.current));};
  const takeover=()=>{if(!session.current)return;release();session.current.takeover();if(cameraMode==='inspect')setCameraMode('follow');setPart(null);emit();};
  const select=(id:string)=>{session.current?.select(id);emit();};
  const depart=()=>{release();if(session.current?.depart()){setPlaying(true);if(cameraMode==='inspect')setCameraMode('follow');setPart(null);}emit();};
  const stay=()=>{session.current?.stay();emit();};
  const observe=()=>{session.current?.stay();setCameraMode('inspect');setCameraRequest(v=>v+1);emit();};
  const choosePart=(id:string)=>{const s=session.current;if(!s||s.status!=='arrived')return;notebook.current=openExplorationPart(notebook.current,s,id);setPart(id);s.stay();setCameraMode('inspect');emit();};
  const saveNote=()=>{if(session.current){notebook.current=saveExplorationNote(notebook.current,session.current);emit();}};
  const continueTour=()=>{release();if(session.current?.continueTour()){setPlaying(true);setCameraMode('follow');setPart(null);}emit();};
  const resumeTour=()=>{release();if(session.current?.resumeTour()){setPlaying(true);setCameraMode('follow');setPart(null);narrationDetails.current?.removeAttribute('open');setReviewedNarration(null);}emit();};
  const freezeNarration=():NarrationEntry=>({id:0,time:reading.time,targetId:reading.id,targetName:target.name,cue:playing?reading.cue:reading.pausedCue});
  const beginReading=()=>{release();setPlaying(false);setReviewedNarration(v=>v??freezeNarration());};
  const openNarration=()=>{setReviewedNarration(freezeNarration());beginReading();setDrawer(true);requestAnimationFrame(()=>{narrationDetails.current?.setAttribute('open','');narrationDetails.current?.scrollIntoView({block:'start',behavior:'smooth'});});};
  const finishReading=()=>{release();setReviewedNarration(null);narrationDetails.current?.removeAttribute('open');setPlaying(true);};
  const captureReport=()=>{release();setPlaying(false);if(session.current)setReport(buildExplorationReport(session.current,notebook.current));};
  const openReport=()=>{captureReport();setDrawer(true);requestAnimationFrame(()=>{reportDetails.current?.setAttribute('open','');reportDetails.current?.scrollIntoView({block:'start',behavior:'smooth'});reportDetails.current?.querySelector('summary')?.focus({preventScroll:true});});};
  const downloadReport=(format:'md'|'json')=>{if(report)downloadExplorationReport(report,format);};
  const requestTransition=(intent:ExplorationTransition)=>{
    const s=session.current;if(!s||transition)return;
    transitionFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
    release();setPlaying(false);setTransition({intent,report:buildExplorationReport(s,notebook.current),resume:playing&&!error&&!s.state.contact});
  };
  const cancelTransition=()=>{
    if(!transition)return;release();setPlaying(transition.resume&&!error&&!session.current?.state.contact);setTransition(null);
    requestAnimationFrame(()=>{const focus=transitionFocus.current;if(focus?.isConnected)focus.focus({preventScroll:true});else host.current?.focus({preventScroll:true});});
  };
  const confirmTransition=()=>{
    if(!transition)return;release();const intent=transition.intent;setTransition(null);
    if(intent==='overview')onClose();else if(intent==='practice')onPractice();else if(intent==='story')onStory?.();
    else {setPlaying(true);setCameraMode('follow');setPart(null);narrationDetails.current?.removeAttribute('open');reportDetails.current?.removeAttribute('open');setRevision(v=>v+1);}
  };
  useEffect(()=>{if(!playing)release();},[playing]);
  useEffect(()=>{
    const mount=host.current;if(!mount)return;
    const s=new ExplorationSession();session.current=s;notebook.current=createExplorationNotebook();narration.current=new ExplorationNarrationLog();setReviewedNarration(null);setReport(null);reportDetails.current?.removeAttribute('open');s.startTour();release();setError('');setTextures('环境纹理读取中…');
    let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true,powerPreference:'high-performance'});}catch{setError('三维显示初始化失败，请确认浏览器支持 WebGL 后重新进入。');return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
    renderer.setClearColor('#03080d');renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;mount.prepend(renderer.domElement);
    renderer.domElement.setAttribute('aria-label','连续三维探索航区');
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,1,.15,180000000),sun=new THREE.Vector3(-.6,.85,.55).normalize();
    scene.add(new THREE.HemisphereLight('#91b2d3','#22202a',.5));
    const light=new THREE.DirectionalLight('#fff1d8',3.1);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:1,far:160});light.shadow.bias=-.00015;light.shadow.normalBias=.025;scene.add(light,light.target);
    let alive=true,textureCount=0,textureFailed=false;
    const world=makeExplorationWorld(scene,sun,ok=>{if(!alive)return;if(ok)textureCount++;else textureFailed=true;setTextures(textureFailed?'部分纹理未能载入':textureCount>=3?'本地纹理 · 静态资料':'环境纹理读取中…');});
    const ship=makePilotShip();scene.add(ship.group);
    const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),reflection=pmrem.fromScene(room,.12);room.dispose();pmrem.dispose();
    ship.group.traverse(node=>{if(node instanceof THREE.Mesh)for(const material of Array.isArray(node.material)?node.material:[node.material])if(material instanceof THREE.MeshStandardMaterial){material.envMap=reflection.texture;material.envMapIntensity=material.transparent?.12:.45;}});
    const cameraTransition=new ObservationCameraTransition();
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=18;controls.maxDistance=2200;
    const cancelTransition=()=>cameraTransition.cancel();controls.addEventListener('start',cancelTransition);
    const head=new THREE.Vector2();let pointer:{id:number;x:number;y:number}|null=null;
    const down=(e:PointerEvent)=>{if(e.button!==0||settings.current.cameraMode!=='cockpit')return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);};
    const move=(e:PointerEvent)=>{if(!pointer||pointer.id!==e.pointerId)return;head.x=THREE.MathUtils.clamp(head.x-(e.clientX-pointer.x)*.003,-1,1);head.y=THREE.MathUtils.clamp(head.y-(e.clientY-pointer.y)*.003,-.42,.42);pointer={id:e.pointerId,x:e.clientX,y:e.clientY};};
    const up=()=>{pointer=null;};
    renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);renderer.domElement.addEventListener('lostpointercapture',up);
    const blur=()=>{release();up();},hidden=()=>{if(document.hidden){release();setPlaying(false);}},keyUp=(e:KeyboardEvent)=>{if(keyMap[e.code])held.current.delete(keyMap[e.code]);};
    window.addEventListener('blur',blur);window.addEventListener('keyup',keyUp);document.addEventListener('visibilitychange',hidden);
    const contextLost=(e:Event)=>{e.preventDefault();release();setPlaying(false);setError('三维显示被浏览器中断，请重新开始航程。');};renderer.domElement.addEventListener('webglcontextlost',contextLost);
    const resize=()=>{const rect=mount.getBoundingClientRect();if(rect.width&&rect.height){renderer.setSize(rect.width,rect.height);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();}};
    const observer=new ResizeObserver(resize);observer.observe(mount);resize();
    const routeGeometry=new THREE.BufferGeometry(),trailGeometry=new THREE.BufferGeometry();
    routeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(600),3));routeGeometry.setDrawRange(0,0);
    routeGeometry.setAttribute('lineDistance',new THREE.Float32BufferAttribute(new Float32Array(200),1));
    trailGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(6000),3));trailGeometry.setDrawRange(0,0);
    const updateLine=(geometry:THREE.BufferGeometry,points:THREE.Vector3[])=>{const attribute=geometry.getAttribute('position'),distance=geometry.getAttribute('lineDistance'),count=Math.min(points.length,attribute.count);let length=0;for(let i=0;i<count;i++){attribute.setXYZ(i,points[i].x,points[i].y,points[i].z);if(i>0)length+=points[i-1].distanceTo(points[i]);if(distance)distance.setX(i,length);}attribute.needsUpdate=true;if(distance)distance.needsUpdate=true;geometry.setDrawRange(0,count);geometry.computeBoundingSphere();};
    const routeLine=new THREE.Line(routeGeometry,new THREE.LineDashedMaterial({color:'#a9d3b5',transparent:true,opacity:.5,dashSize:6,gapSize:4,depthWrite:false}));
    const trailLine=new THREE.Line(trailGeometry,new THREE.LineBasicMaterial({color:'#75accb',transparent:true,opacity:.6,depthWrite:false}));scene.add(routeLine,trailLine);
    const shipBeacon=new THREE.Mesh(new THREE.OctahedronGeometry(11),new THREE.MeshBasicMaterial({color:'#e9edc2',wireframe:true,depthTest:false}));shipBeacon.renderOrder=10;scene.add(shipBeacon);
    let previous=performance.now(),accumulator=0,frame=0,lastPublish=0,lastViewKey='',lastVisitCount=0,applied=idleInput();
    const goalPose=(mode:CameraMode)=>{
      const p=s.state.position;
      if(mode==='map')return lookPose(new THREE.Vector3(650,900,900),new THREE.Vector3(0,0,-420));
      if(mode==='cockpit'){
        const position=ship.cockpit.eye.clone().applyQuaternion(s.state.attitude).add(p),quaternion=s.state.attitude.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(head.y,head.x,0,'YXZ')));
        return {position,quaternion,target:new THREE.Vector3(0,0,-30).applyQuaternion(quaternion).add(position),fov:72};
      }
      if(mode==='inspect'){
        const profile=OBSERVATIONS[s.destination.id];
        if(s.destination.id==='view')return lookPose(p.clone().add(new THREE.Vector3(10,12,15)),p.clone().add(new THREE.Vector3(0,-160,-1100)),58);
        const focus=s.destination.id==='home'?p.clone():s.destination.position.clone();
        const offset=new THREE.Vector3(1,.65,-1.4).normalize().multiplyScalar(profile.distance/Math.min(1,camera.aspect));
        return lookPose(focus.clone().add(offset),focus);
      }
      return lookPose(p.clone().add(new THREE.Vector3(30,20,55)),p);
    };
    const animate=(now:number)=>{
      if(!alive)return;frame=requestAnimationFrame(animate);const options=settings.current,dt=Math.min(.1,Math.max(0,(now-previous)/1000));previous=now;
      const active=(v:Control)=>held.current.has(v),input:FlightInput={thrust:+active('forward')-+active('reverse'),yaw:+active('left')-+active('right'),pitch:+active('up')-+active('down'),roll:+active('rollLeft')-+active('rollRight'),brake:active('brake')};
      const before=s.state.position.clone();
      if(options.playing&&!document.hidden&&!s.state.contact){
        const multiplier=explorationTimeRate(s,options.rate,input);
        accumulator+=dt*multiplier;
        while(accumulator>=FLIGHT_STEP){
          const beforeStatus=s.status;applied=s.step(input,FLIGHT_STEP);world.update(FLIGHT_STEP);accumulator-=FLIGHT_STEP;
          if(s.state.contact){setPlaying(false);accumulator=0;break;}
          if(beforeStatus==='arrived'&&s.status!=='arrived'){if(options.cameraMode==='inspect')setCameraMode('follow');setPart(null);}
          if(beforeStatus!=='arrived'&&s.status==='arrived'){accumulator=0;break;}
        }
      }else{accumulator=0;s.state.firing=0;applied=idleInput();}
      ship.group.position.copy(s.state.position);ship.group.quaternion.copy(s.state.attitude);ship.cockpit.controls(s.state.contact?idleInput():applied,!s.pilot.enabled);
      ship.updatePropulsion(s.state,options.playing);
      light.target.position.copy(s.state.position);light.position.copy(s.state.position).addScaledVector(sun,80);
      if(s.visits.length>lastVisitCount){lastVisitCount=s.visits.length;setPart(null);if(options.autoInspect)setCameraMode('inspect');}
      const mode=options.cameraMode==='inspect'&&s.status!=='arrived'?'follow':options.cameraMode;
      ship.cockpit.pilot.setView(mode==='cockpit');
      const viewKey=`${mode}:${mode==='inspect'?s.destination.id:''}:${options.cameraRequest}`;
      const goal=goalPose(mode);
      if(lastViewKey!==viewKey){
        head.set(0,0);up();
        if(lastViewKey)cameraTransition.start(camera,controls.target);
        else{camera.position.copy(goal.position);camera.quaternion.copy(goal.quaternion);controls.target.copy(goal.target);camera.fov=goal.fov;camera.updateProjectionMatrix();}
        lastViewKey=viewKey;
      }
      controls.enabled=mode!=='cockpit';
      if(cameraTransition.active)cameraTransition.update(camera,controls.target,goal,dt);
      else if(mode==='cockpit'){
        camera.position.copy(goal.position);camera.quaternion.copy(goal.quaternion);controls.target.copy(goal.target);camera.fov=goal.fov;camera.updateProjectionMatrix();
      }else{
        if(mode==='follow'){const delta=s.state.position.clone().sub(before);camera.position.add(delta);controls.target.add(delta);}controls.update();
      }
      camera.up.set(0,1,0);if(mode==='cockpit')camera.up.applyQuaternion(camera.quaternion);
      world.helpers.visible=options.guides;routeLine.visible=options.guides&&s.route.length>0;trailLine.visible=options.guides;shipBeacon.visible=options.cameraMode==='map';shipBeacon.position.copy(s.state.position);
      camera.updateMatrixWorld();
      for(const d of destinations){const el=labels.current.get(d.id);if(!el)continue;const local=d.position.clone().sub(camera.position).applyQuaternion(camera.quaternion.clone().invert()),point=d.position.clone().project(camera);const show=options.guides&&mode!=='inspect'&&local.z<0&&Math.abs(point.x)<.94&&Math.abs(point.y)<.8;
        el.style.display=show?'block':'none';if(show){el.style.left=`${(point.x*.5+.5)*100}%`;el.style.top=`${(-point.y*.5+.5)*100}%`;}
      }
      const observedNode=world.nodes.get(s.destination.id);observedNode?.updateWorldMatrix(true,false);
      const occupiedParts:DOMRect[]=[];
      for(const item of OBSERVATIONS[s.destination.id].parts){
        const el=partLabels.current.get(item.id);if(!el)continue;
        const anchor=observedNode?.localToWorld(new THREE.Vector3(...item.point));
        if(!anchor||mode!=='inspect'||!options.guides||cameraTransition.active){el.style.display='none';continue;}
        const local=anchor.clone().sub(camera.position).applyQuaternion(camera.quaternion.clone().invert()),point=anchor.project(camera);
        const visible=local.z<0&&Math.abs(point.x)<.9&&Math.abs(point.y)<.78;el.style.display=visible?'block':'none';
        if(visible){
          el.style.left=`${(point.x*.5+.5)*100}%`;el.style.top=`${(-point.y*.5+.5)*100}%`;
          const text=el.querySelector('span')!,leader=el.querySelector('i')!;let length=mount.clientWidth<700?18:27;
          leader.style.height=`${length}px`;let bounds=text.getBoundingClientRect();
          // Extend the leader rather than moving its endpoint away from the real part.
          for(let attempt=0;attempt<10&&occupiedParts.some(r=>bounds.left<r.right+6&&bounds.right>r.left-6&&bounds.top<r.bottom+6&&bounds.bottom>r.top-6);attempt++){
            length+=bounds.height+8;leader.style.height=`${length}px`;bounds=text.getBoundingClientRect();
          }
          occupiedParts.push(bounds);
        }
      }
      mount.dataset.cameraTransition=String(cameraTransition.active);
      mount.dataset.cameraMode=mode;
      if(now-lastPublish>100){
        narration.current.capture(s,!options.playing);
        const r=snapshot(s,notebook.current,narration.current);setReading(r);const t=targetReading(s.state,s.destination.position,s.destination.radius),steering=steeringToTarget(s.state,s.destination.position);
        ship.cockpit.update({...t,speed:r.speed,fuel:r.fuel,firing:r.firing,bearing:steering.bearing});
        updateLine(routeGeometry,[s.state.position.clone(),...s.route.slice(s.routeIndex)]);updateLine(trailGeometry,s.trail);lastPublish=now;
      }
      renderer.render(scene,camera);
    };
    narration.current.capture(s,!settings.current.playing);setReading(snapshot(s,notebook.current,narration.current));frame=requestAnimationFrame(animate);mount.focus({preventScroll:true});
    return()=>{alive=false;cancelAnimationFrame(frame);session.current=null;release();observer.disconnect();controls.removeEventListener('start',cancelTransition);controls.dispose();world.dispose();disposeEnvironmentScene(scene);reflection.dispose();light.shadow.dispose();window.removeEventListener('blur',blur);window.removeEventListener('keyup',keyUp);document.removeEventListener('visibilitychange',hidden);renderer.domElement.removeEventListener('webglcontextlost',contextLost);renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',up);renderer.domElement.removeEventListener('lostpointercapture',up);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
  },[revision]);
  const control=(label:string,action:Control)=><button disabled={!playing||!!reading.contact||!!error} onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);if(reading.automatic||reading.tour.length)takeover();held.current.add(action);}} onPointerUp={()=>held.current.delete(action)} onPointerCancel={()=>held.current.delete(action)} onLostPointerCapture={()=>held.current.delete(action)} onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(reading.automatic||reading.tour.length)takeover();held.current.add(action);}}} onKeyUp={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();held.current.delete(action);}}} onBlur={()=>held.current.delete(action)}>{label}</button>;
  const mapScale=175/Math.max(1100,Math.abs(reading.position[0])*2+100,Math.abs(reading.position[2]+450)*2+100);
  const mapPoint=(p:number[])=>[130+p[0]*mapScale,100-(p[2]+450)*mapScale];
  const shipPoint=mapPoint(reading.position),activeRate=Math.min(rate,reading.activeRate);
  const cue=playing?reading.cue:reading.pausedCue,story=EXPLORATION_STORIES[reading.id];
  const returned=!!reading.completedReturn;
  const canRejoin=!reading.automatic&&(!reading.tour.length||reading.status==='blocked')&&reading.remaining.length>0;
  const resumeLabel=reading.remaining.length===1&&reading.remaining[0]==='home'?'返回出发航点':'继续未完成巡视';
  return <div className="flight-environment free-exploration" ref={root} role="dialog" aria-modal={!transition} aria-label="连续三维自由探索" onKeyDown={e=>{
    e.stopPropagation();if(e.key==='Escape'){e.preventDefault();requestTransition('overview');}
    if(e.key==='Tab'){const items=[...root.current!.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,summary,[tabindex="0"]')].filter(el=>el.getClientRects().length),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
  }}>
    <header className="flight-env-header" inert={!!transition}><button onClick={()=>requestTransition('overview')}>← 返回全景</button><span className="flight-env-brand">ORBIT <small>连续探索 · 同一航区</small></span><div className="exploration-header-actions"><button className="exploration-open-report" onClick={openReport}>航程回顾</button><button aria-expanded={drawer} onClick={()=>setDrawer(v=>!v)}>{drawer?'收起导航':'展开导航'}</button></div></header>
    <div className={`flight-env-body ${drawer?'':'flight-env-wide'}`} inert={!!transition}>
      <section className={`flight-env-stage exploration-stage ${cameraMode==='cockpit'?'exploration-cockpit':''}`} ref={host} tabIndex={0} aria-label="三维探索画面，W S 推进，A D 转向，上下键俯仰，B 减速，空格暂停" onPointerDown={e=>{if(e.target instanceof HTMLCanvasElement)host.current?.focus({preventScroll:true});}} onBlur={release} onKeyDown={e=>{
        if(e.target!==host.current)return;if(e.code==='Space'){e.preventDefault();release();if(!error&&!reading.contact)setPlaying(v=>!v);return;}
        const action=keyMap[e.code];if(action){e.preventDefault();if(playing&&!error&&!reading.contact){if(reading.automatic||reading.tour.length)takeover();held.current.add(action);}}
      }}>
        <div className="exploration-heading"><small>NEAR EARTH / CONTINUOUS FLIGHT</small><h1>{cameraMode==='inspect'?`观察镜头 · ${target.name}`:reading.status==='arrived'?`抵达 · ${target.name}`:reading.automatic?`正在前往 · ${target.name}`:'自由探索'}</h1><p>{cameraMode==='inspect'?'只改变取景，飞船留在到达位置 · 拖动绕看':cameraMode==='map'?'航区总览 · 浅色线框标出飞船位置':cameraMode==='cockpit'?'座舱视角 · 拖动环顾，驾驶键随时接管':'机外跟随 · 飞船运动中，拖动可绕看'}</p></div>
        <div className="exploration-telemetry" aria-label="飞船实时状态"><span>速率 <b>{reading.speed.toFixed(1)} m/s</b></span><span>航程 <b>{reading.travel.toFixed(0)} m</b></span><span>推进剂 <b>{reading.fuel.toFixed(2)} kg</b></span><span>转速 <b>{reading.rotationRate.toFixed(1)} °/s</b></span><span className="exploration-turning">{reading.turning}</span><span>{playing?'运行':'暂停'} · {activeRate}× 时间</span></div>
        {destinations.map(d=><button key={d.id} ref={el=>{if(el)labels.current.set(d.id,el);else labels.current.delete(d.id);}} className="exploration-object" aria-pressed={reading.previewId===d.id} onClick={()=>select(d.id)}>{d.name}<small>{d.radius===0?'导航航点':'三维实体'}</small></button>)}
        {reading.status==='arrived'&&cameraMode==='inspect'&&OBSERVATIONS[reading.id].parts.map(item=><button key={`${reading.id}-${item.id}`} ref={el=>{if(el)partLabels.current.set(item.id,el);else partLabels.current.delete(item.id);}} className="exploration-part" aria-pressed={part===item.id} onClick={()=>choosePart(item.id)}><span>{item.label}</span><i/></button>)}
        <div className="exploration-flight-cue" data-status={reading.status} data-tone={cue.tone}><small>随航讲解 · {cue.speaker}</small><strong>{cue.title}</strong><p>{cue.text}</p><p className="exploration-cue-action">{cue.action}</p><button className="exploration-read-cue" onClick={openNarration}>{playing?'暂停读讲解':'讲解回看'}</button>{canRejoin&&<button className="exploration-resume-hud" disabled={!!reading.contact||!!error||reading.fuel<=0} onClick={resumeTour}>{resumeLabel}</button>}{(reading.automatic||reading.tour.length>0)&&<button className="exploration-takeover" onClick={takeover}>接管，自由驾驶</button>}{reading.status==='arrived'&&<div className="exploration-arrival-actions"><button onClick={observe}>近看并停留</button>{reading.tour.length>0&&<button className="exploration-hud-continue" onClick={continueTour}>继续下一站 →</button>}</div>}</div>
        <div className="flight-env-toolbar">{([['follow','机外跟随'],['cockpit','座舱驾驶'],['map','航区总览']] as const).map(([id,label])=><button key={id} aria-pressed={cameraMode===id} onClick={()=>{release();setCameraMode(id);}}>{label}</button>)}<button className="exploration-pause" disabled={!!error||!!reading.contact} onClick={()=>{release();setPlaying(v=>!v);}}>{playing?'暂停':'继续'}</button></div>
        <div className="flight-env-hint">近地教学航区 · 1.5 km 范围 · 对象位置为合成设定 · 蓝线为已飞轨迹</div>
        {(error||reading.contact)&&<div className="flight-env-alert" role="alert"><strong>航程需要重新开始</strong><p>{error||reading.contact}</p><button onClick={()=>requestTransition('restart')}>重新开始航程（重置状态）</button></div>}
      </section>
      {drawer&&<aside className="flight-env-panel exploration-panel" aria-label="探索导航">
        <div className="exploration-route-header"><small>蓝色地平线 / 六站巡视</small><strong>认识身边的太空</strong><p>你是这艘飞船的观察员，也能随时接管驾驶。沿途辨认卫星、级段与平台，再回望地球，最后带着航迹返回。</p><div className="exploration-story-progress">已抵达 {reading.arrivalCount} / 6 · 阅读笔记 {reading.book.notes.length} / 6</div><details className="exploration-briefing"><summary>任务安排与启航前序</summary><p>进入后自动开始巡游，每站停留 12 秒。想看清部件，点标注即可停留；保存笔记完全自愿，不影响下一站。错过讲解可点「暂停读讲解」；手动接管后可「继续未完成巡视」。随航讲解是本地教学提示，没有真实地面通信。</p><p>点选目的地只查看介绍，点击「自动前往」才改道；各站共享航程状态。六站是按理解顺序布置的教学航区，不是真实航天任务路线。</p>{onStory&&<><p>想从地球开始，可进入连续载人任务：地面检查 → 发射入轨 → 平台观察 → 返回与软着陆。进入会结束当前局部航程；两种任务的状态不混用。</p><button className="exploration-story-entry" onClick={()=>requestTransition('story')}>从地球开始载人任务（结束本航程）</button></>}</details></div>
        {canRejoin&&<section className="exploration-rejoin" aria-label="继续当前巡视"><small>航程与到达记录保留</small><h2>{resumeLabel}</h2><p>接着前往 {destinations.find(d=>d.id===reading.remaining[0])!.name}，本次安排 {reading.remaining.length} 站，最后返回出发航点。沿途已到达的其它站会跳过。</p><button className="exploration-resume-tour" disabled={!!reading.contact||!!error||reading.fuel<=0} onClick={resumeTour}>{resumeLabel} →</button><small>从现在的位置与速度重新规划，不补油、不瞬移，笔记保留。</small></section>}
        <section className="exploration-current-chapter" data-id={reading.id}><small>{reading.status==='arrived'?'本站主题':reading.automatic?'本段目标':'当前关注'} · {story.chapter}</small><p>{story.purpose}</p></section>
        <ExplorationNarrationPanel entries={reading.narration} discarded={reading.discardedNarration} selectedEntry={reviewedNarration} detailsRef={narrationDetails} paused={!playing} disabled={!!error||!!reading.contact} onOpen={beginReading} onSelect={id=>{release();setPlaying(false);setReviewedNarration(reading.narration.find(entry=>entry.id===id)??null);}} onResume={finishReading}/>
        {returned&&<section className="exploration-debrief" aria-label="六站巡视回顾"><small>首次往返记录 · 此后飞行仍保留</small><h2>六站往返已记录</h2><p>T+{reading.completedReturn!.time.toFixed(0)} s · {reading.completedReturn!.travel.toFixed(0)} m · 已用推进剂 {(100-reading.completedReturn!.fuel).toFixed(2)} kg。时间包含停留，返回未补油。</p><p>你主动保存了 {reading.book.notes.length} / 6 份阅读笔记。到达和阅读不代表已执行维修、拍照或通信。</p><button className="exploration-completed-report" onClick={openReport}>查看并保存航程记录</button></section>}
        <ExplorationReportPanel report={report} detailsRef={reportDetails} paused={!playing} disabled={!!error||!!reading.contact} onOpen={captureReport} onDownload={downloadReport} onResume={()=>{release();reportDetails.current?.removeAttribute('open');setPlaying(true);host.current?.focus({preventScroll:true});}}/>
        {reading.status==='arrived'&&<ExplorationObservationPanel id={target.id} name={target.name} staying={reading.staying} dwell={reading.dwell} paused={!playing} next={reading.tour.length?destinations.find(d=>d.id===reading.tour[0])!.name:null} nextId={reading.tour[0]??null} part={part} onPart={choosePart} onObserve={observe} onStay={stay} onContinue={continueTour} book={reading.book} canSave={reading.canSaveNote} onSave={saveNote}/>}
        <details className="exploration-notebook" ref={notebookDetails}><summary>阅读笔记 · 已保存 {reading.book.notes.length} / 6</summary><p>到站会自动记录，笔记由你打开介绍后主动保存。未保存不等于未观察；系统不判断是否理解，也没有自动拍照。</p>{destinations.map(d=>{const note=reading.book.notes.find(n=>n.id===d.id),arrived=reading.visits.some(v=>v.id===d.id);return <article key={d.id} data-id={d.id} data-saved={!!note}><strong>{d.name}</strong><small>{note?`已保存 · T+${note.time.toFixed(0)} s`:arrived?'已到达 · 未保存笔记':'未到达'}</small>{note&&<p>{EXPLORATION_STORIES[d.id].finding}</p>}</article>;})}<p>只保留本次航程，退出或重启后清空。</p></details>
        <svg className="exploration-map" viewBox="0 0 260 210" role="img" aria-label="航区俯视导航，三角形为飞船，圆点为地点"><path d="M0 18H260 M130 0V205" stroke="#38545b" strokeDasharray="3 6"/><polyline points={[reading.position,...reading.route].map(p=>mapPoint(p).join(',')).join(' ')} fill="none" stroke="#aad2aa" strokeWidth="1" strokeDasharray="4 4"/>{destinations.map((d,i)=>{const [x,y]=mapPoint(d.position.toArray());return <g key={d.id}><circle cx={x} cy={y} r={reading.id===d.id?5:3} fill={reading.id===d.id?'#e4dda3':'#8bb5be'}/><text x={x+7} y={y+3}>{i+1}</text></g>;})}<path d={`M${shipPoint[0]} ${shipPoint[1]-7}l-5 10 5-3 5 3z`} fill="#f3f1c9" transform={`rotate(${reading.heading},${shipPoint[0]},${shipPoint[1]})`}/><text x="8" y="202">俯视投影 · 高度见下方读数</text></svg>
        <div className="exploration-destinations">{destinations.map((d,i)=><button key={d.id} className="exploration-destination" data-id={d.id} aria-pressed={reading.previewId===d.id} onClick={()=>select(d.id)}><span>0{i+1} · {d.name}</span><small>{reading.visits.some(v=>v.id===d.id)?'已访问 · ':''}{d.position.distanceTo(new THREE.Vector3(...reading.position)).toFixed(0)} m</small></button>)}</div>
        <article className="exploration-destination-info"><small>查看介绍{reading.previewId!==reading.id?` · 当前${reading.status==='arrived'?'停留于':reading.status==='cruise'?'前往':'关注'} ${target.name}`: ' · 当前关注目标'}</small><h2>{previewTarget.name}</h2><p>{previewTarget.description}</p><small>{EXPLORATION_STORIES[previewTarget.id].observe}</small></article>
        <div className="exploration-primary-actions"><button className="exploration-depart" disabled={!!reading.contact||!!error||reading.fuel<=0} onClick={depart}>自动前往 · {previewTarget.name}</button><button className="exploration-tour" disabled={!!reading.contact||!!error||reading.fuel<=0} onClick={()=>{release();if(session.current?.startTour()){setPlaying(true);if(cameraMode==='inspect')setCameraMode('follow');setPart(null);}emit();}}>从当前位置巡游全部</button></div>
        {reading.tour.length>0&&<p className="exploration-next">之后：{reading.tour.map(id=>destinations.find(d=>d.id===id)!.name).join(' → ')}</p>}
        <label className="exploration-auto-observe"><input type="checkbox" checked={autoInspect} onChange={e=>setAutoInspect(e.target.checked)}/>到站自动切入观察镜头</label>
        <label className="exploration-rate">直线巡航时间倍率<select value={rate} onChange={e=>setRate(Number(e.target.value))}><option value={1}>1× · 实时运动</option><option value={4}>4× · 更快浏览</option></select></label><small className="exploration-note">转向、减速、手动驾驶和到站观察使用 1×。先用成对姿态喷口起转，再反向喷气稳住，才启动主推进。转船头不等于改变滑行方向；到站停留 12 秒。</small>
        <dl className="exploration-stats"><div><dt>累计时间</dt><dd>{reading.time.toFixed(1)} s</dd></div><div><dt>目标接触余量</dt><dd>{reading.clearance.toFixed(1)} m</dd></div><div><dt>相对起点高度</dt><dd>{reading.position[1].toFixed(1)} m</dd></div><div><dt>已访问地点</dt><dd>{new Set(reading.visits.map(v=>v.id)).size} / 6</dd></div></dl>
        <details className="exploration-manual"><summary>亲自驾驶 · 按键或按钮接管</summary><div className="flight-env-thrust">{control('推进 W','forward')}{control('反推 S','reverse')}</div><div className="flight-env-turn">{control('左转 A','left')}{control('抬头 ↑','up')}{control('右转 D','right')}{control('左滚 Q','rollLeft')}{control('低头 ↓','down')}{control('右滚 E','rollRight')}</div><div className="flight-env-brake">{control('反推减速 B','brake')}</div><p>先点画面再用键盘；松开后仍会滑行。接管会退出自动巡游，已访问记录保留；可点击「继续未完成巡视」接回剩余路线。拖动镜头只改变视线。</p><p>姿态辅助默认开启：松开转向键后，反向喷气制止转动；已有平移速度仍保留。转速上限 8°/s、角加速度上限 4°/s² 是本教学构型的设定。B 使用简化的多方向姿态控制喷口减速，不代表所有真实飞船都能这样制动。</p></details>
        <details className="exploration-log"><summary>航行记录 · {reading.visits.length} 次抵达</summary>{reading.visits.length?reading.visits.map((v,i)=><p key={i}>{destinations.find(d=>d.id===v.id)!.name} · T+{v.time.toFixed(0)} s · 剩余 {v.fuel.toFixed(1)} kg</p>):<p>真正抵达并停稳后才记录，不会因点击目的地而算作到达。</p>}</details>
        <label className="exploration-guides"><input type="checkbox" checked={guides} onChange={e=>setGuides(e.target.checked)}/>地点标记、航线和飞行轨迹</label>
        <details className="exploration-boundary"><summary>航区与真实太空的区别</summary><p>地球使用已有静态纹理、云层与大气效果。六个地点是近地背景中的合成教学布置；岩体为演练对象，不表示近地空间有密集石群。观景点和出发点没有实体。</p><p>当前仍是无引力的局部惯性模型，不是实际轨道或连续地月航行。目标中心固定；相对高度是本地坐标，不是海拔。视图中的航线与轨迹为辅助显示，返回不会补油。退出或重新开始才清空航程，尚无存档。</p><p>{textures}。切换到下方独立练习或启航故事会结束本次航程。</p><button className="exploration-practice" onClick={()=>requestTransition('practice')}>进入原有独立练习</button>{onStory&&<button onClick={()=>requestTransition('story')}>进入载人任务</button>}</details>
      </aside>}
    </div>
    {transition&&<ExplorationTransitionDialog intent={transition.intent} report={transition.report} resumeOnCancel={transition.resume} onCancel={cancelTransition} onConfirm={confirmTransition} onDownload={format=>downloadExplorationReport(transition.report,format)}/>}
  </div>;
}
