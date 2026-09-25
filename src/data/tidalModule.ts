import {SATELLITES} from './satellites';
import type {MacroMoon} from './macroFamilies';
export const TIDAL_ROUTE=[{id:'tidal-cause',label:'锁定原理'},{id:'moon-lock',label:'月球案例'},{id:'mercury-resonance',label:'水星自转—公转共振'},{id:'jupiter-resonance',label:'木星卫星轨道共振'}] as const;
export const RESONANT_MOONS=['io','europa','ganymede'] as const;
export const ORBIT_RESONANCE_SOURCE='https://science.nasa.gov/jupiter/jupiter-moons/ganymede/facts/';
export const GANYMEDE_PERIOD=SATELLITES.find(b=>b.id==='ganymede')!.orbitalPeriodDays*86400;
export function resonantStates(states:readonly MacroMoon[]){return states.filter(s=>RESONANT_MOONS.some(id=>id===s.id)&&s.parentId==='jupiter');}
export function resonanceReady(states:readonly MacroMoon[]){return RESONANT_MOONS.every(id=>states.some(s=>s.id===id&&s.parentId==='jupiter'));}
export function orbitalComparison(now:number,epoch:number){return RESONANT_MOONS.map(id=>{const b=SATELLITES.find(s=>s.id===id)!;return {id,name:b.name,days:b.orbitalPeriodDays,turns:(now-epoch)/(b.orbitalPeriodDays*86400)};});}
