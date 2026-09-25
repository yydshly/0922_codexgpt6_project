import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {localDisplayDistance} from './localDisplayScale';
import {SATELLITES} from './satellites';
import {bodyById} from './catalog';
import {RING_PROFILES} from './rings';
import {familyLocalPosition,familyMoonRadius,familyPlanetRadius,type MacroFamilyId} from './macroFamilies';
import {satelliteDisplayPosition,satelliteOrbitPoints} from '../components/SatelliteSystem';
import {overviewSatelliteOffset} from '../components/overview-layout';
import type {Vec3} from '../types';
describe('shared local scale contract',()=>{
 it('preserves all selected ring radii and radial order without expanding inner space',()=>{
  for(const p of RING_PROFILES)for(const b of p.bands)for(const km of [b.innerKm,b.outerKm])expect(localDisplayDistance(km/bodyById[p.id].radiusKm)).toBe(km/bodyById[p.id].radiusKm);
  let last=0;for(let r=.1;r<100;r+=.1){const mapped=localDisplayDistance(r);expect(mapped).toBeGreaterThan(last);expect(mapped).toBeLessThanOrEqual(r);last=mapped;}
  expect(localDisplayDistance(3.25+1e-8)-localDisplayDistance(3.25)).toBeLessThan(1e-8);
 });
 it('uses measured moon-to-parent radii for every macro family',()=>{
  for(const m of SATELLITES){const id=m.parentId as MacroFamilyId;expect(familyMoonRadius(m.radiusKm,id)/familyPlanetRadius(id)).toBeCloseTo(m.radiusKm/bodyById[id].radiusKm,12);}
 });
 it('keeps macro bodies, satellite reference curves and observatory offsets on one map',()=>{
  for(const m of SATELLITES){const id=m.parentId as MacroFamilyId,r=bodyById[id].radiusKm,position:Vec3=[r*5,r*2,-r];
   const a=familyLocalPosition(position,id),b=satelliteDisplayPosition(position,r,false).multiplyScalar(familyPlanetRadius(id)/(r/20000)),c=overviewSatelliteOffset(position,r,familyPlanetRadius(id),true);
   a.forEach((v,i)=>{expect(v).toBeCloseTo(b.getComponent(i),12);expect(v).toBeCloseTo(c.getComponent(i),12);});
  }
 });
 it('keeps every loaded ring-family moon outside the modelled main rings across all month samples',()=>{
  const manifest=JSON.parse(readFileSync('public/data/satellites/manifest.json','utf8'));
  let checked=0,clearance=Infinity;
  for(const chunk of manifest.chunks){const profile=RING_PROFILES.find(p=>p.id===chunk.parentId);if(!profile)continue;
   const parent=bodyById[profile.id],R=familyPlanetRadius(profile.id),outer=Math.max(...profile.bands.map(b=>b.outerKm))/parent.radiusKm*R;
   const data=JSON.parse(readFileSync('public/data/satellites/'+chunk.file,'utf8'));
   for(const series of data.series){const moon=SATELLITES.find(m=>m.id===series.id)!;for(const row of series.samples){const d=Math.hypot(...familyLocalPosition(row.slice(0,3),profile.id));clearance=Math.min(clearance,d-familyMoonRadius(moon.radiusKm,profile.id)-outer);checked++;}}
  }
  expect(checked).toBeGreaterThan(1000);expect(clearance).toBeGreaterThan(0);
 });
 it('a circular reference orbit and its body have the same compressed radius',()=>{
  const parent=bodyById.jupiter,d=421700,m={id:'io',name:'Io',radiusKm:1821.6,appearance:'rock' as const,color:'#fff',position:[d,0,0] as Vec3,velocity:[0,Math.sqrt(parent.gm/d),0] as Vec3};
  const expected=satelliteDisplayPosition(m.position,parent.radiusKm,false).length();
  for(const point of satelliteOrbitPoints(m,parent,false))expect(point.length()).toBeCloseTo(expected,9);
 });
});
