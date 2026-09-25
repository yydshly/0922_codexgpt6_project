# 太阳系认知版 · 首版收尾与 25 项核对表

当前规划版本 2026.09.26-r09.12；能力基线 r09.3 已上线。本版范围冻结，性能检查与最终回归已通过，剩实际体验与用户确认；详见 FINAL-TECHNICAL-REPORT.md；太阳系动态天体数量未变。用户总验收未完成。

## 本版固定的三步收尾

### 1 · 性能检查

状态：参考环境与线上测量通过。固定设备、窗口及网络条件；只修打不开、卡死、影响正常使用的问题。

### 2 · 最终回归

状态：七组回归 / 183 个检查点通过。全景、区域、天体、说明与返回；日期、运动和按钮对应。

### 3 · 用户验收并冻结

状态：待用户确认。按固定清单核对实际屏幕体验；确认后冻结认知版。美化、新天体、新玩法和精度提升另列后续。

仅影响正常使用或造成错误理解的问题阻止交付；美化、新天体、新玩法与精度提升留给后续，不再扩展本版。

## 既有五步台账与证据

### C01 · 统一当前进度

状态：整理完成。

规划、覆盖清单、版本与发布状态一致；用户验收不自动勾选。

### C02 · 核对内容完整性

状态：25 项代表操作已复验。

E01–E20 与 S01–S05 代表操作及最终日期、镜头、窗口回归通过；科学与功能边界保持原报告，不等同用户验收。

### C03 · 关闭首版缺口

状态：已发现的本版阻断项已关闭。

主全景星表及贴图请求占用问题已修复；固定范围的集中检查通过，仅关键反馈问题阻止交付。

### C04 · 完成性能验收

状态：参考环境与线上通过，实机待用户确认。

参考设备、分辨率和网络标准已冻结；加载及 60 次切换通过，实际屏幕呈现列入最终用户验收。

### C05 · 正式验收交付

状态：待用户验收。

提供固定验收路线和已知限制，处理反馈；用户明确确认后才称认知版完成。

第 1 步完成整理；第 2 步已建立 20 类主题 + 5 项必补的代码/证据核对表，E01–E20 与 S01–S05 已完成入口及代表操作检查，固定七组最终回归亦通过；技术证据已补齐，实际呈现与用户批准列入最后一步。这不是五次提交或完成百分比，也不是所有星体都已收录。

完成条件：约定主要构成和代表体验达到标准，科学与体验证据齐备，关键问题关闭并由用户明确验收。新发现归入既有步骤；范围变更须说明原因并确认，不静默取消原标准。

## 最后验收中的 2 项待确认

包含实现差距、工程验收、实际体验和用户验收，不等同若干个代码错误；后续逐类画面复验仍可能发现问题。

### F03 · 实际设备的呈现与长时间操作未验收

实际体验待验收 · M6.2 · 未关闭

当前：参考浏览器 60 次切换通过，同类场景节点与监听稳定；实际屏幕流畅度列入最后五步用户验收，不再开新一轮优化。

关闭标准：在约定实际设备上检查流畅度、连续使用、交互与资源趋势，记录结果和修复；未测量不判通过。

依据：[FINAL-TECHNICAL-REPORT.md](../docs/FINAL-TECHNICAL-REPORT.md)、[FINAL-ACCEPTANCE.md](../docs/FINAL-ACCEPTANCE.md)、[VIEWPORT-ACCEPTANCE.md](../docs/VIEWPORT-ACCEPTANCE.md)。

### F04 · 用户总验收未完成

用户验收待完成 · M6.3 · 未关闭

当前：代码、数据和报告已交付，发布与自动检查不等于用户验收。

关闭标准：按固定路线核对画面、解释与操作，处理首版阻断项，取得明确验收确认。

依据：[FINAL-ACCEPTANCE.md](../docs/FINAL-ACCEPTANCE.md)、[FINAL-TECHNICAL-REPORT.md](../docs/FINAL-TECHNICAL-REPORT.md)。

## 已完成的技术收尾

### F02 · 固定资源预算与加载恢复验证

工程收尾通过；实际体验待用户确认。10 Mbps 条件下冷暖加载与常用工具达到预设预算；主脚本 gzip 约 501 KB，60 次切换及 183 个路径检查点通过。贴图改为两张并发及可取消下载；本版保持现有画质，不追加档位。不是全网络或实际屏幕帧率保证。

