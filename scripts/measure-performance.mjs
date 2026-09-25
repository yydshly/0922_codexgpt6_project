import fs from 'node:fs';
const target=(await(await fetch(`http://127.0.0.1:${process.env.QA_CDP_PORT??9223}/json`)).json()).find(t=>t.type==='page'&&t.url.includes('127.0.0.1:4180'));
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),errors=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);});
const call=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,m=>m.error?reject(m.error):resolve(m.result));ws.send(JSON.stringify({id,method,params}));});
const run=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const click=async(text,selector='button')=>{await run(`(()=>{const b=[...document.querySelectorAll(${JSON.stringify(selector)})].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b)throw Error('Missing '+${JSON.stringify(text)});b.focus();b.click()})()`);await wait(500);};
const assert=async(expression,label)=>{if(!await run(expression))throw Error(label);console.log('PASS',label);};
const shot=async name=>fs.writeFileSync('.cache/'+name+'.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
const guide=async()=>{await click('阶段导览',await run("!!document.querySelector('.macro-header')")?'.macro-header button':'button');};
const visit=async i=>{await run(`document.querySelectorAll('.stage-guide article')[${i}].querySelectorAll('button')[1].click()`);await wait(2000);};

const output=process.argv[2]??'.cache/performance-latest.json';
const cycles=Number(process.argv[3]??4);if(!Number.isInteger(cycles)||cycles<1||cycles>20)throw Error('cycles must be 1–20');
await call('Runtime.enable');await call('Performance.enable');await call('Page.navigate',{url:'http://127.0.0.1:4180/?diagnostics=1'});await wait(2500);await call('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
const browser=await call('Browser.getVersion');
const device=await run("(()=>{const gl=document.querySelector('.macro-canvas canvas').getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return {ua:navigator.userAgent,logicalCores:navigator.hardwareConcurrency,reportedMemoryGB:navigator.deviceMemory,gpu:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'unavailable',viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,visibility:document.visibilityState}})()");
await guide();const stages=await run("[...document.querySelectorAll('.stage-guide article')].map(a=>({title:a.querySelector('h3')?.textContent,enabled:a.querySelector('input')?.checked}))");await run("document.querySelector('[aria-label=关闭阶段导览]').click()");
if(await run("document.querySelector('.home-time').textContent.includes('暂停时间')"))await click('暂停时间','.home-time button');
const date=await run("document.querySelector('.home-time input').value");
const rows=[];
const take=async(label,seconds=3)=>{
 await wait(1000);const start=await run('performance.now()');await wait(seconds*1000);
 const d=await run('window.__observatoryDiagnostics'),active=Object.values(d.active),frame=active[0],times=frame?.frames.filter(t=>t>=start)??[],intervals=times.slice(1).map((t,i)=>t-times[i]).sort((a,b)=>a-b);
 await call('HeapProfiler.collectGarbage');const metrics=await call('Performance.getMetrics'),heap=metrics.metrics.find(m=>m.name==='JSHeapUsedSize').value;const dom=await call('Memory.getDOMCounters');const documentRef=await call('Runtime.evaluate',{expression:'document'});const listeners=await call('DOMDebugger.getEventListeners',{objectId:documentRef.result.objectId});await call('Runtime.releaseObject',{objectId:documentRef.result.objectId});
 const row={label,scene:frame?.name,frames:times.length,fps:times.length>1?(times.length-1)*1000/(times.at(-1)-times[0]):0,p95IntervalMs:intervals[Math.floor(intervals.length*.95)],activeScenes:active.length,created:d.created,disposed:d.disposed,geometries:frame?.geometries,textures:frame?.textures,programs:frame?.programs,drawCalls:frame?.drawCalls,triangles:frame?.triangles,jsHeapAfterGC:heap,dom,documentKeydownHandlers:listeners.listeners.filter(l=>l.type==='keydown').length,visible:await run('document.visibilityState')};rows.push(row);console.log(JSON.stringify(row));
};
try{
 await take('baseline-solar',6);
 await click('播放时间','.home-time button');await take('solar-real-time',6);await click('暂停时间','.home-time button');
 for(let cycle=0;cycle<cycles;cycle++){
  await click('恒星系统与其他星系');await click('邻近恒星与星空','.macro-zone strong');await run("document.querySelectorAll('.stellar-guide button')[0].click()");await take(`${cycle+1}-neighbors`);
  await run("document.querySelectorAll('.stellar-guide button')[2].click()");await take(`${cycle+1}-sky`);
  await click('银河系中的太阳','.macro-zone strong');await take(`${cycle+1}-milkyway`);
  await click('银河系之外','.macro-zone strong');await take(`${cycle+1}-galaxies`);
  await click('太阳系 · 区域与成员');await take(`${cycle+1}-solar`);
 }
 await take('settled-solar',10);
 const revisits=[...new Set(rows.map(r=>r.scene))].map(scene=>rows.filter(r=>r.scene===scene&&/^\d/.test(r.label)));
 const checks={allRenderSamplesAtLeast30:rows.every(r=>r.fps>=30),oneActiveScene:rows.every(r=>r.activeScenes===1&&r.created-r.disposed===1),documentKeydownStable:rows.every(r=>r.documentKeydownHandlers===1),revisitDomStable:revisits.every(g=>new Set(g.map(r=>r.dom.nodes)).size===1),revisitListenersStable:revisits.every(g=>new Set(g.map(r=>r.dom.jsEventListeners)).size===1),noRuntimeExceptions:!errors.length};
 const report={checks,cycles,transitions:cycles*5,measuredAt:new Date().toISOString(),browser,device,stages,date,method:'CPU render-call completion timestamps (submission throughput, not GPU present or physical display FPS) after 1s settling, 3s sampling (baseline 6s). Forced garbage collection before each JS heap / DOM snapshot. Cycle count and transitions recorded separately; same module revisits compared. GPU info is live Three resource counts, not driver bytes or a leak proof.',rows,runtimeErrors:errors};fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log('PERFORMANCE REPORT',output);
}finally{ws.close();}
