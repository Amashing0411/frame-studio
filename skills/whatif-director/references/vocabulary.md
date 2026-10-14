# Frame Studio scenario vocabulary (schema v7)

Generated 2026-10-14 from the running engine by `tools/extract-vocabulary.mjs (frame-studio)`. Do not edit by hand; re-run the tool.

- **hazard.type**: none, quake, zombie, tsunami, flood
- **cam.preset**: aerial, ground, rooftop, waterline, pov, over_shoulder, window, orbit, closeup
- **cam.move**: push, pull, crane, track, orbit
- **events**: quake_shake, facade_fall, dust_cloud, power_outage, crowd_evacuate, traffic_jam, fire_small, smoke_plume, siren, helicopter, rescue_crew, zombie_spawn, zombie_surge, infection_spread, sea_retreat, tsunami_wave, flood_rise, flood_recede, floating_debris
- **behavior.crowd**: calm, alert, freeze, film, panic, flee, hide, help, relief
- **behavior.emotion**: neutral, fear, shock, determined, relief, happy, sad, angry
- **behavior.zombies**: shamble, chase, sprint
- **world.biome**: city, coast, ocean, sky, jungle, island, custom
- **world.finish**: toy, classic
- **cinema.material**: natural, soft, ceramic, faceted, toon
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

## Assets (182 archetypes, each also as variants .v01-.v24)

- **human/human** (18): human.civilian, human.commuter, human.medic, human.firefighter, human.police, human.worker, human.sailor, human.pilot, human.hiker, human.chef, human.vendor, human.student, human.child, human.elder, human.athlete, human.diver, human.raincoat, human.survivor
  - states: idle walk run wave talk phone sit crouch cower cheer point carry swim dance jump climb fall sleep zombie think
  - expressions: neutral happy sad angry fear surprised determined relief sleepy
  - accessories: backpack cap helmet glasses mask bag vest umbrella
- **vehicle/car** (16): vehicle.compact, vehicle.sedan, vehicle.suv, vehicle.taxi, vehicle.police, vehicle.ambulance, vehicle.firetruck, vehicle.bus, vehicle.schoolbus, vehicle.van, vehicle.pickup, vehicle.flatbed, vehicle.tanker, vehicle.garbage, vehicle.jeepney, vehicle.tractor
  - states: idle drive turn_left turn_right doors_open hazard
- **vehicle/bike** (3): vehicle.bicycle, vehicle.motorcycle, vehicle.scooter
  - states: idle drive turn_left turn_right
- **boat/boat** (8): boat.dinghy, boat.canoe, boat.speedboat, boat.sailboat, boat.fishing, boat.ferry, boat.cargo, boat.raft
  - states: idle sail storm anchor
- **aircraft/aircraft** (6): aircraft.propeller, aircraft.jet, aircraft.seaplane, aircraft.helicopter, aircraft.drone, aircraft.glider
  - states: idle fly bank_left bank_right land
- **building/building** (16): building.house, building.apartment, building.office, building.shop, building.hospital, building.school, building.firestation, building.policestation, building.warehouse, building.cafe, building.hotel, building.skyscraper, building.stilt_house, building.hut, building.hangar, building.shelter
  - states: idle doors_open damage
- **building/building** (2): building.lighthouse, building.watertower
  - states: idle damage
- **tree/tree** (12): tree.oak, tree.banyan, tree.acacia, tree.pine, tree.cypress, tree.palm, tree.banana, tree.mangrove, tree.bamboo, tree.jungle, tree.dead, tree.sapling
  - states: idle wind storm
- **plant/plant** (10): plant.fern, plant.grass, plant.reeds, plant.bush, plant.flower, plant.potted, plant.lily, plant.kelp, plant.coral, plant.vine
  - states: idle wind
- **animal/quadruped** (8): animal.dog, animal.cat, animal.deer, animal.boar, animal.cow, animal.tiger, animal.elephant, animal.monkey
  - states: idle walk run rest
- **animal/bird** (4): animal.gull, animal.pigeon, animal.parrot, animal.eagle
  - states: idle fly glide
- **animal/fish** (5): animal.fish, animal.shark, animal.dolphin, animal.whale, animal.turtle
  - states: idle swim dart
- **food/food** (18): food.apple, food.orange, food.banana, food.coconut, food.watermelon, food.pineapple, food.bread, food.burger, food.pizza, food.fish, food.rice, food.soup, food.noodles, food.coffee, food.water, food.can, food.crate, food.sack
  - states: idle
- **trash/trash** (12): trash.bag, trash.bottle, trash.can, trash.cardboard, trash.paper, trash.tire, trash.wood, trash.metal, trash.bin, trash.dumpster, trash.net, trash.plastic
  - states: idle scatter
- **debris/debris** (8): debris.concrete, debris.brick, debris.glass, debris.asphalt, debris.roof, debris.beam, debris.driftwood, debris.rock
  - states: idle scatter fall
- **prop/prop** (28): prop.bench, prop.table, prop.chair, prop.lamp, prop.traffic_light, prop.cone, prop.barrier, prop.hydrant, prop.sign, prop.fence, prop.crate, prop.container, prop.barrel, prop.pallet, prop.lifebuoy, prop.anchor, prop.buoy, prop.dock, prop.bridge, prop.tent, prop.umbrella, prop.cart, prop.generator, prop.solar, prop.antenna, prop.suitcase, prop.backpack, prop.traffic_barrel
  - states: idle
- **environment/environment** (3): environment.water, environment.cloud, environment.waterfall
  - states: idle animate
- **environment/environment** (5): environment.sun, environment.moon, environment.island, environment.sandbank, environment.mountain
  - states: idle
