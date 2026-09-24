import {describe,it,expect} from 'vitest';
import {solarDemoState,advanceSolarDemo} from './solarActivity';
import {onlyStage,allStages} from './stages';
describe('solar activity illustration timeline',()=>{
 it('clamps invalid input and keeps every state finite',()=>{
  for(const p of [-1,0,.18,.24,.5,1,2,NaN,Infinity]){const state=solarDemoState(p);expect(state.progress).toBeGreaterThanOrEqual(0);expect(state.progress).toBeLessThanOrEqual(1);expect([state.cmeX,state.cmeY,state.cmeRadius,state.flare].every(Number.isFinite)).toBe(true);}
 });
 it('advances by elapsed time independent of display frame rate and stops at the end',()=>{
  let progress=0;for(let i=0;i<120;i++)progress=advanceSolarDemo(progress,1/60);
  expect(progress).toBeCloseTo(advanceSolarDemo(0,2),12);expect(advanceSolarDemo(.95,10)).toBe(1);expect(advanceSolarDemo(.3,0)).toBe(.3);expect(advanceSolarDemo(.3,-1)).toBe(.3);
 });
 it('illustrates a brief flare and a cloud that moves outward and expands',()=>{
  expect(solarDemoState(0).cmeVisible).toBe(false);expect(solarDemoState(.24).flare).toBe(1);expect(solarDemoState(1).flare).toBe(0);
  let previous=solarDemoState(.18);for(let p=.2;p<=1;p+=.05){const next=solarDemoState(p);expect(next.cmeX).toBeGreaterThan(previous.cmeX);expect(next.cmeRadius).toBeGreaterThan(previous.cmeRadius);previous=next;}
 });
 it('isolates the new stage from the Earth modules',()=>{
  const flags=onlyStage('solarActivity');expect(flags.solarActivity).toBe(true);expect(flags.environment).toBe(false);expect(flags.nearEarth).toBe(false);expect(Object.values(flags).filter(Boolean)).toHaveLength(1);expect(allStages().solarActivity).toBe(true);
 });
});
