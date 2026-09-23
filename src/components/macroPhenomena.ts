import * as THREE from 'three';
import { AU_KM, BODIES } from '../data/catalog';
import { halleyPoint, macroEcliptic, macroDetailVisible, type MacroLayerId, type MacroLayerVisibility } from '../data/macroLayers';
import { macroRadius } from '../data/macroStructure';
import type { StateBatch, ObjectState } from '../ephemeris/stateProvider';
import type { StateFrame } from '../types';
import { dwarfReferenceOrbit } from './dwarfOrbit';

/** Explanatory geometry lives outside scientific state; animated wind has its own clock. */
export function createMacroPhenomena(scene: THREE.Scene, texture: THREE.Texture) {
  const groups = Object.fromEntries(['dwarfs','comets','wind','populations','dust','heliosphere','oort'].map(id => {
    const group = new THREE.Group(); group.name = `macro-${id}`; scene.add(group); return [id, group];
  })) as Record<string, THREE.Group>;
  const textures: THREE.Texture[] = [];
  const labels: THREE.Sprite[] = [];
  function label(text: string, color = '#c6dfed') {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 80;
    const context = canvas.getContext('2d')!;
    context.font = '28px sans-serif'; context.textAlign = 'center'; context.fillStyle = '#07131ee8';
    context.fillRect(0, 0, 512, 80); context.fillStyle = color; context.fillText(text, 256, 49);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; textures.push(map);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, sizeAttenuation: false }));
    sprite.scale.set(.19, .03, 1); labels.push(sprite); return sprite;
  }
  const line = (points: THREE.Vector3[], color: string, opacity: number) => new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  const ball = (size: number, color: string) => new THREE.Mesh(new THREE.SphereGeometry(size, 18, 12), new THREE.MeshBasicMaterial({ color }));
  const halley = Array.from({ length: 721 }, (_, n) => new THREE.Vector3(...macroEcliptic(halleyPoint(n / 720 * Math.PI * 2))));
  groups.comets.add(line(halley, '#82d2dc', .8));
  const orbitLabel = label('哈雷 · JPL 参考轨道'); orbitLabel.position.copy(halley[360]).add(new THREE.Vector3(0, .65, 0)); groups.comets.add(orbitLabel);
  // The perihelion activity vignette is fixed; it is deliberately not a current Halley marker.
  const nucleus = new THREE.Vector3(...macroEcliptic(halleyPoint(.35)));
  const outward = nucleus.clone().normalize();
  const tangent = new THREE.Vector3(...macroEcliptic(halleyPoint(.36))).sub(nucleus).normalize();
  groups.comets.add(ball(.07, '#f5edd4'));
  groups.comets.children.at(-1)!.position.copy(nucleus);
  const coma = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color: '#b0e6cf', transparent: true, opacity: .72, depthWrite: false, blending: THREE.AdditiveBlending }));
  coma.position.copy(nucleus); coma.scale.setScalar(.62); groups.comets.add(coma);
  for (let n = 0; n < 14; n++) {
    const spread = new THREE.Vector3(Math.sin(n*2.4), Math.cos(n*2.4), Math.sin(n*1.7));
    groups.comets.add(line(Array.from({ length: 32 }, (_, k) => {
      const t = k/31; return nucleus.clone().addScaledVector(outward, t*2.5).addScaledVector(tangent, -t*t*.65).addScaledVector(spread, t*.18);
    }), '#dfc097', .19));
  }
  groups.comets.add(line([nucleus, nucleus.clone().addScaledVector(outward, 3.2)], '#72caff', .9));
  const tailLabel = label('近太阳彗发 / 双尾 · 示意', '#b7e2d9'); tailLabel.position.copy(nucleus).addScaledVector(outward, 2.7).add(new THREE.Vector3(0, .7, 0)); groups.comets.add(tailLabel);

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

  const dwarfMeshes = ['ceres','pluto'].map((id,index) => {
    const group = new THREE.Group(); groups.dwarfs.add(group); group.visible=false;
    const marker=ball(.13,index ? '#c4d2e1' : '#e0b287'); group.add(marker);
    const annotation=label(index ? '冥王星 / 卡戎系统' : '谷神星',index ? '#c4d2e1' : '#e0b287'); group.add(annotation);
    const orbit=line([],index ? '#b1bddf' : '#ceac84',.58); group.add(orbit);
    return {id,group,marker,annotation,orbit};
  });
  let lastOrbitTime=NaN;
  return {
    update(frame: StateFrame | null, batch: StateBatch | null, enabled: MacroLayerVisibility, distance: number, seconds: number, family?: string) {
      for (const [id, group] of Object.entries(groups)) group.visible=enabled[id as MacroLayerId] && (macroDetailVisible(id as MacroLayerId,distance) || family===id || (id==='populations' && family==='centaurs'));
      for (const annotation of labels) annotation.visible = annotation.userData.overview ? distance >= 42 : distance < 42;
      const position=wind.geometry.getAttribute('position') as THREE.BufferAttribute;
      for(let n=0;n<720;n++) { const r=.5+((n/720+seconds*.045)%1)*macroRadius(90); const d=windDirections[n%180]; position.setXYZ(n,d.x*r,d.y*r,d.z*r); } position.needsUpdate=true;
      if(frame) {
        // Resolve Jupiter by ID rather than assuming its catalog index.
        const index=BODIES.findIndex(b=>b.id==='jupiter')*3;
        trojans.rotation.y=Math.atan2(frame.positions[index+1]-frame.positions[1],frame.positions[index]-frame.positions[0]);
      }
      const compatible=frame && batch && Math.abs(frame.time-batch.timeTdb)<1e-5 && batch.originId==='ssb';
      for(const item of dwarfMeshes) {
        const state=compatible ? batch.states.find(s=>s.id===item.id) : undefined;
        item.group.visible=!!state;
        if(!state || !frame) continue;
        item.marker.position.set(...macroEcliptic(state.position.map((v,i)=>(v-frame.positions[i])/AU_KM)));
        item.annotation.position.copy(item.marker.position).add(new THREE.Vector3(0,.65,0));
        item.annotation.visible=distance<36;
        if(!Number.isFinite(lastOrbitTime) || Math.abs(frame.time-lastOrbitTime)>21600) {
          const sun:ObjectState={id:'sun',position:[frame.positions[0],frame.positions[1],frame.positions[2]],velocity:[frame.velocities[0],frame.velocities[1],frame.velocities[2]]};
          const points=dwarfReferenceOrbit(state,sun,BODIES[0].gm).map(p=>{const d=p.length();return d ? p.multiplyScalar(macroRadius(d)/d):p;});
          item.orbit.geometry.dispose(); item.orbit.geometry=new THREE.BufferGeometry().setFromPoints(points);
        }
      }
      if(compatible && (!Number.isFinite(lastOrbitTime)||Math.abs(frame!.time-lastOrbitTime)>21600)) lastOrbitTime=frame!.time;
    },
    dispose() { textures.forEach(t=>t.dispose()); },
  };
}
