import type { StateFrame } from '../types';

export interface AdvanceResult {
  executedSteps: number;
  advancedSeconds: number;
  pendingSeconds: number;
}

export interface ConservedQuantities {
  /** G times mechanical energy, in consistent km/s units. Use for relative errors. */
  scaledEnergy: number;
  /** G times total linear / angular momentum. */
  scaledMomentum: [number, number, number];
  scaledAngularMomentum: [number, number, number];
}

/** An independent Newtonian point-mass model; no rendering or wall-clock state. */
export class NBodySystem {
  readonly stepSeconds: number;
  readonly gms: Float64Array;
  private positions = new Float64Array(0);
  private velocities = new Float64Array(0);
  private acceleration = new Float64Array(0);
  private nextAcceleration = new Float64Array(0);
  private epoch = 0;
  private completedSteps = 0;
  private requestedSeconds = 0;
  private requestCompensation = 0;

  constructor(frame: StateFrame, gms: ArrayLike<number>, stepSeconds = 300) {
    if (!Number.isFinite(stepSeconds) || stepSeconds <= 0) throw new Error('物理步长必须为正数。');
    if (!gms.length || Array.from(gms).some(value => !Number.isFinite(value) || value < 0)
      || !Array.from(gms).some(value => value > 0)) throw new Error('引力参数无效。');
    this.stepSeconds = stepSeconds;
    this.gms = Float64Array.from(gms);
    this.init(frame);
  }

  get steps(): number { return this.completedSteps; }
  get simulatedSeconds(): number { return this.completedSteps * this.stepSeconds; }
  get time(): number { return this.epoch + this.simulatedSeconds; }
  get pendingSeconds(): number { return Math.max(0, this.requestedSeconds - this.simulatedSeconds); }

  init(frame: StateFrame): void {
    const length = this.gms.length * 3;
    if (!Number.isFinite(frame.time) || frame.positions.length !== length || frame.velocities.length !== length
      || Array.from(frame.positions).some(value => !Number.isFinite(value))
      || Array.from(frame.velocities).some(value => !Number.isFinite(value))) {
      throw new Error('初始位置、速度或时间无效。');
    }
    const positions = Float64Array.from(frame.positions);
    const acceleration = new Float64Array(length);
    this.calculateAcceleration(positions, acceleration);
    this.positions = positions;
    this.velocities = Float64Array.from(frame.velocities);
    this.acceleration = acceleration;
    this.nextAcceleration = new Float64Array(length);
    this.epoch = frame.time;
    this.completedSteps = 0;
    this.requestedSeconds = 0;
    this.requestCompensation = 0;
  }

  reset(frame: StateFrame): void { this.init(frame); }

  /** Adds simulation time. A caller can bound work, then resume using advance(0). */
  advance(seconds: number, maxSteps = Infinity): AdvanceResult {
    if (!Number.isFinite(seconds) || seconds < 0) throw new Error('推进时间必须为非负有限数。');
    if (maxSteps !== Infinity && (!Number.isInteger(maxSteps) || maxSteps < 0)) throw new Error('子步预算无效。');
    // Compensated summation keeps frame-rate-dependent roundoff out of step counts.
    const increment = seconds - this.requestCompensation;
    const nextRequested = this.requestedSeconds + increment;
    if (!Number.isFinite(nextRequested)) throw new Error('请求的推进时间过大。');
    this.requestCompensation = (nextRequested - this.requestedSeconds) - increment;
    this.requestedSeconds = nextRequested;
    const tolerance = Math.max(1e-9, 16 * Number.EPSILON * Math.abs(this.requestedSeconds));
    const targetSteps = Math.floor((this.requestedSeconds + tolerance) / this.stepSeconds);
    if (!Number.isSafeInteger(targetSteps)) throw new Error('请求的推进时间超出精确计数范围。');
    const count = Math.max(0, Math.min(targetSteps - this.completedSteps, maxSteps));
    for (let i = 0; i < count; i++) this.integrateStep();
    return { executedSteps: count, advancedSeconds: count * this.stepSeconds, pendingSeconds: this.pendingSeconds };
  }

  snapshot(): StateFrame {
    return { time: this.time, positions: this.positions.slice(), velocities: this.velocities.slice() };
  }

  diagnostics(): ConservedQuantities {
    const p = this.positions, v = this.velocities;
    let energy = 0;
    const momentum: [number, number, number] = [0, 0, 0];
    const angular: [number, number, number] = [0, 0, 0];
    for (let i = 0; i < this.gms.length; i++) {
      const k = i * 3, mu = this.gms[i];
      energy += .5 * mu * (v[k] * v[k] + v[k + 1] * v[k + 1] + v[k + 2] * v[k + 2]);
      for (let axis = 0; axis < 3; axis++) momentum[axis] += mu * v[k + axis];
      angular[0] += mu * (p[k + 1] * v[k + 2] - p[k + 2] * v[k + 1]);
      angular[1] += mu * (p[k + 2] * v[k] - p[k] * v[k + 2]);
      angular[2] += mu * (p[k] * v[k + 1] - p[k + 1] * v[k]);
      for (let j = i + 1; j < this.gms.length; j++) {
        const l = j * 3;
        energy -= mu * this.gms[j] / Math.hypot(p[l] - p[k], p[l + 1] - p[k + 1], p[l + 2] - p[k + 2]);
      }
    }
    return { scaledEnergy: energy, scaledMomentum: momentum, scaledAngularMomentum: angular };
  }

  private calculateAcceleration(p: Float64Array, out: Float64Array): void {
    out.fill(0);
    for (let i = 0; i < this.gms.length; i++) {
      const k = i * 3;
      for (let j = i + 1; j < this.gms.length; j++) {
        const l = j * 3;
        const dx = p[l] - p[k], dy = p[l + 1] - p[k + 1], dz = p[l + 2] - p[k + 2];
        const r2 = dx * dx + dy * dy + dz * dz;
        if (!(r2 > 0) || !Number.isFinite(r2)) throw new Error('天体位置重叠或超出数值范围；推演已暂停。');
        const inverseR3 = 1 / (r2 * Math.sqrt(r2));
        const factorI = this.gms[j] * inverseR3, factorJ = this.gms[i] * inverseR3;
        out[k] += dx * factorI; out[k + 1] += dy * factorI; out[k + 2] += dz * factorI;
        out[l] -= dx * factorJ; out[l + 1] -= dy * factorJ; out[l + 2] -= dz * factorJ;
      }
    }
  }

  private integrateStep(): void {
    const half = this.stepSeconds / 2;
    for (let i = 0; i < this.positions.length; i++) {
      this.velocities[i] += this.acceleration[i] * half;
      this.positions[i] += this.velocities[i] * this.stepSeconds;
    }
    this.calculateAcceleration(this.positions, this.nextAcceleration);
    for (let i = 0; i < this.velocities.length; i++) {
      this.velocities[i] += this.nextAcceleration[i] * half;
      if (!Number.isFinite(this.velocities[i])) throw new Error('速度超出数值范围；推演已暂停。');
    }
    const previous = this.acceleration;
    this.acceleration = this.nextAcceleration;
    this.nextAcceleration = previous;
    this.completedSteps++;
  }
}
