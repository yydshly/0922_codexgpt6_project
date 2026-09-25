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



const ready=async expr=>{for(let i=0;i<180;i++){if(await run(expr))return;await wait(150);}throw Error('Timeout '+expr)};
const jump=async value=>{await run(`(()=>{const s=document.querySelector('.macro-contents-nav select');if(![...s.options].some(o=>o.value===${JSON.stringify(value)}))throw Error('Missing directory');s.value=${JSON.stringify(value)};s.dispatchEvent(new Event('change',{bubbles:true}))})()`);await wait(250)};
const check=async(selector,label)=>{await run(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(selector+' label')})].find(e=>e.textContent.trim()===${JSON.stringify(label)})?.querySelector('input');if(!e||e.disabled)throw Error('Unavailable checkbox');e.scrollIntoView({block:'nearest'});e.focus();e.click()})()`);await wait(350)};
const report=async name=>{console.log(name,await run("JSON.stringify({target:document.querySelector('.macro-current-target').innerText,focus:document.activeElement.outerHTML.slice(0,160)})"));await shot(name)};
try{
await call('Runtime.enable');await call('Page.reload',{ignoreCache:true});await ready("!!document.querySelector('[data-eros-shape] button:not(:disabled)')");
if(await run("document.querySelector('.home-time').innerText.includes('暂停时间')"))await click('暂停时间','.home-time button');
const date=await run("document.querySelector('.home-time input').value");
await jump('eros-shape');await click('定位爱神星形状','[data-eros-shape] button');await wait(700);await report('s01-eros-shape');
await check('[data-eros-shape]','显示资料形状（关闭后看同体积球）');await assert("document.querySelector('[data-eros-shape] [role=status]').textContent.includes('同体积球')",'sphere mode status');await report('s01-eros-sphere');
await check('[data-eros-shape]','显示资料形状（关闭后看同体积球）');await check('[data-eros-shape]','查看三角网格');await report('s01-eros-grid');await check('[data-eros-shape]','查看三角网格');
await click('对照分离双体：帕特罗克洛斯','[data-eros-shape] button');await wait(700);await report('s01-binary');
await click('伴星 · Menoetius','[data-patroclus-system] button');await assert("document.querySelector('[data-patroclus-system] button[aria-pressed=true]').textContent.includes('Menoetius')",'binary selection');
await check('[data-patroclus-system]','显示伴星 Menoetius');await assert("document.querySelector('[data-patroclus-system] button[aria-pressed=true]').textContent.includes('Patroclus')",'hidden companion resets selection');await check('[data-patroclus-system]','显示伴星 Menoetius');
await click('后 6 小时','[data-patroclus-system] button');await ready("!document.querySelector('[data-patroclus-system] button').disabled");await wait(600);await assert(`document.querySelector('.home-time input').value!==${JSON.stringify(date)}`,'binary time changes');await click('前 6 小时','[data-patroclus-system] button');await wait(500);
await jump('coorbital-module');await click('准卫星 · 日心视角','[data-coorbital-module] button');await wait(850);await report('s02-heliocentric');
await click('准卫星 · 地心旋转视角','[data-coorbital-module] button');await wait(850);await report('s02-rotating');await assert(`document.querySelector('.home-time input').value===${JSON.stringify(date)}`,'coorbital switch date unchanged');
await jump('members');await click('海王星外：四类轨道怎么区分？','.outer-orbit-guide summary');
console.log('OUTER CONTROLS',await run("[...document.querySelectorAll('.outer-orbit-guide button')].map(b=>b.textContent)"));
for(const name of ['定位冥王星','定位夸奥尔','定位塞德娜']){await click(name,'.outer-orbit-guide button');await wait(700);await report('s02-'+({'定位冥王星':'pluto','定位夸奥尔':'quaoar','定位塞德娜':'sedna'}[name]));}
await jump('solar');await click('定位太阳活动','[data-panorama-phenomenon=solar] button');for(const title of ['1 · 光球','2 · 色球','3 · 过渡区','4 · 日冕','5 · 黑子与日珥']){await click(title,'[data-solar-layers] button');await wait(600);await assert(`document.querySelector('[data-solar-layers] button[aria-pressed=true]').textContent===${JSON.stringify(title)}`,'solar step '+title);await report('s03-layer-'+title[0]);}
await click('对照耀斑与 CME','[data-solar-layers] button');await wait(650);await report('s03-activity');
await check('[data-panorama-phenomenon=solar]','CME 物质云团');await assert(`!document.querySelector('[aria-label="CME 物质云团"]').checked`,'CME off');await check('[data-panorama-phenomenon=solar]','CME 物质云团');
await jump('enceladus');await assert("!document.querySelector('[data-enceladus] button[aria-pressed=true]')",'inactive surface not selected');await click('1 · 表面与喷流','[data-enceladus] button');await wait(650);await assert("!document.querySelector('[data-solar-layers] button[aria-pressed=true]')",'solar selection cleared outside sun');await report('s04-surface');
await click('2 · 打开内部剖示','[data-enceladus] button');await wait(650);await report('s04-interior');
for(const layer of ['浅色：冰壳','蓝色：地下海洋','棕色：岩石核心'])await check('[data-enceladus]',layer);
await assert("document.querySelector('[data-enceladus]').textContent.includes('内部各层已关闭')",'empty interior explained');await assert("!document.querySelector('[data-enceladus] button[aria-pressed=true]')",'empty cutaway not selected');await report('s04-empty');
await click('2 · 打开内部剖示','[data-enceladus] button');await click('3 · 返回土星系统','[data-enceladus] button');await wait(650);await assert("!document.querySelector('[data-enceladus] button[aria-pressed=true]')",'parent view not selected as cutaway');await assert("document.querySelector('[data-enceladus-view]').textContent.includes('未进入')",'saved settings explained');await report('s04-parent');
await jump('material-journey');await click('6 · 补给 E 环','[data-material-journey] button');await wait(650);await report('s04-ering');
await jump('space-medium');for(const title of ['1 · 行星际磁场','2 · 日球电流片','3 · 光与电磁辐射','4 · 带电粒子','5 · 中性原子']){await click(title,'[data-space-medium] button');await wait(650);await assert(`document.querySelector('[data-space-medium] button[aria-pressed=true]').textContent===${JSON.stringify(title)}`,'medium step '+title);await report('s05-medium-'+title[0]);}
await click('关闭解释并返回全景','[data-space-medium] button');await assert("!document.querySelector('[data-space-medium] button[aria-pressed=true]')",'medium exits');await assert(`document.querySelector('.home-time input').value===${JSON.stringify(date)}`,'all illustrative controls preserve date');
if(errors.length)throw Error(JSON.stringify(errors));console.log('SUPPLEMENT COVERAGE PASS');
}finally{ws.close()}
