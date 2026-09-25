import {it,expect} from 'vitest';
import * as THREE from 'three';
import {motionPlaybackSpeed,motionCycleSeconds,motionStepSeconds,motionSeek,motionLessonForView,spinPeriodSeconds} from './motionLessons';
import {bodyById} from './catalog';
import {referenceAttitude} from '../components/referenceAttitude';
import {createMotionReference} from '../components/motionReference';
it('quarter-turn controls match rendered attitude including the retrograde sign',()=>{
 for(const id of ['earth','venus'] as const){const q0=referenceAttitude(bodyById[id],0),q1=referenceAttitude(bodyById[id],spinPeriodSeconds(id)/4);const a=new THREE.Vector3(1,0,0).applyQuaternion(q0),b=new THREE.Vector3(1,0,0).applyQuaternion(q1),pole=new THREE.Vector3(0,1,0).applyQuaternion(q0);expect(a.dot(b)).toBeCloseTo(0,9);expect(new THREE.Vector3().crossVectors(a,b).dot(pole)).toBeCloseTo(id==='earth'?1:-1,9);expect(q0.angleTo(referenceAttitude(bodyById[id],spinPeriodSeconds(id)))).toBeCloseTo(0,6);}
 expect(motionStepSeconds('earth-orbit')).toBe(30*86400);
});
it('does not silently clamp a lesson step or match another target',()=>{
 expect(motionSeek(9,2,0,10)).toBeNull();expect(motionSeek(1,-2,0,10)).toBeNull();expect(motionSeek(8,2,0,10)).toBe(10);expect(motionSeek(NaN,1,0,10)).toBeNull();expect(motionLessonForView('earth-spin','body:venus')).toBeNull();expect(motionLessonForView('earth-orbit','body:sun')?.id).toBe('earth-orbit');
});
it('anchors the reference to the existing body quaternion and scale',()=>{
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(.09)),root=createMotionReference(mesh);expect(root.parent).toBe(mesh);expect(root.visible).toBe(false);const marker=root.children.find(o=>o instanceof THREE.Mesh)!;mesh.quaternion.copy(referenceAttitude(bodyById.earth,0));mesh.updateMatrixWorld(true);const a=marker.getWorldPosition(new THREE.Vector3());mesh.quaternion.copy(referenceAttitude(bodyById.earth,motionStepSeconds('earth-spin')));mesh.updateMatrixWorld(true);const b=marker.getWorldPosition(new THREE.Vector3());expect(a.distanceTo(b)).toBeGreaterThan(.13);expect(a.length()).toBeCloseTo(b.length(),8);
});

it('recommended playback makes a full cycle observable without changing physical periods',()=>{
 for(const id of ['earth-spin','earth-orbit','venus-spin'] as const){const cycle=motionCycleSeconds(id),speed=motionPlaybackSpeed(id);expect(cycle/speed).toBeGreaterThan(20);expect(cycle/speed).toBeLessThan(40);}
 expect(motionCycleSeconds('earth-orbit')).toBe(bodyById.earth.orbitalPeriodDays*86400);
 for(const id of ['earth','venus'] as const){const lesson=id==='earth'?'earth-spin':'venus-spin';const duration=motionCycleSeconds(lesson)/motionPlaybackSpeed(lesson);const start=referenceAttitude(bodyById[id],0);const end=referenceAttitude(bodyById[id],duration*motionPlaybackSpeed(lesson));expect(start.angleTo(end)).toBeCloseTo(0,6);}
});
