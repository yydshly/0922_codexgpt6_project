import halley from '../../public/data/macro/halley-sbdb.json';
import { macroRadius } from './macroStructure';

export const MACRO_LAYERS = [
  { id: 'planetary', name: '行星与尺度环', color: '#99d9e1', note: '历表位置 · 环为尺度参考' },
  { id: 'dwarfs', name: '谷神星与冥王星', color: '#f1bd82', note: '历表位置 · 瞬时参考轨道' },
  { id: 'moons', name: '卫星系统标记', color: '#9cdbd2', note: '局部放大示意 · 靠近可见' },
  { id: 'asteroid', name: '小行星主带', color: '#d2ab78', note: '种群范围示意' },
  { id: 'populations', name: '半人马族与特洛伊群', color: '#d6a3d7', note: '种群范围示意 · 靠近可见' },
  { id: 'kuiper', name: '柯伊伯带', color: '#8cc7d7', note: '种群范围示意' },
  { id: 'scattered', name: '散射盘与离散天体', color: '#b7a3ed', note: '种群范围示意' },
  { id: 'comets', name: '哈雷与 67P 彗星', color: '#9ee8e7', note: '当日历表位置 · 两年路径与参考轨道' },
  { id: 'dust', name: '行星际尘埃', color: '#c9ad86', note: '分布示意 · 靠近可见' },
  { id: 'wind', name: '太阳风', color: '#e8b86d', note: '流动动画示意 · 非实测速度' },
  { id: 'heliosphere', name: '日球层分区', color: '#6cacf0', note: '边界轮廓示意 · 非固定球壳' },
  { id: 'oort', name: '奥尔特云', color: '#b1c9e5', note: '模型推断 · 非逐体观测' },
] as const;
export type MacroLayerId = typeof MACRO_LAYERS[number]['id'];
export type MacroLayerVisibility = Record<MacroLayerId, boolean>;
export const defaultMacroLayers = (): MacroLayerVisibility => Object.fromEntries(MACRO_LAYERS.map(layer => [layer.id, true])) as MacroLayerVisibility;

export const HALLEY_SOURCE = {
  url: 'https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=1P&full-prec=true',
  retrieved: '2026-09-23', epochJdTdb: Number(halley.orbit.epoch),
  solution: halley.orbit.orbit_id, equinox: halley.orbit.equinox,
};
const element = (name: string) => Number(halley.orbit.elements.find(item => item.name === name)!.value);
export const HALLEY_ORBIT = { a: element('a'), e: element('e'), i: element('i'), node: element('om'), peri: element('w') };

/** Sun-centred J2000 ecliptic AU. A single osculating ellipse, not a propagated ephemeris. */
export function halleyPoint(trueAnomaly: number): [number, number, number] {
  const { a, e } = HALLEY_ORBIT;
  const radians = Math.PI / 180;
  const i = HALLEY_ORBIT.i * radians, node = HALLEY_ORBIT.node * radians;
  const u = HALLEY_ORBIT.peri * radians + trueAnomaly;
  const r = a * (1 - e * e) / (1 + e * Math.cos(trueAnomaly));
  return [r * (Math.cos(node)*Math.cos(u)-Math.sin(node)*Math.sin(u)*Math.cos(i)),
    r * (Math.sin(node)*Math.cos(u)+Math.cos(node)*Math.sin(u)*Math.cos(i)), r*Math.sin(u)*Math.sin(i)];
}

/** Same radial compression and axis permutation as the planetary scene. */
export function macroEcliptic([x, y, z]: readonly number[]): [number, number, number] {
  const d = Math.hypot(x, y, z);
  if (!d) return [0, 0, 0];
  const scale = macroRadius(d) / d;
  return [x * scale, z * scale, -y * scale];
}

export function macroDetailVisible(id: MacroLayerId, cameraDistance: number): boolean {
  return id === 'moons' || id === 'dust' ? cameraDistance < 30 : id === 'populations' ? cameraDistance < 48 : true;
}
