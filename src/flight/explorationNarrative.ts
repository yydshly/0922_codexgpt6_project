import type { ExplorationSession } from './exploration';
import { attitudeActivity } from './attitudeControl';

export interface ExplorationStory {chapter:string;purpose:string;observe:string;finding:string;departure:string}
export const EXPLORATION_STORIES:Record<string,ExplorationStory>={
  satellite:{
    chapter:'01 · 认识一艘飞行器',
    purpose:'从一颗教学卫星开始。先辨认它怎样获取能量、朝哪里观察，再看自己的飞船怎样靠近。',
    observe:'找一找太阳能板、载荷镜头和天线：它们的朝向和形状有什么不同？',
    finding:'同一颗卫星上的部件承担不同功能；看清结构，是理解它的第一步。模型没有执行拍照或通信任务。',
    departure:'下一站仍是人造物体，却没有展开的太阳能翼。去看看废弃级段的外形和翻滚。',
  },
  stage:{
    chapter:'02 · 运动不等于工作',
    purpose:'接近缓慢翻滚的级段。先保持距离，再把它自身的转动和飞船的移动分开看。',
    observe:'盯住一端的框架：它怎样转到亮面，再进入阴影？整个筒体的中心有没有跟着移动？',
    finding:'这里的级段中心固定，外壳按教学设定翻滚。转动本身不能证明发动机还在工作，也不能说明里面还剩多少燃料。',
    departure:'从一个孤立筒体，转向由多个部件组合的平台。下一段航路需要重新对准，也要重新预留减速距离。',
  },
  station:{
    chapter:'03 · 当部件组成平台',
    purpose:'中继平台由多个部件组合而成。沿途留意舱段、桁架和太阳能翼怎样逐渐分开，显出各自的轮廓。',
    observe:'把平台的舱段和太阳能翼，与教学卫星的主体和板面作比较：哪些部分相似，哪些结构更复杂？',
    finding:'组合结构让部件的连接方式变得可见。这是一座原创教学平台，当前没有模拟人员驻留、对接或中继服务。',
    departure:'下一站把注意力从飞行器移向地球。观景点只是一个位置标记，那里没有等待对接的建筑。',
  },
  view:{
    chapter:'04 · 把目光移向地球',
    purpose:'驶向一处空的观景航点。到达以后向下看，试着把云层、大气边缘与导航标记区分开。',
    observe:'沿着地球弧面移动视线：云层在哪里结束，薄亮的边缘又在哪里出现？',
    finding:'观景点没有实体，停留位置由导航定义。眼前的地球用于视觉观察；这段局部航行没有模拟真实轨道转移。',
    departure:'接下来用不规则岩体练习另一种观察：轮廓和阴影会随视角改变，接近时仍要给减速留出余地。',
  },
  rock:{
    chapter:'05 · 不规则的边界',
    purpose:'来到刻意布置的岩体演练区。它的凹凸轮廓比圆筒更难判断距离，停在观察区后再慢慢看。',
    observe:'选一处明显的凸起，观察它随自转进入阴影；换个角度，它还呈现同样的轮廓吗？',
    finding:'可见表面并不等于接触边界：本演练用包住岩体的球面检测接触。这是合成物体，不代表近地空间存在这样的岩群。',
    departure:'最后返回出发航点。把一路的停靠、累计里程和剩余推进剂放在一起，看这趟往返留下了什么。',
  },
  home:{
    chapter:'06 · 带着航迹返回',
    purpose:'驶回出发航点附近。仍由同一艘飞船完成最后一次对准、推进和减速，途中积累的状态会一直保留。',
    observe:'比较累计里程与剩余推进剂，再回想每次转向和停稳：哪些时刻需要喷气，哪些时刻只是继续滑行？',
    finding:'返回航点不会回满推进剂，也不会清空时间和轨迹。到达记录描述这次局部教学航行，不代表真实发射或驾驶认证。',
    departure:'旅程可以在这里停留，也可以再访任意地点；下一段航行会接着现在的位置、速度和推进剂继续。',
  },
};

export interface NarrativeCue {speaker:string;title:string;text:string;action:string;tone:'normal'|'warning'|'success'}

/** Count recorded arrivals, never selections, previews or an inferred act of observation. */
export function narrativeArrivalCount(session:ExplorationSession){
  const known=new Set(Object.keys(EXPLORATION_STORIES));
  return new Set(session.visits.filter(visit=>known.has(visit.id)).map(visit=>visit.id)).size;
}

