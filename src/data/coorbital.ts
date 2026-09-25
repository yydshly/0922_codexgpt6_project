import {tdbToUtc,utcToTdb} from './time';
import {AU_KM} from './catalog';
import {macroEcliptic} from './macroLayers';
import {LocalMonthlyStateProvider,type StateBatch} from '../ephemeris/stateProvider';
import type {Vec3} from '../types';
export const COORBITAL_SOURCE='https://www.jpl.nasa.gov/news/small-asteroid-is-earths-constant-companion/';
export const coorbitalProvider=new LocalMonthlyStateProvider('coorbital',['sun','earth','kamo']);
export type CoorbitalMode='coorbital-sun'|'coorbital-earth';
export const isCoorbital=(id:string|null|undefined):id is CoorbitalMode=>id==='coorbital-sun'||id==='coorbital-earth';
export const difference=(a:Vec3,b:Vec3):Vec3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
export function coorbitalState(batch:StateBatch|null,now?:number){
 if(!batch||now!==undefined&&Math.abs(batch.timeTdb-now)>1e-5||batch.originId!=='ssb'||batch.frame!=='ECLIPJ2000'||batch.positionUnit!=='km'||batch.velocityUnit!=='km/s')return null;
 const sun=batch.states.find(s=>s.id==='sun'),earth=batch.states.find(s=>s.id==='earth'),kamo=batch.states.find(s=>s.id==='kamo');
 if(!sun||!earth||!kamo||![sun,earth,kamo].every(s=>[...s.position,...s.velocity].every(Number.isFinite)))return null;
 return {sun,earth,kamo};
}
/** Rotating coordinates are positions only, never reinterpreted as inertial velocities. */
export function coorbitalPoint(batch:StateBatch,id:'sun'|'earth'|'kamo',mode:CoorbitalMode):Vec3{
 const s=coorbitalState(batch);if(!s)throw new Error('共轨状态不完整');
 const e=difference(s.earth.position,s.sun.position),p=difference(s[id].position,mode==='coorbital-sun'?s.sun.position:s.earth.position);
 if(mode==='coorbital-sun')return [p[0]/AU_KM*2.6,p[2]/AU_KM*2.6,-p[1]/AU_KM*2.6];
 const angle=Math.atan2(e[1],e[0]),c=Math.cos(angle),n=Math.sin(angle);
 return [(p[0]*c+p[1]*n)/AU_KM*8,p[2]/AU_KM*8,-(-p[0]*n+p[1]*c)/AU_KM*8];
}
export function coorbitalOverview(batch:StateBatch):Vec3{const s=coorbitalState(batch)!;return macroEcliptic(difference(s.kamo.position,s.sun.position).map(v=>v/AU_KM));}
export function coorbitalNumbers(batch:StateBatch|null,now?:number){const s=coorbitalState(batch,now);return s?{earthKm:Math.hypot(...difference(s.kamo.position,s.earth.position)),sunAu:Math.hypot(...difference(s.kamo.position,s.sun.position))/AU_KM,relativeKmS:Math.hypot(...difference(s.kamo.velocity,s.earth.velocity))}:null;}

/** At the final supported instant, retain the last covered calendar-year track. */
export function coorbitalTrackTimes(time:number){
 const year=Math.min(2027,Math.max(2026,tdbToUtc(time).getUTCFullYear()));
 const start=utcToTdb(new Date(Date.UTC(year,0,1))),end=utcToTdb(new Date(Date.UTC(year+1,0,1)));
 const times=Array.from({length:Math.ceil((end-start)/172800)},(_,i)=>start+i*172800);times.push(end);return {year,times};
}
