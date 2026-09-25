import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {bodyById} from '../data/catalog';
import {RING_PROFILES,ringProfile,ringSystemBounds} from '../data/rings';
import {makeSaturnRingGeometry} from './saturnRingGeometry';

describe('cross-view Saturn reference rings',()=>{
 it('uses the same km boundaries at body-radius scales and leaves the Cassini division unmeshed',()=>{
  for(const scale of [1,bodyById.saturn.radiusKm/20000,.13])for(const uvMode of ['planar','radial'] as const){
   const geometry=makeSaturnRingGeometry(scale,uvMode),p=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
   const source=ringProfile('saturn')!.bands,km=bodyById.saturn.radiusKm/scale;
   const radii=Array.from({length:p.count},(_,i)=>Math.hypot(p.getX(i),p.getY(i))*km);
   expect(Math.min(...radii)).toBeCloseTo(74658,0);expect(Math.max(...radii)).toBeCloseTo(136780,0);
   const indices=geometry.index!;
   for(let i=0;i<indices.count;i+=3){
    const rs=[0,1,2].map(j=>radii[indices.getX(i+j)]);
    expect(source.some(b=>rs.every(r=>r>=b.innerKm-.05&&r<=b.outerKm+.05))).toBe(true);
   }
   const [lo,hi]=ringSystemBounds('saturn',bodyById.saturn.radiusKm);
   for(let i=0;i<p.count;i++){
    if(uvMode==='radial')expect(uv.getX(i)).toBeCloseTo((radii[i]/bodyById.saturn.radiusKm-lo)/(hi-lo),5);
    else expect(Math.hypot(uv.getX(i)-.5,uv.getY(i)-.5)*2*hi).toBeCloseTo(radii[i]/bodyById.saturn.radiusKm,5);
   }
   geometry.dispose();
  }
 });
 it('keeps the downloadable reference identical to rendered band data and stores verified source facts',()=>{
  const snapshot=JSON.parse(readFileSync('public/data/rings/giant-planets.json','utf8'));
  expect(snapshot.profiles).toEqual(RING_PROFILES);expect(snapshot.origin).toBe('parent centre');
  const archive=JSON.parse(readFileSync('data-sources/rings/manifest.json','utf8'));
  expect(archive.sources).toHaveLength(4);
  for(const source of archive.sources){
   const bytes=readFileSync('data-sources/rings/'+source.file);
   expect(createHash('sha256').update(bytes).digest('hex')).toBe(source.sha256);
   expect(source.url).toBe(ringProfile(source.id)!.sourceUrl);
  }
 });
});
