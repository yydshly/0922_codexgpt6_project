import {Sprite,type Object3D,type BufferGeometry,type Material,type Texture} from 'three';
/** Call before renderer disposal: Sprite's shared geometry otherwise retains per-renderer GPU buffers. */
export function disposeSprites(root:Object3D){
 const geometries=new Set<BufferGeometry>(),materials=new Set<Material>(),textures=new Set<Texture>();
 root.traverse(object=>{if(object instanceof Sprite){geometries.add(object.geometry);materials.add(object.material);if(object.material.map)textures.add(object.material.map);if(object.material.alphaMap)textures.add(object.material.alphaMap);}});
 geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());
}
