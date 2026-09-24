export type SolarFamilyId = 'moons' | 'dwarfs' | 'asteroids' | 'comets' | 'centaurs' | 'dust';
export type CosmicLevelId = 'neighbors' | 'milkyway' | 'galaxies';

export interface LearningItem<Id extends string> {
  id: Id;
  name: string;
  english: string;
  keyFact: string;
  description: string;
  status: string;
  visualMeaning: string;
  sourceUrl: string;
  sourceLabel: string;
  exampleId?: string;
  exampleName?: string;
}

export const SOLAR_FAMILIES: readonly LearningItem<SolarFamilyId>[] = [
  { id: 'moons', name: '天然卫星', english: 'NATURAL SATELLITES', keyFact: '围绕行星或矮行星运行', description: '月球、木卫一、土卫六等有各自的轨道、表面与物理特征。本项目已有 21 颗选定卫星的动态历表；它们不是太阳系卫星总数。', status: '21 颗选定卫星已接入动态历表', visualMeaning: '综合全景按当日历表显示月球及 19 颗扩展卫星；在全景现象中定位六个家族，点击名称查看相对母星参数。局部距离和大小分别缩放，细线为参考轨道；卡戎仍在冥王星专门近景中。', sourceUrl: 'https://science.nasa.gov/solar-system/moons/facts/', sourceLabel: 'NASA 卫星资料', exampleId: 'io', exampleName: '木卫一' },
  { id: 'dwarfs', name: '矮行星', english: 'DWARF PLANETS', keyFact: '有的在主带，有的在海王星外', description: '谷神星在小行星主带，冥王星、妊神星、鸟神星和阋神星属于更遥远的区域。它们并非太阳的卫星，也不全在同一圈。', status: '五颗矮行星均已接入宏观历表；谷神星与冥王星另有主观测入口', visualMeaning: '五颗带名称的小球均取当日历表位置，轨道线是当前状态的参考椭圆。卡戎在宏观尺度不可分辨，其余矮行星的卫星尚未展开。', sourceUrl: 'https://science.nasa.gov/dwarf-planets/', sourceLabel: 'NASA 矮行星资料', exampleId: 'ceres', exampleName: '谷神星' },
  { id: 'asteroids', name: '小行星与近地天体', english: 'ASTEROIDS / NEOS', keyFact: '主带之外也有小行星', description: '许多小行星在火星和木星之间；近地天体与行星的轨道区域可能交叉。画面主带颗粒表示空间范围，不是已编目的逐颗小行星。', status: '主带点云为示意；谷神星与灶神星已接入宏观历表，可点选定位', visualMeaning: '主带颗粒是固定随机样本，表示有厚度的稀疏区域；不代表逐颗小行星、近地天体的数量、大小或位置。', sourceUrl: 'https://science.nasa.gov/asteroids-comets-meteors/facts/', sourceLabel: 'NASA 小天体资料', exampleId: 'vesta', exampleName: '灶神星' },
  { id: 'comets', name: '彗星', english: 'COMETS', keyFact: '长轨道可跨越多个区域', description: '彗星是冰与尘埃等组成的小天体，接近太阳时可能形成彗发与彗尾。短周期与长周期彗星的来源不同，不能把彗星画成固定的一条环带。', status: '宏观页已接入哈雷与 67P 的 2026—2027 年历表；不参与十体引力推演', visualMeaning: '带名称的彗核按日期定位；亮线为两年历表路径，淡线为当前状态的参考椭圆。可选近太阳双尾用于解释活动原理，位置与尾长不表示当日状态。', sourceUrl: 'https://science.nasa.gov/solar-system/comets/facts/', sourceLabel: 'NASA 彗星资料', exampleId: '67p', exampleName: '67P 彗星' },
  { id: 'centaurs', name: '半人马族与特洛伊群', english: 'CENTAURS / TROJANS', keyFact: '与巨行星轨道相互关联', description: '半人马族多在巨行星之间活动；特洛伊天体在行星轨道附近的拉格朗日区域聚集。它们不是第九颗行星，也不是一条独立均匀的带。', status: '本次仅展示类别说明，暂未接入逐体轨道', visualMeaning: '巨行星之间及其轨道附近的颗粒是固定随机样本，分别提示半人马族与特洛伊群可能活动的范围；并非编目天体坐标。', sourceUrl: 'https://science.nasa.gov/learn/basics-of-space-flight/chapter1-3/', sourceLabel: 'NASA 小天体分类资料' },
  { id: 'dust', name: '尘埃、流星体与行星环', english: 'DUST / METEOROIDS / RINGS', keyFact: '从微粒到局部环系', description: '彗星活动和碰撞产生尘埃与流星体；土星环则围绕土星，而非围绕太阳。它们的数量和分布不能由场景中的星点推算。', status: '土星环已在近景显示；宏观微粒不做逐颗追踪', visualMeaning: '内侧散点只是行星际尘埃范围示意，不能当作流星体清单或实测密度；土星环要进入土星近景观察。', sourceUrl: 'https://science.nasa.gov/solar-system/moons/facts/', sourceLabel: 'NASA 卫星与行星环资料' },
];

export const COSMIC_LEVELS: readonly LearningItem<CosmicLevelId>[] = [
  { id: 'neighbors', name: '邻近恒星系统', english: 'NEARBY STAR SYSTEMS', keyFact: '最近恒星约 4.24 光年', description: '太阳是银河系中的一颗恒星。比邻星属于半人马座 α 三合星系统，距离太阳约 4.24 光年；TRAPPIST-1 距离约 40 光年，已有七颗已知行星。它们是别的恒星系统，不是别的星系。', status: '距离与成员为 NASA 资料；画面方位、大小和轨道均为结构示意', visualMeaning: '带名称的亮球标记恒星系统；周围小圆环是示意轨道，背景星点是装饰。屏幕上的方向、间距、球体大小均不是星表测量。', sourceUrl: 'https://science.nasa.gov/sun/facts/', sourceLabel: 'NASA 太阳与邻星资料' },
  { id: 'milkyway', name: '银河系中的太阳', english: 'SOLAR SYSTEM IN THE MILKY WAY', keyFact: '太阳位于猎户臂支', description: '太阳系整体随太阳绕银河系中心运行。银河系是包含太阳及大量其他恒星的旋涡星系；在这个尺度上，太阳系小到无法按真实比例画成一颗可见的球。', status: '太阳位置为概略结构关系；银河形状与恒星点为示意', visualMeaning: '螺旋点云是程序生成的银河结构图，不是一点一颗已测恒星；亮点只粗略提示太阳系所在区域。', sourceUrl: 'https://science.nasa.gov/learn/basics-of-space-flight/chapter1-1/', sourceLabel: 'NASA 太阳在银河系中的位置与距离' },
  { id: 'galaxies', name: '银河系之外', english: 'NEIGHBORING GALAXIES', keyFact: '仙女座星系约 250 万光年', description: '大麦哲伦云是银河系的卫星星系，距离约 16.2 万光年；仙女座星系距离约 250 万光年。每个星系都包含大量恒星，不能把它们当作太阳系里的天体。', status: '距离取 NASA 概略资料；画面相对方位、大小与星点为示意', visualMeaning: '三团点云分别指银河系、大麦哲伦云与仙女座星系，不是一点一个真实星系或已测恒星；形状、方向和相对大小均为示意。', sourceUrl: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-31/', sourceLabel: 'NASA 仙女座星系资料' },
];
