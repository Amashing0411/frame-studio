// "Write it with my AI key" (Story tab, inside the What if… card): the same sentence, written by Claude instead of the
// free writer. Each person uses their own Anthropic API key, sent only from their browser to Anthropic, so the site
// has no server and no AI bill. The key is kept in memory, or in this browser's storage when "Remember" is ticked.
// Claude answers with structured JSON (output_config.format) built from the engine's live vocabulary: cameras, moves,
// events, crowd moods and feelings can only be values the engine plays. The answer becomes a script through mkS, like
// the samples and the free writer. Opus and Sonnet requests opt into the server-side refusal fallback.
const AI_KEY_STORE = 'frame-studio-ai-key', AI_MODEL_STORE = 'frame-studio-ai-model';
const AI_MODELS = [['claude-opus-5-5', 'Claude Opus 5.5 · best'], ['claude-sonnet-5-5', 'Claude Sonnet 5.5 · balanced'], ['claude-haiku-5-5', 'Claude Haiku 5.5 · cheapest']];
// camera subjects the engine knows how to frame (the samples' own targets)
const AI_SUBJECTS = ['city district', 'skyline at dusk', 'city blocks', 'intersection', 'avenue', 'open assembly area', 'damaged building frontage', 'office window', 'pedestrian on avenue', 'person running', 'commuter face', 'civilian face', 'survivor face', 'zombie face'];
let aiKeyMemory = '';

function initAIWriter() {
  const sel = $('aiModel'); for (const [id, label] of AI_MODELS) sel.add(new Option(label, id));
  try { const k = localStorage.getItem(AI_KEY_STORE); if (k) { aiKeyMemory = k; $('aiKey').value = k; $('aiRemember').checked = true; } sel.value = localStorage.getItem(AI_MODEL_STORE) || AI_MODELS[0][0]; } catch (e) { sel.value = AI_MODELS[0][0]; }
  if (!sel.value) sel.value = AI_MODELS[0][0];
  $('aiKey').oninput = () => { aiKeyMemory = $('aiKey').value.trim(); aiSaveKey(); };
  $('aiRemember').onchange = aiSaveKey;
  sel.onchange = () => { try { localStorage.setItem(AI_MODEL_STORE, sel.value); } catch (e) { } };
  $('aiWrite').onclick = writeWithAI;
  $('aiForget').onclick = () => { aiKeyMemory = ''; $('aiKey').value = ''; $('aiRemember').checked = false; aiSaveKey(); notifyUser('Your key is removed from this browser.'); };
}
function aiSaveKey() { try { if ($('aiRemember').checked && aiKeyMemory) localStorage.setItem(AI_KEY_STORE, aiKeyMemory); else localStorage.removeItem(AI_KEY_STORE); } catch (e) { } }

// JSON schema for Claude's answer, from the engine's live lists.
function aiSchema() {
  const hazards = [...new Set(['none', ...Object.keys(KL), 'tsunami', 'flood'])];
  const shot = {
    type: 'object', additionalProperties: false,
    required: ['seconds', 'camera', 'move', 'subject', 'title', 'caption', 'events', 'sounds', 'crowd', 'emotion', 'zombies'],
    properties: {
      seconds: { type: 'number', description: 'Shot length, 3 to 7 seconds.' },
      camera: { type: 'string', enum: PRE }, move: { type: 'string', enum: MOV }, subject: { type: 'string', enum: AI_SUBJECTS },
      title: { type: 'string', description: 'On-screen title, under 45 characters.' }, caption: { type: 'string', description: 'Narration caption, under 70 characters.' },
      events: { type: 'array', items: { type: 'string', enum: EVT } },
      sounds: { type: 'array', items: { type: 'string' }, description: 'Two or three sound cues, e.g. rumble, siren, rain, scream, helicopter_rotors, music_resolve.' },
      crowd: { type: 'string', enum: CRW }, emotion: { type: 'string', enum: EMOS }, zombies: { type: 'string', enum: ['none', ...ZMB] },
    },
  };
  return {
    type: 'object', additionalProperties: false,
    required: ['title', 'city', 'time_of_day', 'weather', 'hazard', 'shots', 'end_card_text', 'disclaimer'],
    properties: {
      title: { type: 'string' }, city: { type: 'string' }, time_of_day: { type: 'string' }, weather: { type: 'string' },
      hazard: { type: 'string', enum: hazards }, shots: { type: 'array', items: shot },
      end_card_text: { type: 'string' }, disclaimer: { type: 'string' },
    },
  };
}

const AI_SYSTEM = `You write short "what if" films for Frame Studio, a browser film engine that plays a 9:16 vertical film (YouTube Shorts / TikTok) in a stylised 3D city with crowds, traffic and weather.

Write one film for the user's what-if as JSON matching the schema.
- 8 to 12 shots, 35 to 60 seconds in total. Shot 1's title is the what-if question itself.
- Tell a clear arc: an ordinary moment, the first sign, the event, how people react, help or a turning point, a closing thought.
- The engine can show earthquakes (hazard quake), zombie outbreaks (zombie), floods (flood, use flood_rise then flood_recede events) and tsunamis (tsunami, use sea_retreat then tsunami_wave). For any other idea, use hazard none and tell the story through the city, crowd moods and camera; never promise visuals the engine cannot draw.
- Only use events that fit the hazard. Use zombies "none" unless the hazard is zombie.
- Titles under 45 characters, captions under 70. Plain, vivid words.
- Any safety advice must be standard public guidance (for example Drop, Cover, and Hold On; move to higher ground; do not walk or drive through floodwater). Do not invent statistics, dates or quotes, and do not name real private people.
- end_card_text: one practical takeaway in two short lines (use a newline). disclaimer: "Illustrative scenario. Not a prediction." for real hazards, "Fictional scenario." otherwise.`;

