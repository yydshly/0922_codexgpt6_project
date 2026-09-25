import * as THREE from 'three';
import {bodyById,AU_KM} from './catalog';
import {referenceAttitude} from '../components/referenceAttitude';
import {BODY_IDS,type StateFrame} from '../types';
import {tdbToUtc,utcToTdb} from './time';
export const SEASONS_SOURCE='https://spaceplace.nasa.gov/seasons/en/';
export const SEASON_DATES=[{month:3,day:20},{month:6,day:21},{month:9,day:23},{month:12,day:21}] as const;
export function seasonDate(time:number,month:number,day:number){return utcToTdb(Date.UTC(tdbToUtc(time).getUTCFullYear(),month-1,day,4));} // 12:00 Beijing, comparison dates only.
/** Same static J2000 pole as the existing renderer, in scene coordinates. */
export function earthSeasonPole(){return new THREE.Vector3(0,1,0).applyQuaternion(referenceAttitude(bodyById.earth,0)).normalize();}
export function idealDaylight(latitude:number,declination:number){
 if(!Number.isFinite(latitude)||!Number.isFinite(declination)||Math.abs(latitude)>90||Math.abs(declination)>90)return NaN;
 const phi=latitude*Math.PI/180,delta=declination*Math.PI/180,a=Math.sin(phi)*Math.sin(delta),b=Math.cos(phi)*Math.cos(delta);
 if(Math.abs(b)<1e-12)return Math.abs(a)<1e-12?12:a>0?24:0;
 const limit=-a/b;return limit<=-1?24:limit>=1?0:24*Math.acos(limit)/Math.PI;
}
export function noonAltitude(latitude:number,declination:number){return 90-Math.abs(latitude-declination);}
export function seasonGeometry(frame:StateFrame|null){
 if(!frame)return null;const e=BODY_IDS.indexOf('earth')*3,s=BODY_IDS.indexOf('sun')*3;
 const direction=new THREE.Vector3(frame.positions[s]-frame.positions[e],frame.positions[s+2]-frame.positions[e+2],-(frame.positions[s+1]-frame.positions[e+1]));
 const distance=direction.length();if(!Number.isFinite(distance)||distance===0)return null;direction.normalize();
 const pole=earthSeasonPole(),declination=Math.asin(THREE.MathUtils.clamp(pole.dot(direction),-1,1))*180/Math.PI;
 return {direction,pole,declination,distanceAu:distance/AU_KM,tilt:Math.acos(THREE.MathUtils.clamp(pole.y,-1,1))*180/Math.PI,north:idealDaylight(40,declination),south:idealDaylight(-40,declination)};
}
