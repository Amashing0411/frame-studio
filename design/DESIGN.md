---
name: Frame Studio characters and creatures
description: Procedural soft-toy / designer-vinyl cast for 9:16 phone films. Direction B.
tokens: design/design-tokens.json (normative numbers; code reads `target`, `current` is for comparison)
---

# Design System: Frame Studio characters and creatures

## Overview

**Creative North Star: "The Vinyl Shelf"**. Every person and creature looks like one designer-vinyl toy line:
continuous rounded forms, a big readable head, graphic eyes, one smooth semi-matte material, colours that pop off
the beige clay city. The phone is the judge: a figure 1/6 of the frame tall (320 px of 1920) must read its pose,
its expression and who it is.

Part 1 records the shipped build (commit 90f26da) with sources. Part 2 is the target for the direction-B build.
Part 1 values are evidence, not rules: nothing in Part 1 is canonized.

---

# Part 1: the current system (shipped)

### Construction (src/studio/10-rig.js `buildToyRig`, src/assets/14-characters-v3.js `restyleCharacter3`)
- Bones: Hips y .92, Spine +.16, Chest +.12, Head +.335; arms UpperArm x ±.225, Forearm -.275, Hand -.255;
  legs Thigh x ±.09, Shin -.415, Foot -.405.
- Forms: lathe rings via `profileGeometry` (head 32 seg x 8 rings, hair 28 x 5, torso 24 x 8, waist 24 x 4);
  skinned limbs via `skinPart` (20 seg; arm 9 rings, sleeve 6, trouser 9; 2-bone linear blend over 0.17 m);
  ears, hair locks, tied hair: `toyBall` spheres 16x12; neck `toyTube` 16 seg; straps/fringe `TubeGeometry` 16x6;
  shoes, soles, 3 laces each: `toyBox` extrusions (bevelSegments 2, curveSegments 3).
- v3 restyle hides the v2 eyes, nose, lips, fingers; head bone scaled x1.1.
- Hands (`restyleCharacter3`): palm `bevelBoxGeometry(.064,.058,.03,r .013)`, finger block `(.06,.046,.026,r .012)`
  on Finger1, sphere thumb, hidden index sphere for pointing.

### Measured proportions (adult, from bone and ring values)
| Measure | Value |
|---|---|
| Total height (crown of hair) | 1.84 m (`WORKSHOP_STYLE.height` says 1.82) |
| Head (chin to crown, after x1.1) / height | 0.4345 / 1.84 = **0.236** (4.2 heads) |
| Head width | 0.32 m; shoulder width (sleeve to sleeve) 0.60 m = **1.9 x head width** |
| Leg (hip to sole) / height | 0.915 / 1.84 = **0.50**; arm (shoulder to wrist) 0.53 = 0.29 |
| Limb radius | upper arm .067 to wrist .025; thigh .101 to ankle .044 |
| Hand length / head height | 0.093 / 0.4345 = **0.21** |
| Child / elder | uniform scale **0.74 / 0.96** of the adult: same 4.2-head ratio |

### Face (`restyleCharacter3`, `makeMouth3`, `shapeMouth3`, `EXPR3`, `VISEME3`)
- Eyes: dark ellipsoid r(.0205, .0285, .0095), roughness .18, centres ±.053, 0.47 of head height from chin;
  eye height = 0.145 x head height; spacing = 0.36 x head width. Highlights: 2 unlit white dots r .0062 and .003.
- Brows: flattened sphere (.021, .0055, .0065) in hair colour at y .09. Nose: sphere (.0125, .011, .011).
- Mouth: flat 24-point disc + lip ring + teeth quad + tongue fan, bent on R .105, stacked with polygonOffset,
  placed 5 mm proud of the head surface (z .102 vs surface ~.097), tilted -0.2 rad. Neutral width .056 (0.19 x head width).
- Blush: unlit `MeshBasicMaterial` #ff8a86 at opacity .26.

### Palette (hex from code)
- Skin (`buildToyRig`, by variant%6): #d49b73 #ab7353 #c78e68 #e7b893 #926348 #bc805b, roughness .62.
- Clothing: `WORKSHOP_STYLE.palette` #df7557 #e5b852 #388e83 #7689ad #eedbc0, roughness .94.
- Pants #29383d #48403f #354451; hair #2a211f #49312b #29282b #38231c, elder #98938b (rough .84).
- Shoes/apron cream #eee2c9, soles #25222a, lips (v2) #874d48, earrings #caa85e metalness .7.
- Accessories: backpack #c69b50, strap #795b3e, helmet #deaf43, mask #90bbb1, vest #c7a04c, tote #cab492.
- Octopus (`octopusBasePack`): body #c78464, alternate arm segments #d69574, brows/smile #744c44, eyes #293733.

