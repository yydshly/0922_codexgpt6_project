import type { BodyDefinition, BodyId } from '../types';
import { publicAsset } from './publicAsset';

export const AU_KM = 149597870.7;
export const PHYSICAL_SOURCE = 'https://ssd.jpl.nasa.gov/planets/phys_par.html';
export const GM_SOURCE = 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/gm_de440.tpc';
/** Mean volumetric radii; signed sidereal rotation periods. GM in km^3/s^2.
 * Orbital periods and physical masses follow the JPL physical-parameter table.
 * GM follows the reproducible DE440 constants, kept separate from rounded masses.
 * Pole and W use J2000 IAU approximations: secular/periodic pole terms omitted.
 */
export const BODIES: BodyDefinition[] = [
  {id:'sun',name:'太阳',englishName:'Sun',kind:'star',color:'#ffc763',radiusKm:695700,gm:1.3271244004127942e11,massKg:1.98841e30,rotationHours:25.38*24,orbitalPeriodDays:0,obliquityDeg:7.25,semiMajorAxisAu:0,displayNaifId:10,simulationNaifId:10,simulationGm:1.3271244004127942e11,poleRaDeg:286.13,poleDecDeg:63.87,primeMeridianDeg:84.176,texture:publicAsset('/textures/sun.jpg'),sourceUrl:'https://science.nasa.gov/sun/facts/',description:'太阳系唯一的恒星。核聚变释放的能量照亮了行星，也维持着地球上的生命。',fact:'太阳也在运动：行星的引力使它围绕太阳系质心摆动。'},
  {id:'mercury',name:'水星',englishName:'Mercury',kind:'planet',color:'#b4afaa',radiusKm:2439.4,gm:22031.8685514,massKg:0.330103e24,rotationHours:58.6462*24,orbitalPeriodDays:0.2408467*365.25,obliquityDeg:0.034,semiMajorAxisAu:0.38709927,displayNaifId:199,simulationNaifId:1,simulationGm:22031.8685514,poleRaDeg:281.0103,poleDecDeg:61.4155,primeMeridianDeg:329.5988,texture:publicAsset('/textures/mercury.jpg'),sourceUrl:PHYSICAL_SOURCE,description:'最靠近太阳的岩石行星，表面布满撞击坑，大气极其稀薄。',fact:'自转与公转处于 3:2 共振：绕太阳两圈，恰好自转三圈。'},
  {id:'venus',name:'金星',englishName:'Venus',kind:'planet',color:'#dfc398',radiusKm:6051.8,gm:324858.592,massKg:4.86731e24,rotationHours:-243.018*24,orbitalPeriodDays:0.61519726*365.25,obliquityDeg:177.36,semiMajorAxisAu:0.72333566,displayNaifId:299,simulationNaifId:2,simulationGm:324858.592,poleRaDeg:272.76,poleDecDeg:67.16,primeMeridianDeg:160.20,texture:publicAsset('/textures/venus.jpg'),sourceUrl:PHYSICAL_SOURCE,description:'厚重的二氧化碳大气和云层包裹着金星，使其地表异常炎热。',fact:'金星逆向自转；一次恒星自转比绕太阳一周还长。'},
  {id:'earth',name:'地球',englishName:'Earth',kind:'planet',color:'#70baff',radiusKm:6371.0084,gm:398600.43550702266,massKg:5.97217e24,rotationHours:0.99726968*24,orbitalPeriodDays:1.0000174*365.25,obliquityDeg:23.4393,semiMajorAxisAu:1.00000261,displayNaifId:399,simulationNaifId:399,simulationGm:398600.43550702266,poleRaDeg:0,poleDecDeg:90,primeMeridianDeg:190.147,texture:publicAsset('/textures/earth.jpg'),sourceUrl:PHYSICAL_SOURCE,description:'液态海洋、岩石陆地与薄薄的大气共同构成我们的家园。',fact:'季节主要由自转轴倾斜造成，并非地球与太阳距离的变化。'},
  {id:'moon',name:'月球',englishName:'Moon',kind:'moon',color:'#c8ced8',radiusKm:1737.4,gm:4902.80011845755,massKg:7.3458e22,rotationHours:27.321661*24,orbitalPeriodDays:27.321661,obliquityDeg:6.68,semiMajorAxisAu:384400/AU_KM,displayNaifId:301,simulationNaifId:301,simulationGm:4902.80011845755,poleRaDeg:269.9949,poleDecDeg:66.5392,primeMeridianDeg:38.3213,texture:publicAsset('/textures/moon.jpg'),sourceUrl:'https://ssd.jpl.nasa.gov/sats/phys_par/',description:'地球唯一的天然卫星，与地球共同绕它们的质心运动。',fact:'月球被潮汐锁定，自转周期与绕地球的公转周期相同。'},
  {id:'mars',name:'火星',englishName:'Mars',kind:'planet',color:'#e38b64',radiusKm:3389.50,gm:42828.37362069909,massKg:0.641691e24,rotationHours:1.02595676*24,orbitalPeriodDays:1.8808476*365.25,obliquityDeg:25.19,semiMajorAxisAu:1.52371034,displayNaifId:499,simulationNaifId:4,simulationGm:42828.3758157561,poleRaDeg:317.68143,poleDecDeg:52.88650,primeMeridianDeg:176.630,texture:publicAsset('/textures/mars.jpg'),sourceUrl:PHYSICAL_SOURCE,description:'表面富含氧化铁的红色行星，拥有极冠、峡谷和巨大的火山。',fact:'火星一天约为 24 小时 37 分钟，与地球的一天很接近。'},
  {id:'jupiter',name:'木星',englishName:'Jupiter',kind:'planet',color:'#d7b799',radiusKm:69911,gm:126686531.9003704,massKg:1898.125e24,rotationHours:0.41354*24,orbitalPeriodDays:11.862615*365.25,obliquityDeg:3.13,semiMajorAxisAu:5.202887,displayNaifId:599,simulationNaifId:5,simulationGm:126712764.1,poleRaDeg:268.056595,poleDecDeg:64.495303,primeMeridianDeg:284.95,texture:publicAsset('/textures/jupiter.jpg'),sourceUrl:PHYSICAL_SOURCE,description:'最大的行星，氢和氦构成了深厚的大气，云带随着快速自转翻涌。',fact:'其系统质心包含卫星质量；观测模式仍使用木星自身中心。'},
  {id:'saturn',name:'土星',englishName:'Saturn',kind:'planet',color:'#decba6',radiusKm:58232,gm:37931206.23436167,massKg:568.317e24,rotationHours:0.44401*24,orbitalPeriodDays:29.447498*365.25,obliquityDeg:26.73,semiMajorAxisAu:9.53667594,displayNaifId:699,simulationNaifId:6,simulationGm:37940584.8418,poleRaDeg:40.589,poleDecDeg:83.537,primeMeridianDeg:38.90,texture:publicAsset('/textures/saturn.jpg'),sourceUrl:PHYSICAL_SOURCE,description:'由无数冰与岩石颗粒组成的环，环绕着这颗气态巨行星。',fact:'土星环很宽却很薄；画面呈现的是环的结构示意。'},
  {id:'uranus',name:'天王星',englishName:'Uranus',kind:'planet',color:'#a3dfe7',radiusKm:25362,gm:5793951.256527211,massKg:86.8099e24,rotationHours:-0.71833*24,orbitalPeriodDays:84.016846*365.25,obliquityDeg:97.77,semiMajorAxisAu:19.18916464,displayNaifId:799,simulationNaifId:7,simulationGm:5794556.4,poleRaDeg:257.311,poleDecDeg:-15.175,primeMeridianDeg:203.81,texture:publicAsset('/textures/uranus.jpg'),sourceUrl:PHYSICAL_SOURCE,description:'淡青色的冰巨星，大气中的甲烷吸收红光，赋予它柔和的颜色。',fact:'自转轴倾斜约 98°，几乎侧躺着绕太阳运行。'},
  {id:'neptune',name:'海王星',englishName:'Neptune',kind:'planet',color:'#628bdd',radiusKm:24622,gm:6835103.145462294,massKg:102.4092e24,rotationHours:0.67125*24,orbitalPeriodDays:164.79132*365.25,obliquityDeg:28.32,semiMajorAxisAu:30.06992276,displayNaifId:899,simulationNaifId:8,simulationGm:6836527.100580399,poleRaDeg:299.36,poleDecDeg:43.46,primeMeridianDeg:249.978,texture:publicAsset('/textures/neptune.jpg'),sourceUrl:PHYSICAL_SOURCE,description:'最外侧的主要行星，距离太阳约 30 天文单位，是一颗遥远的冰巨星。',fact:'海王星绕太阳一周约需 165 个地球年。'},
];
// NAIF pck00011 prime-meridian linear rates; Mars uses its documented IAU 2009
// static-pole approximation because the newer base pole requires periodic terms.
const rotationRates: Record<BodyId, number> = {
  sun:14.18440,mercury:6.1385108,venus:-1.4813688,earth:360.9856235,
  moon:13.17635815,mars:350.89198226,jupiter:870.5360000,saturn:810.7939024,
  uranus:-501.1600928,neptune:541.1397757,
};
for (const body of BODIES) body.rotationRateDegPerDay=rotationRates[body.id];
export const bodyById = Object.fromEntries(BODIES.map(body => [body.id,body])) as Record<BodyId,BodyDefinition>;
