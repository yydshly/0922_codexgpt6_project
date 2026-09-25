import {seasonGeometry,noonAltitude} from '../data/seasons';
import type {StateFrame} from '../types';
export function SeasonReadout({frame,compact=false}:{frame:StateFrame|null;compact?:boolean}){
 const state=seasonGeometry(frame);if(!state)return null;
 return <aside className={compact?'season-inset':'season-readout'} data-season-readout={compact?'inset':'detail'}>
 <strong>南北半球 · 同日对照</strong>
 <p>太阳直射纬度约 <b data-solar-latitude>{Math.abs(state.declination).toFixed(1)}°{state.declination>=0?'N':'S'}</b></p>
 {[{name:'北纬 40°',lat:40,hours:state.north},{name:'南纬 40°',lat:-40,hours:state.south}].map(row=><div className="season-day" key={row.lat}>
 <span>{row.name} · 理想昼长 <b data-daylight={row.lat}>{row.hours.toFixed(1)} 小时</b></span>
 <div className="season-bar" aria-hidden="true"><i style={{width:`${row.hours/24*100}%`}}/></div>
 {!compact&&<small>当地太阳正午的几何太阳高度约 {noonAltitude(row.lat,state.declination).toFixed(1)}°</small>}
 </div>)}
 <p>日地距离 <b data-season-distance>{state.distanceAu.toFixed(4)} AU</b></p>
 <small>理想球面几何 · 非天气或日出预报</small>
 {!compact&&<><p>粉色轴指向参考北极，青线是固定黄道面的法线，两者夹角约 {state.tilt.toFixed(2)}°。白圈为赤道，金色箭头指光传播方向，表面金点是近似太阳直射点。</p><p>南北纬 40°只是同纬度对照，不代表所有地区或具体城市；黄色条为白昼，暗色条为黑夜。正午指各地太阳最高时刻，并非北京时间 12 点。</p><p>采用静态 J2000 极轴和同日太阳方向，忽略岁差章动、太阳视半径、大气折射与地形。昼长按太阳中心高于理想地平线计算，不是日出日落时刻；没有气温或气候模型。</p></>}
 </aside>;
}
