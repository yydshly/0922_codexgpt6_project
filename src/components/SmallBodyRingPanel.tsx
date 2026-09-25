import {CHARIKLO_RINGS,type SmallRingChoices} from '../data/smallBodyRings';
import {publicAsset} from '../data/publicAsset';
import './SmallBodyRingPanel.css';
export function SmallBodyRingPanel({choices,enabled,ready,active,status,onChange,onLocate,onStages}:{choices:SmallRingChoices;enabled:boolean;ready:boolean;active:boolean;status:string;onChange:(key:keyof SmallRingChoices)=>void;onLocate:()=>void;onStages:()=>void}){
 return <section className="small-body-rings" aria-label="女凯龙星双环" data-small-rings>
  <small>R03 · 小天体环</small><h3>小天体也有环</h3>
  <p>女凯龙星已在主全景中。靠近它，比较围绕本体的两条窄环与绕太阳的参考轨道。</p>
  <button disabled={enabled&&!ready} onClick={enabled?onLocate:onStages}>{enabled?'定位女凯龙星双环':'开启阶段 03 / 04'}</button>
  <p role="status">{status}{active?' · 当前观察女凯龙星':''}</p>
  <fieldset disabled={!enabled}><legend>主全景中的环</legend>
   <label><input type="checkbox" checked={choices.inner} onChange={()=>onChange('inner')}/>内环 C1R</label>
   <label><input type="checkbox" checked={choices.outer} onChange={()=>onChange('outer')}/>外环 C2R</label>
   <label><input type="checkbox" checked={choices.enhanced} onChange={()=>onChange('enhanced')}/>环宽 ×2（显示增强）</label>
  </fieldset>
  <p className="small-ring-scale">{choices.enhanced?'环宽放大两倍；中心半径与环间距未整体放大。':'本体参考半径、环半径与环宽使用同一局部比例。'} 整个系统在全景中已放大，不能与到太阳的距离直接比较。</p>
  <details open={active}><summary>尺寸、证据与显示边界</summary>
   <table><caption>2014 年发现论文的近似参考尺寸</caption><thead><tr><th>环段</th><th>距本体中心</th><th>径向宽度</th></tr></thead><tbody>{CHARIKLO_RINGS.bands.map(b=><tr key={b.id}><th>{b.name}</th><td>{b.radiusKm} km</td><td>约 {b.widthKm} km</td></tr>)}</tbody></table>
   <p>本体球形参照半径为 124 ± 9 km，来自同一论文，不是精确形状；与参数卡保留的其他文献有效直径估计不同。参考双环之间约有 9 km 间隙。</p>
   <p>环是物质分布，不是实心圆盘，也不是轨道辅助线。2013 年的恒星掩星观测提供了双环证据；本页三维图不是直接拍摄照片。</p>
   <p>本体位置随当前历表运动；环面朝向、颜色和亮度为示意，没有模拟环粒子公转，也不表示当天姿态。资料版本固定为 2014 年参考模型，并不宣称为最新完整环系。</p>
   {CHARIKLO_RINGS.sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>)}
   <a href={publicAsset('/data/rings/chariklo.json')} target="_blank" rel="noreferrer">查看保存的参数、版本与边界 ↗</a>
  </details>
 </section>;
}
