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





















await call('Runtime.enable');await call('Network.enable');await call('Page.reload',{ignoreCache:true});await wait(2300);await click('专题路线','.observation-path button');
try{
 const date=await run("document.querySelector('.home-time input').value");
 await run("document.querySelector('[data-topic-route=cosmic]').click()");await wait(1000);
 for(let i=0;i<5;i++){
  await assert("document.querySelector('[data-topic-current] [role=status]').textContent==='本步画面已定位'",'cosmic step '+i+' matches scene');
  await assert(`document.querySelector('[data-topic-current]').textContent.includes('第 ${i+1} / 5 步')`,'step number '+i);
  await assert(`document.querySelector('.home-time input').value===${JSON.stringify(date)}`,'date stays fixed '+i);
  await click('查看本步模块与来源','[data-topic-routes] button');await assert("!document.activeElement.closest('[data-topic-routes]')",'module/source jump '+i);await click('专题路线','.observation-path button');
  if(i===1){await assert("document.querySelector('[data-stellar-view]').dataset.stellarView==='space'",'measured space');await shot('cosmic-route-space');}
  if(i===2){await assert("document.querySelector('[data-stellar-view]').dataset.stellarView==='sky'",'same-star direction');await shot('cosmic-route-sky');}
  if(i<4){await click('专题下一步','[data-topic-routes] button');await wait(400);}
 }
 await shot('cosmic-route-galaxies');
 for(let i=3;i>=0;i--){await click('← 后退','.observation-path button');await assert(`document.querySelector('[data-topic-current]').textContent.includes('第 ${i+1} / 5 步')`,'history backward across scopes '+i);await assert("document.querySelector('[data-topic-current] [role=status]').textContent==='本步画面已定位'",'restored scene '+i);}
 for(let i=1;i<5;i++){await click('前进 →','.observation-path button');await assert(`document.querySelector('[data-topic-current]').textContent.includes('第 ${i+1} / 5 步')`,'history forward '+i);}
 await click('邻近恒星与星空','.macro-zone strong');await assert("document.querySelector('[data-topic-current] [role=status]').textContent.includes('已离开')",'manual detour invalidates route match');await click('重新定位本步','[data-topic-routes] button');await assert("document.querySelector('[data-topic-current] [role=status]').textContent==='本步画面已定位'",'relocation from detour');
 await click('退出专题并恢复全景','[data-topic-routes] button');await assert("!document.querySelector('[data-topic-current]')&&!!document.querySelector('.panorama-integration')",'exit returns solar panorama');
 await call('Network.setCacheDisabled',{cacheDisabled:true});await call('Network.setBlockedURLs',{urls:['*data/stars/hip2-subset.json*']});await call('Page.reload',{ignoreCache:true});await wait(1600);await click('专题路线','.observation-path button');await run("document.querySelector('[data-topic-route=cosmic]').click()");await wait(600);await assert("document.querySelector('[data-topic-catalogue]').textContent.includes('失败')&&[...document.querySelectorAll('[data-topic-routes] button')].find(b=>b.textContent==='专题下一步').disabled",'failed prefetch blocks next and offers retry');
 await call('Network.setBlockedURLs',{urls:[]});await click('重试专题恒星目录');await wait(600);await click('专题下一步','[data-topic-routes] button');await assert("document.querySelector('[data-topic-current] [role=status]').textContent==='本步画面已定位'",'retry advances to measured space');
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await wait(300);await assert('document.documentElement.scrollWidth<=innerWidth','route mobile no overflow');await shot('cosmic-route-mobile');
 if(errors.length)throw Error(JSON.stringify(errors));console.log('COSMIC ROUTE PASS');
}finally{await call('Network.setBlockedURLs',{urls:[]});await call('Network.setCacheDisabled',{cacheDisabled:false});await call('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});ws.close();}
