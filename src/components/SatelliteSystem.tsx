import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { bodyById } from '../data/catalog';
import { publicAsset } from '../data/publicAsset';
import { BODY_IDS } from '../types';
import type { BodyDefinition, BodyId, StateFrame, Vec3 } from '../types';
import { makeAtlasMesh, makeDeepStars } from './celestialEffects';
import './SatelliteSystem.css';

/** Parent-centered ECLIPJ2000 state, km and km/s, at frame.time. */
export interface SatelliteBodyState {
  id: string; name: string; radiusKm: number; position: Vec3; velocity: Vec3;
  color: string; appearance: 'rock' | 'ice' | 'volcanic' | 'haze';
  gm?: number;
}
export interface SatelliteSystemProps {
  parentId: BodyId; frame: StateFrame; satellites: SatelliteBodyState[];
  selectedId: string | null; onSelect: (id: string) => void;
  physicalScale: boolean; trajectories: boolean;
}

const KM_PER_UNIT = 20_000;
const RAD = Math.PI / 180;
const ZERO = new THREE.Vector3();

function toScene(v: THREE.Vector3): THREE.Vector3 { return v.set(v.x, v.z, -v.y); }

/** One common distance mapping for bodies and reference curves, never for physics. */
export function satelliteDisplayPosition(position: Vec3, parentRadiusKm: number, physical: boolean): THREE.Vector3 {
  const v = new THREE.Vector3(...position);
  const distance = v.length();
  if (!distance) return v;
  if (physical) return toScene(v).divideScalar(KM_PER_UNIT);
  const ratio = Math.max(1, distance / parentRadiusKm);
  // More room for the bodies when a highly tilted family projects vertically
  // into a short viewport. One radial map still serves both bodies and curves.
  const displayed = parentRadiusKm / KM_PER_UNIT * (1.8 + .78 * Math.log(ratio));
  return toScene(v).multiplyScalar(displayed / distance);
}

export function satelliteRadius(body: SatelliteBodyState, parentRadiusKm: number, physical: boolean): number {
  const physicalRadius = body.radiusKm / KM_PER_UNIT;
  return physical ? physicalRadius : parentRadiusKm / KM_PER_UNIT * .9 * Math.pow(body.radiusKm / parentRadiusKm, .36);
}

/** Perspective fit for actual projected bounds, including the near side of each sphere. */
export function fitSatelliteOverviewDistance(bounds: { position: THREE.Vector3; radius: number }[], view: THREE.Vector3, tanHalfX: number, tanHalfY: number): number {
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), view).normalize();
  if (right.lengthSq() < 1e-12) right.set(1, 0, 0);
  const up = new THREE.Vector3().crossVectors(view, right).normalize();
  const sinX = Math.sin(Math.atan(tanHalfX)), sinY = Math.sin(Math.atan(tanHalfY));
  let distance = 0;
  for (const bound of bounds) {
    const depth = bound.position.dot(view);
    distance = Math.max(distance,
      depth + Math.abs(bound.position.dot(right)) / tanHalfX + bound.radius / sinX,
      depth + Math.abs(bound.position.dot(up)) / tanHalfY + bound.radius / sinY);
  }
  return distance * 1.045;
}

/** Osculating two-body ellipse from the current state. This does not propagate a satellite. */
export function satelliteOrbitPoints(body: SatelliteBodyState, parent: BodyDefinition, physical: boolean): THREE.Vector3[] {
  const r = new THREE.Vector3(...body.position), v = new THREE.Vector3(...body.velocity);
  const radius = r.length(), mu = parent.gm + (body.gm ?? 0);
  if (!(radius > 0) || !(mu > 0)) return [];
  const h = new THREE.Vector3().crossVectors(r, v);
  if (h.lengthSq() < 1e-20) return [];
  const eccentricity = new THREE.Vector3().crossVectors(v, h).divideScalar(mu).sub(r.clone().divideScalar(radius));
  const e = eccentricity.length(), energy = v.lengthSq() / 2 - mu / radius;
  if (!(energy < 0) || !Number.isFinite(e) || e >= .98) return [];
  const p = h.lengthSq() / mu;
  const major = e > 1e-8 ? eccentricity.divideScalar(e) : r.clone().normalize();
  const minor = new THREE.Vector3().crossVectors(h.normalize(), major).normalize();
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 256; i++) {
    const angle = i / 256 * Math.PI * 2;
    const point = major.clone().multiplyScalar(Math.cos(angle)).addScaledVector(minor, Math.sin(angle));
    point.multiplyScalar(p / (1 + e * Math.cos(angle)));
    points.push(satelliteDisplayPosition(point.toArray() as Vec3, parent.radiusKm, physical));
  }
  return points;
}

