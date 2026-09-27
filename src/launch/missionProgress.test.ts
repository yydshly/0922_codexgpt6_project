import { describe, expect, it } from 'vitest';
import { LiftoffSimulation, type FlightState } from './liftoff';
import { BASELINE_VEHICLE } from './vehicle';
import { missionProgress } from './missionProgress';

const ready = () => new LiftoffSimulation(BASELINE_VEHICLE).snapshot();
// Deliberately minimal telemetry: progress must depend only on model milestones.
const at = (phase: FlightState['phase'], fields: Partial<FlightState> = {}) => ({ ...ready(), phase, ...fields });
describe('mission progress reflects calculated milestones', () => {
  it('does not pass checks for opening the base, altitude alone or failed liftoff', () => {
    expect(missionProgress(ready()).statuses).toEqual(['available', 'configured', 'pending', 'pending', 'pending', 'pending']);
    expect(missionProgress(at('ascending', { heightM: 500000 })).checksPassed).toBe(0);
    expect(missionProgress(at('aborted')).statuses[2]).toBe('stopped');
  });
  it('does not confuse high-altitude ascent or orbital prediction with a verified orbit', () => {
    const ascent = {} as NonNullable<FlightState['ascent']>, orbit = {} as NonNullable<FlightState['orbit']>;
    expect(missionProgress(at('ascent-complete', { ascent })).statuses.slice(2)).toEqual(['passed', 'passed', 'pending', 'pending']);
    expect(missionProgress(at('orbit-review', { ascent, orbit })).statuses.slice(2)).toEqual(['passed', 'passed', 'active', 'pending']);
    expect(missionProgress(at('orbit-failed', { ascent, orbit })).statuses[4]).toBe('stopped');
    expect(missionProgress(at('orbit-complete', { ascent, orbit })).checksPassed).toBe(3);
  });
  it('requires deployment verification, retains earlier milestones and clears them on reset', () => {
    const deployment = { verified: false } as NonNullable<FlightState['deployment']>, ascent = {} as NonNullable<FlightState['ascent']>, orbit = {} as NonNullable<FlightState['orbit']>;
    expect(missionProgress(at('deploying', { deployment, ascent, orbit })).checksPassed).toBe(3);
    const verified = { ...deployment, verified: true };
    expect(missionProgress(at('deployment-complete', { deployment: verified, ascent, orbit })).checksPassed).toBe(4);
    expect(missionProgress(at('deployment-failed', { deployment: verified, ascent, orbit })).statuses[5]).toBe('stopped');
    expect(missionProgress(ready()).checksPassed).toBe(0);
  });
});
