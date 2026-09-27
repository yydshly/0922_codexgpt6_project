import * as THREE from 'three';

/** Authored coastal scenery, surface textures and clouds; not terrain surveys or live weather. */
export function seededRandom(seed = 41) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

export function surfaceTexture(kind: 'concrete' | 'asphalt' | 'grass' | 'metal') {
  const random = seededRandom();
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!, data = ctx.createImageData(512, 512);
  const base = { concrete: [169, 167, 154], asphalt: [43, 48, 49], grass: [89, 99, 61], metal: [178, 183, 181] }[kind];
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const n = (random() - .5) * (kind === 'grass' ? 36 : 8) + Math.sin(x * .04) * Math.cos(y * .07) * 1.5;
    const rib = kind === 'metal' ? Math.cos(x * Math.PI / 8) * 20 : 0, i = (y * 512 + x) * 4;
    for (let c = 0; c < 3; c++) data.data[i + c] = base[c] + n + rib;
    data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  if (kind === 'concrete') {
    ctx.strokeStyle = '#646c6466'; ctx.lineWidth = 2;
    for (const v of [1, 256, 511]) { ctx.beginPath(); ctx.moveTo(v, 0); ctx.lineTo(v, 512); ctx.moveTo(0, v); ctx.lineTo(512, v); ctx.stroke(); }
    for (let i = 0; i < 20; i++) {
      const x = random() * 512, y = random() * 512, r = 8 + random() * 70;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, '#393e3408'); g.addColorStop(1, '#393e3400');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  const map = new THREE.CanvasTexture(canvas); map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  map.userData.metersPerTile = { concrete: 16, asphalt: 6, metal: 8, grass: 36 }[kind]; return map;
}

const noiseGLSL = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+13.7;a*=.5;}return v;}`;

export function createBaseEnvironment(root: THREE.Group) {
  const coast = (z: number) => 310 + Math.sin(z / 680) * 65 + Math.sin(z / 140) * 9;
  const shape = new THREE.Shape(); shape.moveTo(-12000, -12000); shape.lineTo(coast(-12000), -12000);
  for (let z = -12000; z <= 12000; z += 90) shape.lineTo(coast(z), z);
  shape.lineTo(-12000, 12000); shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape), pos = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 36, pos.getY(i) / 36);
  const land = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: surfaceTexture('grass'), roughness: 1 })); land.rotation.x = -Math.PI / 2; land.position.y = -.35; land.receiveShadow = true; root.add(land);
  const beachShape = new THREE.Shape(); beachShape.moveTo(coast(-12000) - 20, -12000);
  for (let z = -12000; z <= 12000; z += 90) beachShape.lineTo(coast(z) - 20, z);
  for (let z = 12000; z >= -12000; z -= 90) beachShape.lineTo(coast(z) + 14, z);
  beachShape.closePath();
  const beach = new THREE.Mesh(new THREE.ShapeGeometry(beachShape), new THREE.MeshStandardMaterial({ color: '#b6ae8c', roughness: 1 })); beach.rotation.x = -Math.PI / 2; beach.position.y = .03; root.add(beach);
  const water = new THREE.ShaderMaterial({ uniforms: { daylight: { value: 1 } },
    vertexShader: 'varying vec3 world; void main(){world=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}',
    fragmentShader: `${noiseGLSL}
    varying vec3 world; uniform float daylight;
    void main(){float ripples=sin(world.x*.27+noise(world.xz*.08)*4.)*sin(world.z*.16+world.x*.04);
      float d=length(cameraPosition-world);float detail=exp(-d*.0025);
      vec3 c=mix(vec3(.06,.20,.24),vec3(.30,.46,.50),smoothstep(200.,4200.,d));
      c+=pow(max(0.,ripples),9.)*.16*detail;c*=.1+.9*daylight;gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
  // Do not draw a second nearly coplanar surface underneath the entire land patch.
  const seaShape = new THREE.Shape(); seaShape.moveTo(coast(-14000) + 14, -14000);
  for (let z = -14000; z <= 14000; z += 70) seaShape.lineTo(coast(z) + 14, z);
  seaShape.lineTo(14000, 14000); seaShape.lineTo(14000, -14000); seaShape.closePath();
  const sea = new THREE.Mesh(new THREE.ShapeGeometry(seaShape), water); sea.rotation.x = -Math.PI / 2; sea.position.y = -.4; root.add(sea);
  const skyMaterial = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    uniforms: { daylight: { value: 1 }, sun: { value: new THREE.Vector3(-.65, .4, .55).normalize() } },
    vertexShader: 'varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `${noiseGLSL}
    varying vec3 direction; uniform vec3 sun; uniform float daylight;
    void main(){vec3 d=normalize(direction);float h=max(0.,d.y);
      vec3 day=mix(vec3(.63,.70,.71),vec3(.075,.21,.37),pow(h,.38));
      float glow=pow(max(0.,dot(d,normalize(sun))),32.);day+=glow*vec3(.38,.26,.12);
      vec2 p=d.xz/(max(.07,d.y)+.14)*2.6;
      float clouds=smoothstep(.43,.7,fbm(p+vec2(fbm(p*.5)*2.,0.)));
      clouds*=smoothstep(.02,.14,h)*(1.-smoothstep(.78,.98,h));
      day=mix(day,mix(vec3(.47,.54,.58),vec3(.91,.88,.79),smoothstep(.43,.8,fbm(p+vec2(.15,-.22)))),clouds*.88);
      gl_FragColor=vec4(mix(vec3(.003,.009,.02),day,daylight),1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(15000, 32, 16), skyMaterial); root.add(sky);
  const environment = new THREE.Scene(); environment.add(sky.clone());
  const random = seededRandom(145), transform = new THREE.Object3D();
  const canopy = new THREE.IcosahedronGeometry(1, 2), canopyPosition = canopy.getAttribute('position');
  // Deterministic displacement produces clustered irregular silhouettes, rather than smooth balls.
  for (let i = 0; i < canopyPosition.count; i++) {
    const p = new THREE.Vector3().fromBufferAttribute(canopyPosition, i);
    p.multiplyScalar(.86 + .24 * Math.sin(p.x * 15) * Math.sin(p.y * 12) * Math.cos(p.z * 13)); canopyPosition.setXYZ(i, p.x, p.y, p.z);
  }
  canopy.computeVertexNormals();
  const shrubs = new THREE.InstancedMesh(canopy, new THREE.MeshStandardMaterial({ color: '#b6b594', roughness: 1 }), 4800);
  let clusterX = 0, clusterZ = 0;
  for (let i = 0; i < 4800; i++) {
    if (i % 6 === 0) { clusterX = -1100 + random() * 1360; clusterZ = -1300 + random() * 2600; }
    const x = clusterX + (random() - .5) * 14, z = clusterZ + (random() - .5) * 14;
    const excluded = x > -310 && x < 160 && z > -180 && z < 265, scale = excluded ? 0 : 1 + random() * 2.1;
    transform.position.set(x, scale * .43, z); transform.scale.set(scale * 1.4, scale * .55, scale);
    transform.rotation.set(random() * .3, random() * 6.28, .1); transform.updateMatrix(); shrubs.setMatrixAt(i, transform.matrix);
    shrubs.setColorAt(i, new THREE.Color().setHSL(.19 + random() * .055, .16 + random() * .12, .19 + random() * .13));
  }
  shrubs.receiveShadow = true; root.add(shrubs);
  // The launch camera spans metre-scale hardware and a full Earth during ascent.
  for (const material of [water, skyMaterial]) {
    material.vertexShader = '#include <common>\n#include <logdepthbuf_pars_vertex>\n' + material.vertexShader.replace(/}\s*$/, '\n#include <logdepthbuf_vertex>\n}');
    material.fragmentShader = '#include <common>\n#include <logdepthbuf_pars_fragment>\n' + material.fragmentShader.replace('void main(){', 'void main(){\n#include <logdepthbuf_fragment>\n');
  }
  return { environment, setSkyVisible: (visible: boolean) => { sky.visible = visible; }, updateLight(direction: THREE.Vector3, daylight: number) {
    skyMaterial.uniforms.daylight.value = daylight; skyMaterial.uniforms.sun.value.copy(direction); water.uniforms.daylight.value = daylight;
  } };
}