/** The signed family angular momentum is used only to choose a camera, never to rotate data. */
export function satelliteFamilyNormal(satellites: readonly Pick<SatelliteBodyState, 'position' | 'velocity'>[]): THREE.Vector3 {
  const normal = new THREE.Vector3();
  for (const satellite of satellites) {
    const h = new THREE.Vector3().crossVectors(new THREE.Vector3(...satellite.position), new THREE.Vector3(...satellite.velocity));
    if (h.lengthSq() > 1e-20) normal.add(toScene(h).normalize());
  }
  return normal.lengthSq() > 1e-12 ? normal.normalize() : new THREE.Vector3(0, 1, 0);
}

/** An oblique, sun-facing camera reveals highly tilted families as well as near-polar lighting. */
export function satelliteOverviewDirection(satellites: readonly Pick<SatelliteBodyState, 'position' | 'velocity'>[], sunlight: THREE.Vector3): THREE.Vector3 {
  const normal = satelliteFamilyNormal(satellites);
  const sun = sunlight.clone().normalize();
  const dot = sun.dot(normal);
  // Choose which side to observe, leaving the real orbital direction unchanged.
  if (dot < -.04 || (Math.abs(dot) <= .04 && normal.y < 0)) normal.negate();
  const inPlane = sun.clone().addScaledVector(normal, -sun.dot(normal));
  if (inPlane.lengthSq() < 1e-8) {
    inPlane.set(Math.abs(normal.y) > .8 ? 1 : 0, Math.abs(normal.y) > .8 ? 0 : 1, 0);
    inPlane.addScaledVector(normal, -inPlane.dot(normal));
  }
  return inPlane.normalize().multiplyScalar(.776).addScaledVector(normal, .63).normalize();
}

/** IAU reference attitude: ICRF pole transformed into the agreed ECLIPJ2000 scene axes. */
export function satelliteParentAttitude(body: BodyDefinition, time: number): THREE.Quaternion {
  const alpha = (body.poleRaDeg ?? 0) * RAD, delta = (body.poleDecDeg ?? 90) * RAD;
  const w = ((body.primeMeridianDeg ?? 0) + time / 86400 * (body.rotationRateDegPerDay ?? 8640 / body.rotationHours)) % 360 * RAD;
  const pole = new THREE.Vector3(Math.cos(delta) * Math.cos(alpha), Math.cos(delta) * Math.sin(alpha), Math.sin(delta));
  const q = new THREE.Vector3(-Math.sin(alpha), Math.cos(alpha), 0);
  const u = new THREE.Vector3().crossVectors(pole, q);
  const x = q.clone().multiplyScalar(Math.cos(w)).addScaledVector(u, Math.sin(w));
  const west = q.clone().multiplyScalar(Math.sin(w)).addScaledVector(u, -Math.cos(w));
  const transform = (v: THREE.Vector3) => {
    const eps = 23.439291111 * RAD;
    const y = v.y * Math.cos(eps) + v.z * Math.sin(eps);
    const z = -v.y * Math.sin(eps) + v.z * Math.cos(eps);
    return v.set(v.x, z, -y);
  };
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(transform(x), transform(pole), transform(west)));
}

function orientParent(group: THREE.Group, body: BodyDefinition, time: number) {
  group.quaternion.copy(satelliteParentAttitude(body, time));
}

function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  root.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points || object instanceof THREE.Sprite) {
      if ('geometry' in object) geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    }
  });
  for (const material of materials) {
    for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    if (material instanceof THREE.ShaderMaterial) for (const u of Object.values(material.uniforms)) if (u.value instanceof THREE.Texture) textures.add(u.value);
    material.dispose();
  }
  for (const texture of textures) texture.dispose();
  for (const geometry of geometries) geometry.dispose();
}

interface SatelliteVisual { group: THREE.Group; orbit: THREE.Line; label: HTMLButtonElement; radius: number; extent: number; }

