import * as THREE from 'three';
import { publicAsset } from '../data/publicAsset';

export type EarthEffectMesh = THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;

/** Unit Earth; these are visual layers, never additions to the physical radius or state. */
export const EARTH_CLOUD_RADIUS = 1.002;
export const EARTH_ATMOSPHERE_RADIUS = 1.018;

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  #include <common>
  #include <logdepthbuf_pars_vertex>
  void main() {
    vUv = uv;
    // The parent Earth applies a rotation and a uniform radius scale.
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPosition = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <logdepthbuf_vertex>
  }
`;

/**
 * Thin, sunlit blue scattering layer. The short ray path through a spherical shell
 * replaces a uniform Fresnel outline: it fades to zero at the outer silhouette.
 * This is a visual approximation, not a spectral atmospheric transport model.
 */
export function createEarthAtmosphere(): EarthEffectMesh {
  const material = new THREE.ShaderMaterial({
    uniforms: { sunDirection: { value: new THREE.Vector3(1, 0, 0) } },
    vertexShader,
    fragmentShader: `
      uniform vec3 sunDirection;
      varying vec3 vNormal;
      varying vec3 vPosition;
      #include <common>
      #include <logdepthbuf_pars_fragment>
      void main() {
        #include <logdepthbuf_fragment>
        vec3 n = normalize(vNormal);
        vec3 view = normalize(cameraPosition - vPosition);
        vec3 sun = normalize(sunDirection);
        float mu = max(0.0, dot(n, view));
        float outerRadius = ${EARTH_ATMOSPHERE_RADIUS.toFixed(6)};
        float impactSquared = outerRadius * outerRadius * (1.0 - mu * mu);
        float outerHalfChord = outerRadius * mu;
        // The opaque Earth ends a ray that reaches the surface; clear limb rays cross both sides.
        float path = impactSquared < 1.0
          ? outerHalfChord - sqrt(max(0.0, 1.0 - impactSquared))
          : 2.0 * outerHalfChord;
        float sunHeight = dot(n, sun);
        float day = smoothstep(-.13, .28, sunHeight);
        float phase = .75 * (1.0 + pow(dot(view, sun), 2.0));
        float opacity = (1.0 - exp(-max(0.0, path) * 2.15)) * day * .68;
        // Only a restrained warm tint near the terminator; the broad daylight limb remains blue.
        float twilight = (1.0 - smoothstep(-.02, .17, sunHeight)) * day;
        vec3 scattering = mix(vec3(.09, .31, .78), vec3(.38, .28, .30), twilight * .18);
        gl_FragColor = vec4(scattering * phase, clamp(opacity, 0.0, .48));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    blending: THREE.NormalBlending,
  });
  material.userData.disposed = false;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(EARTH_ATMOSPHERE_RADIUS, 128, 80), material);
  mesh.name = 'earth-atmosphere';
  mesh.renderOrder = 3;
  mesh.userData.illustrative = true;
  return mesh;
}

/**
 * Independent cloud shell using the bundled static Solar System Scope / NASA-derived mask.
 * The texture follows the Earth group; no time-dependent weather or arbitrary cloud spin is added.
 * Consumers may share the cloudMap/cloudMapReady uniform objects with a surface-shadow shader.
 */
export function createEarthClouds(loader: THREE.TextureLoader, onStatus?: (status: 'ready' | 'error') => void): EarthEffectMesh {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      cloudMap: { value: new THREE.Texture() },
      cloudMapReady: { value: 0 },
      sunDirection: { value: new THREE.Vector3(1, 0, 0) },
    },
    vertexShader,
    fragmentShader: `
      uniform sampler2D cloudMap;
      uniform float cloudMapReady;
      uniform vec3 sunDirection;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      #include <common>
      #include <logdepthbuf_pars_fragment>
      void main() {
        #include <logdepthbuf_fragment>
        if (cloudMapReady < .5) discard;
        float density = texture2D(cloudMap, vUv).r;
        // Preserve mid-grey cirrus instead of treating most of the map as transparent black.
        float coverage = pow(smoothstep(.065, .90, density), .67);
        float opacity = coverage * .94;
        if (opacity < .004) discard;
        vec3 n = normalize(vNormal);
        vec3 sun = normalize(sunDirection);
        float sunHeight = dot(n, sun);
        float day = pow(max(0.0, sunHeight), .76);
        float dawn = smoothstep(-.045, .07, sunHeight);
        // Slight brightness variation follows the real mask, not invented storm geometry.
        float thickness = mix(.86, 1.06, density);
        vec3 white = vec3(.96, .98, 1.0);
        float sunset = (1.0 - smoothstep(.015, .20, sunHeight)) * dawn;
        white = mix(white, vec3(1.0, .83, .66), sunset * .30);
        vec3 color = white * thickness * (.012 + 1.28 * day * dawn);
        gl_FragColor = vec4(color, opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  material.userData.disposed = false;
  loader.load(publicAsset('/textures/earth-clouds.jpg'), texture => {
    if (material.userData.disposed) { texture.dispose(); return; }
    // This grayscale image is an opacity mask, not color radiance; avoid an sRGB decode.
    texture.colorSpace = THREE.NoColorSpace;
    texture.anisotropy = 4;
    texture.wrapS = THREE.RepeatWrapping;
    material.uniforms.cloudMap.value.dispose();
    material.uniforms.cloudMap.value = texture;
    material.uniforms.cloudMapReady.value = 1;
    onStatus?.('ready');
  }, undefined, () => { if (!material.userData.disposed) onStatus?.('error'); });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(EARTH_CLOUD_RADIUS, 128, 80), material);
  mesh.name = 'earth-clouds';
  mesh.renderOrder = 2;
  mesh.userData.staticTexture = true;
  mesh.userData.textureSource = publicAsset('/textures/sources.json');
  return mesh;
}

export function createEarthEffects(loader: THREE.TextureLoader) {
  return { clouds: createEarthClouds(loader), atmosphere: createEarthAtmosphere() };
}
