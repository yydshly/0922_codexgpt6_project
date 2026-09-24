import {describe,it,expect} from 'vitest';
import {macroCometAnchor,cometAntiSolar} from './macroComets';
import {macroEcliptic} from './macroLayers';
import {AU_KM} from './catalog';
import type {StateFrame} from '../types';
import type {StateBatch} from '../ephemeris/stateProvider';
const frame:StateFrame={time:100,positions:new Float64Array([100,200,300,...Array(27).fill(0)]),velocities:new Float64Array(30)};
const batch=():StateBatch=>({timeTdb:100,originId:'ssb',frame:'ECLIPJ2000',positionUnit:'km',velocityUnit:'km/s',sourceVersion:'test',states:[{id:'halley',position:[100+AU_KM,200+2*AU_KM,300-3*AU_KM],velocity:[1,2,3]}]});
describe('macro comet focus and direction',()=>{
 it('uses the same Sun-relative coordinates as the comet mesh without mutating source',()=>{const b=batch(),copy=JSON.stringify(b);expect(macroCometAnchor(frame,b,'halley')).toEqual(macroEcliptic([1,2,-3]));expect(JSON.stringify(b)).toBe(copy);});
 it('rejects mismatched dates, missing targets and unavailable data',()=>{expect(macroCometAnchor(frame,{...batch(),timeTdb:101},'halley')).toBeNull();expect(macroCometAnchor(frame,batch(),'67p')).toBeNull();expect(macroCometAnchor(null,batch(),'halley')).toBeNull();expect(macroCometAnchor(frame,null,'halley')).toBeNull();});
 it('rejects incompatible origins and non-finite or zero positions',()=>{expect(macroCometAnchor(frame,{...batch(),originId:'sun'},'halley')).toBeNull();const b=batch();b.states[0].position=[100,200,300];expect(macroCometAnchor(frame,b,'halley')).toBeNull();b.states[0].position[0]=NaN;expect(macroCometAnchor(frame,b,'halley')).toBeNull();});
 it('points away from the Sun with the correct axis mapping, independent of distance',()=>{expect(cometAntiSolar([3,4,0])).toEqual([.6,0,-.8]);expect(cometAntiSolar([30,40,0])).toEqual(cometAntiSolar([3,4,0]));expect(cometAntiSolar([0,0,-1])).toEqual([0,-1,-0]);expect(cometAntiSolar([0,0,0])).toBeNull();expect(cometAntiSolar([NaN,1,0])).toBeNull();});
});
