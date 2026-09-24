import {COMETS} from './comets';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { interpolateMonthlyChunk, type MonthlyChunk } from './stateProvider';
import { heliocentricComets, cometMetrics,validCometTracks } from './cometState';
import type { StateFrame } from '../types';
import manifest from '../../public/data/comets/manifest.json';
import tracks from '../../public/data/comets/tracks.json';
const read = (file:string) => readFileSync(new URL(`../../public/data/comets/${file}`,import.meta.url));
const packs=manifest.chunks.map(item=>JSON.parse(read(item.file).toString()) as MonthlyChunk);
const raw=(id:string)=>gunzipSync(readFileSync(new URL(`../../data-sources/comets/${id}-2026-2027-3h.txt.gz`,import.meta.url))).toString();
const rows=(id:string)=>raw(id).split('$$SOE')[1].split('$$EOE')[0].trim().split('\n').map(line=>{const p=line.split(',');return [(Number(p[0])-2451545)*86400,...p.slice(2,8).map(Number)];});
function sample(time:number){const i=manifest.chunks.findIndex(c=>time>=c.startTdb && time<=c.endTdb);return interpolateMonthlyChunk(packs[i],time,manifest.version);}

describe('彗星真实供数',()=>{
  it('校验每个月数据、原始响应与真实轨迹的完整性',()=>{
    expect(manifest.chunks).toHaveLength(24);
    expect(manifest.bodyIds).toEqual(COMETS.map(c=>c.id));
    for(const descriptor of [...manifest.chunks,manifest.tracks]){
      const bytes=read(descriptor.file);
      expect(bytes.length).toBe(descriptor.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(descriptor.sha256);
    }
    for(const target of [...manifest.targets,manifest.tracks.sunSource]) expect(createHash('sha256').update(raw(target.id)).digest('hex')).toBe(target.rawSha256);
  });
  it('用未发布的 JPL 检查点验证浏览器实际使用的插值器',()=>{
    for(const id of manifest.bodyIds){
      let maxPosition=0,maxVelocity=0,count=0;
      for(const row of rows(id).filter((_,index)=>index%2===1)){
        if(row[0]<manifest.startTdb||row[0]>manifest.endTdb)continue;
        const state=sample(row[0]).states.find(s=>s.id===id)!;
        maxPosition=Math.max(maxPosition,Math.hypot(...state.position.map((v,i)=>v-row[i+1])));
        maxVelocity=Math.max(maxVelocity,Math.hypot(...state.velocity.map((v,i)=>v-row[i+4])));count++;
      }
      expect(count).toBeGreaterThan(2900);expect(maxPosition).toBeLessThan(1);expect(maxVelocity).toBeLessThan(1e-4);
    }
  });
  it('跨月连续并能读取起止时刻',()=>{
    expect(sample(manifest.startTdb).states).toHaveLength(COMETS.length);expect(sample(manifest.endTdb).states).toHaveLength(COMETS.length);
    for(let i=0;i<packs.length-1;i++){
      const t=manifest.chunks[i].endTdb;
      const left=interpolateMonthlyChunk(packs[i],t,manifest.version),right=interpolateMonthlyChunk(packs[i+1],t,manifest.version);
      for(let j=0;j<COMETS.length;j++){
        expect(Math.hypot(...left.states[j].position.map((v,k)=>v-right.states[j].position[k]))).toBeLessThan(1e-5);
        expect(Math.hypot(...left.states[j].velocity.map((v,k)=>v-right.states[j].velocity[k]))).toBeLessThan(1e-12);
      }
    }
  });
  it('真实路径扣除各自历元的太阳，不把两年路径闭合为整圈',()=>{
    const sun=rows('sun');
    const sunPack:MonthlyChunk={series:[{id:'sun',startTdb:sun[0][0],stepSeconds:10800,samples:sun.map(r=>r.slice(1))}]};
    for(const track of tracks.tracks){
      expect(track.points).toHaveLength(731);
      for(const row of track.points){
        const state=sample(row[0]).states.find(s=>s.id===track.id)!;
        const parent=interpolateMonthlyChunk(sunPack,row[0],'test').states[0];
        expect(Math.hypot(...row.slice(1).map((v,i)=>v-(state.position[i]-parent.position[i])))).toBeLessThan(.001);
      }
      expect(track.points[0].slice(1)).not.toEqual(track.points.at(-1)!.slice(1));
    }
  });
  it('位置和参数随日期变化；拒绝过期与非兼容状态',()=>{
    const a=sample(manifest.startTdb),b=sample(manifest.startTdb+30*86400);
    const frame={time:a.timeTdb,positions:new Float64Array(30),velocities:new Float64Array(30)} as StateFrame;
    frame.positions.set([10,20,30]);frame.velocities.set([1,2,3]);
    const relative=heliocentricComets(frame,a);
    expect(relative[0].position).toEqual(a.states[0].position.map((v,i)=>v-frame.positions[i]));
    expect(relative[0].velocity).toEqual(a.states[0].velocity.map((v,i)=>v-frame.velocities[i]));
    expect(cometMetrics(relative[0]).distanceAu).toBeGreaterThan(30);
    expect(heliocentricComets(frame,b)).toEqual([]);
    expect(heliocentricComets(null,a)).toEqual([]);
    expect(heliocentricComets(frame,{...a,originId:'earth'})).toEqual([]);
    for(let i=0;i<COMETS.length;i++)expect(Math.hypot(...a.states[i].position.map((v,k)=>v-b.states[i].position[k]))).toBeGreaterThan(100000);
  });
});

it('accepts every registered comet path and rejects missing, duplicate or malformed paths',()=>{
 expect(validCometTracks(tracks)).toBe(true);
 expect(validCometTracks({...tracks,tracks:tracks.tracks.slice(0,2)})).toBe(false);
 expect(validCometTracks({...tracks,origin:'earth'})).toBe(false);
 expect(validCometTracks({...tracks,tracks:tracks.tracks.map(()=>tracks.tracks[0])})).toBe(false);
 const broken=structuredClone(tracks);broken.tracks[0].points[1][0]=broken.tracks[0].points[0][0];expect(validCometTracks(broken)).toBe(false);
});
