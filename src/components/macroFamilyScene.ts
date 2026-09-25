import {createERing,eRingPoints} from './materialClouds';
import {createEnceladusInterior} from './enceladusInterior';
import type {EnceladusChoices} from '../data/enceladusInterior';
import * as THREE from 'three';
import {bodyById} from '../data/catalog';
import type {StateFrame} from '../types';
import {MACRO_FAMILIES,familyMoonRadius,familyLocalPosition,familyPlanetRadius,type MacroFamilyId,type MacroMoon} from '../data/macroFamilies';
import {satelliteParentAttitude,satelliteOrbitPoints,fitSatelliteOverviewDistance} from './SatelliteSystem';
import {makeFaintRings,updateFaintRings} from './planetaryRings';
import {ringProfile,ringDisplayBounds} from '../data/rings';
import {placeMacroLabels} from './macroLabelLayout';

/** Fit the selected displayed family, including rings, without moving any bodies. */
export function macroFamilyFocusDistance(parent:MacroFamilyId,states:MacroMoon[],direction:THREE.Vector3,aspect:number,rings:boolean){
 const parentRadius=familyPlanetRadius(parent),profile=rings?ringProfile(parent):null;
 const extent=profile?Math.max(parentRadius,...profile.bands.map(b=>b.outerKm/bodyById[parent].radiusKm*parentRadius)):parentRadius;
 const bounds=[{position:new THREE.Vector3(),radius:extent},...states.filter(s=>s.parentId===parent).map(s=>({position:new THREE.Vector3(...familyLocalPosition(s.position,parent)),radius:familyMoonRadius(s.radiusKm,parent)}))];
 const tanY=Math.tan(44*Math.PI/360);
 return Math.max(.8,fitSatelliteOverviewDistance(bounds,direction,tanY*Math.max(.3,aspect),tanY)*1.25);
}

