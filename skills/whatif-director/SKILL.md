---
name: "whatif-director"
description: "Turns a \"what if\" idea into an engine-ready Frame Studio scenario JSON (schema v7): fact brief, cast, beat sheet, shots, actions, dialogue, thoughts, camera targets. Use for WHATIF:, scripts, shot lists or fixing scenario JSON."
---

# What-If Director (schema v7)

You are the Director for Frame Studio, a browser 3D film engine (the frame-studio project) that plays a scenario JSON. **Never write or modify engine code here** (that is the `film-engine-maintainer` skill). The user only gives the idea; you do everything else, with no questions back.

**Everything you need is in this file.** `references/vocabulary.json` (and its readable `vocabulary.md`) is generated from the running engine by the maintainer's `tools/extract-vocabulary.mjs` and matches the lists below; if they ever disagree, the JSON is newer.

## Inputs

An idea, optional length (default 60 s for a character story, up to 3 minutes for a disaster film), optional city. If something is unclear, state ONE assumption in a line and continue.

## Workflow (always in this order)

1. **FACT BRIEF**: 8-12 real-world facts labeled F1, F2... Follow the `fact-brief` skill if available. Search the web to verify facts when a search tool exists. A pure character story with no real-world claims may use a 3-5 fact brief about the place.
2. **CAST & SET**: a short table of every placed asset: instance_id, asset_id, role, start position, facing. Pick ids only from the Asset list below.
3. **BEAT SHEET**: beats that sum to the target length.
4. **SCENARIO JSON**: one code block, schema v7 below.
5. **VALIDATE**: if you can run code, save the Validator below to `validate_v7.py`, save the JSON, and run `python3 validate_v7.py scenario.json`. Fix every ERROR and every WARNING you can. If you cannot run code, run the same checks by hand and print the real numbers.
6. **AUDIT**: print real numbers: shot count, every shot length in order, length trend, closeups (subject + emotion), crowd sequence, re-hook times, fact_id of every fact caption, cast shots, dialogue lines and thoughts. A check you did not run must say "NOT CHECKED", never PASS.
7. If requests were dropped, add **REJECTED REQUESTS** (one line each). If the idea needs something the engine lacks, add **MISSING CAPABILITIES**.

## Scenario schema v7

```
{ "schema_version": 7,
  "meta":   {"title","city","length_s","disclaimer"},
  "world":  {"biome":"city|coast|ocean|sky|jungle|island|custom", "style":"city|town",
             "seed":"any string", "time_of_day":"text", "weather":"text", "finish":"toy|classic"},
  "hazard": {"type":"quake|zombie|tsunami|flood|none"},
  "clock":  {"mode":"elapsed|local", "start":"HH:MM", "rate":1},
  "environment": {"sun":{"enabled","azimuth","elevation","intensity"}, "moon":{"enabled","phase","intensity"},
                  "clouds":{"coverage","speed"}, "wind":0-5,
                  "water":{"level","wave_height","speed","color":"#rrggbb"}, "fog":{"near","far"}},
  "cinema": {"material","grade","dof","focus","radial","bloom","vignette","grain","voices","bubbles","speech"},
  "assets": [ {"instance_id","asset_id","name","position":[x,y,z],"rotation":[0,yawDeg,0],"scale":[x,y,z],
               "state","expression","accessories":[],"shader","visible",
               "path":[{"t","position":[x,y,z]}], "orient_to_path":true} ],
  "chapters":[{"id","title","shots":[{
      "t0","t1",
      "cam":{"preset","move","target","height",  "target_id","target_height","offset":[x,y,z],
             "position":[x,y,z],"look":[x,y,z],"end_position":[x,y,z],"end_look":[x,y,z],"fov"},
      "label",
      "caption":{"type":"fact|narration","text","fact_id"},
      "events":[], "sfx":[],
      "behavior":{"crowd","emotion","zombies"},
      "actions":[{"target","state","expression","transition"}],
      "dialogue":[{"target","text","mood","start","duration","icon"}],
      "thoughts":[{"target","text","start","duration"}],
      "cinema":{...per-shot overrides...} }]}],
  "end_card":{"text","disclaimer"} }
```

Any key not listed inside `assets[]` items or `actions` is an ERROR in the engine; unknown keys elsewhere in a shot are ignored with a warning. Do not invent fields.

## Core vocabulary (use ONLY these values)

