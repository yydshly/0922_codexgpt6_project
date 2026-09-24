import {describe,it,expect} from 'vitest';
import {macroMemberAnchor} from './macroMemberState';
import {macroEcliptic} from './macroLayers';
import {AU_KM} from './catalog';
import type {StateFrame} from '../types';
import type {StateBatch} from '../ephemeris/stateProvider';
const frame:StateFrame={time:100,positions:new Float64Array([100,200,300,...Array(27).fill(0)]),velocities:new Float64Array(30)};
const batch=():StateBatch=>({timeTdb:100,originId:'ssb',frame:'ECLIPJ2000',positionUnit:'km',velocityUnit:'km/s',sourceVersion:'test',states:['ceres','vesta','pluto','haumea','makemake','eris'].map(id=>({id,position:[100+AU_KM,200+2*AU_KM,300-3*AU_KM],velocity:[1,2,3]}))});
describe('region member display anchors',()=>{
 it('maps all six targets with the same signed height and Sun-relative coordinates as their meshes',()=>{const b=batch(),copy=JSON.stringify(b);for(const s of b.states)expect(macroMemberAnchor(frame,b,s.id)).toEqual(macroEcliptic([1,2,-3]));expect(JSON.stringify(b)).toBe(copy);});
 it('rejects stale batches and missing objects during a date change, then resolves matching new data',()=>{const next={...frame,time:200},b=batch();expect(macroMemberAnchor(next,b,'ceres')).toBeNull();b.timeTdb=200;b.states[0].position[0]+=AU_KM;expect(macroMemberAnchor(next,b,'ceres')).toEqual(macroEcliptic([2,2,-3]));expect(macroMemberAnchor(frame,batch(),'unknown')).toBeNull();expect(macroMemberAnchor(null,batch(),'ceres')).toBeNull();});
 it('rejects incompatible origin, axes and units rather than shifting the camera',()=>{for(const patch of [{originId:'sun'},{frame:'ICRF'},{positionUnit:'au'},{velocityUnit:'au/day'}])expect(macroMemberAnchor(frame,{...batch(),...patch} as StateBatch,'ceres')).toBeNull();});
 it('rejects invalid or zero coordinates',()=>{const b=batch();b.states[0].position=[100,200,300];expect(macroMemberAnchor(frame,b,'ceres')).toBeNull();b.states[0].position[2]=NaN;expect(macroMemberAnchor(frame,b,'ceres')).toBeNull();});
});
