import type { BodyId } from '../types';
export type RingPlanetId='jupiter'|'saturn'|'uranus'|'neptune';
export interface RingBand {name:string;innerKm:number;outerKm:number;opacity:number;arc?:boolean}
export interface RingProfile {id:RingPlanetId;name:string;summary:string;lesson:string;sourceUrl:string;sourceVersion:string;bands:RingBand[]}
const band=(name:string,innerKm:number,outerKm:number,opacity:number):RingBand=>({name,innerKm,outerKm,opacity});
export const RING_PROFILES:RingProfile[]=[
 {id:'jupiter',name:'木星',summary:'暗淡的尘埃环：主环之外还有弥散的纱环。',lesson:'环粒子围绕木星公转，四颗伽利略卫星也围绕木星运行；环不是画出的卫星轨道线。光环有纵向厚度，本版用平面分区概括，未复现厚度分布；忒拜环更远的外延尚未绘制。',sourceUrl:'https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupringfact.html',sourceVersion:'NASA/NSSDCA · 2015-10-14 · 核对 2026-09-25',bands:[band('光环范围',89400,123000,.10),band('主环',123000,128940,.34),band('木卫五纱环',128940,181350,.07),band('忒拜纱环',181350,221900,.045)]},
 {id:'saturn',name:'土星',summary:'明亮的主环以冰粒为主，环间存在间隙。',lesson:'环由大量独立公转的颗粒组成，不是固体圆盘。本版绘制 C、B、A 三个参考主环段，保留 B 环与 A 环之间的分界区域；该区域并非完全真空。D、F、E、G 等结构未绘制，细小缝隙未逐条重建。',sourceUrl:'https://nssdc.gsfc.nasa.gov/planetary/factsheet/satringfact.html',sourceVersion:'NASA/NSSDCA · 2022-04-19 · 核对 2026-09-25',bands:[band('C 环',74658,91975,.45),band('B 环',91975,117507,.85),band('A 环',122340,136780,.7)]},
 {id:'uranus',name:'天王星',summary:'暗而窄的环，环面跟随母星赤道面倾斜。',lesson:'母星、环面和主要卫星家族的取向相关，但不是每条轨道都完全重合。本版选取 6 条代表性内环，未画出全部已知环。增强模式加粗细环以便识别。',sourceUrl:'https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranringfact.html',sourceVersion:'NASA/NSSDCA · 2015-10-14 · 核对 2026-09-25',bands:[band('6 环',41836.25,41837.75,.38),band('α 环',44714.5,44721.5,.55),band('β 环',45657,45665,.45),band('γ 环',47625.75,47628.25,.48),band('δ 环',48297.5,48302.5,.50),band('ε 环',51120,51178,.78)]},
 {id:'neptune',name:'海王星',summary:'细环与弥散尘埃带并存，部分环段呈弧状聚集。',lesson:'海卫一的轨道有明显倾斜和逆行特征，不能把它与赤道环面当作同一平面。亮弧只说明局部聚集，方位和长度为示意，不是当日环弧的位置。',sourceUrl:'https://nssdc.gsfc.nasa.gov/planetary/factsheet/nepringfact.html',sourceVersion:'NASA/NSSDCA · 2015-10-14 · 核对 2026-09-25',bands:[band('Galle 环',40900,42900,.14),band('Le Verrier 环',53160,53240,.38),band('Lassell 带',53200,57200,.07),band('Arago 环',57160,57240,.3),{...band('Adams 环 / 弧',62925.5,62940.5,.46),arc:true}]},
];
export const ringProfile=(id:BodyId)=>RING_PROFILES.find(p=>p.id===id);
/** km from the planet centre. Narrow ring widths use representative means / upper bounds. */
export function ringDisplayBounds(band:RingBand,planetRadiusKm:number,enhanced:boolean):[number,number]{
 const centre=(band.innerKm+band.outerKm)/2,width=Math.max(band.outerKm-band.innerKm,enhanced?planetRadiusKm*.016:0);
 return [(centre-width/2)/planetRadiusKm,(centre+width/2)/planetRadiusKm];
}

/** Bounds use km from the centre divided by the sphere's mean radius, not the source's equatorial-radius ratio. */
export function ringSystemBounds(id:RingPlanetId,planetRadiusKm:number):[number,number]{
 const bands=ringProfile(id)!.bands;
 return [Math.min(...bands.map(b=>b.innerKm))/planetRadiusKm,Math.max(...bands.map(b=>b.outerKm))/planetRadiusKm];
}
export function ringWidthNote(id:RingPlanetId,band:RingBand):string{
 if(id==='uranus')return band.name==='6 环'?'资料宽度 1.5 km；圆化参考':'随方位变化的宽度取范围中值；圆化参考';
 if(id==='neptune'){
  if(band.name==='Le Verrier 环'||band.name==='Arago 环')return '资料仅给 <100 km；绘图选用 80 km，不是测得值';
  if(band.name==='Lassell 带')return '从约 53,200 km 向外延伸约 4,000 km';
  return '采用资料近似宽度';
 }
 return '采用资料内外边界；厚度未重建';
}
