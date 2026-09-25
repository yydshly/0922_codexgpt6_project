# C02 第二组：小天体与彗星代表入口复验

版本：2026.09.25-r09.6。日期：2026-09-25。

## 检查范围与方法

本轮从“更多工具 → 整体规划 → 元素覆盖”进入 E07–E12，检查六个代表入口、说明对应、日期保留和返回规划；另检查形状对照、L4/L5 成员、双环开关和彗星日期联动。使用本地生产构建和独立 Chrome 无头浏览器，截图视口 1578 × 902、DPR 1。测试观察日期暂停在北京时间 2026-09-25 22:31:20。

脚本：`node scripts/qa/coverage-outer.mjs`（已有 Chrome 调试端口 9224，页面 http://127.0.0.1:4180/；可用 CDP_PORT 改端口）。脚本通过公开 DOM 触发控件并断言，截图由人工视觉检查；不能替代真实鼠标、触摸、辅助技术和实际设备验收。浏览器未记录未捕获脚本异常。本轮不重新计算历表插值精度，也不验证全部时段或所有子项。自动测试 79 个文件、328 项通过；构建检查包含四份规划文档同步验证。

## 已修复

- 中等：E12 已定位海尔—波普，但说明停在专题路线顶部，用户看不到当前参数。现进入后滚动到“让彗星随日期运行”，并将键盘焦点移入说明。
- 轻微：E07–E11 的参数已滚入视区，但焦点留在“更多工具”。现六类入口均将焦点交给对应说明，避免画面和键盘阅读位置分离。
- 中等：覆盖表 E08、E09 复制了爱神星专属 PDS NEAR 形状来源。现分别说明 JPL/SBDB 与独立双体资料、2014 年双环参考资料，不将爱神星形状归给其他小天体。

![修复前：彗星画面与右侧专题路线不对应](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-outer-2026-09-25/c02-outer-E12-before.png)

## 1. E07 · 近地小行星

状态：入口和代表交互通过。

本轮证据：爱神星场景、名称、参数和地心距离对应；同体积球开关确实把不规则形状换为球，且球模式禁用形状网格。暂停日期未改变。

保留边界：未重测旋转极轴与所有日期的姿态；材质、补光仍为示意。形状体积半径与 SBDB 参数半径来自不同估计。

![E07 代表画面与说明](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-outer-2026-09-25/c02-outer-E07-after.png)

## 2. E08 · 特洛伊群

状态：入口和成员切换通过。

本轮证据：阿喀琉斯 L4 与埃涅阿斯 L5 均可定位，参数卡参照木星，标题和场景标签同步。

保留边界：未在本轮复验 Patroclus–Menoetius 全部双体子项或共振数值；当日方位角不等于固定 ±60°。

![E08 代表画面与说明](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-outer-2026-09-25/c02-outer-E08-after.png)

## 3. E09 · 半人马族

状态：入口和双环显隐通过。

本轮证据：女凯龙星定位正确；双环关闭后画面只剩本体，控件状态对应。恢复两环后继续使用。

保留边界：环粒子运动与当日环面姿态未模拟；2014 年参考模型并不宣称最新完整环系。

![E09 代表画面与说明](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-outer-2026-09-25/c02-outer-E09-after.png)

## 4. E10 · 柯伊伯带

状态：代表入口通过，形态边界保留。

本轮证据：夸奥尔定位、日心距离、速度与黄道高度说明对应；卡片明确未纳入统一审核尺寸。

保留边界：球体仍是位置标记，不能比较真实大小；本轮未复验所有柯伊伯带分类跳转。

![E10 代表画面与说明](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-outer-2026-09-25/c02-outer-E10-after.png)

## 5. E11 · 散射盘与脱离轨道

状态：代表入口通过，分类边界保留。

本轮证据：塞德娜定位与当前参数对应，介绍明确作为脱离轨道代表；不将它直接认定为已证实的奥尔特云成员。

保留边界：不是散射盘全部成员验证；本体尺寸与形态仍为标记，分类依据沿用既有资料。

![E11 代表画面与说明](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-outer-2026-09-25/c02-outer-E11-after.png)

## 6. E12 · 彗星

状态：入口、切换和时间联动通过。

本轮证据：右侧现直接显示彗星说明；哈雷、67P、海尔—波普切换均更新当前对象。后 30 天改变主页日期和参数，前 30 天可精确恢复；三种轨迹/方向开关各自切换不互相覆盖。

保留边界：开关独立性由 DOM 验证，未对三种线条逐像素比较；彗核是放大标记，固定近太阳的彗尾原理示例不代表当日活动。

![E12 代表画面与说明](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-outer-2026-09-25/c02-outer-E12-after.png)

![爱神星同体积球对照](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-outer-2026-09-25/c02-eros-sphere.png)

![埃涅阿斯 L5 成员](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-outer-2026-09-25/c02-trojan-l5.png)

![女凯龙星关闭双环](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-outer-2026-09-25/c02-chariklo-rings-off.png)

## 数据依据与后续范围

本轮检查的是来源归属和交互，不新增天文学结论。既有资料见 [R01 小天体](R01-SMALL-BODIES.md)、[R02 外围成员](R02-OUTER-VISITORS.md)、[R03 双体与环](R03-SYSTEMS-AND-RINGS.md)、[R04 形状外观](R04-APPEARANCE.md)。原始来源与版本保存在 public/data/small-bodies、public/data/comets、public/data/eros-shape 和 public/data/rings/chariklo.json。

累计 E01–E12 的代表入口与基本交互已复验。其余 13 项（E13–E20 与 S01–S05）以及所有主题的深层子项、异常场景仍需继续。F01–F04 保持未关闭，真实设备性能和用户总验收仍待完成。不能把“12 类经过代表检查”理解成“12 类全面完成”或首版已经验收。
