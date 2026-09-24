import * as THREE from 'three';
import {createEarthClouds,createEarthAtmosphere,type EarthEffectMesh} from './earthEffects';
export type CloudStatus='loading'|'ready'|'error';
export interface EarthAppearance {clouds:boolean;atmosphere:boolean}
/** Visual-only shells attached to the existing Earth; no added body, weather, or orbit state. */
export function createMacroEarth(earth:THREE.Mesh,loader:THREE.TextureLoader,onStatus:(status:CloudStatus)=>void){
 const radius=(earth.geometry as THREE.SphereGeometry).parameters.radius;
 const attach=(mesh:EarthEffectMesh)=>{mesh.scale.setScalar(radius);earth.add(mesh);return mesh;};
 const release=(mesh:EarthEffectMesh)=>{mesh.material.userData.disposed=true;mesh.material.uniforms.cloudMap?.value.dispose();mesh.geometry.dispose();mesh.material.dispose();mesh.removeFromParent();};
 onStatus('loading');
 let clouds=attach(createEarthClouds(loader,onStatus));
 const atmosphere=attach(createEarthAtmosphere());
 let disposed=false;
 return {
  update(options:EarthAppearance){
   clouds.visible=options.clouds;atmosphere.visible=options.atmosphere;
   const direction=earth.position.clone().negate().normalize();
   clouds.material.uniforms.sunDirection.value.copy(direction);
   atmosphere.material.uniforms.sunDirection.value.copy(direction);
  },
  retry(){if(disposed)return;release(clouds);onStatus('loading');clouds=attach(createEarthClouds(loader,onStatus));},
  dispose(){if(disposed)return;disposed=true;release(clouds);release(atmosphere);},
 };
}
