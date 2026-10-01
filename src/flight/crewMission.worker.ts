import {createCrewMission,CrewMission,crewIdle,type CrewControls,type CrewSnapshot} from './crewMission';
import {crewPlaybackRate} from './crewDirections';
import {CREW_PILOT_FLIGHT_PHASES,type CrewPilotAction} from './crewPilotControl';
export type CrewCommand='start-demo'|'start-manual'|'start-pilot'|'pause'|'resume'|'takeover'|'automatic'|'observe'|'return'|'main-chute'|'recover'|'reset'|'save';
export type CrewRequest={type:'command';command:CrewCommand}|{type:'pilot-action';action:CrewPilotAction}|{type:'throttle';value:number}|{type:'tick';seconds:number;rate:number;input:CrewControls}|{type:'snapshot'}|{type:'restore';data:unknown};
export type CrewResponse={type:'state';state:CrewSnapshot;playing:boolean}|{type:'error'|'notice';message:string}|{type:'save';data:ReturnType<CrewMission['save']>};
let mission:ReturnType<typeof createCrewMission>;let playing=false,debt=0;
const send=()=>postMessage({type:'state',state:mission.snapshot(),playing} satisfies CrewResponse);
const notice=(message:string)=>postMessage({type:'notice',message} satisfies CrewResponse);
const continuePilot=()=>{playing=!mission.awaitingPilotAction&&!['ground','complete','failed'].includes(mission.phase);};
try{mission=createCrewMission();send();}catch(error){postMessage({type:'error',message:String(error)});}
onmessage=(event:MessageEvent<CrewRequest>)=>{
  if(!mission)return;
  try{
    const request=event.data;
    if(request.type==='command'){
      const c=request.command;debt=0;
      if(c==='save'){playing=false;postMessage({type:'save',data:mission.save()} satisfies CrewResponse);}
      else if(c==='reset'){mission=createCrewMission();playing=false;}
      else if(c==='start-demo'||c==='start-manual'){mission.start(c==='start-demo');playing=true;}
      else if(c==='start-pilot'){mission.startPilot();playing=false;}
      else if(c==='pause')playing=false;
      else if(c==='resume'){
        continuePilot();if(mission.awaitingPilotAction)notice(mission.message);
      }else if(c==='takeover'){
        if(CREW_PILOT_FLIGHT_PHASES.includes(mission.phase)){mission.enablePilotRoute();mission.takeOver();if(mission.awaitingPilotAction)playing=false;}
        else notice('当前阶段不接受直接驾驶输入；请使用本阶段任务动作。');
      }else if(c==='automatic')mission.resumeAutomatic();
      else if(c==='observe'){
        if(mission.observe()){if(mission.pilotRouteActive)continuePilot();}
        else notice('尚不能记录观察：需要 30–100 m 距离、相对速率 ≤0.15 m/s、船头偏角 ≤6°。');
      }else if(c==='return'){
        if(mission.pilotRouteActive){if(mission.pilotAction('begin-deorbit'))continuePilot();else notice(mission.message);}
        else mission.returnHome();
      }else if(c==='main-chute'){
        if(mission.pilotRouteActive){if(mission.pilotAction('open-main'))continuePilot();else notice(mission.message);}
        else mission.mainChute();
      }else if(c==='recover'){
        if(mission.pilotRouteActive){if(mission.pilotAction('recover'))continuePilot();else notice(mission.message);}
        else mission.recover();
      }
    }else if(request.type==='pilot-action'){
      debt=0;if(mission.pilotAction(request.action)){continuePilot();notice(mission.message);}else notice(mission.message);
    }else if(request.type==='throttle'){
      if(Number.isFinite(request.value))mission.setPilotThrottle(request.value);else notice('油门值必须是有效数字。');
    }else if(request.type==='restore'){
      playing=false;debt=0;
      try{const restored=CrewMission.restore(request.data);mission=restored;postMessage({type:'notice',message:'已恢复同一任务的状态；当前暂停，请核对后继续。'} satisfies CrewResponse);}
      catch(error){postMessage({type:'notice',message:`恢复失败，当前任务仍保留：${String(error)}`} satisfies CrewResponse);}
    }else if(request.type==='tick'&&playing){
      const manual=!mission.automatic&&CREW_PILOT_FLIGHT_PHASES.includes(mission.phase);
      const rate=crewPlaybackRate({phase:mission.phase,automatic:mission.automatic,attitude:mission.attitude.toArray(),velocity:mission.velocity,angularVelocity:mission.angularVelocity.toArray()},request.rate);
      debt+=Math.max(0,Math.min(.1,request.seconds))*rate;
      let budget=200;
      while(debt>=.1-1e-10&&budget-->0&&playing){
        const phase=mission.phase;mission.step(.1,manual?request.input:crewIdle());debt-=.1;
        if(['complete','failed'].includes(mission.phase)){playing=false;debt=0;}
        if(mission.pilotRouteActive&&(mission.awaitingPilotAction||phase!==mission.phase&&mission.phase==='observe')){
          playing=false;debt=0;
          if(mission.phase==='observe')notice('已相对平台停稳，教学模拟已暂停；请检查观察条件并点击“记录平台结构观察”。');
        }
        // Publish every actual phase boundary before advancing further, never skip its view.
        if(phase!==mission.phase){debt=0;break;}
        // A turn may begin inside this batch. Publish immediately when playback slows,
        // otherwise a high-rate tick could compute the entire turn before showing it.
        const nextRate=crewPlaybackRate({phase:mission.phase,automatic:mission.automatic,attitude:mission.attitude.toArray(),velocity:mission.velocity,angularVelocity:mission.angularVelocity.toArray()},request.rate);
        if(nextRate<rate){debt=0;break;}
      }
      debt=Math.max(0,Math.min(debt,20));
    }
    send();
  }catch(error){playing=false;debt=0;postMessage({type:'error',message:`任务计算停止：${String(error)}`} satisfies CrewResponse);}
};
