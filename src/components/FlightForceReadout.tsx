import type { FlightState } from '../launch/liftoff';
import { flightForces } from '../launch/flightForces';
import { telemetryNumber } from '../launch/flightTelemetry';

export function FlightForceReadout({ state }: { state: FlightState }) {
  return <ul className="flight-force-readings">{flightForces(state).map(force => <li key={force.id} data-force={force.id} data-force-drawn={force.drawn}>
    <i style={{ background: force.color }}/><span>{force.name}</span><strong>{telemetryNumber(force.magnitudeN / 1000)} kN</strong>
    {!force.drawn && <small>{force.magnitudeN === 0 ? '无此力' : '小于本帧最大力的 1%，省略箭头'}</small>}
  </li>)}</ul>;
}
