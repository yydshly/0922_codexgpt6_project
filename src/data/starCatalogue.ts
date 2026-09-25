export interface CatalogueStar {
  hip:number; ra:number; dec:number; parallax:number; parallaxError:number;
  hp:number; hpError:number; raError:number; decError:number; fit:number; solution:number;
}
export interface StarCatalogue {meta:{catalogue:string;epoch:string;source:string;release:string};sky:CatalogueStar[];nearby:CatalogueStar[];}
export type StellarView='space'|'sky';
export const PARSEC_LIGHT_YEARS=3.261563777167433;
// ICRS equatorial axes to Three.js: +X=RA0, +Y=north pole, -Z=RA6h.
// This is a pure rotation, not the solar panorama's ecliptic frame.
export function starDirection(ra:number,dec:number):[number,number,number]{return [Math.cos(dec)*Math.cos(ra),Math.sin(dec),-Math.cos(dec)*Math.sin(ra)];}
export function starDistance(s:CatalogueStar){return 1000/s.parallax*PARSEC_LIGHT_YEARS;}
export function starPosition(s:CatalogueStar):[number,number,number]{const d=starDistance(s);return starDirection(s.ra,s.dec).map(v=>v*d) as [number,number,number];}
export function hasReliableDistance(s:CatalogueStar){return s.parallax>1000/15&&s.parallaxError>0&&s.parallaxError/s.parallax<=.05;}
export function parseStarCatalogue(value:unknown):StarCatalogue{
 const c=value as StarCatalogue;
 if(!c?.meta||c.meta.epoch!=='J1991.25'||!Array.isArray(c.sky)||!Array.isArray(c.nearby)||c.sky.length<1||c.nearby.length<20)throw Error('恒星数据格式不完整');
 for(const list of [c.sky,c.nearby]){
  if(new Set(list.map(s=>s.hip)).size!==list.length)throw Error('恒星编号重复');
  for(const s of list)if(![s.hip,s.ra,s.dec,s.parallax,s.parallaxError,s.hp,s.hpError,s.raError,s.decError,s.fit,s.solution].every(Number.isFinite)||!Number.isInteger(s.hip)||s.hip<=0||s.ra<0||s.ra>=2*Math.PI||Math.abs(s.dec)>Math.PI/2||s.solution!==5||s.fit>=3||s.raError<0||s.raError>=2||s.decError<0||s.decError>=2)throw Error('恒星坐标或质量字段异常');
 }
 if(c.nearby.some(s=>!hasReliableDistance(s))||c.sky.some(s=>s.hp>6||s.hpError<0||s.hpError>.02))throw Error('恒星样本未通过质量筛选');
 return c;
}

export const STELLAR_GUIDE_HIP=16537;
export const STAR_IDENTITIES:Record<number,{name:string;english:string;intro:string;source:string}>={
 16537:{name:'波江座 ε',english:'Epsilon Eridani',intro:'太阳附近的一颗恒星。这个案例同时具备目录中的天空方向和通过筛选的测距数据，适合在两种视角间对照。',source:'https://simbad.cds.unistra.fr/simbad/sim-basic?Ident=Epsilon+Eridani'},
 87937:{name:'巴纳德星',english:"Barnard’s Star",intro:'一颗近邻恒星。距离近不等于看起来亮：它未进入这里的 Hp ≤ 6 亮星子集，切到星空时会额外标出它的目录方向。',source:'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=HIP87937'},
};
export function starName(hip:number){return STAR_IDENTITIES[hip]?.name??`HIP ${hip}`;}
export function starLabel(hip:number){return STAR_IDENTITIES[hip]?`${starName(hip)} · HIP ${hip}`:`HIP ${hip}`;}
// A selected faint neighbor may be overlaid on the angular sky. It is still a
// catalogue direction, never an invented distance or an addition to the bright subset.
export function starsForView(data:StarCatalogue|null,view:StellarView,selected:number|null):CatalogueStar[]{
 if(!data)return [];
 if(view==='space')return data.nearby;
 const extra=data.nearby.find(s=>s.hip===selected);
 return extra&&!data.sky.some(s=>s.hip===selected)?[...data.sky,extra]:data.sky;
}
export function canShowStarInSpace(data:StarCatalogue|null,hip:number|null){return hip===null||!!data?.nearby.some(s=>s.hip===hip);}
