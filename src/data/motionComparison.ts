import {BODIES} from './catalog';
import {primaryMetrics,type PrimaryId} from './macroPrimary';
import type {StateFrame} from '../types';
export type MotionMetric='speed'|'orbit'|'rotation';
export const MOTION_METRICS = {
 speed:{label:'当前公转速度',unit:'km/s',note:'同一时刻，相对太阳中心的三维速度大小；不是角速度，也不是屏幕移动速度。'},
 orbit:{label:'参考公转周期',unit:'天',note:'绕太阳公转一周的参考恒星周期；不是从当前日期开始预测下一圈的精确用时。'},
 rotation:{label:'参考自转周期',unit:'小时',note:'相对恒星自转一周的参考时长，不是两次日出之间的太阳日；逆行用文字单独标注。'},
} as const;
export function motionComparison(frame:StateFrame|null,metric:MotionMetric){
 const rows=BODIES.filter(b=>b.kind==='planet').map(body=>{
  const value=metric==='speed'?primaryMetrics(frame,body.id as PrimaryId)?.speedKmS??null:metric==='orbit'?body.orbitalPeriodDays:Math.abs(body.rotationHours);
  return {id:body.id as PrimaryId,name:body.name,color:body.color,value,retrograde:metric==='rotation'&&body.rotationHours<0};
 });
 const maximum=Math.max(0,...rows.map(row=>row.value??0));
 return rows.map(row=>({...row,fraction:row.value===null?null:maximum>0?row.value/maximum:0}));
}
