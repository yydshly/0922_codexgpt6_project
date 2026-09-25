import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {BODIES} from '../src/data/catalog';
import {APPEARANCE_OBJECTS,ATTITUDE_SOURCE,surfaceNotes} from '../src/data/appearanceAudit';
import {PHENOMENON_PARTS} from '../src/data/phenomenonParts';
import {referenceAttitude,renderedRotationHours} from '../src/components/referenceAttitude';

// Recompute event models first. Failure leaves no newly certified aggregate.
for(const script of ['lunar-eclipse','solar-eclipse','occultation'])
 execFileSync(process.execPath,['--import','tsx',`scripts/validate-${script}.ts`],{stdio:'pipe'});
const hash=(file:string)=>createHash('sha256').update(readFileSync(file)).digest('hex');
const read=(file:string)=>JSON.parse(readFileSync(file,'utf8'));
const checks:string[]=[];
const check=(ok:boolean,label:string)=>{assert(ok,label);checks.push(label);};
const finite=(value:unknown):boolean=>typeof value==='number'?Number.isFinite(value):Array.isArray(value)?value.every(finite):value!==null&&typeof value==='object'?Object.values(value).every(finite):true;
const definitions=[
 {id:'lunar',file:'lunar-2026-03-03.json',title:'2026-03-03 月全食',meaning:'影轴最近时刻与 NASA 食甚参考时刻之差',limit:'球形几何影锥；未计大气影子扩大、光行时、扁率和地形，不预测当地可见性。'},
 {id:'solar',file:'solar-2026-08-12.json',title:'2026-08-12 日全食',meaning:'影轴最近时刻与 NASA 食甚参考时刻之差',limit:'参考地球球面的全食条件；未生成地理路径、城市可见性，未计光行时、扁率和地形。'},
 {id:'io',file:'io-occultation-2026-01-12.json',title:'2026-01-12 木星遮掩木卫一',meaning:'掩始时刻与 IMCCE 参考时刻之差',limit:'地心接收视角，含迭代单程光行时；忽略木星扁率、光行差及当地观测条件，不是木卫一进入木星影子的卫星食。'},
];
const events=definitions.map(def=>{
 const file='public/data/events/'+def.file,r=read(file);
 check(finite(r),def.id+': all numeric report values finite');
 for(const input of Array.isArray(r.input)?r.input:[r.input]){
  const path=input.file.startsWith('public/')?input.file:'public/'+input.file;
  check(hash(path)===input.sha256,def.id+': input archive '+path);
 }
 const times=def.id==='io'?Object.values(r.model.contacts) as number[]:[r.model.minimumTdb];
 check(times.every((t,i)=>t>r.window.start&&t<r.window.end&&(i===0||t>times[i-1])),def.id+': ordered events inside fixed window');
 check(Math.abs(times[0]-r.reference.tdb-r.model.deltaSeconds)<1e-7,def.id+': difference uses common TDB scale');
 const points=r.curve??r.points;
 check(points.length>2&&points.every((p:{time:number},i:number)=>i===0||p.time>points[i-1].time),def.id+': increasing sample times');
 check(Math.abs(points[0].time-r.window.start)<1e-6&&Math.abs(points.at(-1).time-r.window.end)<1e-6,def.id+': complete display window');
 if(def.id==='lunar')check(r.model.stage==='月全食'&&r.model.magnitude>1,'lunar: geometric total eclipse');
 if(def.id==='solar')check(r.model.stage.includes('全食条件')&&r.model.surfaceUmbraKm>0,'solar: umbra intersects sphere');
 if(def.id==='io'){
  check(r.model.lightSeconds>0&&r.sampling.maxProjectedInterpolationKm<1,'io: light-time and held-out interpolation');
  check(Math.abs((times[1]-times[0])/60-r.model.disappearanceMinutes)<1e-8,'io: disappearance is first to second contact');
  check(hash('data-sources/events/imcce-jupiter-2026.pdf')===r.referenceArchive.sha256,'io: archived independent reference');
 }
 return {...def,report:'data/events/'+def.file,sha256:hash(file),deltaSeconds:r.model.deltaSeconds,reference:r.reference.ttLabel,source:r.sources[0],inputs:r.input,extra:def.id==='lunar'?`本影食分差 ${r.model.magnitudeDifference.toFixed(4)}`:def.id==='io'?`消失过程时长差 ${r.model.durationDifferenceSeconds.toFixed(2)} 秒；留出点投影插值差 ${r.sampling.maxProjectedInterpolationKm.toFixed(3)} km`:null};
});
const pck=readFileSync('data-sources/pck00011.tpc','utf8');
const attitude=BODIES.map(body=>{
 const rows=[...pck.matchAll(new RegExp('BODY'+body.displayNaifId+'_PM\\s*=\\s*\\(([^)]+)\\)','gi'))].map(row=>row[1].trim().split(/\s+/).map(Number));
 check(rows.some(row=>Math.abs(row[0]-body.primeMeridianDeg!)<1e-8&&Math.abs(row[1]-body.rotationRateDegPerDay!)<1e-8),body.id+': archived linear W coefficients (Mars historical IAU 2009)');
 for(const t of [0,820497669.184,883612869.184]){
  const q=referenceAttitude(body,t),next=referenceAttitude(body,t+Math.abs(renderedRotationHours(body))*3600);
  check(q.toArray().every(Number.isFinite)&&Math.abs(q.length()-1)<1e-12&&1-Math.abs(q.dot(next))<1e-10,body.id+': finite unit attitude and model period closure '+t);
 }
 return {id:body.id,name:body.name,rateDegPerDay:body.rotationRateDegPerDay,renderedHours:renderedRotationHours(body),note:surfaceNotes[body.id],model:body.id==='mars'?'IAU 2009 历史系数的线性近似':'pck00011 线性子午线系数近似'};
});
const schematics=['solar-atmosphere','enceladus-interior'].map(id=>{
 const file=`public/data/${id}/manifest.json`,r=read(file);
 check(r.sources.length>0&&r.limits.length>0&&r.kind.includes('educational'),id+': source registry and teaching limits present');
 return {id,manifest:`data/${id}/manifest.json`,sha256:hash(file),sources:r.sources,limits:r.limits};
});
const report={schemaVersion:1,generatedAt:new Date().toISOString(),integrityPassed:true,accuracyCertified:false,checks,events,
 attitude:{source:ATTITUDE_SOURCE,archiveSha256:hash('data-sources/pck00011.tpc'),objects:attitude,appearanceObjects:APPEARANCE_OBJECTS.length,limit:'仅核对线性子午线系数及模型周期闭合；极轴固定于 J2000，未完整计算岁差、章动和天平动，也未独立验证绝对姿态。火星使用档案保留的 IAU 2009 历史模型。19 颗扩展卫星的外观登记不等于其姿态已实测复现；卫星家族近景采用朝向母星的说明性姿态。'},
 schematics,parts:PHENOMENON_PARTS,
 remaining:['三例事件仅验证已知时窗及简化模型；没有通用天象搜索、当地可见性或导航精度认证。','区域点云、环境场线、粒子和内部剖面尚无逐点观测拟合；本轮核对来源记录和说明边界，没有将示意当作实测。','完整姿态、纹理经度配准、天气及所有扩展目标的形状与自转尚未实现。','真实设备性能、完整产品视觉体验和用户验收仍待完成。']};
writeFileSync('public/data/validation/phenomena-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({checks:checks.length,events:events.map(e=>({id:e.id,deltaSeconds:e.deltaSeconds})),attitudes:attitude.length,appearance:APPEARANCE_OBJECTS.length,schematicParts:PHENOMENON_PARTS.length,accuracyCertified:false},null,2));