interface LabelAnchor { id: string; x: number; y: number; radius: number; width: number; priority: number; }
/** Deterministic screen-space placement; lower-priority labels hide if no clear slot remains. */
export function layoutSatelliteLabels(anchors: LabelAnchor[], width: number, height: number, safeTop: number) {
  const occupied: { left: number; right: number; top: number; bottom: number }[] = [];
  const result = new Map<string, { x: number; y: number }>();
  for (const anchor of [...anchors].sort((a, b) => b.priority - a.priority)) {
    const radius = Math.min(anchor.radius, width * .3);
    const candidates = [
      [anchor.x + radius + 10, anchor.y], [anchor.x - radius - anchor.width - 10, anchor.y],
      [anchor.x - anchor.width / 2, anchor.y + radius + 19], [anchor.x - anchor.width / 2, anchor.y - radius - 19],
      ...[-28, 28, -56, 56, -84, 84].flatMap(dy => [[anchor.x + radius + 10, anchor.y + dy], [anchor.x - radius - anchor.width - 10, anchor.y + dy]]),
    ];
    for (const [rawX, rawY] of candidates) {
      const x = Math.max(12, Math.min(width - anchor.width - 12, rawX));
      const y = Math.max(safeTop + 12, Math.min(height - 68, rawY));
      if (y + 12 > height - 56 || y - 12 < safeTop) continue;
      const box = { left: x - 4, right: x + anchor.width + 4, top: y - 14, bottom: y + 14 };
      if (occupied.some(other => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top)) continue;
      occupied.push(box); result.set(anchor.id, { x, y }); break;
    }
  }
  return result;
}

