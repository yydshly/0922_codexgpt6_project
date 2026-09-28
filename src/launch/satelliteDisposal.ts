import { LAUNCH_EARTH } from '../data/launchMission';
import { add, ascentForces, dot, integrateAscent, norm, rotateEarth, scale, surfaceAt, unit, type AscentModel, type Particle, type V3 } from './ascent';
import type { FlightState } from './liftoff';
import { orbitalElements } from './orbitInsertion';
import { DISPOSAL_KIT as K, type SatelliteEquipment } from './satellitePlan';
import { electricalStep, operationsReading, slewDirection } from './satelliteOperations';
import { reentryAtmosphere, stagnationHeatFlux } from './reentry';
import { STANDARD_GRAVITY } from './vehicle';

export const DISPOSAL_LABELS = {
  'disposal-review': 'E02 · 离轨条件检查', 'disposal-contact': '等待结束指令窗口', 'disposal-commanded': '结束指令已接收 · 保留控制电源',
  'disposal-align': '卫星反向定向', 'disposal-armed': '卫星已对准 · 等待点火', 'disposal-burn': '卫星离轨点火',
  'disposal-cutoff': '降低近地点 · 点火结果检查', 'disposal-passivate': '锁定推进 · 处理剩余储能', 'disposal-coast-ready': '处置操作结束 · 等待观察下降',
  'disposal-coast': '卫星下降至 120 km', 'disposal-interface': '卫星进入再入检查点', 'disposal-entry': '卫星等效物体 · 再入受热',
  'disposal-boundary': '卫星参考下降到 20 km', 'disposal-lower': '卫星等效物体继续至地表', 'disposal-complete': '卫星参考下降结束 · 材料结局未求解',
  'disposal-failed': '卫星离轨流程停止',
} as const;
export type DisposalPhase = keyof typeof DISPOSAL_LABELS;
export const DISPOSAL_RUNNING: readonly string[] = ['disposal-contact','disposal-align','disposal-burn','disposal-passivate','disposal-coast','disposal-entry','disposal-lower'];
export interface DisposalSample { t:number; altitudeM:number; perigeeM:number; fuelKg:number; massKg:number; thrustN:number; airSpeedMS:number; heatFluxWm2:number|null }
export interface SatelliteDisposalTelemetry {
  startTime:number; elapsedS:number; startMassKg:number; startFuelKg:number; startEnergyJ:number; initialPerigeeM:number;
  plan: { allowed:boolean; reason:string; availableMS:number; predictedBurnS:number; predictedFuelKg:number; predictedPerigeeM:number };
  commandProgressS:number; commandAt:number|null; alignAt:number|null; burnAt:number|null; cutoffAt:number|null; passivationAt:number|null;
  entryAt:number|null; groundAt:number|null; direction:V3; initialDirection:V3;
  burnedKg:number; ventedKg:number; usedDeltaVMS:number; locked:boolean; isolated:boolean; retired:boolean;
  generatedJ:number; consumedJ:number; lossJ:number; shuntedJ:number; unservedJ:number;
  heatFluxWm2:number|null; peakHeatWm2:number; heatLoadJm2:number; temperatureK:number; mach:number|null;
  samples:DisposalSample[]; outcome:'pending'|'surface-reference'|'stopped';
}

