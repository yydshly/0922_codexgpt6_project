import * as THREE from 'three';
import {lunarShadow,inLunarWindow} from '../data/lunarEclipse';
import type {StateFrame} from '../types';
import {bodyById} from '../data/catalog';
export function createLunarEclipseScene(scene:THREE.Scene,host:HTMLElement){
 const root=new THREE.Group();root.name='lunar-eclipse-reference';root.userData.integrated=true;root.userData.sceneElement='lunar-eclipse';root.visible=false;scene.add(root);
 const boundary=(color:string)=>{const ring=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length:180},(_,i)=>new THREE.Vector3(Math.cos(i*Math.PI/90),Math.sin(i*Math.PI/90),0))),new THREE.LineBasicMaterial({color,transparent:true,opacity:.8}));root.add(ring);return ring;};
 const umbra=boundary('#b492c6'),penumbra=boundary('#91bed0');
 const shade=new THREE.Mesh(new THREE.CircleGeometry(1,100),new THREE.MeshBasicMaterial({color:'#685878',transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false}));shade.position.z=-.03;root.add(shade);
 
 // Main diagram retains transverse km at one scale; z is presentation depth only.
 const material=new THREE.ShaderMaterial({uniforms:{map:{value:null},hasMap:{value:false},umbra:{value:1},penumbra:{value:2}},vertexShader:`varying vec2 vUv;varying vec2 vSection;void main(){vUv=uv;vec4 p=modelMatrix*vec4(position,1.);vSection=p.xy;gl_Position=projectionMatrix*viewMatrix*p;}`,fragmentShader:`uniform sampler2D map;uniform bool hasMap;uniform float umbra;uniform float penumbra;varying vec2 vUv;varying vec2 vSection;void main(){vec3 color=hasMap?texture2D(map,vUv).rgb:vec3(.7);float d=length(vSection);float light=mix(.2,.72,smoothstep(umbra-.04,umbra+.04,d));light=mix(light,1.,smoothstep(umbra,penumbra,d));gl_FragColor=vec4(color*light,1.);\n#include <tonemapping_fragment>
#include <colorspace_fragment>}`,side:THREE.FrontSide});
 let disposed=false;const texture=new THREE.TextureLoader().load(bodyById.moon.texture!,()=>{if(!disposed){material.uniforms.hasMap.value=true;}});texture.colorSpace=THREE.SRGBColorSpace;material.uniforms.map.value=texture;
 const moon=new THREE.Mesh(new THREE.SphereGeometry(bodyById.moon.radiusKm/1000,48,32),material);root.add(moon);
 const cross=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.3,0,.02),new THREE.Vector3(.3,0,.02),new THREE.Vector3(0,-.3,.02),new THREE.Vector3(0,.3,.02)]),new THREE.LineBasicMaterial({color:'#b9cfd8'}));root.add(cross);
 const overlay=document.createElement('div');overlay.className='macro-world-labels eclipse-world-labels';host.appendChild(overlay);
 const labels=['月球','本影边界','半影边界','地球影轴'].map(text=>{const span=document.createElement('span');span.className='macro-world-label';span.textContent=text;overlay.append(span);return span;});
 return {root,moon,update(frame:StateFrame|null,enabled:boolean){const g=enabled&&frame&&inLunarWindow(frame.time)?lunarShadow(frame):null;root.visible=!!g;if(!g)return;
 umbra.scale.setScalar(g.umbraKm/1000);penumbra.scale.setScalar(g.penumbraKm/1000);shade.scale.setScalar(g.umbraKm/1000);moon.position.set(g.point[0]/1000,g.point[1]/1000,0);material.uniforms.umbra.value=g.umbraKm/1000;material.uniforms.penumbra.value=g.penumbraKm/1000;
 },layout(camera:THREE.PerspectiveCamera,width:number,height:number,show:boolean){const positions=[moon.position.clone().add(new THREE.Vector3(2,0,0)),new THREE.Vector3(-umbra.scale.x,1,0),new THREE.Vector3(-penumbra.scale.x,1,0),new THREE.Vector3(.3,.3,0)];labels.forEach((label,i)=>{label.style.visibility='hidden';if(!show||!root.visible)return;const p=positions[i].project(camera),x=(p.x+1)*width/2,y=(1-p.y)*height/2;if(p.z<-1||p.z>1||x<0||x>width-110||y<80||y>height-85)return;label.style.transform=`translate(${x}px,${y}px)`;label.style.visibility='visible';});},dispose(){disposed=true;texture.dispose();overlay.remove();}};
}
