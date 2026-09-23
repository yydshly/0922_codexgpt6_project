/// <reference lib="webworker" />
import type { StateFrame } from '../types';
import { NBodySystem } from './core';

export type PhysicsRequest =
  | { type: 'init'; frame: StateFrame; gms: number[]; stepSeconds?: number; requestId?: number }
  | { type: 'reset'; frame: StateFrame; requestId?: number }
  | { type: 'advance'; seconds: number; requestId?: number }
  | { type: 'snapshot'; requestId?: number };

export type PhysicsResponse =
  | { type: 'state'; frame: StateFrame; simulatedSeconds: number; pendingSeconds: number; steps: number; requestId?: number }
  | { type: 'error'; message: string; requestId?: number };

const scope = self as unknown as DedicatedWorkerGlobalScope;
let system: NBodySystem | null = null;
let scheduled: ReturnType<typeof setTimeout> | undefined;
let requestId: number | undefined;

function publish(): void {
  if (!system) return;
  const frame = system.snapshot();
  const response: PhysicsResponse = {
    type: 'state', frame, simulatedSeconds: system.simulatedSeconds,
    pendingSeconds: system.pendingSeconds, steps: system.steps, requestId,
  };
  scope.postMessage(response, [frame.positions.buffer, frame.velocities.buffer]);
}

function reportError(error: unknown): void {
  const response: PhysicsResponse = { type: 'error', message: error instanceof Error ? error.message : String(error), requestId };
  scope.postMessage(response);
}

function pump(): void {
  scheduled = undefined;
  if (!system) return;
  try {
    const start = performance.now();
    let executed = 0;
    while (executed < 1024 && performance.now() - start < 4) {
      const result = system.advance(0, Math.min(64, 1024 - executed));
      executed += result.executedSteps;
      if (!result.executedSteps) break;
    }
    publish();
    if (system.pendingSeconds + 1e-9 >= system.stepSeconds) scheduled = setTimeout(pump, 0);
  } catch (error) {
    reportError(error);
    system = null;
  }
}

scope.onmessage = (event: MessageEvent<PhysicsRequest>) => {
  const message = event.data;
  requestId = message.requestId;
  try {
    if (message.type === 'init') {
      if (scheduled !== undefined) clearTimeout(scheduled);
      scheduled = undefined;
      system = new NBodySystem(message.frame, message.gms, message.stepSeconds ?? 300);
      publish();
      return;
    }
    if (!system) throw new Error('请先初始化太阳系推演。');
    if (message.type === 'reset') {
      if (scheduled !== undefined) clearTimeout(scheduled);
      scheduled = undefined;
      system.reset(message.frame);
      publish();
    } else if (message.type === 'snapshot') {
      publish();
    } else if (message.type === 'advance') {
      system.advance(message.seconds, 0);
      if (scheduled === undefined) scheduled = setTimeout(pump, 0);
    }
  } catch (error) { reportError(error); }
};
