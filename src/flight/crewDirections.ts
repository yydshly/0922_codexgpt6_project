import {Quaternion,Vector3} from 'three';
import {airVelocity,surfaceAt} from '../launch/ascent';
import type {CrewSnapshot} from './crewMission';
import {CREW_PILOT_FLIGHT_PHASES} from './crewPilotControl';

/** Body axes are shared by the hull, engines and physics: nose −Z, aft/heat shield +Z. */
export function crewDirections(s:Pick<CrewSnapshot,'attitude'|'position'|'velocity'|'targetVelocity'|'thrust'|'phase'|'automatic'>){
  const q=new Quaternion(...s.attitude),forward=new Vector3(0,0,-1).applyQuaternion(q),heatShield=forward.clone().negate();
  const inertialVelocity=new Vector3(...s.velocity),airRelativeVelocity=inertialVelocity.clone().sub(new Vector3(...airVelocity(s.position)));
  const platformRelativeVelocity=inertialVelocity.clone().sub(new Vector3(...s.targetVelocity)),thrust=new Vector3(...s.thrust);
  // A stopped capsule has no meaningful velocity bearing; do not display floating-point noise.
  const angle=(a:Vector3,b:Vector3)=>a.lengthSq()>1e-8&&b.length()>.05?a.angleTo(b)*180/Math.PI:null;
  return {forward,heatShield,inertialVelocity,airRelativeVelocity,platformRelativeVelocity,
    forwardVelocityDeg:angle(forward,inertialVelocity),forwardAirDeg:angle(forward,airRelativeVelocity),heatShieldAirDeg:angle(heatShield,airRelativeVelocity),thrustVelocityDeg:thrust.length()>1?angle(thrust,inertialVelocity):null,thrustAirDeg:thrust.length()>1?angle(thrust,airRelativeVelocity):null,
    description:s.phase==='failed'?'任务因条件不足停止推进。保留失败时的位置、速度和姿态；画面停留不代表已经安全停稳，原因以失败提示和接地检查为准。':['ground','countdown'].includes(s.phase)?'相对发射台静止时，地心速度仍包含地球自转。船头朝上，点火后由地面约束承受推力，解除约束后才离台。':
      ['ascent','upper','insertion'].includes(s.phase)?'推力沿火箭船头方向，制导逐渐建立水平速度；重力指向地球，阻力反向于相对空气运动。船头与速度不必完全重合。':
      ['approach','observe','return-ready'].includes(s.phase)?'船头用于对准平台，地心速度表示绕地运动；粉色箭头单独表示相对平台速度。转船头不会把原有速度一起转过去，RCS 可以侧向或反向推进。':
      s.phase==='deorbit'?s.automatic?'辅助先把船头转向逆速度方向，姿态稳定后点火。推力是否逆向以实际夹角为准；飞船继续沿轨道前进。':'本人控制离轨：主推力沿实际船头。先核对推力与地心速度夹角；朝向错误时点火可能增速或改变航迹，并不保证减速。':
      s.phase==='return-coast'?'离轨点火结束后仍在高空滑行。服务舱已经分离；返回舱用独立姿态喷口逐渐把热盾转向相对空气运动方向，没有瞬间改写速度或朝向。':
      s.phase==='entry'?'再入的期望姿态是底部热盾迎风、船头朝后；实际朝向以热盾夹角为准。返回舱喷口与气动恢复力矩共同参与，手动偏转不会被标作已对齐。':
      ['drogue','main-chute'].includes(s.phase)?'伞绳连接船头附近的吊点，伞在拉力方向一侧；实际舱体朝向以夹角为准。重力向下，阻力与伞拉力反向于相对共转空气的运动。':
      s.phase==='landing'?'期望船头朝上、热盾朝下，使软着陆推力向上；实际推力沿当前发动机轴，手动偏转会改变方向。仍在下降时，向上合力表示减速，不表示已经上升。':
      '返回舱相对地面停稳，支撑力承受重量；地心速度仍包含地球自转。',
  };
}

export const crewReturning=(phase:CrewSnapshot['phase'],serviceAttached=true)=>['return-coast','entry','drogue','main-chute','landing','touchdown','complete'].includes(phase)||phase==='failed'&&!serviceAttached;

/** Sum the solver's actual forces; the vertical projection is not an attitude or velocity. */
export function crewForceBalance(s:Pick<CrewSnapshot,'gravity'|'thrust'|'drag'|'chuteForce'|'contactForce'|'position'|'velocity'|'massKg'|'verticalMS'|'phase'>){
  const net=new Vector3();for(const force of [s.gravity,s.thrust,s.drag,s.chuteForce,s.contactForce])net.add(new Vector3(...force));
  const up=new Vector3(...surfaceAt(s.position).up),p=new Vector3(...s.position),velocity=new Vector3(...s.velocity),relative=velocity.clone().sub(new Vector3(...airVelocity(s.position))),epsilon=.01;
  // d[(v−Ω×r)·up(r)]/dt: the rotating ground and the changing local normal matter.
  const normalRate=new Vector3(...surfaceAt(p.clone().addScaledVector(velocity,epsilon).toArray() as [number,number,number]).up)
    .sub(new Vector3(...surfaceAt(p.clone().addScaledVector(velocity,-epsilon).toArray() as [number,number,number]).up)).divideScalar(2*epsilon);
  const airDerivative=new Vector3(...airVelocity(s.velocity)),verticalN=net.dot(up),verticalAccelerationMS2=net.clone().divideScalar(s.massKg).sub(airDerivative).dot(up)+relative.dot(normalRate);
  return {net,verticalN,verticalAccelerationMS2,
    explanation:s.phase==='failed'?'计算已停止；受力读数保留失败时的瞬间，不表示后续运动或安全支撑。':['touchdown','complete'].includes(s.phase)?'接地后地面支撑与缓冲承受重量，支脚按实际缓冲高度压缩。':
      s.verticalMS<-.05?verticalAccelerationMS2>.02?'仍在下降；阻力、伞拉力或推力正在减小下降速度。':verticalAccelerationMS2< -.02?'正在下降；当前下降速度还在增大。':'正在下降；阻力与重力接近平衡，下降速度变化较小。':
      s.verticalMS>.05?'正在上升；看合力决定速度如何变化，船头朝向本身不会改变航迹。':'竖直速度接近零；运动方向与受力方向分别读取。'};
}

/** Playback policy only; fixed physics steps and actual forces remain unchanged. */
export function crewPlaybackRate(s:Pick<CrewSnapshot,'phase'|'automatic'|'attitude'|'velocity'|'angularVelocity'>,selected:number){
  const rate=[1,10,60,180].includes(selected)?selected:1;
  if(!s.automatic&&CREW_PILOT_FLIGHT_PHASES.includes(s.phase)||['countdown','observe','return-ready','landing','touchdown'].includes(s.phase))return 1;
  if(s.phase==='approach')return new Vector3(...s.angularVelocity).length()>.01?1:Math.min(10,rate);
  if(['ascent','upper','insertion','return-coast'].includes(s.phase)&&new Vector3(...s.angularVelocity).length()>.01)return 1;
  if(s.phase==='deorbit'){
    const forward=new Vector3(0,0,-1).applyQuaternion(new Quaternion(...s.attitude));
    const reverse=new Vector3(...s.velocity).negate();
    return forward.angleTo(reverse)<.025&&new Vector3(...s.angularVelocity).length()<.015?Math.min(10,rate):1;
  }
  return rate;
}