export function disposalModel(e:SatelliteEquipment, powered:boolean, direction?:V3):AscentModel {
  return {dry:e.dryKg,cdArea:K.cdArea,atmosphere:h=>reentryAtmosphere(Math.max(0,h)),
    ...(powered ? {motor:{flow:e.thrustN/(STANDARD_GRAVITY*e.ispS),sea:e.ispS,vacuum:e.ispS}} : {}),
    steer:p=>({direction:direction??scale(unit(p.velocity),-1),pitchDeg:0})};
}
/** Finite burn forecast using the same forces. Not an impact footprint or disposal certification. */
export function satelliteDisposalPlan(s:FlightState, alignmentDelay: number = K.alignS) {
  const e=s.satelliteEquipment,b=s.deployment?.satellite;
  if(!e||!b)throw Error('当前卫星在发射前未配置离轨设备。');
  const availableMS=STANDARD_GRAVITY*e.ispS*Math.log((e.dryKg+e.fuelKg)/e.dryKg);
  let p:Particle={position:[...b.position],velocity:[...b.velocity],fuel:e.fuelKg}, t=s.time;
  for(let i=0;i<alignmentDelay*2;i++){p=integrateAscent(p,disposalModel(e,false),t,.5,()=>0);t+=.5;}
  let burn=0;const startFuel=p.fuel;
  while(burn<K.maxBurnS&&p.fuel>.2&&orbitalElements(p.position,p.velocity).periapsisM>K.targetPerigeeM){
    const dt=Math.min(.5,p.fuel/(e.thrustN/(STANDARD_GRAVITY*e.ispS)));
    p=integrateAscent(p,disposalModel(e,true),t,dt,()=>1);t+=dt;burn+=dt;
  }
  const predictedPerigeeM=orbitalElements(p.position,p.velocity).periapsisM;
  const allowed=predictedPerigeeM<=K.targetPerigeeM && !!s.operations && s.operations.energyJ>=s.operations.capacityJ*.2 && b.altitudeM>120000;
  return {allowed,reason:allowed?'资源与有限点火预测通过；不包含落区控制或材料存活判断。':'燃料、电量或轨道不满足当前离轨方案，保留原在轨对象。',availableMS,predictedBurnS:burn,predictedFuelKg:startFuel-p.fuel,predictedPerigeeM};
}
export class SatelliteDisposalSimulation {
  state:FlightState; stepsTaken=0; private particle:Particle; private nextSample=0;
  constructor(handoff:FlightState,readonly baseTime:number,readonly stepS=.25){
    const e=handoff.satelliteEquipment,o=handoff.operations,b=handoff.deployment?.satellite;
    if(handoff.phase!=='ops-complete'||!e||!o||!b||o.bufferMB>1e-8||o.deliveredMB<240||!handoff.deployment?.verified)throw Error('请用发射前配有推进系统的 E02 完成数据下传，再核对离轨。');
    if(![.25,.125,.0625].includes(stepS))throw Error('不支持的卫星离轨步长。');
    if(Math.abs(e.dryKg+e.fuelKg-b.massKg)>1e-6)throw Error('卫星独立质量账本不一致。');
    this.state=structuredClone(handoff);this.state.phase='disposal-review';
    this.particle={position:[...b.position],velocity:[...b.velocity],fuel:e.fuelKg};
    this.state.satelliteDisposal={startTime:handoff.time,elapsedS:0,startMassKg:b.massKg,startFuelKg:e.fuelKg,startEnergyJ:o.energyJ,initialPerigeeM:b.elements.periapsisM,
      plan:satelliteDisposalPlan(handoff),commandProgressS:0,commandAt:null,alignAt:null,burnAt:null,cutoffAt:null,passivationAt:null,entryAt:null,groundAt:null,
      direction:[...o.direction],initialDirection:[...o.direction],burnedKg:0,ventedKg:0,usedDeltaVMS:0,locked:false,isolated:false,retired:false,
      generatedJ:0,consumedJ:0,lossJ:0,shuntedJ:0,unservedJ:0,heatFluxWm2:null,peakHeatWm2:0,heatLoadJm2:0,temperatureK:0,mach:null,samples:[],outcome:'pending'};
    this.state.message='先核对 E02 自带推进器、燃料和电量。停止业务后仍需保留控制电源执行离轨；不得借用二级发动机。';
    this.state.ascent!.trail=[];this.refresh();this.event('进入 E02 任务末期离轨分支：二级历史记录不变');
  }
  get running(){return DISPOSAL_RUNNING.includes(this.state.phase);}
  private event(label:string){this.state.events.push({time:this.state.time,label});}
  private change(phase:DisposalPhase,message:string){this.state.phase=phase;this.state.message=message;this.event(message);}
  command(){if(this.state.phase!=='disposal-review'||!this.state.satelliteDisposal!.plan.allowed)throw Error('离轨前提未满足，不能执行。');this.change('disposal-contact','等待教学地面站连续 5 秒接收结束与离轨指令；尚未关闭控制电源。');}
  align(){if(this.state.phase!=='disposal-commanded')throw Error('尚未收到结束指令。');this.state.satelliteDisposal!.alignAt=this.state.time;this.change('disposal-align','以 12 秒理想姿态辅助指向速度反方向，发动机未点火。');}
  ignite(){
    const s=this.state,q=s.satelliteDisposal!,e=s.satelliteEquipment!;
    if(s.phase!=='disposal-armed'||q.locked||s.operations!.energyJ<s.operations!.capacityJ*.2||e.fuelKg<=.2)throw Error('指向、电量、燃料或发动机锁定条件不满足。');
    q.plan=satelliteDisposalPlan(s,0);if(!q.plan.allowed)throw Error(q.plan.reason);
    q.burnAt=s.time;this.change('disposal-burn','E02 自带 200 N 教学发动机反向点火；推进剂、总质量和轨道同时变化。达到参考近地点后关机，不代表受控落区。');this.refresh();
  }
  passivate(){if(this.state.phase!=='disposal-cutoff')throw Error('先核对离轨点火结果。');const q=this.state.satelliteDisposal!;q.passivationAt=this.state.time;q.locked=true;q.isolated=true;this.change('disposal-passivate','锁定发动机，隔离充电；120 秒对称排放余推进剂至 0.1 kg 并以负载消耗部分电能。保留残余储能，不宣称完全钝化。');this.refresh();}
  coast(){if(this.state.phase!=='disposal-coast-ready')throw Error('先完成当前储能处理操作。');this.change('disposal-coast','卫星无推力下降，到 120 km 检查点暂停。当前关闭业务，但轨迹仍连续计算。');}
  enter(){if(this.state.phase!=='disposal-interface')throw Error('请先到达再入检查点。');this.change('disposal-entry','改用计算质点显示卫星等效物体，观察空气阻力与热流。未模拟太阳翼断裂、材料烧蚀和碎片，先计算到 20 km。');}
  lower(){if(this.state.phase!=='disposal-boundary')throw Error('请先到达 20 km 检查点。');this.change('disposal-lower','同一等效质量与阻力参数继续到 0 m 参考面；不是完整卫星存活或安全着陆预测。');}
  private refresh(){
    const s=this.state,q=s.satelliteDisposal!,e=s.satelliteEquipment!,o=s.operations!,b=s.deployment!.satellite,a=s.ascent!,p=this.particle;
    e.fuelKg=p.fuel;b.massKg=e.dryKg+p.fuel;
    Object.assign(b,{position:[...p.position],velocity:[...p.velocity],fixedPosition:rotateEarth(p.position,-s.time),altitudeM:surfaceAt(p.position).height,elements:orbitalElements(p.position,p.velocity)});
    const retro=scale(unit(p.velocity),-1);
    if(s.phase==='disposal-align')q.direction=slewDirection(q.initialDirection,retro,(s.time-q.alignAt!)/K.alignS);
    else if(['disposal-armed','disposal-burn'].includes(s.phase))q.direction=retro;
    const reading=operationsReading(p.position,s.time,this.baseTime,o,e.busKg,'dispose');
    Object.assign(o,reading,{direction:[...q.direction],collecting:false,transmitting:s.phase==='disposal-contact'&&reading.activeStation!==null,
      generationW:q.isolated?0:reading.generationW,loadW:q.retired?0:q.isolated?620:120+(s.phase==='disposal-contact'?50:0)});
    const f=ascentForces(p,disposalModel(e,s.phase==='disposal-burn',q.direction),s.time,s.phase==='disposal-burn'?1:0),vertical=dot(f.relative,f.up),atmo=reentryAtmosphere(Math.max(0,f.height));
    Object.assign(s,{massKg:b.massKg,heightM:f.height,speedMS:vertical,thrustN:f.thrust,throttle:s.phase==='disposal-burn'?1:0,dragN:f.drag,weightN:b.massKg*LAUNCH_EARTH.gmM3S2/norm(p.position)**2,accelerationMS2:dot(f.acceleration,f.up)});
    Object.assign(a,{position:[...p.position],velocity:[...p.velocity],fixedPosition:[...b.fixedPosition],direction:[...q.direction],fixedDirection:rotateEarth(q.direction,-s.time),altitudeM:f.height,airSpeedMS:f.airSpeed,horizontalMS:Math.sqrt(Math.max(0,f.airSpeed**2-vertical**2)),density:f.density,pressurePa:f.pressurePa,dynamicPressurePa:.5*f.density*f.airSpeed**2});
    q.elapsedS=s.time-q.startTime;q.temperatureK=atmo.temperatureK;q.mach=f.height<=86000?f.airSpeed/Math.sqrt(1.4*287.05*atmo.temperatureK):null;
    q.heatFluxWm2=q.mach!==null&&q.mach>=5&&f.height<=80000?stagnationHeatFlux(f.density,f.airSpeed,K.noseM):null;q.peakHeatWm2=Math.max(q.peakHeatWm2,q.heatFluxWm2??0);
    if(q.elapsedS+1e-7>=this.nextSample){this.sample();this.nextSample=q.elapsedS+5;}
  }
  private sample(){const s=this.state,q=s.satelliteDisposal!,b=s.deployment!.satellite;if(q.samples.at(-1)?.t===q.elapsedS)return;
    q.samples.push({t:q.elapsedS,altitudeM:b.altitudeM,perigeeM:b.elements.periapsisM,fuelKg:s.satelliteEquipment!.fuelKg,massKg:b.massKg,thrustN:s.thrustN,airSpeedMS:s.ascent!.airSpeedMS,heatFluxWm2:q.heatFluxWm2});
    s.ascent!.trail.push([...b.fixedPosition]);if(s.ascent!.trail.length>800)s.ascent!.trail.shift();}
  step(){
    if(!this.running)return;const s=this.state,q=s.satelliteDisposal!,e=s.satelliteEquipment!,o=s.operations!,phase=s.phase;
    const burning=phase==='disposal-burn',flow=e.thrustN/(STANDARD_GRAVITY*e.ispS),model=disposalModel(e,burning);
    let dt=this.stepS;if(burning)dt=Math.min(dt,this.particle.fuel/flow);
    if(phase==='disposal-align')dt=Math.min(dt,K.alignS-(s.time-q.alignAt!));
    if(phase==='disposal-passivate')dt=Math.min(dt,K.passivationS-(s.time-q.passivationAt!));
    const advance=(t:number)=>integrateAscent(this.particle,model,s.time,t,()=>burning?1:0);
    const target=phase==='disposal-coast'?120000:phase==='disposal-entry'?20000:phase==='disposal-lower'?0:null;
    let next=advance(dt);const hit=target!==null&&surfaceAt(next.position).height<=target;
    if(hit){let lo=0,hi=dt;for(let i=0;i<32;i++){const mid=(lo+hi)/2;if(surfaceAt(advance(mid).position).height>target!)lo=mid;else hi=mid;}dt=(lo+hi)/2;next=advance(dt);}
    const cut=burning&&orbitalElements(next.position,next.velocity).periapsisM<=K.targetPerigeeM;
    if(cut){let lo=0,hi=dt;for(let i=0;i<28;i++){const mid=(lo+hi)/2;if(orbitalElements(advance(mid).position,advance(mid).velocity).periapsisM>K.targetPerigeeM)lo=mid;else hi=mid;}dt=(lo+hi)/2;next=advance(dt);}
    if(phase==='disposal-contact')q.commandProgressS=o.activeStation&&o.energyJ>=o.capacityJ*.2?q.commandProgressS+dt:0;
    const energy=electricalStep(o.energyJ,o.capacityJ,o.generationW,o.loadW,dt);o.energyJ=energy.energyJ;
    q.generatedJ+=o.generationW*dt;q.consumedJ+=o.loadW*dt;for(const key of ['lossJ','shuntedJ','unservedJ'] as const)q[key]+=energy[key];
    if(burning){q.burnedKg+=this.particle.fuel-next.fuel;q.usedDeltaVMS+=STANDARD_GRAVITY*e.ispS*Math.log((e.dryKg+this.particle.fuel)/(e.dryKg+next.fuel));}
    if(phase==='disposal-passivate'){const initial=q.startFuelKg-q.burnedKg,desired=Math.max(K.residualFuelKg,initial-(initial-K.residualFuelKg)*(s.time+dt-q.passivationAt!)/K.passivationS);q.ventedKg+=next.fuel-desired;next.fuel=desired;}
    q.heatLoadJm2+=(q.heatFluxWm2??0)*dt;this.particle=next;s.time+=dt;this.stepsTaken++;this.refresh();
    if(!Number.isFinite(s.massKg+s.heightM+norm(next.velocity))||q.elapsedS>21600||!q.retired&&o.energyJ<o.capacityJ*.02||burning&&!cut&&(next.fuel<1e-8||s.time-q.burnAt!>=K.maxBurnS)){
      q.outcome='stopped';this.change('disposal-failed','到达燃料、电量、时长或轨迹限制。保留实际位置和资源，没有标记销毁或处置成功。');
    } else if(phase==='disposal-contact'&&q.commandProgressS>=5){q.commandAt=s.time;this.change('disposal-commanded','结束与离轨指令已接收；停止业务，控制电源继续工作。');}
    else if(phase==='disposal-align'&&s.time-q.alignAt!>=K.alignS-1e-8)this.change('disposal-armed','理想反向定向完成。准备启动卫星自身发动机。');
    else if(cut){q.cutoffAt=s.time;this.change('disposal-cutoff','反向点火已降低近地点至 60 km 参考值，发动机关机；这不是控制落区或完全烧毁的判据。');}
    else if(phase==='disposal-passivate'&&s.time-q.passivationAt!>=K.passivationS-1e-8){q.retired=true;this.change('disposal-coast-ready','推进已锁定、余燃料排放操作结束、业务与充电关闭。残余电池能量仍保留，不宣称完全钝化。');}
    else if(hit){if(phase==='disposal-coast'){q.entryAt=s.time;this.change('disposal-interface','卫星实际轨迹已下降到 120 km；继续后显示等效物体的再入减速与受热。');}
      else if(phase==='disposal-entry')this.change('disposal-boundary','卫星等效物体已到 20 km。材料烧蚀、解体和存活均未判定，可继续到地表参考面。');
      else {q.groundAt=s.time;q.outcome='surface-reference';this.change('disposal-complete','E02 等效物体已到 0 m 椭球参考面，参考下降结束。未宣称完整卫星落地、全部烧毁、安全落区或工程处置通过。');}}
    if(!this.running){this.refresh();this.sample();}
  }
  snapshot(){return structuredClone(this.state);}
}
export class SatelliteDisposalClock {
  paused=true;rate=1;private debt=0;
  constructor(readonly simulation:SatelliteDisposalSimulation){}
  pause(v:boolean){this.paused=v;this.debt=0;}
  setRate(v:number){if(![1,10,100].includes(v))throw Error('不支持的倍率。');this.rate=v;this.debt=0;}
  advance(seconds:number){if(this.paused||!this.simulation.running||!Number.isFinite(seconds)||seconds<=0)return;this.debt+=Math.min(.25,seconds)*this.rate;let budget=160;while(this.debt+1e-9>=this.simulation.stepS&&budget-->0&&this.simulation.running){this.simulation.step();this.debt-=this.simulation.stepS;}this.debt=this.simulation.running?Math.min(this.debt,.25*this.rate):0;}
}
