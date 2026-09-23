import type { BodyId, Vec3 } from '../types';
import { ATLAS_BODIES } from './atlas';

/** These satellites have separate, parent-centered SPICE ephemerides. They are
 * deliberately absent from BODY_IDS and the ten-body gravity calculation. */
export interface SatelliteDefinition {
  id: string;
  name: string;
  englishName: string;
  parentId: BodyId;
  naifId: number;
  radiusKm: number;
  /** PCK triaxial radii; radiusKm is their volume-equivalent spherical radius. */
  axesKm: Vec3;
  radiusNote: string;
  gm: number;
  /** Approximate sidereal period, for explanation only; never drives motion. */
  orbitalPeriodDays: number;
  color: string;
  appearance: 'rock' | 'ice' | 'volcanic' | 'haze';
  description: string;
  sourceUrl: string;
  parameterSourceUrl: string;
  gmSourceUrl: string;
  orbitalPeriodSourceUrl: string;
}

const definitions: Array<[string, BodyId, number, Vec3, number, number]> = [
  ['io', 'jupiter', 501, [1829.4,1819.4,1815.7], 5959.915466180539, 1.769],
  ['europa', 'jupiter', 502, [1562.6,1560.3,1559.5], 3202.712099607295, 3.551],
  ['ganymede', 'jupiter', 503, [2631.2,2631.2,2631.2], 9887.832752719638, 7.155],
  ['callisto', 'jupiter', 504, [2410.3,2410.3,2410.3], 7179.283402579837, 16.689],
  ['titan', 'saturn', 606, [2575.15,2574.78,2574.47], 8978.137095521046, 15.945],
  ['enceladus', 'saturn', 602, [256.6,251.4,248.3], 7.210366688598896, 1.370],
  ['triton', 'neptune', 801, [1352.6,1352.6,1352.6], 1428.495462910464, 5.877],
  ['phobos', 'mars', 401, [13,11.4,9.1], 0.0007087546066894452, 0.319],
  ['deimos', 'mars', 402, [7.8,6,5.1], 0.00009615569648120313, 1.263],
  // URA184's documented URA182 GM solution; PCK axes and JPL mean periods.
  ['miranda', 'uranus', 705, [240.4,234.2,232.9], 4.105527241181560, 1.413479],
  ['ariel', 'uranus', 701, [581.1,577.9,577.7], 83.43074677282458, 2.520379],
  ['umbriel', 'uranus', 702, [584.7,584.7,584.7], 85.40300422326412, 4.144177],
  ['titania', 'uranus', 703, [788.9,788.9,788.9], 222.8006351879754, 8.705869],
  ['oberon', 'uranus', 704, [761.4,761.4,761.4], 214.2098399407347, 13.463237],
  // SAT441 GM values match the saved DE440 parameter kernel exactly.
  ['mimas', 'saturn', 601, [207.8,196.7,190.6], 2.503488768152587, 0.942422],
  ['tethys', 'saturn', 603, [538.4,528.3,526.3], 41.21352885489587, 1.887802],
  ['dione', 'saturn', 604, [563.4,561.3,559.6], 73.11607172482067, 2.736916],
  ['rhea', 'saturn', 605, [765,763.1,762.4], 153.9417519146563, 4.517503],
  ['iapetus', 'saturn', 608, [745.7,745.7,712.1], 120.5151060137642, 79.331002],
];

export const SATELLITES: SatelliteDefinition[] = definitions.map(([id,parentId,naifId,axesKm,gm,orbitalPeriodDays]) => {
  const atlas=ATLAS_BODIES.find(body=>body.id===id)!;
  return {
    id,parentId,naifId,axesKm,gm,orbitalPeriodDays,
    radiusKm:Math.cbrt(axesKm[0]*axesKm[1]*axesKm[2]),
    radiusNote:'NASA/NAIF PCK 三轴半径的体积等效值；不规则卫星采用形状示意',
    name:atlas.name,englishName:atlas.englishName,color:atlas.color,
    appearance:atlas.appearance as SatelliteDefinition['appearance'],
    description:atlas.description,sourceUrl:atlas.sourceUrl,
    parameterSourceUrl:'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc',
    gmSourceUrl:parentId==='uranus'
      ? 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/ura184_part-3.cmt'
      : parentId==='saturn'
        ? 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/sat441.cmt'
        : 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/gm_de440.tpc',
    orbitalPeriodSourceUrl:parentId==='uranus'||parentId==='saturn'?'https://ssd.jpl.nasa.gov/sats/elem/':atlas.sourceUrl,
  };
});

export const satelliteById = Object.fromEntries(SATELLITES.map(body=>[body.id,body])) as Record<string,SatelliteDefinition>;
