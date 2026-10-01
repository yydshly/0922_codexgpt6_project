import {describe,it,expect} from 'vitest';
import {PerspectiveCamera,Vector3,Object3D} from 'three';
import {ObservationCameraTransition,lookPose,OBSERVATIONS} from './explorationObservation';
import {EXPLORATION_DESTINATIONS} from './exploration';

describe('observation camera',()=>{
  it('interpolates between views and finishes at the exact goal',()=>{
    const camera=new PerspectiveCamera(48),target=new Vector3(),from=new Vector3(30,20,55);camera.position.copy(from);camera.lookAt(target);
    const goal=lookPose(new Vector3(650,900,900),new Vector3(0,0,-420)),transition=new ObservationCameraTransition();transition.start(camera,target);
    transition.update(camera,target,goal,0);expect(camera.position).toEqual(from);
    transition.update(camera,target,goal,.1);expect(camera.position.distanceTo(from)).toBeGreaterThan(0);expect(camera.position.distanceTo(goal.position)).toBeGreaterThan(500);
    transition.update(camera,target,goal,2);expect(transition.active).toBe(false);expect(camera.position).toEqual(goal.position);expect(camera.quaternion.angleTo(goal.quaternion)).toBeLessThan(1e-6);expect(target).toEqual(goal.target);
  });
  it('can follow a moving cockpit goal while blending and preserves its field of view',()=>{
    const camera=new PerspectiveCamera(48),target=new Vector3(),transition=new ObservationCameraTransition();camera.position.set(20,20,55);transition.start(camera,target);
    let goal=lookPose(new Vector3(0,2,0),new Vector3(0,2,-100),72);
    for(let i=0;i<70&&transition.active;i++){goal=lookPose(new Vector3(i,2,0),new Vector3(i,2,-100),72);transition.update(camera,target,goal,1/60);}
    expect(camera.position).toEqual(goal.position);expect(camera.fov).toBe(72);
  });
  it('supports interruption without jumping to the former destination',()=>{
    const camera=new PerspectiveCamera(),target=new Vector3(),transition=new ObservationCameraTransition();transition.start(camera,target);const goal=lookPose(new Vector3(100,50,0),new Vector3());transition.update(camera,target,goal,.2);
    transition.cancel();const saved=camera.position.clone();expect(transition.update(camera,target,goal,1)).toBe(false);expect(camera.position).toEqual(saved);
    transition.start(camera,target);transition.update(camera,target,lookPose(new Vector3(-100,50,0),new Vector3()),.05);expect(camera.position.distanceTo(saved)).toBeLessThan(2);
  });
  it('has a profile for every destination and moves a part anchor with the actual rotating object',()=>{
    expect(EXPLORATION_DESTINATIONS.every(d=>OBSERVATIONS[d.id])).toBe(true);expect(OBSERVATIONS.view.parts).toHaveLength(0);
    const node=new Object3D();node.position.set(220,65,-300);const part=new Vector3(...OBSERVATIONS.stage.parts[0].point);const before=node.localToWorld(part.clone());node.rotation.y=Math.PI/2;const after=node.localToWorld(part.clone());
    expect(after.distanceTo(before)).toBeGreaterThan(1);expect(after.distanceTo(node.position)).toBeCloseTo(before.distanceTo(node.position));
  });
});
