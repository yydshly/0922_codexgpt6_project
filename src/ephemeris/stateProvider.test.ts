import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { CHARON_GM, PLUTO_GM, plutoCharonBarycenter } from '../components/dwarfOrbit';
import { describe, expect, it } from 'vitest';
import { combineStateBatches, interpolateMonthlyChunk, type MonthlyChunk, type MonthlyManifest, type StateBatch } from './stateProvider';
import { utcToTdb } from '../data/time';

const manifest = JSON.parse(readFileSync(new URL('../../public/data/dwarfs/manifest.json', import.meta.url), 'utf8')) as MonthlyManifest;
const chunk = (file: string) => JSON.parse(readFileSync(new URL(`../../public/data/dwarfs/${file}`, import.meta.url), 'utf8')) as MonthlyChunk;

describe('扩展天体状态供数', () => {
  it('所有发布月份包与来源清单的哈希一致', () => {
    expect(manifest.chunks).toHaveLength(24);
    for (const descriptor of manifest.chunks) {
      const bytes = readFileSync(new URL(`../../public/data/dwarfs/${descriptor.file}`, import.meta.url));
      expect(bytes.length).toBe(descriptor.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(descriptor.sha256);
    }
  });

  it('跨月边界对齐，身份和时间一致', () => {
    expect(manifest.bodyIds).toEqual(['ceres', 'pluto', 'charon']);
    for (let index = 0; index < manifest.chunks.length - 1; index++) {
      const left = manifest.chunks[index], right = manifest.chunks[index+1];
      expect(left.endTdb).toBe(right.startTdb);
      const a = interpolateMonthlyChunk(chunk(left.file), left.endTdb, manifest.version);
      const b = interpolateMonthlyChunk(chunk(right.file), right.startTdb, manifest.version);
      expect(a.timeTdb).toBe(b.timeTdb);
      for (let target = 0; target < 3; target++) {
        expect(a.states[target].id).toBe(b.states[target].id);
        expect(Math.hypot(...a.states[target].position.map((value, axis) => value - b.states[target].position[axis]))).toBeLessThan(0.001);
      }
    }
  });

  it('同一时刻地心之外的谷神星位于主带，卡戎邻近冥王星', () => {
    const time = utcToTdb(new Date('2026-09-23T00:00:00Z'));
    const current = manifest.chunks.find(item => time >= item.startTdb && time < item.endTdb)!;
    const states = interpolateMonthlyChunk(chunk(current.file), time, manifest.version).states;
    const [ceres, pluto, charon] = states;
    const au = 149597870.7;
    expect(Math.hypot(...ceres.position)/au).toBeGreaterThan(2);
    expect(Math.hypot(...ceres.position)/au).toBeLessThan(4);
    expect(Math.hypot(...charon.position.map((value, axis) => value-pluto.position[axis]))).toBeGreaterThan(15000);
    expect(Math.hypot(...charon.position.map((value, axis) => value-pluto.position[axis]))).toBeLessThan(25000);
    expect(states.every(state => [...state.position,...state.velocity].every(Number.isFinite))).toBe(true);
  });

  it('冥王星和卡戎在真实历表中分列双体质心两侧并随时间改变相位', () => {
    const time = utcToTdb(new Date('2026-09-23T00:00:00Z'));
    const current = manifest.chunks.find(item => time >= item.startTdb && time+2*86400 < item.endTdb)!;
    const source = chunk(current.file);
    const offsets = [time, time+2*86400].map(epoch => {
      const states = interpolateMonthlyChunk(source, epoch, manifest.version).states;
      const pluto = new THREE.Vector3(...states[1].position);
      const charon = new THREE.Vector3(...states[2].position);
      const barycenter = plutoCharonBarycenter(pluto, charon);
      const a = pluto.sub(barycenter), b = charon.sub(barycenter);
      expect(a.dot(b)).toBeLessThan(0);
      expect(a.length()/b.length()).toBeCloseTo(CHARON_GM/PLUTO_GM, 5);
      return a;
    });
    expect(offsets[0].distanceTo(offsets[1])).toBeGreaterThan(1000);
  });

  it('拒绝不同历元、坐标和重复身份', () => {
    const one = interpolateMonthlyChunk(chunk(manifest.chunks[0].file), manifest.chunks[0].startTdb, manifest.version);
    const duplicate: StateBatch = { ...one, states: [one.states[0]] };
    expect(() => combineStateBatches(one, duplicate)).toThrow('重复');
    expect(() => combineStateBatches(one, { ...one, timeTdb: one.timeTdb+1, states: [] })).toThrow('历元');
    expect(() => combineStateBatches(one, { ...one, frame: 'other' as StateBatch['frame'], states: [] })).toThrow('坐标');
  });
});
