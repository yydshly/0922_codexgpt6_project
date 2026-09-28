import { createObservationFootprintView } from './observationFootprintView';
import { DEFAULT_FOOTPRINT, type FootprintOptions } from './observationFootprint';
import { createOperationsView } from './operationsView';
import type { OperationsGuides } from './operationsGuides';
import { createReentryEffect } from './reentryEffects';
import { createPassivationEffect } from './deorbitEffects';
import * as THREE from 'three';
import { bodyById } from '../data/catalog';
import { LAUNCH_EARTH, LAUNCH_MISSION } from '../data/launchMission';
import { makePlanetMaterial } from '../components/celestialMaterials';
import { createEarthEffects } from '../components/earthEffects';
import type { PanoramaTextureLoader } from '../components/PanoramaTextureLoader';
import { baseBasis, fixedToGeodetic, fixedToLocal } from './coordinates';
import { createLaunchSatellite, createLaunchVehicle } from './vehicleModel';
import { DEPLOYMENT } from './deployment';
import type { FlightState } from './liftoff';
import type { VehicleConfig } from './vehicle';
import { createAscentEnvironmentView } from './ascentEnvironmentView';
import type { EnvironmentOptions, SpaceObjectKind } from './flightEnvironment';
import { cross, sampleOrbit } from './orbitInsertion';
import { add, airVelocity, rotateEarth, scale, unit } from './ascent';
import { createVehicleExhaust } from './rocketPlume';
import { satelliteWetKg } from './satellitePlan';
import { boosterRelativeDirection, type BoosterSample } from './boosterDescent';

