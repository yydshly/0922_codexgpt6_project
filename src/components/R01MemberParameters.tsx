import { r01Parameters, TROJAN_CLASSIFICATION_SOURCE } from '../data/r01Members';
import { memberRelation } from '../ephemeris/memberRelation';
import { publicAsset } from '../data/publicAsset';
import type { ObjectState } from '../ephemeris/stateProvider';
import type { StateFrame } from '../types';
export function R01MemberParameters({id,state,frame}:{id:string;state?:ObjectState;frame:StateFrame|null}) {
 const params=r01Parameters(id);if(!params)return null;
 const trojan=id==='achilles'||id==='aneas';
 const relation=state&&frame?memberRelation(state,frame,trojan?'jupiter':'earth'):null;
 const value=(key:string)=>Number(params.elements.find(e=>e.name===key)!.value);
 return <section aria-label="小天体参考参数与关系">
  {(trojan||id==='eros')&&<dl>
   <div><dt>当前距{trojan?'木星中心':'地球中心'}</dt><dd>{relation?`${relation.distanceAu.toFixed(3)} AU`:'等待同日历表'}</dd></div>
   {trojan&&<div><dt>相对木星的日心方位角差</dt><dd>{relation?`${relation.longitudeDegrees.toFixed(2)}°`:'等待同日历表'}</dd></div>}
  </dl>}
  {trojan&&<p>方位角由当前日心位置投影到黄道面计算；正值为领先、负值为落后，范围 −180°～180°。它不是共振平均经度差，也不应恒定为 ±60°。<a href={TROJAN_CLASSIFICATION_SOURCE} target="_blank" rel="noreferrer">L4/L5 分组文献（第 917 页） ↗</a></p>}
  <details><summary>展开来源参数与适用范围</summary>
   <dl>
    <div><dt>参考公转周期</dt><dd>{(value('per')/365.25).toFixed(3)} 年</dd></div>
    <div><dt>轨道倾角（J2000 黄道）</dt><dd>{value('i').toFixed(3)}°</dd></div>
    <div><dt>近日 / 远日距离</dt><dd>{value('q').toFixed(3)} / {value('ad').toFixed(3)} AU</dd></div>
    <div><dt>有效直径（原资料）</dt><dd>{params.diameter.value} ± {params.diameter.sigma} km</dd></div>
    <div><dt>参考自转周期（会合）</dt><dd>{params.rotation?.value??'未提供'} h</dd></div>
    <div><dt>GM（引力参数）</dt><dd>{params.gm?`${params.gm.value} km³/s²`:'本快照未提供'}</dd></div>
   </dl>
   <p>轨道参数是 JD {params.epochJdTdb} TDB 的日心瞬时椭圆参考值，非当前距离和未来精确周期。自转来自 SBDB 光变资料，本批不据此重建姿态或转动球体。</p>
   {id==='chariklo'&&<p>女凯龙星的直径是较早文献估计，不能等同最新形状模型；自转资料注明观测覆盖不足，周期可能有约 30% 偏差。环模型尚未接入。</p>}
   <p>直径出处：{params.diameter.ref}。{params.diameter.notes}</p>
   <p>自转出处：{params.rotation?.ref}。轨道解编号：{params.orbitSolution}。快照保存：{params.snapshotSavedAt.slice(0,10)}。</p>
   <a href={params.lookupUrl} target="_blank" rel="noreferrer">JPL SBDB：对象与物理参数 ↗</a>
   <a href={publicAsset('/data/small-bodies/physical-parameters.json')} target="_blank" rel="noreferrer">保存的参数、文献与源文件哈希 ↗</a>
  </details>
 </section>;
}
