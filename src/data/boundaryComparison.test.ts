import {describe,it,expect} from 'vitest';
import {boundaryLayers,boundaryForView,BOUNDARY_STEPS,BOUNDARY_SCALE} from './boundaryComparison';
import {defaultIntegratedFlags} from './integratedScene';
import {macroRadius} from './macroStructure';
import {stagedLayers,allStages} from './stages';
const off={solar:false,environment:false,belts:false,dust:false,helio:false};
describe('boundary comparison presets',()=>{
 it('matches only the displayed regions without unrelated phenomenon overlays',()=>{
  for(const s of BOUNDARY_STEPS){const layers=boundaryLayers(s.id);expect(boundaryForView(s.id,'zones',null,null,layers,off)?.id).toBe(s.id);expect(layers.planetary).toBe(true);expect(layers.moons||layers.comets||layers.dust||layers.wind).toBe(false);expect(boundaryForView(s.id,'zones',null,null,layers,defaultIntegratedFlags())).toBeNull();expect(boundaryForView(s.id,'zones','helio',null,layers,off)).toBeNull();expect(boundaryForView(s.id,'zones',null,null,{...layers,asteroid:true},off)).toBeNull();}
 });
 it('compares both regions using the same monotonic compression without implying true radius ratios',()=>{
  const layers=boundaryLayers('all');expect(layers.heliosphere&&layers.oort).toBe(true);const radii=[120,...BOUNDARY_SCALE.oortInnerAu,...BOUNDARY_SCALE.oortOuterAu].map(macroRadius);expect(radii).toEqual([...radii].sort((a,b)=>a-b));expect(macroRadius(2000)/macroRadius(120)).toBeLessThan(2000/120);expect(BOUNDARY_SCALE.oortInnerAu[0]).toBeGreaterThan(BOUNDARY_SCALE.referenceHeliopauseAu);
 });
 it('honors the base structure stage for both shells',()=>{
  const actual=stagedLayers(boundaryLayers('all'),{...allStages(),structure:false});expect(actual.heliosphere||actual.oort).toBe(false);
 });
});
