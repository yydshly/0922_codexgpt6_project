import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {interpolateChunk,type EphemerisChunk} from '../src/ephemeris/ephemeris';
import {OBSERVATION_COUNTS} from '../src/data/observationCatalog';
const root=resolve('.'),dataRoot=resolve('public/data');
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const jsonHash=(p:string)=>hash(Buffer.from(readFileSync(p,'utf8').replace(/\r\n/g,'\n')));
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const requireCheck=(condition:boolean,message:string)=>{if(!condition)throw Error(message);};
const folders=['','satellites','dwarfs','comets','small-bodies','pluto-moons','eris-system','patroclus-system','coorbital','borisov'];
const titles=['太阳、八大行星与月球','19 颗选定行星卫星','谷神星、冥王星与卡戎','三颗彗星','十个小天体代表','冥王星四颗小卫星','阋神星双体','帕特罗克洛斯双体','地球准卫星','Borisov 历史案例'];
const packages:any[]=[];const mainChunks:{descriptor:any;chunk:EphemerisChunk}[]=[];
let totalChunks=0,totalStates=0;
for(let packageIndex=0;packageIndex<folders.length;packageIndex++){
 const folder=folders[packageIndex],base=resolve(dataRoot,folder),manifestPath=resolve(base,'manifest.json'),m=read(manifestPath);
 requireCheck(m.frame.startsWith('ECLIPJ2000')&&m.units==='km, km/s'&&m.timeScale.includes('TDB')&&m.aberration.startsWith('NONE'),folder+' frame/units/time/correction');
 requireCheck(m.startTdb<m.endTdb&&!!m.sourceUrl&&!!m.version,folder+' provenance/range');
 let sourceFiles=0,states=0;const series=new Map<string,{start:number;step:number;samples:number[][];startBound:number;endBound:number}[]>();
 for(const d of m.chunks){
  const path=resolve(base,d.file);requireCheck(relative(base,path).split(/[\\/]/)[0]!=='..','unsafe chunk path');const bytes=readFileSync(path);
  requireCheck(hash(bytes)===d.sha256&&bytes.length===d.bytes,folder+'/'+d.file+' checksum/size');
  const c=JSON.parse(bytes.toString('utf8'));
  const entries=folder?c.series:[{id:'display',startTdb:c.startTdb,stepSeconds:c.stepSeconds,samples:c.display},{id:'simulation',startTdb:c.startTdb,stepSeconds:c.stepSeconds,samples:c.simulation}];
  if(!folder){requireCheck(c.count===c.display.length&&c.count===c.simulation.length,'main count');mainChunks.push({descriptor:d,chunk:c});}
  for(const item of entries){
   requireCheck(item.samples.length>=2&&item.stepSeconds>0&&Number.isFinite(item.startTdb),'invalid cadence');
   requireCheck(item.samples.every((row:number[])=>row.length===(folder?6:60)&&row.every(Number.isFinite)),'invalid state rows');
   const boundStart=Math.max(d.startTdb,m.startTdb),boundEnd=Math.min(!folder&&d===m.chunks.at(-1)?d.coverageEndTdb:d.endTdb,m.endTdb);
   requireCheck(item.startTdb<=boundStart+1e-5&&item.startTdb+(item.samples.length-1)*item.stepSeconds>=boundEnd-1e-5,folder+' sample coverage');
   const list=series.get(item.id)??[];list.push({start:item.startTdb,step:item.stepSeconds,samples:item.samples,startBound:boundStart,endBound:boundEnd});series.set(item.id,list);states+=item.samples.length*(folder?1:10);
  }
  totalChunks++;
 }
 let seams=0;
 for(const [id,list] of series){list.sort((a,b)=>a.startBound-b.startBound);requireCheck(Math.abs(list[0].startBound-m.startTdb)<1e-5&&Math.abs(list.at(-1)!.endBound-m.endTdb)<1e-5,folder+'/'+id+' endpoints');
  for(let i=1;i<list.length;i++){const a=list[i-1],b=list[i];requireCheck(Math.abs(a.endBound-b.startBound)<1e-5,folder+'/'+id+' monthly gap');const offset=(b.start-a.start)/a.step;requireCheck(a.step===b.step&&Math.abs(offset-Math.round(offset))<1e-6,'cadence seam');let compared=0;for(let k=0;k<b.samples.length&&k+Math.round(offset)<a.samples.length;k++){const row=a.samples[k+Math.round(offset)];if(!row)continue;requireCheck(row.every((v,j)=>Math.abs(v-b.samples[k][j])<1e-7),folder+'/'+id+' inconsistent overlap');compared++;}requireCheck(compared>0,'no overlap');seams++;}
 }
 for(const target of m.targets??[]){const bytes=gunzipSync(readFileSync(resolve(root,target.rawFile)));requireCheck(hash(bytes)===(target.rawSha256??target.sha256),folder+' raw source checksum');const text=bytes.toString('utf8');requireCheck(text.includes('GEOMETRIC cartesian states')&&text.includes('Ecliptic of J2000.0')&&text.includes('Solar System Barycenter (0)'),folder+' source header');requireCheck(text.includes(target.targetSource),folder+' target identity');sourceFiles++;}
 for(const source of m.sources??[]){const file=source.originalFile.replace(/\.bsp$/,'-2026-2027.bsp');requireCheck(hash(readFileSync(resolve(root,'data-sources/satellites',file)))===source.excerptSha256,'SPK excerpt checksum');sourceFiles++;}
 requireCheck(sourceFiles>0,folder+' missing source archives');
 const validation=!folder?read(resolve(dataRoot,'interpolation-report.json')):folder==='satellites'?read(resolve(base,'interpolation-report.json')):m.validation;
 const recordedMax=validation.maxPositionErrorKm??Math.max(...validation.checks.map((c:any)=>c.maxPositionErrorKm));
 const passed=validation.passed??validation.checks?.every((c:any)=>c.passed);
 requireCheck(passed===true&&Number.isFinite(recordedMax)&&recordedMax<=1,folder+' recorded interpolation limit');
 const expectedIds=folder?(m.bodyIds??m.satelliteIds):['display','simulation'];requireCheck([...series.keys()].sort().join()===expectedIds.slice().sort().join(),folder+' object identities');
 packages.push({id:folder||'main',title:titles[packageIndex],version:m.version,manifest:`data/${folder?folder+'/':''}manifest.json`,manifestSha256:jsonHash(manifestPath),manifestHashEncoding:'UTF-8 normalized to LF',sourceUrl:m.sourceUrl,startUtc:m.startUtc,endUtc:m.endUtc,origin:m.origin,frame:m.frame,timeScale:m.timeScale,units:m.units,geometric:true,historical:!!m.historical,objectCount:folder?expectedIds.length:10,chunks:m.chunks.length,stateRows:states,seamsChecked:seams,sourceFilesChecked:sourceFiles,integrityPassed:true,recordedInterpolationMaxKm:recordedMax,interpolationEvidence:!folder?'本轮使用浏览器插值函数重算独立中点':'核对既有留出点报告与源文件；本轮未重算所有留出点'});totalStates+=states;
 console.log('PASS',folder||'main',m.chunks.length,'chunks',seams,'seams');
}
const m=read(resolve(dataRoot,'manifest.json'));const checkpoints:any[]=[];
for(const target of m.targets){
 const raw=gunzipSync(readFileSync(resolve(root,target.rawFile))).toString('utf8');const rows=raw.split('$$SOE')[1].split('$$EOE')[0].trim().split(/\r?\n/).map(line=>{const v=line.split(',');return [(Number(v[0])-2451545)*86400,...v.slice(2,8).map(Number)];});
 let kind:'display'|'simulation'='display',index=m.displayNaifIds.indexOf(target.naifId);if(index<0){kind='simulation';index=m.simulationNaifIds.indexOf(target.naifId);}requireCheck(index>=0,'unknown NAIF target');let count=0,maxPositionKm=0,maxVelocityKmS=0;
 for(let i=1;i<rows.length-1;i+=2){const truth=rows[i],chunk=mainChunks.find(c=>truth[0]>=c.chunk.startTdb&&truth[0]<=c.chunk.startTdb+(c.chunk.count-1)*c.chunk.stepSeconds)?.chunk;requireCheck(!!chunk,'held-out time missing');const u=(truth[0]-chunk!.startTdb)/chunk!.stepSeconds;requireCheck(Math.abs(u-Math.round(u))>.49,'checkpoint accidentally used as node');const result=interpolateChunk(chunk!,truth[0],kind);maxPositionKm=Math.max(maxPositionKm,Math.hypot(...[0,1,2].map(a=>result.positions[index*3+a]-truth[a+1])));maxVelocityKmS=Math.max(maxVelocityKmS,Math.hypot(...[0,1,2].map(a=>result.velocities[index*3+a]-truth[a+4])));count++;}
 requireCheck(maxPositionKm<=1,'held-out exceeds 1 km');checkpoints.push({naifId:target.naifId,count,maxPositionKm,maxVelocityKmS});
}
const physics=read(resolve(dataRoot,'validation-report.json'));requireCheck(physics.source.version===m.version&&physics.summary.passed===true&&Object.values(physics.summary.checks).every(v=>v===true),'physics report failed/stale version');
const report={schemaVersion:1,generatedAt:new Date().toISOString(),scope:'10 bundled state datasets; archive integrity + schema + coverage/seams; core held-out interpolation rerun with production function; other interpolation figures are existing reports, not fresh SPK evaluations.',passed:true,counts:{packages:packages.length,chunks:totalChunks,stateRows:totalStates,currentDynamicObjects:OBSERVATION_COUNTS.allDynamic,satellites:OBSERVATION_COUNTS.satellites,physicsBodies:10,historicalVisitors:1},packages,coreInterpolation:{function:'src/ephemeris/ephemeris.ts:interpolateChunk',checkpoints:checkpoints.reduce((s,r)=>s+r.count,0),maxPositionKm:Math.max(...checkpoints.map(r=>r.maxPositionKm)),thresholdKm:1,targets:checkpoints},physics:{generatedAt:physics.generatedAt,epochUtc:physics.epochUtc,report:'data/validation-report.json',sha256:jsonHash(resolve(dataRoot,'validation-report.json')),hashEncoding:'UTF-8 normalized to LF',checks:physics.summary.checks,convergenceRatio:physics.summary.convergence.ratio},limits:['校验值证明本地文件与清单一致，不证明观测绝对精度。','留出中点的最大误差不是所有连续时刻的严格误差上界。','除核心十体历表外，本轮仅复核既有插值报告及原始档案，不冒充重新执行全部 SPK 检查。','历史访客、固定时刻星表和结构示意不并入当前太阳系的历表位置。','物理十体推演不包含全部观测目标；十年验证只检验模型数值稳定性。']};
writeFileSync(resolve(dataRoot,'validation/science-audit.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({counts:report.counts,core:report.coreInterpolation.maxPositionKm,checkpoints:report.coreInterpolation.checkpoints,passed:true}));
