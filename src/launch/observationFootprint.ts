import { LAUNCH_EARTH } from '../data/launchMission';
import { add, dot, norm, scale, surfaceAt, unit, type V3 } from './ascent';

export const FOOTPRINT_ANGLES = [6, 20, 40] as const;
export type FootprintAngle = typeof FOOTPRINT_ANGLES[number];
export const DEFAULT_FOOTPRINT = { enabled: false, angle: 20 as FootprintAngle };
export type FootprintOptions = typeof DEFAULT_FOOTPRINT;
export const EARTH_RADII:V3=[LAUNCH_EARTH.semiMajorM,LAUNCH_EARTH.semiMajorM,LAUNCH_EARTH.semiMajorM*(1-1/LAUNCH_EARTH.inverseFlattening)];
const cross=(a:V3,b:V3):V3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];

/** First forward intersection with an axis-aligned ellipsoid; distances and axes in metres. */
export function rayEllipsoid(origin:V3,direction:V3,radii:V3=EARTH_RADII):V3|null {
  if(![...origin,...direction,...radii].every(Number.isFinite)||radii.some(r=>r<=0))return null;
  const o=origin.map((v,i)=>v/radii[i]) as V3,d=direction.map((v,i)=>v/radii[i]) as V3;
  const a=dot(d,d),b=2*dot(o,d),c=dot(o,o)-1,discriminant=b*b-4*a*c;
  if(a===0||discriminant<0)return null;
  const q=-.5*(b+(b<0?-1:1)*Math.sqrt(discriminant));
  const roots=q===0?[-b/(2*a)]:[q/a,c/q];
  const t=Math.min(...roots.filter(t=>Number.isFinite(t)&&t>=0));
  return Number.isFinite(t)?add(origin,scale(direction,t)):null;
}
export type ObservationFootprint = { valid:true; center:V3; boundary:V3[]; axis:V3; fullAngleDeg:number; maxChordM:number; heightM:number } | {valid:false;reason:string};

/** Assumed circular nadir field of view, not a real instrument or image-quality model. */
export function observationFootprint(position:V3,fullAngleDeg:number,segments=96,radii:V3=EARTH_RADII):ObservationFootprint {
  if(![...position,fullAngleDeg,...radii].every(Number.isFinite)||radii.some(r=>r<=0)||fullAngleDeg<=0||fullAngleDeg>=180||segments<8||segments%2!==0||!Number.isInteger(segments))return {valid:false,reason:'视场或采样设置无效'};
  const scaled=position.map((v,i)=>v/radii[i]) as V3;
  if(dot(scaled,scaled)<=1)return {valid:false,reason:'观察点不在地表以上'};
  // The product uses WGS84 geodetic nadir. The sphere option supports an analytic independent test.
  const up=radii[0]===radii[2]?unit(position):surfaceAt(position).up;
  const axis=scale(up,-1),center=rayEllipsoid(position,axis,radii);
  if(!center)return {valid:false,reason:'中心视线未与地表相交'};
  const x=unit(cross(axis,Math.abs(axis[2])<.9?[0,0,1]:[1,0,0])),y=cross(axis,x);
  const half=fullAngleDeg*Math.PI/360,boundary:V3[]=[];
  for(let i=0;i<segments;i++){
    const a=2*Math.PI*i/segments;
    const direction=add(scale(axis,Math.cos(half)),scale(add(scale(x,Math.cos(a)),scale(y,Math.sin(a))),Math.sin(half)));
    const point=rayEllipsoid(position,direction,radii);
    if(!point)return {valid:false,reason:'视场边缘超出地平线，本版不填充截断轮廓'};
    boundary.push(point);
  }
  const maxChordM=Math.max(...boundary.slice(0,segments/2).map((p,i)=>norm(add(p,scale(boundary[i+segments/2],-1)))));
  return {valid:true,center,boundary,axis,fullAngleDeg,maxChordM,heightM:norm(add(position,scale(center,-1)))};
}
