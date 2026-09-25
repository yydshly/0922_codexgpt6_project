import {expect,it} from 'vitest';
import * as THREE from 'three';
import {phaseGeometry,phaseDiskPath,moonPhase} from './moonPhase';
import {BODY_IDS,type StateFrame,type Vec3} from '../types';
import {createMoonPhaseScene} from '../components/moonPhaseScene';
import {isolateFamilyContext,restoreFamilyContext} from '../components/familyIsolation';
import {motionPlaybackSpeed,motionStepSeconds} from './motionLessons';
const sun:Vec3=[1e9,0,0],earth:Vec3=[0,0,0];
function frame(moon:Vec3):StateFrame{const positions=new Float64Array(30);positions.set(sun);positions.set(moon,BODY_IDS.indexOf('moon')*3);return {time:0,positions,velocities:new Float64Array(30)};}
it('resolves new, full, waxing and waning quarters from three-body geometry',()=>{
 expect(phaseGeometry(sun,earth,[1,0,0])?.fraction).toBe(0);expect(phaseGeometry(sun,earth,[-1,0,0])?.fraction).toBe(1);
 const waxing=phaseGeometry(sun,earth,[0,1,0])!,waning=phaseGeometry(sun,earth,[0,-1,0])!;
 expect(waxing.fraction).toBeCloseTo(.5,8);expect(waning.fraction).toBeCloseTo(.5,8);expect(waxing.name).toBe('上弦附近');expect(waning.name).toBe('下弦附近');expect(waxing.rotation).toBeCloseTo(0,8);expect(Math.abs(waning.rotation)).toBeCloseTo(180,8);
});
it('does not replace phase geometry with a circular calendar or assume a flat Moon orbit',()=>{
 const a=phaseGeometry(sun,earth,[1,1,1])!;const shift:Vec3=[128,-42,891];const translated=(v:Vec3)=>v.map((x,i)=>x+shift[i]) as Vec3;
 const b=phaseGeometry(translated(sun),translated(earth),translated([1,1,1]))!;expect(a.fraction).toBeCloseTo(b.fraction,12);expect(a.rotation).toBeCloseTo(b.rotation,12);expect(Math.abs(a.rotation)).toBeGreaterThan(1);expect(a.fraction).not.toBeCloseTo(phaseGeometry(sun,earth,[1,1,0])!.fraction,3);
 expect(phaseGeometry(sun,earth,earth)).toBeNull();expect(phaseGeometry([NaN,0,0],earth,[1,0,0])).toBeNull();expect(moonPhase(null)).toBeNull();
});
it('drawn illuminated area agrees with the geometric fraction across crescent and gibbous phases',()=>{
 for(const c of [-1,-.9,-.5,0,.5,.9,1]){const pts=phaseDiskPath(c).slice(1,-2).split(' L').map(p=>p.split(',').map(Number));let twice=0;pts.forEach((a,i)=>{const b=pts[(i+1)%pts.length];twice+=a[0]*b[1]-a[1]*b[0];});expect(Math.abs(twice)/2/Math.PI).toBeCloseTo((1+c)/2,3);}
});
it('uses the same Moon frame in the scene, keeps only its reference during Earth isolation and clears it on exit',()=>{
 const scene=new THREE.Scene(),ref=createMoonPhaseScene(scene),anchor=new THREE.Vector3(4,2,1);expect(ref.root.visible).toBe(false);ref.update(frame([0,384400,0]),true,anchor);expect(ref.root.visible).toBe(true);expect(ref.root.position.toArray()).toEqual(anchor.toArray());
 const arrow=ref.root.children.find(c=>c instanceof THREE.ArrowHelper)!;const dir=new THREE.Vector3(0,1,0).applyQuaternion(arrow.quaternion);expect(dir.x).toBeCloseTo(-1,8);
 const saved=new Map<THREE.Object3D,boolean>();isolateFamilyContext(scene,'earth',saved);expect(ref.root.visible).toBe(true);restoreFamilyContext(saved);isolateFamilyContext(scene,'jupiter',saved);expect(ref.root.visible).toBe(false);restoreFamilyContext(saved);ref.update(frame([0,384400,0]),false,anchor);expect(ref.root.visible).toBe(false);
 expect(motionPlaybackSpeed('moon-phase')).toBe(86400);expect(motionStepSeconds('moon-phase')).toBe(3*86400);
});
