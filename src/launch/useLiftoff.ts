import { DEMO_IDLE, type DemoStatus } from './fullFlightDemo';
import { useEffect, useRef, useState } from 'react';
import { LiftoffSimulation, type FlightState } from './liftoff';
import type { LaunchCommand } from './liftoff.worker';
import type { VehicleConfig } from './vehicle';
import type { FlightSave } from './flightSession';
import { storeFlight } from './flightStorage';
import { AscentRecord, type AscentRecordData } from './ascentRecord';

export function useLiftoff(config: VehicleConfig, initialBaseTime: number, onRestored: (config: VehicleConfig) => void) {
  const worker = useRef<Worker | null>(null), restoredConfig = useRef<VehicleConfig | null>(null), restoreCallback = useRef(onRestored); restoreCallback.current = onRestored;
  const [demo, setDemo] = useState<DemoStatus>({ ...DEMO_IDLE });
  const [state, setState] = useState<FlightState>(() => new LiftoffSimulation(config).snapshot());
  const [ascentRecord, setAscentRecord] = useState<AscentRecordData>(() => new AscentRecord().snapshot());
  const [paused, setPaused] = useState(false), [ready, setReady] = useState(false), [error, setError] = useState(''), [storageStatus, setStorageStatus] = useState('');
  const [generation, setGeneration] = useState(0), [rate, setRate] = useState(1), [baseTime, setBaseTime] = useState(initialBaseTime), [restoring, setRestoring] = useState(false);
  const [saved, setSaved] = useState<FlightSave | null>(null), [restoredCount, setRestoredCount] = useState(0);
  const configRef = useRef(config); configRef.current = config;
  useEffect(() => {
    setReady(false); setError('');
    try {
      const w = new Worker(new URL('./liftoff.worker.ts', import.meta.url), { type: 'module' }); worker.current = w;
      w.onmessage = ({ data }: MessageEvent<{ demo?: DemoStatus; state?: FlightState; ascentRecord?: AscentRecordData; paused: boolean; error: string; rate: number; baseTime: number; config: VehicleConfig; saved?: FlightSave; restored?: boolean; restoreFailed?: boolean; storageError?: string }>) => {
        setDemo(data.demo ?? { ...DEMO_IDLE });
        if (data.ascentRecord) setAscentRecord(data.ascentRecord);
        if (data.state) { setState(data.state); setReady(true); } setPaused(data.paused); setError(data.error); setRate(data.rate); if (Number.isFinite(data.baseTime)) setBaseTime(data.baseTime);
        if (data.saved) { setSaved(data.saved); try { setStorageStatus(storeFlight(data.saved)); } catch (e) { setStorageStatus((e as Error).message); } }
        if (data.restored) { restoredConfig.current = data.config; restoreCallback.current(data.config); setRestoring(false); setRestoredCount(n => n + 1); setStorageStatus('已重算并恢复存档；配置、燃料、时间与事件均已恢复。'); }
        if (data.restoreFailed) { setRestoring(false); setStorageStatus(`${data.storageError ?? '恢复失败'} 原飞行仍保留，可继续或重试。`); }
      };
      w.onerror = () => { setError('发射计算中断，请重置试飞或恢复存档。'); setReady(false); setPaused(true); setRestoring(false); w.terminate(); };
      w.postMessage({ type: 'reset', config: configRef.current, baseTime: initialBaseTime } satisfies LaunchCommand);
      const visibility = () => { if (document.hidden) w.postMessage({ type: 'pause', value: true } satisfies LaunchCommand); };
      document.addEventListener('visibilitychange', visibility); visibility();
      return () => { document.removeEventListener('visibilitychange', visibility); w.terminate(); worker.current = null; };
    } catch { setError('发射计算无法启动，请重置重试。'); setPaused(true); }
  }, [generation, initialBaseTime]);
  useEffect(() => {
    if (config === restoredConfig.current) { restoredConfig.current = null; return; }
    worker.current?.postMessage({ type: 'reset', config, baseTime: initialBaseTime } satisfies LaunchCommand);
  }, [config, initialBaseTime]);
  return { demo, state, ascentRecord, paused, ready: ready && !restoring, error, rate, baseTime, saved, storageStatus, restoring, restoredCount,
    send: (command: LaunchCommand) => { if (command.type === 'restore') { setRestoring(true); setStorageStatus('正在按原配置重算飞行，请稍候…'); } worker.current?.postMessage(command); }, reset: () => setGeneration(n => n + 1) };
}
