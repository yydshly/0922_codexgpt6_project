import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import manifest from '../../public/data/patroclus-system/manifest.json';
import {interpolateMonthlyChunk,type MonthlyChunk} from './stateProvider';


const read=(file:string)=>readFileSync(new URL('../../public/data/patroclus-system/'+file,import.meta.url));
const packs=manifest.chunks.map(c=>JSON.parse(read(c.file).toString()) as MonthlyChunk);
const sample=(time:number)=>interpolateMonthlyChunk(packs[manifest.chunks.findIndex(c=>time>=c.startTdb&&time<=c.endTdb)],time,manifest.version);
describe('same-solution Patroclus and Menoetius ephemerides',()=>{
 it('matches identities, source hashes and every packaged chunk',()=>{
  expect(manifest.bodyIds).toEqual(['patroclus','menoetius']);expect(manifest.chunks).toHaveLength(24);
  for(const c of manifest.chunks){const data=read(c.file);expect(data.length).toBe(c.bytes);expect(createHash('sha256').update(data).digest('hex')).toBe(c.sha256);}
  for(const target of manifest.targets){const raw=gunzipSync(readFileSync(target.rawFile));expect(createHash('sha256').update(raw).digest('hex')).toBe(target.rawSha256);expect(raw.toString()).toContain(target.targetSource);}
 });
 it('validates the browser interpolator against all unpublished three-hour checkpoints',()=>{
  for(const target of manifest.targets){
   const rows=gunzipSync(readFileSync(target.rawFile)).toString().split('$$SOE')[1].split('$$EOE')[0].trim().split('\n');let count=0,position=0,velocity=0;
   rows.forEach((line,i)=>{if(i%2===0)return;const p=line.split(','),time=(Number(p[0])-2451545)*86400;if(time<manifest.startTdb||time>manifest.endTdb)return;const state=sample(time).states.find(s=>s.id===target.id)!;
    position=Math.max(position,Math.hypot(...state.position.map((v,k)=>v-Number(p[2+k]))));velocity=Math.max(velocity,Math.hypot(...state.velocity.map((v,k)=>v-Number(p[5+k]))));count++;
   });expect(count).toBeGreaterThan(2900);expect(position).toBeLessThan(1);expect(velocity).toBeLessThan(1e-4);
  }
 });
 it('has continuous monthly boundaries and covers both endpoints',()=>{
  expect(sample(manifest.startTdb).states).toHaveLength(2);expect(sample(manifest.endTdb).states).toHaveLength(2);
  for(let i=0;i<packs.length-1;i++){const time=manifest.chunks[i].endTdb,a=interpolateMonthlyChunk(packs[i],time,'a'),b=interpolateMonthlyChunk(packs[i+1],time,'b');a.states.forEach((state,j)=>expect(Math.hypot(...state.position.map((v,k)=>v-b.states[j].position[k]))).toBeLessThan(1e-5));}
 });
});

it('validates relative positions and velocities, not only the much larger heliocentric coordinates',()=>{
 const rows=manifest.targets.map(t=>gunzipSync(readFileSync(t.rawFile)).toString().split('$$SOE')[1].split('$$EOE')[0].trim().split('\n').map(line=>line.split(',').map((value,i)=>i===1?0:Number(value))));
 let count=0,position=0,velocity=0;
 rows[0].forEach((a,i)=>{if(i%2===0)return;const time=(a[0]-2451545)*86400;if(time<manifest.startTdb||time>manifest.endTdb)return;
  const states=sample(time).states,p=states.find(s=>s.id==='patroclus')!,m=states.find(s=>s.id==='menoetius')!,b=rows[1][i];
  expect(a[0]).toBe(b[0]);
  position=Math.max(position,Math.hypot(...m.position.map((v,k)=>v-p.position[k]-(b[k+2]-a[k+2]))));
  velocity=Math.max(velocity,Math.hypot(...m.velocity.map((v,k)=>v-p.velocity[k]-(b[k+5]-a[k+5]))));count++;
 });
 expect(count).toBeGreaterThan(2900);expect(position).toBeLessThan(.1);expect(velocity).toBeLessThan(1e-5);
 expect(position).toBeLessThanOrEqual(manifest.validation.relative.maxPositionErrorKm+1e-5);
 for(const t of manifest.targets)expect(t.targetSource).toContain('as_20000617_jpl082_v001_');
});
