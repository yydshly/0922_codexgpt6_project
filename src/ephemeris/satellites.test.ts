import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { BODY_IDS } from '../types';
import { bodyById } from '../data/catalog';
import { OBSERVATION_COUNTS, SATELLITE_PARENTS } from '../data/observationCatalog';
import { SATELLITES } from '../data/satellites';
import { utcToTdb } from '../data/time';
import { getSatelliteFrame, interpolateSatelliteChunk, loadSatelliteManifest, sampleSatelliteFrame, type SatelliteChunk } from './satellites';

vi.stubGlobal('fetch',async(url:string)=>new Response(readFileSync(resolve('public',url.replace(/^\//,'')),'utf8'),{status:200}));
const parentIds=[...new Set(SATELLITES.map(body=>body.parentId))];
const uranusIdentities=[['miranda',705],['ariel',701],['umbriel',702],['titania',703],['oberon',704]];
function readChunk(file:string):SatelliteChunk {
  return JSON.parse(readFileSync(resolve('public/data/satellites',file),'utf8')) as SatelliteChunk;
}
describe('parent-centered satellite ephemerides',()=>{
  it('retains the original ten-body state space and center identities',async()=>{
    expect(BODY_IDS).toEqual(['sun','mercury','venus','earth','moon','mars','jupiter','saturn','uranus','neptune']);
    expect(SATELLITES).toHaveLength(19);
    expect(new Set(SATELLITES.map(body=>body.id)).size).toBe(SATELLITES.length);
    expect(new Set(SATELLITES.map(body=>body.naifId)).size).toBe(SATELLITES.length);
    expect(SATELLITES.filter(body=>body.parentId==='uranus').map(body=>[body.id,body.naifId])).toEqual(uranusIdentities);
    expect(Object.fromEntries(SATELLITES.filter(body=>body.parentId==='saturn').map(body=>[body.id,body.naifId])))
      .toEqual({titan:606,enceladus:602,mimas:601,tethys:603,dione:604,rhea:605,iapetus:608});
    expect(SATELLITE_PARENTS.slice().sort()).toEqual(parentIds.slice().sort());
    expect(OBSERVATION_COUNTS.dynamic).toBe(32);
    expect(OBSERVATION_COUNTS.satellites).toBe(27); // The Moon and Charon both have checked state providers.
    const manifest=await loadSatelliteManifest();
    expect(manifest.satelliteIds).toEqual(SATELLITES.map(body=>body.id));
    const report=JSON.parse(readFileSync('public/data/satellites/interpolation-report.json','utf8'));
    expect(report.passed).toBe(true);
    expect(report.maxPositionErrorKm).toBeLessThan(1);
    expect(report.satellites.map((entry:{id:string})=>entry.id).sort()).toEqual(SATELLITES.map(body=>body.id).sort());
    for(const body of SATELLITES) {
      expect((BODY_IDS as readonly string[]).includes(body.id)).toBe(false);
      expect(bodyById[body.parentId].kind).toBe('planet');
      expect(body.radiusKm).toBeGreaterThan(0);
      expect(body.gm).toBeGreaterThan(0);
      const check=report.satellites.find((entry:{id:string})=>entry.id===body.id);
      expect(check.targetNaifId).toBe(body.naifId);
      // Parent centers, not their planetary-system barycenters, match the display provider.
      expect(check.centerNaifId).toBe(bodyById[body.parentId].displayNaifId);
      expect(check.passed).toBe(true);
    }
  });
  it('ships all 24 contiguous months for every registered parent with intact, complete series',async()=>{
    const m=await loadSatelliteManifest();
    expect(m.chunks).toHaveLength(parentIds.length*24);
    expect(new Set(m.chunks.map(d=>d.file)).size).toBe(m.chunks.length);
    for(const parent of parentIds) {
      const descriptors=m.chunks.filter(d=>d.parentId===parent).sort((a,b)=>a.startTdb-b.startTdb);
      const ids=SATELLITES.filter(body=>body.parentId===parent).map(body=>body.id).sort();
      expect(descriptors).toHaveLength(24);
      for(let month=0;month<24;month++) {
        const d=descriptors[month] as typeof descriptors[number]&{bytes:number;sha256:string};
        expect(Math.abs(d.startTdb-utcToTdb(new Date(Date.UTC(2026,month,1))))).toBeLessThan(1e-6);
        expect(Math.abs(d.endTdb-utcToTdb(new Date(Date.UTC(2026,month+1,1))))).toBeLessThan(1e-6);
        if(month>0)expect(d.startTdb).toBe(descriptors[month-1].endTdb);
        const bytes=readFileSync(resolve('public/data/satellites',d.file));
        expect(bytes.length).toBe(d.bytes);
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(d.sha256);
        const chunk=JSON.parse(bytes.toString()) as SatelliteChunk;
        expect(chunk.parentId).toBe(parent);
        expect(chunk.series.map(series=>series.id).sort()).toEqual(ids);
        for(const series of chunk.series) {
          expect(series.startTdb).toBeLessThanOrEqual(d.startTdb);
          expect(series.startTdb+(series.samples.length-1)*series.stepSeconds).toBeGreaterThanOrEqual(d.endTdb);
        }
      }
      expect(descriptors[0].startTdb).toBe(m.startTdb);
      expect(descriptors[23].endTdb).toBe(m.endTdb);
    }
  });
  it('supports both UTC range boundaries and every month transition',async()=>{
    const m=await loadSatelliteManifest();
    expect(Math.abs(m.startTdb-utcToTdb(new Date(m.startUtc)))).toBeLessThan(1e-6);
    expect(Math.abs(m.endTdb-utcToTdb(new Date(m.endUtc)))).toBeLessThan(1e-6);
    for(const parent of parentIds) {
      const count=SATELLITES.filter(body=>body.parentId===parent).length;
      for(const time of [m.startTdb,m.endTdb,...m.chunks.filter(d=>d.parentId===parent).map(d=>d.startTdb)]) {
        const frame=await getSatelliteFrame(time,parent);
        expect(frame.time).toBe(time);
        expect(frame.states).toHaveLength(count);
        expect(frame.states.every(s=>[...s.position,...s.velocity].every(Number.isFinite))).toBe(true);
      }
      await expect(getSatelliteFrame(m.startTdb-1,parent)).rejects.toThrow(RangeError);
      await expect(getSatelliteFrame(m.endTdb+1,parent)).rejects.toThrow(RangeError);
    }
  });
  it('keeps position and velocity continuous across independently loaded month packages',async()=>{
    const m=await loadSatelliteManifest();
    for(const parent of parentIds) {
      const descriptors=m.chunks.filter(d=>d.parentId===parent).sort((a,b)=>a.startTdb-b.startTdb);
      for(let month=1;month<descriptors.length;month++) {
        const time=descriptors[month].startTdb;
        const left=interpolateSatelliteChunk(readChunk(descriptors[month-1].file),time);
        const right=interpolateSatelliteChunk(readChunk(descriptors[month].file),time);
        for(const state of left.states) {
          const next=right.states.find(body=>body.id===state.id)!;
          expect(Math.hypot(...state.position.map((value,axis)=>value-next.position[axis]))).toBeLessThan(1e-6);
          expect(Math.hypot(...state.velocity.map((value,axis)=>value-next.velocity[axis]))).toBeLessThan(1e-9);
        }
      }
    }
  });
  it('cross-checks runtime interpolation against independent SPICE evaluations',async()=>{
    const m=await loadSatelliteManifest();
    for(const body of SATELLITES) {
      const checks=JSON.parse(readFileSync(`data-sources/satellites/${body.id}-checkpoints.json`,'utf8')) as Array<{time:number;state:number[]}>;
      const inRange=checks.filter(p=>p.time>=m.startTdb&&p.time<=m.endTdb);
      expect(inRange.length).toBeGreaterThanOrEqual(20);
      expect(new Set(inRange.map(point=>point.time)).size).toBe(inRange.length);
      expect(Math.max(...inRange.map(point=>point.time))-Math.min(...inRange.map(point=>point.time))).toBeGreaterThan((m.endTdb-m.startTdb)*.9);
      for(const point of inRange) {
        const descriptor=m.chunks.find(d=>d.parentId===body.parentId&&point.time>=d.startTdb&&point.time<d.endTdb)!;
        const series=readChunk(descriptor.file).series.find(s=>s.id===body.id)!;
        const coordinate=(point.time-series.startTdb)/series.stepSeconds;
        // Held-out reference evaluations must be between interpolation knots.
        expect(Math.abs(coordinate-Math.floor(coordinate)-0.5)).toBeLessThan(1e-8);
        const frame=await getSatelliteFrame(point.time,body.parentId);
        const found=frame.states.find(s=>s.id===body.id)!;
        expect(Math.hypot(...found.position.map((p,i)=>p-point.state[i])),body.id).toBeLessThan(1);
        // Test analytic velocity as well as position; avoid a position-only spline.
        expect(Math.hypot(...found.velocity.map((v,i)=>v-point.state[i+3]))).toBeLessThan(0.001);
      }
    }
  });
  it('preserves parent-relative scale and never shares mutable state with rendering',async()=>{
    const time=utcToTdb(new Date('2026-09-22T00:00:00Z'));
    const frame=await getSatelliteFrame(time,'jupiter');
    const io=frame.states.find(s=>s.id==='io')!;
    expect(Math.hypot(...io.position)).toBeGreaterThan(400000);
    expect(Math.hypot(...io.position)).toBeLessThan(450000);
    const original=io.position[0];io.position[0]=NaN;
    expect(sampleSatelliteFrame(time,'jupiter')!.states.find(s=>s.id==='io')!.position[0]).toBe(original);
    const c=JSON.parse(readFileSync('public/data/satellites/mars-2026-01.json','utf8')) as SatelliteChunk;
    const snapshot=JSON.stringify(c);
    interpolateSatelliteChunk(c,c.series[0].startTdb+60);
    expect(JSON.stringify(c)).toBe(snapshot);
  });
  it('releases failed downloads so a retry can load the same month',async()=>{
    vi.resetModules();
    const provider=await import('./satellites');
    const originalFetch=globalThis.fetch;let failOnce=true;
    vi.stubGlobal('fetch',async(url:string)=>{
      if(url.endsWith('uranus-2026-09.json')&&failOnce) {
        failOnce=false;return new Response('temporary outage',{status:503});
      }
      return originalFetch(url);
    });
    try {
      const time=utcToTdb(new Date('2026-09-22T00:00:00Z'));
      await expect(provider.getSatelliteFrame(time,'uranus')).rejects.toThrow('503');
      expect(provider.sampleSatelliteFrame(time,'uranus')).toBeNull();
      expect((await provider.getSatelliteFrame(time,'uranus')).states).toHaveLength(5);
    } finally {vi.stubGlobal('fetch',originalFetch);}
  });
  it('rejects an older two-moon Saturn package instead of displaying an incomplete seven-moon family',async()=>{
    vi.resetModules();
    const provider=await import('./satellites');
    const originalFetch=globalThis.fetch;let staleOnce=true;
    vi.stubGlobal('fetch',async(url:string)=>{
      if(url.endsWith('saturn-2026-09.json')&&staleOnce) {
        staleOnce=false;
        const stale=readChunk('saturn-2026-09.json');
        stale.series=stale.series.filter(series=>series.id==='titan'||series.id==='enceladus');
        return new Response(JSON.stringify(stale),{status:200});
      }
      return originalFetch(url);
    });
    try {
      const time=utcToTdb(new Date('2026-09-22T00:00:00Z'));
      await expect(provider.getSatelliteFrame(time,'saturn')).rejects.toThrow('分包损坏');
      expect(provider.sampleSatelliteFrame(time,'saturn')).toBeNull();
      const current=await provider.getSatelliteFrame(time,'saturn');
      expect(current.states.map(state=>state.id).sort()).toEqual(['titan','enceladus','mimas','tethys','dione','rhea','iapetus'].sort());
    } finally {vi.stubGlobal('fetch',originalFetch);}
  });
  it('deduplicates an in-flight month and never substitutes an older cached epoch after a seek',async()=>{
    vi.resetModules();
    const provider=await import('./satellites');
    const originalFetch=globalThis.fetch;
    let requests=0;
    let release=()=>{};
    const gate=new Promise<void>(resolveGate=>{release=resolveGate;});
    vi.stubGlobal('fetch',async(url:string)=>{
      if(url.endsWith('uranus-2026-02.json')) {requests++;await gate;}
      return originalFetch(url);
    });
    try {
      const january=utcToTdb(new Date('2026-01-15T00:00:00Z'));
      const february=utcToTdb(new Date('2026-02-15T00:00:00Z'));
      const march=utcToTdb(new Date('2026-03-15T00:00:00Z'));
      await provider.getSatelliteFrame(january,'uranus');
      const oldRequest=provider.getSatelliteFrame(february,'uranus');
      await vi.waitFor(()=>expect(requests).toBe(1));
      const sameMonth=provider.getSatelliteFrame(february+3600,'uranus');
      expect(provider.sampleSatelliteFrame(february,'uranus')).toBeNull();
      const current=await provider.getSatelliteFrame(march,'uranus');
      release();
      const completed=await Promise.all([oldRequest,sameMonth]);
      expect(requests).toBe(1);
      expect(completed.map(frame=>frame.time)).toEqual([february,february+3600]);
      expect(completed[0].states[0].position).not.toEqual(completed[1].states[0].position);
      expect(provider.sampleSatelliteFrame(march,'uranus')).toEqual(current);
      expect(provider.sampleSatelliteFrame(january,'uranus')!.time).toBe(january);
    } finally {release();vi.stubGlobal('fetch',originalFetch);}
  });
});
