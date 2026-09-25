# 太阳系 20 类内容覆盖 · 当前台账

当前规划版本 2026.09.25-r09.7；能力基线 r09.3 已上线。本轮继续 C02 核对与入口修复，没有新增天体。用户总验收未完成。

| 编号 | 内容 | 当前层级 | 待核对与边界 |
| --- | --- | --- | --- |
| E01 | 太阳本体与活动 | 已上线 · 代表体验 | 复验太阳各层、活动与粒子示意的区别；当日太阳活动和差异自转属于明确未实现的深化能力。 |
| E02 | 八大行星与外观 | 已上线 · 代表体验 | 复验尺度、昼夜、自转说明和贴图恢复；实时天气、精细地形和完整姿态不计作已实现。 |
| E03 | 天然卫星与家族 | 已上线 · 代表体验 | 复验父子关系、母星附近的局部尺度和日期一致性；不是全部天然卫星名录。 |
| E04 | 行星与小天体环 | 已上线 · 代表体验 | 复验四大巨行星代表环和女凯龙星双环的比例、开关与来源；完整暗淡外延和真实厚度仍为已知限制。 |
| E05 | 矮行星 | 已上线 · 代表体验 | 复验五颗矮行星的定位、参数和家族往返，不重复开发既有目录。 |
| E06 | 小行星主带 | 已上线 · 代表体验 | 复验区域点云与具名成员的辨识；主带点云不承诺逐颗真实坐标。 |
| E07 | 近地小行星 | 已上线 · 代表体验 | 复验两个参照系保持同一日期；准卫星不是绕地球的天然卫星。 |
| E08 | 特洛伊群 | 已上线 · 代表体验 | 复验 L4/L5、双体与木星的关系；保留背景点群为示意的说明。 |
| E09 | 半人马族 | 已上线 · 代表体验 | 复验代表的跨区域轨道和双环示意；不要求全量半人马天体。 |
| E10 | 柯伊伯带 | 已上线 · 代表体验 | 复验经典/共振分类、侧视厚度与具名代表；区域点云为结构示意，不是观测普查。 |
| E11 | 散射盘与离散天体 | 已上线 · 代表体验 | 复验散射/脱离分类和两类代表轨道；共用区域点云尚非两个实测分布重建，不将其标为已完成。 |
| E12 | 彗星 | 已上线 · 代表体验 | 复验三颗彗星、彗尾方向与轨迹区别；活动演示不等于所选日期的实况。 |
| E13 | 奥尔特云 | 已上线 · 推断模型 | 复验日球层与奥尔特云的不同边界含义；不以虚构逐体实测补齐推断模型。 |
| E14 | 尘埃、流星体与流星 | 已上线 · 示意与解释 | 复验碎屑—流星、尘埃—黄道光、喷流—E 环六步联系；不承诺流星雨预报。 |
| E15 | 太阳风与日球层 | 已上线 · 示意与解释 | 复验五种不可见环境解释与三步边界对照；实时通量和完整数值场不在首版范围。 |
| E16 | 磁层、辐射带与极光 | 已上线 · 示意与解释 | 复验太阳—地球及木星环境联系、开关和日期/示意进度的区别。 |
| E17 | 运行关系与天象 | 已上线 · 代表体验 | 复验课程、参照对象、事件窗口与误差说明；当地预报和长期潮汐/共振动力学不在首版范围。 |
| E18 | 真实恒星背景与邻星 | 部分满足 · 背景差距 | 未关闭 F01：原 M2.1 背景星点可追溯的标准尚未覆盖主全景；需要接入或经明确确认修订范围，不能直接判完成。 |
| E19 | 银河系与邻近星系 | 已上线 · 示意与解释 | 复验太阳系—邻星—银河系—邻近星系的尺度与返回；概念模型不冒充实测星图。 |
| E20 | 星际访客 | 已上线 · 代表体验 | 复验独立历史时间窗口和返回当前观测；不把访客计作长期束缚成员。 |

