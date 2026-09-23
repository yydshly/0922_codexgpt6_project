/** Reserve existing worker debt before adding new time, so a partial final
 * step can never advance beyond the supported ephemeris interval. */
export function physicsAdvanceBudget(time: number, end: number, pending: number, requested: number, step = 300): { seconds: number; atBoundary: boolean } {
  const available = Math.max(0, end - time);
  return { seconds: Math.max(0, Math.min(requested, available - pending)), atBoundary: available + 1e-9 < step };
}
