import { LAUNCH_STEPS } from '../data/launchMission';
import type { FlightState } from './liftoff';

/** The first six steps keep their existing meaning; deployment is not the end of the mission. */
export const TASK_STEPS = [...LAUNCH_STEPS, '二级处置', '卫星工作', '任务收尾'] as const;
export const DEMO_TASK_STEPS = [2, 3, 4, 5, 6, 7, 8] as const;
export function taskStep(state: FlightState, flightView = true, editing = false) {
  if (state.satelliteDisposal || state.lifecycle) return 8;
  if (state.operations) return 7;
  if (state.reentry || state.deployment?.deorbit || state.deployment?.avoidance) return 6;
  if (state.deployment) return 5;
  if (state.orbit) return 4;
  if (state.ascent) return 3;
  if (state.phase !== 'ready' || flightView) return 2;
  return editing ? 1 : 0;
}
export function demoTaskLocation(chapter: number) {
  const step = DEMO_TASK_STEPS[chapter];
  return chapter === 0 ? '任务步骤 01—03 · 基地、基准组装与检查点火' : step === undefined ? '正在同步任务位置' : `任务步骤 ${String(step + 1).padStart(2, '0')} · ${TASK_STEPS[step]}`;
}

/** Availability follows actual checkpoints, never elapsed time or a selected camera. */
export function canEnterPostDeployment(step: number, state: FlightState) {
  if (step === 6) return !!state.deployment?.verified && !state.operations;
  if (step === 7) return !!state.operations || ['avoidance-complete', 'reentry-complete', 'reentry-surface'].includes(state.phase);
  if (step === 8) return !!state.lifecycle || !!state.satelliteDisposal || state.phase === 'ops-complete';
  return false;
}