## 入口、数据与证据

### E01 · 太阳本体与活动

状态：已上线 · 代表体验；待逐类用户验收。

当前：本体历表与参数；太阳分层、黑子/日珥、耀斑/CME，以及太阳—地球环境联系和光/粒子解释层。

待核对与边界：复验太阳各层、活动与粒子示意的区别；当日太阳活动和差异自转属于明确未实现的深化能力。

表示依据：历表位置 + 参考参数 + 活动示意。入口操作：选择太阳；更多工具 → 太阳活动。

已记录验证：参考姿态、来源、分层控制与跨模块显隐已有本地检查；非当日太阳活动重建。

发布：已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。

实现模块：[catalog.ts](../src/data/catalog.ts)、[SolarActivity.tsx](../src/components/SolarActivity.tsx)。

数据：horizons-2026-2027-v1；2026-01-01T00:00:00.000Z 至 2028-01-01T00:00:00.000Z；[包清单](../public/data/manifest.json)。

### E02 · 八大行星与外观

状态：已上线 · 代表体验；待逐类用户验收。

当前：八大行星历表、球体、轨道与参数；地球静态云层、大气与全景贴图失败恢复。

待核对与边界：复验尺度、昼夜、自转说明和贴图恢复；实时天气、精细地形和完整姿态不计作已实现。

表示依据：历表位置 + 静态贴图与程序大气。入口操作：点选行星；全景目录 → 地球外观。

已记录验证：参考自转、倾角参照、静态纹理与家族比例检查通过；不等于完整外观实测重建。

发布：已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。

实现模块：[MacroPrimaryPanel.tsx](../src/components/MacroPrimaryPanel.tsx)、[macroEarth.ts](../src/components/macroEarth.ts)。

数据：horizons-2026-2027-v1；2026-01-01T00:00:00.000Z 至 2028-01-01T00:00:00.000Z；[包清单](../public/data/manifest.json)。

### E03 · 天然卫星与家族

状态：已上线 · 代表体验；待逐类用户验收。

当前：27 颗选定卫星/伴星；行星家族、冥王星五卫星、阋神星系统、双小行星及土卫二喷流/剖面。

待核对与边界：复验父子关系、母星附近的局部尺度和日期一致性；不是全部天然卫星名录。

表示依据：卫星历表 + 局部显示缩放。入口操作：阅读天然卫星；全景现象 → 定位家族。

已记录验证：六个家族、冥王星、阋神星、双小行星的近景、大小/距离边界与历史恢复已复验；待用户整批验收。

发布：已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。

实现模块：[satellites.ts](../src/data/satellites.ts)、[MacroFamilyPanel.tsx](../src/components/MacroFamilyPanel.tsx)、[MacroBinaryPanel.tsx](../src/components/MacroBinaryPanel.tsx)。

数据：horizons-2026-2027-v1；2026-01-01T00:00:00.000Z 至 2028-01-01T00:00:00.000Z；[包清单](../public/data/manifest.json)。

数据：naif-satellites-2026-2027-v3-saturn；2026-01-01T00:00:00.000Z 至 2028-01-01T00:00:00.000Z；[包清单](../public/data/satellites/manifest.json)。

数据：horizons-dwarfs-2026-2027-v1；2026-01-01T00:00:00Z 至 2028-01-01T00:00:00Z；[包清单](../public/data/dwarfs/manifest.json)。

数据：horizons-pluto-small-moons-2026-2027-v1；2026-01-01T00:00:00Z 至 2028-01-01T00:00:00Z；[包清单](../public/data/pluto-moons/manifest.json)。

数据：horizons-eris-dysnomia-2026-2027-v1；2026-01-01T00:00:00Z 至 2028-01-01T00:00:00Z；[包清单](../public/data/eris-system/manifest.json)。

数据：horizons-patroclus-menoetius-2026-2027-v1；2026-01-01T00:00:00Z 至 2028-01-01T00:00:00Z；[包清单](../public/data/patroclus-system/manifest.json)。

