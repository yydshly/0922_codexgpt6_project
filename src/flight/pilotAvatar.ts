import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import type {FlightInput} from './flightPractice';
import {CREW_COUCH_POSE,crewCouchEye} from './crewCouch';

export interface PilotAvatarOptions { mode?:'seated'|'crew-couch' }

/** One seated 3D crew member. The same body is used inside and outside the cabin. */
export function makePilotAvatar(options:PilotAvatarOptions={}){
  const crew=options.mode==='crew-couch';
  const group=new THREE.Group();group.name=crew?'crew-reclined-pilot':'seated-pilot';
  group.userData.pose=crew?'crew-couch':'seated';
  const suit=new THREE.MeshStandardMaterial({color:'#e0e5df',roughness:.86});
  const joint=new THREE.MeshStandardMaterial({color:'#435b65',roughness:.8});
  const belt=new THREE.MeshStandardMaterial({color:'#283d47',roughness:.9});
  const trim=new THREE.MeshStandardMaterial({color:'#8ea7ae',metalness:.5,roughness:.4});
  const visor=new THREE.MeshPhysicalMaterial({color:'#163d50',metalness:.28,roughness:.18,clearcoat:1,transparent:true,opacity:crew?.34:.94,side:THREE.DoubleSide});
  const skin=new THREE.MeshStandardMaterial({color:'#b9967b',roughness:.8});
  const mesh=(geo:THREE.BufferGeometry,mat:THREE.Material,p:[number,number,number],parent:THREE.Object3D=group)=>{const m=new THREE.Mesh(geo,mat);m.position.set(...p);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const ellipsoid=(r:[number,number,number],p:[number,number,number],mat=suit,parent:THREE.Object3D=group)=>{const m=mesh(new THREE.SphereGeometry(1,24,16),mat,p,parent);m.scale.set(...r);return m;};
  const segment=(a:THREE.Vector3,b:THREE.Vector3,r:number,mat=suit)=>{const d=b.clone().sub(a),m=mesh(new THREE.CapsuleGeometry(r,Math.max(.01,d.length()-2*r),6,16),mat,[0,0,0]);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;};
  if(crew){
    const hips=new THREE.Vector3(...CREW_COUCH_POSE.hip),shoulders=new THREE.Vector3(0,CREW_COUCH_POSE.shoulders[0][1],CREW_COUCH_POSE.shoulders[0][2]);
    const torso=ellipsoid([.29,.33,.17],hips.clone().add(shoulders).multiplyScalar(.5).toArray() as [number,number,number]);torso.name='crew-pilot-torso';
    torso.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),shoulders.clone().sub(hips).normalize());
    torso.userData.chestDirection=[...CREW_COUCH_POSE.chestDirection];
    const pelvis=ellipsoid([.28,.15,.22],CREW_COUCH_POSE.hip.slice() as [number,number,number]);pelvis.name='crew-pilot-pelvis';
    pelvis.userData.poseLandmark='pelvis';
    segment(shoulders,new THREE.Vector3(0,1.37,-2.59),.10,joint);
  }else{
    ellipsoid([.29,.35,.17],[0,1.0,-2.28]);ellipsoid([.28,.15,.22],[0,.64,-2.4]);
  }
  const head=new THREE.Group();head.name='pilot-head';
  if(crew)head.position.set(...CREW_COUCH_POSE.head);else head.position.set(0,1.50,-2.68);
  group.add(head);
  head.visible=false;
  if(crew){
    head.userData.poseLandmark='head';head.userData.faceDirection=[...CREW_COUCH_POSE.gazeDirection];
    // An actual forward opening in the helmet shell lets the face look through the visor.
    const shell=new THREE.SphereGeometry(1,24,16),positions=shell.getAttribute('position'),indices=shell.index!,open:number[]=[];
    for(let i=0;i<indices.count;i+=3){
      const a=indices.getX(i),b=indices.getX(i+1),c=indices.getX(i+2);
      if((positions.getZ(a)+positions.getZ(b)+positions.getZ(c))/3>=-.45)open.push(a,b,c);
    }
    shell.setIndex(open);
    const helmet=mesh(shell,suit,[0,0,0],head);helmet.scale.set(.22,.26,.23);helmet.name='crew-pilot-helmet-shell';
  }else ellipsoid([.22,.26,.23],[0,0,0],suit,head);
  const face=ellipsoid([.105,.14,.055],[0,-.01,-.125],skin,head);face.name='pilot-face';
  const helmetVisor=mesh(new THREE.SphereGeometry(.238,32,20,Math.PI*1.15,Math.PI*.70,Math.PI*.15,Math.PI*.64),visor,[0,0,-.025],head);
  if(crew)helmetVisor.name='crew-pilot-visor';
  mesh(new THREE.TorusGeometry(.22,.018,8,32),trim,[0,0,-.15],head);
  mesh(new RoundedBoxGeometry(.10,.06,.025,2,.008),joint,crew?[0,-.17,-.19]:[0,.01,-.24],head);
  if(crew){
    for(const [index,side] of [-1,1].entries()){
      const shoulder=new THREE.Vector3(...CREW_COUCH_POSE.shoulders[index]),elbow=new THREE.Vector3(...CREW_COUCH_POSE.elbows[index]),wrist=new THREE.Vector3(...CREW_COUCH_POSE.hands[index]);
      ellipsoid([.11,.12,.12],shoulder.toArray() as [number,number,number]);segment(shoulder,elbow,.085);segment(elbow,wrist,.075);ellipsoid([.085,.09,.085],elbow.toArray() as [number,number,number],joint);
      const glove=mesh(new RoundedBoxGeometry(.17,.12,.18,2,.035),joint,wrist.toArray() as [number,number,number]);glove.name=side<0?'crew-pilot-left-glove':'crew-pilot-right-glove';
      const hip=new THREE.Vector3(side*.2,CREW_COUCH_POSE.hip[1],CREW_COUCH_POSE.hip[2]),knee=new THREE.Vector3(...CREW_COUCH_POSE.knees[index]),ankle=new THREE.Vector3(...CREW_COUCH_POSE.ankles[index]);
      const thigh=segment(hip,knee,.105);thigh.name=side<0?'crew-pilot-left-thigh':'crew-pilot-right-thigh';
      const calf=segment(knee,ankle,.083);calf.name=side<0?'crew-pilot-left-calf':'crew-pilot-right-calf';
      ellipsoid([.105,.105,.105],knee.toArray() as [number,number,number],joint);
      const boot=mesh(new RoundedBoxGeometry(.19,.14,.30,2,.035),joint,CREW_COUCH_POSE.boots[index].slice() as [number,number,number]);boot.name=side<0?'crew-pilot-left-boot':'crew-pilot-right-boot';
    }
  }else{
    for(const side of [-1,1]){
    const shoulder=new THREE.Vector3(side*.28,1.17,-2.31),elbow=new THREE.Vector3(side*.57,.89,-2.72),wrist=new THREE.Vector3(side*.76,1.03,-3.12);
    ellipsoid([.11,.12,.12],shoulder.toArray() as [number,number,number]);segment(shoulder,elbow,.085);segment(elbow,wrist,.075);ellipsoid([.085,.09,.085],elbow.toArray() as [number,number,number],joint);
    segment(new THREE.Vector3(side*.16,.65,-2.42),new THREE.Vector3(side*.20,.55,-3.05),.105);
    segment(new THREE.Vector3(side*.20,.55,-3.05),new THREE.Vector3(side*.20,.34,-3.48),.083);
    mesh(new RoundedBoxGeometry(.19,.15,.31,2,.035),joint,[side*.20,.31,-3.55]);
    segment(new THREE.Vector3(side*.19,1.23,-2.49),new THREE.Vector3(side*.09,.68,-2.60),.026,belt);
    }
    mesh(new RoundedBoxGeometry(.55,.075,.045,2,.015),belt,[0,.71,-2.61]);
    mesh(new RoundedBoxGeometry(.09,.085,.045,2,.012),trim,[0,.74,-2.64]);
    mesh(new RoundedBoxGeometry(.16,.07,.025,2,.008),joint,[-.11,1.08,-2.455]);
  }
  let manual=false;
  return {group,head,eye:crew?crewCouchEye():new THREE.Vector3(0,1.5,-2.9),pose:crew?CREW_COUCH_POSE:undefined,setView:(cockpit:boolean)=>{head.visible=!cockpit;},setManual:(value:boolean)=>{manual=value;},
    update:(input:FlightInput,load=1)=>{
      // A restrained pilot moves only slightly; no arbitrary tumbling under acceleration.
      head.rotation.y=manual&&!crew?input.yaw*.04:0;head.rotation.x=manual&&!crew?input.pitch*.03:0;
      group.userData.control=manual?'manual':'monitoring';group.userData.loadG=load;
    }};
}
