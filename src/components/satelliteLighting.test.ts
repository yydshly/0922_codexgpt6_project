import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { makeAtlasMesh } from './celestialEffects';
import { bindSatelliteSunlight } from './satelliteLighting';

function compileFixture(material: THREE.MeshStandardMaterial) {
  const shader = {
    vertexShader: THREE.ShaderLib.standard.vertexShader,
    fragmentShader: THREE.ShaderLib.standard.fragmentShader,
    uniforms: THREE.UniformsUtils.clone(THREE.ShaderLib.standard.uniforms),
  };
  material.onBeforeCompile(shader as Parameters<THREE.MeshStandardMaterial['onBeforeCompile']>[0], {} as THREE.WebGLRenderer);
  return shader;
}

describe('satellite illumination independent of display compression', () => {
  it('retains the atlas surface, bump, and ambient path but replaces ordinary direct lights', () => {
    const group = makeAtlasMesh({ id: 'europa', appearance: 'ice', color: '#c8c9b7' });
    const binding = bindSatelliteSunlight(group);
    const material = (group.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
    const shader = compileFixture(material);
    expect(shader.uniforms.uCeColor).toBeDefined();
    expect(shader.fragmentShader).toContain('normal = ceBump');
    expect(shader.fragmentShader).toContain('getAmbientLightIrradiance');
    expect(shader.fragmentShader).toContain('mat3(viewMatrix) * uSatelliteSunDirection');
    expect(shader.fragmentShader).not.toContain('getPointLightInfo');
    expect(shader.fragmentShader).not.toContain('getDirectionalLightInfo');
    binding.direction.set(0, 0, -1);
    expect(shader.uniforms.uSatelliteSunDirection.value).toBe(binding.direction);
    expect(bindSatelliteSunlight(group)).toBe(binding);
  });

  it('keeps different satellites independent and leaves Titan haze untouched', () => {
    const titan = makeAtlasMesh({ id: 'titan', appearance: 'haze', color: '#d7ac63' });
    const triton = makeAtlasMesh({ id: 'triton', appearance: 'ice', color: '#c4bcb5' });
    const haze = (titan.children[1] as THREE.Mesh).material as THREE.ShaderMaterial;
    const hazeShader = haze.fragmentShader;
    const a = bindSatelliteSunlight(titan), b = bindSatelliteSunlight(triton);
    a.direction.set(1, 0, 0); b.direction.set(-1, 0, 0);
    const shaderA = compileFixture((titan.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial);
    const shaderB = compileFixture((triton.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial);
    expect(shaderA.uniforms.uSatelliteSunDirection.value).not.toBe(shaderB.uniforms.uSatelliteSunDirection.value);
    expect(haze.fragmentShader).toBe(hazeShader);
  });

  it('keeps the new Saturn surfaces distinct in the shader cache without replacing solar day and night', () => {
    const ids = ['mimas', 'tethys', 'dione', 'rhea', 'iapetus', 'europa'];
    const cacheKeys: string[] = [];
    for (const id of ids) {
      const group = makeAtlasMesh({ id, appearance: 'ice', color: '#c8c9b7' });
      const mesh = group.children[0] as THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
      const binding = bindSatelliteSunlight(group);
      cacheKeys.push(mesh.material.customProgramCacheKey());
      const shader = compileFixture(mesh.material);
      expect(group.userData.illustrative).toBe(true);
      expect(mesh.material.map).toBeNull();
      expect(mesh.geometry.parameters.radius).toBe(1);
      expect(shader.fragmentShader).toContain('normal = ceBump');
      expect(shader.uniforms.uSatelliteSunDirection.value).toBe(binding.direction);
      if (id === 'iapetus') {
        expect(shader.fragmentShader).toContain('ceAlbedo = mix(ceAlbedo,darkTerrain,leadingSide)');
        expect(shader.fragmentShader).toContain('equatorialRidge');
      } else if (id === 'mimas' || id === 'tethys') {
        expect(shader.fragmentShader).toContain('basinBowl');
      }
      mesh.geometry.dispose(); mesh.material.dispose();
    }
    expect(new Set(cacheKeys).size).toBe(ids.length);
  });
});
