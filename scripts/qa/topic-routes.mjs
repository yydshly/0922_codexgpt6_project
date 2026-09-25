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


















try{
await call('Runtime.enable');await call('Page.reload',{ignoreCache:true});await wait(3500);
await guide();await run("document.querySelectorAll('.stage-guide article').forEach(a=>{const i=a.querySelector('input');if(i&&!i.checked)i.click()})");await run("document.querySelector('[aria-label=关闭阶段导览]').click()");await wait(2500);await click('专题路线','.observation-path button');
await assert("!document.querySelector('[data-topic-current]')&&!document.querySelector('[data-topic-route][aria-pressed=true]')",'no default selected topic');
await run('window.__topicCanvas=document.querySelector(".macro-canvas canvas")');const date=await run("document.querySelector('.home-time input').value");
for(const [id,count] of [['boundaries',5],['earth-moon',4],['giants',4],['small-bodies',5],['solar-earth',4]]){
 await run(`document.querySelector('[data-topic-route="${id}"]').click()`);await wait(1300);
 for(let i=0;i<count;i++){
  for(let w=0;w<100;w++){if(await run("document.querySelector('[data-topic-current] [role=status]')?.textContent==='本步画面已定位'"))break;await wait(150);}
  console.log(id,i+1,await run("document.querySelector('[data-topic-current]')?.innerText.slice(0,130)"));
  await assert("document.querySelector('[data-topic-current] [role=status]')?.textContent==='本步画面已定位'",id+' step '+(i+1)+' matches scene');
  await assert(`document.querySelector('[data-topic-current]').textContent.includes('第 ${i+1} / ${count} 步')`,id+' progress');
  await assert(`document.querySelector('.home-time input').value===${JSON.stringify(date)}`,id+' preserves date');
  await assert('window.__topicCanvas===document.querySelector(".macro-canvas canvas")',id+' same canvas');
  await click('查看本步模块与来源','[data-topic-routes] button');await assert("!document.activeElement.closest('[data-topic-routes]')",id+' opens related module');await click('专题路线','.observation-path button');
  if(i<count-1)await click('专题下一步','[data-topic-routes] button');await wait(900);
 }
 await assert("[...document.querySelectorAll('[data-topic-routes] button')].find(b=>b.textContent==='专题下一步').disabled",id+' end bounded');await shot('topic-'+id);
 await click('退出专题并恢复全景','[data-topic-routes] button');await assert("!document.querySelector('[data-topic-current]')",id+' exits');
}
// Leaving the prescribed scene must not claim the lesson is still located.
await run("document.querySelector('[data-topic-route=earth-moon]').click()");await wait(800);await click('专题下一步','[data-topic-routes] button');await wait(800);
await click('1 · 地球自转','[data-motion-lessons] button');await assert("document.querySelector('[data-topic-current] [role=status]').textContent.includes('已离开')",'manual scene deviation is explicit');await click('重新定位本步','[data-topic-routes] button');await assert("document.querySelector('[data-topic-current] [role=status]').textContent==='本步画面已定位'",'relocate restores matching scene');
await click('专题下一步','[data-topic-routes] button');await click('连续播放','[data-motion-lessons] button');await click('专题下一步','[data-topic-routes] button');await assert("document.querySelector('.home-time').innerText.includes('播放时间')",'switching motion steps pauses once');
await click('← 后退','.observation-path button');await assert("document.querySelector('[data-topic-current] h3').textContent==='从空间位置到月相'",'history restores topic step');await click('前进 →','.observation-path button');await assert("document.querySelector('[data-topic-current] h3').textContent==='同一面朝地球也在自转'",'history forward restores topic step');
await guide();await run("document.querySelectorAll('.stage-guide article')[3].querySelector('input').click()");await run("document.querySelector('[aria-label=关闭阶段导览]').click()");await wait(500);await assert("document.querySelector('[data-topic-current] [role=status]').textContent.includes('请开启')",'stage off explains unavailable');await assert("[...document.querySelectorAll('[data-topic-routes] button')].find(b=>b.textContent==='重新定位本步').disabled",'stage off blocks relocation');await guide();await run("document.querySelectorAll('.stage-guide article')[3].querySelector('input').click()");await run("document.querySelector('[aria-label=关闭阶段导览]').click()");await wait(800);
await click('重新定位本步','[data-topic-routes] button');await click('专题路线','.observation-path button');await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await wait(400);await assert("document.documentElement.scrollWidth<=innerWidth",'390px no overflow');await shot('topic-mobile');await call('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});await click('退出专题并恢复全景','[data-topic-routes] button');await click('专题路线','.observation-path button');
if(errors.length)throw Error(JSON.stringify(errors));console.log('22 topic steps pass; runtime errors 0');}finally{await call('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});ws.close();}
