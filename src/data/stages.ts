import type { MacroLayerVisibility } from './macroLayers';
export const STAGES = [
 {id:'structure',title:'01 · 宏观结构',added:'从行星薄盘到外围区域',description:'增加主带、柯伊伯带、散射区域、太阳风与推测的奥尔特云，帮助理解太阳系不是一个统一的球壳。',evidence:'行星和已有矮行星取历表位置；点云、风与边界为示意，奥尔特云为推断。',how:'在空间区域中从内向外选择，再切换斜视、侧视。'},
 {id:'comets',title:'02 · 真实彗星',added:'哈雷与 67P 按日期运行',description:'增加两颗彗星的真实位置、距日距离、速度和两年路径。彗尾原理示例另行开关。',evidence:'位置、速度来自 JPL；淡线为参考椭圆，彗尾不是当日实测活动。',how:'进入天体与物质 → 彗星，前后切换 30 天。'},
 {id:'members',title:'03 · 区域真实成员',added:'4 个新增天体与区域入口',description:'增加灶神星、妊神星、鸟神星、阋神星，与谷神星、冥王星串成可定位的区域成员清单。',evidence:'位置来自 JPL；球体尺寸放大，近景外观为示意。',how:'选择成员 → 查看参数 → 展开外观近景 → 返回区域。'},
 {id:'families',title:'04 · 卫星家族与环系',added:'六个行星家族、冥王星双体与环系',description:'综合全景接入地月、火星及四大巨行星家族，可原位定位、点选卫星并切换日期。四大巨行星环与参考轨道分别开关；冥王星—卡戎可同场景观察双体质心。',evidence:'卫星沿用真实历表；环的参考尺度有来源，细环宽度和亮度可增强。本批不新增卫星数量。',how:'综合全景 → 全景现象 → 定位家族 → 点选卫星 → 前后 1 天或播放公转。'},
 {id:'environment',title:'05 · 地球磁层与极光',added:'从太阳风看地球周围的三维环境',description:'增加弓形激波、磁层顶、磁尾、磁力线与两极极光的结构示意，可分别开关，从侧面和近景观察。',evidence:'依据 NASA 科学说明绘制；不是当天实测。地球放大、磁尾截短，磁轴与光带方位为示意，不读取观测日期。',how:'进入结构图 → 分层开关 → 侧面看磁尾 → 靠近看极光 → 返回原观测。'},
 {id:'nearEarth',title:'06 · 辐射带与等离子体层',added:'走进磁层内部的粒子区域',description:'补内辐射带、外辐射带和等离子体层的三维体积分布示意，可分别开关，切开查看内部。',evidence:'NASA 科学说明支持形态与概念；点数、颜色、边界和缺口均为示意，不表示实测通量或辐射剂量。',how:'进入近地粒子区域 → 切开 / 恢复完整区域 → 单独开关三层 → 对比磁层与极光。'},
 {id:'solarActivity',title:'07 · 太阳活动与物质抛射',added:'区分太阳风、耀斑与 CME',description:'增加可暂停、拖动和重播的太阳活动原理演示，日冕、太阳风、耀斑、日冕物质抛射可分别开关，并关联地球磁层。',evidence:'依据 NASA 科学说明；纹理、光晕、云团和传播节奏为示意，不是当日事件或抵达时间预测。',how:'单独打开各层 → 播放或拖动进度 → 比较辐射与物质 → 接着看地球磁层。'},
 {id:'dustExplorer',title:'08 · 行星际尘埃与流星',added:'从小颗粒分布到大气中的光迹',description:'展开尘埃云、倾斜碎屑流和地球参考路径，再独立观察流星体进入大气、发光和消融的示例。',evidence:'NASA 科学资料支持概念；点云、倾角、尺寸和速度为示意，不是当日尘埃密度、流星雨或撞击预报。',how:'侧看尘埃厚度 → 分层开关 → 切换进入大气 → 播放与拖动 → 接着看真实彗星。'},
 {id:'heliosphereExplorer',title:'09 · 日球层与星际空间',added:'分清太阳风边界与引力范围',description:'展开内部太阳风、终止激波、日鞘、日球层顶、星际介质和中性原子示例，支持剖示、完整轮廓与侧视。',evidence:'依据 NASA 科学资料；球面、点云、流动与缺口均为教学示意，不是当日边界或实测三维地图。',how:'逐层观察 → 切开 / 完整 → 播放两类粒子示意 → 对照奥尔特云 → 回看太阳活动。'},
] as const;
export type StageId=typeof STAGES[number]['id'];
export type StageFlags=Record<StageId,boolean>;
export const allStages=():StageFlags=>Object.fromEntries(STAGES.map(stage=>[stage.id,true])) as StageFlags;
export const onlyStage=(id:StageId):StageFlags=>({...Object.fromEntries(STAGES.map(s=>[s.id,false])),[id]:true}) as StageFlags;
/** Presentation gates: never modifies time, ephemeris samples or physics. */
export function stagedLayers(layers:MacroLayerVisibility,flags:StageFlags):MacroLayerVisibility {
 return {...layers,asteroid:layers.asteroid&&flags.structure,kuiper:layers.kuiper&&flags.structure,scattered:layers.scattered&&flags.structure,
 populations:layers.populations&&flags.structure,dust:layers.dust&&flags.structure,wind:layers.wind&&flags.structure,heliosphere:layers.heliosphere&&flags.structure,oort:layers.oort&&flags.structure,
 moons:layers.moons&&flags.families,dwarfs:layers.dwarfs&&(flags.structure||flags.members),comets:layers.comets&&flags.comets};
}