依据：[FINAL-TECHNICAL-REPORT.md](../docs/FINAL-TECHNICAL-REPORT.md)、[closeout-budgets.json](../public/data/validation/closeout-budgets.json)、[closeout-loading-online-fixed.json](../public/data/validation/closeout-loading-online-fixed.json)、[closeout-performance.json](../public/data/validation/closeout-performance.json)、[final-regression.json](../public/data/validation/final-regression.json)。

### F01 · 主全景背景接入可追溯星表

实现差距已关闭；用户验收待确认。主全景采用 2,936 个 Hipparcos-2 固定星表方向，可点选 HIP 编号并关联恒星视图；黄赤坐标转换、同历元样本、显隐与失败重试已验证。不是当前日期实况夜空。

依据：[F01-PANORAMA-STARS.md](../docs/F01-PANORAMA-STARS.md)、[panorama-validation.json](../public/data/stars/panorama-validation.json)。

## 25 项核对表

已核对源码入口和既有报告，不将原报告检查冒充本轮重新计算或用户视觉验收。网页入口：更多工具 → 整体规划 → 收尾进度；每项可进入元素覆盖，再打开现有观察入口。

### E01 · 太阳本体与活动

当前：本体历表与参数；太阳分层、黑子/日珥、耀斑/CME，以及太阳—地球环境联系和光/粒子解释层。

核对层级：已复验入口、代表画面与基本交互；完整子项、异常场景和用户验收仍待完成（C02 第一组）。用户验收：待确认。

操作：选择太阳；更多工具 → 太阳活动。 核对：复验太阳各层、活动与粒子示意的区别；当日太阳活动和差异自转属于明确未实现的深化能力。

已有证据：[R04-APPEARANCE.md](../docs/R04-APPEARANCE.md)、[R05-ENVIRONMENT-LINKS.md](../docs/R05-ENVIRONMENT-LINKS.md)、[C02-CORE-COVERAGE-AUDIT.md](../docs/C02-CORE-COVERAGE-AUDIT.md)。

### E02 · 八大行星与外观

当前：八大行星历表、球体、轨道与参数；地球静态云层、大气与全景贴图失败恢复。

核对层级：已复验入口、代表画面与基本交互；完整子项、异常场景和用户验收仍待完成（C02 第一组）。用户验收：待确认。

操作：点选行星；全景目录 → 地球外观。 核对：复验尺度、昼夜、自转说明和贴图恢复；实时天气、精细地形和完整姿态不计作已实现。

已有证据：[R04-APPEARANCE.md](../docs/R04-APPEARANCE.md)、[TEXTURE-LOADING.md](../docs/TEXTURE-LOADING.md)、[C02-CORE-COVERAGE-AUDIT.md](../docs/C02-CORE-COVERAGE-AUDIT.md)。

### E03 · 天然卫星与家族

当前：27 颗选定卫星/伴星；行星家族、冥王星五卫星、阋神星系统、双小行星及土卫二喷流/剖面。

核对层级：已复验入口、代表画面与基本交互；完整子项、异常场景和用户验收仍待完成（C02 第一组）。用户验收：待确认。

操作：阅读天然卫星；全景现象 → 定位家族。 核对：复验父子关系、母星附近的局部尺度和日期一致性；不是全部天然卫星名录。

已有证据：[R03-SYSTEMS-AND-RINGS.md](../docs/R03-SYSTEMS-AND-RINGS.md)、[TOPIC-FAMILY-ACCEPTANCE.md](../docs/TOPIC-FAMILY-ACCEPTANCE.md)、[C02-CORE-COVERAGE-AUDIT.md](../docs/C02-CORE-COVERAGE-AUDIT.md)。

### E04 · 行星与小天体环

当前：四大巨行星代表环系 + 女凯龙星双环参考示意

核对层级：已复验入口、代表画面与基本交互；完整子项、异常场景和用户验收仍待完成（C02 第一组）。用户验收：待确认。

操作：选择巨行星家族，比较环系和轨道开关。 核对：复验四大巨行星代表环和女凯龙星双环的比例、开关与来源；完整暗淡外延和真实厚度仍为已知限制。

已有证据：[R03-SYSTEMS-AND-RINGS.md](../docs/R03-SYSTEMS-AND-RINGS.md)、[C02-CORE-COVERAGE-AUDIT.md](../docs/C02-CORE-COVERAGE-AUDIT.md)。

### E05 · 矮行星

