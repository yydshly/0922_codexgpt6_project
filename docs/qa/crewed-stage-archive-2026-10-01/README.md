# 可驾驶飞船与载人任务 · 最终归档复核

版本 `2026.10.01-crewed-r1`，标签 `crewed-2026.10.01`。用户于 2026-10-01 要求「那么提交和归档」。本次提交此前全部相关本地增量，并保留开发阶段原始复核；当前范围与边界以[阶段归档](../../CREWED-STAGE-ARCHIVE.md)为准。

## 最终检查

- 当前源码全量回归 **152 个测试文件／830 项通过**，2 个测试进程，30 秒单测超时，耗时约 139.45 秒。原日志见 [tests.txt](tests.txt)。部署工作流采用相同的测试选项，没有跳过完整任务测试。
- 最终生产构建、TypeScript、文档同步检查，以及 GitHub Pages 子路径构建：结果见 [build.txt](build.txt)、[pages-build.txt](pages-build.txt) 与 [verification.json](verification.json)。
- 最新生产网页 **108 项检查通过**，运行时／资源错误与浏览器警告均为 0，覆盖正常入口、实际倒计时、九个后续授权窗口、各阶段控制交接、原生键盘油门、暂停观察、失败／完成及 680 像素布局。见[逐项结果与截图](../crew-flight-readout-2026-10-01/README.md)。本次归档没有再次改动运行逻辑，不重复计数或相加历史专项测试。
- 只读审核：新增内容均为本阶段代码、说明、设计参考和 QA 证据；待提交文本可按 UTF-8 读取，JSON 可解析，未发现凭证文件或大于 GitHub 单文件上限的资产。

原始 `.cache`、`node_modules` 和 `dist` 不进入提交。浏览器复核所需阶段夹具可由 `scripts/validate-crew-pilot.ts` 重新积分生成；原始截图与下载示例保留其测试语境。失败注入和早期失败日志不表示最终正常任务仍有相同问题。软件渲染检查不替代硬件帧率、弱网、多浏览器或长期运行验证。

## 查看与复现

1. 安装依赖：`npm ci`。
2. 全量回归：`npm test -- --maxWorkers=2 --testTimeout=30000`。
3. 构建：`npm run build`。GitHub Pages 构建设置 `GITHUB_PAGES=true`，使用 `/0922_codexgpt6_project/` 子路径。
4. 本地查看：`npm run preview -- --port 4180`；全景顶部进入「载人任务 · 地球出发」。
5. 正常完整路线及浏览器专项复现见[自主核心](../crew-pilot-mode-2026-10-01/README.md)、[最新网页脚本](../crew-flight-readout-2026-10-01/browser-check.mjs)。用独立浏览器配置运行，不连接用户日常浏览器。

GitHub 推送、标签归档与 Pages 部署分别确认。实际发布由[对应提交的工作流](https://github.com/yydshly/0922_codexgpt6_project/actions/workflows/deploy-pages.yml)记录；用户体验验收不被自动测试替代。本次归档停止追加能力，后续缺项按阶段归档表另立目标。

发布后入口检查脚本为 [published-smoke.mjs](published-smoke.mjs)。使用独立的 9337 调试浏览器运行 `node docs/qa/crewed-stage-archive-2026-10-01/published-smoke.mjs https://yydshly.github.io/0922_codexgpt6_project/ 9337`，检查在线入口、两条路线、地面检查、真实倒计时、释放、本人驾驶与暂停。结果写入被 Git 忽略的 `.cache/crewed-stage-published`；实际发布复核结果随 GitHub 归档版本说明记录，不改写开发阶段原始证据。
