import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {bodyById} from '../data/catalog';
import {RING_PROFILES,ringDisplayBounds} from '../data/rings';
import {makeFaintRings,updateFaintRings} from './planetaryRings';
import {satelliteParentAttitude} from './SatelliteSystem';
describe('reference ring rendering',()=>{
 it('preserves reference radii and centres when narrow ring visibility is enhanced',()=>{
  for(const p of RING_PROFILES)for(const b of p.bands){
   const radius=bodyById[p.id].radiusKm;
   const actual=ringDisplayBounds(b,radius,false),enhanced=ringDisplayBounds(b,radius,true);
   expect(actual[0]*radius).toBeCloseTo(b.innerKm,6);
   expect(actual[1]*radius).toBeCloseTo(b.outerKm,6);
   expect(enhanced[0]+enhanced[1]).toBeCloseTo(actual[0]+actual[1],10);
   expect(enhanced[1]-enhanced[0]).toBeGreaterThanOrEqual(actual[1]-actual[0]-1e-12);
   expect(actual[0]).toBeGreaterThan(1);
  }
 });
 it('toggles and restores geometry without accumulating meshes or mutating source data',()=>{
  const body=bodyById.uranus,original=JSON.stringify(RING_PROFILES),root=new THREE.Group();
  const rings=makeFaintRings(body,2);root.add(rings);
  const count=rings.children.length;
  updateFaintRings(root,false,false,0);expect(rings.visible).toBe(false);
  const mesh=rings.children[0] as THREE.Mesh<THREE.RingGeometry>;
  const geometry=mesh.geometry;
  updateFaintRings(root,true,false,3600);expect(mesh.geometry).toBe(geometry);
  updateFaintRings(root,true,true,3600);expect(mesh.geometry).not.toBe(geometry);
  expect(rings.children).toHaveLength(count);expect(JSON.stringify(RING_PROFILES)).toBe(original);
  rings.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();o.material.dispose();}});
 });
 it('keeps the reference ring plane tilted with the pole but illustrative arcs independent of surface rotation',()=>{
  const body=bodyById.neptune,root=new THREE.Group(),rings=makeFaintRings(body,1);root.add(rings);
  const directions=[0,86400].map(time=>{
   root.quaternion.copy(satelliteParentAttitude(body,time));updateFaintRings(root,true,true,time);root.updateMatrixWorld(true);
   return new THREE.Vector3(1,0,0).transformDirection(rings.matrixWorld);
  });
  expect(directions[0].distanceTo(directions[1])).toBeLessThan(1e-12);
  rings.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();o.material.dispose();}});
 });
});
