import type { DemoStatus } from '../launch/fullFlightDemo';
import type { FlightState } from '../launch/liftoff';
import { demoPlayback } from '../launch/demoPlayback';
import { flightPhaseName, flightTime } from './LaunchControl';
import './DemoPlaybackStatus.css';

export function DemoPlaybackStatus({ state, demo, busy }: { state: FlightState; demo: DemoStatus; busy: boolean }) {
  const reading = demoPlayback(state, demo, busy);
  return <section className="demo-playback-status" data-playback-kind={reading.kind} aria-label="演示状态与下一步">
    <strong role={reading.kind === 'error' ? 'alert' : 'status'}>{reading.title}</strong>
    <div className="demo-playback-time">{flightPhaseName(state)} · <span data-demo-time>{flightTime(state.time)}</span></div>
    <p>{reading.detail}</p>
    {reading.checkpoint && <div className="demo-checkpoint-progress">
      <progress aria-label="本检查点讲解进度" max={reading.checkpoint.durationS} value={reading.elapsedS}/>
      <span data-demo-hold>讲解剩余 {Math.ceil(reading.remainingS!)} 秒 · {reading.kind === 'paused' ? '已暂停计时' : '播放时间'}</span>
      <b>随后：{reading.checkpoint.next}</b>
    </div>}
  </section>;
}
