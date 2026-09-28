/** Published descriptions and planned capabilities; no flight commands. */
export const POST_DEPLOYMENT_PACKAGES = [
  {
    id: 'P1', lane: '共同起点', title: '安全分离与任务分流',
    ability: '已归档教学范围：15 分钟距离曲线与相对投影、12 秒理想转向、6 秒侧向点火及实际滑行对照。推力与耗油参与计算。',
    prerequisite: '先完成 120 秒部署检查；检查燃料、间距、轨道与预测范围。重启能力和低节流为教学假设，不作为长期避碰判断。',
    acceptance: '对比执行与未执行避让的结果，说明预测范围；燃料不足或条件不满足时不允许执行。',
  },
  {
    id: 'P2', lane: '二级路线', title: '离轨点火与钝化',
    ability: '已归档教学范围：反向对准、有限离轨点火、近地点变化图和简化钝化，残留物质与电能分账。',
    prerequisite: '完成 P1；按燃料、间距、轨道和时间门控。重启与节流是教学条件，气体与电能采用明示库存；不提供落区控制。',
    acceptance: '点火改变速度和轨道，耗油改变质量；失败保留在轨对象。钝化后锁定不再具备条件的点火操作，不宣称已完成再入。',
  },
  {
    id: 'P3', lane: '二级路线', title: '再入大气与受热边界',
    ability: '已归档教学范围：继承 P2 状态，无推力下降到 120 km 检查点，再观察密度、阻力、减速和驻点热流曲线；20 km 停止。',
    prerequisite: '完成 P2；使用本地标准大气与等效钝体参数。材料、烧蚀、解体及残骸存活尚未建模，完整箭体只是显示载体。',
    acceptance: '数值与画面由同一状态驱动；没有材料模型时只显示受热估算，不用火焰动画宣称完全烧尽，也不预测真实安全落区。',
  },
  {
    id: 'P4', lane: '卫星路线', title: '展开之后，真正开始工作',
    ability: '已归档教学范围：理想对日定向、日照发电与地影放电、240 MB 观测数据暂存、教学站窗口内下传；曲线与三维画面同状态。',
    prerequisite: '完成 P1 或 P3，保留已展开翼板的有效在轨卫星。从 60% 教学电量初始化，沿用轨迹；二级转为历史记录。未模拟真实姿态力矩、射频链路和遥感图像。',
    acceptance: '日照、遮挡与任务负载影响电量；失联时保留数据，进入通信窗口后下传。参数、视角和存档对应同一颗卫星。',
  },
  {
    id: 'P5', lane: '卫星路线', title: '维持任务与寿命结束',
    ability: '已归档无推进教学范围：继承 P4 储能，一圈低负载维护、窗口接收结束指令、隔离充电与简化电能收尾，保留退役在轨结果；主动变轨与离轨未实现。',
    prerequisite: '完成 P4 下传；当前 E01 无推进器，按现有能源和教学电源隔离/泄放设备执行无推进分支。带推进版本需发射前配置质量、推进剂及预算，再验证；不能自动添加发动机。',
    acceptance: '区分正在工作、故障、失效在轨与已处置；不把废弃卫星从场景中直接删除，不给出未经验证的长期寿命结论。',
  },
] as const;

export const POST_DEPLOYMENT_SOURCES = [
  { label: 'ESA · 阿丽亚娜 6 离轨实例（2026-02-12）', url: 'https://www.esa.int/Newsroom/Press_Releases/More_boosters_more_power_Ariane_6_lifts_off_with_four_boosters_for_the_first_time', detail: '该次任务释放 32 颗卫星后，上面级第三次点火用于离轨。只是一个实际案例，不代表所有任务都采用同一方案。' },
  { label: 'ESA · 离轨、处置轨道与钝化', url: 'https://www.esa.int/Space_Safety/Space_Debris/Mitigating_space_debris_generation', detail: '任务结束后可根据条件安排再入或处置轨道，并通过耗尽或释放剩余能量降低解体风险。相关要求有各自适用范围。' },
  { label: 'ESA · 2026 空间环境报告', url: 'https://www.esa.int/Space_Safety/Space_Debris/ESA_Space_Environment_Report_2026', detail: '2026-09-14 发布，统计截至 2025 年底。2025 年火箭体受控再入数量连续第二年超过非受控再入；并非所有火箭体都已处置。' },
] as const;
