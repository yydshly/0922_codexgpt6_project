import * as THREE from 'three';
import {macroRadius} from '../data/macroStructure';
import {macroEcliptic} from '../data/macroLayers';
import {solarDemoState} from '../data/solarActivity';
import {nearEarthPoint,type NearEarthLayer} from '../data/nearEarth';
import {debrisPoint,meteorDemoState} from '../data/dust';
import {placeMacroLabels} from './macroLabelLayout';
import {integratedDetailVisible,type IntegratedFlags,type IntegratedTarget} from '../data/integratedScene';

/** Educational objects inside the existing macro scene; never a separate canvas or a scientific state provider. */
export function createIntegratedScene(scene:THREE.Scene,texture:THREE.Texture,host:HTMLElement,onFocus:(target:IntegratedTarget)=>void){
 const root=new THREE.Group();root.name='integrated-phenomena';root.userData.integrated=true;scene.add(root);
 const solar=new THREE.Group(),earth=new THREE.Group(),environment=new THREE.Group(),belts=new THREE.Group(),dust=new THREE.Group(),helio=new THREE.Group();root.add(solar,earth,dust,helio);earth.add(environment,belts);
 const line=(points:THREE.Vector3[],color:string,opacity=.5)=>new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false}));
 const ball=(r:number,color:string,opacity:number)=>new THREE.Mesh(new THREE.SphereGeometry(r,32,24),new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide}));
 const points=(data:THREE.Vector3[],color:string,size:number,opacity=.65)=>new THREE.Points(new THREE.BufferGeometry().setFromPoints(data),new THREE.PointsMaterial({color,size,map:texture,transparent:true,opacity,depthWrite:false}));
 const corona=ball(.54,'#ffc47d',.11);solar.add(corona);
 const flare=ball(.12,'#fff3ba',.9);flare.position.set(.33,.12,.1);solar.add(flare);
 const cme=new THREE.Group();cme.add(ball(1,'#f4a58a',.08));for(let i=0;i<5;i++)cme.add(line(Array.from({length:81},(_,j)=>{const a=j/80*Math.PI*2,b=i/5*Math.PI;return new THREE.Vector3(Math.cos(a)*Math.sin(b),Math.sin(a),Math.cos(a)*Math.cos(b));}),'#edb699',.4));solar.add(cme);
 const magnet=new THREE.Group();environment.add(magnet);
 // +X is anti-solar. Rotate this group as Earth moves, leaving particle belts on their illustrative axis.
 for(let j=0;j<10;j++){const a=j/10*Math.PI*2;magnet.add(line(Array.from({length:65},(_,i)=>{const x=-.45+i/64*1.95,r=.38*Math.sqrt(Math.max(0,1-Math.exp(-(x+.45)*4)));return new THREE.Vector3(x,r*Math.cos(a),r*Math.sin(a));}),'#78ccd5',.55));}
 for(let j=0;j<7;j++){const a=j/7*Math.PI*2;magnet.add(line(Array.from({length:49},(_,i)=>{const x=-.56+i/48*1.65,r=.48*Math.sqrt(Math.max(0,1-Math.exp(-(x+.56)*4)));return new THREE.Vector3(x,r*Math.cos(a),r*Math.sin(a));}),'#e6b18a',.25));}
 for(let j=0;j<6;j++)for(const length of [.18,.29]){const az=j/6*Math.PI*2,start=Math.asin(Math.sqrt(.09/length));environment.add(line(Array.from({length:65},(_,i)=>{const t=start+(Math.PI-2*start)*i/64,r=length*Math.sin(t)**2;return new THREE.Vector3(r*Math.sin(t)*Math.cos(az),r*Math.cos(t),r*Math.sin(t)*Math.sin(az));}),'#93cad5',.32));}
 for(const pole of [-1,1]){const aurora=new THREE.Mesh(new THREE.TorusGeometry(.06,.008,8,48),new THREE.MeshBasicMaterial({color:'#91f5b1',transparent:true,opacity:.8}));aurora.rotation.x=Math.PI/2;aurora.position.y=pole*.073;environment.add(aurora);}
 environment.add(ball(.125,'#8acdef',.09));
 for(const [id,color] of [['innerBelt','#f5ba69'],['outerBelt','#d993e5'],['plasmasphere','#76d3ca']] as [NearEarthLayer,string][])belts.add(points(Array.from({length:650},(_,i)=>new THREE.Vector3(...nearEarthPoint(id,i)).multiplyScalar(.09)),color,.014,.65));
 const stream=points(Array.from({length:700},(_,i)=>new THREE.Vector3(...macroEcliptic(debrisPoint(i/700*Math.PI*2)))),'#9cd8c7',.025,.65);dust.add(stream);
 const meteor=new THREE.Group(),grain=ball(.015,'#ecdcc1',1),glow=ball(.035,'#ffe2a4',.8),trail=line([new THREE.Vector3(),new THREE.Vector3()],'#ffe2a4',.8);meteor.add(grain,glow,trail);root.add(meteor);
 let seed=123012;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const shell=(count:number,lo:number,hi:number)=>Array.from({length:count},()=>{const y=random()*2-1,a=random()*Math.PI*2,r=lo+random()*(hi-lo),h=Math.sqrt(1-y*y);return new THREE.Vector3(r*h*Math.cos(a),r*y,r*h*Math.sin(a));});
 helio.add(points(shell(1400,macroRadius(90),macroRadius(120)),'#c3acde',.05,.55),points(shell(800,macroRadius(125),macroRadius(280)),'#8da8ce',.045,.5));
 const neutrals=points(Array.from({length:90},()=>new THREE.Vector3()),'#98daba',.06,.7);neutrals.frustumCulled=false;helio.add(neutrals);
 const overlay=document.createElement('div');overlay.className='macro-world-labels integrated-world-labels';host.appendChild(overlay);
 const anchors:Record<IntegratedTarget,THREE.Vector3>={sun:new THREE.Vector3(),earth:new THREE.Vector3(),dust:new THREE.Vector3(-2.5,1,0),helio:new THREE.Vector3(macroRadius(120),2,0)};
 const labels=(['sun','earth','dust','helio'] as const).map(id=>{const button=document.createElement('button');button.className='macro-world-label selectable';button.type='button';button.textContent=({sun:'太阳活动 · 靠近',earth:'近地空间 · 靠近',dust:'尘埃与碎屑 · 靠近',helio:'日球层环境 · 靠近'}[id]);button.setAttribute('aria-label',`在全景定位${button.textContent.split(' ·')[0]}`);button.onclick=()=>onFocus(id);overlay.appendChild(button);return {id,button};});
 let shown:Record<IntegratedTarget,boolean>={sun:false,earth:false,dust:false,helio:false};
 return {
  anchors,
  update(flags:IntegratedFlags,earthPosition:THREE.Vector3|null,camera:THREE.PerspectiveCamera,focused:IntegratedTarget|null,progress:number){
   if(earthPosition){earth.position.copy(earthPosition);meteor.position.copy(earthPosition);anchors.earth.copy(earthPosition);magnet.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),earthPosition.clone().normalize());}
   shown={sun:flags.solar,earth:!!earthPosition&&(flags.environment||flags.belts||flags.dust),dust:flags.dust,helio:flags.helio};
   const detailed=(id:IntegratedTarget)=>focused?focused===id:integratedDetailVisible(id,camera.position.distanceTo(anchors[id]),focused);
   solar.visible=flags.solar&&detailed('sun');environment.visible=flags.environment&&!!earthPosition&&detailed('earth');belts.visible=flags.belts&&!!earthPosition&&detailed('earth');dust.visible=flags.dust&&detailed('dust');helio.visible=flags.helio&&detailed('helio');
   const state=solarDemoState(progress);cme.visible=state.cmeVisible;cme.position.set(.5+(state.cmeX+2.8)*.15,state.cmeY*.15,.2);cme.scale.setScalar(state.cmeRadius*.24);flare.visible=state.flare>0;flare.scale.setScalar(.5+state.flare);
   meteor.visible=!!earthPosition&&flags.dust&&detailed('earth');const m=meteorDemoState(progress);grain.position.set(m.x*.038,m.y*.038+.095,0);grain.visible=m.visible;glow.position.copy(grain.position);glow.visible=m.glow;trail.visible=m.glow;trail.geometry.setFromPoints([grain.position,grain.position.clone().add(new THREE.Vector3(-.045,.035,0))]);
   const attr=neutrals.geometry.attributes.position;for(let i=0;i<90;i++)attr.setXYZ(i,-12+24*((i*.618034+progress)%1),2+3*Math.sin(i*4.1),3*Math.cos(i*2.3));attr.needsUpdate=true;
  },
  layout(camera:THREE.PerspectiveCamera,width:number,height:number,enabled:boolean){
   const candidates=labels.flatMap(({id,button})=>{button.style.visibility='hidden';if(!shown[id]||!enabled)return [];const p=anchors[id].clone().project(camera);if(p.z<-1||p.z>1)return [];return [{id,x:(p.x+1)*width/2,y:(1-p.y)*height/2,width:button.offsetWidth,height:button.offsetHeight}];});
   const obstacles=[...host.querySelectorAll<HTMLElement>('.macro-world-labels:not(.integrated-world-labels) .macro-world-label')].filter(e=>e.style.visibility==='visible').map(e=>{const r=e.getBoundingClientRect(),h=host.getBoundingClientRect();return {x:r.x-h.x,y:r.y-h.y,width:r.width,height:r.height};});
   for(const box of placeMacroLabels(candidates,width,height,70,110,obstacles)){const b=labels.find(l=>l.id===box.id)!.button;b.style.transform=`translate(${box.x}px,${box.y}px)`;b.style.visibility='visible';}
  },
  dispose(){overlay.remove();},
 };
}
