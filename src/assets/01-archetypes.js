// Author-defined procedural archetypes. Presets are derivatives, not separate hand-modelled meshes.
const HUMAN_STATES=['idle','walk','run','wave','talk','phone','sit','crouch','cower','cheer','point','carry','swim','dance','jump','climb','fall','sleep','zombie'];
const EXPRESSIONS=['neutral','happy','sad','angry','fear','surprised','determined','relief','sleepy'];
const ACCESSORIES=['backpack','cap','helmet','glasses','mask','bag','vest','umbrella'];
const MATERIAL_MODES=['standard','matte','metal','glass','toon','emissive'];
const CATALOG_BASE=[];
function defineAssets(category,kind,states,rows){for(const row of rows){const [key,name,...params]=row;CATALOG_BASE.push({id:category+'.'+key,name,category,kind,states,params,expressions:kind==='human'?EXPRESSIONS:[],accessories:kind==='human'?ACCESSORIES:[],rig:kind==='human'?'segmented-skinned-skeleton':states.length>1?'articulated-hierarchy':'static'})}}
defineAssets('human','human',HUMAN_STATES,[
 ['civilian','City civilian','casual'],['commuter','Office commuter','office'],['medic','Emergency medic','medic'],['firefighter','Firefighter','fire'],['police','Police officer','police'],['worker','Construction worker','worker'],['sailor','Deck crew','sailor'],['pilot','Pilot','pilot'],['hiker','Jungle explorer','hiker'],['chef','Street food chef','chef'],['vendor','Market vendor','vendor'],['student','Student','student'],['child','Child','child'],['elder','Older resident','elder'],['athlete','Runner','athlete'],['diver','Ocean diver','diver'],['raincoat','Raincoat resident','raincoat'],['survivor','Disaster survivor','survivor']]);
// The procedural vehicles, buildings, nature, animals, food, trash, debris, props and environment archetypes were
// replaced by the PSX models (src/assets/24-psx.js); the old code is in archive/frame-studio-catalog-v1.zip.
function presetAccessories(base,n){if(base.kind!=='human')return[];const role=base.params[0],defaults={worker:['helmet','vest'],fire:['helmet','vest'],medic:['bag'],hiker:['backpack'],student:['backpack'],child:['cap'],diver:['mask'],raincoat:['umbrella'],sailor:['cap'],pilot:['cap'],chef:['cap'],survivor:['backpack'],police:['cap']}[role]||[];const add=[['backpack'],['cap'],['glasses'],['bag'],['mask'],['helmet','vest'],[],['umbrella']][n%8];const result=[...new Set([...defaults,...add])];return result.includes('helmet')?result.filter(x=>x!=='cap'):result}
const PRESET_COLORS=[0x355d80,0xc57045,0x34776b,0xd8b762,0x7f698e,0xc6d6dc,0x4b545c,0xb34443];
let catalogPacks=[];
const catalogById=new Map(),catalogEntries=[];
function presetEntry(base,n){const wear=Math.floor(n/8),palette=n%8;return{id:base.id+'.v'+String(n+1).padStart(2,'0'),archetype:base.id,name:base.name+' / '+(base.category==='food'?['fresh','ripe','weathered']:['clean','used','weathered'])[wear]+' '+String(palette+1).padStart(2,'0'),category:base.category,seed:(CATALOG_BASE.indexOf(base)+1)*997+n*37,variant:n,color:'#'+PRESET_COLORS[palette].toString(16).padStart(6,'0'),wear,proportion:+(.91+palette*.021+wear*.003).toFixed(3),accessories:presetAccessories(base,n),states:base.states,rig:base.rig}}
function rebuildArchetypeCatalog(){catalogEntries.length=0;catalogById.clear();for(const b of CATALOG_BASE)for(let n=0;n<(b.kind==='psx'?1:24);n++){const e=presetEntry(b,n);if(b.kind==='psx')e.name=b.name;catalogEntries.push(e);catalogById.set(e.id,e)}for(const pack of catalogPacks)for(const e of pack.assets){catalogEntries.push(e);catalogById.set(e.id,e)}}
// The archetype catalog plus every installed extension and registered import.
function rebuildCatalog(){rebuildArchetypeCatalog();for(const id of [...workshopExtensions.keys(),...workshopGLBs.keys()]){const {entry}=resolveCatalog(id);catalogEntries.push(entry);catalogById.set(id,entry)}}
function resolveCatalog(id){if(workshopExtensions.has(id)){const a=workshopExtensions.get(id);return customReference(id,a.name,a.category||'extension',Object.keys(a.animations),'extension',a.tags)}if(workshopGLBs.has(id)){const a=workshopGLBs.get(id);return customReference(id,a.name,'imported',Object.keys(a.actions),'imported',a.tags)}const e=catalogById.get(id);if(e)return{entry:e,base:CATALOG_BASE.find(b=>b.id===e.archetype)};const b=CATALOG_BASE.find(b=>b.id===id)||CATALOG_BASE.find(b=>b.kind==='psx'&&b.id===String(id).replace(/\.v\d+$/,''));return b?{base:b,entry:catalogById.get(b.id+'.v01')}:null}
rebuildArchetypeCatalog();

