import * as THREE from 'three';

export interface SatelliteSunlightBinding {
  /** Satellite-to-Sun unit vector in the scene's WORLD axes (ECLIP x,z,-y). */
  direction: THREE.Vector3;
}

const bindings = new WeakMap<THREE.Object3D, SatelliteSunlightBinding>();

/**
 * Retain Three's geometry/indirect setup while replacing all scene direct lights.
 * Read against the installed Three r180 chunk; fail explicitly if its structure changes.
 */
function satelliteLightingChunk(): string {
  const source = THREE.ShaderChunk.lights_fragment_begin;
  const begin = source.indexOf('IncidentLight directLight;');
  const end = source.indexOf('#if defined( RE_IndirectDiffuse )', begin);
  if (begin < 0 || end < 0) throw new Error('当前 Three.js 光照模块与卫星太阳方向绑定不兼容');
  return source.slice(0, begin) + `
    #if defined( RE_Direct )
      IncidentLight directLight;
      // geometryNormal already includes the atlas's normal/bump modification in view space.
      directLight.direction = normalize(mat3(viewMatrix) * uSatelliteSunDirection);
      directLight.color = uSatelliteSunRadiance;
      directLight.visible = true;
      RE_Direct(directLight, geometryPosition, geometryNormal, geometryViewDir,
        geometryClearcoatNormal, material, reflectedLight);
    #endif
  ` + source.slice(end);
}

/**
 * Bind the independently owned standard materials created by makeAtlasMesh.
 * Scene point/directional/spot lights no longer affect these surfaces; ambient,
 * emissive lava, procedural relief, and the separate illustrative Titan haze remain.
 * Radiance is display exposure, not a measurement of the Sun's irradiance.
 * Update the returned vector from uncompressed scientific positions every frame.
 */
export function bindSatelliteSunlight(group: THREE.Object3D): SatelliteSunlightBinding {
  const existing = bindings.get(group);
  if (existing) return existing;
  const binding: SatelliteSunlightBinding = { direction: new THREE.Vector3(1, 0, 0) };
  const directionUniform = { value: binding.direction };
  const radianceUniform = { value: new THREE.Color(0xfff4e4).multiplyScalar(3.1) };
  const directChunk = satelliteLightingChunk();
  const patched = new Set<THREE.MeshStandardMaterial>();
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!(material instanceof THREE.MeshStandardMaterial) || patched.has(material)) continue;
      patched.add(material);
      const previousCompile = material.onBeforeCompile;
      const previousCacheKey = material.customProgramCacheKey.bind(material);
      material.onBeforeCompile = function (shader, renderer) {
        previousCompile.call(this, shader, renderer);
        if (!shader.fragmentShader.includes('#include <lights_fragment_begin>')) {
          throw new Error('卫星材质缺少可绑定的直接光照入口');
        }
        shader.uniforms.uSatelliteSunDirection = directionUniform;
        shader.uniforms.uSatelliteSunRadiance = radianceUniform;
        shader.fragmentShader = `uniform vec3 uSatelliteSunDirection;
          uniform vec3 uSatelliteSunRadiance;\n` + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_begin>', directChunk);
      };
      material.customProgramCacheKey = () => `${previousCacheKey()}:scientific-satellite-sun-v1`;
      material.needsUpdate = true;
    }
  });
  bindings.set(group, binding);
  return binding;
}
