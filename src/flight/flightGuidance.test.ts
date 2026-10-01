import { describe,expect,it } from 'vitest';
import { PerspectiveCamera,Vector3 } from 'three';
import { createFlightState,FLIGHT_STEP,stepFlight } from './flightPractice';
import { brakingGuidance,directionOnScreen,steeringToTarget } from './flightGuidance';

const idle={thrust:0,yaw:0,pitch:0,roll:0,brake:false};
describe('local flight guidance',()=>{
  it('matches a full B burn in the actual integrator',()=>{
    const state=createFlightState();state.velocity.set(3,0,-4);
    const predicted=brakingGuidance(state,[]),fuel=state.fuel;
    for(let i=0;i<900;i++)stepFlight(state,{...idle,brake:true},FLIGHT_STEP,[]);
    expect(state.velocity.length()).toBeCloseTo(0,7);
    expect(state.position.length()).toBeCloseTo(predicted.stoppingDistance!,5);
    expect(fuel-state.fuel).toBeCloseTo(predicted.fuelRequired,7);
  });
  it('warns against a swept contact on the velocity line',()=>{
    const state=createFlightState();state.velocity.set(0,0,-10);
    const risk=brakingGuidance(state,[{position:new Vector3(0,0,-60),radius:8,name:'卫星'}]);
    expect(risk.firstContactDistance).toBe(40);expect(risk.stoppingDistance).toBe(62.5);expect(risk.level).toBe('danger');
  });
  it('does not treat radial clearance as distance along a sideways coast',()=>{
    const state=createFlightState();state.velocity.set(4,0,0);
    const risk=brakingGuidance(state,[{position:new Vector3(0,0,-30),radius:8,name:'卫星'}]);
    expect(risk.firstContactDistance).toBeNull();expect(risk.margin).toBeNull();expect(risk.level).toBe('clear');
  });
  it('accounts for fuel and cannot claim a finite stop with no fuel',()=>{
    const state=createFlightState();state.velocity.z=-8;state.fuel=.1;
    const risk=brakingGuidance(state,[]);expect(risk.stoppingDistance).toBeNull();expect(risk.level).toBe('fuel');
    state.velocity.set(0,0,0);state.fuel=0;expect(brakingGuidance(state,[]).stoppingDistance).toBe(0);expect(brakingGuidance(state,[]).level).toBe('fuel');
  });
  it('uses the nearest intersected object rather than the selected target alone',()=>{
    const state=createFlightState();state.velocity.z=-3;
    const risk=brakingGuidance(state,[{position:new Vector3(0,0,-130),radius:8,name:'目标'},{position:new Vector3(0,0,-25),radius:3,name:'级段'}]);
    expect(risk.obstacleName).toBe('级段');expect(risk.firstContactDistance).toBe(10);expect(risk.level).toBe('caution');
  });
  it('steering cues follow body rotation, including aft targets',()=>{
    const state=createFlightState(),target=new Vector3(0,0,-100);
    state.attitude.setFromAxisAngle(new Vector3(0,1,0),-.5);
    expect(steeringToTarget(state,target).cue).toContain('左转');
    expect(steeringToTarget(state,new Vector3(0,0,100)).behind).toBe(true);
  });
  it('keeps an exact rear target at the edge, not on the forward reticle',()=>{
    const camera=new PerspectiveCamera(72,1.2,.1,10000);
    const rear=directionOnScreen(new Vector3(0,0,1),camera)!;
    expect(rear.behind).toBe(true);expect(rear.offscreen).toBe(true);expect(rear.x).toBeCloseTo(.78);
    expect(directionOnScreen(new Vector3(0,0,-1),camera)?.offscreen).toBe(false);
    expect(directionOnScreen(new Vector3(),camera)).toBeNull();
  });
  it('changes only the HUD projection when the pilot looks aside',()=>{
    const camera=new PerspectiveCamera(72,1.2,.1,10000),direction=new Vector3(0,0,-1);
    const center=directionOnScreen(direction,camera)!;camera.rotation.y=-.6;
    const looked=directionOnScreen(direction,camera)!;
    expect(center.x).toBe(0);expect(looked.x).toBeLessThan(0);expect(direction.toArray()).toEqual([0,0,-1]);
  });
});
