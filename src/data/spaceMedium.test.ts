import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {defaultPhenomenonParts} from './phenomenonParts';
import {MEDIUM_LESSONS,mediumParts,mediumLessonForView,parkerPoint,sheetPoint} from './spaceMedium';
import {createSpaceMedium} from '../components/spaceMediumScene';
import {isolateEnvironmentContext,restoreFamilyContext} from '../components/familyIsolation';
describe('space medium reference layers',()=>{
 it('does not enable explanatory overlays by default or retain selection for mixed views',()=>{
  const p=defaultPhenomenonParts();expect(MEDIUM_LESSONS.every(s=>!p[s.id])).toBe(true);
  for(const step of MEDIUM_LESSONS){const q=mediumParts(p,step.id);expect(q.magnet).toBe(p.magnet);expect(q.sheath||q.medium||q.neutrals).toBe(false);expect(mediumLessonForView('helio','helio',q)?.id).toBe(step.id);expect(mediumLessonForView('sun','solar',q)).toBeNull();expect(mediumLessonForView('helio','helio',{...q,medium:true})).toBeNull();}
  expect(mediumLessonForView('helio','helio',{...mediumParts(p,'photonRays'),currentSheet:true})).toBeNull();
 });
 it('renders one requested layer, finite geometry and a vertically undulating sheet',()=>{
  const scene=createSpaceMedium(new THREE.Texture());for(const s of MEDIUM_LESSONS){scene.update(mediumParts(defaultPhenomenonParts(),s.id),true);expect(scene.root.children.filter(c=>c.visible).map(c=>c.name)).toEqual([s.id]);}
  scene.update(mediumParts(defaultPhenomenonParts(),'chargedParticles'));expect(scene.root.children.find(c=>c.name==='chargedParticles')!.visible).toBe(false);
  const ys=Array.from({length:100},(_,i)=>sheetPoint(1,i/100*Math.PI*2)[1]);expect(Math.min(...ys)).toBeLessThan(-1);expect(Math.max(...ys)).toBeGreaterThan(1);
  for(let i=0;i<=100;i++)expect(parkerPoint(i/100,1,.55).every(Number.isFinite)).toBe(true);
  scene.root.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line||o instanceof THREE.Points)expect(Array.from(o.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);});
 });
 it('hides the Sun in a local particle diagram and restores it on exit',()=>{
  const scene=new THREE.Scene(),sun=new THREE.Group(),root=new THREE.Group();sun.userData.primaryId='sun';root.name='integrated-phenomena';scene.add(sun,root);const hidden=new Map<THREE.Object3D,boolean>();isolateEnvironmentContext(scene,'none',hidden);expect(sun.visible).toBe(false);expect(root.visible).toBe(true);restoreFamilyContext(hidden);expect(sun.visible).toBe(true);
 });
});
