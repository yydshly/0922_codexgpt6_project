import integrationReport from '../../docs/MAIN-SCENE-INTEGRATION.md?url';
import {MACRO_LAYERS,type MacroLayerId} from '../data/macroLayers';
import {INTEGRATED_ITEMS,type IntegratedId} from '../data/integratedScene';
import {presenceText,type SceneSnapshot} from './scenePresence';
export function SceneInventory({snapshot,onLocate,onPhenomenon,onHistory,status,phenomenonStatus,ringsStatus}:{snapshot:SceneSnapshot;ringsStatus:string;status:(id:MacroLayerId)=>string;phenomenonStatus:(id:IntegratedId)=>string;onLocate:(id:MacroLayerId|'sun'|'rings')=>void;onPhenomenon:(id:IntegratedId)=>void;onHistory:()=>void}){
 return <section className="scene-inventory" aria-label="实际场景清单"><h2>全景里有什么？</h2><p>状态来自当前三维场景。视野外仍然存在；靠近展开细节。定位只移动镜头，周边元素保留。</p><p className="scene-inventory-note">“视野内”表示图形与镜头范围相交，小尺寸或遮挡仍可能难以辨认。点云和空间现象是示意，奥尔特云是推断。</p>
 <div className="scene-inventory-row" data-scene-item="sun"><span>太阳本体<small>{presenceText(snapshot,'sun')}</small></span><button onClick={()=>onLocate('sun')}>定位</button></div>
 {MACRO_LAYERS.map(item=><div className="scene-inventory-row" data-scene-item={item.id} data-rendered={snapshot[item.id]?.rendered??0} key={item.id}><span>{item.name}<small>{status(item.id)}</small></span><button onClick={()=>onLocate(item.id)}>定位 / 展开</button></div>)}
 <div className="scene-inventory-row" data-scene-item="rings"><span>四大巨行星环<small>{ringsStatus}</small></span><button onClick={()=>onLocate('rings')}>定位土星环</button></div>
 {INTEGRATED_ITEMS.map(item=><div className="scene-inventory-row" data-scene-item={item.id==='dust'?'stream':item.id} data-rendered={snapshot[item.id==='dust'?'stream':item.id]?.rendered??0} key={item.id}><span>{item.title}<small>{phenomenonStatus(item.id)}</small></span><button onClick={()=>onPhenomenon(item.id)}>定位 / 控制</button></div>)}
 <div className="scene-inventory-row" data-scene-item="historical"><span>2I/Borisov<small>历史场景 · 2019—2020</small></span><button onClick={onHistory}>切换历史</button></div>
 <a href={integrationReport} download="主全景整合与验收.md">查看本次整合范围与验收说明 ↗</a><p>背景装饰星点不是实测星空；邻星和星系在顶部的宇宙尺度页解释，不摆进太阳系内部。</p></section>;
}
