import { Vector3 } from 'three';
import { autopilotInput,createAutopilot,engageAutopilot,takeOverAutopilot,idleInput,hasManualInput } from './autopilot';
import { createFlightState,stepFlight,SHIP_COLLISION_RADIUS,PRACTICE_RANGE,targetReading,type FlightInput,type Obstacle } from './flightPractice';

export interface Destination {id:string;name:string;kind:'satellite'|'stage'|'station'|'view'|'rock'|'home';position:Vector3;radius:number;description:string;lookFor:string}
export const EXPLORATION_DESTINATIONS:Destination[]=[
  {id:'satellite',name:'教学卫星',kind:'satellite',position:new Vector3(0,0,-125),radius:10,description:'观察太阳能板、载荷与天线，理解独立飞行器的形态。',lookFor:'接近时看太阳能板逐渐变大；也可在机外绕看自己的飞船。'},
  {id:'stage',name:'废弃级段',kind:'stage',position:new Vector3(220,65,-300),radius:7,description:'合成的翻滚级段。它与卫星是不同实体，不是通往下一场景的图片。',lookFor:'观察外壳和连接端随时间缓慢翻滚；自动巡航停在接触范围之外。'},
  {id:'station',name:'中继平台',kind:'station',position:new Vector3(-230,100,-540),radius:20,description:'原创教学平台，由舱段、桁架和太阳能板组成，不对应真实空间站。',lookFor:'从上方靠近时比较平台尺度；转向后仍会沿原方向滑行。'},
  {id:'view',name:'地球观景点',kind:'view',position:new Vector3(260,-130,-700),radius:0,description:'一个无实体的导航航点，用于观察脚下的地球云层与大气边缘。',lookFor:'到达后拖动镜头向下看地球。线框和标记是导航辅助，不是悬在太空中的建筑。'},
  {id:'rock',name:'岩体演练区',kind:'rock',position:new Vector3(-160,-65,-910),radius:65,description:'刻意放入航区的合成岩体，用于体验接近不规则物体；不代表近地空间里真实存在小行星群。',lookFor:'看不规则轮廓、自转和阴影；接触检测采用包住岩体的保守球面。'},
  {id:'home',name:'出发航点',kind:'home',position:new Vector3(0,0,40),radius:0,description:'返回航程起点附近的导航航点。返回不会重置时间或补充推进剂。',lookFor:'比较出发与返回后的累计里程和燃料，之后仍可继续自由探索。'},
];
export const EXPLORATION_OBSTACLES:Obstacle[]=EXPLORATION_DESTINATIONS.filter(d=>d.radius>0).map(d=>({position:d.position.clone(),radius:d.radius,name:d.name}));

/** Visibility graph around conservative spheres. Only a teaching route through static known objects. */
export function planExplorationRoute(start:Vector3,destination:Destination,obstacles:Obstacle[]):Vector3[]|null {
  const radial=start.clone().sub(destination.position).normalize();if(radial.lengthSq()===0)radial.set(0,0,1);
  const goal=destination.position.clone().addScaledVector(radial,destination.radius+SHIP_COLLISION_RADIUS+25);
  const inflated=obstacles.map(o=>({...o,radius:o.radius+SHIP_COLLISION_RADIUS+22}));
  const clear=(a:Vector3,b:Vector3)=>{
    const delta=b.clone().sub(a),length=delta.lengthSq();
    return inflated.every(o=>{
      const offset=a.clone().sub(o.position);
      // Allow an outward departure if already within the extra planning margin (not physical contact).
      if(offset.length()<o.radius&&offset.dot(delta)>=0&&b.distanceTo(o.position)>o.radius)return true;
      const t=length?Math.max(0,Math.min(1,-offset.dot(delta)/length)):0;
      return offset.addScaledVector(delta,t).length()>=o.radius;
    });
  };
  if(clear(start,goal))return [destination.position.clone()];
  const nodes=[start.clone(),goal];
  for(const o of inflated)for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){
    if(x===0&&y===0&&z===0)continue;
    const point=new Vector3(x,y,z).normalize().multiplyScalar(o.radius+40).add(o.position);
    if(point.length()<PRACTICE_RANGE-60&&inflated.every(other=>point.distanceTo(other.position)>other.radius))nodes.push(point);
  }
  const cost=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),closed=new Set<number>();cost[0]=0;
  for(let turn=0;turn<nodes.length;turn++){
    let best=-1;for(let i=0;i<nodes.length;i++)if(!closed.has(i)&&(best<0||cost[i]<cost[best]))best=i;
    if(best<0||!Number.isFinite(cost[best]))return null;
    if(best===1){const route:Vector3[]=[destination.position.clone()];let i=previous[1];while(i>0){route.unshift(nodes[i].clone());i=previous[i];}return route;}
    closed.add(best);
    for(let i=1;i<nodes.length;i++)if(!closed.has(i)&&clear(nodes[best],nodes[i])){
      const candidate=cost[best]+nodes[best].distanceTo(nodes[i]);if(candidate<cost[i]){cost[i]=candidate;previous[i]=best;}
    }
  }
  return null;
}

