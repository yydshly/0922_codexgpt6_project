import fs from 'node:fs';
const target=(await(await fetch(`http://127.0.0.1:${process.env.CDP_PORT??9224}/json`)).json()).find(t=>t.type==='page'&&t.url.includes('127.0.0.1:4180'));
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),errors=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);});
const call=(method,params={})=>new Promise((resolve,reject)=>{setTimeout(()=>reject(Error('CDP timeout '+method)),20000).unref();pending.set(++id,m=>m.error?reject(m.error):resolve(m.result));ws.send(JSON.stringify({id,method,params}));});
const run=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const click=async(text,selector='button')=>{console.log('CONTROL',await run(`[...document.querySelectorAll(${JSON.stringify(selector)})].filter(b=>b.textContent.trim()===${JSON.stringify(text)}).map(b=>({text:b.textContent.trim(),disabled:b.disabled,visible:!!b.getClientRects().length}))`));await run(`(()=>{const b=[...document.querySelectorAll(${JSON.stringify(selector)})].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b)throw Error('Missing '+${JSON.stringify(text)});b.focus();b.click()})()`);await wait(500);};
const assert=async(expression,label)=>{if(!await run(expression))throw Error(label);console.log('PASS',label);};
const shot=async name=>fs.writeFileSync('.cache/'+name+'.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));



const ready=async expr=>{for(let i=0;i<150;i++){if(await run(expr))return;await wait(100);}throw Error('Timeout '+expr)};

const results=[];
try{
 await call('Runtime.enable');await call('Page.reload',{ignoreCache:true});await wait(1200);await ready("!!document.querySelector('.home-time input')?.value");
 if(await run("document.querySelector('.home-time').innerText.includes('暂停时间')"))await click('暂停时间','.home-time button');
 const date=await run("document.querySelector('.home-time input').value");
 await click('更多工具','.macro-header summary');await click('整体规划','.macro-header button');await ready("!!document.querySelector('.master-plan-tabs')");await click('元素覆盖','.master-plan-tabs button');
 for(const [id,title] of [['E07','爱神星'],['E08','阿喀琉斯'],['E09','女凯龙星'],['E10','夸奥尔'],['E11','塞德娜'],['E12','海尔—波普']]){
  await click(id==='E07'?'查看现有分类 ↗':'查看现有入口 ↗',`[data-coverage=${id}] button`);await ready(`document.querySelector('.observation-path')?.innerText.includes(${JSON.stringify(title)})`);await wait(1200);
  const info=await run("(()=>{const r=document.querySelector('.macro-info-scroll').getBoundingClientRect();return {title:document.querySelector('.observation-path').innerText,visible:[...document.querySelectorAll('.macro-info-scroll h2,.macro-info-scroll h3')].filter(e=>{const b=e.getBoundingClientRect();return b.bottom>r.top&&b.top<r.bottom}).map(e=>e.textContent),detail:document.querySelector('.region-member-detail')?.innerText??document.querySelector('.comet-panel')?.innerText,focus:document.activeElement.outerHTML.slice(0,250)}})()");results.push({id,...info});console.log('ENTRY',id,info.title.split('\n')[0]);
  await assert(`document.querySelector('.home-time input').value===${JSON.stringify(date)}`,id+' unchanged date');await assert(`document.activeElement.matches('${id==='E12'?'.comet-panel':'.region-member-detail'}')`,id+' explanation receives focus');
  await shot('c02-outer-'+id+'-after');
  if(id==='E07'){
   await click('定位爱神星形状');
   await run(`document.querySelector('[data-eros-shape] input').click()`);await wait(350);await shot('c02-eros-sphere');
   await assert(`!document.querySelector('[data-eros-shape] input').checked && document.querySelectorAll('[data-eros-shape] input')[1].disabled`,'sphere disables shape wireframe');
   await run(`document.querySelector('[data-eros-shape] input').click()`);await wait(350);
  }
  if(id==='E08'){
   await run(`document.querySelector('.region-member-list-toggle').click()`);await wait(200);
   console.log('MEMBERS',await run(`[...document.querySelectorAll('.region-member-list button')].map(b=>b.innerText)`));
   await run(`(()=>{const b=[...document.querySelectorAll('.region-member-list button')].find(b=>b.textContent.includes('埃涅阿斯'));if(!b)throw Error('L5 missing');b.click()})()`);await wait(600);
   await assert(`document.querySelector('.region-member-detail').innerText.includes('L5') && document.querySelector('.region-member-detail').innerText.includes('当前距木星中心')`,'L5 member and Jupiter reference');await shot('c02-trojan-l5');
  }
  if(id==='E09'){
   await click('定位女凯龙星双环');
   await run(`document.querySelectorAll('[data-small-rings] input')[0].click();document.querySelectorAll('[data-small-rings] input')[1].click()`);await wait(400);await shot('c02-chariklo-rings-off');
   await assert(`[...document.querySelectorAll('[data-small-rings] input')].slice(0,2).every(i=>!i.checked)`,'both ring controls off');
   await run(`document.querySelectorAll('[data-small-rings] input')[0].click();document.querySelectorAll('[data-small-rings] input')[1].click()`);await wait(350);
  }
  if(id==='E10'||id==='E11')await assert(`document.querySelector('.region-member-detail').innerText.includes('不使用单一半径')`,'size boundary visible '+id);
  if(id==='E12'){
   for(const name of ['哈雷彗星','67P 彗星','海尔—波普彗星']){
    await click('定位'+name,'.comet-panel button');await assert(`document.querySelector('.comet-panel .panorama-family-detail strong').textContent.includes(${JSON.stringify(name)})`,'comet target '+name);
   }
   const metrics=await run(`document.querySelector('.comet-panel .panorama-family-detail dl').innerText`);
   await click('后 30 天','.comet-panel button');await wait(1800);
   await assert(`document.querySelector('.home-time input').value!==${JSON.stringify(date)} && document.querySelector('.comet-panel .panorama-family-detail dl').innerText!==${JSON.stringify(metrics)}`,'shared date and comet metrics advance');
   await click('前 30 天','.comet-panel button');await wait(1800);await assert(`document.querySelector('.home-time input').value===${JSON.stringify(date)}`,'restore date exactly');
   const before=await run(`[...document.querySelectorAll('.comet-panel .panorama-family-toggles input')].map(i=>i.checked)`);
   for(let j=0;j<3;j++){
    await run(`document.querySelectorAll('.comet-panel .panorama-family-toggles input')[${j}].click()`);await wait(100);
    const after=await run(`[...document.querySelectorAll('.comet-panel .panorama-family-toggles input')].map(i=>i.checked)`);
    if(after.some((v,k)=>v!==(k===j?!before[k]:before[k])))throw Error('coupled comet switches');
    await run(`document.querySelectorAll('.comet-panel .panorama-family-toggles input')[${j}].click()`);await wait(100);
   }
   console.log('PASS independent comet switches');
  }
  await click('返回整体规划','.macro-header button');await ready(`!!document.querySelector('[data-coverage=${id}]')`);
 }
 fs.writeFileSync('.cache/c02-outer-after.json',JSON.stringify(results,null,2));if(errors.length)throw Error(JSON.stringify(errors));
}finally{ws.close()}
