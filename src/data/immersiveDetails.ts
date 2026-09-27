import { ringProfile } from './rings';

export type EarthFraming = 'globe' | 'limb';
export type RingRegionId = 'c' | 'b' | 'division' | 'a';
export type SolarFeature = 'all' | 'surface' | 'prominence' | 'corona';
export interface RingRegion { id: RingRegionId; name: string; innerKm: number; outerKm: number; text: string }
const [c, b, a] = ringProfile('saturn')!.bands;
/** Share boundaries with the visible ring geometry; never position labels by screen guesses. */
export const IMMERSIVE_RING_REGIONS: RingRegion[] = [
  { id: 'c', name: 'C 环', innerKm: c.innerKm, outerKm: c.outerKm, text: '本场景三段主环中最靠内的一段，较暗且较透明。观察它与更外侧 B 环的亮度差别；展示亮度不是实测光学深度。' },
  { id: 'b', name: 'B 环', innerKm: b.innerKm, outerKm: b.outerKm, text: '位于 C 环外侧、卡西尼分界内侧。转动镜头，比较近侧的遮挡与远侧落在环上的土星阴影。' },
  { id: 'division', name: '卡西尼分界', innerKm: b.outerKm, outerKm: a.innerKm, text: 'B 环和 A 环之间的较暗区域，仍含有物质，并非完全真空。当前几何将其简化为空隙；虚线只标出边界，不是新添的环。' },
  { id: 'a', name: 'A 环', innerKm: a.innerKm, outerKm: a.outerKm, text: '位于卡西尼分界之外，是当前三段主环中最外侧的一段。土星还有其他环，本场景没有逐一绘制。' },
];
export const SOLAR_FEATURES: { id: SolarFeature; name: string; text: string }[] = [
  { id: 'all', name: '整体', text: '同时观察光球、日珥和日冕示意。下方可分别查看；几种层次合成在同一画面，不代表单一波段的真实照片。' },
  { id: 'surface', name: '光球', text: '可见光主要从这一层逃逸，通常称为太阳“表面”，但它不是固体地壳。这里保留球面，暂时隐藏日珥与日冕，方便辨认轮廓。' },
  { id: 'prominence', name: '日珥', text: '磁场支撑的等离子体结构。画面保留光球与示意拱环，隐藏日冕辉光；拱环不是当天观测到的事件，也不是普通火焰。' },
  { id: 'corona', name: '日冕', text: '稀薄、高温的太阳外层大气。画面保留光球与外部辉光，隐藏日珥；辉光的亮度、颜色和外沿都是示意，不是实测边界。' },
];
export const solarFeatureVisibility = (feature: SolarFeature) => ({
  prominence: feature === 'all' || feature === 'prominence',
  corona: feature === 'all' || feature === 'corona',
});