### E04 · 行星与小天体环

状态：已上线 · 代表体验；待逐类用户验收。

当前：四大巨行星代表环系 + 女凯龙星双环参考示意

待核对与边界：复验四大巨行星代表环和女凯龙星双环的比例、开关与来源；完整暗淡外延和真实厚度仍为已知限制。

表示依据：文献参考环段 + 增强显示。入口操作：选择巨行星家族，比较环系和轨道开关。

已记录验证：参考环段来源与局部比例已复核；土星三视图统一 C/B/A 边界，几何回归和开关复验已补，用户验收待完成。

发布：已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。

实现模块：[rings.ts](../src/data/rings.ts)、[RingLearning.tsx](../src/components/RingLearning.tsx)。



### E05 · 矮行星

状态：已上线 · 代表体验；待逐类用户验收。

当前：五颗矮行星已纳入统一成员目录与全景；冥王星、阋神星可展开已接入家族。

待核对与边界：复验五颗矮行星的定位、参数和家族往返，不重复开发既有目录。

表示依据：历表位置 + 参考外观。入口操作：从矮行星成员清单定位，再展开参数。

已记录验证：R07 已核对统一成员目录、定位、参数与返回；五颗矮行星用户逐类验收仍待完成。

发布：已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。

实现模块：[regionMembers.ts](../src/data/regionMembers.ts)、[RegionMembers.tsx](../src/components/RegionMembers.tsx)。

数据：horizons-dwarfs-2026-2027-v1；2026-01-01T00:00:00Z 至 2028-01-01T00:00:00Z；[包清单](../public/data/dwarfs/manifest.json)。

数据：horizons-small-bodies-2026-2027-v3；2026-01-01T00:00:00Z 至 2028-01-01T00:00:00Z；[包清单](../public/data/small-bodies/manifest.json)。

### E06 · 小行星主带

状态：已上线 · 代表体验；待逐类用户验收。

当前：主带点云；谷神星、灶神星真实代表

待核对与边界：复验区域点云与具名成员的辨识；主带点云不承诺逐颗真实坐标。

表示依据：随机区域点云 + 具名成员历表。入口操作：侧视主带，再定位谷神星或灶神星。

已记录验证：灶神星近景切换已复验；点云不是逐体数据，无逐点精度报告。

发布：已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。

实现模块：[macroLayers.ts](../src/data/macroLayers.ts)、[macroPhenomena.ts](../src/components/macroPhenomena.ts)、[regionMembers.ts](../src/data/regionMembers.ts)。

数据：horizons-dwarfs-2026-2027-v1；2026-01-01T00:00:00Z 至 2028-01-01T00:00:00Z；[包清单](../public/data/dwarfs/manifest.json)。

数据：horizons-small-bodies-2026-2027-v3；2026-01-01T00:00:00Z 至 2028-01-01T00:00:00Z；[包清单](../public/data/small-bodies/manifest.json)。

### E07 · 近地小行星

状态：已上线 · 代表体验；待逐类用户验收。

当前：爱神星真实历表和 PDS 形状；Kamoʻoalewa 准卫星历表及日心/地心旋转参照系对照。

待核对与边界：复验两个参照系保持同一日期；准卫星不是绕地球的天然卫星。

表示依据：JPL 几何历表 + SBDB 参数快照 + PDS NEAR 形状网格；材质与补光示意。入口操作：全景目录 → 共轨与准卫星；日心/地心旋转视角切换，日期不变。爱神星原入口保留。

已记录验证：R01 小天体历表与 PDS 形状核验、R06 准卫星参照系回归已记录；形状与轨道使用不同来源。

发布：已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。

实现模块：[coorbital.ts](../src/data/coorbital.ts)、[coorbitalScene.ts](../src/components/coorbitalScene.ts)、[r01Members.ts](../src/data/r01Members.ts)、[regionMembers.ts](../src/data/regionMembers.ts)、[R01MemberParameters.tsx](../src/components/R01MemberParameters.tsx)。

