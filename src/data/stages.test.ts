import {describe,it,expect} from 'vitest';
import {allStages,onlyStage,stagedLayers} from './stages';
import {defaultMacroLayers} from './macroLayers';
describe('stage presentation filters',()=>{
 it('preserves baseline planets and independent stage combinations without mutating saved layer choices',()=>{
  const layers=defaultMacroLayers(), flags=onlyStage('comets');
  expect(stagedLayers(layers,flags)).toEqual({...Object.fromEntries(Object.keys(layers).map(k=>[k,false])),planetary:true,comets:true});
  expect(Object.values(layers).every(Boolean)).toBe(true);
  expect(stagedLayers(layers,{...flags,members:true}).dwarfs).toBe(true);
  expect(stagedLayers(layers,onlyStage('families')).moons).toBe(true);
  expect(stagedLayers(layers,onlyStage('structure')).moons).toBe(false);
  expect(stagedLayers(layers,allStages())).toEqual(layers);
 });
 it('isolates the environment module without enabling other additions',()=>{
  const flags=onlyStage('environment');
  expect(Object.values(flags).filter(Boolean)).toHaveLength(1);
  expect(flags.environment).toBe(true);
  const layers=stagedLayers(defaultMacroLayers(),flags);
  expect(Object.entries(layers).filter(([,visible])=>visible).map(([id])=>id)).toEqual(['planetary']);
  expect(Object.values(allStages()).every(Boolean)).toBe(true);
 });
 it('never re-enables a manually hidden layer when its stage is enabled',()=>{
  const layers={...defaultMacroLayers(),comets:false,moons:false};
  expect(stagedLayers(layers,allStages())).toEqual(layers);
  expect(stagedLayers(layers,onlyStage('comets')).comets).toBe(false);
 });
});
