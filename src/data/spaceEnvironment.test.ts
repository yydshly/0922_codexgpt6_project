import {describe,it,expect} from 'vitest';
import {environmentRadius,windPoint} from './spaceEnvironment';
describe('illustrative environment geometry (not a physical solver)',()=>{
 it('keeps the bow shock outside the magnetopause and both outside Earth near its centre',()=>{
  expect(environmentRadius(-6)).toBe(0);expect(environmentRadius(-8,true)).toBe(0);
  for(let x=-6;x<=20;x+=.25)expect(environmentRadius(x,true)).toBeGreaterThan(environmentRadius(x));
  for(let x=-1;x<=1;x+=.1)expect(environmentRadius(x)).toBeGreaterThan(1);
 });
 it('keeps the schematic flow outside Earth and produces volume on both transverse axes',()=>{
  let minY=0,maxY=0,minZ=0,maxZ=0;
  for(let i=0;i<50;i++)for(let a=0;a<12;a++){
   const p=windPoint(i/49,a/12*Math.PI*2,.5);
   expect(p.every(Number.isFinite)).toBe(true);expect(Math.hypot(...p)).toBeGreaterThan(1);
   if(p[0]>=-8)expect(Math.hypot(p[1],p[2])).toBeGreaterThan(environmentRadius(p[0],true));
   minY=Math.min(minY,p[1]);maxY=Math.max(maxY,p[1]);minZ=Math.min(minZ,p[2]);maxZ=Math.max(maxZ,p[2]);
  }
  expect(minY).toBeLessThan(-6);expect(maxY).toBeGreaterThan(6);expect(minZ).toBeLessThan(-6);expect(maxZ).toBeGreaterThan(6);
 });
});
