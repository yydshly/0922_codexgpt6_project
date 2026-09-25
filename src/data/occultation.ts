import {bodyById} from './catalog';
import {satelliteById} from './satellites';
import {ttCalendarToTdb,dot} from './lunarEclipse';
import type {Vec3} from '../types';
export const OCCULTATION_SOURCE='https://promenade.imcce.fr/en/images/phe/phen%20jup%202026_eng.pdf';
export const OCCULTATION_REFERENCE=ttCalendarToTdb('2026-01-12T06:33:08.700Z');
export const OCCULTATION_START=OCCULTATION_REFERENCE-4*3600,OCCULTATION_END=OCCULTATION_REFERENCE+4*3600;
export const ARCSEC=180/Math.PI*3600,LIGHT_SPEED=299792.458;
const sub=(a:Vec3,b:Vec3):Vec3=>a.map((v,i)=>v-b[i]) as Vec3;
const unit=(v:Vec3):Vec3=>{const d=Math.hypot(...v);return v.map(n=>n/d) as Vec3;};
const cross=(a:Vec3,b:Vec3):Vec3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export type OccultationSampler=(id:'earth'|'jupiter'|'io',tdb:number)=>Vec3;
/** Finite-distance directions at reception time. Only one-way Newtonian light-time is corrected. */
export function occultationGeometry(time:number,sample:OccultationSampler){
 const observer=sample('earth',time);
 const apparent=(id:'jupiter'|'io')=>{let emission=time;for(let i=0;i<7;i++)emission=time-Math.hypot(...sub(sample(id,emission),observer))/LIGHT_SPEED;const vector=sub(sample(id,emission),observer);return {emission,vector,distance:Math.hypot(...vector),direction:unit(vector)};};
 const j=apparent('jupiter'),io=apparent('io'),z=j.direction,h=unit(cross(Math.abs(z[2])>.99?[0,1,0]:[0,0,1],z)),v=cross(z,h),den=dot(io.direction,z);
 const sep=Math.atan2(Math.hypot(...cross(z,io.direction)),den)*ARCSEC;
 // Azimuthal equidistant projection preserves the exact center separation.
 const tx=dot(io.direction,h),ty=dot(io.direction,v),d=Math.hypot(tx,ty);
 return {time,x:d?sep*tx/d:0,y:d?sep*ty/d:0,separation:sep,jupiterRadius:Math.asin(bodyById.jupiter.radiusKm/j.distance)*ARCSEC,ioRadius:Math.asin(satelliteById.io.radiusKm/io.distance)*ARCSEC,depthKm:io.distance-j.distance,lightSeconds:time-io.emission,observerDistanceKm:io.distance};
}
export type OccultationPoint=ReturnType<typeof occultationGeometry>;
export type OccultationView='space'|'earth';
/** Same light-time corrected emission positions at a shared reception time; +z toward Earth. */
export function occultationSpatial(p:OccultationPoint):Vec3{
 const angle=p.separation/ARCSEC,transverse=Math.sin(angle)*p.observerDistanceKm;
 return [p.separation?-p.x/p.separation*transverse:0,p.separation?p.y/p.separation*transverse:0,
  -p.depthKm+2*Math.sin(angle/2)**2*p.observerDistanceKm];
}

export function occultationStage(p:Pick<OccultationPoint,'separation'|'jupiterRadius'|'ioRadius'|'depthKm'>){
 if(p.separation>=p.jupiterRadius+p.ioRadius)return '两视圆分离';
 if(p.depthKm<=0)return '木卫一在前 · 凌越';
 return p.separation+p.ioRadius<=p.jupiterRadius?'木卫一完全被遮住':'木卫一部分被遮住';
}
/** Local case package only; never extrapolate to unrelated dates. */
export function sampleOccultation(points:readonly OccultationPoint[],time:number):OccultationPoint|null{
 if(!Number.isFinite(time)||points.length<2||time<points[0].time||time>points.at(-1)!.time)return null;
 const step=points[1].time-points[0].time,i=Math.min(Math.floor((time-points[0].time)/step),points.length-2),a=points[i],b=points[i+1],u=(time-a.time)/(b.time-a.time);
 const lerp=(key:keyof OccultationPoint)=>a[key]+u*(b[key]-a[key]);
 const x=lerp('x'),y=lerp('y');return {time,x,y,separation:Math.hypot(x,y),jupiterRadius:lerp('jupiterRadius'),ioRadius:lerp('ioRadius'),depthKm:lerp('depthKm'),lightSeconds:lerp('lightSeconds'),observerDistanceKm:lerp('observerDistanceKm')};
}
export function occultationContact(sample:(t:number)=>OccultationPoint,start:number,end:number,inner=false){
 const f=(t:number)=>{const p=sample(t);return p.separation-p.jupiterRadius+(inner?p.ioRadius:-p.ioRadius);};
 let a=f(start);if(a*f(end)>0)throw new Error('接触时刻未被区间夹住');for(let i=0;i<55;i++){const m=(start+end)/2,b=f(m);if(a*b<=0)end=m;else{start=m;a=b;}}return (start+end)/2;
}
