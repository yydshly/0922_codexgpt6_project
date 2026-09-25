# C02 第三组：边界、物质与空间环境

版本：2026.09.25-r09.7。检查日期：2026-09-25。

## 范围与方法

从“更多工具 → 整体规划 → 元素覆盖”进入 E13–E16。检查四类代表入口、右侧说明与焦点、步骤高亮、日期保留、返回规划，以及关闭阶段 09 后的奥尔特云基础入口。另检查边界三步、物质六步、空间介质五步、太阳与行星环境七步的选中状态。

本地生产构建，独立 Chrome 无头浏览器，视口 1578 × 902、DPR 1。复跑：`node scripts/qa/coverage-environment.mjs`，已有浏览器调试端口 9224（可用 CDP_PORT 修改）且打开 http://127.0.0.1:4180/。通过公开 DOM 操作控件；脚本检查可见、启用状态与结果，代表截图另作视觉检查。不是完整人工点击、触摸、读屏或实际设备性能验收。

## 问题与修正

1. 中等：四类入口切换画面后，说明仍停在学习路线或通用内容。现在将对应说明滚入视区并接收键盘焦点。
2. 中等：尘埃、地球环境入口展开多个效果，步骤没有选中。现分别从“碎屑分布”“磁层响应”开始，复用已有步骤的画面隔离与解释；奥尔特云和日球层直接进入边界对照。
3. 中等：专门观察碎屑时点太暗，原取景还可能裁切点带。现在仅在碎屑专用步骤增强点显示，并按几何包围范围设置初始镜头；标注点数、大小为显示处理。
4. 可靠性：规划入口等待当前日期历表加载完成再应用教学步骤，避免在加载期间调用被保护的操作后错误记为已处理。阶段 09 关闭时仍可阅读基础结构说明，不改变阶段选择。

![修复前：尘埃入口混杂其他天体，解释停在专题路线](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-environment-2026-09-25/c02-environment-E14-before.png)

![修复前：地球环境入口叠加无关图形，说明未跟随](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-environment-2026-09-25/c02-environment-E16-before.png)

## 1. E13 · 奥尔特云

状态：代表入口与边界切换通过。

证据：进入推断球状点云并同步解释；三步可在日球层、奥尔特云及同屏对照之间切换。关闭阶段 09 后入口转到基础说明，保持该阶段关闭。

边界：点云是推断样本，不是逐颗实测；本轮未验证所有镜头角度。

![E13 画面与解释](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-environment-2026-09-25/c02-environment-E13-after.png)

## 2. E14 · 尘埃、流星体与流星

状态：代表入口与步骤操作通过。

证据：默认进入碎屑分布，六步按钮的选中状态与说明对应。流星示例可播放、暂停，教学进度变化而主页日期不变；保存流星与 E 环代表画面。

边界：六步控件状态均已查，未对每一步所有角度逐像素验证；碎屑仍是通用原理曲线，未模拟输运或预报流星雨。

![E14 画面与解释](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-environment-2026-09-25/c02-environment-E14-after.png)

## 3. E15 · 太阳风与日球层

状态：代表入口与解释切换通过。

证据：入口直接突出日球层边界；五种空间介质解释可独立选中，保存局部带电粒子参考图。

边界：没有当日数值场、通量或实际边界模拟；本轮未验证全部粒子动画。

![E15 画面与解释](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-environment-2026-09-25/c02-environment-E15-after.png)

## 4. E16 · 磁层、辐射带与极光

状态：磁层入口与七步操作通过。

证据：入口突出地球磁层；七步联系可切换，地球/木星极光代表画面对应说明；手动关闭木星极光后取消失配的步骤高亮。

边界：本轮重点是磁层和极光，辐射带完整组合仍待检查；未计算当日磁轴或空间天气预测。

![E16 画面与解释](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-environment-2026-09-25/c02-environment-E16-after.png)

## 补充操作截图

![两种边界放在同一空间](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-environment-2026-09-25/c02-boundaries-together.png)

![流星进入大气的独立示例](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-environment-2026-09-25/c02-meteor.png)

![土卫二与 E 环](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-environment-2026-09-25/c02-e-ring.png)

![局部带电粒子解释](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-environment-2026-09-25/c02-charged-particles.png)

![地球极光示意](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-environment-2026-09-25/c02-earth-aurora.png)

![木星极光解释着色](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-environment-2026-09-25/c02-jupiter-aurora.png)

![阶段 09 关闭时保留奥尔特云基础说明](https://raw.githubusercontent.com/yydshly/0922_codexgpt6_project/main/docs/qa/c02-environment-2026-09-25/c02-oort-stage-fallback.png)

## 依据与未完成范围

科学来源沿用各步骤所附 NASA 页面和既有 [环境联系报告](R05-ENVIRONMENT-LINKS.md)、[现象检查](PHENOMENA-AUDIT.md)。本轮修改入口、显示和解释衔接，不增加新的物理模型或宣称实时实测。边界轮廓、极光着色、粒子路径和碎屑分布都属于示意。

累计 E01–E16 完成代表入口与交互检查；E17–E20、A01–A05 共 9 项以及各主题深层子项继续核对。F01–F04 保持未关闭。数据精度全量复算、窄屏、全部角度、异常加载、真实设备长时间使用和用户总验收不由本轮截图证明。截图可见焦点位置；不据此宣称读屏及无障碍完全合规。
