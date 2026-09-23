import { Vector3 } from 'three';
import { BODIES, AU_KM } from '../data/catalog';

export type ComparisonSet = 'rocky' | 'planets' | 'all';
const cache = new Map<ComparisonSet, ReturnType<typeof createLayout>>();

function createLayout(set: ComparisonSet) {
  const visible = BODIES.map(body => set === 'all' || (set === 'rocky' ? ['mercury', 'venus', 'earth', 'moon', 'mars'].includes(body.id) : body.id !== 'sun'));
  const largest = Math.max(...BODIES.filter((_, i) => visible[i]).map(body => body.radiusKm)) / AU_KM;
  const gap = largest * .24;
  let cursor = 0;
  const positions = BODIES.map((body, i) => {
    if (!visible[i]) return new Vector3();
    const radius = body.radiusKm / AU_KM;
    const extent = body.id === 'saturn' ? radius * 2.33 : radius;
    const p = new Vector3(cursor + extent, radius - largest * .65, 0);
    cursor += extent * 2 + gap;
    return p;
  });
  const width = cursor - gap;
  positions.forEach((p, i) => { if (visible[i]) p.x -= width / 2; });
  return { positions, visible, width, height: largest * 2.6 };
}

/** Presentation positions only; ephemeris vectors and physical radii are untouched. */
export function comparisonLayout(set: ComparisonSet) {
  if (!cache.has(set)) cache.set(set, createLayout(set));
  return cache.get(set)!;
}
