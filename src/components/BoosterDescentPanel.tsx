import { BOOSTER_REFERENCE, boosterStage, type BoosterRecord, type BoosterSample } from '../launch/boosterDescent';
import { telemetryNumber } from '../launch/flightTelemetry';
import { BOOSTER_PLAYBACK_RATES, type BoosterPlaybackRate } from '../launch/boosterPlayback';
import notesUrl from '../../docs/BOOSTER-DESCENT.md?url';
import './BoosterDescentPanel.css';

interface Props {
 record:BoosterRecord;sample:BoosterSample;replaying:boolean;playing:boolean;ended:boolean;rate:BoosterPlaybackRate;canReplay:boolean;
 missionTime:number;paused:boolean;running:boolean;onSeek:(time:number)=>void;onPlayback:()=>void;onRestart:()=>void;onRate:(rate:BoosterPlaybackRate)=>void;onFollow:()=>void;onPause:()=>void;onClose:()=>void;
}
export function BoosterDescentPanel({record,sample,replaying,playing,ended,rate,canReplay,missionTime,paused,running,onSeek,onPlayback,onRestart,onRate,onFollow,onPause,onClose}:Props){
 const points=record.samples,first=record.startTime,last=record.latest.time;
 const curve=(key:'altitudeM'|'airSpeedMS'|'qPa',label:string,divisor:number,unit:string)=>{
  const maximum=Math.max(divisor,...points.map(p=>p[key])),x=(t:number)=>35+310*(t-first)/Math.max(1,last-first),y=(v:number)=>96-62*v/maximum;
  return <svg viewBox="0 0 370 124" role="img" aria-label={`${label}随一级记录时间变化`}><text x="8" y="16">{label} · {unit}</text><text x="345" y="16" textAnchor="end">{(maximum/divisor).toFixed(1)}</text><path d={points.map((p,i)=>`${i?'L':'M'}${x(p.time)},${y(p[key])}`).join(' ')} fill="none" stroke="#edbf78" strokeWidth="2"/><line x1={x(sample.time)} x2={x(sample.time)} y1="28" y2="96" stroke="#a7e2d4"/><text x="35" y="117">T+{first.toFixed(0)} s</text><text x="345" y="117" textAnchor="end">T+{last.toFixed(0)} s</text></svg>;
 };
 const metric=(label:string,value:number|null,unit:string,digits=2)=><div><dt>{label}</dt><dd>{value===null?'未计算 / 超出范围':telemetryNumber(value,digits)+' '+unit}</dd></div>;
 return <section className="booster-descent-panel" aria-label="一级去向与参考下降">
  <header><div><small>本次一级 · 消耗型参考路线</small><h2>分离以后，一级去了哪里？</h2></div><button onClick={onClose}>返回主任务画面</button></header>
  <p data-booster-status><strong>{replaying?ended?'回放已结束':playing?'正在回放':'回放已暂停':record.status==='flying'?'跟随当前一级':'一级过程已结束'} · {boosterStage(sample)}</strong><br/>一级 T+{sample.time.toFixed(2)} s；主任务 T+{missionTime.toFixed(2)} s。</p>
  <div className="booster-playback" aria-label="一级过程播放控制">
   <div className="booster-actions"><button disabled={!canReplay} onClick={onPlayback}>{playing?'暂停回放':ended?'重新播放一级过程':replaying?'继续回放':'播放已记录过程'}</button><button disabled={!canReplay} onClick={onRestart}>从分离处重播</button></div>
   <div className="booster-rates" aria-label="一级回放速度">回放速度 {BOOSTER_PLAYBACK_RATES.map(value=><button key={value} aria-pressed={rate===value} onClick={()=>onRate(value)}>{value} 倍</button>)}</div>
   <p role="status">{replaying?'正在查看本次已经计算的轨迹；播放或拖动进度不会推进二级与卫星任务。':record.status!=='flying'?'这里是已经结束的一级记录，终点不会继续运动。可点击上方播放过程。':!running?'主任务停在检查点，一级同步等待。返回主任务完成当前步骤后继续。':paused?'主任务已暂停，一级也暂停。点击下方「继续主任务与一级」即可推进。':'一级正在随主任务运动。跟随镜头保持箭体居中，可结合高度和地球背景观察变化。'}{!canReplay&&' 当前刚分离，尚无可播放的后续轨迹。'}</p>
  </div>
  <p>分离后保留原速度，先继续爬升，再受引力和空气阻力下降。一级无燃料、无推力；这里未安装回收发动机、降落伞或着陆腿。</p>
  <div className="booster-actions"><button onClick={onFollow} aria-pressed={!replaying}>{record.status==='flying'?'跟随当前一级':'查看一级终点'}</button>{!replaying&&running&&record.status==='flying'&&<button onClick={onPause}>{paused?'继续主任务与一级':'暂停主任务与一级'}</button>}</div>
  {record.status==='flying'&&!running&&<p>主任务停在检查点。请在左侧继续上升或入轨流程，一级也会继续计算；不会提前生成未来结局。</p>}
  {record.status!=='flying'&&(!replaying||ended)&&<p className="booster-boundary">{record.reason} 后续主任务继续时，此处保留独立标时的历史记录。</p>}
  <label>一级过程进度 · T+{sample.time.toFixed(1)} / {last.toFixed(1)} s<input type="range" aria-label="回看一级轨迹" min={first} max={last} step="0.01" disabled={!canReplay} value={sample.time} onChange={e=>onSeek(Number(e.target.value))}/></label>
  <p>回看只切换画面和读数，不回滚主任务。80 km 以下改画等效质点；这一显示切换不是解体高度判定。</p>
  <dl className="booster-metrics">{metric('椭球参考高度',(Math.abs(sample.altitudeM)<.001?0:sample.altitudeM/1000),'km',3)}{metric('相对空气速度',sample.airSpeedMS,'m/s')}{metric('向上速度（下降为负）',sample.verticalMS,'m/s')}{metric('等效质量',record.massKg,'kg')}{metric('空气密度',sample.density,'kg/m³',4)}{metric('空气阻力',sample.dragN/1000,'kN')}{metric('气流动压',sample.qPa/1000,'kPa')}{metric('环境温度',sample.temperatureK,'K')}{metric('马赫数',sample.mach,'')}{metric('参考驻点热流',sample.heatFluxWm2===null?null:sample.heatFluxWm2/1000,'kW/m²')}</dl>
  <div className="booster-curves">{curve('altitudeM','高度',1000,'km')}{curve('airSpeedMS','相对空气速度',1000,'km/s')}{curve('qPa','动压',1000,'kPa')}</div>
  <details><summary>本次节点与参数假设</summary><ol>{record.events.map((e,i)=><li key={i}>T+{e.time.toFixed(2)} s · {e.label}</li>)}</ol><p>从本次分离的实际位置、速度和干质量出发。80 km 以上延用指数教学大气；下降穿过 80 km 后用本地标准参考大气。固定 Cd={BOOSTER_REFERENCE.cd}、参考半径 {BOOSTER_REFERENCE.radiusM} m，无升力；外观保持分离朝向，不求解翻滚。热流仅在进入参考大气且 Mach ≥5 时估算，不是表面温度。</p><p>0 m 是椭球参考面；未接入地形、海陆判定、风场、材料烧蚀与解体，不得据此认定真实落海位置或回收成功。</p><a href={notesUrl}>实现、来源和验证说明 ↗</a></details>
 </section>;
}
