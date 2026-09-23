import * as THREE from 'three';

interface BackdropState {
  level: { value: number };
  pixelRatio: { value: number };
  previousSeconds?: number;
}

function randomSource(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

const skyVertex = `
  varying vec3 vSkyDirection;
  #include <common>
  #include <logdepthbuf_pars_vertex>
  void main() {
    // Translation follows the camera; orientation remains fixed to the world.
    vSkyDirection = mat3(modelMatrix) * position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <logdepthbuf_vertex>
  }
`;

const skyFragment = `
  varying vec3 vSkyDirection;
  uniform float uBackdropLevel;
  uniform vec3 uGalacticNorth;
  #include <common>
  #include <logdepthbuf_pars_fragment>
  float skyHash(vec3 p) {
    p = fract(p * .1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  float skyNoise(vec3 p) {
    vec3 cell = floor(p), f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(mix(mix(skyHash(cell), skyHash(cell+vec3(1,0,0)), f.x),
      mix(skyHash(cell+vec3(0,1,0)), skyHash(cell+vec3(1,1,0)), f.x), f.y),
      mix(mix(skyHash(cell+vec3(0,0,1)), skyHash(cell+vec3(1,0,1)), f.x),
      mix(skyHash(cell+vec3(0,1,1)), skyHash(cell+vec3(1,1,1)), f.x), f.y), f.z);
  }
  float skyDetail(vec3 p) {
    return skyNoise(p)*.55 + skyNoise(p*2.07+7.3)*.28 + skyNoise(p*4.11-2.8)*.12 + skyNoise(p*8.31)*.05;
  }
  void main() {
    #include <logdepthbuf_fragment>
    vec3 ray = normalize(vSkyDirection);
    float latitude = dot(ray, uGalacticNorth);
    float broadBand = exp(-latitude*latitude / .105);
    float narrowBand = exp(-latitude*latitude / .012);
    float fineBand = exp(-latitude*latitude / .0019);
    // Low-contrast, elongated stellar density, not separate coloured nebula blobs.
    float detail = skyDetail(ray*19.0);
    float alongBand = .74 + .26*skyDetail(ray*4.1+12.0);
    float dust = smoothstep(.47, .69, skyDetail(ray*31.0+vec3(6,2,9)));
    float stars = narrowBand*(.45+.55*detail)*alongBand;
    float darkLane = fineBand*dust;
    float lift = mix(.16, 1.0, uBackdropLevel);
    float upperTint = .5+.5*dot(ray,normalize(vec3(-.3,.8,.2)));
    vec3 background = mix(vec3(.006,.011,.023),vec3(.014,.024,.045),upperTint)*lift;
    background += vec3(.010,.017,.028)*broadBand*lift;
    background += vec3(.039,.046,.055)*stars*lift;
    background *= 1.0 - darkLane*.20;
    // Fine, very weak directional variation prevents flat colour without a visible fog layer.
    background += vec3(.002,.003,.005)*(detail-.5)*broadBand*lift;
    gl_FragColor = vec4(max(background,vec3(0.0)),1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const starVertex = `
  attribute float aStarSize;
  attribute float aStarBrightness;
  varying vec3 vStarColor;
  varying float vStarBrightness;
  uniform float uBackdropPixelRatio;
  #include <common>
  #include <logdepthbuf_pars_vertex>
  void main() {
    vStarColor = color;
    vStarBrightness = aStarBrightness;
    vec4 mvPosition = modelViewMatrix * vec4(position,1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aStarSize * uBackdropPixelRatio * clamp(740.0/max(1.0,-mvPosition.z),.92,1.22);
    #include <logdepthbuf_vertex>
  }
`;

function starMaterial(state: BackdropState, gleam: boolean) {
  return new THREE.ShaderMaterial({
    uniforms: { uBackdropLevel: state.level, uBackdropPixelRatio: state.pixelRatio },
    vertexShader: starVertex,
    fragmentShader: `
      varying vec3 vStarColor;
      varying float vStarBrightness;
      uniform float uBackdropLevel;
      #include <common>
      #include <logdepthbuf_pars_fragment>
      void main() {
        #include <logdepthbuf_fragment>
        vec2 p = gl_PointCoord*2.0-1.0;
        float r = length(p);
        if(r>1.0) discard;
        ${gleam ? `
          float horizontal = exp(-abs(p.y)*66.0)*pow(max(0.0,1.0-abs(p.x)),3.1);
          float vertical = exp(-abs(p.x)*66.0)*pow(max(0.0,1.0-abs(p.y)),3.1);
          float halo = exp(-r*r*30.0)*.19;
          float alpha = (horizontal+vertical)*.38+halo;
        ` : `
          float core = exp(-r*r*10.0);
          float halo = exp(-r*r*3.2)*.18;
          float alpha = (core+halo)*(1.0-smoothstep(.68,1.0,r));
        `}
        float exposure = mix(.38,1.0,uBackdropLevel);
        gl_FragColor = vec4(vStarColor*(1.15+.25*uBackdropLevel), alpha*vStarBrightness*exposure);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  });
}