数据：horizons-2026-2027-v1；2026-01-01T00:00:00.000Z 至 2028-01-01T00:00:00.000Z；[包清单](../public/data/manifest.json)。

数据：horizons-small-bodies-2026-2027-v3；2026-01-01T00:00:00Z 至 2028-01-01T00:00:00Z；[包清单](../public/data/small-bodies/manifest.json)。

数据：horizons-coorbital-2026-2027-v1；2026-01-01T00:00:00Z 至 2028-01-01T00:00:00Z；[包清单](../public/data/coorbital/manifest.json)。

### E08 · 特洛伊群

状态：已上线 · 代表体验；待逐类用户验收。

当前：阿喀琉斯 L4、埃涅阿斯 L5 及 Patroclus–Menoetius 双体历表；背景点群为示意

待核对与边界：复验 L4/L5、双体与木星的关系；保留背景点群为示意的说明。

表示依据：JPL 几何历表 + SBDB 参数快照；双体采用单独保存的系统资料；材质与补光示意，未使用爱神星的 PDS 形状模型。入口操作：半人马族与特洛伊群 → 分别定位 L4/L5，比较相对木星方位。

已记录验证：两年 3 小时独立检查点验证实际 6 小时插值；见 R01 数据报告。外观非精确形状。

发布：已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。

实现模块：[r01Members.ts](../src/data/r01Members.ts)、[PatroclusSystemPanel.tsx](../src/components/PatroclusSystemPanel.tsx)、[regionMembers.ts](../src/data/regionMembers.ts)、[R01MemberParameters.tsx](../src/components/R01MemberParameters.tsx)。

数据：horizons-2026-2027-v1；2026-01-01T00:00:00.000Z 至 2028-01-01T00:00:00.000Z；[包清单](../public/data/manifest.json)。

数据：horizons-small-bodies-2026-2027-v3；2026-01-01T00:00:00Z 至 2028-01-01T00:00:00Z；[包清单](../public/data/small-bodies/manifest.json)。

数据：horizons-patroclus-menoetius-2026-2027-v1；2026-01-01T00:00:00Z 至 2028-01-01T00:00:00Z；[包清单](../public/data/patroclus-system/manifest.json)。

### E09 · 半人马族

状态：已上线 · 代表体验；待逐类用户验收。

当前：女凯龙星真实历表、轨道与来源参数；巨行星区域点群为示意

待核对与边界：复验代表的跨区域轨道和双环示意；不要求全量半人马天体。

表示依据：JPL 几何历表 + SBDB 参数快照；双环采用 2014 年掩星发现论文的参考尺寸，环面姿态与材质示意。入口操作：半人马族与特洛伊群 → 女凯龙星；观察高度、轨道；主全景可定位并控制双环参考示意。

已记录验证：两年 3 小时独立检查点验证实际 6 小时插值；见 R01 数据报告。外观非精确形状。

发布：已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。

实现模块：[r01Members.ts](../src/data/r01Members.ts)、[regionMembers.ts](../src/data/regionMembers.ts)、[R01MemberParameters.tsx](../src/components/R01MemberParameters.tsx)。

数据：horizons-2026-2027-v1；2026-01-01T00:00:00.000Z 至 2028-01-01T00:00:00.000Z；[包清单](../public/data/manifest.json)。

数据：horizons-small-bodies-2026-2027-v3；2026-01-01T00:00:00Z 至 2028-01-01T00:00:00Z；[包清单](../public/data/small-bodies/manifest.json)。

### E10 · 柯伊伯带

状态：已上线 · 代表体验；待逐类用户验收。

当前：经典族夸奥尔、共振族冥王星等具名成员；四类轨道解释

待核对与边界：复验经典/共振分类、侧视厚度与具名代表；区域点云为结构示意，不是观测普查。

