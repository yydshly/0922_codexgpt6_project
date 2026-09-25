import {useId,useState} from 'react';
import {LOCK_SOURCE} from '../data/spinOrbit';
const STEPS=[
 {name:'引力差与形变',text:'母星对卫星近侧的引力强于远侧。相对于卫星中心，这种引力差产生潮汐形变；岩石天体也会形变，不必先有海洋。'},
 {name:'耗散与力矩',text:'以初始自转比公转快为例：形变响应并非瞬时，凸起可能偏离两体连线；母星对形变体的力矩可降低平均自转速度。内部形变耗散机械能为热，自转与轨道之间交换角动量。'},
 {name:'同步状态',text:'长期作用下，某些天体进入平均自转周期等于平均公转周期的 1:1 状态。同一面大致朝向母星，但它仍相对空间自转；偏心轨道下仍可能有天平动和耗散。不是所有天体都必然进入 1:1，水星就是不同共振的例子。'},
];
export function TidalMechanism(){
 const [step,setStep]=useState(0),id=useId().replace(/:/g,'');
 return <section className="tidal-mechanism" data-tidal-mechanism><h4>潮汐锁定如何形成</h4><p>主画面保留当天地月状态；下图解释历史过程，不把观测日期当成亿年演化时间。</p>
 <div className="environment-controls">{STEPS.map((s,i)=><button key={s.name} aria-pressed={step===i} onClick={()=>setStep(i)}>{i+1} · {s.name}</button>)}</div>
 <svg viewBox="0 0 360 210" role="img" aria-label={`${STEPS[step].name}：形变和距离均夸张的原理示意`}>
 <defs><marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#f3cf83"/></marker></defs>
 <circle cx="42" cy="106" r="30" fill="#386781"/><text x="42" y="160" textAnchor="middle">母星</text>
 <line x1="78" y1="106" x2="325" y2="106" stroke="#668994" strokeDasharray="5 5"/>
 <ellipse cx="256" cy="106" rx="62" ry="36" transform={`rotate(${step===1?-28:0} 256 106)`} fill="#e0c79524" stroke="#efcf8d" strokeWidth="2"/>
 <circle cx="256" cy="106" r="35" fill="#77858c"/><text x="256" y="176" textAnchor="middle">卫星 · 形变夸张</text>
 {step===0&&[[-21,46],[0,32],[21,20]].map(([offset,length])=><line key={offset} x1={256+offset} x2={256+offset-length} y1={85+offset} y2={85+offset} stroke="#f3cf83" strokeWidth="2" markerEnd={`url(#${id})`}/>)}
 <text x="180" y="22" textAnchor="middle">{step===0?'近侧引力较强，远侧较弱':step===1?'示例：较快自转时的偏移形变':'平均自转周期 ≈ 平均公转周期'}</text>
 <text x="180" y="200" textAnchor="middle">非历史实测形状 · 无演化时间比例</text>
 </svg><p data-tidal-explanation>{STEPS[step].text}</p>
 <p>图中没有计算潮汐力矩、材料黏弹性、耗散参数或锁定所需时间；不表示形变永远如此，也不表示所有角动量都变成热。</p>
 <a href={LOCK_SOURCE} target="_blank" rel="noreferrer">NASA：潮汐锁定的形成 ↗</a></section>;
}
