import { ATLAS_BODIES } from './atlas';
import { BODIES } from './catalog';
import { DYNAMIC_DWARFS } from './dwarfs';
import { SATELLITES } from './satellites';

/** Observation registry only; the validated gravity model keeps its own identities. */
export const SATELLITE_PARENTS = BODIES.filter(body => SATELLITES.some(satellite => satellite.parentId === body.id)).map(body => body.id);
const dynamicIds = new Set<string>([...BODIES.map(body => body.id), ...SATELLITES.map(body => body.id), ...DYNAMIC_DWARFS.map(body => body.id)]);
export const OBSERVATION_COUNTS = {
  dynamic: dynamicIds.size,
  satellites: BODIES.filter(body => body.kind === 'moon').length + SATELLITES.length + DYNAMIC_DWARFS.filter(body => body.category === 'moon').length,
  knowledgeOnly: ATLAS_BODIES.filter(body => !dynamicIds.has(body.id)).length,
  planets: BODIES.filter(body => body.kind === 'planet').length,
  stars: BODIES.filter(body => body.kind === 'star').length,
};
