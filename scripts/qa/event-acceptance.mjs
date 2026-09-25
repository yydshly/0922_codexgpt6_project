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


await call('Runtime.enable');await call('Page.reload',{ignoreCache:true});await wait(2500);
const ready=async()=>{for(let i=0;i<100;i++){if(await run("!!document.querySelector('[data-motion-quick] [aria-label=播放本节运动]')&&!document.querySelector('[data-motion-quick] [aria-label=播放本节运动]').disabled"))return;await wait(100);}throw Error('data not ready');};
const date=()=>run("document.querySelector('.home-time input').value");
const fill=async value=>{await run(`(()=>{const input=document.querySelector('.home-time input');input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()`);await wait(150);};
const canvasShot=async name=>{const clip=await run("(()=>{const r=document.querySelector('.macro-canvas canvas').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1}})()");fs.writeFileSync('.cache/'+name+'.png',Buffer.from((await call('Page.captureScreenshot',{format:'png',clip})).data,'base64'));};
const imageDifference=async(a,b)=>{
 const urls=[a,b].map(name=>'data:image/png;base64,'+fs.readFileSync('.cache/'+name+'.png').toString('base64'));
 return run(`(async()=>{const images=await Promise.all(${JSON.stringify(urls)}.map(url=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=url;})));const [a,b]=images;if(a.width!==b.width||a.height!==b.height)throw Error('image dimensions differ');const c=new OffscreenCanvas(a.width,a.height),ctx=c.getContext('2d');ctx.drawImage(a,0,0);const x=ctx.getImageData(0,0,a.width,a.height).data;ctx.clearRect(0,0,a.width,a.height);ctx.drawImage(b,0,0);const y=ctx.getImageData(0,0,b.width,b.height).data;let changed=0;for(let i=0;i<x.length;i+=4)if(Math.max(Math.abs(x[i]-y[i]),Math.abs(x[i+1]-y[i+1]),Math.abs(x[i+2]-y[i+2]))>8)changed++;return changed/(a.width*a.height);})()`);
};
try{
 await click('1 · 地球自转','[data-motion-lessons] button');await ready();const before=await date();
 await run("document.querySelector('.home-time input').focus()");await click('播放','[data-motion-quick] button');await wait(900);await click('暂停','[data-motion-quick] button');
 await assert(`document.querySelector('.home-time input').value!==${JSON.stringify(before)}&&document.querySelector('.macro-stage-label').textContent.includes(document.querySelector('.home-time input').value.replace('T',' '))`,'focus without edit cannot freeze displayed time');
 await fill('2026-07-01T12:00:00');await assert("!!document.querySelector('.home-time-draft')",'edited date marked unapplied');
 await click('播放','[data-motion-quick] button');await wait(500);await click('暂停','[data-motion-quick] button');await assert("document.querySelector('.home-time input').value.startsWith('2026-07-01T12:00')",'unsaved draft preserved during playback');
 await click('取消日期修改','.home-time button');await assert("!document.querySelector('.home-time-draft')&&document.querySelector('.macro-stage-label').textContent.includes(document.querySelector('.home-time input').value.replace('T',' '))",'cancel restores live time');
 await fill('2026-07-01T12:00:00');await click('应用日期','.home-time button');await ready();await assert("document.querySelector('.macro-stage-label').textContent.includes('2026-07-01 12:00:00')&&!document.querySelector('.home-time-draft')",'apply seeks scene and clears draft');
 const applied=await date();await fill('2028-01-02T00:00:00');await click('应用日期','.home-time button');await assert("!!document.querySelector('.home-time [role=alert]')&&document.querySelector('.macro-stage-label').textContent.includes('2026-07-01 12:00:00')",'out-of-range date rejected without changing scene');await click('取消日期修改','.home-time button');
 await click('进入 2026-03-03 月全食','[data-motion-lessons] button');await ready();await assert("document.querySelector('[data-lunar-eclipse=inset] [data-eclipse-stage]').textContent.includes('月全食')",'lunar lesson and main readout agree');await shot('event-accept-lunar');
 await click('进入 2026-08-12 日全食','[data-motion-lessons] button');await ready();await assert("document.querySelector('[data-solar-eclipse=inset] [data-solar-stage]').textContent.includes('全食条件')&&document.querySelector('.home-time input').value.startsWith('2026-08-13')",'solar case uses next-day Beijing date');await shot('event-accept-solar');
 await click('进入木卫一遮掩案例','[data-motion-lessons] button');await ready();await canvasShot('event-camera-default');
 const r=await run("(()=>{const r=document.querySelector('.macro-canvas canvas').getBoundingClientRect();return {x:r.x+r.width*.45,y:r.y+r.height*.65}})()");
 await call('Input.dispatchMouseEvent',{type:'mousePressed',x:r.x,y:r.y,button:'left',clickCount:1});for(let i=1;i<=10;i++)await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:r.x+i*12,y:r.y+i*3,button:'left',buttons:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:r.x+120,y:r.y+30,button:'left',clickCount:1});await wait(700);await canvasShot('event-camera-saved');const savedDate=await date();
 await click('1 · 地球自转','[data-motion-lessons] button');await ready();await click('← 后退','.observation-path button');await ready();await wait(700);await assert(`document.querySelector('.home-time input').value===${JSON.stringify(savedDate)}&&document.querySelector('[data-occultation-views=panel] button[aria-pressed=true]').textContent==='三维空间'`,'history restores space mode without reversing time');await canvasShot('event-camera-restored');
 const camera={dragChangedFraction:await imageDifference('event-camera-default','event-camera-saved'),restoredChangedFraction:await imageDifference('event-camera-saved','event-camera-restored')};if(camera.dragChangedFraction<.01||camera.restoredChangedFraction>.002)throw Error('camera not restored: '+JSON.stringify(camera));fs.writeFileSync('.cache/event-camera-comparison.json',JSON.stringify(camera,null,2));console.log('PASS restored dragged camera',camera);
 await click('地球所见','[data-occultation-views=panel] button');await click('完全遮住','[data-occultation-jumps] button');await assert("document.querySelector('[data-occultation=inset] [data-occultation-stage]').textContent==='木卫一完全被遮住'",'occultation jump updates main view judgment');await shot('event-accept-occultation');
 await click('完全露出','[data-occultation-jumps] button');await assert("document.querySelector('[data-occultation=inset] [data-occultation-stage]').textContent==='两视圆分离'",'reappearance removes occultation judgment');
 await click('现在','.home-time button');await wait(700);await assert("!document.querySelector('[data-occultation-stage]')&&document.querySelector('[data-motion-quick] [aria-label=播放本节运动]').disabled&&document.querySelector('.home-time button').disabled",'out-of-case time hides old values and blocks both players');await shot('event-accept-outside');
 await click('重置本节日期','[data-motion-lessons] button');await ready();await assert("!!document.querySelector('[data-occultation-stage]')",'reset restores valid event');
 await click('返回全景','[data-motion-quick] button');await click('现在','.home-time button');
 if(errors.length)throw Error(JSON.stringify(errors));console.log('EVENT DATE AND HISTORY ACCEPTANCE PASS');
}finally{ws.close();}