/**
 * Illustrative deep-space background: not a measured star catalogue or Milky Way map.
 * All assets are procedural. Keep this group unrotated in the main world scene.
 */
export function createObservatoryBackdrop(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'observatory-backdrop';
  group.userData.illustrative = true;
  const state: BackdropState = {
    level: { value: 1 },
    pixelRatio: { value: Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio, 1.75) },
  };
  group.userData.backdropState = state;
  const galacticNorth = new THREE.Vector3(.52,.71,-.47).normalize();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(820,48,32), new THREE.ShaderMaterial({
    uniforms: { uBackdropLevel: state.level, uGalacticNorth: { value: galacticNorth } },
    vertexShader: skyVertex, fragmentShader: skyFragment,
    side: THREE.BackSide, depthWrite: false, depthTest: true,
  }));
  // This opaque background draws first without filling the depth buffer.
  sky.renderOrder = -1000; sky.frustumCulled = false; group.add(sky);

  const random = randomSource(0x6e626c32);
  const palette = ['#e7efff','#c8ddff','#f6f5ee','#fff0ce','#efcfb3','#d8e9ff'].map(color => new THREE.Color(color));
  const galacticRotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),galacticNorth);
  const positions: number[] = [], colors: number[] = [], sizes: number[] = [], brightness: number[] = [];
  const glintPositions: number[] = [], glintColors: number[] = [], glintSizes: number[] = [], glintBrightness: number[] = [];
  // Numerous fine stars, a denser galactic population, then a small bright foreground population.
  const count = 8400;
  for (let i = 0; i < count; i++) {
    const band = i >= 5900 && i < 8200;
    const bright = i >= 8200;
    const longitude = random()*Math.PI*2;
    const latitude = band ? (random()+random()+random()-1.5)*.14 : Math.asin(random()*2-1);
    const direction = new THREE.Vector3(Math.cos(latitude)*Math.cos(longitude),Math.sin(latitude),Math.cos(latitude)*Math.sin(longitude));
    if(band) direction.applyQuaternion(galacticRotation);
    direction.multiplyScalar(715+random()*80).toArray(positions,positions.length);
    const color = palette[Math.floor(random()*palette.length)]; color.toArray(colors,colors.length);
    sizes.push(bright ? 2.2+random()*1.45 : band ? .80+random()*.70 : .85+Math.pow(random(),2.1)*1.15);
    brightness.push(bright ? .74+random()*.30 : band ? .19+random()*.23 : .27+random()*.43);
    if(i>=count-20) {
      direction.toArray(glintPositions,glintPositions.length); color.toArray(glintColors,glintColors.length);
      glintSizes.push(10+random()*6); glintBrightness.push(.38+random()*.18);
    }
  }
  const makePoints = (p: number[], c: number[], s: number[], b: number[], gleam: boolean) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(c,3));
    geometry.setAttribute('aStarSize',new THREE.Float32BufferAttribute(s,1));
    geometry.setAttribute('aStarBrightness',new THREE.Float32BufferAttribute(b,1));
    const points = new THREE.Points(geometry,starMaterial(state,gleam));
    // Opaque celestial spheres have already populated depth when these transparent points draw.
    points.renderOrder = gleam ? -899 : -900; points.frustumCulled = false;
    return points;
  };
  group.add(makePoints(positions,colors,sizes,brightness,false));
  group.add(makePoints(glintPositions,glintColors,glintSizes,glintBrightness,true));
  return group;
}

/**
 * Translate only, so orbiting the camera reveals stable world directions.
 * enhanced=true gives the spatial-observation treatment; false is a subdued real-scale sky.
 * Time only smooths the mode transition: the stars do not falsely twinkle in vacuum.
 */
export function updateObservatoryBackdrop(group: THREE.Group, camera: THREE.Camera, enhanced: boolean, seconds: number): void {
  camera.getWorldPosition(group.position);
  const state = group.userData.backdropState as BackdropState | undefined;
  if(!state) return;
  const target = enhanced ? 1 : 0;
  const delta = state.previousSeconds === undefined ? Infinity : Math.max(0,Math.min(.1,seconds-state.previousSeconds));
  state.level.value += (target-state.level.value)*(delta===Infinity ? 1 : 1-Math.exp(-delta*5));
  state.previousSeconds = seconds;
}
