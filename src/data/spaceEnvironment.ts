export const ENVIRONMENT_LAYERS = [
 {id:'wind',name:'太阳风',color:'#f5ba72',description:'来自太阳的带电粒子流。动画展示绕流方向，不表示实测速度或粒子数量。'},
 {id:'shock',name:'弓形激波',color:'#efa86c',description:'迎风侧的过渡区：太阳风在这里减速、加热。它在磁层顶之外，不是地球的固体外壳。'},
 {id:'boundary',name:'磁层顶与磁尾轮廓',color:'#73d8ed',description:'磁层顶是太阳风与地球磁场主导区域之间的边界；背日侧被拉成长尾。轮廓会随空间环境变化。'},
 {id:'field',name:'磁力线示意',color:'#74bcd6',description:'曲线帮助理解磁场的空间结构，不是实体轨道，也不是带电粒子的精确飞行路径。'},
 {id:'aurora',name:'两极极光示意',color:'#83f1ba',description:'带电粒子沿磁场进入高层大气，与氧、氮碰撞，产生发光。光带形状和高度经过增强，不能用于当天观测预报。'},
] as const;
export type EnvironmentLayer=typeof ENVIRONMENT_LAYERS[number]['id'];
export type EnvironmentLayers=Record<EnvironmentLayer,boolean>;
export const defaultEnvironmentLayers=():EnvironmentLayers=>({wind:true,shock:true,boundary:true,field:true,aurora:true});
export const ENVIRONMENT_SOURCES=[
 {title:'NASA · 磁层形态与尺度',url:'https://science.nasa.gov/heliophysics/focus-areas/magnetosphere-ionosphere/',note:'向日侧约 6–10 个地球半径，背日侧磁尾可达数百个地球半径；数值不是固定边界。'},
 {title:'NASA · 弓形激波、磁鞘与磁尾',url:'https://science.nasa.gov/blogs/the-sun-spot/2023/09/26/earths-magnetosphere-and-plasmasheet/',note:'2023-09-26：多数太阳风粒子在激波减速、加热，再经磁鞘绕过地球。'},
 {title:'NASA · 极光如何发光',url:'https://science.nasa.gov/earth/earth-observatory/lights-on-and-over-the-southern-horizon-90507/',note:'磁层中的粒子获得能量后进入高层大气，使氧和氮发光。'},
];
/** Artistic geometry, dimensionless drawing coordinates. NOT a fitted magnetopause model. */
export function environmentRadius(x:number,shock=false){
 const nose=shock?-8:-6;
 return x<nose?0:(shock?6.6:4.8)*Math.sqrt(1-Math.exp(-(x-nose)/5));
}
/** A repeatable illustrative streamline outside the bow shock, not a particle integration. */
export function windPoint(progress:number,angle:number,offset:number):[number,number,number]{
 const x=-13+34*progress,r=Math.max(offset,environmentRadius(x,true)+.45);
 return [x,Math.cos(angle)*r,Math.sin(angle)*r];
}
