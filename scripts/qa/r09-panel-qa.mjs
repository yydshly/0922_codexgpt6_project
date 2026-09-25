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

await call('Runtime.enable');await call('Page.navigate',{url:'http://127.0.0.1:4180/'});await wait(2200);
try{
 await assert('!window.__observatoryDiagnostics','normal page has no diagnostics');
 await click('恒星系统与其他星系');await wait(700);await run("document.querySelectorAll('.stellar-guide button')[2].click()");await wait(500);
 await assert("document.querySelectorAll('[aria-label=选择恒星] option').length<=82",'bounded sky dropdown');
 const data=JSON.parse(fs.readFileSync('public/data/stars/hip2-subset.json','utf8'));const late=data.sky.at(-1).hip;
 await run(`(()=>{document.querySelector('.stellar-browse').open=true;const i=document.querySelector('.stellar-browse input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'${late}');i.dispatchEvent(new Event('input',{bubbles:true}));})()`);await wait(250);
 await assert(`!!document.querySelector('[aria-label=选择恒星] option[value="${late}"]')`,'search reaches beyond first 80');
 await run(`(()=>{const s=document.querySelector('[aria-label=选择恒星]');s.value='${late}';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);await wait(300);
 await run("(()=>{const i=document.querySelector('.stellar-browse input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'');i.dispatchEvent(new Event('input',{bubbles:true}));})()");await wait(200);
 await assert(`document.querySelector('[aria-label=选择恒星]').value==='${late}'`,'selected late record remains pinned after clearing search');
 await assert("document.querySelector('[data-star-validation]').textContent.includes('1.986')",'cross-check result and limit available');
 await run("document.querySelectorAll('.stellar-guide button')[1].click()");await wait(500);await assert("document.querySelector('[aria-label=选择恒星]').value==='16537'",'guide recovers selection');
 await shot('r09-stars-checked');
 if(errors.length)throw Error(JSON.stringify(errors));console.log('R09 PANEL PASS');
}finally{ws.close();}
