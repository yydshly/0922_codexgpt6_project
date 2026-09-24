import * as THREE from 'three';
export interface ScenePresence {objects:number;rendered:number;inView:number}
export type SceneSnapshot=Record<string,ScenePresence>;
/** Counts renderable geometry, honoring every ancestor and material, not UI checkboxes. */
export function readScenePresence(scene:THREE.Scene,camera:THREE.Camera):SceneSnapshot{
 camera.updateMatrixWorld();
 const result:SceneSnapshot={},frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
 scene.traverse(object=>{
  if(!(object instanceof THREE.Mesh||object instanceof THREE.Points||object instanceof THREE.Line))return;
  let parent:THREE.Object3D|null=object,id:string|undefined,visible=true;
  while(parent){visible=visible&&parent.visible;id??=parent.userData.sceneElement;parent=parent.parent;}
  if(!id)return;const row=result[id]??={objects:0,rendered:0,inView:0};row.objects++;
  const materials=Array.isArray(object.material)?object.material:[object.material];visible=visible&&materials.some(m=>m.visible&&m.opacity>0);
  if(!visible||!object.geometry.attributes.position?.count)return;row.rendered++;if(frustum.intersectsObject(object))row.inView++;
 });return result;
}
export function presenceText(snapshot:SceneSnapshot,id:string){const row=snapshot[id];return row?.inView?'视野内':row?.rendered?'视野外 · 可定位':row?.objects?'近景细节待展开':'等待资料';}
