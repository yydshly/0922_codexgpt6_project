import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createBaseEnvironment, surfaceTexture } from './baseEnvironment';
import { createLaunchVehicle } from './vehicleModel';

/** Authored metre-scale teaching facilities. Reference types: NASA LC-39B; not a reconstruction. */
export function createBaseScene(options:{vehicleRadiusM?:number}={}) {
  const root = new THREE.Group(), environment = createBaseEnvironment(root);
  const material = (color: string, metalness = .1, roughness = .7) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const white = material('#ece8da', .22, .38), steel = material('#718186', .68, .42), dark = material('#293239', .5, .5);
  const orange = material('#c39846', .3), black = material('#20272a', .2), glass = material('#346475', .65, .2);
  const concrete = new THREE.MeshStandardMaterial({ map: surfaceTexture('concrete'), roughness: .94 });
  const road = new THREE.MeshStandardMaterial({ map: surfaceTexture('asphalt'), roughness: .95 });
  const siding = new THREE.MeshStandardMaterial({ map: surfaceTexture('metal'), metalness: .42, roughness: .52 });
  const light = new THREE.MeshStandardMaterial({ color: '#ffe2ac', emissive: '#ffc16c', emissiveIntensity: 2 });
  const box = (group: THREE.Group, size: number[], p: number[], mat = white) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size as [number, number, number]), mat);
    const meters = mat.map?.userData.metersPerTile;
    if (meters) {
      const pos = mesh.geometry.getAttribute('position'), normal = mesh.geometry.getAttribute('normal'), uv = mesh.geometry.getAttribute('uv');
      for (let i = 0; i < pos.count; i++) {
        const horizontal = Math.abs(normal.getY(i)) > .5;
        uv.setXY(i, ((Math.abs(normal.getX(i)) > .5 ? pos.getZ(i) + p[2] : pos.getX(i) + p[0])) / meters, (horizontal ? pos.getZ(i) + p[2] : pos.getY(i) + p[1]) / meters);
      }
    }
    mesh.position.set(...p as [number, number, number]); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
  };
  const cylinder = (group: THREE.Group, r: number, h: number, p: number[], mat = white, top = r, open = false) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, r, h, 48, 1, open), mat);
    mesh.position.set(...p as [number, number, number]); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
  };
  const beam = (group: THREE.Group, from: number[], to: number[], width: number, mat = steel) => {
    const a = new THREE.Vector3(...from as [number, number, number]), b = new THREE.Vector3(...to as [number, number, number]);
    const mesh = box(group, [width, a.distanceTo(b), width], a.clone().add(b).multiplyScalar(.5).toArray(), mat);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize()); return mesh;
  };
  const pipe = (group: THREE.Group, points: number[][], radius = .18, mat = steel) => {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p as [number, number, number])), false, 'centripetal');
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(12, points.length * 6), radius, 8, false), mat); mesh.castShadow = true; group.add(mesh); return mesh;
  };
  const railing = (group: THREE.Group, a: number[], b: number[], mat = orange) => {
    for (const y of [.55, 1.1]) beam(group, [a[0], a[1] + y, a[2]], [b[0], b[1] + y, b[2]], .07, mat);
    const length = Math.hypot(b[0] - a[0], b[2] - a[2]), steps = Math.ceil(length / 2.5);
    for (let i = 0; i <= steps; i++) box(group, [.08, 1.15, .08], [THREE.MathUtils.lerp(a[0], b[0], i / steps), a[1] + .55, THREE.MathUtils.lerp(a[2], b[2], i / steps)], mat);
  };
  const sign = (text: string, w: number, h: number, p: number[], group = root, floor = false) => {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#eee4cd'; ctx.font = '500 110px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 512, 128);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false }));
    mesh.position.set(...p as [number, number, number]); if (floor) mesh.rotation.x = -Math.PI / 2; group.add(mesh);
  };
  // Roads, expansion-jointed concrete aprons and perimeter service corridor.
  box(root, [380, .5, 310], [-80, .25, 75], concrete);
  box(root, [900, .2, 15], [-285, .6, 108], road); box(root, [15, .2, 500], [-62, .64, 42], road);
  for (let i = 0; i < 60; i++) box(root, [5, .015, .16], [-715 + i * 15, .8, 108], white);
  for (let i = 0; i < 34; i++) box(root, [.16, .015, 5], [-62, .82, -195 + i * 15], white);
  for (const z of [101, 115]) box(root, [900, .04, .16], [-285, .8, z], white);
  for (const x of [-69, -55]) box(root, [.16, .04, 500], [x, .82, 42], white);

  const pad = new THREE.Group(); pad.userData.baseLocation = 'pad'; root.add(pad);
  // Raised deck straddles an open exhaust corridor. Vehicle is an unpowered size mockup.
  for (const x of [-18, 18]) box(pad, [23, 4, 65], [x, 2, -5], concrete);
  box(pad, [12, .15, 72], [0, .6, -8], black);
  for (const x of [-7, 7]) box(pad, [1.4, 5, 76], [x, 2.5, -8], concrete);
  box(pad, [12, 1, 12], [0, 5.5, 0], dark);
  box(pad, [9, 3.5, 9], [0, 2, 0], steel).rotation.x = .38;
  for (const x of [-12, 12]) for (const z of [-8, 8]) box(pad, [2.3, 7, 2.3], [x, 3.5, z], steel);
  for (const x of [-8, 8]) box(pad, [8, 1.8, 22], [x, 6.4, 0], dark);
  for (const z of [-9, 9]) box(pad, [12, 1.8, 4], [0, 6.4, z], dark);
  for (const x of [-11.7, 11.7]) railing(pad, [x, 7.3, -10], [x, 7.3, 10]);
  for (const z of [-10.7, 10.7]) railing(pad, [-12, 7.3, z], [12, 7.3, z]);
  for (let i = 0; i < 18; i++) box(pad, [3, .25, .65], [20, .4 + i * .4, 18 - i * .65], steel);
  beam(pad, [18.5, 1.5, 18], [18.5, 8.5, 6.3], .1, orange); beam(pad, [21.5, 1.5, 18], [21.5, 8.5, 6.3], .1, orange);
  for (const x of [-30, 30]) railing(pad, [x, 4.1, -35], [x, 4.1, 26]);
  sign('LAUNCH / 01', 23, 4, [-18, 4.03, 22], pad, true);
  for (let i = 0; i < 12; i++) { const stripe = box(pad, [.55, .02, 3], [-28 + i * 1.8, 4.035, 27], orange); stripe.rotation.y = -.5; }
  const vehicle = createLaunchVehicle(); vehicle.root.position.y = 8.1; pad.add(vehicle.root);
  const clamps = new THREE.Group(), serviceArms = new THREE.Group(); pad.add(clamps, serviceArms);
  const vehicleRadius=options.vehicleRadiusM??1.85;
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) beam(clamps, [Math.sin(a) * 4.5, 7.3, Math.cos(a) * 4.5], [Math.sin(a) * vehicleRadius, 10, Math.cos(a) * vehicleRadius], .45, steel);
  // Service tower: walkways, lift, stairs, pipes and umbilicals all have depth.
  for (const x of [-21, -12]) for (const z of [-5, 5]) box(pad, [.65, 77, .65], [x, 38.5, z], white);
  box(pad, [3, 74, 3], [-20, 38, -2.8], siding);
  for (let y = 5; y <= 68; y += 7) {
    box(pad, [11, .35, 12], [-16.5, y, 0], steel);
    for (const z of [-5, 5]) { beam(pad, [-21, y, z], [-12, y + 7, z], .24, white); beam(pad, [-12, y, z], [-21, y + 7, z], .24, white); }
    for (const x of [-21, -12]) beam(pad, [x, y, -5], [x, y + 7, 5], .24, white);
    for (const z of [-5.7, 5.7]) railing(pad, [-22, y, z], [-11, y, z]);
    railing(pad, [-22, y, -5.7], [-22, y, 5.7]); box(pad, [1.7, .14, .5], [-13, y + 2.7, 5.5], light);
    for (let i = 0; i < 16; i++) box(pad, [1.8, .13, .38], [-14.5, y + i * .42, -3 + i * .37], steel);
    beam(pad, [-13.4, y + 1, -3], [-13.4, y + 7.3, 2.6], .06, orange);
  }
  for (const z of [-3, -1.7, -.4]) pipe(pad, [[-23, 1, z], [-23, 6, z], [-22.5, 70, z]], .2, steel);
  for (const y of [17, 40, 57]) {
    box(serviceArms, [12, .45, 2.2], [-6, y, -2], steel); beam(serviceArms, [-12, y - 3, -2], [-1, y, -2], .25, white);
    for (const z of [-3.15, -.85]) railing(serviceArms, [-12, y, z], [-1.5, y, z]);
    pipe(serviceArms, [[-15, y - 4, -3], [-10, y + .8, -2.7], [-4, y + .8, -2.7], [-1.5, y, -1.6]], .14, orange);
  }
  box(pad, [11, 3.7, 12], [-16.5, 76, 0], siding); box(pad, [11.5, .35, 12.5], [-16.5, 78, 0], white);
  for (const z of [-6.1, 6.1]) railing(pad, [-22, 78.2, z], [-11, 78.2, z]);
  cylinder(pad, .18, 13, [-16.5, 84, 0], steel); cylinder(pad, .35, .4, [-16.5, 90.5, 0], light);
  box(pad, [8, 2, .2], [-16.5, 76.3, 6.05], dark); sign('L A U N C H  0 1', 7.5, 1.3, [-16.5, 76.3, 6.18], pad);
  // Ground piping and tanks: schematic only, no fluid simulation.
  for (let i = 0; i < 4; i++) {
    pipe(root, [[75, 2 + i * .6, -70], [30, 2 + i * .6, -70], [-30, 2 + i * .6, -48], [-25, 3 + i * .6, 5]], .23, i === 2 ? orange : steel);
  }
  for (let j = 0; j < 6; j++) box(root, [.4, 3, 5], [62 - j * 15, 1.5, -70 + Math.max(0, j - 2) * 5], dark);
  for (let i = 0; i < 3; i++) {
    const x = 62 + i * 19, z = -75; cylinder(root, 6.7, 15, [x, 7.5, z], white);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(6.7, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), white); cap.scale.y = .33; cap.position.set(x, 15, z); root.add(cap);
    for (const y of [1.1, 8, 14.5]) cylinder(root, 6.75, .1, [x, y, z], steel);
    for (let j = 0; j < 32; j++) box(root, [1, .07, .15], [x, .5 + j * .46, z + 6.75], steel);
    for (const offset of [-.5, .5]) box(root, [.065, 15, .1], [x + offset, 7.5, z + 6.8], steel);
    sign(`0${i + 1}`, 4, 2, [x, 10, z + 6.78]);
  }
  const waterTower = new THREE.Group(); waterTower.position.set(102, 0, -148); root.add(waterTower);
  for (const x of [-5, 5]) for (const z of [-5, 5]) beam(waterTower, [x * 1.5, 0, z * 1.5], [x, 32, z], .55, white);
  for (let y = 5; y < 30; y += 8) for (const z of [-5, 5]) { beam(waterTower, [-6, y, z], [6, y + 8, z], .2, steel); beam(waterTower, [6, y, z], [-6, y + 8, z], .2, steel); }
  cylinder(waterTower, 7.5, 8, [0, 35, 0], white); cylinder(waterTower, 7.5, 2, [0, 40, 0], white, 5);
  pipe(waterTower, [[0, 34, 0], [0, 1.5, 0], [-25, 1.5, 30]], .8, steel); sign('WATER', 8, 2, [0, 35, 7.6], waterTower);

  const assembly = new THREE.Group(); assembly.position.set(-205, 0, 55); assembly.userData.baseLocation = 'assembly'; root.add(assembly);
  box(assembly, [78, 1, 100], [0, .5, 0], concrete); box(assembly, [72, 34, 90], [0, 18, 0], siding);
  box(assembly, [30, 27, .5], [0, 14.5, 45.4], dark);
  for (let i = -3; i <= 3; i++) box(assembly, [.4, 34, 91], [i * 11, 18, 0], white);
  for (let i = 0; i < 18; i++) box(assembly, [28, .08, .6], [0, 2 + i * 1.45, 45.8], steel);
  box(assembly, [76, 1, 96], [0, 35.5, 0], steel); sign('ORBIT / ASSEMBLY', 39, 5, [0, 31.5, 46], assembly);
  for (const x of [-28, 28]) for (let i = 0; i < 4; i++) box(assembly, [7, 4, .5], [x, 8 + i * 6, 45.6], glass);
  for (let i = 0; i < 8; i++) { box(assembly, [4, 2.5, 7], [-28 + i * 8, 37, -22], dark); box(assembly, [4.4, .3, 7.4], [-28 + i * 8, 38.3, -22], steel); }
  for (const x of [-35, 35]) pipe(assembly, [[x, 34, 45.6], [x, 1, 45.6], [x + 2, .5, 46]], .17, dark);
  const control = new THREE.Group(); control.position.set(-130, 0, 175); control.userData.baseLocation = 'control'; root.add(control);
  box(control, [68, 1, 44], [0, .5, 0], concrete); box(control, [60, 16, 30], [0, 9, 0], siding);
  box(control, [61, 8, .4], [0, 11, 15.3], glass); box(control, [64, 1, 34], [0, 18, 0], white);
  for (let i = -8; i <= 8; i++) box(control, [.2, 8.5, 1], [i * 3.5, 11, 15.5], white);
  for (let i = 0; i < 4; i++) box(control, [64, .15, 2], [0, 8 + i * 2, 16.3], steel);
  cylinder(control, .65, 6, [15, 21, -5], steel);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(4, 32, 16, 0, Math.PI * 2, 0, .9), new THREE.MeshStandardMaterial({ color: '#c8cdd0', side: THREE.DoubleSide, metalness: .4, roughness: .5 })); dish.position.set(15, 25, -5); dish.rotation.z = .65; control.add(dish);
  sign('MISSION CONTROL', 35, 3, [0, 4.3, 15.7], control);
  for (let i = 0; i < 9; i++) box(root, [.14, .03, 10], [-163 + i * 7, .65, 209], white);
  for (let z = -125; z < 260; z += 38) { cylinder(root, .14, 9, [135, 4.5, z], steel); beam(root, [135, 9, z], [132, 9, z], .12); box(root, [1.7, .12, .65], [132, 8.9, z], light); }
  for (let z = -150; z <= 230; z += 10) cylinder(root, .06, 2.4, [146, 1.2, z], steel);
  for (const h of [.6, 1.2, 1.8, 2.4]) beam(root, [146, h, -150], [146, h, 230], .035, steel);

  // Batch opaque detail per material and clickable facility to avoid thousands of draw calls.
  for (const group of [pad, assembly, control, waterTower, root]) {
    const batches = new Map<THREE.Material, THREE.Mesh[]>();
    for (const child of [...group.children]) if (child instanceof THREE.Mesh && !(child instanceof THREE.InstancedMesh) && child.material instanceof THREE.MeshStandardMaterial && !child.material.transparent) {
      const batch = batches.get(child.material) ?? []; batch.push(child); batches.set(child.material, batch);
    }
    for (const [mat, batch] of batches) {
      if (batch.length < 2) continue;
      const parts = batch.map(mesh => { mesh.updateMatrix(); return mesh.geometry.clone().applyMatrix4(mesh.matrix); });
      const merged = mergeGeometries(parts); parts.forEach(g => g.dispose()); if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mat); mesh.castShadow = batch.some(m => m.castShadow); mesh.receiveShadow = true;
      batch.forEach(m => { group.remove(m); m.geometry.dispose(); }); group.add(mesh);
    }
  }
  const hemi = new THREE.HemisphereLight('#b9d5f0', '#565144', .6);
  const sun = new THREE.DirectionalLight('#ffe1b7', 3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -260; sun.shadow.camera.right = 260; sun.shadow.camera.top = 240; sun.shadow.camera.bottom = -240;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 2400; sun.shadow.normalBias = .2; sun.shadow.bias = -.00025;
  sun.target.position.set(-50, 0, 35); root.add(hemi, sun, sun.target);
  return { root, vehicle, setLaunchPose(heightM: number, release: boolean, retract: number) {
    vehicle.root.position.y = 8.1 + heightM;
    clamps.scale.set(release ? 1.65 : 1, release ? .75 : 1, release ? 1.65 : 1);
    // Authored retracting service arms; movement is schematic, not a real launch-complex mechanism.
    serviceArms.position.x = -12 * retract; serviceArms.scale.x = 1 - .65 * retract;
  }, environment: environment.environment, setSkyVisible: environment.setSkyVisible, updateLight(direction: THREE.Vector3, teaching: boolean) {
    const daylight = teaching ? 1 : THREE.MathUtils.smoothstep(direction.y, -.13, .2);
    sun.position.copy(direction).multiplyScalar(1200).add(sun.target.position); sun.intensity = direction.y > 0 ? 3 : .03;
    hemi.intensity = .12 + daylight * .5; environment.updateLight(direction, daylight);
    return new THREE.Color().lerpColors(new THREE.Color('#081321'), new THREE.Color('#a4b4b7'), daylight);
  } };
}
