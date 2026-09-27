import * as THREE from 'three';
import { baseBasis, fixedToLocal } from './coordinates';
import { airVelocity, add, scale, rotateEarth } from './ascent';
import type { FlightState } from './liftoff';
import { ENVIRONMENT_EXAMPLES, SPACE_OBJECT_KINDS, examplePosition, type EnvironmentOptions, type SpaceObjectKind } from './flightEnvironment';

/** Schematic overlays share the flight clock but never feed back into the dynamics. */
export function createAscentEnvironmentView() {
  const root = new THREE.Group(), objects = new THREE.Group(), clouds = new THREE.Group(), flow = new THREE.Group(); root.add(objects, clouds, flow);
  const basis = baseBasis(), localDirection = (v: THREE.Vector3) => new THREE.Vector3(v.dot(basis.east), v.dot(basis.up), v.dot(basis.south));
  const markerMaterial = new THREE.ShaderMaterial({
    vertexColors: true, transparent: true, depthWrite: false,
    vertexShader: `varying vec3 vColor;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main(){vColor=color;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;gl_PointSize=7.;
      #include <logdepthbuf_vertex>
      }`,
    fragmentShader: `varying vec3 vColor;
      #include <common>
      #include <logdepthbuf_pars_fragment>
      void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(vColor,1.-smoothstep(.55,1.,r));
      #include <logdepthbuf_fragment>
      }`,
  });
  const pointPositions = new Float32Array(ENVIRONMENT_EXAMPLES.length * 3), colors = new Float32Array(pointPositions.length);
  ENVIRONMENT_EXAMPLES.forEach((item, i) => new THREE.Color(SPACE_OBJECT_KINDS.find(k => k.id === item.kind)!.color).toArray(colors, i * 3));
  const points = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pointPositions, 3)).setAttribute('color', new THREE.BufferAttribute(colors, 3)), markerMaterial); points.frustumCulled = false; objects.add(points);
  const paths = SPACE_OBJECT_KINDS.map(kind => {
    const sample = ENVIRONMENT_EXAMPLES.find(item => item.kind === kind.id)!;
    const path = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(193 * 3), 3)), new THREE.LineBasicMaterial({ color: kind.color, transparent: true, opacity: .2 })); path.frustumCulled = false; objects.add(path); return { path, sample };
  });
  const flowPositions = new Float32Array(32 * 6), stream = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(flowPositions, 3)), new THREE.LineBasicMaterial({ color: '#80cde0', transparent: true, opacity: .3, depthWrite: false })); stream.frustumCulled = false; flow.add(stream);
  const drag = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(10, 20, 0), 8, '#efb373', 3, 1.8); flow.add(drag);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d')!;
  for (let i = 0; i < 18; i++) {
    const x = 48 + (i * 73 % 165), y = 85 + (i * 41 % 90), radius = 27 + i % 4 * 8;
    const gradient = context.createRadialGradient(x, y, 1, x, y, radius);
    gradient.addColorStop(0, 'rgba(235,243,248,0.85)'); gradient.addColorStop(.45, 'rgba(226,237,245,0.6)'); gradient.addColorStop(1, 'rgba(215,233,242,0)'); context.fillStyle = gradient; context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  const cloudMap = new THREE.CanvasTexture(canvas); cloudMap.colorSpace = THREE.SRGBColorSpace;
  const cloudAnchors: THREE.Vector3[] = [];
  for (let i = 0; i < 32; i++) {
    const cloud = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudMap, transparent: true, opacity: .65, depthWrite: false }));
    const x = i < 8 ? -750 + i * 400 : (i * 4127 % 24000) - 12000, z = i < 8 ? -450 + i % 3 * 450 : (i * 7103 % 16000) - 8000;
    cloudAnchors.push(new THREE.Vector3(x, 1900 + (i % 4) * 650, z)); cloud.scale.set(2800 + i % 3 * 500, 1400, 1); clouds.add(cloud);
  }
  let lastTime = NaN, lastKind: SpaceObjectKind | 'all' = 'all';
  return { root, update(state: FlightState, options: EnvironmentOptions, overview: boolean, selectedKind: SpaceObjectKind | 'all') {
    const a = state.ascent!, origin = fixedToLocal(new THREE.Vector3(...a.fixedPosition));
    objects.visible = overview && options.objects;
    if (objects.visible && (lastTime !== state.time || lastKind !== selectedKind)) {
      ENVIRONMENT_EXAMPLES.forEach((item, i) => {
        const p = fixedToLocal(new THREE.Vector3(...examplePosition(item, state.time))).sub(origin);
        // Unselected categories become faint, not a different physical position.
        p.toArray(pointPositions, i * 3); new THREE.Color(SPACE_OBJECT_KINDS.find(k => k.id === item.kind)!.color).multiplyScalar(selectedKind === 'all' || selectedKind === item.kind ? 1 : .15).toArray(colors, i * 3);
      });
      points.geometry.attributes.position.needsUpdate = points.geometry.attributes.color.needsUpdate = true;
      for (const { path, sample } of paths) {
        const array = path.geometry.attributes.position.array as Float32Array;
        for (let j = 0; j <= 192; j++) {
          const p = sample.kind === 'meteoroid' ? examplePosition(sample, -300 + j / 192 * 600) : examplePosition({ ...sample, phase: j / 192 * Math.PI * 2 }, state.time);
          fixedToLocal(new THREE.Vector3(...p)).sub(origin).toArray(array, j * 3);
        }
        path.geometry.attributes.position.needsUpdate = true; path.material.opacity = selectedKind === 'all' || selectedKind === sample.kind ? .22 : .04;
      }
      lastTime = state.time; lastKind = selectedKind;
    }
    clouds.visible = options.clouds && a.altitudeM < 18000 && !overview;
    clouds.children.forEach((cloud, i) => cloud.position.copy(cloudAnchors[i]).sub(origin));
    const air = rotateEarth(add(a.velocity, scale(airVelocity(a.position), -1)), -state.time), flowDirection = localDirection(new THREE.Vector3(...air)).normalize();
    flow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), flowDirection); flow.position.set(0, 25, 0);
    flow.visible = options.airflow && !overview && a.altitudeM < 80000 && a.airSpeedMS > 1;
    stream.material.opacity = .45 * Math.sqrt(Math.max(0, a.density) / 1.225);
    for (let i = 0; i < 32; i++) {
      const angle = i * 2.4, radius = 10 + i % 5 * 7, y = ((i * 17.17 - state.time * Math.min(80, a.airSpeedMS * .04)) % 180 + 180) % 180 - 70;
      const index = i * 6; flowPositions.set([Math.cos(angle) * radius, y, Math.sin(angle) * radius, Math.cos(angle) * radius, y - 3 - Math.min(16, a.airSpeedMS * .018), Math.sin(angle) * radius], index);
    }
    stream.geometry.attributes.position.needsUpdate = true;
    drag.visible = state.dragN > 50; drag.setLength(8 + Math.min(28, state.dragN / 2500), 3, 1.8);
    return { origin };
  } };
}
