/** Own one calculation worker. Ignore queued messages and commands after failure/disposal. */
export class FlightWorkerConnection<Command, Reply> {
  private worker: Worker | null = null;
  private unreadable: (() => void) | null = null;

  constructor(create: () => Worker, private onReply: (reply: Reply) => void, private onFailure: (message: string) => void) {
    try {
      const worker = create();
      this.worker = worker;
      worker.onmessage = event => { if (this.worker === worker) this.onReply(event.data as Reply); };
      worker.onerror = event => {
        if (this.worker !== worker) return;
        event.preventDefault(); this.fail('飞行计算意外中断。');
      };
      this.unreadable = () => { if (this.worker === worker) this.fail('飞行计算结果无法读取。'); };
      worker.addEventListener('messageerror', this.unreadable);
    } catch { this.onFailure('飞行计算无法启动。'); }
  }

  send(command: Command) {
    if (!this.worker) return false;
    try { this.worker.postMessage(command); return true; }
    catch { this.fail('飞行指令未能发送，计算已停止。'); return false; }
  }

  private fail(message: string) { this.dispose(); this.onFailure(message); }

  dispose() {
    const worker = this.worker;
    this.worker = null;
    if (!worker) return;
    worker.onmessage = null; worker.onerror = null;
    if (this.unreadable) worker.removeEventListener('messageerror', this.unreadable);
    this.unreadable = null;
    worker.terminate();
  }
}
