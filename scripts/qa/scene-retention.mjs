// Diagnose retained scene resources. Do not call DOM.getDetachedDomNodes before the snapshot: the inspector itself pins those nodes.
import fs from 'node:fs';
const target=(await(await fetch('http://127.0.0.1:9223/json')).json()).find(t=>t.type==='page'&&t.url.includes('127.0.0.1:4180'));
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

await call('Runtime.enable');await call('Page.navigate',{url:'http://127.0.0.1:4180/?diagnostics=1'});await wait(2200);
for(let i=0;i<9;i++){
 if(i){await click('恒星系统与其他星系');await click('太阳系 · 区域与成员');await wait(2500);}
 await call('HeapProfiler.collectGarbage');console.log(i,await call('Memory.getDOMCounters'));
}
const chunks=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='HeapProfiler.addHeapSnapshotChunk')chunks.push(m.params.chunk);});await call('HeapProfiler.takeHeapSnapshot');fs.writeFileSync('.cache/scene-retention.heapsnapshot',chunks.join(''));ws.close();
