import * as THREE from 'three';
import {solarShadow,inSolarWindow} from '../data/solarEclipse';
import {bodyById} from '../data/catalog';
import type {StateFrame} from '../types';
export function createSolarEclipseScene(scene:THREE.Scene,host:HTMLElement){
 const root=new THREE.Group();root.name='solar-eclipse-reference';root.userData.integrated=true;root.userData.sceneElement='solar-eclipse';root.visible=false;scene.add(root);
 // All three axes use 1000 km per scene unit. This is a reference sphere, not a geographic map.
 const material=new THREE.ShaderMaterial({uniforms:{axisPoint:{value:new THREE.Vector2()},radii:{value:new THREE.Vector2()},slopes:{value:new THREE.Vector2()},sun:{value:new THREE.Vector3(0,0,-1)},axial:{value:0}},vertexShader:`varying vec3 vPoint;varying vec2 vUv;void main(){vUv=uv;vPoint=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
 uniform vec2 axisPoint;uniform vec2 radii;uniform vec2 slopes;uniform vec3 sun;uniform float axial;
 varying vec3 vPoint;varying vec2 vUv;
 void main(){float light=dot(normalize(vPoint),sun);vec3 color=vec3(.12,.39,.53)*(.18+.82*max(light,0.));
 vec2 grid=abs(sin(vUv*vec2(24.,12.)*3.14159265));float lines=1.-smoothstep(.015,.04,min(grid.x,grid.y));color=mix(color,color+vec3(.12,.18,.2),lines*.4);
 float d=length(vPoint.xy-axisPoint);vec2 r=radii+vPoint.z*slopes;
 if(light>0.&&axial+vPoint.z>0.){if(d<r.y)color=mix(color,vec3(.11,.09,.19),.55);if(d<abs(r.x))color=r.x>0.?vec3(.018,.022,.036):vec3(.42,.24,.045);
 float edge=1.-smoothstep(.003,.014,abs(d-abs(r.x)));if(d<r.y)color=mix(color,vec3(1.,.72,.27),edge*.9);}
 gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const earth=new THREE.Mesh(new THREE.SphereGeometry(bodyById.earth.radiusKm/1000,128,96),material);root.add(earth);
 const axisGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,-9),new THREE.Vector3(0,0,9)]);
 const axis=new THREE.Line(axisGeometry,new THREE.LineDashedMaterial({color:'#f0c77d',dashSize:.18,gapSize:.12,transparent:true,opacity:.65}));axis.computeLineDistances();root.add(axis);
 const cone=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(72),3)),new THREE.LineBasicMaterial({color:'#91bfcf',transparent:true,opacity:.22}));root.add(cone);
 const overlay=document.createElement('div');overlay.className='macro-world-labels solar-eclipse-world-labels';host.appendChild(overlay);
 const labels=['地球 · 无地理贴图的参考球面','月影轴 · 光从月球方向射来'].map(text=>{const span=document.createElement('span');span.className='macro-world-label';span.textContent=text;overlay.append(span);return span;});
 let shadowPoint=new THREE.Vector3();
 return {root,update(frame:StateFrame|null,enabled:boolean){const g=enabled&&frame&&inSolarWindow(frame.time)?solarShadow(frame):null;root.visible=!!g;if(!g)return;
  material.uniforms.axisPoint.value.set(g.point[0]/1000,g.point[1]/1000);material.uniforms.radii.value.set(g.umbraKm/1000,g.penumbraKm/1000);material.uniforms.slopes.value.set(g.umbraSlope,g.penumbraSlope);material.uniforms.sun.value.set(...g.sunDirection);material.uniforms.axial.value=g.axialKm/1000;
  axis.position.set(g.point[0]/1000,g.point[1]/1000,0);shadowPoint.set(g.point[0]/1000,g.point[1]/1000+1.2,(g.entryZ??0)/1000-.2);
  const points:THREE.Vector3[]=[];for(let i=0;i<12;i++){const a=i*Math.PI/6;for(const z of [-9,9]){const r=g.penumbraKm/1000+z*g.penumbraSlope;points.push(new THREE.Vector3(axis.position.x+r*Math.cos(a),axis.position.y+r*Math.sin(a),z));}}
  const attr=cone.geometry.getAttribute('position') as THREE.BufferAttribute;points.forEach((p,i)=>attr.setXYZ(i,p.x,p.y,p.z));attr.needsUpdate=true;cone.geometry.computeBoundingSphere();
 },layout(camera:THREE.PerspectiveCamera,width:number,height:number,show:boolean){[new THREE.Vector3(-6.4,-1,0),shadowPoint].forEach((point,i)=>{const label=labels[i];label.style.visibility='hidden';if(!show||!root.visible)return;const p=point.clone().project(camera),x=(p.x+1)*width/2,y=(1-p.y)*height/2;if(p.z<-1||p.z>1||x<0||x>width-150||y<80||y>height-85)return;label.style.transform=`translate(${x}px,${y}px)`;label.style.visibility='visible';});},dispose(){overlay.remove();}};
}
