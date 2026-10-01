import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {createCrewCarrier,CREW_CARRIER_GEOMETRY as g} from './crewCarrier';
import {disposeEnvironmentScene} from './environmentMeshes';
let scene:THREE.Scene;
beforeEach(()=>{const context=new Proxy({},{get:()=>()=>{}});vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>context})});scene=new THREE.Scene();});
afterEach(()=>{disposeEnvironmentScene(scene);vi.unstubAllGlobals();});
describe('shared authored crew launch carrier',()=>{
  it('registers shared engine exits to the crew aft axis and the existing raised launch deck',()=>{
    const c=createCrewCarrier();scene.add(c.root);scene.updateMatrixWorld(true);
    const engines=c.root.getObjectByName('four sea-level engines')!;expect(engines.children).toHaveLength(4);
    for(const e of engines.children)expect(e.getWorldPosition(new THREE.Vector3()).z).toBeCloseTo(g.boosterExitZ);
    const vacuum=c.root.getObjectByName('vacuum engine')!;expect(vacuum.getWorldPosition(new THREE.Vector3()).z).toBeCloseTo(g.upperExitZ);
    expect(new THREE.Vector3(0,35.5,0).applyMatrix4(c.upper.matrixWorld).distanceTo(new THREE.Vector3(0,35.5,0).applyMatrix4(c.booster.matrixWorld))).toBeLessThan(1e-9);
    expect(g.shipReferenceHeightM-g.boosterExitZ).toBeCloseTo(g.padDeckM);
    const nose=new THREE.Vector3(0,1,0).transformDirection(c.booster.matrixWorld);expect(nose.z).toBeCloseTo(-1);
    expect(c.jets.children).toHaveLength(4);
    for(const jet of c.jets.children){expect(jet.position.z).toBeCloseTo(g.boosterExitZ);const box=new THREE.Box3().setFromObject(jet);expect(box.min.z).toBeCloseTo(g.boosterExitZ);expect(box.max.z).toBeGreaterThan(g.boosterExitZ+20);}
  });
  it('shows the same authored upper stage after separation and hides all carrier geometry on orbit handoff',()=>{
    const c=createCrewCarrier();scene.add(c.root);c.update({phase:'ascent',carrierStage:'booster',thrust:[0,3600000,0],time:12});expect(c.booster.visible).toBe(true);expect(c.jets.visible).toBe(true);expect(c.upperJets.visible).toBe(false);
    c.update({phase:'upper',carrierStage:'upper',thrust:[0,480000,0],time:180});expect(c.booster.visible).toBe(false);expect(c.upper.visible).toBe(true);expect(c.upperJets.visible).toBe(true);
    c.update({phase:'approach',carrierStage:'none',thrust:[0,0,0],time:500});expect(c.root.visible).toBe(false);expect(c.upperJets.visible).toBe(false);
    c.update({phase:'failed',carrierStage:'upper',thrust:[0,0,0],time:500});expect(c.root.visible).toBe(true);expect(c.upper.visible).toBe(true);expect(c.booster.visible).toBe(false);expect(c.upperJets.visible).toBe(false);
  });
});
