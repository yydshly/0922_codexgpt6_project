import {describe,it,expect} from 'vitest';
import {OrthographicCamera,Vector3} from 'three';
import {BODY_IDS} from '../types';
import {sizePair,sizePairFrustum} from './sizeComparison';
describe('physical size pairs',()=>{
 it('projects every pair at the catalogue diameter ratio, across wide and narrow viewports',()=>{
  for(const left of BODY_IDS)for(const right of BODY_IDS)for(const aspect of [.6,1,2.5]){
   const p=sizePair(left,right),f=sizePairFrustum(p.halfWidth,aspect),c=new OrthographicCamera(-f.halfWidth,f.halfWidth,f.halfHeight,-f.halfHeight,.1,20);c.position.z=6;c.updateMatrixWorld();
   const diameters=p.radii.map((r,i)=>new Vector3(p.x[i]+r,0,0).project(c).x-new Vector3(p.x[i]-r,0,0).project(c).x);
   expect(diameters[0]/diameters[1]).toBeCloseTo(p.diameterRatio,8);
   p.radii.forEach((r,i)=>{expect(Math.abs(p.x[i])+r).toBeLessThan(f.halfWidth);expect(r).toBeLessThan(f.halfHeight);});
  }
 });
 it('keeps the actual small-body scale and does not introduce a minimum visible radius',()=>{const p=sizePair('sun','moon');expect(p.radii[1]).toBeCloseTo(1737.4/695700,12);expect(p.radii[1]).toBeLessThan(.003);});
 it('has a positive gap with mirrored layouts on swapping',()=>{const p=sizePair('earth','moon'),q=sizePair('moon','earth');expect(p.x[1]-p.radii[1]-(p.x[0]+p.radii[0])).toBeCloseTo(.25);expect(p.x[0]).toBe(-q.x[1]);expect(p.diameterRatio*q.diameterRatio).toBeCloseTo(1);});
});
