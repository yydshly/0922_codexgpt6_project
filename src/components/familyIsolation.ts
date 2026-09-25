import * as THREE from 'three';
import type {PrimaryId} from '../data/macroPrimary';
/** Temporary view filter: never remove scene objects or change saved layer choices. */
export function restoreFamilyContext(saved:Map<THREE.Object3D,boolean>){for(const [object,visible] of saved)object.visible=visible;saved.clear();}
export function isolateFamilyContext(scene:THREE.Scene,parent:PrimaryId,saved:Map<THREE.Object3D,boolean>){
 for(const object of scene.children){
  if(object instanceof THREE.Light||object.userData.background||object.name==='macro-real-families'||parent==='earth'&&['moon-phase-reference','season-reference','moon-lock-reference'].includes(object.name)||object.userData.primaryId===parent)continue;
  saved.set(object,object.visible);object.visible=false;
 }
}

/** Keep a local compound model and its ancestors, hiding unrelated siblings. */
export function isolateLocalSystem(scene:THREE.Scene,target:string,saved:Map<THREE.Object3D,boolean>){
 const keep=(o:THREE.Object3D)=>o instanceof THREE.Light||o.userData.background||o.userData.memberSystem===target||(target==='pluto-system'&&o.name==='macro-pluto-charon');
 const contains=(o:THREE.Object3D):boolean=>keep(o)||o.children.some(contains);
 const hide=(o:THREE.Object3D)=>{saved.set(o,o.visible);o.visible=false;};
 const walk=(o:THREE.Object3D)=>{if(keep(o)){o.traverse(child=>{if(child.userData.contextOrbit)hide(child);});return;}for(const child of o.children){if(contains(child))walk(child);else hide(child);}};
 walk(scene);
}

/** Focus an environment lesson without overlaying unrelated planets or moon orbits. */
export function isolateEnvironmentContext(scene:THREE.Scene,parent:'sun'|'earth'|'jupiter'|'sun-earth'|'sun-mercury'|'none',saved:Map<THREE.Object3D,boolean>,keepOrbits=false){
 for(const object of scene.children){
  if(object instanceof THREE.Light||object.userData.background||object.name==='integrated-phenomena'||keepOrbits&&object.name==='macro-planet-reference-orbits'||object.userData.primaryId===parent||(parent==='sun-earth'&&['sun','earth'].includes(object.userData.primaryId))||(parent==='sun-mercury'&&['sun','mercury'].includes(object.userData.primaryId)))continue;
  saved.set(object,object.visible);object.visible=false;
 }
}
