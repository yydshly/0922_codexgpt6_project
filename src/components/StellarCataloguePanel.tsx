import starValidation from '../../public/data/stars/validation.json';
import {useState} from 'react';
import {starDistance,starsForView,starLabel,starName,STAR_IDENTITIES,STELLAR_GUIDE_HIP,canShowStarInSpace,type StarCatalogue,type StellarView} from '../data/starCatalogue';
import './StellarCataloguePanel.css';
export function StellarCataloguePanel({data,error,retry,view,onView,selected,onSelect,onReset,onGuide}:{data:StarCatalogue|null;error:string;retry:()=>void;view:StellarView;onView:(v:StellarView)=>void;selected:number|null;onSelect:(id:number|null)=>void;onReset:()=>void;onGuide:(step:0|1|2)=>void}){
 const [query,setQuery]=useState('');const stars=starsForView(data,view,selected);
 const matches=stars.filter(s=>`${starLabel(s.hip)} ${STAR_IDENTITIES[s.hip]?.english??''}`.toLowerCase().includes(query.trim().toLowerCase()));const current=stars.find(s=>s.hip===selected);
 const visibleMatches=matches.slice(0,80);const options=current&&!visibleMatches.includes(current)?[current,...visibleMatches]:visibleMatches;
 const measured=data?.nearby.find(s=>s.hip===selected);const extra=view==='sky'&&current&&!data?.sky.some(s=>s.hip===selected);
 const spaceAllowed=canShowStarInSpace(data,selected);
 const step=view==='space'&&selected===null?0:selected===STELLAR_GUIDE_HIP?(view==='space'?1:2):null;
 return <section className="stellar-catalogue" data-star-panel aria-label="真实恒星目录">
 <h3>先跟着一颗星，看懂远近与方向</h3>
 <p>把太阳当作家的位置。先从外面看它与邻星的距离，再回到太阳附近看同一颗星的方向。</p>
 <nav className="stellar-guide" aria-label="恒星观察三步引导">{(['找到太阳','看邻星距离','回到太阳看它'] as const).map((label,i)=><button key={label} disabled={!data} aria-current={step===i?'step':undefined} onClick={()=>{setQuery('');onGuide(i as 0|1|2);}}><b>{i+1}</b><span>{label}</span></button>)}</nav>
 <div className="stellar-location" role="status"><strong>{view==='space'?'你在太阳系外，观察太阳与邻星':'你在太阳附近，朝外看星空'}</strong><p>{current?`正在看：${starLabel(current.hip)}`:view==='space'?'黄色点是太阳；周围蓝白点是其他恒星。':'你从太阳附近向外看，太阳不在这片星空里。'}{measured&&` · 距太阳约 ${starDistance(measured).toFixed(2)} 光年`}</p><small>{view==='space'?'拖动：从不同方向绕着看。黄线连接太阳与所选星，表示距离，不是轨道。':'拖动：转头看其他方向。光点看着挨得近，不代表它们在空间里也靠近。'}</small></div>
 {step===0&&<p>下一步选择“看邻星距离”，同时找到太阳和波江座 ε。</p>}
 {step===1&&<p>记住黄色连线两端。下一步回到太阳看它：星星没换，只换了观察位置。</p>}
 {step===2&&measured&&<p>现在高亮的仍是波江座 ε。画面只表达它在哪个方向；约 {starDistance(measured).toFixed(2)} 光年的距离来自测距资料，不能从亮点大小看出来。</p>}
 <div className="stellar-actions"><button disabled={!data||!spaceAllowed} aria-pressed={view==='space'} onClick={()=>{onView('space');setQuery('');}}>空间中的邻星</button><button disabled={!data} aria-pressed={view==='sky'} onClick={()=>{onView('sky');setQuery('');}}>从太阳看星空</button><button disabled={!data} onClick={onReset}>重新对准当前目标</button></div>
 {!spaceAllowed&&<p role="status">所选星不在本页 32 个测距样本中，暂不能显示它的空间远近。可重新开始三步引导，或清除选择查看邻星总览。</p>}
 <p className="stellar-note">固定星表时刻 J1991.25 · 星点大小增强 · 不是今晚地面星图</p>
 {!data?<div role="status">{error||'正在读取本地 Hipparcos 恒星目录…'}{error&&<button onClick={retry}>重试恒星目录</button>}</div>:<>
 {current&&<article data-star-readout><h4>{starLabel(current.hip)}</h4>{STAR_IDENTITIES[current.hip]&&<><p>{STAR_IDENTITIES[current.hip].intro}</p><a href={STAR_IDENTITIES[current.hip].source} target="_blank" rel="noreferrer">名称与编号：SIMBAD ↗</a></>}
 {extra&&<p className="stellar-note">额外标出所选邻星的方向，未计入 2,936 个亮星。高亮仅用于定位，不表示肉眼可见。</p>}
 <details><summary>展开坐标、星等与来源</summary><dl><dt>赤经 / 赤纬（ICRS）</dt><dd>{(current.ra*180/Math.PI).toFixed(6)}° / {(current.dec*180/Math.PI).toFixed(6)}°</dd><dt>Hp 星等（越小越亮）</dt><dd>{current.hp.toFixed(4)} ± {current.hpError.toFixed(4)}</dd>{measured&&<><dt>视差 / 形式误差</dt><dd>{measured.parallax.toFixed(2)} ± {measured.parallaxError.toFixed(2)} 毫角秒</dd><dt>资料测距 / 一阶误差估计</dt><dd>{starDistance(measured).toFixed(3)} ± {(starDistance(measured)*measured.parallaxError/measured.parallax).toFixed(3)} 光年</dd></>}</dl><a href={`https://vizier.cds.unistra.fr/viz-bin/VizieR?-source=I/311/hip2&HIP=${current.hip}`} target="_blank" rel="noreferrer">核对这颗星的 CDS 原始记录 ↗</a></details></article>}
 <details className="stellar-browse"><summary>自由查找其他恒星 · {stars.length.toLocaleString()} 个标记</summary>
 <p>{view==='space'?`${data.nearby.length} 个测距样本 · 不是全部邻星`:`${data.sky.length.toLocaleString()} 个亮星方向${extra?' + 1 个所选邻星的辅助标记':''}`}</p>
 <label>名称或 HIP 编号<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="波江座、巴纳德、HIP 编号"/></label>
 <label>选择并定位<select aria-label="选择恒星" value={selected??''} onChange={e=>onSelect(e.target.value?Number(e.target.value):null)}><option value="">清除选择</option>{options.map(s=><option key={s.hip} value={s.hip}>{starLabel(s.hip)}{view==='space'?` · ${starDistance(s).toFixed(2)} 光年`:` · Hp ${s.hp.toFixed(2)}`}</option>)}</select></label><small>{matches.length} 个匹配{matches.length>80?' · 列表先显示前 80 个，可输入名称或编号查找全部目录':' · 也可点击主画面的星点'}</small></details>
 </>}
 <details><summary>数据来源、筛选与画面含义</summary><p data-star-validation>已与 ESA 1997 原版星表核对 {starValidation.count} 个同历元样本，最大方向差 {starValidation.maxSeparationMas.toFixed(3)} 毫角秒。两版来自同一观测任务，是独立处理版本的交叉检查；不是另一台望远镜的测量，也不代表当前时刻精度。</p><a href={`${import.meta.env.BASE_URL}data/stars/validation.json`} target="_blank" rel="noreferrer">下载逐星核对结果与原始资料链接 ↗</a><p>来源：van Leeuwen 2007，Hipparcos 新归算 I/311，CDS 2008-09-16 修正版。参考系 ICRS，时刻 J1991.25；采用单星五参数解、位置形式误差小于 2 毫角秒及拟合质量筛选。不是 Gaia 最新普查，也不是完整近邻目录。</p><p>邻星取通过筛选、15 秒差距以内且视差相对形式误差不超过 5% 的最近 32 条记录。距离用 1000 / 视差（毫角秒）换算为秒差距；误差未包括未知系统偏差。严格筛选会排除比邻星等对象，不代表它们不存在。</p><p>星空采用 Hp ≤ 6、星等误差 ≤ 0.02 的子集。Hp 是 Hipparcos 波段，不能当成 V 星等；亮度和点大小仅作可辨识映射，颜色统一，不模拟温度和真实星体半径。赤道圈、坐标方向及连线是辅助线，不是实体。</p><p>以太阳为原点是光年尺度近似，未处理太阳与太阳系质心之差、自行、年周视差、岁差章动、光行差、地面经纬度或地平遮挡。银河与星系页仍是结构模型；太阳系主全景也使用此亮星子集，经固定黄赤坐标旋转后作为方向背景；精细观测和星系概念镜头的装饰星点不在此保证内。</p><a href="https://heasarc.gsfc.nasa.gov/W3Browse/all/hipnewcat.html" target="_blank" rel="noreferrer">NASA HEASARC 字段说明 ↗</a><br/><a href={`${import.meta.env.BASE_URL}data/stars/provenance.json`} target="_blank" rel="noreferrer">下载来源、版本与文件校验信息 ↗</a>
 </details>
 </section>;
}
export function StellarViewNotice({data,view,selected}:{data:StarCatalogue|null;view:StellarView;selected:number|null}){
 const measured=data?.nearby.find(s=>s.hip===selected);
 return <small data-stellar-location>{view==='space'?'观察位置：太阳系外 · 从外面看远近':'观察位置：太阳附近 · 向外看方向'}<br/>{selected?`目标：${starName(selected)}${measured?` · 资料距离 ${starDistance(measured).toFixed(2)} 光年`:''}`:view==='space'?'黄色点 = 太阳 · 蓝白点 = 邻近恒星':'从太阳附近向外看，太阳在观察位置'}</small>;
}