### Shading and light
- `toyMaterial`: MeshStandard, roughness .78 default, metalness 0, flatShading false. Skinned parts clone their
  material per limb (6 clones per person); skin, cloth, dark eye are private: ~9 private materials per person.
- `buildExtension` makes a new `toyMaterial` per shape node: the octopus has 38 private materials.
- Renderer (src/engine/00-renderer.js): ACES Filmic, exposure 1.15, sRGB output, PCF soft shadows.
- Lights (src/engine/01-sky-weather.js): hemisphere #dfe6ff / #6b5d4a at .9, sun #ffc890 at 1.2. No rim light.
- Finishes (`applyFinish`, src/studio/11-camera-paths-chatter.js) apply to characters too: ceramic rough .28 /
  metal .06, soft .95, **faceted sets flatShading on characters**, toon posterizes to 6 levels.
- City clay (`softenCityMaterial`): rough >= .8 becomes .78, saturation > .35 scaled x.78; characters exempt.

### Budget (estimated from segment counts, not measured)
~11,400 triangles and ~50 meshes per character at full detail (ears 1,408 and hair locks 1,760 alone exceed
the whole torso). `applyCrowdLOD` hides parts with radius < .032 beyond 14 m and < .06 beyond 38 m.
100 characters x 50 meshes = 5,000 draw calls before shadows, above the whole market budget (3,143).

### What reads as "odd" at phone size (evidence)
1. **Uncanny middle proportions.** 4.2 heads with legs at 50% of height: a realistic adult body under a toy head.
   Neither toy (about 3 heads) nor human. Children are scaled adults (0.74), so they read as small adults.
2. **Faceted limbs and sleeves.** 20 segments and rings up to 0.17 m apart show polygon facets on Leo's arms in
   market-0950.png; linear 2-bone blend pinches elbows and knees; sleeves are separate tubes with a hard cuff.
