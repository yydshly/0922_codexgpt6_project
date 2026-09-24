import * as THREE from 'three';
import {NEAR_EARTH_LAYERS,NEAR_EARTH_SHAPES,nearEarthPoint,type NearEarthLayer} from '../data/nearEarth';
/** Translucent volumes and dots illustrate populations, never solid rings or measured flux. */
export function makeNearEarthRegion(id:NearEarthLayer){
 const shape=NEAR_EARTH_SHAPES[id],color=NEAR_EARTH_LAYERS.find(layer=>layer.id===id)!.color,group=new THREE.Group();
 const cutaway={value:true};group.userData.cutaway=cutaway;
 const makeMaterial=(dots:boolean)=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{cutaway,shade:{value:new THREE.Color(color)}},vertexShader:`varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);${dots?'gl_PointSize=2.8;':''}}`,fragmentShader:`uniform bool cutaway;uniform vec3 shade;varying vec3 p;void main(){if(cutaway&&p.x>0.&&p.z>0.)discard;${dots?'float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(shade,.65*(1.-d*2.));':'gl_FragColor=vec4(shade,.055);'}}`});
 const volume=new THREE.TorusGeometry(shape.major,shape.minor,24,96);volume.rotateX(Math.PI/2);volume.scale(1,shape.height,1);group.add(new THREE.Mesh(volume,makeMaterial(false)));
 const geometry=new THREE.BufferGeometry(),positions=new Float32Array(shape.count*3);for(let i=0;i<shape.count;i++)positions.set(nearEarthPoint(id,i),i*3);geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));group.add(new THREE.Points(geometry,makeMaterial(true)));
 return group;
}
