import {describe,it,expect,vi} from 'vitest';
import * as THREE from 'three';
import {createMacroEarth,type CloudStatus} from './macroEarth';
function setup(){
 const requests:{ready:(t:THREE.Texture)=>void;error:()=>void}[]=[];
 const loader={load:(_url:string,ready:(t:THREE.Texture)=>void,_progress:unknown,error:()=>void)=>{requests.push({ready,error});return new THREE.Texture();}} as unknown as THREE.TextureLoader;
 const earth=new THREE.Mesh(new THREE.SphereGeometry(.09),new THREE.MeshStandardMaterial());earth.position.set(2,0,0);
 const status:CloudStatus[]=[],effects=createMacroEarth(earth,loader,s=>status.push(s));
 const get=(name:string)=>earth.getObjectByName(name) as THREE.Mesh<THREE.SphereGeometry,THREE.ShaderMaterial>;
 return {requests,earth,status,effects,get};
}
describe('macro Earth appearance and lifecycle',()=>{
 it('adds visual shells without changing the surface radius or position and applies independent flags',()=>{const {earth,effects,get}=setup();effects.update({clouds:false,atmosphere:true});expect(earth.geometry.parameters.radius).toBe(.09);expect(earth.position.toArray()).toEqual([2,0,0]);expect(get('earth-clouds').scale.x).toBe(.09);expect(get('earth-clouds').visible).toBe(false);expect(get('earth-atmosphere').visible).toBe(true);effects.update({clouds:true,atmosphere:false});expect(get('earth-clouds').visible).toBe(true);expect(get('earth-atmosphere').visible).toBe(false);effects.dispose();});
 it('updates the world-space Sun direction as Earth moves while leaving its attitude untouched',()=>{const {earth,effects,get}=setup();earth.rotation.y=.7;const attitude=earth.quaternion.clone();effects.update({clouds:true,atmosphere:true});expect(get('earth-clouds').material.uniforms.sunDirection.value.toArray()).toEqual([-1,-0,-0]);earth.position.set(0,0,3);effects.update({clouds:true,atmosphere:true});expect(get('earth-atmosphere').material.uniforms.sunDirection.value.toArray()).toEqual([-0,-0,-1]);expect(earth.quaternion.toArray()).toEqual(attitude.toArray());effects.dispose();});
 it('reports optional cloud failure and supports a retry without replacing the Earth',()=>{const {earth,effects,requests,status,get}=setup();requests[0].error();expect(status).toEqual(['loading','error']);effects.retry();const texture=new THREE.Texture();requests[1].ready(texture);expect(status).toEqual(['loading','error','loading','ready']);expect(earth.children).toHaveLength(2);expect(get('earth-clouds').material.uniforms.cloudMapReady.value).toBe(1);const dispose=vi.spyOn(texture,'dispose');effects.dispose();expect(dispose).toHaveBeenCalledOnce();expect(earth.children).toHaveLength(0);});
 it('ignores late callbacks from disposed or replaced cloud shells and releases their textures',()=>{const {effects,requests,status}=setup();effects.retry();const late=new THREE.Texture(),dispose=vi.spyOn(late,'dispose');requests[0].ready(late);requests[0].error();expect(dispose).toHaveBeenCalledOnce();expect(status).toEqual(['loading','loading']);effects.dispose();requests[1].error();effects.retry();expect(requests).toHaveLength(2);expect(status).toEqual(['loading','loading']);});
});
