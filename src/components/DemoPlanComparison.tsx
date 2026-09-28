import type { DemoStatus } from '../launch/fullFlightDemo';
import type { SatellitePlan } from '../launch/satellitePlan';
import type { DemoResult } from '../launch/demoComparison';

export function DemoPlanComparison({ demo, onPlan }: { demo: DemoStatus; onPlan: (plan: SatellitePlan) => void }) {
  const plans = ['unpowered', 'powered'] as const;
  const actual = (read: (r: DemoResult) => string) => plans.map(plan => <td key={plan}>{demo.results[plan] ? read(demo.results[plan]!) : '尚未完成'}</td>);
  return <details className="demo-comparison">
    <summary>对比 E01 / E02 · 方案与实际结果</summary>
    <p>两次演示采用同一出发日期和 500 kg 卫星基体；E02 额外携带离轨设备与燃料。过程耗时和终点不同，以下不是同一时刻的位置对比。</p>
    <table><caption>方案配置 · 发射前决定</caption><thead><tr><th scope="col">项目</th><th scope="col">E01 留轨</th><th scope="col">E02 离轨</th></tr></thead><tbody>
      <tr><th scope="row">发射载荷</th><td>500 kg</td><td>575 kg（增加 75 kg）</td></tr>
      <tr><th scope="row">卫星发动机</th><td>无</td><td>200 N · 40 kg 初始燃料</td></tr>
      <tr><th scope="row">业务结束后</th><td>隔离充电，电能收尾，观察留轨 10 分钟</td><td>保留控制电源，反向点火，储能处理，再入参考下降</td></tr>
      <tr><th scope="row">结果边界</th><td>仍在轨，未计算长期寿命</td><td>到 0 m 等效参考面；未判定全部烧毁或安全落地</td></tr>
    </tbody></table>
    <table data-demo-comparison><caption>本次会话已完成的运行结果</caption><thead><tr><th scope="col">实算记录</th><th scope="col">E01</th><th scope="col">E02</th></tr></thead><tbody>
      <tr><th scope="row">卫星最终时刻</th>{actual(r=>`T+${r.time.toFixed(1)} s`)}</tr>
      <tr><th scope="row">卫星最终高度</th>{actual(r=>`${(r.satelliteAltitudeM/1000).toFixed(2)} km`)}</tr>
      <tr><th scope="row">交付数据</th>{actual(r=>`${r.deliveredMB.toFixed(0)} MB`)}</tr>
      <tr><th scope="row">卫星点火耗油</th>{actual(r=>`${r.burnedKg.toFixed(2)} kg`)}</tr>
      <tr><th scope="row">卫星残余推进剂</th>{actual(r=>r.remainingFuelKg===null?'无推进系统':`${r.remainingFuelKg.toFixed(2)} kg`)}</tr>
      <tr><th scope="row">残余电能</th>{actual(r=>`${r.batteryWh.toFixed(1)} Wh`)}</tr>
      <tr><th scope="row">二级历史记录</th>{actual(r=>r.carrierTime===null?'无独立记录':`T+${r.carrierTime.toFixed(1)} s${r.carrierAltitudeM===null?'':` · ${(r.carrierAltitudeM/1000).toFixed(2)} km`}`)}</tr>
    </tbody></table>
    <p>只有实际跑完才填入结果；回看不会抹掉已完成的记录。结果保留至退出本次演示，未覆盖原任务存档。</p>
    <button onClick={()=>onPlan(demo.plan==='powered'?'unpowered':'powered')}>切换到 {demo.plan==='powered'?'E01':'E02'}，从头演示</button>
    <small>切换会放弃当前未完成的演示进度，并暂停在另一方案的起点。已完成结果继续保留。</small>
  </details>;
}
