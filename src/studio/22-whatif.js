// "What if…" box (Story tab): type a sentence, get a film. The free writer runs in the browser with no AI and no server:
// it reads the sentence for a disaster (earthquake, zombies, flood, tsunami), a place, the time of day, the weather and
// "short", then builds the shots from story beats (each with a few wordings, picked by a seed from the sentence, so the
// same sentence gives the same film and "Try another version" reshuffles). The script it writes is the same format as
// the samples (mkS), so it validates and plays like any other story. 23-ai-writer.js adds the optional own-key AI.
const WHATIF_EXAMPLES = ['What if a magnitude 7.5 earthquake hit Manila at night?', 'What if a zombie outbreak started in Cebu?', 'What if a typhoon flooded Quezon City?', 'What if a tsunami reached Davao at dawn?', 'What if the city went quiet for a day?'];
let whatifSeed = 0, whatifLast = '';

function initWhatIf() {
  const chips = $('whatifExamples');
  for (const text of WHATIF_EXAMPLES) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = text.replace(/^What if /, '').replace(/\?$/, '');
    b.onclick = () => { $('whatifPrompt').value = text; whatifPreview(); };
    chips.append(b);
  }
  $('whatifPrompt').oninput = whatifPreview;
  $('whatifPrompt').onkeydown = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) makeWhatIfFilm(false); };
  $('whatifMake').onclick = () => makeWhatIfFilm(false);
  $('whatifRemix').onclick = () => makeWhatIfFilm(true);
  whatifPreview();
}

// What the free writer understood, shown under the box while you type.
function whatifPreview() {
  const text = $('whatifPrompt').value.trim(), note = $('whatifNote');
  if (!text) { note.textContent = 'Type any what-if. The free writer understands earthquakes, zombies, floods and tsunamis, a place, the time and the weather.'; return; }
  const p = parseWhatIf(text);
  note.textContent = 'Understood: ' + [WHATIF_HAZARDS[p.hazard].name, p.place, p.time, p.weather, p.short ? 'short film' : ''].filter(Boolean).join(' · ');
}

const WHATIF_HAZARDS = {
  quake: { name: 'earthquake', words: /earthquake|quake|tremor|magnitude|seismic|fault|aftershock/ },
  zombie: { name: 'zombie outbreak', words: /zombie|undead|walking dead|infect|outbreak|virus|plague/ },
  tsunami: { name: 'tsunami', words: /tsunami|tidal wave|giant wave/ },
  flood: { name: 'flood', words: /flood|typhoon|storm surge|monsoon|deluge|inundat|super ?storm|heavy rain/ },
  none: { name: 'city story (no disaster)', words: /$^/ },
};
const WHATIF_PLACES = ['Metro Manila', 'Quezon City', 'Manila', 'Makati', 'Taguig', 'Pasig', 'Cebu', 'Davao', 'Iloilo', 'Baguio', 'Cagayan de Oro', 'Zamboanga', 'Bacolod', 'Tacloban', 'Legazpi', 'Tokyo', 'Jakarta', 'Los Angeles', 'San Francisco', 'New York', 'London'];

function parseWhatIf(text) {
  const low = text.toLowerCase(), hazard = Object.keys(WHATIF_HAZARDS).find(k => WHATIF_HAZARDS[k].words.test(low)) || 'none';
  let place = WHATIF_PLACES.find(c => low.includes(c.toLowerCase()));
  if (!place) { const m = text.match(/\b(?:in|hit|hits|struck|strikes|reached|reaches|across|over|flooded|floods)\s+((?:the\s+)?[A-Z][\w.'-]*(?:\s+[A-Z][\w.'-]*)*)/); place = m ? m[1].replace(/^the\s+/i, '') : ''; }
  const time = /midnight|night|after dark/.test(low) ? 'night' : /dawn|sunrise|morning/.test(low) ? 'dawn' : /rush hour/.test(low) ? 'rush hour' : /evening|sunset|dusk/.test(low) ? 'evening' : '';
  const weather = /typhoon|storm|thunder/.test(low) ? 'storm' : /rain|monsoon|flood/.test(low) ? 'heavy rain' : /fog|mist|haze/.test(low) ? 'fog' : '';
  const magnitude = (low.match(/magnitude\s*(\d(?:\.\d)?)/) || [])[1];
  return { text, hazard, place, time, weather, magnitude, short: /\bshort\b|quick|30 ?s/.test(low) };
}

