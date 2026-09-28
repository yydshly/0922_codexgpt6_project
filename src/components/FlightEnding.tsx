import type { FlightState } from '../launch/liftoff';

/** A factual ending, not a manufactured disposal success. Shared by manual and automatic routes. */
export function FlightEnding({ state: s }: { state: FlightState }) {
  return <section className="flight-ending" aria-label="二级与卫星的最终去向">
    <h3>最后，两者去了哪里？</h3>
    <article><strong>二级 · {s.reentry?.lower?.contactTime != null ? '参考下降到达地表' : '查看本次下降记录'}</strong>
      <p>{s.reentry?.lower?.contactTime != null ? `等效物体在 T+${s.reentry.lower.contactTime.toFixed(1)} s 到达 0 m，接触前相对空气速度约 ${s.reentry.lower.speedMS!.toFixed(1)} m/s。这是参考模型的终点。` : s.reentry ? '本次再入以二级的独立记录为准。20 km 只是检查点，可继续等效物体参考下降至地表。' : '本次没有执行二级再入路线；当前只保留分流时的二级历史状态，不能判定它已落地或烧毁。'}</p>
      <small>未求解材料与结构解体，不表示完整箭体存活、安全着陆或真实残骸落点。真实再入可能烧蚀、解体，部分材料可能到达地表。</small>
    </article>
    {s.satelliteDisposal ? <article><strong>E02 卫星 · {s.satelliteDisposal.groundAt != null ? '等效物体参考下降至地表' : '按本次离轨记录判断'}</strong>
      <ol><li>业务数据已交付；接收结束指令后仍保留控制电源。</li><li>自身发动机耗油 {s.satelliteDisposal.burnedKg.toFixed(2)} kg，改变轨道；余燃料排放 {s.satelliteDisposal.ventedKg.toFixed(2)} kg。</li><li>{s.satelliteDisposal.entryAt != null ? '轨迹已进入大气；改用等效质点计算减速、热流和参考下降。' : '降低近地点与实际进入大气是不同检查点。'}</li></ol>
      <p>未计算材料解体、烧蚀或残骸落区，不判定全部烧毁或完整卫星落地。电池仍保留 {((s.operations?.energyJ ?? 0) / 3600).toFixed(1)} Wh，不宣称完全钝化。</p>
    </article> : <article><strong>E01 卫星 · {s.lifecycle?.mode === 'retired' ? '已退役，仍在轨道上' : '任务与处置分别判断'}</strong>
      <ol><li>交付数据、结束观测与通信业务。</li><li>隔离充电并消耗储能；本教学模型保留 5% 电量，非钝化认证。</li><li>没有推进器，未执行主动离轨。物体仍受引力和阻力作用。</li></ol>
      <p>长期还需要轨道监测与处置安排。低轨物体可能随大气阻力逐渐再入，所需时间取决于轨道、姿态和太阳活动；本项目没有计算它哪天坠落。</p>
    </article>}
    <details><summary>现实中的后续处理与来源</summary><p>具备能力的卫星可在关机前主动减轨，或使用预装减轨装置；外部移除需要另外的航天任务。现有 E01 没有这些设备，不能用动画把它直接删除。</p><a href="https://orbitaldebris.jsc.nasa.gov/reentry/" target="_blank" rel="noreferrer">NASA · 再入、解体与材料存活 ↗</a><br/><a href="https://www.esa.int/Space_Safety/Clean_Space/Sending_a_satellite_safely_to_sleep" target="_blank" rel="noreferrer">ESA · 退役与储能处理 ↗</a><br/><a href="https://blogs.esa.int/rocketscience/2024/02/05/ers-2-reentry-frequently-asked-questions/comment-page-1/" target="_blank" rel="noreferrer">ESA · 结束业务多年后再入的 ERS-2 案例 ↗</a></details>
  </section>;
}
