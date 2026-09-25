import {bodyById} from './catalog';
import {BODY_IDS,type StateFrame,type Vec3} from '../types';
import {dot,ttCalendarToTdb} from './lunarEclipse';
export const SOLAR_ECLIPSE_SOURCE='https://eclipse.gsfc.nasa.gov/SEbeselm/SEbeselm2001/SE2026Aug12Tbeselm.html';
export const SOLAR_REFERENCE_TDB=ttCalendarToTdb('2026-08-12T17:47:05.200Z');
export const SOLAR_START=SOLAR_REFERENCE_TDB-4*3600,SOLAR_END=SOLAR_REFERENCE_TDB+4*3600;
export const inSolarWindow=(t:number)=>t>=SOLAR_START&&t<=SOLAR_END;
const sub=(a:Vec3,b:Vec3):Vec3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const norm=(a:Vec3):Vec3=>{const d=Math.hypot(...a);return a.map(v=>v/d) as Vec3;};
const cross=(a:Vec3,b:Vec3):Vec3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
/** Earth-centered orthonormal frame: +z is away from Sun along the lunar shadow axis. */
export function solarShadow(frame:StateFrame|null){
 if(!frame||!Number.isFinite(frame.time)||frame.positions.length!==BODY_IDS.length*3||!frame.positions.every(Number.isFinite))return null;
 const pos=(id:'sun'|'earth'|'moon'):Vec3=>{const i=BODY_IDS.indexOf(id)*3;return [frame.positions[i],frame.positions[i+1],frame.positions[i+2]];};
 const sun=pos('sun'),moon=pos('moon'),earth=pos('earth'),away=sub(moon,sun),d=Math.hypot(...away);
 if(d<=bodyById.sun.radiusKm+bodyById.moon.radiusKm)return null;
 const axis=norm(away),horizontal=norm(cross(Math.abs(axis[2])>.99?[0,1,0]:[0,0,1],axis)),vertical=cross(axis,horizontal);
 const relative=sub(earth,moon),axialKm=dot(relative,axis),point=[-dot(relative,horizontal),-dot(relative,vertical)] as const,offsetKm=Math.hypot(...point);
 const u=(bodyById.sun.radiusKm-bodyById.moon.radiusKm)/d,p=(bodyById.sun.radiusKm+bodyById.moon.radiusKm)/d;
 const umbraSlope=-u/Math.sqrt(1-u*u),penumbraSlope=p/Math.sqrt(1-p*p);
 const umbraKm=(bodyById.moon.radiusKm-axialKm*u)/Math.sqrt(1-u*u),penumbraKm=(bodyById.moon.radiusKm+axialKm*p)/Math.sqrt(1-p*p);
 const earthRadiusKm=bodyById.earth.radiusKm,axisHits=axialKm>earthRadiusKm&&offsetKm<earthRadiusKm;
 const entryZ=axisHits?-Math.sqrt(earthRadiusKm**2-offsetKm**2):null;
 const surfaceUmbraKm=entryZ===null?null:umbraKm+entryZ*umbraSlope;
 // Maximum of the expanding cone radius plus a spherical cross-section radius.
 const penumbraTouches=axialKm>earthRadiusKm&&offsetKm<penumbraKm+earthRadiusKm*Math.sqrt(1+penumbraSlope**2);
 const toSun=norm(sub(sun,earth));
 return {axialKm,point,offsetKm,umbraKm,penumbraKm,umbraSlope,penumbraSlope,earthRadiusKm,axisHits,entryZ,surfaceUmbraKm,penumbraTouches,
  sunDirection:[dot(toSun,horizontal),dot(toSun,vertical),dot(toSun,axis)] as Vec3,
  stage:axisHits?(surfaceUmbraKm!>0?'本影轴穿过地球 · 全食条件':'伪本影轴穿过地球 · 环食条件'):penumbraTouches?'月影触及球面 · 影轴未穿地球':'月影未触及地球'};
}
export type SolarShadow=NonNullable<ReturnType<typeof solarShadow>>;
/** Classify a point on the reference Earth sphere, including its sunlit side. */
export function solarSurfaceZone(g:SolarShadow,point:Vec3):'夜侧'|'无食'|'偏食区'|'全食区'|'环食区'{
 if(dot(point,g.sunDirection)<=0)return '夜侧';
 if(g.axialKm+point[2]<=0)return '无食';
 const d=Math.hypot(point[0]-g.point[0],point[1]-g.point[1]),u=g.umbraKm+point[2]*g.umbraSlope,p=g.penumbraKm+point[2]*g.penumbraSlope;
 return d<Math.abs(u)?u>0?'全食区':'环食区':d<p?'偏食区':'无食';
}
export function minimumSolarAxis(sample:(t:number)=>StateFrame,start=SOLAR_REFERENCE_TDB-7200,end=SOLAR_REFERENCE_TDB+7200){
 const f=(t:number)=>{const g=solarShadow(sample(t));if(!g)throw new Error('日食验证状态缺失');return g.offsetKm**2;};
 // Only the single minimum in this known-event bracket; not a general eclipse search.
 for(let i=0;i<65;i++){const a=start+(end-start)/3,b=end-(end-start)/3;if(f(a)<f(b))end=b;else start=a;}
 return (start+end)/2;
}
