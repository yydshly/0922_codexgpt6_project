import type {CrewSnapshot} from './crewMission';
import {crewPlaybackRate} from './crewDirections';

/** Describes computed forces. An authorization or oil-lever position is not a force. */
export function crewPropulsionReadout(s:CrewSnapshot){
  const thrustN=Math.hypot(...s.thrust),jets=Math.hypot(...s.attitudeEffort)>1e-5;
  const read=(kind:string,title:string,detail:string)=>({kind,title,detail,thrustN});
  if(['failed','complete'].includes(s.phase))return read('frozen','任务结束 · 读数冻结','保留结束时的状态，不继续计算之后的运动。');
  if(s.phase==='ground')return read('pad','发射台约束 · 尚未启动','点火与释放约束分别授权，火箭不会自动离台。');
  if(s.phase==='countdown')return thrustN>1
    ?read('ignition','发动机建压 · 仍受发射台约束','推力已经建立；完成倒计时并释放约束后才离台。')
    :read('ignition-wait','倒计时进行中 · 尚无主推力','授权已确认，等待实际推力建立；发射台保持约束。');
  if(s.carrierStage!=='none'){
    const stage=s.carrierStage==='booster'?'一级':'二级';
    if(thrustN>1)return read('carrier-thrust',`${stage}主发动机推进`,'实际推力沿当前发动机轴；转姿与航迹变化分别计算。');
    if(s.pilot.active&&s.pilot.engineEnabled&&!s.automatic&&s.pilot.throttle===0)return read('zero-throttle',`${stage}授权保留 · 油门为零`,'当前无主推力，仍受重力和阻力；继续后可增大油门或恢复飞控辅助。');
    return read('carrier-coast',`${stage}当前无主推力`,'正在滑行；点火授权、推力建立或关机状态以本节操作条件为准。');
  }
  if(s.phase==='deorbit'){
    if(thrustN>1)return read('deorbit-thrust','服务舱主发动机产生离轨推力','推力沿实际船头方向；与地心速度的夹角决定是减速、增速还是改变航迹。');
    if(s.pilot.active&&!s.pilot.engineEnabled)return read('deorbit-cutoff','离轨主发动机已关机','按实际轨道条件分离服务舱，之后只有乘员舱继续返回。');
    return s.automatic?read('deorbit-preparation','离轨已授权 · 尚无主推力','辅助先完成逆速度转姿并稳定，满足点火条件后才建立主推力。')
      :read('deorbit-manual','本人控制离轨 · 当前无主推力','核对实际朝向、油门和推进剂；恢复辅助可继续执行转姿与点火条件。');
  }
  if(['approach','observe','return-ready'].includes(s.phase))return read('service-rcs','服务舱姿态与平移喷口',thrustN>1?'喷口正在产生有限平移推力；相对平台停稳仍共同绕地。':jets?'当前姿态喷口正在转姿，平移推力接近零。':'当前平移推力接近零，仍沿现有轨道运动。');
  if(s.phase==='touchdown')return read('support','主推力关闭 · 缓冲与地面支撑','停稳与承载检查通过后才能发出回收信号。');
  if(s.phase==='landing')return thrustN>1?read('landing-thrust','软着陆喷口产生推力','推力沿实际舱体发动机轴，手动偏转会改变推力方向。'):read('landing-idle','软着陆段 · 当前无主推力','核对专用推进剂与油门；降落伞和重力仍参与受力。');
  return read('capsule-return',jets?'无主推力 · 返回舱姿态喷口转姿':'无主推力 · 返回舱继续下降或滑行',s.chuteAreaM2>0?'伞拉力、阻力与重力继续作用；姿态喷口不是平移主发动机。':'姿态喷口改变朝向，重力与空气阻力继续改变航迹。');
}

/** Uses the worker's playback policy; this is not a wall-clock performance measurement. */
export function crewPlaybackReadout(s:CrewSnapshot,playing:boolean,selected:number){
  const requested=[1,10,60,180].includes(selected)?selected:1;
  const adopted=crewPlaybackRate(s,requested);
  if(['failed','complete'].includes(s.phase))return {requested,adopted:0,reason:'任务已结束，模拟时钟停止。'};
  if(s.pilot.pendingAction)return {requested,adopted:0,reason:'教学检查点暂停，等待你授权当前动作。'};
  if(!playing||s.phase==='ground')return {requested,adopted:0,reason:'模拟已暂停；按当前任务指引操作，不推进时间。'};
  return {requested,adopted,reason:!s.automatic?'本人驾驶使用 1×；倍率选择保留供辅助模式使用。':adopted<requested?adopted===1?'本阶段或转姿采用 1×，便于观察与操作。':'接近或离轨阶段限制为最多 10×。':'按选择的倍率推进。'};
}
