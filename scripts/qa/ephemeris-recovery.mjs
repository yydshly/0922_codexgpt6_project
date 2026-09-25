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


await call('Runtime.enable');await call('Network.enable');
const ready=async expr=>{for(let i=0;i<100;i++){if(await run(expr))return;await wait(100);}throw Error('Timeout '+expr);};
const activate=async selector=>{await run(`document.querySelector(${JSON.stringify(selector)}).click()`);await wait(200);};
const key=async k=>{await call('Input.dispatchKeyEvent',{type:'keyDown',key:k,code:k==='Escape'?'Escape':'Tab',windowsVirtualKeyCode:k==='Escape'?27:9});await call('Input.dispatchKeyEvent',{type:'keyUp',key:k,code:k==='Escape'?'Escape':'Tab',windowsVirtualKeyCode:k==='Escape'?27:9});await wait(200);};
const paused=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Fetch.requestPaused')paused.push(m.params.requestId);});
const until=async expression=>{for(let i=0;i<180;i++){if(await run(expression))return;await wait(250);}throw Error('Timeout '+expression);};
const fill=async value=>{await run(`(()=>{const input=document.querySelector('.home-time input');input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()`);await wait(150);};
const release=async()=>{for(const requestId of paused.splice(0))await call('Fetch.continueRequest',{requestId}).catch(()=>{});await call('Fetch.disable');};
try{
 await call('Network.setCacheDisabled',{cacheDisabled:true});
 await call('Fetch.enable',{patterns:[{urlPattern:'*data/manifest.json',requestStage:'Request'}]});
 await call('Page.reload',{ignoreCache:true});await wait(800);
 await until("document.querySelector('.home-time [role=status]')?.textContent.includes('目录')");
 await assert("!document.querySelector('.home-time input').value",'no invented observation time before directory');
 await until("document.querySelector('.home-time [role=alert]')?.textContent.includes('超时')");
 await assert("[...document.querySelectorAll('.home-time button')].some(b=>b.textContent==='重试历表'&&!b.disabled)",'stalled manifest exposes retry');await assert("document.querySelector('.macro-stage-label').textContent.includes('尚未就绪')",'stage badge no longer claims loading after failure');await shot('ephemeris-timeout');
 await release();await click('重试历表','.home-time button');await until("!!document.querySelector('.home-time input')?.value&&!document.querySelector('.home-time [role=status]')");
 await assert("document.querySelector('.home-time button').textContent==='播放时间'",'recovery stays paused');
 const before=await run("document.querySelector('.home-time input').value");
 await call('Network.setBlockedURLs',{urls:['*data/2027-04.json']});
 await fill('2027-04-15T12:34:56');await click('应用日期','.home-time button');
 await until("document.querySelector('.home-time [role=alert]')?.textContent.includes('2027-04.json')");
 await assert(`document.querySelector('.home-time input').value===${JSON.stringify(before)}`,'failed seek keeps last valid date');await assert("document.querySelector('.macro-stage-label').textContent.includes('上次有效时刻')",'last valid date is explicitly marked');
 await shot('ephemeris-month-failure');await call('Network.setBlockedURLs',{urls:[]});await click('重试历表','.home-time button');
 await until("document.querySelector('.home-time input').value==='2027-04-15T12:34:56'&&!document.querySelector('.home-time [role=alert]')");
 await assert("document.querySelector('.home-time button').textContent==='播放时间'",'retry restores requested date without auto-playing');
 // A slow old month must never replace a newer seek.
 await call('Fetch.enable',{patterns:[{urlPattern:'*data/2027-11.json',requestStage:'Request'}]});
 await fill('2027-11-03T09:00:00');await click('应用日期','.home-time button');
 await until("document.querySelector('.home-time [role=status]')?.textContent.includes('位置与速度')");
 await click('现在','.home-time button');await until(`document.querySelector('.home-time input').value.startsWith(${JSON.stringify(before.slice(0,10))})&&!document.querySelector('.home-time [role=status]')`);
 const newer=await run("document.querySelector('.home-time input').value");await release();await wait(800);
 await assert(`document.querySelector('.home-time input').value===${JSON.stringify(newer)}&&!document.querySelector('.home-time [role=alert]')`,'late old response cannot overwrite newer date');
 await click('1 · 地球自转','[data-motion-lessons] button');await click('本节讲解','[data-motion-quick] button');await assert("document.activeElement.hasAttribute('data-motion-current')",'lesson remains reachable after recovery');await click('返回全景','[data-motion-quick] button');
 if(errors.length)throw Error('runtime errors '+JSON.stringify(errors));
 console.log('EPHEMERIS RECOVERY ACCEPTANCE PASS');
}finally{await release();await call('Network.setBlockedURLs',{urls:[]});await call('Network.setCacheDisabled',{cacheDisabled:false});ws.close();}
