import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {createJupiterEnvironment,ioDisplayFrame} from './jupiterEnvironment';
import {familyLocalPosition,familyMoonRadius,type MacroMoon} from '../data/macroFamilies';
import {defaultPhenomenonParts} from '../data/phenomenonParts';
import {environmentStepParts} from '../data/environmentJourney';
const io:MacroMoon={id:'io',parentId:'jupiter',name:'木卫一',radiusKm:1821.6,position:[421700,18000,25000],velocity:[-.5,17,.8],appearance:'rock',color:'#fff',sourceUrl:'',orbitalPeriodDays:1.769};
describe('Jovian environment teaching geometry',()=>{
 it('places the Io marker using the same date state and scale as the satellite family',()=>{
  const f=ioDisplayFrame(io)!;expect(f.position.toArray()).toEqual(familyLocalPosition(io.position,'jupiter'));
  const normal=new THREE.Vector3(0,0,1).applyQuaternion(f.rotation);expect(normal.dot(f.position)).toBeCloseTo(0,12);
  const model=createJupiterEnvironment(new THREE.Texture()),parent=new THREE.Vector3(8,1,3);
  model.update(parent,io,true,true,true,environmentStepParts(defaultPhenomenonParts(),'io-torus'));
  expect(model.ioAnchor.toArray()).toEqual(parent.clone().add(f.position).toArray());expect(model.ioBody.scale.x).toBe(familyMoonRadius(io.radiusKm,'jupiter'));expect(model.ioVisible).toBe(true);
 });
 it('has no fabricated torus or Io position when the satellite ephemeris is missing',()=>{
  const model=createJupiterEnvironment(new THREE.Texture());model.update(new THREE.Vector3(1,0,0),undefined,true,true,true,environmentStepParts(defaultPhenomenonParts(),'io-torus'));
  expect(model.ioVisible).toBe(false);expect(model.ioBody.visible).toBe(false);expect(model.root.children[1].visible).toBe(false);
 });
 it('honors stage, distance and separate component switches',()=>{
  const model=createJupiterEnvironment(new THREE.Texture()),p=new THREE.Vector3(1,0,0),parts=environmentStepParts(defaultPhenomenonParts(),'jupiter-aurora');
  model.update(p,io,true,true,true,parts);expect(model.root.children.slice(0,3).map(c=>c.visible)).toEqual([false,false,true]);
  model.update(p,io,false,true,true,parts);expect(model.root.visible).toBe(false);
  model.update(p,io,true,false,true,parts);expect(model.root.visible).toBe(false);
  model.update(null,io,true,true,true,parts);expect(model.root.visible).toBe(false);expect(model.ioVisible).toBe(false);
 });
 it('follows changing ephemeris and does not derive Io motion from teaching progress',()=>{
  const model=createJupiterEnvironment(new THREE.Texture()),parts=environmentStepParts(defaultPhenomenonParts(),'io-torus');
  model.update(new THREE.Vector3(1,0,0),io,true,true,true,parts);const first=model.ioAnchor.clone();
  const later={...io,position:[18000,421700,25000] as [number,number,number]};model.update(new THREE.Vector3(2,0,0),later,true,true,true,parts);
  expect(model.ioAnchor.distanceTo(first)).toBeGreaterThan(.1);expect(model.ioAnchor.toArray()).toEqual(new THREE.Vector3(2,0,0).add(new THREE.Vector3(...familyLocalPosition(later.position,'jupiter'))).toArray());
 });
 it('rejects degenerate orbital planes',()=>{expect(ioDisplayFrame({...io,velocity:[0,0,0]})).toBeNull();});
});
