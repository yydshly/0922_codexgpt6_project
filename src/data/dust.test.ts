import {describe,it,expect} from 'vitest';
import {advanceDustDemo,debrisPoint,meteorDemoState} from './dust';
import {onlyStage,allStages} from './stages';
describe('dust and meteor teaching geometry',()=>{
 it('does not emit a meteor glow outside the illustrative atmosphere or reach the ground',()=>{
  let glowingFrames=0;
  for(let i=0;i<=1000;i++){
   const m=meteorDemoState(i/1000),radius=Math.hypot(m.x,m.y+2.5);
   if(m.glow){expect(radius).toBeLessThan(3.3);expect(m.visible).toBe(true);glowingFrames++;}
   expect(radius).toBeGreaterThan(2.5);
  }
  expect(glowingFrames).toBeGreaterThan(0);expect(meteorDemoState(1).visible).toBe(false);
 });
 it('provides a closed debris stream with positive and negative height and an Earth-path intersection',()=>{
  const first=debrisPoint(0),last=debrisPoint(2*Math.PI);
  first.forEach((v,i)=>expect(last[i]).toBeCloseTo(v,10));
  expect(first).toEqual([4,0,0]);expect(debrisPoint(Math.PI/2)[1]).toBeGreaterThan(2);expect(debrisPoint(3*Math.PI/2)[1]).toBeLessThan(-2);
 });
 it('clamps progress, advances consistently across frame rates and stops on completion',()=>{
  let p=0;for(let i=0;i<120;i++)p=advanceDustDemo(p,1/60);
  expect(p).toBeCloseTo(advanceDustDemo(0,2),12);expect(advanceDustDemo(.9,20)).toBe(1);expect(advanceDustDemo(.2,-3)).toBe(.2);
  for(const input of [NaN,Infinity,-2,2]){const state=meteorDemoState(input);expect(state.progress).toBeGreaterThanOrEqual(0);expect(state.progress).toBeLessThanOrEqual(1);expect(Number.isFinite(state.x)).toBe(true);}
 });
 it('isolates the new illustration without enabling solar activity or changing other stage gates',()=>{
  expect(Object.values(onlyStage('dustExplorer')).filter(Boolean)).toHaveLength(1);expect(onlyStage('dustExplorer').solarActivity).toBe(false);expect(allStages().dustExplorer).toBe(true);
 });
});
