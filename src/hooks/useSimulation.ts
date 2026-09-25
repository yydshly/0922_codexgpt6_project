import { useCallback, useEffect, useRef, useState } from 'react';
import { BODIES } from '../data/catalog';
import { getFrame, loadManifest, preloadTime, sampleFrame } from '../ephemeris/ephemeris';
import { utcToTdb } from '../data/time';
import type { EphemerisManifest, SimulationMode, StateFrame } from '../types';
import { physicsAdvanceBudget } from './simulation-control';

type WorkerState = { type: 'state'; frame: StateFrame; pendingSeconds: number; requestId?: number } | { type: 'error'; message: string; requestId?: number };

export function useSimulation() {
  const [manifest, setManifest] = useState<EphemerisManifest | null>(null);
  const [frame, setFrame] = useState<StateFrame | null>(null);
  const [mode, setModeState] = useState<SimulationMode>('ephemeris');
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('正在读取历表目录');
  const [canRetry, setCanRetry] = useState(false);
  const [physicsEpoch, setPhysicsEpoch] = useState<number | null>(null);
  const [actualSpeed, setActualSpeed] = useState(0);
  const [pendingSeconds, setPendingSeconds] = useState(0);
  const worker = useRef<Worker | null>(null);
  const frameRef = useRef<StateFrame | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const pending = useRef(0);
  const targetTime = useRef<number | null>(null);
  const measurement = useRef({ wall: 0, time: 0 });
  const modeRef = useRef<SimulationMode>(mode);
  const settings = useRef({ playing, speed, loading, manifest });
  modeRef.current = mode;
  settings.current = { playing, speed, loading, manifest };

  const acceptFrame = useCallback((next: StateFrame) => { frameRef.current = next; setFrame(next); }, []);

  useEffect(() => {
    const instance = new Worker(new URL('../physics/physics.worker.ts', import.meta.url), { type: 'module' });
    worker.current = instance;
    instance.onmessage = (event: MessageEvent<WorkerState>) => {
      const result = event.data;
      if (result.requestId !== generation.current || modeRef.current !== 'physics') return;
      if (result.type === 'error') { setError(result.message); setPlaying(false); busy.current = false; return; }
      pending.current = result.pendingSeconds;
      setPendingSeconds(result.pendingSeconds);
      busy.current = result.pendingSeconds + 1e-9 >= 300;
      const wall = performance.now();
      if (!measurement.current.wall || !settings.current.playing) measurement.current = { wall, time: result.frame.time };
      else if (wall - measurement.current.wall >= 1000) {
        setActualSpeed((result.frame.time - measurement.current.time) / ((wall - measurement.current.wall) / 1000));
        measurement.current = { wall, time: result.frame.time };
      }
      const end = settings.current.manifest?.endTdb;
      if (end !== undefined && result.frame.time > end) { setPlaying(false); setError('物理模拟已到历表覆盖边界，请选择范围内的时间。'); return; }
      acceptFrame(result.frame);
    };
    instance.onerror = () => { if (modeRef.current === 'physics') { setError('物理计算线程启动失败，请刷新页面重试。'); setPlaying(false); } };
    return () => { instance.terminate(); worker.current = null; };
  }, [acceptFrame]);

  const seek = useCallback(async (time: number, nextMode: SimulationMode = modeRef.current) => {
    const currentManifest = settings.current.manifest;
    if (currentManifest && (time < currentManifest.startTdb || time > currentManifest.endTdb)) { setError('时间超出已加载历表范围：2026 年至 2027 年。'); setPlaying(false); return; }
    const token = ++generation.current;
    targetTime.current = time;
    pending.current = 0; setPendingSeconds(0); setActualSpeed(0); measurement.current = { wall: 0, time };
    setLoading(true); setLoadingMessage('正在读取所选日期的位置与速度'); setCanRetry(false); setError(''); busy.current = true;
    try {
      const next = await getFrame(time, nextMode === 'physics' ? 'simulation' : 'display');
      if (token !== generation.current) return;
      acceptFrame(next);
      if (nextMode === 'physics') {
        setPhysicsEpoch(time);
        worker.current?.postMessage({ type: 'init', frame: next, gms: BODIES.map(b => b.simulationGm), stepSeconds: 300, requestId: token });
      } else { busy.current = false; setPhysicsEpoch(null); }
      setLoading(false);
      void preloadTime(time).catch(() => {});
      return true;
    } catch (e) {
      if (token !== generation.current) return;
      setError(e instanceof Error ? e.message : '历表数据读取失败，请检查数据包。'); setLoading(false); setPlaying(false); setCanRetry(true); busy.current = false;
      return false;
    }
  }, [acceptFrame]);

  const initialize = useCallback(async (clampToCoverage = true) => {
    const token = ++generation.current;
    setLoading(true); setLoadingMessage('正在读取历表目录'); setError(''); setCanRetry(false);
    try {
      const data = await loadManifest();
      if (token !== generation.current) return;
      setManifest(data); settings.current.manifest = data;
      const now = utcToTdb(Date.now());
      const initial = Math.max(data.startTdb, Math.min(data.endTdb, now));
      if (!clampToCoverage && now !== initial) {
        setLoading(false); setPlaying(false);
        setError('当前日期不在 2026—2027 年历表内，请手动选择范围内的日期。');
        return;
      }
      const initialLoad = seek(initial, modeRef.current);
      const initialGeneration = generation.current;
      const loaded = await initialLoad;
      if (loaded && generation.current === initialGeneration && now !== initial) {
        setPlaying(false);
        setError('当前日期不在内置 2026—2027 年历表中，已定位到最近的覆盖边界。请选择范围内的日期。');
      }
    } catch (e) {
      if (token !== generation.current) return;
      setError(e instanceof Error ? e.message : '历表清单读取失败');
      setLoading(false); setPlaying(false); setCanRetry(true);
    }
  }, [seek]);

  useEffect(() => {
    void initialize();
    return () => { generation.current++; };
  }, [initialize]);

  useEffect(() => {
    let last = 0, animation = 0;
    let loadingChunk: number | null = null;
    const tick = (stamp: number) => {
      animation = requestAnimationFrame(tick);
      if (!last) { last = stamp; return; }
      if (stamp - last < 32) return;
      const elapsed = Math.min(.2, (stamp - last) / 1000); last = stamp;
      const config = settings.current, current = frameRef.current;
      if (!config.playing || config.loading || !current || !config.manifest || loadingChunk === generation.current) return;
      const delta = elapsed * config.speed;
      if (modeRef.current === 'physics') {
        if (busy.current || !worker.current) return;
        const budget = physicsAdvanceBudget(current.time, config.manifest.endTdb, pending.current, delta);
        if (budget.atBoundary) { setPlaying(false); return; }
        if (budget.seconds <= 0) return;
        busy.current = true;
        worker.current.postMessage({ type: 'advance', seconds: budget.seconds, requestId: generation.current });
        return;
      }
      const time = Math.min(current.time + delta, config.manifest.endTdb);
      if (time >= config.manifest.endTdb) setPlaying(false);
      try {
        const next = sampleFrame(time, 'display');
        if (next) { acceptFrame(next); return; }
        const token = generation.current;
        loadingChunk = token; targetTime.current = time; setLoading(true); setLoadingMessage('正在读取下个月的位置与速度'); setCanRetry(false); setError('');
        getFrame(time, 'display').then(value => { if (token === generation.current && modeRef.current === 'ephemeris') acceptFrame(value); }).catch(e => { if (token === generation.current) { setError(e instanceof Error ? e.message : '月份数据包读取失败'); setPlaying(false); setCanRetry(true); } }).finally(() => { if (loadingChunk === token) loadingChunk = null; if (token === generation.current) setLoading(false); });
      } catch (e) { setError(e instanceof Error ? e.message : '历表读取失败'); setPlaying(false); }
    };
    animation = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animation);
  }, [acceptFrame]);

  const setMode = useCallback((next: SimulationMode) => {
    if (next === modeRef.current) return;
    generation.current++; modeRef.current = next; setModeState(next);
    const time = frameRef.current?.time ?? targetTime.current;
    if (time !== null) void seek(time, next);
  }, [seek]);
  const goNow = useCallback(async () => {
    const current = settings.current.manifest, now = utcToTdb(Date.now());
    // An invalid "now" must not invalidate an in-flight physics worker generation.
    if (current && (now < current.startTdb || now > current.endTdb)) {
      setError('当前日期不在 2026—2027 年历表内，请手动选择范围内的日期。'); setPlaying(false); return;
    }
    await initialize(false);
  }, [initialize]);
  const retry = useCallback(() => {
    setPlaying(false);
    if (settings.current.manifest && targetTime.current !== null) void seek(targetTime.current);
    else void initialize();
  }, [initialize, seek]);
  const reset = useCallback(() => { if (modeRef.current === 'physics' && physicsEpoch !== null) void seek(physicsEpoch); else goNow(); }, [physicsEpoch, seek, goNow]);
  return { frame, manifest, mode, setMode, playing, setPlaying, speed, setSpeed, loading, loadingMessage, canRetry, retry, error, setError, seek, goNow, reset, physicsEpoch, actualSpeed, pendingSeconds };
}
