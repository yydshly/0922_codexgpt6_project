import type { VehicleConfig } from './vehicle';
import { FlightSession, type FlightAction } from './flightSession';
export type LaunchCommand = { type: 'reset'; config: VehicleConfig; baseTime: number } | { type: Exclude<FlightAction, 'reset'> | 'save' } | { type: 'restore'; raw: string } | { type: 'pause'; value: boolean } | { type: 'rate'; value: number };
let session: FlightSession | undefined, last = performance.now();
const publish = (error = '', extra = {}) => self.postMessage({ state: session?.clock.simulation.snapshot(), config: session?.config, baseTime: session?.baseTime, paused: session?.clock.paused ?? true, rate: session?.rate ?? 1, error, ...extra });
self.onmessage = ({ data }: MessageEvent<LaunchCommand>) => {
  try {
    if (data.type === 'reset') session = new FlightSession(data.config, data.baseTime);
    else if (data.type === 'restore') {
      session?.pause(true); const restored = FlightSession.restore(data.raw); session = restored; last = performance.now(); publish('', { restored: true }); return;
    } else if (!session) throw Error('发射计算尚未就绪');
    else if (data.type === 'save') { session.pause(true); publish('', { saved: session.save() }); return; }
    else if (data.type === 'pause') session.pause(data.value);
    else if (data.type === 'rate') session.setRate(data.value);
    else session.action(data.type);
    last = performance.now(); publish();
  } catch (error) { session?.pause(true); const message = error instanceof Error ? error.message : '发射计算失败'; publish(data.type === 'restore' ? '' : message, { restoreFailed: data.type === 'restore', storageError: message }); }
};
setInterval(() => { const now = performance.now(); if (session && !session.clock.paused && session.running) { session.advance((now - last) / 1000); publish(); } last = now; }, 50);
