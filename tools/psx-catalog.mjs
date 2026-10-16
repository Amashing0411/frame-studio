// The PSX catalog: which object of which converted itch.io source becomes which catalog model, at what real-world size.
// Used by tools/build-psx.mjs (sources: qa/asset-src/itch/glb, made by tools/convert-itch.sh). Ids reuse the old
// procedural catalog's ids where the model is the same thing (vehicle.taxi, tree.pine, building.hut...), so older
// scripts keep working; scripts that used a removed archetype get an "unknown asset" warning.
// fit: height | length (longest horizontal side) | scale (as is). rotY: quarter turns so the model faces +Z.
// Packs: GGBot "PSX Style Cars" (CC0), elegantcrow "Retro Skyscraper Pack" (CC0), elbolilloduro "Buildings",
// "Trees" and "Paquete de modelos low poly estilo psx" (CC0 models; some textures come from Textures.com, see CREDITS).

const PACKS = {
  cars: { name: 'PSX Style Cars', author: 'GGBot', url: 'https://ggbot.itch.io/psx-style-cars', license: 'CC0' },
  sky: { name: 'Retro Skyscraper Pack', author: 'elegantcrow', url: 'https://elegantcrow.itch.io/retro-skyscraper-pack', license: 'CC0' },
  bld: { name: 'Buildings', author: 'elbolilloduro', url: 'https://elbolilloduro.itch.io/buildings', license: 'CC0 (models); some textures from Textures.com' },
  trees: { name: 'Trees', author: 'elbolilloduro', url: 'https://elbolilloduro.itch.io/trees-psx', license: 'CC0 (models); some textures from Textures.com' },
  obj: { name: 'Paquete de modelos low poly estilo psx', author: 'elbolilloduro', url: 'https://elbolilloduro.itch.io/objetos-low-poly-estilo-psx', license: 'CC0 (models); some textures from Textures.com' },
};

const rows = [];
const add = (id, name, pack, src, objects, fit, more = {}) => rows.push({ id, name, pack, src, objects: [].concat(objects || []), fit, ...more });

// vehicles: whole files, fitted to real lengths
add('vehicle.wagon', 'Station wagon', 'cars', 'Car.glb', null, { length: 4.2 });
add('vehicle.sedan', 'City sedan', 'cars', 'Car2.glb', null, { length: 4.5 });
add('vehicle.compact', 'Compact hatchback', 'cars', 'Car3.glb', null, { length: 4.0 });
add('vehicle.minivan', 'Minivan', 'cars', 'Car4.glb', null, { length: 4.8 });
add('vehicle.cruiser', 'Full-size sedan', 'cars', 'Car5.glb', null, { length: 5.3 });
add('vehicle.police', 'Police cruiser', 'cars', 'Car5_Police.glb', null, { length: 5.3 });
add('vehicle.taxi', 'Taxi', 'cars', 'Car5_Taxi.glb', null, { length: 5.3 });
add('vehicle.wreck', 'Burned-out car', 'cars', 'Car6.glb', null, { length: 4.4 });
add('vehicle.vintage', 'Vintage car', 'cars', 'Car7.glb', null, { length: 3.9 });
add('vehicle.van', 'Delivery van', 'cars', 'Car8.glb', null, { length: 5.6 });

// skyscrapers: real scale already
const towers = ['01.1', '01.2', '01.3', '01.4', '02.1', '02.2', '03.1', '03.2', '04.1', '04.2', '05.1', '05.2', '06.1', '06.2', '07.1', '07.2', '08.1', '08.2'];
towers.forEach((t, i) => add(i === 0 ? 'building.office' : 'building.tower_' + t.replace('.', '_'), i === 0 ? 'Office tower' : 'Tower ' + t, 'sky', `building_${t}.glb`, null, { scale: 1 }));

// city blocks (shops on the ground floor) and small houses
const blocks = ['Building', 'Building_01', 'Building_02', 'Building_03', 'Building_04', 'Building_05', 'Building_06', 'Building_07', 'Building_08', 'Building_09'];
blocks.forEach((o, i) => add(['building.apartment', 'building.shop'][i] || 'building.block_' + String(i + 1).padStart(2, '0'), ['Apartment block', 'Corner shops'][i] || 'City block ' + (i + 1), 'bld', 'Buildings.glb', o, { scale: 1 }));
const houses = ['Cube009', 'Cube011', 'Cube012', 'Cube010', 'Cube014', 'Cube005', 'Cube007', 'Cube013', 'Cube001', 'Cube008', 'Cube003', 'Cube004', 'Cube', 'Cube002', 'Cube006', 'Cube015'];
houses.forEach((o, i) => add(i === 0 ? 'building.house' : 'building.house_' + String(i + 1).padStart(2, '0'), i === 0 ? 'Town house' : 'Town building ' + (i + 1), 'obj', 'Edificios.glb', o, { scale: 1 }));
add('building.hut', 'Wooden cabin', 'obj', 'Cabañas.glb', 'Cabaña', { scale: 1 });
add('building.cabin_02', 'Long cabin', 'obj', 'Cabañas.glb', 'Cabaña001', { scale: 1 });
add('building.cabin_03', 'Cabin with porch', 'obj', 'Cabañas.glb', 'Cabaña002', { scale: 1 });
add('prop.fence', 'Wooden fence', 'obj', 'Cabañas.glb', 'Cube025', { height: .9 });
add('prop.door', 'Wooden door', 'obj', 'Cabañas.glb', 'Cube033', { height: 2.0 });