export interface Visit {id:string;time:number;fuel:number;travel:number}
export class ExplorationSession {
  readonly state=createFlightState();
  readonly pilot=createAutopilot();
  selectedId='satellite';
  previewId='satellite';
  route:Vector3[]=[];
  routeIndex=0;
  tour:string[]=[];
  visits:Visit[]=[];
  distanceTravelled=0;
  heldFor=0;
  dwell=0;
  staying=false;
  status:'free'|'cruise'|'arrived'|'blocked'='free';
  message='选择一个目的地自动前往，或用 W / S 与方向键自由驾驶。所有地点共享同一艘飞船和推进剂。';
  readonly trail:Vector3[]=[new Vector3()];
  constructor(readonly destinations=EXPLORATION_DESTINATIONS,readonly obstacles=EXPLORATION_OBSTACLES){}
  get destination(){return this.destinations.find(d=>d.id===this.selectedId)!;}
  select(id:string){if(this.destinations.some(d=>d.id===id))this.previewId=id;}
  takeover(){takeOverAutopilot(this.pilot);this.tour=[];this.route=[];this.routeIndex=0;this.heldFor=0;this.dwell=0;this.staying=false;this.status='free';this.message='手动探索中。当前位置、速度、燃料和已访问地点均保留。';}
  stay(){if(this.status==='arrived')this.staying=true;}
  remainingTourIds():string[]{
    const visited=new Set(this.visits.map(v=>v.id));
    const remaining=this.destinations.filter(d=>d.id!=='home'&&!visited.has(d.id)).map(d=>d.id);
    if(this.destinations.some(d=>d.id==='home')&&(remaining.length||!visited.has('home')||this.selectedId!=='home'||this.status!=='arrived'))remaining.push('home');
    return remaining;
  }
  private departNextTourStop(){
    const next=this.tour[0];
    if(!next||!this.depart(next,true))return false;
    this.tour.shift();return true;
  }
  continueTour(){if(this.status!=='arrived')return false;return this.departNextTourStop();}
  depart(id=this.previewId,keepTour=false){
    if(this.state.contact||this.state.fuel<=0||!this.destinations.some(d=>d.id===id))return false;
    if(!keepTour)this.tour=[];
    const browsingOther=this.previewId!==this.selectedId;
    this.selectedId=id;if(!keepTour||!browsingOther)this.previewId=id;this.heldFor=0;this.dwell=0;this.staying=false;this.routeIndex=0;
    const target=this.destination,reading=targetReading(this.state,target.position,target.radius);
    if(reading.clearance<15){this.status='blocked';this.message='与目的地过近，请先手动退开，再开启巡航。';takeOverAutopilot(this.pilot);return false;}
    const route=planExplorationRoute(this.state.position,target,this.obstacles);
    if(!route){this.status='blocked';this.message='没有找到可用航线，请手动离开障碍物附近后再试。';takeOverAutopilot(this.pilot);return false;}
    this.route=route;this.status='cruise';engageAutopilot(this.pilot);this.message=`前往${target.name}；${route.length>1?'将经过绕行航点。':'沿当前航线接近。'}`;return true;
  }
  startTour(){
    if(this.state.contact||this.state.fuel<=0||!this.destinations.length)return false;
    this.tour=this.destinations.map(d=>d.id);return this.departNextTourStop();
  }
  resumeTour():boolean{
    if(this.state.contact||this.state.fuel<=0)return false;
    const remaining=this.remainingTourIds();if(!remaining.length)return false;
    this.tour=remaining;return this.departNextTourStop();
  }
  step(manual:FlightInput,dt:number):FlightInput {
    if(!Number.isFinite(dt)||dt<=0||dt>.1||this.state.contact)return idleInput();
    if(hasManualInput(manual)&&(this.pilot.enabled||this.tour.length||this.status!=='free'))this.takeover();
    if(this.status==='arrived'&&this.tour.length&&!this.staying){
      this.dwell=Math.max(0,this.dwell-dt);
      if(this.dwell===0&&!this.continueTour()){
        this.status='blocked';this.staying=true;this.pilot.enabled=false;
        if(this.state.fuel<=0)this.message='推进剂已用尽，无法自动前往下一站。待去站点与到达记录已保留；需要重新体验时可返回全景后重新进入航区。';
      }
    }
    let input=manual;
    if(this.pilot.enabled){
      const waypoint=this.route[this.routeIndex],last=this.routeIndex===this.route.length-1;
      input=autopilotInput(this.pilot,this.state,waypoint,last?this.destination.radius:0,this.obstacles,dt,last?{cruiseSpeed:8}:{cruiseSpeed:8,stopClearance:0,minClearance:-1,holdBand:2});
      this.message=this.pilot.message;
      if(this.pilot.phase==='blocked'){this.status='blocked';this.tour=[];}
    }else if(hasManualInput(manual))this.pilot.manualSeconds+=dt;
    const previous=this.state.position.clone();stepFlight(this.state,input,dt,this.obstacles);
    this.distanceTravelled+=previous.distanceTo(this.state.position);
    if(this.trail.at(-1)!.distanceTo(this.state.position)>2){this.trail.push(this.state.position.clone());if(this.trail.length>2000)this.trail.shift();}
    if(this.state.contact){this.message=this.state.contact;this.status='blocked';this.pilot.enabled=false;this.tour=[];return input;}
    if(this.status==='cruise'&&this.pilot.enabled){
      const point=this.route[this.routeIndex],last=this.routeIndex===this.route.length-1;
      const arrived=last?targetReading(this.state,point,this.destination.radius).clearance<=30:this.state.position.distanceTo(point)<=14.1;
      const stopped=this.pilot.phase==='hold'&&arrived&&this.state.velocity.length()<.01&&this.state.firing<.001;
      this.heldFor=stopped?this.heldFor+dt:0;
      if(this.heldFor>=(last?3:.1)){
        this.heldFor=0;
        if(!last){this.routeIndex++;engageAutopilot(this.pilot);}
        else {
          this.visits.push({id:this.selectedId,time:this.state.time,fuel:this.state.fuel,travel:this.distanceTravelled});
          this.pilot.enabled=false;this.pilot.phase='complete';this.status='arrived';this.dwell=12;
          this.message=`已抵达${this.destination.name}。${this.destination.lookFor}${this.tour.length?' 稍后继续下一站。':' 可以选择下一站，或直接手动驶离。'}`;
        }
      }
    }
    return input;
  }
}

/** Arrival observation uses normal time; cruise acceleration must never rush the reading stop. */
export function explorationTimeRate(session:ExplorationSession,requested:number,manual:FlightInput){
  const straightFlight=session.pilot.phase==='thrust'||session.pilot.phase==='coast';
  return session.status==='cruise'&&session.pilot.enabled&&straightFlight&&session.state.angularVelocity.length()<.003&&!hasManualInput(manual)?Math.max(1,Math.min(4,requested)):1;
}
