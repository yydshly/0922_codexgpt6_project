import { useEffect, useRef, useState } from 'react';
import { getFrame, sampleFrame } from '../ephemeris/ephemeris';
import { getSatelliteFrame, sampleSatelliteFrame } from '../ephemeris/satellites';
import { ImmersiveClock, type ImmersiveClockState, type ImmersiveSource } from '../data/immersiveClock';
import type { StateFrame } from '../types';

const source: ImmersiveSource = {
  sample(time, saturn) {
    const frame = sampleFrame(time);
    const satellites = saturn ? sampleSatelliteFrame(time, 'saturn') : null;
    return frame && (!saturn || satellites?.time === time) ? { frame, satellites: satellites?.states ?? null } : null;
  },
  async load(time, saturn) {
    const [frame, satellites] = await Promise.all([getFrame(time), saturn ? getSatelliteFrame(time, 'saturn') : Promise.resolve(null)]);
    if (saturn && satellites?.time !== time) throw new Error('母星与卫星历表时刻不一致');
    return { frame, satellites: satellites?.states ?? null };
  },
};

export function useImmersiveClock(initial: StateFrame, start: number, end: number, saturn: boolean) {
  const control = useRef<ImmersiveClock | null>(null);
  const [state, setState] = useState<ImmersiveClockState>({ frame: initial, satellites: null, playing: false, speed: 3600, loading: false, error: '', atEnd: initial.time >= end });
  useEffect(() => {
    const clock = new ImmersiveClock(initial, { start, end }, source, setState); control.current = clock;
    let raf = 0, last = performance.now(), elapsed = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      if (document.hidden || !clock.state.playing || clock.state.loading) elapsed = 0;
      else { elapsed += Math.min(dt, .25); if (elapsed >= 1 / 30) { clock.tick(elapsed); elapsed = 0; } }
      raf = requestAnimationFrame(tick);
    };
    const visibility = () => { last = performance.now(); elapsed = 0; };
    document.addEventListener('visibilitychange', visibility);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', visibility); clock.dispose(); control.current = null; };
  }, [initial, start, end]);
  useEffect(() => { control.current?.requireSaturn(saturn); }, [saturn, initial, start, end]);
  return { ...state, toggle: () => { const clock = control.current; if (clock?.state.playing) clock.pause(); else clock?.play(); },
    pause: () => control.current?.pause(), seek: (time: number) => control.current?.seek(time),
    setSpeed: (speed: number) => control.current?.setSpeed(speed), retry: () => control.current?.retry() };
}
