import * as THREE from 'three';
import type { FlightState } from './liftoff';

/** Deliberately enlarged emission symbols, not an exhaust-flow solver or a population of tracked debris. */
export function createPassivationEffect() {
  const positions = new Float32Array(240 * 3), geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { intensity: { value: 0 } },
    vertexShader: `#include <common>
      #include <logdepthbuf_pars_vertex>
      void main(){vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;gl_PointSize=4.;
      #include <logdepthbuf_vertex>
      }`,
    fragmentShader: `uniform float intensity;
      #include <common>
      #include <logdepthbuf_pars_fragment>
      void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(.63,.85,.9,intensity*pow(1.-d*2.,1.6));
      #include <logdepthbuf_fragment>
      }`,
  });
  const root = new THREE.Points(geometry, material); root.frustumCulled = false;
  return { root, update(state: FlightState) {
    root.visible = state.phase === 'deorbit-passivating';
    if (!root.visible) return;
    const t = state.deployment!.deorbit!.passivationElapsedS;
    material.uniforms.intensity.value = Math.max(.12, Math.exp(-t / 40));
    for (let i = 0; i < 240; i++) { const u = (t * .5 + i * .137) % 1, a = i * 2.39996, radius = u * 3 * ((i % 13) / 13); positions.set([(i % 2 ? 1 : -1) * (2 + u * 17), 43 + Math.cos(a) * radius, Math.sin(a) * radius], i * 3); }
    geometry.attributes.position.needsUpdate = true;
  } };
}
