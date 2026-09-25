import {spinOrbitProgress,type SpinOrbitBody} from '../data/spinOrbit';
export function SpinOrbitReadout({body,now,epoch,compact=false}:{body:SpinOrbitBody;now:number|null;epoch:number|null;compact?:boolean}){
 if(now===null||epoch===null)return null;const p=spinOrbitProgress(body,now,epoch);
 return <aside className={compact?'spin-orbit-inset':'spin-orbit-readout'} data-spin-orbit={compact?'inset':'detail'}>
 <strong>{body==='moon'?'月球 · 1:1 同步自转':'水星 · 3:2 自转—公转共振'}</strong>
 <p>距课程起点 {p.days.toFixed(2)} 天</p>
 <dl><div><dt>参考模型自转</dt><dd data-spin-count>{p.spins.toFixed(2)} 圈</dd></div><div><dt>按平均公转周期折算</dt><dd data-orbit-count>{p.meanOrbits.toFixed(2)} 圈</dd></div></dl>
 <small>实际位置来自历表；公转计数非实际扫角或过点次数。向前后切换日期可出现负数。</small>
 {!compact&&<><p>模型自转周期约 {p.spinDays.toFixed(3)} 天，资料平均公转周期约 {p.orbitDays.toFixed(3)} 天。计数用于比较长期周期，不强迫历表轨道匀速，也不人为校正为精确整数。</p><p>{body==='moon'?'粉色箭头沿月球本体参考方向，随既有姿态自转；青色箭头始终指向固定空间方向作对照。看粉色方向绕空间转动，同时大致朝向地球。参考方向不是命名地标，不是高精度月球天平动观测。':'粉色方向固定在水星本体上。点击起点后一个平均公转周期，比较约 1.5 圈自转；两个平均公转周期后约 3 圈。它不是同一面始终朝着太阳。'}</p><p>自转使用原有 NAIF 线性 W 与静态极轴近似，未积分潮汐力矩、耗散或共振捕获过程；真实轨道有偏心率与摄动。方向标记、尺寸和距离为观察处理，纹理不是当天实拍。</p></>}
 </aside>;
}
