import * as THREE from 'three';
import {publicAsset} from '../data/publicAsset';
import {AbortableTextureLoader} from './AbortableTextureLoader';

export const EARTH_DETAIL_URL=publicAsset('/textures/earth-day-8k.jpg');
export type EarthDetailState='basic'|'loading'|'ready'|'fallback'|'limited';
type DetailLoader=THREE.TextureLoader & {cancel?:(texture:THREE.Texture)=>void};
type SurfaceMaterial=THREE.ShaderMaterial|THREE.MeshStandardMaterial;

/** Optional detail never removes the working base texture, or blocks scientific data. */
export function earthSurfaceDetail(material:SurfaceMaterial,loader:DetailLoader=new AbortableTextureLoader()) {
  let state:EarthDetailState='basic',pending:THREE.Texture|undefined,timer:ReturnType<typeof setTimeout>|undefined,closed=false,generation=0;
  const fail=()=>{if(closed||state!=='loading')return;clearTimeout(timer);state='fallback';if(pending){loader.cancel?.(pending);pending.dispose();pending=undefined;}};
  const update=(diameterPixels:number,maxTextureSize:number,anisotropy:number)=>{
    const ready=material instanceof THREE.ShaderMaterial?material.uniforms.hasTexture.value:!!material.map;
    if(closed||state!=='basic'||!ready||diameterPixels<360)return state;
    if(maxTextureSize<8192){state='limited';return state;}
    const request=++generation,failed=()=>{if(request===generation)fail();};
    state='loading';timer=setTimeout(failed,30_000);
    try { pending=loader.load(EARTH_DETAIL_URL,texture=>{
      if(closed||request!==generation||state!=='loading'||material.userData.disposed){texture.dispose();return;}
      clearTimeout(timer);pending=undefined;
      texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;
      texture.anisotropy=Math.max(1,Math.min(8,anisotropy));
      const previous=material instanceof THREE.ShaderMaterial?material.uniforms.dayMap.value:material.map;
      if(material instanceof THREE.ShaderMaterial)material.uniforms.dayMap.value=texture;
      else {material.map=texture;material.needsUpdate=true;}
      state='ready';previous?.dispose();
    },undefined,failed); }catch{failed();}
    return state;
  };
  const dispose=()=>{closed=true;generation++;clearTimeout(timer);if(pending){loader.cancel?.(pending);pending.dispose();pending=undefined;}};
  const retry=()=>{if(!closed&&state==='fallback')state='basic';};
  return {update,retry,dispose,get state(){return state;}};
}

/** Estimate the rendered globe's angular diameter; the physical body stays untouched. */
export function earthDetailPixels(radius:number,distance:number,projectionY:number,height:number) {
  if(radius<=0||height<=0||projectionY<=0)return 0;
  return radius/Math.sqrt(Math.max(radius*radius*.001,distance*distance-radius*radius))*projectionY*height;
}

export function attachEarthSurfaceDetail(material:SurfaceMaterial) {
  const detail=earthSurfaceDetail(material),sphere=new THREE.Sphere(),view=new THREE.Vector3();
  let canvas:HTMLCanvasElement|undefined;
  material.addEventListener('dispose',()=>{detail.dispose();canvas?.removeEventListener('retry-earth-detail',detail.retry);});
  material.onBeforeRender=(renderer,_scene,camera,geometry,object)=>{
    if(canvas!==renderer.domElement){canvas?.removeEventListener('retry-earth-detail',detail.retry);canvas=renderer.domElement;canvas.addEventListener('retry-earth-detail',detail.retry);}
    if(!geometry.boundingSphere)geometry.computeBoundingSphere();
    sphere.copy(geometry.boundingSphere!).applyMatrix4(object.matrixWorld);
    camera.getWorldPosition(view);
    const pixels=earthDetailPixels(sphere.radius,view.distanceTo(sphere.center),camera.projectionMatrix.elements[5],renderer.domElement.height);
    const state=detail.update(pixels,renderer.capabilities.maxTextureSize,renderer.capabilities.getMaxAnisotropy());
    if(renderer.domElement.dataset.earthSurfaceDetail!==state)renderer.domElement.dataset.earthSurfaceDetail=state;
    material.userData.earthSurfaceDetail=state;
  };
}
