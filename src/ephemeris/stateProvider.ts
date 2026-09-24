import { publicAsset } from '../data/publicAsset';
import { BODY_IDS, type StateFrame, type Vec3 } from '../types';

export interface ObjectState {
  id: string;
  position: Vec3;
  velocity: Vec3;
}

/** Scientific state only: no camera mapping, display radius, or surface artwork. */
export interface StateBatch {
  timeTdb: number;
  originId: 'ssb' | string;
  frame: 'ECLIPJ2000';
  positionUnit: 'km';
  velocityUnit: 'km/s';
  sourceVersion: string;
  states: ObjectState[];
}

export interface SampleSeries {
  id: string;
  startTdb: number;
  stepSeconds: number;
  samples: number[][];
}
export interface MonthlyChunk { series: SampleSeries[] }
export interface MonthlyDescriptor { file: string; startTdb: number; endTdb: number; bytes: number; sha256: string }
export interface MonthlyManifest {
  version: string;
  startTdb: number;
  endTdb: number;
  bodyIds: string[];
  frame: string;
  origin: string;
  units: string;
  chunks: MonthlyDescriptor[];
}

/** Adapter keeps the validated ten-body frame unchanged while giving it stable IDs. */
export function tenBodyBatch(frame: StateFrame, version = 'horizons-2026-2027-v1'): StateBatch {
  if (frame.positions.length !== BODY_IDS.length * 3 || frame.velocities.length !== BODY_IDS.length * 3)
    throw new Error('十体状态长度不匹配');
  return {
    timeTdb: frame.time, originId: 'ssb', frame: 'ECLIPJ2000',
    positionUnit: 'km', velocityUnit: 'km/s', sourceVersion: version,
    states: BODY_IDS.map((id, index) => ({
      id,
      position: [frame.positions[index*3], frame.positions[index*3+1], frame.positions[index*3+2]],
      velocity: [frame.velocities[index*3], frame.velocities[index*3+1], frame.velocities[index*3+2]],
    })),
  };
}

/** Rejects mixed epochs, frames, origins and duplicate identities before rendering. */
export function combineStateBatches(...batches: StateBatch[]): StateBatch {
  if (!batches.length) throw new Error('缺少可组合的天体状态');
  const first = batches[0];
  const ids = new Set<string>();
  const states: ObjectState[] = [];
  for (const batch of batches) {
    if (Math.abs(batch.timeTdb - first.timeTdb) > 1e-5 || batch.frame !== first.frame ||
        batch.originId !== first.originId || batch.positionUnit !== first.positionUnit ||
        batch.velocityUnit !== first.velocityUnit)
      throw new Error('天体状态的历元、坐标或单位不一致');
    for (const state of batch.states) {
      if (ids.has(state.id)) throw new Error(`重复的天体身份：${state.id}`);
      if (![...state.position, ...state.velocity].every(Number.isFinite))
        throw new Error(`非有限天体状态：${state.id}`);
      ids.add(state.id);
      states.push(state);
    }
  }
  return { ...first, sourceVersion: batches.map(batch => batch.sourceVersion).join(' + '), states };
}

export function interpolateMonthlyChunk(chunk: MonthlyChunk, timeTdb: number, sourceVersion: string): StateBatch {
  const states = chunk.series.map(series => {
    const u = (timeTdb - series.startTdb) / series.stepSeconds;
    if (!Number.isFinite(u) || u < 0 || u > series.samples.length - 1)
      throw new RangeError(`当前分包未覆盖 ${series.id} 的观测时间`);
    const index = Math.min(Math.floor(u), series.samples.length - 2);
    const s = u - index, s2 = s*s, s3 = s2*s, h = series.stepSeconds;
    const a = series.samples[index], b = series.samples[index+1];
    const position: Vec3 = [0,0,0], velocity: Vec3 = [0,0,0];
    for (let axis = 0; axis < 3; axis++) {
      const delta = b[axis] - a[axis];
      position[axis] = a[axis] + (-2*s3+3*s2)*delta + (s3-2*s2+s)*h*a[axis+3] + (s3-s2)*h*b[axis+3];
      velocity[axis] = ((-6*s2+6*s)*delta + (3*s2-4*s+1)*h*a[axis+3] +
        (3*s2-2*s)*h*b[axis+3]) / h;
    }
    return { id: series.id, position, velocity };
  });
  return { timeTdb, originId: 'ssb', frame: 'ECLIPJ2000', positionUnit: 'km',
    velocityUnit: 'km/s', sourceVersion, states };
}

