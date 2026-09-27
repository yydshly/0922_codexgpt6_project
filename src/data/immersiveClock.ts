import type { StateFrame } from '../types';
import type { SatelliteState } from '../ephemeris/satellites';
import { tdbToUtc, utcToTdb } from './time';

export interface ImmersiveSample { frame: StateFrame; satellites: SatelliteState[] | null }
export interface ImmersiveClockState extends ImmersiveSample { playing: boolean; speed: number; loading: boolean; error: string; atEnd: boolean }
export interface ImmersiveSource {
  sample(time: number, saturn: boolean): ImmersiveSample | null;
  load(time: number, saturn: boolean): Promise<ImmersiveSample>;
}
export const immersiveDate = (time: number) => new Date(tdbToUtc(time).getTime() + 8 * 3600e3).toISOString().slice(0, 19);
export function parseImmersiveDate(value: string) {
  const milliseconds = Date.parse(`${value}+08:00`);
  return Number.isFinite(milliseconds) ? utcToTdb(milliseconds) : NaN;
}

/** Publish an epoch only after all visible families have that same epoch. No catch-up after IO. */
export class ImmersiveClock {
  state: ImmersiveClockState;
  private generation = 0;
  private saturn = false;
  private requested: number;
  private requestKind: 'advance' | 'seek' | 'context' = 'context';
  constructor(initial: StateFrame, private range: { start: number; end: number }, private source: ImmersiveSource, private changed: (state: ImmersiveClockState) => void) {
    this.state = { frame: initial, satellites: null, playing: false, speed: 3600, loading: false, error: '', atEnd: initial.time >= range.end };
    this.requested = initial.time;
  }
  private emit(update: Partial<ImmersiveClockState>) { this.state = { ...this.state, ...update }; this.changed(this.state); }
  private accept(sample: ImmersiveSample) {
    if (sample.frame.time !== this.requested || (this.saturn && (!sample.satellites || sample.satellites.length === 0))) throw new Error('历表时刻或卫星数据未对齐');
    const atEnd = sample.frame.time >= this.range.end;
    this.emit({ ...sample, loading: false, error: '', atEnd, playing: this.state.playing && !atEnd });
  }
  private request(time: number, kind: 'advance' | 'seek' | 'context') {
    const token = ++this.generation;
    this.requested = time; this.requestKind = kind;
    try {
      const cached = this.source.sample(time, this.saturn);
      if (cached) { this.accept(cached); return; }
      this.emit({ loading: true, error: '' });
      void this.source.load(time, this.saturn).then(sample => {
        if (token !== this.generation) return;
        this.accept(sample);
      }).catch(error => {
        if (token === this.generation) this.emit({ loading: false, playing: false, error: error instanceof Error ? error.message : '历表读取失败' });
      });
    } catch (error) { this.emit({ loading: false, playing: false, error: error instanceof Error ? error.message : '历表读取失败' }); }
  }
  requireSaturn(required: boolean) {
    if (required === this.saturn) return;
    this.saturn = required;
    this.emit({ satellites: null, error: '' });
    this.request(this.state.frame.time, 'context');
  }
  setSpeed(speed: number) { if ([1, 3600, 21600, 86400].includes(speed)) this.emit({ speed }); }
  pause() {
    // A paused frame must not jump when an in-flight playback month finally arrives.
    if (this.state.loading && this.requestKind === 'advance') { this.generation++; this.emit({ loading: false }); }
    this.emit({ playing: false });
  }
  play() { if (!this.state.loading && !this.state.error && !this.state.atEnd) this.emit({ playing: true }); }
  tick(seconds: number) {
    if (!this.state.playing || this.state.loading || this.state.error || !Number.isFinite(seconds) || seconds <= 0) return;
    this.request(Math.min(this.range.end, this.state.frame.time + Math.min(seconds, .25) * this.state.speed), 'advance');
  }
  seek(time: number) {
    this.generation++; this.emit({ playing: false, loading: false });
    if (!Number.isFinite(time) || time < this.range.start || time > this.range.end) {
      this.requested = this.state.frame.time;
      this.emit({ error: '日期超出内置历表范围，请选择标注范围内的北京时间。' }); return;
    }
    this.request(time, 'seek');
  }
  retry() { this.request(this.requested, 'seek'); }
  dispose() { this.generation++; }
}
