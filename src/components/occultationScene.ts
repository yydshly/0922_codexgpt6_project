import * as THREE from 'three';
import report from '../../public/data/events/io-occultation-2026-01-12.json';
import {sampleOccultation,occultationSpatial,type OccultationView} from '../data/occultation';
import {bodyById} from '../data/catalog';
import {satelliteById} from '../data/satellites';
/** Dual view: true 3D sphere meshes in km, or fixed observer discs in arcseconds. */
export function createOccultationScene(scene:THREE.Scene,host:HTMLElement){
 const root=new THREE.Group();root.name='io-occultation-reference';root.userData.integrated=true;root.userData.sceneElement='io-occultation';root.visible=false;scene.add(root);
 let disposed=false;
 const texture=new THREE.TextureLoader().load(bodyById.jupiter.texture!,()=>{if(!disposed)jupiter.material.uniforms.hasMap.value=true;});texture.colorSpace=THREE.SRGBColorSpace;
 const disc=(color:string,textured=false)=>{const material=new THREE.ShaderMaterial({uniforms:{map:{value:texture},hasMap:{value:false},textured:{value:textured},base:{value:new THREE.Color(color)}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D map;uniform bool hasMap;uniform bool textured;uniform vec3 base;varying vec2 vUv;void main(){vec2 q=(vUv-.5)*2.;float r=dot(q,q);if(r>1.)discard;float z=sqrt(1.-r);vec2 uv=vec2(.5+atan(q.x,z)/6.2831853,.5+asin(q.y)/3.14159265);vec3 color=textured&&hasMap?texture2D(map,uv).rgb:base;gl_FragColor=vec4(color*(.5+.5*z),1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`,depthTest:false,depthWrite:false});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);root.add(mesh);return mesh;};
 const jupiter=disc('#d7b799',true),io=disc('#e6bf78');jupiter.renderOrder=3;io.renderOrder=2;
 const space=new THREE.Group();root.add(space);const anchor=new THREE.Vector3();let view:OccultationView='earth';
 const spatialJupiter=new THREE.Mesh(new THREE.SphereGeometry(bodyById.jupiter.radiusKm/100000,64,48),new THREE.MeshStandardMaterial({map:texture,roughness:1}));
 const spatialIo=new THREE.Mesh(new THREE.SphereGeometry(satelliteById.io.radiusKm/100000,32,24),new THREE.MeshStandardMaterial({color:'#e6bf78',roughness:1}));space.add(spatialJupiter,spatialIo);
 // Local teaching lighting, not a reconstruction of eclipse photometry.
 const fill=new THREE.HemisphereLight('#daeaff','#4c3f37',2),key=new THREE.DirectionalLight('#fff2d5',3);key.position.set(3,4,5);space.add(fill,key);
 const earthArrow=new THREE.ArrowHelper(new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,.8),1.5,0x93d8e2,.15,.09);space.add(earthArrow);
 const sight=new THREE.Line(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3)),new THREE.LineDashedMaterial({color:'#9bafb7',dashSize:.08,gapSize:.07,transparent:true,opacity:.5}));space.add(sight);
 const overlay=document.createElement('div');overlay.className='macro-world-labels occultation-world-labels';host.appendChild(overlay);
 const labels=['木星 · 前景遮挡体','木卫一 · 位置标记非可见性','地球方向 · 地球在远处'].map(text=>{const span=document.createElement('span');span.className='macro-world-label';span.textContent=text;overlay.append(span);return span;});
 return {root,anchor,update(time:number|null,enabled:boolean,nextView:OccultationView){view=nextView;const p=enabled&&time!==null?sampleOccultation(report.points,time):null;root.visible=!!p;space.visible=view==='space';jupiter.visible=io.visible=view==='earth';if(!p){anchor.set(0,0,0);return;}
 jupiter.scale.setScalar(p.jupiterRadius);io.scale.setScalar(p.ioRadius);io.position.set(-p.x,p.y,0);io.renderOrder=p.depthKm>0?2:4;
 spatialIo.position.fromArray(occultationSpatial(p)).multiplyScalar(1/100000);anchor.copy(view==='space'?spatialIo.position:new THREE.Vector3()).multiplyScalar(.5);
 const observer=new THREE.Vector3(0,0,(p.observerDistanceKm-p.depthKm)/100000),towardEarth=observer.sub(spatialIo.position).normalize();const attr=sight.geometry.getAttribute('position') as THREE.BufferAttribute;attr.setXYZ(0,...spatialIo.position.toArray());const end=spatialIo.position.clone().addScaledVector(towardEarth,6);attr.setXYZ(1,...end.toArray());attr.needsUpdate=true;sight.geometry.computeBoundingSphere();sight.computeLineDistances();
 labels[0].textContent=view==='space'?'木星 · 真实半径比例':'木星 · 前景遮挡体';labels[1].textContent=view==='space'?'木卫一 · 真实间距比例':'木卫一 · 位置标记非可见性';
 },layout(camera:THREE.PerspectiveCamera,width:number,height:number,show:boolean){labels.forEach(label=>label.style.visibility='hidden');const positions=view==='space'?[new THREE.Vector3(-.7,.85,0),spatialIo.position.clone().add(new THREE.Vector3(0,.12,0)),new THREE.Vector3(0,.1,2.3)]:[new THREE.Vector3(-jupiter.scale.x,jupiter.scale.y+4,0),io.position.clone().add(new THREE.Vector3(0,5,0))];positions.forEach((point,i)=>{const label=labels[i];label.style.visibility='hidden';if(!show||!root.visible)return;const p=point.project(camera),x=(p.x+1)*width/2,y=(1-p.y)*height/2;if(p.z<-1||p.z>1||x<0||x>width-170||y<80||y>height-85)return;label.style.transform=`translate(${x}px,${y}px)`;label.style.visibility='visible';});},dispose(){disposed=true;texture.dispose();overlay.remove();}};
}
