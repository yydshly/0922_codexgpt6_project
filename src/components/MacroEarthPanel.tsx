import {useEffect,useRef,useState} from 'react';
import {publicAsset} from '../data/publicAsset';
import type {CloudStatus,EarthAppearance} from './macroEarth';
export function MacroEarthPanel({options,status,enabled,onClouds,onAtmosphere,onRetry,onFocus}:{options:EarthAppearance;status:CloudStatus;enabled:boolean;onClouds:()=>void;onAtmosphere:()=>void;onRetry:()=>void;onFocus:()=>void}){
 const panel=useRef<HTMLElement>(null);
 const [focusRequest,setFocusRequest]=useState(0);
 useEffect(()=>{if(focusRequest)panel.current?.scrollIntoView({block:'start'});},[focusRequest]);
 return <section ref={panel} className="panorama-families panorama-earth" aria-label="地球云层与大气">
  <h3>地球 · 表面、云层与大气</h3><p>蓝色海洋和陆地在表面；白色云图与薄蓝大气分别绘制。靠近后逐层开关，比较它们的作用。</p>
  <button disabled={!enabled} onClick={()=>{onFocus();setFocusRequest(v=>v+1);}}>靠近地球看云与大气</button>
  <div className="panorama-family-toggles"><label><input type="checkbox" checked={options.clouds} onChange={onClouds}/>显示独立云层</label><label><input type="checkbox" checked={options.atmosphere} onChange={onAtmosphere}/>显示薄层大气</label></div>
  <p role="status">{!enabled?'等待真实地球历表。':status==='loading'?'正在读取本地静态云图…':status==='error'?'云图未能加载；地球表面和大气仍可观察。':options.clouds?'静态云图已加载，不代表所选日期的天气。':'独立云层已关闭，便于观察表面贴图。'}</p>
  {status==='error'&&<button onClick={onRetry}>重试静态云图</button>}
  <details><summary>这些效果从哪里来</summary><p>云层复用主观测的 Solar System Scope / INOVE 静态云图（CC BY 4.0，基于 NASA 资料）。云图随地球参考自转一起转动，没有实时气象或单独的风场演算。</p><p>蓝色边缘是薄球壳散射近似，太阳方向随地球位置更新；夜侧不会出现等亮光环。壳层厚度为辨识而设置，不能从画面量出实际大气高度。本全景未接入云影、天气变化和完整辐射传输。</p><p>效果共用于地球本体、地月家族和近地空间视角；不会改变地球物理半径、历表或模拟。磁层与辐射带是另一类近地空间结构，不是这层大气。</p><a href={publicAsset('/textures/sources.json')} target="_blank" rel="noreferrer">静态贴图来源、许可与文件记录 ↗</a></details>
 </section>;
}
