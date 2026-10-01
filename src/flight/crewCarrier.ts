import * as THREE from 'three';
import {createLaunchVehicle} from '../launch/vehicleModel';
import type {CrewSnapshot} from './crewMission';
import {CREW_CARRIER_GEOMETRY,CREW_CARRIER_AXIAL_SCALE} from './crewCarrierGeometry';
export {CREW_CARRIER_GEOMETRY} from './crewCarrierGeometry';

/** Adapt shared authored rocket stages from +Y nose to the crew ship's −Z nose. */
const axialScale=CREW_CARRIER_AXIAL_SCALE;
export function createCrewCarrier(){
  const root=new THREE.Group();root.name='crewed shared launch vehicle';
  const template=createLaunchVehicle(),g=CREW_CARRIER_GEOMETRY,radial=g.radiusM/1.85;
  // Keep unused shared resources in the hidden tree so the scene's normal disposal owns them.
  template.root.visible=false;root.add(template.root);
  const stage=(name:'booster'|'upper',scaleY:number,offsetZ:number)=>{
    const group=new THREE.Group();group.name=`crewed ${name} axis adapter`;group.rotation.x=-Math.PI/2;group.scale.set(radial,scaleY,radial);group.position.z=offsetZ;
    group.add(template.root.getObjectByName(name)!);root.add(group);return group;
  };
  // Both stages must share the SAME axial transform: the vacuum bell nests inside the interstage.
  const booster=stage('booster',axialScale,g.boosterExitZ),upper=stage('upper',axialScale,g.boosterExitZ);
  const adapter=new THREE.Group();root.add(adapter);
  const metal=new THREE.MeshStandardMaterial({color:'#d3dcda',roughness:.48,metalness:.3});
  const collar=new THREE.Mesh(new THREE.LatheGeometry([[1.85,4.1],[1.85,4.45],[3.1,11.2],[3.1,11.6]].map(([r,z])=>new THREE.Vector2(r,z)),64),metal);
  collar.rotation.x=Math.PI/2;collar.castShadow=collar.receiveShadow=true;adapter.add(collar);
  for(const z of [4.18,11.48]){const ring=new THREE.Mesh(new THREE.TorusGeometry(z<5?1.86:3.12,.055,8,64),new THREE.MeshStandardMaterial({color:'#576f7a',metalness:.65,roughness:.35}));ring.position.z=z;ring.castShadow=true;adapter.add(ring);}
  const shader=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    uniforms:{power:{value:0},time:{value:0}},vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 uv0;uniform float power;uniform float time;void main(){float tip=smoothstep(0.,.5,uv0.y);float edge=pow(sin(uv0.x*3.14159),.7);float flicker=.85+.15*sin(uv0.y*55.-time*25.);gl_FragColor=vec4(mix(vec3(1.,.32,.08),vec3(1.,.94,.7),uv0.y),power*tip*edge*flicker*.6);}' });
  const jets=new THREE.Group(),upperJets=new THREE.Group();root.add(jets,upperJets);
  const plume=(parent:THREE.Group,x:number,y:number,z:number,r:number,length:number)=>{
    const mesh=new THREE.Mesh(new THREE.ConeGeometry(r,length,32,1,true).translate(0,-length/2,0),shader);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);parent.add(mesh);
  };
  for(const x of [-.8,.8])for(const y of [-.8,.8])plume(jets,x*radial,y*radial,g.boosterExitZ,1.15,24);
  const vacuumShader=shader.clone();vacuumShader.uniforms=THREE.UniformsUtils.clone(shader.uniforms);
  plume(upperJets,0,0,g.upperExitZ,2.2,20);(upperJets.children[0] as THREE.Mesh).material=vacuumShader;
  const update=(s:Pick<CrewSnapshot,'phase'|'thrust'|'time'|'carrierStage'>)=>{
    const launching=s.carrierStage!=='none';
    root.visible=launching;booster.visible=s.carrierStage==='booster';upper.visible=adapter.visible=launching;
    const force=s.phase==='failed'?0:new THREE.Vector3(...s.thrust).length();jets.visible=booster.visible&&force>100;upperJets.visible=s.carrierStage==='upper'&&force>100;
    shader.uniforms.power.value=Math.min(1,force/3600000);shader.uniforms.time.value=s.time;
    vacuumShader.uniforms.power.value=Math.min(1,force/480000);vacuumShader.uniforms.time.value=s.time;
  };
  update({phase:'ground',carrierStage:'booster',thrust:[0,0,0],time:-10});return {root,booster,upper,jets,upperJets,update};
}
