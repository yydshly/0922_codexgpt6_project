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

await call('Runtime.enable');await call('Page.navigate',{url:'http://127.0.0.1:4180/'});await wait(2000);
const handlers=async()=>{const d=await call('Runtime.evaluate',{expression:'document'});const l=await call('DOMDebugger.getEventListeners',{objectId:d.result.objectId});await call('Runtime.releaseObject',{objectId:d.result.objectId});return l.listeners.filter(x=>x.type==='keydown').length;};
try{
 const baseline=await handlers();
 for(const title of ['尘埃与流星独立详解','太阳活动独立详解','近地空间独立详解','日球层独立详解']){
  for(let i=0;i<2;i++){await click(title,'.panorama-reading button');await assert("!!document.querySelector('.space-environment canvas')",title+' draws');await click('返回原观测','.space-environment nav button');await wait(200);if(await handlers()!==baseline)throw Error(title+' leaked keyboard listener');}
  console.log('PASS',title,'two open/close cycles release controls');
 }
 await click('建设记录','.macro-header button');await assert("document.querySelector('[data-validation-summary]').textContent.includes('40 次切换')",'current validation summary visible');
 const download=await run("document.querySelector('[data-validation-summary] a').href");const response=await fetch(download);if(!response.ok||!(await response.text()).startsWith('# '))throw Error('report download');console.log('PASS report downloadable');await shot('r09-progress');
 await run("document.querySelector('[aria-label=关闭建设记录]').click()");
 if(errors.length)throw Error(JSON.stringify(errors));
}finally{ws.close();}
