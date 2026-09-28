/** Compatibility tolerance for replay verification, not a change to integrator precision.
 * Retain the locally recomputed state; never import saved state into the solver.
 * Absolute floor covers near-zero conservation residuals; relative allowance covers
 * accumulated floating-point roundoff. Topology, text, flags and pairs of integer values stay exact.
 */
export const REPLAY_ROUNDOFF = { absolute: 1e-5, relative: 1e-10 } as const;

export function replayMatches(saved: unknown, computed: unknown): boolean {
  if (typeof saved === 'number' && typeof computed === 'number') {
    if (!Number.isFinite(saved) || !Number.isFinite(computed)) return false;
    if (saved === computed) return true;
    if (Number.isInteger(saved) && Number.isInteger(computed)) return false;
    return Math.abs(saved - computed) <= REPLAY_ROUNDOFF.absolute + REPLAY_ROUNDOFF.relative * Math.max(Math.abs(saved), Math.abs(computed));
  }
  if (saved === computed) return true;
  if (!saved || !computed || typeof saved !== 'object' || typeof computed !== 'object') return false;
  if (Array.isArray(saved) !== Array.isArray(computed)) return false;
  if (Array.isArray(saved) && Array.isArray(computed)) {
    return saved.length === computed.length && saved.every((value, i) => replayMatches(value, computed[i]));
  }
  const a = saved as Record<string, unknown>, b = computed as Record<string, unknown>;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && replayMatches(a[key], b[key]));
}
