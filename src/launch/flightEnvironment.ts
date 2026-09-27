import { LAUNCH_EARTH } from '../data/launchMission';
import { rotateEarth, type V3 } from './ascent';

export const ENVIRONMENT_SOURCES = {
  atmosphere: 'https://science.nasa.gov/earth/earth-atmosphere/earths-atmosphere-a-multi-layered-cake/',
  debris: 'https://www.esa.int/Space_Safety/Space_Debris/About_space_debris',
  meteoroids: 'https://science.nasa.gov/solar-system/meteors-meteorites/',
} as const;
/** Educational bands, not pressure discontinuities or an atmosphere solver. Boundaries vary. */
export const ATMOSPHERE_LAYERS = [
  { id: 'troposphere', name: '对流层', ceilingKm: 12, range: '约 0–12 km', color: '#b9d7ea', description: '大部分天气云出现在这里。空气看不见，但会产生阻力；青色流线只是相对气流提示。' },
  { id: 'stratosphere', name: '平流层', ceilingKm: 50, range: '约 12–50 km', color: '#73bfde', description: '通常已高于大部分天气云，空气继续变稀。天空渐暗，不能据此认为空气已经消失。' },
  { id: 'mesosphere', name: '中间层', ceilingKm: 80, range: '约 50–80 km', color: '#808fcd', description: '许多流星体在进入大气时于此附近烧蚀发光。当前没有人为安排流星从火箭旁穿过。' },
  { id: 'thermosphere', name: '热层', ceilingKm: 700, range: '约 80–700 km', color: '#ada5d9', description: '空气极稀薄，仍可影响航天器。100 km 是常用空间分界参考，不是大气消失面，也不是入轨条件。' },
  { id: 'exosphere', name: '外逸层', ceilingKm: Infinity, range: '约 700 km 以上', color: '#d1bdd8', description: '极稀薄的外层大气逐渐过渡到空间，没有清晰硬壳；当前试飞并未到达这一层。' },
] as const;
export function atmosphereLayer(heightM: number) { return ATMOSPHERE_LAYERS.find(layer => heightM / 1000 < layer.ceilingKm)!; }
export interface EnvironmentOptions { clouds: boolean; atmosphere: boolean; airflow: boolean; objects: boolean }
export const DEFAULT_ENVIRONMENT: EnvironmentOptions = { clouds: true, atmosphere: true, airflow: true, objects: true };
export const SPACE_OBJECT_KINDS = [
  { id: 'satellite', name: '工作卫星', color: '#82e1d5', description: '执行通信、导航或观测等任务的航天器，仍工作的卫星不属于空间碎片。这里是合成圆轨道样本，未接入真实卫星目录。' },
  { id: 'rocket', name: '废弃箭体', color: '#efbd82', description: '一些轨道上的运载火箭级段不再工作。橙色示例不是这次分离的一级；本次一级单独显示实际模拟位置，尚未入轨。' },
  { id: 'fragment', name: '人造碎片', color: '#df9eac', description: '可能来自解体、碰撞或脱落零件。标记经过放大，数量与密度不代表现实分布，未进行碰撞预报。' },
  { id: 'meteoroid', name: '自然流星体', color: '#d3c9a6', description: '天然岩石或尘粒，与人造碎片不同。这里用开放路径表示掠过，不把它们画成全部绕地球的卫星；进入大气发光才称为流星。' },
] as const;
export type SpaceObjectKind = typeof SPACE_OBJECT_KINDS[number]['id'];
export interface EnvironmentExample { id: string; kind: SpaceObjectKind; radius: number; node: number; inclination: number; phase: number }
/** Small deterministic synthetic sample, never a population estimate or a real catalogue. */
export const ENVIRONMENT_EXAMPLES: EnvironmentExample[] = Array.from({ length: 48 }, (_, i) => ({
  id: `illustration-${i}`, kind: i < 20 ? 'satellite' : i < 30 ? 'rocket' : i < 44 ? 'fragment' : 'meteoroid',
  radius: LAUNCH_EARTH.semiMajorM + (350 + (i * 137 % 1300)) * 1000,
  node: (i * 2.399963), inclination: [28.5, 53, 70, 97][i % 4] * Math.PI / 180, phase: i * 1.71,
}));
export function examplePosition(example: EnvironmentExample, timeS: number): V3 {
  if (example.kind === 'meteoroid') {
    // Open illustrative flyby, at least 2 Earth radii from the origin; no encounter forecast.
    return rotateEarth([(timeS - 120) * 18000, LAUNCH_EARTH.semiMajorM * (2 + (Number(example.id.split('-')[1]) - 44) * .2), LAUNCH_EARTH.semiMajorM * .5], -timeS);
  }
  const u = example.phase + Math.sqrt(LAUNCH_EARTH.gmM3S2 / example.radius ** 3) * timeS;
  const x = Math.cos(u) * example.radius, y = Math.sin(u) * example.radius * Math.cos(example.inclination), z = Math.sin(u) * example.radius * Math.sin(example.inclination);
  return rotateEarth([Math.cos(example.node) * x - Math.sin(example.node) * y, Math.sin(example.node) * x + Math.cos(example.node) * y, z], -timeS);
}
