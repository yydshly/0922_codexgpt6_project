import type { FlightState } from '../launch/liftoff';
import { currentPhenomenon, flightEnvironmentReading } from '../launch/flightPhenomena';
import { launchStoryRecord, type LaunchStoryRecord } from '../flight/flightStory';

export interface LaunchTraining { onHandover:(record:LaunchStoryRecord|null)=>void }
export function LaunchStoryPanel({state,started,paused,ready,error,onStart,onPause,onHandover,onPhenomena,speed,onSpeed}:{state:FlightState;started:boolean;paused:boolean;ready:boolean;error:string;onStart:()=>void;onPause:()=>void;onHandover:LaunchTraining['onHandover'];onPhenomena:()=>void;speed:1|3;onSpeed:(speed:1|3)=>void}) {
  const record=launchStoryRecord(state),phenomenon=currentPhenomenon(state),air=flightEnvironmentReading(state);
  return <section className="launch-story-panel" data-ready={!!record}>
    <small>蓝色地平线 / 第 2 章 / 地面引导</small><h2>{record?'入轨验证完成':'从点火到轨道'}</h2>
    <p>先观看基准两级火箭。制导与分级由已有模型自动执行；你的任务是理解画面中的变化，随后接手局部驾驶练习。</p>
    <ol><li>点火建压 → 喷焰与离台</li><li>上升 → 空气变稀、阻力与喷流变化</li><li>分级 → 一级分离、二级点火</li><li>关机 → 滑行一圈并验证轨道</li></ol>
    <div className="story-phenomenon" role="status"><strong>{phenomenon.title}</strong><p>{phenomenon.description}</p></div>
    <dl><div><dt>高度</dt><dd>{(air.altitudeM/1000).toFixed(1)} km</dd></div><div><dt>空气密度</dt><dd>{air.density.toExponential(2)} kg/m³</dd></div><div><dt>动压</dt><dd>{(air.dynamicPressurePa/1000).toFixed(2)} kPa</dd></div><div><dt>推力</dt><dd>{(state.thrustN/1000).toFixed(1)} kN</dd></div></dl>
    {error&&<p role="alert">{error}</p>}
    {record?<button className="story-launch-handover" onClick={()=>onHandover(record)}>查看入轨交接 →</button>:!started?<button className="story-launch-start" disabled={!ready} onClick={onStart}>授权开始发射演示</button>:<button className="story-launch-pause" disabled={!ready} onClick={onPause}>{paused?'继续发射演示':'暂停并观察'}</button>}
    <button onClick={onPhenomena}>查看当前现象与参数解释</button>
    {started&&!record&&<button className="story-launch-speed" onClick={()=>onSpeed(speed===1?3:1)}>演示节奏：{speed===1?'正常 · 点击加快':'加快三倍 · 点击恢复'}</button>}
    {!record&&<button className="story-launch-skip" onClick={()=>onHandover(null)}>跳过观摩，进入驾驶准备</button>}
    <small>跳过会记为「未完成观摩」，不会生成入轨记录。本故事不改写已有发射存档。</small>
  </section>;
}
