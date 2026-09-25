import {it,expect} from 'vitest';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {bodyById} from './catalog';
import {interpolateChunk} from '../ephemeris/ephemeris';
import {spinOrbitProgress,bodyReferenceDirection,moonRelative,needsMoonFamily} from './spinOrbit';
import {motionStepSeconds,motionCycleSeconds} from './motionLessons';
import {createMoonLockScene} from '../components/moonLockScene';
import {isolateEnvironmentContext,restoreFamilyContext} from '../components/familyIsolation';
const sample=(month:string,days=0)=>{const c=JSON.parse(readFileSync(`public/data/2026-${month}.json`,'utf8'));return interpolateChunk(c,c.startTdb+days*86400);};
it('reports 1:1 and 3:2 reference cycles without overriding actual state',()=>{
 for(const [body,turns,spins] of [['moon',1,1],['mercury',2,3]] as const){const t=turns*bodyById[body].orbitalPeriodDays*86400,p=spinOrbitProgress(body,t,0);expect(p.meanOrbits).toBe(turns);expect(p.spins).toBeCloseTo(spins,3);expect(spinOrbitProgress(body,-t,0).spins).toBeCloseTo(-spins,3);}
 expect(motionStepSeconds('moon-lock')).toBe(bodyById.moon.orbitalPeriodDays*86400/4);expect(motionCycleSeconds('mercury-resonance')).toBe(bodyById.mercury.orbitalPeriodDays*86400*2);expect(needsMoonFamily('moon-lock')).toBe(true);expect(needsMoonFamily('mercury-resonance')).toBe(false);
});
it('Mercury reference points approximately opposite after one orbit and returns after two',()=>{
 const t=sample('09').time,period=bodyById.mercury.orbitalPeriodDays*86400,a=bodyReferenceDirection('mercury',t),b=bodyReferenceDirection('mercury',t+period),c=bodyReferenceDirection('mercury',t+period*2);expect(a.dot(b)).toBeLessThan(-.9999);expect(a.dot(c)).toBeGreaterThan(.9999);
});
it('lunar body reference broadly faces Earth across stored months, without enforcing exact alignment',()=>{
 let nonzero=0;for(let m=1;m<=12;m++){const f=sample(String(m).padStart(2,'0'),10),relative=moonRelative(f)!;const earth=new THREE.Vector3(-relative[0],-relative[2],relative[1]).normalize(),face=bodyReferenceDirection('moon',f.time);expect(face.dot(earth)).toBeGreaterThan(.94);nonzero+=face.angleTo(earth);}
 expect(nonzero).toBeGreaterThan(.1);expect(moonRelative(null)).toBeNull();
});
it('moving lunar arrow turns with existing attitude while the comparison arrow stays inertial',()=>{
 const scene=new THREE.Scene(),ref=createMoonLockScene(scene),anchor=new THREE.Vector3(3,2,1);ref.update(sample('09'),true,anchor);const moving=ref.root.children[0],fixed=ref.root.children[1],a=moving.quaternion.clone(),b=fixed.quaternion.clone();ref.update(sample('09',7),true,anchor);expect(a.angleTo(moving.quaternion)).toBeGreaterThan(1.4);expect(b.angleTo(fixed.quaternion)).toBe(0);expect(ref.root.position.toArray()).toEqual(anchor.toArray());ref.update(null,false,anchor);expect(ref.root.visible).toBe(false);
});
it('Mercury overview keeps Sun, Mercury and its orbit, hides Earth, and restores context',()=>{
 const scene=new THREE.Scene();for(const id of ['sun','mercury','earth']){const o=new THREE.Group();o.userData.primaryId=id;scene.add(o);}const orbit=new THREE.Group();orbit.name='macro-planet-reference-orbits';scene.add(orbit);const saved=new Map<THREE.Object3D,boolean>();isolateEnvironmentContext(scene,'sun-mercury',saved,true);expect(scene.children.map(c=>c.visible)).toEqual([true,true,false,true]);restoreFamilyContext(saved);expect(scene.children.every(c=>c.visible)).toBe(true);
});
