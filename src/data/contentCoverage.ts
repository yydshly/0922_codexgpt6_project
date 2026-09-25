import type {MacroZoneId} from './macroStructure';
import type {SolarFamilyId,CosmicLevelId} from './cosmicContext';
import type {StageId} from './stages';
export type CoverageEntry = {kind:'zone';id:MacroZoneId}|{kind:'family';id:SolarFamilyId}|{kind:'cosmic';id:CosmicLevelId};
export type PlanTab = 'closeout'|'baseline'|'route'|'coverage'|'data'|'delivery';
export const BASELINE_VERSION = 'review-2026-09-25-closeout';
export interface CoverageItem {id:string;title:string;status:string;current:string;target:string;phase:string;evidence:string;datasets:(keyof typeof COVERAGE_DATASETS)[];modules:string[];entry:CoverageEntry|null;stages:StageId[];how:string;validation:string;release:string;acceptance:string;}
export const COVERAGE_DATASETS = {
  coorbital:{"version": "horizons-coorbital-2026-2027-v1", "generatedAt": "2026-09-25T05:39:42.332209+00:00", "startUtc": "2026-01-01T00:00:00Z", "endUtc": "2028-01-01T00:00:00Z", "path": "data/coorbital/manifest.json"},
  patroclusSystem:{"version": "horizons-patroclus-menoetius-2026-2027-v1", "generatedAt": "2026-09-24T17:07:55.608032+00:00", "startUtc": "2026-01-01T00:00:00Z", "endUtc": "2028-01-01T00:00:00Z", "path": "data/patroclus-system/manifest.json"},
  erisSystem:{"version": "horizons-eris-dysnomia-2026-2027-v1", "generatedAt": "2026-09-24T16:26:14.479572+00:00", "startUtc": "2026-01-01T00:00:00Z", "endUtc": "2028-01-01T00:00:00Z", "path": "data/eris-system/manifest.json"},
  plutoMoons:{"version": "horizons-pluto-small-moons-2026-2027-v1", "generatedAt": "2026-09-24T16:08:58.867532+00:00", "startUtc": "2026-01-01T00:00:00Z", "endUtc": "2028-01-01T00:00:00Z", "path": "data/pluto-moons/manifest.json"},
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
  "version": "horizons-small-bodies-2026-2027-v3",
  "generatedAt": "2026-09-24T14:43:27.722122+00:00",
  "startUtc": "2026-01-01T00:00:00Z",
  "endUtc": "2028-01-01T00:00:00Z"
},
  "comets": {
  "path": "data/comets/manifest.json",
  "version": "horizons-comets-2026-2027-v2",
  "generatedAt": "2026-09-24T14:44:34.028493+00:00",
  "startUtc": "2026-01-01T00:00:00Z",
  "endUtc": "2028-01-01T00:00:00Z"
}
} as const;
export const CONTENT_COVERAGE:CoverageItem[] = [
  {
    "id": "E01",
    "title": "太阳本体与活动",
    "status": "已上线 · 代表体验",
    "current": "本体历表与参数；太阳分层、黑子/日珥、耀斑/CME，以及太阳—地球环境联系和光/粒子解释层。",
    "target": "复验太阳各层、活动与粒子示意的区别；当日太阳活动和差异自转属于明确未实现的深化能力。",
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
    "validation": "参考姿态、来源、分层控制与跨模块显隐已有本地检查；非当日太阳活动重建。",
    "release": "已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。",
    "acceptance": "待逐类用户验收"
  },
  {
    "id": "E02",
    "title": "八大行星与外观",
    "status": "已上线 · 代表体验",
    "current": "八大行星历表、球体、轨道与参数；地球静态云层、大气与全景贴图失败恢复。",
    "target": "复验尺度、昼夜、自转说明和贴图恢复；实时天气、精细地形和完整姿态不计作已实现。",
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
    "validation": "参考自转、倾角参照、静态纹理与家族比例检查通过；不等于完整外观实测重建。",
    "release": "已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。",
    "acceptance": "待逐类用户验收"
  },
  {
    "id": "E03",
    "title": "天然卫星与家族",
    "status": "已上线 · 代表体验",
    "current": "27 颗选定卫星/伴星；行星家族、冥王星五卫星、阋神星系统、双小行星及土卫二喷流/剖面。",
    "target": "复验父子关系、母星附近的局部尺度和日期一致性；不是全部天然卫星名录。",
    "phase": "M3",
    "evidence": "卫星历表 + 局部显示缩放",
    "datasets": [
      "core",
      "satellites",
      "dwarfs",
      "plutoMoons",
      "erisSystem",
      "patroclusSystem"
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
    "validation": "六个家族、冥王星、阋神星、双小行星的近景、大小/距离边界与历史恢复已复验；待用户整批验收。",
    "release": "已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。",
    "acceptance": "待逐类用户验收"
  },
  {
    "id": "E04",
    "title": "行星与小天体环",
    "status": "已上线 · 代表体验",
    "current": "四大巨行星代表环系 + 女凯龙星双环参考示意",
    "target": "复验四大巨行星代表环和女凯龙星双环的比例、开关与来源；完整暗淡外延和真实厚度仍为已知限制。",
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
    "validation": "参考环段来源与局部比例已复核；土星三视图统一 C/B/A 边界，几何回归和开关复验已补，用户验收待完成。",
    "release": "已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。",
    "acceptance": "待逐类用户验收"
  },
  {
    "id": "E05",
    "title": "矮行星",
    "status": "已上线 · 代表体验",
    "current": "五颗矮行星已纳入统一成员目录与全景；冥王星、阋神星可展开已接入家族。",
    "target": "复验五颗矮行星的定位、参数和家族往返，不重复开发既有目录。",
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
    "validation": "R07 已核对统一成员目录、定位、参数与返回；五颗矮行星用户逐类验收仍待完成。",
    "release": "已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。",
    "acceptance": "待逐类用户验收"
  },
  {
    "id": "E06",
    "title": "小行星主带",
    "status": "已上线 · 代表体验",
    "current": "主带点云；谷神星、灶神星真实代表",
    "target": "复验区域点云与具名成员的辨识；主带点云不承诺逐颗真实坐标。",
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
    "release": "已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。",
    "acceptance": "待逐类用户验收"
  },
  {
    "id": "E07",
    "title": "近地小行星",
    "status": "已上线 · 代表体验",
    "current": "爱神星真实历表和 PDS 形状；Kamoʻoalewa 准卫星历表及日心/地心旋转参照系对照。",
    "target": "复验两个参照系保持同一日期；准卫星不是绕地球的天然卫星。",
    "phase": "M3",
    "evidence": "JPL 几何历表 + SBDB 参数快照 + PDS NEAR 形状网格；材质与补光示意",
    "datasets": [
      "core",
      "smallBodies",
      "coorbital"
    ],
    "modules": [
      "src/data/coorbital.ts",
      "src/components/coorbitalScene.ts",
      "src/data/r01Members.ts",
      "src/data/regionMembers.ts",
      "src/components/R01MemberParameters.tsx"
    ],
    "entry": {
      "kind": "family",
      "id": "asteroids"
    },
    "stages": [
      "members"
    ],
    "how": "全景目录 → 共轨与准卫星；日心/地心旋转视角切换，日期不变。爱神星原入口保留。",
    "validation": "R01 小天体历表与 PDS 形状核验、R06 准卫星参照系回归已记录；形状与轨道使用不同来源。",
    "release": "已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。",
    "acceptance": "待逐类用户验收"
  },
  {
    "id": "E08",
    "title": "特洛伊群",
    "status": "已上线 · 代表体验",
    "current": "阿喀琉斯 L4、埃涅阿斯 L5 及 Patroclus–Menoetius 双体历表；背景点群为示意",
    "target": "复验 L4/L5、双体与木星的关系；保留背景点群为示意的说明。",
    "phase": "M2 / M3",
    "evidence": "JPL 几何历表 + SBDB 参数快照 + PDS NEAR 形状网格；材质与补光示意",
    "datasets": [
      "core",
      "smallBodies",
      "patroclusSystem"
    ],
    "modules": [
      "src/data/r01Members.ts",
      "src/components/PatroclusSystemPanel.tsx",
      "src/data/regionMembers.ts",
      "src/components/R01MemberParameters.tsx"
    ],
    "entry": {
      "kind": "family",
      "id": "centaurs"
    },
    "stages": [
      "members"
    ],
    "how": "半人马族与特洛伊群 → 分别定位 L4/L5，比较相对木星方位。",
    "validation": "两年 3 小时独立检查点验证实际 6 小时插值；见 R01 数据报告。外观非精确形状。",
    "release": "已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。",
    "acceptance": "待逐类用户验收"
  },
  {
    "id": "E09",
    "title": "半人马族",
    "status": "已上线 · 代表体验",
    "current": "女凯龙星真实历表、轨道与来源参数；巨行星区域点群为示意",
    "target": "复验代表的跨区域轨道和双环示意；不要求全量半人马天体。",
    "phase": "M3",
    "evidence": "JPL 几何历表 + SBDB 参数快照 + PDS NEAR 形状网格；材质与补光示意",
    "datasets": [
      "core",
      "smallBodies"
    ],
    "modules": [
      "src/data/r01Members.ts",
      "src/data/regionMembers.ts",
      "src/components/R01MemberParameters.tsx"
    ],
    "entry": {
      "kind": "family",
      "id": "centaurs"
    },
    "stages": [
      "members"
    ],
    "how": "半人马族与特洛伊群 → 女凯龙星；观察高度、轨道；主全景可定位并控制双环参考示意。",
    "validation": "两年 3 小时独立检查点验证实际 6 小时插值；见 R01 数据报告。外观非精确形状。",
    "release": "已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。",
    "acceptance": "待逐类用户验收"
  },
  {
    "id": "E10",
    "title": "柯伊伯带",
    "status": "已上线 · 代表体验",
    "current": "经典族夸奥尔、共振族冥王星等具名成员；四类轨道解释",
    "target": "复验经典/共振分类、侧视厚度与具名代表；区域点云为结构示意，不是观测普查。",
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
      "members"
    ],
    "how": "全景内容总表进入；展开四类轨道说明对照夸奥尔与冥王星。",
    "validation": "R02 代表成员及分类、R07 区域路线已有检查记录；仍需本次统一用户核对。",
    "release": "已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。",
    "acceptance": "待逐类用户验收"
  },
  {
    "id": "E11",
    "title": "散射盘与离散天体",
    "status": "已上线 · 代表体验",
    "current": "脱离轨道代表塞德娜、远伸轨道阋神星及分布示意",
    "target": "复验散射/脱离分类和两类代表轨道；共用区域点云尚非两个实测分布重建，不将其标为已完成。",
    "phase": "M2 / M3",
    "evidence": "分布示意 + 塞德娜与阋神星历表",
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
      "members"
    ],
    "how": "全景内容总表定位塞德娜；查看黄道高度、日期变化及分类依据。",
    "validation": "代表成员有数据验证；两类分布尚未分别实现。",
    "release": "已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。",
    "acceptance": "待逐类用户验收"
  },
  {
    "id": "E12",
    "title": "彗星",
    "status": "已上线 · 代表体验",
    "current": "哈雷、67P 与长周期海尔—波普三颗彗核历表、两年路径和参数",
    "target": "复验三颗彗星、彗尾方向与轨迹区别；活动演示不等于所选日期的实况。",
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
    "how": "内容总表 → 彗星 → 海尔—波普；可切换三颗彗星。",
    "validation": "数据包内有留出样本误差；活动示例不作当日状态验证。",
    "release": "已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。",
    "acceptance": "待逐类用户验收"
  },
  {
    "id": "E13",
    "title": "奥尔特云",
    "status": "已上线 · 推断模型",
    "current": "有来源的球壳点云、不确定范围及日球层/奥尔特云同屏对照",
    "target": "复验日球层与奥尔特云的不同边界含义；不以虚构逐体实测补齐推断模型。",
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
    "how": "全景现象 → 太阳系的边界是哪一种？ → 遥远冰质天体 / 放在同一空间。",
    "validation": "三步定位、阶段依赖、历史及同一画布/日期已验证；点云仍为模型推断。",
    "release": "已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。",
    "acceptance": "待逐类用户验收"
  },
  {
    "id": "E14",
    "title": "尘埃、流星体与流星",
    "status": "已上线 · 示意与解释",
    "current": "尘埃、碎屑流、进入大气演示；主全景黄道光原理与喷流补给 E 环联系",
    "target": "复验碎屑—流星、尘埃—黄道光、喷流—E 环六步联系；不承诺流星雨预报。",
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
    "how": "全景现象 → 物质从哪里来，会变成什么？六步定位；独立详解仍可阅读。",
    "validation": "主全景六步、阶段门控、历史恢复与独立播放已本地验证；关联为原理示意，不是流星雨预报，待用户验收。",
    "release": "已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。",
    "acceptance": "待逐类用户验收"
  },
  {
    "id": "E15",
    "title": "太阳风与日球层",
    "status": "已上线 · 示意与解释",
    "current": "太阳风、激波、日鞘与边界；主全景来流、行星际参考场、电流片、中性原子及奥尔特云对照",
    "target": "复验五种不可见环境解释与三步边界对照；实时通量和完整数值场不在首版范围。",
    "phase": "M2 / M4",
    "evidence": "分层边界和粒子流动示意",
    "datasets": [],
    "modules": [
      "src/data/heliosphere.ts",
      "src/components/HeliosphereExplorer.tsx",
      "src/data/environmentJourney.ts",
      "src/components/macroIntegrated.ts"
    ],
    "entry": {
      "kind": "zone",
      "id": "heliosphere"
    },
    "stages": [
      "structure"
    ],
    "how": "全景现象 → 太阳系边界对照 / 看不见的空间；独立详解继续保留。",
    "validation": "五种原理图及三步边界对照已回归；没有实时边界或通量验证。",
    "release": "已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。",
    "acceptance": "待逐类用户验收"
  },
  {
    "id": "E16",
    "title": "磁层、辐射带与极光",
    "status": "已上线 · 示意与解释",
    "current": "地球环境和近地粒子区域；主全景七步串联太阳—地球联系与木星磁层、木卫一等离子体环、极光对照",
    "target": "复验太阳—地球及木星环境联系、开关和日期/示意进度的区别。",
    "phase": "M4",
    "evidence": "磁层和粒子区域原理示意",
    "datasets": [],
    "modules": [
      "src/data/spaceEnvironment.ts",
      "src/data/nearEarth.ts",
      "src/components/SpaceEnvironment.tsx",
      "src/data/environmentJourney.ts",
      "src/components/EnvironmentJourneyPanel.tsx",
      "src/components/jupiterEnvironment.ts"
    ],
    "entry": {
      "kind": "zone",
      "id": "planetary"
    },
    "stages": [
      "environment"
    ],
    "how": "全景现象 → 太阳与行星环境七步定位；阶段 05 控制地球/木星环境，木卫一步骤另需阶段 04。",
    "validation": "机制对照、同日木卫一摆放、场景与标题、前进后退及阶段依赖已本地验证；不提供当日磁场、密度或极光预测。",
    "release": "已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。",
    "acceptance": "待逐类用户验收"
  },
  {
    "id": "E17",
    "title": "运行关系与天象",
    "status": "已上线 · 代表体验",
    "current": "14 节运动课程，含准卫星双参照系、月相/季节、锁定/共振；日食、月食与木卫一遮掩三例事件。",
    "target": "复验课程、参照对象、事件窗口与误差说明；当地预报和长期潮汐/共振动力学不在首版范围。",
    "phase": "M4",
    "evidence": "同日 JPL 状态 + NAIF 参考姿态 + NASA 机制解释",
    "datasets": [
      "core",
      "satellites",
      "coorbital"
    ],
    "modules": [
      "src/data/occultation.ts",
      "src/components/OccultationReadout.tsx",
      "public/data/events/io-occultation-2026-01-12.json",
      "src/data/solarEclipse.ts",
      "src/components/SolarEclipseReadout.tsx",
      "public/data/events/solar-2026-08-12.json",
      "src/data/lunarEclipse.ts",
      "src/components/LunarEclipseReadout.tsx",
      "public/data/events/lunar-2026-03-03.json",
      "src/components/MotionLessonPanel.tsx",
      "src/components/coorbitalScene.ts",
      "src/components/MacroMotionPanel.tsx",
      "src/data/macroPlanetOrbits.ts"
    ],
    "entry": {
      "kind": "zone",
      "id": "planetary"
    },
    "stages": [],
    "how": "全景目录 → 日月食与遮掩；场景清单 → 日食/月食/遮掩案例；遮掩提供可拖动三维空间与固定地球所见。保留运动课程入口。",
    "validation": "遮掩计入单程光行时，掩始比 IMCCE 晚约 87 秒；日食最近影轴时刻晚 34.9 秒；月食晚 37.8 秒，食分差 -0.0212；原始历表哈希与同时间尺度比较可复算。无当地可见性、潮汐演化或长期共振求解。",
    "release": "已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。",
    "acceptance": "待逐类用户验收"
  },
  {
    "id": "E18",
    "title": "真实恒星背景与邻星",
    "status": "部分满足 · 背景差距",
    "current": "独立恒星视图已接入 2,936 个亮星方向、32 个邻星距离样本及点选资料；太阳系主全景仍用装饰背景星点。",
    "target": "未关闭 F01：原 M2.1 背景星点可追溯的标准尚未覆盖主全景；需要接入或经明确确认修订范围，不能直接判完成。",
    "phase": "M2 / M5",
    "evidence": "Hipparcos 固定历元星表与筛选距离样本；主全景星点另为装饰",
    "datasets": [],
    "modules": [
      "src/data/starCatalogue.ts",
      "src/components/StellarCataloguePanel.tsx",
      "src/components/stellarScene.ts"
    ],
    "entry": {
      "kind": "cosmic",
      "id": "neighbors"
    },
    "stages": [],
    "how": "恒星系统与其他星系 → 邻近恒星；切换天空方向/空间距离并点选资料。全景背景差距见 F01。",
    "validation": "5 星 Hipparcos 原版/新版交叉核对及星表质量筛选检查通过；同一观测任务，不是独立望远镜认证，也不是今晚地面星图。",
    "release": "已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。",
    "acceptance": "待逐类用户验收"
  },
  {
    "id": "E19",
    "title": "银河系与邻近星系",
    "status": "已上线 · 示意与解释",
    "current": "银河系与邻近星系概念图、距离/尺度说明及第六条专题路线已上线。",
    "target": "复验太阳系—邻星—银河系—邻近星系的尺度与返回；概念模型不冒充实测星图。",
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
    "validation": "R08 第六路线及 R09 六路线 27 步、跨尺度历史返回检查已有记录；用户验收待完成。",
    "release": "已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。",
    "acceptance": "待逐类用户验收"
  },
  {
    "id": "E20",
    "title": "星际访客",
    "status": "已上线 · 代表体验",
    "current": "2I/Borisov：2019—2020 独立历史轨迹与参数",
    "target": "复验独立历史时间窗口和返回当前观测；不把访客计作长期束缚成员。",
    "phase": "M3",
    "evidence": "历史 JPL 几何历表；不计入当前数量",
    "datasets": [],
    "modules": [
      "src/components/HistoricalVisitor.tsx",
      "src/ephemeris/borisov.ts",
      "public/data/borisov/manifest.json"
    ],
    "entry": {
      "kind": "family",
      "id": "comets"
    },
    "stages": [],
    "how": "内容总表 → 星际访客直接进入；彗星面板也提供历史窗口。",
    "validation": "原始数据与分包哈希、独立检查点插值及历史窗口进出检查；不代表绝对轨道精度。",
    "release": "已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。",
    "acceptance": "待逐类用户验收"
  }
];
