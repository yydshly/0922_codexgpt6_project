import type { BodyId, Vec3 } from '../types';
import { SATELLITES } from '../data/satellites';
import { publicAsset } from '../data/publicAsset';

export interface SatelliteState { id:string; position:Vec3; velocity:Vec3 }
/** Geometric states relative to each satellite's parent PLANET CENTER,
 * ECLIPJ2000, km and km/s, TDB seconds past J2000. No display scaling. */
export interface SatelliteFrame { time:number; states:SatelliteState[] }
export interface SatelliteSeries { id:string; startTdb:number; stepSeconds:number; samples:number[][] }
export interface SatelliteChunk { parentId:BodyId; series:SatelliteSeries[] }
export interface SatelliteChunkDescriptor { file:string; parentId:BodyId; startTdb:number; endTdb:number }
export interface SatelliteManifest {
  version:string; source:string; sourceUrl:string; startTdb:number; endTdb:number;
  startUtc:string; endUtc:string; frame:string; units:string; timeScale:string;
  satelliteIds:string[]; chunks:SatelliteChunkDescriptor[];
  [key:string]:unknown;
}
let manifest:SatelliteManifest|null=null;
let manifestPromise:Promise<SatelliteManifest>|null=null;
const chunks=new Map<string,SatelliteChunk>();
const pending=new Map<string,Promise<SatelliteChunk>>();
async function readJson<T>(path:string):Promise<T> {
  const response=await fetch(publicAsset(`/data/satellites/${path}`));
  if(!response.ok) throw new Error(`卫星历表无法读取 (${response.status})：${path}`);
  return response.json() as Promise<T>;
}
export function loadSatelliteManifest():Promise<SatelliteManifest> {
  if(!manifestPromise) manifestPromise=readJson<SatelliteManifest>('manifest.json').then(data=>{
    if(!Array.isArray(data.satelliteIds)||data.satelliteIds.join(',')!==SATELLITES.map(body=>body.id).join(',')||
      !Number.isFinite(data.startTdb)||!Number.isFinite(data.endTdb)||data.startTdb>=data.endTdb||
      !Array.isArray(data.chunks)||data.chunks.some(c=>typeof c.file!=='string'||
        !Number.isFinite(c.startTdb)||!Number.isFinite(c.endTdb)||c.startTdb>=c.endTdb||
        !SATELLITES.some(body=>body.parentId===c.parentId)))throw new Error('卫星历表目录不兼容');
    manifest=data;return data;
  }).catch(error=>{manifestPromise=null;throw error;});
  return manifestPromise;
}
function descriptor(time:number,parentId:BodyId,m:SatelliteManifest):SatelliteChunkDescriptor|undefined {
  if(!Number.isFinite(time)||time<m.startTdb||time>m.endTdb) throw new RangeError('卫星历表覆盖 2026-01-01 至 2028-01-01（UTC）');
  const result=m.chunks.find(c=>c.parentId===parentId&&time>=c.startTdb&&(time<c.endTdb||(time===m.endTdb&&time===c.endTdb)));
  if(!result&&SATELLITES.some(body=>body.parentId===parentId))throw new Error('当前月份缺少该行星的卫星历表');
  return result;
}
async function loadChunk(d:SatelliteChunkDescriptor):Promise<SatelliteChunk> {
  const cached=chunks.get(d.file);if(cached)return cached;
  const current=pending.get(d.file);if(current)return current;
  const request=readJson<SatelliteChunk>(d.file).then(chunk=>{
    const ids=SATELLITES.filter(body=>body.parentId===d.parentId).map(body=>body.id).sort().join(',');
    if(chunk.parentId!==d.parentId||!Array.isArray(chunk.series)||chunk.series.map(s=>s.id).sort().join(',')!==ids||chunk.series.some(s=>
      !Number.isFinite(s.startTdb)||!Number.isFinite(s.stepSeconds)||s.stepSeconds<=0||
      !Array.isArray(s.samples)||s.samples.length<2||s.samples.some(row=>!Array.isArray(row)||row.length!==6||row.some(value=>!Number.isFinite(value)))||
      s.startTdb>d.startTdb||s.startTdb+(s.samples.length-1)*s.stepSeconds<d.endTdb
    ))throw new Error('卫星历表分包损坏');
    chunks.set(d.file,chunk);pending.delete(d.file);return chunk;
  }).catch(error=>{pending.delete(d.file);throw error;});
  pending.set(d.file,request);return request;
}
/** Pure interpolation; independent arrays prevent a renderer from changing data. */
export function interpolateSatelliteChunk(chunk:SatelliteChunk,time:number):SatelliteFrame {
  return {time,states:chunk.series.map(series=>{
    const u=(time-series.startTdb)/series.stepSeconds;
    if(!Number.isFinite(u)||u<0||u>series.samples.length-1)throw new RangeError('当前分包未覆盖卫星时间');
    const index=Math.min(Math.floor(u),series.samples.length-2),s=u-index,h=series.stepSeconds;
    const s2=s*s,s3=s2*s,a=series.samples[index],b=series.samples[index+1];
    const position:Vec3=[0,0,0],velocity:Vec3=[0,0,0];
    for(let axis=0;axis<3;axis++) {
      const delta=b[axis]-a[axis];
      position[axis]=a[axis]+(-2*s3+3*s2)*delta+(s3-2*s2+s)*h*a[axis+3]+(s3-s2)*h*b[axis+3];
      velocity[axis]=((-6*s2+6*s)*delta+(3*s2-4*s+1)*h*a[axis+3]+(3*s2-2*s)*h*b[axis+3])/h;
    }
    return {id:series.id,position,velocity};
  })};
}
export function sampleSatelliteFrame(time:number,parentId:BodyId):SatelliteFrame|null {
  if(!manifest)return null;
  const d=descriptor(time,parentId,manifest);
  if(!d)return {time,states:[]};
  const chunk=chunks.get(d.file);return chunk?interpolateSatelliteChunk(chunk,time):null;
}
export async function getSatelliteFrame(time:number,parentId:BodyId):Promise<SatelliteFrame> {
  const m=await loadSatelliteManifest(),d=descriptor(time,parentId,m);
  return d?interpolateSatelliteChunk(await loadChunk(d),time):{time,states:[]};
}
export async function preloadSatelliteTime(time:number,parentId:BodyId):Promise<void> {
  const m=await loadSatelliteManifest(),d=descriptor(time,parentId,m);if(d)await loadChunk(d);
}
