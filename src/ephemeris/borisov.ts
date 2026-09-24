import {LocalMonthlyStateProvider,type StateBatch} from './stateProvider';
import {AU_KM} from '../data/time';
import type {Vec3} from '../types';
export const borisovProvider=new LocalMonthlyStateProvider('borisov',['sun','earth','borisov'],'2019-09-01 至 2020-06-01（UTC）');
/** Same-epoch subtraction, linear AU display; no synthetic closed orbit. */
export function historicalHeliocentric(batch:StateBatch){
 if(batch.originId!=='ssb'||batch.frame!=='ECLIPJ2000'||batch.positionUnit!=='km'||batch.velocityUnit!=='km/s')throw Error('历史坐标不兼容');
 const sun=batch.states.find(s=>s.id==='sun');if(!sun)throw Error('历史数据缺少太阳');
 return batch.states.map(s=>({id:s.id,position:s.position.map((v,i)=>v-sun.position[i]) as Vec3,velocity:s.velocity.map((v,i)=>v-sun.velocity[i]) as Vec3}));
}
export const historicalDisplay=(p:Vec3):Vec3=>[p[0]/AU_KM,p[2]/AU_KM,-p[1]/AU_KM];
