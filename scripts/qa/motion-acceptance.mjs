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


await call('Runtime.enable');
const ready=async()=>{for(let i=0;i<100;i++){if(await run("![...document.querySelectorAll('[data-motion-lessons] button')].find(b=>b.textContent==='连续播放')?.disabled"))return;await wait(100);}throw Error('lesson data timeout');};
try{
 const canvasHeight=await run("document.querySelector('.macro-canvas canvas').getBoundingClientRect().height");
 await click('1 · 地球自转','[data-motion-lessons] button');await ready();
 const date=await run("document.querySelector('.home-time input').value");
 await assert("!!document.querySelector('[data-motion-quick] [aria-label=播放本节运动]')",'shortcut enters paused');
 await click('前进 ¼ 自转周期','[data-motion-lessons] button');
 await assert(`document.querySelector('.home-time input').value!==${JSON.stringify(date)}`,'quarter rotation advances date');
 await click('本节讲解','[data-motion-quick] button');await assert("document.activeElement.hasAttribute('data-motion-current')",'explanation moves keyboard focus');await shot('acceptance-fixed-earth');
 await run("document.querySelector('.macro-info-scroll').scrollTop=100000");
 await assert("(()=>{const r=document.querySelector('[data-motion-quick]').getBoundingClientRect();return r.top>0&&r.bottom<innerHeight})()",'shortcut stays visible after long explanation');
 await assert(`document.querySelector('.macro-canvas canvas').getBoundingClientRect().height===${canvasHeight}`,'fixed controls do not shrink main canvas');
 await click('2 · 月球案例','[data-motion-lessons] button');await ready();await shot('acceptance-fixed-moon');
 const moonDate=await run("document.querySelector('.home-time input').value");
 const rect=await run("(()=>{const r=document.querySelector('.macro-canvas canvas').getBoundingClientRect();return {x:r.x+r.width*.4,y:r.y+r.height*.6}})()");
 await call('Input.dispatchMouseEvent',{type:'mousePressed',x:rect.x,y:rect.y,button:'left',clickCount:1});
 for(let i=1;i<=8;i++)await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:rect.x+i*9,y:rect.y+i*4,button:'left',buttons:1});
 await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:rect.x+72,y:rect.y+32,button:'left',clickCount:1});await wait(500);
 await assert(`document.querySelector('.home-time input').value===${JSON.stringify(moonDate)}`,'dragging 3D view leaves observation time fixed');await shot('acceptance-fixed-moon-drag');
 await click('4 · 木星卫星轨道共振','[data-motion-lessons] button');await ready();
 await click('播放','[data-motion-quick] button');await wait(900);await assert("document.querySelector('[data-motion-playback] strong').textContent==='正在连续运动'",'shortcut and detailed player agree');
 await click('暂停','[data-motion-quick] button');const paused=await run("document.querySelector('.home-time input').value");await wait(350);await assert(`document.querySelector('.home-time input').value===${JSON.stringify(paused)}`,'pause stops date');await assert(`document.querySelector('.home-time input').value!==${JSON.stringify(moonDate)}`,'continuous playback advanced time');await shot('acceptance-fixed-jupiter');
 await click('来源','.macro-panel-tabs button');await assert("!!document.querySelector('[data-motion-quick]')",'controls persist on source tab');await click('本节讲解','[data-motion-quick] button');await assert("document.querySelector('.macro-panel-tabs [aria-pressed=true]').textContent==='全景现象'&&document.activeElement.hasAttribute('data-motion-current')",'jump restores relevant tab and focus');
 await click('返回全景','[data-motion-quick] button');await assert("!document.querySelector('[data-motion-quick]')&&!document.querySelector('[data-motion-current]')&&document.querySelector('.home-time').textContent.includes('播放时间')",'exit clears lesson and pauses');await assert(`document.querySelector('.home-time input').value===${JSON.stringify(paused)}`,'return preserves observed date');await assert("document.activeElement.classList.contains('macro-current-target')",'return focus remains in active scene');await shot('acceptance-fixed-return');
 await click('← 后退','.observation-path button');await assert("document.querySelector('[data-motion-current]')?.textContent.includes('轨道共振')&&!!document.querySelector('[data-motion-quick]')",'back restores course shortcut');
 await click('1 · 锁定原理','[data-motion-lessons] button');await assert("!document.querySelector('[data-motion-quick] [aria-label=播放本节运动]')",'qualitative mechanism does not offer physical replay');
 await click('进入 2026-03-03 月全食','[data-motion-lessons] button');await ready();await click('+4 小时','[data-eclipse-jumps] button');await wait(700);await assert("document.querySelector('[data-motion-quick] [aria-label=播放本节运动]').disabled&&[...document.querySelectorAll('[data-motion-lessons] button')].find(b=>b.textContent==='连续播放').disabled",'both players stop at event endpoint');
 await click('重置本节日期','[data-motion-lessons] button');await ready();await click('2 · 月球案例','[data-motion-lessons] button');await ready();
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await wait(300);await run("document.querySelector('[data-motion-quick]').scrollIntoView({block:'center'})");
 await assert('document.documentElement.scrollWidth<=innerWidth','mobile no horizontal overflow');await assert("document.querySelector('.macro-info-scroll').getBoundingClientRect().height>80",'mobile retains readable explanation area');await shot('acceptance-fixed-mobile');
 await click('返回全景','[data-motion-quick] button');
 if(errors.length)throw Error(JSON.stringify(errors));console.log('MOTION ACCEPTANCE PASS');
}finally{await call('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});ws.close();}
