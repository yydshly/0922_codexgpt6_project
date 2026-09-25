import {publicAsset} from '../data/publicAsset';
import type {ErosShapeChoices,ErosShapeData} from '../data/erosShape';
import './SmallBodyRingPanel.css';
export function ErosShapePanel({choices,data,error,status,enabled,ready,active,onChange,onLocate,onRetry,onBinary}:{choices:ErosShapeChoices;data:ErosShapeData|null;error:string;status:string;enabled:boolean;ready:boolean;active:boolean;onChange:(key:keyof ErosShapeChoices)=>void;onLocate:()=>void;onRetry:()=>void;onBinary:()=>void}){
 return <section className="small-body-rings" data-eros-shape aria-label="爱神星真实形状">
 <small>R04 · 从位置到本体形状</small><h3>爱神星并不是圆球</h3>
 <p>综合全景已接入 NEAR 探测影像重建的表面。先定位看轮廓，再与同体积球对照，最后查看模型网格。</p>
 <button disabled={enabled&&!ready} onClick={onLocate}>{enabled?'定位爱神星形状':'开启阶段 03'}</button><p role="status">{status}</p>
 {error&&<><p role="alert">{error}</p><button onClick={onRetry}>重试爱神星形状</button></>}
 <fieldset disabled={!enabled||!data}><legend>主全景中的形状对照</legend>
 <label><input type="checkbox" checked={choices.shape} onChange={()=>onChange('shape')}/>显示资料形状（关闭后看同体积球）</label>
 <label><input type="checkbox" checked={choices.wireframe} disabled={!choices.shape} onChange={()=>onChange('wireframe')}/>查看三角网格</label>
 </fieldset>
 <p className="small-ring-scale">本体已整体放大；三个方向使用同一比例。球形对照半径约 8.45 km，由此模型体积计算；参数卡的 8.42 km 来自另一份体积估计，二者不强行混用。</p>
 <details open={active}><summary>形状、自转与来源</summary>
 <p>档案版本 NEARMOD-EROS007790-200204，基准模型日期 2001-01-12。3,897 个顶点、7,790 个三角面；沿模型自身三轴的外包尺寸约 32.69 × 16.82 × 11.95 km，不是拟合椭球直径。</p>
 <p>轨道位置来自当前 JPL 历表；姿态采用形状档案的参考极轴与匀速自转式，周期约 5.2703 小时。随观测日期推进，暂停日期也停止自转。推算到当前日期并不等于当天姿态实测。</p>
 <p>形状是影像重建结果；颜色、表面材质和辅助光照为展示处理，没有实测表面贴图。此档案精简网格不代表精密地形。模型原点接近质心，档案说明为 50 米以内，并非严格重合。</p>
 <p>长条状的爱神星仍是一个天体。分离双体是两个天体相互绕转；接触双体的两叶相连，不能仅凭一个凹陷就判定形成过程。此处没有把爱神星标成接触双体。</p>
 <a href="https://science.nasa.gov/solar-system/kuiper-belt/arrokoth-2014-mu69/facts/" target="_blank" rel="noreferrer">NASA：接触双体实例 Arrokoth（阅读对照） ↗</a>
 <button onClick={onBinary}>对照分离双体：帕特罗克洛斯</button>
 <a href="https://sbnarchive.psi.edu/pds3/near/NEAR_A_5_COLLECTED_MODELS_V1_0/document/msieros.txt" target="_blank" rel="noreferrer">PDS：形状重建与参考姿态 ↗</a>
 <a href={publicAsset('/data/eros-shape/manifest.json')} target="_blank" rel="noreferrer">保存的版本、单位与原始文件校验 ↗</a>
 </details></section>;
}