当前：五颗矮行星已纳入统一成员目录与全景；冥王星、阋神星可展开已接入家族。

核对层级：已复验入口、代表画面与基本交互；完整子项、异常场景和用户验收仍待完成（C02 第一组）。用户验收：待确认。

操作：从矮行星成员清单定位，再展开参数。 核对：复验五颗矮行星的定位、参数和家族往返，不重复开发既有目录。

已有证据：[R07-TOPIC-ROUTES.md](../docs/R07-TOPIC-ROUTES.md)、[C02-CORE-COVERAGE-AUDIT.md](../docs/C02-CORE-COVERAGE-AUDIT.md)。

### E06 · 小行星主带

当前：主带点云；谷神星、灶神星真实代表

核对层级：已复验入口、代表画面与基本交互；完整子项、异常场景和用户验收仍待完成（C02 第一组）。用户验收：待确认。

操作：侧视主带，再定位谷神星或灶神星。 核对：复验区域点云与具名成员的辨识；主带点云不承诺逐颗真实坐标。

已有证据：[R01-SMALL-BODIES.md](../docs/R01-SMALL-BODIES.md)、[R07-TOPIC-ROUTES.md](../docs/R07-TOPIC-ROUTES.md)、[C02-CORE-COVERAGE-AUDIT.md](../docs/C02-CORE-COVERAGE-AUDIT.md)。

### E07 · 近地小行星

当前：爱神星真实历表和 PDS 形状；Kamoʻoalewa 准卫星历表及日心/地心旋转参照系对照。

核对层级：本轮复验爱神星入口与形状对照；共轨/准卫星参照系等完整子项及用户验收待继续（C02 第二组）。用户验收：待确认。

操作：全景目录 → 共轨与准卫星；日心/地心旋转视角切换，日期不变。爱神星原入口保留。 核对：复验两个参照系保持同一日期；准卫星不是绕地球的天然卫星。

已有证据：[C02-OUTER-COVERAGE-AUDIT.md](../docs/C02-OUTER-COVERAGE-AUDIT.md)、[R01-SMALL-BODIES.md](../docs/R01-SMALL-BODIES.md)、[R06-MOTION-AND-EVENTS.md](../docs/R06-MOTION-AND-EVENTS.md)。

### E08 · 特洛伊群

当前：阿喀琉斯 L4、埃涅阿斯 L5 及 Patroclus–Menoetius 双体历表；背景点群为示意

核对层级：本轮复验 L4/L5 入口、参数与切换；双体和共振等完整子项及用户验收待继续（C02 第二组）。用户验收：待确认。

操作：半人马族与特洛伊群 → 分别定位 L4/L5，比较相对木星方位。 核对：复验 L4/L5、双体与木星的关系；保留背景点群为示意的说明。

已有证据：[C02-OUTER-COVERAGE-AUDIT.md](../docs/C02-OUTER-COVERAGE-AUDIT.md)、[R01-SMALL-BODIES.md](../docs/R01-SMALL-BODIES.md)、[R03-SYSTEMS-AND-RINGS.md](../docs/R03-SYSTEMS-AND-RINGS.md)。

### E09 · 半人马族

当前：女凯龙星真实历表、轨道与来源参数；巨行星区域点群为示意

核对层级：本轮复验女凯龙星入口与双环显隐；完整轨道、异常场景及用户验收待继续（C02 第二组）。用户验收：待确认。

操作：半人马族与特洛伊群 → 女凯龙星；观察高度、轨道；主全景可定位并控制双环参考示意。 核对：复验代表的跨区域轨道和双环示意；不要求全量半人马天体。

已有证据：[C02-OUTER-COVERAGE-AUDIT.md](../docs/C02-OUTER-COVERAGE-AUDIT.md)、[R01-SMALL-BODIES.md](../docs/R01-SMALL-BODIES.md)、[R03-SYSTEMS-AND-RINGS.md](../docs/R03-SYSTEMS-AND-RINGS.md)。

### E10 · 柯伊伯带

当前：经典族夸奥尔、共振族冥王星等具名成员；四类轨道解释

核对层级：本轮复验夸奥尔入口与尺寸边界说明；四类轨道、区域侧视及用户验收待继续（C02 第二组）。用户验收：待确认。

操作：全景内容总表进入；展开四类轨道说明对照夸奥尔与冥王星。 核对：复验经典/共振分类、侧视厚度与具名代表；区域点云为结构示意，不是观测普查。