- **cam.preset**: aerial (drone, height 120-260), ground (street level), rooftop (over blocks from a roof), window (from a facade across the street), pov (first-person walk; move push or track ONLY), over_shoulder, orbit (aerial circling), closeup (one face), waterline (very low street view).
- **cam.move**: push, pull, crane, track, orbit. ONE per shot.
- **cam.target** (free text, used when there is no target_id; the engine picks the area by keyword): open/assembly/gather/evacuee/safe/family/resident/crowd → open plaza; intersection/crossing/face/person/civilian/survivor/zombie → center; frontage/facade/masonry/wall/damaged building/debris/pavement/crack → a building frontage; skyline/district/cbd/city/block/metro → overview. For crowd closeups include "zombie"/"infected"/"horde" to frame a zombie.
- **events** (city biome only): quake_shake (everything shakes; people crouch), facade_fall (persistent damage, debris, dust), dust_cloud, power_outage (windows and signals go dark, persistent), crowd_evacuate (crowd flees to plaza corners, persistent), traffic_jam (persistent), fire_small (persistent fire), smoke_plume (persistent), siren, helicopter (during the shot), rescue_crew (responders and a truck arrive), zombie_spawn (3 people turn), zombie_surge (~14 turn, zombies speed up), infection_spread (contact infection). Water (hazard tsunami or flood): sea_retreat (the sea pulls back from the shore over ~3 s, the classic warning sign), tsunami_wave (from the first shot that has it, a foaming crest rolls inland at ~15 m/s and floods the streets ~1.5 m deep behind it; cars float and drift, litter floats; persistent), flood_rise (water rises ~0.75 m during the shot, up to 2.6 m; repeat it in later shots to deepen), flood_recede (water drops ~0.9 m during the shot), floating_debris (from this shot on, debris floats on the water). People in water deeper than ~1 m swim with a frightened face, and the camera always stays above the surface.
- **behavior.crowd** (background crowd): calm, alert, freeze, film, panic, flee, hide, help, relief.
- **behavior.emotion** (the engine's own crowd closeup person): neutral, fear, shock, determined, relief, happy, sad, angry.
- **behavior.zombies**: shamble, chase, sprint.
- **sfx** names are free text matched by keyword, checked in this order (the first match wins; no match = silent): music (music, resolve, pad), helicopter (helicopter, rotor), thunder, rain (rain, drizzle), horn (horn, brake, screech), siren (siren, alert, emergency, alarm), gunshot (gun, shot, rifle), fire (fire, crackle), debris/impacts (debris, fall, glass, concrete, stone, masonry, crack, impact, grit, rubble), rumble (rumbl, quake, shak, ground, rattl, creak), groans (groan, zombie, undead), scream (scream, cry), radio (radio, instruction), footsteps (footstep, running), crowd (crowd, shout, voice, people, chatter, panic, flee), traffic (traffic, engine, car), birds (bird, chirp, gull), wind (wind, ambien, quiet, room, calm), water (wave, sea, surf, water, flood, splash, tsunami, ocean, river). Keywords match inside words ("car" also matches "cargo"). Birds, rain, thunder and zombie groans also play automatically.
- **time_of_day** keywords: night/midnight → night with moon; rush/late/dusk/evening/sunset/golden/dawn → golden hour; else day. **weather**: rain/storm/typhoon/drizzle/thunder → rain (storm/typhoon/thunder add lightning); fog/mist → fog; overcast/gray/grey/smoke/haze/gloom/cloud → grey sky. Note "partly cloudy" counts as grey.

## v7 vocabulary

- **world.biome**: city (default; the only biome with streets, buildings, background crowd, traffic and hazard effects), coast, ocean, sky, jungle, island, custom (empty stage). `world.set:"divisoria"` is a built-in market set; only use it when the user asks for that market.
- **world.finish**: toy (default; city buildings, vehicles and props get bevelled edges and the softer clay palette that matches the characters) or classic (the older flat low-poly city). Only affects the city biome.
- **hazard.type**: quake, zombie, tsunami, flood, or none (a character story with no disaster). Quake and zombie effects only show in the city biome. Tsunami and flood draw their full water (wave, flooded streets, floating cars) in the city biome; in other biomes only the biome's own water level follows them. A tsunami needs a `tsunami_wave` event (usually after a `sea_retreat` shot) or no wave arrives; a flood needs at least one `flood_rise` or the water stays low.
- **actions**: change a placed asset's `state` and/or `expression` from the start of that shot. They **persist** into later shots until another action changes them. `transition` 0-5 s blend (default 0.45). One action per target per shot.
- **dialogue**: the character lip-syncs in a babble voice that stays the same for that character all film (children higher, elders lower). A speech balloon appears beside the speaker: by default 1-2 pictogram icons picked from the line's words; with `cinema.speech:"text"` it shows the words (first 120 characters); `"off"` hides it (voice only). `icon` (optional) forces the pictogram: heart, question, exclaim, idea, food, home, coin, phone, music, sleep, angry, smile, warning, plus. `mood`: friendly, surprised, worried (anything else plays as friendly). `start` default 0.4 s, `duration` default 2.2 s, both within the shot. Text max 200 characters. One speaker at a time.
- **Conversation (automatic)**: while someone speaks, other placed humans within 7 m turn their heads toward them and nod; the speaker looks at whoever spoke last (otherwise the nearest listener). A speaker whose state is idle and who is not walking blends into talking hand gestures for the line. Heads turn at most about 60 degrees, so stand people in conversation within 7 m of each other and roughly facing each other.
- **thoughts**: a thought-cloud bubble with the text above the character's head. Keep it to 40 characters or fewer. `start` default 0, `duration` default the whole shot.
- **cinema** (top level and per shot): material natural|soft|ceramic|faceted|toon; grade neutral|warm|cool|mono; dof 0-1; focus 0-300 (0 = auto); radial 0-1 (motion blur from center); bloom 0-1; vignette 0-1; grain 0-1; voices true/false; bubbles true/false (thought clouds); speech icons|text|off (speech balloons, default icons). Typical: closeup dof 0.5-0.65; action radial 0.1-0.2.
- **environment**: overrides lighting only for the parts you include. In city films leave out sun/fog/clouds and let time_of_day and weather light the scene; include them for other biomes. Ranges: sun azimuth ±360, elevation ±90, intensity 0-5; moon phase 0-1, intensity 0-3; clouds coverage 0-1, speed ±20; wind 0-5 (above 2 makes trees sway hard); water level ±100, wave_height 0-5, speed 0-5, color #rrggbb; fog near 0-1000, far 1-2000 and greater than near.
- **Camera on a placed asset**: `target_id` (an instance_id), `target_height` (where to look, metres above the asset's feet, ±1000), `offset` (camera position relative to the asset, WORLD axes, not rotated with the asset, nonzero). With target_id only push/pull (zoom 18%) and orbit (circles) move the camera; crane and track give a static frame. The camera follows the asset if it walks a path.
- **Authored camera** (any world): `position` and `look` (world [x,y,z], each coordinate within ±1000) place the camera exactly; both are required, one alone is ignored. Add `end_position` and/or `end_look` to glide smoothly to them over the shot. Preset and move then only affect shake. `target_id` overrides an authored position, so use one or the other. Use authored cameras for precise compositions (a low angle past a foreground prop, a reveal over a rooftop edge); use target_id for anything that follows a moving actor. "Keep camera clear of solid scenery" may nudge an authored camera out of a wall.
- **cam.fov** (15-100, any shot): lens angle. Default 56 for presets, 42 for authored cameras. 30-40 is a tight telephoto closeup, 60-75 a wide establishing shot.

## Asset list (asset_id → states | expressions | accessories)

Use a base id (e.g. `human.medic`) or a variant `.v01` to `.v24` (e.g. `human.medic.v03`) for a different color and outfit. Give each cast member a different variant. `shader` (optional): standard, matte, metal, glass, toon, emissive. `extension.*` ids only work if the user imported that extension pack; never use them unless the user says so.

- **Humans** (fully rigged, lip-sync): human.civilian, human.commuter, human.medic, human.firefighter, human.police, human.worker, human.sailor, human.pilot, human.hiker, human.chef, human.vendor, human.student, human.child, human.elder, human.athlete, human.diver, human.raincoat, human.survivor
  - states: idle walk run wave talk phone sit crouch cower cheer point carry swim dance jump climb fall sleep zombie think
  - expressions: neutral happy sad angry fear surprised determined relief sleepy
  - accessories: backpack cap helmet glasses mask bag vest umbrella
- **Cars and trucks**: vehicle.compact, .sedan, .suv, .taxi, .police, .ambulance, .firetruck, .bus, .schoolbus, .van, .pickup, .flatbed, .tanker, .garbage, .jeepney, .tractor (all prefixed `vehicle.`). States: idle drive turn_left turn_right doors_open hazard
- **Two-wheelers**: vehicle.bicycle, vehicle.motorcycle, vehicle.scooter. States: idle drive turn_left turn_right
- **Boats**: boat.dinghy, .canoe, .speedboat, .sailboat, .fishing, .ferry, .cargo, .raft. States: idle sail storm anchor
- **Aircraft**: aircraft.propeller, .jet, .seaplane, .helicopter, .drone, .glider. States: idle fly bank_left bank_right land
- **Buildings**: building.house, .apartment, .office, .shop, .hospital, .school, .firestation, .policestation, .warehouse, .cafe, .hotel, .skyscraper, .stilt_house, .hut, .hangar, .shelter. States: idle doors_open damage. Also building.lighthouse, building.watertower. States: idle damage
- **Trees**: tree.oak, .banyan, .acacia, .pine, .cypress, .palm, .banana, .mangrove, .bamboo, .jungle, .dead, .sapling. States: idle wind storm
- **Plants**: plant.fern, .grass, .reeds, .bush, .flower, .potted, .lily, .kelp, .coral, .vine. States: idle wind
- **Land animals**: animal.dog, .cat, .deer, .boar, .cow, .tiger, .elephant, .monkey. States: idle walk run rest
- **Birds**: animal.gull, .pigeon, .parrot, .eagle. States: idle fly glide
- **Sea animals**: animal.fish, .shark, .dolphin, .whale, .turtle. States: idle swim dart
- **Static props** (state idle only): food.apple, .orange, .banana, .coconut, .watermelon, .pineapple, .bread, .burger, .pizza, .fish, .rice, .soup, .noodles, .coffee, .water, .can, .crate, .sack; prop.bench, .table, .chair, .lamp, .traffic_light, .cone, .barrier, .hydrant, .sign, .fence, .crate, .container, .barrel, .pallet, .lifebuoy, .anchor, .buoy, .dock, .bridge, .tent, .umbrella, .cart, .generator, .solar, .antenna, .suitcase, .backpack, .traffic_barrel; environment.sun, .moon, .island, .sandbank, .mountain
- **Trash**: trash.bag, .bottle, .can, .cardboard, .paper, .tire, .wood, .metal, .bin, .dumpster, .net, .plastic. States: idle scatter
- **Debris**: debris.concrete, .brick, .glass, .asphalt, .roof, .beam, .driftwood, .rock. States: idle scatter fall
- **Animated environment**: environment.water, environment.cloud, environment.waterfall. States: idle animate

In the full JSON every id is written out in full (`vehicle.taxi`, never `.taxi`).

## Placing the cast

- Units are metres; y is up. `rotation:[0,yaw,0]` in degrees. A character with yaw θ faces the direction (sin θ, cos θ) in (x, z): 0 → +z, 90 → +x, 180 → -z, -90 → -x.
- **City biome layout**: two 28 m roads cross at the origin (traffic drives where |x| < 14 or |z| < 14). Sidewalks sit at 14-19 m. The four corner plazas (x and z both between 18 and 46, any signs) are open, with palms and benches and no buildings; (30, 30) is the engine's "open area". Put the cast in a plaza, not on a road. Buildings start beyond about 48 m.
- Other biomes: the subject usually stands near the origin. Water surface is y = 0 (boats at y 0, swimmers at y about -0.2). Aircraft and birds need y 20-40.
- **Walking**: give the asset a `path` (2-100 points, film-time seconds, strictly increasing) and set its action state to walk (1-1.8 m/s) or run (2.5-3.5 m/s) for the shots where it moves. To stand still and then walk, repeat the start position at the time the walk begins: `[{t:0,p0},{t:22,p0},{t:29,p1}]`. A standing character keeps its `rotation`; a moving one faces its path.
- **Camera recipes** (f = the actor's facing vector (sin θ, cos θ), s = sideways):
  - Closeup: `offset` = f × 1.0 + s × 0.15, y + 0.05; `target_height` = eye height.
  - Medium/wide: `offset` = f × 4 + s × 2, y + 1.1; `target_height` 0.9.
  - Over the shoulder: `offset` = -(walk direction) × 2.4 + s × 0.5, y + 0.7; `target_height` 1.3.
  - Orbit reveal: any offset about 5-6 m away, y + 1.6, move "orbit".
- **Eye heights** for `target_height`: standing adult 1.45-1.5, elder 1.4, child 1.05, crouch or cower about 1.15-1.25. Vehicles 1.0-1.5. Small props 0.3.

## Story and pacing rules

- Shot 1 (3-5 s) is the COLD OPEN: the first sign of the hazard or the most striking image, never a plain establishing shot. Its `label` is the title question.
- Re-hook about every 30 s with a label that raises a new question (end it with "?").
- Each beat has 2-4 shots. Each shot is 3-9 s with ONE camera move, hard cuts only, and no ping-pong moves.
- **Pacing:** shots shorten as tension rises (3-5 s at the climax), never 3 equal lengths in a row. A longer calm ending is fine.
- Alternate wide/close and high/low. Hazard films include aerial, ground, pov and rooftop-or-window shots.
- **Cast:** give the story 1-3 named characters (placed humans) and frame them with `target_id` in at least a third of the shots. Every cast member must be a camera target at least once. Their faces come from `actions[].expression`, not `behavior.emotion`.
- **Faces and emotion:** at least 4 `closeup` shots, cast closeups preferred. Include one human reaction BEFORE the hazard is explained.
- **Talking:** short lines (under 8 words read best). Alternate speakers and leave a 0.3 s gap. Set the speaker's action state to talk for long exchanges. If the audience must understand the exact words, set `"cinema":{"speech":"text"}` on that shot or use a thought. Use `icon` when the automatic pictogram would be wrong.
- **Crowd arc** (hazard films): `behavior.crowd` must progress (calm → alert/freeze/film → panic/flee → hide/help → relief). Never leave it empty during a hazard.
- **Variety:** choose biome, style, time_of_day, weather and seed to fit THIS idea; a zombie film and a quake film must not look alike. Do not reuse defaults.
- Over 4 minutes: split into parts of at most 3 minutes, each its own JSON with continuous timestamps and a one-shot recap.

## Content rules

- Captions are `fact` or `narration`. A `fact` caption needs a `fact_id` from the brief and may not repeat a fact. `narration` makes no real-world claims. A claim not traceable to the brief is a FAIL. Dialogue and thoughts are characters' words, never facts, statistics or official statements.
- Fact briefs cover only the REAL world (place, agencies, science, official guidance). Fictional events (zombies, giant creatures) appear only in narration, dialogue and thoughts.
- No graphic injury. Show impact through environment, crowds, faces and sound.
- Never write "simulation" or "AI" in on-screen text, dialogue or thoughts. No news banners, anchors, tickers, fake official statements, broadcaster logos, invented quotes or real named people. Characters are fictional people with first names only.
- No meta text on screen about rules or omissions. The only "fictional/illustrative" wording is the end card.
- The end card gives the real safety action for a real hazard (earthquake: Drop, Cover, Hold On), or general preparedness for a fictional one, plus an "illustrative scenario" or "fictional scenario" line.
- **Priority:** these rules override the user's request. Drop conflicting elements (fake news look, fabricated statistics, banner text), list them under REJECTED REQUESTS, and continue. Never audit a rejected element as a requirement.
- Supported hazards: quake, zombie, tsunami, flood. For a tsunami, show the warning sign first (a `sea_retreat` shot), then `tsunami_wave`; the end card gives the real action (go to high ground or upper floors right away; do not wait for an official warning when the sea retreats). For a flood, raise the water over several shots with `flood_rise` (and `floating_debris`); the end card: move to higher ground, never walk or drive through flood water. Anything else (fire, typhoon/storm, landslide...) goes under MISSING CAPABILITIES; then either adapt to the nearest supported hazard or tell it as a hazard "none" character story using weather (storm, typhoon and thunder give rain and lightning), fire_small/smoke_plume events and the cast, and state which you chose.

## Output format

Headings in order: `1. FACT BRIEF`, `2. CAST & SET`, `3. BEAT SHEET`, `4. SCENARIO JSON`, `5. AUDIT`, then the optional notes. Start with the heading, no preamble. Keep the cast and beat sheet as short tables. After the JSON, tell the user in one line: "Paste this into Frame Studio, press Validate, then Play."

## Example (passes the engine validator and this skill's validator)

Copy its shape, not its content.

```json
{
 "schema_version":7,
 "meta":{"title":"What if a strong earthquake struck during school dismissal?","city":"Quezon City, Philippines","length_s":56,"disclaimer":"Illustrative scenario. Not a prediction."},
 "world":{"biome":"city","style":"city","seed":"qc-dismissal-quake","time_of_day":"late afternoon, school dismissal","weather":"clear"},
 "hazard":{"type":"quake"},
 "clock":{"mode":"local","start":"16:42","rate":1},
 "environment":{"wind":2},
 "cinema":{"grade":"warm","dof":0.35,"bloom":0.12,"vignette":0.2,"grain":0.04},
 "assets":[
  {"instance_id":"ana","asset_id":"human.student.v04","name":"Ana","position":[20,0,22],"rotation":[0,-135,0],"state":"phone","expression":"neutral","accessories":["backpack"],"path":[{"t":0,"position":[20,0,22]},{"t":22,"position":[20,0,22]},{"t":29,"position":[28,0,31]}]},
  {"instance_id":"lola","asset_id":"human.elder.v02","name":"Lola Nena","position":[21.2,0,20.6],"rotation":[0,-135,0],"state":"idle","expression":"happy","path":[{"t":0,"position":[21.2,0,20.6]},{"t":22,"position":[21.2,0,20.6]},{"t":29,"position":[29.4,0,29.6]}]},
  {"instance_id":"rico","asset_id":"human.medic.v03","name":"Rico","position":[42,0,8],"rotation":[0,45,0],"state":"idle","expression":"determined","path":[{"t":0,"position":[42,0,8]},{"t":29,"position":[42,0,8]},{"t":37,"position":[25.6,0,29.2]}]},
  {"instance_id":"cone1","asset_id":"prop.cone.v02","position":[24.5,0,27.5]}
 ],
 "chapters":[{"id":"ch1","title":"Dismissal","shots":[
  {"t0":0,"t1":4,"label":"What if a strong earthquake struck during school dismissal?","caption":{"type":"narration","text":"The ground begins to move."},"cam":{"preset":"closeup","move":"push","target_id":"ana","target_height":1.5,"offset":[-0.87,0.06,-0.62]},"events":["quake_shake"],"sfx":["deep_rumble","car_horns"],"behavior":{"crowd":"freeze","emotion":"shock"},"actions":[{"target":"ana","state":"phone","expression":"surprised","transition":0.3}],"thoughts":[{"target":"ana","text":"Is the ground moving?","start":0.6,"duration":3}],"cinema":{"dof":0.6}},
  {"t0":4,"t1":10,"label":"The whole district shakes","caption":{"type":"narration","text":"Traffic stops. Buildings sway."},"cam":{"preset":"aerial","move":"crane","target":"city district","height":170},"events":["quake_shake","traffic_jam"],"sfx":["rumble","horns"],"behavior":{"crowd":"alert"}},
  {"t0":10,"t1":15,"label":"Get low","caption":{"type":"fact","text":"Drop, Cover, and Hold On during the shaking.","fact_id":"F1"},"cam":{"preset":"ground","move":"push","target_id":"ana","target_height":0.9,"offset":[-4.53,1.1,-1.41]},"events":["quake_shake","dust_cloud"],"sfx":["rumble","glass_rattle"],"behavior":{"crowd":"hide"},"actions":[{"target":"ana","state":"crouch","expression":"fear","transition":0.4},{"target":"lola","state":"cower","expression":"fear","transition":0.6}],"dialogue":[{"target":"ana","text":"Lola, get down! Cover your head!","mood":"worried","start":0.5,"duration":2.6}]},
  {"t0":15,"t1":19,"label":"What else is falling?","caption":{"type":"narration","text":"Glass and masonry come down along the avenue."},"cam":{"preset":"window","move":"pull","target":"office window"},"events":["quake_shake","facade_fall","dust_cloud"],"sfx":["debris","concrete_crack"],"behavior":{"crowd":"panic"}},
  {"t0":19,"t1":22,"label":"Hold on until it stops","caption":{"type":"narration","text":"Seconds feel like minutes."},"cam":{"preset":"closeup","move":"push","target_id":"lola","target_height":1.15,"offset":[-0.6,0.1,-0.81]},"events":["quake_shake"],"sfx":["rumble"],"behavior":{"crowd":"hide","emotion":"fear"},"thoughts":[{"target":"lola","text":"Stay low. Wait.","start":0.3,"duration":2.5}],"cinema":{"dof":0.55}},
  {"t0":22,"t1":26,"label":"Where is it safe now?","caption":{"type":"narration","text":"When the shaking stops, people move to open ground."},"cam":{"preset":"pov","move":"track","target":"pedestrian on avenue"},"events":["crowd_evacuate"],"sfx":["footsteps","crowd"],"behavior":{"crowd":"flee"},"actions":[{"target":"ana","state":"walk","expression":"determined"},{"target":"lola","state":"walk","expression":"sad"}]},
  {"t0":26,"t1":29,"label":"Away from walls and glass","caption":{"type":"narration","text":"Ana guides her grandmother to the plaza."},"cam":{"preset":"over_shoulder","move":"push","target_id":"ana","target_height":1.3,"offset":[-1.22,0.7,-2.13]},"events":[],"sfx":["footsteps","distant_sirens"],"behavior":{"crowd":"flee"}},
  {"t0":29,"t1":33,"label":"A second danger?","caption":{"type":"narration","text":"Power fails. Smoke rises between the buildings."},"cam":{"preset":"rooftop","move":"pull","target":"city blocks"},"events":["power_outage","fire_small","smoke_plume","siren"],"sfx":["fire_crackle","siren"],"behavior":{"crowd":"flee"},"actions":[{"target":"ana","state":"idle"},{"target":"lola","state":"sit","expression":"sad","transition":0.8},{"target":"rico","state":"run"}]},
  {"t0":33,"t1":38,"label":"Help arrives","caption":{"type":"narration","text":"Responders check on people in the open."},"cam":{"preset":"ground","move":"orbit","target_id":"rico","target_height":1.0,"offset":[4.5,1.6,-3.5]},"events":["rescue_crew","siren"],"sfx":["siren","radio_chatter"],"behavior":{"crowd":"help"}},
  {"t0":38,"t1":44,"label":"Is anyone hurt?","caption":{"type":"narration","text":"A first check, then a plan."},"cam":{"preset":"closeup","move":"push","target_id":"ana","target_height":1.5,"offset":[-1.06,0.05,-0.28]},"events":["rescue_crew"],"sfx":["radio_chatter","crowd"],"behavior":{"crowd":"help","emotion":"relief"},"actions":[{"target":"rico","state":"talk"},{"target":"ana","state":"talk","expression":"relief","transition":0.5}],"dialogue":[{"target":"rico","text":"Is anyone hurt?","mood":"friendly","start":0.4,"duration":1.8},{"target":"ana","text":"We're okay. We did what we practiced.","mood":"friendly","start":2.5,"duration":3}],"cinema":{"dof":0.6}},
  {"t0":44,"t1":49,"label":"Stay in the open","caption":{"type":"narration","text":"Rico keeps them in the open."},"cam":{"preset":"closeup","move":"push","target_id":"rico","target_height":1.5,"offset":[0.88,0.05,0.67]},"events":[],"sfx":["radio_chatter","soft_ambient_music"],"behavior":{"crowd":"help","emotion":"determined"},"actions":[{"target":"ana","state":"idle"}],"dialogue":[{"target":"rico","text":"Stay here, away from the buildings.","mood":"worried","start":0.5,"duration":2.6}],"thoughts":[{"target":"ana","text":"Practice paid off.","start":1.2,"duration":3.2}],"cinema":{"dof":0.55}},
  {"t0":49,"t1":56,"label":"Would your family know what to do?","caption":{"type":"narration","text":"Practice before it happens."},"cam":{"preset":"aerial","move":"pull","target":"skyline at dusk","height":160},"events":["helicopter"],"sfx":["helicopter_rotors","music_resolve"],"behavior":{"crowd":"relief"},"actions":[{"target":"ana","state":"wave","expression":"happy"},{"target":"lola","state":"idle","expression":"relief"},{"target":"rico","state":"idle","expression":"happy"}]}
 ]}],
 "end_card":{"text":"DROP. COVER. HOLD ON.\nPractice with your family. Know your open spaces.","disclaimer":"Illustrative scenario. Not a prediction."}
}
```

## Validator

Save this as `validate_v7.py` and run `python3 validate_v7.py scenario.json`. It mirrors the engine's own validation (ERRORs) and adds Director quality checks (WARNINGs).

```python
#!/usr/bin/env python3
"""Frame Studio scenario validator, schema v7. Usage: python3 validate_v7.py scenario.json
Mirrors the engine's own validate() ERRORs, then adds Director quality WARNINGs.
Exit 1 if any ERROR. Prints real numbers so nothing is assumed PASS."""
import json, re, sys

PRE = "aerial ground rooftop waterline pov over_shoulder window orbit closeup".split()
MOV = "push pull crane track orbit".split()
EVT = ("quake_shake facade_fall dust_cloud power_outage crowd_evacuate traffic_jam fire_small smoke_plume "
       "siren helicopter rescue_crew zombie_spawn zombie_surge infection_spread "
       "sea_retreat tsunami_wave flood_rise flood_recede floating_debris").split()
CRW = "calm alert freeze film panic flee hide help relief".split()
EMOS = "neutral fear shock determined relief happy sad angry".split()
ZMB = "shamble chase sprint".split()
BIOMES = "city coast ocean sky jungle island custom".split()
SHADERS = "standard matte metal glass toon emissive".split()
MATERIALS = "natural soft ceramic faceted toon".split()
GRADES = "neutral warm cool mono".split()
MOODS = "friendly surprised worried".split()
SPEECH_ICONS = "heart question exclaim idea food home coin phone music sleep angry smile warning plus".split()
CINEMA_RANGES = {"dof": (0, 1), "focus": (0, 300), "radial": (0, 1), "bloom": (0, 1), "vignette": (0, 1), "grain": (0, 1)}
ASSET_KEYS = set("instance_id asset_id name position rotation scale state expression accessories shader path orient_to_path visible".split())
ACTION_KEYS = {"target", "state", "expression", "transition"}
AUTHORED_CAM = ("position", "look", "end_position", "end_look")
SHOT_KEYS = set("t0 t1 cam label caption events sfx behavior actions dialogue thoughts cinema".split())
CAM_KEYS = set("preset move target height target_id target_height offset position look end_position end_look fov".split())
SFX = [re.compile(p) for p in (  # engine soundTypes, first match wins
    "music|resolve|pad", "helicopter|rotor", "thunder", "rain|drizzle", "horn|brake|screech", "siren|alert|emergency|alarm",
    "gun|shot|rifle", "fire|crackle", "debris|fall|glass|concrete|stone|masonry|crack|impact|grit|rubble",
    "rumbl|quake|shak|ground|rattl|creak", "groan|zombie|undead", "scream|cry", "radio|instruction", "footstep|running",
    "crowd|shout|voice|people|chatter|panic|flee", "traffic|engine|car", "bird|chirp|gull", "wind|ambien|quiet|room|calm",
    "wave|sea|surf|water|flood|splash|tsunami|ocean|river")]
BANNED = re.compile(r"\bsimulation\b|\bAI\b|breaking news", re.I)

HUMAN_STATES = "idle walk run wave talk phone sit crouch cower cheer point carry swim dance jump climb fall sleep zombie think".split()
HUMAN_EXPR = "neutral happy sad angry fear surprised determined relief sleepy".split()
HUMAN_ACC = "backpack cap helmet glasses mask bag vest umbrella".split()
GROUPS = [  # (ids, states, expressions, accessories)
    ("human.civilian human.commuter human.medic human.firefighter human.police human.worker human.sailor human.pilot human.hiker "
     "human.chef human.vendor human.student human.child human.elder human.athlete human.diver human.raincoat human.survivor",
     HUMAN_STATES, HUMAN_EXPR, HUMAN_ACC),
    ("vehicle.compact vehicle.sedan vehicle.suv vehicle.taxi vehicle.police vehicle.ambulance vehicle.firetruck vehicle.bus "
     "vehicle.schoolbus vehicle.van vehicle.pickup vehicle.flatbed vehicle.tanker vehicle.garbage vehicle.jeepney vehicle.tractor",
     "idle drive turn_left turn_right doors_open hazard".split(), [], []),
    ("vehicle.bicycle vehicle.motorcycle vehicle.scooter", "idle drive turn_left turn_right".split(), [], []),
    ("boat.dinghy boat.canoe boat.speedboat boat.sailboat boat.fishing boat.ferry boat.cargo boat.raft",
     "idle sail storm anchor".split(), [], []),
    ("aircraft.propeller aircraft.jet aircraft.seaplane aircraft.helicopter aircraft.drone aircraft.glider",
     "idle fly bank_left bank_right land".split(), [], []),
    ("building.house building.apartment building.office building.shop building.hospital building.school building.firestation "
     "building.policestation building.warehouse building.cafe building.hotel building.skyscraper building.stilt_house building.hut "
     "building.hangar building.shelter", "idle doors_open damage".split(), [], []),
    ("building.lighthouse building.watertower", "idle damage".split(), [], []),
    ("tree.oak tree.banyan tree.acacia tree.pine tree.cypress tree.palm tree.banana tree.mangrove tree.bamboo tree.jungle "
     "tree.dead tree.sapling", "idle wind storm".split(), [], []),
    ("plant.fern plant.grass plant.reeds plant.bush plant.flower plant.potted plant.lily plant.kelp plant.coral plant.vine",
     "idle wind".split(), [], []),
    ("animal.dog animal.cat animal.deer animal.boar animal.cow animal.tiger animal.elephant animal.monkey",
     "idle walk run rest".split(), [], []),
    ("animal.gull animal.pigeon animal.parrot animal.eagle", "idle fly glide".split(), [], []),
    ("animal.fish animal.shark animal.dolphin animal.whale animal.turtle", "idle swim dart".split(), [], []),
    ("food.apple food.orange food.banana food.coconut food.watermelon food.pineapple food.bread food.burger food.pizza food.fish "
     "food.rice food.soup food.noodles food.coffee food.water food.can food.crate food.sack prop.bench prop.table prop.chair "
     "prop.lamp prop.traffic_light prop.cone prop.barrier prop.hydrant prop.sign prop.fence prop.crate prop.container prop.barrel "
     "prop.pallet prop.lifebuoy prop.anchor prop.buoy prop.dock prop.bridge prop.tent prop.umbrella prop.cart prop.generator "
     "prop.solar prop.antenna prop.suitcase prop.backpack prop.traffic_barrel environment.sun environment.moon environment.island "
     "environment.sandbank environment.mountain", ["idle"], [], []),
    ("trash.bag trash.bottle trash.can trash.cardboard trash.paper trash.tire trash.wood trash.metal trash.bin trash.dumpster "
     "trash.net trash.plastic", "idle scatter".split(), [], []),
    ("debris.concrete debris.brick debris.glass debris.asphalt debris.roof debris.beam debris.driftwood debris.rock",
     "idle scatter fall".split(), [], []),
    ("environment.water environment.cloud environment.waterfall", "idle animate".split(), [], []),
]
CATALOG = {i: (s, e, a) for ids, s, e, a in GROUPS for i in ids.split()}
ID_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_-]{0,63}$")


def num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and v == v and abs(v) != float("inf")


def vec(v):
    return isinstance(v, list) and len(v) == 3 and all(num(x) for x in v)


def resolve(asset_id):
    """Return (base_id, states, expressions, accessories) or None. Accepts base ids and .v01-.v24 variants."""
    if not isinstance(asset_id, str):
        return None
    m = re.match(r"^(.*)\.v(\d\d)$", asset_id)
    base = m.group(1) if m and 1 <= int(m.group(2)) <= 24 else asset_id
    if base in CATALOG:
        return (base,) + CATALOG[base]
    return None


def main(path):
    E, W = [], []
    txt = open(path, encoding="utf-8").read()
    i, j = txt.find("{"), txt.rfind("}")
    try:
        d = json.loads(txt[i:j + 1])
    except Exception as ex:  # noqa: BLE001
        print("ERROR: could not parse JSON:", ex)
        return 1
    if not isinstance(d, dict):
        print("ERROR: root must be an object"); return 1
    obj = lambda v: isinstance(v, dict)
    for k in ("meta", "world", "hazard", "clock", "end_card", "environment", "cinema"):
        if k in d and not obj(d[k]):
            E.append(f"{k} must be an object")
    meta, world, hazard = d.get("meta") or {}, d.get("world") or {}, d.get("hazard") or {}
    if "schema_version" in d and d["schema_version"] != 7:
        E.append("schema_version must be 7")
    biome = world.get("biome", "city")
    if biome not in BIOMES:
        E.append(f"world.biome {biome!r} not in {BIOMES}")
    if world.get("style") and world["style"] not in ("city", "town") and world.get("set") != "divisoria":
        W.append(f"world.style {world['style']!r} is not city/town (only the divisoria set uses other styles)")
    ht = hazard.get("type", "none")
    if ht not in ("quake", "zombie", "tsunami", "flood", "none"):
        W.append(f"hazard {ht!r} is not rendered (plays as plain city). Put it under MISSING CAPABILITIES and adapt.")
    if ht in ("quake", "zombie") and biome != "city":
        W.append(f"hazard {ht!r} with biome {biome!r}: hazard effects and the background crowd only exist in the city biome")
    if ht in ("tsunami", "flood"):
        evs = {e for c in (d.get("chapters") or []) if isinstance(c, dict) for s in (c.get("shots") or []) if isinstance(s, dict)
               for e in (s.get("events") or []) if isinstance(e, str)}
        if biome != "city":
            W.append(f"The {ht} hazard is drawn in the city biome; in {biome!r} only the water level follows it.")
        if ht == "tsunami" and "tsunami_wave" not in evs:
            W.append("Tsunami hazard has no tsunami_wave event, so no wave will arrive.")
        if ht == "flood" and "flood_rise" not in evs:
            W.append("Flood hazard has no flood_rise event, so the water stays low.")
    if world.get("finish") not in (None, "toy", "classic"): W.append("world.finish should be toy or classic (ignored)")
    clock = d.get("clock") or {}
    if isinstance(clock.get("start"), str) and not re.match(r"^(?:[01]?\d|2[0-3]):[0-5]\d$", clock["start"]):
        E.append("clock.start must be HH:MM")

    # ---- assets ----
    cast = {}
    assets = d.get("assets", [])
    if not isinstance(assets, list):
        E.append("assets must be an array"); assets = []
    if len(assets) > 250:
        E.append("at most 250 assets")
    for n, a in enumerate(assets):
        p = f"assets[{n}]"
        if not obj(a):
            E.append(p + " must be an object"); continue
        for k in a:
            if k not in ASSET_KEYS:
                E.append(f"{p}: unknown property {k!r}")
        iid = a.get("instance_id")
        if not isinstance(iid, str) or not ID_RE.match(iid):
            E.append(f"{p}.instance_id must be a letter then letters/digits/_/- (max 64)"); continue
        if iid in cast:
            E.append(f"duplicate instance_id {iid}")
        r = resolve(a.get("asset_id"))
        if r is None:
            if isinstance(a.get("asset_id"), str) and a["asset_id"].startswith("extension."):
                W.append(f"{p}: {a['asset_id']} only works if the user has imported that extension pack")
                r = ("extension", None, None, None)
            else:
                E.append(f"{p}.asset_id unknown: {a.get('asset_id')!r}"); r = ("?", None, None, None)
        cast[iid] = r
        for k in ("position", "rotation", "scale"):
            if k in a and (not vec(a[k]) or any(abs(x) > 10000 for x in a[k]) or (k == "scale" and any(x <= 0 or x > 100 for x in a[k]))):
                E.append(f"{p}.{k} must be a finite [x,y,z] in range")
        states, exprs, accs = r[1], r[2], r[3]
        if "state" in a and states is not None and a["state"] not in states:
            E.append(f"{p}: {r[0]} has no state {a['state']!r} (has: {' '.join(states)})")
        if "expression" in a and exprs is not None and a["expression"] not in exprs:
            E.append(f"{p}: {r[0]} has no expression {a['expression']!r}")
        if "accessories" in a and accs is not None and (not isinstance(a["accessories"], list) or any(x not in accs for x in a["accessories"])):
            E.append(f"{p}: unsupported accessories {a['accessories']!r}")
        if "shader" in a and a["shader"] not in SHADERS:
            E.append(f"{p}: shader must be one of {SHADERS}")
        for k in ("visible", "orient_to_path"):
            if k in a and not isinstance(a[k], bool):
                E.append(f"{p}.{k} must be true/false")
        if "path" in a:
            pt = a["path"]
            if not isinstance(pt, list) or not 2 <= len(pt) <= 100:
                E.append(f"{p}.path needs 2-100 points")
            else:
                for k2, q in enumerate(pt):
                    if not obj(q) or not num(q.get("t")) or q["t"] < 0 or not vec(q.get("position")) or (k2 and q["t"] <= pt[k2 - 1].get("t", -1)):
                        E.append(f"{p}.path point {k2} invalid (t must rise strictly, position [x,y,z])"); break

    # ---- shots ----
    if not isinstance(d.get("chapters"), list):
        print("ERROR: chapters must be an array"); return 1
    shots = [s for c in d["chapters"] if obj(c) for s in (c.get("shots") or [])]
    if not shots:
        print("ERROR: no shots"); return 1
    lengths, closeups, crowd_seq, rehooks, facts, cover = [], [], [], [], [], set()
    talk_lines, thought_count, cast_shots = 0, 0, 0
    prev = None
    for k, s in enumerate(shots, 1):
        n = f"Shot {k}"
        if not obj(s):
            E.append(n + " must be an object"); continue
        t0, t1 = s.get("t0"), s.get("t1")
        if not num(t0) or not num(t1) or t0 < 0 or t1 <= t0:
            E.append(f"{n}: bad t0/t1 ({t0}, {t1})"); continue
        L = t1 - t0
        lengths.append(L)
        if prev is not None and abs(t0 - prev) > .01:
            E.append(f"{n}: gap or overlap (starts {t0}, previous ended {prev})")
        prev = t1
        if L < 3 or L > 9:
            W.append(f"{n}: length {L}s outside 3-9s")
        cam = s.get("cam") or {}
        if not obj(cam):
            E.append(n + ": cam must be an object"); cam = {}
        pr, mv = cam.get("preset"), cam.get("move")
        if pr not in PRE: E.append(f"{n}: unknown preset {pr!r}")
        if mv not in MOV: E.append(f"{n}: unknown move {mv!r}")
        if pr == "pov" and mv not in ("push", "track"): E.append(f"{n}: pov must use push or track")
        cover.add(pr)
        tid = cam.get("target_id")
        if tid is not None:
            cast_shots += 1
            if tid not in cast: E.append(f"{n}: cam.target_id {tid!r} is not a placed instance_id")
            if mv in ("crane", "track"): W.append(f"{n}: with target_id only push/pull/orbit move the camera; {mv!r} gives a static frame")
            if pr == "pov": W.append(f"{n}: pov with target_id is not first-person; use over_shoulder or ground")
        if "offset" in cam and (not vec(cam["offset"]) or all(x == 0 for x in cam["offset"])):
            E.append(f"{n}: cam.offset needs a nonzero [x,y,z]")
        if "target_height" in cam and (not num(cam["target_height"]) or abs(cam["target_height"]) > 1000):
            E.append(f"{n}: cam.target_height must be within +-1000")
        for x in AUTHORED_CAM:
            if x in cam and (not vec(cam[x]) or any(abs(v) > 1000 for v in cam[x])): E.append(f"{n}: cam.{x} needs [x,y,z] within +-1000")
        if ("position" in cam) != ("look" in cam): W.append(f"{n}: cam.position and cam.look work only together (ignored)")
        elif "position" not in cam and ("end_position" in cam or "end_look" in cam): W.append(f"{n}: end_position/end_look need position and look (ignored)")
        if "fov" in cam and (not num(cam["fov"]) or not 15 <= cam["fov"] <= 100): E.append(f"{n}: cam.fov must be 15-100")
        if tid is not None and "position" in cam: W.append(f"{n}: target_id overrides the authored position/look")
        for x in s:
            if x not in SHOT_KEYS: W.append(f"{n}: unknown shot field {x!r} (ignored)")
        for x in cam:
            if x not in CAM_KEYS: W.append(f"{n}: unknown cam field {x!r} (ignored)")
        for e in s.get("events") or []:
            if e not in EVT: E.append(f"{n}: unknown event {e!r}")
            elif ht == "none" and e.startswith(("quake", "zombie", "infection")): W.append(f"{n}: event {e} with hazard 'none'")
        b = s.get("behavior") or {}
        if b.get("crowd") and b["crowd"] not in CRW: E.append(f"{n}: unknown crowd {b['crowd']!r}")
        if b.get("emotion") and b["emotion"] not in EMOS: E.append(f"{n}: unknown emotion {b['emotion']!r}")
        if b.get("zombies") and b["zombies"] not in ZMB: E.append(f"{n}: unknown zombies {b['zombies']!r}")
        crowd_seq.append(b.get("crowd") or "-")
        if pr == "closeup":
            who = tid or "crowd"
            expr = None
            closeups.append((k, who, b.get("emotion")))
            if not tid and not b.get("emotion"): W.append(f"{n}: crowd closeup has no behavior.emotion")
        if s.get("events") and not b.get("crowd") and ht != "none":
            W.append(f"{n}: has events but no behavior.crowd")
        for name in s.get("sfx") or []:
            if not isinstance(name, str) or not any(r.search(name) for r in SFX): W.append(f"{n}: sfx {name!r} matches no engine sound (silent)")
        # actions
        acts = s.get("actions", [])
        if not isinstance(acts, list):
            E.append(f"{n}: actions must be an array"); acts = []
        seen = set()
        for a in acts:
            if not obj(a): E.append(f"{n}: action must be an object"); continue
            for kk in a:
                if kk not in ACTION_KEYS: E.append(f"{n}: unknown action property {kk!r}")
            r = cast.get(a.get("target"))
            if not r: E.append(f"{n}: action target {a.get('target')!r} not placed"); continue
            if a["target"] in seen: E.append(f"{n}: two actions for {a['target']} (one per target per shot)")
            seen.add(a["target"])
            if "state" in a and r[1] is not None and a["state"] not in r[1]: E.append(f"{n}: {a['target']} ({r[0]}) has no state {a['state']!r}")
            if "expression" in a and r[2] is not None and a["expression"] not in r[2]: E.append(f"{n}: {a['target']} ({r[0]}) has no expression {a['expression']!r}")
            if "transition" in a and (not num(a["transition"]) or not 0 <= a["transition"] <= 5): E.append(f"{n}: action transition must be 0-5")
        # dialogue / thoughts
        for key in ("dialogue", "thoughts"):
            items = s.get(key, [])
            if not isinstance(items, list): E.append(f"{n}: {key} must be an array"); continue
            spans = []
            for m in items:
                if not obj(m): E.append(f"{n}: {key} entry must be an object"); continue
                for kk in m:
                    if kk not in ("target", "text", "start", "duration") + (("mood", "icon") if key == "dialogue" else ()): W.append(f"{n}: unknown {key} field {kk!r} (ignored)")
                if key == "dialogue" and "icon" in m and m["icon"] not in SPEECH_ICONS: E.append(f"{n}: dialogue icon must be one of {SPEECH_ICONS}")
                if m.get("target") not in cast: E.append(f"{n}: {key} target {m.get('target')!r} not placed")
                elif cast[m["target"]][0].split(".")[0] != "human" and key == "dialogue": W.append(f"{n}: {m['target']} is not a human rig; no lip-sync")
                if not isinstance(m.get("text"), str) or len(m["text"]) > 200: E.append(f"{n}: {key} text missing or over 200 chars")
                for kk in ("start", "duration"):
                    if kk in m and (not num(m[kk]) or m[kk] < 0 or m[kk] > L): E.append(f"{n}: {key} {kk} outside 0-{L}")
                st = m.get("start", .4 if key == "dialogue" else 0)
                du = m.get("duration", 2.2 if key == "dialogue" else L)
                if num(st) and num(du):
                    if st + du > L + .01: W.append(f"{n}: {key} for {m.get('target')} runs past the cut (start+duration {st+du:.1f} > {L})")
                    spans.append((st, st + du, m.get("target")))
                if key == "dialogue":
                    talk_lines += 1
                    if m.get("mood", "friendly") not in MOODS: W.append(f"{n}: mood {m.get('mood')!r} plays as friendly (use {MOODS})")
                    if BANNED.search(m.get("text", "")): E.append(f"{n}: banned wording in dialogue")
                else:
                    thought_count += 1
                    if isinstance(m.get("text"), str) and len(m["text"]) > 40: W.append(f"{n}: thought over 40 chars may not fit the bubble")
                    if BANNED.search(m.get("text", "")): E.append(f"{n}: banned wording in thought")
            if key == "dialogue":
                spans.sort()
                for x, y in zip(spans, spans[1:]):
                    if y[0] < x[1] - .05: W.append(f"{n}: dialogue lines overlap ({x[2]} and {y[2]}); give each speaker their own time")
        if "cinema" in s: check_cinema(s["cinema"], n, E)
        cap = s.get("caption") or {}
        if isinstance(cap, str): cap = {"type": "narration", "text": cap}
        if cap.get("type") not in (None, "fact", "narration"): W.append(f"{n}: caption.type should be fact or narration")
        if cap.get("type") == "fact":
            fid = cap.get("fact_id")
            if not fid: E.append(f"{n}: fact caption has no fact_id")
            elif fid in facts: E.append(f"{n}: fact_id {fid} reused")
            else: facts.append(fid)
        if BANNED.search(f"{s.get('label', '')} {cap.get('text', '')}"): E.append(f"{n}: banned on-screen wording")
        if str(s.get("label") or "").strip().endswith("?"): rehooks.append(round(t0))
    if "cinema" in d: check_cinema(d["cinema"], "cinema", E)
    env = d.get("environment")
    if obj(env): check_env(env, E)
    if shots and shots[0].get("t0") != 0: E.append("first shot must start at 0")

    # ---- Director quality ----
    if lengths and lengths[0] > 5: W.append(f"Cold open: shot 1 is {lengths[0]}s (3-5s)")
    if not str(shots[0].get("label") or "").strip().endswith("?"): W.append("Cold open: shot 1 label should be the title question")
    for x in range(2, len(lengths)):
        if lengths[x] == lengths[x - 1] == lengths[x - 2]:
            W.append(f"Pacing: shots {x-1}-{x+1} all {lengths[x]}s"); break
    third = max(1, len(lengths) // 3)
    a1 = sum(lengths[:third]) / third
    mid = lengths[third:2 * third] or lengths[:third]
    b1 = sum(mid) / len(mid)
    if ht != "none" and b1 >= a1: W.append(f"Pacing: middle third {b1:.1f}s vs first third {a1:.1f}s (shorten as tension rises)")
    if ht != "none":
        for need, opts in (("aerial", {"aerial", "orbit"}), ("ground", {"ground"}), ("pov", {"pov"}), ("rooftop/window", {"rooftop", "window"})):
            if not cover & opts: W.append(f"Camera coverage: no {need} shot")
    if len(closeups) < 4: W.append(f"Only {len(closeups)} closeups (aim for 4+)")
    gaps = [y - x for x, y in zip(rehooks, rehooks[1:])]
    if not rehooks: W.append("No question labels (re-hooks)")
    elif gaps and max(gaps) > 35: W.append(f"Re-hook gap of {max(gaps)}s (aim for ~30s)")
    total = shots[-1].get("t1", 0)
    if meta.get("length_s") and abs(total - meta["length_s"]) > 1: W.append(f"Runtime {total}s differs from meta.length_s {meta['length_s']}")
    ec = d.get("end_card")
    if not ec: E.append("missing end_card")
    else:
        blob = f"{ec.get('text', '')} {ec.get('disclaimer', '')}"
        if not re.search(r"illustrative|fictional", blob, re.I): E.append("end_card needs an 'illustrative scenario' or 'fictional scenario' line")
        if BANNED.search(blob): E.append("banned wording in end_card")
    for iid, r in cast.items():
        if r[0].startswith("human.") and not any(iid == (s.get("cam") or {}).get("target_id") for s in shots if obj(s)):
            W.append(f"cast member {iid} is never a camera target_id (the audience may never see them)")

    print("== STATS ==")
    print(f"shots: {len(shots)}  runtime: {total}s  biome: {biome}  hazard: {ht}  placed assets: {len(cast)}")
    print("lengths:", lengths)
    print(f"avg first third {a1:.1f}s -> middle third {b1:.1f}s")
    print("closeups (shot, subject, emotion):", closeups)
    print("crowd sequence:", crowd_seq)
    print(f"shots framed on cast (target_id): {cast_shots}  dialogue lines: {talk_lines}  thoughts: {thought_count}")
    print("question labels at t =", rehooks)
    print("fact_ids used:", facts)
    print(f"== {len(E)} ERROR(S) ==")
    for x in E: print(" -", x)
    print(f"== {len(W)} WARNING(S) ==")
    for x in W: print(" -", x)
    return 1 if E else 0


def check_cinema(fx, n, E):
    if not isinstance(fx, dict): E.append(f"{n}: cinema must be an object"); return
    for k, (lo, hi) in CINEMA_RANGES.items():
        if k in fx and (not num(fx[k]) or not lo <= fx[k] <= hi): E.append(f"{n}: cinema.{k} must be {lo}-{hi}")
    if "material" in fx and fx["material"] not in MATERIALS: E.append(f"{n}: cinema.material must be one of {MATERIALS}")
    if "grade" in fx and fx["grade"] not in GRADES: E.append(f"{n}: cinema.grade must be one of {GRADES}")
    if "speech" in fx and fx["speech"] not in ("icons", "text", "off"): E.append(f"{n}: cinema.speech must be icons, text or off")


def check_env(e, E):
    def rng(o, k, lo, hi, p):
        if isinstance(o, dict) and k in o and (not num(o[k]) or not lo <= o[k] <= hi): E.append(f"{p}.{k} must be {lo}-{hi}")
    for k in ("sun", "moon", "clouds", "water", "fog"):
        if k in e and not isinstance(e[k], dict): E.append(f"environment.{k} must be an object")
    for k in ("sun", "moon"):
        if isinstance(e.get(k), dict) and "enabled" in e[k] and not isinstance(e[k]["enabled"], bool): E.append(f"{k}.enabled must be true/false")
    rng(e.get("sun"), "azimuth", -360, 360, "sun"); rng(e.get("sun"), "elevation", -90, 90, "sun"); rng(e.get("sun"), "intensity", 0, 5, "sun")
    rng(e.get("moon"), "phase", 0, 1, "moon"); rng(e.get("moon"), "intensity", 0, 3, "moon")
    rng(e.get("clouds"), "coverage", 0, 1, "clouds"); rng(e.get("clouds"), "speed", -20, 20, "clouds")
    rng(e, "wind", 0, 5, "environment")
    w = e.get("water") or {}
    rng(w, "level", -100, 100, "water"); rng(w, "wave_height", 0, 5, "water"); rng(w, "speed", 0, 5, "water")
    if "color" in w and not re.match(r"^#[0-9a-fA-F]{6}$", str(w["color"])): E.append("water.color must be #rrggbb")
    f = e.get("fog") or {}
    rng(f, "near", 0, 1000, "fog"); rng(f, "far", 1, 2000, "fog")
    if f.get("far", 520) <= f.get("near", 160): E.append("fog.far must exceed fog.near")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__); sys.exit(2)
    sys.exit(main(sys.argv[1]))
```