表示依据：区域点云 + 部分成员历表。入口操作：全景内容总表进入；展开四类轨道说明对照夸奥尔与冥王星。

已记录验证：R02 代表成员及分类、R07 区域路线已有检查记录；仍需本次统一用户核对。

发布：已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。

实现模块：[macroStructure.ts](../src/data/macroStructure.ts)、[regionMembers.ts](../src/data/regionMembers.ts)。

数据：horizons-dwarfs-2026-2027-v1；2026-01-01T00:00:00Z 至 2028-01-01T00:00:00Z；[包清单](../public/data/dwarfs/manifest.json)。

数据：horizons-small-bodies-2026-2027-v3；2026-01-01T00:00:00Z 至 2028-01-01T00:00:00Z；[包清单](../public/data/small-bodies/manifest.json)。

### E11 · 散射盘与离散天体

状态：已上线 · 代表体验；待逐类用户验收。

当前：脱离轨道代表塞德娜、远伸轨道阋神星及分布示意

待核对与边界：复验散射/脱离分类和两类代表轨道；共用区域点云尚非两个实测分布重建，不将其标为已完成。

表示依据：分布示意 + 塞德娜与阋神星历表。入口操作：全景内容总表定位塞德娜；查看黄道高度、日期变化及分类依据。

已记录验证：代表成员有数据验证；两类分布尚未分别实现。

发布：已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。

实现模块：[macroStructure.ts](../src/data/macroStructure.ts)、[regionMembers.ts](../src/data/regionMembers.ts)。

数据：horizons-small-bodies-2026-2027-v3；2026-01-01T00:00:00Z 至 2028-01-01T00:00:00Z；[包清单](../public/data/small-bodies/manifest.json)。

### E12 · 彗星

状态：已上线 · 代表体验；待逐类用户验收。

当前：哈雷、67P 与长周期海尔—波普三颗彗核历表、两年路径和参数

待核对与边界：复验三颗彗星、彗尾方向与轨迹区别；活动演示不等于所选日期的实况。

表示依据：历表与两年路径 + 双尾原理示意。入口操作：内容总表 → 彗星 → 海尔—波普；可切换三颗彗星。

已记录验证：数据包内有留出样本误差；活动示例不作当日状态验证。

发布：已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。

实现模块：[CometPanel.tsx](../src/components/CometPanel.tsx)、[comets.ts](../src/ephemeris/comets.ts)。

数据：horizons-comets-2026-2027-v2；2026-01-01T00:00:00Z 至 2028-01-01T00:00:00Z；[包清单](../public/data/comets/manifest.json)。

### E13 · 奥尔特云

状态：已上线 · 推断模型；待逐类用户验收。

当前：有来源的球壳点云、不确定范围及日球层/奥尔特云同屏对照

待核对与边界：复验日球层与奥尔特云的不同边界含义；不以虚构逐体实测补齐推断模型。

表示依据：依据资料的推断球壳。入口操作：全景现象 → 太阳系的边界是哪一种？ → 遥远冰质天体 / 放在同一空间。

已记录验证：三步定位、阶段依赖、历史及同一画布/日期已验证；点云仍为模型推断。

发布：已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。

实现模块：[macroStructure.ts](../src/data/macroStructure.ts)、[MacroStructure.tsx](../src/components/MacroStructure.tsx)。



### E14 · 尘埃、流星体与流星

状态：已上线 · 示意与解释；待逐类用户验收。

当前：尘埃、碎屑流、进入大气演示；主全景黄道光原理与喷流补给 E 环联系

待核对与边界：复验碎屑—流星、尘埃—黄道光、喷流—E 环六步联系；不承诺流星雨预报。

表示依据：统计区域与原理演示。入口操作：全景现象 → 物质从哪里来，会变成什么？六步定位；独立详解仍可阅读。

已记录验证：主全景六步、阶段门控、历史恢复与独立播放已本地验证；关联为原理示意，不是流星雨预报，待用户验收。

