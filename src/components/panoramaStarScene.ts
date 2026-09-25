import * as THREE from 'three';
import type {StarCatalogue,CatalogueStar} from '../data/starCatalogue';
import {panoramaStarDirection,panoramaStarSize} from '../data/panoramaStars';
/** A camera-centered directional backdrop, never a 3D distance catalogue. */
export function createPanoramaStars(scene:THREE.Scene,texture:THREE.Texture){
 const root=new THREE.Group();root.name='hipparcos-panorama-background';root.userData.background=true;scene.add(root);
 let catalogue:StarCatalogue|null=null,stars:CatalogueStar[]=[],directions:THREE.Vector3[]=[];
 const clear=()=>{for(const object of [...root.children]){const p=object as THREE.Points<THREE.BufferGeometry,THREE.PointsMaterial>;p.geometry.dispose();p.material.dispose();root.remove(p);}};
 return {root,update(data:StarCatalogue|null,camera:THREE.PerspectiveCamera,enabled:boolean){
  if(data!==catalogue){clear();catalogue=data;stars=data?.sky??[];directions=stars.map(s=>new THREE.Vector3(...panoramaStarDirection(s.ra,s.dec)));
   for(let bin=-2;bin<=6;bin++){
    const rows=stars.map((star,i)=>({star,i})).filter(r=>Math.floor(r.star.hp)===bin);if(!rows.length)continue;
    const geometry=new THREE.BufferGeometry().setFromPoints(rows.map(r=>directions[r.i]));
    const material=new THREE.PointsMaterial({map:texture,color:'#c5dbea',size:panoramaStarSize({hp:bin}),sizeAttenuation:false,transparent:true,opacity:.72,depthWrite:false});
    // Place fragments at the far depth so foreground bodies occlude the sky even in a close-up.
    material.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n gl_Position.z = gl_Position.w * 0.999999;');};
    material.customProgramCacheKey=()=> 'panorama-fixed-sky-v1';
    const points=new THREE.Points(geometry,material);points.userData.background=true;points.userData.hipIds=rows.map(r=>r.star.hip);points.renderOrder=-1000;root.add(points);
   }
  }
  root.visible=enabled&&stars.length>0;root.position.copy(camera.position);root.scale.setScalar(camera.far*.9);root.updateMatrixWorld(true);
 },pick(camera:THREE.PerspectiveCamera,x:number,y:number,width:number,height:number):number|null{
  if(!root.visible)return null;camera.updateMatrixWorld();let best:number|null=null,nearest=8;
  directions.forEach((d,i)=>{const p=d.clone().multiplyScalar(camera.far*.9).add(camera.position).project(camera);if(p.z< -1||p.z>1||Math.abs(p.x)>1||Math.abs(p.y)>1)return;const distance=Math.hypot((p.x+1)*width/2-x,(1-p.y)*height/2-y);if(distance<nearest){nearest=distance;best=stars[i].hip;}});return best;
 },dispose(){clear();root.removeFromParent();}};
}
