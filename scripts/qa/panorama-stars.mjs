import * as THREE from 'three';
import fs from 'node:fs';
const target=(await(await fetch(`http://127.0.0.1:${process.env.CDP_PORT??9224}/json`)).json()).find(t=>t.type==='page'&&t.url.includes('127.0.0.1:4180'));
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),errors=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);});
const call=(method,params={})=>new Promise((resolve,reject)=>{setTimeout(()=>reject(Error('CDP timeout '+method)),20000).unref();pending.set(++id,m=>m.error?reject(m.error):resolve(m.result));ws.send(JSON.stringify({id,method,params}));});
const run=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const click=async(text,selector='button')=>{console.log('CONTROL',await run(`[...document.querySelectorAll(${JSON.stringify(selector)})].filter(b=>b.textContent.trim()===${JSON.stringify(text)}).map(b=>({text:b.textContent.trim(),disabled:b.disabled,visible:!!b.getClientRects().length}))`));await run(`(()=>{const b=[...document.querySelectorAll(${JSON.stringify(selector)})].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b||b.disabled||!b.getClientRects().length)throw Error('Unavailable '+${JSON.stringify(text)});b.focus();b.click()})()`);await wait(500);};
const assert=async(expression,label)=>{if(!await run(expression))throw Error(label);console.log('PASS',label);};
const shot=async name=>fs.writeFileSync('.cache/'+name+'.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));



const ready=async expression=>{for(let i=0;i<200;i++){if(await run(expression))return;await wait(150);}throw Error('Timeout '+expression)};
try{
 await call('Runtime.enable');await call('Page.reload',{ignoreCache:true});await ready("document.querySelector('.macro-canvas')?.dataset.backgroundStars==='2936'");await wait(800);
 await click('暂停时间','.home-time button');const date=await run("document.querySelector('.home-time input').value");await shot('f01-panorama');
 const rect=await run("(()=>{const r=document.querySelector('.macro-canvas canvas').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})()");
 const camera=new THREE.PerspectiveCamera(44,rect.width/rect.height,.02,200);camera.position.set(62*.56,62*.58,62*.63);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const stars=JSON.parse(fs.readFileSync('public/data/stars/hip2-subset.json','utf8')).sky;
 const eps=84381.448*Math.PI/648000;
 const projected=stars.map(s=>{const x=Math.cos(s.dec)*Math.cos(s.ra),y=Math.cos(s.dec)*Math.sin(s.ra),z=Math.sin(s.dec);const p=new THREE.Vector3(x,z*Math.cos(eps)-y*Math.sin(eps),-y*Math.cos(eps)-z*Math.sin(eps)).multiplyScalar(180).add(camera.position).project(camera);return {hip:s.hip,hp:s.hp,x:(p.x+1)/2*rect.width,y:(1-p.y)/2*rect.height,z:p.z}}).filter(p=>p.z<1&&p.z> -1&&p.x>20&&p.x<rect.width*.22&&p.y>rect.height*.36&&p.y<rect.height*.65).sort((a,b)=>a.hp-b.hp);
 const p=projected[0];if(!p)throw Error('No visible reference star');console.log('PICK',p);
 for(const type of ['mousePressed','mouseReleased'])await call('Input.dispatchMouseEvent',{type,x:rect.x+p.x,y:rect.y+p.y,button:'left',clickCount:1});
 await ready("!!document.querySelector('[data-background-star-readout]')");await assert(`document.querySelector('[data-background-star-readout]').textContent.includes('HIP ${p.hip}')`,'clicked background identity matches projected catalogue direction');await shot('f01-selected');
 await run("document.querySelector('[data-panorama-stars] input').click()");await ready("document.querySelector('.macro-canvas').dataset.backgroundStars==='0'");await shot('f01-hidden');
 await run("document.querySelector('[data-panorama-stars] input').click()");await ready("document.querySelector('.macro-canvas').dataset.backgroundStars==='2936'");
 await click('在恒星视图查看此星','[data-background-star-readout] button');await ready("!!document.querySelector('[data-star-readout]')");await assert(`document.querySelector('[data-star-readout]').textContent.includes('HIP ${p.hip}')`,'same identity in independent catalogue view');await shot('f01-same-star');
 await click('太阳系 · 区域与成员','.macro-scope-tabs button');await click('全景现象','.macro-panel-tabs button');await click('1 · 地球自转','[data-motion-lessons] button');await ready("document.querySelector('.macro-canvas').dataset.backgroundStars==='0'");
 await click('返回全景','[data-motion-quick] button');await ready("document.querySelector('.macro-canvas').dataset.backgroundStars==='2936'");
 await assert(`document.querySelector('.home-time input').value===${JSON.stringify(date)}`,'view and background controls preserve date');
 await call('Network.enable');await call('Network.setCacheDisabled',{cacheDisabled:true});
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Fetch.requestPaused')call('Fetch.failRequest',{requestId:m.params.requestId,errorReason:'Failed'}).catch(()=>{});});
 await call('Fetch.enable',{patterns:[{urlPattern:'*data/stars/hip2-subset.json*',requestStage:'Request'}]});await call('Page.reload',{ignoreCache:true});await ready("document.querySelector('[data-star-background-button]')?.textContent.includes('未加载')");
 await click('星表未加载 · 重试','[data-star-background-button]');await assert("document.querySelector('.macro-canvas').dataset.backgroundStars==='0'",'failure leaves no random replacement');await shot('f01-failure');
 await call('Fetch.disable');await click('重试背景星表','[data-panorama-stars] button');await ready("document.querySelector('.macro-canvas').dataset.backgroundStars==='2936'");await shot('f01-recovered');await call('Network.setCacheDisabled',{cacheDisabled:false});
 if(errors.length)throw Error(JSON.stringify(errors));console.log('PANORAMA STARS PASS');
}finally{await call('Fetch.disable').catch(()=>{});ws.close()}
