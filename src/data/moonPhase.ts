import {BODY_IDS,type StateFrame,type Vec3} from '../types';
const sub=(a:Vec3,b:Vec3):Vec3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const dot=(a:Vec3,b:Vec3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a:Vec3,b:Vec3):Vec3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=(v:Vec3):Vec3=>{const d=Math.hypot(...v);return v.map(x=>x/d) as Vec3;};
export const MOON_PHASE_SOURCE='https://science.nasa.gov/moon/moon-phases/';
export const MEAN_PHASE_DAYS=29.5; // NASA rounded mean; never used to generate positions or event dates.
/** Geometric, simultaneous, geocentric illumination. Not topocentric apparent phases. */
export function phaseGeometry(sun:Vec3,earth:Vec3,moon:Vec3){
 const ms=sub(sun,moon),me=sub(earth,moon),es=sub(sun,earth),em=sub(moon,earth);
 if([ms,me,es,em].some(v=>!v.every(Number.isFinite)||Math.hypot(...v)<1e-9))return null;
 const light=unit(ms),view=unit(me),cosPhase=Math.max(-1,Math.min(1,dot(light,view)));
 const normal:Vec3=[0,0,1];let up=normal.map((v,i)=>v-view[i]*dot(normal,view)) as Vec3;
 if(Math.hypot(...up)<1e-8)up=[0,1,0];up=unit(up);const right=unit(cross(up,view));
 const longitude=((Math.atan2(em[1],em[0])-Math.atan2(es[1],es[0]))*180/Math.PI+360)%360;
 const stage=Math.floor((longitude+22.5)/45)%8;
 const names=['新月附近','盈眉月阶段','上弦附近','盈凸月阶段','满月附近','亏凸月阶段','下弦附近','残月阶段'];
 return {fraction:(1+cosPhase)/2,cosPhase,phaseAngle:Math.acos(cosPhase)*180/Math.PI,longitude,name:names[stage],rotation:Math.atan2(-dot(light,up),dot(light,right))*180/Math.PI,distanceKm:Math.hypot(...em),relative:em,sunDirection:unit(es)};
}
export function moonPhase(frame:StateFrame|null){if(!frame)return null;const at=(id:typeof BODY_IDS[number])=>Array.from(frame.positions.slice(BODY_IDS.indexOf(id)*3,BODY_IDS.indexOf(id)*3+3)) as Vec3;return phaseGeometry(at('sun'),at('earth'),at('moon'));}
/** Unit projected disk lit on +x; rotate toward the projected Sun afterward. */
export function phaseDiskPath(cosPhase:number){
 const c=Math.max(-1,Math.min(1,cosPhase)),points:string[]=[];
 for(let i=0;i<=80;i++){const a=-Math.PI/2+Math.PI*i/80;points.push(`${Math.cos(a)},${Math.sin(a)}`);}
 for(let i=80;i>=0;i--){const a=-Math.PI/2+Math.PI*i/80;points.push(`${-c*Math.cos(a)},${Math.sin(a)}`);}
 return `M${points.join(' L')} Z`;
}
