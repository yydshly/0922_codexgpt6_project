import { Quaternion, Vector3 } from 'three';
import { LAUNCH_EARTH } from '../data/launchMission';
import { SITE_FIXED, SITE_UP, add, scale, norm, dot, unit, airVelocity, surfaceAt, rotateEarth, integrateAscent, guidance, type V3, type Particle, type AscentModel } from '../launch/ascent';
import { orbitalElements, orbitGuidance, cross } from '../launch/orbitInsertion';
import { reentryAtmosphere, stagnationHeatFlux } from '../launch/reentry';
import {advanceCrewAttitude,CREW_ATTITUDE} from './crewAttitude';
import {crewContactFrame,crewSupportedFeet,crewLegsDeployed,CREW_CONTACT_LIMITS} from './crewContact';
import {crewCarrierContactFrame} from './crewCarrierGeometry';
import {CREW_PILOT_FLIGHT_PHASES,CREW_PILOT_THROTTLE_PHASES,CREW_PILOT_ACTION_LABELS,CREW_PILOT_ACTIONS,crewObservationReady,type CrewPilotAction,type CrewPilotActionStatus,type CrewPilotState} from './crewPilotControl';
export type {CrewPilotAction,CrewPilotActionStatus,CrewPilotState} from './crewPilotControl';

/** Separate teaching vehicle: never changes E01/E02 or imports their satellite saves. */
export const CREW_VEHICLE = Object.freeze({
  version:'crew-earth-3', capsuleDryKg:3200, capsuleRcsFuelKg:18, landingFuelKg:100, serviceDryKg:800, serviceFuelKg:900,
  boosterDryKg:14000, boosterFuelKg:200000, boosterThrustN:3600000, boosterIspS:315,
  upperDryKg:3000, upperFuelKg:50000, upperThrustN:480000, upperIspS:345,
  mainThrustN:3500, rcsThrustN:1000, serviceIspS:310, landingThrustN:60000, landingIspS:220,
  orbitM:400000, mainChuteAreaM2:1000, drogueAreaM2:24, capsuleCdAreaM2:15,
});
export type CrewPhase='ground'|'countdown'|'ascent'|'upper'|'insertion'|'approach'|'observe'|'return-ready'|'deorbit'|'return-coast'|'entry'|'drogue'|'main-chute'|'landing'|'touchdown'|'complete'|'failed';
export const CREW_PHASES:Record<CrewPhase,{title:string;why:string;action:string}>={
  ground:{title:'01 · 地面准备',why:'驾驶员已在返回舱内。检查约束带、推进与返回设备，明确平台观察任务。',action:'确认检查后开始完整任务。'},
  countdown:{title:'02 · 点火与离台',why:'T−3 秒点火建压；T=0 才释放地面约束。',action:'监控推力与重量，系统执行发射。'},
  ascent:{title:'03 · 一级上升',why:'推力克服重力与空气阻力；向东制导逐渐建立水平速度。',action:'观察空气密度、动压与驾驶员座椅约束。'},
  upper:{title:'04 · 二级推进',why:'一级燃尽后分离。二级继续推进，飞船仍作为载荷共同运动。',action:'系统自动制导；无需用方向键驾驶整支火箭。'},
  insertion:{title:'05 · 建立稳定轨道',why:'高度够高不等于入轨。持续检查实际位置与速度对应的近、远地点。',action:'目标轨道达到后关机与分离，沿用同一状态。'},
  approach:{title:'06 · 在轨接近平台',why:'平台和飞船都在绕地运动。RCS 逐渐调整相对速度，船头与航迹分别显示。',action:'自动接近或接管：W/S 推进，A/D 转向，上下键俯仰，B 相对平台减速。'},
  observe:{title:'07 · 平台外部观察',why:'在平台后方保持观察距离；相对停稳仍意味着两者共同绕地运行。',action:'对准平台、保持距离并记录结构观察。完整演示会自动执行。'},
  'return-ready':{title:'08 · 返回准备',why:'外部观察记录已生成。检查返回设备与独立的软着陆推进剂。',action:'授权返回，沿当前轨道执行有限时长离轨点火。'},
  deorbit:{title:'09 · 离轨点火',why:'船头逐渐对准逆速度方向，主发动机降低轨道近地点。',action:'看速度方向与推力方向，机动结束后分离服务舱。'},
  'return-coast':{title:'10 · 离轨后滑行与转姿',why:'服务舱已经分离；返回舱继续沿降低的轨道滑行，用自身喷口转到热盾迎风姿态。高空暂不意味着强烈发热。',action:'观察独立姿态喷口与船头角度；下降越过 120 km 后进入本模型的再入阶段。'},
  entry:{title:'11 · 再入大气',why:'返回舱受重力和气动阻力；热流表示迎风受热强弱，不是舱内温度。120 km 是教学阶段界线，空气密度连续变化。',action:'喷口辅助与气动恢复力矩保持热盾迎风。检查动压、热流和过载。'},
  drogue:{title:'12 · 减速伞下降',why:'只有高度、相对空气速度与动压均满足条件才开伞；伞面积逐渐建立。',action:'监控伞状态；手动路线可在条件满足时授权主伞。'},
  'main-chute':{title:'13 · 主伞下降',why:'主伞拉力减小下降速度，空气随地球旋转；落区来自实际轨迹。',action:'查看下降速度和离地高度，准备软着陆。'},
  landing:{title:'14 · 近地软着陆',why:'近地发动机用专用推进剂继续减速；接地时缓冲机构吸收剩余动能。',action:'软着陆系统自动执行；可暂停观察推力与接地受力。'},
  touchdown:{title:'15 · 接地检查',why:'返回舱已经接地。支撑与缓冲力使其稳定，不能把高度到零直接判为安全。',action:'检查落地速度和缓冲过载，发送回收信号。'},
  complete:{title:'16 · 任务完成',why:'完成地球出发、平台观察、返回与接地检查。报告来自本次实际计算。',action:'下载记录或开始新任务。'},
  failed:{title:'任务暂停 · 条件不足',why:'当前计算或任务条件未满足，保留状态与原因。',action:'检查提示并重新开始；不补记观察或安全着陆。'},
};
export interface CrewControls {thrust:number;yaw:number;pitch:number;roll:number;brake:boolean}
export const crewIdle=():CrewControls=>({thrust:0,yaw:0,pitch:0,roll:0,brake:false});
export interface CrewRecord {time:number;label:string;phase:CrewPhase}
export interface CrewObservation {time:number;distanceM:number;relativeSpeedMS:number;pointingDeg:number;parts:string[]}
export interface CrewSnapshot {
  phase:CrewPhase;time:number;position:V3;velocity:V3;attitude:[number,number,number,number];angularVelocity:V3;attitudeEffort:V3;
  targetPosition:V3;targetVelocity:V3;massKg:number;serviceFuelKg:number;capsuleRcsFuelKg:number;landingFuelKg:number;launchFuelKg:number;
  attitudeTorqueNm:V3;passiveTorqueNm:V3;attitudeSource:string;
  automatic:boolean;fullDemo:boolean;altitudeM:number;groundSpeedMS:number;verticalMS:number;orbitalSpeedMS:number;
  distanceM:number;relativeSpeedMS:number;pointingDeg:number;density:number;dynamicPressurePa:number;
  gravity:V3;thrust:V3;drag:V3;chuteForce:V3;contactForce:V3;properG:number;heatFluxWm2:number|null;
  chuteFraction:number;drogueFraction:number;mainChuteFraction:number;chuteAreaM2:number;mainFraction:number;serviceAttached:boolean;released:boolean;inspection?:CrewObservation;
  touchdownSpeedMS:number|null;touchdownHorizontalMS:number|null;peakG:number;message:string;events:CrewRecord[];trail:V3[];
  carrierStage:'booster'|'upper'|'none';landingLegsDeployed:boolean;landingTiltDeg:number;lowestPointClearanceM:number;
  touchdownTiltDeg:number|null;touchdownAngularRateDegS:number|null;recoveryReady:boolean;recoveryChecks:{label:string;passed:boolean}[];
  pilot:CrewPilotState;
}
const MU=LAUNCH_EARTH.gmM3S2,R=LAUNCH_EARTH.semiMajorM,G=9.80665;
const v=(a:V3)=>new Vector3(...a),tuple=(a:Vector3)=>a.toArray().map(x=>x===0?0:x) as V3;
const clamp=(a:number,max=1)=>Number.isFinite(a)?Math.max(-max,Math.min(max,a)):0;
const orbitalPhases=new Set<CrewPhase>(['approach','observe','return-ready','deorbit']);
const descentPhases=new Set<CrewPhase>(['return-coast','entry','drogue','main-chute','landing']);
const coastParticle=(p:Particle,t:number,dt:number)=>integrateAscent(p,{dry:1,cdArea:0,noAir:true},t,dt,()=>0);
/** The same projected area drives drag and the two visible canopies. */
export const crewChuteArea=(drogue:number,main:number)=>CREW_VEHICLE.drogueAreaM2*drogue*(1-main)+CREW_VEHICLE.mainChuteAreaM2*main;

