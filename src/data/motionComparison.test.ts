import {describe,it,expect} from 'vitest';
import {motionComparison} from './motionComparison';
import {BODIES} from './catalog';
import {BODY_IDS,type StateFrame} from '../types';
const frame=():StateFrame=>({time:0,positions:new Float64Array(30),velocities:new Float64Array(30)});
describe('panorama motion comparison',()=>{
 it('uses 3D heliocentric speed and is invariant under a common velocity boost',()=>{
  const f=frame();f.velocities.set([1,2,3],0);f.velocities.set([4,6,15],3);const before=f.velocities.slice();const rows=motionComparison(f,'speed');expect(rows).toHaveLength(8);expect(rows[0].value).toBe(13);expect(f.velocities).toEqual(before);
  for(let i=0;i<BODY_IDS.length;i++)for(let k=0;k<3;k++)f.velocities[i*3+k]+=[12,-7,20][k];expect(motionComparison(f,'speed')).toEqual(rows);
 });
 it('does not invent zero speeds for missing or invalid ephemerides',()=>{expect(motionComparison(null,'speed').every(r=>r.value===null&&r.fraction===null)).toBe(true);const f=frame();f.velocities[3]=NaN;expect(motionComparison(f,'speed')[0].value).toBeNull();expect(motionComparison(frame(),'speed').every(r=>r.value===0&&r.fraction===0)).toBe(true);});
 it('keeps reference periods available without a frame and preserves retrograde meaning',()=>{const rotations=motionComparison(null,'rotation');expect(rotations.filter(r=>r.retrograde).map(r=>r.id)).toEqual(['venus','uranus']);for(const row of rotations)expect(row.value).toBe(Math.abs(BODIES.find(b=>b.id===row.id)!.rotationHours));expect(motionComparison(null,'orbit').find(r=>r.id==='earth')!.value).toBeCloseTo(365.25635535,6);});
 it('normalizes every bar in one linear scale without amplifying small periods',()=>{const rows=motionComparison(null,'rotation'),venus=rows.find(r=>r.id==='venus')!,jupiter=rows.find(r=>r.id==='jupiter')!;expect(venus.fraction).toBe(1);expect(jupiter.fraction).toBeCloseTo(jupiter.value!/venus.value!,12);expect(jupiter.fraction).toBeLessThan(.002);});
});
