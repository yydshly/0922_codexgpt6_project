import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CosmicLevelId } from '../data/cosmicContext';

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => { value ^= value << 13; value ^= value >>> 17; value ^= value << 5; return (value >>> 0) / 4294967296; };
}

function pointField(count: number, makePoint: (next: () => number, index: number) => THREE.Vector3, seed: number) {
  const next = seeded(seed), positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const point = makePoint(next, i);
    positions[i * 3] = point.x; positions[i * 3 + 1] = point.y; positions[i * 3 + 2] = point.z;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geometry;
}

function glow(scene: THREE.Scene, location: [number, number, number], color: string, radius: number) {
  const at = new THREE.Vector3(...location);
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 12), new THREE.MeshBasicMaterial({ color })));
  const core = scene.children[scene.children.length - 1]; core.position.copy(at);
  for (let i = 1; i <= 2; i++) {
    const halo = new THREE.Mesh(new THREE.SphereGeometry(radius * (1.7 + i), 18, 12), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .08 / i, depthWrite: false }));
    halo.position.copy(at); scene.add(halo);
  }
}

function label(scene: THREE.Scene, text: string, location: [number, number, number], width = 2.6) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const context = canvas.getContext('2d'); if (!context) return;
  context.fillStyle = 'rgba(9, 25, 35, .78)'; context.fillRect(0, 17, 512, 92);
  context.strokeStyle = 'rgba(124, 177, 188, .45)'; context.lineWidth = 3; context.strokeRect(2, 19, 508, 88);
  context.fillStyle = '#d9eaf0'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.font = '38px sans-serif'; context.fillText(text, 256, 64);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.position.set(...location); sprite.scale.set(width, width / 4, 1); sprite.renderOrder = 10; scene.add(sprite);
}

function galaxy(scene: THREE.Scene, center: [number, number, number], size: number, color: string, seed: number, count: number) {
  const points = new THREE.Points(pointField(count, (next, i) => {
    const radius = .2 + Math.pow(next(), .55) * size;
    const arm = i % 3;
    const phase = arm * Math.PI * 2 / 3 + radius / size * 5.4 + (next() - .5) * .7;
    return new THREE.Vector3(center[0] + Math.cos(phase) * radius, center[1] + (next() - .5) * (.14 + radius / size * .48), center[2] + Math.sin(phase) * radius);
  }, seed), new THREE.PointsMaterial({ color, size: .042 * Math.max(.8, size / 6), transparent: true, opacity: .69, depthWrite: false }));
  scene.add(points);
  glow(scene, center, color, .12 * size);
}

export function CosmicCanvas({ level,active=true }: { level: CosmicLevelId;active?:boolean }) {
  const activeRef=useRef(active);activeRef.current=active;
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
    catch { element.textContent = '当前浏览器无法创建三维场景，请查看右侧的来源说明。'; return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#071019');
    const camera = new THREE.PerspectiveCamera(45, 1, .03, 170);
    camera.position.set(10, 8, 15);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = .07; controls.minDistance = 4; controls.maxDistance = 45;
    scene.add(new THREE.Points(pointField(450, next => {
      const azimuth = next() * Math.PI * 2, elevation = Math.asin(next() * 2 - 1), distance = 50 + next() * 18;
      return new THREE.Vector3(Math.cos(elevation) * Math.cos(azimuth) * distance, Math.sin(elevation) * distance, Math.cos(elevation) * Math.sin(azimuth) * distance);
    }, 122806), new THREE.PointsMaterial({ color: '#95b8cc', size: .12, transparent: true, opacity: .44, depthWrite: false })));

    if (level === 'neighbors') {
      glow(scene, [-5.7, .1, .1], '#ffdd9a', .45); // Sun
      glow(scene, [0, .8, -2.7], '#f39782', .27); // Proxima
      glow(scene, [1.1, -.55, .8], '#ffe3b5', .36); // Alpha Cen A/B marker
      glow(scene, [4.9, .35, -1], '#df8c76', .26); // TRAPPIST-1
      label(scene, '太阳系', [-5.7, 1.15, .1]);
      label(scene, '比邻星', [0, 1.8, -2.7]);
      label(scene, '半人马座 α A/B', [1.1, .45, .8], 3.3);
      label(scene, 'TRAPPIST-1', [4.9, 1.4, -1], 3.1);
      for (const [location, color] of [[[-5.7, .1, .1], '#86b9d2'], [[4.9, .35, -1], '#cb9b8b']] as const) {
        for (const radius of [.85, 1.16, 1.55]) {
          const vertices = Array.from({ length: 90 }, (_, i) => new THREE.Vector3(location[0] + Math.cos(i / 90 * Math.PI * 2) * radius, location[1], location[2] + Math.sin(i / 90 * Math.PI * 2) * radius));
          scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(vertices), new THREE.LineBasicMaterial({ color, transparent: true, opacity: .2 })));
        }
      }
      camera.position.set(13, 10, 24);
    } else if (level === 'milkyway') {
      galaxy(scene, [0, 0, 0], 9.2, '#a7c5de', 41172, 7800);
      glow(scene, [6.1, .13, 1.3], '#ffe1a2', .11);
      label(scene, '银河系中心', [0, 1.6, 0]);
      label(scene, '太阳系所在区域', [6.1, 1.2, 1.3], 3.3);
      scene.add(new THREE.Points(pointField(1200, next => {
        const r = 7 + next() * 2.2, theta = -.8 + next() * 1.3;
        return new THREE.Vector3(Math.cos(theta) * r, (next() - .5) * .55, Math.sin(theta) * r);
      }, 9290), new THREE.PointsMaterial({ color: '#8ccfdf', size: .05, transparent: true, opacity: .32, depthWrite: false })));
      camera.position.set(18, 13, 25);
    } else {
      galaxy(scene, [-4.8, 0, .5], 3.2, '#9ccbe2', 4033, 2900); // Milky Way
      galaxy(scene, [-.1, -1.15, 2.3], 1.05, '#9fb7eb', 8324, 850); // LMC
      galaxy(scene, [6.1, 0, -1], 3.9, '#ddbddf', 52811, 3600); // M31
      label(scene, '银河系', [-4.8, 1.6, .5]);
      label(scene, '大麦哲伦云', [-.1, .25, 2.3], 3);
      label(scene, '仙女座星系', [6.1, 1.9, -1], 3);
      camera.position.set(16, 10, 28);
    }
    controls.target.set(0, 0, 0); controls.update();
    const resize = () => {
      const width = element.clientWidth, height = element.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    let handle = 0, last = 0;
    const render = (now: number) => { handle = requestAnimationFrame(render); if(!activeRef.current){last=now;return;} if (now - last < 30) return; last = now; controls.update(); renderer.render(scene, camera); };
    handle = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(handle); observer.disconnect(); controls.dispose();
      scene.traverse(object => { if (object instanceof THREE.Sprite) { object.material.map?.dispose(); object.material.dispose(); } else if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) { object.geometry.dispose(); const material = object.material; (Array.isArray(material) ? material : [material]).forEach(item => item.dispose()); } });
      renderer.dispose(); renderer.domElement.remove();
    };
  }, [level]);
  return <div ref={host} className="macro-canvas" role="img" aria-label="可拖动旋转的宇宙邻域三维结构示意，方位与大小不是真实星图"/>;
}
