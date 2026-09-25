import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { AtlasBody } from '../data/atlas';
import { makeAtlasMesh, makeDeepStars } from './celestialEffects';

/** Separate illustrative viewer: never supplies state to the physical simulation. */
export function AtlasPreview({ body }: { body: AtlasBody }) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  useLayoutEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true }); }
    catch { setError(true); return; }
    setError(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;cursor:grab';
    renderer.domElement.setAttribute('aria-label', `${body.name}的三维外观示意，可拖动旋转`);
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, .01, 1000);
    camera.position.set(0, .25, 4.6);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 1.65; controls.maxDistance = 8;
    controls.autoRotate = true; controls.autoRotateSpeed = .35;
    const globe = makeAtlasMesh(body); scene.add(globe);
    const light = new THREE.DirectionalLight(0xffeedc, 3); light.position.set(-3, 2, 4); scene.add(light);
    scene.add(new THREE.AmbientLight(0xb9d4ff, .38));
    const stars = makeDeepStars(); scene.add(stars);
    const resize = new ResizeObserver(() => {
      const width = element.clientWidth, height = element.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
    }); resize.observe(element);
    const clock = new THREE.Clock();
    let raf = 0;
    const animate = () => { raf = requestAnimationFrame(animate); controls.update(Math.min(clock.getDelta(), .05)); stars.position.copy(camera.position); renderer.render(scene, camera); };
    animate();
    return () => {
      cancelAnimationFrame(raf); resize.disconnect(); controls.dispose();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line || object instanceof THREE.Sprite) {
          if ('geometry' in object) object.geometry?.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => {
            Object.values(material).forEach(value => { if (value instanceof THREE.Texture) value.dispose(); });
            if (material instanceof THREE.ShaderMaterial) Object.values(material.uniforms).forEach(u => { if (u.value instanceof THREE.Texture) u.value.dispose(); });
            material.dispose();
          });
        }
      });
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }, [body]);
  return <div ref={host} className="atlas-three-preview" style={{ position: 'relative', width: '100%', height: '100%', minHeight: 230 }}>
    {error && <p role="alert">当前设备无法显示 3D 外观，仍可阅读天体资料。</p>}
  </div>;
}
