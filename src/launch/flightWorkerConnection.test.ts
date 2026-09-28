import { describe, expect, it, vi } from 'vitest';
import { FlightWorkerConnection } from './flightWorkerConnection';

class WorkerDouble {
  onmessage: ((event: { data: number }) => void) | null = null;
  onerror: ((event: { preventDefault: () => void }) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  addEventListener(name: string, listener: () => void) { if (name === 'messageerror') this.onmessageerror = listener; }
  removeEventListener(name: string, listener: () => void) { if (name === 'messageerror' && this.onmessageerror === listener) this.onmessageerror = null; }
  postMessage = vi.fn(); terminate = vi.fn();
  asWorker() { return this as unknown as Worker; }
}
function setup() {
  const worker = new WorkerDouble(), replies = vi.fn(), failure = vi.fn();
  const connection = new FlightWorkerConnection<string, number>(() => worker.asWorker(), replies, failure);
  return { worker, replies, failure, connection };
}

describe('calculation worker lifecycle', () => {
  it('delivers messages until failure, then blocks late replies and further actions', () => {
    const { worker, replies, failure, connection } = setup();
    expect(connection.send('start')).toBe(true);
    worker.onmessage?.({ data: 12 });
    expect(replies).toHaveBeenCalledWith(12);
    const lateReply = worker.onmessage!, lateFailure = worker.onerror!;
    const preventDefault = vi.fn();
    lateFailure({ preventDefault }); lateFailure({ preventDefault }); lateReply({ data: 15 });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(failure).toHaveBeenCalledTimes(1);
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(replies).toHaveBeenCalledTimes(1);
    expect(connection.send('resume')).toBe(false);
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
  });

  it('treats undecodable worker replies as fatal instead of waiting forever', () => {
    const { worker, failure, connection } = setup();
    worker.onmessageerror?.();
    expect(failure).toHaveBeenCalledWith('飞行计算结果无法读取。');
    expect(connection.send('revisit')).toBe(false);
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it('does not report an unsent command as accepted', () => {
    const { worker, failure, connection } = setup();
    worker.postMessage.mockImplementationOnce(() => { throw Error('post failed'); });
    expect(connection.send('restore')).toBe(false);
    expect(connection.send('restore')).toBe(false);
    expect(failure).toHaveBeenCalledWith('飞行指令未能发送，计算已停止。');
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
  });

  it('reports construction failure and rejects commands without throwing', () => {
    const failure = vi.fn();
    const connection = new FlightWorkerConnection(() => { throw Error('unavailable'); }, vi.fn(), failure);
    expect(failure).toHaveBeenCalledWith('飞行计算无法启动。');
    expect(connection.send('start')).toBe(false);
    expect(() => connection.dispose()).not.toThrow();
  });

  it('can use a new worker while stale callbacks from the old one remain harmless', () => {
    const old = setup(), current = setup();
    const stale = old.worker.onmessage!, staleError = old.worker.onerror!;
    old.connection.dispose();
    expect(current.connection.send('restore')).toBe(true);
    current.worker.onmessage?.({ data: 20 });
    stale({ data: 4 }); staleError({ preventDefault: vi.fn() });
    expect(old.replies).not.toHaveBeenCalled(); expect(old.failure).not.toHaveBeenCalled();
    expect(current.replies).toHaveBeenCalledWith(20);
    expect(current.worker.terminate).not.toHaveBeenCalled();
  });

  it('makes teardown idempotent and does not show recovery when leaving normally', () => {
    const { connection, worker, failure } = setup();
    connection.dispose(); connection.dispose();
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(failure).not.toHaveBeenCalled();
    expect(connection.send('pause')).toBe(false);
    expect(worker.onmessage).toBeNull(); expect(worker.onerror).toBeNull(); expect(worker.onmessageerror).toBeNull();
  });
});