async function writeWithAI() {
  const text = $('whatifPrompt').value.trim(), key = aiKeyMemory || $('aiKey').value.trim(), model = $('aiModel').value;
  if (!text) { $('whatifPrompt').focus(); notifyUser('Type a what-if first.'); return; }
  if (!key) { $('aiKey').focus(); notifyUser('Paste your Anthropic API key first, or use Make my film (free).'); return; }
  if (recording) return;
  const btn = $('aiWrite'), label = btn.textContent; btn.disabled = true; btn.textContent = 'Writing…'; $('aiStatus').textContent = 'Claude is writing your film. This takes a few seconds.';
  let Anthropic = null;
  try {
    Anthropic = await window.loadAnthropicSDK();
    const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
    const request = {
      model, max_tokens: 16000,
      cache_control: { type: 'ephemeral' },
      system: AI_SYSTEM,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: aiSchema() } },
      messages: [{ role: 'user', content: text }],
    };
    // a declined request is re-run on Anthropic's recommended fallback model (Opus and Sonnet on the Claude API)
    if (model !== 'claude-haiku-5-5') Object.assign(request, { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
    const response = await client.beta.messages.create(request);
    if (response.stop_reason === 'refusal') throw new Error('Claude declined to write this one. Try rewording your what-if, or use Make my film (free).');
    if (response.stop_reason === 'max_tokens') throw new Error('The answer was cut off. Please try again.');
    const block = response.content.find(b => b.type === 'text');
    if (!block) throw new Error('Claude sent no script back. Please try again.');
    const scenario = aiToScenario(JSON.parse(block.text));
    if (recording) return;
    cancelSeek(); closeSheet(); setScenario(scenario);
    if (validateOnly()) { selectShot(0, false); await seekFilm(0); }
    $('aiStatus').textContent = `Written by ${response.model}: ${scenario.chapters[0].shots.length} shots, ${scenario.meta.length_s} s.`;
    notifyUser('Your AI-written film is ready. Press Play.');
  } catch (e) {
    const msg = !Anthropic ? 'The AI writer could not load. Check your connection.'
      : e instanceof Anthropic.AuthenticationError ? 'That key did not work. Check it at console.anthropic.com.'
      : e instanceof Anthropic.PermissionDeniedError ? 'This key is not allowed to use that model. Try another model.'
      : e instanceof Anthropic.RateLimitError ? 'Too many requests on this key right now. Wait a moment and try again.'
      : e instanceof Anthropic.APIConnectionError ? 'Could not reach Anthropic. Check your connection.'
      : e instanceof Anthropic.APIError ? `Anthropic returned an error (${e.status}): ${e.message}`
      : e instanceof SyntaxError ? 'The script came back damaged. Please try again.'
      : e.message || String(e);
    $('aiStatus').textContent = msg; notifyUser(msg);
  } finally { btn.disabled = false; btn.textContent = label; }
}

// Claude's JSON -> a schema-7 script (clamped to sensible lengths, unknown values dropped).
function aiToScenario(a) {
  const hz = a.hazard || 'none', shots = (a.shots || []).slice(0, 16);
  if (shots.length < 3) throw new Error('The script was too short. Please try again.');
  let t = 0;
  const tuples = shots.map((s, i) => {
    t += cl(Math.round((+s.seconds || 4) * 2) / 2, 2.5, 8);
    const beh = { crowd: CRW.includes(s.crowd) ? s.crowd : 'calm' }; if (EMOS.includes(s.emotion) && s.emotion !== 'neutral') beh.emotion = s.emotion; if (hz === 'zombie' && ZMB.includes(s.zombies)) beh.zombies = s.zombies;
    return [t, PRE.includes(s.camera) ? s.camera : 'ground', MOV.includes(s.move) ? s.move : 'push', AI_SUBJECTS.includes(s.subject) ? s.subject : 'city district',
      String(s.title || (i ? '' : a.title)).slice(0, 80), String(s.caption || '').slice(0, 120), (s.events || []).filter(e => EVT.includes(e)), (s.sounds || []).slice(0, 4).map(String), beh];
  });
  let title = String(a.title || $('whatifPrompt').value).trim(); if (!title.endsWith('?')) title += '?';
  const j = mkS({ title, city: String(a.city || ''), length_s: t }, { time_of_day: String(a.time_of_day || 'day'), weather: String(a.weather || 'clear'), style: 'city' }, hz, tuples, { text: String(a.end_card_text || 'WHAT WOULD YOU DO?'), disclaimer: String(a.disclaimer || 'Fictional scenario.') });
  j.schema_version = 7; j.meta.written_by = 'Claude (own key)';
  return j;
}
