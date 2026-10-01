import * as THREE from 'three';
import { makeEnvironment,satellite,asteroid } from './environmentMeshes';
import { EXPLORATION_DESTINATIONS as destinations } from './exploration';
import { publicAsset } from '../data/publicAsset';

export function makeExplorationWorld(scene:THREE.Scene,sun:THREE.Vector3,onTexture:(ok:boolean)=>void){
  const environment=makeEnvironment('earth',scene,sun,onTexture),nodes=new Map<string,THREE.Object3D>();
  nodes.set('satellite',environment.target);
  const stage=environment.objects[1].node;stage.position.copy(destinations[1].position);nodes.set('stage',stage);
  const platform=new THREE.Group(),sat=satellite();sat.scale.setScalar(1.3);platform.add(sat);
  const module=new THREE.Mesh(new THREE.CylinderGeometry(2,2,15,32),new THREE.MeshStandardMaterial({color:'#d5e0db',metalness:.5,roughness:.4}));module.rotation.x=Math.PI/2;module.position.z=4;platform.add(module);
  platform.position.copy(destinations[2].position);environment.root.add(platform);nodes.set('station',platform);
  let disposed=false;
  const texture=new THREE.TextureLoader().load(publicAsset('/textures/moon.jpg'),()=>{if(!disposed)onTexture(true);},undefined,()=>{if(!disposed)onTexture(false);});texture.colorSpace=THREE.SRGBColorSpace;
  const rock=asteroid(47,1,texture);rock.position.copy(destinations[4].position);environment.root.add(rock);nodes.set('rock',rock);
  const helpers=new THREE.Group();environment.root.add(helpers);
  for(const id of ['view','home']){
    const d=destinations.find(v=>v.id===id)!,anchor=new THREE.Group();anchor.position.copy(d.position);helpers.add(anchor);nodes.set(id,anchor);
    for(const axis of [0,1,2]){
      const line=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length:48},(_,i)=>new THREE.Vector3(Math.cos(i/48*Math.PI*2)*6,Math.sin(i/48*Math.PI*2)*6,0))),new THREE.LineBasicMaterial({color:'#8bbfaa',transparent:true,opacity:.45}));
      if(axis===1)line.rotation.x=Math.PI/2;if(axis===2)line.rotation.y=Math.PI/2;anchor.add(line);
    }
  }
  return {...environment,nodes,helpers,update:(dt:number)=>{environment.update(dt);rock.rotation.y+=.018*dt;},dispose:()=>{disposed=true;texture.dispose();environment.dispose();}};
}
