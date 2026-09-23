import type { BodyDefinition, BodyId } from '../types';

export type SpatialView = 'overview' | 'inner' | 'outer';

/**
 * Presentation-only layout in arbitrary scene units, NOT scientific coordinates.
 *
 * Distances and radii are deliberately exaggerated by different rules so bodies
 * remain visible. These results must never enter StateFrame, the ephemeris,
 * physics integration, distance readouts, or the true-size comparison view.
 *
 * Apply distance to a COPY of a Sun-relative position: keep its unit direction
 * and multiply by mapOrbitalDistance(lengthInAu, view). Treat a zero vector as
 * zero without normalizing it. This preserves direction and inclination while
 * distorting radial spacing and orbital shape. Satellite local layouts belong
 * to the caller; mapping the Sun-relative distance alone will not separate moons.
 */
export function mapOrbitalDistance(au: number, view: SpatialView): number {
  if (!Number.isFinite(au) || au < 0) throw new RangeError('展示距离必须是有限、非负的 AU 数值');
  // The smooth central term gives Mercury room outside the enlarged Sun even
  // near perihelion. Both derivatives are positive for any finite au >= 0.
  // Mercury ~4.2, Earth ~7.0, Jupiter ~16.0, Neptune ~29.4 scene units.
  const distance = view === 'inner'
    ? au * 5
    : 2 * Math.tanh(5 * au) + 8.5 * Math.log1p(.8 * au);
  if (!Number.isFinite(distance)) throw new RangeError('展示距离超出可表示范围');
  return distance;
}

// Fixed presentation radii, independent of camera distance, viewport or pixels.
// Preserve the Earth/Moon radius ratio to approximately four decimal places;
// the other ratios are explicitly illustrative and do not claim physical scale.
const MOON_TO_EARTH = .2727;
const GLOBAL_RADII: Readonly<Record<BodyId, number>> = Object.freeze({
  sun:3.0,mercury:.38,venus:.85,earth:.90,moon:.90*MOON_TO_EARTH,mars:.48,
  jupiter:2.35,saturn:1.95,uranus:1.35,neptune:1.30,
});
const INNER_RADII: Readonly<Record<BodyId, number>> = Object.freeze({
  sun:.65,mercury:.096,venus:.237,earth:.25,moon:.25*MOON_TO_EARTH,mars:.133,
  jupiter:.55,saturn:.48,uranus:.35,neptune:.33,
});

/** Fixed visual radius; body and catalog data are read-only inputs. */
export function spatialRadius(body: BodyDefinition, view: SpatialView): number {
  const radius = (view === 'inner' ? INNER_RADII : GLOBAL_RADII)[body.id];
  if (radius === undefined) throw new RangeError(`尚未定义天体的展示半径：${body.id}`);
  return radius;
}
