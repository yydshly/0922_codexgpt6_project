import { OBSERVATION_COUNTS } from '../data/observationCatalog';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import manifest from '../../public/data/small-bodies/manifest.json';
import { interpolateMonthlyChunk, type MonthlyChunk } from './stateProvider';
import { matchingMemberBatch } from './smallBodies';
import { REGION_MEMBERS, membersForRegion, NEW_MEMBER_IDS } from '../data/regionMembers';
import type { StateFrame } from '../types';
const read=(file:string)=>readFileSync(new URL(`../../public/data/small-bodies/${file}`,import.meta.url));
const packs=manifest.chunks.map(c=>JSON.parse(read(c.file).toString()) as MonthlyChunk);
const sample=(time:number)=>interpolateMonthlyChunk(packs[manifest.chunks.findIndex(c=>time>=c.startTdb&&time<=c.endTdb)],time,manifest.version);

describe('区域代表成员真实历表',()=>{
 it('区域映射保留分类差异，并且每个标记有外观和来源',()=>{
   expect(REGION_MEMBERS).toHaveLength(13);
   expect(OBSERVATION_COUNTS.dynamic).toBe(32);expect(OBSERVATION_COUNTS.macroAdditional).toBe(20);expect(OBSERVATION_COUNTS.allDynamic).toBe(52);
   expect(membersForRegion('asteroid').map(b=>b.id)).toEqual(['ceres','vesta']);
   expect(membersForRegion('kuiper').map(b=>b.id)).toEqual(['pluto','haumea','makemake','quaoar']);
   expect(membersForRegion('scattered').map(b=>b.id)).toEqual(['sedna','eris']);
   expect(membersForRegion('all','dwarfs')).toHaveLength(5);
   expect(membersForRegion('all','asteroids').map(b=>b.id)).toEqual(['eros','ceres','vesta']);
   expect(membersForRegion('all','centaurs').map(b=>b.id)).toEqual(['patroclus','achilles','aneas','chariklo']);
   expect(membersForRegion('oort')).toHaveLength(0);
   expect(REGION_MEMBERS.every(b=>/^https:\/\/(science\.nasa\.gov|ssd\.jpl\.nasa\.gov)\//.test(b.sourceUrl) && b.description && b.relation)).toBe(true);
   expect(manifest.bodyIds).toEqual(NEW_MEMBER_IDS);
 });
 it('验证 24 月数据和原始 JPL 响应哈希',()=>{
   expect(manifest.chunks).toHaveLength(24);
   for(const c of manifest.chunks){const bytes=read(c.file);expect(bytes.length).toBe(c.bytes);expect(createHash('sha256').update(bytes).digest('hex')).toBe(c.sha256);}
   for(const target of manifest.targets){const raw=gunzipSync(readFileSync(new URL(`../../${target.rawFile}`,import.meta.url)));expect(createHash('sha256').update(raw).digest('hex')).toBe(target.rawSha256);expect(raw.toString()).toContain(target.targetSource);}
 });
 it('用未发布的 3 小时检查点验证前端实际插值器',()=>{
   for(const target of manifest.targets){
     const raw=gunzipSync(readFileSync(new URL(`../../${target.rawFile}`,import.meta.url))).toString();
     const rows=raw.split('$$SOE')[1].split('$$EOE')[0].trim().split('\n');
     let maxPosition=0,maxVelocity=0,count=0;
     rows.forEach((line,i)=>{
       if(i%2===0)return;const p=line.split(','),time=(Number(p[0])-2451545)*86400;
       if(time<manifest.startTdb||time>manifest.endTdb)return;
       const state=sample(time).states.find(s=>s.id===target.id)!;
       maxPosition=Math.max(maxPosition,Math.hypot(...state.position.map((v,k)=>v-Number(p[k+2]))));
       maxVelocity=Math.max(maxVelocity,Math.hypot(...state.velocity.map((v,k)=>v-Number(p[k+5]))));count++;
     });
     expect(count).toBeGreaterThan(2900);expect(maxPosition).toBeLessThan(1);expect(maxVelocity).toBeLessThan(1e-4);
   }
 });
 it('跨月连续且读取覆盖期两端，成员实际随日期移动',()=>{
   expect(sample(manifest.startTdb).states).toHaveLength(NEW_MEMBER_IDS.length);expect(sample(manifest.endTdb).states).toHaveLength(NEW_MEMBER_IDS.length);
   for(let i=0;i<23;i++){
     const t=manifest.chunks[i].endTdb,a=interpolateMonthlyChunk(packs[i],t,'a'),b=interpolateMonthlyChunk(packs[i+1],t,'b');
     for(let j=0;j<NEW_MEMBER_IDS.length;j++)expect(Math.hypot(...a.states[j].position.map((v,k)=>v-b.states[j].position[k]))).toBeLessThan(1e-5);
   }
   const a=sample(manifest.startTdb),b=sample(manifest.startTdb+30*86400);
   for(let j=0;j<NEW_MEMBER_IDS.length;j++)expect(Math.hypot(...a.states[j].position.map((v,k)=>v-b.states[j].position[k]))).toBeGreaterThan(100000);
 });
 it('慢数据包不阻塞已加载成员，拒绝旧日期和错误参照',()=>{
   const a=sample(manifest.startTdb),frame={time:a.timeTdb} as StateFrame;
   expect(matchingMemberBatch(frame,a,null)?.states).toHaveLength(NEW_MEMBER_IDS.length);
   expect(matchingMemberBatch(frame,a,{...a,timeTdb:a.timeTdb-1})?.states).toHaveLength(NEW_MEMBER_IDS.length);
   expect(matchingMemberBatch(frame,{...a,originId:'earth'})).toBeNull();
   expect(matchingMemberBatch(null,a)).toBeNull();
   expect(()=>matchingMemberBatch(frame,a,a)).toThrow('重复');
 });
});
