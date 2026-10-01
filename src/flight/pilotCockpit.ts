import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { FlightInput } from './flightPractice';
import {makePilotAvatar} from './pilotAvatar';
import {makeCrewCouch} from './crewCouch';

type Point = [number, number, number];
export const PILOT_EYE: Point = [0, 1.5, -2.9];
export interface CockpitReading { distance:number; closing:number; speed:number; fuel:number; firing:number; bearing:number;fuelCaption?:string;thrustCaption?:string;mode?:'orbit'|'launch'|'landing';clearanceM?:number;loadG?:number }

/** A real opening in the upper hull. Exterior glazing and the pilot view share this geometry. */
export function makePilotCockpit(profile:[number,number][], hull:THREE.Material, metal:THREE.Material,options:{crewCouch?:boolean}={}) {
  const crew=!!options.crewCouch;
  const group=new THREE.Group();group.name='pilot-cockpit';
  const dark=new THREE.MeshStandardMaterial({color:'#171f24',roughness:.79,metalness:.15,side:THREE.DoubleSide});
  const trim=new THREE.MeshStandardMaterial({color:'#505b60',roughness:.48,metalness:.6});
  const lining=new THREE.MeshStandardMaterial({color:'#353b3c',roughness:.94,side:THREE.DoubleSide});
  const glass=new THREE.MeshPhysicalMaterial({color:'#9ec4cd',transparent:true,opacity:.12,roughness:.13,metalness:.05,clearcoat:.65,side:THREE.DoubleSide,depthWrite:false});
  const make=(geometry:THREE.BufferGeometry,material:THREE.Material,position:Point=[0,0,0])=>{
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);mesh.castShadow=!material.transparent;mesh.receiveShadow=!material.transparent;group.add(mesh);return mesh;
  };
  const box=(w:number,h:number,d:number,material:THREE.Material,position:Point)=>make(new RoundedBoxGeometry(w,h,d,2,.025),material,position);
  const surface=(points:Point[],material:THREE.Material)=>{
    const geometry=new THREE.BufferGeometry(),indices:number[]=[];
    for(let i=1;i<points.length-1;i++)indices.push(0,i,i+1);
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));geometry.setIndex(indices);geometry.computeVertexNormals();return make(geometry,material);
  };
  const rail=(a:Point,b:Point,radius=.048,material:THREE.Material=trim)=>{
    const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);
    const object=make(new THREE.CylinderGeometry(radius,radius,delta.length(),12),material);
    object.position.copy(from).add(to).multiplyScalar(.5);object.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return object;
  };
  const frontBottom=(side:number):Point=>[side*1.22,.45,-4.8];
  const frontTop=(side:number):Point=>[side*1.15,2.1,-3.8];
  const rearTop=(side:number):Point=>[side*1.68,2.24,-.75];
  const rearBottom=(side:number):Point=>[side*1.983,1.145,-.45];
  const exterior=hull.clone();exterior.side=THREE.DoubleSide;

  // The lower shell stops at these chines; no opaque capsule is left behind the glazing.
  surface([[-.83*Math.sqrt(3)/2,.415,-5.05],[.83*Math.sqrt(3)/2,.415,-5.05],frontBottom(1),frontBottom(-1)],exterior);
  surface([frontTop(-1),frontTop(1),rearTop(1),rearTop(-1)],exterior);
  surface([rearBottom(1),rearBottom(-1),rearTop(-1),rearTop(1)],lining);
  for(const side of [-1,1]){
    const edge:Point[]=profile.map(([r,z])=>[side*r*Math.sqrt(3)/2,r*.5,z]);
    surface([...edge,frontBottom(side)],exterior);
    const pane=surface([frontBottom(side),rearBottom(side),rearTop(side),frontTop(side)],glass);pane.name='side-window';
    rail(frontBottom(side),frontTop(side),.065,metal);rail(frontTop(side),rearTop(side),.065,metal);
    rail(frontBottom(side),rearBottom(side),.06);rail(rearTop(side),rearBottom(side),.065,metal);
    // Split the long side window with a structural post.
    rail([side*1.5,.98,-2.6],[side*1.38,2.16,-2.45],.035);
  }
  const windshield=surface([frontBottom(-1),frontBottom(1),frontTop(1),frontTop(-1)],glass);windshield.name='forward-windshield';
  rail(frontBottom(-1),frontBottom(1),.085);rail(frontTop(-1),frontTop(1),.065,metal);
  for(const side of [-1,1])rail([side*.66,.45,-4.8],[side*.63,2.1,-3.8],.028);

  // Cabin floor, a seat behind the eye, and a physical instrument coaming below the window.
  box(2.75,.13,3.0,dark,[0,crew?-.04:.28,-2.6]);
  if(crew)group.add(makeCrewCouch().group);
  else{box(.87,.18,.83,lining,[0,.56,-2.25]);box(.82,1.17,.18,lining,[0,1.04,-1.86]);
    for(const side of [-1,1]){box(.12,.12,.66,trim,[side*.53,.85,-2.38]);rail([side*.53,.82,-2.64],[side*.53,1.04,-2.78],.045,dark);}}
  // Physical control inputs and gloved hands, below the forward field of view.
  const glove=new THREE.MeshStandardMaterial({color:'#556764',roughness:.86});
  const stick=new THREE.Group();stick.position.set(.76,.82,-3.16);stick.name='pilot-control-stick';group.add(stick);
  const grip=new THREE.Mesh(new RoundedBoxGeometry(.1,.24,.11,2,.025),dark);grip.position.y=.17;stick.add(grip);
  if(!crew){const hand=new THREE.Mesh(new RoundedBoxGeometry(.17,.12,.18,2,.035),glove);hand.name='cockpit-right-glove';hand.position.set(-.015,.22,.04);stick.add(hand);}
  const throttle=new THREE.Group();throttle.position.set(-.76,1.02,-3.12);throttle.name='pilot-throttle-hand';group.add(throttle);
  if(!crew){const throttleHand=new THREE.Mesh(new RoundedBoxGeometry(.18,.12,.2,2,.035),glove);throttleHand.name='cockpit-left-glove';throttle.add(throttleHand);}
  else{const lever=new THREE.Mesh(new RoundedBoxGeometry(.10,.12,.18,2,.025),dark);lever.position.y=-.04;throttle.add(lever);glove.dispose();}
  if(!crew)for(const side of [-1,1])box(.3,.1,.65,lining,[side*.78,.73,-3.16]);
  const pilot=makePilotAvatar({mode:crew?'crew-couch':'seated'});group.add(pilot.group);
  const controls=(input:FlightInput,manual=true,load=1)=>{pilot.setManual(manual);pilot.update(input,load);stick.rotation.set(manual?input.pitch*.24:0,0,manual?-input.yaw*.24-input.roll*.1:0);throttle.position.z=-3.12-(manual?input.thrust*(crew?.035:.12):0);throttle.position.y=manual&&input.brake?crew?1.00:.94:1.02;};
  box(1.72,.21,.35,dark,[0,crew?.34:.5,-4.28]);
  const panel=box(1.66,crew?.28:.42,.09,trim,[0,crew?.49:.73,-4.24]);panel.rotation.x=-.52;
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
  const context=canvas.getContext('2d')!;const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const screen=make(new THREE.PlaneGeometry(1.54,crew?.24:.32),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}),[0,crew?.505:.745,-4.181]);screen.rotation.x=-.52;screen.name='live-flight-instruments';
  const lamps=new THREE.MeshBasicMaterial({color:'#b3d2b1',toneMapped:false});
  for(let i=0;i<5;i++)make(new THREE.SphereGeometry(.015,8,6),lamps,[.47+i*.055,crew?.69:.935,-4.31]);
  const groundDisplay=new THREE.Group();groundDisplay.name='crew-ground-monitor';groundDisplay.visible=crew;group.add(groundDisplay);
  const standby=document.createElement('canvas');standby.width=640;standby.height=320;const standbyContext=standby.getContext('2d')!;
  standbyContext.fillStyle='#081719';standbyContext.fillRect(0,0,640,320);standbyContext.fillStyle='#aac8c4';standbyContext.font='26px Arial';standbyContext.fillText('BASE CAMERA / 舱底摄像',30,82);standbyContext.font='21px Arial';standbyContext.fillText('服务舱分离后启用',30,162);standbyContext.fillText('固定镜头 · 非舷窗视线',30,212);
  const standbyTexture=new THREE.CanvasTexture(standby);standbyTexture.colorSpace=THREE.SRGBColorSpace;
  const groundMaterial=new THREE.MeshBasicMaterial({map:standbyTexture,toneMapped:false});
  if(crew){
    const frame=new THREE.Mesh(new RoundedBoxGeometry(1.50,.65,.09,2,.025),dark);frame.position.set(0,1.015,-4.26);frame.rotation.x=-.15;groundDisplay.add(frame);
    const feed=new THREE.Mesh(new THREE.PlaneGeometry(1.39,.53),groundMaterial);feed.name='live-ground-camera-screen';feed.position.set(0,1.02,-4.20);feed.rotation.x=-.15;groundDisplay.add(feed);
    const mark=new THREE.Mesh(new THREE.RingGeometry(.012,.018,20),lamps);mark.position.set(0,1.02,-4.186);mark.rotation.x=-.15;groundDisplay.add(mark);
  }
  if(!crew){standbyTexture.dispose();groundMaterial.dispose();}
  const setGroundFeed=(map:THREE.Texture|null)=>{if(!crew)return;const next=map??standbyTexture;if(groundMaterial.map!==next){groundMaterial.map=next;groundMaterial.needsUpdate=true;}groundDisplay.userData.source=map?'fixed-base-camera':'standby';};
  const cabinLight=new THREE.PointLight('#bcd4e0',1.2,3.5,2);cabinLight.position.set(0,1.8,-2.2);group.add(cabinLight);
  let lastDraw='';
  const update=(reading:CockpitReading)=>{
    const values=[reading.distance.toFixed(1),reading.closing.toFixed(2),reading.fuel.toFixed(1),reading.bearing.toFixed(0),reading.speed.toFixed(2),Math.round(reading.firing*100).toString()];
    const key=values.join('|')+(reading.fuelCaption??'')+(reading.thrustCaption??'')+reading.mode+reading.clearanceM?.toFixed(2)+reading.loadG?.toFixed(2);if(key===lastDraw)return;lastDraw=key;
    context.fillStyle='#071416';context.fillRect(0,0,1024,256);context.strokeStyle='#385555';context.lineWidth=2;
    for(const x of [341,682]){context.beginPath();context.moveTo(x,20);context.lineTo(x,236);context.stroke();}
    context.font='22px Arial';context.fillStyle='#89b6b1';
    const descent=reading.mode==='landing',ascent=reading.mode==='launch';
    const labels=crew?[descent||ascent?'参考点高度 / m':'平台距离 / m',descent||ascent?'竖直速度 / m/s':'接近速度 / m/s',descent?'着陆推进剂 / kg':ascent?'火箭推进剂 / t':'服务舱推进剂 / kg']:[descent||ascent?'ALT REF / m':'TARGET / m',descent||ascent?'VERTICAL / m/s':'CLOSING / m/s',reading.fuelCaption??'FUEL / kg'];labels.forEach((label,i)=>context.fillText(label,24+i*341,44));
    context.font='52px monospace';context.fillStyle='#d4e7cc';values.slice(0,3).forEach((value,i)=>context.fillText(value,24+i*341,118,293));
    context.font='19px Arial';context.fillStyle='#97bbc1';
    context.fillText(descent?`${crew?'最低点净空':'CLEARANCE'} ${reading.clearanceM?.toFixed(2)??'—'} m`:`${crew?'船头偏角':'OFF AXIS'} ${values[3]} ${crew?'°':'DEG'}`,24,186);context.fillText(descent?`${crew?'竖直倾角':'TILT'} ${reading.bearing.toFixed(2)} ${crew?'°':'DEG'}`:`${crew?'相对速率':'SPEED'} ${values[4]} m/s`,365,186);context.fillText(descent||ascent?`${crew?'乘员过载':'LOAD'} ${reading.loadG?.toFixed(2)??'—'} g`:`${crew?'主发动机':reading.thrustCaption??'THRUST'} ${values[5]} %`,706,186);
    context.fillStyle='#688983';context.font='15px Arial';context.fillText(crew?descent?'返回 · 竖直向上为正 · 参考地表':ascent?'发射 · 竖直向上为正':'在轨 · 平台参照 · 正接近 / 负远离':descent?'RETURN / VERTICAL +UP / REFERENCE GROUND':ascent?'LAUNCH / VERTICAL +UP':'ORBIT  /  LOCAL FLIGHT DEMONSTRATOR',24,233);texture.needsUpdate=true;
    screen.userData.reading={...reading};
  };
  update({distance:125,closing:0,speed:0,fuel:100,bearing:0,firing:0});
  return {group,eye:crew?pilot.eye.clone():new THREE.Vector3(...PILOT_EYE),update,controls,pilot,groundDisplay,setGroundFeed};
}
