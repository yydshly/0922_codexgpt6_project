/** UTC <-> TDB, seconds since 2000-01-01 12:00:00 TDB.
 * Implements the NAIF DELTET analytic approximation (naif0012.tls).
 * Precision is suitable for this viewer, not observatory time transfer.
 * Future dates assume the latest published TAI-UTC=37s; refresh if IERS
 * announces a leap second. JavaScript cannot represent UTC 23:59:60.
 */
export const J2000_UNIX_MS = Date.UTC(2000, 0, 1, 12);
export const DAY_SECONDS = 86400;
export const AU_KM = 149597870.7;
const leapSeconds: readonly [number, number][] = [
  [Date.UTC(1972,0,1),10], [Date.UTC(1972,6,1),11], [Date.UTC(1973,0,1),12],
  [Date.UTC(1974,0,1),13], [Date.UTC(1975,0,1),14], [Date.UTC(1976,0,1),15],
  [Date.UTC(1977,0,1),16], [Date.UTC(1978,0,1),17], [Date.UTC(1979,0,1),18],
  [Date.UTC(1980,0,1),19], [Date.UTC(1981,6,1),20], [Date.UTC(1982,6,1),21],
  [Date.UTC(1983,6,1),22], [Date.UTC(1985,6,1),23], [Date.UTC(1988,0,1),24],
  [Date.UTC(1990,0,1),25], [Date.UTC(1991,0,1),26], [Date.UTC(1992,6,1),27],
  [Date.UTC(1993,6,1),28], [Date.UTC(1994,6,1),29], [Date.UTC(1996,0,1),30],
  [Date.UTC(1997,6,1),31], [Date.UTC(1999,0,1),32], [Date.UTC(2006,0,1),33],
  [Date.UTC(2009,0,1),34], [Date.UTC(2012,6,1),35], [Date.UTC(2015,6,1),36],
  [Date.UTC(2017,0,1),37],
];
export function taiMinusUtc(utcMs: number): number {
  if (!Number.isFinite(utcMs) || utcMs < leapSeconds[0][0]) throw new RangeError('UTC 时间无效，或早于 1972 年');
  for (let i=leapSeconds.length-1;i>=0;i--) if (utcMs >= leapSeconds[i][0]) return leapSeconds[i][1];
  return 10;
}
export function tdbMinusTt(tdb: number): number {
  const m = 6.239996 + 1.99096871e-7 * tdb;
  return 1.657e-3 * Math.sin(m + 1.671e-2 * Math.sin(m));
}
export function utcToTdb(utc: Date | number): number {
  const ms = typeof utc === 'number' ? utc : utc.getTime();
  const tt = (ms-J2000_UNIX_MS)/1000 + taiMinusUtc(ms) + 32.184;
  let tdb = tt;
  for (let i=0;i<3;i++) tdb = tt+tdbMinusTt(tdb);
  return tdb;
}
export function tdbToUtc(tdb: number): Date {
  if (!Number.isFinite(tdb)) throw new RangeError('TDB 时间无效');
  const ttMs = (tdb-tdbMinusTt(tdb)-32.184)*1000+J2000_UNIX_MS;
  let ms = ttMs - 37000;
  for (let i=0;i<3;i++) ms = ttMs-taiMinusUtc(ms)*1000;
  return new Date(Math.round(ms));
}