// trees (the sources are in arbitrary units)
add('tree.oak', 'Broadleaf tree', 'trees', 'Trees.glb', 'Tree', { height: 11 });
add('tree.pine', 'Pine', 'trees', 'Trees.glb', 'Tree_1', { height: 14 });
add('tree.sapling', 'Young tree', 'trees', 'Trees.glb', 'Tree_2', { height: 3.5 });
add('tree.fir', 'Fir', 'trees', 'Trees.glb', 'Tree_3', { height: 9 });
add('tree.spruce', 'Thin spruce', 'trees', 'Trees.glb', 'Tree_4', { height: 9 });
add('tree.birch', 'Birch', 'trees', 'Trees.glb', 'Tree_5', { height: 7.5 });
add('tree.maple', 'Round tree', 'trees', 'Trees.glb', 'Tree_6', { height: 8 });
add('tree.dead', 'Bare tree', 'trees', 'Trees.glb', 'Tree_7', { height: 9 });
// (the set's three leafy trees are left out: under cut-out leaves their bark-textured cards show as grey squares)
add('tree.bare_sapling', 'Bare sapling', 'obj', 'Arboles_low_poy.glb', 'Arbol1', { height: 5 });

// rocks
['Rock1', 'Rock2', 'Rock3', 'Rock4', 'Rock5', 'Rock6', 'Rock7', 'Rock8'].forEach((o, i) => add(i === 0 ? 'rock.boulder' : 'rock.rock_' + (i + 1), i === 0 ? 'Boulder' : 'Rock ' + (i + 1), 'obj', 'Rock_low_poly.glb', o, { length: [1.6, 1.4, 1.2, 1.0, 2.4, 1.5, 1.8, 1.7][i] }));

// street props: vending machines, a cooler, an outboard motor
['Cube', 'Cube001', 'Cube002', 'Cube003', 'Cube004', 'Cube005', 'Cube006', 'Cube007', 'Cube008', 'Cube010', 'Cube011', 'Cube012'].forEach((o, i) => add('prop.vending_' + String(i + 1).padStart(2, '0'), 'Vending machine ' + (i + 1), 'obj', 'Maquinas.glb', o, { height: 1.8 }));
add('prop.cooler', 'Cooler box', 'obj', 'Pesca.glb', 'Cube019', { height: .45 });
add('prop.cooler_red', 'Red cooler', 'obj', 'Pesca.glb', 'Cube018', { height: .45 });
add('prop.outboard', 'Outboard motor', 'obj', 'Pesca.glb', 'Cube017', { height: 1.0 });

// boats
add('boat.fishing', 'Fishing boat', 'obj', 'Pesca.glb', 'Cube016', { length: 6.5 });
add('boat.rowboat', 'Rowing boat', 'obj', 'Pesca.glb', 'Cube001', { length: 4.2 });
add('boat.canoe', 'Small boat', 'obj', 'Pesca.glb', 'Cube', { length: 3.4 });

// fish
['Cube009', 'Cube010', 'Cube011', 'Cube012', 'Cube013', 'Cube014', 'Cube015', 'Cylinder'].forEach((o, i) => add(i === 0 ? 'animal.fish' : 'animal.fish_' + (i + 1), i === 0 ? 'Fish' : 'Fish ' + (i + 1), 'obj', 'Pesca.glb', o, { length: [.45, .4, .35, .4, .5, .4, .45, .9][i] }));

// creatures (rigged sources, shown in their rest pose)
add('creature.ghoul', 'Ghoul', 'obj', 'Criaturas.glb', 'W', { height: 2.3 });
add('creature.ghoul_02', 'Pale ghoul', 'obj', 'Criaturas.glb', 'W2', { height: 2.2 });
add('creature.antler_beast', 'Antlered beast', 'obj', 'Criaturas.glb', 'W3', { height: 2.6 });

// food for markets and tables
const food = [['food.apple', 'Apple', 'manzana', .09], ['food.orange', 'Orange', 'naranja', .09], ['food.banana', 'Banana', 'platano', { length: .2 }], ['food.carrot', 'Carrot', 'zanahoria', { length: .2 }],
  ['food.cucumber', 'Cucumber', 'pepino', { length: .22 }], ['food.lettuce', 'Lettuce', 'lechuga', .18], ['food.papaya', 'Papaya', 'papaya', .25], ['food.icecream', 'Ice cream tub', 'Helado', .14],
  ['food.icecream_02', 'Ice cream tub 2', 'Helado003', .12], ['food.soda', 'Soda bottle', 'Cylinder044', .3], ['food.juice', 'Juice bottle', 'Cylinder034', .3], ['food.drink_can', 'Drink can', 'Cylinder040', .12],
  ['food.snack_bag', 'Snack bag', 'Cylinder031', .25], ['food.cereal', 'Cereal box', 'Cube103', .3], ['food.crate', 'Produce crate', 'Cube091', { length: .6 }], ['food.biscuits', 'Biscuit pack', 'Cube114', { length: .18 }]];
for (const [id, name, o, f] of food) add(id, name, 'obj', 'Comida_low_poly.glb', o, typeof f === 'number' ? { height: f } : f);

// motion states by category (the engine animates these procedurally: sway, bob, swim)
export const STATES = { vehicle: ['idle', 'drive'], building: ['idle'], tree: ['idle', 'wind'], rock: ['idle'], prop: ['idle'], boat: ['idle', 'sail'], animal: ['idle', 'swim'], creature: ['idle'], food: ['idle'] };
export const CATALOG = rows.map(r => ({ ...r, category: r.id.split('.')[0], states: STATES[r.id.split('.')[0]] }));
export { PACKS };
