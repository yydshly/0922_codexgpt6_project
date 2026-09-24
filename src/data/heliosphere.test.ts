import {describe,it,expect} from 'vitest';
import {advanceHelioDemo,HELIO_RADII,helioWindPoint,neutralPoint,inHelioCut} from './heliosphere';
import {allStages,onlyStage,stagedLayers} from './stages';
import {defaultMacroLayers} from './macroLayers';
describe('heliosphere teaching geometry',()=>{
 it('keeps the internal wind illustration inside the termination shock for all phases',()=>{
  for(const p of [0,.1,.5,1,NaN,Infinity,-1,2])for(let i=0;i<240;i++){
   const r=Math.hypot(...helioWindPoint(i,p));expect(r).toBeGreaterThanOrEqual(.8-1e-10);expect(r).toBeLessThan(HELIO_RADII.shock);
  }
 });
 it('illustrates neutral particles outside and inside without a wall clamp',()=>{
  expect(Math.hypot(...neutralPoint(0,0))).toBeGreaterThan(HELIO_RADII.pause);
  expect(Math.hypot(...neutralPoint(0,.5))).toBeLessThan(HELIO_RADII.shock);
  expect(Math.hypot(...neutralPoint(0,.99))).toBeGreaterThan(HELIO_RADII.pause);
 });
 it('removes only the intended quadrant and advances independent of frame rate',()=>{
  expect(inHelioCut(1,1)).toBe(true);for(const p of [[-1,1],[1,-1],[-1,-1],[0,1]])expect(inHelioCut(...p as [number,number])).toBe(false);
  let p=0;for(let i=0;i<120;i++)p=advanceHelioDemo(p,1/60);expect(p).toBeCloseTo(advanceHelioDemo(0,2),12);expect(advanceHelioDemo(.99,10)).toBe(1);expect(advanceHelioDemo(.2,-2)).toBe(.2);
 });
 it('keeps the new stage independent of the original macro boundary and other modules',()=>{
  const only=onlyStage('heliosphereExplorer');expect(Object.values(only).filter(Boolean)).toHaveLength(1);expect(stagedLayers(defaultMacroLayers(),only).heliosphere).toBe(false);
  const all=allStages();all.heliosphereExplorer=false;expect(stagedLayers({...defaultMacroLayers(),heliosphere:true},all).heliosphere).toBe(true);
 });
});
