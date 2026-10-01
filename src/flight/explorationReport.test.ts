import { describe,it,expect } from 'vitest';
import { ExplorationSession,type Visit } from './exploration';
import { createExplorationNotebook,type ExplorationNotebook } from './explorationNotebook';
import { buildExplorationReport,firstCompletedReturn,explorationReportMarkdown } from './explorationReport';

const visit=(id:string,time:number):Visit=>({id,time,fuel:100-time/100,travel:time*3});
const complete=(s:ExplorationSession)=>{s.visits=s.destinations.map((d,i)=>visit(d.id,(i+1)*100));s.state.time=620;s.state.fuel=94;s.distanceTravelled=1800;s.selectedId='home';s.status='arrived';};

describe('exploration report reflects actual arrivals and a separate reading record',()=>{
  it('does not count browsing, planning or flight time as arrivals',()=>{
    const s=new ExplorationSession();s.startTour();s.select('rock');s.state.time=80;
    const before=JSON.stringify(s),book=createExplorationNotebook();
    const report=buildExplorationReport(s,book);
    expect(report.progress).toBe('in-progress');expect(report.completion).toBeNull();
    expect(report.totals.arrivedCount).toBe(0);expect(report.totals.noteCount).toBe(0);
    expect(report.current.targetId).toBe('satellite');expect(report.stations.every(v=>v.firstArrival===null)).toBe(true);
    expect(JSON.stringify(s)).toBe(before);expect(book).toEqual(createExplorationNotebook());
  });
  it('requires a home arrival after the other stops, even if home was visited earlier',()=>{
    const s=new ExplorationSession();s.visits=[visit('home',20),...s.destinations.filter(d=>d.id!=='home').map((d,i)=>visit(d.id,100+i*100))];
    const report=buildExplorationReport(s,createExplorationNotebook());
    expect(report.totals.arrivedCount).toBe(6);expect(report.progress).toBe('awaiting-return');expect(report.completion).toBeNull();
    s.visits.push(visit('home',650));expect(buildExplorationReport(s,createExplorationNotebook()).completion?.time).toBe(650);
  });
  it('keeps the first completed return while later flight and repeated visits accumulate',()=>{
    const s=new ExplorationSession();complete(s);const first=buildExplorationReport(s,createExplorationNotebook());
    s.visits.push(visit('satellite',700),visit('home',900));s.selectedId='rock';s.status='cruise';s.state.time=1000;s.distanceTravelled=3200;s.state.fuel=88;
    const later=buildExplorationReport(s,createExplorationNotebook());
    expect(later.progress).toBe('completed');expect(later.completion).toEqual(first.completion);
    expect(later.current.targetId).toBe('rock');expect(later.totals.travel).toBe(3200);expect(later.totals.fuelUsed).toBe(12);
    expect(later.stations.find(v=>v.id==='satellite')?.arrivalCount).toBe(2);
    expect(later.stations.find(v=>v.id==='home')?.lastArrival?.time).toBe(900);
  });
  it('keeps reached, opened descriptions and saved notes as three different facts',()=>{
    const s=new ExplorationSession();s.visits=[visit('satellite',100),visit('view',300)];
    const book:ExplorationNotebook={opened:{satellite:['panel'],stage:['shell']},notes:[{id:'view',time:315,parts:[]},{id:'stage',time:330,parts:['shell']}]};
    const report=buildExplorationReport(s,book),view=report.stations.find(v=>v.id==='view')!,satellite=report.stations[0],stage=report.stations[1];
    expect(report.totals.arrivedCount).toBe(2);expect(report.totals.noteCount).toBe(1);
    expect(satellite.note).toBeNull();expect(satellite.openedParts).toEqual(['太阳能板']);expect(view.note?.time).toBe(315);expect(stage.note).toBeNull();
    expect(stage.firstArrival).toBeNull();
  });
  it('exports interval differences from actual arrival order, including revisits and waiting',()=>{
    const s=new ExplorationSession();s.visits=[{id:'stage',time:200,fuel:96,travel:400},{id:'satellite',time:380,fuel:92,travel:760},{id:'stage',time:500,fuel:90,travel:1000}];
    const report=buildExplorationReport(s,createExplorationNotebook());
    expect(report.arrivals.map(v=>v.id)).toEqual(['stage','satellite','stage']);
    expect(report.arrivals.map(v=>[v.elapsed,v.distance,v.fuelUsed])).toEqual([[200,400,4],[180,360,4],[120,240,2]]);
    expect(report.stations.map(v=>v.id)).toEqual(s.destinations.map(v=>v.id));
  });
  it('freezes report data independently of mutable flight and notebook state',()=>{
    const s=new ExplorationSession();complete(s);const book:ExplorationNotebook={opened:{home:[]},notes:[{id:'home',time:615,parts:[]}]};
    const report=buildExplorationReport(s,book),frozen=JSON.stringify(report);
    s.visits[0].fuel=5;s.state.position.set(100,200,300);s.state.time+=30;book.notes[0].parts.push('invented');book.notes[0].time=999;
    expect(JSON.stringify(report)).toBe(frozen);
  });
  it('ignores unknown arrivals and returns no completion without a home destination',()=>{
    const s=new ExplorationSession();s.visits=[visit('invented',5),visit('home',10)];
    expect(buildExplorationReport(s,createExplorationNotebook()).totals.arrivedCount).toBe(1);
    expect(firstCompletedReturn(s.visits,s.destinations.filter(d=>d.id!=='home'))).toBeNull();
  });
  it('produces readable Chinese Markdown and JSON with units and honest partial progress',()=>{
    const s=new ExplorationSession();s.visits=[visit('satellite',100)];s.state.time=120;s.state.fuel=99;s.distanceTravelled=300;
    const report=buildExplorationReport(s,createExplorationNotebook()),md=explorationReportMarkdown(report);
    expect(md).toContain('巡视尚未完成');expect(md).toContain('未保存（不等于未观察）');expect(md).toContain('## 实际抵达顺序');
    expect(md).toContain('包含停留和手动驾驶');expect(md).toContain('不能导入恢复飞行');expect(md).not.toContain('NaN');
    expect(JSON.parse(JSON.stringify(report))).toEqual(report);expect(report.units.fuel).toBe('kg');
  });
});
