import parameterSnapshot from '../../public/data/small-bodies/physical-parameters.json';
import type { AtlasBody } from './atlas';
export const R01_PARAMETERS = parameterSnapshot.records;
export const r01Parameters = (id:string) => R01_PARAMETERS.find(row=>row.id===id);
export const TROJAN_CLASSIFICATION_SOURCE = 'https://www.aanda.org/articles/aa/pdf/2008/21/aa9177-07.pdf';
export const R01_ATLAS:AtlasBody[] = [
 {id:'eros',name:'爱神星',englishName:'433 Eros',category:'small',parent:'太阳',radiusKm:8.42,radiusNote:'体积等效半径 8.42 ± 0.03 km，由 SBDB 直径换算；实际外形细长；主全景采用 PDS 形状模型，其外包尺寸约 32.69 × 16.82 × 11.95 km，与有效直径不是同一种量。',color:'#cda982',appearance:'rock',description:'Amor 型近地小行星。它接近地球轨道区域，但其轨道并未到达地球轨道；近地分类不等于正在接近地球或即将撞击。',features:['NEAR Shoemaker 曾绕飞并着陆','近地天体绕太阳运行，不是地球卫星','主全景位置来自 JPL、形状来自 PDS；图鉴小图仍为示意'],sourceUrl:'https://science.nasa.gov/solar-system/asteroids/433-eros/'},
 {id:'achilles',name:'阿喀琉斯',englishName:'588 Achilles · L4',category:'small',parent:'太阳',radiusKm:65.0495,radiusNote:'SBDB 有效直径 130.099 ± 0.554 km 的一半；非精确地形或三轴尺寸。',color:'#d9bd81',appearance:'rock',description:'木星 L4 特洛伊群的代表，在木星公转方向前方的区域绕太阳运行，与木星形成 1:1 平均运动共振；它不是木星卫星。',features:['L4 是日木系统中的平衡区域','天体在区域附近振荡，不固定在 60°','画面位置使用逐日历表，而非固定角度'],sourceUrl:'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=588'},
 {id:'aneas',name:'埃涅阿斯',englishName:'1172 Aneas · L5',category:'small',parent:'太阳',radiusKm:59.01,radiusNote:'SBDB 有效直径 118.020 ± 0.806 km 的一半；有效直径不等于各方向真实宽度。',color:'#c1a7db',appearance:'rock',description:'木星 L5 特洛伊群的代表，位于木星公转方向后方的区域。与 L4 代表对照，可以理解同轨道区域的两组天体分布。',features:['绕太阳运行，不围绕 L5 实体公转','L5 是动力学位置，没有一颗中心星球','当前方位角不等于平均共振角'],sourceUrl:'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=1172'},
 {id:'chariklo',name:'女凯龙星',englishName:'10199 Chariklo',category:'small',parent:'太阳',radiusKm:null,radiusNote:'不指定唯一半径：SBDB 保留较早的 302 ± 30 km 有效直径估计，其他观测与形状模型会给出不同尺度；下方参数保留原文献。',color:'#b4c1ce',appearance:'ice',description:'在巨行星区域绕太阳运行的半人马族天体。恒星掩星观测发现它拥有环，说明环并非巨行星独有；本体轨道来自历表，主全景已加入基于 2014 年参考尺寸的双环结构示意。',features:['半人马族不是均匀完整的一条环带','有环的观测证据与本体球形标记应分开理解','环尺寸有来源，真实形状、当前环面与自转姿态未重建'],sourceUrl:'https://science.nasa.gov/solar-system/asteroids/10199-chariklo/'},
];
