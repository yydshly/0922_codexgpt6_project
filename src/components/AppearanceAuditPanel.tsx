import {useId,useState} from 'react';
import {APPEARANCE_OBJECTS,surfaceNotes} from '../data/appearanceAudit';
import {PHYSICAL_SOURCE} from '../data/catalog';
import {publicAsset} from '../data/publicAsset';
import {RotationNote} from './RotationNote';
import reportUrl from '../../docs/R04-APPEARANCE.md?url';
export function AppearanceAuditPanel(){
 const [selected,setSelected]=useState('sun');const id=useId();
 const entry=APPEARANCE_OBJECTS.find(b=>b.id===selected)!;
 return <details className="panorama-families appearance-audit" data-appearance-audit><summary>外观与参数核对 · 哪些真实，哪些示意？</summary>
 <p>位置真实不代表表面全部实测。本轮逐项登记太阳、八大行星和 20 颗核心卫星，共 {APPEARANCE_OBJECTS.length} 个对象；其他 7 颗已接入卫星的形状与姿态仍按各自系统说明。此清单不会新增天体或切换镜头。</p>
 <label htmlFor={id}>查阅对象</label><select id={id} value={selected} onChange={e=>setSelected(e.target.value)}>{['恒星','行星','核心卫星'].map(group=><optgroup key={group} label={group}>{APPEARANCE_OBJECTS.filter(b=>b.group===group).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</optgroup>)}</select>
 <article aria-live="polite"><h3>{entry.name} · 外观依据</h3><p>参考半径：{entry.radiusKm.toLocaleString('zh-CN',{maximumFractionDigits:4})} km。{entry.moon?'由 PCK 三轴半径取体积等效半径，不代表已重建不规则形状。':entry.id==='sun'?'采用名义太阳半径，不是当天测量。':'采用平均半径；当前绘制理想球体，未还原扁率。'}</p>
 <p>{entry.body?surfaceNotes[entry.body.id]:entry.id==='enceladus'?'全景本体是颜色球，近景可展开喷流与内部结构示意。内部层厚、喷流粒子及朝向不代表当日实测；地下海洋是观测支持的推断。':'全景使用颜色球形标记，目前没有实测表面纹理和自转姿态；尺寸与轨道参数不等于外观已经还原。'}</p>
 {entry.body?<RotationNote body={entry.body}/>:<p>精细卫星视图使用程序材质和“朝向母星”的同步旋转近似，极轴取瞬时轨道法线；不等于完整 IAU 姿态，不计算精确天平动。没有把公转周期冒充独立测量的自转周期。</p>}
 </article>
 <details><summary>昼夜、大小与资料边界</summary><p>全景光源在太阳方向，另加辅助环境光方便看清背光侧；局部距离放大使卫星照明近似。没有全景食影、互相遮光或真实曝光模拟。太阳自行发光，不适用行星式昼夜。</p><p>全景球体大小与间距分别调整。比较真实大小请用“天体大小比较”；对照距离请用“尺度与距离”。地球云层和光晕不计入参考半径。比较窗口采用固定灯光、朝向，不对应观测日期。</p><p>行星与月球纹理由 Solar System Scope / INOVE 提供（CC BY 4.0），包含加工与重建，均非实时影像；程序材质只用于辨识，不能当作探测器测绘。</p></details>
 <p><a href={PHYSICAL_SOURCE} target="_blank" rel="noreferrer">JPL 行星物理参数 ↗</a> · <a href={entry.moon?.parameterSourceUrl??entry.body!.sourceUrl} target="_blank" rel="noreferrer">当前对象参数来源 ↗</a></p>
 <p><a href={publicAsset('/textures/sources.json')} target="_blank" rel="noreferrer">贴图来源、许可与文件校验 ↗</a> · <a href={reportUrl} download="R04外观核对与验收.md">下载核对记录 ↗</a></p>
 </details>;
}
