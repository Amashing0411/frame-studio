# Frame Studio scenario vocabulary (schema v7)

Generated 2026-10-22 from the running engine by `tools/extract-vocabulary.mjs (frame-studio)`. Do not edit by hand; re-run the tool.

- **hazard.type**: none, quake, zombie, tsunami, flood
- **cam.preset**: aerial, ground, rooftop, waterline, pov, over_shoulder, window, orbit, closeup
- **cam.move**: push, pull, crane, track, orbit
- **events**: quake_shake, facade_fall, dust_cloud, power_outage, crowd_evacuate, traffic_jam, fire_small, smoke_plume, siren, helicopter, rescue_crew, zombie_spawn, zombie_surge, infection_spread, sea_retreat, tsunami_wave, flood_rise, flood_recede, floating_debris
- **behavior.crowd**: calm, alert, freeze, film, panic, flee, hide, help, relief
- **behavior.emotion**: neutral, fear, shock, determined, relief, happy, sad, angry
- **behavior.zombies**: shamble, chase, sprint
- **world.biome**: city, coast, ocean, sky, jungle, island, custom
- **world.finish**: toy, classic
- **cinema.material**: natural, soft, ceramic, faceted, toon, psx
- **cinema.grade**: neutral, warm, cool, mono
- **cinema ranges**: dof 0-1, focus 0-300, radial 0-1, bloom 0-1, vignette 0-1, grain 0-1
- **dialogue mood**: friendly, surprised, worried
- **asset shader**: standard, matte, metal, glass, toon, emissive

## PSX look (cinema.material "psx")

cinema.psx (film) and the cinema.psx of a shot take the film and screen settings; assets[].psx takes the model settings. Leave out what stays at the default.

- **albedo_tex** (model: brick, checker, stone, grass, crate, metal, fence, colormap or a data URL; default ""): The picture on the surface. Drawn with nearest filtering and repeating, like a console texture. Empty keeps the model's own picture.
- **albedo_color** (model; default "#ffffff"): Tint multiplied with the texture. White leaves the texture as it is.
- **vertex_color_mix** (film, 0-1; default 1): How much the mesh vertex colors darken or tint the surface (0 = ignore them, 1 = full). PS1 levels were lit by painting these.
- **texture_filter** (film: 0 = Nearest, 1 = N64 3-point; default 0): How the texture is smoothed. Nearest = hard square texels (PS1). N64 3-point = the soft, triangular blur of the Nintendo 64, which mixes only three texels instead of four.
- **uv_scale** (model, -16-16; default [1,1]): Repeats the texture. 2 = twice across each face.
- **uv_offset** (model, -16-16; default [0,0]): Moves the texture, in texture widths.
- **uv_scroll** (model, -8-8; default [0,0]): Slides the texture, in texture widths per second (water, conveyor belts, flames).
- **affine** (film, 0-1; default 1): Texture swimming. 1 = affine mapping like the real PS1, where the texture bends across big polygons that are close to the camera. 0 = a modern, perspective-correct texture.
- **affine_limit** (film, 0.05-8; default 0.35): The most the texture may slide because of affine mapping, in texture repeats. Big polygons at the edge of a wide view would otherwise smear the whole texture; a lower value keeps the swimming but caps it. 8 = no cap.
- **pixel_size** (film, 1-16; default 3): Size of one console pixel. The vertices snap to this grid, and the dither cells use it too. 3 on a portrait film = the classic 360 x 640 (on the demo scenes, 320 x 240).
- **snap_strength** (film, 0-1; default 1): How strongly the vertices snap to the pixel grid. 1 = every vertex jumps to a whole pixel, which makes the edges shimmer when the camera or the object moves. 0 = off.
- **jitter** (film, 0-2; default 0): Random shaking of every vertex, in console pixels (the unstable geometry of the early 3D games). 0 = off.
- **jitter_rate** (film, 1-30; default 12): How many times per second the jitter changes.
- **lit** (model, 0-1; default 1): 1 = lit by the lights in the scene, computed at the vertices (smooth Gouraud shading, no per-pixel light). 0 = flat, the texture color as it is.
- **glow** (model, 0-1; default 0): Self illumination of the whole surface. It keeps this much of its color even in the dark.
- **emission_tex** (model: runes, lava, ember or a data URL; default ""): Picture of what glows (windows, runes, lava). Only its bright parts light up, in the dark too.
- **emission_strength** (model, 0-4; default 1): How strongly the emission picture glows.
- **shadows** (film, 0-1; default 1): How much of the film's shadows stays on lit surfaces. PS1 games had none (0); 1 keeps the shadows of the sun and the lamps.
- **matcap_tex** (model: chrome, gold, ember or a data URL; default ""): Picture of a sphere that is wrapped around the surface by its normal (a matcap): chrome, gold, a wet floor. It already contains its own light, so the lit part is replaced by it.
- **matcap_amount** (model, 0-1; default 0): How much of the surface becomes the metal picture. 0 = off.
- **billboard** (model: 0 = Off, 1 = Full, 2 = Upright; default 0): Turns the surface toward the camera: a flat picture that always faces you (trees, enemies, items). Full follows the camera in every direction, Upright only turns around the vertical axis (a tree does not lean).
- **fog_amount** (film, 0-1; default 0): How much of the distance fog is used. 0 = no fog. The fog is worked out at the vertices, as on the console.
- **fog_color** (film; default "#0d0f14"): Color of the fog.
- **fog_start** (film, 0-200; default 8): Distance from the camera where the fog starts, in meters.
- **fog_end** (film, 0.5-400; default 30): Distance where the fog is complete. Close to the start makes a hard wall of fog.
- **color_bits** (film, 1-8; default 5): Bits per color channel. 5 = the PS1 15-bit color (32 shades per channel). 8 = off, 1 = very few colors.
- **dither_amount** (film, 0-1; default 1): Strength of the 4x4 ordered dither that hides the banding of the reduced colors. 0 = no dither.
- **cutout** (model, 0-1; default 0): Pixels with an alpha below this are cut out (leaves, fences, sprites). 0 = off, the surface is solid.
- **screen_amount** (screen, 0-1; default 1): How much of the screen effect is used: chunky console pixels, reduced colors and dither on the final picture. 0 = the picture as it is.
- **screen_pixel_size** (screen, 1-16; default 3): Size of one console pixel on the final picture. Keep it equal to pixel_size: moving pixel_size moves this too.
- **screen_color_bits** (screen, 1-8; default 5): Bits per color channel on the final picture, which also covers the light and the fog. 5 = the PS1 15-bit color. 8 = off.
- **screen_dither** (screen, 0-1; default 1): Strength of the 4x4 ordered dither on the final picture (0 = none).
- **grain** (screen, 0-0.2; default 0): Slight brightness noise that changes every frame, like a worn picture.
- **vignette** (screen, 0-1; default 0): Darkens the corners of the screen.

