import { ATLAS_BODIES, type AtlasBody } from './atlas';

export const DWARF_IDS = ['ceres', 'pluto', 'charon'] as const;
export type DwarfId = typeof DWARF_IDS[number];
export type DynamicDwarf = AtlasBody & { id: DwarfId; radiusKm: number; massKg: number; rotationHours: number; orbitalPeriodDays: number; physicalSourceUrl: string };

const jplDwarfPhysics = 'https://ssd.jpl.nasa.gov/planets/phys_par.html';
const jplSatellitePhysics = 'https://ssd.jpl.nasa.gov/sats/phys_par/sep.html';
const PHYSICAL: Record<DwarfId, Pick<DynamicDwarf, 'massKg' | 'rotationHours' | 'orbitalPeriodDays' | 'physicalSourceUrl'>> = {
  ceres: { massKg: 938.416e18, rotationHours: .37809042*24, orbitalPeriodDays: 4.61*365.25, physicalSourceUrl: jplDwarfPhysics },
  pluto: { massKg: 13024.6e18, rotationHours: -6.3872*24, orbitalPeriodDays: 247.92065*365.25, physicalSourceUrl: jplDwarfPhysics },
  charon: { massKg: 106.1e9/6.67430e-11, rotationHours: 6.3872*24, orbitalPeriodDays: 6.3872, physicalSourceUrl: jplSatellitePhysics },
};

/** Only these three atlas entries have checked 2026–2027 geometric states. */
export const DYNAMIC_DWARFS: DynamicDwarf[] = DWARF_IDS.map(id => {
  const entry = ATLAS_BODIES.find(body => body.id === id);
  if (!entry || entry.radiusKm === null) throw new Error(`缺少动态天体参数：${id}`);
  return { ...entry, ...PHYSICAL[id], id } as DynamicDwarf;
});
export const dynamicDwarfById = Object.fromEntries(DYNAMIC_DWARFS.map(body => [body.id, body])) as Record<DwarfId, DynamicDwarf>;
export const isDwarfId = (value: string): value is DwarfId => DWARF_IDS.some(id => id === value);
