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

const results=[];
try{
 await call('Runtime.enable');await call('Page.reload',{ignoreCache:true});await wait(1200);await ready("!!document.querySelector('.home-time input')?.value");
 if(await run("document.querySelector('.home-time').innerText.includes('暂停时间')"))await click('暂停时间','.home-time button');
 const date=await run("document.querySelector('.home-time input').value");
 await click('更多工具','.macro-header summary');await click('整体规划','.macro-header button');await ready("!!document.querySelector('.master-plan-tabs')");await click('元素覆盖','.master-plan-tabs button');
 for(const [id,title] of [['E13','奥尔特云'],['E14','尘埃'],['E15','日球层'],['E16','地球']]){
  await click(id==='E07'?'查看现有分类 ↗':'查看现有入口 ↗',`[data-coverage=${id}] button`);await ready(`!!document.querySelector('.observation-path')`);await wait(1200);
  const info=await run("(()=>{const r=document.querySelector('.macro-info-scroll').getBoundingClientRect();return {title:document.querySelector('.observation-path').innerText,visible:[...document.querySelectorAll('.macro-info-scroll h2,.macro-info-scroll h3')].filter(e=>{const b=e.getBoundingClientRect();return b.bottom>r.top&&b.top<r.bottom}).map(e=>e.textContent),detail:document.querySelector('.macro-info-scroll')?.innerText,focus:document.activeElement.outerHTML.slice(0,250)}})()");results.push({id,...info});console.log(id,info.title,info.visible,info.focus);
  await assert(`document.querySelector('.home-time input').value===${JSON.stringify(date)}`,id+' unchanged date');const panel=id==='E13'||id==='E15'?'[data-boundary-comparison]':id==='E14'?'[data-material-journey]':'[data-environment-journey]';
  await assert(`document.activeElement.matches('${panel}')`,id+' explanation focus');
  await assert(`!!document.querySelector('${panel} button[aria-pressed=true]')`,id+' matching step selected');
  await shot('c02-environment-'+id+'-after');
  if(id==='E13'){
   for(const [label,name] of [['1 · 太阳风边界','日球层'],['2 · 遥远冰质天体','奥尔特云'],['3 · 放在同一空间','边界对照']]){
    await click(label,panel+' button');await assert(`document.querySelector('${panel} h4').innerText.includes(${JSON.stringify(name)})`,'boundary '+name);
   }
   await shot('c02-boundaries-together');
  }
  if(id==='E14'){
   for(const label of ['1 · 彗星代表','2 · 碎屑分布','3 · 进入大气','4 · 尘埃与光','5 · 土卫二喷流','6 · 补给 E 环']){
    await ready(`[...document.querySelectorAll('${panel} button')].some(b=>b.textContent.trim()===${JSON.stringify(label)}&&!b.disabled)`);
    await click(label,panel+' button');await assert(`document.querySelector('${panel} button[aria-pressed=true]').textContent.trim()===${JSON.stringify(label)}`,'material '+label);
    if(label.startsWith('3')){
     await shot('c02-meteor');await click('播放流星示例',panel+' button');const progress=await run(`document.querySelector('${panel} input[type=range]').value`);await wait(700);
     await assert(`document.querySelector('${panel} input[type=range]').value!==${JSON.stringify(progress)}`,'meteor demo advances');await click('暂停流星示例',panel+' button');
     await assert(`document.querySelector('.home-time input').value===${JSON.stringify(date)}`,'meteor does not change date');
    }
   }
   await shot('c02-e-ring');
  }
  if(id==='E15'){
   await run(`document.querySelector('[data-space-medium]').scrollIntoView({block:'start'})`);await wait(200);
   for(const label of ['1 · 行星际磁场','2 · 日球电流片','3 · 光与电磁辐射','4 · 带电粒子','5 · 中性原子']){
    await click(label,'[data-space-medium] button');await assert(`document.querySelector('[data-space-medium] button[aria-pressed=true]').textContent.trim()===${JSON.stringify(label)}`,'medium '+label);
    if(label.startsWith('4'))await shot('c02-charged-particles');
   }
  }
  if(id==='E16'){
   for(const label of ['1 · 太阳与活动','2 · 太阳风','3 · 磁层响应','4 · 极光','5 · 木星磁层','6 · 木卫一供给','7 · 木星极光']){
    await ready(`[...document.querySelectorAll('${panel} button')].some(b=>b.textContent.trim()===${JSON.stringify(label)}&&!b.disabled)`);
    await click(label,panel+' button');await assert(`document.querySelector('${panel} button[aria-pressed=true]').textContent.trim()===${JSON.stringify(label)}`,'environment '+label);
    if(label.startsWith('4'))await shot('c02-earth-aurora');
   }
   await shot('c02-jupiter-aurora');
   await run(`document.querySelector('[data-panorama-phenomenon=environment] input[aria-label=木星极光示意]').click()`);await wait(300);
   await assert(`!document.querySelector('${panel} button[aria-pressed=true]')`,'manual change clears lesson selection');
  }
  await assert(`document.querySelector('.home-time input').value===${JSON.stringify(date)}`,id+' interaction date preserved');
  await click('返回整体规划','.macro-header button');await ready(`!!document.querySelector('[data-coverage=${id}]')`);
 }
 await click('查看现有入口 ↗','[data-coverage=E13] button');await ready("!!document.querySelector('.macro-header')?.getClientRects().length");
await click('更多工具','.macro-header summary');await click('阶段导览','.macro-header button');
await ready("document.querySelectorAll('.stage-guide article').length===9");
await run("document.querySelectorAll('.stage-guide article input')[8].click()");await click('关闭','.stage-guide button');
await click('更多工具','.macro-header summary');await click('整体规划','.macro-header button');await ready("!!document.querySelector('.master-plan-tabs')");await click('元素覆盖','.master-plan-tabs button');
await click('查看现有入口 ↗','[data-coverage=E13] button');await wait(1700);
await assert("document.activeElement.matches('.macro-learning-detail')",'structure-only entry focuses basic explanation');await shot('c02-oort-stage-fallback');
await click('更多工具','.macro-header summary');await click('阶段导览','.macro-header button');
await ready("document.querySelectorAll('.stage-guide article').length===9");await assert("!document.querySelectorAll('.stage-guide article input')[8].checked",'entry does not silently enable stage 09');
await click('恢复全部阶段','.stage-guide button');await click('关闭','.stage-guide button');

 fs.writeFileSync('.cache/c02-environment-after.json',JSON.stringify(results,null,2));if(errors.length)throw Error(JSON.stringify(errors));
}finally{ws.close()}
