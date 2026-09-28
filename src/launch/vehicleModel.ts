import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { vehiclePaint } from './vehiclePaint';
import { BASELINE_VEHICLE, type VehicleConfig } from './vehicle';

/** Metre-scale teaching satellite; array hinges are driven only by task time. */
export function createLaunchSatellite() {
  const foilPixels = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const i = (y * 64 + x) * 4, crease = .8 + .2 * Math.sin(x * 1.7 + Math.sin(y * .7) * 2) * Math.cos(y * 1.2);
    foilPixels[i] = 232 * crease; foilPixels[i + 1] = 188 * crease; foilPixels[i + 2] = 88 * crease; foilPixels[i + 3] = 255;
  }
  const foil = new THREE.DataTexture(foilPixels, 64, 64); foil.colorSpace = THREE.SRGBColorSpace; foil.needsUpdate = true; foil.magFilter = THREE.LinearFilter;
  const root = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ map: foil, metalness: .22, roughness: .65 }), steel = new THREE.MeshStandardMaterial({ color: '#c4ced1', metalness: .2, roughness: .55 });
  const blue = new THREE.MeshStandardMaterial({ color: '#2565a8', metalness: .12, roughness: .5 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.55, 1.2), gold); root.add(body);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 1.2, 8), steel); antenna.position.y = 1.3; root.add(antenna);
  const dish = new THREE.Mesh(new THREE.LatheGeometry(Array.from({ length: 14 }, (_, i) => { const r = i / 13 * .36; return new THREE.Vector2(r, r * r * .8); }), 36), new THREE.MeshStandardMaterial({ color: '#e0e1d9', metalness: .1, roughness: .6, side: THREE.DoubleSide }));
  dish.position.set(0, 1.05, 0); root.add(dish);
  const seams = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), new THREE.LineBasicMaterial({ color: '#c6b47e' })); root.add(seams);
  const radiator = new THREE.Mesh(new THREE.BoxGeometry(.018, 1.05, .8), steel); radiator.position.set(-.69, -.05, 0); root.add(radiator);
  const port = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .07, 24), steel); port.rotation.x = Math.PI / 2; port.position.set(.18, .1, .63); root.add(port);
  const arrays = new THREE.Group(); root.add(arrays);
  const hinges: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const hinge = new THREE.Group(); hinge.position.set(side * .72, -.65, 0); arrays.add(hinge); hinges.push(hinge);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(.07, 2.2, 1.25), blue); panel.position.y = 1.1; hinge.add(panel);
    for (let i = 1; i < 7; i++) { const line = new THREE.Mesh(new THREE.BoxGeometry(.085, .015, 1.26), steel); line.position.y = i * 2.2 / 7; hinge.add(line); }
    for (const z of [-.625, -.21, .21, .625]) { const line = new THREE.Mesh(new THREE.BoxGeometry(.085, 2.2, .012), steel); line.position.set(0, 1.1, z); hinge.add(line); }
  }
  const update = (payloadKg: number, deployed: number) => { root.scale.setScalar(payloadKg === 500 ? 1 : .8); hinges.forEach((h, i) => { h.rotation.z = (i === 0 ? 1 : -1) * Math.PI / 2 * deployed; }); };
  update(500, 0); return { root, update, pointArrays(normal?: THREE.Vector3) { arrays.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal?.clone().normalize() ?? new THREE.Vector3(0, 1, 0)); } };
}

