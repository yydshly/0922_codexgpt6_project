import type {BodyDefinition} from '../types';
import {renderedRotationHours} from './referenceAttitude';
import {ATTITUDE_SOURCE,tiltReference} from '../data/appearanceAudit';
export function RotationNote({body}:{body:BodyDefinition}){
 return <details className="rotation-note"><summary>自转、轴倾角如何对应画面？</summary>
 <p>资料中的恒星自转周期为 {Math.abs(body.rotationHours).toFixed(5)} 小时；画面线性参考模型的一周为 {Math.abs(renderedRotationHours(body)).toFixed(5)} 小时。二者来源和舍入可能不同，云层运动也不等于本体转速。</p>
 <p>轴倾角 {body.obliquityDeg}°：{tiltReference(body.id)}。画面直接使用参考极轴与子午线计算朝向，没有再次叠加此倾角。逆行由模型的有符号转速和极轴共同确定，不能仅按屏幕顺逆时针判断。</p>
 <p>姿态按观测日期计算：J2000 固定极轴与线性子午线近似，省略岁差和周期项；火星沿用 IAU 2009 近似。暂停日期会停止参考自转；转动镜头不改变天体数据。静态纹理未经精确经度配准，不是该时刻的表面实况。</p>
 {body.id==='moon'&&<p><a href="https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html" target="_blank" rel="noreferrer">NASA 月球轴倾角参照 ↗</a></p>}
 <a href={ATTITUDE_SOURCE} target="_blank" rel="noreferrer">NAIF pck00011 参考姿态来源 ↗</a></details>;
}