/** A moving render origin at the vehicle, in metres; it never modifies the integrated state. */
export function createAscentView(loader: PanoramaTextureLoader) {
  const root = new THREE.Group(), planet = new THREE.Group(), vehicle = createLaunchVehicle(), booster = createLaunchVehicle();
  root.add(planet, vehicle.root, booster.root);
  const satellite = createLaunchSatellite(); root.add(satellite.root); satellite.root.visible = false;
  const arrayNormalAnchor: { center: THREE.Vector3 | null } = { center: null };
  const operations = createOperationsView(); root.add(operations.root);
  const footprint = createObservationFootprintView(); root.add(footprint.root);
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
  const exhaust = createVehicleExhaust(); vehicle.root.add(exhaust.root);
  const reentry = createReentryEffect(); root.add(reentry.root);
  const passivation = createPassivationEffect(); vehicle.root.add(passivation.root);
  const nosePoints = Array.from({ length: 25 }, (_, i) => { const t = i / 24; return new THREE.Vector2(2.19 * Math.cos(t * Math.PI / 2), 54.5 + t * 5.55); });
  const noseMaterial = new THREE.MeshBasicMaterial({ color: '#ffb14e', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const aerodynamicOverlay = new THREE.Mesh(new THREE.LatheGeometry(nosePoints, 48), noseMaterial); vehicle.root.add(aerodynamicOverlay);
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
  const lowerMarker = new THREE.Mesh(new THREE.SphereGeometry(3, 24, 16), new THREE.MeshStandardMaterial({ color: '#f1b778', roughness: .6 }));
  lowerMarker.visible = false; root.add(lowerMarker);
  const pointShape = new THREE.OctahedronGeometry(3), pointEdges = new THREE.EdgesGeometry(pointShape); pointShape.dispose();
  const boosterPoint = new THREE.LineSegments(pointEdges, new THREE.LineBasicMaterial({ color:'#f6c77a', depthTest:false, transparent:true, opacity:.95 }));
  boosterPoint.renderOrder=5; boosterPoint.visible=false; root.add(boosterPoint);
  // Tangent reference patch compensates for the globe mesh's kilometre-scale triangles.
  // It is a 0 m datum, not terrain or a debris footprint.
  const groundReference = new THREE.Group();
  const groundDisk = new THREE.Mesh(new THREE.CircleGeometry(600, 96), new THREE.MeshBasicMaterial({ color: '#254653', side: THREE.DoubleSide }));
  groundDisk.rotation.x = -Math.PI / 2; groundReference.add(groundDisk);
  const groundGrid = new THREE.GridHelper(240, 24, '#9abcb4', '#547b82'); groundGrid.position.y = .08; groundReference.add(groundGrid);
  root.add(groundReference); groundReference.visible = false;
  let currentConfig: VehicleConfig | undefined;
  return { root, arrayNormalAnchor, footprintAnchor:footprint.anchor, operationAnchors: operations.anchors, operationMaterials: operations.materials, update(state: FlightState, config: VehicleConfig, lightDirection: THREE.Vector3, options: EnvironmentOptions, overview: boolean, kind: SpaceObjectKind | 'all', focus: 'carrier' | 'satellite' | 'pair' = 'carrier', forceOverlay = false, boosterSample?:BoosterSample, boosterTrail:BoosterSample[] = [], operationsGuides?:OperationsGuides, footprintOptions:FootprintOptions=DEFAULT_FOOTPRINT, regionalView=false) {
    const a = state.ascent!; arrayNormalAnchor.center = null; satellite.setArrayGuides(false);
    if (currentConfig !== config) { vehicle.update(config); booster.update(config); currentConfig = config; }
    vehicle.setFlightStage(a.stage === 0 ? 'whole' : 'upper'); booster.setFlightStage('booster');
    if(boosterSample){
      footprint.hide();
      const b=boosterSample,origin=fixedToLocal(new THREE.Vector3(...b.fixedPosition)),direction=localDirection(new THREE.Vector3(...b.fixedDirection)).normalize(),point=b.model==='entry';
      vehicle.root.visible=satellite.root.visible=operations.root.visible=environment.root.visible=orbitLine.visible=targetLine.visible=orbitMarker.visible=satelliteOrbit.visible=false;
      booster.root.visible=!point;booster.root.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);booster.root.position.copy(direction).multiplyScalar(-17.75);
      lowerMarker.visible=false;boosterPoint.visible=point;planet.position.copy(localDirection(basis.origin.clone().negate())).sub(origin);
      const up=localDirection(baseBasis(fixedToGeodetic(new THREE.Vector3(...b.fixedPosition))).up);
      groundReference.visible=point&&b.altitudeM<800;groundReference.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),up);groundReference.position.copy(up).multiplyScalar(-b.altitudeM);
      for(const material of [surface,earthEffects.clouds.material,earthEffects.atmosphere.material])material.uniforms.sunDirection.value.copy(lightDirection);
      earthEffects.clouds.material.uniforms.layerOpacity.value=options.clouds?THREE.MathUtils.smoothstep(b.altitudeM,14000,22000):0;
      earthEffects.atmosphere.material.uniforms.layerOpacity.value=options.atmosphere?THREE.MathUtils.smoothstep(b.altitudeM,20000,50000):0;
      sun.position.copy(lightDirection).multiplyScalar(1000);sun.intensity=3;sun.visible=hemi.visible=true;hemi.intensity=.8;
      const points=boosterTrail.filter(p=>p.time<=b.time).slice(-800);points.forEach((p,i)=>fixedToLocal(new THREE.Vector3(...p.fixedPosition)).sub(origin).toArray(pathPositions,i*3));pathGeometry.attributes.position.needsUpdate=true;pathGeometry.setDrawRange(0,points.length);path.visible=true;path.material.color.set('#f6b979');lastPathTime=NaN;
      reentry.update(new THREE.Vector3(),localDirection(new THREE.Vector3(...rotateEarth(unit(boosterRelativeDirection(b)),-b.time))).normalize(),b.heatFluxWm2,options.aerodynamic);
      stars.material.opacity=.65*THREE.MathUtils.smoothstep(b.altitudeM,55000,120000);
      return {origin,direction,periCenter:null,apoCenter:null,carrierCenter:null,satelliteCenter:null,planetCenter:planet.position.clone(),boosterCenter:new THREE.Vector3(),center:new THREE.Vector3(),sky:new THREE.Color('#9ab4c3').lerp(new THREE.Color('#020710'),THREE.MathUtils.smoothstep(b.altitudeM,10000,85000))};
    }
    boosterPoint.visible=false;environment.root.visible=true;operations.root.visible=true;
    const origin = fixedToLocal(new THREE.Vector3(...a.fixedPosition)), direction = localDirection(new THREE.Vector3(...a.fixedDirection)).normalize();
    const d = state.deployment, o = state.operations, disposal = state.satelliteDisposal;
    const satelliteEntry = disposal?.entryAt != null;
    vehicle.root.visible = !o && !state.reentry?.lower;
    if (o) lightDirection = localDirection(new THREE.Vector3(...rotateEarth(o.sunDirection, -state.time))).normalize();
    operations.update(state, origin, overview, operationsGuides, regionalView);
    footprint.update(state,origin,overview,footprintOptions);
    const viewAltitude = d && focus === 'satellite' ? d.satellite.altitudeM : a.altitudeM;
    path.material.color.set(state.reentry ? '#ffb367' : '#eabf73');
    satelliteOrbit.material.color.set(state.lifecycle?.mode === 'retired' ? '#9eabb9' : !o && state.reentry ? '#84deda' : '#ebb78b');
    orbitMarker.material.color.set(state.lifecycle?.mode === 'retired' ? '#9eabb9' : '#d9fcf8');
    const carrierCenter = d ? fixedToLocal(new THREE.Vector3(...d.carrier.fixedPosition)).sub(origin) : new THREE.Vector3();
    const satelliteCenter = d ? fixedToLocal(new THREE.Vector3(...d.satellite.fixedPosition)).sub(origin) : null;
    lowerMarker.visible = satelliteEntry || !!state.reentry?.lower && !o; lowerMarker.position.copy(satelliteEntry && satelliteCenter ? satelliteCenter : carrierCenter);
    groundReference.visible = lowerMarker.visible && !overview && (satelliteEntry ? focus === 'satellite' : focus === 'carrier') && a.altitudeM < 800;
    if (groundReference.visible) {
      const up = localDirection(baseBasis(fixedToGeodetic(new THREE.Vector3(...a.fixedPosition))).up);
      groundReference.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
      groundReference.position.copy(lowerMarker.position).addScaledVector(up, -a.altitudeM);
    }
    // In orbital flight the integrated point is the combined centre of mass. The ready E6 layout is identical.
    vehicle.root.position.copy(carrierCenter).addScaledVector(direction, state.orbit ? -(DEPLOYMENT.carrierModelCenterM + (d ? 0 : satelliteWetKg(config) / state.massKg * DEPLOYMENT.centerSpacingM)) : 0);
    vehicle.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    if (d) vehicle.setDeployment(d.fairingOpen, d.released);
    satellite.root.visible = !!d?.released && !satelliteEntry;
    satellite.setPropulsion(!!state.satelliteEquipment, state.phase === 'disposal-burn' ? 1 : 0, state.time);
    if (d && satelliteCenter) { satellite.root.position.copy(satelliteCenter); satellite.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), localDirection(new THREE.Vector3(...rotateEarth(o?.direction ?? d.direction, -state.time))).normalize()); satellite.update(config.payloadKg, d.panels); satellite.pointArrays(o ? localDirection(new THREE.Vector3(...rotateEarth(o.arrayNormal, -state.time))).applyQuaternion(satellite.root.quaternion.clone().invert()) : undefined); }
    const showArrayGuides = !!o && state.phase.startsWith('ops-') && !overview && operationsGuides?.power !== false;
    satellite.setArrayGuides(showArrayGuides);
    if (showArrayGuides) {
      const face = satellite.arrayFaceFrames()[1];
      arrayNormalAnchor.center = root.worldToLocal(face.center.addScaledVector(face.normal, 1.6 * satellite.root.scale.x));
    }
    planet.position.copy(localDirection(basis.origin.clone().negate())).sub(origin);
    orbitLine.visible = targetLine.visible = !!state.orbit && !state.reentry && !o; orbitMarker.visible = !!state.orbit && overview;orbitMarker.scale.setScalar(regionalView?.08:1);
    satelliteOrbit.visible = !!d?.released && overview && !satelliteEntry;
    if (state.orbit && (lastOrbitTime !== state.time || lastOrbitPhase !== state.phase)) {
      const elements = state.orbit.elements, points = sampleOrbit(elements), q = cross(elements.normal, elements.periDirection);
      points.forEach((p, i) => fixedToLocal(new THREE.Vector3(...rotateEarth(p, -state.time))).sub(origin).toArray(orbitPositions, i * 3));
      orbitGeometry.attributes.position.needsUpdate = true; orbitGeometry.setDrawRange(0, points.length);
      for (let i = 0; i < 257; i++) { const angle = i / 256 * Math.PI * 2, point = scale(add(scale(elements.periDirection, Math.cos(angle)), scale(q, Math.sin(angle))), R + LAUNCH_MISSION.orbitAltitudeKm * 1000); fixedToLocal(new THREE.Vector3(...rotateEarth(point, -state.time))).sub(origin).toArray(targetPositions, i * 3); }
      targetGeometry.attributes.position.needsUpdate = true; targetLine.computeLineDistances(); lastOrbitTime = state.time; lastOrbitPhase = state.phase;
      if (d?.released) { const points = sampleOrbit(d.satellite.elements); points.forEach((p, i) => fixedToLocal(new THREE.Vector3(...rotateEarth(p, -state.time))).sub(origin).toArray(satellitePositions, i * 3)); satelliteGeometry.attributes.position.needsUpdate = true; satelliteGeometry.setDrawRange(0, points.length); }
    }
    for (const material of [surface, earthEffects.clouds.material, earthEffects.atmosphere.material]) material.uniforms.sunDirection.value.copy(lightDirection);
    sun.position.copy(lightDirection).multiplyScalar(1000); sun.intensity = o?.shadow ? 0 : 3;
    // Clouds are a static illustrative layer; the close surface uses the authored base until clear of it.
    earthEffects.clouds.material.uniforms.layerOpacity.value = options.clouds ? overview ? 1 : THREE.MathUtils.smoothstep(viewAltitude, 14000, 22000) : 0;
    earthEffects.atmosphere.material.uniforms.layerOpacity.value = options.atmosphere ? overview ? 1 : THREE.MathUtils.smoothstep(viewAltitude, 20000, 50000) : 0;
    environment.update(state, focus === 'satellite' ? { ...options, airflow: false } : options, overview, kind, forceOverlay);
    booster.root.visible = !!a.detached && !state.reentry && !o;
    if (a.detached) { booster.root.position.copy(fixedToLocal(new THREE.Vector3(...a.detached.fixedPosition))).sub(origin); booster.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), localDirection(new THREE.Vector3(...a.detached.fixedDirection)).normalize()); }
    exhaust.update(state.time, a.pressurePa, state.thrustN > 0 ? state.throttle : 0, a.stage, config.boosterEngine, Infinity, state.phase === 'avoidance-burn' || state.phase === 'deorbit-burn');
    passivation.update(state);
    const relative = unit(add(a.velocity, scale(airVelocity(a.position), -1)));
    reentry.update(satelliteEntry && satelliteCenter ? satelliteCenter : carrierCenter, localDirection(new THREE.Vector3(...rotateEarth(relative, -state.time))).normalize(), disposal ? disposal.heatFluxWm2 : state.reentry?.heatFluxWm2 ?? null, options.aerodynamic && !overview && (satelliteEntry ? focus === 'satellite' : !!state.reentry && !o && focus === 'carrier'));
    // False colour for locating the nose; q controls readability, NOT temperature.
    aerodynamicOverlay.visible = options.aerodynamic && !overview && !state.orbit && a.dynamicPressurePa > 1;
    noseMaterial.opacity = .5 * Math.min(1, Math.sqrt(a.dynamicPressurePa / 30000));
    if (lastPathTime !== state.time) { const points = a.trail.slice(-800); points.forEach((p, i) => fixedToLocal(new THREE.Vector3(...p)).sub(origin).toArray(pathPositions, i * 3)); pathGeometry.attributes.position.needsUpdate = true; pathGeometry.setDrawRange(0, points.length); lastPathTime = state.time; }
    path.visible = (!!disposal || !o && !!state.reentry) && overview || (!d && a.altitudeM > 2000); stars.material.opacity = overview ? .65 : .65 * THREE.MathUtils.smoothstep(viewAltitude, 55000, 120000);
    // Labelled teaching fill reveals the panel fronts in a close-up eclipse; it never enters the power ledger.
    hemi.intensity = o ? o.shadow ? !overview && state.phase.startsWith('ops-') ? 1.4 : .14 : .4 : THREE.MathUtils.lerp(1.4, .6, THREE.MathUtils.smoothstep(viewAltitude, 10000, 100000));
    sun.visible = hemi.visible = !!state.reentry || overview || viewAltitude >= 4000;
    const apsis = (radius: number) => fixedToLocal(new THREE.Vector3(...rotateEarth(scale(state.orbit!.elements.periDirection, radius), -state.time))).sub(origin);
    const periCenter = !state.reentry && state.orbit && state.orbit.elements.eccentricity > 1e-6 ? apsis(R + state.orbit.elements.periapsisM) : null;
    const apoCenter = !state.reentry && state.orbit?.elements.apoapsisM != null && state.orbit.elements.eccentricity > 1e-6 ? apsis(-R - state.orbit.elements.apoapsisM) : null;
    const center = o && satelliteCenter ? satelliteCenter.clone() : d ? focus === 'satellite' && satelliteCenter ? satelliteCenter.clone() : focus === 'pair' && satelliteCenter ? carrierCenter.clone().add(satelliteCenter).multiplyScalar(.5) : carrierCenter : state.orbit ? new THREE.Vector3() : direction.clone().multiplyScalar(a.stage === 0 ? 30 : 47);
    return { origin, direction, periCenter, apoCenter, carrierCenter, satelliteCenter, planetCenter: planet.position.clone(), boosterCenter: !o && !state.reentry && a.detached ? booster.root.position.clone().add(new THREE.Vector3(0, 15, 0).applyQuaternion(booster.root.quaternion)) : null, center, sky: new THREE.Color('#9ab4c3').lerp(new THREE.Color('#163964'), THREE.MathUtils.smoothstep(viewAltitude, 4000, 35000)).lerp(new THREE.Color('#020710'), THREE.MathUtils.smoothstep(viewAltitude, 25000, 85000)) };
  } };
}
