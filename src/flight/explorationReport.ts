import { createFlightState } from './flightPractice';
import type { Destination, ExplorationSession, Visit } from './exploration';
import type { ExplorationNotebook } from './explorationNotebook';
import { EXPLORATION_STORIES } from './explorationNarrative';
import { OBSERVATIONS } from './explorationObservation';

/** A home visit counts as a return only after every catalogued stop was actually reached. */
export function firstCompletedReturn(visits:readonly Visit[],destinations:readonly Destination[]):Visit|null {
  const known=new Set(destinations.map(d=>d.id)),seen=new Set<string>();
  if(!known.has('home'))return null;
  for(const visit of visits){
    if(!known.has(visit.id))continue;
    seen.add(visit.id);
    if(visit.id==='home'&&seen.size===known.size)return {...visit};
  }
  return null;
}

export function buildExplorationReport(session:ExplorationSession,book:ExplorationNotebook){
  const known=new Map(session.destinations.map(d=>[d.id,d]));
  const visits=session.visits.filter(v=>known.has(v.id));
  const completion=firstCompletedReturn(visits,session.destinations);
  const initialFuel=createFlightState().fuel;
  const stations=session.destinations.map(d=>{
    const arrivals=visits.filter(v=>v.id===d.id),note=book.notes.find(n=>n.id===d.id);
    const profile=OBSERVATIONS[d.id],story=EXPLORATION_STORIES[d.id];
    const opened=profile?.parts.filter(part=>book.opened[d.id]?.includes(part.id)).map(part=>part.label)??[];
    return {id:d.id,name:d.name,chapter:story?.chapter??d.name,question:story?.observe??d.lookFor,
      explanation:story?.finding??d.description,arrivalCount:arrivals.length,
      firstArrival:arrivals.length?{...arrivals[0]}:null,lastArrival:arrivals.length?{...arrivals.at(-1)!}:null,
      openedParts:opened,totalParts:profile?.parts.length??0,
      note:arrivals.length&&note?{time:note.time,parts:[...note.parts]}:null};
  });
  const arrivedCount=stations.filter(d=>d.arrivalCount>0).length;
  return {
    schemaVersion:1 as const,mission:'蓝色地平线 · 六站巡视',
    scope:'近地背景中的合成教学航区；无引力局部动力学，非真实轨道、载人发射或驾驶认证。',
    units:{time:'s',distance:'m',fuel:'kg',speed:'m/s',position:'m（相对航区起点，非海拔）'},
    capturedAt:session.state.time,
    progress:completion?'completed' as const:arrivedCount===stations.length?'awaiting-return' as const:'in-progress' as const,
    completion:completion?{time:completion.time,travel:completion.travel,fuelRemaining:completion.fuel,fuelUsed:initialFuel-completion.fuel}:null,
    current:{targetId:session.destination.id,targetName:session.destination.name,status:session.status,staying:session.staying,
      speed:session.state.velocity.length(),position:session.state.position.toArray(),contact:session.state.contact,message:session.message},
    totals:{time:session.state.time,travel:session.distanceTravelled,fuelUsed:initialFuel-session.state.fuel,
      fuelRemaining:session.state.fuel,arrivedCount,stationCount:stations.length,noteCount:stations.filter(d=>d.note).length,
      takeovers:session.pilot.takeovers,manualSeconds:session.pilot.manualSeconds},
    stations,
    arrivals:visits.map((v,index)=>{
      const previous=visits[index-1];
      return {...v,sequence:index+1,name:known.get(v.id)!.name,
        elapsed:v.time-(previous?.time??0),distance:v.travel-(previous?.travel??0),fuelUsed:(previous?.fuel??initialFuel)-v.fuel};
    }),
    recordMeaning:'抵达由实际自动接近并停稳确认；打开介绍和保存笔记只记录阅读行为，不证明已经理解或执行拍照、通信、维修。',
  };
}

export type ExplorationReport=ReturnType<typeof buildExplorationReport>;
export const explorationReportTitle=(report:ExplorationReport)=>report.progress==='completed'?'六站往返已记录':report.progress==='awaiting-return'?'地点已到齐，还需返航':'巡视尚未完成';
export function explorationReportMarkdown(report:ExplorationReport):string {
  const lines=[`# ${report.mission} · 航程记录`,'',`状态：${explorationReportTitle(report)}。记录时刻：T+${report.capturedAt.toFixed(1)} s（模拟时间）。`,'',
    report.scope,'','## 截至记录时刻','',
    `- 累计时间：${report.totals.time.toFixed(1)} s（含停留）`,
    `- 累计路程：${report.totals.travel.toFixed(1)} m`,
    `- 已用推进剂：${report.totals.fuelUsed.toFixed(3)} kg；剩余：${report.totals.fuelRemaining.toFixed(3)} kg`,
    `- 已抵达：${report.totals.arrivedCount} / ${report.totals.stationCount}；主动保存笔记：${report.totals.noteCount} / ${report.totals.stationCount}`,
    `- 当前关注：${report.current.targetName}；速率：${report.current.speed.toFixed(3)} m/s`,
    `- 相对起点位置：[${report.current.position.map(v=>v.toFixed(2)).join(', ')}] m（非海拔）`,
    `- 手动接管：${report.totals.takeovers} 次；手动输入累计：${report.totals.manualSeconds.toFixed(1)} s`,
    `- 当前提示：${report.current.contact??(report.current.status==='arrived'&&report.current.staying?'已停稳，主动停留观察；准备好后再继续。':report.current.message)}`,''];
  if(report.completion)lines.push('## 首次完成往返时','',`T+${report.completion.time.toFixed(1)} s；路程 ${report.completion.travel.toFixed(1)} m；已用推进剂 ${report.completion.fuelUsed.toFixed(3)} kg。此后继续飞行不改写这个节点。`,'');
  lines.push('## 按理解顺序回顾','');
  for(const station of report.stations){
    lines.push(`### ${station.chapter} · ${station.name}`,'',
      station.firstArrival?`已抵达 ${station.arrivalCount} 次；首次 T+${station.firstArrival.time.toFixed(1)} s。`:'尚未抵达。',
      station.note?`阅读笔记：主动保存于 T+${station.note.time.toFixed(1)} s。`:'阅读笔记：未保存（不等于未观察）。',
      station.totalParts?`部件介绍：打开 ${station.openedParts.length} / ${station.totalParts} 项${station.openedParts.length?`（${station.openedParts.join('、')}）`:''}。`:'无部件介绍。','',
      `本章观察问题：${station.question}`,'',`本章模型说明：${station.explanation}`,'');
  }
  lines.push('## 实际抵达顺序','',
    '区间用时、路程、耗油为前一次抵达（首次从出发初态）到本次抵达的累计量差，包含停留和手动驾驶，不是最短航线或纯自动驾驶指标。','');
  for(const arrival of report.arrivals)lines.push(`${arrival.sequence}. ${arrival.name} · T+${arrival.time.toFixed(1)} s · 区间 ${arrival.elapsed.toFixed(1)} s / ${arrival.distance.toFixed(1)} m / ${arrival.fuelUsed.toFixed(3)} kg`);
  if(!report.arrivals.length)lines.push('尚无停稳确认后的抵达记录。');
  lines.push('','## 记录的含义','',report.recordMeaning,'',
    '下载的是静态文字记录，不能导入恢复飞行。网页退出或重启后，本次内存中的航程会清空；下载文件由你自行保存。','');
  return lines.join('\n');
}
