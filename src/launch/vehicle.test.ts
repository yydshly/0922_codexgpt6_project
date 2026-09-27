import { describe, expect, it } from 'vitest';
import { BASELINE_VEHICLE, compileVehicle, deriveVehicle, loadVehicle, PAD_GRAVITY, parseVehicle, saveVehicle, STANDARD_GRAVITY, VEHICLE_STORAGE_KEY } from './vehicle';

const memoryStorage = () => {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
};
describe('launch vehicle assembly', () => {
  it('preserves the frozen baseline and accounts for both stages, fairing and payload', () => {
    const v = compileVehicle(BASELINE_VEHICLE);
    expect(v.wetKg).toBe(233300); expect(v.fuelKg).toBe(216000); expect(v.dryAndPayloadKg).toBe(17300);
    expect(v.twr).toBeCloseTo(3200000 / (233300 * PAD_GRAVITY), 12);
    expect(v.initialFuelKg).toEqual([180000, 36000]);
    expect(v.wetKg - v.stages[0].fuelKg - v.stages[0].dryKg).toBe(39300);
    expect(v.stages[1].wetKg + v.payloadKg + v.fairingKg).toBe(39300);
  });
  it('uses two separate rocket-equation mass ratios across staging', () => {
    const v = deriveVehicle(BASELINE_VEHICLE);
    expect(v.idealDeltaVMS).toBeCloseTo(STANDARD_GRAVITY * (315 * Math.log(233300 / 53300) + 345 * Math.log(39300 / 3300)), 9);
    expect(v.stages[0].ratedBurnSeconds * v.stages[0].massFlowKgS).toBeCloseTo(180000, 8);
  });
  it('changes mass and performance without changing tank capacity when fuel or payload changes', () => {
    const baseline = deriveVehicle(BASELINE_VEHICLE);
    const reduced = deriveVehicle({ ...BASELINE_VEHICLE, boosterFillPercent: 50 });
    expect(reduced.wetKg).toBe(baseline.wetKg - 90000); expect(reduced.twr).toBeGreaterThan(baseline.twr);
    expect(reduced.idealDeltaVMS).toBeLessThan(baseline.idealDeltaVMS);
    const lightPayload = deriveVehicle({ ...BASELINE_VEHICLE, payloadKg: 250 });
    expect(lightPayload.wetKg).toBe(baseline.wetKg - 250); expect(lightPayload.idealDeltaVMS).toBeGreaterThan(baseline.idealDeltaVMS);
  });
  it('blocks insufficient liftoff thrust and empty stages; a lighter fueled config may pass the static check', () => {
    const weak = { ...BASELINE_VEHICLE, boosterEngine: 'b-light' as const };
    expect(deriveVehicle(weak).twr).toBeLessThan(1); expect(() => compileVehicle(weak)).toThrow('推重比');
    expect(deriveVehicle({ ...weak, boosterFillPercent: 50 }).canApply).toBe(true);
    for (const field of ['boosterFillPercent', 'upperFillPercent']) expect(deriveVehicle({ ...BASELINE_VEHICLE, [field]: 0 }).canApply).toBe(false);
  });
  it('includes the engine dry mass and uses the rated environment for burn time', () => {
    const v = deriveVehicle({ ...BASELINE_VEHICLE, upperEngine: 'u-efficient' });
    expect(v.wetKg).toBe(233650); expect(v.stages[1].dryKg).toBe(2550);
    expect(v.stages[1].massFlowKgS).toBeCloseTo(340000 / (365 * STANDARD_GRAVITY), 10);
  });
  it('rejects incompatible engines and malformed values at the boundary', () => {
    for (const change of [{ boosterEngine: 'u-standard' }, { upperEngine: 'unknown' }, { payloadKg: 5000 }, { boosterFillPercent: NaN }, { boosterFillPercent: 101 }, { upperFillPercent: -25 }, { upperFillPercent: 12.5 }, { payloadKg: '500' }]) {
      expect(() => parseVehicle({ ...BASELINE_VEHICLE, ...change })).toThrow();
    }
  });
  it('round trips an invalid-for-flight draft separately from a valid applied vehicle', () => {
    const storage = memoryStorage(), draft = { ...BASELINE_VEHICLE, boosterFillPercent: 0 };
    expect(saveVehicle(draft, BASELINE_VEHICLE, storage).ok).toBe(true);
    const loaded = loadVehicle(storage); expect(loaded.kind).toBe('loaded');
    if (loaded.kind === 'loaded') { expect(loaded.value.draft).toEqual(draft); expect(compileVehicle(loaded.value.applied)).toEqual(compileVehicle(BASELINE_VEHICLE)); }
  });
  it('does not overwrite a valid save if an applied configuration is invalid', () => {
    const storage = memoryStorage(); saveVehicle(BASELINE_VEHICLE, BASELINE_VEHICLE, storage);
    const old = storage.getItem(VEHICLE_STORAGE_KEY);
    expect(saveVehicle(BASELINE_VEHICLE, { ...BASELINE_VEHICLE, upperFillPercent: 0 }, storage).ok).toBe(false);
    expect(storage.getItem(VEHICLE_STORAGE_KEY)).toBe(old);
  });
  it('reports damaged, future and mismatched mission saves without replacing them', () => {
    for (const raw of ['{', 'null', JSON.stringify({ schema: 99 }), JSON.stringify({ schema: 1, missionVersion: 'other' })]) {
      const storage = memoryStorage(); storage.setItem(VEHICLE_STORAGE_KEY, raw);
      expect(loadVehicle(storage).kind).toBe('error'); expect(storage.getItem(VEHICLE_STORAGE_KEY)).toBe(raw);
    }
  });
  it('reports unavailable storage instead of losing the in-memory configuration or crashing', () => {
    const storage = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('quota'); } };
    expect(loadVehicle(storage).kind).toBe('error'); expect(saveVehicle(BASELINE_VEHICLE, BASELINE_VEHICLE, storage).ok).toBe(false);
    expect(loadVehicle(memoryStorage()).kind).toBe('empty');
  });
});
