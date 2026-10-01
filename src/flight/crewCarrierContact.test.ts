import {describe,expect,it} from 'vitest';
import {Quaternion,Vector3} from 'three';
import {LAUNCH_EARTH} from '../data/launchMission';
import {airVelocity,type V3} from '../launch/ascent';
import {CrewMission,createCrewMission,crewIdle} from './crewMission';
import {CREW_CARRIER_GEOMETRY as g,CREW_CARRIER_SOLID_EXTENTS as solid,crewCarrierContactFrame} from './crewCarrierGeometry';

const position=(h:number):V3=>[LAUNCH_EARTH.semiMajorM+h,0,0];
const upright=()=>new Quaternion().setFromUnitVectors(new Vector3(0,0,-1),new Vector3(1,0,0));
const pilotAscent=()=>{
  const m=createCrewMission();m.startPilot();expect(m.pilotAction('ignite')).toBe(true);
  while(m.snapshot().pilot.pendingAction!=='release')m.step();
  expect(m.pilotAction('release')).toBe(true);m.takeOver();m.setPilotThrottle(0);return m;
};
describe('connected crew carrier first ground contact',()=>{
  it('uses the first-stage nozzle lip 62 m below the capsule reference, not reference height zero',()=>{
    const frame=crewCarrierContactFrame(position(solid.boosterLipZ-.01),upright(),'booster');
    expect(frame.referenceHeightM).toBeGreaterThan(62);expect(frame.clearanceM).toBeCloseTo(-.01,7);
    expect(frame.lowestBodyPoint.z).toBeCloseTo(solid.boosterLipZ);
    expect(solid.boosterLipZ).toBeGreaterThan(g.boosterExitZ);
  });
  it('removes the first-stage envelope after separation and uses the upper nozzle lip about 28 m below reference',()=>{
    const upper=crewCarrierContactFrame(position(solid.upperLipZ-.01),upright(),'upper');
    expect(upper.referenceHeightM).toBeGreaterThan(27);expect(upper.clearanceM).toBeCloseTo(-.01,7);
    expect(upper.lowestBodyPoint.z).toBeCloseTo(solid.upperLipZ);
    expect(crewCarrierContactFrame(position(35),upright(),'upper').clearanceM).toBeGreaterThan(7);
    expect(crewCarrierContactFrame(position(35),upright(),'booster').clearanceM).toBeLessThan(-27);
  });
  it('detects the capsule nose first when a connected vehicle is inverted',()=>{
    const inverted=new Quaternion().setFromUnitVectors(new Vector3(0,0,-1),new Vector3(-1,0,0));
    const frame=crewCarrierContactFrame(position(5.29),inverted,'booster');
    expect(frame.clearanceM).toBeCloseTo(-.01,7);expect(frame.lowestBodyPoint.z).toBe(-5.3);
  });
  it('finds circle minima analytically for tilted sections without depending on sampled circumferential points',()=>{
    const angle=Math.PI/6,q=new Quaternion().setFromUnitVectors(new Vector3(0,0,-1),new Vector3(Math.cos(angle),Math.sin(angle),0));
    const drop=solid.boosterLipZ*Math.cos(angle)+solid.boosterLipEnvelopeRadiusM*Math.sin(angle);
    const frame=crewCarrierContactFrame(position(drop+.01),q,'booster');
    expect(frame.clearanceM).toBeCloseTo(.01,7);
    const rolled=q.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(0,0,1),.437));
    expect(crewCarrierContactFrame(position(drop+.01),rolled,'booster').clearanceM).toBeCloseTo(frame.clearanceM,8);
  });
  it('does not classify ignition exhaust below the ground as a solid contact or treat the raised deck as a full ground plane',()=>{
    const frame=crewCarrierContactFrame(position(g.shipReferenceHeightM),upright(),'booster');
    expect(frame.clearanceM).toBeCloseTo(g.padDeckM-(solid.boosterLipZ-g.boosterExitZ),7);
    expect(frame.clearanceM).toBeGreaterThan(8);expect(frame.clearanceM-24).toBeLessThan(0);
  });
  it('publishes actual connected-body clearance on the nominal launch pad',()=>{
    const s=createCrewMission().snapshot(),frame=crewCarrierContactFrame(s.position,new Quaternion(...s.attitude),'booster');
    expect(s.lowestPointClearanceM).toBeCloseTo(frame.clearanceM,9);expect(s.lowestPointClearanceM).toBeGreaterThan(8);
  });
  it('stops at a fractional-step first contact with the same-time position, velocity, orientation and angular velocity',()=>{
    const m=pilotAscent();m.position=position(solid.boosterLipZ+.01);m.attitude.copy(upright());m.angularVelocity.set(.01,0,0);
    m.velocity=new Vector3(...airVelocity(m.position)).add(new Vector3(-1,0,0)).toArray() as V3;
    const beforeTime=m.time,beforeQ=m.attitude.clone(),beforeW=m.angularVelocity.clone(),fuel=m.boosterFuel;
    m.step(.1,crewIdle());const s=m.snapshot(),elapsed=m.time-beforeTime;
    expect(s.phase,s.message).toBe('failed');expect(elapsed).toBeGreaterThan(0);expect(elapsed).toBeLessThan(.1);
    expect(s.time).toBe(s.events.at(-1)?.time);expect(s.altitudeM).toBeGreaterThan(62);
    expect(Math.abs(s.lowestPointClearanceM)).toBeLessThan(1e-7);
    expect(m.attitude.angleTo(beforeQ)).toBeCloseTo(beforeW.length()*elapsed,7);
    expect(m.angularVelocity.toArray()).toEqual(beforeW.toArray());expect(m.boosterFuel).toBe(fuel);
    expect(s.message).toContain('实体包络');expect(s.message).toContain('台架');expect(s.recoveryReady).toBe(false);
    expect(CrewMission.restore(m.save()).snapshot()).toEqual(s);m.step();expect(m.snapshot()).toEqual(s);
  });
  it('keeps a nominal autonomous launch clear through actual booster and upper-stage operation',()=>{
    const m=createCrewMission();m.startPilot();let min=Infinity;
    for(let i=0;i<20000&&m.phase!=='approach'&&m.phase!=='failed';i++){
      const s=m.snapshot();min=Math.min(min,s.lowestPointClearanceM);
      if(s.pilot.pendingAction)expect(m.pilotAction(s.pilot.pendingAction),s.message).toBe(true);else m.step();
    }
    expect(m.phase,m.message).toBe('approach');expect(min).toBeGreaterThan(8);
  },30000);
});
