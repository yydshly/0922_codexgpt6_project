import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {TIDAL_ROUTE,GANYMEDE_PERIOD,resonantStates,resonanceReady,orbitalComparison} from './tidalModule';
import {SATELLITES} from './satellites';
import type {MacroMoon} from './macroFamilies';
import {interpolateSatelliteChunk} from '../ephemeris/satellites';
import {MOTION_LESSONS,motionStepSeconds,motionCycleSeconds} from './motionLessons';
import {needsMoonFamily} from './spinOrbit';
const chunk=JSON.parse(readFileSync('public/data/satellites/jupiter-2026-09.json','utf8'));
const states=(days=0)=>interpolateSatelliteChunk(chunk,chunk.series[0].startTdb+days*86400).states.map(s=>({...SATELLITES.find(b=>b.id===s.id)!,...s,parentId:'jupiter' as const})) as MacroMoon[];
it('orders mechanism, synchronous spin, spin-orbit and orbital resonance with corresponding targets',()=>{
 expect(TIDAL_ROUTE.map(s=>MOTION_LESSONS.find(l=>l.id===s.id)?.target)).toEqual(['earth','earth','body:sun','jupiter']);
 expect(needsMoonFamily('tidal-cause')).toBe(true);expect(needsMoonFamily('jupiter-resonance')).toBe(true);
 expect(motionStepSeconds('jupiter-resonance')*4).toBe(GANYMEDE_PERIOD);expect(motionCycleSeconds('jupiter-resonance')).toBe(GANYMEDE_PERIOD);
});
it('requires all three current Jupiter states and excludes Callisto without replacing ephemeris vectors',()=>{
 const all=states(),filtered=resonantStates(all);expect(filtered.map(s=>s.id)).toEqual(['io','europa','ganymede']);expect(resonanceReady(all)).toBe(true);
 expect(resonanceReady(filtered.slice(1))).toBe(false);expect(resonanceReady(filtered.map(s=>({...s,parentId:'earth'})))).toBe(false);
 filtered.forEach(s=>expect(s).toBe(all.find(a=>a.id===s.id)));
 const later=resonantStates(states(.25));filtered.forEach((s,i)=>expect(Math.hypot(...s.position.map((v,j)=>v-later[i].position[j]))).toBeGreaterThan(10000));
});
it('labels mean-period counters without forcing integer resonance counts',()=>{
 const counts=orbitalComparison(GANYMEDE_PERIOD,0);expect(counts.map(s=>Number(s.turns.toFixed(2)))).toEqual([4.04,2.01,1]);
 expect(counts[0].turns).not.toBe(4);expect(orbitalComparison(0,GANYMEDE_PERIOD).map(s=>s.turns)).toEqual(counts.map(s=>-s.turns));
 expect(orbitalComparison(15,15).every(s=>s.turns===0)).toBe(true);
});
