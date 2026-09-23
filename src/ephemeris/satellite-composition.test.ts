import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { AU_KM, bodyById } from '../data/catalog';
import { SATELLITES } from '../data/satellites';
import { tdbToUtc, utcToTdb } from '../data/time';
import { overviewSatelliteOffset, satelliteFamilyCounts } from '../components/overview-layout';
import { BODY_IDS } from '../types';
import { getFrame } from './ephemeris';
import { getSatelliteFrame } from './satellites';

vi.stubGlobal('fetch',async(url:string)=>new Response(readFileSync(resolve('public',url.replace(/^\//,'')),'utf8'),{status:200}));

interface CompositionReference {
  parentNaifId:number;
  frame:string;
  timeScale:string;
  parentReferenceFile:string;
  points:Array<{time:number;states:Array<{id:string;state:number[]}>}>;
}

describe('parent-centered satellite observation integration',()=>{
  it.each([{parentId:'uranus',naifId:799},{parentId:'saturn',naifId:699}] as const)
  ('composes $parentId center and relative moons at the same epoch against independent source states',async({parentId,naifId})=>{
    const reference=JSON.parse(readFileSync(`data-sources/satellites/${parentId}-composition-checkpoints.json`,'utf8')) as CompositionReference;
    expect(reference.parentNaifId).toBe(naifId);
    expect(reference.frame).toBe('ECLIPJ2000');
    expect(reference.timeScale).toBe('TDB seconds past J2000');
    expect(reference.points).toHaveLength(3);
    const raw=gunzipSync(readFileSync(reference.parentReferenceFile)).toString();
    const parentTruth=raw.split('$$SOE')[1].split('$$EOE')[0].trim().split('\n').map(line=>{
      const values=line.split(',');
      return {time:(Number(values[0])-2451545)*86400,state:values.slice(2,8).map(Number)};
    });
    const parent=bodyById[parentId],offset=BODY_IDS.indexOf(parentId)*3;
    const moonIds=SATELLITES.filter(body=>body.parentId===parentId).map(body=>body.id).sort();
    const measured={parentId,epochs:reference.points.length,parentPositionKm:0,parentVelocityKmS:0,
      relativePositionKm:0,relativeVelocityKmS:0,composedPositionKm:0,composedVelocityKmS:0};
    for(const point of reference.points) {
      // The independent fixtures use exact TDB epochs. A UTC reinterpretation would
      // shift these fast moons by hundreds of km and cannot pass this comparison.
      // JavaScript Date stores whole milliseconds; this checks the clock roundtrip
      // at that resolution, not a microsecond precision unsupported by Date.
      expect(Math.abs(utcToTdb(tdbToUtc(point.time))-point.time)).toBeLessThan(.001);
      const truth=parentTruth.find(row=>Math.abs(row.time-point.time)<1e-4);
      expect(truth,`reference epoch must be a stored Horizons ${naifId} sample`).toBeDefined();
      expect(point.states.map(state=>state.id).sort()).toEqual(moonIds);
      const [center,moons,system]=await Promise.all([
        getFrame(point.time,'display'),getSatelliteFrame(point.time,parentId),getFrame(point.time,'simulation'),
      ]);
      expect(center.time).toBe(moons.time);
      expect(center.time).toBe(point.time);
      const centerPosition=Array.from(center.positions.slice(offset,offset+3));
      const centerVelocity=Array.from(center.velocities.slice(offset,offset+3));
      const parentPositionError=Math.hypot(...centerPosition.map((value,axis)=>value-truth!.state[axis]));
      const parentVelocityError=Math.hypot(...centerVelocity.map((value,axis)=>value-truth!.state[axis+3]));
      expect(parentPositionError).toBeLessThan(1);
      expect(parentVelocityError).toBeLessThan(.001);
      measured.parentPositionKm=Math.max(measured.parentPositionKm,parentPositionError);
      measured.parentVelocityKmS=Math.max(measured.parentVelocityKmS,parentVelocityError);
      // This guards a silent switch to the physics provider's system barycenter.
      expect(Math.hypot(...centerPosition.map((value,axis)=>value-system.positions[offset+axis]))).toBeGreaterThan(1);
      for(const expected of point.states) {
        const moon=moons.states.find(state=>state.id===expected.id)!;
        const relativePositionError=Math.hypot(...moon.position.map((value,axis)=>value-expected.state[axis]));
        const relativeVelocityError=Math.hypot(...moon.velocity.map((value,axis)=>value-expected.state[axis+3]));
        expect(relativePositionError,expected.id).toBeLessThan(1);
        expect(relativeVelocityError).toBeLessThan(.001);
        measured.relativePositionKm=Math.max(measured.relativePositionKm,relativePositionError);
        measured.relativeVelocityKmS=Math.max(measured.relativeVelocityKmS,relativeVelocityError);

        // Exercise the renderer's physical km -> AU / ECLIPJ2000 axis conversion
        // with real, inclined orbits. The expected SSB state comes from independent
        // Horizons center samples plus independent SPICE relative evaluations.
        const displayed=new Vector3(centerPosition[0],centerPosition[2],-centerPosition[1]).divideScalar(AU_KM)
          .add(overviewSatelliteOffset(moon.position,parent.radiusKm,parent.radiusKm/AU_KM,false));
        const composedKm=[displayed.x*AU_KM,-displayed.z*AU_KM,displayed.y*AU_KM];
        const error=Math.hypot(...composedKm.map((value,axis)=>value-(truth!.state[axis]+expected.state[axis])));
        // Each provider has its own <1 km gate. Composition has their vector sum,
        // not a separate unsupported <1 km guarantee or a difference of norms.
        expect(error).toBeLessThan(2);
        expect(error).toBeLessThanOrEqual(parentPositionError+relativePositionError+2e-6);
        const velocityError=Math.hypot(...moon.velocity.map((value,axis)=>centerVelocity[axis]+value-(truth!.state[axis+3]+expected.state[axis+3])));
        expect(velocityError).toBeLessThan(.002);
        measured.composedPositionKm=Math.max(measured.composedPositionKm,error);
        measured.composedVelocityKmS=Math.max(measured.composedVelocityKmS,velocityError);
      }
    }
    // Keep parent interpolation and parent-relative interpolation independently
    // visible when these fixtures are revalidated; these are three-epoch maxima.
    console.info('Independent composition checkpoint maxima:',JSON.stringify(measured));
  });

  it('includes seven Saturnian and five Uranian moons while retaining Earth’s Moon',()=>{
    expect(satelliteFamilyCounts(SATELLITES)).toEqual({earth:1,jupiter:4,saturn:7,neptune:1,mars:2,uranus:5});
  });
});