Ready looks: PS1 {"fog_amount":0.55}; Graveyard {"fog_amount":0.55,"fog_start":3,"fog_end":28,"fog_color":"#0d121f"}; Horror fog {"color_bits":4,"fog_amount":1,"fog_start":2,"fog_end":15,"grain":0.04,"screen_color_bits":4,"vignette":0.5}; Clean (all off) {"affine":0,"color_bits":8,"dither_amount":0,"screen_amount":0,"snap_strength":0}; Crunchy 3-bit {"color_bits":3,"fog_amount":0.4,"pixel_size":4,"screen_color_bits":3,"screen_pixel_size":4}; Shaky {"fog_amount":0.3,"jitter":1}; N64 {"affine":0,"fog_amount":0.3,"pixel_size":2,"screen_pixel_size":2,"snap_strength":0,"texture_filter":1}; Chrome {"albedo_tex":"checker","matcap_tex":"chrome","matcap_amount":1}; Glowing runes {"albedo_tex":"stone","emission_tex":"runes","emission_strength":1.2,"lit":0.35}; Texture swimming {"albedo_tex":"brick","affine_limit":8}; Fence cutout {"albedo_tex":"fence","cutout":0.5,"uv_scale":[4,3]}; Billboard {"albedo_tex":"fence","billboard":1,"cutout":0.5}

## sfx keywords (checked in this order, first match wins, no match = silent)

