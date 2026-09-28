import { LAUNCH_EARTH } from '../data/launchMission';
import { add, ascentForces, dot, integrateAscent, norm, rotateEarth, scale, surfaceAt, unit, type Particle, type V3 } from './ascent';
import type { FlightState } from './liftoff';
import { orbitalElements, type OrbitElements } from './orbitInsertion';
import { OPS, electricalStep, operationsReading, operationsSun } from './satelliteOperations';

/** Explicit teaching platform; propulsion is absent. Electrical equipment is within payload mass. */
export const SATELLITE_LIFECYCLE = { stepS: 1, maxS: 21600, careW: 80, workingW: 200, receiverW: 50, bleedW: 600, endingBusW: 20, careCharge: .85, commandCharge: .1, residualCharge: .05, commandS: 5, aftercareS: 600, propulsionN: 0, propellantKg: 0 } as const;
export const LIFE_LABELS = {
  'life-ready': '维护条件检查', 'life-care': '低负载维护与充电', 'life-review': '维护检查完成', 'life-working': '保留工作状态',
  'life-disposal': '核对任务结束与处置条件', 'life-contact': '等待结束指令窗口', 'life-commanded': '结束指令已接收', 'life-closing': '隔离充电与电能收尾',
  'life-retired': '已退役 · 仍在轨 · 未完成处置', 'life-observe': '观察退役后运动', 'life-observed': '退役后观察完成 · 仍在轨', 'life-failed': '本段停止 · 需检查原因',
} as const;
export type LifecyclePhase = keyof typeof LIFE_LABELS;
export const LIFE_RUNNING:readonly string[]=['life-care','life-contact','life-closing','life-observe'];
export interface LifecycleSample { t:number; batteryWh:number; generationW:number; loadW:number; altitudeKm:number; periapsisKm:number; shadow:boolean }
export interface LifecycleTelemetry {
  startTime:number; elapsedS:number; periodS:number; startEnergyJ:number; initialAltitudeM:number; initialPeriapsisM:number;
  mode:'maintaining'|'working'|'ending'|'retired'|'power-lost'; careStart:number|null; commandProgressS:number; commandAt:number|null; isolated:boolean; retiredAt:number|null; observeStart:number|null;
  potentialW:number; bleedW:number; generatedJ:number; consumedJ:number; lossJ:number; shuntedJ:number; unservedJ:number;
  frozenDirection:V3|null; frozenNormal:V3|null; samples:LifecycleSample[];
}
/** At-apogee impulsive lower-perigee reference, NOT a command or real maneuver budget. */
export function disposalAssessment(e:OrbitElements) {
  const radius=LAUNCH_EARTH.semiMajorM, mu=LAUNCH_EARTH.gmM3S2, ra=e.apoapsisM===null?null:radius+e.apoapsisM;
  const a=ra===null?null:(ra+radius+e.periapsisM)/2, targetA=ra===null?null:(ra+radius+80000)/2;
  const requiredMS=e.bound&&ra&&a&&targetA?Math.max(0,Math.sqrt(mu*(2/ra-1/a))-Math.sqrt(mu*(2/ra-1/targetA))):null;
  return { requiredMS, availableMS:0, permitted:false, reason:'当前 E01 未配置推进器与推进剂，不能主动变轨或离轨。80 km 仅为比较轨道，不是安全处置目标。' };
}
export class LifecycleSimulation {
  state:FlightState; stepsTaken=0; private satellite:Particle; private nextSample=0;
  constructor(handoff:FlightState,readonly baseTime:number,readonly stepS:number=SATELLITE_LIFECYCLE.stepS) {
    const d=handoff.deployment,o=handoff.operations;
    if(handoff.phase!=='ops-complete'||!o||!handoff.ascent||!handoff.orbit||!d?.released||!d.verified||!d.satellite.elements.periodS||d.satellite.elements.periapsisM<80000||o.bufferMB>1e-8)throw Error('请先完成 P4 数据下传，保留有效在轨卫星。');
    if(![1,.5,.25].includes(stepS))throw Error('不支持的维护步长。');
    this.state=structuredClone(handoff);this.state.phase='life-ready';
    this.satellite={position:[...d.satellite.position],velocity:[...d.satellite.velocity],fuel:0};
    this.state.lifecycle={startTime:handoff.time,elapsedS:0,periodS:d.satellite.elements.periodS,startEnergyJ:o.energyJ,initialAltitudeM:d.satellite.altitudeM,initialPeriapsisM:d.satellite.elements.periapsisM,mode:'working',careStart:null,commandProgressS:0,commandAt:null,isolated:false,retiredAt:null,observeStart:null,potentialW:0,bleedW:0,generatedJ:0,consumedJ:0,lossJ:0,shuntedJ:0,unservedJ:0,frozenDirection:null,frozenNormal:null,samples:[]};
    this.state.message='继承 P4 的电量、位置、速度与已交付数据，不补充燃料或重置电池。E01 没有推进系统；本段可维护能源、结束任务并保留在轨对象。';this.refresh();this.event('进入 P5：保留卫星能源与轨道，核对实际能力');
  }
  get running(){return LIFE_RUNNING.includes(this.state.phase);}
  private event(label:string){this.state.events.push({time:this.state.time,label});}
  care(){if(this.state.phase!=='life-ready')throw Error('当前不能启动维护。');this.state.lifecycle!.careStart=this.state.time;this.state.lifecycle!.mode='maintaining';this.state.phase='life-care';this.state.message='关闭任务载荷、降低用电，保持理想对日定向。至少检查一圈，电量达到 85% 后暂停；这不是故障修复或轨道修正。';this.refresh();this.event('开始低负载维护，观察一圈能源循环');}
  keepWorking(){if(this.state.phase!=='life-review')throw Error('请先完成维护检查。');this.state.lifecycle!.mode='working';this.state.phase='life-working';this.state.message='保留工作状态，当前冻结。任务数据已交付，尚未退役；可保存结果，或继续核对任务结束条件。';this.refresh();this.event('维护完成，保留工作状态');}
  reviewDisposal(){if(!['life-review','life-working'].includes(this.state.phase))throw Error('请先完成维护检查。');if(this.state.operations!.bufferMB>1e-8)throw Error('仍有未交付数据，不能进入本结束流程。');this.state.phase='life-disposal';this.state.message='主动离轨不可用：E01 没有推进系统。可以结束业务并执行教学电能收尾，但这会留下退役在轨对象，不构成已完成处置。';this.refresh();this.event('核对退役条件：无推进能力，主动离轨不可用');}
  commandRetirement(){if(this.state.phase!=='life-disposal')throw Error('请先核对任务结束条件。');const o=this.state.operations!;if(o.energyJ<o.capacityJ*SATELLITE_LIFECYCLE.commandCharge)throw Error('电量不足，无法执行本指令流程。');this.state.phase='life-contact';this.state.message='等待仰角至少 10° 的教学站窗口，连续接收 5 秒结束指令。窗口中断则重新计时，未收到指令前不隔离充电。';this.refresh();this.event('申请结束任务指令，等待通信窗口');}
  closeEnergy(){if(this.state.phase!=='life-commanded')throw Error('尚未收到结束指令。');const l=this.state.lifecycle!,o=this.state.operations!;l.isolated=true;l.mode='ending';l.frozenDirection=[...o.direction];l.frozenNormal=[...o.arrayNormal];this.state.phase='life-closing';this.state.message='太阳翼与电池充电回路隔离；教学泄放负载消耗电能，降至 5% 时断开主用电回路。剩余电能保留，不宣称彻底钝化或已离轨。';this.refresh();this.event('执行已接收的结束程序：隔离充电，开始电能收尾');}
  observeRetired(){if(this.state.phase!=='life-retired')throw Error('当前不能开始退役后观察。');this.state.lifecycle!.observeStart=this.state.time;this.state.phase='life-observe';this.state.message='继续计算退役后 10 分钟：卫星仍受地球引力运动。主用电回路与充电均断开，停止业务、通信和主动定向；姿态固定为理想无力矩近似。';this.refresh();this.event('开始退役后 10 分钟无动力观察');}
  private reading(p:V3,time:number){
    const s=this.state,l=s.lifecycle!,o=s.operations!,factor=s.deployment!.satellite.massKg/500;
    const r=operationsReading(p,time,this.baseTime,o,s.deployment!.satellite.massKg,'life');
    const contact=s.phase==='life-contact'&&r.activeStation!==null&&o.energyJ>=o.capacityJ*SATELLITE_LIFECYCLE.commandCharge;
    let loadW=(l.mode==='working'?SATELLITE_LIFECYCLE.workingW:SATELLITE_LIFECYCLE.careW)*factor,bleedW=0;
    if(contact)loadW+=SATELLITE_LIFECYCLE.receiverW*factor;
    if(l.isolated){bleedW=l.mode==='ending'?SATELLITE_LIFECYCLE.bleedW*factor:0;loadW=l.mode==='ending'?(SATELLITE_LIFECYCLE.endingBusW*factor+bleedW):0;}
    const station=r.links.find(link=>link.id===r.activeStation),arrayNormal=l.frozenNormal??r.arrayNormal;
    const incidence=Math.max(0,dot(arrayNormal,r.sunDirection));
    // Retired wings keep their inertial normal instead of the ideal Sun tracker.
    const area=OPS.arrayM2*(s.deployment!.satellite.massKg===500?1:.64);
    const potentialW=r.shadow?0:OPS.solarWM2/operationsSun(this.baseTime,time).distanceAu**2*area*OPS.efficiency*OPS.packing*incidence;
    return {...r, incidence,potentialW,generationW:l.isolated?0:potentialW,loadW,bleedW,collecting:false,transmitting:contact,
      direction:l.frozenDirection??(contact&&station?unit(add(station.position,scale(p,-1))):r.direction),arrayNormal};
  }
  private refresh(){
    const s=this.state,l=s.lifecycle!,o=s.operations!,a=s.ascent!,body=s.deployment!.satellite,r=this.reading(this.satellite.position,s.time);
    const {potentialW,bleedW,...reading}=r;Object.assign(o,reading,{elapsedS:s.time-o.startTime});l.potentialW=potentialW;l.bleedW=bleedW;l.elapsedS=s.time-l.startTime;
    Object.assign(body,{position:[...this.satellite.position],velocity:[...this.satellite.velocity],fixedPosition:rotateEarth(this.satellite.position,-s.time),altitudeM:surfaceAt(this.satellite.position).height,elements:orbitalElements(this.satellite.position,this.satellite.velocity)});
    const f=ascentForces(this.satellite,{dry:body.massKg,cdArea:4.4},s.time,0),vertical=dot(f.relative,f.up);
    Object.assign(a,{position:[...body.position],velocity:[...body.velocity],fixedPosition:[...body.fixedPosition],direction:o.direction,fixedDirection:rotateEarth(o.direction,-s.time),altitudeM:body.altitudeM,airSpeedMS:f.airSpeed,horizontalMS:Math.sqrt(Math.max(0,f.airSpeed**2-vertical**2)),density:f.density,pressurePa:f.pressurePa,dynamicPressurePa:.5*f.density*f.airSpeed**2,pitchDeg:Math.asin(Math.max(-1,Math.min(1,dot(o.direction,f.up))))*180/Math.PI});
    Object.assign(s,{massKg:body.massKg,heightM:body.altitudeM,speedMS:vertical,thrustN:0,throttle:0,weightN:body.massKg*LAUNCH_EARTH.gmM3S2/norm(body.position)**2,dragN:f.drag,accelerationMS2:dot(f.acceleration,f.up)});s.orbit!.elements=body.elements;
    if(l.elapsedS>=this.nextSample-1e-8){this.sample();this.nextSample=l.elapsedS+20;}
  }
  private sample(){const s=this.state,l=s.lifecycle!,o=s.operations!;if(l.samples.at(-1)?.t===l.elapsedS)return;l.samples.push({t:l.elapsedS,batteryWh:o.energyJ/3600,generationW:o.generationW,loadW:o.loadW,altitudeKm:s.heightM/1000,periapsisKm:s.deployment!.satellite.elements.periapsisM/1000,shadow:o.shadow});}
  step(){
    if(!this.running)return;const s=this.state,l=s.lifecycle!,o=s.operations!,mass=s.deployment!.satellite.massKg;
    let dt=Math.min(this.stepS,SATELLITE_LIFECYCLE.maxS-l.elapsedS);
    if(s.phase==='life-closing')dt=Math.min(dt,Math.max(0,(o.energyJ-o.capacityJ*SATELLITE_LIFECYCLE.residualCharge)*.9/((SATELLITE_LIFECYCLE.bleedW+SATELLITE_LIFECYCLE.endingBusW)*mass/500)));
    if(s.phase==='life-observe')dt=Math.min(dt,SATELLITE_LIFECYCLE.aftercareS-(s.time-l.observeStart!));
    if(o.energyJ<=o.capacityJ*.2)o.reserveMode=true;else if(o.energyJ>=o.capacityJ*.35)o.reserveMode=false;
    const advance=(t:number)=>integrateAscent(this.satellite,{dry:mass,cdArea:4.4},s.time,t,()=>0),mid=advance(dt/2),r=this.reading(mid.position,s.time+dt/2),e=electricalStep(o.energyJ,o.capacityJ,r.generationW,r.loadW,dt);
    o.energyJ=e.energyJ;
    for(const book of [o,l]){book.generatedJ+=r.generationW*dt;book.consumedJ+=r.loadW*dt;book.lossJ+=e.lossJ;book.shuntedJ+=e.shuntedJ;book.unservedJ+=e.unservedJ;}
    if(r.shadow)o.eclipseS+=dt;else o.sunlightS+=dt;
    if(s.phase==='life-contact')l.commandProgressS=r.transmitting&&e.unservedJ===0?Math.min(SATELLITE_LIFECYCLE.commandS,l.commandProgressS+dt):0;
    this.satellite=advance(dt);s.time+=dt;this.stepsTaken++;this.refresh();
    if(l.elapsedS>=SATELLITE_LIFECYCLE.maxS-1e-8||s.heightM<80000||!Number.isFinite(o.energyJ)||e.unservedJ>1e-7){s.phase='life-failed';if(e.unservedJ>1e-7)l.mode='power-lost';s.message='本段达到时限、轨迹或供电边界，状态已保留。未把任务标为维护成功或处置完成。';}
    else if(s.phase==='life-care'&&s.time-l.careStart!>=l.periodS&&o.energyJ>=o.capacityJ*SATELLITE_LIFECYCLE.careCharge){s.phase='life-review';s.message='至少一圈能源检查完成，电量达到 85%。可保留工作状态，或核对任务结束与处置条件；没有执行变轨。';}
    else if(s.phase==='life-contact'&&l.commandProgressS>=SATELLITE_LIFECYCLE.commandS){s.phase='life-commanded';l.commandAt=s.time;s.message='连续窗口内的教学结束指令已接收，当前冻结。确认后继续执行电能收尾；在此之前充电回路仍连接。';}
    else if(s.phase==='life-closing'&&o.energyJ<=o.capacityJ*SATELLITE_LIFECYCLE.residualCharge+1e-5){s.phase='life-retired';l.mode='retired';l.retiredAt=s.time;s.message='业务结束，充电与主用电回路已断开；电池保留 5% 教学残余。E01 已退役但仍在轨，尚未完成离轨处置，不预测自然衰减年限。';}
    else if(s.phase==='life-observe'&&s.time-l.observeStart!>=SATELLITE_LIFECYCLE.aftercareS-1e-8){s.phase='life-observed';s.message='退役后 10 分钟观察结束，物体仍在轨道上，电池没有自动恢复。可以保存本次结果；无推进分支到此结束，尚未完成空间处置。';}
    if(!this.running){this.refresh();this.sample();this.event(s.message);}
  }
  snapshot():FlightState{return structuredClone(this.state);}
}
export class LifecycleClock {
  paused=true;rate=1;private debt=0;
  constructor(readonly simulation:LifecycleSimulation){}
  pause(v:boolean){this.paused=v;this.debt=0;}
  setRate(v:number){if(![1,10,100].includes(v))throw Error('不支持的维护倍率。');this.rate=v;this.debt=0;}
  advance(seconds:number){if(this.paused||!this.simulation.running||!Number.isFinite(seconds)||seconds<=0)return;this.debt+=Math.min(seconds,.25)*this.rate;let budget=120;while(this.debt+1e-9>=this.simulation.stepS&&budget-->0&&this.simulation.running){this.simulation.step();this.debt-=this.simulation.stepS;}this.debt=this.simulation.running?Math.min(this.debt,Math.max(this.simulation.stepS,.25*this.rate)):0;}
}
