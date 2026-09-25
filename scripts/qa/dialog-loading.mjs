import fs from 'node:fs';
const target=(await(await fetch(`http://127.0.0.1:${process.env.QA_CDP_PORT??'9224'}/json`)).json()).find(t=>t.type==='page'&&t.url.includes('127.0.0.1:4180'));
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
try{
 await call('Network.setCacheDisabled',{cacheDisabled:true});
 const reset=async()=>{await call('Fetch.disable');await call('Network.setBlockedURLs',{urls:[]});await call('Page.reload',{ignoreCache:true});await ready("!!document.querySelector('.home-time input')?.value");await wait(700);if(await run("document.querySelector('.home-time').textContent.includes('暂停时间')"))await click('暂停时间','.home-time button');};
 const hold=async(name,suffix='js')=>{paused.length=0;await call('Fetch.enable',{patterns:[{urlPattern:'*assets/'+name+'-*.'+suffix,requestStage:'Request'}]});};
 const release=async()=>{for(const id of paused.splice(0))await call('Fetch.continueRequest',{requestId:id});await call('Fetch.disable');};
 // Pending is recoverable without replacing the lazy component or discarding the original request.
 await reset();await hold('ProductProgress');const date=await run("document.querySelector('.home-time input').value");
 await click('建设记录','.macro-header button');await ready("document.querySelector('[data-load-state]')?.dataset.loadState==='pending'");
 await assert("!document.querySelector('.deferred-dialog').textContent.includes('重新加载页面')",'fast loading stays compact');await wait(12500);
 await assert("document.querySelector('[data-load-state]')?.dataset.loadState==='slow'",'pending becomes slow after 12 seconds');
 await assert("document.querySelector('.deferred-dialog').textContent.includes('当前日期、镜头和开关可能重置')",'reload consequence explained');
 await key('Tab');await assert("!!document.activeElement.closest('.deferred-dialog')",'slow keyboard focus contained');await shot('dialog-slow');
 await release();await ready("!!document.querySelector('.product-progress-dialog')");
 await assert(`document.querySelector('.home-time input').value===${JSON.stringify(date)}`,'late success preserves paused date');await assert("!document.querySelector('.deferred-dialog')",'late success replaces status');await shot('dialog-recovered');await activate('[aria-label=关闭建设记录]');
 // Same guard also protects other tools and CSS downloads.
 await reset();await hold('DataJourney','css');await click('数据与实现','.macro-header button');await wait(12500);await ready("document.querySelector('[data-load-state]')?.dataset.loadState==='slow'");await key('Escape');
 await assert("!document.querySelector('.deferred-dialog')",'Escape closes slow dialog');await assert("!!document.activeElement.closest('.macro-header')",'close restores usable focus');await release();await wait(700);
 await assert("!document.querySelector('.data-journey-dialog')",'late completion never reopens dismissed dialog');await click('数据与实现','.macro-header button');await ready("!!document.querySelector('.data-journey-dialog')");await activate('[aria-label=关闭数据与实现]');
 // Explicit failure and user-selected reload remain available.
 await reset();await call('Network.setBlockedURLs',{urls:['*assets/ProductProgress-*.js']});await click('建设记录','.macro-header button');await ready("document.querySelector('[data-load-state]')?.dataset.loadState==='failed'");await shot('dialog-failed');
 await call('Network.setBlockedURLs',{urls:[]});await click('重新加载页面','.deferred-dialog button');await ready("!!document.querySelector('.home-time input')?.value&&!document.querySelector('.deferred-dialog')");await click('建设记录','.macro-header button');await ready("!!document.querySelector('.product-progress-dialog')");await activate('[aria-label=关闭建设记录]');
 console.log('SLOW DIALOG RECOVERY PASS');
}finally{await call('Fetch.disable');await call('Network.setBlockedURLs',{urls:[]});await call('Network.setCacheDisabled',{cacheDisabled:false});ws.close();}