export class CrewMission {
  phase:CrewPhase='ground';time=-10;position:V3;velocity:V3;attitude=new Quaternion();angularVelocity=new Vector3();
  serviceFuel:number=CREW_VEHICLE.serviceFuelKg;capsuleRcsFuel:number=CREW_VEHICLE.capsuleRcsFuelKg;landingFuel:number=CREW_VEHICLE.landingFuelKg;
  boosterFuel:number=CREW_VEHICLE.boosterFuelKg;upperFuel:number=CREW_VEHICLE.upperFuelKg;
  target:Particle;automatic=true;fullDemo=true;serviceAttached=true;released=false;
  carrierStage:'booster'|'upper'|'none'='booster';
  inspection?:CrewObservation;touchdownSpeed:number|null=null;touchdownHorizontal:number|null=null;peakG=0;
  touchdownTilt:number|null=null;touchdownAngularRate:number|null=null;
  message='完整任务尚未启动。';events:CrewRecord[]=[];trail:V3[]=[];
  private phaseSince=-10;private aligned=0;private hold=0;private chuteTime:number|null=null;private mainTime:number|null=null;
  private lastTrail=-Infinity;private separationTime=0;private touchdownAt=0;private contactSpeed=0;private contactHeight=2;
  private pilotActive=false;private pilotThrottle=0;private pilotPending:CrewPilotAction|null=null;
  private pilotEngineEnabled=false;private pilotLandingEnabled=false;private pilotUpperIgnitionTime:number|null=null;
  private acceleration=new Vector3();private mainFraction=0;
  private attitudeEffort=new Vector3();
  private attitudeTorque=new Vector3();private passiveTorque=new Vector3();private attitudeSource='发射台约束';
  private forces={gravity:new Vector3(),thrust:new Vector3(),drag:new Vector3(),chuteForce:new Vector3(),contactForce:new Vector3(),density:0,q:0,heat:null as number|null,properG:0};
  constructor(target?:Particle){
    this.position=rotateEarth(add(SITE_FIXED,scale(SITE_UP,70.5)),this.time);this.velocity=airVelocity(this.position);
    this.attitude.setFromUnitVectors(new Vector3(0,0,-1),v(surfaceAt(this.position).up));
    // Target is placed before launch from the nominal mission forecast, never spawned at arrival.
    this.target=target?structuredClone(target):{position:[R+400000,0,0],velocity:[0,Math.sqrt(MU/(R+400000)),0],fuel:0};
    this.refresh();
  }
  private event(label:string,at=this.time){this.events.push({time:at,label,phase:this.phase});}
  private setPhase(phase:CrewPhase,label:string,at=this.time){this.phase=phase;this.phaseSince=at;this.hold=0;this.event(label,at);this.message=label;}
  start(fullDemo=true){if(this.phase!=='ground'||this.pilotActive&&(this.pilotPending!==null||fullDemo))return;this.fullDemo=fullDemo;this.setPhase('countdown','驾驶员确认准备，开始倒计时。');}
  takeOver(){if(!CREW_PILOT_FLIGHT_PHASES.includes(this.phase))return;if(!this.pilotActive&&!['approach','observe'].includes(this.phase))this.enablePilotRoute();this.seedPilotThrottle();this.automatic=false;this.event('驾驶员接管姿态与本阶段可用推进；位置、速度和推进剂保留。');}
  resumeAutomatic(){if(!CREW_PILOT_FLIGHT_PHASES.includes(this.phase))return;this.automatic=true;this.event('恢复飞控辅助，从当前运动状态继续；任务授权路线不改变。');}
  startPilot(){if(this.phase!=='ground')return;this.enablePilotRoute();this.waitForPilot('ignite');}
  enablePilotRoute(){
    if(this.pilotActive)return;
    this.pilotActive=true;this.fullDemo=false;this.seedPilotThrottle();
    this.pilotEngineEnabled=['countdown','ascent','landing'].includes(this.phase)||
      this.phase==='upper'&&this.time-this.separationTime>=3&&this.upperFuel>0||
      this.phase==='insertion'&&!this.meetsCrewOrbit()&&this.upperFuel>0||
      this.phase==='deorbit'&&orbitalElements(this.position,this.velocity).periapsisM>=30000&&this.serviceFuel>0;
    this.pilotLandingEnabled=['landing','touchdown','complete'].includes(this.phase);
    if(this.carrierStage==='upper'&&this.pilotEngineEnabled)this.pilotUpperIgnitionTime=this.separationTime+3;
    this.event('已启用自主任务路线；飞控辅助与任务授权分别控制，自动故事推进关闭。');
    this.updatePilotGate();
  }
  setPilotThrottle(value:number){if(!this.pilotActive||!Number.isFinite(value))return;this.pilotThrottle=Math.max(0,Math.min(1,value));}
  get pilotRouteActive(){return this.pilotActive;}
  get awaitingPilotAction(){return this.pilotPending;}
  private seedPilotThrottle(){
    const rated=this.carrierStage==='booster'?CREW_VEHICLE.boosterThrustN:this.carrierStage==='upper'?CREW_VEHICLE.upperThrustN:this.phase==='deorbit'?CREW_VEHICLE.mainThrustN:this.phase==='landing'?CREW_VEHICLE.landingThrustN:0;
    this.pilotThrottle=rated?Math.max(0,Math.min(1,this.forces.thrust.length()/rated)):0;
  }
  private waitForPilot(action:CrewPilotAction){
    if(!this.pilotActive||this.pilotPending===action)return;
    this.pilotPending=action;this.message=`等待驾驶员：${CREW_PILOT_ACTION_LABELS[action]}。教学模拟时钟暂停，位置、速度和姿态保留。`;this.event(this.message);
  }
  private meetsCrewOrbit(){const e=orbitalElements(this.position,this.velocity);return e.periapsisM>390000&&e.apoapsisM!==null&&e.apoapsisM<418000;}
  private canOpenDrogue(){const h=surfaceAt(this.position).height,speed=norm(add(this.velocity,scale(airVelocity(this.position),-1)));return h<10000&&speed<300&&.5*this.atmosphere(h).density*speed**2<25000;}
  private actionStatus(action:CrewPilotAction):CrewPilotActionStatus{
    const h=surfaceAt(this.position).height;let allowed=false,reason='当前阶段不适用。';
    if(!this.pilotActive)return {action,label:CREW_PILOT_ACTION_LABELS[action],allowed:false,reason:'先启用自主任务路线。'};
    switch(action){
      case 'ignite':allowed=this.phase==='ground';reason=allowed?'检查完成后点火；倒计时期间仍由发射台约束。':'点火授权只适用于地面准备。';break;
      case 'release':allowed=this.phase==='countdown'&&this.time>=-1e-8&&this.forces.thrust.dot(v(surfaceAt(this.position).up))>this.forces.gravity.length();reason=allowed?'倒计时完成且推力大于重量。':'需要完成倒计时并建立足够推力。';break;
      case 'separate-booster':allowed=this.phase==='ascent'&&this.carrierStage==='booster'&&this.boosterFuel<=1e-5;reason=allowed?'一级燃尽且发动机已经关机。':'需要一级燃尽，不能分离正在工作的一级。';break;
      case 'ignite-upper':allowed=this.phase==='upper'&&this.carrierStage==='upper'&&!this.pilotEngineEnabled&&this.upperFuel>0&&this.time-this.separationTime>=3-1e-8;reason=allowed?'一级分离后已无动力滑行 3 秒，二级有推进剂。':this.pilotEngineEnabled?'二级已点火。':'需要一级分离、滑行 3 秒且二级有推进剂。';break;
      case 'separate-ship':allowed=this.phase==='insertion'&&this.carrierStage==='upper'&&this.meetsCrewOrbit()&&!this.pilotEngineEnabled;reason=allowed?'近地点 >390 km、远地点 <418 km，二级已关机。':'需要满足目标轨道并由系统关机后，才能分离飞船。';break;
      case 'begin-deorbit':allowed=this.phase==='return-ready'&&!!this.inspection&&this.serviceAttached&&this.serviceFuel>0;reason=allowed?'观察记录完成，服务舱与推进剂可用。':'需要完成平台观察并保留服务舱和推进剂。';break;
      case 'separate-service':allowed=this.phase==='deorbit'&&this.serviceAttached&&orbitalElements(this.position,this.velocity).periapsisM<30000&&!this.pilotEngineEnabled;reason=allowed?'预测近地点低于 30 km，离轨发动机已关机。':'需要离轨轨道成立并关机，服务舱仍连接。';break;
      case 'open-drogue':allowed=this.phase==='entry'&&this.chuteTime===null&&this.canOpenDrogue();reason=allowed?'高度 <10 km、空气相对速率 <300 m/s、动压 <25 kPa。':'需要再入阶段，且高度 <10 km、空气相对速率 <300 m/s、动压 <25 kPa。';break;
      case 'open-main':allowed=this.phase==='drogue'&&this.mainTime===null&&this.canOpenMain();reason=allowed?'高度 <4 km、空气相对速率 <120 m/s、动压 <10 kPa。':'需要减速伞阶段，且高度 <4 km、空气相对速率 <120 m/s、动压 <10 kPa。';break;
      case 'enable-landing':allowed=this.phase==='main-chute'&&!this.pilotLandingEnabled&&h<120&&this.landingFuel>0;reason=allowed?'高度低于 120 m；授权后下降至 14 m 才启动软着陆。':this.pilotLandingEnabled?'软着陆已授权，14 m 门限触发发动机。':'需要主伞下降、高度 <120 m 且专用推进剂可用。';break;
      case 'recover':allowed=this.phase==='touchdown'&&this.recoveryChecks().every(c=>c.passed);reason=allowed?'实际接地与停稳检查已通过。':this.phase==='touchdown'?this.recoveryChecks().filter(c=>!c.passed).map(c=>c.label).join('；'):'需要实际接地并通过回收检查。';break;
    }
    return {action,label:CREW_PILOT_ACTION_LABELS[action],allowed,reason};
  }
  private pilotActions():CrewPilotActionStatus[]{
    if(!this.pilotActive)return [];
    const actions:Partial<Record<CrewPhase,CrewPilotAction[]>>={ground:['ignite'],countdown:['release'],ascent:['separate-booster'],upper:['ignite-upper'],insertion:['separate-ship'],'return-ready':['begin-deorbit'],deorbit:['separate-service'],entry:['open-drogue'],drogue:['open-main'],'main-chute':['enable-landing'],touchdown:['recover']};
    return (actions[this.phase]??[]).map(a=>this.actionStatus(a));
  }
  private updatePilotGate(){
    if(!this.pilotActive||this.pilotPending||['failed','complete'].includes(this.phase))return;
    let action:CrewPilotAction|null=null;
    if(this.phase==='ground')action='ignite';
    else if(this.phase==='countdown')action='release';
    else if(this.phase==='ascent')action='separate-booster';
    else if(this.phase==='upper')action='ignite-upper';
    else if(this.phase==='insertion')action='separate-ship';
    else if(this.phase==='return-ready')action='begin-deorbit';
    else if(this.phase==='deorbit')action='separate-service';
    else if(this.phase==='entry')action='open-drogue';
    else if(this.phase==='drogue')action='open-main';
    else if(this.phase==='main-chute'&&surfaceAt(this.position).height<14)action='enable-landing';
    else if(this.phase==='touchdown')action='recover';
    if(action&&this.actionStatus(action).allowed)this.waitForPilot(action);
  }
  pilotAction(action:CrewPilotAction){
    if(!CREW_PILOT_ACTIONS.includes(action))return false;
    const status=this.actionStatus(action);if(!status.allowed){this.message=`尚不能${status.label}：${status.reason}`;return false;}
    this.pilotPending=null;
    if(action==='ignite'){this.pilotEngineEnabled=true;this.pilotThrottle=1;this.start(false);}
    else if(action==='release'){
      this.released=true;this.forces.contactForce.set(0,0,0);this.attitudeEffort.set(0,0,0);this.attitudeTorque.set(0,0,0);this.passiveTorque.set(0,0,0);this.attitudeSource='火箭推力矢量制导 · 驾驶员释放约束';this.setPhase('ascent','驾驶员释放发射台约束；沿现有状态开始上升。');
    }else if(action==='separate-booster'){
      this.carrierStage='upper';this.separationTime=this.time;this.pilotEngineEnabled=false;this.pilotThrottle=0;this.setPhase('upper','驾驶员分离燃尽的一级；无动力滑行 3 秒后可授权二级点火。');
    }else if(action==='ignite-upper'){
      this.pilotEngineEnabled=true;this.pilotUpperIgnitionTime=this.time;this.pilotThrottle=1;this.event('驾驶员点火二级，推力在 2 秒内建立。');this.message='二级已授权点火，继续姿态与轨道制导。';
    }else if(action==='separate-ship'){
      this.carrierStage='none';this.pilotThrottle=0;this.setPhase('approach','驾驶员确认轨道并分离飞船；保留位置、速度和姿态，改用服务舱。');this.clearEngineControl('服务舱姿态喷口 · 等待下一步控制');
    }else if(action==='begin-deorbit'){
      this.pilotEngineEnabled=true;this.pilotThrottle=1;this.aligned=0;this.setPhase('deorbit','驾驶员授权离轨点火；辅助模式先转向逆速度方向，手动模式沿实际船头推力。');
    }else if(action==='separate-service'){
      this.serviceAttached=false;this.pilotThrottle=0;this.setPhase('return-coast','驾驶员分离服务舱；返回舱使用自身姿态喷口准备再入。');this.clearEngineControl('返回舱独立姿态喷口');
    }else if(action==='open-drogue'){
      this.chuteTime=this.time;this.setPhase('drogue','驾驶员展开减速伞，拉力在 4 秒内逐渐建立。');
    }else if(action==='open-main')this.mainChute();
    else if(action==='enable-landing'){
      this.pilotLandingEnabled=true;this.event('驾驶员授权近地软着陆，下降至 14 m 触发专用发动机。');this.message='软着陆推进已授权；辅助模式自动调节推力，接管后由驾驶员调节油门。';
    }else if(action==='recover')this.recover();
    this.refresh();return true;
  }
  private clearEngineControl(source:string){this.mainFraction=0;this.forces.thrust.set(0,0,0);this.attitudeEffort.set(0,0,0);this.attitudeTorque.set(0,0,0);this.passiveTorque.set(0,0,0);this.attitudeSource=source;}
  returnHome(at=this.time){if(this.pilotActive)return this.pilotAction('begin-deorbit');if(this.phase!=='return-ready')return;this.automatic=true;this.aligned=0;this.setPhase('deorbit','已授权返回：逐渐转向并用飞船自己的推进剂离轨。',at);}
  mainChute(){if(this.phase!=='drogue'||!this.canOpenMain())return false;this.mainTime=this.time;this.setPhase('main-chute','主伞开始展开，拉力在 4 秒内逐渐建立。');return true;}
  private recoveryChecks(at=this.time){
    const local=surfaceAt(this.position),normal=v(local.up),tilt=new Vector3(0,0,-1).applyQuaternion(this.attitude).angleTo(normal)*180/Math.PI;
    const contact=crewContactFrame(this.position,this.attitude,true,crewSupportedFeet(local.height,this.attitude,normal,true));
    return [
      {label:'已生成平台观察记录',passed:!!this.inspection},
      {label:'接地速度与姿态在教学范围内',passed:this.touchdownSpeed!==null&&this.touchdownSpeed<=CREW_CONTACT_LIMITS.verticalMS&&this.touchdownHorizontal!==null&&this.touchdownHorizontal<=CREW_CONTACT_LIMITS.horizontalMS&&this.touchdownTilt!==null&&this.touchdownTilt<=CREW_CONTACT_LIMITS.tiltDeg&&this.touchdownAngularRate!==null&&this.touchdownAngularRate<=CREW_CONTACT_LIMITS.angularRateDegS},
      {label:'服务舱已分离且支脚已展开',passed:!this.serviceAttached&&this.mainTime!==null&&this.time-this.mainTime>.8},
      {label:'支脚仍在地面承载，舱体没有触地',passed:['touchdown','complete'].includes(this.phase)&&Math.abs(contact.footClearanceM)<.001&&contact.hullClearanceM>0&&local.height>0},
      {label:'缓冲后已停稳，倾角与角速率合格',passed:tilt<=CREW_CONTACT_LIMITS.stableTiltDeg&&this.angularVelocity.length()<=CREW_CONTACT_LIMITS.stableRateRadS&&norm(add(this.velocity,scale(airVelocity(this.position),-1)))<=CREW_CONTACT_LIMITS.stableSpeedMS},
      {label:'接地检查已持续至少 3 秒',passed:['touchdown','complete'].includes(this.phase)&&at-this.touchdownAt>=CREW_CONTACT_LIMITS.inspectionSeconds},
    ];
  }
  recover(at=this.time){
    if(this.phase!=='touchdown')return false;
    const missing=this.recoveryChecks(at).filter(c=>!c.passed);
    if(missing.length){this.message=`尚不能回收：${missing.map(c=>c.label).join('；')}。`;return false;}
    this.setPhase('complete','教学流程与接地检查通过，已发送回收信号；未验证实飞热防护、结构与乘员健康。',at);return true;
  }
  get mass(){
    const c=CREW_VEHICLE,ship=c.capsuleDryKg+this.capsuleRcsFuel+this.landingFuel+(this.serviceAttached?c.serviceDryKg+this.serviceFuel:0);
    return this.carrierStage==='booster'?ship+c.boosterDryKg+this.boosterFuel+c.upperDryKg+this.upperFuel:
      this.carrierStage==='upper'?ship+c.upperDryKg+this.upperFuel:ship;
  }
  private fail(reason:string,at=this.time){this.setPhase('failed',reason,at);}
  private atmosphere(h:number){return reentryAtmosphere(Math.max(0,Math.min(1000000,h)));}
  private refresh(){
    const local=surfaceAt(this.position),relative=v(this.velocity).sub(v(airVelocity(this.position))),airSpeed=relative.length(),atmo=this.atmosphere(local.height);
    this.forces.density=atmo.density;this.forces.q=.5*atmo.density*airSpeed**2;
    this.forces.gravity.copy(v(this.position)).multiplyScalar(-MU*this.mass/norm(this.position)**3);
    if(this.phase==='ground')this.forces.contactForce.copy(this.forces.gravity).negate();
    this.forces.heat=descentPhases.has(this.phase)&&local.height<80000&&airSpeed>1500?stagnationHeatFlux(atmo.density,airSpeed,2):null;
    this.forces.properG=this.forces.thrust.clone().add(this.forces.drag).add(this.forces.chuteForce).add(this.forces.contactForce).length()/this.mass/G;
    if(!['ground','countdown'].includes(this.phase))this.peakG=Math.max(this.peakG,this.forces.properG);
  }
  private orient(direction:Vector3,dt:number,input?:CrewControls,mode:'carrier'|'service'|'capsule'='service',spring=0,authority=1){
    const rig=CREW_ATTITUDE[mode],budget=mode==='carrier'?Infinity:mode==='service'?this.serviceFuel:this.capsuleRcsFuel;
    const manual=input?new Vector3(clamp(input.pitch),clamp(input.yaw),clamp(input.roll)).clampLength(0,1).multiplyScalar(rig.maxRateRadS):undefined;
    const control=advanceCrewAttitude(this.attitude,this.angularVelocity,direction,dt,rig,budget,spring,manual,authority);
    if(mode==='service')this.serviceFuel=Math.max(0,this.serviceFuel-control.fuelUsedKg);
    if(mode==='capsule')this.capsuleRcsFuel=Math.max(0,this.capsuleRcsFuel-control.fuelUsedKg);
    this.attitudeEffort.copy(control.effort);this.attitudeTorque.copy(control.torque);this.passiveTorque.copy(control.passiveTorque);
    this.attitudeSource=mode==='carrier'?authority>0?'火箭推力矢量制导 · 随实际推力建立':'发动机关机滑行 · 保留角速度，无主动控制力矩':mode==='service'?'服务舱姿态喷口':spring>100?this.chuteTime!==null?'返回舱喷口＋伞吊挂恢复力矩':'返回舱喷口＋气动恢复力矩':'返回舱独立姿态喷口';
  }
  private integrateService(acceleration:Vector3,dt:number){
    const force=acceleration.clone().multiplyScalar(this.mass),requested=force.length()/CREW_VEHICLE.serviceIspS/G*dt;
    const fraction=requested>0?Math.min(1,this.serviceFuel/requested):1;const fuel=this.serviceFuel;
    this.forces.thrust.copy(force).multiplyScalar(fraction);this.acceleration.copy(acceleration).multiplyScalar(fraction);
    const model:AscentModel={dry:this.mass-fuel,cdArea:0,noAir:true,
      motor:{flow:force.length()/CREW_VEHICLE.serviceIspS/G,sea:CREW_VEHICLE.serviceIspS,vacuum:CREW_VEHICLE.serviceIspS},
      steer:()=>({direction:tuple(force.clone().normalize()),pitchDeg:0})};
    // Split exact fuel depletion; no fuel-negative RK stage or instantaneous velocity change.
    const burn=requested>0?Math.min(dt,dt*fraction):dt;
    let p=integrateAscent({position:this.position,velocity:this.velocity,fuel},model,this.time,burn,()=>1);
    if(burn<dt)p=coastParticle(p,this.time+burn,dt-burn);
    this.position=p.position;this.velocity=p.velocity;this.serviceFuel=p.fuel;
  }
  private launch(dt:number,input:CrewControls){
    const c=CREW_VEHICLE,first=this.phase==='ascent',fuel=first?this.boosterFuel:this.upperFuel;
    const thrust=first?c.boosterThrustN:c.upperThrustN,isp=first?c.boosterIspS:c.upperIspS,flow=thrust/(first?285:isp)/G;
    const dry=this.mass-fuel;
    const before={position:this.position,velocity:this.velocity,fuel},beforeQ=this.attitude.clone(),beforeW=this.angularVelocity.clone();
    const local=surfaceAt(this.position),atmo=this.atmosphere(local.height),rel=v(this.velocity).sub(v(airVelocity(this.position)));
    const desired=this.phase==='insertion'?orbitGuidance(before,dry,thrust):guidance(this.position,this.time);
    const autoThrottle='throttle' in desired?Number(desired.throttle):first?1:Math.max(0,Math.min(1,(this.pilotActive?this.time-(this.pilotUpperIgnitionTime??this.time):this.time-this.separationTime-3)/2));
    const ramp=!first&&this.pilotActive?Math.max(0,Math.min(1,(this.time-(this.pilotUpperIgnitionTime??this.time))/2)):1;
    const throttle=this.pilotActive?this.pilotEngineEnabled?(this.automatic?autoThrottle:this.pilotThrottle*ramp):0:autoThrottle;
    const burn=throttle>0?Math.min(dt,fuel/(flow*throttle)):0;
    const ambientIsp=(first?285:300)+(isp-(first?285:300))*(1-atmo.pressurePa/101325);
    if(burn>0)this.orient(v(desired.direction),burn,this.pilotActive&&!this.automatic?input:undefined,'carrier',0,throttle*ambientIsp/isp);
    if(burn<dt){
      const torque=this.attitudeTorque.clone(),effort=this.attitudeEffort.clone();
      this.orient(v(desired.direction),dt-burn,undefined,'carrier',0,0);
      this.attitudeTorque.copy(torque).multiplyScalar(burn/dt);this.attitudeEffort.copy(effort).multiplyScalar(burn/dt);
    }
    const forward=new Vector3(0,0,-1).applyQuaternion(this.attitude);
    const model:AscentModel={dry,cdArea:7,atmosphere:h=>this.atmosphere(h),motor:{flow,sea:first?285:300,vacuum:isp},
      steer:()=>({direction:tuple(forward),pitchDeg:desired.pitchDeg}),
      throttle:()=>throttle};
    const steer=model.steer!(before,this.time);
    this.forces.thrust.copy(v(steer.direction)).multiplyScalar(flow*G*throttle*(burn/dt)*(model.motor!.sea+(isp-model.motor!.sea)*(1-atmo.pressurePa/101325)));
    this.forces.drag.copy(rel).multiplyScalar(-.5*atmo.density*7*rel.length());
    let next=burn>0?integrateAscent(before,model,this.time,burn,()=>throttle):before;
    if(burn<dt)next=integrateAscent(next,{...model,motor:undefined},this.time+burn,dt-burn,()=>0);
    let elapsed=dt,groundContact=false;
    const endQ=this.attitude.clone(),endW=this.angularVelocity.clone();
    const poseAt=(seconds:number)=>({q:beforeQ.clone().slerp(endQ,seconds/dt),w:beforeW.clone().lerp(endW,seconds/dt)});
    const stage=this.carrierStage==='booster'?'booster':'upper';
    const contactAt=(p:Particle,seconds:number)=>crewCarrierContactFrame(p.position,poseAt(seconds).q,stage);
    if(this.pilotActive&&this.released&&surfaceAt(next.position).height<64&&contactAt(next,dt).clearanceM<=0){
      const propagate=(seconds:number)=>{
        const powered=Math.min(seconds,burn);let p=powered>0?integrateAscent(before,model,this.time,powered,()=>throttle):before;
        if(powered<seconds)p=integrateAscent(p,{...model,motor:undefined},this.time+powered,seconds-powered,()=>0);return p;
      };
      let lo=0,hi=dt;if(contactAt(before,0).clearanceM<=0)hi=0;
      else for(let i=0;i<25;i++){const mid=(lo+hi)/2;if(contactAt(propagate(mid),mid).clearanceM>0)lo=mid;else hi=mid;}
      elapsed=hi;next=propagate(hi);groundContact=true;
      const pose=poseAt(hi);this.attitude.copy(pose.q);this.angularVelocity.copy(pose.w);
    }
    this.position=next.position;this.velocity=next.velocity;
    if(first)this.boosterFuel=next.fuel;else this.upperFuel=next.fuel;
    if(groundContact){this.fail('组合载具实体包络触及零海拔教学地表，保留接触时速度与姿态；未计算台架、塔架碰撞或逃逸系统。',this.time+elapsed);return elapsed;}
    if(first&&this.boosterFuel<1e-5){
      this.boosterFuel=0;
      if(this.pilotActive)this.pilotEngineEnabled=false;
      else{this.carrierStage='upper';this.separationTime=this.time+dt;this.setPhase('upper','一级燃尽分离；保留位置、速度与角速度，3 秒后建立二级推力。',this.time+dt);}
      this.forces.thrust.set(0,0,0);this.attitudeTorque.set(0,0,0);this.attitudeEffort.set(0,0,0);this.attitudeSource='发动机关机滑行 · 保留角速度，无主动控制力矩';
    }
    else if(this.phase==='upper'&&this.time-this.separationTime>30&&(!this.pilotActive||this.pilotEngineEnabled))this.setPhase('insertion','二级进入轨道制导，检查近、远地点。',this.time+dt);
    else if(this.phase==='insertion'){
      const e=orbitalElements(this.position,this.velocity);
      if(e.periapsisM>390000&&e.apoapsisM!==null&&e.apoapsisM<418000){
        if(this.pilotActive)this.pilotEngineEnabled=false;
        else{this.carrierStage='none';this.setPhase('approach','二级关机与飞船分离；飞船状态连续，使用独立服务舱推进剂。',this.time+dt);}
        this.forces.thrust.set(0,0,0);
        this.attitudeTorque.set(0,0,0);this.attitudeEffort.set(0,0,0);this.passiveTorque.set(0,0,0);this.attitudeSource='服务舱姿态喷口 · 等待下一步控制';
      }else if(this.upperFuel<1e-5||this.time>1800)this.fail('二级预算不足或入轨超时，未生成在轨任务。',this.time+dt);
    }
    return elapsed;
  }
  private canOpenMain(){const h=surfaceAt(this.position).height,speed=norm(add(this.velocity,scale(airVelocity(this.position),-1)));return h<4000&&speed<120&&.5*this.atmosphere(h).density*speed**2<10000;}
  observe(at=this.time){
    if(this.phase!=='observe')return false;
    const s=this.snapshot();if(!crewObservationReady(s))return false;
    this.inspection={time:at,distanceM:s.distanceM,relativeSpeedMS:s.relativeSpeedMS,pointingDeg:s.pointingDeg,parts:['舱段','太阳能翼','通信天线']};
    this.setPhase('return-ready','结构观察记录已生成；这是模型观察，不是实物检修或真实遥感成像。',at);this.updatePilotGate();return true;
  }
  private flight(dt:number,input:CrewControls,nextTarget:Particle){
    const relative=v(this.target.position).sub(v(this.position)),rv=v(this.velocity).sub(v(this.target.velocity));
    let force=new Vector3();this.mainFraction=0;
    if(this.phase==='deorbit'){
      const direction=v(this.velocity).negate().normalize();this.orient(direction,dt,this.pilotActive&&!this.automatic?input:undefined);
      const forward=new Vector3(0,0,-1).applyQuaternion(this.attitude);
      if(forward.angleTo(direction)<.025&&this.angularVelocity.length()<.015)this.aligned+=dt;else this.aligned=0;
      const burnAllowed=this.pilotActive?this.pilotEngineEnabled&&(!this.automatic||this.aligned>.5):this.aligned>.5;
      if(burnAllowed){
        const throttle=this.pilotActive&&!this.automatic?this.pilotThrottle:1;
        force.copy(forward).multiplyScalar(CREW_VEHICLE.mainThrustN/this.mass*throttle);this.mainFraction=throttle;
      }
    }else if(this.automatic){
      const tangent=v(this.target.velocity).normalize(),goal=v(this.target.position).addScaledVector(tangent,-60);
      force.copy(goal).sub(v(this.position)).multiplyScalar(.0016).addScaledVector(rv,-.08);
      // Compensate differential gravity, retaining both bodies' actual gravity in the solver.
      const tg=v(this.target.position).multiplyScalar(-MU/norm(this.target.position)**3),sg=v(this.position).multiplyScalar(-MU/norm(this.position)**3);
      force.add(tg.sub(sg)).clampLength(0,CREW_VEHICLE.rcsThrustN/this.mass);this.orient(relative,dt);
    }else{
      this.orient(relative,dt,input);
      force.set(0,0,-clamp(input.thrust)).applyQuaternion(this.attitude).multiplyScalar(CREW_VEHICLE.rcsThrustN/this.mass);
      if(input.brake)force.copy(rv).multiplyScalar(-1/dt).clampLength(0,CREW_VEHICLE.rcsThrustN/this.mass);
    }
    this.integrateService(force,dt);
    this.target=nextTarget;
    const distance=norm(add(this.target.position,scale(this.position,-1))),speed=norm(add(this.velocity,scale(this.target.velocity,-1)));
    if(distance<20){this.fail('进入平台保守接触边界，任务暂停；没有模拟撞毁。',this.time+dt);return;}
    if(this.serviceFuel<=0&&this.phase==='deorbit'){this.fail('服务舱推进剂耗尽，尚未满足再入轨道条件。',this.time+dt);return;}
    if(this.phase==='approach'){
      this.hold=distance>35&&distance<80&&speed<.15?this.hold+dt:0;
      if(this.hold>5)this.setPhase('observe','已相对平台停稳，开始外部观察；仍共同绕地。',this.time+dt);
    }else if(this.phase==='observe'&&this.fullDemo&&this.time-this.phaseSince>12)this.observe(this.time+dt);
    else if(this.phase==='return-ready'&&this.fullDemo&&this.time-this.phaseSince>8)this.returnHome(this.time+dt);
    else if(this.phase==='deorbit'&&orbitalElements(this.position,this.velocity).periapsisM<30000){
      if(this.pilotActive){this.pilotEngineEnabled=false;this.clearEngineControl('离轨发动机关机 · 等待驾驶员分离服务舱');}
      else{
      this.serviceAttached=false;this.mainFraction=0;this.forces.thrust.set(0,0,0);
      this.attitudeSource='返回舱独立姿态喷口';this.attitudeEffort.set(0,0,0);this.attitudeTorque.set(0,0,0);this.passiveTorque.set(0,0,0);
      this.setPhase('return-coast','离轨点火完成，分离服务舱；保留姿态和角速度，用返回舱自身喷口准备再入。',this.time+dt);
      }
    }
  }
  private descent(dt:number,input:CrewControls){
    const h=surfaceAt(this.position).height,rel=v(this.velocity).sub(v(airVelocity(this.position))),airSpeed=rel.length(),atmo=this.atmosphere(h);
    if(this.phase==='return-coast'&&h<=120000&&rel.dot(v(surfaceAt(this.position).up))<0)this.setPhase('entry','下降越过 120 km 教学阶段界线；空气密度连续增加，继续检查热盾迎风与受热。');
    if(!this.pilotActive&&this.phase==='entry'&&h<10000&&airSpeed<300&&.5*atmo.density*airSpeed**2<25000){this.chuteTime=this.time;this.setPhase('drogue','开伞条件满足，减速伞开始逐渐展开。');}
    if(this.phase==='drogue'&&this.fullDemo&&this.canOpenMain())this.mainChute();
    if(this.phase==='main-chute'&&h<14&&(!this.pilotActive||this.pilotLandingEnabled)){
      this.setPhase('landing','进入近地软着陆，启用独立发动机与接地缓冲。');
      if(this.pilotActive){this.pilotEngineEnabled=true;const desired=-Math.max(1.2,Math.sqrt(Math.max(0,h-2)));this.pilotThrottle=Math.max(0,Math.min(1,this.mass*(MU/norm(this.position)**2+(desired-rel.dot(v(surfaceAt(this.position).up)))*2)/CREW_VEHICLE.landingThrustN));}
    }
    const chute=this.chuteTime===null?0:Math.min(1,(this.time-this.chuteTime)/4),main=this.mainTime===null?0:Math.min(1,(this.time-this.mainTime)/4);
    const cdChute=1.5*crewChuteArea(chute,main);
    const up=v(surfaceAt(this.position).up),vertical=rel.dot(up);
    const nose=rel.clone().negate().normalize();
    // Canopy suspension increasingly presents the fore attachment upward; prepare landing
    // before ignition instead of rotating the capsule instantly at the 14 m threshold.
    if(this.mainTime!==null&&h<120)nose.lerp(up,Math.max(0,Math.min(1,(120-h)/80))).normalize();
    const passiveSpring=this.chuteTime!==null?Math.min(6000,.5*atmo.density*cdChute*airSpeed**2*2):Math.min(6000,this.forces.q*3);
    const beforeQ=this.attitude.clone(),beforeW=this.angularVelocity.clone(),beforeRcs=this.capsuleRcsFuel;
    this.orient(nose,dt,this.pilotActive&&!this.automatic?input:undefined,'capsule',passiveSpring);
    const engineDirection=new Vector3(0,0,-1).applyQuaternion(this.attitude),alignment=engineDirection.dot(up);
    let thrust=0;
    if(this.phase==='landing'&&this.landingFuel>0&&(!this.pilotActive||this.pilotEngineEnabled)&&(this.pilotActive&&!this.automatic||alignment>.98)){
      const desired=-Math.max(1.2,Math.sqrt(Math.max(0,h-2))*1.0);
      thrust=this.pilotActive&&!this.automatic?CREW_VEHICLE.landingThrustN*this.pilotThrottle:Math.max(0,Math.min(CREW_VEHICLE.landingThrustN,this.mass*(MU/norm(this.position)**2+(desired-vertical)*2)/alignment));
    }
    this.forces.drag.copy(rel).multiplyScalar(-.5*atmo.density*CREW_VEHICLE.capsuleCdAreaM2*airSpeed);
    this.forces.chuteForce.copy(rel).multiplyScalar(-.5*atmo.density*cdChute*airSpeed);
    const flow=thrust/CREW_VEHICLE.landingIspS/G,burn=flow>0?Math.min(dt,this.landingFuel/flow):dt;
    this.forces.thrust.copy(engineDirection).multiplyScalar(thrust*burn/dt);
    const particle={position:this.position,velocity:this.velocity,fuel:this.landingFuel};
    const model:AscentModel={dry:this.mass-this.landingFuel,cdArea:CREW_VEHICLE.capsuleCdAreaM2+cdChute,atmosphere:x=>this.atmosphere(x),
      ...(thrust>0?{motor:{flow,sea:CREW_VEHICLE.landingIspS,vacuum:CREW_VEHICLE.landingIspS},steer:()=>({direction:tuple(engineDirection),pitchDeg:90})}:{})};
    const propagate=(seconds:number)=>{
      const powered=Math.min(seconds,burn);let p=powered>0?integrateAscent(particle,model,this.time,powered,()=>1):particle;
      if(powered<seconds)p=integrateAscent(p,{...model,motor:undefined},this.time+powered,seconds-powered,()=>0);return p;
    };
    const poseAt=(seconds:number)=>{
      const w=beforeW.clone().addScaledVector(this.attitudeTorque,seconds/CREW_ATTITUDE.capsule.inertiaKgM2);
      const rotation=beforeW.clone().add(w).multiplyScalar(seconds/2),q=beforeQ.clone();
      if(rotation.lengthSq()>1e-16)q.multiply(new Quaternion().setFromAxisAngle(rotation.clone().normalize(),rotation.length())).normalize();return {q,w};
    };
    const contactAt=(p:Particle,seconds:number)=>crewContactFrame(p.position,poseAt(seconds).q,crewLegsDeployed(surfaceAt(p.position).height,main));
    let elapsed=dt,next=propagate(dt);
    if(contactAt(next,dt).clearanceM<=0){
      // First foot corner or hull contact. Stop this step at that same event time;
      // never integrate beyond contact and label the earlier state with a later clock.
      let lo=0,hi=dt;
      if(contactAt(particle,0).clearanceM<=0)hi=0;
      else for(let i=0;i<25;i++){const mid=(lo+hi)/2;if(contactAt(propagate(mid),mid).clearanceM>0)lo=mid;else hi=mid;}
      elapsed=hi;next=propagate(hi);const pose=poseAt(hi);this.attitude.copy(pose.q);this.angularVelocity.copy(pose.w);
      this.capsuleRcsFuel=beforeRcs-(beforeRcs-this.capsuleRcsFuel)*hi/dt;
      const frame=contactAt(next,hi),offset=frame.lowestBodyPoint.clone().applyQuaternion(this.attitude);
      const pointVelocity=v(next.velocity).add(this.angularVelocity.clone().applyQuaternion(this.attitude).cross(offset));
      const groundRelative=pointVelocity.sub(v(airVelocity(tuple(v(next.position).add(offset))))),normal=frame.up;
      this.touchdownSpeed=Math.max(0,-groundRelative.dot(normal));this.touchdownHorizontal=groundRelative.clone().addScaledVector(normal,-groundRelative.dot(normal)).length();
      this.touchdownTilt=frame.tiltDeg;this.touchdownAngularRate=this.angularVelocity.length()*180/Math.PI;
      this.contactSpeed=Math.max(0,-v(next.velocity).sub(v(airVelocity(next.position))).dot(normal));this.touchdownAt=this.time+hi;this.contactHeight=surfaceAt(next.position).height;
      const reasons:string[]=[];
      if(!crewLegsDeployed(this.contactHeight,main))reasons.push('支脚未展开');
      if(frame.hullClearanceM<=1e-5)reasons.push('舱体或外部硬件先触地');
      if(this.touchdownTilt>CREW_CONTACT_LIMITS.tiltDeg)reasons.push(`倾角 ${this.touchdownTilt.toFixed(1)}° 超过 15°`);
      if(this.touchdownAngularRate>CREW_CONTACT_LIMITS.angularRateDegS)reasons.push('接地角速率超过 5°/s');
      if(this.touchdownSpeed>CREW_CONTACT_LIMITS.verticalMS||this.touchdownHorizontal>CREW_CONTACT_LIMITS.horizontalMS)reasons.push('接地点速度超出教学范围');
      if(reasons.length)this.fail(`接地检查未通过：${reasons.join('；')}。保留触地状态，未判定安全着陆。`,this.touchdownAt);
      else this.setPhase('touchdown','支脚首次接地，缓冲机构吸收剩余动能；稳定与任务检查通过后才能回收。',this.touchdownAt);
    }
    this.position=next.position;this.velocity=next.velocity;this.landingFuel=next.fuel;
    if(this.phase==='touchdown'){
      // Contact switches to the support/compression model. Do not publish a stopped landing jet
      // or the released parachute as an active force for one extra displayed snapshot.
      this.forces.thrust.set(0,0,0);this.forces.drag.set(0,0,0);this.forces.chuteForce.set(0,0,0);
      if(this.pilotActive)this.pilotEngineEnabled=false;
      this.forces.contactForce.copy(v(surfaceAt(this.position).up)).multiplyScalar(this.mass*(MU/norm(this.position)**2+this.contactSpeed/.8));
      this.attitudeEffort.set(0,0,0);this.attitudeTorque.set(0,0,0);this.passiveTorque.set(0,0,0);this.attitudeSource='支脚接地 · 开始缓冲与支撑';
    }
    return elapsed;
  }
  step(dt=.1,input: CrewControls=crewIdle()){
    if(!Number.isFinite(dt)||dt<=0||dt>.1||['ground','complete','failed'].includes(this.phase))return;
    this.updatePilotGate();if(this.pilotPending)return;
    if(this.pilotActive&&!this.automatic&&CREW_PILOT_THROTTLE_PHASES.includes(this.phase))this.setPilotThrottle(this.pilotThrottle+clamp(input.thrust)*.2*dt);
    this.forces.thrust.set(0,0,0);this.forces.drag.set(0,0,0);this.forces.chuteForce.set(0,0,0);this.forces.contactForce.set(0,0,0);this.attitudeEffort.set(0,0,0);this.attitudeTorque.set(0,0,0);this.passiveTorque.set(0,0,0);
    let elapsed=dt;const nextTarget=coastParticle(this.target,this.time,dt);
    if(this.phase==='countdown'){
      const throttle=Math.max(0,Math.min(1,(this.time+dt/2+3)/2));this.boosterFuel=Math.max(0,this.boosterFuel-throttle*CREW_VEHICLE.boosterThrustN/(285*G)*dt);
      this.position=add(this.position,scale(airVelocity(this.position),dt));this.velocity=airVelocity(this.position);
      this.orient(v(surfaceAt(this.position).up),dt,undefined,'carrier');this.attitudeSource='发射台约束与点火建压';
      this.forces.thrust.copy(v(surfaceAt(this.position).up)).multiplyScalar(throttle*CREW_VEHICLE.boosterThrustN);
      this.forces.contactForce.copy(this.forces.gravity).add(this.forces.thrust).negate();
      if(!this.pilotActive&&this.time+dt>=0){this.released=true;this.forces.contactForce.set(0,0,0);this.attitudeEffort.set(0,0,0);this.attitudeTorque.set(0,0,0);this.passiveTorque.set(0,0,0);this.attitudeSource='火箭推力矢量制导 · 约束已释放，等待下一步控制';this.setPhase('ascent','约束释放，开始计算上升。',this.time+dt);}
    }else if(['ascent','upper','insertion'].includes(this.phase))elapsed=this.launch(dt,input);
    else if(orbitalPhases.has(this.phase))this.flight(dt,input,nextTarget);
    else if(descentPhases.has(this.phase))elapsed=this.descent(dt,input);
    else if(this.phase==='touchdown'){
      const t=Math.max(0,this.time+dt-this.touchdownAt),duration=.8,vertical=-this.contactSpeed*Math.max(0,1-t/duration);
      const normal=v(surfaceAt(this.position).up),ground=v(airVelocity(this.position));
      const previous=v(this.velocity),relative=previous.clone().sub(ground),horizontal=relative.addScaledVector(normal,-relative.dot(normal)).multiplyScalar(Math.exp(-8*dt));
      this.velocity=tuple(ground.add(horizontal).addScaledVector(normal,vertical));this.position=add(this.position,scale(this.velocity,dt));
      this.forces.contactForce.copy(v(this.velocity).sub(previous).divideScalar(dt)).addScaledVector(normal,MU/norm(this.position)**2).multiplyScalar(this.mass);
      // Compression remains after contact; no upward position jump to the undeformed height.
      const current=surfaceAt(this.position),tau=Math.min(t,duration),height=this.contactHeight-this.contactSpeed*(tau-tau*tau/(2*duration));
      this.position=add(this.position,scale(current.up,height-current.height));
      this.orient(v(surfaceAt(this.position).up),dt,undefined,'capsule',6000,0);this.attitudeSource='地面支撑与缓冲恢复力矩 · 姿态喷口关闭';
      const contact=crewContactFrame(this.position,this.attitude,true,crewSupportedFeet(surfaceAt(this.position).height,this.attitude,v(surfaceAt(this.position).up),true));
      if(contact.tiltDeg>CREW_CONTACT_LIMITS.tiltDeg||contact.clearanceM<-.001)this.fail('接地后支撑姿态超出教学范围，停止回收判定。',this.time+dt);
      else if(this.fullDemo&&t>6)this.recover(this.time+dt);
    }
    this.target=elapsed===dt?nextTarget:coastParticle(this.target,this.time,elapsed);this.time+=elapsed;this.refresh();
    if(this.time-this.lastTrail>2){this.trail.push([...this.position]);if(this.trail.length>3000)this.trail.shift();this.lastTrail=this.time;}
    if(!Number.isFinite(norm(this.position))||!Number.isFinite(norm(this.velocity)))this.fail('数值状态无效，计算停止。');
    if(this.time>24000&&!['complete','failed','touchdown'].includes(this.phase))this.fail('任务超过教学时限，保留当前记录。');
    this.updatePilotGate();
  }
  snapshot():CrewSnapshot{
    const local=surfaceAt(this.position),groundRelative=add(this.velocity,scale(airVelocity(this.position),-1)),offset=v(this.target.position).sub(v(this.position));
    const forward=new Vector3(0,0,-1).applyQuaternion(this.attitude);
    const drogue=this.chuteTime===null?0:Math.min(1,Math.max(0,(this.time-this.chuteTime)/4)),main=this.mainTime===null?0:Math.min(1,Math.max(0,(this.time-this.mainTime)/4));
    const deployed=crewLegsDeployed(local.height,main),contact=crewContactFrame(this.position,this.attitude,deployed,crewSupportedFeet(local.height,this.attitude,v(local.up),['touchdown','complete'].includes(this.phase)));
    const carrierContact=this.carrierStage==='none'?null:crewCarrierContactFrame(this.position,this.attitude,this.carrierStage);
    const recoveryChecks=this.recoveryChecks();
    return {phase:this.phase,time:this.time,position:[...this.position],velocity:[...this.velocity],attitude:this.attitude.toArray(),angularVelocity:tuple(this.angularVelocity),attitudeEffort:tuple(this.attitudeEffort),
      targetPosition:[...this.target.position],targetVelocity:[...this.target.velocity],massKg:this.mass,serviceFuelKg:this.serviceFuel,capsuleRcsFuelKg:this.capsuleRcsFuel,landingFuelKg:this.landingFuel,launchFuelKg:this.boosterFuel+this.upperFuel,
      attitudeTorqueNm:tuple(this.attitudeTorque),passiveTorqueNm:tuple(this.passiveTorque),attitudeSource:this.attitudeSource,
      automatic:this.automatic,fullDemo:this.fullDemo,altitudeM:local.height,groundSpeedMS:norm(groundRelative),verticalMS:dot(groundRelative,local.up),orbitalSpeedMS:norm(this.velocity),
      distanceM:offset.length(),relativeSpeedMS:norm(add(this.velocity,scale(this.target.velocity,-1))),pointingDeg:forward.angleTo(offset)*180/Math.PI,
      density:this.forces.density,dynamicPressurePa:this.forces.q,gravity:tuple(this.forces.gravity),thrust:tuple(this.forces.thrust),drag:tuple(this.forces.drag),chuteForce:tuple(this.forces.chuteForce),contactForce:tuple(this.forces.contactForce),properG:this.forces.properG,heatFluxWm2:this.forces.heat,
      chuteFraction:this.mainTime!==null?main:drogue,drogueFraction:drogue,mainChuteFraction:main,chuteAreaM2:crewChuteArea(drogue,main),
      mainFraction:this.mainFraction,serviceAttached:this.serviceAttached,released:this.released,inspection:this.inspection?structuredClone(this.inspection):undefined,
      touchdownSpeedMS:this.touchdownSpeed,touchdownHorizontalMS:this.touchdownHorizontal,peakG:this.peakG,message:this.message,events:this.events.map(e=>({...e})),trail:this.trail.map(p=>[...p]),
      carrierStage:this.carrierStage,landingLegsDeployed:deployed,landingTiltDeg:contact.tiltDeg,lowestPointClearanceM:carrierContact?.clearanceM??contact.clearanceM,
      touchdownTiltDeg:this.touchdownTilt,touchdownAngularRateDegS:this.touchdownAngularRate,recoveryChecks,recoveryReady:this.phase==='touchdown'&&recoveryChecks.every(c=>c.passed),
      pilot:{active:this.pilotActive,throttle:this.pilotThrottle,pendingAction:this.pilotPending,engineLit:this.forces.thrust.length()>1,engineEnabled:this.pilotEngineEnabled,actions:this.pilotActions()},};
  }
  save(){return {schema:1,vehicleVersion:CREW_VEHICLE.version,state:this.snapshot(),integration:{
    boosterFuel:this.boosterFuel,upperFuel:this.upperFuel,phaseSince:this.phaseSince,aligned:this.aligned,hold:this.hold,
    chuteTime:this.chuteTime,mainTime:this.mainTime,lastTrail:this.lastTrail===-Infinity?-10:this.lastTrail,separationTime:this.separationTime,
    touchdownAt:this.touchdownAt,contactSpeed:this.contactSpeed,contactHeight:this.contactHeight,
    pilot:{engineEnabled:this.pilotEngineEnabled,landingEnabled:this.pilotLandingEnabled,upperIgnitionTime:this.pilotUpperIgnitionTime}}};}
  static restore(value:unknown){
    const data=value as ReturnType<CrewMission['save']>;
    if(!data||data.schema!==1||data.vehicleVersion!==CREW_VEHICLE.version||!data.state||!data.integration)throw Error('载人任务存档版本不兼容。');
    const s=data.state,b=data.integration;
    const number=(x:unknown,lo:number,hi:number)=>typeof x==='number'&&Number.isFinite(x)&&x>=lo&&x<=hi;
    const array=(x:unknown,len:number,max:number)=>Array.isArray(x)&&x.length===len&&x.every(n=>number(n,-max,max));
    if(!Object.hasOwn(CREW_PHASES,s.phase)||!number(s.time,-10,24001)||!array(s.position,3,1e8)||!array(s.velocity,3,15000)||!array(s.targetPosition,3,1e8)||!array(s.targetVelocity,3,15000)||!array(s.attitude,4,1)||!array(s.angularVelocity,3,1)||!array(s.attitudeEffort,3,2))throw Error('存档运动状态无效。');
    if(norm(s.position)<6e6||Math.abs(new Quaternion(...s.attitude).length()-1)>1e-6)throw Error('存档坐标或姿态无效。');
    if(!number(s.serviceFuelKg,0,900)||!number(s.capsuleRcsFuelKg,0,18)||!number(s.landingFuelKg,0,100)||!number(b.boosterFuel,0,200000)||!number(b.upperFuel,0,50000)||!number(s.peakG,0,1000)||!number(s.mainFraction,0,1)||!number(s.massKg,1,300000))throw Error('存档资源或读数无效。');
    if(!array(s.attitudeTorqueNm,3,1e6)||!array(s.passiveTorqueNm,3,1e6)||typeof s.attitudeSource!=='string'||s.attitudeSource.length>100)throw Error('存档姿态控制状态无效。');
    for(const name of ['automatic','fullDemo','serviceAttached','released'] as const)if(typeof s[name]!=='boolean')throw Error('存档控制状态无效。');
    for(const name of ['phaseSince','lastTrail'] as const)if(!number(b[name],-10,s.time+.1))throw Error('存档事件时间无效。');
    for(const name of ['separationTime','touchdownAt'] as const)if(!number(b[name],0,Math.max(0,s.time+.1)))throw Error('存档分离或接地时间无效。');
    for(const name of ['aligned','hold','contactSpeed'] as const)if(!number(b[name],0,24000))throw Error('存档积分状态无效。');
    for(const name of ['chuteTime','mainTime'] as const)if(b[name]!==null&&!number(b[name],0,s.time))throw Error('存档开伞状态无效。');
    if(!Array.isArray(s.events)||s.events.length>1000||!s.events.every(e=>e&&number(e.time,-10,s.time)&&typeof e.label==='string'&&e.label.length<1000&&Object.hasOwn(CREW_PHASES,e.phase)))throw Error('存档事件无效。');
    if(!Array.isArray(s.trail)||s.trail.length>3000||!s.trail.every(p=>array(p,3,1e8)))throw Error('存档航迹无效。');
    for(const name of ['touchdownSpeedMS','touchdownHorizontalMS'] as const)if(s[name]!==null&&!number(s[name],0,15000))throw Error('存档着陆记录无效。');
    for(const name of ['touchdownTiltDeg','touchdownAngularRateDegS'] as const)if(s[name]!==null&&!number(s[name],0,180))throw Error('存档接地姿态无效。');
    if(!number(b.contactHeight,-10,100)||!['booster','upper','none'].includes(s.carrierStage))throw Error('存档接地几何或火箭连接状态无效。');
    if(s.phase!=='failed'&&s.carrierStage!==(['ground','countdown','ascent'].includes(s.phase)?'booster':['upper','insertion'].includes(s.phase)?'upper':'none'))throw Error('存档火箭连接状态与阶段不符。');
    if(s.inspection&&(!number(s.inspection.time,0,s.time)||!number(s.inspection.distanceM,30,100)||!number(s.inspection.relativeSpeedMS,0,.15)||!number(s.inspection.pointingDeg,0,6)||!Array.isArray(s.inspection.parts)||s.inspection.parts.some(x=>typeof x!=='string'||x.length>100)))throw Error('存档观察记录无效。');
    if(s.phase!=='failed'&&s.serviceAttached!==(!descentPhases.has(s.phase)&&!['touchdown','complete'].includes(s.phase)))throw Error('存档分离状态与阶段不符。');
    if(s.phase==='complete'&&(!s.inspection||s.touchdownSpeedMS===null||s.touchdownSpeedMS>3||s.touchdownHorizontalMS===null||s.touchdownHorizontalMS>5))throw Error('存档完成条件不成立。');
    const m=new CrewMission({position:[...s.targetPosition],velocity:[...s.targetVelocity],fuel:0});
    m.phase=s.phase;m.carrierStage=s.carrierStage;m.time=s.time;m.position=[...s.position];m.velocity=[...s.velocity];m.attitude.fromArray(s.attitude);m.angularVelocity.fromArray(s.angularVelocity);m.attitudeEffort.fromArray(s.attitudeEffort);
    m.serviceFuel=s.serviceFuelKg;m.capsuleRcsFuel=s.capsuleRcsFuelKg;m.landingFuel=s.landingFuelKg;m.boosterFuel=b.boosterFuel;m.upperFuel=b.upperFuel;
    m.attitudeTorque.fromArray(s.attitudeTorqueNm);m.passiveTorque.fromArray(s.passiveTorqueNm);m.attitudeSource=s.attitudeSource;
    m.automatic=s.automatic;m.fullDemo=s.fullDemo;m.serviceAttached=s.serviceAttached;m.released=s.released;
    if(Math.abs(m.mass-s.massKg)>1e-5)throw Error('存档质量账本不一致。');
    m.inspection=s.inspection?structuredClone(s.inspection):undefined;m.touchdownSpeed=s.touchdownSpeedMS;m.touchdownHorizontal=s.touchdownHorizontalMS;m.peakG=s.peakG;
    m.touchdownTilt=s.touchdownTiltDeg;m.touchdownAngularRate=s.touchdownAngularRateDegS;
    m.events=s.events.map(e=>({...e}));m.trail=s.trail.map(p=>[...p]);m.message=typeof s.message==='string'?s.message.slice(0,1000):'';
    m.phaseSince=b.phaseSince;m.aligned=b.aligned;m.hold=b.hold;m.chuteTime=b.chuteTime;m.mainTime=b.mainTime;m.lastTrail=b.lastTrail===-10&&s.trail.length===0?-Infinity:b.lastTrail;m.separationTime=b.separationTime;m.touchdownAt=b.touchdownAt;m.contactSpeed=b.contactSpeed;m.contactHeight=b.contactHeight;m.mainFraction=s.mainFraction;
    for(const name of ['gravity','thrust','drag','chuteForce','contactForce'] as const){if(!array(s[name],3,1e9))throw Error('存档受力无效。');m.forces[name].fromArray(s[name]);}
    // Older crew-earth-3 checkpoints have no pilot fields. Their original automatic/
    // milestone route remains unchanged; a present pilot payload must be complete.
    const ps=s.pilot,pi=b.pilot;
    if(ps!==undefined){
      if(!ps||typeof ps.active!=='boolean'||!number(ps.throttle,0,1)||typeof ps.engineLit!=='boolean'||typeof ps.engineEnabled!=='boolean'||ps.pendingAction!==null&&!CREW_PILOT_ACTIONS.includes(ps.pendingAction)||!Array.isArray(ps.actions)||ps.actions.length>CREW_PILOT_ACTIONS.length)throw Error('存档自主任务控制状态无效。');
      if(!pi||typeof pi.engineEnabled!=='boolean'||typeof pi.landingEnabled!=='boolean'||pi.upperIgnitionTime!==null&&!number(pi.upperIgnitionTime,0,s.time))throw Error('存档自主任务积分配置无效。');
      if(ps.active&&s.fullDemo||!ps.active&&(ps.pendingAction!==null||pi.engineEnabled||pi.landingEnabled||pi.upperIgnitionTime!==null))throw Error('存档任务路线与自主控制状态不一致。');
      if(pi.engineEnabled&&!['countdown','ascent','upper','insertion','deorbit','landing','failed'].includes(s.phase))throw Error('存档发动机授权与阶段不一致。');
      if(pi.landingEnabled&&!['main-chute','landing','touchdown','complete','failed'].includes(s.phase))throw Error('存档着陆授权与阶段不一致。');
      if(ps.active&&['landing','touchdown','complete'].includes(s.phase)&&!pi.landingEnabled||ps.active&&s.carrierStage==='upper'&&pi.engineEnabled&&pi.upperIgnitionTime===null)throw Error('存档缺少已执行阶段的授权。');
      if(ps.engineLit!==(m.forces.thrust.length()>1)||ps.engineEnabled!==pi.engineEnabled)throw Error('存档发动机读数与实际推力或授权不一致。');
      m.pilotActive=ps.active;m.pilotThrottle=ps.throttle;m.pilotPending=ps.pendingAction;m.pilotEngineEnabled=pi.engineEnabled;m.pilotLandingEnabled=pi.landingEnabled;m.pilotUpperIgnitionTime=pi.upperIgnitionTime;
      if(ps.pendingAction!==null&&!m.actionStatus(ps.pendingAction).allowed)throw Error('存档待授权动作与实际条件不一致。');
      const expected=m.pilotActions();
      if(ps.actions.length!==expected.length||ps.actions.some((status,i)=>!status||status.action!==expected[i].action||status.label!==expected[i].label||status.allowed!==expected[i].allowed||status.reason!==expected[i].reason))throw Error('存档动作守卫与实际任务条件不一致。');
    }else if(pi!==undefined&&(pi.engineEnabled!==false||pi.landingEnabled!==false||pi.upperIgnitionTime!==null))throw Error('存档缺少自主任务状态。');
    if(s.phase==='complete'&&!m.recoveryChecks().every(c=>c.passed))throw Error('存档完成或接地稳定条件不成立。');
    m.refresh();return m;
  }
}

let nominalTarget:Particle|undefined;
/** Forecast sets the platform's initial orbit before starting. No forecast is credited as flown. */
export function createCrewMission(){
  if(!nominalTarget){
    const forecast=new CrewMission();forecast.start();
    for(let i=0;i<20000&&!['approach','failed'].includes(forecast.phase);i++)forecast.step();
    if(forecast.phase!=='approach')throw Error(`教学载具未完成名义入轨：${forecast.message}`);
    const offset=scale(unit(forecast.velocity),180),omega=scale(cross(forecast.position,forecast.velocity),1/norm(forecast.position)**2);
    let p:Particle={position:add(forecast.position,offset),velocity:add(forecast.velocity,cross(omega,offset)),fuel:0};
    let t=forecast.time;while(t>-10+1e-8){const dt=-Math.min(1,t+10);p=coastParticle(p,t,dt);t+=dt;}
    nominalTarget=p;
  }
  return new CrewMission(nominalTarget);
}
