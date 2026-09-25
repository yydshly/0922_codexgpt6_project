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
const requests=[];const held=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Network.requestWillBeSent'&&m.params.request.url.includes('/textures/'))requests.push(m.params.request.url);if(m.method==='Fetch.requestPaused')held.push(m.params.requestId);});
const until=async expr=>{for(let i=0;i<180;i++){if(await run(expr))return;await wait(250);}throw Error('Timeout '+expr);};
const release=async()=>{for(const requestId of held.splice(0))await call('Fetch.continueRequest',{requestId}).catch(()=>{});await call('Fetch.disable');};
try{
 await call('Network.setCacheDisabled',{cacheDisabled:true});
 await call('Network.setBlockedURLs',{urls:['*textures/earth.jpg','*textures/earth-clouds.jpg','*textures/mars.jpg']});
 await call('Page.reload',{ignoreCache:true});await wait(800);await until("!!document.querySelector('.home-time input')?.value");
 await until("document.querySelector('[data-texture-status] summary').textContent.includes('3 项未就绪')");
 await click('1 · 地球自转','[data-motion-lessons] button');await wait(1000);
 await run("window.__textureCanvas=document.querySelector('.macro-canvas canvas');document.querySelector('[data-texture-status]').open=true");
 const date=await run("document.querySelector('.home-time input').value");
 await shot('texture-fallback');
 const names=await run("[...document.querySelectorAll('[data-texture-status] li')].filter(n=>n.textContent.includes('未就绪')).map(n=>n.textContent)");
 if(names.length!==3||!names.some(n=>n.includes('地球云层')))throw Error('wrong failed entries '+names);
 console.log('PASS failures identify Earth, clouds and Mars while ephemeris works');
 const before=requests.length;
 await call('Network.setBlockedURLs',{urls:[]});await click('重试未就绪贴图','[data-texture-status] button');
 await until("document.querySelector('[data-texture-status] summary').textContent.includes('已就绪')");
 await assert(`document.querySelector('.home-time input').value===${JSON.stringify(date)}&&window.__textureCanvas===document.querySelector('.macro-canvas canvas')&&!!document.querySelector('[data-motion-quick]')`,'retry preserves date, lesson and existing canvas');
 const retried=requests.slice(before).map(url=>url.split('/').at(-1));if(retried.length!==3||retried.some(n=>!['earth.jpg','earth-clouds.jpg','mars.jpg'].includes(n)))throw Error('unnecessary retry '+retried);
 console.log('PASS only three failed images requested again');await shot('texture-recovered');
 // A stalled image has a deadline; retry remains usable without rebuilding the scene.
 await call('Fetch.enable',{patterns:[{urlPattern:'*textures/earth.jpg',requestStage:'Request'}]});await call('Page.reload',{ignoreCache:true});await wait(800);
 await until("!!document.querySelector('.home-time input')?.value");await until("document.querySelector('[data-texture-status] summary').textContent.includes('1 项未就绪')");
 await run("document.querySelector('[data-texture-status]').open=true");await assert("[...document.querySelectorAll('[data-texture-status] li')].some(n=>n.textContent==='地球未就绪')",'stalled image becomes retryable after deadline');
 await release();await wait(500);await assert("document.querySelector('[data-texture-status] summary').textContent.includes('1 项未就绪')",'late image cannot bypass explicit recovery');
 await click('重试未就绪贴图','[data-texture-status] button');await until("document.querySelector('[data-texture-status] summary').textContent.includes('已就绪')");
 await click('1 · 地球自转','[data-motion-lessons] button');await click('本节讲解','[data-motion-quick] button');await assert("document.activeElement.hasAttribute('data-motion-current')",'motion explanation works after image recovery');await click('返回全景','[data-motion-quick] button');
 // Recreating the panorama while images are pending must not update its successor.
 await call('Fetch.enable',{patterns:[{urlPattern:'*textures/mars.jpg',requestStage:'Request'}]});await call('Page.reload',{ignoreCache:true});await wait(800);await until("!!document.querySelector('.home-time input')?.value");
 await click('恒星系统与其他星系','.macro-header button');await release();await wait(500);await click('太阳系 · 区域与成员','.macro-header button');
 await until("document.querySelector('[data-texture-status] summary').textContent.includes('已就绪')");
 if(errors.length)throw Error('runtime exceptions '+JSON.stringify(errors));
 console.log('TEXTURE RECOVERY ACCEPTANCE PASS');
}finally{await release();await call('Network.setBlockedURLs',{urls:[]});await call('Network.setCacheDisabled',{cacheDisabled:false});ws.close();}
