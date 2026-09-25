import {orbitalComparison,resonanceReady,ORBIT_RESONANCE_SOURCE} from '../data/tidalModule';
import type {MacroMoon} from '../data/macroFamilies';
export function OrbitalResonanceReadout({now,epoch,states,compact=false}:{now:number|null;epoch:number|null;states:readonly MacroMoon[];compact?:boolean}){
 if(now===null||epoch===null)return null;const ready=resonanceReady(states);
 return <aside className={compact?'spin-orbit-inset':'spin-orbit-readout'} data-orbital-resonance={compact?'inset':'detail'}><strong>木星卫星 · 轨道共振</strong>
 {!ready?<p role="status">正在等待当前日期的三颗卫星历表，暂不显示计数。</p>:<><p>同一段时间的运行次数约 4 : 2 : 1</p><dl>{orbitalComparison(now,epoch).map(row=><div key={row.id}><dt>{row.name} · 平均周期 {row.days.toFixed(3)} 天</dt><dd data-orbital-count={row.id}>{row.turns.toFixed(2)} 圈</dd></div>)}</dl><small>计数为时间 ÷ 资料平均周期；不是历表实际扫角，不强制取整。</small></>}
 {!compact&&<><p>周期约为 1 : 2 : 4，运行次数约为 4 : 2 : 1。比较的是三颗卫星绕木星的轨道运动，区别于水星自身的自转—公转共振。木卫四不属于这组三体共振。</p><p>反复出现的引力作用使轨道相位关系受到约束，偏心率与潮汐形变也有关联。只看周期接近整数比不足以独立证明共振，还需检查共振角及长期行为；本课没有计算共振角振荡、捕获演化或潮汐热功率。</p><p>真实位置取同日 JPL 历表；轨道线是当期参考椭圆。周期资料为近似值，且实际轨道有进动和摄动，所以一个木卫三平均周期后计数可能约 4.04、2.01、1.00，不能强改成整数。</p><a href={ORBIT_RESONANCE_SOURCE} target="_blank" rel="noreferrer">NASA：木卫一、二、三的共振 ↗</a></>}
 </aside>;
}