- **music** (Music bed): `music|resolve|pad`
- **helicopter** (Helicopter): `helicopter|rotor`
- **thunder** (Thunder): `thunder`
- **rain** (Rain): `rain|drizzle`
- **horn** (Horns): `horn|brake|screech`
- **siren** (Siren): `siren|alert|emergency|alarm`
- **gun** (Gunshots): `gun|shot|rifle`
- **fire** (Fire crackle): `fire|crackle`
- **impact** (Debris / impacts): `debris|fall|glass|concrete|stone|masonry|crack|impact|grit|rubble`
- **rumble** (Ground rumble): `rumbl|quake|shak|ground|rattl|creak`
- **groan** (Creature groans): `groan|zombie|undead`
- **scream** (Screams): `scream|cry`
- **radio** (Radio chatter): `radio|instruction`
- **footstep** (Footsteps): `footstep|running`
- **crowd** (Crowd): `crowd|shout|voice|people|chatter|panic|flee`
- **traffic** (Traffic): `traffic|engine|car`
- **bird** (Birds): `bird|chirp|gull`
- **wind** (Wind / air): `wind|ambien|quiet|room|calm`
- **water** (Water / surf): `wave|sea|surf|water|flood|splash|tsunami|ocean|river`

## time_of_day and weather keywords

- time night: `night|midnight`
- time golden: `rush|late|dusk|evening|sunset|golden|dawn`
- time day: `anything else`
- weather rain: `rain|storm|typhoon|drizzle|thunder`
- weather storm_lightning: `storm|typhoon|thunder`
- weather fog: `fog|mist`
- weather grey_sky: `overcast|gr[ae]y|smoke|haze|gloom|cloud`

## Assets (142 archetypes, each also as variants .v01-.v04)

- **human/human** (21): human.civilian, human.commuter, human.medic, human.firefighter, human.police, human.worker, human.sailor, human.pilot, human.hiker, human.chef, human.vendor, human.student, human.child, human.elder, human.athlete, human.diver, human.raincoat, human.survivor, human.zombie, human.killer, human.sheriff
  - states: idle walk run wave talk phone sit crouch cower cheer point carry swim dance jump climb fall sleep zombie jog death aim shoot reload torch sword punch kneel hit_head sit_exit think
  - expressions: neutral happy sad angry fear surprised determined relief sleepy
- **vehicle/psx** (10): vehicle.wagon, vehicle.sedan, vehicle.compact, vehicle.minivan, vehicle.cruiser, vehicle.police, vehicle.taxi, vehicle.wreck, vehicle.vintage, vehicle.van
  - states: idle drive
- **building/psx** (47): building.office, building.tower_01_2, building.tower_01_3, building.tower_01_4, building.tower_02_1, building.tower_02_2, building.tower_03_1, building.tower_03_2, building.tower_04_1, building.tower_04_2, building.tower_05_1, building.tower_05_2, building.tower_06_1, building.tower_06_2, building.tower_07_1, building.tower_07_2, building.tower_08_1, building.tower_08_2, building.apartment, building.shop, building.block_03, building.block_04, building.block_05, building.block_06, building.block_07, building.block_08, building.block_09, building.block_10, building.house, building.house_02, building.house_03, building.house_04, building.house_05, building.house_06, building.house_07, building.house_08, building.house_09, building.house_10, building.house_11, building.house_12, building.house_13, building.house_14, building.house_15, building.house_16, building.hut, building.cabin_02, building.cabin_03
  - states: idle
- **prop/psx** (17): prop.fence, prop.door, prop.vending_01, prop.vending_02, prop.vending_03, prop.vending_04, prop.vending_05, prop.vending_06, prop.vending_07, prop.vending_08, prop.vending_09, prop.vending_10, prop.vending_11, prop.vending_12, prop.cooler, prop.cooler_red, prop.outboard
  - states: idle
- **tree/psx** (9): tree.oak, tree.pine, tree.sapling, tree.fir, tree.spruce, tree.birch, tree.maple, tree.dead, tree.bare_sapling
  - states: idle wind
- **rock/psx** (8): rock.boulder, rock.rock_2, rock.rock_3, rock.rock_4, rock.rock_5, rock.rock_6, rock.rock_7, rock.rock_8
  - states: idle
- **boat/psx** (3): boat.fishing, boat.rowboat, boat.canoe
  - states: idle sail
- **animal/psx** (8): animal.fish, animal.fish_2, animal.fish_3, animal.fish_4, animal.fish_5, animal.fish_6, animal.fish_7, animal.fish_8
  - states: idle swim
- **creature/psx** (3): creature.ghoul, creature.ghoul_02, creature.antler_beast
  - states: idle
- **food/psx** (16): food.apple, food.orange, food.banana, food.carrot, food.cucumber, food.lettuce, food.papaya, food.icecream, food.icecream_02, food.soda, food.juice, food.drink_can, food.snack_bag, food.cereal, food.crate, food.biscuits
  - states: idle
