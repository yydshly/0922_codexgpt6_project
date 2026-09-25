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
try{
await call('Runtime.enable');await call('Page.reload',{ignoreCache:true});await wait(1000);await ready("!!document.querySelector('.home-time input')?.value");
if(await run("document.querySelector('.home-time').innerText.includes('暂停时间')"))await click('暂停时间','.home-time button');
const date=await run("document.querySelector('.home-time input').value");
await click('更多工具','.macro-header summary');await click('整体规划','.macro-header button');await ready("!!document.querySelector('.master-plan-tabs')");await click('元素覆盖','.master-plan-tabs button');
for(const [id,title] of [['E01','太阳活动'],['E02','地球本体'],['E03','地月系统'],['E04','土星卫星系统'],['E05','矮行星'],['E06','小行星主带']]){
 console.log('TOPIC',await run(`document.querySelector('[data-coverage=${id}]').innerText.slice(0,120)`));
 await click('查看现有入口 ↗',`[data-coverage=${id}] button`);await ready(`document.querySelector('.observation-path')?.innerText.includes(${JSON.stringify(title)})`);await wait(1600);
 await assert(`document.querySelector('.home-time input').value===${JSON.stringify(date)}`,id+' retains observation date');
 await shot('c02-'+id+'-after');console.log('SCENE',await run("document.querySelector('.observation-path').innerText"));
 console.log('VISIBLE PANEL',await run("(()=>{const r=document.querySelector('.macro-info-scroll').getBoundingClientRect();return [...document.querySelectorAll('.macro-info-scroll h2,.macro-info-scroll h3')].filter(e=>{const b=e.getBoundingClientRect();return b.bottom>r.top&&b.top<r.bottom}).map(e=>e.textContent)})()"));

 if(id==='E01'){
  for(const lesson of ['1 · 光球','2 · 色球','3 · 过渡区','4 · 日冕','5 · 黑子与日珥']){await click(lesson,'[data-solar-layers] button');await assert(`document.querySelector('[data-solar-layers] [role=status]').textContent.includes(${JSON.stringify(lesson)})`,'solar layer '+lesson);}
  await shot('c02-solar-layers');
 }
 if(id==='E02'){
  await assert("[...document.querySelectorAll('.family-world-labels button')].every(e=>getComputedStyle(e).visibility!=='visible')",'single Earth excludes satellite labels');
  for(const name of ['水星','金星','地球','火星','木星','土星','天王星','海王星']){await click('定位'+name,'.panorama-primary button');await ready(`document.querySelector('.panorama-primary-detail h3')?.textContent.startsWith(${JSON.stringify(name)})`);await assert(`document.querySelector('.observation-path').innerText.includes(${JSON.stringify(name+'本体')})`,'planet '+name+' identity and parameters');}
 }
 if(id==='E03'){
  await click('月球','.panorama-moon-list button');await assert("document.querySelector('.panorama-moon-parameters').innerText.includes('地球中心')",'moon parameter reference is Earth');
  for(const name of ['火星','木星','土星','天王星','海王星']){await click('定位'+name+'系统','[aria-label="全景卫星与环系"] button');await ready(`document.querySelector('.panorama-family-detail strong')?.textContent.includes(${JSON.stringify(name+'系统')})`);await assert(`document.querySelector('.observation-path').innerText.includes(${JSON.stringify(name+'卫星系统')})`,'family '+name+' scene/description agreement');}
 }
 if(id==='E04'){
  const toggle="[...document.querySelectorAll('.panorama-family-toggles label')].find(e=>e.textContent==='显示行星环').querySelector('input')";
  console.log('RING CONTROL',await run(`(${toggle}).checked`));await run(`(${toggle}).click()`);await wait(500);await assert(`!(${toggle}).checked`,'rings switch off');await shot('c02-rings-off');await run(`(${toggle}).click()`);await wait(500);await assert(`(${toggle}).checked`,'rings switch on');
 }
 if(id==='E05'){
  await click('查看 5 个区域成员','.region-members button');console.log('DWARFS',await run("[...document.querySelectorAll('.region-member-list button')].map(e=>e.innerText)"));
  for(const name of ['谷神星','冥王星','妊神星','鸟神星','阋神星']){
   await run(`(()=>{const b=[...document.querySelectorAll('.region-member-list button')].find(e=>e.querySelector('span')?.firstChild?.textContent===${JSON.stringify(name)});if(!b)throw Error('member missing');b.click()})()`);await wait(500);
   await assert(`document.querySelector('.observation-path').innerText.includes(${JSON.stringify(name)}) && document.querySelector('.region-member-detail').getAttribute('aria-label')===${JSON.stringify(name+'的区域与参数')}`,'dwarf '+name+' target/parameters');
   const collapsed=await run("document.querySelector('.region-member-list-toggle')?.getAttribute('aria-expanded')==='false'");if(collapsed)await run("document.querySelector('.region-member-list-toggle').click()");
  }
 }
 if(id==='E06'){
  await click('侧视','.macro-depth-controls button');await wait(700);await shot('c02-belt-side');
  console.log('BELT MEMBERS',await run("[...document.querySelectorAll('.region-member-list button')].map(e=>e.innerText)"));
  await run("[...document.querySelectorAll('.region-member-list button')].find(e=>e.textContent.includes('灶神星')).click()");await wait(700);await assert("document.querySelector('.observation-path').innerText.includes('灶神星') && document.querySelector('.region-member-detail').getAttribute('aria-label')==='灶神星的区域与参数'",'belt member focus');await shot('c02-vesta');
 }
 await assert(`document.querySelector('.home-time input').value===${JSON.stringify(date)}`,id+' controls preserve date');
 await click('返回整体规划','.macro-header button');await ready(`!!document.querySelector('[data-coverage=${id}]')`);
}
if(errors.length)throw Error(JSON.stringify(errors));console.log('C02 SIX ENTRY CHECKS PASS');
}finally{ws.close()}
