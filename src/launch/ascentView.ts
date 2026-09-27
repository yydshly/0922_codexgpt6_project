import * as THREE from 'three';
import { bodyById } from '../data/catalog';
import { LAUNCH_EARTH, LAUNCH_MISSION } from '../data/launchMission';
import { makePlanetMaterial } from '../components/celestialMaterials';
import { createEarthEffects } from '../components/earthEffects';
import type { PanoramaTextureLoader } from '../components/PanoramaTextureLoader';
import { baseBasis, fixedToLocal } from './coordinates';
import { createLaunchSatellite, createLaunchVehicle } from './vehicleModel';
import { DEPLOYMENT } from './deployment';
import type { FlightState } from './liftoff';
import type { VehicleConfig } from './vehicle';
import { createAscentEnvironmentView } from './ascentEnvironmentView';
import type { EnvironmentOptions, SpaceObjectKind } from './flightEnvironment';
import { cross, sampleOrbit } from './orbitInsertion';
import { add, rotateEarth, scale } from './ascent';

/** A moving render origin at the vehicle, in metres; it never modifies the integrated state. */
export function createAscentView(loader: PanoramaTextureLoader) {
  const root = new THREE.Group(), planet = new THREE.Group(), vehicle = createLaunchVehicle(), booster = createLaunchVehicle();
  root.add(planet, vehicle.root, booster.root);
  const satellite = createLaunchSatellite(); root.add(satellite.root); satellite.root.visible = false;
  const environment = createAscentEnvironmentView(); root.add(environment.root);
  const basis = baseBasis(), localDirection = (v: THREE.Vector3) => new THREE.Vector3(v.dot(basis.east), v.dot(basis.up), v.dot(basis.south));
  planet.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(localDirection(new THREE.Vector3(1, 0, 0)), localDirection(new THREE.Vector3(0, 0, 1)), localDirection(new THREE.Vector3(0, -1, 0))));
  const R = LAUNCH_EARTH.semiMajorM, f = 1 / LAUNCH_EARTH.inverseFlattening, e2 = f * (2 - f);
  planet.scale.setScalar(R);
  const geometry = new THREE.SphereGeometry(1, 256, 160), positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) { const y = positions.getY(i), n = 1 / Math.sqrt(1 - e2 * y * y); positions.setXYZ(i, positions.getX(i) * n, y * n * (1 - e2), positions.getZ(i) * n); }
  geometry.computeVertexNormals();
  const surface = makePlanetMaterial(bodyById.earth, loader); surface.uniforms.presentationLight.value = .2;
  planet.add(new THREE.Mesh(geometry, surface));
  const earthEffects = createEarthEffects(loader); for (const m of [earthEffects.clouds, earthEffects.atmosphere]) { m.scale.y = 1 - f; planet.add(m); }
  earthEffects.clouds.material.uniforms.layerOpacity = { value: 0 }; earthEffects.atmosphere.material.uniforms.layerOpacity = { value: 0 };
  earthEffects.clouds.material.fragmentShader = 'uniform float layerOpacity;\n' + earthEffects.clouds.material.fragmentShader.replace('coverage * .94', 'coverage * .94 * layerOpacity');
  earthEffects.atmosphere.material.fragmentShader = 'uniform float layerOpacity;\n' + earthEffects.atmosphere.material.fragmentShader.replace('clamp(opacity, 0.0, .48)', 'clamp(opacity, 0.0, .48) * layerOpacity');
  const hemi = new THREE.HemisphereLight('#cce5fc', '#35475c', 1.4), sun = new THREE.DirectionalLight('#fff0d4', 3); sun.position.set(-600, 500, 800); root.add(hemi, sun);
  const exhaust = new THREE.Group(); vehicle.root.add(exhaust);
  const flames: THREE.Mesh[] = [];
  for (const [radius, color, opacity] of [[1, '#ff943b', .55], [.48, '#fff7cc', .95]] as const) {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(radius, 1, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending })); flame.rotation.z = Math.PI; exhaust.add(flame); flames.push(flame);
  }
  const pathPositions = new Float32Array(800 * 3), pathGeometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pathPositions, 3));
  const path = new THREE.Line(pathGeometry, new THREE.LineBasicMaterial({ color: '#eabf73', transparent: true, opacity: .65 })); path.frustumCulled = false; root.add(path); let lastPathTime = NaN;
  const orbitPositions = new Float32Array(257 * 3), targetPositions = new Float32Array(257 * 3);
  const orbitGeometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(orbitPositions, 3));
  const targetGeometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(targetPositions, 3));
  const orbitLine = new THREE.Line(orbitGeometry, new THREE.LineBasicMaterial({ color: '#73e4e9', transparent: true, opacity: .95 }));
  const targetLine = new THREE.Line(targetGeometry, new THREE.LineDashedMaterial({ color: '#94a2b6', transparent: true, opacity: .5, dashSize: 55000, gapSize: 45000 }));
  const orbitMarker = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: '#d9fcf8' })); orbitMarker.scale.setScalar(25000);
  orbitLine.frustumCulled = targetLine.frustumCulled = false; root.add(orbitLine, targetLine, orbitMarker); let lastOrbitPhase = '', lastOrbitTime = NaN;
  const satellitePositions = new Float32Array(257 * 3), satelliteGeometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(satellitePositions, 3));
  const satelliteOrbit = new THREE.Line(satelliteGeometry, new THREE.LineBasicMaterial({ color: '#ebb78b', transparent: true, opacity: .85 })); satelliteOrbit.frustumCulled = false; root.add(satelliteOrbit);
  const starsPositions = new Float32Array(2400); let seed = 451;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 800; i++) { const p = new THREE.Vector3(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1).normalize().multiplyScalar(1.5e7); p.toArray(starsPositions, i * 3); }
  const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(starsPositions, 3)), new THREE.PointsMaterial({ color: '#bcd3e8', size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false })); root.add(stars);
  let currentConfig: VehicleConfig | undefined;
  return { root, update(state: FlightState, config: VehicleConfig, lightDirection: THREE.Vector3, options: EnvironmentOptions, overview: boolean, kind: SpaceObjectKind | 'all', focus: 'carrier' | 'satellite' | 'pair' = 'carrier') {
    const a = state.ascent!;
    if (currentConfig !== config) { vehicle.update(config); booster.update(config); currentConfig = config; }
    vehicle.setFlightStage(a.stage === 0 ? 'whole' : 'upper'); booster.setFlightStage('booster');
    const origin = fixedToLocal(new THREE.Vector3(...a.fixedPosition)), direction = localDirection(new THREE.Vector3(...a.fixedDirection)).normalize();
    const d = state.deployment;
    const carrierCenter = d ? fixedToLocal(new THREE.Vector3(...d.carrier.fixedPosition)).sub(origin) : new THREE.Vector3();
    const satelliteCenter = d ? fixedToLocal(new THREE.Vector3(...d.satellite.fixedPosition)).sub(origin) : null;
    // In orbital flight the integrated point is the combined centre of mass. The ready E6 layout is identical.
    vehicle.root.position.copy(carrierCenter).addScaledVector(direction, state.orbit ? -(DEPLOYMENT.carrierModelCenterM + (d ? 0 : config.payloadKg / state.massKg * DEPLOYMENT.centerSpacingM)) : 0);
    vehicle.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    if (d) vehicle.setDeployment(d.fairingOpen, d.released);
    satellite.root.visible = !!d?.released;
    if (d && satelliteCenter) { satellite.root.position.copy(satelliteCenter); satellite.root.quaternion.copy(vehicle.root.quaternion); satellite.update(config.payloadKg, d.panels); }
    planet.position.copy(localDirection(basis.origin.clone().negate())).sub(origin);
    orbitLine.visible = targetLine.visible = !!state.orbit; orbitMarker.visible = !!state.orbit && overview;
    satelliteOrbit.visible = !!d?.released && overview;
    if (state.orbit && (lastOrbitTime !== state.time || lastOrbitPhase !== state.phase)) {
      const elements = state.orbit.elements, points = sampleOrbit(elements), q = cross(elements.normal, elements.periDirection);
      points.forEach((p, i) => fixedToLocal(new THREE.Vector3(...rotateEarth(p, -state.time))).sub(origin).toArray(orbitPositions, i * 3));
      orbitGeometry.attributes.position.needsUpdate = true; orbitGeometry.setDrawRange(0, points.length);
      for (let i = 0; i < 257; i++) { const angle = i / 256 * Math.PI * 2, point = scale(add(scale(elements.periDirection, Math.cos(angle)), scale(q, Math.sin(angle))), R + LAUNCH_MISSION.orbitAltitudeKm * 1000); fixedToLocal(new THREE.Vector3(...rotateEarth(point, -state.time))).sub(origin).toArray(targetPositions, i * 3); }
      targetGeometry.attributes.position.needsUpdate = true; targetLine.computeLineDistances(); lastOrbitTime = state.time; lastOrbitPhase = state.phase;
      if (d?.released) { const points = sampleOrbit(d.satellite.elements); points.forEach((p, i) => fixedToLocal(new THREE.Vector3(...rotateEarth(p, -state.time))).sub(origin).toArray(satellitePositions, i * 3)); satelliteGeometry.attributes.position.needsUpdate = true; satelliteGeometry.setDrawRange(0, points.length); }
    }
    for (const material of [surface, earthEffects.clouds.material, earthEffects.atmosphere.material]) material.uniforms.sunDirection.value.copy(lightDirection);
    sun.position.copy(lightDirection).multiplyScalar(1000);
    // Clouds are a static illustrative layer; the close surface uses the authored base until clear of it.
    earthEffects.clouds.material.uniforms.layerOpacity.value = options.clouds ? overview ? 1 : THREE.MathUtils.smoothstep(a.altitudeM, 14000, 22000) : 0;
    earthEffects.atmosphere.material.uniforms.layerOpacity.value = options.atmosphere ? overview ? 1 : THREE.MathUtils.smoothstep(a.altitudeM, 20000, 50000) : 0;
    environment.update(state, options, overview, kind);
    booster.root.visible = !!a.detached;
    if (a.detached) { booster.root.position.copy(fixedToLocal(new THREE.Vector3(...a.detached.fixedPosition))).sub(origin); booster.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), localDirection(new THREE.Vector3(...a.detached.fixedDirection)).normalize()); }
    exhaust.visible = state.throttle > 0;
    const length = (a.stage === 0 ? 25 : 14) * state.throttle * (1 + .6 * (1 - a.pressurePa / 101325));
    exhaust.position.y = a.stage === 0 ? 0 : 33.7;
    flames.forEach((flame, i) => { const size = length * (i ? .8 : 1); flame.scale.set(a.stage === 0 ? 1.2 : .9, size, a.stage === 0 ? 1.2 : .9); flame.position.y = -size / 2; });
    if (lastPathTime !== state.time) { const points = a.trail.slice(-800); points.forEach((p, i) => fixedToLocal(new THREE.Vector3(...p)).sub(origin).toArray(pathPositions, i * 3)); pathGeometry.attributes.position.needsUpdate = true; pathGeometry.setDrawRange(0, points.length); lastPathTime = state.time; }
    path.visible = !d && a.altitudeM > 2000; stars.material.opacity = overview ? .65 : .65 * THREE.MathUtils.smoothstep(a.altitudeM, 55000, 120000);
    hemi.intensity = THREE.MathUtils.lerp(1.4, .6, THREE.MathUtils.smoothstep(a.altitudeM, 10000, 100000));
    sun.visible = hemi.visible = overview || a.altitudeM >= 4000;
    const apsis = (radius: number) => fixedToLocal(new THREE.Vector3(...rotateEarth(scale(state.orbit!.elements.periDirection, radius), -state.time))).sub(origin);
    const periCenter = state.orbit && state.orbit.elements.eccentricity > 1e-6 ? apsis(R + state.orbit.elements.periapsisM) : null;
    const apoCenter = state.orbit?.elements.apoapsisM != null && state.orbit.elements.eccentricity > 1e-6 ? apsis(-R - state.orbit.elements.apoapsisM) : null;
    const center = d ? focus === 'satellite' && satelliteCenter ? satelliteCenter.clone() : focus === 'pair' && satelliteCenter ? carrierCenter.clone().add(satelliteCenter).multiplyScalar(.5) : carrierCenter : state.orbit ? new THREE.Vector3() : direction.clone().multiplyScalar(a.stage === 0 ? 30 : 47);
    return { origin, direction, periCenter, apoCenter, carrierCenter, satelliteCenter, planetCenter: planet.position.clone(), boosterCenter: a.detached ? booster.root.position.clone().add(new THREE.Vector3(0, 15, 0).applyQuaternion(booster.root.quaternion)) : null, center, sky: new THREE.Color('#9ab4c3').lerp(new THREE.Color('#163964'), THREE.MathUtils.smoothstep(a.altitudeM, 4000, 35000)).lerp(new THREE.Color('#020710'), THREE.MathUtils.smoothstep(a.altitudeM, 25000, 85000)) };
  } };
}
