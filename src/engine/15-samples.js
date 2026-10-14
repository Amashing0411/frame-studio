function mkS(meta,world,hz,ts,end){let t=0;return{meta,world,hazard:{type:hz},clock:{mode:'elapsed'},chapters:[{id:'a',title:'a',shots:ts.map(a=>{const t0=t;t=a[0];return{t0,t1:t,cam:{preset:a[1],move:a[2],target:a[3],height:{aerial:170,rooftop:45,window:14,pov:1.65,over_shoulder:1.9,closeup:1.6}[a[1]]||1.6},label:a[4],caption:{type:'narration',text:a[5],fact_id:null},events:a[6],sfx:a[7],behavior:a[8]||{}}})}],end_card:end}}
const SQ=mkS({title:'What if a magnitude 7.2 earthquake hit Metro Manila at rush hour?',city:'Metro Manila, Philippines',length_s:62},{time_of_day:'rush hour, late afternoon',weather:'partly cloudy',style:'city'},'quake',[
 [4,'closeup','push','commuter face','What if a magnitude 7.2 earthquake hit Metro Manila at rush hour?','The ground begins to move.',['quake_shake'],['deep_rumble','car_horns'],{crowd:'freeze',emotion:'shock'}],
 [9,'aerial','crane','city district','An entire district begins to shake','Traffic stops. Buildings sway.',['quake_shake','traffic_jam'],['rumble','horns']],
 [13,'window','pull','office window','Inside the buildings','Glass rattles. Dust falls.',['quake_shake','dust_cloud'],['glass_rattle','rumble']],
 [19,'pov','track','pedestrian on avenue','Where do you go?','Drop, Cover, and Hold On.',['quake_shake','crowd_evacuate'],['footsteps','rumble']],
 [24,'ground','track','damaged building frontage','The damage begins to show','Masonry falls into the street.',['facade_fall','dust_cloud'],['debris','concrete_crack'],{crowd:'panic'}],
 [28,'rooftop','pull','city blocks','The lights go out','Power fails across the district.',['power_outage','traffic_jam','smoke_plume'],['distant_sirens']],
 [34,'ground','push','damaged building frontage','A second danger emerges','A small fire sends smoke between the buildings.',['fire_small','smoke_plume','siren'],['fire_crackle','siren'],{crowd:'flee'}],
 [39,'closeup','pull','survivor face','Move to open space','People leave the walls behind.',['crowd_evacuate'],['running_footsteps'],{crowd:'flee',emotion:'fear'}],
 [45,'ground','track','open assembly area','Help arrives','Responders move carefully through the debris.',['crowd_evacuate','rescue_crew','siren'],['siren','radio_chatter'],{crowd:'help'}],
 [50,'aerial','pull','city district','Can help reach everyone?','Blocked roads complicate the work ahead.',['rescue_crew','helicopter','smoke_plume'],['helicopter_rotors','sirens'],{crowd:'relief'}],
 [56,'closeup','pull','survivor face','Know what to do','Practice Drop, Cover, and Hold On before it happens.',[],['soft_ambient_music'],{crowd:'relief',emotion:'relief'}],
 [62,'aerial','pull','skyline at dusk','Preparedness begins with you','Know your risks. Help others when it is safe.',[],['music_resolve'],{crowd:'relief'}]],
 {text:'DROP. COVER. HOLD ON.\nPrepare an emergency kit. Make a family plan.',disclaimer:'Illustrative scenario. Not a prediction.'});
const SZ=mkS({title:'What if a zombie outbreak hit Manila?',city:'Manila, Philippines',length_s:58},{time_of_day:'evening',weather:'light rain',style:'city'},'zombie',[
 [4,'closeup','push','civilian face','What if a zombie outbreak hit Manila?','Something is wrong.',[],['wind','distant_scream'],{crowd:'alert',emotion:'fear'}],
 [9,'aerial','pull','city district','It starts with one','One person. Then another.',['zombie_spawn','siren'],['siren','distant_scream'],{crowd:'alert',zombies:'shamble'}],
 [14,'ground','push','intersection','Nobody understands yet','People stop and stare.',['zombie_spawn'],['groan','crowd'],{crowd:'film',zombies:'shamble'}],
 [18,'pov','track','avenue','RUN','The first scream.',['zombie_surge'],['scream','running_footsteps'],{crowd:'flee',zombies:'sprint'}],
 [23,'over_shoulder','push','person running','No time to look back','Keep moving.',['zombie_surge'],['scream','footsteps'],{crowd:'flee',zombies:'sprint',emotion:'fear'}],
 [27,'closeup','push','zombie face','Infected','Something has taken over.',['infection_spread'],['groan'],{crowd:'panic',zombies:'chase'}],
 [32,'rooftop','pull','city blocks','The streets fill','The city turns on itself.',['traffic_jam','smoke_plume','infection_spread'],['scream','groan','sirens'],{crowd:'panic',zombies:'chase'}],
 [36,'ground','track','open assembly area','No safe place','Survivors run for open ground.',['crowd_evacuate','fire_small'],['scream','fire_crackle'],{crowd:'flee',zombies:'sprint'}],
 [41,'aerial','orbit','city district','The city is overrun','The streets belong to them.',['smoke_plume','helicopter','siren'],['helicopter_rotors','groan','sirens'],{crowd:'hide',zombies:'chase'}],
 [46,'window','pull','office window','Hold the line','Responders arrive.',['rescue_crew','siren'],['siren','gunshots','radio_chatter'],{crowd:'help',zombies:'shamble'}],
 [52,'closeup','pull','survivor face','Stay together','Hold on to each other.',['rescue_crew'],['soft_ambient_music','groan'],{crowd:'help',emotion:'determined'}],
 [58,'aerial','pull','skyline at dusk','What would you do?','Think about your own city.',['helicopter'],['music_resolve'],{crowd:'relief'}]],
 {text:'WHAT WOULD YOU DO?\nKnow your exits. Stay together. Follow official guidance.',disclaimer:'Fictional scenario.'});
