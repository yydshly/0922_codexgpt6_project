import {BASELINE_VERSION,type CoverageEntry} from './contentCoverage';
export const REVIEW_STEPS:{id:string;title:string;action:string;expected:string;entry:CoverageEntry}[] = [
 {id:'panorama',title:'1 · 全景与操作空间',action:'打开全景，展开观察指南和更多工具，再切换斜视、侧视。',expected:'工具栏保持紧凑；弹出菜单不挤压画布。侧视能辨认盘状区域与外围球状示意。',entry:{kind:'zone',id:'all'}},
 {id:'sun',title:'2 · 太阳与球体辨识',action:'在全景中定位太阳，再从更多工具定位太阳活动。',expected:'太阳旁没有误似独立天体的白色半球；表面亮斑明确为活动示意。',entry:{kind:'zone',id:'planetary'}},
 {id:'learning',title:'3 · 按顺序学习',action:'从整体开始，依次进入太阳、行星、地球、地月；再查看章节目录。',expected:'当前课程、下一节和所属层级清楚；进入地球后课程卡不会被参数自动滚走。',entry:{kind:'zone',id:'all'}},
 {id:'closeup',title:'4 · 近景与资料往返',action:'在课程中进入地球，切换侧视、俯视、复位，再查看资料并回到本节。',expected:'镜头仍围绕当前天体；课程和目标保留，资料与学习任务可以往返。',entry:{kind:'zone',id:'planetary'}},
 {id:'restore',title:'5 · 退出、时间与图层',action:'改变日期后退出并恢复全景，核对现象开关；关闭一个阶段后查看课程入口。',expected:'恢复全景显示但不回退日期；保留阶段选择，受限制的课程明确说明原因。',entry:{kind:'zone',id:'all'}},
];
export type ReviewStatus='pending'|'pass'|'issue';
export interface ReviewMark {status:ReviewStatus;note:string;}
export type ReviewMarks=Record<string,ReviewMark>;
export const REVIEW_STORAGE_KEY='orbit-baseline-review';
export function parseReview(raw:string|null):ReviewMarks {
 try {const value=JSON.parse(raw??'null');if(value?.version!==BASELINE_VERSION)return {};
 return Object.fromEntries(REVIEW_STEPS.flatMap(step=>{const mark=value.marks?.[step.id];return mark&&['pending','pass','issue'].includes(mark.status)&&typeof mark.note==='string'?[[step.id,{status:mark.status,note:mark.note.slice(0,2000)}]]:[];}));
 } catch{return {};}
}
