import { readDataJson } from './readJson';
import { BODY_IDS, type EphemerisManifest, type StateFrame } from '../types';
import { publicAsset } from '../data/publicAsset';

export type EphemerisKind = 'display' | 'simulation';
export interface EphemerisChunk {
  startTdb: number;
  stepSeconds: number;
  count: number;
  /** One row per sample; each body contributes [x,y,z,vx,vy,vz]. */
  display: number[][];
  simulation: number[][];
}
export interface ChunkDescriptor { file: string; startTdb: number; endTdb: number; coverageEndTdb: number }
export interface LoadedManifest extends EphemerisManifest { chunks: ChunkDescriptor[] }
let manifest: LoadedManifest | null = null;
let manifestPromise: Promise<LoadedManifest> | null = null;
const chunks = new Map<string, EphemerisChunk>();
const pending = new Map<string, Promise<EphemerisChunk>>();

function jsonFetch<T>(url:string):Promise<T> {
  const file = url.split('/').at(-1);
  return readDataJson<T>(url, file === 'manifest.json' ? '太阳系历表目录' : `太阳系历表 ${file}`);
}

export function loadManifest(): Promise<LoadedManifest> {
  if (!manifestPromise) manifestPromise = jsonFetch<LoadedManifest>(publicAsset('/data/manifest.json')).then(m => {
    if (m.bodyIds.join(',') !== BODY_IDS.join(',') || !Array.isArray(m.chunks)) throw new Error('历表版本或天体顺序不兼容');
    manifest = m;
    return m;
  }).catch(error => { manifestPromise=null; throw error; });
  return manifestPromise;
}
function descriptor(time: number, m: LoadedManifest): ChunkDescriptor {
  if (!Number.isFinite(time) || time < m.startTdb || time > m.endTdb) {
    throw new RangeError('已超出历表范围：2026-01-01 至 2028-01-01（UTC）');
  }
  return m.chunks.find(c => time >= c.startTdb && time < c.endTdb) ?? m.chunks[m.chunks.length-1];
}
function loadChunk(d: ChunkDescriptor): Promise<EphemerisChunk> {
  const cached = chunks.get(d.file);
  if (cached) return Promise.resolve(cached);
  const ongoing = pending.get(d.file);
  if (ongoing) return ongoing;
  const request = jsonFetch<EphemerisChunk>(publicAsset(`/data/${d.file}`)).then(chunk => {
    if (chunk.display.length !== chunk.count || chunk.simulation.length !== chunk.count || chunk.count<2 || chunk.stepSeconds<=0) throw new Error('历表数据结构损坏');
    chunks.set(d.file,chunk); pending.delete(d.file);
    return chunk;
  }).catch(error => { pending.delete(d.file); throw error; });
  pending.set(d.file,request);
  return request;
}
/** Pure interpolator shared by the browser and offline Node validation. */
export function interpolateChunk(chunk: EphemerisChunk, time: number, kind: EphemerisKind='display'): StateFrame {
  const coordinate = (time-chunk.startTdb)/chunk.stepSeconds;
  if (!Number.isFinite(coordinate) || coordinate<0 || coordinate>chunk.count-1) throw new RangeError('时间未包含于当前历表分包');
  const i = Math.min(Math.floor(coordinate),chunk.count-2);
  const s = coordinate-i; const h = chunk.stepSeconds; const s2=s*s; const s3=s2*s;
  const a=chunk[kind][i], b=chunk[kind][i+1];
  const positions=new Float64Array(BODY_IDS.length*3), velocities=new Float64Array(BODY_IDS.length*3);
  for(let body=0;body<BODY_IDS.length;body++) for(let axis=0;axis<3;axis++) {
    const j=body*6+axis, k=body*3+axis;
    // Evaluate in a local displacement frame to limit cancellation at outer planets.
    const delta=b[j]-a[j];
    positions[k]=a[j]+(-2*s3+3*s2)*delta+(s3-2*s2+s)*h*a[j+3]+(s3-s2)*h*b[j+3];
    velocities[k]=((-6*s2+6*s)*delta+(3*s2-4*s+1)*h*a[j+3]+(3*s2-2*s)*h*b[j+3])/h;
  }
  return {time,positions,velocities};
}
export function sampleFrame(time: number, kind: EphemerisKind='display'): StateFrame | null {
  if (!manifest) return null;
  const d=descriptor(time,manifest), chunk=chunks.get(d.file);
  return chunk ? interpolateChunk(chunk,time,kind) : null;
}
export async function preloadTime(time: number): Promise<void> {
  const m=await loadManifest(); const d=descriptor(time,m);
  await loadChunk(d);
  const index=m.chunks.indexOf(d);
  // Best effort prefetch. The required month always reports failures to its caller.
  for(const next of [m.chunks[index-1],m.chunks[index+1]]) if(next) void loadChunk(next).catch(()=>{});
}
export async function getFrame(time: number, kind: EphemerisKind='display'): Promise<StateFrame> {
  const m=await loadManifest(); const d=descriptor(time,m);
  return interpolateChunk(await loadChunk(d),time,kind);
}
