import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {parseStarCatalogue} from '../data/starCatalogue';
import {panoramaStarDirection,HORIZONS_OBLIQUITY} from '../data/panoramaStars';
import {createPanoramaStars} from './panoramaStarScene';
const data=parseStarCatalogue(JSON.parse(readFileSync('public/data/stars/hip2-subset.json','utf8')));
describe('catalogue backdrop in Horizons ecliptic axes',()=>{
 it('maps equatorial cardinal directions and the ecliptic pole with the JPL obliquity',()=>{
  expect(HORIZONS_OBLIQUITY*180/Math.PI).toBeCloseTo(23.43929111111111,12);
  expect(panoramaStarDirection(0,0)).toEqual([1,0,-0]);
  const six=panoramaStarDirection(Math.PI/2,0);expect(six[1]).toBeCloseTo(-.3977771559319137,13);expect(six[2]).toBeCloseTo(-.9174820620691818,13);
  const pole=panoramaStarDirection(3*Math.PI/2,Math.PI/2-HORIZONS_OBLIQUITY);expect(pole[1]).toBeCloseTo(1,13);expect(pole[2]).toBeCloseTo(0,13);
 });
 it('keeps every catalogue direction unit-length without changing its HIP identity',()=>{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(44,1,.02,200),sky=createPanoramaStars(scene,new THREE.Texture());sky.update(data,camera,true);
  const ids=sky.root.children.flatMap(p=>p.userData.hipIds);expect(ids.sort((a,b)=>a-b)).toEqual(data.sky.map(s=>s.hip).sort((a,b)=>a-b));
  for(const star of data.sky)expect(Math.hypot(...panoramaStarDirection(star.ra,star.dec))).toBeCloseTo(1,13);
  sky.dispose();expect(scene.children).toHaveLength(0);
 });
 it('preserves selected direction during camera translation and rejects hits when disabled',()=>{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(44,1,.02,200),sky=createPanoramaStars(scene,new THREE.Texture()),s=data.sky[10];
  const direction=new THREE.Vector3(...panoramaStarDirection(s.ra,s.dec));
  for(const position of [[0,0,0],[38,-15,52]]){camera.position.set(...position as [number,number,number]);camera.lookAt(camera.position.clone().add(direction));camera.updateMatrixWorld();sky.update(data,camera,true);expect(sky.pick(camera,500,500,1000,1000)).toBe(s.hip);}
  sky.update(data,camera,false);expect(sky.pick(camera,500,500,1000,1000)).toBeNull();
  sky.update(null,camera,true);expect(sky.root.children).toHaveLength(0);expect(sky.root.visible).toBe(false);sky.dispose();
 });
 it('does not recreate buffers per frame and releases replaced buffers',()=>{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),sky=createPanoramaStars(scene,new THREE.Texture());sky.update(data,camera,true);
  const first=sky.root.children[0] as THREE.Points;let disposed=false;first.geometry.addEventListener('dispose',()=>{disposed=true});
  sky.update(data,camera,true);expect(sky.root.children[0]).toBe(first);expect(disposed).toBe(false);sky.update(null,camera,true);expect(disposed).toBe(true);
 });
});
