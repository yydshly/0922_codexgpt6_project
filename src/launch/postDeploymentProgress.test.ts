import { describe, expect, it } from 'vitest';
import { LiftoffSimulation, type FlightState } from './liftoff';
import { BASELINE_VEHICLE } from './vehicle';
import { postDeploymentProgress, taskResultMarkdown } from './postDeploymentProgress';
import { missionProgress } from './missionProgress';
import { DEORBIT } from './deorbit';

// Only fields read by the reporting layer are supplied; these are not solver inputs.
const initial = () => new LiftoffSimulation(BASELINE_VEHICLE).snapshot();
function deployed() {
  const s = initial();s.time=7000;s.phase='deployment-complete';s.ascent={} as FlightState['ascent'];s.orbit={} as FlightState['orbit'];
  s.deployment={verified:true,released:true,carrier:{massKg:5000,altitudeM:401000},satellite:{massKg:500,altitudeM:399000,elements:{periapsisM:380000}}} as FlightState['deployment'];return s;
}
function working() {
  const s=deployed();s.time=16000;s.phase='ops-complete';
  s.deployment!.avoidance={started:true,elapsedS:900,fuelUsedKg:5} as NonNullable<FlightState['deployment']>['avoidance'];
  s.operations={origin:'P1',carrierRecordTime:7900,collectedMB:240,deliveredMB:240,bufferMB:0,energyJ:360000,capacityJ:2880000} as FlightState['operations'];return s;
}
const step=(s:FlightState,id:string)=>postDeploymentProgress(s).steps.find(p=>p.id===id)!;

describe('post-deployment results are derived from the selected route',()=>{
  it('does not grant any post-deployment result from launch or deployment alone',()=>{
    expect(postDeploymentProgress(initial()).records).toEqual([]);
    expect(postDeploymentProgress(deployed()).steps.every(p=>p.status==='pending')).toBe(true);
    expect(taskResultMarkdown(initial(),'等待检查')).toContain('尚未进入部署段');
  });
  it('does not call planning, turning or ignition a completed separation check',()=>{
    const s=deployed();s.phase='avoidance-review';s.deployment!.avoidance={started:false,elapsedS:0,fuelUsedKg:0} as NonNullable<FlightState['deployment']>['avoidance'];
    expect(step(s,'P1').status).toBe('checkpoint');s.phase='avoidance-cutoff';s.deployment!.avoidance!.started=true;s.deployment!.avoidance!.elapsedS=18;
    expect(step(s,'P1').status).toBe('checkpoint');
    s.phase='avoidance-complete';s.deployment!.avoidance!.elapsedS=900;expect(step(s,'P1').status).toBe('complete');
  });
  it('requires completed passivation, not just a locked restart flag',()=>{
    const s=working();delete s.operations;s.phase='deorbit-passivating';
    s.deployment!.deorbit={cutoffVerified:true,restartLocked:true,passivationElapsedS:1,fuelBurnedKg:60,propellantVentedKg:1} as NonNullable<FlightState['deployment']>['deorbit'];
    expect(step(s,'P2').status).toBe('active');s.deployment!.deorbit!.passivationElapsedS=DEORBIT.passivateS;s.phase='deorbit-complete';
    expect(step(s,'P2').status).toBe('complete');expect(step(s,'P2').detail).toContain('不等于已烧毁');
  });
  it('keeps unvisited carrier stages separate from completed satellite work',()=>{
    const s=working(),r=postDeploymentProgress(s);
    expect(r.steps.map(p=>p.status)).toEqual(['complete','unvisited','unvisited','complete','pending']);
    expect(r.records[0].historical).toBe(true);expect(r.records[0].time).toBe(7900);expect(r.records[1].time).toBe(16000);expect(r.records[1].historical).toBe(false);
    expect(r.records[0].boundary).toContain('不是当前二级位置');expect(r.records[0].outcome).toContain('未执行离轨');
  });
  it('labels the 20 km result a model boundary even during later satellite flight',()=>{
    const s=working();s.operations!.origin='P3';s.reentry={outcome:'model-boundary',elapsedS:2100,peakHeat:{value:900000}} as FlightState['reentry'];s.deployment!.carrier.altitudeM=20000;
    const r=postDeploymentProgress(s);expect(step(s,'P3').status).toBe('boundary');expect(r.records[0].outcome).toContain('20 km');expect(r.records[0].facts[0]).toContain('20.00 km');expect(r.records[1].facts[0]).toContain('399.00 km');
    expect(step(s,'P3').facts.join()).toContain('900.0 kW/m²');expect(step(s,'P3').detail).toContain('未计算后续落点');
  });
  it('does not count onboard observation data as delivered',()=>{
    const s=working();s.phase='ops-data-ready';s.operations!.bufferMB=240;s.operations!.deliveredMB=0;
    expect(step(s,'P4').status).toBe('checkpoint');s.phase='ops-downlink';expect(step(s,'P4').status).toBe('active');
  });
  it.each(['deorbit-failed','reentry-failed','ops-failed','life-failed'] as const)('shows %s without erasing earlier deployment checks',phase=>{
    const s=working();s.phase=phase;s.message='保留停止原因';
    if(phase==='reentry-failed')s.reentry={outcome:'stopped',elapsedS:123,peakHeat:null} as FlightState['reentry'];
    expect(missionProgress(s).failed).toBe(true);expect(missionProgress(s).checksPassed).toBe(4);expect(missionProgress(s).statuses[5]).toBe('passed');expect(missionProgress(s).result).toContain('保留停止原因');
    expect(postDeploymentProgress(s).stopped).toBe(true);expect(postDeploymentProgress(s).next).toContain('保留停止原因');
    const id={'deorbit-failed':'P2','reentry-failed':'P3','ops-failed':'P4','life-failed':'P5'}[phase];expect(step(s,id).status).toBe('stopped');
  });
  it('distinguishes retaining work, retirement, and finished post-retirement observation',()=>{
    const s=working();s.lifecycle={mode:'working',elapsedS:5600,isolated:false} as FlightState['lifecycle'];s.phase='life-working';
    expect(step(s,'P5').status).toBe('checkpoint');expect(step(s,'P5').detail).toContain('尚未退役');
    s.lifecycle!.mode='retired';s.lifecycle!.isolated=true;s.phase='life-retired';expect(postDeploymentProgress(s).branchFinished).toBe(false);
    s.phase='life-observed';expect(postDeploymentProgress(s).branchFinished).toBe(true);expect(step(s,'P5').status).toBe('complete');expect(postDeploymentProgress(s).records[1].outcome).toContain('未完成处置');
  });
  it('exports the same result without mutating resources, events or saved state',()=>{
    const s=working(),before=structuredClone(s),text=taskResultMarkdown(s,'观测数据已下传');
    expect(s).toEqual(before);expect(text).toContain('本次未执行');expect(text).toContain('历史记录：T + 7900.0 s');expect(text).toContain('当前计算：T + 16000.0 s');expect(text).toContain('不是可恢复的飞行存档');expect(text).toContain('不代表用户验收');
  });
});
