import {it,expect} from 'vitest';
import * as THREE from 'three';
import {createPlanetOrbits} from './macroPlanetOrbits';
import {ORBIT_PLANETS} from '../data/macroPlanetOrbits';
import {AU_KM,bodyById} from '../data/catalog';
import {BODY_IDS,type StateFrame} from '../types';
it('gates rendered orbit and arrow objects independently and drops them when the shared date is unavailable',()=>{
 const scene=new THREE.Scene(),display=createPlanetOrbits(scene),frame:StateFrame={time:100,positions:new Float64Array(30),velocities:new Float64Array(30)};
 const positions=Object.fromEntries(ORBIT_PLANETS.map(b=>[b.id,new THREE.Vector3(1,0,0)]));
 for(const body of ORBIT_PLANETS){const i=BODY_IDS.indexOf(body.id)*3;frame.positions[i]=AU_KM;frame.velocities[i+1]=Math.sqrt((bodyById.sun.gm+body.gm)/AU_KM);}
 const line=scene.getObjectByName('reference-orbit-earth') as THREE.Line,arrow=scene.getObjectByName('motion-direction-earth')!;
 display.update(frame,{orbits:true,scales:false,direction:false},true,null,positions,1);expect(line.visible).toBe(true);expect(line.geometry.attributes.position.count).toBe(361);expect(arrow.visible).toBe(false);
 display.update(frame,{orbits:false,scales:true,direction:true},true,'earth',positions,1);expect(line.visible).toBe(false);expect(arrow.visible).toBe(true);expect(scene.getObjectByName('motion-direction-mars')!.visible).toBe(false);
 display.update(frame,{orbits:true,scales:false,direction:true},true,'sun',positions,1);expect(line.visible).toBe(false);expect(arrow.visible).toBe(false);
 display.update(null,{orbits:true,scales:false,direction:true},true,null,positions,1);expect(scene.getObjectByName('macro-planet-reference-orbits')!.visible).toBe(false);expect(arrow.visible).toBe(false);
});
