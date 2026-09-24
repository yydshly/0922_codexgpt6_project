export type MacroZoneId = 'all' | 'planetary' | 'asteroid' | 'kuiper' | 'scattered' | 'heliosphere' | 'oort';

export interface MacroZone {
  id: Exclude<MacroZoneId, 'all'>;
  name: string;
  english: string;
  range: string;
  shape: string;
  evidence: string;
  evidenceKind: '历表与观测' | '区域观测' | '原位探测' | '模型推断';
  sourceLabel: string;
  sourceUrl: string;
  color: string;
  detail: string;
  visualMeaning: string;
}

/** Astronomical distances for labels; rendered positions use a documented log mapping. */
export const MACRO_ZONES: readonly MacroZone[] = [
  {
    id: 'planetary', name: '行星区域', english: 'PLANETARY SYSTEM', range: '0–30 AU', shape: '近黄道面的薄盘',
    evidence: '太阳与八大行星采用当前 JPL 几何历表；彩色曲线是当期二体参考轨道，可选灰蓝圆环仅标示距离尺度。', evidenceKind: '历表与观测',
    sourceLabel: 'NASA / JPL 行星轨道', sourceUrl: 'https://ssd.jpl.nasa.gov/planets/orbits.html', color: '#94cdd6',
    detail: '太阳和行星是球体，轨道却大致共享一个平面。这里是极其空旷的三维空间，不是一张实体圆盘。',
    visualMeaning: '中央亮球是太阳，彩色小球是八大行星：位置随当前历表时间更新。彩色曲线为当期参考轨道，灰蓝圆环可选作距离参照，浅绿箭头仅示运动方向；半透明面是黄道参考面，球体大小已放大。',
  },
  {
    id: 'asteroid', name: '小行星主带', english: 'MAIN ASTEROID BELT', range: '约 2.2–3.2 AU', shape: '有厚度的稀疏环带',
    evidence: '区域由观测确定；粒子不是实际小行星位置。', evidenceKind: '区域观测',
    sourceLabel: 'NASA Dawn 主带资料', sourceUrl: 'https://science.nasa.gov/mission/dawn/faq/', color: '#d7b88c',
    detail: '位于火星和木星之间，属于行星区域内部；天体间仍隔着巨大空间。',
    visualMeaning: '金色圆点是固定随机样本，用来画出主带的大致范围与厚度。一点不对应一颗已发现小行星；点数、位置、大小和密度都不是实测。',
  },
  {
    id: 'kuiper', name: '柯伊伯带', english: 'KUIPER BELT', range: '主要区域约 30–50 AU', shape: '较厚的盘 / 环',
    evidence: '许多海王星外天体已被发现；点云仅解释整体形态。', evidenceKind: '区域观测',
    sourceLabel: 'NASA 柯伊伯带资料', sourceUrl: 'https://science.nasa.gov/solar-system/kuiper-belt/facts/', color: '#8fc3d4',
    detail: '冰质小天体的主要分布区，从海王星轨道附近开始；它有厚度，并非一条细线。',
    visualMeaning: '青色圆点是固定随机样本，用来说明海王星外环带有厚度。一点不对应一颗已发现天体；点数、位置、大小和密度都不是实测。',
  },
  {
    id: 'scattered', name: '散射盘与离散天体', english: 'SCATTERED / DETACHED', range: '约 50–1,000 AU，个别更远', shape: '稀疏、倾斜、拉长的轨道群',
    evidence: '已发现一些对象；整体点数与分布为视觉示意。', evidenceKind: '区域观测',
    sourceLabel: 'NASA 海王星外区域', sourceUrl: 'https://science.nasa.gov/solar-system/kuiper-belt/facts/', color: '#a99dd5',
    detail: '这里不再是整齐的同心环。成员可能有高倾角和很长的椭圆轨道，部分区域与日球层重叠。',
    visualMeaning: '紫色圆点是固定随机样本，只用来表现远伸且有纵向厚度的分布。它们不对应已编目天体的坐标，也没有逐颗轨道或运动；散射盘与离散天体被合并在此示意。',
  },
  {
    id: 'heliosphere', name: '日球层', english: 'HELIOSPHERE', range: '边界随方向与时间变化；约百余 AU 量级', shape: '太阳风形成的三维泡',
    evidence: '旅行者号曾穿过日球层顶；画面的圆球只是概念轮廓。', evidenceKind: '原位探测',
    sourceLabel: 'NASA 旅行者号任务', sourceUrl: 'https://science.nasa.gov/mission/voyager/interstellar-mission/', color: '#6ca9e4',
    detail: '这是按太阳风影响划分的区域，不是固体墙，也不是太阳引力的终点。它与散射盘等天体分布区可以重叠。',
    visualMeaning: '蓝色轮廓提示日球层顶，金色轮廓提示终止激波，两者之间为日鞘；粒子向外流动示意太阳风。边界、速度和密度均不是该日期的实测结果，也不是等离子体模拟。',
  },
  {
    id: 'oort', name: '奥尔特云', english: 'OORT CLOUD', range: '内缘约 2,000–5,000 AU；外缘或至 100,000 AU', shape: '推测中的巨大球状壳层',
    evidence: '根据长周期彗星及动力学推断，尚未直接观测整个云。', evidenceKind: '模型推断',
    sourceLabel: 'NASA 奥尔特云资料', sourceUrl: 'https://science.nasa.gov/solar-system/oort-cloud/facts/', color: '#aac9e2',
    detail: '如果把太阳系的遥远引力成员也纳入视野，外层可能呈球状。但其边界、密度与成员位置仍有很大不确定性。',
    visualMeaning: '淡蓝圆点是按球状壳层模型生成的固定随机样本；每个点都不是已观测天体。外侧极淡轮廓只提示模型范围，点数、位置、大小和密度均非实测。',
  },
];

export function macroRadius(au: number): number {
  if (!Number.isFinite(au) || au < 0) throw new RangeError('太阳系宏观半径必须为非负有限 AU 值');
  return 22 * Math.log10(1 + au) / Math.log10(100001);
}
