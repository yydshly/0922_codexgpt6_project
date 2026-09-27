import * as THREE from 'three';
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
  const hinges: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const hinge = new THREE.Group(); hinge.position.set(side * .72, -.65, 0); root.add(hinge); hinges.push(hinge);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(.07, 2.2, 1.25), blue); panel.position.y = 1.1; hinge.add(panel);
    for (let i = 1; i < 7; i++) { const line = new THREE.Mesh(new THREE.BoxGeometry(.085, .015, 1.26), steel); line.position.y = i * 2.2 / 7; hinge.add(line); }
    for (const z of [-.625, -.21, .21, .625]) { const line = new THREE.Mesh(new THREE.BoxGeometry(.085, 2.2, .012), steel); line.position.set(0, 1.1, z); hinge.add(line); }
  }
  const update = (payloadKg: number, deployed: number) => { root.scale.setScalar(payloadKg === 500 ? 1 : .8); hinges.forEach((h, i) => { h.rotation.z = (i === 0 ? 1 : -1) * Math.PI / 2 * deployed; }); };
  update(500, 0); return { root, update };
}

/** One model shared by the pad and assembly preview. Exploded offsets are presentation only. */
export function createLaunchVehicle() {
  const root = new THREE.Group(); root.name = 'Configured teaching vehicle';
  const booster = new THREE.Group(), upper = new THREE.Group(), fairing = new THREE.Group(), payload = new THREE.Group(), gauges = new THREE.Group();
  root.add(booster, upper, fairing, payload, gauges);
  const white = new THREE.MeshStandardMaterial({ color: '#ece8da', metalness: .22, roughness: .38 });
  const steel = new THREE.MeshStandardMaterial({ color: '#718186', metalness: .68, roughness: .42 });
  const dark = new THREE.MeshStandardMaterial({ color: '#293239', metalness: .5, roughness: .5 });
  const engineMaterial = dark.clone(); engineMaterial.side = THREE.DoubleSide;
  const blue = new THREE.MeshStandardMaterial({ color: '#184d79', metalness: .6, roughness: .33 });
  const box = (group: THREE.Group, size: [number, number, number], p: [number, number, number], mat: THREE.Material = white) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat); mesh.position.set(...p); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh;
  };
  const cyl = (group: THREE.Group, r: number, height: number, y: number, mat = white, top = r, open = false) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, r, height, 48, 1, open), mat); mesh.position.y = y; mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh;
  };
  cyl(booster, 1.85, 31.5, 18.25); cyl(booster, 1.86, 1.5, 34.75, dark); cyl(booster, 1.85, 1.6, 1.7, dark, 1.85, true);
  cyl(upper, 1.85, 15, 43); cyl(fairing, 2.15, 4, 52.5);
  const points = Array.from({ length: 25 }, (_, i) => { const u = i / 24; return new THREE.Vector2(2.15 * Math.cos(u * Math.PI / 2), 54.5 + u * 5.5); });
  const nose = new THREE.Mesh(new THREE.LatheGeometry(points, 64), white); nose.castShadow = true; fairing.add(nose);
  const openCover = new THREE.Group(); root.add(openCover); openCover.visible = false;
  const coverMaterial = white.clone(); coverMaterial.side = THREE.DoubleSide;
  for (let i = 0; i < 2; i++) {
    const hinge = new THREE.Group(); hinge.position.y = 50.5; hinge.rotation.z = i === 0 ? -1.15 : 1.15; openCover.add(hinge);
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.15, 4, 32, 1, true, i * Math.PI, Math.PI), coverMaterial); shell.position.y = 2; hinge.add(shell);
    hinge.add(new THREE.Mesh(new THREE.LatheGeometry(points.map(p => new THREE.Vector2(p.x, p.y - 50.5)), 32, i * Math.PI, Math.PI), coverMaterial));
  }
  for (const y of [2.5, 8, 18, 29, 35.5, 42, 50.5, 54.5]) cyl(y < 35.5 ? booster : y < 50.5 ? upper : fairing, y < 50.5 ? 1.865 : 2.153, .07, y, steel);
  const standardEngines = new THREE.Group(), lightEngines = new THREE.Group(); booster.add(standardEngines, lightEngines);
  for (const [group, positions] of [[standardEngines, [[-.8, -.8], [-.8, .8], [.8, -.8], [.8, .8]]], [lightEngines, [[-.75, 0], [.75, 0]]]] as const) {
    for (const [x, z] of positions) { const bell = cyl(group, .58, 1.5, .8, engineMaterial, .26, true); bell.position.x = x; bell.position.z = z; }
  }
  const upperBell = cyl(upper, .8, 2, 34.7, engineMaterial, .32, true);
  const upperBand = cyl(upper, 1.864, .55, 37.4, blue);
  for (const a of [.6, 3.5]) {
    const x = Math.sin(a) * 1.86, z = Math.cos(a) * 1.86;
    box(booster, [.09, 29.5, .09], [x, 17.75, z], steel);
    const panel = box(booster, [.75, 1.4, .05], [x, 31, z], dark); panel.rotation.y = a;
  }
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; const rib = box(booster, [.04, 1.4, .04], [Math.sin(a) * 1.88, 34.8, Math.cos(a) * 1.88], steel); rib.rotation.y = a; }
  const label = (text: string, width: number, height: number, y: number, group: THREE.Group) => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#173038'; ctx.font = 'bold 85px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 64);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })); mesh.position.set(0, y, 1.881); group.add(mesh);
  };
  label('ORBIT', 3, .8, 27, booster); label('01', 1.2, 1.5, 47, upper);
  const satellite = createLaunchSatellite(); satellite.root.position.y = 54; payload.add(satellite.root);
  const gaugeMaterial = new THREE.MeshBasicMaterial({ color: '#59c9cf', transparent: true, opacity: .8, depthWrite: false });
  const gauge1 = box(gauges, [.3, 27, .3], [3, 17, 0], gaugeMaterial);
  const gauge2 = box(gauges, [.3, 12, .3], [3, 43, 0], gaugeMaterial);
  function update(config: VehicleConfig, exploded = false, inWorkshop = false) {
    standardEngines.visible = config.boosterEngine === 'b-standard'; lightEngines.visible = !standardEngines.visible;
    upperBand.visible = config.upperEngine === 'u-efficient'; upperBell.scale.set(config.upperEngine === 'u-efficient' ? 1.25 : 1, 1, config.upperEngine === 'u-efficient' ? 1.25 : 1);
    upper.position.y = exploded ? 8 : 0; fairing.position.set(exploded ? 8 : 0, exploded ? 18 : 0, 0); payload.position.y = exploded ? 15 : 0;
    payload.visible = exploded; satellite.update(config.payloadKg, 0); openCover.visible = false;
    gauges.visible = inWorkshop;
    gauge1.scale.y = config.boosterFillPercent / 100; gauge1.position.y = 3.5 + 13.5 * gauge1.scale.y;
    gauge2.scale.y = config.upperFillPercent / 100; gauge2.position.y = 37 + (exploded ? 8 : 0) + 6 * gauge2.scale.y;
  }
  update(BASELINE_VEHICLE);
  return { root, update, setFlightStage(stage: 'whole' | 'upper' | 'booster') { booster.visible = stage !== 'upper'; upper.visible = fairing.visible = stage !== 'booster'; payload.visible = gauges.visible = openCover.visible = false; },
    setDeployment(open: boolean, released: boolean) { fairing.visible = !open; openCover.visible = open; payload.visible = open && !released; } };
}
