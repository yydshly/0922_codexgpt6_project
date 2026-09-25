import {describe,it,expect,vi} from 'vitest';
import {Scene,Sprite,SpriteMaterial,Texture} from 'three';
import {disposeSprites} from './disposeSprites';
describe('sprite teardown',()=>{
 it('releases shared GPU resources once while retaining reusable geometry data',()=>{
  const scene=new Scene(),texture=new Texture(),material=new SpriteMaterial({map:texture,alphaMap:texture});
  const a=new Sprite(material),b=new Sprite(material);scene.add(a,b);
  const geometryDisposed=vi.fn(),materialDisposed=vi.fn(),textureDisposed=vi.fn();
  a.geometry.addEventListener('dispose',geometryDisposed);material.addEventListener('dispose',materialDisposed);texture.addEventListener('dispose',textureDisposed);
  disposeSprites(scene);
  expect(geometryDisposed).toHaveBeenCalledTimes(1);expect(materialDisposed).toHaveBeenCalledTimes(1);expect(textureDisposed).toHaveBeenCalledTimes(1);
  expect(new Sprite().geometry.getAttribute('position').count).toBe(4);
  a.geometry.removeEventListener('dispose',geometryDisposed);
 });
});