发布：已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。

实现模块：[dust.ts](../src/data/dust.ts)、[DustExplorer.tsx](../src/components/DustExplorer.tsx)。



### E15 · 太阳风与日球层

状态：已上线 · 示意与解释；待逐类用户验收。

当前：太阳风、激波、日鞘与边界；主全景来流、行星际参考场、电流片、中性原子及奥尔特云对照

待核对与边界：复验五种不可见环境解释与三步边界对照；实时通量和完整数值场不在首版范围。

表示依据：分层边界和粒子流动示意。入口操作：全景现象 → 太阳系边界对照 / 看不见的空间；独立详解继续保留。

已记录验证：五种原理图及三步边界对照已回归；没有实时边界或通量验证。

发布：已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。

实现模块：[heliosphere.ts](../src/data/heliosphere.ts)、[HeliosphereExplorer.tsx](../src/components/HeliosphereExplorer.tsx)、[environmentJourney.ts](../src/data/environmentJourney.ts)、[macroIntegrated.ts](../src/components/macroIntegrated.ts)。



### E16 · 磁层、辐射带与极光

状态：已上线 · 示意与解释；待逐类用户验收。

当前：地球环境和近地粒子区域；主全景七步串联太阳—地球联系与木星磁层、木卫一等离子体环、极光对照

待核对与边界：复验太阳—地球及木星环境联系、开关和日期/示意进度的区别。

表示依据：磁层和粒子区域原理示意。入口操作：全景现象 → 太阳与行星环境七步定位；阶段 05 控制地球/木星环境，木卫一步骤另需阶段 04。

已记录验证：机制对照、同日木卫一摆放、场景与标题、前进后退及阶段依赖已本地验证；不提供当日磁场、密度或极光预测。

发布：已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。

实现模块：[spaceEnvironment.ts](../src/data/spaceEnvironment.ts)、[nearEarth.ts](../src/data/nearEarth.ts)、[SpaceEnvironment.tsx](../src/components/SpaceEnvironment.tsx)、[environmentJourney.ts](../src/data/environmentJourney.ts)、[EnvironmentJourneyPanel.tsx](../src/components/EnvironmentJourneyPanel.tsx)、[jupiterEnvironment.ts](../src/components/jupiterEnvironment.ts)。



### E17 · 运行关系与天象

状态：已上线 · 代表体验；待逐类用户验收。

当前：14 节运动课程，含准卫星双参照系、月相/季节、锁定/共振；日食、月食与木卫一遮掩三例事件。

待核对与边界：复验课程、参照对象、事件窗口与误差说明；当地预报和长期潮汐/共振动力学不在首版范围。

表示依据：同日 JPL 状态 + NAIF 参考姿态 + NASA 机制解释。入口操作：全景目录 → 日月食与遮掩；场景清单 → 日食/月食/遮掩案例；遮掩提供可拖动三维空间与固定地球所见。保留运动课程入口。

已记录验证：遮掩计入单程光行时，掩始比 IMCCE 晚约 87 秒；日食最近影轴时刻晚 34.9 秒；月食晚 37.8 秒，食分差 -0.0212；原始历表哈希与同时间尺度比较可复算。无当地可见性、潮汐演化或长期共振求解。

发布：已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。

实现模块：[occultation.ts](../src/data/occultation.ts)、[OccultationReadout.tsx](../src/components/OccultationReadout.tsx)、[io-occultation-2026-01-12.json](../public/data/events/io-occultation-2026-01-12.json)、[solarEclipse.ts](../src/data/solarEclipse.ts)、[SolarEclipseReadout.tsx](../src/components/SolarEclipseReadout.tsx)、[solar-2026-08-12.json](../public/data/events/solar-2026-08-12.json)、[lunarEclipse.ts](../src/data/lunarEclipse.ts)、[LunarEclipseReadout.tsx](../src/components/LunarEclipseReadout.tsx)、[lunar-2026-03-03.json](../public/data/events/lunar-2026-03-03.json)、[MotionLessonPanel.tsx](../src/components/MotionLessonPanel.tsx)、[coorbitalScene.ts](../src/components/coorbitalScene.ts)、[MacroMotionPanel.tsx](../src/components/MacroMotionPanel.tsx)、[macroPlanetOrbits.ts](../src/data/macroPlanetOrbits.ts)。

