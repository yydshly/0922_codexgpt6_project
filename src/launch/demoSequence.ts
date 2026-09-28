import type { FlightAction } from './flightSession';
import type { FlightState } from './liftoff';
import { satelliteDemoPacing } from './satelliteDemo';

type Action = Exclude<FlightAction, 'reset'>;
// The runner and its explanatory UI share the same checkpoint action and teaching duration.
const checkpoints: Partial<Record<FlightState['phase'], readonly [Action, string]>> = {
  ready: ['start', '开始点火倒计时'],
  complete: ['continue-ascent', '继续上升'],
  'stage-ready': ['separate', '分离一级并启动二级'],
  'ascent-complete': ['continue-orbit', '进行入轨加速'],
  'orbit-review': ['coast', '滑行一圈验证轨道'],
  'orbit-complete': ['continue-deployment', '准备部署卫星'],
  'deployment-ready': ['open-fairing', '打开载荷舱'],
  'deployment-open': ['deploy', '释放卫星'],
  'deployment-complete': ['analyze-avoidance', '分析二级与卫星分离'],
  'avoidance-review': ['align-avoidance', '二级转向准备避让'],
  'avoidance-armed': ['ignite-avoidance', '二级点火避让'],
  'avoidance-cutoff': ['observe-avoidance', '滑行核对分离距离'],
  'avoidance-complete': ['analyze-deorbit', '分析二级离轨'],
  'deorbit-review': ['align-deorbit', '二级转向准备离轨'],
  'deorbit-armed': ['ignite-deorbit', '二级反向点火'],
  'deorbit-cutoff': ['passivate-deorbit', '处理二级剩余储能'],
  'deorbit-complete': ['prepare-reentry', '准备观察二级再入'],
  'reentry-ready': ['coast-reentry', '二级滑行至再入区'],
  'reentry-interface': ['enter-reentry', '观察二级再入受热'],
  'reentry-complete': ['descend-reentry', '二级继续参考下降'],
  'reentry-surface': ['prepare-operations', '转到卫星工作过程'],
  'ops-ready': ['align-operations', '太阳翼开始对日定向'],
  'ops-power-ready': ['observe-operations', '观察一圈日夜并采集数据'],
  'ops-data-ready': ['downlink-operations', '等待地面站窗口并下传'],
  'ops-complete': ['prepare-maintenance', 'E01 转入能源维护'],
  'life-ready': ['start-maintenance', '观察一圈低负载维护'],
  'life-review': ['review-retirement', '评估无推进卫星的任务结束'],
  'life-disposal': ['command-retirement', '等待结束业务的指令窗口'],
  'life-commanded': ['close-retirement', '隔离充电并处理电能'],
  'life-retired': ['observe-retirement', '观察已退役卫星继续在轨'],
  'disposal-review': ['command-disposal', '发送卫星离轨指令'],
  'disposal-commanded': ['align-disposal', '卫星转向准备离轨'],
  'disposal-armed': ['ignite-disposal', '卫星自身反向点火'],
  'disposal-cutoff': ['passivate-disposal', '处理卫星剩余储能'],
  'disposal-coast-ready': ['coast-disposal', '卫星滑行至再入区'],
  'disposal-interface': ['enter-disposal', '观察卫星再入受热'],
  'disposal-boundary': ['lower-disposal', '卫星继续至参考终点'],
};

export function demoCheckpoint(state: FlightState) {
  const entry = state.phase === 'ops-complete' && state.satelliteEquipment
    ? ['prepare-disposal', 'E02 准备使用自身推进器离轨'] as const : checkpoints[state.phase];
  if (!entry) return null;
  return {
    action: entry[0], next: entry[1],
    durationS: satelliteDemoPacing(state).holdS ?? (['ready', 'reentry-surface', 'life-disposal'].includes(state.phase) ? 4 : 2),
  };
}