// small seeded generator so a sentence always gives the same wording
function whatifRng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function whatifHash(text) { let h = 2166136261; for (const ch of text.toLowerCase()) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }

// Beats: [seconds, camera, move, camera target, [labels], [captions], events, sounds, behaviour]. {place} fills in.
const WHATIF_BEATS = {
  quake: [
    [4, 'closeup', 'push', 'commuter face', ['{title}'], ['The ground begins to move.', 'It starts as a faint rumble.'], ['quake_shake'], ['deep_rumble', 'car_horns'], { crowd: 'freeze', emotion: 'shock' }],
    [5, 'aerial', 'crane', 'city district', ['A whole district shakes', 'The shaking spreads'], ['Traffic stops. Buildings sway.', 'Roads ripple. Windows rattle.'], ['quake_shake', 'traffic_jam'], ['rumble', 'horns']],
    [4, 'window', 'pull', 'office window', ['Inside the buildings', 'Above the street'], ['Glass rattles. Dust falls.', 'Shelves empty onto the floor.'], ['quake_shake', 'dust_cloud'], ['glass_rattle', 'rumble']],
    [5, 'pov', 'track', 'pedestrian on avenue', ['Where do you go?', 'What do you do first?'], ['Drop, Cover, and Hold On.', 'Get down, cover your head, hold on.'], ['quake_shake', 'crowd_evacuate'], ['footsteps', 'rumble'], { crowd: 'hide' }],
    [5, 'ground', 'track', 'damaged building frontage', ['The damage begins to show', 'Walls give way'], ['Masonry falls into the street.', 'Old facades crack and drop.'], ['facade_fall', 'dust_cloud'], ['debris', 'concrete_crack'], { crowd: 'panic' }],
    [4, 'rooftop', 'pull', 'city blocks', ['The lights go out', 'The power fails'], ['Power fails across {place}.', 'Whole blocks go dark.'], ['power_outage', 'traffic_jam', 'smoke_plume'], ['distant_sirens']],
    [5, 'ground', 'push', 'damaged building frontage', ['A second danger', 'Then, smoke'], ['A small fire starts between the buildings.', 'Broken lines spark a fire.'], ['fire_small', 'smoke_plume', 'siren'], ['fire_crackle', 'siren'], { crowd: 'flee' }],
    [5, 'closeup', 'pull', 'survivor face', ['Move to open space', 'Away from the walls'], ['People leave the buildings behind.', 'Open ground is safer now.'], ['crowd_evacuate'], ['running_footsteps'], { crowd: 'flee', emotion: 'fear' }],
    [5, 'ground', 'track', 'open assembly area', ['Help arrives', 'Neighbours help first'], ['Responders move carefully through the debris.', 'People check on each other.'], ['crowd_evacuate', 'rescue_crew', 'siren'], ['siren', 'radio_chatter'], { crowd: 'help' }],
    [5, 'aerial', 'pull', 'city district', ['Can help reach everyone?', 'A long night ahead'], ['Blocked roads slow the work.', 'Aftershocks keep everyone outside.'], ['rescue_crew', 'helicopter', 'smoke_plume'], ['helicopter_rotors', 'sirens'], { crowd: 'relief' }],
    [5, 'aerial', 'pull', 'skyline at dusk', ['Know what to do', 'Preparedness begins with you'], ['Practice Drop, Cover, and Hold On before it happens.', 'Make a plan. Pack a go-bag.'], [], ['music_resolve'], { crowd: 'relief' }],
  ],
  zombie: [
    [4, 'closeup', 'push', 'civilian face', ['{title}'], ['Something is wrong.', 'Someone is not acting right.'], [], ['wind', 'distant_scream'], { crowd: 'alert', emotion: 'fear' }],
    [5, 'aerial', 'pull', 'city district', ['It starts with one', 'Nobody notices at first'], ['One person. Then another.', 'A stumble. A scream.'], ['zombie_spawn', 'siren'], ['siren', 'distant_scream'], { crowd: 'alert', zombies: 'shamble' }],
    [4, 'ground', 'push', 'intersection', ['Nobody understands yet', 'Phones come out'], ['People stop and stare.', 'Everyone films. Nobody runs.'], ['zombie_spawn'], ['groan', 'crowd'], { crowd: 'film', zombies: 'shamble' }],
    [4, 'pov', 'track', 'avenue', ['RUN', 'Now they run'], ['The first scream.', 'Then everyone moves at once.'], ['zombie_surge'], ['scream', 'running_footsteps'], { crowd: 'flee', zombies: 'sprint' }],
    [5, 'over_shoulder', 'push', 'person running', ['No time to look back', 'Keep moving'], ['Keep moving.', 'Do not stop.'], ['zombie_surge'], ['scream', 'footsteps'], { crowd: 'flee', zombies: 'sprint', emotion: 'fear' }],
    [4, 'closeup', 'push', 'zombie face', ['Infected', 'Something has taken over'], ['It is spreading.', 'They were neighbours an hour ago.'], ['infection_spread'], ['groan'], { crowd: 'panic', zombies: 'chase' }],
    [5, 'rooftop', 'pull', 'city blocks', ['The streets fill', '{place} turns on itself'], ['The city turns on itself.', 'Every street is a choice.'], ['traffic_jam', 'smoke_plume', 'infection_spread'], ['scream', 'groan', 'sirens'], { crowd: 'panic', zombies: 'chase' }],
    [5, 'ground', 'track', 'open assembly area', ['No safe place', 'Find open ground'], ['Survivors run for open ground.', 'Groups form. Doors lock.'], ['crowd_evacuate', 'fire_small'], ['scream', 'fire_crackle'], { crowd: 'flee', zombies: 'sprint' }],
    [5, 'window', 'pull', 'office window', ['Hold the line', 'Help is coming'], ['Responders arrive.', 'A siren gets closer.'], ['rescue_crew', 'siren'], ['siren', 'radio_chatter'], { crowd: 'help', zombies: 'shamble' }],
    [5, 'closeup', 'pull', 'survivor face', ['Stay together', 'Not alone'], ['Hold on to each other.', 'Count everyone. Keep going.'], ['rescue_crew'], ['soft_ambient_music', 'groan'], { crowd: 'help', emotion: 'determined' }],
    [6, 'aerial', 'pull', 'skyline at dusk', ['What would you do?', 'Where would you go?'], ['Think about your own city.', 'Know your exits.'], ['helicopter'], ['music_resolve'], { crowd: 'relief' }],
  ],
  flood: [
    [4, 'closeup', 'push', 'commuter face', ['{title}'], ['The rain will not stop.', 'Hours of rain. Then more.'], [], ['rain', 'thunder'], { crowd: 'alert', emotion: 'fear' }],
    [5, 'aerial', 'crane', 'city district', ['The drains give up', 'Water finds the low streets'], ['Streets become rivers.', 'Low roads fill first.'], ['flood_rise', 'traffic_jam'], ['rain', 'water'], { crowd: 'alert' }],
    [5, 'ground', 'track', 'intersection', ['Cars stall', 'Traffic stops'], ['Never drive into floodwater.', 'Engines die in the rising water.'], ['flood_rise', 'traffic_jam'], ['water', 'horns'], { crowd: 'freeze' }],
    [5, 'pov', 'track', 'pedestrian on avenue', ['Go higher', 'Move up, not out'], ['Move to higher ground now.', 'Upstairs. Rooftops. Higher roads.'], ['flood_rise', 'crowd_evacuate'], ['water', 'footsteps'], { crowd: 'flee', emotion: 'fear' }],
    [4, 'rooftop', 'pull', 'city blocks', ['The power fails', 'Darkness and water'], ['Power is cut across {place}.', 'Whole blocks go dark.'], ['power_outage', 'floating_debris'], ['rain', 'water'], { crowd: 'hide' }],
    [5, 'ground', 'push', 'open assembly area', ['Everything floats', 'The water carries things'], ['Debris drifts down the avenue.', 'Floodwater hides open drains and wires.'], ['floating_debris', 'flood_rise'], ['water', 'debris'], { crowd: 'panic' }],
    [5, 'window', 'pull', 'office window', ['Waiting for help', 'Signal for help'], ['Families wave from windows.', 'Stay where rescuers can see you.'], ['rescue_crew', 'siren'], ['siren', 'radio_chatter'], { crowd: 'help' }],
    [5, 'aerial', 'orbit', 'city district', ['Rescue begins', 'Boats and helicopters'], ['Responders reach the stranded.', 'Help moves street by street.'], ['rescue_crew', 'helicopter'], ['helicopter_rotors', 'water'], { crowd: 'help' }],
    [5, 'ground', 'pull', 'damaged building frontage', ['The water goes down', 'Slowly, the streets return'], ['The flood recedes. The cleanup starts.', 'Mud everywhere. But everyone counted.'], ['flood_recede'], ['water', 'soft_ambient_music'], { crowd: 'relief' }],
    [6, 'aerial', 'pull', 'skyline at dusk', ['Know your route', 'Before the next storm'], ['Know your evacuation route before the rain starts.', 'Turn around. Do not wade or drive through floodwater.'], [], ['music_resolve'], { crowd: 'relief' }],
  ],
  tsunami: [
    [4, 'closeup', 'push', 'commuter face', ['{title}'], ['A strong shake. Then quiet.', 'The shaking stops. Nobody moves.'], ['quake_shake'], ['deep_rumble'], { crowd: 'freeze', emotion: 'shock' }],
    [5, 'aerial', 'pull', 'city district', ['The sea pulls back', 'The shore looks wrong'], ['The water drains away from the coast.', 'The seafloor is showing.'], ['sea_retreat'], ['wind', 'water'], { crowd: 'film' }],
    [4, 'ground', 'push', 'intersection', ['People stop to look', 'A strange sight'], ['That is the warning.', 'A retreating sea means run.'], ['sea_retreat'], ['crowd', 'wind'], { crowd: 'film' }],
    [5, 'pov', 'track', 'avenue', ['Go to high ground', 'Go now'], ['Do not wait for an official alert.', 'Run inland. Climb higher.'], ['siren', 'crowd_evacuate'], ['siren', 'running_footsteps'], { crowd: 'flee', emotion: 'fear' }],
    [5, 'rooftop', 'pull', 'city blocks', ['The wave arrives', 'Here it comes'], ['The water comes back, fast.', 'It does not stop at the beach.'], ['tsunami_wave'], ['water', 'rumble'], { crowd: 'panic' }],
    [5, 'ground', 'track', 'damaged building frontage', ['It carries everything', 'Streets disappear'], ['Cars and debris move with the water.', 'The ground floors fill in seconds.'], ['tsunami_wave', 'floating_debris'], ['water', 'debris'], { crowd: 'flee' }],
    [5, 'window', 'pull', 'office window', ['Higher still', 'Stay up'], ['More waves can follow the first.', 'The first wave is often not the biggest.'], ['floating_debris'], ['water', 'siren'], { crowd: 'hide' }],
    [5, 'aerial', 'orbit', 'city district', ['Help comes from above', 'Rescue begins'], ['Helicopters search the rooftops.', 'Responders reach the survivors.'], ['rescue_crew', 'helicopter'], ['helicopter_rotors', 'radio_chatter'], { crowd: 'help' }],
    [6, 'aerial', 'pull', 'skyline at dusk', ['Know the signs', 'Remember this'], ['If the ground shakes or the sea retreats, go to high ground.', 'Know your nearest high ground today.'], [], ['music_resolve'], { crowd: 'relief' }],
  ],
  none: [
    [5, 'aerial', 'push', 'city district', ['{title}'], ['Imagine it.', 'Picture it for a moment.'], [], ['wind', 'traffic'], { crowd: 'calm' }],
    [5, 'ground', 'track', 'avenue', ['An ordinary morning', 'It starts like any day'], ['People go about their day.', 'Nobody expects anything.'], [], ['traffic', 'footsteps'], { crowd: 'calm' }],
    [5, 'closeup', 'push', 'civilian face', ['Then something changes', 'Someone notices'], ['A small change. Then a big one.', 'One person looks up.'], [], ['wind'], { crowd: 'alert', emotion: 'shock' }],
    [5, 'rooftop', 'pull', 'city blocks', ['The whole city feels it', '{place} reacts'], ['Word spreads street by street.', 'Everyone has a different idea.'], ['traffic_jam'], ['crowd', 'horns'], { crowd: 'film' }],
    [5, 'over_shoulder', 'push', 'person running', ['What happens next?', 'Choices'], ['Some wait. Some act.', 'Every choice changes the day.'], [], ['footsteps'], { crowd: 'help', emotion: 'determined' }],
    [5, 'aerial', 'pull', 'skyline at dusk', ['What would you do?', 'Your turn'], ['Tell the rest of the story.', 'Change one thing and see.'], [], ['music_resolve'], { crowd: 'relief' }],
  ],
};
const WHATIF_END = {
  quake: { text: 'DROP. COVER. HOLD ON.\nPrepare an emergency kit. Make a family plan.', disclaimer: 'Illustrative scenario. Not a prediction.' },
  zombie: { text: 'WHAT WOULD YOU DO?\nKnow your exits. Stay together. Follow official guidance.', disclaimer: 'Fictional scenario.' },
  flood: { text: 'GO HIGHER. STAY OUT OF FLOODWATER.\nKnow your evacuation route before the storm.', disclaimer: 'Illustrative scenario. Not a prediction.' },
  tsunami: { text: 'STRONG SHAKE OR SEA RETREATS?\nGo to high ground. Do not wait.', disclaimer: 'Illustrative scenario. Not a prediction.' },
  none: { text: 'WHAT HAPPENS NEXT?', disclaimer: 'Fictional scenario.' },
};

