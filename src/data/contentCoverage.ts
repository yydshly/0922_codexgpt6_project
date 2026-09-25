import type {MacroZoneId} from './macroStructure';
import type {SolarFamilyId,CosmicLevelId} from './cosmicContext';
import type {StageId} from './stages';
export type CoverageEntry = {kind:'zone';id:MacroZoneId}|{kind:'family';id:SolarFamilyId}|{kind:'cosmic';id:CosmicLevelId};
export type PlanTab = 'baseline'|'route'|'coverage'|'data'|'delivery';
export const BASELINE_VERSION = 'baseline-2026-09-25-r03-r04';
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
    "status": "已有基础",
    "current": "本体历表与参数；光球到日冕分层、黑子/日珥、耀斑/CME 主全景示意；本地新增太阳到极光四步联系",
    "target": "R04 基础已实现待版本验收；R05 已接入太阳—地球联系及木星对照，光/粒子辐射分层仍待补",
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
    "release": "R05 已部署 9733805，用户验收待完成；R06 运动第一课本地未发布",
    "acceptance": "待用户逐项验收（发布不等于验收）"
  },
  {
    "id": "E02",
    "title": "八大行星与外观",
    "status": "已有基础",
    "current": "真实历表、球体、轨道参考、参数；地球有云层与大气",
    "target": "R04 核心外观与参数一致性已核对；待用户验收，天气、扁率和高精度表面仍未实现",
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
    "release": "R05 已部署 9733805，用户验收待完成；R06 运动第一课本地未发布",
    "acceptance": "待用户逐项验收（发布不等于验收）"
  },
  {
    "id": "E03",
    "title": "天然卫星与家族",
    "status": "已有基础",
    "current": "27 颗选定卫星；六个行星家族、冥王星五卫星、阋神星及双小行星系统；土卫二喷流/剖面及 E 环示意",
    "target": "约定家族及土卫二喷流/内部示意已本地接入；待用户验收，环境联系由 R05 继续",
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
    "release": "R05 已部署 9733805，用户验收待完成；R06 运动第一课本地未发布",
    "acceptance": "待用户逐项验收（发布不等于验收）"
  },
  {
    "id": "E04",
    "title": "行星与小天体环",
    "status": "示意为主",
    "current": "四大巨行星代表环系 + 女凯龙星双环参考示意",
    "target": "双环与巨行星代表环段尺度已复核；等待跨视图用户验收，厚度与完整暗淡外延仍未重建",
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
    "release": "R05 已部署 9733805，用户验收待完成；R06 运动第一课本地未发布",
    "acceptance": "待用户逐项验收（发布不等于验收）"
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
    "release": "R05 已部署 9733805，用户验收待完成；R06 运动第一课本地未发布",
    "acceptance": "待用户逐项验收（发布不等于验收）"
  },
  {
    "id": "E06",
    "title": "小行星主带",
    "status": "示意为主",
    "current": "主带点云；谷神星、灶神星真实代表",
    "target": "区分区域样本与真实成员；形状对照见近地爱神星，双小行星代表见 L5 群",
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
    "release": "R05 已部署 9733805，用户验收待完成；R06 运动第一课本地未发布",
    "acceptance": "待用户逐项验收（发布不等于验收）"
  },
  {
    "id": "E07",
    "title": "近地小行星",
    "status": "已有代表 / 待验收",
    "current": "爱神星形状与参数；Kamoʻoalewa 同日历表、全景标记及两种参照系对照（已发布，待用户验收）",
    "target": "至少一个可靠近地代表及地球轨道关系；补共轨或准卫星认识案例",
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
    "validation": "两年 3 小时独立检查点验证实际 6 小时插值；见 R01 数据报告。外观非精确形状。",
    "release": "日月食及之前课程已部署 1995d1c；木卫一遮掩本地待验收",
    "acceptance": "待用户逐项验收（发布不等于验收）"
  },
  {
    "id": "E08",
    "title": "特洛伊群",
    "status": "已有代表",
    "current": "阿喀琉斯 L4、埃涅阿斯 L5 及 Patroclus–Menoetius 双体历表；背景点群为示意",
    "target": "L4/L5 各一真实代表，解释相对行星分布",
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
    "release": "R05 已部署 9733805，用户验收待完成；R06 运动第一课本地未发布",
    "acceptance": "待用户逐项验收（发布不等于验收）"
  },
  {
    "id": "E09",
    "title": "半人马族",
    "status": "已有代表",
    "current": "女凯龙星真实历表、轨道与来源参数；巨行星区域点群为示意",
    "target": "至少一个真实代表及跨区域轨道",
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
    "release": "R05 已部署 9733805，用户验收待完成；R06 运动第一课本地未发布",
    "acceptance": "待用户逐项验收（发布不等于验收）"
  },
  {
    "id": "E10",
    "title": "柯伊伯带",
    "status": "本地已接入 / 待验收",
    "current": "经典族夸奥尔、共振族冥王星等具名成员；四类轨道解释",
    "target": "区分经典与共振群体，补厚度、分布及代表成员对照",
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
    "validation": "成员有数据包验证；区域分布的统一表达待 M2.2。",
    "release": "R05 已部署 9733805，用户验收待完成；R06 运动第一课本地未发布",
    "acceptance": "待用户逐项验收（发布不等于验收）"
  },
  {
    "id": "E11",
    "title": "散射盘与离散天体",
    "status": "本地已接入 / 待验收",
    "current": "脱离轨道代表塞德娜、远伸轨道阋神星及分布示意",
    "target": "分清两类概念；加入离散轨道代表，不用统一圆环代替",
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
    "release": "R05 已部署 9733805，用户验收待完成；R06 运动第一课本地未发布",
    "acceptance": "待用户逐项验收（发布不等于验收）"
  },
  {
    "id": "E12",
    "title": "彗星",
    "status": "本地已接入 / 待验收",
    "current": "哈雷、67P 与长周期海尔—波普三颗彗核历表、两年路径和参数",
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
    "how": "内容总表 → 彗星 → 海尔—波普；可切换三颗彗星。",
    "validation": "数据包内有留出样本误差；活动示例不作当日状态验证。",
    "release": "R05 已部署 9733805，用户验收待完成；R06 运动第一课本地未发布",
    "acceptance": "待用户逐项验收（发布不等于验收）"
  },
  {
    "id": "E13",
    "title": "奥尔特云",
    "status": "模型推断",
    "current": "有来源的球壳点云、不确定范围及日球层/奥尔特云同屏对照",
    "target": "基础边界对照已本地接入待验收；不设奥尔特云逐体实测验收目标",
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
    "release": "R05 已部署 9733805，用户验收待完成；R06 运动第一课本地未发布",
    "acceptance": "待用户逐项验收（发布不等于验收）"
  },
  {
    "id": "E14",
    "title": "尘埃、流星体与流星",
    "status": "示意为主",
    "current": "尘埃、碎屑流、进入大气演示；主全景黄道光原理与喷流补给 E 环联系",
    "target": "串联尘埃、黄道光、流星雨和喷流补给，明确统计性质与非当日实况",
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
    "release": "R05 已部署 9733805，用户验收待完成；R06 运动第一课本地未发布",
    "acceptance": "待用户逐项验收（发布不等于验收）"
  },
  {
    "id": "E15",
    "title": "太阳风与日球层",
    "status": "示意为主",
    "current": "太阳风、激波、日鞘与边界；主全景来流、行星际参考场、电流片、中性原子及奥尔特云对照",
    "target": "约定环境解释与边界对照已实现，待用户验收；可变实测边界和数值场模型未实现",
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
    "release": "R05 已部署 9733805，用户验收待完成；R06 运动第一课本地未发布",
    "acceptance": "待用户逐项验收（发布不等于验收）"
  },
  {
    "id": "E16",
    "title": "磁层、辐射带与极光",
    "status": "示意为主",
    "current": "地球环境和近地粒子区域；主全景七步串联太阳—地球联系与木星磁层、木卫一等离子体环、极光对照",
    "target": "光/粒子辐射和物质联系已接入；地球与木星基础对照待用户验收，实测环境模型不在本批内",
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
    "release": "R05 已部署 9733805，用户验收待完成；R06 运动第一课本地未发布",
    "acceptance": "待用户逐项验收（发布不等于验收）"
  },
  {
    "id": "E17",
    "title": "运行关系与天象",
    "status": "课程与日月食已接入 / 遮掩待验收",
    "current": "运行关系、准卫星与日月食已发布；木卫一遮掩双视角本地待验收",
    "target": "四组运行课程、共轨参照系案例，以及日月食和卫星遮掩案例验证",
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
    "release": "日月食及之前课程已部署 1995d1c；木卫一遮掩本地待验收",
    "acceptance": "待用户逐项验收（发布不等于验收）"
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
    "release": "R05 已部署 9733805，用户验收待完成；R06 运动第一课本地未发布",
    "acceptance": "待用户逐项验收（发布不等于验收）"
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
    "release": "R05 已部署 9733805，用户验收待完成；R06 运动第一课本地未发布",
    "acceptance": "待用户逐项验收（发布不等于验收）"
  },
  {
    "id": "E20",
    "title": "星际访客",
    "status": "已接入历史案例 / 待验收",
    "current": "2I/Borisov：2019—2020 独立历史轨迹与参数",
    "target": "一例通过来源、轨道质量和有效时间检查的代表；与长期束缚成员区分",
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
    "release": "R05 已部署 9733805，用户验收待完成；R06 运动第一课本地未发布",
    "acceptance": "待用户逐项验收（发布不等于验收）"
  }
];
