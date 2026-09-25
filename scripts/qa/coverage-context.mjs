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



const ready=async expr=>{for(let i=0;i<150;i++){if(await run(expr))return;await wait(100);}throw Error('Timeout '+expr)};

try{
 await call('Runtime.enable');await call('Page.reload',{ignoreCache:true});await ready("!!document.querySelector('.home-time input')?.value");
 if(await run("document.querySelector('.home-time').innerText.includes('暂停时间')"))await click('暂停时间','.home-time button');
 const date=await run("document.querySelector('.home-time input').value");
 await click('更多工具','.macro-header summary');await click('整体规划','.macro-header button');await ready("!!document.querySelector('.master-plan-tabs')");await click('元素覆盖','.master-plan-tabs button');
 for(const id of ['E17','E18','E19','E20']){
  const label=await run(`[...document.querySelectorAll('[data-coverage=${id}] button')].find(b=>b.textContent.includes('查看现有')).textContent.trim()`);await click(label,`[data-coverage=${id}] button`);await wait(1300);
  const panel=id==='E17'?'[data-motion-lessons]':id==='E18'?'[data-star-panel]':'.macro-learning-detail';
  if(id!=='E20')await assert(`document.activeElement.matches('${panel}')`,id+' explanation focus');
  await assert(`document.querySelector('.home-time input').value===${JSON.stringify(date)}`,id+' entry date');
  await shot('c02-context-'+id+'-after');
  if(id==='E17'){
   await click('1 · 地球自转','[data-motion-lessons] button');await ready("!!document.querySelector('[data-motion-quick] button[aria-label=播放本节运动]:not(:disabled)')");
   await click('播放','[data-motion-quick] button');await wait(1100);await click('暂停','[data-motion-quick] button');
   await assert(`document.querySelector('.home-time input').value!==${JSON.stringify(date)}`,'rotation playback advances date');await shot('c02-earth-spin');
   await click('重置本节日期','[data-motion-lessons] button');await wait(800);await assert(`document.querySelector('.home-time input').value===${JSON.stringify(date)}`,'reset lesson date');
  }
  if(id==='E18'){
   await ready("!!document.querySelector('.stellar-guide button:not(:disabled)')");
   await run("document.querySelectorAll('.stellar-guide button')[1].click()");await wait(500);
   const star=await run("document.querySelector('[data-star-readout] h4').textContent");await shot('c02-neighbor-distance');
   await run("document.querySelectorAll('.stellar-guide button')[2].click()");await wait(500);
   await assert(`document.querySelector('[data-star-readout] h4').textContent===${JSON.stringify(star)}`,'same star in distance and sky views');
   await assert("document.querySelector('[data-star-panel]').textContent.includes('2,936')||document.querySelector('[data-star-panel]').textContent.includes('2936')",'bright star catalogue');await shot('c02-star-sky');
   await click('空间中的邻星','[data-star-panel] button');await assert("document.querySelector('[data-star-panel]').textContent.includes('32 个')",'32 distance samples');
  }
  if(id==='E19'){
   await run("[...document.querySelectorAll('button.macro-zone')].find(b=>b.textContent.includes('银河系之外')).click()");await wait(650);
   await assert("document.querySelector('.macro-learning-detail').textContent.includes('非实测星图')",'galaxies identified as model');await shot('c02-other-galaxies');
   await click('返回太阳系结构');await assert("!!document.querySelector('.macro-canvas canvas')",'return to solar canvas');
  }
  if(id==='E20'){
   await ready("!!document.querySelector('.historical-visitor input:not(:disabled)')");
   const historical=await run("document.querySelector('.historical-visitor footer strong').textContent");
   await click('播放历史 · 5 天/秒','.historical-visitor button');await wait(850);await click('暂停历史播放','.historical-visitor button');
   await assert(`document.querySelector('.historical-visitor footer strong').textContent!==${JSON.stringify(historical)}`,'historical time advances');
   await click('侧视','.historical-visitor button');await shot('c02-visitor-side');
   await click('2019-12-08 · 近日点日期','.historical-visitor button');await assert(`document.querySelector('.historical-visitor footer strong').textContent===${JSON.stringify(historical)}`,'historical reset');
   await click('返回原全景','.historical-visitor button');await assert("!document.querySelector('.historical-visitor')",'history closes');
  }
  await assert(`document.querySelector('.home-time input').value===${JSON.stringify(date)}`,id+' original date preserved');
  await click('返回整体规划','.macro-header button');await ready(`!!document.querySelector('[data-coverage=${id}]')`);
 }
 if(errors.length)throw Error(JSON.stringify(errors));console.log('CONTEXT COVERAGE PASS');
}finally{ws.close()}
