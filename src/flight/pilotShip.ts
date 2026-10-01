import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makePilotCockpit } from './pilotCockpit';
import { REACTION_JETS,reactionJetStrength } from './reactionControl';
import type { FlightState } from './flightPractice';

/** Original engineering-inspired teaching craft, not a replica of a certified vehicle. */
export function makePilotShip(options:{crewCouch?:boolean}={}) {
  const group = new THREE.Group();group.name='pilot-spacecraft';
  const make=(geometry:THREE.BufferGeometry,material:THREE.Material,parent:THREE.Object3D=group,position:[number,number,number]=[0,0,0])=>{
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  };
  const ring=(radius:number,z:number,material:THREE.Material,tube=.035,parent:THREE.Object3D=group)=>make(new THREE.TorusGeometry(radius,tube,8,64),material,parent,[0,0,z]);
  const cylinder=(radius:number,length:number,z:number,material:THREE.Material,parent:THREE.Object3D=group)=>{const mesh=make(new THREE.CylinderGeometry(radius,radius,length,64),material,parent,[0,0,z]);mesh.rotation.x=Math.PI/2;return mesh;};
  const lathe=(profile:[number,number][],material:THREE.Material,segments=96,from=0,length=Math.PI*2)=>{const object=make(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),segments,from,length),material);object.rotation.x=Math.PI/2;return object;};
  const box=(w:number,h:number,d:number,material:THREE.Material,parent:THREE.Object3D,position:[number,number,number])=>make(new RoundedBoxGeometry(w,h,d,2,Math.min(.035,w/5,h/5,d/5)),material,parent,position);
  const pipe=(points:[number,number,number][],radius:number,material:THREE.Material,parent:THREE.Object3D=group)=>make(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,radius,8,false),material,parent);

  // Material signals are procedural surface data, not painted photographs or external assets.
  const size=256, foilData=new Uint8Array(size*size*4),roughData=new Uint8Array(size*size*4);
  let seed=71;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size*Math.PI*2,v=y/size*Math.PI*2;
    const fold=Math.sin(u*9+Math.sin(v*7)*1.8)*.22+Math.sin(v*17-u*5)*.11+Math.cos(u*23+v*11)*.055;
    const noise=random()-.5,index=(y*size+x)*4,value=Math.round(128+fold*150+noise*17);
    foilData.set([value,value,value,255],index);const r=145+Math.round(noise*25+fold*24);roughData.set([r,r,r,255],index);
  }
  const foilBump=new THREE.DataTexture(foilData,size,size);foilBump.wrapS=foilBump.wrapT=THREE.RepeatWrapping;foilBump.repeat.set(3,2);foilBump.needsUpdate=true;
  const microRoughness=new THREE.DataTexture(roughData,size,size);microRoughness.wrapS=microRoughness.wrapT=THREE.RepeatWrapping;microRoughness.repeat.set(5,5);microRoughness.needsUpdate=true;
  const white=new THREE.MeshStandardMaterial({color:'#d5d6cf',roughness:.67,metalness:.12,roughnessMap:microRoughness});
  const alternate=new THREE.MeshStandardMaterial({color:'#bfc5c5',roughness:.7,metalness:.16,roughnessMap:microRoughness});
  const titanium=new THREE.MeshStandardMaterial({color:'#8b9195',roughness:.35,metalness:.85,roughnessMap:microRoughness});
  const steel=new THREE.MeshStandardMaterial({color:'#545e69',roughness:.32,metalness:.9});
  const graphite=new THREE.MeshStandardMaterial({color:'#22272c',roughness:.69,metalness:.35,side:THREE.DoubleSide});
  const gold=new THREE.MeshStandardMaterial({color:'#bda373',roughness:.58,metalness:.92,bumpMap:foilBump,bumpScale:.055,roughnessMap:microRoughness});

  // Tapered pressure capsule, separated thermal panels and an attached docking collar.
  const capsule:[number,number][]=[[.83,-5.05],[1.02,-4.82],[1.25,-4.1],[1.78,-2.8],[2.28,-1.45],[2.34,-.92],[2.29,-.45]];
  // Open the upper 120 degrees for the cabin; the pilot actually sees through its windows.
  lathe(capsule,graphite,64,0,Math.PI*2/3);lathe(capsule,graphite,64,Math.PI*4/3,Math.PI*2/3);
  for(let i=0;i<12;i++)if(i<4||i>=8)lathe(capsule.map(([r,z])=>[r+.015,z]),i%4===0?alternate:white,10,i*Math.PI/6+.004,Math.PI/6-.008);
  const cockpit=makePilotCockpit(capsule,white,titanium,options);group.add(cockpit.group);
  cylinder(2.31,.16,-.45,graphite);ring(2.34,-.46,titanium,.065);ring(2.32,-.72,titanium,.035);
  cylinder(.86,.21,-5.08,titanium);cylinder(.71,.235,-5.09,graphite);ring(.84,-5.2,steel,.055);ring(.65,-5.215,titanium,.025);

  const fastenerGeometry=new THREE.CylinderGeometry(.038,.038,.025,6);
  const capsuleBolts=new THREE.InstancedMesh(fastenerGeometry,titanium,56),serviceBolts=new THREE.InstancedMesh(fastenerGeometry,titanium,64),dummy=new THREE.Object3D();
  capsuleBolts.name='capsule-fasteners';serviceBolts.name='service-fasteners';
  for(const [mesh,specs] of [[capsuleBolts,[[.78,-5.222,16],[2.32,-.58,40]]],[serviceBolts,[[1.7,4.047,32],[1.45,4.187,32]]]] as const){
    let boltIndex=0;for(const [radius,z,count] of specs)for(let i=0;i<count;i++){
      const a=i/count*Math.PI*2;dummy.position.set(Math.cos(a)*radius,Math.sin(a)*radius,z);dummy.rotation.set(Math.PI/2,0,0);dummy.updateMatrix();mesh.setMatrixAt(boltIndex++,dummy.matrix);
    }mesh.castShadow=true;mesh.receiveShadow=true;
  }
  group.add(capsuleBolts);
  const mountOnHull=(theta:number,radius:number,z:number)=>{
    const mount=new THREE.Group();mount.position.set(Math.cos(theta)*radius,Math.sin(theta)*radius,z);
    mount.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(Math.cos(theta),Math.sin(theta),-.39).normalize());group.add(mount);return mount;
  };
  const hatch=mountOnHull(-Math.PI/2,2.15,-1.65);
  box(1.2,1.1,.09,titanium,hatch,[0,0,0]);box(1.08,.98,.1,white,hatch,[0,0,.025]);box(.31,.075,.06,steel,hatch,[.26,0,.11]);
  const capsuleNodes=new Set(group.children);

  // Service module with wrinkled multilayer insulation, radiators and structural straps.
  group.add(serviceBolts);
  cylinder(1.78,4.1,1.65,graphite);
  const blanketGeometry=new THREE.CylinderGeometry(1.84,1.84,3.7,96,32, true),vertices=blanketGeometry.getAttribute('position');
  for(let i=0;i<vertices.count;i++){
    const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i),angle=Math.atan2(z,x);
    const bulge=.022*Math.sin(angle*19+y*7)+.011*Math.cos(angle*31-y*11),factor=1+bulge/1.84;
    vertices.setXYZ(i,x*factor,y,z*factor);
  }
  blanketGeometry.computeVertexNormals();const blanket=make(blanketGeometry,gold,group,[0,0,1.75]);blanket.rotation.x=Math.PI/2;
  for(const z of [.0,1.15,2.75,3.65])ring(1.875,z,titanium,.038);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4,panel=new THREE.Group();panel.position.set(Math.cos(a)*1.9,Math.sin(a)*1.9,1.75);panel.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(Math.cos(a),Math.sin(a),0));group.add(panel);
    box(.84,2.95,.055,i%2===0?white:graphite,panel,[0,0,0]);
    if(i%2===0)for(let fin=0;fin<13;fin++)box(.73,.025,.035,alternate,panel,[0,-1.31+fin*.217,.046]);
    else {box(.76,.13,.09,titanium,panel,[0,1.32,.025]);box(.76,.13,.09,titanium,panel,[0,-1.32,.025]);}
  }
  cylinder(1.8,.23,3.92,steel);cylinder(1.58,.11,4.12,titanium);
  for(const sign of [-1,1]){
    pipe([[sign*1.68,-.7,.1],[sign*2.02,-.8,.7],[sign*2.02,-.8,3.7],[sign*.76,-.5,4.8]],.048,titanium);
    pipe([[sign*1.2,.8,3.9],[sign*.8,.8,4.4],[sign*.46,.35,5.1]],.085,steel);
  }

  // Recessed throat, curved nozzle wall, attached lip and cooling jacket rings.
  cylinder(.59,.55,4.7,steel);ring(.67,4.78,titanium,.075);
  const bell:[number,number][]=[[.42,4.94],[.37,5.17],[.40,5.4],[.55,5.85],[.75,6.28],[1.04,6.82],[1.34,7.35],[1.39,7.51]];
  const nozzleMaterial=new THREE.MeshStandardMaterial({color:'#515354',roughness:.58,metalness:.7,side:THREE.DoubleSide,roughnessMap:microRoughness});
  lathe(bell,nozzleMaterial);ring(1.39,7.5,titanium,.055);cylinder(.34,.06,5.18,graphite);
  for(let i=1;i<8;i++){const [r,z]=bell[i];if(i<6)ring(r+.012,z,steel,.012);}
  for(let i=0;i<8;i++){
    const a=i/8*Math.PI*2;pipe([[Math.cos(a)*.69,Math.sin(a)*.69,4.4],[Math.cos(a)*.94,Math.sin(a)*.94,4.9],[Math.cos(a)*.51,Math.sin(a)*.51,5.55]],.035,titanium);
  }

  // Actual panel thickness, hinges, bus bars and individual bevelled solar cells.
  const solarCanvas=document.createElement('canvas');solarCanvas.width=128;solarCanvas.height=256;
  const ctx=solarCanvas.getContext('2d')!;ctx.fillStyle='#132c43';ctx.fillRect(0,0,128,256);
  ctx.strokeStyle='#466072';ctx.lineWidth=1;for(let y=3;y<256;y+=7){ctx.beginPath();ctx.moveTo(3,y);ctx.lineTo(125,y);ctx.stroke();}
  ctx.strokeStyle='#9ca69f';ctx.lineWidth=1.8;for(const x of [29,98]){ctx.beginPath();ctx.moveTo(x,1);ctx.lineTo(x,255);ctx.stroke();}
  const cellMap=new THREE.CanvasTexture(solarCanvas);cellMap.colorSpace=THREE.SRGBColorSpace;cellMap.anisotropy=4;
  const solar=new THREE.MeshPhysicalMaterial({color:'#c3d6e2',map:cellMap,roughness:.3,metalness:.6,clearcoat:.65,clearcoatRoughness:.25,iridescence:.12});
  const cellGeometry=new THREE.BoxGeometry(.335,.028,.59),cells=new THREE.InstancedMesh(cellGeometry,solar,240);
  let cellIndex=0;
  for(const side of [-1,1]){
    const wing=new THREE.Group();wing.name='service-solar-wing';wing.position.set(side*5.85,0,1.8);group.add(wing);
    box(6.3,.115,4.7,graphite,wing,[0,0,0]);
    for(const z of [-2.36,2.36])box(6.36,.16,.045,titanium,wing,[0,0,z]);
    for(const x of [-3.16,-1.06,1.06,3.16])box(.055,.16,4.72,titanium,wing,[x,0,0]);
    for(let x=0;x<20;x++)for(let z=0;z<6;z++){
      dummy.position.set(side*5.85-3+(x+.5)*.30,.083,1.8-2.18+(z+.5)*.726);dummy.rotation.set(0,0,0);dummy.scale.set(.82,1,1.08);dummy.updateMatrix();cells.setMatrixAt(cellIndex++,dummy.matrix);
    }
    pipe([[side*1.85,0,1.8],[side*2.7,0,1.8],[side*3.5,0,1.8]],.12,steel);
    pipe([[side*1.72,.7,1.2],[side*2.7,.06,1.8],[side*3.3,.04,2.6]],.065,titanium);
    pipe([[side*1.72,-.7,2.4],[side*2.7,-.06,1.8],[side*3.3,-.04,1.0]],.065,titanium);
    const hub=make(new THREE.CylinderGeometry(.26,.26,.34,24),steel,group,[side*2.45,0,1.8]);hub.rotation.z=Math.PI/2;
  }
  cells.castShadow=true;cells.receiveShadow=true;group.add(cells);
  cells.name='service-solar-cells';

  // Fine identification stencils on the actual hull surface, not screen overlays.
  const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=256;const labelContext=labelCanvas.getContext('2d')!;
  labelContext.clearRect(0,0,512,256);labelContext.fillStyle='#2a343b';labelContext.font='bold 65px Arial';labelContext.fillText('ORBIT',28,90);labelContext.font='25px Arial';labelContext.fillText('EXPLORER  /  01',30,135);labelContext.fillStyle='#8f4830';labelContext.fillRect(32,160,150,7);labelContext.font='17px Arial';labelContext.fillStyle='#4b5354';labelContext.fillText('LOCAL FLIGHT DEMONSTRATOR',30,204);
  const labelMap=new THREE.CanvasTexture(labelCanvas);labelMap.colorSpace=THREE.SRGBColorSpace;
  const stencil=mountOnHull(0,2.035,-1.99);make(new THREE.PlaneGeometry(1.15,.57),new THREE.MeshStandardMaterial({map:labelMap,transparent:true,depthWrite:false,roughness:.8,polygonOffset:true,polygonOffsetFactor:-2}),stencil,[0,0,.03]);
  capsuleNodes.add(stencil);

  const attitudeGlow=new THREE.Group();group.add(attitudeGlow);
  const jetMaterial=new THREE.MeshBasicMaterial({color:'#aacfff',transparent:true,opacity:.28,depthWrite:false});
  const reactionJets=REACTION_JETS.map(spec=>{
    const normal=new THREE.Vector3(...spec.exhaust),position=new THREE.Vector3(...spec.position);
    const pod=new THREE.Group();pod.position.copy(position);pod.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);group.add(pod);
    box(.38,.22,.66,titanium,pod,[0,0,0]);
    const nozzle=make(new THREE.CylinderGeometry(.19,.07,.36,20,1,true),nozzleMaterial,pod,[0,.23,0]);
    nozzle.castShadow=true;
    // A short mount connects each pod to the hull; exhaust cones start at the nozzle mouth.
    const mount=position.clone();mount.x*=.79;mount.y*=.79;pipe([mount.toArray() as [number,number,number],spec.position],.1,steel);
    const geometry=new THREE.ConeGeometry(.21,1.8,12);geometry.translate(0,-.9,0);
    const jet=make(geometry,jetMaterial,attitudeGlow);jet.position.copy(position).addScaledVector(normal,.41);
    jet.name=spec.id;jet.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal.clone().negate());jet.castShadow=false;jet.receiveShadow=false;jet.visible=false;
    return {spec,jet};
  });
  attitudeGlow.visible=false;
  const plume=make(new THREE.ConeGeometry(1.3,7,32,1,true),new THREE.MeshBasicMaterial({color:'#7dbdff',transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}),group,[0,0,11]);plume.rotation.x=-Math.PI/2;plume.visible=false;plume.castShadow=false;plume.receiveShadow=false;
  const updatePropulsion=(state:FlightState,active:boolean)=>{
    const enabled=active&&!state.contact;
    plume.visible=enabled&&state.mainThrust>.001;const length=7*(.35+.65*state.mainThrust);plume.scale.y=length/7;plume.position.z=7.5+length/2;
    attitudeGlow.visible=enabled;
    for(const {spec,jet} of reactionJets){const strength=reactionJetStrength(spec,state.rcsTorque,state.rcsTranslation);jet.visible=enabled&&strength>.005;jet.scale.y=.4+Math.min(2,strength)*.8;}
  };
  const serviceGroup=new THREE.Group();serviceGroup.name='service-module';
  for(const node of [...group.children])if(!capsuleNodes.has(node)&&node!==attitudeGlow)serviceGroup.add(node);
  group.add(serviceGroup);
  const heatShield=make(new THREE.CylinderGeometry(2.32,2.32,.14,64),graphite,group,[0,0,-.32]);heatShield.rotation.x=Math.PI/2;heatShield.name='capsule-heat-shield';
  heatShield.visible=false;
  return {group,plume,attitudeGlow,cockpit,updatePropulsion,serviceGroup,heatShield};
}