数据：horizons-2026-2027-v1；2026-01-01T00:00:00.000Z 至 2028-01-01T00:00:00.000Z；[包清单](../public/data/manifest.json)。

数据：naif-satellites-2026-2027-v3-saturn；2026-01-01T00:00:00.000Z 至 2028-01-01T00:00:00.000Z；[包清单](../public/data/satellites/manifest.json)。

数据：horizons-coorbital-2026-2027-v1；2026-01-01T00:00:00Z 至 2028-01-01T00:00:00Z；[包清单](../public/data/coorbital/manifest.json)。

### E18 · 真实恒星背景与邻星

状态：部分满足 · 背景差距；待逐类用户验收。

当前：独立恒星视图已接入 2,936 个亮星方向、32 个邻星距离样本及点选资料；太阳系主全景仍用装饰背景星点。

待核对与边界：未关闭 F01：原 M2.1 背景星点可追溯的标准尚未覆盖主全景；需要接入或经明确确认修订范围，不能直接判完成。

表示依据：Hipparcos 固定历元星表与筛选距离样本；主全景星点另为装饰。入口操作：恒星系统与其他星系 → 邻近恒星；切换天空方向/空间距离并点选资料。全景背景差距见 F01。

已记录验证：5 星 Hipparcos 原版/新版交叉核对及星表质量筛选检查通过；同一观测任务，不是独立望远镜认证，也不是今晚地面星图。

发布：已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。

实现模块：[starCatalogue.ts](../src/data/starCatalogue.ts)、[StellarCataloguePanel.tsx](../src/components/StellarCataloguePanel.tsx)、[stellarScene.ts](../src/components/stellarScene.ts)。



### E19 · 银河系与邻近星系

状态：已上线 · 示意与解释；待逐类用户验收。

当前：银河系与邻近星系概念图、距离/尺度说明及第六条专题路线已上线。

待核对与边界：复验太阳系—邻星—银河系—邻近星系的尺度与返回；概念模型不冒充实测星图。

表示依据：概略结构和尺度资料。入口操作：从银河系切换银河系之外，比较尺度说明。

已记录验证：R08 第六路线及 R09 六路线 27 步、跨尺度历史返回检查已有记录；用户验收待完成。

发布：已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。

实现模块：[CosmicCanvas.tsx](../src/components/CosmicCanvas.tsx)、[cosmicContext.ts](../src/data/cosmicContext.ts)。



### E20 · 星际访客

状态：已上线 · 代表体验；待逐类用户验收。

当前：2I/Borisov：2019—2020 独立历史轨迹与参数

待核对与边界：复验独立历史时间窗口和返回当前观测；不把访客计作长期束缚成员。

表示依据：历史 JPL 几何历表；不计入当前数量。入口操作：内容总表 → 星际访客直接进入；彗星面板也提供历史窗口。

已记录验证：原始数据与分包哈希、独立检查点插值及历史窗口进出检查；不代表绝对轨道精度。

发布：已纳入 r09.3 及之前的远端交付；最新规划版本见页面顶部。发布不等于用户验收。

实现模块：[HistoricalVisitor.tsx](../src/components/HistoricalVisitor.tsx)、[borisov.ts](../src/ephemeris/borisov.ts)、[manifest.json](../public/data/borisov/manifest.json)。



完整验收动作、报告及未关闭事项见 [25 项核对表](FIRST-RELEASE-CLOSEOUT.md)。[旧版覆盖台账归档](history/CONTENT-COVERAGE-before-closeout.md) 保留历史状态，不作为当前进度。
