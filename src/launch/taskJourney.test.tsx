import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { canEnterPostDeployment, demoTaskLocation, taskStep } from './taskJourney';
import { DEMO_IDLE } from './fullFlightDemo';
import { LiftoffSimulation, type FlightState } from './liftoff';
import { BASELINE_VEHICLE } from './vehicle';
import { satelliteEquipment } from './satellitePlan';
import { DemoChapterNavigation, LaunchTaskContext, NewFlightDemo } from '../components/LaunchTaskNavigation';

const base = () => new LiftoffSimulation(BASELINE_VEHICLE).state;
// Minimal record shapes for testing navigation only; no physics results are inferred from them.
const records = {
  ascent: {} as NonNullable<FlightState['ascent']>, orbit: {} as NonNullable<FlightState['orbit']>,
  deployment: { verified: true } as NonNullable<FlightState['deployment']>,
};
const ops = () => ({ ...base(), ...records, phase: 'ops-complete' as const, operations: {} as NonNullable<FlightState['operations']> });
const noop = () => {};

describe('task position and demo scope', () => {
  it('distinguishes base, unapplied assembly and ignition preparation', () => {
    expect(taskStep(base(), false)).toBe(0);
    expect(taskStep(base(), false, true)).toBe(1);
    expect(taskStep(base(), true)).toBe(2);
  });
  it('does not remain on deployment when later records coexist', () => {
    const operation = ops();
    expect(taskStep(operation, false)).toBe(7);
    expect(taskStep({ ...operation, lifecycle: {} as NonNullable<FlightState['lifecycle']> }, false)).toBe(8);
    expect(taskStep({ ...operation, satelliteEquipment: satelliteEquipment(500), satelliteDisposal: {} as NonNullable<FlightState['satelliteDisposal']> }, false)).toBe(8);
    expect(taskStep({ ...base(), ...records, reentry: {} as NonNullable<FlightState['reentry']> })).toBe(6);
  });
  it('unlocks follow-on tasks by checkpoints and retains both supported routes', () => {
    expect(canEnterPostDeployment(6, base())).toBe(false);
    expect(canEnterPostDeployment(6, { ...base(), ...records })).toBe(true);
    expect(canEnterPostDeployment(7, { ...base(), ...records, phase: 'deployment-complete' })).toBe(false);
    for (const phase of ['avoidance-complete', 'reentry-complete', 'reentry-surface'] as const) expect(canEnterPostDeployment(7, { ...base(), ...records, phase })).toBe(true);
    expect(canEnterPostDeployment(8, { ...ops(), phase: 'ops-data-ready' })).toBe(false);
    expect(canEnterPostDeployment(8, ops())).toBe(true);
    expect(canEnterPostDeployment(6, ops())).toBe(false);
  });
  it('shows current E02 independently of an E01 new-demo choice', () => {
    const current = renderToStaticMarkup(<LaunchTaskContext state={{ ...ops(), satelliteEquipment: satelliteEquipment(500) }} plan="powered" demo={DEMO_IDLE} flightView editing={false}/>);
    const setup = renderToStaticMarkup(<NewFlightDemo plan="unpowered" disabled={false} onPlan={noop} onStart={noop}/>);
    expect(current).toContain('E02 · 动力离轨');
    expect(current).toContain('08');
    expect(current).toContain('卫星工作');
    expect(setup).toContain('仅用于新演示');
    expect(setup).toContain('选择不会修改当前任务');
    expect(setup).toContain('<option value="unpowered" selected="">');
  });
  it('maps seven viewing chapters to task stages without claiming they are identical', () => {
    expect(demoTaskLocation(0)).toContain('01—03');
    expect(demoTaskLocation(5)).toContain('08 · 卫星工作');
    expect(demoTaskLocation(6)).toContain('09 · 任务收尾');
    const nav = renderToStaticMarkup(<DemoChapterNavigation demo={{ ...DEMO_IDLE, active: true, chapter: 5, visited: [0,1,2,3,4,5] }} busy={false} onRevisit={noop}/>);
    expect(nav.match(/<button/g)).toHaveLength(7);
    expect(nav.match(/aria-current="step"/g)).toHaveLength(1);
    expect(nav.match(/disabled=""/g)).toHaveLength(1);
    const pending = renderToStaticMarkup(<DemoChapterNavigation demo={{ ...DEMO_IDLE, active: true, visited: [0,1] }} busy onRevisit={noop}/>);
    expect(pending.match(/disabled=""/g)).toHaveLength(7);
  });
});
