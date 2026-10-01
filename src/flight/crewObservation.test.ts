import {beforeAll,describe,expect,it} from 'vitest';
import {Object3D,Quaternion,Vector3} from 'three';
import {LAUNCH_EARTH} from '../data/launchMission';
import {CREW_VEHICLE,createCrewMission,type CrewSnapshot} from './crewMission';
import {CREW_GROUND_OPTICS,crewCockpitReading,crewGroundView,crewObservation,crewPilotView,earthRayDistance} from './crewObservation';

const radius=LAUNCH_EARTH.semiMajorM;
const polarRadius=radius*(1-1/LAUNCH_EARTH.inverseFlattening);
const opticsRadius=2.60,opticsAzimuth=Math.PI/8;
let initial:CrewSnapshot;
beforeAll(()=>{initial=createCrewMission().snapshot();});

function freeze<T>(value:T):T{
  if(value!==null&&typeof value==='object'){
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
const snapshot=(overrides:Partial<CrewSnapshot>={})=>freeze({...structuredClone(initial),...overrides});
const upright=new Quaternion().setFromUnitVectors(new Vector3(0,0,-1),new Vector3(1,0,0));
const returned=(altitudeM:number,attitude=upright)=>snapshot({phase:'landing',carrierStage:'none',serviceAttached:false,
  position:[radius+altitudeM,0,0],altitudeM,attitude:attitude.toArray()});
const expectVector=(actual:Vector3,expected:Vector3)=>expect(actual.distanceTo(expected)).toBeLessThan(1e-10);

describe('crew observation camera references',()=>{
  it('moves the eye with the same rotating head pivot instead of looking from a detached point',()=>{
    const q=new Quaternion().setFromAxisAngle(new Vector3(1,1,0).normalize(),.7),pivot=new Vector3(0,1.58,-2.65),eye=pivot.clone().add(new Vector3(0,0,-.22));
    const head={x:.4,y:-.6},view=crewPilotView(q.toArray(),eye,head,pivot),body=new Object3D(),headObject=new Object3D();
    body.quaternion.copy(q);headObject.position.copy(pivot);headObject.rotation.set(head.y,head.x,0,'YXZ');body.add(headObject);body.updateMatrixWorld(true);
    expectVector(view.position,headObject.localToWorld(new Vector3(0,0,-.22)));expect(view.position.distanceTo(eye.clone().applyQuaternion(q))).toBeGreaterThan(.1);
    expect(view.forward.dot(view.up)).toBeCloseTo(0,12);
  });
  it('keeps the pilot eye attached to the cabin and rolls image-up with the pilot',()=>{
    const attitude=freeze(new Quaternion().setFromAxisAngle(new Vector3(0,0,1),Math.PI/2).toArray());
    const eye=freeze(new Vector3(0,1.5,-2.9)),head=freeze({x:Math.PI/2,y:0});
    const view=crewPilotView(attitude,eye,head);
    expectVector(view.position,new Vector3(-1.5,0,-2.9));
    expectVector(view.forward,new Vector3(0,-1,0));
    expectVector(view.up,new Vector3(-1,0,0));
    expect(view.forward.dot(view.up)).toBeCloseTo(0,12);
    expectVector(new Vector3(0,0,-1).applyQuaternion(view.orientation),view.forward);
    expectVector(eye,new Vector3(0,1.5,-2.9));
  });

  it('retains the fixed outboard mount and body +Z gaze instead of pointing itself at Earth',()=>{
    const s=snapshot({phase:'entry',carrierStage:'none',serviceAttached:false,position:[radius+80000,0,0],attitude:[0,0,0,1]});
    const view=crewGroundView(s);
    expectVector(view.position,new Vector3(opticsRadius*Math.cos(opticsAzimuth),opticsRadius*Math.sin(opticsAzimuth),.24));
    expect(Math.hypot(view.position.x,view.position.y)).toBeCloseTo(opticsRadius,12);
    expectVector(view.forward,new Vector3(0,0,1));
    expectVector(view.up,new Vector3(0,1,0));
    expectVector(new Vector3(0,0,-1).applyQuaternion(view.orientation),view.forward);
    expect(view.downAngleDeg).toBeCloseTo(90,10);
    expect(view.available).toBe(true);
    expect(view.rangeM).toBeNull();
  });

  it('shows craft roll in the fixed camera feed while preserving its base-side gaze',()=>{
    const plain=crewGroundView(returned(500));
    const rolled=crewGroundView(returned(500,upright.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(0,0,1),Math.PI/2))));
    expectVector(rolled.forward,plain.forward);
    expect(rolled.up.dot(plain.up)).toBeCloseTo(0,12);
    expect(rolled.up.dot(rolled.forward)).toBeCloseTo(0,12);
    expect(rolled.position.length()).toBeCloseTo(Math.hypot(opticsRadius,.24),10);
    expect(rolled.downAngleDeg).toBeCloseTo(0,5);
  });

  it.each([1.7,500,400000])('intersects the reference Earth at %s m without losing near-contact precision',altitudeM=>{
    const s=returned(altitudeM),view=crewGroundView(s);
    expect(view.cameraHeightM).toBeGreaterThan(0);
    expect(view.rangeM).not.toBeNull();
    expect(view.rangeM!).toBeCloseTo(altitudeM-CREW_GROUND_OPTICS.position[2],4);
    const hit=new Vector3(...s.position).add(view.position).addScaledVector(view.forward,view.rangeM!);
    expect((hit.x**2+hit.y**2)/radius**2+hit.z**2/polarRadius**2).toBeCloseTo(1,12);
  });

  it('uses the oblate polar radius and rejects outward, tangent and underground rays',()=>{
    expect(earthRayDistance(new Vector3(0,0,polarRadius+400000),new Vector3(0,0,-10))).toBeCloseTo(400000,6);
    expect(earthRayDistance(new Vector3(radius+10,0,0),new Vector3(-2,0,0))).toBeCloseTo(10,6);
    expect(earthRayDistance(new Vector3(radius+10,0,0),new Vector3(1,0,0))).toBeNull();
    expect(earthRayDistance(new Vector3(radius+10,0,0),new Vector3(0,1,0))).toBeNull();
    expect(earthRayDistance(new Vector3(radius-1,0,0),new Vector3(-1,0,0))).toBeNull();
  });

  it('reports unavailable or missed ground views without changing craft attitude',()=>{
    const attached=snapshot({...returned(500),serviceAttached:true});
    expect(crewObservation(attached).available).toBe(false);
    expect(crewObservation(attached).rangeM).toBeNull();
    const reversed=returned(500,new Quaternion().setFromUnitVectors(new Vector3(0,0,-1),new Vector3(-1,0,0)));
    const before=structuredClone(reversed),view=crewObservation(reversed);
    expect(view.available).toBe(true);
    expect(view.downAngleDeg).toBeCloseTo(180,10);
    expect(view.rangeM).toBeNull();
    expect(view.feedDescription).toContain('未指向地面');
    expect(reversed).toEqual(before);
    const buried=crewObservation(returned(.1));
    expect(buried.cameraHeightM).toBeLessThan(0);
    expect(buried.rangeM).toBeNull();
  });
});

