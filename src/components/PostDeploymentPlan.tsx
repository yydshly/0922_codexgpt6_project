import archiveUrl from '../../docs/EARTH-LAUNCH-ARCHIVE.md?url';
import controlBacklogUrl from '../../docs/SPACECRAFT-CONTROL-BACKLOG.md?url';
import { POST_DEPLOYMENT_PACKAGES, POST_DEPLOYMENT_SOURCES } from '../data/postDeploymentPlan';
import planUrl from '../../docs/POST-DEPLOYMENT-PLAN.md?url';
import './PostDeploymentPlan.css';

export function PostDeploymentPlan() {
  return <section className="post-deployment-plan" aria-label="入轨之后：二级与卫星的后续能力">
    <span className="post-plan-badge">地球出发教学版 · 2026.09.28 阶段归档</span>
    <h3>入轨之后，两条任务线。</h3>
    <p>已实现释放、独立运动与存档；已接入分离分析、一次侧向机动、二级离轨与简化钝化。部署检查通过后从分离分析依次继续；P3 已接续下降、减速与驻点热流估算，20 km 停在模型边界；P4 已接入卫星定向、充放电、日夜观测与窗口下传。P5 已接入能源维护与任务结束，保留退役在轨对象；卫星主动离轨、长期寿命和材料解体仍未实现。</p>
    <details>
      <summary>查看已归档范围、前提与边界</summary>
      <div className="post-plan-routes" aria-label="部署后的两条路线">
        <p><strong>共同起点</strong> P1 安全分离与任务分流</p>
        <p><strong>二级火箭 →</strong> P2 离轨与钝化 → P3 再入受热（至 20 km）</p>
        <p><strong>独立卫星 →</strong> P4 开始工作 → P5 维持任务与退役</p>
      </div>
      <p>这五项已按教学范围接入；两条路线属于同一次任务，卫星工作本身不必等待二级完成再入；P5 当前先处理无推进 E01；未来主动处置需要先配置推进系统，复用适用的求解方法而非照搬二级参数。</p>
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
      <p>现有 E01 无推进器，不自动添加硬件。主动离轨、完整再入、回收、对接与月球航程另行立项；本次只归档，不开发这些能力。</p>
      <a className="post-plan-download" href={controlBacklogUrl} download="航天器操控后期实现记录.md">下载前提、工作包与完成标准 ↗</a>
    </details>
  </section>;
}
