import { describe, expect, it } from 'vitest';
import { LAUNCH_EARTH } from '../data/launchMission';
import { norm } from './ascent';
import { atmosphereLayer, ENVIRONMENT_EXAMPLES, examplePosition } from './flightEnvironment';

describe('flight environment annotations', () => {
  it('recognizes approximate atmosphere bands without declaring a vacuum at 100 km', () => {
    expect(atmosphereLayer(0).id).toBe('troposphere'); expect(atmosphereLayer(12000).id).toBe('stratosphere');
    expect(atmosphereLayer(50000).id).toBe('mesosphere'); expect(atmosphereLayer(100000).id).toBe('thermosphere');
    expect(atmosphereLayer(700000).id).toBe('exosphere');
  });
  it('keeps circular examples outside Earth and distinguishes open natural flybys', () => {
    for (const item of ENVIRONMENT_EXAMPLES) for (const time of [0, 100, 600]) {
      const radius = norm(examplePosition(item, time)); expect(radius).toBeGreaterThan(LAUNCH_EARTH.semiMajorM + 300000);
      if (item.kind !== 'meteoroid') expect(radius).toBeCloseTo(item.radius, 6);
    }
    const flyby = ENVIRONMENT_EXAMPLES.find(item => item.kind === 'meteoroid')!;
    expect(norm(examplePosition(flyby, 120))).toBeLessThan(norm(examplePosition(flyby, 600)));
  });
  it('uses the supplied flight time deterministically, so pause and replay match', () => {
    const example = ENVIRONMENT_EXAMPLES[0]; expect(examplePosition(example, 32)).toEqual(examplePosition(example, 32));
    expect(examplePosition(example, 33)).not.toEqual(examplePosition(example, 32));
    expect(new Set(ENVIRONMENT_EXAMPLES.map(item => item.kind)).size).toBe(4);
  });
});
