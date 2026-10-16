# Frame Studio scenario vocabulary (schema v7)

Generated 2026-10-16 from the running engine by `tools/extract-vocabulary.mjs (frame-studio)`. Do not edit by hand; re-run the tool.

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
- **cinema.speech**: icons, text, off
- **cinema ranges**: dof 0-1, focus 0-300, radial 0-1, bloom 0-1, vignette 0-1, grain 0-1
- **dialogue icon**: heart, question, exclaim, idea, food, home, coin, phone, music, sleep, angry, smile, warning, plus
- **dialogue mood**: friendly, surprised, worried
- **asset shader**: standard, matte, metal, glass, toon, emissive

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

## Assets (139 archetypes, each also as variants .v01-.v04)

- **human/human** (18): human.civilian, human.commuter, human.medic, human.firefighter, human.police, human.worker, human.sailor, human.pilot, human.hiker, human.chef, human.vendor, human.student, human.child, human.elder, human.athlete, human.diver, human.raincoat, human.survivor
  - states: idle walk run wave talk phone sit crouch cower cheer point carry swim dance jump climb fall sleep zombie think
  - expressions: neutral happy sad angry fear surprised determined relief sleepy
  - accessories: backpack cap helmet glasses mask bag vest umbrella
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