已有证据：[C02-OUTER-COVERAGE-AUDIT.md](../docs/C02-OUTER-COVERAGE-AUDIT.md)、[R02-OUTER-VISITORS.md](../docs/R02-OUTER-VISITORS.md)、[R07-TOPIC-ROUTES.md](../docs/R07-TOPIC-ROUTES.md)。

### E11 · 散射盘与离散天体

当前：脱离轨道代表塞德娜、远伸轨道阋神星及分布示意

核对层级：本轮复验塞德娜入口与分类边界说明；两类代表轨道、完整日期及用户验收待继续（C02 第二组）。用户验收：待确认。

操作：全景内容总表定位塞德娜；查看黄道高度、日期变化及分类依据。 核对：复验散射/脱离分类和两类代表轨道；共用区域点云尚非两个实测分布重建，不将其标为已完成。

已有证据：[C02-OUTER-COVERAGE-AUDIT.md](../docs/C02-OUTER-COVERAGE-AUDIT.md)、[R02-OUTER-VISITORS.md](../docs/R02-OUTER-VISITORS.md)。

### E12 · 彗星

当前：哈雷、67P 与长周期海尔—波普三颗彗核历表、两年路径和参数

核对层级：本轮复验三颗彗星切换、日期参数联动和控件独立性；轨迹逐项画面、活动与用户验收待继续（C02 第二组）。用户验收：待确认。

操作：内容总表 → 彗星 → 海尔—波普；可切换三颗彗星。 核对：复验三颗彗星、彗尾方向与轨迹区别；活动演示不等于所选日期的实况。

已有证据：[C02-OUTER-COVERAGE-AUDIT.md](../docs/C02-OUTER-COVERAGE-AUDIT.md)、[R02-OUTER-VISITORS.md](../docs/R02-OUTER-VISITORS.md)、[R05-ENVIRONMENT-LINKS.md](../docs/R05-ENVIRONMENT-LINKS.md)。

### E13 · 奥尔特云

当前：有来源的球壳点云、不确定范围及日球层/奥尔特云同屏对照

核对层级：本轮复验奥尔特云入口、三步边界对照与阶段关闭后的基础说明；完整角度和用户验收待继续（C02 第三组）。用户验收：待确认。

操作：全景现象 → 太阳系的边界是哪一种？ → 遥远冰质天体 / 放在同一空间。 核对：复验日球层与奥尔特云的不同边界含义；不以虚构逐体实测补齐推断模型。

已有证据：[C02-ENVIRONMENT-COVERAGE-AUDIT.md](../docs/C02-ENVIRONMENT-COVERAGE-AUDIT.md)、[R05-ENVIRONMENT-LINKS.md](../docs/R05-ENVIRONMENT-LINKS.md)。

### E14 · 尘埃、流星体与流星

当前：尘埃、碎屑流、进入大气演示；主全景黄道光原理与喷流补给 E 环联系

核对层级：本轮复验碎屑入口、六步选中状态与流星演示独立时间；完整画面和异常场景待继续（C02 第三组）。用户验收：待确认。

操作：全景现象 → 物质从哪里来，会变成什么？六步定位；独立详解仍可阅读。 核对：复验碎屑—流星、尘埃—黄道光、喷流—E 环六步联系；不承诺流星雨预报。

已有证据：[C02-ENVIRONMENT-COVERAGE-AUDIT.md](../docs/C02-ENVIRONMENT-COVERAGE-AUDIT.md)、[R05-ENVIRONMENT-LINKS.md](../docs/R05-ENVIRONMENT-LINKS.md)。

### E15 · 太阳风与日球层

当前：太阳风、激波、日鞘与边界；主全景来流、行星际参考场、电流片、中性原子及奥尔特云对照

核对层级：本轮复验日球层入口、五类空间解释切换与代表画面；完整流动和用户验收待继续（C02 第三组）。用户验收：待确认。

操作：全景现象 → 太阳系边界对照 / 看不见的空间；独立详解继续保留。 核对：复验五种不可见环境解释与三步边界对照；实时通量和完整数值场不在首版范围。

已有证据：[C02-ENVIRONMENT-COVERAGE-AUDIT.md](../docs/C02-ENVIRONMENT-COVERAGE-AUDIT.md)、[R05-ENVIRONMENT-LINKS.md](../docs/R05-ENVIRONMENT-LINKS.md)。