3. **Brick hands.** Two bevelled boxes plus a ball thumb (hand 0.21 x head height) read as Lego fists; the seam
   between palm and finger block shows (Leo's phone hand, market-0950.png; both fists, market-3000.png).
4. **Brick shoes.** Cream boxes .125 x .10 x .24 with lace boxes: the brightest shapes at the bottom of the frame
   and near the ground colour (market-3000.png, bottom).
5. **Lollipop head.** Head profile closes to a .026 radius chin (egg point); neck .056 radius under a x1.1 head.
6. **Sticker face, sub-pixel details.** At 1/6 frame (76 px head) the eye is 11 px, the main highlight 2.6 px, the
   second highlight 1.2 px and the closed mouth 1-2 px. The mouth disc floats 5 mm off the curved head.
   Blush is unlit, so it glows in shade.
7. **Beaded octopus.** Each tentacle is 4 separate ellipsoids (.18 to .084 wide), alternately coloured, curl only
   -.12 + .17 per segment: a pile of sausage beads (market-3000.png). No suckers. The eyes are flat ovals
   with no highlight, unlike the humans. The body sits at the hue of human skin (OKLab dE 1.6-2.4 from skin tones).
8. **Camouflaged clothing.** Shirts use the same 5 colours as awnings, stalls and pennants: OKLab dE vs the clay
   city is 0.0-3.4 (Leo's #7689ad equals the clay awning). Light skin tones are dE 3-6 from the facades.
9. **Mixed shading.** Smooth lathe surfaces next to 2-segment bevels (shoes), 6-sided tubes (straps), unlit
   highlights and blush, a metal earring (.7) and cloth at .94: five surface responses on one toy.

---

# Part 2: the target style sheet (direction B)

All numbers live in `design-tokens.json > target`. Every rule below is a number or a yes/no check.

## Shapes

**The Silhouette First Rule.** Filled black at 320 px tall, a figure shows head, both arms, both legs and
hands as separate shapes in its idle and talk poses (yes/no, checked on a capture).
- S1. Body forms are continuous: neck, arms and hands are one skinned surface; clothing is at most top,
  bottom and shoes (3 meshes). No two primitives of one colour may intersect where the seam is visible.
- S2. Limbs taper: wrist radius / shoulder radius 0.55-0.65; ankle / thigh 0.50-0.60. Taper is monotonic
  except one soft calf/forearm swell (<= +10%).
- S3. Joints keep volume: at a 90-degree bend the elbow/knee cross-section is >= 0.85 of rest
  (extra joint ring or corrective bone; no plain 2-bone linear blend).
- S4. Rest pose is never straight: elbow bend >= 0.15 rad, knee >= 0.08 rad.
- S5. Smoothness: the max angle between adjacent face normals on any character mesh is <= 20 degrees at LOD0,
  <= 30 at LOD1. Limbs >= 16 radial segments with rings <= 0.06 m apart.
- S6. One bevel scale: every hard-edged part (shoes, bags, phone, crates) has bevel radius >= 0.25 x its smallest
  dimension and >= 0.012 m. Shoes are rounded toe-caps, not boxes; no lace geometry.
- S7. Head: width/height 0.88-0.95; chin radius >= 0.45 x head half-width (no egg point); neck radius
  0.30-0.38 x head half-width, visible neck <= 0.04 x height.
- S8. Hair is one sculpted mass with at most 3 large lobes; no rows of small spheres.

## Proportions (ratios to total height H unless stated)

| | adult | child | elder |
|---|---|---|---|
| H (m) | 1.75 | 1.10 | 1.62 |
| head (chin to crown incl. hair) / H | 0.30 | 0.36 | 0.29 |
| leg (hip to sole) / H | 0.40 | 0.34 | 0.39 |
| arm (shoulder to wrist) / H | 0.30 | 0.28 | 0.30 |
| shoulder width / head width | 1.5 | 1.2 | 1.45 |

- P1. Child is a separate proportion set, never a uniform scale of the adult (check: head/H differs >= 0.05).
- P2. Elder: spine stoop 0.14 rad, grey hair #98938b; otherwise the adult rig.
- P3. Upper arm radius 0.040 H; thigh radius 0.058 H; foot length 0.13 H.
- P4. **The Mitten Rule.** A hand is one mesh: palm + a single finger mass + thumb. Length 0.36 x head height,
  width 0.52 x hand length, finger mass tip fully rounded. The index finger separates only for `point`.

## Face

**The Sixth-Frame Rule.** Every feature is checked at a figure height of 320 px (head about 96 px).
- F1. Eyes: dark gloss ellipsoid #1f1714 (roughness .15-.25), height 0.17 x head height (>= 14 px at
  1/6 frame), height/width 1.35, centres 0.40 x head width apart, centred 0.46 of head height above the chin.
- F2. Highlights: exactly 2, unlit white, upper-outer on the same side for both eyes; main diameter
  0.36 x eye width (>= 3 px at 1/6 frame), second 0.18.
- F3. Brows: one rounded bar per eye in the hair colour (HSL lightness <= 0.35), length 1.1 x eye width,
  thickness 0.25 x eye height, gap 0.45 x eye height above the eye. Fear and sad lift the inner end >= 0.3 rad.
- F4. Mouth: centred 0.21 of head height above the chin, conformed to the head (offset <= 0.002 m, no
  floating disc), line thickness >= 0.022 x head height (>= 2 px at 1/6 frame).

| shape | width / head width | open / head height | corner lift | notes |
|---|---|---|---|---|
| neutral | 0.20 | 0 | +0.15 | closed curve, slight smile |
| talk | 0.16-0.24 | 0.04-0.12 | +0.05 | visemes keep `talkMouth3` timing |
| happy | 0.26 | 0.05 | +0.85 | D shape, teeth visible |
| fear | 0.14 | 0.09 | -0.35 | round O (roundness 0.7) |

- F5. Nose: a small skin-coloured bump merged into the head mesh, not a separate sphere.
- F6. Blush: optional, MeshStandard (lit) or vertex colour, opacity <= 0.30; never unlit.

## Colors

**The Pop Off Clay Rule.** Tops use only `palette.tops`; each is OKLab dE >= 8 from every city colour
(`palette.cityReference`, incl. clay-finished scenery).
- Skin (6): porcelain #f0c39b, honey #dca27a, tan #c68660, caramel #a8693f, umber #8a5232, espresso #6b3d26.
- Tops: tomato #e4553b, marigold #f7c21a, cobalt #3d6fdb, violet #8b58c7, leaf #5aab45, rose #e5689a, cloud #fbf8f2
  (measured dE vs city: 8.7, 8.4, 13.1, 14.2, 14.5, 10.5, 9.8).
- Bottoms: navy #2c3a52, cocoa #4b3a33, charcoal #2a2c33. Shoes use a bottom colour or the character's accent, never cream.
- Hair: #2a211f #49312b #29282b #38231c, elder #98938b.
- Face: eye #1f1714, highlight #ffffff, mouth inside #4c1a24, tongue #d46a74, teeth #f7f2e8, blush #ff8a86.
- C1. Max HSL saturation 0.95; max channel value 0.98 (headroom under ACES at exposure 1.15).
- C2. One accent per character (hat, bag, scarf, shoes) covering <= 15% of its surface.
- C3. Scenery never reuses a top colour (a stall or awning matching a shirt within dE 8 fails).
- C4. Creatures sit dE >= 9 from every skin tone.

## Elevation & Depth (shading and light)

**The One Vinyl Rule.** One material model on every character part: MeshStandardMaterial, metalness 0,
flatShading false. Roughness: skin .55-.65, cloth .70-.85, hair .55-.70, shoes .50-.70, eyes .15-.25.
- E1. Unlit materials only for eye highlights. No metal (earrings become matte gold #caa85e at metalness 0).
- E2. Under every cinema finish, character materials keep flatShading false (faceted applies to scenery only);
  ceramic/soft roughness changes are allowed.
- E3. Light: key = sun #ffc890 at 1.2; fill/key 0.45-0.60; rim #dfe6ff at 0.35-0.50 of key, azimuth 120-160
  degrees from the key, on character shots. ACES Filmic at exposure 1.15 stays.
- E4. No rendered skin pixel above 245 in any 8-bit channel in the reference frames (no clipped faces).
- E5. Body meshes cast shadows; face parts never do.

## Components

### Octopus (and future creatures)
- O1. Mantle plus 8 tentacles; each tentacle is one continuous tapered skinned tube (>= 6 bones,
  >= 12 radial and >= 24 length segments), never a chain of separate spheres.
- O2. Tentacle length 1.3-1.6 x mantle height; tip radius <= 0.18 x base radius; tentacles grow out of the
  mantle's underside with a blended web, no visible join.
- O3. Curl: the last 30% of each tentacle bends 2.1-5.2 rad cumulative in idle; no two adjacent tentacles share a phase.
- O4. Suckers: 2 rows of >= 6 discs on the underside of the first 70%, radius 0.35-0.6 x local tentacle radius,
  colour underside #ef9fb5.
- O5. Body #c2456e (dE 12.5 from the nearest skin), roughness .45-.55, single colour: no alternating stripes.
- O6. Face uses the human Eye3 build (F1-F3 ratios against mantle height 0.17) with highlights; brows #6e2340;
  mouth follows F4 and the same shape table.

### Level of detail and budgets
| tier | when (applyCrowdLOD effective distance) | max triangles | max meshes |
|---|---|---|---|
| LOD0 | cast, or < 8 m | 9,000 | 16 |
| LOD1 | 8-24 m | 3,500 | 8 |
| LOD2 | > 24 m | 900 | 3 |
| octopus LOD0 | always | 14,000 | 12 (<= 5 materials) |

- L1. A 100-character crowd (6 LOD0, 30 LOD1, 64 LOD2) totals <= 250,000 triangles and <= 1,200 draw calls
  including the shadow pass, and the market story still passes `npm run test:budgets` unchanged.
- L2. Materials come from `toyPalette` / `paletteMaterial`. Private materials: 0 by default, <= 3 (skin, top,
  eye) only for stories that tint people (zombie); skinned parts never clone their material.
- L3. LOD switches never change silhouette colour blocks (same top/bottom/skin colours at every tier).

## Do's and Don'ts

### Do:
- **Do** check each new character against the token file in code (ratios, dE, budgets) and on a 540x960 capture.
- **Do** keep rig bone names so `poseJointedRig`, `faceV2` and the catalog keep working.

### Don't:
- **Don't** treat Part 1 values as rules: brick mitten fists, lace boxes, beaded tentacles, flat-shaded
  characters under `faceted`, unlit blush, per-limb material clones and clothing in scenery colours are
  defects the shipped build carries, not house style.
- **Don't** build a character from loose spheres and boxes; every form passes S1 and S5.
- **Don't** scale an adult to make a child.
