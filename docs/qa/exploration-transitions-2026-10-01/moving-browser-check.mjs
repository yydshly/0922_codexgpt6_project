import fs from 'node:fs';
const out='docs/qa/exploration-transitions-2026-10-01';
for(const old of await(await fetch('http://127.0.0.1:9333/json/list')).json())if(old.type==='page')await fetch('http://127.0.0.1:9333/json/close/'+old.id);
const tab=await(await fetch('http://127.0.0.1:9333/json/new?about:blank',{method:'PUT'})).json();const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),errors=[],checks=[];
ws.addEventListener('message',event=>{const d=JSON.parse(event.data);if(d.id){pending.get(d.id)?.(d);pending.delete(d.id);}else if(d.method==='Runtime.exceptionThrown'||d.method==='Log.entryAdded'&&d.params.entry.level==='error')errors.push(d.params);});
const call=(method,params={})=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(method+' timeout')),30000);pending.set(++id,d=>{clearTimeout(timer);d.error?reject(Error(JSON.stringify(d.error))):resolve(d.result);});ws.send(JSON.stringify({id,method,params}));});
const run=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));const until=async expression=>{for(let i=0;i<600;i++){if(await run(expression))return;await wait(150);}throw Error('Timeout '+expression);};
const click=async selector=>{await run(`document.querySelector(${JSON.stringify(selector)}).click()`);await wait(200);};
const key=async key=>{const code=key==='Escape'?'Escape':'KeyW',virtualKey=key==='Escape'?27:87;await call('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:virtualKey,nativeVirtualKeyCode:virtualKey});await call('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:virtualKey,nativeVirtualKeyCode:virtualKey});await wait(200);};
const check=(condition,name)=>{checks.push({name,passed:!!condition});if(!condition)throw Error(name);console.log('PASS '+name);};
const reading=()=>run(`({time:parseFloat(document.querySelectorAll('.exploration-stats dd')[0].textContent),speed:parseFloat(document.querySelectorAll('.exploration-telemetry b')[0].textContent),travel:parseFloat(document.querySelectorAll('.exploration-telemetry b')[1].textContent),fuel:parseFloat(document.querySelectorAll('.exploration-telemetry b')[2].textContent),target:document.querySelector('.exploration-current-chapter').dataset.id,tour:document.querySelector('.exploration-next').textContent})`);
await call('Runtime.enable');await call('Log.enable');await call('Page.enable');await call('Page.bringToFront');await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
try{
 await call('Page.navigate',{url:'http://127.0.0.1:4180/'});await until('!!document.querySelector(".macro-flight-entry")');await click('.macro-flight-entry');await until('!!document.querySelector(".exploration-telemetry")&&parseFloat(document.querySelectorAll(".exploration-telemetry b")[0].textContent)>1');
 await run('document.querySelector(".exploration-stage").focus()');await key('Escape');await until('!!document.querySelector(".exploration-transition-dialog")');const frozen=await reading();await wait(600);
 check(frozen.speed>1&&JSON.stringify(frozen)===JSON.stringify(await reading()),'departure review freezes a moving automatic flight while retaining its nonzero velocity and route');
 await key('w');check(JSON.stringify(frozen)===JSON.stringify(await reading()),'driving keys cannot take over or change state behind the departure dialog');
 await key('Escape');await until(`parseFloat(document.querySelectorAll('.exploration-stats dd')[0].textContent)>${frozen.time+.2}`);const resumed=await reading();
 check(resumed.speed>0&&resumed.time>frozen.time&&resumed.travel>=frozen.travel&&resumed.fuel<=frozen.fuel&&resumed.fuel<100&&resumed.target===frozen.target&&resumed.tour===frozen.tour,'canceling departure resumes actual motion and the unchanged route without resetting fuel or time');
 await click('.exploration-pause');await click('.free-exploration header>button:first-child');const paused=await reading();await click('.exploration-transition-cancel');await wait(700);
 check(paused.speed>0&&JSON.stringify(paused)===JSON.stringify(await reading())&&await run('document.querySelector(".exploration-pause").textContent==="继续"'),'canceling departure of an already paused moving vessel retains velocity and stays paused');
 await click('.exploration-open-report');const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`${out}/05-moving-state-preserved.png`,Buffer.from(shot.data,'base64'));
 check(errors.length===0,'no runtime or console errors during moving and paused cancellation');
}catch(error){fs.writeFileSync(`${out}/moving-failure.txt`,String(error));throw error;}
finally{fs.writeFileSync(`${out}/moving-checks.json`,JSON.stringify({checks,errors},null,2));ws.close();}
