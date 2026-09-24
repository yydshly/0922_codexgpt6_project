import {describe,it,expect} from 'vitest';
import {primaryMetrics,primaryId,primaryTarget,PRIMARY_BODIES} from './macroPrimary';
import {AU_KM} from './catalog';
import type {StateFrame} from '../types';
const frame=():StateFrame=>({time:100,positions:new Float64Array([AU_KM,0,AU_KM,...Array(27).fill(0)]),velocities:new Float64Array([1,2,0,...Array(27).fill(0)])});
describe('primary bodies in the macro panorama',()=>{
 it('covers the Sun and eight planets without conflating family targets or the Moon',()=>{expect(PRIMARY_BODIES).toHaveLength(9);for(const b of PRIMARY_BODIES)expect(primaryId(primaryTarget(b.id as Exclude<typeof b.id,'moon'>))).toBe(b.id);expect(primaryId('earth')).toBeNull();expect(primaryId('body:moon')).toBeNull();expect(primaryId(null)).toBeNull();});
 it('subtracts the Sun in both planet position and velocity without mutating the frame',()=>{const f=frame();f.positions.set([AU_KM,3*AU_KM,-3*AU_KM],3);f.velocities.set([4,6,0],3);const copy=f.positions.slice();expect(primaryMetrics(f,'mercury')).toEqual({reference:'太阳中心',distanceAu:5,speedKmS:5,heightAu:-4});expect(f.positions).toEqual(copy);});
 it('uses the solar-system barycenter for Sun metrics, not a zero self-relative velocity',()=>{expect(primaryMetrics(frame(),'sun')).toEqual({reference:'太阳系质心（SSB）',distanceAu:Math.SQRT2,speedKmS:Math.sqrt(5),heightAu:1});});
 it('does not fabricate a reading when ephemeris data is absent or invalid',()=>{expect(primaryMetrics(null,'earth')).toBeNull();const f=frame();f.positions[3]=NaN;expect(primaryMetrics(f,'mercury')).toBeNull();});
});
