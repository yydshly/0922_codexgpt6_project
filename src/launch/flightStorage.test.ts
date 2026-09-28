import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FlightSession } from './flightSession';
import { BASELINE_VEHICLE } from './vehicle';
import { FLIGHT_STORAGE_KEY, hasSessionCopy, readFlightArchive, storeFlight } from './flightStorage';

describe('flight archive inspection and export availability', () => {
  let records: Map<string, string>;
  let setItem: ReturnType<typeof vi.fn>;
  const save = () => new FlightSession(BASELINE_VEHICLE, 843800000).save();
  beforeEach(() => {
    records = new Map(); setItem = vi.fn((key: string, raw: string) => records.set(key, raw));
    vi.stubGlobal('localStorage', { getItem: (key: string) => records.get(key) ?? null, setItem });
  });
  afterEach(() => vi.unstubAllGlobals());
  it('distinguishes an empty browser from an unreadable one without writing', () => {
    expect(readFlightArchive()).toEqual({ kind: 'empty' });
    vi.stubGlobal('localStorage', { getItem: () => { throw Error('denied'); } });
    expect(readFlightArchive()).toMatchObject({ kind: 'error', message: expect.stringContaining('无法读取') });
    expect(setItem).not.toHaveBeenCalled();
  });
  it('keeps the exact existing file available for export without a new save', () => {
    const value = save(), raw = JSON.stringify(value, null, 2);
    records.set(FLIGHT_STORAGE_KEY, raw);
    expect(readFlightArchive()).toEqual({ kind: 'stored', raw, save: value });
    expect(hasSessionCopy(null, readFlightArchive())).toBe(false);
    expect(hasSessionCopy(value, readFlightArchive())).toBe(false);
    expect(setItem).not.toHaveBeenCalled();
  });
  it.each(['', '{bad json', JSON.stringify({ version: 'future-version' })])('preserves malformed or incompatible data: %s', raw => {
    records.set(FLIGHT_STORAGE_KEY, raw);
    expect(readFlightArchive().kind).toBe('error');
    expect(records.get(FLIGHT_STORAGE_KEY)).toBe(raw);
    expect(setItem).not.toHaveBeenCalled();
  });
  it('rejects a changed snapshot but never deletes it', () => {
    const value = save(); value.snapshot.time++;
    const raw = JSON.stringify(value); records.set(FLIGHT_STORAGE_KEY, raw);
    expect(readFlightArchive()).toMatchObject({ kind: 'error', message: expect.stringContaining('校验失败') });
    expect(records.get(FLIGHT_STORAGE_KEY)).toBe(raw);
  });
  it('retains the older browser archive and exposes the session copy if a new save fails', () => {
    const older = save(), raw = JSON.stringify(older); records.set(FLIGHT_STORAGE_KEY, raw);
    const session = new FlightSession(BASELINE_VEHICLE, 843800000); session.action('start'); session.advanceSteps(20);
    const newer = session.save(); setItem.mockImplementation(() => { throw Error('quota'); });
    expect(() => storeFlight(newer)).toThrow('请导出文件');
    expect(records.get(FLIGHT_STORAGE_KEY)).toBe(raw);
    expect(hasSessionCopy(newer, readFlightArchive())).toBe(true);
    expect(hasSessionCopy(newer, { kind: 'empty' })).toBe(true);
  });
  it('updates the browser record only on explicit save and no longer needs a separate copy', () => {
    const value = save(); storeFlight(value);
    expect(setItem).toHaveBeenCalledExactlyOnceWith(FLIGHT_STORAGE_KEY, JSON.stringify(value));
    expect(hasSessionCopy(value, readFlightArchive())).toBe(false);
  });
});
