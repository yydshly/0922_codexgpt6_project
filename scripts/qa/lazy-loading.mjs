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
try{
 await call('Network.setCacheDisabled',{cacheDisabled:true});await call('Page.reload',{ignoreCache:true});await wait(700);await ready("!!document.querySelector('.home-time input')?.value");await wait(800);
 const resources=await run("performance.getEntriesByType('resource').filter(e=>/\\.(js|css)$/.test(e.name)).map(e=>({name:e.name,bytes:e.decodedBodySize}))");
 fs.writeFileSync('.cache/lazy-initial-resources.json',JSON.stringify(resources,null,2));
 await assert("!performance.getEntriesByType('resource').some(e=>['ProductProgress','ExpansionRoadmap','DataJourney','StageGuide','ExplorationGuide'].some(n=>e.name.includes('/'+n+'-')))",'optional code and styles absent on first load');await shot('lazy-panorama');
 for(const [label,root,close] of [['建设记录','.product-progress-dialog','[aria-label=关闭建设记录]'],['数据与实现','.data-journey-dialog','[aria-label=关闭数据与实现]'],['整体规划','.expansion-roadmap','.roadmap-return'],['太阳系图鉴','.exploration-guide','.guide-return'],['星点与环怎么看','.reading-guide','[aria-label=关闭星点与环图例]'],['阶段导览','.stage-guide','[aria-label=关闭阶段导览]']]){
  await click(label,'.macro-header button');await ready(`!!document.querySelector(${JSON.stringify(root)})`);await assert(`document.querySelector(${JSON.stringify(root)}).getBoundingClientRect().height>100`,label+' opens with layout');await activate(close);
 }
 for(const [index,root] of [[4,'.space-environment'],[6,'.solar-activity'],[7,'.dust-explorer'],[8,'.heliosphere-explorer']]){
  await click('阶段导览','.macro-header button');await ready("!!document.querySelector('.stage-guide')");await activate(`.stage-guide article:nth-child(${index+1}) button`);await ready(`!!document.querySelector(${JSON.stringify(root)})`);await assert(`!!document.querySelector(${JSON.stringify(root+' canvas')})`,root+' independent 3D scene');await click('返回原观测',root+' button');
 }
 await click('物理验证','.macro-header button');await click('验证报告','.scene-actions button');await ready("!!document.querySelector('.validation-panel')");await activate('[title=关闭报告]');await activate('.macro-entry-button');
 await click('精细观测','.macro-header button');await click('运行知识','.scene-actions button');await ready("!!document.querySelector('.knowledge-dialog')");await activate('[aria-label=关闭运行知识]');await activate('.macro-entry-button');
 if(errors.length)throw Error('unexpected normal-path exceptions '+JSON.stringify(errors));
 // Hold one module request so cancellation is tested before it resolves.
 await call('Page.reload',{ignoreCache:true});await wait(700);await ready("!!document.querySelector('.home-time input')?.value");await call('Fetch.enable',{patterns:[{urlPattern:'*assets/ProductProgress-*.js',requestStage:'Request'}]});
 await click('建设记录','.macro-header button');await ready("!!document.querySelector('.deferred-dialog [role=status]')");await key('Escape');await assert("!document.querySelector('.deferred-dialog')",'Escape closes pending load');for(const id of paused.splice(0))await call('Fetch.continueRequest',{requestId:id});await call('Fetch.disable');await wait(600);await assert("!document.querySelector('.product-progress-dialog')",'late module does not reopen closed dialog');
 await click('建设记录','.macro-header button');await ready("!!document.querySelector('.product-progress-dialog')");await activate('[aria-label=关闭建设记录]');
 for(const suffix of ['js','css']){
  await call('Network.setBlockedURLs',{urls:['*assets/ProductProgress-*.'+suffix]});await call('Page.reload',{ignoreCache:true});await wait(700);await ready("!!document.querySelector('.home-time input')?.value");if(await run("document.querySelector('.home-time').textContent.includes('暂停时间')"))await click('暂停时间','.home-time button');const date=await run("document.querySelector('.home-time input').value");
  await click('建设记录','.macro-header button');await ready("!!document.querySelector('.deferred-dialog [role=alert]')");await shot('lazy-failure-'+suffix);await key('Tab');await assert("!!document.activeElement.closest('.deferred-dialog')",'failure keyboard focus contained '+suffix);
  await click('关闭','.deferred-dialog button');await assert(`!document.querySelector('.deferred-dialog')&&document.querySelector('.home-time input').value===${JSON.stringify(date)}`,'failure close preserves date '+suffix);
  await assert("!!document.activeElement.closest('.macro-header')",'failure restores usable focus '+suffix);
  await call('Network.setBlockedURLs',{urls:[]});await click('建设记录','.macro-header button');await ready("!!document.querySelector('.deferred-dialog [role=alert]')");await click('重新加载页面','.deferred-dialog button');await wait(700);await ready("!!document.querySelector('.home-time input')?.value&&!document.querySelector('.deferred-dialog')");await click('建设记录','.macro-header button');await ready("!!document.querySelector('.product-progress-dialog')");await assert("getComputedStyle(document.querySelector('.product-progress-dialog')).position!=='static'||document.querySelector('.product-progress-dialog').getBoundingClientRect().width<innerWidth",'reload restores styled dialog '+suffix);await activate('[aria-label=关闭建设记录]');
 }
 await click('1 · 地球自转','[data-motion-lessons] button');await click('本节讲解','[data-motion-quick] button');await assert("document.activeElement.hasAttribute('data-motion-current')",'main lesson still locates explanation');await click('返回全景','[data-motion-quick] button');
 console.log('LAZY LOADING ACCEPTANCE PASS');
}finally{await call('Fetch.disable');await call('Network.setBlockedURLs',{urls:[]});await call('Network.setCacheDisabled',{cacheDisabled:false});ws.close();}
