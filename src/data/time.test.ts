import { describe, expect, it } from 'vitest';
import { taiMinusUtc, tdbMinusTt, tdbToUtc, utcToTdb, J2000_UNIX_MS } from './time';

describe('UTC / TT / TDB conversion', () => {
  it('uses the effective leap-second table across the 2017 transition', () => {
    const before=Date.parse('2016-12-31T23:59:59Z'),after=Date.parse('2017-01-01T00:00:00Z');
    expect(taiMinusUtc(before)).toBe(36);expect(taiMinusUtc(after)).toBe(37);
    expect(utcToTdb(after)-utcToTdb(before)).toBeCloseTo(2,5);
  });
  it('includes TT offset and the periodic TDB correction', () => {
    const utc=Date.parse('2026-01-01T00:00:00Z'),tdb=utcToTdb(utc);
    expect(tdb-(utc-J2000_UNIX_MS)/1000).toBeCloseTo(69.184+tdbMinusTt(tdb),6);
    expect(Math.abs(tdbMinusTt(tdb))).toBeLessThan(0.0017);
    expect(utcToTdb(new Date(J2000_UNIX_MS))).toBeCloseTo(64.183927,5);
  });
  it.each(['2026-01-01T00:00:00.000Z','2026-09-22T08:12:34.567Z','2027-12-31T23:59:59.999Z','2028-01-01T00:00:00.000Z'])(
    'round-trips %s to the millisecond', value => expect(tdbToUtc(utcToTdb(new Date(value))).toISOString()).toBe(value));
  it('equates Beijing date offsets with the same UTC instant', () => {
    expect(utcToTdb(new Date('2026-09-22T08:00:00+08:00'))).toBe(utcToTdb(new Date('2026-09-22T00:00:00Z')));
  });
  it('rejects invalid times', () => {
    expect(()=>utcToTdb(new Date('invalid'))).toThrow(RangeError);
    expect(()=>tdbToUtc(NaN)).toThrow(RangeError);
  });
});
