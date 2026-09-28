import * as THREE from 'three';
import type { FlightState } from './liftoff';
import type { VehicleConfig } from './vehicle';
import { createVehicleExhaust } from './rocketPlume';
import { flightEnvironmentReading } from './flightPhenomena';
import { groundCloudPuff, groundCloudTiming } from './groundCloud';

/** State-driven illustrative exhaust. No separate animation clock or force is applied. */
export function createLaunchEffects() {
  const root = new THREE.Group(), jets = createVehicleExhaust(); root.add(jets.root);
  const smokeGeometry = new THREE.BufferGeometry(), smokePositions = new Float32Array(80 * 3), smokeSizes = new Float32Array(80), smokeOpacity = new Float32Array(80);
  smokeGeometry.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3)); smokeGeometry.setAttribute('diameter', new THREE.BufferAttribute(smokeSizes, 1));
  smokeGeometry.setAttribute('visibility', new THREE.BufferAttribute(smokeOpacity, 1));
  const smokeMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { viewportHeight: { value: 900 } },
    vertexShader: `attribute float diameter; attribute float visibility; varying float vVisibility; uniform float viewportHeight;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main(){vVisibility=visibility;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;gl_PointSize=clamp(diameter*viewportHeight*.5*projectionMatrix[1][1]/max(.1,-mvPosition.z),1.,256.);
      #include <logdepthbuf_vertex>
      }`,
    fragmentShader: `varying float vVisibility;
      #include <common>
      #include <logdepthbuf_pars_fragment>
      void main(){vec2 p=gl_PointCoord*2.-1.;float r=dot(p,p);if(r>1.)discard;float a=exp(-r*3.)*(1.-smoothstep(.3,1.,r));gl_FragColor=vec4(.78,.79,.78,a*.36*vVisibility);
      #include <logdepthbuf_fragment>
      }`,
  });
  const smoke = new THREE.Points(smokeGeometry, smokeMaterial);
  smoke.frustumCulled = false; root.add(smoke);
  const glow = new THREE.PointLight('#ffb45c', 0, 65, 2); root.add(glow);
  return { root, update(s: FlightState | null, config: VehicleConfig, viewportHeight = 900, groundOnly = false) {
    const timing = groundCloudTiming(s);
    root.visible = !!s && (s.thrustN > 0 && !groundOnly || timing.ageS >= 0 && timing.ageS < 73); if (!s || !root.visible) return;
    const y = 8.1 + s.heightM;
    jets.update(s.time, flightEnvironmentReading(s).pressurePa, groundOnly || s.thrustN <= 0 ? 0 : s.throttle, 0, config.boosterEngine, Math.max(0, y - 4.2));
    jets.root.position.y = y;
    smokeMaterial.uniforms.viewportHeight.value = viewportHeight;
    for (let i = 0; i < 80; i++) {
      const puff = groundCloudPuff(timing.ageS, timing.emissionS, i), angle = i * 2.39996;
      smokePositions.set([Math.cos(angle) * puff.radius, puff.height, Math.sin(angle) * puff.radius], i * 3);
      smokeSizes[i] = puff.diameter; smokeOpacity[i] = puff.opacity;
    }
    smokeGeometry.attributes.position.needsUpdate = smokeGeometry.attributes.diameter.needsUpdate = smokeGeometry.attributes.visibility.needsUpdate = true;
    glow.position.set(0, Math.max(5, y - 3), 0); glow.intensity = groundOnly ? 0 : 300 * s.throttle;
  } };
}