/** A read-only narration of the live vessel state; browsing never changes its subject. */
export function narrativeCue(session:ExplorationSession,paused:boolean):NarrativeCue {
  const destination=session.destination,name=destination.name;
  const story=EXPLORATION_STORIES[destination.id]??{chapter:name,purpose:destination.description,observe:destination.lookFor,finding:'先停稳，再观察目标。',departure:'可以选择下一站，或继续手动探索。'};
  const cue=(title:string,text:string,action:string,tone:NarrativeCue['tone']='normal',speaker='领航员'):NarrativeCue=>({speaker,title,text,action,tone});
  if(session.state.contact)return cue('航程暂停 · 检查接触',session.state.contact,'查看接触提示，重置后可以重新出发。','warning','飞行提示');
  if(session.status==='blocked'||session.pilot.phase==='blocked')return cue('接近中止 · 先处理当前状况',session.status==='blocked'?session.message:session.pilot.message,'按提示处理距离、航线或推进剂，再决定是否重新前往。','warning','飞行提示');
  if(paused){
    const context=session.status==='arrived'?`当前停留于${name}。飞船运动与下一站倒计时均已暂停。`:session.status==='free'||!session.pilot.enabled?'手动探索已暂停。当前位置、速度和推进剂保留，当前没有自动接近的航线。':`前往${name}的航程已暂停。飞船会保留当前的位置、速度和推进剂。`;
    return cue('暂停在这一刻',`${context}恢复后会从当前状态继续。`,'可以先读完说明，准备好后恢复航行。');
  }
  if(session.status==='arrived'){
    const complete=destination.id==='home'&&narrativeArrivalCount(session)===Object.keys(EXPLORATION_STORIES).length;
    if(complete)return cue('六站到达记录已齐',`已返回${name}。${story.observe} 到达记录只表示自动接近后停稳，观察内容仍由你自己辨认。`,'回看航行记录，或从当前位置开始下一段探索。','success','航行记录');
    const next=session.destinations.find(d=>d.id===session.tour[0]);
    const action=next?(session.staying?`正在停留；准备好后继续前往${next.name}。`:`${Math.max(0,Math.ceil(session.dwell))} 秒后前往${next.name}；想多看一会儿，可以选择停留。`):'可以停留观察，或选择下一站继续航行。';
    return cue(`抵达 · ${name}`,`${story.observe} ${story.finding}`,action,'success','观察提示');
  }
  if(session.status==='free'||!session.pilot.enabled){
    if(session.state.fuel<=0)return cue('推进剂已用尽','当前无法继续用喷气改变速度或姿态；已有运动仍可能持续。到达记录不会因此补全。','查看当前状态；需要重新练习时，返回全景后重新进入航区。','warning','飞行提示');
    const moving=session.state.velocity.length()>.01,turning=session.state.angularVelocity.length()>.003||session.state.rcsTorque.length()>.005;
    const motion=session.state.mainThrust>.001?'主推进正在沿船头方向改变速度。船头朝向和当前运动方向可能不同，航迹会随着推力逐渐改变。':session.state.firing>.001&&session.state.rcsTranslation.length()>.001?'RCS 喷口正在施加平移推力，改变飞船速度。留意速度变化；松开后，尚未消除的运动会继续保留。':turning?`船头正在调整姿态。${moving?'飞船仍沿已有速度移动；转船头本身不会把航迹一起转过去。':'改变朝向本身不会让飞船沿新方向前进，还需要平移推力。'}`:moving?'飞船正沿已有速度滑行。改变船头朝向以后，还需要推力才能逐渐改变航迹；松开推进键不会自行停车。':'可以从教学卫星开始连续探索，也可以选择一站自动前往，或亲自驾驶。每一段航行都会接着当前状态继续。';
    return cue(session.pilot.takeovers?'飞船交由你控制':'从这里开始探索',motion,'选择目的地并出发；手动接近不会自动记为已经停靠或完成观察。');
  }
  const waypoint=session.routeIndex<session.route.length-1;
  const leg=waypoint?`前往${name}途中，先接近绕行航点`:`正在接近${name}`;
  switch(session.pilot.phase){
    case 'stabilize':return cue('先收住已有的滑行',`${leg}。自动驾驶先检查当前速度，必要时用 RCS 喷气减速，再对准下一段航路。`,'留意速度与推进剂：减速同样需要消耗推进剂。');
    case 'align':{
      const activity=attitudeActivity(session.state.angularVelocity,session.state.rcsTorque);
      const motion=activity.startsWith('反向')?'姿态喷口正在反向制转，让角速度逐渐降下来。':activity.startsWith('成对')?'对应方向的姿态喷口正在建立角速度，让船头逐渐转向航路。':activity==='匀速转姿'?'船头仍在转动；接下来需要反向喷气制转，才能稳定对准。':'正在检查船头方向与角速度，稳定对准后才开始主推进。';
      return cue('转船头，也要停住转动',`${leg}。${motion} 转船头本身不会把原有航迹一起转过去。`,'观察工作的喷口与船头变化，再看主推进何时启动。');
    }
    case 'thrust':return cue('给下一段航程一点推力',`${leg}。主推进沿船头方向改变速度，目标正在逐渐靠近。${waypoint?'这个航点用于绕行，不会增加到达记录。':story.purpose}`,'对照速度与推进剂变化；接近以后还要预留减速距离。');
    case 'coast':return cue('关闭主推进，继续前进',`${leg}。飞船依靠已有速度滑行，不需要持续点火来维持前进；导航仍在检查减速距离。`,'看目标是否还在变大：喷流熄灭不等于飞船停止。');
    case 'brake':return cue('到了减速的时候',`${leg}。RCS 喷口施加与当前速度相反的推力，逐渐消除滑行；船头不必先掉转一百八十度。`,'看速度逐渐降低，等停稳后再进入观察。');
    case 'hold':return cue(waypoint?'在绕行航点确认停稳':'先停稳，再开始观察',waypoint?`正核对绕行航点的停止状态，随后继续前往${name}；这里不算一站到达。`:`已接近${name}的观察区，正在确认速度与推进已稳定停止。连续停稳 3 秒后，才会写入到达记录。`,'到达确认只记录飞船状态，接下来请自行环顾和辨认目标。');
    default:return cue(`继续前往 · ${name}`,story.purpose,'留意当前飞行状态，等待接近与停稳确认。');
  }
}