/** Local, month-sharded provider reusable by later dwarf planets and small bodies. */
export class LocalMonthlyStateProvider {
  private manifest: MonthlyManifest | null = null;
  private manifestRequest: Promise<MonthlyManifest> | null = null;
  private chunks = new Map<string, MonthlyChunk>();
  private pending = new Map<string, Promise<MonthlyChunk>>();

  constructor(private readonly directory: string, private readonly expectedIds: readonly string[], private readonly coverageLabel = '2026—2027 年（UTC）') {}

  async loadManifest(): Promise<MonthlyManifest> {
    if (!this.manifestRequest) this.manifestRequest = this.readJson<MonthlyManifest>('manifest.json').then(data => {
      if (!Array.isArray(data.bodyIds) || data.bodyIds.join(',') !== this.expectedIds.join(',') ||
          !Number.isFinite(data.startTdb) || !Number.isFinite(data.endTdb) ||
          data.startTdb >= data.endTdb || !Array.isArray(data.chunks) ||
          data.frame !== 'ECLIPJ2000 (ICRF, ecliptic of J2000.0)' ||
          data.origin !== 'Solar System Barycenter (NAIF 0)' || data.units !== 'km, km/s' ||
          data.chunks.some(chunk => typeof chunk.file !== 'string' || !Number.isFinite(chunk.startTdb) ||
            !Number.isFinite(chunk.endTdb) || chunk.startTdb >= chunk.endTdb || !Number.isFinite(chunk.bytes) || chunk.bytes <= 0 || !chunk.sha256))
        throw new Error('扩展天体历表目录不兼容');
      this.manifest = data;
      return data;
    }).catch(error => { this.manifestRequest = null; throw error; });
    return this.manifestRequest;
  }

  sample(timeTdb: number): StateBatch | null {
    if (!this.manifest) return null;
    const descriptor = this.descriptor(timeTdb, this.manifest);
    const chunk = this.chunks.get(descriptor.file);
    return chunk ? interpolateMonthlyChunk(chunk, timeTdb, this.manifest.version) : null;
  }

  async get(timeTdb: number): Promise<StateBatch> {
    const manifest = await this.loadManifest();
    const descriptor = this.descriptor(timeTdb, manifest);
    return interpolateMonthlyChunk(await this.loadChunk(descriptor), timeTdb, manifest.version);
  }

  private descriptor(timeTdb: number, manifest: MonthlyManifest): MonthlyDescriptor {
    if (!Number.isFinite(timeTdb) || timeTdb < manifest.startTdb || timeTdb > manifest.endTdb)
      throw new RangeError(`扩展天体历表覆盖 ${this.coverageLabel}`);
    const descriptor = manifest.chunks.find(chunk => timeTdb >= chunk.startTdb &&
      (timeTdb < chunk.endTdb || timeTdb === manifest.endTdb && timeTdb === chunk.endTdb));
    if (!descriptor) throw new Error('当前月份缺少扩展天体历表');
    return descriptor;
  }

  private async loadChunk(descriptor: MonthlyDescriptor): Promise<MonthlyChunk> {
    const cached = this.chunks.get(descriptor.file);
    if (cached) return cached;
    const inFlight = this.pending.get(descriptor.file);
    if (inFlight) return inFlight;
    const request = this.readJson<MonthlyChunk>(descriptor.file).then(chunk => {
      if (!Array.isArray(chunk.series) || chunk.series.map(series => series.id).join(',') !== this.expectedIds.join(',') ||
          chunk.series.some(series => !Number.isFinite(series.startTdb) || !Number.isFinite(series.stepSeconds) ||
            series.stepSeconds <= 0 || !Array.isArray(series.samples) || series.samples.length < 2 ||
            series.startTdb > descriptor.startTdb ||
            series.startTdb + (series.samples.length-1)*series.stepSeconds < descriptor.endTdb ||
            series.samples.some(row => !Array.isArray(row) || row.length !== 6 || !row.every(Number.isFinite))))
        throw new Error('扩展天体历表分包损坏');
      this.chunks.set(descriptor.file, chunk);
      this.pending.delete(descriptor.file);
      return chunk;
    }).catch(error => { this.pending.delete(descriptor.file); throw error; });
    this.pending.set(descriptor.file, request);
    return request;
  }

  private async readJson<T>(file: string): Promise<T> {
    const response = await fetch(publicAsset(`/data/${this.directory}/${file}`));
    if (!response.ok) throw new Error(`扩展天体历表无法读取 (${response.status})：${file}`);
    return response.json() as Promise<T>;
  }
}
