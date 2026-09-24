export const NEAR_EARTH_LAYERS = [
 {id:'innerBelt',name:'内辐射带',color:'#f5ba69',description:'被地球磁场俘获的高能粒子区域，内带含有大量高能质子，也有电子。点云表示空间分布，不是一条卫星轨道。'},
 {id:'outerBelt',name:'外辐射带',color:'#d993e5',description:'以高能电子为重要成分，形态与粒子通量会变化。它不是一圈固体环，图中空隙也不代表绝对安全区。'},
 {id:'plasmasphere',name:'等离子体层',color:'#76d3ca',description:'主要由来自电离层的较低能量、较稠密等离子体组成。它与辐射带的区别是粒子群的性质，空间范围可以重叠，不能当作互不相交的硬壳。'},
] as const;
export type NearEarthLayer=typeof NEAR_EARTH_LAYERS[number]['id'];
/** Drawing parameters only, not measured boundaries in Earth radii or radiation flux. */
export const NEAR_EARTH_SHAPES:Record<NearEarthLayer,{major:number;minor:number;height:number;count:number}>={
 innerBelt:{major:1.7,minor:.38,height:1.25,count:1100},
 outerBelt:{major:3.5,minor:1.05,height:1.15,count:1900},
 plasmasphere:{major:1.88,minor:.8,height:1.4,count:1300},
};
/** Static, deterministic volume markers. No individual particle trajectories are integrated. */
export function nearEarthPoint(id:NearEarthLayer,index:number):[number,number,number]{
 const shape=NEAR_EARTH_SHAPES[id],az=index*2.3999632297,cross=index*1.733508,r=shape.minor*Math.sqrt((index*.754877666+.23)%1),radial=shape.major+r*Math.cos(cross);
 return [radial*Math.cos(az),r*Math.sin(cross)*shape.height,radial*Math.sin(az)];
}
export const NEAR_EARTH_SOURCES=[
 {title:'NASA · 辐射带中的粒子与观测',url:'https://science.nasa.gov/directorates/smd/heliophysics-division/innovative-instrument-reveals-hidden-features-deep-inside-the-van-allen-radiation-belts/',note:'内带的高能质子与外带的高能电子是不同仪器观测的重要对象。'},
 {title:'NASA · 辐射带不是固定边界',url:'https://www.nasa.gov/missions/van-allen-probes/nasas-van-allen-probes-revolutionize-view-of-radiation-belts/',note:'内带、槽区和外带的表现会随所考察的粒子能量和磁层条件变化。'},
 {title:'NASA · 等离子体层与磁层粒子群',url:'https://www.nasa.gov/image-article/earths-magnetosphere-4/',note:'等离子体层主要是从电离层进入磁层的低能粒子；辐射带对应高能粒子。'},
];
