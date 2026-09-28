import { add, airVelocity, ascentForces, dot, integrateAscent, norm, rotateEarth, scale, surfaceAt, teachingAtmosphere, type Particle, type V3 } from './ascent';
import type { FlightState } from './liftoff';
import { reentryAtmosphere, stagnationHeatFlux } from './reentry';

export const BOOSTER_REFERENCE = { version:'booster-reference-1', stepS:.25, cd:.7, radiusM:1.85, maxElapsedS:3600, sampleS:2 } as const;
export interface BoosterSample {
  time:number; position:V3; velocity:V3; fixedPosition:V3; fixedDirection:V3;
  altitudeM:number; verticalMS:number; airSpeedMS:number; density:number; pressurePa:number;
  dragN:number; qPa:number; temperatureK:number|null; mach:number|null; heatFluxWm2:number|null;
  model:'coast'|'entry';
}
export interface BoosterRecord {
  version:string; startTime:number; massKg:number; status:'flying'|'surface-reference'|'stopped'; reason:string;
  latest:BoosterSample; samples:BoosterSample[]; events:{time:number;label:string}[];
  peakAltitudeM:number; peakQPa:number; peakHeatWm2:number;
}

/** Independent derived track from the actual separation state; never writes to FlightState. */
export class BoosterDescent {
  readonly record:BoosterRecord;
  private particle:Particle; private direction:V3; private time:number; private entry=false;
  private nextSample:number; private wasRising=true; private crossed20=false;
  constructor(source:FlightState,readonly stepS:number=BOOSTER_REFERENCE.stepS){
    const b=source.ascent?.detached, separation=source.ascent?.separation;
    if(!b||!separation||Math.abs(source.time-separation.time)>1e-7||!Number.isFinite(b.massKg+norm(b.position)+norm(b.velocity))||b.massKg<=0)throw Error('需要本次一级实际分离时的完整状态。');
    if(![.25,.125,.0625].includes(stepS))throw Error('不支持的一级参考步长。');
    this.particle={position:[...b.position],velocity:[...b.velocity],fuel:0};this.direction=rotateEarth(b.fixedDirection,source.time);this.time=source.time;this.nextSample=this.time;
    this.record={version:BOOSTER_REFERENCE.version,startTime:this.time,massKg:b.massKg,status:'flying',reason:'分离后的空一级无动力运动；参考模型不包含回收系统。',latest:null!,samples:[],events:[{time:this.time,label:'一级实际分离 · 开始独立参考记录'}],peakAltitudeM:0,peakQPa:0,peakHeatWm2:0};
    this.entry=surfaceAt(b.position).height<=80000;this.refresh(true);
  }
  private model(){return {dry:this.record.massKg,cdArea:BOOSTER_REFERENCE.cd*Math.PI*BOOSTER_REFERENCE.radiusM**2,atmosphere:(h:number)=>this.entry?reentryAtmosphere(Math.max(0,h)):teachingAtmosphere(Math.max(0,h))};}
  private refresh(force=false){
    const p=this.particle,f=ascentForces(p,this.model(),this.time,0),vertical=dot(f.relative,f.up),thermal=this.entry?reentryAtmosphere(Math.max(0,f.height)):null;
    const mach=thermal?f.airSpeed/Math.sqrt(1.4*287.05*thermal.temperatureK):null;
    const heat=thermal&&mach!==null&&mach>=5&&f.height<=80000?stagnationHeatFlux(f.density,f.airSpeed,BOOSTER_REFERENCE.radiusM):null;
    const s:BoosterSample={time:this.time,position:[...p.position],velocity:[...p.velocity],fixedPosition:rotateEarth(p.position,-this.time),fixedDirection:rotateEarth(this.direction,-this.time),altitudeM:f.height,verticalMS:vertical,airSpeedMS:f.airSpeed,density:f.density,pressurePa:f.pressurePa,dragN:f.drag,qPa:.5*f.density*f.airSpeed**2,temperatureK:thermal?.temperatureK??null,mach,heatFluxWm2:heat,model:this.entry?'entry':'coast'};
    this.record.latest=s;this.record.peakAltitudeM=Math.max(this.record.peakAltitudeM,s.altitudeM);this.record.peakQPa=Math.max(this.record.peakQPa,s.qPa);this.record.peakHeatWm2=Math.max(this.record.peakHeatWm2,heat??0);
    if(force||this.time>=this.nextSample-1e-8){if(this.record.samples.at(-1)?.time!==this.time)this.record.samples.push(s);this.nextSample=this.time+BOOSTER_REFERENCE.sampleS;}
  }
  private event(label:string){this.record.events.push({time:this.time,label});}
  /** Fixed steps tied to mission time, including during replay; never computes a future outcome. */
  advanceTo(targetTime:number){
    if(!Number.isFinite(targetTime))return;
    while(this.record.status==='flying'&&this.time+this.stepS<=targetTime+1e-8){
      const old=this.record.latest,model=this.model(),advance=(dt:number)=>integrateAscent(this.particle,model,this.time,dt,()=>0);
      let dt=this.stepS,next=advance(dt);const height=surfaceAt(next.position).height;
      const boundary=!this.entry&&height<=80000&&old.altitudeM>80000?80000:height<=0?0:null;
      if(boundary!==null){let low=0,high=dt;for(let i=0;i<32;i++){const mid=(low+high)/2;if(surfaceAt(advance(mid).position).height>boundary)low=mid;else high=mid;}dt=(low+high)/2;next=advance(dt);}
      if(!Number.isFinite(norm(next.position)+norm(next.velocity))||this.time-this.record.startTime>BOOSTER_REFERENCE.maxElapsedS){this.record.status='stopped';this.record.reason='一级参考模型到达状态或时长限制，未生成地表结论。';this.event(this.record.reason);return;}
      this.particle=next;this.time+=dt;
      if(boundary===80000){this.entry=true;this.event('下降至 80 km · 切换标准参考大气与等效质点显示');}
      if(boundary===0){this.record.status='surface-reference';this.record.reason='一级等效物体到达 0 m 椭球参考面；未判定完整存活、落海、烧毁或回收成功。';this.event('0 m 参考终点 · 材料结局未求解');}
      this.refresh(boundary!==null);
      if(this.wasRising&&this.record.latest.verticalMS<=0){this.wasRising=false;this.event('越过最高点 · 开始下降');this.refresh(true);}
      if(!this.crossed20&&this.record.latest.altitudeM<=20000&&this.record.latest.verticalMS<0){this.crossed20=true;this.event('下降至 20 km 附近 · 继续地表参考下降');this.refresh(true);}
    }
  }
  snapshot(){return structuredClone(this.record);}
}

export function boosterStage(s:BoosterSample){return s.altitudeM<.01&&s.model==='entry'?'地表参考终点':s.model==='entry'?'大气减速与参考下降':s.verticalMS>0?'分离后仍在上升':'越过最高点，向地球下降';}
export function boosterRelativeDirection(s:BoosterSample){return add(s.velocity,scale(airVelocity(s.position),-1));}
