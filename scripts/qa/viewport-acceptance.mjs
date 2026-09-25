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
const rows=[];
const measure=()=>run("(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {width:r.width,height:r.height,top:r.top,bottom:r.bottom}};return {viewport:[innerWidth,innerHeight],canvas:rect('.macro-stage'),info:rect('.macro-info-scroll'),aside:rect('.macro-info'),body:[document.documentElement.scrollWidth,document.documentElement.scrollHeight]}})()");
try{
 await call('Page.reload',{ignoreCache:true});await wait(2500);await click('1 · 地球自转','[data-motion-lessons] button');
 for(const [w,h] of [[1280,720],[1024,768],[390,844]]){
  await call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:false});await wait(600);await click('本节讲解','[data-motion-quick] button');
  const m=await measure();rows.push(m);console.log(JSON.stringify(m));
  await assert('document.documentElement.scrollWidth<=innerWidth','no horizontal overflow '+w);
  await assert("document.querySelector('.macro-info-scroll').clientHeight>=150&&document.querySelector('.macro-info').clientHeight<=innerHeight",'bounded readable panel '+w);
  await assert("document.activeElement.hasAttribute('data-motion-current')",'explanation focus '+w);
  await assert("(()=>{const a=document.activeElement.getBoundingClientRect(),b=document.querySelector('.macro-info-scroll').getBoundingClientRect();return a.top>=b.top-1&&a.bottom<=b.bottom&&a.bottom<innerHeight})()",'explanation actually visible '+w);
  await shot('viewport-after-'+w);
  if(w===390){
   await run("document.querySelector('.macro-info-scroll').scrollTop+=250");
   await assert("document.querySelector('.macro-info-scroll').scrollTop>200",'narrow panel scrolls internally');
   await run("document.querySelector('.observation-path>details').open=true");await wait(200);
   await assert("document.querySelector('.observation-path-popover').clientHeight<400",'expanded learning route bounded');
   await run("document.querySelector('.observation-path>details').open=false");await wait(200);
   await assert("document.querySelector('.macro-info').getBoundingClientRect().height===380",'closing route restores bounded panel');
  }
 }
 await call('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});await wait(300);await click('本节讲解','[data-motion-quick] button');
 const date=await run("document.querySelector('.home-time input').value");await shot('interaction-before-drag');
 const p=await run("(()=>{const r=document.querySelector('.macro-canvas canvas').getBoundingClientRect();return {x:r.x+r.width*.55,y:r.y+r.height*.65}})()");
 await call('Input.dispatchMouseEvent',{type:'mousePressed',x:p.x,y:p.y,button:'left',clickCount:1});
 for(let i=1;i<=12;i++){await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x+i*9,y:p.y+i*3,button:'left',buttons:1});await wait(16);}
 await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.x+108,y:p.y+36,button:'left',clickCount:1});await wait(700);await shot('interaction-after-drag');
 await assert(`document.querySelector('.home-time input').value===${JSON.stringify(date)}`,'camera drag preserves date');
 await click('播放','[data-motion-quick] button');await wait(1200);await click('暂停','[data-motion-quick] button');
 const paused=await run("document.querySelector('.home-time input').value");await assert(`${JSON.stringify(paused)}!==${JSON.stringify(date)}`,'playing advances date');await wait(600);await assert(`document.querySelector('.home-time input').value===${JSON.stringify(paused)}`,'pause holds date');
 await click('来源','.macro-panel-tabs button');await click('本节讲解','[data-motion-quick] button');await assert("document.activeElement.hasAttribute('data-motion-current')",'source tab back to explanation');
 await click('返回全景','[data-motion-quick] button');await click('现在','.home-time button');
 if(errors.length)throw Error(JSON.stringify(errors));fs.writeFileSync('.cache/viewport-acceptance.json',JSON.stringify({rows,errors},null,2));console.log('VIEWPORT INTERACTION PASS');
}finally{await call('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});ws.close();}