export interface FamilySceneOptions {isolate?:boolean;enceladus:EnceladusChoices;enabled:boolean;moons:boolean;rings:boolean;enhanced:boolean;orbits:boolean;selected:string|null;onSelect:(id:string)=>void;onFocus:(id:MacroFamilyId)=>void;states:MacroMoon[]}
export function createMacroFamilies(scene:THREE.Scene,host:HTMLElement,onSelect:(id:string)=>void,onFocus:(id:MacroFamilyId)=>void){
 const root=new THREE.Group();root.userData.integrated=true;root.name='macro-real-families';root.userData.sceneElement='moons';scene.add(root);
 const families=MACRO_FAMILIES.map(id=>{
  const group=new THREE.Group(),ringTilt=new THREE.Group(),radius=familyPlanetRadius(id);ringTilt.userData.sceneElement='rings';group.add(ringTilt);root.add(group);
  if(id==='saturn')for(const band of ringProfile(id)!.bands){const [inner,outer]=ringDisplayBounds(band,bodyById[id].radiusKm,false);const ring=new THREE.Mesh(new THREE.RingGeometry(inner*radius,outer*radius,160),new THREE.MeshBasicMaterial({color:'#dbc69e',side:THREE.DoubleSide,transparent:true,opacity:band.opacity,depthWrite:false}));ring.rotation.x=-Math.PI/2;ringTilt.add(ring);}
  else ringTilt.add(makeFaintRings(bodyById[id],radius));
  return {id,group,ringTilt};
 });
 const eRing=createERing();families.find(f=>f.id==='saturn')!.group.add(eRing);let eRingTime=NaN;
 let disposed=false;const loader=new THREE.TextureLoader();
 const moons=new Map<string,{mesh:THREE.Mesh<THREE.SphereGeometry,THREE.MeshStandardMaterial>;orbit:THREE.Line;detail:ReturnType<typeof createEnceladusInterior>|null;parent:MacroFamilyId;epoch:number}>();
 const overlay=document.createElement('div');overlay.className='macro-world-labels family-world-labels';host.appendChild(overlay);
 const labels=new Map<string,HTMLButtonElement>();
 const makeLabel=(id:string,name:string,click:()=>void)=>{const b=document.createElement('button');b.type='button';b.className='macro-world-label selectable';b.textContent=name;b.onclick=click;overlay.appendChild(b);labels.set(id,b);return b;};
 for(const id of MACRO_FAMILIES)makeLabel(id,`${bodyById[id].name}系统 · 靠近`,()=>onFocus(id));
 let focused:MacroFamilyId|null=null,lastEnabled=false;
 return {
  anchors:Object.fromEntries(families.map(f=>[f.id,f.group.position])) as Record<MacroFamilyId,THREE.Vector3>,
  update(frame:StateFrame|null,options:FamilySceneOptions,camera:THREE.PerspectiveCamera,target:MacroFamilyId|null,anchors:Record<string,THREE.Vector3>){
   focused=target;lastEnabled=options.enabled&&!!frame;root.visible=lastEnabled;
   const enceladus=options.states.find(m=>m.id==='enceladus');eRing.visible=!!options.enceladus.eRing&&options.moons&&!!enceladus;
   if(enceladus&&frame&&eRing.visible&&(Number.isNaN(eRingTime)||Math.abs(frame.time-eRingTime)>3600)){eRing.geometry.setFromPoints(eRingPoints(enceladus));eRingTime=frame.time;}
   if(!frame){for(const m of moons.values()){m.mesh.visible=false;m.orbit.visible=false;}return;}
   for(const f of families){
    f.group.position.copy(anchors[f.id]);
    const detail=target===f.id||camera.position.distanceTo(f.group.position)<12;
    f.group.visible=lastEnabled&&detail&&(!options.isolate||f.id===target);f.ringTilt.visible=options.rings;f.ringTilt.quaternion.copy(satelliteParentAttitude(bodyById[f.id],frame.time));updateFaintRings(f.ringTilt,options.rings,options.enhanced,frame.time);
   }
   for(const m of moons.values()){m.mesh.visible=false;m.orbit.visible=false;}
   for(const state of options.states){
    const f=families.find(f=>f.id===state.parentId)!;
    let object=moons.get(state.id);
    if(!object){const r=familyMoonRadius(state.radiusKm,state.parentId);const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,24,18),new THREE.MeshStandardMaterial({color:state.color,roughness:1}));mesh.userData.familyMoon=state.id;if(state.id==='moon')loader.load(bodyById.moon.texture!,map=>{if(disposed){map.dispose();return;}map.colorSpace=THREE.SRGBColorSpace;mesh.material.map=map;mesh.material.color.set('white');mesh.material.needsUpdate=true;});const orbit=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#8cbcbf',transparent:true,opacity:.3,depthWrite:false}));f.group.add(mesh,orbit);object={mesh,orbit,detail:state.id==='enceladus'?createEnceladusInterior(mesh):null,parent:state.parentId,epoch:NaN};moons.set(state.id,object);makeLabel(state.id,state.name,()=>onSelect(state.id));}
    object.mesh.position.set(...familyLocalPosition(state.position,state.parentId));object.mesh.visible=options.moons;object.mesh.material.emissive.set(state.id==='enceladus'?'#10191f':state.id===options.selected?'#436354':'#000000');
    if(state.id==='moon'){object.mesh.quaternion.copy(satelliteParentAttitude(bodyById.moon,frame.time));object.mesh.material.emissive.set('#000000');}
    object.detail?.update(options.enceladus,options.selected==='enceladus'&&target==='saturn');
    object.orbit.visible=options.orbits&&options.moons&&target===state.parentId;
    if(object.orbit.visible&&(Number.isNaN(object.epoch)||Math.abs(frame.time-object.epoch)>1800)){
     const scale=familyPlanetRadius(state.parentId)/(bodyById[state.parentId].radiusKm/20000);
     object.orbit.geometry.dispose();object.orbit.geometry=new THREE.BufferGeometry().setFromPoints(satelliteOrbitPoints(state,bodyById[state.parentId],false).map(p=>p.multiplyScalar(scale)));object.epoch=frame.time;
    }
   }
  },
  layout(camera:THREE.PerspectiveCamera,width:number,height:number,visible:boolean){
   const candidates=[];for(const [id,b] of labels){b.style.visibility='hidden';if(!visible||!root.visible||!lastEnabled)continue;const family=families.find(f=>f.id===id),moon=moons.get(id);let position:THREE.Vector3;
    if(family){if(!family.group.visible||!([...moons.values()].some(m=>m.parent===family.id&&m.mesh.visible)||(family.ringTilt.visible&&ringProfile(family.id))))continue;position=family.group.position.clone();}
    else {if(!moon||!moon.mesh.visible||!families.find(f=>f.id===moon.parent)!.group.visible)continue;position=moon.mesh.getWorldPosition(new THREE.Vector3());}
    const radiusWorld=family?familyPlanetRadius(family.id)*(family.id==='saturn'?2.5:1):moon?.mesh.geometry.parameters.radius??0;const radius=radiusWorld*height/(2*Math.tan(camera.fov*Math.PI/360)*position.distanceTo(camera.position))+5;const p=position.project(camera);if(p.z<-1||p.z>1)continue;candidates.push({id,x:(p.x+1)*width/2,y:(1-p.y)*height/2,width:b.offsetWidth,height:b.offsetHeight,radius});
   }
   const hostRect=host.getBoundingClientRect(),obstacles=[...host.querySelectorAll<HTMLElement>('.macro-world-labels:not(.family-world-labels) .macro-world-label')].filter(b=>b.style.visibility==='visible').map(b=>{const r=b.getBoundingClientRect();return {x:r.x-hostRect.x,y:r.y-hostRect.y,width:r.width,height:r.height};});
   for(const box of placeMacroLabels(candidates,width,height,70,110,obstacles)){const b=labels.get(box.id)!;b.style.transform=`translate(${box.x}px,${box.y}px)`;b.style.visibility='visible';}
  },
  dispose(){disposed=true;overlay.remove();},
 };
}