// The free writer: a sentence -> a scenario (schema 7, same shape as the samples).
function writeWhatIf(text, seed) {
  const p = parseWhatIf(text), rand = whatifRng(whatifHash(text) + seed * 7919), pick = a => a[Math.floor(rand() * a.length)];
  const place = p.place || 'the city';
  let title = text.replace(/\s+/g, ' ').trim(); if (!/^what if/i.test(title)) title = 'What if ' + title.replace(/^./, c => c.toLowerCase()); title = title.replace(/^what if/i, 'What if').replace(/[.!]*$/, ''); if (!title.endsWith('?')) title += '?';
  let beats = WHATIF_BEATS[p.hazard];
  if (p.short) beats = beats.filter((b, i) => i === 0 || i === beats.length - 1 || i % 2 === 1);
  let t = 0; const lens = [];  // no three equal shot lengths in a row (the validator flags flat pacing)
  const shots = beats.map(([dur, preset, move, target, labels, captions, events, sfx, behavior], i) => {
    let d = i ? cl(dur + (rand() < .5 ? -.5 : .5), 3, 7) : dur; if (lens.length > 1 && lens.at(-1) === d && lens.at(-2) === d) d += d < 7 ? .5 : -.5; lens.push(d); t += d; const fill = s => s.replace(/\{place\}/g, place.replace(/^./, c => c.toUpperCase())).replace(/\{title\}/g, title);
    return [t, preset, move, target, fill(pick(labels)), fill(pick(captions)), events, sfx, behavior];
  });
  const time = p.time || { quake: 'rush hour, late afternoon', zombie: 'evening', flood: 'afternoon', tsunami: 'morning', none: 'day' }[p.hazard];
  const weather = p.weather || { flood: 'heavy rain', zombie: 'light rain' }[p.hazard] || 'partly cloudy';
  const j = mkS({ title, city: p.place || '', length_s: t }, { time_of_day: time, weather, style: 'city' }, p.hazard, shots, WHATIF_END[p.hazard]);
  j.schema_version = 7; j.meta.written_by = 'free what-if writer';
  return { scenario: j, parsed: p };
}

async function makeWhatIfFilm(remix) {
  const text = $('whatifPrompt').value.trim();
  if (!text) { $('whatifPrompt').focus(); notifyUser('Type a what-if first, or tap an example.'); return; }
  if (recording) return;
  cancelSeek(); // a background seek (people still loading) must not swallow the click
  whatifSeed = remix && text === whatifLast ? whatifSeed + 1 : 0; whatifLast = text;
  const { scenario, parsed } = writeWhatIf(text, whatifSeed);
  closeSheet(); setScenario(scenario);
  if (validateOnly()) { selectShot(0, false); await seekFilm(0); notifyUser(`Your ${WHATIF_HAZARDS[parsed.hazard].name} film is ready: ${scenario.chapters[0].shots.length} shots, ${scenario.meta.length_s} s. Press Play.`); }
  $('whatifRemix').hidden = false;
}
