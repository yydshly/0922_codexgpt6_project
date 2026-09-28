import * as THREE from 'three';
/** A false-colour flow envelope in the relative-air frame, not a plasma solver. */
export function createReentryEffect() {
  const root = new THREE.Group(); root.visible = false;
  const material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { strength: { value: 0 } },
    vertexShader: `varying vec2 uv0;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main(){uv0=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      #include <logdepthbuf_vertex>
      }`,
    fragmentShader: `uniform float strength; varying vec2 uv0;
      #include <common>
      #include <logdepthbuf_pars_fragment>
      void main(){float front=pow(sin(uv0.y*1.5707963),8.0);vec3 c=mix(vec3(.9,.19,.035),vec3(1.,.76,.33),front);gl_FragColor=vec4(c,strength*(.012+.3*front));
      #include <logdepthbuf_fragment>
      }` });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(20, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), material); root.add(cap);
  const points: THREE.Vector3[] = [];
  for (let n = 0; n < 10; n++) { const angle = n / 10 * Math.PI * 2; for (let i = 0; i < 15; i++) { const point = (t: number) => { const radius = 20 + t * 3; return new THREE.Vector3(Math.cos(angle) * radius, -t * 27, Math.sin(angle) * radius); }; points.push(point(i / 15), point((i + 1) / 15)); } }
  const lines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: '#ffc090', transparent: true, opacity: 0, depthWrite: false })); root.add(lines);
  return { root, update(center: THREE.Vector3, relativeDirection: THREE.Vector3, heatFluxWm2: number | null, visible: boolean) {
    root.position.copy(center); root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), relativeDirection);
    root.visible = visible && heatFluxWm2 !== null && heatFluxWm2 > 0;
    const strength = heatFluxWm2 === null ? 0 : Math.min(1, Math.sqrt(heatFluxWm2 / 450000));
    material.uniforms.strength.value = strength; lines.material.opacity = .48 * strength;
  } };
}