/** Authoritative satellite positions are rendered independently from the ten-body integrator. */
export function SatelliteSystem(props: SatelliteSystemProps) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props); latest.current = props;
  const [error, setError] = useState(false);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const parent = bodyById[props.parentId], parentRadius = parent.radiusKm / KM_PER_UNIT;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true }); }
    catch { setError(true); return; }
    setError(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor('#050910');
    renderer.domElement.className = 'satellite-canvas';
    renderer.domElement.setAttribute('aria-label', `${parent.name}卫星系统三维场景，可拖动旋转、滚轮缩放，点击卫星进入近景`);
    element.appendChild(renderer.domElement);
    const labelLayer = document.createElement('div'); labelLayer.className = 'satellite-labels'; element.appendChild(labelLayer);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, .000001, 4000);
    camera.position.set(parentRadius * 3, parentRadius * 2, parentRadius * 5);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = .075;
    controls.enablePan = true; controls.zoomSpeed = .72;
    controls.maxDistance = 600; controls.minDistance = parentRadius * 1.12;
    const stars = makeDeepStars(); scene.add(stars);
    const light = new THREE.DirectionalLight(0xfff0dd, 3.1); scene.add(light, light.target);
    scene.add(new THREE.AmbientLight(0x9bb9dc, .23));
    const parentGroup = new THREE.Group(); scene.add(parentGroup);
    const material = new THREE.MeshStandardMaterial({ color: parent.color, roughness: .89, metalness: 0 });
    const globe = new THREE.Mesh(new THREE.SphereGeometry(parentRadius, 128, 80), material);
    globe.name = parent.id; parentGroup.add(globe);
    let disposed = false;
    const loader = new THREE.TextureLoader();
    if (parent.texture) loader.load(parent.texture, texture => {
      if (disposed) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      material.map = texture; material.color.set(0xffffff); material.needsUpdate = true;
    });
    if (parent.id === 'saturn') {
      const geometry = new THREE.RingGeometry(parentRadius * 1.24, parentRadius * 2.33, 160, 1);
      const positions = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
      for (let i = 0; i < positions.count; i++) {
        const radius = Math.hypot(positions.getX(i), positions.getY(i)) / parentRadius;
        uv.setXY(i, (radius - 1.24) / (2.33 - 1.24), .5);
      }
      const ringMaterial = new THREE.MeshStandardMaterial({ color: 0xdbc9ac, roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: .83, depthWrite: false });
      const ring = new THREE.Mesh(geometry, ringMaterial); ring.rotation.x = -Math.PI / 2; parentGroup.add(ring);
      loader.load(publicAsset('/textures/saturn-ring.png'), texture => {
        if (disposed) { texture.dispose(); return; }
        texture.colorSpace = THREE.SRGBColorSpace; ringMaterial.map = texture;
        // A modest, texture-modulated presentation fill keeps the thin ring legible at grazing sunlight.
        // The same map still supplies its alpha; gaps do not become a solid luminous annulus.
        ringMaterial.emissive.set(0xd9c9ad); ringMaterial.emissiveIntensity = .22; ringMaterial.emissiveMap = texture;
        ringMaterial.needsUpdate = true;
      });
    }
    const parentLabel = document.createElement('span'); parentLabel.className = 'satellite-parent-label';
    parentLabel.textContent = parent.name; labelLayer.appendChild(parentLabel);
    const visuals = new Map<string, SatelliteVisual>();
    let width = 1, height = 1, safeTop = 230, reframe = true, lastSelection: string | null | undefined, lastPhysical: boolean | undefined, lastOrbitTime = NaN;
    const sceneArea = element.parentElement;
    const readSafeArea = () => {
      const viewportTop = element.getBoundingClientRect().top;
      let bottom = 0;
      sceneArea?.querySelectorAll('.scene-top, .view-switcher, .satellite-toolbar').forEach(control => {
        const rect = control.getBoundingClientRect();
        if (rect.width && rect.height) bottom = Math.max(bottom, rect.bottom - viewportTop);
      });
      safeTop = Math.min(height - 120, Math.max(18, bottom ? bottom + 18 : 230));
      camera.setViewOffset(width, height, 0, -(safeTop - 54) / 2, width, height);
    };
    const resize = new ResizeObserver(() => {
      width = element.clientWidth; height = element.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height); camera.aspect = width / height; readSafeArea(); camera.updateProjectionMatrix();
      reframe = true;
    }); resize.observe(element);
    sceneArea?.querySelectorAll('.scene-top, .view-switcher, .satellite-toolbar').forEach(control => resize.observe(control));
    const sunDirection = new THREE.Vector3(1, .4, .4), normal = new THREE.Vector3(0, 1, 0), followPosition = new THREE.Vector3();
    const lastFollowPosition = new THREE.Vector3();
    const tmp = new THREE.Vector3(), projected = new THREE.Vector3();
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
    let downX = 0, downY = 0;
    const pointerDown = (event: PointerEvent) => { downX = event.clientX; downY = event.clientY; };
    const pointerUp = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - downX, event.clientY - downY) > 5) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      // Include the opaque planet so clicking through it cannot select a hidden moon.
      const hit = raycaster.intersectObjects([globe, ...[...visuals.values()].map(v => v.group)], true)[0];
      if (hit) { let object: THREE.Object3D | null = hit.object; while (object && !object.userData.satelliteId) object = object.parent; if (object) latest.current.onSelect(object.userData.satelliteId as string); }
    };
    renderer.domElement.addEventListener('pointerdown', pointerDown);
    renderer.domElement.addEventListener('pointerup', pointerUp);
    const clock = new THREE.Clock(); let raf = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const current = latest.current;
      if (!current.satellites.length) {
        // A missing month is a loading gap, not removal of the system. Preserve controls/resources.
        for (const visual of visuals.values()) { visual.group.visible = false; visual.orbit.visible = false; visual.label.style.display = 'none'; }
        parentLabel.style.display = 'none';
        orientParent(parentGroup, parent, current.frame.time);
        controls.update(Math.min(clock.getDelta(), .05)); stars.position.copy(camera.position); renderer.render(scene, camera);
        return;
      }
      const changedScale = current.physicalScale !== lastPhysical;
      const changedSelection = current.selectedId !== lastSelection;
      if (changedScale || changedSelection) reframe = true;
      const active = new Set(current.satellites.map(s => s.id));
      for (const [id, visual] of visuals) if (!active.has(id)) {
        scene.remove(visual.group, visual.orbit); disposeObject(visual.group); disposeObject(visual.orbit); visual.label.remove(); visuals.delete(id); reframe = true;
      }
      const parentIndex = BODY_IDS.indexOf(parent.id) * 3;
      sunDirection.set(current.frame.positions[0] - current.frame.positions[parentIndex], current.frame.positions[1] - current.frame.positions[parentIndex + 1], current.frame.positions[2] - current.frame.positions[parentIndex + 2]);
      toScene(sunDirection).normalize();
      light.position.copy(sunDirection).multiplyScalar(100); light.target.position.set(0, 0, 0);
      orientParent(parentGroup, parent, current.frame.time);
      normal.copy(satelliteFamilyNormal(current.satellites));
      const refreshOrbit = changedScale || !Number.isFinite(lastOrbitTime) || Math.abs(current.frame.time - lastOrbitTime) > 120;
      let extent = parentRadius * (parent.id === 'saturn' ? 2.5 : 1.15);
      for (const satellite of current.satellites) {
        let visual = visuals.get(satellite.id);
        let newVisual = false;
        if (!visual) {
          const group = makeAtlasMesh(satellite); group.userData.satelliteId = satellite.id;
          const bound = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
          const geometryExtent = Math.max(bound.x, bound.y, bound.z) / 2;
          const orbit = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: satellite.color, transparent: true, opacity: .23, depthWrite: false }));
          const label = document.createElement('button'); label.type = 'button'; label.className = 'satellite-label'; label.textContent = satellite.name;
          label.style.setProperty('--satellite-color', satellite.color);
          label.onclick = () => latest.current.onSelect(satellite.id); labelLayer.appendChild(label);
          scene.add(group, orbit); visual = { group, orbit, label, radius: 0, extent: geometryExtent }; visuals.set(satellite.id, visual); newVisual = true; reframe = true;
        }
        visual.radius = satelliteRadius(satellite, parent.radiusKm, current.physicalScale);
        visual.group.visible = true;
        visual.group.scale.setScalar(visual.radius);
        visual.group.position.copy(satelliteDisplayPosition(satellite.position, parent.radiusKm, current.physicalScale));
        // Synchronous-facing illustration; detailed libration and measured shape models are not included.
        const x = new THREE.Vector3(...satellite.position).normalize().negate();
        const y = new THREE.Vector3().crossVectors(new THREE.Vector3(...satellite.position), new THREE.Vector3(...satellite.velocity)).normalize();
        const z = new THREE.Vector3().crossVectors(x, y).normalize();
        visual.group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(toScene(x), toScene(y), toScene(z)));
        visual.orbit.visible = current.trajectories;
        if (refreshOrbit || newVisual) {
          visual.orbit.geometry.dispose(); visual.orbit.geometry = new THREE.BufferGeometry().setFromPoints(satelliteOrbitPoints(satellite, parent, current.physicalScale));
        }
        visual.label.classList.toggle('is-selected', satellite.id === current.selectedId);
        extent = Math.max(extent, visual.group.position.length() + visual.radius * 1.5);
      }
      if (refreshOrbit) lastOrbitTime = current.frame.time;
      const selection = current.selectedId ? visuals.get(current.selectedId) : undefined;
      followPosition.copy(selection ? selection.group.position : ZERO);
      if (reframe && width > 1 && height > 1) {
        readSafeArea();
        const view = selection ? sunDirection.clone().addScaledVector(normal, .18).normalize() : satelliteOverviewDirection(current.satellites, sunDirection);
        const fullHalfFov = THREE.MathUtils.degToRad(camera.fov / 2);
        const usableHeight = Math.max(100, height - safeTop - 54);
        const halfFov = Math.min(Math.atan(Math.tan(fullHalfFov) * usableHeight / height), Math.atan(Math.tan(fullHalfFov) * camera.aspect * .90));
        const fitRadius = selection ? selection.radius * selection.extent * 1.32 : extent * 1.12;
        let distance = fitRadius / Math.sin(halfFov);
        if (!selection && !current.physicalScale) {
          // Fit the tilted family without turning its real orbital plane into a horizontal ring.
          const bounds = [{ position: ZERO, radius: parentRadius * (parent.id === 'saturn' ? 2.33 : 1) }];
          for (const visual of visuals.values()) {
            const radius = visual.radius * visual.extent;
            bounds.push({ position: visual.group.position, radius });
            const attribute = visual.orbit.geometry.getAttribute('position');
            // Fit a complete revolution, rather than zooming around only the current moon positions.
            if (attribute) for (let i = 0; i < attribute.count; i++) bounds.push({ position: new THREE.Vector3().fromBufferAttribute(attribute, i), radius });
          }
          distance = fitSatelliteOverviewDistance(bounds, view, Math.tan(fullHalfFov) * camera.aspect * .90, Math.tan(fullHalfFov) * usableHeight / height);
        }
        controls.target.copy(followPosition); camera.position.copy(followPosition).addScaledVector(view, distance);
        controls.minDistance = selection ? selection.radius * selection.extent * 1.22 : parentRadius * 1.12;
        controls.maxDistance = Math.max(600, extent * 12);
        camera.near = Math.max(1e-8, (selection ? selection.radius : parentRadius) * .008);
        camera.far = Math.max(4000, extent * 40); camera.updateProjectionMatrix();
        lastFollowPosition.copy(followPosition); controls.update(); reframe = false;
      } else if (selection) {
        tmp.copy(followPosition).sub(lastFollowPosition); camera.position.add(tmp); controls.target.add(tmp); lastFollowPosition.copy(followPosition);
      }
      controls.update(Math.min(clock.getDelta(), .05));
      // Keep the camera outside visible solids even after panning away from its target.
      const keepOutside = (center: THREE.Vector3, radius: number) => {
        tmp.copy(camera.position).sub(center); const distance = tmp.length();
        if (distance < radius) camera.position.copy(center).add(tmp.lengthSq() ? tmp.setLength(radius) : new THREE.Vector3(0, 0, radius));
      };
      keepOutside(ZERO, parentRadius * 1.04);
      for (const visual of visuals.values()) keepOutside(visual.group.position, visual.radius * visual.extent * 1.08);
      camera.updateMatrixWorld();
      stars.position.copy(camera.position);
      const labelAnchors: LabelAnchor[] = [];
      const labels = new Map<string, HTMLElement>();
      const considerLabel = (id: string, label: HTMLElement, position: THREE.Vector3, radius: number, selected: boolean) => {
        projected.copy(position).project(camera);
        let occluded = false;
        if (position !== ZERO) {
          // Hide a moon's label when its center is occulted by the parent globe.
          tmp.copy(position).sub(camera.position);
          const along = -camera.position.dot(tmp) / tmp.lengthSq();
          if (along > 0 && along < 1) occluded = camera.position.clone().addScaledVector(tmp, along).length() < parentRadius;
        }
        const visible = !occluded && projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < .96 && Math.abs(projected.y) < .92;
        label.style.display = 'none';
        if (!visible) return;
        const pixelRadius = radius / Math.max(camera.position.distanceTo(position), radius) * height / (2 * Math.tan(camera.fov * RAD / 2));
        const x = (projected.x * .5 + .5) * width, y = (-projected.y * .5 + .5) * height;
        // Labels only annotate the clear observation area; the toolbar owns the space above it.
        if (y + pixelRadius < safeTop || y - pixelRadius > height - 54) return;
        labelAnchors.push({ id, x, y, radius: pixelRadius, width: Math.max(48, (label.textContent?.length ?? 3) * 10 + 20), priority: selected ? 10 : id === 'parent' ? 0 : 2 });
        labels.set(id, label);
      };
      considerLabel('parent', parentLabel, ZERO, parentRadius, false);
      for (const [id, visual] of visuals) considerLabel(id, visual.label, visual.group.position, visual.radius * visual.extent, id === current.selectedId);
      for (const [id, position] of layoutSatelliteLabels(labelAnchors, width, height, safeTop)) {
        const label = labels.get(id)!; label.style.display = 'block'; label.style.left = `${position.x}px`; label.style.top = `${position.y}px`;
      }
      renderer.render(scene, camera);
      lastSelection = current.selectedId; lastPhysical = current.physicalScale;
    };
    animate();
    return () => {
      disposed = true; cancelAnimationFrame(raf); resize.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointerup', pointerUp);
      disposeObject(scene); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); labelLayer.remove();
    };
  }, [props.parentId]);

  return <div className="satellite-viewport" ref={host}>
    <div className="satellite-scene-caption">
      <span>{props.physicalScale ? '真实距离与半径比例' : '距离压缩 · 卫星适度放大'} · 拖动环视，滚轮靠近</span>
      <span>{props.trajectories ? '轨道线为瞬时二体参考 · ' : ''}卫星表面与姿态为示意</span>
    </div>
    {error && <div className="satellite-render-error" role="alert">当前设备无法显示三维场景，仍可查看卫星资料和真实参数。</div>}
  </div>;
}
