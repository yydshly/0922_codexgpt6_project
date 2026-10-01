# 载人自主任务：实际状态与讲解复核

状态：2026-10-01 本地增量，未提交、未发布。

## 本轮改变

- 点火授权与实际推力分别显示。倒计时没有推力时不再称为建压；二级授权后本人油门为零时，说明仍在无主推力滑行。
- 「辅助播放倍率」显示选择值与当前采用值。本人驾驶和转姿采用 1×，阶段上限、暂停与检查点均读取现有计算策略；恢复辅助保留原选择。
- 平台观察条件满足时，暂停中可以直接记录。按钮、阶段指引与记录器共用同一条件，记录不会推进模拟时间；无效数值不能通过条件检查。
- 离轨、再入和着陆的期望方向与实际方向分别说明。手动离轨推力沿实际船头，错误朝向不能被描述为已经完成减速。
- 失败或完成后停止时钟，不再提供「继续模拟」；退出提示保留结束状态。

没有修改引力、大气、姿态积分、飞行步长、物理精度或存档格式。本轮改的是读数、操作指引和共用观察条件。模型与设备限制见[自主任务说明](../../CREWED-PILOT-MODE.md)。

## 验证结果

相关回归 **5 个文件／34 项测试通过**，覆盖实际倒计时、二级零油门、暂停观察、倍率策略、方向说明、输入与控制资源。最终 TypeScript 与生产构建通过。见 [tests.txt](tests.txt)、[build.txt](build.txt)。未重复全项目回归；既有核心与完整路线依据见[任务核心复核](../crew-pilot-mode-2026-10-01/README.md)。

生产预览网页 **108 项检查通过**，运行时及资源错误 0 项，浏览器警告 0 项。包括正常入口、实际倒计时、后续九个操作窗口、各阶段接管／恢复辅助、原生键盘油门归零、暂停记录观察、完成与失败操作，以及 680 像素布局。逐项记录见 [browser-checks.json](browser-checks.json)，统计见 [verification.json](verification.json)，输出见 [browser-output.txt](browser-output.txt)。

阶段存档来自实际积分，按钮由真实计算线程处理。检查使用独立隐藏浏览器及软件渲染，用于操作、资源与几何检查，不代表硬件帧率测量或跨设备保证。没有操作用户日常浏览器标签页。

## 截图与复现

- [倒计时前段：尚无主推力](countdown-before-thrust.png)
- [二级授权保留：本人油门归零](upper-zero-throttle.png)
- [离轨辅助转姿：尚无主推力](deorbit-turn-rate.png)
- [暂停观察：无需先继续模拟](paused-observation.png)
- [失败停止与结果入口](failed-carrier.png)
- [任务完成与结果入口](complete.png)
- [680 像素操作区](compact-checkpoint.png)

相关回归命令：

```sh
npm test -- src/flight/crewFlightReadout.test.tsx src/flight/crewPilotControl.test.ts src/flight/crewDirections.test.ts src/components/CrewPilotBriefing.test.tsx src/flight/crewPilotInput.test.ts --maxWorkers=2 --testTimeout=30000
npm run build
```

网页脚本见 [browser-check.mjs](browser-check.mjs)。先运行 `npx tsx scripts/validate-crew-pilot.ts` 生成阶段存档，构建并在 4180 端口运行本地预览，再以独立浏览器配置开启 9334 端口调试服务，运行 `node docs/qa/crew-flight-readout-2026-10-01/browser-check.mjs`。二级零油门检查先恢复检查点，在本人驾驶 1× 下授权点火，再用原生 Home 键操作滑块，避免加速阶段越过测试窗口。不要将脚本连接到用户日常浏览器配置。
