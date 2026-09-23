import * as THREE from 'three';

/** Procedural appearances below are illustrative, not reconstructed observations. */
const noiseGLSL = `
float ceHash(vec3 p) {
  p = fract(p * .3183099 + vec3(.11, .23, .37));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float ceNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(ceHash(i), ceHash(i+vec3(1,0,0)), f.x),
                 mix(ceHash(i+vec3(0,1,0)), ceHash(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(ceHash(i+vec3(0,0,1)), ceHash(i+vec3(1,0,1)), f.x),
                 mix(ceHash(i+vec3(0,1,1)), ceHash(i+vec3(1,1,1)), f.x), f.y), f.z);
}
float ceFbm(vec3 p) {
  float value = 0.0, weight = .55;
  for (int i=0; i<4; i++) {
    value += weight * ceNoise(p);
    p = p * 2.07 + vec3(4.2, 1.7, 9.2);
    weight *= .48;
  }
  return value;
}
`;

const shellVertex = `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vCeLocal;
varying vec3 vCeNormal;
varying vec3 vCeWorld;
void main() {
  vCeLocal = normalize(position);
  vCeNormal = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vCeWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
  #include <logdepthbuf_vertex>
}
`;

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Unit solar radius; attach to the existing Sun group, alongside its photosphere. */
export function makeSunAtmosphere(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Illustrative solar corona and prominences';
  group.userData.illustrative = true;
  const corona = new THREE.ShaderMaterial({
    uniforms: { uCeTime: { value: 0 }, uCeRadius: { value: 1.42 } },
    vertexShader: shellVertex,
    fragmentShader: `
      #include <common>
      #include <logdepthbuf_pars_fragment>
      uniform float uCeTime;
      uniform float uCeRadius;
      varying vec3 vCeLocal;
      varying vec3 vCeNormal;
      varying vec3 vCeWorld;
      ${noiseGLSL}
      void main() {
        #include <logdepthbuf_fragment>
        vec3 viewDirection = normalize(cameraPosition - vCeWorld);
        float facing = abs(dot(normalize(vCeNormal), viewDirection));
        float projectedRadius = uCeRadius * sqrt(max(0.0, 1.0-facing*facing));
        float height = max(projectedRadius - 1.0, 0.0);
        vec3 p = vCeLocal * vec3(12.0, 17.0, 12.0);
        float flow = ceFbm(p + vec3(uCeTime*.022, -uCeTime*.055, uCeTime*.012));
        float fine = ceNoise(p*3.1 + flow*2.5 - uCeTime*.07);
        float filaments = .35 + .65 * smoothstep(.30,.72,flow*.75+fine*.25);
        float fade = exp(-height*10.5) * (1.0-smoothstep(1.17,1.42,projectedRadius));
        float inner = smoothstep(.96,1.012,projectedRadius);
        float alpha = fade * inner * filaments * .60;
        vec3 light = mix(vec3(1.7,.18,.013),vec3(2.5,.79,.18),exp(-height*16.0));
        gl_FragColor = vec4(light, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.BackSide,
  });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1.42, 64, 40), corona);
  shell.name = 'Turbulent corona';
  shell.renderOrder = 2;
  group.add(shell);

  const arcs: { material: THREE.MeshBasicMaterial; base: number; phase: number }[] = [];
  for (let arc = 0; arc < 5; arc++) {
    const longitude = arc * 1.23 + .42, latitude = Math.sin(arc * 2.13) * .62;
    const outward = new THREE.Vector3(Math.cos(latitude)*Math.cos(longitude), Math.sin(latitude), Math.cos(latitude)*Math.sin(longitude));
    const tangent = new THREE.Vector3().crossVectors(outward, new THREE.Vector3(0,1,0)).normalize();
    const width = .09 + (arc % 3) * .024, height = .11 + (arc % 2) * .045;
    const points: THREE.Vector3[] = [];
    for (let j=0; j<=40; j++) {
      const angle = Math.PI * j / 40, lateral = Math.cos(angle) * width;
      const elevation = Math.sqrt(1-lateral*lateral) + Math.sin(angle)*height;
      points.push(outward.clone().multiplyScalar(elevation).addScaledVector(tangent,lateral));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    for (const [radius, opacity] of [[.0045,.65],[.014,.085]]) {
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setRGB(2.6,.24,.025), transparent: true,
        opacity, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, radius, 5, false), material);
      mesh.name = 'Illustrative prominence';
      mesh.renderOrder = 3;
      group.add(mesh);
      arcs.push({ material, base: opacity, phase: arc * 1.7 });
    }
  }
  group.userData.coronaMaterial = corona;
  group.userData.prominenceMaterials = arcs;
  return group;
}

/** visualTime is elapsed visual seconds; dynamics remain entirely independent. */
export function updateSunAtmosphere(group: THREE.Group, visualTime: number): void {
  const time = Number.isFinite(visualTime) ? visualTime : 0;
  const material = group.userData.coronaMaterial as THREE.ShaderMaterial | undefined;
  if (material) material.uniforms.uCeTime.value = time;
  const arcs = group.userData.prominenceMaterials as { material: THREE.MeshBasicMaterial; base: number; phase: number }[] | undefined;
  arcs?.forEach(arc => { arc.material.opacity = arc.base * (.88 + .12 * Math.sin(time*.7 + arc.phase)); });
}

const starVertex = `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute float aCeSize;
attribute float aCeBrightness;
varying vec3 vCeColor;
varying float vCeBrightness;
uniform float uCePixelRatio;
void main() {
  vCeColor = color;
  vCeBrightness = aCeBrightness;
  vec4 mvPosition = modelViewMatrix * vec4(position,1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = aCeSize * uCePixelRatio * clamp(500.0 / max(-mvPosition.z,1.0),.72,1.45);
  #include <logdepthbuf_vertex>
}
`;

function starMaterial(diffraction: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uCePixelRatio: { value: Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio, 2) } },
    vertexShader: starVertex,
    fragmentShader: `
      #include <common>
      #include <logdepthbuf_pars_fragment>
      varying vec3 vCeColor;
      varying float vCeBrightness;
      void main() {
        #include <logdepthbuf_fragment>
        vec2 p = (gl_PointCoord-.5)*2.0;
        float radius = length(p);
        if(radius>1.0) discard;
        ${diffraction ? `
          float horizontal = exp(-abs(p.y)*60.0)*pow(max(0.0,1.0-abs(p.x)),2.8);
          float vertical = exp(-abs(p.x)*60.0)*pow(max(0.0,1.0-abs(p.y)),2.8);
          float alpha = (horizontal+vertical)*.32 + exp(-radius*radius*35.0)*.23;
        ` : `
          float alpha = exp(-radius*radius*4.2)*(1.0-smoothstep(.7,1.0,radius));
        `}
        gl_FragColor = vec4(vCeColor*1.15, alpha*vCeBrightness);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    vertexColors: true, transparent: true, blending: THREE.AdditiveBlending,
    // Transparent objects are drawn after opaque spheres: keep depth testing so
    // the sky cannot shine through a planet, even with a negative render order.
    depthWrite: false, depthTest: true,
  });
}

/** Deterministic, texture-free illustrative sky; keep its center at the camera. */
export function makeDeepStars(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Illustrative deep sky';
  group.userData.illustrative = true;
  const random = seededRandom(0x517ac3);
  const count = 6200;
  const positions = new Float32Array(count*3), colors = new Float32Array(count*3);
  const sizes = new Float32Array(count), brightness = new Float32Array(count);
  const palette = ['#d7e4ff','#f3f5ff','#fff1d9','#ffdaa6','#e6eeff'].map(color => new THREE.Color(color));
  const bandRotation = new THREE.Euler(.88, .24, -.38);
  for (let i=0; i<count; i++) {
    const band = i >= 5000;
    const longitude = random()*Math.PI*2;
    const latitude = band
      ? Math.max(-.45,Math.min(.45,(random()+random()+random()-1.5)*.24))
      : Math.asin(2*random()-1);
    const vector = new THREE.Vector3(Math.cos(latitude)*Math.cos(longitude),Math.sin(latitude),Math.cos(latitude)*Math.sin(longitude));
    if (band) vector.applyEuler(bandRotation);
    vector.multiplyScalar(450+random()*150).toArray(positions,i*3);
    palette[Math.floor(random()*palette.length)].toArray(colors,i*3);
    sizes[i] = band ? .68+random()*.8 : .95+Math.pow(random(),4)*1.75;
    brightness[i] = band ? .19+random()*.25 : .39+random()*.53;
    if (i<12) { sizes[i] = 2.1; brightness[i] = .85; }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  geometry.setAttribute('aCeSize',new THREE.BufferAttribute(sizes,1));
  geometry.setAttribute('aCeBrightness',new THREE.BufferAttribute(brightness,1));
  const stars = new THREE.Points(geometry,starMaterial(false));
  stars.renderOrder = -100;
  stars.frustumCulled = false;
  group.add(stars);

  const gleamGeometry = new THREE.BufferGeometry();
  gleamGeometry.setAttribute('position',new THREE.BufferAttribute(positions.slice(0,36),3));
  gleamGeometry.setAttribute('color',new THREE.BufferAttribute(colors.slice(0,36),3));
  gleamGeometry.setAttribute('aCeSize',new THREE.BufferAttribute(Float32Array.from({length:12},()=>10+random()*9),1));
  gleamGeometry.setAttribute('aCeBrightness',new THREE.BufferAttribute(new Float32Array(12).fill(.48),1));
  const gleams = new THREE.Points(gleamGeometry,starMaterial(true));
  gleams.frustumCulled = false;
  gleams.renderOrder = -99;
  group.add(gleams);
  return group;
}

const saturnSurfaceIds = new Set(['mimas', 'tethys', 'dione', 'rhea', 'iapetus']);

/** Recognizable motifs only: these are not measured terrain or spacecraft image maps. */
function atlasSurface(appearance: string, id: string): string {
  if (saturnSurfaceIds.has(id)) return `
    ceAlbedo = uCeColor * (.77 + grain*.28);
    ceHeight = grain*.028;
    for(int crater=0;crater<12;crater++) {
      float distanceToCenter = length(p-uCeCraters[crater].xyz);
      float radius = uCeCraters[crater].w;
      float rim = exp(-pow(abs((distanceToCenter-radius)/(radius*.16)),2.0));
      float bowl = 1.0-smoothstep(radius*.2,radius*.94,distanceToCenter);
      ceAlbedo *= 1.0-bowl*.20+rim*.17;
      ceHeight += rim*.035-bowl*.047;
    }
    ${id === 'mimas' || id === 'tethys' ? `
      // A prominent basin suggests Herschel / Odysseus; its longitude is illustrative.
      float basinDistance = length(p-normalize(vec3(.28,.08,.957)));
      float basinRadius = ${id === 'mimas' ? '.33' : '.38'};
      float basinRim = exp(-pow(abs((basinDistance-basinRadius)/(basinRadius*.12)),2.0));
      float basinBowl = 1.0-smoothstep(basinRadius*.40,basinRadius*.96,basinDistance);
      ceAlbedo *= 1.0-basinBowl*.25+basinRim*.22;
      ceHeight += basinRim*.10-basinBowl*${id === 'mimas' ? '.22' : '.09'};
      ${id === 'mimas' ? 'ceHeight += exp(-pow(basinDistance/.055,2.0))*.14;' : `
        float chasma = exp(-pow(abs(dot(p,normalize(vec3(.63,.12,.77))))/.019,2.0));
        ceAlbedo *= 1.0-chasma*.20;
        ceHeight -= chasma*.042;
      `}
    ` : ''}
    ${id === 'dione' ? `
      float fractureField = ceFbm(p*4.0+vec3(ceFbm(p*2.1)));
      float iceCliffs = 1.0-smoothstep(.006,.020,abs(fractureField-.49));
      iceCliffs *= smoothstep(-.5,.5,p.z);
      ceAlbedo = mix(ceAlbedo,vec3(.86,.89,.88),iceCliffs*.72);
      ceHeight -= iceCliffs*.036;
    ` : ''}
    ${id === 'iapetus' ? `
      // Local +Z is the leading side in the synchronous-facing display basis.
      // Albedo contrast is attached to the surface; solar lighting still computes day/night.
      float leadingSide = smoothstep(-.20,.22,p.z+(ceFbm(p*5.0)-.5)*.17);
      leadingSide *= 1.0-smoothstep(.75,.92,abs(p.y));
      vec3 darkTerrain = vec3(.043,.034,.026)*(.78+grain*.38);
      ceAlbedo = mix(ceAlbedo,darkTerrain,leadingSide);
      float equatorialRidge = exp(-pow(abs(p.y)/.026,2.0))*(.5+.5*ceFbm(p*11.0));
      ceHeight += equatorialRidge*.09;
      ceAlbedo *= 1.0-equatorialRidge*.12;
    ` : ''}
  `;
  if (appearance === 'ice') return `
    float field = ceFbm(p*7.0+vec3(ceFbm(p*3.0)*2.0));
    float cracks = 1.0-smoothstep(.015,.040,abs(field-.49));
    float broad = ceFbm(p*2.5);
    ceAlbedo = mix(uCeColor*.52,vec3(.72,.84,.91),.62) * (.80+grain*.31);
    ceAlbedo = mix(ceAlbedo,vec3(.30,.24,.18),cracks*.38);
    ceAlbedo *= .87 + broad*.23;
    ceHeight = grain*.035-cracks*.04;
  `;
  if (appearance === 'volcanic') return `
    float field = ceFbm(p*8.0+vec3(ceFbm(p*3.0)*3.0));
    float fissure = 1.0-smoothstep(.009,.026,abs(field-.48));
    float activityMask = smoothstep(.54,.73,ceFbm(p*3.3+11.0));
    float lava = fissure*activityMask;
    ceAlbedo = uCeColor*(.46+grain*.69);
    ceAlbedo = mix(ceAlbedo,vec3(.10,.045,.025),smoothstep(.55,.72,field)*.86);
    ceAlbedo = mix(ceAlbedo,vec3(.65,.08,.003),lava);
    ceEmission = vec3(1.8,.18,.008)*lava;
    ceHeight = grain*.10-fissure*.025;
  `;
  if (appearance === 'haze') return `
    float cloud = ceFbm(p*4.0);
    float belts = sin(p.y*13.0+cloud*4.0)*.5+.5;
    ceAlbedo = mix(uCeColor,vec3(.60,.30,.078),.38)*(.84+.12*cloud+.045*belts);
    ceHeight = 0.0;
  `;
  return `
    ceAlbedo = uCeColor*(.49+.65*grain);
    ceHeight = grain*.085;
    for(int crater=0;crater<12;crater++) {
      float distanceToCenter = length(p-uCeCraters[crater].xyz);
      float radius = uCeCraters[crater].w;
      float rim = exp(-pow((distanceToCenter-radius)/(radius*.15),2.0));
      float bowl = 1.0-smoothstep(radius*.3,radius*.94,distanceToCenter);
      ceAlbedo *= 1.0-bowl*.42+rim*.25;
      ceHeight += rim*.024-bowl*.048;
    }
    ${appearance === 'comet' ? 'ceAlbedo *= .53; ceHeight += ceNoise(p*65.0)*.045;' : ''}
  `;
}

/** A lit procedural atlas specimen with a unit-radius base, not a real surface map. */
export function makeAtlasMesh(body: { appearance: string; color: string; id: string }): THREE.Group {
  const group = new THREE.Group();
  group.name = `${body.id}: illustrative surface`;
  group.userData.illustrative = true;
  const appearance = ['rock','ice','volcanic','haze','comet'].includes(body.appearance) ? body.appearance : 'rock';
  const id = body.id.toLowerCase();
  let seed = 173;
  for (const character of body.id) seed = Math.imul(seed,31)+character.charCodeAt(0);
  const random = seededRandom(seed);
  const craters = Array.from({length:12},()=> {
    const z = random()*2-1, angle = random()*Math.PI*2, radial = Math.sqrt(1-z*z);
    return new THREE.Vector4(radial*Math.cos(angle),z,radial*Math.sin(angle),.055+random()*.21);
  });
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: appearance === 'ice' ? .61 : .92,
    metalness: 0, dithering: true,
  });
  // Distinct surface programs cannot share Three.js' shader cache entry merely because both are ice.
  material.customProgramCacheKey = () => `celestial-atlas-${saturnSurfaceIds.has(id) ? id : appearance}`;
  material.onBeforeCompile = shader => {
    shader.uniforms.uCeColor = { value: new THREE.Color(body.color) };
    shader.uniforms.uCeCraters = { value: craters };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>','#include <common>\nvarying vec3 vCeObject;\nvarying float vCeObjectScale;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvCeObject = position;\nvCeObjectScale = length(modelMatrix[0].xyz);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>',`#include <common>
        varying vec3 vCeObject;
        varying float vCeObjectScale;
        uniform vec3 uCeColor;
        uniform vec4 uCeCraters[12];
        ${noiseGLSL}
        vec3 ceBump(vec3 eyePosition, vec3 surfaceNormal, float height) {
          vec3 dx=dFdx(eyePosition),dy=dFdy(eyePosition);
          vec3 r1=cross(dy,surfaceNormal),r2=cross(surfaceNormal,dx);
          float determinant=dot(dx,r1);
          vec3 gradient=sign(determinant)*(dFdx(height)*r1+dFdy(height)*r2);
          return normalize(abs(determinant)*surfaceNormal-gradient);
        }
      `)
      .replace('#include <map_fragment>',`#include <map_fragment>
        vec3 p=normalize(vCeObject);
        float grain=ceFbm(p*19.0);
        vec3 ceAlbedo=uCeColor,ceEmission=vec3(0.0);
        float ceHeight=0.0;
        ${atlasSurface(appearance, id)}
        diffuseColor.rgb *= ceAlbedo;
      `)
      // Relief is a fraction of the body radius. Without this scale, tiny moons
      // acquire giant apparent bumps when placed in a common world coordinate system.
      .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal = ceBump(-vViewPosition,normal,ceHeight*.08*vCeObjectScale);')
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance += ceEmission;');
  };
  const geometry = new THREE.SphereGeometry(1,96,64);
  if (appearance === 'comet' || ['haumea','phobos','deimos'].includes(id)) {
    const attribute = geometry.getAttribute('position');
    const vertex = new THREE.Vector3();
    for (let i=0;i<attribute.count;i++) {
      vertex.fromBufferAttribute(attribute,i);
      if (id === 'haumea') {
        vertex.multiply(new THREE.Vector3(1.35,.86,.68));
      } else if (id === 'phobos' || id === 'deimos') {
        // Approximate observed axis ratios, with modest illustrative relief.
        const phobos = id === 'phobos';
        const scale = phobos ? new THREE.Vector3(1.20,1.20*22/27,1.20*18/27)
          : new THREE.Vector3(1.18,1.18*12/15,1.18*11/15);
        const relief = 1 + (phobos ? .045 : .028)*Math.sin(vertex.x*8+vertex.y*5)*Math.sin(vertex.z*9-vertex.y*4)
          + (phobos ? .020 : .012)*Math.sin(vertex.y*13+vertex.z*6);
        vertex.multiply(scale).multiplyScalar(relief);
      } else {
        const texture = 1+.023*Math.sin(vertex.x*17+vertex.y*13)*Math.sin(vertex.z*19-vertex.y*7);
        const waist = (.38+.85*Math.abs(vertex.x))*(.90+.10*vertex.x);
        vertex.set(vertex.x*1.24,vertex.y*waist,vertex.z*waist*.88).multiplyScalar(texture);
      }
      attribute.setXYZ(i,vertex.x,vertex.y,vertex.z);
    }
    geometry.computeVertexNormals();
  }
  group.add(new THREE.Mesh(geometry,material));
  if (appearance === 'haze') {
    const haze = new THREE.ShaderMaterial({
      uniforms: { uCeHaze: { value: new THREE.Color('#e7aa62') } },
      vertexShader: shellVertex,
      fragmentShader: `
        #include <common>
        #include <logdepthbuf_pars_fragment>
        uniform vec3 uCeHaze;
        varying vec3 vCeNormal;
        varying vec3 vCeWorld;
        void main() {
          #include <logdepthbuf_fragment>
          float facing=abs(dot(normalize(vCeNormal),normalize(cameraPosition-vCeWorld)));
          float rim=pow(1.0-facing,2.2);
          gl_FragColor=vec4(uCeHaze,rim*.29);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.BackSide,
    });
    group.add(new THREE.Mesh(new THREE.SphereGeometry(1.035,64,40),haze));
  }
  return group;
}
