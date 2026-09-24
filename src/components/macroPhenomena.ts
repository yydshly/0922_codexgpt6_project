import {macroMemberAnchor} from '../data/macroMemberState';
import {cometAntiSolar,type CometDisplay} from '../data/macroComets';
import * as THREE from 'three';
import { placeMacroLabels } from './macroLabelLayout';
import { AU_KM, BODIES } from '../data/catalog';
import { halleyPoint, macroEcliptic, macroDetailVisible, type MacroLayerId, type MacroLayerVisibility } from '../data/macroLayers';
import { macroRadius } from '../data/macroStructure';
import type { StateBatch, ObjectState } from '../ephemeris/stateProvider';
import type { StateFrame } from '../types';
import { COMETS } from '../ephemeris/comets';
import { heliocentricComets, type CometTracks } from '../ephemeris/cometState';
import { REGION_MEMBERS } from '../data/regionMembers';
import { dwarfReferenceOrbit } from './dwarfOrbit';

/** Explanatory geometry lives outside scientific state; animated wind has its own clock. */
export function createMacroPhenomena(scene: THREE.Scene, texture: THREE.Texture, host: HTMLDivElement, onSelect: (id:string)=>void) {
  const groups = Object.fromEntries(['dwarfs','comets','activity','wind','populations','dust','heliosphere','oort'].map(id => {
    const group = new THREE.Group(); group.name = `macro-${id}`; scene.add(group); return [id, group];
  })) as Record<string, THREE.Group>;
  groups.activity.userData.integrated=true; // Keep the teaching tails readable while surrounding context is dimmed.
  const overlay = document.createElement('div'); overlay.className='macro-world-labels phenomena-world-labels'; host.appendChild(overlay);
  const labels: THREE.Object3D[] = [];
  const labelElements = new Map<THREE.Object3D, {text:HTMLElement; line:HTMLSpanElement}>();
  function label(text: string, color = '#c6dfed', memberId?:string) {
    const anchor = new THREE.Object3D();
    const element=document.createElement(memberId?'button':'div');
    if(memberId){element.setAttribute('type','button');element.setAttribute('aria-label',`定位${text}`);element.classList.add('selectable');element.onclick=()=>onSelect(memberId);}else element.setAttribute('aria-hidden','true');element.classList.add('macro-world-label');element.textContent=text;element.style.setProperty('--label-color',color);
    const leader=document.createElement('span');leader.className='macro-label-leader';leader.style.background=color;
    overlay.append(leader,element);labels.push(anchor);labelElements.set(anchor,{text:element,line:leader});return anchor;
  }
  const line = (points: THREE.Vector3[], color: string, opacity: number) => new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  const ball = (size: number, color: string) => { const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 18, 12), new THREE.MeshStandardMaterial({ color, roughness: .8 })); mesh.userData.labelRadius=size; return mesh; };
  // The perihelion activity vignette is fixed; it is deliberately not a current Halley marker.
  const nucleus = new THREE.Vector3(...macroEcliptic(halleyPoint(.35)));
  const outward = nucleus.clone().normalize();
  const tangent = new THREE.Vector3(...macroEcliptic(halleyPoint(.36))).sub(nucleus).normalize();
  groups.activity.add(ball(.07, '#f5edd4'));
  groups.activity.children.at(-1)!.position.copy(nucleus);
  const coma = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color: '#b0e6cf', transparent: true, opacity: .72, depthWrite: false, blending: THREE.AdditiveBlending }));
  coma.position.copy(nucleus); coma.scale.setScalar(.62); groups.activity.add(coma);
  for (let n = 0; n < 14; n++) {
    const spread = new THREE.Vector3(Math.sin(n*2.4), Math.cos(n*2.4), Math.sin(n*1.7));
    groups.activity.add(line(Array.from({ length: 32 }, (_, k) => {
      const t = k/31; return nucleus.clone().addScaledVector(outward, t*2.5).addScaledVector(tangent, -t*t*.65).addScaledVector(spread, t*.18);
    }), '#dfc097', .19));
  }
  groups.activity.add(line([nucleus, nucleus.clone().addScaledVector(outward, 3.2)], '#72caff', .9));
  const tailLabel = label('彗发与双尾 · 固定示意', '#b7e2d9');tailLabel.userData.cometId='comet-demo'; tailLabel.position.copy(nucleus).addScaledVector(outward, 2.7).add(new THREE.Vector3(0, .7, 0)); groups.activity.add(tailLabel);

  let seed = 73441;
  const rand = () => { seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return seed/4294967296; };
  function particles(parent: THREE.Group, count: number, color: string, size: number, point: (n:number)=>THREE.Vector3, opacity = .55) {
    const geometry = new THREE.BufferGeometry().setFromPoints(Array.from({length:count}, (_, n) => point(n)));
    const points = new THREE.Points(geometry, new THREE.PointsMaterial({color, size, map:texture, transparent:true, opacity, depthWrite:false})); parent.add(points); return points;
  }
  particles(groups.dust, 1600, '#d3bc8d', .055, () => {
    const r = macroRadius(.15 + rand()*5), a = rand()*Math.PI*2;
    return new THREE.Vector3(Math.cos(a)*r, (rand()-.5)*r*.12, Math.sin(a)*r);
  }, .35);
  particles(groups.populations, 360, '#c994de', .085, () => {
    const r = macroRadius(6+rand()*23), a = rand()*Math.PI*2;
    return new THREE.Vector3(Math.cos(a)*r, (rand()-.5)*r*.65, Math.sin(a)*r);
  });
  const trojans = new THREE.Group(); groups.populations.add(trojans);
  for (const phase of [-Math.PI/3, Math.PI/3]) particles(trojans, 100, '#f0c877', .09, () => {
    const a=phase+(rand()-.5)*.36, r=macroRadius(5.2)+(rand()-.5)*.25;
    return new THREE.Vector3(Math.cos(a)*r,(rand()-.5)*.3,Math.sin(a)*r);
  });

  const windDirections = Array.from({length:180}, () => {
    const y = rand()*2-1, a=rand()*Math.PI*2, h=Math.sqrt(1-y*y);
    return new THREE.Vector3(Math.cos(a)*h,y,Math.sin(a)*h);
  });
  const wind = particles(groups.wind, 720, '#efbc75', .075, n => windDirections[n%180].clone().multiplyScalar(.6+(n/720)*macroRadius(90)), .62);
  for (let n=0;n<windDirections.length;n+=9) groups.wind.add(line([windDirections[n].clone().multiplyScalar(.5),windDirections[n].clone().multiplyScalar(macroRadius(90))], '#d9a45b', .08));
  // Illustrative radial cuts: reference scales are not global fixed boundary measurements.
  for (const [au,color,text] of [[90,'#deb16f','终止激波 · 约 90 AU 示意'],[120,'#69b0e9','日球层顶 · 约 120 AU 示意']] as const) {
    const r=macroRadius(au);
    for (const vertical of [false,true]) groups.heliosphere.add(line(Array.from({length:181}, (_,n)=>{
      const a=n/180*Math.PI*2; return vertical ? new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,0) : new THREE.Vector3(Math.cos(a)*r,0,Math.sin(a)*r);
    }),color,.48));
    const annotation=label(text,color); annotation.position.set(au===90?-r*.82:r*.82, r*.4, 0); groups.heliosphere.add(annotation);
  }
  const outerLabel=label('奥尔特云 · 推测的冰质天体群'); outerLabel.userData.overview=true; outerLabel.position.set(-13,12,3); groups.oort.add(outerLabel);
  const helioLabel=label('太阳风影响区 · 边界示意'); helioLabel.userData.overview=true; helioLabel.position.set(8,6,0); groups.heliosphere.add(helioLabel);
  const sheath=label('两边界之间：日鞘', '#b8cde0'); sheath.position.set(0,macroRadius(105)+.5,0); groups.heliosphere.add(sheath);
  const outside=label('外侧：星际介质', '#afbccd'); outside.position.set(0,-macroRadius(140),0); groups.heliosphere.add(outside);

  const dwarfMeshes = REGION_MEMBERS.map(body => {
    const group = new THREE.Group(); groups.dwarfs.add(group); group.visible=false;
    const marker=ball(.13,body.color); marker.userData.memberId=body.id; group.add(marker);
    const annotation=label(body.name,body.color,body.id);annotation.userData.memberId=body.id;group.add(annotation);
    const orbit=line([],body.color,.25);group.add(orbit);
    return {id:body.id,group,marker,annotation,orbit,orbitTime:NaN};
  });
  const cometMeshes = COMETS.map(body => {
    const group=new THREE.Group(); groups.comets.add(group); group.visible=false;
    const marker=ball(.115,body.color), annotation=label(`${body.name} · 当日位置`,body.color,body.id);
    marker.userData.memberId=body.id;annotation.userData.cometId=body.id;annotation.userData.anchorRadius=.115;
    const away=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),.9,'#f0cf8d',.14,.075);group.add(away);
    const orbit=line([],body.color,.2), track=line([],body.color,.95);
    group.add(marker,annotation,orbit); groups.comets.add(track);
    return {...body,group,marker,annotation,orbit,track,away};
  });
  let lastCometOrbitTime=NaN;
  let lastTracks:CometTracks|null=null;
  return {
    update(frame: StateFrame | null, batch: StateBatch | null, enabled: MacroLayerVisibility, distance: number, seconds: number, family?: string, cometBatch: StateBatch | null = null, tracks: CometTracks | null = null, showActivity = false, selectedMember: string | null = null, plutoExpanded = false, cometDisplay:CometDisplay={selected:null,paths:true,orbits:true,direction:false}) {
      for (const [id, group] of Object.entries(groups)) group.visible=enabled[id as MacroLayerId] && (macroDetailVisible(id as MacroLayerId,distance) || family===id || (id==='populations' && family==='centaurs'));
      groups.activity.visible=enabled.comets && showActivity;
      for (const annotation of labels) annotation.visible = annotation.userData.overview ? distance >= 42 : distance < 42;
      const position=wind.geometry.getAttribute('position') as THREE.BufferAttribute;
      for(let n=0;n<720;n++) { const r=.5+((n/720+seconds*.045)%1)*macroRadius(90); const d=windDirections[n%180]; position.setXYZ(n,d.x*r,d.y*r,d.z*r); } position.needsUpdate=true;
      if(frame) {
        // Resolve Jupiter by ID rather than assuming its catalog index.
        const index=BODIES.findIndex(b=>b.id==='jupiter')*3;
        trojans.rotation.y=Math.atan2(frame.positions[index+1]-frame.positions[1],frame.positions[index]-frame.positions[0]);
      }
      if(tracks!==lastTracks) {
        for(const item of cometMeshes) {
          const data=tracks?.tracks.find(t=>t.id===item.id);
          item.track.geometry.dispose();
          item.track.geometry=new THREE.BufferGeometry().setFromPoints((data?.points ?? []).map(row=>new THREE.Vector3(...macroEcliptic(row.slice(1).map(v=>v/AU_KM)))));
        }
        lastTracks=tracks;
      }
      const cometStates=heliocentricComets(frame,cometBatch);
      const updateOrbit=frame && (!Number.isFinite(lastCometOrbitTime)||Math.abs(frame.time-lastCometOrbitTime)>21600);
      for(const item of cometMeshes) {
        const state=cometStates.find(s=>s.id===item.id);
        item.group.visible=!!state;
        item.track.visible=!!frame && !!tracks && cometDisplay.paths;
        item.orbit.visible=cometDisplay.orbits;
        item.away.visible=!!state&&cometDisplay.direction&&cometDisplay.selected===item.id;
        if(!state) continue;
        item.marker.position.set(...macroEcliptic(state.position.map(v=>v/AU_KM)));
        item.annotation.position.copy(item.marker.position);
        item.annotation.visible=distance<42 || family==='comets'||cometDisplay.selected===item.id;
        item.annotation.userData.selected=cometDisplay.selected===item.id;
        labelElements.get(item.annotation)!.text.setAttribute('aria-pressed',String(cometDisplay.selected===item.id));
        const direction=cometAntiSolar(state.position);item.away.position.copy(item.marker.position);if(direction)item.away.setDirection(new THREE.Vector3(...direction));else item.away.visible=false;
        if(updateOrbit) {
          const sun:ObjectState={id:'sun',position:[0,0,0],velocity:[0,0,0]};
          const points=dwarfReferenceOrbit(state,sun,BODIES[0].gm).map(p=>{const d=p.length();return d?p.multiplyScalar(macroRadius(d)/d):p;});
          item.orbit.geometry.dispose();item.orbit.geometry=new THREE.BufferGeometry().setFromPoints(points);
        }
      }
      if(updateOrbit && cometStates.length) lastCometOrbitTime=frame!.time;
      const compatible=frame && batch && Math.abs(frame.time-batch.timeTdb)<1e-5 && batch.originId==='ssb';
      for(const item of dwarfMeshes) {
        const state=compatible ? batch.states.find(s=>s.id===item.id) : undefined;
        const point=macroMemberAnchor(frame,batch,item.id);
        item.group.visible=!!point&&!(plutoExpanded&&item.id==='pluto');
        if(!state || !frame || !point) continue;
        item.marker.position.set(...point);
        item.annotation.position.copy(item.marker.position);
        item.annotation.visible=distance<42 || item.id===selectedMember;
        item.annotation.userData.selected=item.id===selectedMember;
        item.marker.scale.setScalar(item.id===selectedMember?1.5:1);
        item.annotation.userData.anchorRadius=.13*(item.id===selectedMember?1.5:1);
        item.orbit.material.opacity=item.id===selectedMember?.85:.22;
        labelElements.get(item.annotation)!.text.setAttribute('aria-pressed',String(item.id===selectedMember));
        if(!Number.isFinite(item.orbitTime) || Math.abs(frame.time-item.orbitTime)>21600) {
          const sun:ObjectState={id:'sun',position:[frame.positions[0],frame.positions[1],frame.positions[2]],velocity:[frame.velocities[0],frame.velocities[1],frame.velocities[2]]};
          const points=dwarfReferenceOrbit(state,sun,BODIES[0].gm).map(p=>{const d=p.length();return d ? p.multiplyScalar(macroRadius(d)/d):p;});
          item.orbit.geometry.dispose(); item.orbit.geometry=new THREE.BufferGeometry().setFromPoints(points);
          item.orbitTime=frame.time;
        }
      }
    },
    layoutLabels(camera: THREE.PerspectiveCamera, width: number, height: number, visible: boolean,focusedComet:string|null=null) {
      camera.updateMatrixWorld();
      const hostRect=host.getBoundingClientRect();
      const obstacles: {x:number;y:number;width:number;height:number}[] = [...host.querySelectorAll<HTMLElement>('.macro-world-labels:not(.phenomena-world-labels) .macro-world-label')].filter(b=>b.style.visibility==='visible').map(b=>{const r=b.getBoundingClientRect();return {x:r.x-hostRect.x,y:r.y-hostRect.y,width:r.width,height:r.height};});
      scene.traverse(object => {
        if (!object.userData.labelRadius) return;
        let parent:THREE.Object3D|null=object;while(parent){if(!parent.visible)return;parent=parent.parent;}
        const world=object.getWorldPosition(new THREE.Vector3()), point=world.clone().project(camera);
        if(point.z < -1 || point.z > 1) return;
        const radius=object.userData.labelRadius*height/(2*Math.tan(camera.fov*Math.PI/360)*world.distanceTo(camera.position))+5;
        obstacles.push({x:(point.x+1)*width/2-radius,y:(1-point.y)*height/2-radius,width:radius*2,height:radius*2});
      });
      const candidates = labels.flatMap((anchor,index) => {
        let object:THREE.Object3D|null=anchor;let enabled=visible;
        while(object) { enabled=enabled && object.visible;object=object.parent; }
        const elements=labelElements.get(anchor)!;elements.text.style.visibility='hidden';elements.line.style.visibility='hidden';
        if(!enabled||(focusedComet&&(anchor.userData.cometId??anchor.userData.memberId)!==focusedComet)) return [];
        const p=anchor.getWorldPosition(new THREE.Vector3()).project(camera);
        if(p.z < -1 || p.z > 1) return [];
        return [{id:String(index),x:(p.x+1)*width/2,y:(1-p.y)*height/2,width:elements.text.offsetWidth,height:elements.text.offsetHeight,radius:anchor.userData.anchorRadius?anchor.userData.anchorRadius*height/(2*Math.tan(camera.fov*Math.PI/360)*anchor.getWorldPosition(new THREE.Vector3()).distanceTo(camera.position))+5:undefined}];
      });
      candidates.sort((a,b)=>Number(!!labels[Number(b.id)].userData.selected)-Number(!!labels[Number(a.id)].userData.selected));
      for(const box of placeMacroLabels(candidates,width,height,height<550?65:75,height<550?95:115,obstacles)) {
        const el=labelElements.get(labels[Number(box.id)])!;
        el.text.style.transform=`translate(${box.x}px, ${box.y}px)`;el.text.style.visibility='visible';
        const x=Math.max(box.x,Math.min(box.anchorX,box.x+box.width)), y=Math.max(box.y,Math.min(box.anchorY,box.y+box.height));
        const dx=x-box.anchorX, dy=y-box.anchorY;
        el.line.style.width=`${Math.hypot(dx,dy)}px`;el.line.style.transform=`translate(${box.anchorX}px, ${box.anchorY}px) rotate(${Math.atan2(dy,dx)}rad)`;el.line.style.visibility='visible';
      }
    },
    dispose() { overlay.remove(); },
  };
}
