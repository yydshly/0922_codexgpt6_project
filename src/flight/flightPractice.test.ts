import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { createFlightState, stepFlight, targetReading, FLIGHT_STEP } from './flightPractice';
const idle = { thrust: 0, yaw: 0, pitch: 0, roll: 0, brake: false };
describe('local flight practice', () => {
  it('coasts after cutoff and consumes fuel only with thrust', () => {
    const s = createFlightState();
    for(let i=0;i<120;i++) stepFlight(s,{...idle,thrust:1},FLIGHT_STEP,[]);
    expect(s.velocity.z).toBeCloseTo(-.8, 9); expect(s.fuel).toBeCloseTo(99.78, 8);
    const fuel=s.fuel, speed=s.velocity.length(), before=s.position.z;
    for(let i=0;i<120;i++) stepFlight(s,idle,FLIGHT_STEP,[]);
    expect(s.position.z-before).toBeCloseTo(-.8, 9); expect(s.velocity.length()).toBe(speed); expect(s.fuel).toBe(fuel);
  });
  it('steers thrust with the ship, and leaves velocity unchanged while only turning', () => {
    const s=createFlightState(); s.velocity.set(2,0,0);
    stepFlight(s,{...idle,yaw:1},.1,[]); expect(s.velocity.x).toBe(2);
    stepFlight(s,{...idle,thrust:1},.1,[]); expect(s.velocity.x).toBeLessThan(2); expect(s.velocity.z).toBeLessThan(0);
  });
  it('brakes gradually without reversing and cannot thrust after fuel exhaustion', () => {
    const s=createFlightState(); s.velocity.z=-.02;
    stepFlight(s,{...idle,brake:true},.1,[]); expect(s.velocity.length()).toBeCloseTo(0); expect(s.fuel).toBeLessThan(100);
    s.fuel=0; stepFlight(s,{...idle,thrust:1},.1,[]); expect(s.velocity.length()).toBeCloseTo(0); expect(s.firing).toBe(0);
  });
  it('intercepts a swept collision and freezes instead of tunnelling', () => {
    const s=createFlightState(); s.velocity.z=-1000;
    stepFlight(s,idle,.1,[{position:new Vector3(0,0,-50),radius:5,name:'目标'}]);
    expect(s.position.z).toBeGreaterThan(-33.01); expect(s.contact).toContain('目标');
    const z=s.position.z; stepFlight(s,{...idle,thrust:1},.1,[]); expect(s.position.z).toBe(z);
  });
  it('reports closing speed relative to the selected target', () => {
    const s=createFlightState(); s.velocity.set(0,0,-2);
    expect(targetReading(s,new Vector3(0,0,-100),5)).toEqual({distance:100,clearance:83,closing:2});
  });
  it('finishes a fuel-limited burn proportionally without negative fuel',()=>{
    const s=createFlightState();s.fuel=.011;
    stepFlight(s,{...idle,thrust:1},.1,[]);
    expect(s.fuel).toBe(0);expect(s.velocity.z).toBeCloseTo(-.04);
  });
  it('gives the same result for equal fixed steps grouped into different frame rates',()=>{
    const simulate=(perFrame:number)=>{const s=createFlightState();for(let frame=0;frame<240/perFrame;frame++)for(let step=0;step<perFrame;step++)stepFlight(s,{...idle,thrust:1,yaw:.2},FLIGHT_STEP,[]);return s;};
    const a=simulate(2),b=simulate(4);expect(a.position.toArray()).toEqual(b.position.toArray());expect(a.attitude.toArray()).toEqual(b.attitude.toArray());expect(a.fuel).toBe(b.fuel);
  });
});
