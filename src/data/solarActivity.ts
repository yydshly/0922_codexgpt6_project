export const SOLAR_ACTIVITY_LAYERS=[
 {id:'corona',name:'日冕',color:'#efae68',description:'太阳的外层大气，由炽热等离子体组成。光晕只帮助识别范围，不代表白光下随时可见的真实亮度。'},
 {id:'wind',name:'持续太阳风',color:'#dfbd81',description:'不断流向行星际空间的带电粒子流，不需要每次都先发生耀斑或物质抛射。点数与流动节奏是示意。'},
 {id:'flare',name:'太阳耀斑',color:'#fff0b7',description:'太阳活动区突然增强的辐射。画面的亮斑与射线用于表达能量释放，不是飞出的固体火球，也不复现观测波段。'},
 {id:'cme',name:'日冕物质抛射 · CME',color:'#f19378',description:'携带磁场的等离子体云团离开太阳并扩展。外形、朝向、大小和演示速度为示意，不表示某次真实事件。'},
] as const;
export type SolarActivityLayer=typeof SOLAR_ACTIVITY_LAYERS[number]['id'];
export type SolarActivityLayers=Record<SolarActivityLayer,boolean>;
export const defaultSolarActivityLayers=():SolarActivityLayers=>({corona:true,wind:true,flare:true,cme:true});
export const SOLAR_ACTIVITY_SOURCES=[
 {title:'NASA · 太阳耀斑与 CME 的区别',url:'https://science.nasa.gov/blogs/solar-cycle-25/2022/06/10/solar-flares-faqs/',note:'耀斑是辐射突然增强，CME 是等离子体与磁场云团；两者可相关，但不是同一种现象。'},
 {title:'NASA · 太阳风是什么',url:'https://science.nasa.gov/sun/what-is-the-solar-wind/',note:'太阳风将带电粒子与太阳磁场带入行星际空间。'},
 {title:'NASA · 太阳事实',url:'https://science.nasa.gov/sun/facts/',note:'日冕是太阳大气的外层，太阳风与日冕的外流有关。'},
 {title:'NASA SVS · 追踪太阳爆发',url:'https://svs.gsfc.nasa.gov/11737',note:'光从太阳到地球约 8 分钟；朝向地球的 CME 可需要约 1–3 天，实际时间依事件而异。图中不按这一速度比例播放。'},
];
export function solarDemoState(progress:number){
 const p=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0,u=Math.max(0,(p-.18)/.82);
 return {progress:p,cmeVisible:p>.18,cmeX:-2.8+11*u,cmeY:.2+1.2*u,cmeRadius:.25+2.4*u,flare:Math.max(0,1-Math.abs(p-.24)/.17),radiationTravel:Math.max(0,Math.min(1,(p-.15)/.26)),phase:p<.18?'背景太阳风':p<.38?'活动区辐射增强':p<.85?'云团离开太阳并扩展':'演示完成 · 可重播'};
}
/** Twenty display seconds per illustration. Not an astronomical propagation model. */
export function advanceSolarDemo(progress:number,elapsedSeconds:number){return Math.min(1,solarDemoState(progress).progress+Math.max(0,Number.isFinite(elapsedSeconds)?elapsedSeconds:0)/20);}
