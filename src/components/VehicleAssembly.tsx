import { ENGINE_OPTIONS, engineById, deriveVehicle, type VehicleConfig } from '../launch/vehicle';
import appearanceUrl from '../../docs/VEHICLE-APPEARANCE.md?url';
import './VehicleAssembly.css';

interface Props {
  config: VehicleConfig; onChange: (config: VehicleConfig) => void;
  onSave: () => void; onLoad: () => void; onReset: () => void; onApply: () => void;
  status: string; dirty: boolean;
}
export function VehicleAssembly({ config, onChange, onSave, onLoad, onReset, onApply, status, dirty }: Props) {
  const vehicle = deriveVehicle(config);
  return <div className="vehicle-assembly">
    <div className="launch-intro"><span className="launch-kicker">02 / 组装你的载具</span><h2>先搭好，再出发。</h2><p>两级教学火箭 · 400 km 轨道任务<br/>更换发动机、选择加注量，再装入载荷。</p></div>
    {(['booster', 'upper'] as const).map((stage, index) => {
      const engine = engineById(config[`${stage}Engine`]), stats = vehicle.stages[index];
      return <fieldset className="vehicle-stage" key={stage}>
        <legend>{index === 0 ? '01 / 一级 · 离开发射台' : '02 / 二级 · 继续加速'}</legend>
        <label htmlFor={`vehicle-${stage}-engine`}>发动机组</label>
        <select id={`vehicle-${stage}-engine`} value={engine.id} onChange={event => onChange({ ...config, [`${stage}Engine`]: event.target.value })}>
          {ENGINE_OPTIONS.filter(e => e.stage === stage).map(e => <option value={e.id} key={e.id}>{e.name}</option>)}
        </select>
        <p>{engine.description}</p>
        <label htmlFor={`vehicle-${stage}-fuel`} className="vehicle-fuel-label"><span>推进剂加注</span><strong>{config[`${stage}FillPercent`]}% · {(stats.fuelKg / 1000).toFixed(1)} t</strong></label>
        <input id={`vehicle-${stage}-fuel`} type="range" min="0" max="100" step="25" value={config[`${stage}FillPercent`]} aria-valuetext={`${config[`${stage}FillPercent`]}%，${stats.fuelKg} 千克`} onChange={event => onChange({ ...config, [`${stage}FillPercent`]: Number(event.target.value) })}/>
        <div className="vehicle-stage-stats"><span>干质量 {(stats.dryKg / 1000).toFixed(2)} t</span><span>{index === 0 ? '海平面' : '真空'}估算燃烧 {stats.ratedBurnSeconds.toFixed(0)} s</span></div>
      </fieldset>;
    })}
    <fieldset className="vehicle-payload"><legend>03 / 无人卫星载荷</legend><div>{([250, 500] as const).map(mass => <button key={mass} aria-pressed={config.payloadKg === mass} onClick={() => onChange({ ...config, payloadKg: mass })}>{mass} kg<span>{mass === 250 ? '轻载荷' : '基准载荷'}</span></button>)}</div><p>两种 E01 都没有推进器或推进剂，不能主动离轨。太阳翼、电池、观测设备和教学电源隔离/泄放电路计入载荷总质量，不在入轨后增加质量。外形为教学示意。</p></fieldset>
    <details className="vehicle-explanation"><summary>箭体外形与这些部件是什么？</summary><p>整箭高 60 m，主体直径 3.7 m，整流罩最宽约 4.3 m。顶部整流罩包住卫星；中间深色级间段连接两级，并容纳二级喷管。底部可查看所选一级的四个或两个喷口。</p><p>展开部件后可观察载荷适配器、级间接口、喷管曲面、管路和紧固件。涂装与细节是本项目原创教学造型，未复刻某一真实型号；不代表新增发动机、推进能力或回收装置。</p><a href={appearanceUrl} download="火箭外形与查看说明.md">下载外形说明与对照记录</a></details>
    <section className="vehicle-results" aria-label="当前配置计算结果" aria-live="polite">
      <h3>这套方案会怎样？</h3><dl>
        <div><dt>整箭初始质量</dt><dd data-vehicle-mass>{(vehicle.wetKg / 1000).toFixed(2)} <small>t</small></dd></div>
        <div><dt>海平面推重比</dt><dd data-vehicle-twr>{vehicle.twr.toFixed(2)}</dd></div>
        <div><dt>推进剂总量</dt><dd>{(vehicle.fuelKg / 1000).toFixed(1)} <small>t</small></dd></div>
        <div><dt>理想真空速度增量</dt><dd data-vehicle-dv>{(vehicle.idealDeltaVMS / 1000).toFixed(2)} <small>km/s</small></dd></div>
      </dl>
      {vehicle.canApply ? <p className="vehicle-check-pass">静态检查通过 · 可设为待发射配置。是否能入轨仍需飞行验证。</p> : <ul className="vehicle-check-block">{vehicle.issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}
      <details className="vehicle-explanation"><summary>参数如何计算？有什么限制？</summary><p>质量包含两级结构、所选发动机的质量差、推进剂、600 kg 整流罩及载荷。推重比用一级海平面推力除以整箭重量；地表重力按球对称 μ/R² 估算。</p><p>理想速度增量使用两级火箭方程：一级燃尽后丢弃一级干质量，整流罩保留至二级燃尽。采用真空比冲，不计重力、空气阻力和转向损失；它不是当前速度，也不能直接代表入轨能力。比冲换算使用标准重力 9.80665 m/s²。</p><p>发动机与结构参数都是教学设定，未绑定真实型号。组装记录不会启动燃烧或消耗推进剂。</p><a href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/" target="_blank" rel="noreferrer">NASA · 理想火箭方程 ↗</a><a href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/thrust-to-weight-ratio/" target="_blank" rel="noreferrer">NASA · 推重比 ↗</a></details>
    </section>
    <div className="vehicle-save-state" role="status">{status || (dirty ? '草稿已修改，尚未保存。' : '基准方案已就绪。')}{dirty && status && <span>当前修改尚未保存。</span>}</div>
    <div className="vehicle-actions"><div><button onClick={onSave}>保存草稿</button><button onClick={onLoad}>读取保存</button><button onClick={onReset}>恢复基准</button></div><button className="vehicle-apply" onClick={onApply} disabled={!vehicle.canApply}>应用配置并查看发射台 →</button><small>应用后，进入底部「03 检查点火」进行离台试飞。</small></div>
  </div>;
}
