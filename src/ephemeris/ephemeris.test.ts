import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { BODY_IDS } from '../types';
import { utcToTdb } from '../data/time';
import { BODIES } from '../data/catalog';
import { getFrame, interpolateChunk, loadManifest, sampleFrame, type EphemerisChunk } from './ephemeris';

vi.stubGlobal('fetch',async (url: string) => new Response(readFileSync(resolve('public',url.replace(/^\//,'')),'utf8'),{status:200}));
describe('authoritative offline ephemeris',()=> {
  it('preserves body ordering and target identities',async()=> {
    const m=await loadManifest();
    expect(m.bodyIds).toEqual(BODY_IDS);
    expect(BODIES.map(b=>b.id)).toEqual(BODY_IDS);
    expect(m.displayNaifIds).toEqual(BODIES.map(b=>b.displayNaifId));
    expect(m.simulationNaifIds).toEqual(BODIES.map(b=>b.simulationNaifId));
  });
  it('covers both exact UTC boundaries without extrapolation',async()=> {
    const m=await loadManifest();
    expect(m.startTdb).toBe(utcToTdb(new Date(m.startUtc)));
    expect(m.endTdb).toBe(utcToTdb(new Date(m.endUtc)));
    for(const t of [m.startTdb,m.endTdb]) {
      const frame=await getFrame(t);
      expect(frame.positions.length).toBe(30);
      expect(Array.from(frame.positions).every(Number.isFinite)).toBe(true);
    }
    await expect(getFrame(m.startTdb-1)).rejects.toThrow(RangeError);
    await expect(getFrame(m.endTdb+1)).rejects.toThrow(RangeError);
  });
  it('reproduces stored position and velocity exactly at knots',()=> {
    const c=JSON.parse(readFileSync('public/data/2026-01.json','utf8')) as EphemerisChunk;
    const f=interpolateChunk(c,c.startTdb);
    for(let b=0;b<10;b++)for(let a=0;a<3;a++) {
      expect(f.positions[3*b+a]).toBe(c.display[0][6*b+a]);
      expect(f.velocities[3*b+a]).toBeCloseTo(c.display[0][6*b+3+a],12);
    }
  });
  it('keeps planet centers distinct from system barycenters',async()=> {
    const t=utcToTdb(new Date('2026-09-22T00:00:00Z'));
    const a=await getFrame(t,'display'),b=await getFrame(t,'simulation');
    const offset=Math.hypot(...Array.from(a.positions.slice(18,21)).map((x,i)=>x-b.positions[18+i]));
    expect(offset).toBeGreaterThan(10);
    expect(a.positions[9]).toBe(b.positions[9]);
    expect(sampleFrame(t)?.positions[18]).toBe(a.positions[18]);
  });
  it('has independently held-out checkpoints below the 1 km acceptance limit',()=> {
    const report=JSON.parse(readFileSync('public/data/interpolation-report.json','utf8'));
    expect(report.passed).toBe(true);
    expect(report.totalCheckpoints).toBeGreaterThan(49000);
    expect(report.maxPositionErrorKm).toBeLessThan(1);
  });
  it('cross-checks the runtime interpolator against all 49,657 raw held-out states',async()=> {
    const m=await loadManifest();
    const loaded=new Map(m.chunks.map(d=>[d.file,JSON.parse(readFileSync(`public/data/${d.file}`,'utf8')) as EphemerisChunk]));
    const targets=new Map<number,{body:number;kind:'display'|'simulation'}>();
    for(const kind of ['display','simulation'] as const) BODIES.forEach((body,i)=> {
      const target=kind==='display'?body.displayNaifId:body.simulationNaifId;
      if(!targets.has(target))targets.set(target,{body:i,kind});
    });
    let maxError=0,count=0;
    for(const [target,{body,kind}] of targets) {
      const raw=gunzipSync(readFileSync(`data-sources/horizons/${target}-2026-2027-3h.txt.gz`)).toString();
      const rows=raw.split('$$SOE')[1].split('$$EOE')[0].trim().split('\n');
      for(let i=1;i<rows.length-1;i+=2) {
        const values=rows[i].split(','); const t=(Number(values[0])-2451545)*86400;
        const d=m.chunks.find(c=>t>=c.startTdb&&t<c.endTdb)??m.chunks[m.chunks.length-1];
        const frame=interpolateChunk(loaded.get(d.file)!,t,kind);
        const error=Math.hypot(...[0,1,2].map(axis=>frame.positions[body*3+axis]-Number(values[axis+2])));
        maxError=Math.max(maxError,error);count++;
      }
    }
    expect(count).toBe(49657);
    expect(maxError).toBeLessThan(1);
    expect(maxError).toBeCloseTo(0.078369535,6);
  },20000);
});
