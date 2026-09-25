import {BODIES} from './catalog';
import {SATELLITES} from './satellites';
import type {BodyId} from '../types';
export const ATTITUDE_SOURCE='https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc';
export const tiltReference=(id:BodyId)=>id==='sun'?'相对黄道面法线':id==='moon'?'相对月球轨道面法线':'相对自身公转轨道面法线';
export const surfaceNotes:Record<BodyId,string>={
 sun:'光球静态纹理随参考自转推进；并非火焰燃烧模拟。黑子、日珥等示意另行控制，不跟随真实活动或差异自转。',
 mercury:'静态岩石表面纹理；未绘制稀薄外逸层。没有云层或天气模拟。',
 venus:'看到的是静态大气云图，不是裸露地表。图像随本体参考姿态转动，未模拟云层超旋转。',
 earth:'陆海静态纹理，云层和大气光晕可独立开关。云图与地表一同转动，不是当日云量或天气；光晕厚度为视觉增强。',
 moon:'月球静态纹理与参考姿态已共用于全景和精细观测。没有大气光晕；未完整计算天平动，贴图经度未作导航级配准。',
 mars:'静态地表纹理，未模拟季节极冠变化、沙尘暴和稀薄大气散射。',
 jupiter:'静态云带纹理，没有可见固体表面；未模拟不同纬度的风速与风暴变化。',
 saturn:'静态大气纹理；环另用有来源的环段尺度。没有流体云层、环粒子动力学或球体扁率模型。',
 uranus:'静态大气纹理；极轴与逆行按参考姿态计算，不能把极轴倾角再叠加一次。未模拟天气和扁率。',
 neptune:'静态大气纹理，颜色经过可视化处理；未模拟风暴。资料自转周期和本项目采用的线性子午线模型周期分别列出。',
};
export const APPEARANCE_OBJECTS=[
 ...BODIES.map(body=>({id:body.id,name:body.name,group:body.kind==='star'?'恒星':body.kind==='moon'?'核心卫星':'行星',radiusKm:body.radiusKm,body,moon:null})),
 ...SATELLITES.map(moon=>({id:moon.id,name:moon.name,group:'核心卫星',radiusKm:moon.radiusKm,body:null,moon})),
];