describe('phase-specific crew cockpit instruments',()=>{
  it.each([2,-2])('uses platform-relative speed and signed closing rate %s m/s in orbit',closing=>{
    const s=snapshot({phase:'observe',carrierStage:'none',serviceAttached:true,position:[radius+400000,0,0],targetPosition:[radius+400100,0,0],
      velocity:[1+closing,7700,0],targetVelocity:[1,7700,0],distanceM:100,relativeSpeedMS:2,orbitalSpeedMS:7700,
      pointingDeg:4,serviceFuelKg:312,landingFuelKg:99,launchFuelKg:0});
    expect(crewCockpitReading(s)).toMatchObject({mode:'orbit',distance:100,closing,speed:2,bearing:4,fuel:312,fuelCaption:'SERVICE FUEL / kg'});
  });

  it('replaces orbital target readings with actual altitude, descent speed, clearance and tilt',()=>{
    const s=snapshot({...returned(1.8),distanceM:800000,relativeSpeedMS:4000,pointingDeg:160,
      verticalMS:-1.2,groundSpeedMS:2.4,lowestPointClearanceM:0,landingTiltDeg:3,properG:1.2,landingFuelKg:55,
      mainFraction:.9,thrust:[0,0,CREW_VEHICLE.landingThrustN*.4]});
    expect(crewCockpitReading(s)).toMatchObject({mode:'landing',distance:1.8,closing:-1.2,speed:2.4,clearanceM:0,bearing:3,
      loadG:1.2,fuel:55,firing:.4,fuelCaption:'LANDING FUEL / kg',thrustCaption:'LANDING ENGINE'});
  });

  it.each(['booster','upper'] as const)('uses the remaining %s launch fuel in tonnes',carrierStage=>{
    const ratedThrust=carrierStage==='booster'?CREW_VEHICLE.boosterThrustN:CREW_VEHICLE.upperThrustN;
    const s=snapshot({phase:carrierStage==='booster'?'ascent':'upper',carrierStage,serviceAttached:true,altitudeM:20000,
      verticalMS:320,groundSpeedMS:440,launchFuelKg:45000,serviceFuelKg:900,landingFuelKg:100,
      mainFraction:.1,thrust:[0,0,ratedThrust*.65]});
    expect(crewCockpitReading(s)).toMatchObject({mode:'launch',distance:20000,closing:320,speed:440,fuel:45,
      firing:.65,fuelCaption:'LAUNCH FUEL / t',thrustCaption:'LAUNCH ENGINE'});
  });

  it('leaves physical snapshots and eye inputs immutable and returns independent display vectors',()=>{
    const s=returned(1.7),before=structuredClone(s),eye=freeze(new Vector3(0,1.5,-2.9));
    const pilot=crewPilotView(s.attitude,eye),ground=crewGroundView(s),observation=crewObservation(s);
    crewCockpitReading(s);
    pilot.position.set(9,8,7);ground.position.set(6,5,4);observation.forward.set(3,2,1);
    expect(s).toEqual(before);
    expectVector(eye,new Vector3(0,1.5,-2.9));
    expectVector(crewGroundView(s).forward,new Vector3(-1,0,0));
  });
});
