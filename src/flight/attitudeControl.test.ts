import {describe,it,expect} from 'vitest';
import {Vector3,MathUtils} from 'three';
import {createFlightState,stepFlight,FLIGHT_STEP} from './flightPractice';
import {ATTITUDE_ACCELERATION,ATTITUDE_RATE,pointingInput,attitudeActivity} from './attitudeControl';
import {REACTION_JETS,reactionJetStrength} from './reactionControl';
import {idleInput} from './autopilot';
import {brakingGuidance} from './flightGuidance';

describe('controlled spacecraft rotation',()=>{
  it('builds angular velocity with bounded torque rather than instantly setting the rate',()=>{
    const s=createFlightState();stepFlight(s,{...idleInput(),yaw:1},.1,[]);
    expect(s.angularVelocity.y).toBeCloseTo(ATTITUDE_ACCELERATION*.1,10);
    expect(s.angularVelocity.length()).toBeLessThan(ATTITUDE_RATE);
    expect(s.attitude.angleTo(createFlightState().attitude)).toBeCloseTo(.5*ATTITUDE_ACCELERATION*.1*.1,7);
    expect(s.rcsTorque.y).toBeCloseTo(1);expect(s.fuel).toBeLessThan(100);
  });
  it('uses opposite thrusters to stop rotation after release, with no change in linear velocity',()=>{
    const s=createFlightState();s.velocity.set(2,1,-3);
    for(let i=0;i<120*3;i++)stepFlight(s,{...idleInput(),yaw:1},FLIGHT_STEP,[]);
    expect(s.angularVelocity.length()).toBeCloseTo(ATTITUDE_RATE,9);const angle=s.attitude.clone(),fuel=s.fuel;
    stepFlight(s,idleInput(),FLIGHT_STEP,[]);expect(s.rcsTorque.y).toBeLessThan(0);expect(s.angularVelocity.y).toBeGreaterThan(0);
    expect(attitudeActivity(s.angularVelocity,s.rcsTorque)).toContain('制止');expect(s.attitude.angleTo(angle)).toBeGreaterThan(0);
    for(let i=0;i<120*3;i++)stepFlight(s,idleInput(),FLIGHT_STEP,[]);
    expect(s.angularVelocity.length()).toBeCloseTo(0,10);expect(s.fuel).toBeLessThan(fuel);expect(s.velocity.toArray()).toEqual([2,1,-3]);
  });
  it('cannot start or stop a turn without propellant',()=>{
    const s=createFlightState();s.fuel=0;stepFlight(s,{...idleInput(),yaw:1},.1,[]);expect(s.angularVelocity.length()).toBe(0);
    s.angularVelocity.y=.05;const attitude=s.attitude.clone();stepFlight(s,idleInput(),.1,[]);
    expect(s.angularVelocity.y).toBe(.05);expect(s.rcsTorque.length()).toBe(0);expect(s.attitude.angleTo(attitude)).toBeCloseTo(.005,7);
  });
  it('reserves fuel for counter-rotation as well as stopping translation',()=>{
    const s=createFlightState();s.velocity.z=-.8;s.angularVelocity.y=ATTITUDE_RATE;s.fuel=.23;
    const guidance=brakingGuidance(s,[]);expect(guidance.fuelRequired).toBeGreaterThan(.23);expect(guidance.level).toBe('fuel');expect(guidance.stoppingDistance).toBeNull();
  });
  it.each([new Vector3(0,0,1),new Vector3(1,4,2),new Vector3(-1,2,-3)])('points along a short rotation to %s without a commanded bank',direction=>{
    const s=createFlightState();let swept=0;
    for(let i=0;i<120*45;i++){
      const before=s.attitude.clone(),input={...idleInput(),...pointingInput(s.attitude,direction)};
      expect(input.roll).toBe(0);stepFlight(s,input,FLIGHT_STEP,[]);swept+=before.angleTo(s.attitude);
      expect(s.angularVelocity.length()).toBeLessThanOrEqual(ATTITUDE_RATE+1e-9);
    }
    const angle=new Vector3(0,0,-1).applyQuaternion(s.attitude).angleTo(direction);
    expect(MathUtils.radToDeg(angle)).toBeLessThan(.1);expect(swept).toBeLessThan(Math.PI+.02);
  });
});

describe('reaction-control jet allocation',()=>{
  const resultant=(torque:Vector3,translation=new Vector3())=>{
    const force=new Vector3(),moment=new Vector3();let active=0;
    for(const jet of REACTION_JETS){const strength=reactionJetStrength(jet,torque,translation);if(strength>0)active++;
      const f=new Vector3(...jet.exhaust).multiplyScalar(-strength);force.add(f);moment.add(new Vector3(...jet.position).cross(f));}
    return {force,moment,active};
  };
  it.each(['x','y','z'] as const)('uses a balanced pair for each sign of %s rotation',axis=>{
    for(const sign of [-1,1]){const torque=new Vector3();torque[axis]=sign;const r=resultant(torque);
      expect(r.active).toBe(2);expect(r.force.length()).toBeCloseTo(0);expect(r.moment[axis]*sign).toBeGreaterThan(0);
      r.moment[axis]=0;expect(r.moment.length()).toBeCloseTo(0);
    }
  });
  it.each(['x','y','z'] as const)('opposes exhaust for %s translation without adding torque',axis=>{
    const input=new Vector3();input[axis]=1;const r=resultant(new Vector3(),input);
    expect(r.force[axis]).toBeGreaterThan(0);expect(r.moment.length()).toBeCloseTo(0);
  });
});
