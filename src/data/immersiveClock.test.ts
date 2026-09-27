import { describe, expect, it } from 'vitest';
import { ImmersiveClock, immersiveDate, parseImmersiveDate, type ImmersiveSample, type ImmersiveSource } from './immersiveClock';
import { immersiveEntry } from './immersiveEntry';
import { utcToTdb } from './time';
import { immersiveFamilyMembers } from './immersiveFamilies';
import { createImmersiveFamily, immersiveSatelliteAttitude } from '../components/immersiveFamilyScene';
import * as THREE from 'three';

const frame = (time: number) => ({ time, positions: new Float64Array(30).fill(time), velocities: new Float64Array(30) });
const sample = (time: number, saturn = false): ImmersiveSample => ({ frame: frame(time), satellites: saturn ? [{ id: 'titan', position: [time, 2, 3], velocity: [1, 0, 0] }] : null });
const immediate: ImmersiveSource = { sample, load: async (time, saturn) => sample(time, saturn) };
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

describe('沉浸时间与全景衔接', () => {
  it('默认暂停，三种帧率的物理时间推进一致；暂停与改变倍率不额外推进时间', () => {
    const results = [15, 30, 60].map(fps => {
      const clock = new ImmersiveClock(frame(100), { start: 0, end: 100000 }, immediate, () => {});
      clock.tick(1); expect(clock.state.frame.time).toBe(100);
      clock.play(); for (let i = 0; i < fps; i++) clock.tick(1 / fps);
      clock.pause(); clock.tick(.1); clock.setSpeed(86400); expect(clock.state.frame.time).toBeCloseTo(3700, 8);
      return clock.state.frame.time;
    });
    expect(results[0]).toBeCloseTo(results[2], 8);
  });
  it('母星和卫星共同就绪才发布时间；读取中不累计等待时间', async () => {
    let resolve!: (sample: ImmersiveSample) => void;
    const source: ImmersiveSource = { sample: () => null, load: () => new Promise(r => { resolve = r; }) };
    const clock = new ImmersiveClock(frame(100), { start: 0, end: 100000 }, source, () => {});
    clock.requireSaturn(true); expect(clock.state.loading).toBe(true); expect(clock.state.frame.time).toBe(100);
    resolve(sample(100, true)); await flush(); clock.play(); clock.tick(.1);
    const target = 460;
    expect(clock.state.frame.time).toBe(100); expect(clock.state.satellites?.[0].position[0]).toBe(100);
    clock.tick(30); expect(clock.state.frame.time).toBe(100);
    resolve(sample(target, true)); await flush();
    expect(clock.state.frame.time).toBe(target); expect(clock.state.satellites?.[0].position[0]).toBe(target);
  });
  it('快速改日期、切换家族、暂停或关闭时忽略过期返回', async () => {
    const waiting: ((sample: ImmersiveSample) => void)[] = [];
    const source: ImmersiveSource = { sample: () => null, load: () => new Promise(r => waiting.push(r)) };
    const clock = new ImmersiveClock(frame(100), { start: 0, end: 100000 }, source, () => {});
    clock.seek(200); clock.seek(300); waiting[0](sample(200)); await flush(); expect(clock.state.frame.time).toBe(100);
    waiting[1](sample(300)); await flush(); expect(clock.state.frame.time).toBe(300);
    clock.requireSaturn(true); clock.requireSaturn(false); waiting[2](sample(300, true)); await flush(); expect(clock.state.satellites).toBe(null);
    waiting[3](sample(300)); await flush(); clock.play(); clock.tick(.1); clock.pause(); waiting[4](sample(660)); await flush(); expect(clock.state.frame.time).toBe(300);
    clock.seek(500); clock.dispose(); waiting[5](sample(500)); await flush(); expect(clock.state.frame.time).toBe(300);
  });
  it('错误保留最后有效帧，重试不偷开播放，末端停止且不外推', async () => {
    let fail = true;
    const source: ImmersiveSource = { sample: () => null, load: async (time, saturn) => { if (fail) throw Error('测试月包失败'); return sample(time, saturn); } };
    const clock = new ImmersiveClock(frame(100), { start: 0, end: 1000 }, source, () => {});
    clock.seek(500); await flush(); expect(clock.state.error).toBe('测试月包失败'); expect(clock.state.frame.time).toBe(100);
    fail = false; clock.retry(); await flush(); expect(clock.state.frame.time).toBe(500); expect(clock.state.playing).toBe(false);
    clock.play(); clock.tick(.25); await flush(); expect(clock.state.frame.time).toBe(1000); expect(clock.state.atEnd).toBe(true); expect(clock.state.playing).toBe(false);
    clock.seek(1001); expect(clock.state.error).toContain('超出'); expect(clock.state.frame.time).toBe(1000);
    clock.seek(NaN); expect(clock.state.frame.time).toBe(1000);
  });
  it('北京时间输入按 UTC+8 转换，不受运行机器时区影响', () => {
    const time = utcToTdb(Date.UTC(2026, 8, 30, 16, 0, 0));
    expect(immersiveDate(time)).toBe('2026-10-01T00:00:00');
    expect(parseImmersiveDate('2026-10-01T00:00:00')).toBeCloseTo(time, 6);
    expect(Number.isNaN(parseImmersiveDate(''))).toBe(true);
  });
  it('当前主体、家族和卫星匹配入口；未覆盖目标明确解释，不伪称已经接入', () => {
    const context = { scope: 'solar', member: null, target: null, family: null, moon: null };
    expect(immersiveEntry({ ...context, target: 'body:earth' }).viewId).toBe('earth-limb');
    expect(immersiveEntry({ ...context, target: 'sun' }).viewId).toBe('sun-limb');
    expect(immersiveEntry({ ...context, target: 'body:saturn' }).viewId).toBe('saturn-rings');
    expect(immersiveEntry({ ...context, family: 'earth', moon: 'moon' })).toEqual({ viewId: 'earth-moon', focusId: 'moon' });
    expect(immersiveEntry({ ...context, family: 'saturn', moon: 'titan' })).toEqual({ viewId: 'saturn-family', focusId: 'titan' });
    expect(immersiveEntry({ ...context, family: 'saturn', moon: 'mimas' }).notice).toContain('尚未');
    expect(immersiveEntry({ ...context, target: 'body:mars' }).notice).toContain('尚未');
    expect(immersiveEntry({ ...context, scope: 'cosmic', member: 'earth' }).notice).toContain('尚未');
  });
  it('卫星随历表更新原有三维对象，同步自转参考面始终朝向母星', () => {
    const first = immersiveFamilyMembers('saturn', frame(100), [{ id: 'titan', position: [1200000, 0, 0], velocity: [0, 5, 0] }]);
    const next = immersiveFamilyMembers('saturn', frame(200), [{ id: 'titan', position: [0, 1200000, 0], velocity: [-5, 0, 0] }]);
    const scene = createImmersiveFamily(first, 'saturn', frame(100), new THREE.TextureLoader());
    const titan = scene.root.getObjectByName('immersive-family:titan')!;
    scene.sync(next, frame(200)); expect(scene.root.getObjectByName('immersive-family:titan')).toBe(titan);
    expect(titan.position.toArray()).toEqual(next[1].position.toArray());
    const facing = new THREE.Vector3(1, 0, 0).applyQuaternion(immersiveSatelliteAttitude(next[1]));
    expect(facing.distanceTo(next[1].position.clone().negate().normalize())).toBeLessThan(1e-12);
    scene.root.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.Line) { object.geometry.dispose(); (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => m.dispose()); } });
  });
});
