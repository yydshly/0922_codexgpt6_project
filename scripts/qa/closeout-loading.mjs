import fs from 'node:fs';
const target=(await(await fetch(`http://127.0.0.1:${process.env.QA_CDP_PORT??9225}/json`)).json()).find(t=>t.type==='page');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),errors=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);});
const call=(method,params={})=>new Promise((resolve,reject)=>{setTimeout(()=>reject(Error('CDP timeout '+method)),20000).unref();pending.set(++id,m=>m.error?reject(m.error):resolve(m.result));ws.send(JSON.stringify({id,method,params}));});
const run=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const click=async(text,selector='button')=>{await run(`(()=>{const b=[...document.querySelectorAll(${JSON.stringify(selector)})].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b)throw Error('Missing '+${JSON.stringify(text)});b.focus();b.click()})()`);await wait(500);};
const assert=async(expression,label)=>{if(!await run(expression))throw Error(label);console.log('PASS',label);};
const shot=async name=>fs.writeFileSync('.cache/'+name+'.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));


const base=process.argv[2]??'http://127.0.0.1:4180/';
const output=process.argv[3]??'public/data/validation/closeout-loading.json';
const budget=JSON.parse(fs.readFileSync('public/data/validation/closeout-budgets.json','utf8'));
const requests=new Map();
ws.addEventListener('message',e=>{const m=JSON.parse(e.data),p=m.params;if(m.method==='Network.requestWillBeSent')requests.set(p.requestId,{url:p.request.url,type:p.type,start:p.timestamp});if(m.method==='Network.responseReceived')Object.assign(requests.get(p.requestId)??{},{status:p.response.status,fromCache:p.response.fromDiskCache});if(m.method==='Network.loadingFinished')Object.assign(requests.get(p.requestId)??{},{bytes:p.encodedDataLength,end:p.timestamp});if(m.method==='Network.loadingFailed')Object.assign(requests.get(p.requestId)??{},{error:p.errorText});});
const ready=async expression=>{const t=Date.now();while(Date.now()-t<40000){if(await run(expression))return;await wait(100)}throw Error('Timeout '+expression)};
const rows=[];
try{
 await call('Network.enable');await call('Runtime.enable');await call('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
 await call('Network.emulateNetworkConditions',{offline:false,latency:100,downloadThroughput:1250000,uploadThroughput:625000});
 for(const cache of ['cold','warm']){
  if(cache==='cold')await call('Network.clearBrowserCache');requests.clear();
  await call('Page.navigate',{url:base+'?diagnostics=1'});
  const reached={};const started=Date.now();
  while(Date.now()-started<45000){
   const s=await run(`({ms:performance.now(),canvas:Object.values(window.__observatoryDiagnostics?.active??{}).some(s=>s.frames.length>0),date:!!document.querySelector('.home-time input')?.value,textures:document.querySelector('[data-texture-status]')?.dataset.state,stars:document.querySelector('.macro-canvas')?.dataset.backgroundStars})`);
   for(const [key,ok] of Object.entries({canvas:s.canvas,coreDate:s.date,textures:s.textures==='ready',stars:s.stars==='2936'}))if(ok&&reached[key]===undefined)reached[key]=Math.round(s.ms);
   if(Object.keys(reached).length===4)break;await wait(100);
  }
  await wait(2500);
  const collected=[...requests.values()].map(r=>({...r,url:r.url.replace(base,''),durationMs:r.end?Math.round((r.end-r.start)*1000):null}));
  const sample={cache,reached,bytesCompleted:collected.reduce((n,r)=>n+(r.bytes??0),0),requests:collected,textureStatus:await run("document.querySelector('[data-texture-status]')?.dataset.state")};rows.push(sample);console.log('LOAD',JSON.stringify({cache,reached,bytesCompleted:sample.bytesCompleted,unfinished:collected.filter(r=>!r.end).length}));
 }
 const tools=[];
 for(const [title,root,close] of [['建设记录','.product-progress-dialog','[aria-label=关闭建设记录]'],['整体规划','.expansion-roadmap','.roadmap-return'],['数据与实现','.data-journey-dialog','[aria-label=关闭数据与实现]'],['太阳系图鉴','.exploration-guide','.guide-return']]){
  for(const cache of ['first','repeat']){
   await run("document.querySelector('.macro-tools-menu').open=true");
   const t=await run(`(()=>{const t=performance.now();[...document.querySelectorAll('.macro-header button')].find(b=>b.textContent.trim()===${JSON.stringify(title)}).click();return t})()`);
   await ready(`!!document.querySelector(${JSON.stringify(root)})`);const ms=Math.round(await run('performance.now()')-t);tools.push({title,cache,ms});
   await run(`document.querySelector(${JSON.stringify(close)}).click()`);await wait(300);
  }
 }
 const limits=budget.limits,checks={coldCanvas:rows[0].reached.canvas<=limits.coldCanvasMs,coldCoreDate:rows[0].reached.coreDate<=limits.coldCoreDateMs,coldTextures:rows[0].reached.textures<=limits.coldTexturesMs,warmCoreDate:rows[1].reached.coreDate<=limits.warmCoreDateMs,firstTools:tools.filter(t=>t.cache==='first').every(t=>t.ms<=limits.firstToolMs),warmTools:tools.filter(t=>t.cache==='repeat').every(t=>t.ms<=limits.warmToolMs),noRuntimeExceptions:!errors.length};
 const device=await run(`(()=>{const gl=document.querySelector('.macro-canvas canvas').getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return {userAgent:navigator.userAgent,gpu:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):null,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio}})()`);
 fs.writeFileSync(output,JSON.stringify({measuredAt:new Date().toISOString(),base,budget,device,rows,tools,checks,errors,method:'CDP throttled 10 Mbps / 100 ms. Milestones measured from navigation time origin with <=100 ms polling plus execution delay. Core date readiness is not every auxiliary ephemeris. Bytes cover completed requests in observation window, not whole site. New profile cold clears HTTP cache; warm reload reuses it. Timing samples are single observations, not percentiles.'},null,2)+'\n');console.log('RESULT',JSON.stringify({checks,tools,output}));
}finally{await call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});await call('Page.navigate',{url:'http://127.0.0.1:4180/'});ws.close()}
