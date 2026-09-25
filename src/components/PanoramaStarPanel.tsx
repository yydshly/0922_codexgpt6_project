import type {StarCatalogue} from '../data/starCatalogue';
import {starLabel} from '../data/starCatalogue';
import {publicAsset} from '../data/publicAsset';
export function PanoramaStarPanel({data,error,enabled,selected,onEnabled,onRetry,onInspect}:{data:StarCatalogue|null;error:string;enabled:boolean;selected:number|null;onEnabled:()=>void;onRetry:()=>void;onInspect:(hip:number)=>void}){
 const star=data?.sky.find(s=>s.hip===selected);
 return <section data-panorama-stars className="stellar-catalogue" aria-label="主全景星表背景"><h3>主全景的星空从哪里来？</h3>
 <label><input type="checkbox" checked={enabled} onChange={onEnabled}/>显示星表背景</label>
 <p role="status">{error?'星表读取失败，背景暂空；没有替换成随机星点。':data?`${data.sky.length.toLocaleString('zh-CN')} 个亮星方向 · Hipparcos-2 · J1991.25`:'正在读取本地恒星星表…'}</p>{error&&<button onClick={onRetry}>重试背景星表</button>}
 <p>点击画布上的背景星点查询 HIP 编号。星位来自目录，亮度与点大小按 Hp 星等作显示增强，统一蓝白色；不是恒星本体大小，也不是完整恒星普查。</p>
 {star&&<div data-background-star-readout><h4>{starLabel(star.hip)}</h4><p>赤经 {(star.ra*180/Math.PI).toFixed(6)}° · 赤纬 {(star.dec*180/Math.PI).toFixed(6)}°（ICRS）</p><p>Hp 星等 {star.hp.toFixed(3)} · 固定星表时刻 J1991.25</p><button onClick={()=>onInspect(star.hip)}>在恒星视图查看此星</button></div>}
 <p>方向已转到太阳系使用的 J2000 黄道坐标。背景只随镜头平移保持远方方向，不附带恒星距离；它不是太阳系外的一层实体球壳。独立运动课、场与粒子原理图及历史窗口暂隐此背景，避免混用参照系。</p>
 <p>主时间轴不推进星位；未加入自行、视差、光行差或地面观测地点。它是有来源的固定方向背景，不是所选日期的实况夜空。</p>
 <a href={publicAsset('/data/stars/provenance.json')} target="_blank" rel="noreferrer">目录版本、筛选与文件校验 ↗</a><br/><a href={publicAsset('/data/stars/hip2-subset.json')} target="_blank" rel="noreferrer">下载带 HIP 编号的星表子集 ↗</a><br/><a href={publicAsset('/data/stars/panorama-validation.json')} target="_blank" rel="noreferrer">方向交叉检查与逐星结果 ↗</a><br/><a href="https://ssd.jpl.nasa.gov/horizons/manual.html" target="_blank" rel="noreferrer">JPL 坐标说明 ↗</a>
 </section>;
}
