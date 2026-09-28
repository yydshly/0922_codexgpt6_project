import type { DemoStatus } from './fullFlightDemo';
import type { FlightState } from './liftoff';
import { demoCheckpoint } from './demoSequence';

/** Read the existing simulation and teaching clock; never estimate an orbital/contact wait. */
export function demoPlayback(state: FlightState, demo: DemoStatus, busy = false) {
  const checkpoint = demoCheckpoint(state);
  const elapsedS = checkpoint ? Math.max(0, Math.min(checkpoint.durationS, demo.holdS)) : 0;
  const remainingS = checkpoint ? Math.max(0, checkpoint.durationS - elapsedS) : null;
  const error = demo.error || (state.phase === 'aborted' || state.phase.endsWith('-failed') ? state.message : '');
  const kind = busy ? 'restoring' : error ? 'error' : demo.finished ? 'finished' : demo.paused ? 'paused' : checkpoint ? 'checkpoint' : 'running';
  const title = {
    restoring: '正在恢复章节', error: '演示已停止 · 需要处理', finished: '本次路线已完成',
    paused: '已暂停 · 等待你继续', checkpoint: '自动讲解停留', running: '正在演示 · 自动推进',
  }[kind];
  const detail = kind === 'restoring' ? '正在按已计算的记录恢复画面和读数，请稍候。'
    : kind === 'error' ? `${error}。不会跳过失败，可退出返回原任务。`
      : kind === 'finished' ? '查看本次结果，或回看已到达章节；另一方案需独立运行。'
        : kind === 'paused' ? '任务时间和自动讲解都已暂停。可拖动镜头；点击「继续全程演示」后接着播放。'
          : kind === 'checkpoint' ? '任务时间暂时冻结，讲解结束后自动执行下一步，无需点击。'
            : '运动和任务按计算推进；关键过程放慢展示，长滑行自动加速。';
  return { kind, title, detail, checkpoint: kind === 'checkpoint' || kind === 'paused' ? checkpoint : null, elapsedS, remainingS };
}
