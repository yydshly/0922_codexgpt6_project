# C02 第四组：运行课程、宇宙背景与历史访客

版本：2026.09.25-r09.8。日期：2026-09-25。

## 范围与修正

从整体规划的 E17–E20 入口进入，核对说明、代表操作和返回。发现 E17–E19 的说明虽然可见，键盘焦点仍留在“更多工具”；现复用前几组的说明定位，在挂载后滚动并聚焦对应内容。E20 原有历史窗口焦点工作正常，本轮保留。

本地生产构建、独立 Chrome 无头浏览器，1578 × 902、DPR 1。脚本 `node scripts/qa/coverage-context.mjs` 连接已有调试端口 9224（CDP_PORT 可改）及 http://127.0.0.1:4180/。公开 DOM 操作与断言，加代表截图视觉检查；不替代真实设备、触摸、读屏或完整人工验收。观测起点为北京时间 2026-09-25 23:13:41。

![修复前：课程入口的焦点留在顶部工具栏](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-context-2026-09-25/c02-context-E17-before.png)

## 1. E17 · 运行关系与天象

状态：目录与地球自转代表操作通过。

证据：入口聚焦课程说明；选择地球自转后播放推进主页日期，暂停和重置本节日期有效。

边界：本轮未重跑其余 13 节、三类天象或重新计算事件误差，不能据此宣称全部课程验收。

![E17 入口画面](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-context-2026-09-25/c02-context-E17-after.png)

## 2. E18 · 恒星与邻星

状态：双视角与同星保留通过。

证据：三步引导把波江座 ε 从距离图切到天空方向图，所选星保持一致；可返回 32 个距离样本，天空目录显示 2,936 个记录。

边界：沿用固定历元星表；没有重新复算星表位置精度。主全景仍是装饰星点，F01 未关闭。

![E18 入口画面](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-context-2026-09-25/c02-context-E18-after.png)

## 3. E19 · 银河系与邻近星系

状态：尺度切换与返回通过。

证据：银河系入口说明获得焦点；可切换银河系之外，页面标明概念模型；返回太阳系画布，日期保持。

边界：不是实测星图或真实方位、尺寸重建；完整镜头、窄屏和长时交互未在本轮覆盖。

![E19 入口画面](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-context-2026-09-25/c02-context-E19-after.png)

## 4. E20 · 星际访客

状态：独立历史时间与返回通过。

证据：2I/Borisov 历史窗口播放会推进历史日期；可暂停、侧视和重置近日点日期；关闭后保留原主页日期。

边界：只展示既有历史窗口，不外推完整来路和未来；未重跑全时段插值或异常加载场景。

![E20 入口画面](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-context-2026-09-25/c02-context-E20-after.png)

## 代表操作截图

![地球自转播放后暂停](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-context-2026-09-25/c02-earth-spin.png)

![所选邻星的距离](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-context-2026-09-25/c02-neighbor-distance.png)

![同一恒星的天空方向](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-context-2026-09-25/c02-star-sky.png)

![银河系之外的概念模型](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-context-2026-09-25/c02-other-galaxies.png)

![历史访客侧视](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-context-2026-09-25/c02-visitor-side.png)

## 验证与记录一致性

自动测试 79 个文件、328 项通过；生产构建及四份规划同步检查通过。修正第二、三组报告中必补编号 A01–A05 的笔误，统一为台账中的 S01–S05，不改变范围或历史验收状态。

## 后续与证据边界

科学依据沿用 [运动与事件](R06-MOTION-AND-EVENTS.md)、[恒星目录](R08-STELLAR-CONTEXT.md)、[外围成员与历史访客](R02-OUTER-VISITORS.md) 及各面板附带的原始资料。本轮没有新增科学模型，不将来源说明的可见性当成数据精度复算。

E01–E20 的代表入口检查完成；S01–S05 五项必补、各主题完整子项和异常场景仍待继续。F01 星表背景、F02 资源预算、F03 实际设备体验、F04 用户验收保持未关闭，C02 及首版均不能标为完成。截图证明焦点与说明可见，不能证明全部辅助技术兼容。
