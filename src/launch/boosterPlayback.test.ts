import { describe, expect, it } from 'vitest';
import { advanceBoosterPlayback, boosterPlaybackSample } from './boosterPlayback';
import { rotateEarth, surfaceAt, type V3 } from './ascent';
import type { BoosterRecord, BoosterSample } from './boosterDescent';

function point(time:number):BoosterSample {
 const position:V3=[6500000+3*time*time,2*time,0],velocity:V3=[6*time,2,0];
 return {time,position,velocity,fixedPosition:rotateEarth(position,-time),fixedDirection:[0,1,0],altitudeM:surfaceAt(position).height,verticalMS:6*time,airSpeedMS:6*time,density:0,pressurePa:0,dragN:0,qPa:0,temperatureK:null,mach:null,heatFluxWm2:null,model:'coast'};
}
const record=():BoosterRecord=>({version:'test',startTime:100,massKg:14000,status:'surface-reference',reason:'test',samples:[point(100),point(102),point(104)],latest:point(105),events:[],peakAltitudeM:1,peakQPa:0,peakHeatWm2:0});
describe('First-stage recorded playback',()=>{
 it('interpolates an accelerated path and its velocity at the same playback time without modifying records',()=>{
  const r=record(),copy=structuredClone(r),sample=boosterPlaybackSample(r,101);
  expect(sample.position[0]).toBeCloseTo(point(101).position[0],6);expect(sample.velocity).toEqual(point(101).velocity);
  expect(sample.fixedPosition).toEqual(rotateEarth(sample.position,-101));expect(sample.altitudeM).toBeCloseTo(surfaceAt(sample.position).height,6);
  expect(sample.heatFluxWm2).toBeNull();expect(r).toEqual(copy);
 });
 it('clamps to recorded endpoints and includes the latest state between scheduled samples',()=>{
  const r=record();expect(boosterPlaybackSample(r,0)).toBe(r.samples[0]);expect(boosterPlaybackSample(r,10000)).toBe(r.latest);
  expect(boosterPlaybackSample(r,104.5).position[0]).toBeCloseTo(point(104.5).position[0],6);
  expect(boosterPlaybackSample(r,NaN)).toBe(r.samples[0]);
 });
 it('switches atmosphere display only at the recorded entry event and preserves unavailable heat values',()=>{
  const r=record();r.samples[1].model='entry';r.samples[1].heatFluxWm2=20000;
  expect(boosterPlaybackSample(r,101).model).toBe('coast');expect(boosterPlaybackSample(r,101).heatFluxWm2).toBeNull();
  expect(boosterPlaybackSample(r,102)).toBe(r.samples[1]);
 });
 it('uses elapsed time at different frame rates, stops at the record end and bounds hidden-tab jumps',()=>{
  for(const fps of [30,60,120]){let t=100;for(let i=0;i<fps;i++)t=advanceBoosterPlayback(t,1/fps,20,200);expect(t).toBeCloseTo(120,8);}
  expect(advanceBoosterPlayback(104,.2,20,105)).toBe(105);expect(advanceBoosterPlayback(100,30,20,200)).toBe(105);
  expect(advanceBoosterPlayback(100,-1,20,200)).toBe(100);expect(advanceBoosterPlayback(100,NaN,20,200)).toBe(100);
 });
});