/** Shared 60 m teaching vehicle. Attachment stations and plume origins match the flight model. */
export function createLaunchVehicle() {
  const root = new THREE.Group(); root.name = 'ORBIT two-stage teaching vehicle';
  const booster = new THREE.Group(), upper = new THREE.Group(), fairing = new THREE.Group(), payload = new THREE.Group(), gauges = new THREE.Group();
  booster.name = 'booster'; upper.name = 'upper'; fairing.name = 'fairing'; payload.name = 'payload'; gauges.name = 'workshop gauges';
  root.add(booster, upper, fairing, payload, gauges);
  const white = new THREE.MeshStandardMaterial({ color: '#e9ede9', metalness: .14, roughness: .48 });
  const steel = new THREE.MeshStandardMaterial({ color: '#9aadb5', metalness: .65, roughness: .35 });
  const graphite = new THREE.MeshStandardMaterial({ color: '#26333c', metalness: .32, roughness: .48 });
  const thermal = new THREE.MeshStandardMaterial({ color: '#3b3631', metalness: .5, roughness: .55, side: THREE.DoubleSide });
  const gold = new THREE.MeshStandardMaterial({ color: '#b6854b', metalness: .5, roughness: .4 });
  const paint = (stage: 'booster' | 'upper') => new THREE.MeshStandardMaterial({ map: vehiclePaint(stage), metalness: .16, roughness: .47 });
  const mesh = (group: THREE.Group, geometry: THREE.BufferGeometry, mat: THREE.Material, p: [number, number, number] = [0, 0, 0]) => {
    const item = new THREE.Mesh(geometry, mat); item.position.set(...p); item.castShadow = item.receiveShadow = true; group.add(item); return item;
  };
  const cyl = (group: THREE.Group, r: number, height: number, y: number, mat: THREE.Material = white, top = r, open = false) => mesh(group, new THREE.CylinderGeometry(top, r, height, 64, 1, open), mat, [0, y, 0]);
  const box = (group: THREE.Group, size: [number, number, number], p: [number, number, number], mat: THREE.Material) => mesh(group, new THREE.BoxGeometry(...size), mat, p);
  const lathe = (group: THREE.Group, points: [number, number][], mat: THREE.Material, segments = 64, start = 0, length = Math.PI * 2) => mesh(group, new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments, start, length), mat);
  const ring = (group: THREE.Group, r: number, tube: number, y: number, mat: THREE.Material = steel) => { const item = mesh(group, new THREE.TorusGeometry(r, tube, 8, 64), mat, [0, y, 0]); item.rotation.x = Math.PI / 2; return item; };
  const pipe = (group: THREE.Group, points: [number, number, number][], radius: number, mat: THREE.Material = steel) => mesh(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 20, radius, 8, false), mat);
  const bolts = (group: THREE.Group, radius: number, y: number, count = 24) => {
    for (let i = 0; i < count; i++) { const a = i * Math.PI * 2 / count; const b = mesh(group, new THREE.CylinderGeometry(.035, .035, .035, 6), steel, [Math.sin(a) * radius, y, Math.cos(a) * radius]); b.rotation.x = Math.PI / 2; b.rotation.z = -a; }
  };
  // Bake repeated fasteners and ribs into material batches; no extra animated objects per bolt.
  const batch = (group: THREE.Group) => {
    const parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
    for (const child of [...group.children]) if (child instanceof THREE.Mesh && !Array.isArray(child.material)) {
      child.updateMatrix(); const geometry = child.geometry.clone().applyMatrix4(child.matrix);
      const bucket = parts.get(child.material) ?? []; bucket.push(geometry); parts.set(child.material, bucket);
      child.geometry.dispose(); group.remove(child);
    }
    for (const [material, geometries] of parts) { const geometry = mergeGeometries(geometries, false); if (geometry) mesh(group, geometry, material); geometries.forEach(g => g.dispose()); }
  };
  // Tank skin, recessed engine bay and an open interstage surrounding the upper nozzle.
  cyl(booster, 1.85, 30.5, 17.75, paint('booster'));
  cyl(booster, 1.85, 1.55, 1.725, graphite, 1.85, true);
  cyl(booster, 1.85, 2.5, 34.25, graphite, 1.85, true);
  cyl(booster, 1.71, .14, 1.92, thermal);
  for (const y of [1, 2.48, 32.98, 35.47]) { ring(booster, 1.854, .045, y); bolts(booster, 1.888, y); }
  for (let i = 0; i < 32; i++) { const a = i * Math.PI / 16; const rib = box(booster, [.035, 2.25, .065], [Math.sin(a) * 1.86, 34.25, Math.cos(a) * 1.86], steel); rib.rotation.y = a; }
  for (const a of [2, 4.4]) {
    const x = Math.sin(a), z = Math.cos(a);
    const chase = box(booster, [.16, 28.8, .1], [x * 1.875, 17.8, z * 1.875], white); chase.rotation.y = a;
    for (const y of [4, 11, 19, 27, 31]) { const clamp = box(booster, [.24, .08, .13], [x * 1.89, y, z * 1.89], steel); clamp.rotation.y = a; }
    pipe(booster, [[x * 1.6, 1.3, z * 1.6], [x * 1.95, 2.2, z * 1.95], [x * 1.95, 3.6, z * 1.95], [x * 1.8, 4.1, z * 1.8]], .065);
  }
  batch(booster);
  // Bell curvature, injector housing, cooling bands and feed line are visual structure only.
  const engine = (group: THREE.Group, exitRadius: number, height: number, exitY: number, x = 0, z = 0) => {
    const motor = new THREE.Group(); motor.position.set(x, exitY, z); group.add(motor);
    const profile: [number, number][] = Array.from({ length: 25 }, (_, i) => { const t = i / 24; return [exitRadius * (.24 + .76 * (1 - t) ** 1.45), t * height * .77]; });
    profile.push([exitRadius * .27, height * .86], [exitRadius * .31, height * .98]);
    lathe(motor, profile, thermal);
    ring(motor, exitRadius, .028, 0, steel);
    for (let i = 1; i <= 9; i++) { const t = i / 12; ring(motor, exitRadius * (.24 + .76 * (1 - t) ** 1.45) + .012, .012, t * height * .77, steel); }
    cyl(motor, exitRadius * .36, height * .17, height * .98, steel);
    cyl(motor, exitRadius * .23, .09, height * 1.09, graphite);
    const inlet = exitRadius * .6;
    pipe(motor, [[inlet, height * 1.04, 0], [inlet * 1.15, height * .75, 0], [inlet * .92, height * .53, 0], [exitRadius * .45, height * .42, 0]], .045, gold);
    batch(motor); return motor;
  };
  const standardEngines = new THREE.Group(), lightEngines = new THREE.Group(); standardEngines.name = 'four sea-level engines'; lightEngines.name = 'two sea-level engines'; booster.add(standardEngines, lightEngines);
  for (const [x, z] of [[-.8, -.8], [-.8, .8], [.8, -.8], [.8, .8]]) engine(standardEngines, .58, 1.65, 0, x, z);
  for (const x of [-.75, .75]) engine(lightEngines, .58, 1.65, 0, x, 0);
  cyl(upper, 1.85, 15, 43, paint('upper'));
  for (const y of [35.52, 37.1, 49.9, 50.46]) ring(upper, 1.858, .038, y);
  bolts(upper, 1.881, 35.6); bolts(upper, 1.881, 50.36);
  // A shallow top dome and payload adapter are visible when the fairing is opened.
  const dome = mesh(upper, new THREE.SphereGeometry(1.76, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), steel, [0, 50.49, 0]); dome.scale.y = .17;
  cyl(upper, .9, 2.4, 51.85, graphite, .48, true); ring(upper, .48, .05, 53.1, gold);
  batch(upper);
  const upperEngine = engine(upper, .8, 1.85, 33.7); upperEngine.name = 'vacuum engine';
  // The contour remains 60 m tall; shoulder transitions from the 3.7 m stage to the wider fairing.
  const nose: [number, number][] = Array.from({ length: 33 }, (_, i) => { const u = i / 32; return [2.15 * Math.cos(u * Math.PI / 2), 54.5 + u * 5.5]; });
  const coverProfile: [number, number][] = [[1.85, 50.5], [1.96, 50.75], [2.12, 51.5], [2.15, 51.85], [2.15, 54.5], ...nose.slice(1)];
  const coverMaterial = white.clone(); coverMaterial.side = THREE.DoubleSide;
  const makeCover = (group: THREE.Group, start = 0, length = Math.PI * 2, offsetY = 0) => {
    lathe(group, coverProfile.map(([r, y]) => [r, y - offsetY]), coverMaterial, 64, start, length);
    const seamAngles = length === Math.PI * 2 ? [0, Math.PI] : [start, start + Math.PI];
    for (const a of seamAngles) pipe(group, coverProfile.filter(([r]) => r > .05).map(([r, y]) => [Math.sin(a) * (r + .014), y - offsetY, Math.cos(a) * (r + .014)]), .016, steel);
    mesh(group, new THREE.CylinderGeometry(2.167, 2.167, .05, 64, 1, true, start, length), steel, [0, 52 - offsetY, 0]);
    batch(group);
  };
  makeCover(fairing);
  const openCover = new THREE.Group(); openCover.name = 'retained teaching cover'; root.add(openCover); openCover.visible = false;
  for (let i = 0; i < 2; i++) { const hinge = new THREE.Group(); hinge.position.y = 50.5; hinge.rotation.z = i === 0 ? -1.15 : 1.15; openCover.add(hinge); makeCover(hinge, i * Math.PI, Math.PI, 50.5); }
  const satellite = createLaunchSatellite(); satellite.root.position.y = 54; payload.add(satellite.root);
  const gaugeMaterial = new THREE.MeshBasicMaterial({ color: '#59c9cf', transparent: true, opacity: .8, depthWrite: false });
  const gauge1 = box(gauges, [.3, 27, .3], [3, 17, 0], gaugeMaterial), gauge2 = box(gauges, [.3, 12, .3], [3, 43, 0], gaugeMaterial);
  function update(config: VehicleConfig, exploded = false, inWorkshop = false) {
    standardEngines.visible = config.boosterEngine === 'b-standard'; lightEngines.visible = !standardEngines.visible;
    upperEngine.scale.set(config.upperEngine === 'u-efficient' ? 1.25 : 1, 1, config.upperEngine === 'u-efficient' ? 1.25 : 1);
    upper.position.y = exploded ? 8 : 0; fairing.position.set(exploded ? 8 : 0, exploded ? 18 : 0, 0); payload.position.y = exploded ? 15 : 0;
    payload.visible = exploded; satellite.update(config.payloadKg, 0); openCover.visible = false; gauges.visible = inWorkshop && exploded;
    gauge1.scale.y = config.boosterFillPercent / 100; gauge1.position.y = 3.5 + 13.5 * gauge1.scale.y;
    gauge2.scale.y = config.upperFillPercent / 100; gauge2.position.y = 37 + (exploded ? 8 : 0) + 6 * gauge2.scale.y;
  }
  update(BASELINE_VEHICLE);
  return { root, update, setFlightStage(stage: 'whole' | 'upper' | 'booster') { booster.visible = stage !== 'upper'; upper.visible = fairing.visible = stage !== 'booster'; payload.visible = gauges.visible = openCover.visible = false; },
    setDeployment(open: boolean, released: boolean) { fairing.visible = !open; openCover.visible = open; payload.visible = open && !released; } };
}
