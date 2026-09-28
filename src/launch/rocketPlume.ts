import * as THREE from 'three';
import { plumeAppearance } from './flightPhenomena';

/** Soft axisymmetric plume, driven only by the mission clock. Geometry is illustrative. */
export function createRocketPlume() {
  const root = new THREE.Group();
  // Radius is deformed below. The nozzle is y=0; exhaust extends along local -Y.
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 40, 32, true);
  geometry.translate(0, -.5, 0);
  const material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { clock: { value: 0 }, spread: { value: 0 }, strength: { value: 0 }, nozzle: { value: 1 }, coreLevel: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying vec3 vEye; varying vec3 vNormal;
      uniform float spread; uniform float nozzle;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main(){vUv=uv; vec3 p=position; float t=clamp(-p.y,0.,1.);
        float width=nozzle+(1.2+spread*9.)*pow(t,.7);
        p.xz*=width; vec4 mvPosition=modelViewMatrix*vec4(p,1.);vEye=-mvPosition.xyz;vNormal=normalize(normalMatrix*normal);
        gl_Position=projectionMatrix*mvPosition;
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader: `uniform float clock; uniform float spread; uniform float strength; uniform float coreLevel;
      varying vec2 vUv; varying vec3 vEye; varying vec3 vNormal;
      #include <common>
      #include <logdepthbuf_pars_fragment>
      void main(){float t=1.-vUv.y;
        float waves=.8+.12*sin(t*43.-clock*24.)+.08*sin(vUv.x*50.+t*19.-clock*8.);
        float facing=pow(abs(dot(normalize(vNormal),normalize(vEye))),.8);
        float alpha=strength*pow(1.-t,1.7)*waves*facing;
        vec3 color=mix(vec3(1.,.88,.55),vec3(.93,.28,.065),smoothstep(.03,.72,t));
        color=mix(color,vec3(.38,.56,.95),spread*.32*t); color=mix(color,vec3(1.,.93,.72),coreLevel);
        gl_FragColor=vec4(color,alpha);
        #include <logdepthbuf_fragment>
      }`,
  });
  const plume = new THREE.Mesh(geometry, material); plume.frustumCulled = false; root.add(plume);
  const coreMaterial = material.clone(); coreMaterial.uniforms.coreLevel.value = 1;
  const core = new THREE.Mesh(geometry, coreMaterial); core.scale.set(.32, .52, .32); core.frustumCulled = false; root.add(core);
  return { root, update(time: number, pressurePa: number, throttle: number, stage: 0 | 1, maxLength = Infinity, readableLowThrust = false) {
    const p = plumeAppearance(pressurePa, throttle, stage);
    // P1's instructional 2% burn needs a visible cue; never feed this display gain into dynamics.
    const gain = readableLowThrust ? Math.min(1, Math.max(0, throttle) / .02) : 0;
    const opacity = Math.max(p.opacity, .26 * Math.sqrt(gain));
    root.visible = throttle > 0 && maxLength > 0;
    root.scale.set(1, Math.min(maxLength, Math.max(p.lengthM, 8 * Math.sqrt(gain))), 1);
    material.uniforms.clock.value = time; material.uniforms.spread.value = p.rarefaction;
    material.uniforms.strength.value = opacity; material.uniforms.nozzle.value = stage === 0 ? 1.3 : 1;
    coreMaterial.uniforms.clock.value = time; coreMaterial.uniforms.spread.value = p.rarefaction;
    coreMaterial.uniforms.strength.value = opacity * 1.2; coreMaterial.uniforms.nozzle.value = material.uniforms.nozzle.value;
    return p;
  } };
}

/** Both launch-pad and ascent views use the same engine count, nozzle spacing and plume scales. */
export function createVehicleExhaust() {
  const root = new THREE.Group(), plumes = Array.from({ length: 4 }, () => createRocketPlume());
  for (const plume of plumes) root.add(plume.root);
  return { root, update(time: number, pressurePa: number, throttle: number, stage: 0 | 1, boosterEngine: string, maxLength = Infinity, readableLowThrust = false) {
    const count = stage === 1 ? 1 : boosterEngine === 'b-light' ? 2 : 4;
    root.position.y = stage === 1 ? 33.7 : 0;
    plumes.forEach((p, i) => {
      p.update(time, pressurePa, throttle, stage, maxLength, readableLowThrust);
      p.root.visible = i < count && throttle > 0 && maxLength > 0;
      p.root.position.set(stage === 1 ? 0 : count === 2 ? (i === 0 ? -.75 : .75) : (i < 2 ? -.8 : .8), 0, stage === 1 || count === 2 ? 0 : (i % 2 ? .8 : -.8));
      p.root.scale.x = p.root.scale.z = stage === 1 ? .85 : .55;
    });
    root.visible = throttle > 0 && maxLength > 0;
  } };
}
