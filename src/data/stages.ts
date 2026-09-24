import type { MacroLayerVisibility } from './macroLayers';
export const STAGES = [
 {id:'structure',title:'01 · 宏观结构',added:'从行星薄盘到外围区域',description:'增加主带、柯伊伯带、散射区域、太阳风与推测的奥尔特云，帮助理解太阳系不是一个统一的球壳。',evidence:'行星和已有矮行星取历表位置；点云、风与边界为示意，奥尔特云为推断。',how:'在空间区域中从内向外选择，再切换斜视、侧视。'},
 {id:'comets',title:'02 · 真实彗星',added:'哈雷与 67P 按日期运行',description:'增加两颗彗星的真实位置、距日距离、速度和两年路径。彗尾原理示例另行开关。',evidence:'位置、速度来自 JPL；淡线为参考椭圆，彗尾不是当日实测活动。',how:'进入天体与物质 → 彗星，前后切换 30 天。'},
 {id:'members',title:'03 · 区域真实成员',added:'4 个新增天体与区域入口',description:'增加灶神星、妊神星、鸟神星、阋神星，与谷神星、冥王星串成可定位的区域成员清单。',evidence:'位置来自 JPL；球体尺寸放大，近景外观为示意。',how:'选择成员 → 查看参数 → 展开外观近景 → 返回区域。'},
 {id:'families',title:'04 · 卫星家族与环系',added:'四大巨行星环系及家族讲解',description:'接通四个卫星家族入口，补木星、天王星、海王星环，保留土星环。比较环、卫星与轨道线的不同含义。',evidence:'卫星沿用真实历表；环的参考尺度有来源，细环宽度和亮度可增强。本批不新增卫星数量。',how:'选择巨行星 → 进入卫星与环系 → 开关行星环、增强细环 → 播放公转。'},
 {id:'environment',title:'05 · 地球磁层与极光',added:'从太阳风看地球周围的三维环境',description:'增加弓形激波、磁层顶、磁尾、磁力线与两极极光的结构示意，可分别开关，从侧面和近景观察。',evidence:'依据 NASA 科学说明绘制；不是当天实测。地球放大、磁尾截短，磁轴与光带方位为示意，不读取观测日期。',how:'进入结构图 → 分层开关 → 侧面看磁尾 → 靠近看极光 → 返回原观测。'},
] as const;
export type StageId=typeof STAGES[number]['id'];
export type StageFlags=Record<StageId,boolean>;
export const allStages=():StageFlags=>Object.fromEntries(STAGES.map(stage=>[stage.id,true])) as StageFlags;
export const onlyStage=(id:StageId):StageFlags=>({...Object.fromEntries(STAGES.map(s=>[s.id,false])),[id]:true}) as StageFlags;
/** Presentation gates: never modifies time, ephemeris samples or physics. */
export function stagedLayers(layers:MacroLayerVisibility,flags:StageFlags):MacroLayerVisibility {
 return {...layers,asteroid:layers.asteroid&&flags.structure,kuiper:layers.kuiper&&flags.structure,scattered:layers.scattered&&flags.structure,
 populations:layers.populations&&flags.structure,dust:layers.dust&&flags.structure,wind:layers.wind&&flags.structure,heliosphere:layers.heliosphere&&flags.structure,oort:layers.oort&&flags.structure,
 moons:layers.moons&&(flags.structure||flags.families),dwarfs:layers.dwarfs&&(flags.structure||flags.members),comets:layers.comets&&flags.comets};
}
