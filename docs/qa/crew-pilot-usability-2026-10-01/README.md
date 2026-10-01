# 载人自主任务操作体验复核

状态：2026-10-01 本地增量，未提交、未发布。

## 本轮改变

- 右侧展示阶段目标、下一步与相关实际读数，明确区分运行、暂停、等待授权、失败和完成。
- 增加主画面键盘接入提示、启用入口、按住反馈与按钮高亮。松键、离开画面、暂停、换阶段时清理临时输入；持续油门仍保持原设定。驾驶按钮也可用 Enter 或空格操作。
- 将驾驶按钮与现有模型中的设备、实际推力和有限推进剂对应。零推力火箭不能通过推力矢量转姿，但有授权和推进剂时仍可增大油门。返回舱没有凭空增加平移发动机。
- 失败或完成后在右侧上方展示结果操作。发射失败保留发射章节，不会错误高亮着陆回收；失败表示停止，恢复只读取用户主动保存的任务。

没有修改引力、大气、姿态求解、轨道精度、飞行步长或存档格式。原有自动演示与自主任务共用的动作守卫、资源和时间轴继续保留。模型边界见[自主任务说明](../../CREWED-PILOT-MODE.md)。

## 验证范围

最终相关回归通过：3 个文件、25 项测试。涵盖原有自主控制、零推力后的油门重启、有限姿态与平移资源、返回舱与着陆喷口分立储备，以及实际失控发射后的章节。见 [tests.txt](tests.txt)。最终 TypeScript 与生产构建通过，见 [build.txt](build.txt)。本轮没有重复全项目回归；此前核心与全流程验证见[任务核心复核](../crew-pilot-mode-2026-10-01/README.md)。

最终生产网页 94 项检查全部通过，运行时／资源错误 0 项、浏览器警告 0 项。逐项记录在 [browser-checks.json](browser-checks.json)，统计与发布状态见 [verification.json](verification.json)，运行输出见 [browser-output.txt](browser-output.txt)。检查覆盖正常入口、真实倒计时与授权、后续九个操作窗口、各飞行阶段接管和恢复辅助、输入反馈、失焦清理、无推力转姿限制、平台观察、失败与完成操作区，以及 680 像素布局。

网页阶段状态来自实际积分生成的存档；操作按钮仍由真实计算线程处理。软件渲染检查用于操作与几何，不作为真实设备帧率指标。使用独立隐藏测试浏览器，没有操作用户已有标签页。

## 截图与复现

- [任务起点与下一步](ground-checkpoint.png)
- [本人驾驶与设备状态](manual-launch.png)
- [减速伞与主伞操作窗口](checkpoint-open-main.png)
- [软着陆授权](checkpoint-enable-landing.png)
- [发射失败仍显示发射章节](failed-carrier.png)
- [任务完成与结果入口](complete.png)
- [680 像素布局](compact-checkpoint.png)

相关回归：`npm test -- src/flight/crewPilotInput.test.ts src/flight/crewPilotControl.test.ts src/components/CrewPilotBriefing.test.tsx --maxWorkers=2 --testTimeout=30000`。

网页检查脚本为 [browser-check.mjs](browser-check.mjs)。先运行 `npx tsx scripts/validate-crew-pilot.ts` 生成实际积分的阶段存档、构建并在 4180 端口启动本地预览，再用独立浏览器配置开启 9334 端口的本地调试服务，运行 `node docs/qa/crew-pilot-usability-2026-10-01/browser-check.mjs`。不要将检查脚本连接到用户日常浏览器配置。
