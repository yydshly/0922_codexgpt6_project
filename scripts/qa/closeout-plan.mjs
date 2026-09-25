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

const ready=async expr=>{for(let i=0;i<150;i++){if(await run(expr))return;await wait(100);}throw Error('Timeout '+expr);};
const legacyRecord=await run("localStorage.getItem('orbit-baseline-review')");
const open=async()=>{await click('整体规划','.macro-header button');await ready("!!document.querySelector('[data-closeout]')");};
await call('Runtime.enable');
try {
 await call('Page.reload',{ignoreCache:true});await wait(800);await ready("!!document.querySelector('.home-time input')?.value");await open();
 await assert("document.querySelectorAll('[data-closeout-step]').length===5 && document.querySelectorAll('[data-finding]').length===4 && document.querySelectorAll('[data-audit-id]').length===25",'five work packages, four open items, 25 audit rows');
 await assert("document.querySelector('[data-closeout]').textContent.includes('逐类画面复验仍待完成')",'does not claim fresh visual acceptance');
 const href=await run("document.querySelector('[data-closeout]>a').href");
 const download=await(await fetch(href)).text();if(!download.includes('F01')||!download.includes('S05'))throw Error('Incomplete download');console.log('PASS downloadable plan includes gaps and all additions');
 await shot('closeout-desktop');
 await run("document.querySelector('[data-audit-id=E18]').open=true");await click('查看 E18 的现有入口与范围');
 await assert("document.activeElement.dataset.coverage==='E18'",'audit row focuses corresponding topic');
 await click('查看现有星表 ↗','[data-coverage=E18] button');await wait(1400);
 console.log('RETURN BUTTONS',await run("[...document.querySelectorAll('button')].filter(b=>b.textContent.includes('返回')).map(b=>b.textContent.trim())"));
 await click('返回整体规划');await ready("!!document.querySelector('[data-coverage=E18]')");
 for(const label of ['我的验收记录','总路线','数据与实现','验收与后续','收尾进度']){await click(label,'.master-plan-tabs button');await assert("!['真实恒星目录仍待导入','下一批 R01','补项本身尚未计为实现'].some(s=>document.querySelector('.master-plan').textContent.includes(s))",label+' has current progress wording');}
 await assert(`localStorage.getItem('orbit-baseline-review')===${JSON.stringify(legacyRecord)}`,'opening new baseline preserves old record');
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await wait(700);
 await assert("document.documentElement.scrollWidth<=innerWidth+1",'narrow viewport has no page horizontal overflow');
 await assert("[...document.querySelectorAll('[data-closeout-step]')].every(e=>e.getBoundingClientRect().right<=innerWidth+1)",'work packages fit narrow screen');await shot('closeout-narrow');
 if(errors.length)throw Error(JSON.stringify(errors));console.log('CLOSEOUT PLAN ACCEPTANCE PASS');
}finally {await call('Emulation.clearDeviceMetricsOverride');ws.close();}
