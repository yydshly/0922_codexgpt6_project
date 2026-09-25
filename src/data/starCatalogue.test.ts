import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseStarCatalogue,starDirection,starPosition,starDistance,starsForView,canShowStarInSpace,STELLAR_GUIDE_HIP} from './starCatalogue';
const raw=JSON.parse(readFileSync('public/data/stars/hip2-subset.json','utf8'));
const catalogue=parseStarCatalogue(raw);
describe('Hipparcos filtered sky and distance samples',()=>{
 it('has unique quality-filtered directions and at least 20 measured distance records',()=>{expect(catalogue.sky).toHaveLength(2936);expect(catalogue.nearby).toHaveLength(32);});
 it('matches the independent ERFA spherical-to-Cartesian published reference fixture',()=>{
  // ERFA t_erfa_c.c, t_s2c (2013-08-07): ICRS x,y,z become scene x,z,-y.
  const actual=starDirection(3.0123,-.999),expected=[-.5366267667260523906,-.8409302618566214041,-.0697711109765145365];
  actual.forEach((v,i)=>expect(v).toBeCloseTo(expected[i],12));
 });
 it('places the equatorial cardinal directions and poles without mirroring',()=>{expect(starDirection(0,0)).toEqual([1,0,-0]);expect(starDirection(Math.PI/2,0)[2]).toBeCloseTo(-1,14);expect(starDirection(0,Math.PI/2)[1]).toBeCloseTo(1,14);});
 it('keeps identical scale on all distance axes',()=>{for(const s of catalogue.nearby){expect(Math.hypot(...starPosition(s))).toBeCloseTo(starDistance(s),12);expect(starDistance(s)).toBeGreaterThan(0);}});
 it('reconciles every exported field against the original fixed-width selected records',()=>{
  const text=readFileSync('data-sources/stars/hip2-selected.dat','utf8');expect(createHash('sha256').update(text).digest('hex')).toBe(raw.meta.selectedSha256);
  const lines=new Map(text.trimEnd().split('\n').map(l=>[Number(l.slice(0,6)),l]));
  const fields={ra:[15,28],dec:[29,42],parallax:[43,50],parallaxError:[83,89],hp:[129,136],hpError:[137,143],raError:[69,75],decError:[76,82],fit:[108,113],solution:[7,10]} as const;
  for(const s of [...catalogue.sky,...catalogue.nearby])for(const [key,[a,b]] of Object.entries(fields))expect(s[key as keyof typeof fields]).toBe(Number(lines.get(s.hip)!.slice(a,b)));
 });
 it('rejects wrong epochs, impossible coordinates, duplicates and untrusted depths',()=>{
  for(const mutate of [(x:typeof raw)=>x.meta.epoch='J2000',(x:typeof raw)=>x.sky[0].ra=NaN,(x:typeof raw)=>x.sky[0].dec=2,(x:typeof raw)=>x.nearby[0].parallax=-1,(x:typeof raw)=>x.nearby[0].parallaxError=1000,(x:typeof raw)=>x.sky.push(x.sky[0])]){const x=structuredClone(raw);mutate(x);expect(()=>parseStarCatalogue(x)).toThrow();}
 });
});

describe('same-star viewpoint correspondence',()=>{
 it('uses the same published row in both guided views',()=>{
  const a=starsForView(catalogue,'space',STELLAR_GUIDE_HIP).find(s=>s.hip===STELLAR_GUIDE_HIP)!;
  const b=starsForView(catalogue,'sky',STELLAR_GUIDE_HIP).find(s=>s.hip===STELLAR_GUIDE_HIP)!;
  expect(a).toEqual(b);expect(starDistance(a)).toBeCloseTo(10.48938,4);
 });
 it('overlays a selected faint neighbor only once without changing the bright catalogue',()=>{
  const sky=starsForView(catalogue,'sky',87937);expect(sky).toHaveLength(catalogue.sky.length+1);
  expect(sky.filter(s=>s.hip===87937)).toHaveLength(1);expect(catalogue.sky.some(s=>s.hip===87937)).toBe(false);
  expect(starsForView(catalogue,'sky',null)).toHaveLength(catalogue.sky.length);
 });
 it('does not invent a depth for objects outside the measured neighborhood',()=>{
  const skyOnly=catalogue.sky.find(s=>!catalogue.nearby.some(n=>n.hip===s.hip))!;
  expect(canShowStarInSpace(catalogue,skyOnly.hip)).toBe(false);
  expect(canShowStarInSpace(catalogue,87937)).toBe(true);expect(canShowStarInSpace(catalogue,null)).toBe(true);
  expect(starsForView(null,'sky',87937)).toEqual([]);
 });
});
