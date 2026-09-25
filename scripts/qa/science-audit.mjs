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


await call('Runtime.enable');await call('Network.enable');await call('Page.navigate',{url:'http://127.0.0.1:4180/'});await wait(2200);
try{
 await click('数据与实现','.macro-header button');await wait(400);
 await assert("document.querySelector('.science-audit').textContent.includes('49,657')&&document.querySelector('.science-audit').textContent.includes('78.37')",'fresh core interpolation displayed');
 await assert("document.querySelectorAll('.science-audit:not(.phenomena-audit) .science-audit-package').length===10",'ten data groups shown');
 await assert("document.querySelector('.science-audit-scope').textContent.includes('53')&&document.querySelector('.science-audit-scope').textContent.includes('27')&&document.querySelector('.science-audit-scope').textContent.includes('10')",'observation and physics counts separated');
 await assert("document.querySelector('.science-audit').textContent.includes('本轮未重算所有留出点')&&document.querySelector('.science-audit').textContent.includes('2019-09-01')",'scope and historical range explicit');
 const url=await run("document.querySelector('.science-audit a[download]').href");const report=await(await fetch(url)).json();if(report.counts.chunks!==313||!report.passed)throw Error('download mismatch');
 await click('查看本轮科学核验 ↓');await assert("document.querySelector('.science-audit').getBoundingClientRect().top<300",'jump reveals report');await shot('r09-science-desktop');
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await wait(250);await assert('document.documentElement.scrollWidth<=innerWidth','mobile no page overflow');await assert("document.querySelector('.data-journey-dialog').scrollWidth<=document.querySelector('.data-journey-dialog').clientWidth",'mobile dialog no overflow');await shot('r09-science-mobile');
 await run("document.querySelector('[aria-label=关闭数据与实现]').click()");await call('Network.setCacheDisabled',{cacheDisabled:true});await call('Network.setBlockedURLs',{urls:['*science-audit.json*']});await click('数据与实现','.macro-header button');await wait(300);
 await assert("!!document.querySelector('.science-audit [role=alert]')&&!document.querySelector('.science-audit:not(.phenomena-audit) .science-audit-results')",'failure cannot display passed state');await call('Network.setBlockedURLs',{urls:[]});await click('重试科学核验报告');await wait(400);await assert("!!document.querySelector('.science-audit:not(.phenomena-audit) .science-audit-results')&&!document.querySelector('.science-audit [role=alert]')",'retry restores report');
 await run("document.querySelector('[aria-label=关闭数据与实现]').click()");await assert("!!document.querySelector('.macro-canvas canvas')",'return panorama');
 if(errors.length)throw Error(JSON.stringify(errors));console.log('SCIENCE AUDIT UI PASS');
}finally{await call('Network.setBlockedURLs',{urls:[]});await call('Network.setCacheDisabled',{cacheDisabled:false});await call('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});ws.close();}
