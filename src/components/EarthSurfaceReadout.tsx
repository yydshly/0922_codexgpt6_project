import {useEffect,useState,type RefObject} from 'react';
import type {EarthDetailState} from './earthSurfaceDetail';

const labels:Record<EarthDetailState,string>={basic:'地球表面 · 基础贴图',loading:'地球近景细节读取中 · 基础画面可用',ready:'地球表面 · 8K 静态贴图',fallback:'近景细节暂不可用 · 已保留基础贴图',limited:'当前设备使用基础贴图'};
export function EarthSurfaceReadout({host}:{host:RefObject<HTMLElement|null>}) {
  const [state,setState]=useState<EarthDetailState>('basic');
  useEffect(()=>{
    const element=host.current;if(!element)return;
    const read=()=>setState((element.querySelector('canvas')?.dataset.earthSurfaceDetail as EarthDetailState)||'basic');
    const observer=new MutationObserver(read);observer.observe(element,{subtree:true,childList:true,attributes:true,attributeFilter:['data-earth-surface-detail']});read();
    return()=>observer.disconnect();
  },[host]);
  return <small className="earth-surface-readout" data-earth-detail={state} role="status" title="地表贴图来自本站文件，近景按需加载。云图仍为静态资料，不表示当前天气；未提供地形瓦片。">{labels[state]}{state==='fallback'&&<button type="button" onClick={()=>host.current?.querySelector('canvas')?.dispatchEvent(new Event('retry-earth-detail'))}>重试近景贴图</button>}</small>;
}
