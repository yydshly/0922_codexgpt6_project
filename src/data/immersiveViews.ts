import * as THREE from 'three';
import { bodyById } from './catalog';
import { BODY_IDS, type StateFrame } from '../types';
import { referenceAttitude } from '../components/referenceAttitude';
import type { EarthFraming } from './immersiveDetails';

export type ImmersiveBody = 'saturn' | 'earth' | 'sun';
export type ImmersiveViewId = 'saturn-rings' | 'saturn-edge' | 'earth-limb' | 'sun-limb' | 'earth-moon' | 'saturn-family';
export const IMMERSIVE_VIEWS: { id: ImmersiveViewId; body: ImmersiveBody; family?: boolean; title: string; subtitle: string; description: string; boundary: string; source: string; sourceTitle: string }[] = [
  { id: 'saturn-rings', body: 'saturn', title: '环上掠影', subtitle: 'SATURN / 01', description: '从环面上方斜看土星。先看环怎样遮挡球体，再沿着明暗交界辨认球体的弧度与投在环上的阴影。', boundary: '环的内外边界沿用资料尺度；球体采用平均半径。环透明度与暗面补光为展示近似，未重建颗粒、厚度与真实相机曝光。', source: 'https://science.nasa.gov/resource/saturn-bright-through-rings/', sourceTitle: 'NASA · 卡西尼的环外视角' },
  { id: 'saturn-edge', body: 'saturn', title: '贴近环面', subtitle: 'SATURN / 02', description: '把视线压低到接近赤道面，看宽阔的环怎样收成细线。拖动上下改变视角，对比同一片环的不同投影。', boundary: '镜头位于主环外侧；这是自由取景，不是卡西尼航迹或飞船飞行。环用无厚度面呈现，不能用于估计真实厚度。', source: 'https://science.nasa.gov/mission/cassini/science/rings/', sourceTitle: 'NASA · 土星环的结构' },
  { id: 'earth-limb', body: 'earth', title: '蓝色地平线', subtitle: 'EARTH / 03', description: '从地球外侧靠近昼夜交界。沿着弧形边缘寻找薄蓝色大气，再区分白色云层、海洋与大陆。', boundary: '云层来自已入库的静态云图；蓝色边缘是大气散射近似。没有实时天气，也没有在真空中添加云海。', source: 'https://science.nasa.gov/earth/facts/', sourceTitle: 'NASA · 地球与大气' },
  { id: 'sun-limb', body: 'sun', title: '恒星之缘', subtitle: 'SUN / 04', description: '用近距离虚拟镜头观察太阳轮廓、表面纹理和边缘的日珥示意。拖动视角，分辨球面与外层辉光。', boundary: '太阳由核聚变供能。橙色表面、日珥与日冕为增强示意，不是肉眼所见颜色、实时太阳活动或可抵达的观测任务。', source: 'https://science.nasa.gov/sun/facts/', sourceTitle: 'NASA · 太阳的结构' },
  { id: 'earth-moon', body: 'earth', family: true, title: '地月之间', subtitle: 'EARTH & MOON / 05', description: '把地球与月球放进同一片空间。先看两者之间有多空，再选择一个天体靠近观察；返回同景，重新理解远近与大小。', boundary: '地月位置来自同一时刻的本地 JPL 历表，距离不压缩。真实比例使用平均半径；辅助模式只把月球半径放大 2 倍。虚线只是当下的中心距离连线，不是轨道。', source: 'https://science.nasa.gov/moon/facts/', sourceTitle: 'NASA · 月球与地球' },
  { id: 'saturn-family', body: 'saturn', family: true, title: '土星与它的卫星', subtitle: 'SATURN FAMILY / 06', description: '从主环向外认识土卫二、土卫五和土卫六。它们在相同的真实距离尺度中，体积却差别很大。选中名称可以靠近观察。', boundary: '这里选取三颗代表卫星，不是完整名录。位置读取已入库的土星中心历表；真实比例使用平均或体积等效半径。辅助模式只把卫星半径放大 16 倍，不移动中心；卫星表面与朝向为示意。', source: 'https://science.nasa.gov/saturn/moons/', sourceTitle: 'NASA · 土星的卫星' },

];

/** Translate the ephemeris light vector, without inheriting the panorama's distance compression. */
export function immersiveSunDirection(frame: StateFrame, body: ImmersiveBody) {
  const i = BODY_IDS.indexOf(body) * 3;
  if (body === 'sun') return new THREE.Vector3(1, 0, 0);
  const p = frame.positions;
  return new THREE.Vector3(p[0] - p[i], p[2] - p[i + 2], -(p[1] - p[i + 1])).normalize();
}

/** All distances are in the target body's mean radii. Directions are sun-relative, not spacecraft positions. */
export function immersiveCameraPose(id: ImmersiveViewId, frame: StateFrame, earthFraming: EarthFraming = 'limb') {
  const view = IMMERSIVE_VIEWS.find(v => v.id === id)!;
  const attitude = referenceAttitude(bodyById[view.body], frame.time);
  const pole = new THREE.Vector3(0, 1, 0).applyQuaternion(attitude);
  const sun = immersiveSunDirection(frame, view.body);
  const equatorSun = sun.clone().addScaledVector(pole, -sun.dot(pole));
  if (equatorSun.lengthSq() < 1e-8) equatorSun.set(1, 0, 0).applyQuaternion(attitude);
  equatorSun.normalize();
  const tangent = new THREE.Vector3().crossVectors(pole, equatorSun).normalize();
  const azimuth = (id === 'earth-limb' ? 66 : 42) * Math.PI / 180;
  const direction = equatorSun.clone().multiplyScalar(Math.cos(azimuth)).addScaledVector(tangent, Math.sin(azimuth));
  const elevation = (id === 'saturn-edge' ? 4 : id === 'saturn-rings' ? 24 : id === 'earth-limb' ? 8 : 12) * Math.PI / 180;
  direction.multiplyScalar(Math.cos(elevation)).addScaledVector(pole, Math.sin(elevation)).normalize();
  const distance = id === 'saturn-rings' ? 5.6 : id === 'saturn-edge' ? 5.3 : id === 'earth-limb' ? (earthFraming === 'globe' ? 4.7 : 2.5) : 3.5;
  const roll = (id === 'saturn-rings' ? -24 : id === 'saturn-edge' ? -12 : -20) * Math.PI / 180;
  return { position: direction.multiplyScalar(distance), up: pole.applyAxisAngle(direction.clone().normalize(), roll), target: new THREE.Vector3(), fov: id.startsWith('saturn') ? 42 : 40 };
}
