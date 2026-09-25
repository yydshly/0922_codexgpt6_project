import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const scripts=['coverage-core','coverage-outer','coverage-environment','coverage-context','coverage-supplements','event-acceptance','viewport-acceptance'];
const results=[];
fs.mkdirSync('.cache/final-regression',{recursive:true});
for(const name of scripts){
 console.log('START',name);
 const start=Date.now();
 const r=spawnSync(process.execPath,['scripts/qa/'+name+'.mjs'],{env:{...process.env,CDP_PORT:process.env.QA_CDP_PORT??'9225',QA_CDP_PORT:process.env.QA_CDP_PORT??'9225'},encoding:'utf8',timeout:240000});
 const log=(r.stdout??'')+(r.stderr??'');fs.writeFileSync('.cache/final-regression/'+name+'.log',log);
 results.push({script:name,exitCode:r.status,passed:r.status===0,seconds:(Date.now()-start)/1000,error:r.error?.message,assertions:log.split('\n').filter(s=>s.startsWith('PASS '))});
 fs.writeFileSync('public/data/validation/final-regression.json',JSON.stringify({measuredAt:new Date().toISOString(),scope:'Seven fixed browser journeys; representative behaviors, not exhaustive astronomy or human visual acceptance',results},null,2)+'\n');
 console.log(r.status===0?'PASS':'FAIL',name,results.at(-1).seconds+'s');
 if(r.status!==0){console.log(log.slice(-3000));process.exitCode=1;break;}
}
