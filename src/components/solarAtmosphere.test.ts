import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {createSolarAtmosphere,prominencePoints,SOLAR_DISPLAY_RADII} from './solarAtmosphere';
import {defaultPhenomenonParts} from '../data/phenomenonParts';
import {solarLessonParts,matchesSolarLesson,SOLAR_LESSONS} from '../data/solarLayers';
import {readScenePresence} from './scenePresence';
describe('solar atmospheric teaching layers',()=>{
 it('orders atmosphere outward and keeps both prominence footpoints on surface',()=>{
  const r=Object.values(SOLAR_DISPLAY_RADII);expect(r).toEqual([...r].sort((a,b)=>a-b));
  for(const offset of [0,.032]){const points=prominencePoints(.341,offset);expect(points[0].length()).toBeCloseTo(.341,10);expect(points.at(-1)!.length()).toBeCloseTo(.341,10);expect(points.every(p=>p.length()>=.341-1e-10)).toBe(true);expect(points[32].length()).toBeGreaterThan(.5);}
 });
 it('advances layers without changing other environments or the original choices',()=>{
  const parts=defaultPhenomenonParts(),original={...parts};parts.magnet=false;
  for(const step of SOLAR_LESSONS){const next=solarLessonParts(parts,step.id);expect(next.magnet).toBe(false);expect(next.stream).toBe(original.stream);expect(next.flare).toBe(false);expect(next.cme).toBe(false);expect(matchesSolarLesson(next,step.id)).toBe(true);}
  expect(parts.corona).toBe(true);expect(parts.sunspots).toBe(true);
  expect(solarLessonParts(parts,'surface').corona).toBe(false);expect(solarLessonParts(parts,'corona').sunspots).toBe(false);expect(solarLessonParts(parts,'features').sunspots).toBe(true);
 });
 it('changes actual rendered geometry, respects parent visibility and suppresses a hidden corona',()=>{
  const a=createSolarAtmosphere(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,.01,100);camera.position.z=2;camera.lookAt(0,0,0);a.root.userData.sceneElement='solar';scene.add(a.root);scene.updateMatrixWorld(true);
  a.update(defaultPhenomenonParts());expect(readScenePresence(scene,camera).solar.rendered).toBe(10);
  a.update(solarLessonParts(defaultPhenomenonParts(),'surface'));expect(readScenePresence(scene,camera).solar.rendered).toBe(0);
  a.update(solarLessonParts(defaultPhenomenonParts(),'chromosphere'));expect(readScenePresence(scene,camera).solar.rendered).toBe(1);expect(a.corona.visible).toBe(false);
  a.update(solarLessonParts(defaultPhenomenonParts(),'transition'));expect(readScenePresence(scene,camera).solar.rendered).toBe(2);
  a.root.visible=false;expect(readScenePresence(scene,camera).solar.rendered).toBe(0);
  a.root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();o.material.dispose();}});
 });
});
