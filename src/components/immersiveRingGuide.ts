import * as THREE from 'three';
import { bodyById } from '../data/catalog';
import { IMMERSIVE_RING_REGIONS, type RingRegionId } from '../data/immersiveDetails';

/** Annotation overlay only. Its geometry is separate from the physical-looking rings. */
export function createImmersiveRingGuide() {
  const root = new THREE.Group();
  root.name = 'ring-region-annotation';
  const regions = new Map<RingRegionId, THREE.Group>();
  const radius = bodyById.saturn.radiusKm;
  for (const region of IMMERSIVE_RING_REGIONS) {
    const group = new THREE.Group(); group.name = region.id; group.visible = false;
    const inner = region.innerKm / radius, outer = region.outerKm / radius;
    if (region.id !== 'division') {
      const mesh = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 192), new THREE.MeshBasicMaterial({
        color: '#c4e3bb', transparent: true, opacity: .19, side: THREE.DoubleSide, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      }));
      mesh.rotation.x = -Math.PI / 2; mesh.renderOrder = 5; group.add(mesh);
    }
    for (const r of [inner, outer]) {
      const points = Array.from({ length: 257 }, (_, i) => new THREE.Vector3(r * Math.cos(i / 256 * Math.PI * 2), 0, r * Math.sin(i / 256 * Math.PI * 2)));
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineDashedMaterial({ color: '#d8eac5', transparent: true, opacity: .8, dashSize: .045, gapSize: .026, depthWrite: false }));
      line.computeLineDistances(); line.renderOrder = 6; group.add(line);
    }
    group.userData.anchorRadius = (inner + outer) / 2;
    root.add(group); regions.set(region.id, group);
  }
  return {
    root,
    update(id: RingRegionId | null, camera: THREE.PerspectiveCamera, attitude: THREE.Quaternion) {
      for (const [key, group] of regions) group.visible = key === id;
      if (!id) return null;
      const local = camera.position.clone().applyQuaternion(attitude.clone().invert());
      local.y = 0;
      if (local.lengthSq() < 1e-9) local.set(1, 0, 0);
      return local.normalize().multiplyScalar(regions.get(id)!.userData.anchorRadius).applyQuaternion(attitude);
    },
  };
}

/** Hide labels for offscreen anchors or when the opaque unit sphere blocks the sightline. */
export function projectRingAnchor(point: THREE.Vector3, camera: THREE.PerspectiveCamera) {
  const ray = point.clone().sub(camera.position), distance = ray.length(); ray.normalize();
  const along = camera.position.dot(ray), disc = along * along - camera.position.lengthSq() + 1;
  if (disc >= 0) { const hit = -along - Math.sqrt(disc); if (hit > 0 && hit < distance) return null; }
  const ndc = point.clone().project(camera);
  if (Math.abs(ndc.x) > .97 || Math.abs(ndc.y) > .97 || ndc.z < -1 || ndc.z > 1) return null;
  return ndc;
}
