import { DEMO_IDLE, type DemoStatus } from './fullFlightDemo';
import type { BoosterRecord } from './boosterDescent';
import { useEffect, useRef, useState } from 'react';
import { LiftoffSimulation, type FlightState } from './liftoff';
import type { LaunchCommand } from './liftoff.worker';
import type { VehicleConfig } from './vehicle';
import type { FlightSave } from './flightSession';
import { storeFlight } from './flightStorage';
import { AscentRecord, type AscentRecordData } from './ascentRecord';
import { FlightWorkerConnection } from './flightWorkerConnection';

interface FlightReply {
  demo?: DemoStatus; state?: FlightState; ascentRecord?: AscentRecordData; boosterRecord?: BoosterRecord | null;
  paused: boolean; error: string; rate: number; baseTime: number; config: VehicleConfig;
  saved?: FlightSave; restored?: boolean; restoreFailed?: boolean; storageError?: string;
}

export function useLiftoff(config: VehicleConfig, initialBaseTime: number, onRestored: (config: VehicleConfig) => void) {
  const worker = useRef<FlightWorkerConnection<LaunchCommand, FlightReply> | null>(null);
  const recoveryCommand = useRef<Extract<LaunchCommand, { type: 'restore' }> | null>(null);
  const failed = useRef(false), restarting = useRef(false);
  const restoredConfig = useRef<VehicleConfig | null>(null), restoreCallback = useRef(onRestored); restoreCallback.current = onRestored;
  const [demo, setDemo] = useState<DemoStatus>({ ...DEMO_IDLE });
  const [demoPending, setDemoPending] = useState(false);
  const [workerFailure, setWorkerFailure] = useState(''), [recovering, setRecovering] = useState(false);
  const [boosterRecord,setBoosterRecord]=useState<BoosterRecord|null>(null);
  const [state, setState] = useState<FlightState>(() => new LiftoffSimulation(config).snapshot());
  const [ascentRecord, setAscentRecord] = useState<AscentRecordData>(() => new AscentRecord().snapshot());
  const [paused, setPaused] = useState(false), [ready, setReady] = useState(false), [error, setError] = useState(''), [storageStatus, setStorageStatus] = useState('');
  const [generation, setGeneration] = useState(0), [rate, setRate] = useState(1), [baseTime, setBaseTime] = useState(initialBaseTime), [restoring, setRestoring] = useState(false);
  const [saved, setSaved] = useState<FlightSave | null>(null), [restoredCount, setRestoredCount] = useState(0);
  const configRef = useRef(config); configRef.current = config;
  useEffect(() => {
    setReady(false); if (!failed.current) setError('');
    const bootRestore = recoveryCommand.current; recoveryCommand.current = null;
    let awaitingRecovery = !!bootRestore;
    const stop = (message: string) => {
      failed.current = true; restarting.current = false;
      setWorkerFailure(message); setError(message); setReady(false); setPaused(true);
      setRecovering(false); setRestoring(false); setDemoPending(false);
      setDemo(previous => ({ ...previous, paused: true, finished: false, error: message }));
      setStorageStatus('计算已停止；已有存档未被覆盖。当前仅保留最后画面，未保存的进度无法继续。');
    };
    const connection = new FlightWorkerConnection<LaunchCommand, FlightReply>(
      () => new Worker(new URL('./liftoff.worker.ts', import.meta.url), { type: 'module' }),
      data => {
        // A fresh worker has no original session to preserve after a rejected archive.
        if (awaitingRecovery && data.restoreFailed) {
          connection.dispose(); stop('存档未能恢复。');
          setStorageStatus(`${data.storageError ?? '恢复失败'} 已有存档未改写；最后画面保留，可重新选取存档或开始新任务。`);
          return;
        }
        setDemoPending(false);
        setDemo(data.demo ?? { ...DEMO_IDLE });
        if (data.ascentRecord) setAscentRecord(data.ascentRecord);
        if (data.boosterRecord !== undefined) setBoosterRecord(data.boosterRecord);
        if (data.state) {
          if (restarting.current && !awaitingRecovery) setStorageStatus('已重新开始地面任务；已有存档保留。');
          failed.current = false; restarting.current = false; setWorkerFailure(''); setRecovering(false); setState(data.state); setReady(true);
        }
        if (data.restored) awaitingRecovery = false;
        setPaused(data.paused); setError(data.error); setRate(data.rate); if (Number.isFinite(data.baseTime)) setBaseTime(data.baseTime);
        if (data.saved) { setSaved(data.saved); try { setStorageStatus(storeFlight(data.saved)); } catch (e) { setStorageStatus((e as Error).message); } }
        if (data.restored) { restoredConfig.current = data.config; restoreCallback.current(data.config); setRestoring(false); setRestoredCount(n => n + 1); setStorageStatus('已重算并恢复存档；配置、燃料、时间与事件均已恢复。当前已暂停，由你继续。'); }
        if (data.restoreFailed) { setRestoring(false); setStorageStatus(`${data.storageError ?? '恢复失败'} 原飞行仍保留，可继续或重试。`); }
      }, stop,
    );
    worker.current = connection;
    connection.send(bootRestore ?? { type: 'reset', config: configRef.current, baseTime: initialBaseTime });
    const visibility = () => { if (document.hidden) connection.send({ type: 'pause', value: true }); };
    document.addEventListener('visibilitychange', visibility); visibility();
    return () => { document.removeEventListener('visibilitychange', visibility); connection.dispose(); if (worker.current === connection) worker.current = null; };
  }, [generation, initialBaseTime]);
  useEffect(() => {
    if (config === restoredConfig.current) { restoredConfig.current = null; return; }
    if (!failed.current && !restarting.current) worker.current?.send({ type: 'reset', config, baseTime: initialBaseTime });
  }, [config, initialBaseTime]);
  const restart = (command: Extract<LaunchCommand, { type: 'restore' }> | null) => {
    if (restarting.current) return;
    worker.current?.dispose(); recoveryCommand.current = command; restarting.current = true;
    setReady(false); setPaused(true); setRecovering(true); setRestoring(!!command); setDemoPending(false);
    setStorageStatus(command ? '正在重新启动计算并重算存档，请稍候…' : '正在建立新的地面任务；已有存档保留。');
    setGeneration(n => n + 1);
  };
  return { demo, demoPending, workerFailure, recovering, state, ascentRecord, boosterRecord, paused, ready: ready && !restoring && !recovering, error, rate, baseTime, saved, storageStatus, restoring, restoredCount,
    send: (command: LaunchCommand) => {
      if (restarting.current) return;
      if (failed.current) { if (command.type === 'restore') restart(command); return; }
      if (!worker.current?.send(command)) return;
      if (command.type === 'demo-revisit' || command.type === 'demo-plan') setDemoPending(true);
      if (command.type === 'restore') { setRestoring(true); setStorageStatus('正在按原配置重算飞行，请稍候…'); }
    }, reset: () => restart(null) };
}
