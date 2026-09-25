import {ENCELADUS_INTERIOR,type EnceladusChoices} from '../data/enceladusInterior';
import {publicAsset} from '../data/publicAsset';
import './SmallBodyRingPanel.css';
export function EnceladusPanel({choices,enabled,ready,active,status,error,onRetry,onLocate,onParent,onChange}:{choices:EnceladusChoices;enabled:boolean;ready:boolean;active:boolean;status:string;error:string;onRetry:()=>void;onLocate:()=>void;onParent:()=>void;onChange:(patch:Partial<EnceladusChoices>)=>void}){
 const observing=enabled&&ready&&active;
 const interiorVisible=observing&&choices.cutaway&&(choices.ice||choices.ocean||choices.core);
 return <section className="small-body-rings" data-enceladus aria-label="土卫二喷流与内部结构">
 <small>R04 · 从卫星表面到内部推断</small><h3>土卫二：冰壳下有什么？</h3>
 <p>先靠近看南极喷流，再打开内部示意，最后返回土星系统理解它的位置。都在当前全景内，位置随同一观测日期变化。</p>
 <button disabled={enabled&&!ready} onClick={onLocate}>{enabled?'靠近土卫二':'开启阶段 04'}</button><p role="status">{status}</p><p data-enceladus-view>{!observing?'当前未进入土卫二近景；下方保留的是显示设置，点击步骤进入观察。':interiorVisible?'正在观察内部剖示；层厚与颜色为教学比例。':choices.cutaway?'内部各层已关闭，当前显示本体位置标记。':choices.jets?'正在观察表面与喷流结构示意。':'当前只显示本体，喷流已关闭。'}</p>
 {error&&<><p role="alert">卫星历表读取失败；不使用旧位置显示喷流。</p><button onClick={onRetry}>重试土卫二历表</button></>}
 <fieldset disabled={!enabled||!ready}><legend>表面 → 内部</legend>
 <button aria-pressed={observing&&!choices.cutaway&&choices.jets} onClick={()=>{onChange({cutaway:false,jets:true});onLocate();}}>1 · 表面与喷流</button>{' '}
 <button aria-pressed={interiorVisible} onClick={()=>{onChange({cutaway:true,ice:true,ocean:true,core:true});onLocate();}}>2 · 打开内部剖示</button>
 <label><input type="checkbox" checked={choices.jets} onChange={()=>onChange({jets:!choices.jets})}/>南极喷流结构（静态示意）</label>
 <fieldset disabled={!choices.cutaway}><legend>内部层次 · 推断模型</legend>{(['ice','ocean','core'] as const).map((id,i)=><label key={id}><input type="checkbox" checked={choices[id]} onChange={()=>onChange({[id]:!choices[id]})}/>{['浅色：冰壳','蓝色：地下海洋','棕色：岩石核心'][i]}</label>)}</fieldset>
 <label><input type="checkbox" checked={!!choices.eRing} onChange={()=>onChange({eRing:!choices.eRing})}/>E 环冰粒区域（范围与密度示意）</label><button onClick={onParent}>3 · 返回土星系统</button>
 </fieldset>
 <p className="small-ring-scale">{active&&choices.cutaway?(choices.ice||choices.ocean||choices.core?'当前为内部剖示。':'内部各层已关闭，回到本体位置标记。'):'当前为外部观察；内部设置仅在土卫二近景展开。'} 层厚、缺口、颜色和喷流长度是教学比例。下方为示意南极，不代表当天极轴方向或喷发形态。</p>
 <details open={active}><summary>哪些看到了，哪些是推断？</summary>
 <p><strong>直接观测：</strong>卡西尼在南极裂隙附近观测到水蒸气与冰粒喷流。画面的点只是这些物质的结构示意，不是一点一颗实测粒子。</p>
 <p><strong>内部推断：</strong>全球海洋有卫星摆动、重力等测量支持，冰壳与岩核之间的内部结构并非相机透视照片；厚度随位置和模型变化，这里不标称精确尺寸。</p>
 <p><strong>与周围的关系：</strong>部分喷出物补给土星稀薄的 E 环；它不同于明亮的 A/B/C 主环。可打开 E 环区域示意或在物质联系中拉远观察；未计算逐粒子飞向环的路径。</p>
 <p>表面为示意颜色，没有地形贴图、真实虎纹裂隙或当前姿态重建；未计算潮汐加热、喷发速率或海洋流动，也不据此宣称发现生命。真实公转位置来自既有卫星历表。</p>
 {ENCELADUS_INTERIOR.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a>)}
 <a href={publicAsset('/data/enceladus-interior/manifest.json')} target="_blank" rel="noreferrer">本地来源登记与显示边界 ↗</a>
 </details></section>;
}
