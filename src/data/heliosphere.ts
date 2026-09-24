/** Dimensionless teaching geometry: these radii are NOT AU or measured boundaries. */
export const HELIO_RADII={shock:5.4,pause:8} as const;
export const HELIO_LAYERS=[
 {id:'wind',name:'内部太阳风',color:'#f4c27c',description:'金色点表示向外流出的太阳风。这里只绘制终止激波以内的径向流段；点在边缘消失是绘图循环，不是被墙挡住。'},
 {id:'shock',name:'终止激波',color:'#eeb78a',description:'太阳风由超声速变为亚声速的过渡区，与地球附近的弓形激波不同。橙色轮廓不是固体球壳。'},
 {id:'sheath',name:'日鞘',color:'#b8a2dc',description:'终止激波与日球层顶之间的区域。紫色点提示减速、加热后的太阳风等离子体，不表示密度或湍流轨迹。'},
 {id:'pause',name:'日球层顶',color:'#80cbdc',description:'太阳风与外部星际介质相互作用形成的边界。实际位置随方向与时间变化；这里的球面只表达内外关系。'},
 {id:'medium',name:'外部星际介质',color:'#94aecf',description:'蓝灰色点提示恒星之间的稀薄物质。星际介质包含等离子体、中性气体和尘埃等，不是密集的星球群。'},
 {id:'neutrals',name:'进入的中性原子示例',color:'#a8ebc7',description:'部分星际中性原子能够进入日球层。绿色点的方向、速度和穿透比例为示意，不计算电离或电荷交换损失。'},
] as const;
export type HelioLayer=typeof HELIO_LAYERS[number]['id'];
export type HelioLayers=Record<HelioLayer,boolean>;
export const defaultHelioLayers=():HelioLayers=>Object.fromEntries(HELIO_LAYERS.map(l=>[l.id,true])) as HelioLayers;
export const helioProgress=(p:number)=>Math.max(0,Math.min(1,Number.isFinite(p)?p:0));
export const advanceHelioDemo=(p:number,seconds:number)=>helioProgress(helioProgress(p)+(Number.isFinite(seconds)?Math.max(0,seconds):0)/20);
const fract=(n:number)=>n-Math.floor(n);
export function helioWindPoint(index:number,p:number):[number,number,number]{
 const y=1-2*(index+.5)/240,a=index*2.399963,r=.8+fract(index*.381966+helioProgress(p)*2)*(HELIO_RADII.shock-.85),rad=Math.sqrt(Math.max(0,1-y*y));
 return [r*rad*Math.cos(a),r*y,r*rad*Math.sin(a)];
}
export function neutralPoint(index:number,p:number):[number,number,number]{
 return [-12+24*fract(index*.618034+helioProgress(p)),1.5+3*Math.sin(index*4.13),3*Math.cos(index*2.31)];
}
/** Remove one foreground quadrant only for reading; this is not a physical hole. */
export const inHelioCut=(x:number,z:number)=>x>0&&z>0;
export const HELIO_SOURCES=[
 {title:'NASA：太阳磁泡的边缘',url:'https://www.nasa.gov/missions/ibex/studying-the-edge-of-the-suns-magnetic-bubble/',note:'终止激波、日鞘、日球层顶及观测方式；不能把示意外形当成测得的完整边界。'},
 {title:'NASA：日球层与中性原子',url:'https://solarscience.msfc.nasa.gov/Heliosphere.shtml',note:'日球层分层及中性原子进入机制。该历史科普页的探测器任务时态不用于当前状态。'},
 {title:'NASA：旅行者星际任务',url:'https://science.nasa.gov/mission/voyager/interstellar-mission/',note:'旅行者 1、2 分别在 2012、2018 年越过日球层顶，是沿各自路径的测量，不是完整球壳地图。'},
 {title:'NASA：奥尔特云',url:'https://science.nasa.gov/solar-system/oort-cloud/facts/',note:'推断中的遥远彗星储库位于日球层之外；不能把太阳风边界当成太阳引力的终点。'},
];
