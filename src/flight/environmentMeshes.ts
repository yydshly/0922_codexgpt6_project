import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { publicAsset } from '../data/publicAsset';
import { createEarthAtmosphere, createEarthClouds } from '../components/earthEffects';
import type { EnvironmentId, Obstacle } from './flightPractice';

const alloy = () => new THREE.MeshStandardMaterial({ color: '#dadfdc', roughness: .38, metalness: .4 });
const gold = () => new THREE.MeshStandardMaterial({ color: '#b79745', roughness: .53, metalness: .5 });
const dark = () => new THREE.MeshStandardMaterial({ color: '#182633', roughness: .46, metalness: .55 });
function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, position: [number,number,number] = [0,0,0]) {
  const object = new THREE.Mesh(geometry, material); object.position.set(...position); object.castShadow = true; object.receiveShadow = true; parent.add(object); return object;
}
function barrel(parent: THREE.Object3D, radius: number, length: number, z: number, material: THREE.Material) {
  const object = mesh(parent, new THREE.CylinderGeometry(radius, radius, length, 48), material, [0,0,z]); object.rotation.x = Math.PI / 2; return object;
}
function ring(parent: THREE.Object3D, radius: number, z: number, material: THREE.Material) { return mesh(parent, new THREE.TorusGeometry(radius,.065,8,64),material,[0,0,z]); }
function panels(parent: THREE.Object3D, z: number, span: number) {
  const cellMaterial = new THREE.MeshStandardMaterial({ color: '#163d68', metalness: .48, roughness: .3 });
  const frameMaterial = alloy();
  for (const side of [-1,1]) {
    mesh(parent,new THREE.BoxGeometry(span+2,.12,.14),frameMaterial,[side*(span/2+2),0,z]);
    const wing = new THREE.Group(); wing.position.set(side*(span/2+3),0,z); parent.add(wing);
    mesh(wing,new THREE.BoxGeometry(span,.12,5.4),frameMaterial);
    const cells = new THREE.InstancedMesh(new THREE.BoxGeometry((span-.3)/8,.04,.59),cellMaterial,64);
    const matrix = new THREE.Matrix4(); let i=0;
    for(let x=0;x<8;x++)for(let y=0;y<8;y++){matrix.makeTranslation(-span/2+.2+(x+.5)*(span-.4)/8,.085,-2.5+(y+.5)*.62);cells.setMatrixAt(i++,matrix);}
    cells.castShadow=true;cells.receiveShadow=true;wing.add(cells);
  }
}

export function satellite() {
  const group=new THREE.Group(), thermal=gold(), frame=alloy(), black=dark();
  mesh(group,new THREE.BoxGeometry(3,3.5,3),thermal);panels(group,0,5);
  mesh(group,new THREE.BoxGeometry(2.1,2.1,.18),frame,[0,0,1.55]);
  const dish=mesh(group,new THREE.SphereGeometry(1.1,24,16,0,Math.PI*2,0,.8),frame,[0,2,0]);dish.rotation.x=.5;
  const lens=mesh(group,new THREE.CylinderGeometry(.55,.65,1.1,24),black,[0,0,-2]);lens.rotation.x=Math.PI/2;
  return group;
}

export function asteroid(radius: number, seed: number, texture: THREE.Texture) {
  const source=new THREE.IcosahedronGeometry(radius,radius>20?24:12);
  source.deleteAttribute('normal');source.deleteAttribute('uv');
  const geometry=mergeVertices(source,1e-5), position=geometry.getAttribute('position');source.dispose();
  const colors:number[]=[], color=new THREE.Color();
  for(let i=0;i<position.count;i++) {
    const direction=new THREE.Vector3().fromBufferAttribute(position,i).normalize();
    const n=.09*Math.sin(direction.x*8+seed)*Math.cos(direction.y*9+seed)+.055*Math.sin(direction.z*19+direction.x*12)+.018*Math.sin(direction.y*57+direction.z*38);
    const r=radius*(1+n), craterDir=new THREE.Vector3(.3,.4,1).normalize();
    const crater=.11*Math.exp(-Math.pow(direction.distanceTo(craterDir)/.22,2));
    position.setXYZ(i,direction.x*r*1.14,direction.y*r*.81,direction.z*r*(1-crater));
    color.setHSL(.095,.1,.36+n*.7);colors.push(color.r,color.g,color.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  // Explicit spherical UVs let the existing sourced lunar texture add detail to a synthetic rock.
  const uv:number[]=[];for(let i=0;i<position.count;i++){const v=new THREE.Vector3().fromBufferAttribute(position,i).normalize();uv.push(.5+Math.atan2(v.z,v.x)/(2*Math.PI),.5-Math.asin(v.y)/Math.PI);}
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  return new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:texture,vertexColors:true,roughness:.96,bumpMap:texture,bumpScale:radius*.004}));
}

