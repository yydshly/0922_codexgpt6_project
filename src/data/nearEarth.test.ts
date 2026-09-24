import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {NEAR_EARTH_LAYERS,NEAR_EARTH_SHAPES,nearEarthPoint} from './nearEarth';
import {defaultEnvironmentLayers,filterEnvironmentLayers} from './spaceEnvironment';
import {allStages,onlyStage} from './stages';
import {makeNearEarthRegion} from '../components/nearEarthRegions';
describe('near-Earth illustrative populations',()=>{
 it('keeps stage 5 and 6 independent without overwriting individual layer choices',()=>{
  const layers={...defaultEnvironmentLayers(),outerBelt:false};
  const fifth=filterEnvironmentLayers(layers,true,false),sixth=filterEnvironmentLayers(layers,false,true);
  expect(fifth.wind).toBe(true);expect(fifth.innerBelt).toBe(false);
  expect(sixth.wind).toBe(false);expect(sixth.innerBelt).toBe(true);expect(sixth.outerBelt).toBe(false);
  expect(filterEnvironmentLayers(layers,true,true)).toEqual(layers);
  expect(Object.values(filterEnvironmentLayers(layers,false,false)).some(Boolean)).toBe(false);
  expect(onlyStage('nearEarth').environment).toBe(false);expect(allStages().nearEarth).toBe(true);
 });
 it('uses repeatable volume markers outside Earth, with thickness on both sides of the equator',()=>{
  for(const layer of NEAR_EARTH_LAYERS){
   let low=0,high=0;
   for(let i=0;i<NEAR_EARTH_SHAPES[layer.id].count;i++){
    const point=nearEarthPoint(layer.id,i);expect(point.every(Number.isFinite)).toBe(true);expect(Math.hypot(...point)).toBeGreaterThan(1);
    expect(nearEarthPoint(layer.id,i)).toEqual(point);low=Math.min(low,point[1]);high=Math.max(high,point[1]);
   }
   expect(low).toBeLessThan(-.4);expect(high).toBeGreaterThan(.4);
  }
 });
 it('applies one cutaway control to both volume and markers without rebuilding geometry',()=>{
  const group=makeNearEarthRegion('outerBelt');
  const geometry=group.children.map(o=>(o as THREE.Mesh).geometry);
  for(const o of group.children)expect(((o as THREE.Mesh).material as THREE.ShaderMaterial).uniforms.cutaway).toBe(group.userData.cutaway);
  group.userData.cutaway.value=false;
  for(const o of group.children)expect(((o as THREE.Mesh).material as THREE.ShaderMaterial).uniforms.cutaway.value).toBe(false);
  expect(group.children.map(o=>(o as THREE.Mesh).geometry)).toEqual(geometry);
  group.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Points){o.geometry.dispose();(o.material as THREE.Material).dispose();}});
 });
});
