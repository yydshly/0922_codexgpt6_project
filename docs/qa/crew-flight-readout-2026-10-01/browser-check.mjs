import fs from 'node:fs';
const out='docs/qa/crew-flight-readout-2026-10-01';fs.mkdirSync(out,{recursive:true});
const previous=await(await fetch('http://127.0.0.1:9334/json/list')).json();
for(const page of previous.filter(p=>p.url.startsWith('http://127.0.0.1:4180/')))await fetch(`http://127.0.0.1:9334/json/close/${page.id}`);
const tab=await(await fetch('http://127.0.0.1:9334/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),checks=[],errors=[],warnings=[];
ws.addEventListener('message',e=>{const d=JSON.parse(e.data);if(d.id){pending.get(d.id)?.(d);pending.delete(d.id);}else if(d.method==='Runtime.exceptionThrown'||d.method==='Log.entryAdded'&&d.params.entry.level==='error')errors.push(d.params);else if(d.method==='Log.entryAdded'&&d.params.entry.level==='warning')warnings.push(d.params.entry.text);});
const call=(method,params={})=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(method+' timeout')),30000);pending.set(++id,d=>{clearTimeout(timer);d.error?reject(Error(JSON.stringify(d.error))):resolve(d.result);});ws.send(JSON.stringify({id,method,params}));});
const run=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const until=async expression=>{for(let i=0;i<1000;i++){if(await run(expression))return;await sleep(100);}throw Error('UI timeout '+expression);};
const check=(passed,name)=>{checks.push({name,passed:!!passed});console.log((passed?'PASS ':'FAIL ')+name);if(!passed)throw Error(name);};
const data=()=>run('({...document.querySelector(".crew-canvas").dataset})');
const shot=async name=>{await sleep(250);const r=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`${out}/${name}.png`,Buffer.from(r.data,'base64'));};
const click=selector=>run(`document.querySelector(${JSON.stringify(selector)}).click()`);
const action=async name=>{await until(`!!document.querySelector('[data-pilot-action="${name}"]')&&!document.querySelector('[data-pilot-action="${name}"]').disabled`);await click(`[data-pilot-action="${name}"]`);};
const restore=async name=>{
 const save=fs.readFileSync(`.cache/crew-pilot-fixtures/${name}.json`,'utf8'),parsed=JSON.parse(save);
 await run(`localStorage.setItem('orbit.crewed-earth.v1',${JSON.stringify(save)});document.querySelector('.crew-save').open=true;document.querySelector('.crew-save button:nth-child(2)').click()`);
 await until(`document.querySelector('.crew-canvas').dataset.phase===${JSON.stringify(parsed.state.phase)}&&Math.abs(Number(document.querySelector('.crew-canvas').dataset.time)-(${parsed.state.time}))<.001`);
 await run('document.querySelector(".crew-save").open=false;document.querySelector(".crew-dismiss-notice")?.click();document.querySelector(".crew-side").scrollTop=0');return parsed;
};
const captureSave=async()=>{
 await run('document.querySelector(".crew-save").open=true;document.querySelector(".crew-save button").click()');
 await until('document.querySelector(".crew-dismiss-notice")?.parentElement.textContent.includes("已保存")');
 const saved=JSON.parse(await run('localStorage.getItem("orbit.crewed-earth.v1")'));
 await run('document.querySelector(".crew-save").open=false;document.querySelector(".crew-dismiss-notice")?.click()');return saved;
};
const heldKey=async(code,key,ms=200)=>{
 const start=Number((await data()).time);await run('document.querySelector(".crew-stage").focus()');await call('Input.dispatchKeyEvent',{type:'keyDown',code,key});
 await until('document.querySelector(".crew-key-hint").dataset.keyboardFocused==="true"');
 await until(`document.querySelector('[data-flight-key="${code}"]').getAttribute('aria-pressed')==='true'`);
 check(await run(`document.querySelector('.crew-input-feedback').dataset.heldKeys.includes(${JSON.stringify(code)})`),code+': actual keyboard input is visible in the operation card');
 await until(`Number(document.querySelector('.crew-canvas').dataset.time)>${start+ms/1000}`);await call('Input.dispatchKeyEvent',{type:'keyUp',code,key});
 await until(`document.querySelector('[data-flight-key="${code}"]').getAttribute('aria-pressed')==='false'`);
 check(await run(`!document.querySelector('.crew-input-feedback').dataset.heldKeys.includes(${JSON.stringify(code)})`),code+': key release clears the visual input state');
};
try{
 await call('Runtime.enable');await call('Log.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await call('Page.navigate',{url:'http://127.0.0.1:4180/'});await until('!!document.querySelector(".macro-flight-entry")');
 const seed=fs.readFileSync('.cache/crew-pilot-fixtures/checkpoint-ignite.json','utf8');await run(`localStorage.setItem('orbit.crewed-earth.v1',${JSON.stringify(seed)});document.querySelector('.macro-flight-entry').click()`);
 await until('document.querySelector(".crew-canvas")?.dataset.phase==="ground"');
 check(await run('document.querySelector("[data-pilot-start]").disabled'),'new route requires actual ground checks');
 await run('document.querySelectorAll(".crew-checks input").forEach(i=>i.click())');await until('!document.querySelector("[data-pilot-start]").disabled');await click('[data-pilot-start]');
 await until('document.querySelector(".crew-canvas").dataset.pendingAction==="ignite"');
 check((await data()).pilotRoute==='self-directed','ground entry starts the autonomous route, not the demo');
 const waiting=(await data()).time;await sleep(500);check((await data()).time===waiting,'waiting for ignition freezes the same simulation clock');check(await run('document.querySelector("[data-phase-goal]").textContent.includes("地球")&&document.querySelector("[data-next-step]").textContent.includes("点火")'),'ground briefing connects the overall goal to the real next action');await shot('ground-checkpoint');
 await action('ignite');
 await until('document.querySelector(".crew-canvas").dataset.phase==="countdown"');
 check(await run('document.querySelector(".crew-propulsion-state").dataset.propulsionState==="ignition-wait"&&!document.querySelector("[data-phase-goal]").textContent.includes("建压")'),'early countdown does not claim thrust buildup before computed thrust');
 check(await run('document.querySelector(".crew-playback-readout").dataset.adoptedRate==="1"'),'countdown publishes its 1x adopted policy while retaining the selected rate');await shot('countdown-before-thrust');await until('document.querySelector(".crew-canvas").dataset.phase==="countdown"');
 check(await run('document.querySelector(".crew-current-control").textContent.includes("自主")'),'countdown explains route ownership');
 await restore('countdown-before-release');
 check(await run('document.querySelector(".crew-propulsion-state").dataset.propulsionState==="ignition"'),'actual countdown thrust changes the propulsion description');await click('.crew-pause');
 await until('document.querySelector(".crew-canvas").dataset.pendingAction==="release"');const releaseTime=(await data()).time;
 await sleep(350);check((await data()).time===releaseTime&&Number(releaseTime)>=-1e-8,'countdown stops at release rather than silently lifting off');check(await run('document.querySelector(".crew-playback-readout").dataset.adoptedRate==="0"'),'a release checkpoint reports a paused clock instead of 60x motion');await shot('release-checkpoint');
 await action('release');await until('document.querySelector(".crew-canvas").dataset.phase==="ascent"');await click('.crew-pause');
 const launchBefore=await captureSave();await click('[data-pilot-takeover]');await until('document.querySelector(".crew-canvas").dataset.controlMode==="manual"');
 const launchAfter=await captureSave();
 check(['position','velocity','attitude','time','launchFuelKg'].every(k=>JSON.stringify(launchBefore.state[k])===JSON.stringify(launchAfter.state[k])),'launch takeover retains actual motion, clock and fuel');
 await click('.crew-pause');await until('!document.querySelector("[data-pilot-throttle]").disabled');
 await run('(()=>{const i=document.querySelector("[data-pilot-throttle]");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(i,"0.9");i.dispatchEvent(new Event("input",{bubbles:true}));i.dispatchEvent(new Event("change",{bubbles:true}));})()');
 await until('Math.abs(Number(document.querySelector(".crew-canvas").dataset.throttle)-.9)<.001');
 await heldKey('KeyS','s',200);check(Number((await data()).throttle)<.9,'W/S controls persistent launch throttle through real worker input');
 await click('[data-pilot-stop]');await until('Number(document.querySelector(".crew-canvas").dataset.throttle)===0');
 check(await run('!document.querySelector("[data-pilot-throttle]").disabled'),'zero thrust does not lock the throttle at zero');
 await until('document.querySelector(".crew-control-authority").dataset.attitudeAvailable==="false"');
 check(await run('["KeyA","KeyD","ArrowUp","ArrowDown","KeyQ","KeyE"].every(code=>[...document.querySelectorAll("[data-flight-key]")].find(b=>b.dataset.flightKey===code).disabled)'),'zero thrust disables every rocket turning axis without disabling throttle restart');
 check(await run('document.querySelector(".crew-control-authority").textContent.includes("无推力")'),'unpowered turning is explained by the actual propulsion state');
 check(await run('document.querySelector(".crew-propulsion-state").dataset.propulsionState==="zero-throttle"'),'zero throttle is shown as a coast with authorization retained');
 check(await run('document.querySelector(".crew-playback-readout").dataset.adoptedRate==="1"&&document.querySelector(".crew-playback-readout").dataset.selectedRate==="60"'),'manual driving shows 1x without replacing the stored 60x selection');
 await run('document.querySelector(".crew-stage").focus()');await call('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyA',key:'a'});await sleep(200);
 check(await run('document.querySelector(".crew-input-feedback").dataset.heldKeys===""'),'an unavailable attitude key is not shown as an effective command');await call('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyA',key:'a'});
 await heldKey('KeyW','w',200);check(Number((await data()).throttle)>0,'launch throttle can be raised again after stopping');await until('!document.querySelector("[data-flight-key=KeyA]").disabled');
 await click('[data-pilot-focus]');await until('document.activeElement===document.querySelector(".crew-stage")');check(true,'enable keyboard focuses the 3D flight window');
 await call('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyA',key:'a'});await until('document.querySelector("[data-flight-key=KeyA]").getAttribute("aria-pressed")==="true"');
 await run('document.querySelector("[data-pilot-throttle]").focus()');await until('document.querySelector(".crew-input-feedback").dataset.heldKeys===""');
 check(true,'leaving the flight window clears a held attitude command');await call('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyA',key:'a'});
 await run('document.querySelector("[data-flight-key=KeyD]").focus()');await call('Input.dispatchKeyEvent',{type:'keyDown',code:'Enter',key:'Enter'});await until('document.querySelector("[data-flight-key=KeyD]").getAttribute("aria-pressed")==="true"');
 check(true,'a focused steering button also works with Enter, without a mouse');await call('Input.dispatchKeyEvent',{type:'keyUp',code:'Enter',key:'Enter'});await until('document.querySelector(".crew-input-feedback").dataset.heldKeys===""');
 await click('[data-pilot-focus]');await call('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyQ',key:'q'});await until('document.querySelector("[data-flight-key=KeyQ]").getAttribute("aria-pressed")==="true"');
 await click('.crew-pause');await until('document.querySelector(".crew-input-feedback").dataset.heldKeys===""');check(true,'pausing clears active steering and its button highlight');await call('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyQ',key:'q'});
 await until('document.querySelector(".crew-briefing").dataset.missionStatus==="paused"');check(true,'briefing distinguishes an ordinary pause from a task checkpoint');await shot('manual-launch');
 for(const name of ['separate-booster','ignite-upper','separate-ship','begin-deorbit','separate-service','open-drogue','open-main','enable-landing','recover']){
  const saved=await restore(`checkpoint-${name}`),d=await data();
  check(await run(`document.querySelector('.crew-briefing').dataset.missionStatus==='checkpoint'&&document.querySelector('[data-next-step]').textContent.includes(document.querySelector('[data-pilot-action="${name}"]').textContent)`),name+': next-step guidance agrees with the actual authorized action');
  check(d.pendingAction===name&&d.pilotRoute==='self-directed',`${name}: restored checkpoint matches the operation and main scene`);
  const stamp=d.time;await sleep(250);check((await data()).time===stamp,`${name}: restoration and checkpoint stay paused`);
  check(await run(`!document.querySelector('[data-pilot-action="${name}"]').disabled`),`${name}: only a physics-approved action is enabled`);
  if(['separate-booster','separate-service','open-main','enable-landing','recover'].includes(name))await shot(`checkpoint-${name}`);
  await action(name);
  if(name==='ignite-upper'){
   await restore('checkpoint-ignite-upper');await click('[data-pilot-takeover]');await until('document.querySelector(".crew-canvas").dataset.controlMode==="manual"');await action('ignite-upper');
   await until('!document.querySelector("[data-pilot-throttle]").disabled&&document.querySelector(".crew-canvas").dataset.phase==="upper"');
   await run('document.querySelector("[data-pilot-throttle]").focus()');await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Home',code:'Home',windowsVirtualKeyCode:36});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Home',code:'Home',windowsVirtualKeyCode:36});
   await until('document.querySelector(".crew-propulsion-state").dataset.propulsionState==="zero-throttle"&&document.querySelector(".crew-canvas").dataset.throttle==="0"');
   check(await run('document.querySelector("[data-next-step]").textContent.includes("油门为零")&&!document.querySelector("[data-next-step]").textContent.includes("推力已建立")'),'second-stage authorization with zero throttle is not described as actual acceleration');await click('.crew-pause');await shot('upper-zero-throttle');
 }
 if(name==='recover'){await until('document.querySelector(".crew-canvas").dataset.phase==="complete"');check(true,'recovery completes the same flown mission');check(await run('document.querySelector(".crew-briefing").dataset.missionStatus==="complete"&&!!document.querySelector("[data-terminal-download]")&&!document.querySelector(".crew-pilot-card")'),'completed task offers results instead of active piloting controls');check(await run('!document.querySelector(".crew-pause")&&document.querySelector(".crew-playback-readout").dataset.adoptedRate==="0"'),'a completed mission does not offer a continue-flight button');await shot('complete');}
  else{await until(`document.querySelector('.crew-canvas').dataset.pendingAction!==${JSON.stringify(name)}`);check(true,`${name}: command is not a dead button`);await run('document.querySelector(".crew-pause")?.textContent==="暂停"&&document.querySelector(".crew-pause").click()');}
 }
 for(const name of ['phase-approach','phase-return-coast','phase-entry','phase-main-chute','phase-landing']){
  await restore(name);const before=await captureSave();await click('[data-pilot-takeover]');await until('document.querySelector(".crew-canvas").dataset.controlMode==="manual"');const after=await captureSave();
  check(['position','velocity','attitude','time','serviceFuelKg','capsuleRcsFuelKg','landingFuelKg'].every(k=>JSON.stringify(before.state[k])===JSON.stringify(after.state[k])),`${name}: broader control handoff does not reset physics`);
  if(name==='phase-entry'){
   check(await run('!document.querySelector("[data-pilot-throttle]")&&!document.querySelector("[data-flight-key=KeyW]")'),'entry exposes attitude controls without a fictitious translation engine');
   await click('.crew-pause');await heldKey('ArrowUp','ArrowUp',350);await click('.crew-pause');const turned=await captureSave();
   check(JSON.stringify(turned.state.attitude)!==JSON.stringify(after.state.attitude)&&turned.state.capsuleRcsFuelKg<after.state.capsuleRcsFuelKg,'return-capsule pitch input turns with finite torque and consumes its own RCS fuel');await shot('manual-entry');
  }
  await click('[data-pilot-assist]');await until('document.querySelector(".crew-canvas").dataset.controlMode==="assisted"');const assisted=await captureSave();
  check(assisted.state.pilot.active&&!assisted.state.fullDemo,`${name}: restoring assistance does not re-enable automatic story progression`);
 }
 await restore('phase-deorbit');
 await run('(()=>{const i=document.querySelector(".crew-rate select");i.value="180";i.dispatchEvent(new Event("change",{bubbles:true}));})()');await click('.crew-pause');
 await until('document.querySelector(".crew-playback-readout").dataset.selectedRate==="180"&&document.querySelector(".crew-playback-readout").dataset.adoptedRate==="1"');
 check(await run('document.querySelector(".crew-propulsion-state").dataset.propulsionState==="deorbit-preparation"'),'auxiliary deorbit turning reports no main thrust until the burn condition is met');await shot('deorbit-turn-rate');await click('.crew-pause');
 await click('[data-pilot-takeover]');await until('document.querySelector(".crew-canvas").dataset.controlMode==="manual"');
 check(await run('document.querySelector(".crew-direction-card p").textContent.includes("本人控制离轨")&&document.querySelector(".crew-direction-card p").textContent.includes("不保证减速")'),'manual deorbit explanation uses the actual thrust direction rather than presuming alignment');
 await click('[data-pilot-assist]');await until('document.querySelector(".crew-canvas").dataset.controlMode==="assisted"');await run('(()=>{const i=document.querySelector(".crew-rate select");i.value="60";i.dispatchEvent(new Event("change",{bubbles:true}));})()');
 await restore('observation-ready');
 check(await run('document.querySelector(".crew-briefing").dataset.missionStatus==="observation"&&document.querySelector(".crew-briefing-record").textContent.includes("无需先继续")&&!document.querySelector(".crew-briefing-paused")'),'a paused ready observation explains direct recording instead of a forced resume');
 const observationTime=Number((await data()).time);await shot('paused-observation');check(await run('!document.querySelector(".crew-side button.crew-primary").disabled'),'actual stable platform observation remains available');
 const observationButton=await run('[...document.querySelectorAll(".crew-side button")].find(b=>b.textContent.includes("记录平台结构观察"))?.outerHTML');check(!!observationButton,'observation is still a deliberate task action');
 await run('[...document.querySelectorAll(".crew-side button")].find(b=>b.textContent.includes("记录平台结构观察")).click()');await until('document.querySelector(".crew-canvas").dataset.phase==="return-ready"');
 check((await data()).pilotRoute==='self-directed','recording observation does not return to demo route');
 check(Number((await data()).time)===observationTime,'direct observation recording keeps the same paused simulation time');
 await restore('failed-carrier');const impact=await data();
 check(impact.phase==='failed'&&Number(impact.altitude)>60&&Math.abs(Number(impact.footClearance))<.001,'carrier failure occurs at the solid envelope while its reference is still above ground');
 check(await run('document.querySelector(".crew-warning")?.textContent.includes("实体包络")&&!document.querySelector("[data-pilot-action=recover]")'),'impact is explained and does not offer false recovery');check(await run('document.querySelector(".crew-briefing").dataset.missionStatus==="failed"&&!!document.querySelector("[data-terminal-restore]")&&!!document.querySelector("[data-terminal-restart]")&&!document.querySelector(".crew-pilot-card")'),'failure gives a visible saved-task restore and restart route');
 check(await run('document.querySelector(".crew-timeline [aria-current=step]").textContent==="发射入轨"'),'an ascent failure remains in the launch chapter instead of falsely reaching landing');
 check(await run('document.querySelector(".crew-side h2").textContent.includes("任务停止")&&!document.querySelector(".crew-side>p").textContent.includes("负责当前阶段的制导")'),'failure is labelled stopped and does not claim an active guidance controller');check(await run('!document.querySelector(".crew-pause")&&document.querySelector(".crew-playback-readout").dataset.adoptedRate==="0"'),'a failed mission is stopped and cannot be confused with a resumable pause');await shot('failed-carrier');
 await click('[data-terminal-restart]');await until('!!document.querySelector(".crew-overlay")');check(await run('document.querySelector(".crew-canvas").dataset.phase==="failed"'),'restart first explains which progress will end');
 check(await run('document.querySelector(".crew-overlay h2").textContent.includes("已停止")'),'the exit dialog preserves the failure state instead of relabelling it paused');await run('document.querySelector(".crew-overlay button").click()');await until('!document.querySelector(".crew-overlay")');
 await call('Emulation.setDeviceMetricsOverride',{width:680,height:900,deviceScaleFactor:1,mobile:true});await restore('checkpoint-ignite');await shot('compact-checkpoint');check(await run('document.documentElement.scrollWidth<=innerWidth'),'compact mission controls have no horizontal overflow');
 check(errors.length===0,'no browser runtime or resource errors');check(!warnings.some(w=>/feedback loop|INVALID_OPERATION|INVALID_FRAMEBUFFER/.test(w)),'no GPU feedback or framebuffer errors');
}finally{fs.writeFileSync(`${out}/browser-checks.json`,JSON.stringify({checks,errors,warnings},null,2)+'\n','utf8');ws.close();}
