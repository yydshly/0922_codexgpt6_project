import type {WebGLRenderer} from 'three';
export interface SceneSample {id:number;name:string;frames:number[];geometries:number;textures:number;programs:number;drawCalls:number;triangles:number;}
export interface SceneDiagnostics {nextId:number;created:number;disposed:number;active:Record<number,SceneSample>;}
declare global {interface Window {__observatoryDiagnostics?:SceneDiagnostics;}}
/** Opt-in local QA only. Frame timestamps are actual completed scene renders, not rAF callbacks. */
export function sceneDiagnostics(renderer:WebGLRenderer,name:string){
 if(!new URLSearchParams(window.location.search).has('diagnostics'))return {frame:()=>{},dispose:()=>{}};
 const registry=window.__observatoryDiagnostics??={nextId:0,created:0,disposed:0,active:{}};
 const id=++registry.nextId;registry.created++;
 const sample:SceneSample={id,name,frames:[],geometries:0,textures:0,programs:0,drawCalls:0,triangles:0};registry.active[id]=sample;
 let disposed=false,lastInfo=0;
 return {frame:()=>{if(disposed)return;const now=performance.now();sample.frames.push(now);if(sample.frames.length>1200)sample.frames.splice(0,300);if(now-lastInfo>500){lastInfo=now;sample.geometries=renderer.info.memory.geometries;sample.textures=renderer.info.memory.textures;sample.programs=renderer.info.programs?.length??0;sample.drawCalls=renderer.info.render.calls;sample.triangles=renderer.info.render.triangles;}},dispose:()=>{if(disposed)return;disposed=true;delete registry.active[id];registry.disposed++;}};
}