### E16 · 磁层、辐射带与极光

当前：地球环境和近地粒子区域；主全景七步串联太阳—地球联系与木星磁层、木卫一等离子体环、极光对照

核对层级：本轮复验磁层入口、七步选中状态与手动开关取消高亮；辐射带完整子项及用户验收待继续（C02 第三组）。用户验收：待确认。

操作：全景现象 → 太阳与行星环境七步定位；阶段 05 控制地球/木星环境，木卫一步骤另需阶段 04。 核对：复验太阳—地球及木星环境联系、开关和日期/示意进度的区别。

已有证据：[C02-ENVIRONMENT-COVERAGE-AUDIT.md](../docs/C02-ENVIRONMENT-COVERAGE-AUDIT.md)、[R05-ENVIRONMENT-LINKS.md](../docs/R05-ENVIRONMENT-LINKS.md)。

### E17 · 运行关系与天象

当前：14 节运动课程，含准卫星双参照系、月相/季节、锁定/共振；日食、月食与木卫一遮掩三例事件。

核对层级：本轮复验课程目录、地球自转播放与重置；其余课程、三类事件与精度复算待继续（C02 第四组）。用户验收：待确认。

操作：全景目录 → 日月食与遮掩；场景清单 → 日食/月食/遮掩案例；遮掩提供可拖动三维空间与固定地球所见。保留运动课程入口。 核对：复验课程、参照对象、事件窗口与误差说明；当地预报和长期潮汐/共振动力学不在首版范围。

已有证据：[C02-CONTEXT-COVERAGE-AUDIT.md](../docs/C02-CONTEXT-COVERAGE-AUDIT.md)、[PHENOMENA-AUDIT.md](../docs/PHENOMENA-AUDIT.md)、[EVENT-ACCEPTANCE.md](../docs/EVENT-ACCEPTANCE.md)。

### E18 · 真实恒星背景与邻星

当前：独立恒星视图提供 2,936 个亮星方向及 32 个邻星距离样本；主全景复用亮星方向并支持 HIP 点选，固定于 J1991.25。

核对层级：独立视图代表操作已复验；主全景新增 2,936 星方向、点选、坐标交叉检查与失败重试验证（F01），用户验收待完成。用户验收：待确认。

操作：恒星系统与其他星系 → 邻近恒星；切换天空方向/空间距离并点选资料。主全景点选星点查询 HIP 编号，对照独立恒星视图；F01 技术差距已修复，固定历元与无距离背景边界保持说明。

已有证据：[F01-PANORAMA-STARS.md](../docs/F01-PANORAMA-STARS.md)、[C02-CONTEXT-COVERAGE-AUDIT.md](../docs/C02-CONTEXT-COVERAGE-AUDIT.md)、[R08-STELLAR-CONTEXT.md](../docs/R08-STELLAR-CONTEXT.md)、[R09-VALIDATION.md](../docs/R09-VALIDATION.md)。

### E19 · 银河系与邻近星系

当前：银河系与邻近星系概念图、距离/尺度说明及第六条专题路线已上线。

核对层级：本轮复验银河系/邻近星系切换、模型说明与返回太阳系；完整镜头与用户验收待继续（C02 第四组）。用户验收：待确认。

操作：从银河系切换银河系之外，比较尺度说明。 核对：复验太阳系—邻星—银河系—邻近星系的尺度与返回；概念模型不冒充实测星图。

已有证据：[C02-CONTEXT-COVERAGE-AUDIT.md](../docs/C02-CONTEXT-COVERAGE-AUDIT.md)、[R08-STELLAR-CONTEXT.md](../docs/R08-STELLAR-CONTEXT.md)。

### E20 · 星际访客

当前：2I/Borisov：2019—2020 独立历史轨迹与参数

核对层级：本轮复验历史入口、播放/暂停、侧视、日期重置与返回保留主页日期；全时段精度及异常加载待继续（C02 第四组）。用户验收：待确认。

操作：内容总表 → 星际访客直接进入；彗星面板也提供历史窗口。 核对：复验独立历史时间窗口和返回当前观测；不把访客计作长期束缚成员。

已有证据：[C02-CONTEXT-COVERAGE-AUDIT.md](../docs/C02-CONTEXT-COVERAGE-AUDIT.md)、[R02-OUTER-VISITORS.md](../docs/R02-OUTER-VISITORS.md)。

### S01 · 小天体形状与多体系统