export function makeEnvironment(id: EnvironmentId, scene: THREE.Scene, sun: THREE.Vector3, onTexture: (ok: boolean) => void) {
  const root=new THREE.Group();scene.add(root);
  let disposed=false;
  const textureSet=new Set<THREE.Texture>();
  const loader=new THREE.TextureLoader();
  const load=(name:string)=>{
    const texture=loader.load(publicAsset(`/textures/${name}`),t=>{if(disposed)t.dispose();else onTexture(true);},undefined,()=>{if(!disposed)onTexture(false);});
    texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;textureSet.add(texture);return texture;
  };
  const rotators:{node:THREE.Object3D;rate:number}[]=[];
  const obstacles:Obstacle[]=[];
  const objects:{name:string;node:THREE.Object3D;description:string}[]=[];
  let target: THREE.Object3D, targetRadius: number;
  let clouds: THREE.Object3D|undefined, atmosphere: THREE.Object3D|undefined;
  if(id==='earth') {
    const earth=new THREE.Group();earth.position.set(0,-6771000,-300000);earth.rotation.set(1,2.7,0);earth.scale.setScalar(6371000);root.add(earth);
    const globe=mesh(earth,new THREE.SphereGeometry(1,128,80),new THREE.MeshStandardMaterial({map:load('earth-day-8k.jpg'),roughness:.93,metalness:0}));globe.castShadow=false;
    const cloud=createEarthClouds(loader,status=>onTexture(status==='ready')), air=createEarthAtmosphere();
    cloud.material.uniforms.sunDirection.value.copy(sun);air.material.uniforms.sunDirection.value.copy(sun);earth.add(cloud,air);clouds=cloud;atmosphere=air;
    target=satellite();target.position.set(0,0,-125);root.add(target);targetRadius=10;
    objects.push({name:'教学卫星',node:target,description:'三维太阳能板、载荷和天线；位置为局部练习设定。'});
    const stage=new THREE.Group();barrel(stage,2,10,0,alloy());barrel(stage,1.5,2,6,gold());ring(stage,2.04,-5,dark());
    stage.position.set(57,12,-105);stage.rotation.set(.3,.4,1.3);root.add(stage);rotators.push({node:stage,rate:.025});
    obstacles.push({position:stage.position,radius:7,name:'废弃级段'});objects.push({name:'废弃级段 · 演练',node:stage,description:'合成目标，轻微翻滚；未使用实测轨道。'});
  } else if(id==='moon') {
    const planet=mesh(root,new THREE.SphereGeometry(1737400,128,80),new THREE.MeshStandardMaterial({map:load('moon.jpg'),roughness:1}),[-1000000,-700000,-6500000]);planet.rotation.y=2.3;planet.castShadow=false;
    target=satellite();target.scale.setScalar(.8);target.position.set(0,2,-105);root.add(target);targetRadius=8;
    objects.push({name:'教学探测器',node:target,description:'局部接近目标；月球背景不代表已完成地月转移。'});
  } else {
    const rockTexture=load('moon.jpg');target=asteroid(47,1,rockTexture);target.position.set(0,0,-190);root.add(target);targetRadius=65;
    rotators.push({node:target,rate:.018});objects.push({name:'合成小天体',node:target,description:'不规则三维岩体，表面为既有月面纹理的教学复用，不是实测形状。'});
    for(const [i,p] of [[-95,27,-240],[88,-25,-280],[-40,-60,-160]].entries()){
      const rock=asteroid(4+i*2,i+3,rockTexture);rock.position.set(...p as [number,number,number]);root.add(rock);rotators.push({node:rock,rate:.027});
      obstacles.push({position:rock.position,radius:10,name:'练习岩块'});
    }
  }
  obstacles.push({position:target.position,radius:targetRadius,name:objects[0].name});
  // Fixed-seed sky: distant stars do not scroll past like nearby particles.
  let seed=173;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const starPositions:number[]=[], starColors:number[]=[];
  for(let i=0;i<1400;i++){const z=random()*2-1,a=random()*Math.PI*2,r=Math.sqrt(1-z*z);starPositions.push(r*Math.cos(a)*8e7,z*8e7,r*Math.sin(a)*8e7);const b=.35+random()*.6;starColors.push(b*.9,b*.95,b);}
  const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));starGeometry.setAttribute('color',new THREE.Float32BufferAttribute(starColors,3));
  const stars=new THREE.Points(starGeometry,new THREE.PointsMaterial({size:1.2,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:.7,depthWrite:false}));root.add(stars);
  return {root,target,targetRadius,objects,obstacles,clouds,atmosphere,stars,
    update:(dt:number)=>{for(const {node,rate} of rotators)node.rotation.y+=rate*dt;},
    dispose:()=>{disposed=true;for(const texture of textureSet)texture.dispose();}
  };
}

export function disposeEnvironmentScene(scene: THREE.Scene) {
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  scene.traverse(node=>{
    if(node instanceof THREE.Mesh || node instanceof THREE.Points || node instanceof THREE.Line) {
      geometries.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:[node.material])materials.add(material);
    }
  });
  for(const material of materials){
    material.userData.disposed=true;
    for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);
    if(material instanceof THREE.ShaderMaterial)for(const uniform of Object.values(material.uniforms))if(uniform.value instanceof THREE.Texture)textures.add(uniform.value);
    material.dispose();
  }
  for(const geometry of geometries)geometry.dispose();for(const texture of textures)texture.dispose();
}
