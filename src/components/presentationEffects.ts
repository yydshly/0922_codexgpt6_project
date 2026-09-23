import * as THREE from 'three';

/** Display-only depth cues; never feeds scientific state or measurements. */
export function createOrbitMaterial(color: string) {
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: .3, depthWrite: false });
  const depth = { value: 50 }, enhanced = { value: 0 };
  material.userData.presentationDepth = depth;
  material.userData.presentationEnhanced = enhanced;
  material.onBeforeCompile = shader => {
    shader.uniforms.uOrbitDepth = depth;
    shader.uniforms.uOrbitEnhanced = enhanced;
    shader.vertexShader = 'varying float vOrbitEyeDepth;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvOrbitEyeDepth = -mvPosition.z;');
    shader.fragmentShader = 'varying float vOrbitEyeDepth; uniform float uOrbitDepth; uniform float uOrbitEnhanced;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float front = 1.0 - smoothstep(uOrbitDepth * .65, uOrbitDepth * 1.25, vOrbitEyeDepth);
      diffuseColor.a *= mix(1.0, .2 + .8 * front, uOrbitEnhanced);`);
  };
  material.customProgramCacheKey = () => 'orbit-depth-cue-v1';
  return material;
}

export function updateOrbitMaterial(material: THREE.LineBasicMaterial, distance: number, enhanced: boolean) {
  material.userData.presentationDepth.value = distance;
  material.userData.presentationEnhanced.value = enhanced ? 1 : 0;
}

/** A soft optical halo, sized in solar radii; hidden in physical presentation. */
export function createSolarHalo() {
  const material = new THREE.ShaderMaterial({
    vertexShader: `#include <common>
      #include <logdepthbuf_pars_vertex>
      varying vec2 vUv; void main(){vUv=uv;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
      #include <logdepthbuf_vertex>
    }`,
    fragmentShader: `#include <common>
      #include <logdepthbuf_pars_fragment>
      varying vec2 vUv; void main(){
      #include <logdepthbuf_fragment>
      float r=length(vUv-.5)*2.;
      float glow=exp(-r*r*7.)*(1.-smoothstep(.65,1.,r));
      vec3 color=mix(vec3(1.,.16,.025),vec3(1.,.68,.22),exp(-r*4.));
      gl_FragColor=vec4(color,glow*.22);
      #include <colorspace_fragment>
    }`, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true,
    toneMapped: false,
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  halo.name = 'Illustrative solar optical glow';
  halo.renderOrder = 1;
  return halo;
}
