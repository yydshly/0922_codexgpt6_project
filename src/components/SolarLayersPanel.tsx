import {publicAsset} from '../data/publicAsset';
import {SOLAR_LESSONS,SOLAR_LAYER_SOURCES,matchesSolarLesson,type SolarLesson} from '../data/solarLayers';
import type {PhenomenonParts} from '../data/phenomenonParts';
import './SolarLayersPanel.css';
export function SolarLayersPanel({parts,enabled,onLesson,onActivities}:{parts:PhenomenonParts;enabled:boolean;onLesson:(id:SolarLesson)=>void;onActivities:()=>void}){
 const current=SOLAR_LESSONS.find(s=>matchesSolarLesson(parts,s.id));
 return <section className="solar-layers-guide" aria-label="太阳分层与活动导览" data-solar-layers>
 <h3>由内向外，认识太阳大气</h3><p>从可见表面开始，逐层叠加，再区分表面活动。每一步都作用于当前全景。</p>
 <div className="solar-layer-steps" role="group" aria-label="太阳分层观察顺序">{SOLAR_LESSONS.map(s=><button key={s.id} disabled={!enabled} aria-pressed={matchesSolarLesson(parts,s.id)} style={{borderLeftColor:s.color}} onClick={()=>onLesson(s.id)}>{s.title}</button>)}</div>
 <p role="status">{!enabled?'请先开启阶段 07 与太阳活动图层。':current?`正在观察：${current.title}`:'自定义组合 · 下方可分别开关'}</p>
 {current&&<p className="solar-layer-reading">{current.text}</p>}
 <p className="solar-layer-boundary">层厚、间距、颜色与亮度均为辨识而增强；不是按公里比例绘制的大气剖面。太阳没有这些硬质球壳，日冕也没有这里绘制的固定外沿。</p>
 <button disabled={!enabled} onClick={onActivities}>对照耀斑与 CME</button>
 <details><summary>四种活动有什么不同？</summary><dl><dt>黑子</dt><dd>仍在发光的较冷区域；画面上的暗斑不是孔洞。</dd><dt>日珥</dt><dd>被磁场支撑的等离子体结构；这里显示静态拱环示例，不计算磁场，也不表示每个日珥都爆发。</dd><dt>耀斑</dt><dd>辐射突然增强，以贴在表面的亮斑示意；不是一个飞出的白球。</dd><dt>CME</dt><dd>携带磁场的等离子体向外抛射，以扩展云团示意；与耀斑可相关但不是同一现象。</dd></dl>
 <p>新增黑子与日珥固定用于辨认，不从观测日期推算活动位置和数量，也不模拟差异自转。耀斑与 CME 使用下方独立“现象示意进度”，不代表同一次实测爆发。</p></details>
 <details><summary>分层依据与显示边界</summary>{SOLAR_LESSONS.map(s=><p key={s.id}><strong>{s.title}：</strong>{s.text}</p>)}<p>本轮只展开光球向外的大气；太阳核心、辐射区和对流区没有伪装成已实现的内部剖面。</p><a href={publicAsset('/data/solar-atmosphere/manifest.json')} target="_blank" rel="noreferrer">本地来源登记与示意尺度说明 ↗</a>{SOLAR_LAYER_SOURCES.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a>)}</details>
 </section>;
}
