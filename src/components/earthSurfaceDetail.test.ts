import {afterEach,describe,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {earthDetailPixels,earthSurfaceDetail} from './earthSurfaceDetail';

function setup(){
 const base=new THREE.Texture(),material=new THREE.ShaderMaterial({uniforms:{dayMap:{value:base},hasTexture:{value:1}}});
 const disposeBase=vi.spyOn(base,'dispose'),texture=new THREE.Texture(),disposePending=vi.spyOn(texture,'dispose');
 let success:(texture:THREE.Texture)=>void=()=>{},failure:()=>void=()=>{};
 const loader={load:vi.fn((_url:string,ok:(texture:THREE.Texture)=>void,_progress:unknown,fail:()=>void)=>{success=ok;failure=fail;return texture;}),cancel:vi.fn()};
 const detail=earthSurfaceDetail(material,loader as unknown as THREE.TextureLoader);
 return {detail,material,base,texture,disposeBase,disposePending,loader,callback:()=>success,success:()=>success(texture),failure:()=>failure()};
}
afterEach(()=>vi.useRealTimers());
describe('optional Earth surface detail',()=>{
 it('also upgrades the panorama standard material without changing its light response',()=>{
  const texture=new THREE.Texture(),base=new THREE.Texture(),material=new THREE.MeshStandardMaterial({map:base,roughness:.8});
  let loaded:(texture:THREE.Texture)=>void=()=>{};
  const loader={load:(_url:string,onLoad:(t:THREE.Texture)=>void)=>{loaded=onLoad;return texture;}} as unknown as THREE.TextureLoader;
  const detail=earthSurfaceDetail(material,loader);detail.update(600,8192,8);expect(material.map).toBe(base);
  loaded(texture);expect(material.map).toBe(texture);expect(material.roughness).toBe(.8);expect(detail.state).toBe('ready');detail.dispose();
 });
 it('loads only when the globe is large and the base map is available',()=>{
  const s=setup();s.material.uniforms.hasTexture.value=0;
  s.detail.update(900,8192,8);expect(s.loader.load).not.toHaveBeenCalled();
  s.material.uniforms.hasTexture.value=1;s.detail.update(100,8192,8);expect(s.loader.load).not.toHaveBeenCalled();
  s.detail.update(600,8192,16);s.detail.update(800,8192,16);expect(s.loader.load).toHaveBeenCalledTimes(1);
  expect(s.material.uniforms.dayMap.value).toBe(s.base);expect(s.disposeBase).not.toHaveBeenCalled();
  s.success();expect(s.detail.state).toBe('ready');expect(s.material.uniforms.dayMap.value).toBe(s.texture);
  expect(s.texture.colorSpace).toBe(THREE.SRGBColorSpace);expect(s.texture.anisotropy).toBe(8);expect(s.disposeBase).toHaveBeenCalledTimes(1);s.detail.dispose();
 });
 it('preserves the base map on failure and does not retry every animation frame',()=>{
  const s=setup();s.detail.update(600,8192,4);s.failure();s.detail.update(900,8192,4);
  expect(s.detail.state).toBe('fallback');expect(s.material.uniforms.dayMap.value).toBe(s.base);
  expect(s.disposeBase).not.toHaveBeenCalled();expect(s.loader.load).toHaveBeenCalledTimes(1);s.detail.dispose();
 });
 it('cancels a timed-out transfer and rejects a late image',()=>{
  vi.useFakeTimers();const s=setup();s.detail.update(600,8192,4);vi.advanceTimersByTime(30000);
  expect(s.detail.state).toBe('fallback');expect(s.loader.cancel).toHaveBeenCalledWith(s.texture);s.success();
  expect(s.material.uniforms.dayMap.value).toBe(s.base);s.detail.dispose();
 });
 it('allows an explicit retry without replacing the base map first',()=>{
  const s=setup();s.detail.update(600,8192,4);const late=s.callback();s.failure();s.detail.retry();
  expect(s.detail.state).toBe('basic');expect(s.material.uniforms.dayMap.value).toBe(s.base);
  s.detail.update(600,8192,4);expect(s.loader.load).toHaveBeenCalledTimes(2);late(new THREE.Texture());expect(s.detail.state).toBe('loading');expect(s.material.uniforms.dayMap.value).toBe(s.base);s.success();expect(s.detail.state).toBe('ready');s.detail.dispose();
 });
 it('cancels pending work when a scene closes',()=>{
  const s=setup();s.detail.update(600,8192,4);s.detail.dispose();s.success();
  expect(s.loader.cancel).toHaveBeenCalledWith(s.texture);expect(s.material.uniforms.dayMap.value).toBe(s.base);expect(s.disposeBase).not.toHaveBeenCalled();
 });
 it('retains the base texture on devices that cannot support the detail resolution',()=>{
  const s=setup();expect(s.detail.update(600,4096,4)).toBe('limited');expect(s.loader.load).not.toHaveBeenCalled();s.detail.dispose();
 });
 it('uses apparent globe size rather than physical radius alone',()=>{
  expect(earthDetailPixels(1,4,2.4,800)).toBeCloseTo(earthDetailPixels(6378,4*6378,2.4,800));
  expect(earthDetailPixels(1,40,2.4,800)).toBeLessThan(360);
  expect(earthDetailPixels(1,2,2.4,800)).toBeGreaterThan(360);
 });
});
