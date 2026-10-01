import type { BrakeGuidance } from '../flight/flightGuidance';

export function BrakeReference({reading}:{reading:BrakeGuidance}) {
  const {stoppingDistance,stoppingTime,firstContactDistance}=reading;
  const extent=Math.max(10,stoppingDistance??0,firstContactDistance??0)*1.14;
  const x=(distance:number)=>18+distance/extent*264;
  const labelX=(distance:number)=>Math.max(72,Math.min(236,x(distance)));
  return <details className="flight-env-brake-reference">
    <summary>刹停参考 · {stoppingDistance===null?'燃料不足':`${stoppingDistance.toFixed(1)} m`}</summary>
    <p>从现在起按住 B，沿当前滑行方向持续辅助减速。</p>
    {stoppingDistance!==null&&reading.speed>=.05?<svg viewBox="0 0 300 88" role="img" aria-label={`沿滑行方向预计停止距离 ${stoppingDistance.toFixed(1)} 米${firstContactDistance!==null?`，前方接触范围距今 ${firstContactDistance.toFixed(1)} 米`:''}`}>
      <line x1="18" y1="38" x2="282" y2="38" stroke="#4c676d" strokeWidth="2"/>
      <line x1="18" y1="38" x2={x(stoppingDistance)} y2="38" stroke={reading.level==='danger'?'#db9783':'#b8cfb5'} strokeWidth="4"/>
      <path d="M18 31 L25 38 L18 45Z" fill="#a7cdd3"/>
      <line x1={x(stoppingDistance)} y1="27" x2={x(stoppingDistance)} y2="48" stroke="#c9dfbc"/>
      <text x={labelX(stoppingDistance)} y="16" textAnchor="middle" fill="#c9dfbc">预计停止 · {stoppingDistance.toFixed(1)} m</text>
      <line x1={x(stoppingDistance)} y1="26" x2={labelX(stoppingDistance)} y2="20" stroke="#718c71"/>
      {firstContactDistance!==null&&<><line x1={x(firstContactDistance)} y1="23" x2={x(firstContactDistance)} y2="52" stroke="#e4bc80" strokeDasharray="3 3"/><text x={labelX(firstContactDistance)} y="69" textAnchor="middle" fill="#e4bc80">接触范围 · {firstContactDistance.toFixed(1)} m</text></>}
      <text x="18" y="84" fill="#8ca5aa">沿滑行方向 / m</text>
    </svg>:<p>{stoppingDistance===null?'推进剂不足，不显示虚假的停止位置。':'当前没有明显滑行；短按推进后可查看停止位置。'}</p>}
    <div className="flight-env-brake-numbers"><span>预计减速时间<b>{stoppingTime===null?'无法停住':`${stoppingTime.toFixed(1)} s`}</b></span><span>停住所需燃料<b>{reading.fuelRequired.toFixed(2)} kg</b></span></div>
    {reading.obstacleName&&<p>前方对象：{reading.obstacleName}。{reading.margin!==null?`停止位置至接触范围余量 ${reading.margin.toFixed(1)} m。`:''}</p>}
    <p>仅用于当前局部练习：目标中心固定，未计入轨道引力。改变推力或滑行方向后重新计算；颜色为练习提示，不会自动制动。</p>
  </details>;
}
