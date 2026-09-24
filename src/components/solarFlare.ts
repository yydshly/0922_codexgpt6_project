import * as THREE from 'three';

/** A soft emissive patch on the displayed solar surface, not an orbiting object. */
export function createSolarFlare(radius:number, direction:THREE.Vector3) {
 const material=new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  uniforms:{intensity:{value:0}},
  vertexShader:'varying vec2 patchUv;void main(){patchUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec2 patchUv;uniform float intensity;void main(){float soft=smoothstep(0.,.85,patchUv.y);gl_FragColor=vec4(1.,.64,.24,soft*intensity*.65);}',
 });
 const patch=new THREE.Mesh(new THREE.SphereGeometry(radius*1.003,48,24,0,Math.PI*2,0,.23),material);
 patch.name='solar-flare-surface';
 patch.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());
 return {patch,update(intensity:number){patch.visible=intensity>0;material.uniforms.intensity.value=intensity;}};
}
