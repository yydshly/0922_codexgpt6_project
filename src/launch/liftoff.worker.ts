import type { SatellitePlan } from './satellitePlan';
import type { VehicleConfig } from './vehicle';
import { FlightSession, type FlightAction } from './flightSession';
import { DEMO_IDLE, FullFlightDemo } from './fullFlightDemo';
export type LaunchCommand = { type: 'reset'; config: VehicleConfig; baseTime: number } | { type: Exclude<FlightAction, 'reset'> | 'save' | 'demo-exit' } | { type: 'demo-start'; plan?: SatellitePlan } | { type: 'demo-speed'; value: 1 | 3 } | { type: 'restore'; raw: string } | { type: 'pause'; value: boolean } | { type: 'rate'; value: number };
let session: FlightSession | undefined, demo: FullFlightDemo | undefined, last = performance.now(), lastRecord = -Infinity;
const publish = (error = '', extra = {}, includeRecord = true) => {
  if (includeRecord) lastRecord = performance.now();
  self.postMessage({ state: session?.clock.simulation.snapshot(), ...(includeRecord ? { ascentRecord: session?.ascentRecord.snapshot() } : {}), config: session?.config, baseTime: session?.baseTime, paused: demo ? demo.status.paused : session?.clock.paused ?? true, rate: session?.rate ?? 1, demo: demo?.status ?? DEMO_IDLE, error, ...extra });
};
self.onmessage = ({ data }: MessageEvent<LaunchCommand>) => {
  try {
    if (data.type === 'demo-start') {
      if (!session || demo) throw Error('当前不能新建演示。');
      if (data.plan !== undefined && !['powered','unpowered'].includes(data.plan)) throw Error('演示方案无效。');
      demo = new FullFlightDemo(session, data.plan); session = demo.session;
    } else if (data.type === 'demo-exit') {
      if (demo) { session = demo.stop(); demo = undefined; }
    } else if (data.type === 'demo-speed') {
      if (!demo || ![1,3].includes(data.value)) throw Error('演示倍率无效。'); demo.setSpeed(data.value);
    } else if (data.type === 'pause') {
      if (demo) demo.pause(data.value); else session?.pause(data.value);
    } else if (demo) {
      demo.pause(true); throw Error('请先退出演示并返回原任务，再执行手动操作或保存。');
    } else if (data.type === 'reset') session = new FlightSession(data.config, data.baseTime);
    else if (data.type === 'restore') {
      session?.pause(true); const restored = FlightSession.restore(data.raw); session = restored; last = performance.now(); publish('', { restored: true }); return;
    } else if (!session) throw Error('发射计算尚未就绪');
    else if (data.type === 'save') { session.pause(true); publish('', { saved: session.save() }); return; }
    else if (data.type === 'rate') session.setRate(data.value);
    else session.action(data.type);
    last = performance.now(); publish();
  } catch (error) { if (demo) demo.pause(true); session?.pause(true); const message = error instanceof Error ? error.message : '发射计算失败'; publish(data.type === 'restore' ? '' : message, { restoreFailed: data.type === 'restore', storageError: message }); }
};
setInterval(() => { const now = performance.now(); if (demo && !demo.status.paused && !demo.status.finished) { demo.advance((now - last) / 1000); publish('', {}, !session?.running || now - lastRecord >= 500); } else if (session && !session.clock.paused && session.running) { session.advance((now - last) / 1000); publish('', {}, !session.running || now - lastRecord >= 500); } last = now; }, 50);
