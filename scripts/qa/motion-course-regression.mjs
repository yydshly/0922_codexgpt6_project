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
await guide();await run("document.querySelectorAll('.stage-guide article').forEach(a=>{const i=a.querySelector('input');if(i&&!i.checked)i.click()})");await run("document.querySelector('[aria-label=关闭阶段导览]').click()");await wait(1800);
await click('全景现象','.macro-panel-tabs button');await run('window.__r06Canvas=document.querySelector(".macro-canvas canvas")');
const lessons=[...fs.readFileSync('src/data/motionLessons.ts','utf8').matchAll(/\{id:'([^']+)',target:'[^']+',body:'[^']+',name:'([^']+)',title:'([^']+)'/g)].map(m=>({id:m[1],name:m[2],title:m[3]}));
await click('1 · 地球自转','[data-motion-lessons] button');
for(let i=0;i<lessons.length;i++){
 const l=lessons[i];
 for(let t=0;t<120;t++){if(await run("document.querySelector('[data-motion-playback] strong')?.textContent!=='正在载入历表，运动暂缓'"))break;await wait(100);}
 await assert(`document.querySelector('[data-motion-current]')?.textContent===${JSON.stringify(l.title)}`,l.id+' title');
 await assert(`document.querySelector('[data-motion-route]')?.textContent.includes('第 ${i+1} / 14 节')`,l.id+' route');
 await assert('document.querySelector(".macro-canvas canvas")===window.__r06Canvas',l.id+' same canvas');
 if(l.id!=='tidal-cause'){
   await assert("document.querySelector('[data-motion-playback] strong').textContent.startsWith('已暂停')",l.id+' enters paused');
   const date=await run("document.querySelector('.home-time input').value");
   await click('连续播放','[data-motion-lessons] button');await wait(600);
   await assert("document.querySelector('[data-motion-playback] strong').textContent==='正在连续运动'",l.id+' plays');
   await click('重置本节日期','[data-motion-lessons] button');await wait(500);
   await assert("document.querySelector('[data-motion-playback] strong').textContent.startsWith('已暂停')",l.id+' reset pauses');
   await assert(`document.querySelector('.home-time input').value===${JSON.stringify(date)}`,l.id+' reset date');
 }
 if(i<lessons.length-1){for(let t=0;t<100;t++){if(await run("![...document.querySelectorAll('[data-motion-lessons] button')].find(b=>b.textContent==='下一节运动').disabled"))break;await wait(100);}await click('下一节运动','[data-motion-lessons] button');await wait(1000);}
}
await click('地球所见','[data-occultation-views=panel] button');await click('连续播放','[data-motion-lessons] button');
const closeStage=async index=>{await guide();await run(`document.querySelectorAll('.stage-guide article')[${index}].querySelector('input').click()`);await run("document.querySelector('[aria-label=关闭阶段导览]').click()");await wait(500);};
await closeStage(0);await assert("!document.querySelector('[data-motion-current]')",'stage01 closes course');await assert("document.querySelector('.home-time').innerText.includes('播放时间')",'stage01 pauses clock');
await closeStage(0);await assert("!document.querySelector('[data-motion-current]')",'stage01 reopen does not resurrect course');
await click('4 · 月相变化','[data-motion-lessons] button');await click('连续播放','[data-motion-lessons] button');await closeStage(3);
await assert("!document.querySelector('[data-motion-current]')&&document.querySelector('.home-time').innerText.includes('播放时间')",'stage04 closes and pauses');await closeStage(3);await assert("!document.querySelector('[data-motion-current]')",'stage04 reopen stays exited');
await click('准卫星 · 日心视角','[data-coorbital-module] button');await wait(700);await click('连续播放','[data-motion-lessons] button');await closeStage(2);await assert("!document.querySelector('[data-motion-current]')&&document.querySelector('.home-time').innerText.includes('播放时间')",'stage03 closes and pauses');await closeStage(2);
await click('进入木卫一遮掩案例','[data-motion-lessons] button');await wait(800);await click('连续播放','[data-motion-lessons] button');await click('退出运动课并恢复全景','[data-motion-lessons] button');await assert("!document.querySelector('[data-motion-current]')&&document.querySelector('.home-time').innerText.includes('播放时间')",'exit restores panorama and pauses');
await click('进入木卫一遮掩案例','[data-motion-lessons] button');await wait(800);await run("document.querySelector('[data-motion-current]').scrollIntoView({block:'start'})");await shot('r06-integration');
if(errors.length)throw Error(JSON.stringify(errors));console.log('14 lessons + stage01/03/04 lifecycle PASS; runtime errors 0');
}finally{ws.close();}
