import demoCloseoutUrl from '../../docs/FLIGHT-DEMO-CLOSEOUT.md?url';
import disposalNotesUrl from '../../docs/SATELLITE-DISPOSAL-CHOICES.md?url';
import demoNotesUrl from '../../docs/FLIGHT-ENDINGS-AND-DEMO.md?url';
import archiveUrl from '../../docs/EARTH-LAUNCH-ARCHIVE.md?url';
import controlBacklogUrl from '../../docs/SPACECRAFT-CONTROL-BACKLOG.md?url';
import { POST_DEPLOYMENT_PACKAGES, POST_DEPLOYMENT_SOURCES } from '../data/postDeploymentPlan';
import planUrl from '../../docs/POST-DEPLOYMENT-PLAN.md?url';
import './PostDeploymentPlan.css';

export function PostDeploymentPlan() {
  return <section className="post-deployment-plan" aria-label="入轨之后：二级与卫星的后续能力">
    <span className="post-plan-badge">地球出发教学版 · 2026.09.28 阶段归档</span>
    <h3>入轨之后，两条任务线。</h3>
    <p>已实现释放、独立运动与存档；已接入分离分析、一次侧向机动、二级离轨与简化钝化。部署检查通过后从分离分析依次继续；P3 已接续下降、减速与驻点热流估算；本批新增 20 km 检查点之后的 0 m 等效物体参考下降，不判定材料存活或真实落区；P4 已接入卫星定向、充放电、日夜观测与窗口下传。P5 已接入能源维护与任务结束，保留退役在轨对象；E02 新增发射前预装设备与动力离轨教学；长期寿命、材料解体和真实落区仍未实现。</p>
    <p><strong>本批新增 · 从头到尾演示：</strong>地球出发顶部一键运行七章；可暂停、退出返回原任务。二级参考下降与卫星退役各自给出结果。原归档标签保留，本批独立交付，待体验验收。</p><a className="post-plan-download" href={demoNotesUrl} download="全程自动演示与路线结尾.md">查看演示入口、结尾和模型边界 ↗</a>
    <p><strong>新增 · 先选任务末期方案：</strong>顶部选择 E01 或 E02 再运行全程演示；组装页也可预装 E02 离轨组件。E01 退役后仍在轨；E02 用自己的推进剂降低轨道，再观察等效物体再入。硬件从发射时计入质量，不给已发射卫星补装设备。</p><a className="post-plan-download" href={disposalNotesUrl} download="卫星任务末期方案与动力离轨.md">查看两种方案、参数、来源与验收方法 ↗</a>
    <p><strong>演示完善 · 回看与对比：</strong>自动演示内可回看已到达章节，对比两种方案及各自实际跑完的结果；参数区分卫星当前状态与二级历史记录。三项收尾后进入体验验收，不自动追加其他模块。</p><a className="post-plan-download" href={demoCloseoutUrl}>查看本次收尾与验收步骤 ↗</a>
    <details>
      <summary>查看已归档范围、前提与边界</summary>
      <div className="post-plan-routes" aria-label="部署后的两条路线">
        <p><strong>共同起点</strong> P1 安全分离与任务分流</p>
        <p><strong>二级火箭 →</strong> P2 离轨与钝化 → P3 再入受热（至 20 km）</p>
        <p><strong>独立卫星 →</strong> P4 开始工作 → P5 维持任务与退役</p>
      </div>
      <p>这五项已按教学范围接入；两条路线属于同一次任务，卫星工作本身不必等待二级完成再入；归档 P5 为无推进 E01；本批 E02 提供预装推进器的独立离轨路线，参数与二级分开。</p>
      <ol className="post-plan-packages">{POST_DEPLOYMENT_PACKAGES.map(item => <li key={item.id}>
        <small>{item.id} / {item.lane} · {item.id === 'P5' ? '无推进教学版 · 已归档' : '教学范围 · 已归档'}</small><h4>{item.title}</h4>
        <p>{item.ability}</p><p><strong>前提：</strong>{item.prerequisite}</p><p><strong>完成标准：</strong>{item.acceptance}</p>
      </li>)}</ol>
      <details className="post-plan-evidence"><summary>现实中怎样处理？来源与适用范围</summary>
        <p>完成部署后的上面级可能主动离轨、转入处置轨道，也可能继续留轨成为废弃箭体。处置方式取决于任务和载具，不能把一级回收直接套用于二级。</p>
        {POST_DEPLOYMENT_SOURCES.map(source => <p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a><br/>{source.detail}</p>)}
        <p>来源核对：2026-09-27。这里是机制说明，不是本次模拟火箭的遥测或某个真实二级的实时位置。</p>
      </details>
      <p>完整回收复用、处置轨道任务、真实碎片预警、交会对接和月球航程另列候选，不包含在这 5 项中。归档授权与逐项体验验收分开记录，后续能力不自动开工。</p>
      <a className="post-plan-download" href={planUrl} download="入轨之后的任务与处置规划.md">下载部署后能力与边界 ↗</a>
    </details>
    <a className="post-plan-download" href={archiveUrl} download="地球出发教学版阶段归档.md">查看阶段归档与验证记录 ↗</a>
    <details>
      <summary>航天器操控 · 后期实现（仅记录）</summary>
      <p>已记录，未排期、未启动。目标：从地球发射带推进能力的航天器，完成一次可控变轨和观测或通信任务。</p>
      <ol><li>发射前配置推进器、燃料和电源，明确质量与机动预算。</li><li>控制指向、点火与关机，同步显示轨道、资源和操作结果。</li><li>达到目标轨道，完成任务并核对结果，支持保存恢复。</li></ol>
      <p>现有 E01 无推进器，不自动添加硬件。本批 E02 实现固定流程的动力离轨教学；自由指向与点火驾驶仍后置。材料解体、回收、对接与月球航程另行立项。</p>
      <a className="post-plan-download" href={controlBacklogUrl} download="航天器操控后期实现记录.md">下载前提、工作包与完成标准 ↗</a>
    </details>
  </section>;
}
