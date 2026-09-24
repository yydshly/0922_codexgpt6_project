import {bodyById} from './catalog';
import type {BodyId} from '../types';
/** Common linear scale, not the panorama's logarithmic distance mapping. */
export function sizePair(left:BodyId,right:BodyId){
 const bodies=[bodyById[left],bodyById[right]] as const;
 const unitKm=Math.max(...bodies.map(b=>b.radiusKm));
 const radii=bodies.map(b=>b.radiusKm/unitKm);
 const gap=.25;
 return {bodies,unitKm,radii,x:[-radii[1]-gap/2,radii[0]+gap/2],halfWidth:radii[0]+radii[1]+gap/2,diameterRatio:bodies[0].radiusKm/bodies[1].radiusKm};
}
export function sizePairFrustum(halfWidth:number,aspect:number){
 const halfHeight=Math.max(1.2,halfWidth*1.15/Math.max(aspect,.01));
 return {halfHeight,halfWidth:halfHeight*aspect};
}
