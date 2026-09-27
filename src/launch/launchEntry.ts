import { LiftoffSimulation, type FlightState } from './liftoff';
import type { VehicleConfig } from './vehicle';

/** Explicit quick entry: simulate every prerequisite step, never synthesize a flight state. */
export function computeDeparture(config: VehicleConfig, current: FlightState): FlightState {
  if (current.phase !== 'ready') throw Error('已有试飞进行中。请继续当前试飞或先重置，快速入口不会覆盖它。');
  const simulation = new LiftoffSimulation(config); simulation.start();
  for (let i = 0; i < 3000 && ['countdown', 'ignition', 'ascending'].includes(simulation.state.phase); i++) simulation.step();
  if (simulation.state.phase !== 'complete') throw Error(`前置离台计算未通过：${simulation.state.message}`);
  const result = simulation.snapshot();
  result.events.push({ time: result.time, label: '快速体验：已计算倒计时和离台过程，保留耗油、速度与时间' });
  return result;
}
