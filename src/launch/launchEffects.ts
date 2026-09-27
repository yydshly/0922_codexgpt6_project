import * as THREE from 'three';
import type { FlightState } from './liftoff';
import type { VehicleConfig } from './vehicle';

/** State-driven illustrative exhaust. No separate animation clock or force is applied. */
export function createLaunchEffects() {
  const root = new THREE.Group(), jets = new THREE.Group(); root.add(jets);
  const white = new THREE.MeshBasicMaterial({ color: '#fff9cd', transparent: true, opacity: .95, depthWrite: false });
  const orange = new THREE.MeshBasicMaterial({ color: '#ff8a21', transparent: true, opacity: .6, depthWrite: false, blending: THREE.AdditiveBlending });
  const flames: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const group = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.ConeGeometry(.85, 1, 20), orange); outer.rotation.z = Math.PI; outer.position.y = -.5;
    const core = new THREE.Mesh(new THREE.ConeGeometry(.44, .7, 20), white); core.rotation.z = Math.PI; core.position.y = -.35;
    group.add(outer, core); flames.push(group); jets.add(group);
  }
  const smokeGeometry = new THREE.BufferGeometry(), smokePositions = new Float32Array(80 * 3), smokeSizes = new Float32Array(80);
  smokeGeometry.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3)); smokeGeometry.setAttribute('diameter', new THREE.BufferAttribute(smokeSizes, 1));
  const smokeMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { viewportHeight: { value: 900 } },
    vertexShader: 'attribute float diameter; uniform float viewportHeight; void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(diameter*viewportHeight*.5*projectionMatrix[1][1]/max(.1,-p.z),1.,256.);}',
    fragmentShader: 'void main(){vec2 p=gl_PointCoord*2.-1.;float r=dot(p,p);if(r>1.)discard;float a=exp(-r*3.)*(1.-smoothstep(.3,1.,r));gl_FragColor=vec4(.78,.76,.7,a*.28);}',
  });
  const smoke = new THREE.Points(smokeGeometry, smokeMaterial);
  smoke.frustumCulled = false; root.add(smoke);
  const glow = new THREE.PointLight('#ffb45c', 0, 65, 2); root.add(glow);
  return { root, update(s: FlightState | null, config: VehicleConfig, viewportHeight = 900) {
    root.visible = !!s && s.throttle > 0; if (!s || !root.visible) return;
    const y = 8.1 + s.heightM, count = config.boosterEngine === 'b-light' ? 2 : 4;
    jets.position.y = y;
    const flicker = 1 + .05 * Math.sin(s.time * 61);
    flames.forEach((f, i) => { f.visible = i < count; f.position.set(count === 2 ? (i === 0 ? -.75 : .75) : (i < 2 ? -.8 : .8), 0, count === 2 ? 0 : (i % 2 ? .8 : -.8)); f.scale.set(1, Math.min(y - 4.2, 18 * s.throttle) * flicker, 1); });
    const age = Math.max(0, s.time + 3), strength = Math.min(1, age / 3) * Math.max(0, 1 - s.heightM / 220);
    smokeMaterial.uniforms.viewportHeight.value = viewportHeight;
    for (let i = 0; i < 80; i++) {
      const u = ((i / 80 + age * .11) % 1), angle = i * 2.39996;
      const radius = 4 + u * Math.min(58, 4 + age * 9);
      smokePositions.set([Math.cos(angle) * radius, 5 + u * 5, Math.sin(angle) * radius], i * 3);
      smokeSizes[i] = (7 + u * 24) * strength;
    }
    smokeGeometry.attributes.position.needsUpdate = true; smokeGeometry.attributes.diameter.needsUpdate = true;
    glow.position.set(0, Math.max(5, y - 3), 0); glow.intensity = 300 * s.throttle;
  } };
}
