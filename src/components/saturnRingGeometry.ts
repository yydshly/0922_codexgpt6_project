import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {bodyById} from '../data/catalog';
import {ringDisplayBounds,ringProfile,ringSystemBounds} from '../data/rings';

/** Same C/B/A boundaries as the panorama; the Cassini division is omitted geometry, not an arbitrary texture stripe. */
export function makeSaturnRingGeometry(radius:number,uvMode:'planar'|'radial'){
 const reference=bodyById.saturn.radiusKm;
 const [inner,outer]=ringSystemBounds('saturn',reference);
 const bands=ringProfile('saturn')!.bands.map(band=>{
  const [lo,hi]=ringDisplayBounds(band,reference,false);
  return new THREE.RingGeometry(lo*radius,hi*radius,160);
 });
 const geometry=mergeGeometries(bands);
 bands.forEach(band=>band.dispose());
 const p=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
 for(let i=0;i<p.count;i++){
  const x=p.getX(i)/radius,y=p.getY(i)/radius;
  if(uvMode==='planar')uv.setXY(i,x/(2*outer)+.5,y/(2*outer)+.5);
  else uv.setXY(i,(Math.hypot(x,y)-inner)/(outer-inner),.5);
 }
 return geometry;
}
