import fs from 'node:fs';
import path from 'node:path';
const out='docs/qa/exploration-report-2026-10-01';fs.mkdirSync(`${out}/downloads`,{recursive:true});
const tab=await(await fetch('http://127.0.0.1:9333/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),errors=[],checks=[],downloads=[];
ws.addEventListener('message',event=>{const d=JSON.parse(event.data);if(d.id){pending.get(d.id)?.(d);pending.delete(d.id);}else if(d.method==='Runtime.exceptionThrown'||d.method==='Log.entryAdded'&&d.params.entry.level==='error')errors.push(d.params);else if(d.method==='Browser.downloadWillBegin')downloads.push(d.params);});
const call=(method,params={})=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(method+' timeout')),30000);pending.set(++id,d=>{clearTimeout(timer);d.error?reject(Error(JSON.stringify(d.error))):resolve(d.result);});ws.send(JSON.stringify({id,method,params}));});
const run=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const until=async expression=>{for(let i=0;i<1000;i++){if(await run(expression))return;await wait(200);}throw Error('Timeout '+expression);};
const click=async selector=>{const result=await run(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.disabled)return false;e.click();return true;})()`);if(!result)throw Error('Missing '+selector);await wait(180);};
const capture=async name=>{const data=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`${out}/${name}.png`,Buffer.from(data.data,'base64'));};
const check=(condition,name)=>{checks.push({name,passed:!!condition});if(!condition)throw Error(name);console.log('PASS '+name);};
const telemetry=()=>run(`({time:document.querySelectorAll('.exploration-stats dd')[0].textContent,travel:document.querySelectorAll('.exploration-telemetry b')[1].textContent,fuel:document.querySelectorAll('.exploration-telemetry b')[2].textContent})`);
const reportText=()=>run('document.querySelector(".exploration-report").textContent');
const download=async format=>{
 const before=new Set(fs.readdirSync(`${out}/downloads`));await click(format==='json'?'.exploration-report-json':'.exploration-report-download');
 for(let i=0;i<100;i++){const file=fs.readdirSync(`${out}/downloads`).find(f=>f.endsWith('.'+format)&&!before.has(f));if(file)return fs.readFileSync(`${out}/downloads/${file}`,'utf8');await wait(100);}throw Error('Download missing '+format);
};
await call('Runtime.enable');await call('Log.enable');await call('Page.enable');
await call('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:path.resolve(`${out}/downloads`),eventsEnabled:true});
await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
try {
 await call('Page.navigate',{url:'http://127.0.0.1:4180/'});await until('!!document.querySelector(".macro-flight-entry")');await click('.macro-flight-entry');await until('!!document.querySelector(".exploration-open-report")');await wait(700);
 await click('.exploration-open-report');await until('document.querySelector(".exploration-report").open');await wait(250);
 const frozen=await telemetry();await wait(800);
 check(JSON.stringify(frozen)===JSON.stringify(await telemetry())&&await run('document.querySelector(".exploration-pause").textContent==="继续"'),'opening a voyage report pauses real time, movement and fuel');
 check((await reportText()).includes('巡视尚未完成')&&await run('document.querySelectorAll(".exploration-report-stations>li[data-arrived=false]").length===6'),'initial report has six pending stops and never claims completion');
 await capture('01-partial-report');
 const json=JSON.parse(await download('json')),md=await download('md');
 check(json.progress==='in-progress'&&json.totals.arrivedCount===0&&json.units.time==='s'&&json.stations.length===6,'downloaded JSON parses normally and carries units, actual progress and all six stations');
 check(md.charCodeAt(0)===0xFEFF&&md.includes('巡视尚未完成')&&md.includes('不能导入恢复飞行')&&!md.includes('�'),'downloaded Chinese text preserves UTF-8 content and labels the report as a non-restorable snapshot');
 await click('.exploration-pause');await wait(600);const reportTime=await run('document.querySelector(".exploration-report-time").textContent');
 await click('.exploration-report-stations li:first-child summary');await wait(500);
 check(await run('document.querySelector(".exploration-pause").textContent==="暂停"')&&await run('document.querySelector(".exploration-report-time").textContent')===reportTime,'opening a chapter inside a stale report neither pauses current flight nor rewrites its snapshot');
 await click('.exploration-open-report');await wait(250);
 check(await run('document.querySelector(".exploration-pause").textContent==="继续"')&&parseFloat((await telemetry()).time)>parseFloat(frozen.time),'explicitly reopening the report captures newer flight data and pauses again');
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await wait(400);await capture('02-narrow-report');
 check(await run('document.querySelector(".free-exploration").scrollWidth<=390&&[...document.querySelectorAll(".flight-env-header button")].every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=390})'),'narrow screen keeps header and report actions within the viewport');
 await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await click('.exploration-report>summary');const closed=await telemetry();await wait(600);
 check(JSON.stringify(closed)===JSON.stringify(await telemetry()),'closing the report alone leaves flight paused');
 await click('.exploration-header-actions button:last-child');await click('.exploration-open-report');
 check(await run('!!document.querySelector(".exploration-panel")&&document.querySelector(".exploration-report").open'),'report header entry restores a hidden navigation panel');
 await click('.exploration-report-resume');await until('!!document.querySelector(".exploration-observation[data-id=satellite]")');
 for(let i=1;i<=3;i++)await click(`.exploration-part-list button:nth-child(${i})`);await click('.exploration-save-note button');
 await click('.exploration-open-report');
 const saved=JSON.parse(await download('json'));
 check(saved.totals.arrivedCount===1&&saved.totals.noteCount===1&&saved.stations[0].openedParts.length===3&&saved.stations[0].note!==null&&saved.progress==='in-progress','actual satellite arrival, opened parts and an explicit saved note are separately reported');await capture('03-first-station-record');
 await click('.exploration-report-resume');await wait(700);
 check(await run('document.querySelector(".exploration-observation").dataset.id==="satellite"&&document.querySelector(".exploration-observation").dataset.staying==="true"'),'ending report reading preserves the intentional satellite observation stop');
 for(const next of ['stage','station','view','rock','home']){
  await click('.exploration-continue');await until(`!!document.querySelector('.exploration-observation[data-id=${next}]')`);
  check(await run(`!!document.querySelector('.exploration-destination[data-id=${next}]').textContent.includes('已访问')`),'actual continuous flight reaches '+next);console.log('ARRIVAL '+next);
 }
 await click('.exploration-open-report');const completed=JSON.parse(await download('json'));
 check(completed.progress==='completed'&&completed.totals.arrivedCount===6&&completed.arrivals.length===6&&completed.completion.time===completed.arrivals[5].time,'a completed six-stop report comes from actual stop confirmations and the final home arrival');
 check(completed.totals.noteCount===1&&completed.completion.fuelRemaining<100&&await run('document.querySelectorAll(".exploration-report-stations>li[data-saved=true]").length===1'),'automatic tour completion does not invent saved notes or refill fuel');await capture('04-completed-voyage');
 fs.writeFileSync(`${out}/completed-report.json`,JSON.stringify(completed,null,2));
 await click('.exploration-report-resume');await click('.exploration-destination[data-id=satellite]');await click('.exploration-depart');await wait(1200);
 check(await run('!!document.querySelector(".exploration-completed-report")&&document.querySelector(".exploration-current-chapter").dataset.id==="satellite"'),'completed voyage remains accessible after departing again');
 await click('.exploration-completed-report');const after=JSON.parse(await download('json'));
 check(JSON.stringify(after.completion)===JSON.stringify(completed.completion)&&after.totals.time>completed.totals.time&&after.current.targetId==='satellite','original completion milestone stays fixed while a new report captures continued flight');
 await click('.free-exploration header>button:first-child');await until('!!document.querySelector(".macro-flight-entry")');await click('.macro-flight-entry');await until('!!document.querySelector(".exploration-open-report")');await click('.exploration-open-report');
 check(await run('!document.querySelector(".exploration-completed-report")&&document.querySelectorAll(".exploration-report-stations>li[data-arrived=false]").length===6'),'re-entering starts a new voyage and clears the previous completion and report');
 check(errors.length===0,'no runtime or console errors during report reading, downloads, all six stops or new voyage');
} catch(error){fs.writeFileSync(`${out}/failure.txt`,String(error));throw error;}
finally {fs.writeFileSync(`${out}/checks.json`,JSON.stringify({checks,errors,downloads},null,2));ws.close();}
