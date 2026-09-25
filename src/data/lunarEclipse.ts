import {bodyById} from './catalog';
import {BODY_IDS,type StateFrame,type Vec3} from '../types';
import {J2000_UNIX_MS,tdbMinusTt,tdbToUtc} from './time';
export const LUNAR_ECLIPSE_SOURCE='https://eclipse.gsfc.nasa.gov/LEplot/LEplot2001/LE2026Mar03T.pdf';
export const LUNAR_ECLIPSE_CATALOG='https://eclipse.gsfc.nasa.gov/LEcat5/LE2001-2100.html';
/** Parse a TT calendar label, not a UTC instant; used only for the source event. */
export function ttCalendarToTdb(label:string){const tt=(Date.parse(label)-J2000_UNIX_MS)/1000;let t=tt;for(let i=0;i<3;i++)t=tt+tdbMinusTt(t);return t;}
export const LUNAR_REFERENCE_TDB=ttCalendarToTdb('2026-03-03T11:34:52.100Z');
export const LUNAR_START=LUNAR_REFERENCE_TDB-4*3600,LUNAR_END=LUNAR_REFERENCE_TDB+4*3600;
export const inLunarWindow=(t:number)=>t>=LUNAR_START&&t<=LUNAR_END;
export const dot=(a:Vec3,b:Vec3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a:Vec3,b:Vec3):Vec3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const norm=(a:Vec3):Vec3=>{const d=Math.hypot(...a);return a.map(v=>v/d) as Vec3;};
const cross=(a:Vec3,b:Vec3):Vec3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export type LunarStage='背日侧之外'|'无食'|'半影月食'|'月偏食'|'月全食';
export function lunarStage(axial:number,offset:number,umbra:number,penumbra:number,moonRadius=bodyById.moon.radiusKm):LunarStage{
 if(axial<=0)return '背日侧之外';if(offset>=penumbra+moonRadius)return '无食';if(umbra>0&&offset+moonRadius<=umbra)return '月全食';if(umbra>0&&offset<umbra+moonRadius)return '月偏食';return '半影月食';
}
/** Spherical geometric shadow cross-section; no atmospheric enlargement or apparent corrections. */
export function lunarShadow(frame:StateFrame|null){
 if(!frame||!Number.isFinite(frame.time)||frame.positions.length!==BODY_IDS.length*3||!frame.positions.every(Number.isFinite))return null;
 const position=(id:'sun'|'earth'|'moon'):Vec3=>{const i=BODY_IDS.indexOf(id)*3;return [frame.positions[i],frame.positions[i+1],frame.positions[i+2]];};
 const earth=position('earth'),away=sub(earth,position('sun')),relative=sub(position('moon'),earth),distance=Math.hypot(...away);
 if(distance<=bodyById.sun.radiusKm+bodyById.earth.radiusKm)return null;
 const axis=norm(away),x=dot(relative,axis),transverse=sub(relative,axis.map(v=>v*x) as Vec3),offset=Math.hypot(...transverse);
 const horizontal=norm(cross(Math.abs(axis[2])>.99?[0,1,0]:[0,0,1],axis)),vertical=cross(axis,horizontal);
 const u=(bodyById.sun.radiusKm-bodyById.earth.radiusKm)/distance,p=(bodyById.sun.radiusKm+bodyById.earth.radiusKm)/distance;
 const umbra=(bodyById.earth.radiusKm-x*u)/Math.sqrt(1-u*u),penumbra=(bodyById.earth.radiusKm+x*p)/Math.sqrt(1-p*p);
 return {axialKm:x,offsetKm:offset,umbraKm:umbra,penumbraKm:penumbra,moonRadiusKm:bodyById.moon.radiusKm,point:[dot(relative,horizontal),dot(relative,vertical)] as const,stage:lunarStage(x,offset,umbra,penumbra),magnitude:(umbra+bodyById.moon.radiusKm-offset)/(2*bodyById.moon.radiusKm)};
}
export function minimumShadowAxis(sample:(t:number)=>StateFrame,start=LUNAR_REFERENCE_TDB-7200,end=LUNAR_REFERENCE_TDB+7200){
 const f=(t:number)=>{const g=lunarShadow(sample(t));if(!g)throw new Error('月食验证状态缺失');return g.offsetKm*g.offsetKm;};
 // Ternary refinement is safe for this bracket's single closest approach, not a general event search.
 for(let i=0;i<65;i++){const a=start+(end-start)/3,b=end-(end-start)/3;if(f(a)<f(b))end=b;else start=a;}
 return (start+end)/2;
}
export const eclipseBeijing=(tdb:number)=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(tdbToUtc(tdb));
