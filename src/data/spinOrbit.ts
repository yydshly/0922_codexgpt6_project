import * as THREE from 'three';
import {bodyById} from './catalog';
import {referenceAttitude} from '../components/referenceAttitude';
import {BODY_IDS,type StateFrame,type Vec3} from '../types';
export type SpinOrbitBody='moon'|'mercury';
export const LOCK_SOURCE='https://science.nasa.gov/moon/tidal-locking/';
export const RESONANCE_SOURCE='https://www.nature.com/articles/nature02609';
export const spinOrbitBody=(lesson:string):SpinOrbitBody|null=>lesson==='moon-lock'?'moon':lesson==='mercury-resonance'?'mercury':null;
export const needsMoonFamily=(lesson:string|null|undefined)=>lesson==='moon-phase'||lesson==='moon-lock'||lesson==='tidal-cause'||lesson==='jupiter-resonance';
export function spinOrbitProgress(body:SpinOrbitBody,now:number,epoch:number){const elapsed=now-epoch,definition=bodyById[body];return {days:elapsed/86400,spins:elapsed/86400*definition.rotationRateDegPerDay!/360,meanOrbits:elapsed/(definition.orbitalPeriodDays*86400),spinDays:360/Math.abs(definition.rotationRateDegPerDay!),orbitDays:definition.orbitalPeriodDays};}
export function bodyReferenceDirection(body:SpinOrbitBody,time:number){return new THREE.Vector3(1,0,0).applyQuaternion(referenceAttitude(bodyById[body],time));}
export function moonRelative(frame:StateFrame|null):Vec3|null{if(!frame)return null;const e=BODY_IDS.indexOf('earth')*3,m=BODY_IDS.indexOf('moon')*3;return [0,1,2].map(i=>frame.positions[m+i]-frame.positions[e+i]) as Vec3;}