当前：爱神星 PDS 形状、Patroclus–Menoetius 双体已上线；待用户验收

核对层级：本轮复验形状/球形/网格、双体选取与显隐、前后 6 小时；全窗口精度和异常组合待继续（C02 第五组）。用户验收：待确认。

操作：全景定位爱神星，切换形状/球形；再定位 Patroclus 双体并查看来源。

已有证据：[C02-SUPPLEMENT-COVERAGE-AUDIT.md](../docs/C02-SUPPLEMENT-COVERAGE-AUDIT.md)、[R03-SYSTEMS-AND-RINGS.md](../docs/R03-SYSTEMS-AND-RINGS.md)、[R04-APPEARANCE.md](../docs/R04-APPEARANCE.md)。

### S02 · 共轨与远缘群体分类

当前：Kamoʻoalewa 双参照系与远缘群体分类已上线；待用户验收

核对层级：本轮复验准卫星两种参照系日期一致、三颗远缘代表分类入口；群体轨道与长期共振不由近景验收替代（C02 第五组）。用户验收：待确认。

操作：在准卫星两种参照系之间切换；再比较冥王星、夸奥尔、塞德娜的分类与轨道。

已有证据：[C02-SUPPLEMENT-COVERAGE-AUDIT.md](../docs/C02-SUPPLEMENT-COVERAGE-AUDIT.md)、[R02-OUTER-VISITORS.md](../docs/R02-OUTER-VISITORS.md)、[R06-MOTION-AND-EVENTS.md](../docs/R06-MOTION-AND-EVENTS.md)。

### S03 · 太阳分层与活动类型

当前：太阳分层与活动区别、太阳—地球环境联系已上线；待用户验收

核对层级：本轮复验五步分层与 CME 开关，修正离开太阳后仍高亮；全活动组合及用户验收待继续（C02 第五组）。用户验收：待确认。

操作：太阳分层、黑子/日珥、耀斑/CME 分别控制并查看说明。

已有证据：[C02-SUPPLEMENT-COVERAGE-AUDIT.md](../docs/C02-SUPPLEMENT-COVERAGE-AUDIT.md)、[R04-APPEARANCE.md](../docs/R04-APPEARANCE.md)、[R05-ENVIRONMENT-LINKS.md](../docs/R05-ENVIRONMENT-LINKS.md)。

### S04 · 表面活动与内部结构

当前：土卫二喷流、内部剖示与 E 环补给联系示意已上线；未求解环粒子动力学，待用户验收

核对层级：本轮复验喷流、内部层、空层回退、返回母星与 E 环；修正保存设置冒充当前观察，用户验收待完成（C02 第五组）。用户验收：待确认。

操作：定位土卫二，依次查看喷流、剖面和 E 环补给联系；区分观测与推断。

已有证据：[C02-SUPPLEMENT-COVERAGE-AUDIT.md](../docs/C02-SUPPLEMENT-COVERAGE-AUDIT.md)、[R04-APPEARANCE.md](../docs/R04-APPEARANCE.md)、[R05-ENVIRONMENT-LINKS.md](../docs/R05-ENVIRONMENT-LINKS.md)。

### S05 · 不可见的场与粒子环境

当前：行星际磁场、电流片、光、带电粒子、中性原子五类解释层已上线；待用户验收

核对层级：本轮复验五种解释逐项定位、标题高亮、返回与日期保留；异常组合与用户验收待完成（C02 第五组）。用户验收：待确认。

操作：分别打开磁场、电流片、光、带电粒子、中性原子；核对图形、开关与解释一致。

已有证据：[C02-SUPPLEMENT-COVERAGE-AUDIT.md](../docs/C02-SUPPLEMENT-COVERAGE-AUDIT.md)、[R05-ENVIRONMENT-LINKS.md](../docs/R05-ENVIRONMENT-LINKS.md)。

## 明确后置

- S06 人类探索与人造实体：接入待定；遵循此前待定决定，不加入自然太阳系认知版完成门槛。
- S07 太阳系形成与演化：知识总图 / 深化延期；历史演化动画、数值重建及完整形成模型延期。
- S08 更广泛宇宙专题：后续分支；专题观察和演化模型独立立项。

全部已知成员、精细地形、实时天气、完整姿态、空间天气预报、飞船/碰撞/仙侠等未实现能力，不因本次整理变为已完成。F01 原标准差距已修复，保留关闭依据；用户总验收仍待完成。
