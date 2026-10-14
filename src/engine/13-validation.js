// ---- validation
const PRE=['aerial','ground','rooftop','waterline','pov','over_shoulder','window','orbit','closeup'],MOV=['push','pull','crane','track','orbit'],EVT=['quake_shake','facade_fall','dust_cloud','power_outage','crowd_evacuate','traffic_jam','fire_small','smoke_plume','siren','helicopter','rescue_crew','zombie_spawn','zombie_surge','infection_spread'];
const CRW=['calm','alert','freeze','film','panic','flee','hide','help','relief'],EMOS=['neutral','fear','shock','determined','relief','happy','sad','angry'],ZMB=['shamble','chase','sprint'];
function parse(){let t=String($('ta').value||'').trim();t=t.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();if(!t)throw new Error('Paste a scenario JSON object first.');const j=JSON.parse(t);if(!j||typeof j!=='object'||Array.isArray(j))throw new Error('Scenario JSON root must be an object.');return j}
function validateScenario(j){
 const w=[],fl=[];
 if(!j||typeof j!=='object'||Array.isArray(j))return{w:['ERROR: scenario root must be a JSON object.'],fl:[],tot:0,errors:1};
 const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const num=v=>(typeof v==='number'||typeof v==='string'&&v.trim()!=='')&&Number.isFinite(Number(v));
 const textFields=(o,keys,path)=>{if(obj(o))keys.forEach(k=>{if(o[k]!==undefined&&typeof o[k]!=='string')w.push('ERROR: '+path+'.'+k+' must be text.')})};
 ['meta','world','hazard','clock','end_card'].forEach(k=>{if(j[k]!==undefined&&!obj(j[k]))w.push('ERROR: '+k+' must be an object.')});
 textFields(j.meta,['title','city'],'meta');textFields(j.world,['style','time_of_day','weather'],'world');textFields(j.hazard,['type'],'hazard');textFields(j.clock,['mode','start'],'clock');textFields(j.end_card,['text','disclaimer'],'end_card');
 if(obj(j.clock)&&j.clock.rate!==undefined&&!num(j.clock.rate))w.push('ERROR: clock.rate must be a finite number.');
 if(obj(j.clock)&&typeof j.clock.start==='string'&&!/^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(j.clock.start))w.push('ERROR: clock.start must use HH:MM (00:00–23:59).');
 if(!Array.isArray(j.chapters))return{w:['ERROR: "chapters" must be an array.'],fl:[],tot:0,errors:1};
 j.chapters.forEach((c,ci)=>{if(!c||typeof c!=='object'||Array.isArray(c)){w.push('ERROR: chapter '+(ci+1)+' must be an object.');return}if(!Array.isArray(c.shots)){w.push('ERROR: chapter '+(ci+1)+' "shots" must be an array.');return}c.shots.forEach((s,si)=>{if(!s||typeof s!=='object'||Array.isArray(s)){w.push('ERROR: chapter '+(ci+1)+' shot '+(si+1)+' must be an object.');return}fl.push({...s,ch:c.title||c.id})})});
 if(!fl.length)w.push('ERROR: no shots found.');
 fl.forEach((s,i)=>{const n='Shot '+(i+1);if(!num(s.t0)||!num(s.t1))w.push('ERROR: '+n+': t0 and t1 must be finite numbers.');else{s.t0=Number(s.t0);s.t1=Number(s.t1);if(s.t0<0||!(s.t1>s.t0))w.push('ERROR: '+n+': t0 must be non-negative and t1 must be greater than t0.')}const d=Number(s.t1)-Number(s.t0);if(Number.isFinite(d)&&(d<3||d>9))w.push(n+': length '+d+'s is outside 3-9s.');
  textFields(s,['label'],n);textFields(s.cam,['preset','move','target'],n+'.cam');textFields(s.behavior,['crowd','emotion','zombies'],n+'.behavior');
  if(obj(s.cam)&&s.cam.height!==undefined&&(!num(s.cam.height)||Number(s.cam.height)<0))w.push('ERROR: '+n+': cam.height must be a finite non-negative number.');
  if(s.caption!==undefined&&typeof s.caption!=='string'&&!obj(s.caption))w.push('ERROR: '+n+': caption must be text or an object.');textFields(s.caption,['text','type'],n+'.caption');
  ['events','sfx'].forEach(k=>{if(Array.isArray(s[k])&&s[k].some(v=>typeof v!=='string'))w.push('ERROR: '+n+': '+k+' entries must be text.')});
  if(i&&Number.isFinite(Number(s.t0))&&Number.isFinite(Number(fl[i-1].t1))&&Math.abs(Number(s.t0)-Number(fl[i-1].t1))>.01)w.push('ERROR: '+n+': shots must be consecutive without gaps or overlaps.');
  if(s.cam!==undefined&&(!s.cam||typeof s.cam!=='object'||Array.isArray(s.cam)))w.push('ERROR: '+n+': cam must be an object.');const c=s.cam&&typeof s.cam==='object'?s.cam:{};if(c.preset&&!PRE.includes(c.preset))w.push(n+': unknown preset "'+c.preset+'" (falls back to ground).');if(c.move&&!MOV.includes(c.move))w.push(n+': unknown move "'+c.move+'" (falls back to push).');
  if(s.events!==undefined&&!Array.isArray(s.events))w.push('ERROR: '+n+': events must be an array.');if(s.sfx!==undefined&&!Array.isArray(s.sfx))w.push('ERROR: '+n+': sfx must be an array.');if(s.behavior!==undefined&&(!s.behavior||typeof s.behavior!=='object'||Array.isArray(s.behavior)))w.push('ERROR: '+n+': behavior must be an object.');
  if(c.preset==='pov'&&c.move&&!['push','track'].includes(c.move))w.push(n+': pov should use push or track.');
  (Array.isArray(s.events)?s.events:[]).forEach(e=>{if(!EVT.includes(e))w.push(n+': unknown event "'+e+'" (ignored).')});
  const b=s.behavior&&typeof s.behavior==='object'?s.behavior:{};if(b.crowd&&!CRW.includes(b.crowd))w.push(n+': unknown crowd behavior "'+b.crowd+'".');if(b.emotion&&!EMOS.includes(b.emotion))w.push(n+': unknown emotion "'+b.emotion+'".');if(b.zombies&&!ZMB.includes(b.zombies))w.push(n+': unknown zombies mode "'+b.zombies+'".');
  const cp=s.caption&&typeof s.caption==='object'?s.caption:{text:s.caption||''};if(cp.type==='fact'&&!cp.fact_id)w.push(n+': fact caption has no fact_id.');
});
 if(fl.length&&Number(fl[0].t0)!==0)w.push('ERROR: first shot must start at 0.');
 if(fl.length&&Number.isFinite(Number(fl[0].t1))&&Number.isFinite(Number(fl[0].t0))&&(Number(fl[0].t1)-Number(fl[0].t0)>5))w.push('Cold open: shot 1 is longer than 5s.');
 for(let i=2;i<fl.length;i++){const a=Number(fl[i].t1)-Number(fl[i].t0),b=Number(fl[i-1].t1)-Number(fl[i-1].t0),c=Number(fl[i-2].t1)-Number(fl[i-2].t0);if(a===b&&b===c){w.push('Pacing: shots '+(i-1)+'-'+(i+1)+' have equal length.');break}}
 const tot=fl.length&&Number.isFinite(Number(fl[fl.length-1].t1))?Number(fl[fl.length-1].t1):0;if(j.meta&&j.meta.length_s&&Math.abs(tot-Number(j.meta.length_s))>1)w.push('Runtime '+tot+'s differs from meta.length_s '+j.meta.length_s+'.');
 if(!j.end_card)w.push('No end_card.');const ht=(j.hazard||{}).type;if(ht&&ht!=='none'&&ht!=='quake'&&ht!=='zombie')w.push('This engine renders quake and zombie hazards; "'+ht+'" plays as a plain city.');
 if(typeof validateCatalogScenario==='function')validateCatalogScenario(j,w,fl);
 const errors=w.filter(x=>x.startsWith('ERROR:')).length;return{w,fl,tot,errors}}
// Scenario rules first, then each feature's own checks, then the final error count.
function validate(j){const r=validateScenario(j);validateCameraFields(r);validateCinemaAndMoments(j,r);validateSpeech(j,r);validateFinish(j,r);validateWaterHazard(j,r);validateSafeZoneText(j,r);r.errors=r.w.filter(x=>x.startsWith('ERROR:')).length;return r}

function report(r){$('rep').textContent=(r.w.length?(r.errors?'BLOCKED · '+r.errors+' structural error(s)':'Review · '+r.w.length+' note(s)')+'\n- '+r.w.slice(0,12).join('\n- '):'Valid JSON and shot structure.')+'\n'+r.fl.length+' shots, '+r.tot+'s.'}
const KL={quake:'TIME SINCE EARTHQUAKE',zombie:'TIME SINCE OUTBREAK'},fm=n=>String(Math.floor(n)).padStart(2,'0'),esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
