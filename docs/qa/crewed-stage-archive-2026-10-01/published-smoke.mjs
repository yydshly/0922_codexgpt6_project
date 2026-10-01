// Run against a separate QA browser: node <this-file> <url> <debug-port>.
import fs from 'node:fs';
const url=process.argv[2]??'https://yydshly.github.io/0922_codexgpt6_project/',port=Number(process.argv[3]??9337),out='.cache/crewed-stage-published';
fs.mkdirSync(out,{recursive:true});
const tab=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let seq=0;const pending=new Map(),checks=[],errors=[];
ws.addEventListener('message',e=>{const d=JSON.parse(e.data);if(d.id){pending.get(d.id)?.(d);pending.delete(d.id);}else if(d.method==='Runtime.exceptionThrown'||d.method==='Log.entryAdded'&&d.params.entry.level==='error')errors.push(d.params);});
const call=(method,params={})=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(method+' timeout')),30000);pending.set(++seq,d=>{clearTimeout(timer);d.error?reject(Error(JSON.stringify(d.error))):resolve(d.result);});ws.send(JSON.stringify({id:seq,method,params}));});
const run=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const until=async expression=>{for(let i=0;i<600;i++){if(await run(expression))return;await sleep(100);}throw Error('UI timeout '+expression);};
const check=(value,name)=>{checks.push({name,passed:!!value});console.log((value?'PASS ':'FAIL ')+name);if(!value)throw Error(name);};
const click=selector=>run(`document.querySelector(${JSON.stringify(selector)}).click()`);
const shot=async name=>{const r=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`${out}/${name}.png`,Buffer.from(r.data,'base64'));};
try{
 await call('Runtime.enable');await call('Log.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await call('Page.navigate',{url});await until('!!document.querySelector(".macro-flight-entry")');check(true,'published panorama exposes the crewed mission');await click('.macro-flight-entry');
 await until('document.querySelector(".crew-canvas")?.dataset.phase==="ground"');check(await run('!!document.querySelector(".crew-start-demo")&&!!document.querySelector("[data-pilot-start]")'),'both the complete demo and self-directed route are published');
 check(await run('document.querySelector("[data-pilot-start]").disabled'),'self-directed ignition requires the three ground checks');await run('document.querySelectorAll(".crew-checks input").forEach(i=>i.click())');await until('!document.querySelector("[data-pilot-start]").disabled');await click('[data-pilot-start]');
 await until('document.querySelector(".crew-canvas").dataset.pendingAction==="ignite"');check(await run('document.querySelector(".crew-canvas").dataset.pilotRoute==="self-directed"'),'published worker starts the self-directed route');
 check(await run('document.querySelector(".crew-playback-readout").dataset.adoptedRate==="0"'),'ignition checkpoint freezes the simulation clock');await shot('published-ground');
 await click('[data-pilot-action="ignite"]');await until('document.querySelector(".crew-canvas").dataset.phase==="countdown"');check(await run('document.querySelector(".crew-propulsion-state").dataset.propulsionState==="ignition-wait"'),'early countdown waits for computed thrust');
 await until('document.querySelector(".crew-canvas").dataset.pendingAction==="release"');check(await run('!document.querySelector("[data-pilot-action=release]").disabled'),'computed buildup unlocks release at the actual checkpoint');await click('[data-pilot-action="release"]');
 await until('document.querySelector(".crew-canvas").dataset.phase==="ascent"');await click('[data-pilot-takeover]');await until('document.querySelector(".crew-canvas").dataset.controlMode==="manual"');
 check(await run('document.querySelector(".crew-playback-readout").dataset.adoptedRate==="1"'),'published manual control adopts 1x');await shot('published-manual-launch');
 await click('.crew-pause');await until('document.querySelector(".crew-playback-readout").dataset.adoptedRate==="0"');check(true,'pause freezes the published worker without ending the route');
 check(errors.length===0,'no runtime or resource errors during published entry and ignition');
}finally{fs.writeFileSync(`${out}/smoke.json`,JSON.stringify({url,checks,errors,renderer:'isolated headless software rendering; not a hardware performance measurement'},null,2)+'\n','utf8');ws.close();}
