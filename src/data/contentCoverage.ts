import type {MacroZoneId} from './macroStructure';
import type {SolarFamilyId,CosmicLevelId} from './cosmicContext';
import type {StageId} from './stages';
export type CoverageEntry = {kind:'zone';id:MacroZoneId}|{kind:'family';id:SolarFamilyId}|{kind:'cosmic';id:CosmicLevelId};
export type PlanTab = 'baseline'|'route'|'coverage'|'data'|'delivery';
export const BASELINE_VERSION = 'baseline-2026-09-24-review-v1';
export interface CoverageItem {id:string;title:string;status:string;current:string;target:string;phase:string;evidence:string;datasets:(keyof typeof COVERAGE_DATASETS)[];modules:string[];entry:CoverageEntry|null;stages:StageId[];how:string;validation:string;release:string;acceptance:string;}
export const COVERAGE_DATASETS = {
  "core": {
    "path": "data/manifest.json",
    "version": "horizons-2026-2027-v1",
    "generatedAt": "2026-09-22T08:40:11.455580+00:00",
    "startUtc": "2026-01-01T00:00:00.000Z",
    "endUtc": "2028-01-01T00:00:00.000Z"
  },
  "satellites": {
    "path": "data/satellites/manifest.json",
    "version": "naif-satellites-2026-2027-v3-saturn",
    "generatedAt": "2026-09-22T12:18:43.022470+00:00",
    "startUtc": "2026-01-01T00:00:00.000Z",
    "endUtc": "2028-01-01T00:00:00.000Z"
  },
  "dwarfs": {
    "path": "data/dwarfs/manifest.json",
    "version": "horizons-dwarfs-2026-2027-v1",
    "generatedAt": "2026-09-23T13:08:56.316462+00:00",
    "startUtc": "2026-01-01T00:00:00Z",
    "endUtc": "2028-01-01T00:00:00Z"
  },
  "smallBodies": {
    "path": "data/small-bodies/manifest.json",
    "version": "horizons-small-bodies-2026-2027-v1",
    "generatedAt": "2026-09-24T03:51:12.800512+00:00",
    "startUtc": "2026-01-01T00:00:00Z",
    "endUtc": "2028-01-01T00:00:00Z"
  },
  "comets": {
    "path": "data/comets/manifest.json",
    "version": "horizons-comets-2026-2027-v1",
    "generatedAt": "2026-09-24T03:27:00.046511+00:00",
    "startUtc": "2026-01-01T00:00:00Z",
    "endUtc": "2028-01-01T00:00:00Z"
  }
} as const;
export const CONTENT_COVERAGE:CoverageItem[] = [
  {
    "id": "E01",
    "title": "太阳本体与活动",
    "status": "已有基础",
    "current": "本体历表、参数、参考自转及日冕/活动示意",
    "target": "统一表面与活动层；活动模型和当日状态分别说明",
    "phase": "M3 / M4",
    "evidence": "历表位置 + 参考参数 + 活动示意",
    "datasets": [
      "core"
    ],
    "modules": [
      "src/data/catalog.ts",
      "src/components/SolarActivity.tsx"
    ],
    "entry": {
      "kind": "zone",
      "id": "planetary"
    },
    "stages": [],
    "how": "选择太阳；更多工具 → 太阳活动。",
    "validation": "数据包有插值报告；太阳表面修复见学习流程检查，活动模型仍待总验收。",
    "release": "基础功能已发布；覆盖清单随本批交付，用户验收独立记录",
    "acceptance": "待用户验收"
  },
  {
    "id": "E02",
    "title": "八大行星与外观",
    "status": "已有基础",
    "current": "真实历表、球体、轨道参考、参数；地球有云层与大气",
    "target": "逐体核对姿态、光照、材质和大气边界",
    "phase": "M3",
    "evidence": "历表位置 + 静态贴图与程序大气",
    "datasets": [
      "core"
    ],
    "modules": [
      "src/components/MacroPrimaryPanel.tsx",
      "src/components/macroEarth.ts"
    ],
    "entry": {
      "kind": "zone",
      "id": "planetary"
    },
    "stages": [],
    "how": "点选行星；全景目录 → 地球外观。",
    "validation": "核心插值报告已存在；外观和姿态逐体复核待 M3.3。",
    "release": "基础功能已发布；覆盖清单随本批交付，用户验收独立记录",
    "acceptance": "待用户验收"
  },
  {
    "id": "E03",
    "title": "天然卫星与家族",
    "status": "已有基础",
    "current": "21 颗选定卫星；六个行星家族与冥王星双体",
    "target": "冥王星余下四卫星及至少一个其他矮行星卫星系统",
    "phase": "M3",
    "evidence": "卫星历表 + 局部显示缩放",
    "datasets": [
      "core",
      "satellites",
      "dwarfs"
    ],
    "modules": [
      "src/data/satellites.ts",
      "src/components/MacroFamilyPanel.tsx",
      "src/components/MacroBinaryPanel.tsx"
    ],
    "entry": {
      "kind": "family",
      "id": "moons"
    },
    "stages": [
      "families"
    ],
    "how": "阅读天然卫星；全景现象 → 定位家族。",
    "validation": "卫星包有插值报告；地月近景操作已复验，全部家族总验收待补。",
    "release": "基础功能已发布；覆盖清单随本批交付，用户验收独立记录",
    "acceptance": "待用户验收"
  },
  {
    "id": "E04",
    "title": "行星与小天体环",
    "status": "示意为主",
    "current": "四大巨行星代表环系",
    "target": "细化环段与尺度；小天体环提供有来源的代表说明",
    "phase": "M3",
    "evidence": "文献参考环段 + 增强显示",
    "datasets": [],
    "modules": [
      "src/data/rings.ts",
      "src/components/RingLearning.tsx"
    ],
    "entry": {
      "kind": "family",
      "id": "moons"
    },
    "stages": [
      "families"
    ],
    "how": "选择巨行星家族，比较环系和轨道开关。",
    "validation": "环系资料及开关已接入；逐环尺度、外观验收待补。",
    "release": "基础功能已发布；覆盖清单随本批交付，用户验收独立记录",
    "acceptance": "待用户验收"
  },
  {
    "id": "E05",
    "title": "矮行星",
    "status": "已有基础",
    "current": "五颗矮行星有历表；部分在宏观页单独入口",
    "target": "统一目录与近景体验，展开选定卫星关系",
    "phase": "M3",
    "evidence": "历表位置 + 参考外观",
    "datasets": [
      "dwarfs",
      "smallBodies"
    ],
    "modules": [
      "src/data/regionMembers.ts",
      "src/components/RegionMembers.tsx"
    ],
    "entry": {
      "kind": "family",
      "id": "dwarfs"
    },
    "stages": [
      "members"
    ],
    "how": "从矮行星成员清单定位，再展开参数。",
    "validation": "数据包有检查点验证；五颗矮行星统一近景验收待补。",
    "release": "基础功能已发布；覆盖清单随本批交付，用户验收独立记录",
    "acceptance": "待用户验收"
  },
  {
    "id": "E06",
    "title": "小行星主带",
    "status": "示意为主",
    "current": "主带点云；谷神星、灶神星真实代表",
    "target": "有依据的分布与样本区分、目录关联",
    "phase": "M2 / M3",
    "evidence": "随机区域点云 + 具名成员历表",
    "datasets": [
      "dwarfs",
      "smallBodies"
    ],
    "modules": [
      "src/data/macroLayers.ts",
      "src/components/macroPhenomena.ts",
      "src/data/regionMembers.ts"
    ],
    "entry": {
      "kind": "zone",
      "id": "asteroid"
    },
    "stages": [
      "structure"
    ],
    "how": "侧视主带，再定位谷神星或灶神星。",
    "validation": "灶神星近景切换已复验；点云不是逐体数据，无逐点精度报告。",
    "release": "基础功能已发布；覆盖清单随本批交付，用户验收独立记录",
    "acceptance": "待用户验收"
  },
  {
    "id": "E07",
    "title": "近地小行星",
    "status": "待接入",
    "current": "已有分类文字，没有代表对象动态观察",
    "target": "至少一个通过数据验证的代表对象及与地球轨道关系",
    "phase": "M3",
    "evidence": "分类资料；缺少近地动态代表",
    "datasets": [],
    "modules": [
      "src/data/cosmicContext.ts"
    ],
    "entry": {
      "kind": "family",
      "id": "asteroids"
    },
    "stages": [],
    "how": "当前只能阅读分类；主带代表不等于近地小行星。",
    "validation": "未接入代表对象，尚无该类动态验证。",
    "release": "已有分类或示意；目标能力未发布",
    "acceptance": "现有说明待验收；动态能力待接入"
  },
  {
    "id": "E08",
    "title": "特洛伊群",
    "status": "示意为主",
    "current": "类别说明和示意点群",
    "target": "L4/L5 各一真实代表，解释相对行星分布",
    "phase": "M2 / M3",
    "evidence": "资料分类 + 随机种群示意",
    "datasets": [],
    "modules": [
      "src/data/cosmicContext.ts",
      "src/components/macroPhenomena.ts"
    ],
    "entry": {
      "kind": "family",
      "id": "centaurs"
    },
    "stages": [
      "structure"
    ],
    "how": "阅读半人马族与特洛伊群，辨认种群示意。",
    "validation": "无 L4/L5 真实代表历表；示意层仍待集中视觉验收。",
    "release": "基础功能已发布；覆盖清单随本批交付，用户验收独立记录",
    "acceptance": "待用户验收"
  },
  {
    "id": "E09",
    "title": "半人马族",
    "status": "示意为主",
    "current": "巨行星之间的分类与点群示意",
    "target": "至少一个真实代表及跨区域轨道",
    "phase": "M3",
    "evidence": "资料分类 + 随机种群示意",
    "datasets": [],
    "modules": [
      "src/data/cosmicContext.ts",
      "src/components/macroPhenomena.ts"
    ],
    "entry": {
      "kind": "family",
      "id": "centaurs"
    },
    "stages": [
      "structure"
    ],
    "how": "阅读半人马族；与特洛伊群共用分类入口。",
    "validation": "无真实代表轨道，尚无逐体精度验证。",
    "release": "基础功能已发布；覆盖清单随本批交付，用户验收独立记录",
    "acceptance": "待用户验收"
  },
  {
    "id": "E10",
    "title": "柯伊伯带",
    "status": "示意为主",
    "current": "区域点云，部分矮行星位置",
    "target": "厚度、分布及代表成员对照",
    "phase": "M2 / M3",
    "evidence": "区域点云 + 部分成员历表",
    "datasets": [
      "dwarfs",
      "smallBodies"
    ],
    "modules": [
      "src/data/macroStructure.ts",
      "src/data/regionMembers.ts"
    ],
    "entry": {
      "kind": "zone",
      "id": "kuiper"
    },
    "stages": [
      "structure"
    ],
    "how": "侧视厚度，再进入具名远缘天体。",
    "validation": "成员有数据包验证；区域分布的统一表达待 M2.2。",
    "release": "基础功能已发布；覆盖清单随本批交付，用户验收独立记录",
    "acceptance": "待用户验收"
  },
  {
    "id": "E11",
    "title": "散射盘与离散天体",
    "status": "示意为主",
    "current": "合并点云及阋神星代表",
    "target": "分清两类概念；加入离散轨道代表，不用统一圆环代替",
    "phase": "M2 / M3",
    "evidence": "合并区域示意 + 阋神星历表",
    "datasets": [
      "smallBodies"
    ],
    "modules": [
      "src/data/macroStructure.ts",
      "src/data/regionMembers.ts"
    ],
    "entry": {
      "kind": "zone",
      "id": "scattered"
    },
    "stages": [
      "structure"
    ],
    "how": "对照区域散点和阋神星参数。",
    "validation": "代表成员有数据验证；两类分布尚未分别实现。",
    "release": "基础功能已发布；覆盖清单随本批交付，用户验收独立记录",
    "acceptance": "待用户验收"
  },
  {
    "id": "E12",
    "title": "彗星",
    "status": "已有基础",
    "current": "哈雷与 67P 历表、两年路径、双尾示例",
    "target": "长周期代表与活动边界；彗尾不等同轨迹",
    "phase": "M3 / M4",
    "evidence": "历表与两年路径 + 双尾原理示意",
    "datasets": [
      "comets"
    ],
    "modules": [
      "src/components/CometPanel.tsx",
      "src/ephemeris/comets.ts"
    ],
    "entry": {
      "kind": "family",
      "id": "comets"
    },
    "stages": [
      "comets"
    ],
    "how": "选择哈雷或 67P；区分路径和彗尾。",
    "validation": "数据包内有留出样本误差；活动示例不作当日状态验证。",
    "release": "基础功能已发布；覆盖清单随本批交付，用户验收独立记录",
    "acceptance": "待用户验收"
  },
  {
    "id": "E13",
    "title": "奥尔特云",
    "status": "模型推断",
    "current": "有来源的球壳点云与不确定范围",
    "target": "补模型范围和彗星来源关联；不设逐体实测验收目标",
    "phase": "M2 / M4",
    "evidence": "依据资料的推断球壳",
    "datasets": [],
    "modules": [
      "src/data/macroStructure.ts",
      "src/components/MacroStructure.tsx"
    ],
    "entry": {
      "kind": "zone",
      "id": "oort"
    },
    "stages": [
      "structure"
    ],
    "how": "侧视球状区域，阅读模型不确定性。",
    "validation": "推断模型没有逐体观测坐标；范围与说明待总验收。",
    "release": "基础功能已发布；覆盖清单随本批交付，用户验收独立记录",
    "acceptance": "待用户验收"
  },
  {
    "id": "E14",
    "title": "尘埃、流星体与流星",
    "status": "示意为主",
    "current": "尘埃、碎屑流、进入大气演示",
    "target": "补黄道光和流星雨关联，明确观测条件与统计性质",
    "phase": "M4",
    "evidence": "统计区域与原理演示",
    "datasets": [],
    "modules": [
      "src/data/dust.ts",
      "src/components/DustExplorer.tsx"
    ],
    "entry": {
      "kind": "family",
      "id": "dust"
    },
    "stages": [
      "dustExplorer"
    ],
    "how": "更多工具 → 尘埃与流星；从独立详解查看进度控制。",
    "validation": "已有演示控制；黄道光与流星雨关联未完成。",
    "release": "基础功能已发布；覆盖清单随本批交付，用户验收独立记录",
    "acceptance": "待用户验收"
  },
  {
    "id": "E15",
    "title": "太阳风与日球层",
    "status": "示意为主",
    "current": "太阳风、激波、日鞘、边界及星际介质",
    "target": "分层关联与方向/时间可变边界说明",
    "phase": "M2 / M4",
    "evidence": "分层边界和粒子流动示意",
    "datasets": [],
    "modules": [
      "src/data/heliosphere.ts",
      "src/components/HeliosphereExplorer.tsx"
    ],
    "entry": {
      "kind": "zone",
      "id": "heliosphere"
    },
    "stages": [
      "structure"
    ],
    "how": "阅读区域；阶段 09 开启时可展开日球层详解。",
    "validation": "已有分层控制；方向与可变边界解释仍待完善。",
    "release": "基础功能已发布；覆盖清单随本批交付，用户验收独立记录",
    "acceptance": "待用户验收"
  },
  {
    "id": "E16",
    "title": "磁层、辐射带与极光",
    "status": "示意为主",
    "current": "地球环境和近地粒子区域",
    "target": "以木星作环境对照，完善太阳活动关联",
    "phase": "M4",
    "evidence": "磁层和粒子区域原理示意",
    "datasets": [],
    "modules": [
      "src/data/spaceEnvironment.ts",
      "src/data/nearEarth.ts",
      "src/components/SpaceEnvironment.tsx"
    ],
    "entry": {
      "kind": "zone",
      "id": "planetary"
    },
    "stages": [
      "environment"
    ],
    "how": "更多工具 → 近地空间；定位后查阅详解。",
    "validation": "地球环境已有操作；木星环境对照尚未实现。",
    "release": "基础功能已发布；覆盖清单随本批交付，用户验收独立记录",
    "acceptance": "待用户验收"
  },
  {
    "id": "E17",
    "title": "运行关系与天象",
    "status": "部分讲解",
    "current": "运动比较、参考周期和部分锁定/共振文字",
    "target": "四组运行课程、日月食及遮掩案例验证",
    "phase": "M4",
    "evidence": "历表速度对比 + 参考周期讲解",
    "datasets": [
      "core"
    ],
    "modules": [
      "src/components/MacroMotionPanel.tsx",
      "src/data/macroPlanetOrbits.ts"
    ],
    "entry": {
      "kind": "zone",
      "id": "planetary"
    },
    "stages": [],
    "how": "全景目录 → 行星运动；日月食尚无案例入口。",
    "validation": "已有运动比较；四组课程和天象事件验证尚未完成。",
    "release": "基础功能已发布；覆盖清单随本批交付，用户验收独立记录",
    "acceptance": "待用户验收"
  },
  {
    "id": "E18",
    "title": "真实恒星背景与邻星",
    "status": "待接入",
    "current": "装饰星点与邻星结构示意",
    "target": "星表背景、点选资料、至少 20 个三维邻星样本",
    "phase": "M2 / M5",
    "evidence": "装饰星点 + 邻星概念模型",
    "datasets": [],
    "modules": [
      "src/components/CosmicCanvas.tsx",
      "src/data/cosmicContext.ts"
    ],
    "entry": {
      "kind": "cosmic",
      "id": "neighbors"
    },
    "stages": [],
    "how": "查看现有邻星示意；不作为星表实测结果。",
    "validation": "未导入真实星表，无星位、视差质量验证。",
    "release": "已有分类或示意；目标能力未发布",
    "acceptance": "现有说明待验收；动态能力待接入"
  },
  {
    "id": "E19",
    "title": "银河系与邻近星系",
    "status": "示意为主",
    "current": "已有不同尺度的概念结构图",
    "target": "尺度衔接、来源及坐标/模型边界一致",
    "phase": "M5",
    "evidence": "概略结构和尺度资料",
    "datasets": [],
    "modules": [
      "src/components/CosmicCanvas.tsx",
      "src/data/cosmicContext.ts"
    ],
    "entry": {
      "kind": "cosmic",
      "id": "milkyway"
    },
    "stages": [],
    "how": "从银河系切换银河系之外，比较尺度说明。",
    "validation": "结构示意已接入；跨尺度一致性仍待 M5.2。",
    "release": "基础功能已发布；覆盖清单随本批交付，用户验收独立记录",
    "acceptance": "待用户验收"
  },
  {
    "id": "E20",
    "title": "星际访客",
    "status": "待接入",
    "current": "尚无动态代表对象",
    "target": "一例通过来源、轨道质量和有效时间检查的代表；与长期束缚成员区分",
    "phase": "M3",
    "evidence": "规划候选，暂无动态数据",
    "datasets": [],
    "modules": [],
    "entry": null,
    "stages": [],
    "how": "尚无观测入口；后续按可靠数据与有效日期选择代表。",
    "validation": "未接入，无可验证的代表对象。",
    "release": "未实现 / 未发布",
    "acceptance": "未实现，尚不进入功能验收"
  }
];
