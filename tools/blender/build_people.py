# Frame Studio people pipeline (Step 7 revision). Runs inside Blender:
#   blender -b --factory-startup -P tools/blender/build_people.py -- [--only id,id] [--skip-anims]
# For each cast model (qa/cast-src/<id>.glb, from tools/build-cast.mjs) it
#   1. normalises it: metres, Z up in Blender (Y up in glTF), soles at 0, a height per character,
#   2. fixes the rig: the feet become children of the shins (the packs drive them as IK targets under the root, which
#      the engine cannot use) and the IK helper bones (PoleTarget/PT) are removed,
#   3. exports public/assets/people/<id>.glb (mesh + skeleton, no clips).
# Per rig family ("u": Ultimate Animated Character pack, "m": modular pack) it retargets the Quaternius Universal
# Animation Library (CC0, qa/asset-src/ual) and a few of the packs' own clips onto the family's reference model and
# exports public/assets/people/anim-<family>.glb (skeleton + clips). Clips use local bone rotations, which the
# models of one family share; the engine scales the pelvis height per model.
import bpy, sys, os, math, json, re
from mathutils import Matrix, Quaternion, Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'qa', 'cast-src')
UAL = os.path.join(ROOT, 'qa', 'asset-src', 'ual', 'Universal Animation Library[Standard]', 'Unreal-Godot', 'UAL1_Standard.glb')
OUT = os.path.join(ROOT, 'public', 'assets', 'people')
FPS = 30

# id: (family, height in metres)
CAST = {
    'u-woman': ('u', 1.66), 'u-woman-casual': ('u', 1.64), 'u-woman-tank': ('u', 1.67), 'u-woman-dress': ('u', 1.65),
    'u-man': ('u', 1.76), 'u-man2': ('u', 1.78), 'u-man-sleeves': ('u', 1.75), 'u-man-suit': ('u', 1.72),
    'm-woman2': ('m', 1.66), 'm-woman3': ('m', 1.65), 'm-punk2': ('m', 1.67), 'm-adventurer2': ('m', 1.66),
    'm-beach': ('m', 1.77), 'm-casual': ('m', 1.78), 'm-business': ('m', 1.79), 'm-hoodie': ('m', 1.76),
    'm-farmer': ('m', 1.77), 'm-punk': ('m', 1.78), 'm-adventurer': ('m', 1.8), 'm-worker': ('m', 1.79), 'm-swat': ('m', 1.82),
}
REFERENCE = {'u': 'u-man', 'm': 'm-casual'}

# Universal Animation Library bone -> family bone (body chain; unmapped finger bones keep their rest pose)
MAP = {
    'u': {'pelvis': 'Body', 'spine_01': 'Hips', 'spine_02': 'Abdomen', 'spine_03': 'Torso', 'neck_01': 'Neck', 'Head': 'Head',
          'clavicle_l': 'Shoulder.L', 'upperarm_l': 'UpperArm.L', 'lowerarm_l': 'LowerArm.L', 'hand_l': 'Palm.L',
          'clavicle_r': 'Shoulder.R', 'upperarm_r': 'UpperArm.R', 'lowerarm_r': 'LowerArm.R', 'hand_r': 'Palm.R',
          'thumb_01_l': 'Thumb1.L', 'thumb_02_l': 'Thumb2.L', 'thumb_01_r': 'Thumb1.R', 'thumb_02_r': 'Thumb2.R',
          'middle_01_l': 'MiddleHand.L', 'middle_02_l': 'Fingers.L', 'middle_01_r': 'MiddleHand.R', 'middle_02_r': 'Fingers.R',
          'thigh_l': 'UpperLeg.L', 'calf_l': 'LowerLeg.L', 'foot_l': 'Foot.L', 'thigh_r': 'UpperLeg.R', 'calf_r': 'LowerLeg.R', 'foot_r': 'Foot.R'},
    'm': {'pelvis': 'Body', 'spine_01': 'Hips', 'spine_02': 'Torso', 'spine_03': 'Chest', 'neck_01': 'Neck', 'Head': 'Head',
          'clavicle_l': 'Shoulder.L', 'upperarm_l': 'UpperArm.L', 'lowerarm_l': 'LowerArm.L', 'hand_l': 'Wrist.L',
          'clavicle_r': 'Shoulder.R', 'upperarm_r': 'UpperArm.R', 'lowerarm_r': 'LowerArm.R', 'hand_r': 'Wrist.R',
          'thigh_l': 'UpperLeg.L', 'calf_l': 'LowerLeg.L', 'foot_l': 'Foot.L', 'thigh_r': 'UpperLeg.R', 'calf_r': 'LowerLeg.R', 'foot_r': 'Foot.R'},
}
for side in 'lr':
    S = side.upper()
    for f, F in (('index', 'Index'), ('middle', 'Middle'), ('ring', 'Ring'), ('pinky', 'Pinky'), ('thumb', 'Thumb')):
        for n in (1, 2, 3):
            MAP['m'][f'{f}_0{n}_{side}'] = f'{F}{n}.{S}'

# engine clip name -> Universal Animation Library action
CLIPS = {
    'idle': 'Idle_Loop', 'talk': 'Idle_Talking_Loop', 'walk': 'Walk_Loop', 'walk_formal': 'Walk_Formal_Loop', 'run': 'Jog_Fwd_Loop',
    'sprint': 'Sprint_Loop', 'crouch': 'Crouch_Idle_Loop', 'crouch_walk': 'Crouch_Fwd_Loop', 'sit': 'Sitting_Idle_Loop',
    'sit_talk': 'Sitting_Talking_Loop', 'sit_enter': 'Sitting_Enter', 'jump': 'Jump_Loop', 'jump_start': 'Jump_Start', 'jump_land': 'Jump_Land',
    'dance': 'Dance_Loop', 'swim': 'Swim_Fwd_Loop', 'swim_idle': 'Swim_Idle_Loop', 'fall': 'Death01', 'hit': 'Hit_Chest',
    'interact': 'Interact', 'aim': 'Pistol_Aim_Neutral', 'phone': 'Idle_Torch_Loop', 'push': 'Push_Loop', 'drive': 'Driving_Loop',
    'pickup': 'PickUp_Table', 'kneel': 'Fixing_Kneeling', 'roll': 'Roll', 'punch': 'Punch_Jab',
}
# Clips made from a library clip with some bones aimed at fixed directions (Blender world: the character faces -Y, its
# left is +X, up is +Z): engine name -> (library action, {library bone: direction}, frames 'all' or 'last').
POSED = {
    'point': ('Idle_Loop', {'upperarm_r': (-0.12, -1.0, 0.18), 'lowerarm_r': (-0.12, -1.0, 0.2), 'hand_r': (-0.1, -1.0, 0.2)}, 'all'),
    'think': ('Idle_Loop', {'upperarm_r': (-0.18, -0.35, -0.92), 'lowerarm_r': (0.45, -0.5, 0.74), 'hand_r': (0.35, -0.3, 0.88)}, 'all'),
    'carry': ('Walk_Loop', {'upperarm_l': (0.18, -0.45, -0.87), 'lowerarm_l': (-0.3, -0.95, 0.05), 'upperarm_r': (-0.18, -0.45, -0.87), 'lowerarm_r': (0.3, -0.95, 0.05)}, 'all'),
    'carry_idle': ('Idle_Loop', {'upperarm_l': (0.18, -0.45, -0.87), 'lowerarm_l': (-0.3, -0.95, 0.05), 'upperarm_r': (-0.18, -0.45, -0.87), 'lowerarm_r': (0.3, -0.95, 0.05)}, 'all'),
    'zombie': ('Walk_Loop', {'upperarm_l': (0.12, -1.0, 0.05), 'lowerarm_l': (0.05, -1.0, 0.0), 'upperarm_r': (-0.12, -1.0, 0.05), 'lowerarm_r': (-0.05, -1.0, 0.0)}, 'all'),
    # cower: the library's own crouch (head tucked, hands at the knees). Aimed arms over the head knotted the forearms
    # and passed through the head, so no aims here.
    'cower': ('Crouch_Idle_Loop', {}, 'all'),
    'sleep': ('Death01', {}, 'last'),
}
# library bone -> the library bone its direction is measured to (limb rest alignment)
CHILD = {f'{b}_{s}': f'{c}_{s}' for s in 'lr' for b, c in (('clavicle', 'upperarm'), ('upperarm', 'lowerarm'), ('lowerarm', 'hand'), ('hand', 'middle_01'), ('thigh', 'calf'), ('calf', 'foot'))}
# Fingers do not follow the library (its finger motion does not map cleanly onto these hands and splays them): each
# finger bone keeps a relaxed curl relative to the hand. Curl in radians per segment; the U pack has one 'Fingers' bone.
FINGER = re.compile(r'^(Index|Middle|Ring|Pinky|Thumb)\d\.[LR]$|^Fingers\.[LR]$')
CURL = {'Index': .32, 'Middle': .38, 'Ring': .42, 'Pinky': .46, 'Thumb': .12, 'Fingers': .75}
STRAIGHT_INDEX = {'point'}

# clips taken from the packs themselves (source file, action suffix, engine name); retargeted to both families
PACK_CLIPS = [('m-casual', 'Wave', 'wave'), ('u-man', 'Clapping', 'cheer')]


def args():
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    o = {'only': None, 'skip_anims': False, 'skip_models': False}
    i = 0
    while i < len(a):
        if a[i] == '--only': o['only'] = a[i + 1].split(','); i += 1
        elif a[i] == '--skip-anims': o['skip_anims'] = True
        elif a[i] == '--skip-models': o['skip_models'] = True
        i += 1
    return o


def clear_scene():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for a in list(bpy.data.actions): bpy.data.actions.remove(a)  # each family's clips are exported before the next starts
    for coll in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.images):
        for d in list(coll):
            if d.users == 0: coll.remove(d)


def import_glb(path):
    before_o, before_a = set(bpy.data.objects), set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=path)
    objs = [o for o in bpy.data.objects if o not in before_o]
    acts = [a for a in bpy.data.actions if a not in before_a]
    arm = next(o for o in objs if o.type == 'ARMATURE')
    # the importer nests the rig under helper empties that can carry its scale/rotation: keep world transforms, unparent
    keep = [arm] + [o for o in objs if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)]
    for o in keep:
        mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    # helper objects the importer makes (bone end empties, icosphere bone shapes)
    for o in objs:
        if o.type not in ('ARMATURE', 'MESH') or (o.type == 'MESH' and not any(m.type == 'ARMATURE' for m in o.modifiers)):
            bpy.data.objects.remove(o, do_unlink=True)
    meshes = [o for o in bpy.data.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' and m.object == arm for m in o.modifiers)]
    return arm, meshes, acts


def select_only(objs, active):
    bpy.ops.object.mode_set(mode='OBJECT') if bpy.context.object and bpy.context.object.mode != 'OBJECT' else None
    for o in bpy.context.view_layer.objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = active


def mesh_bounds(meshes):
    dg = bpy.context.evaluated_depsgraph_get(); lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
    for m in meshes:
        e = m.evaluated_get(dg); me = e.to_mesh()
        for v in me.vertices:
            p = m.matrix_world @ v.co
            lo = Vector(map(min, lo, p)); hi = Vector(map(max, hi, p))
        e.to_mesh_clear()
    return lo, hi


def normalise(arm, meshes, height):
    """Rest pose, metres, soles at 0, the given height; transforms applied so the armature object is identity."""
    if arm.animation_data: arm.animation_data_clear()
    for pb in arm.pose.bones: pb.matrix_basis = Matrix.Identity(4)
    # every model must face -Y like the clip libraries' reference models; a model facing +Y (m-adventurer) mirrored
    # every arm motion (lowering an arm raised it) and walked backwards. The packs' foot bones point the way it faces.
    bpy.context.view_layer.update()
    foot = arm.data.bones.get('Foot.L') or arm.data.bones.get('Foot.R')
    if foot and ((arm.matrix_world @ foot.tail_local).y - (arm.matrix_world @ foot.head_local).y) > 0:
        turn = Matrix.Rotation(math.pi, 4, 'Z')
        for ob in [arm] + meshes: ob.matrix_world = turn @ ob.matrix_world
        print('TURNED to face -Y')
    select_only([arm] + meshes, arm)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    lo, hi = mesh_bounds(meshes)
    k = height / (hi.z - lo.z)
    for ob in [arm] + meshes:
        ob.scale = (k, k, k); ob.location = (-(lo.x + hi.x) / 2 * k, -(lo.y + hi.y) / 2 * k, -lo.z * k)
    select_only([arm] + meshes, arm)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    lo, hi = mesh_bounds(meshes)
    return lo, hi


ANKLE = .08  # ankle joint height for a 1.76 m body (scaled by height)


def fix_rig(arm, meshes, height):
    """Feet under the shins (FK legs), IK helper bones removed, and real ankles. The packs put the foot bone's head at
    the back of the heel on the sole (an IK target) and skin the heel and shoe shaft to the shin, so pointing the toes
    split the shoe and rolled the toes into the floor. The ankle joint moves to the ankle (the centre of the leg's
    cross-section at ankle height), the foot bone points at the toes, and everything below the ankle follows the foot
    (a short blend across the ankle). Returns the foot measurements the engine grounds feet with."""
    k = height / 1.76; az, band = ANKLE * k, .022 * k
    side = {}
    for s in 'LR':
        shin_g, foot_g = f'LowerLeg.{s}', f'Foot.{s}'
        if shin_g not in arm.data.bones or foot_g not in arm.data.bones: continue
        pts, foot_pts = [], []
        for m in meshes:
            gi = {g.index: g.name for g in m.vertex_groups}
            for v in m.data.vertices:
                w = {gi.get(g.group): g.weight for g in v.groups}
                if w.get(shin_g, 0) + w.get(foot_g, 0) > .3:
                    p = m.matrix_world @ v.co; pts.append(p)
                    if w.get(foot_g, 0) > .3 or p.z < az: foot_pts.append(p)
        ring = [p for p in pts if abs(p.z - az) < .015 * k] or pts
        cx = sum(p.x for p in ring) / len(ring); cy = sum(p.y for p in ring) / len(ring)
        toe = min(p.y for p in foot_pts); heel = max(p.y for p in foot_pts)  # the character faces -Y
        side[s] = (Vector((cx, cy, az)), toe, heel)
    select_only([arm], arm)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones
    for s in 'LR':
        foot, shin = eb.get(f'Foot.{s}'), eb.get(f'LowerLeg.{s}')
        if foot and shin:
            foot.use_connect = False; foot.parent = shin
            if s in side:
                c, toe, heel = side[s]
                shin.tail = c; foot.head = c; foot.tail = Vector((c.x, toe, .02 * k)); foot.roll = 0
    for n in [b.name for b in eb if b.name.startswith(('PoleTarget', 'PT.'))]:
        eb.remove(eb[n])
    bpy.ops.object.mode_set(mode='OBJECT')
    # below the ankle: foot; across the ankle: blend; above: as authored
    for m in meshes:
        for s in side:
            gs, gf = m.vertex_groups.get(f'LowerLeg.{s}'), m.vertex_groups.get(f'Foot.{s}')
            if not gs: continue
            if not gf: gf = m.vertex_groups.new(name=f'Foot.{s}')
            for v in m.data.vertices:
                w = {g.group: g.weight for g in v.groups}; ws, wf = w.get(gs.index, 0), w.get(gf.index, 0); tot = ws + wf
                z = (m.matrix_world @ v.co).z
                if tot <= 0 or z > az + band: continue
                t = min(1, max(0, (az + band - z) / (2 * band))); t = t * t * (3 - 2 * t)
                f = max(wf / tot, t)
                gf.add([v.index], tot * f, 'REPLACE')
                if f >= 1: gs.remove([v.index])
                else: gs.add([v.index], tot * (1 - f), 'REPLACE')
    if not side: return None
    n = len(side)
    return {'ankle': round(sum(c.z for c, _, _ in side.values()) / n, 4),
            'toe': round(sum(c.y - t for c, t, _ in side.values()) / n, 4),
            'heel': round(sum(h - c.y for c, _, h in side.values()) / n, 4)}


import re
from mathutils.bvhtree import BVHTree

def base_name(mat):
    return re.sub(r'\.\d+$', '', mat.name) if mat else ''


def separate_faces(m, vset):
    """Splits the faces of m whose vertices are all in vset into a new object (vertex groups, materials and the
    armature modifier come along). Returns it, or None."""
    select_only([m], m)
    for poly in m.data.polygons: poly.select = all(vi in vset for vi in poly.vertices)
    if not any(poly.select for poly in m.data.polygons): return None
    before = set(bpy.data.objects)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_mode(type='FACE')
    bpy.ops.mesh.separate(type='SELECTED'); bpy.ops.object.mode_set(mode='OBJECT')
    new = [o for o in bpy.data.objects if o not in before]
    return new[0] if new else None


def face_rig(arm, meshes):
    """Face controls for expressions and lip-sync, as shape keys (glTF morph targets):
    blink (the model's own eyes flatten), brow_up / brow_angry / brow_sad (the model's brows or brow ridge), and a fitted
    mouth mesh with open / wide / round / smile / frown. Returns landmarks for the build report."""
    hz = arm.data.bones['Head'].head_local.z
    verts = {}  # material base name -> [(mesh, index, co)]
    for m in meshes:
        for poly in m.data.polygons:
            name = base_name(m.material_slots[poly.material_index].material) if m.material_slots else ''
            for vi in poly.vertices:
                co = m.data.vertices[vi].co
                if co.z > hz - .06: verts.setdefault(name, {})[(m.name, vi)] = (m, vi, co.copy())
    eyes = list((verts.get('Eyes') or verts.get('Eye') or {}).values())
    split_brows = []
    if not eyes:
        # eyes and brows painted with one dark material on the front of the face (some modular-pack women): the
        # material whose front-face vertices stay within the eye area, split at the largest height gap
        skin_y = min((v[2].y for v in (verts.get('Skin') or {}).values()), default=0)
        for name in ('Brown', 'Black', 'Dark', 'Eyebrows'):
            cand = [v for v in (verts.get(name) or {}).values() if v[2].y < skin_y + .03 and abs(v[2].x) < .09]
            if len(cand) < 8 or max(abs(v[2].x) for v in cand) < .02: continue
            zs = sorted({round(v[2].z, 4) for v in cand}); gaps = [(zs[i + 1] - zs[i], (zs[i + 1] + zs[i]) / 2) for i in range(len(zs) - 1)]
            if not gaps: continue
            g, cut = max(gaps)
            if g < .004: continue
            eyes = [v for v in cand if v[2].z < cut]; split_brows = [v for v in cand if v[2].z >= cut]
            break
    if not eyes: return None
    ex = max(abs(v[2].x) for v in eyes); ez = sum(v[2].z for v in eyes) / len(eyes); etop = max(v[2].z for v in eyes); efront = min(v[2].y for v in eyes)
    eye_h = etop - min(v[2].z for v in eyes)
    brows = split_brows or list((verts.get('Eyebrows') or {}).values())
    if not brows:  # painted brows: the hair (U pack) or skin strips just above and in front of the eyes
        band = lambda name: [v for v in (verts.get(name) or {}).values() if etop + .002 < v[2].z < etop + .03 and abs(v[2].x) < ex + .015 and v[2].y < efront + .02]
        brows = band('Hair') or band('Skin')
    skin_front = [v[2] for v in (verts.get('Skin') or {}).values() if v[2].y < efront + .05 and abs(v[2].x) < ex]
    chin = min(c.z for c in skin_front) if skin_front else ez - .12
    # Move the eye and brow faces into their own small mesh, so the shape keys (stored for every vertex of a mesh in
    # glTF) cover a few hundred vertices instead of a whole body.
    ck = lambda co: (round(co.x, 5), round(co.y, 5), round(co.z, 5))
    eye_keys, brow_keys = {ck(v[2]) for v in eyes}, {ck(v[2]) for v in brows}
    by_mesh = {}
    for m, vi, co in eyes + brows: by_mesh.setdefault(m.name, (m, set()))[1].add(vi)
    parts = []
    for m, vset in by_mesh.values():
        part = separate_faces(m, vset)
        if part: part.name = m.name + '_face'; parts.append(part); meshes.append(part)
    if parts:
        eyes = [(o, v.index, v.co.copy()) for o in parts for v in o.data.vertices if ck(v.co) in eye_keys]
        brows = [(o, v.index, v.co.copy()) for o in parts for v in o.data.vertices if ck(v.co) in brow_keys]
    keyed = {}
    def key(m, name):
        if not m.data.shape_keys: m.shape_key_add(name='Basis', from_mix=False)
        k = m.data.shape_keys.key_blocks.get(name) or m.shape_key_add(name=name, from_mix=False)
        keyed.setdefault(m.name, m); return k
    # blink: each eye flattens toward its own centre line
    for side in (-1, 1):
        part = [v for v in eyes if v[2].x * side > 0]
        if not part: continue
        cz = (max(v[2].z for v in part) + min(v[2].z for v in part)) / 2
        for m, vi, co in part:
            key(m, 'blink').data[vi].co.z = cz + (co.z - cz) * .08
    # brows: up, angry (inner down, outer up), sad (inner up, outer down)
    lift = .14 * eye_h + .0025
    for m, vi, co in brows:
        inner = 1 - min(1, abs(co.x) / max(ex, 1e-3))  # 1 at the middle, 0 at the outer end
        key(m, 'brow_up').data[vi].co.z = co.z + lift
        key(m, 'brow_angry').data[vi].co.z = co.z + lift * (.6 - 1.5 * inner)
        key(m, 'brow_sad').data[vi].co.z = co.z + lift * (1.4 * inner - .4)
    # make sure every keyed mesh has all keys (morph target lists must match across a mesh's primitives)
    for m in list(keyed.values()):
        for n in ('blink', 'brow_up', 'brow_angry', 'brow_sad'): key(m, n)
        for kb in m.data.shape_keys.key_blocks: kb.value = 0.0  # exported as the mesh's default morph weights: neutral face
    # no mouth is added: the models keep their own face (U: sculpted lips, M: designed without a mouth)
    mz = ez - .55 * (ez - chin)
    return {'eye_z': round(ez, 3), 'eye_x': round(ex, 3), 'chin': round(chin, 3), 'mouth_z': round(mz, 3), 'brow_verts': len(brows), 'face_meshes': sorted(keyed)}


def rest_rot_world(arm, name):
    return (arm.matrix_world @ arm.data.bones[name].matrix_local).to_quaternion()


def retarget(src, tgt, mapping, action_name, clip_name, height_ratio, aims=None, frames='all'):
    """Bakes src action onto tgt as a new action named clip_name: world-space rotation deltas from the rest pose, with
    each limb's rest direction aligned to the library's (so T-pose differences such as arm or leg spread do not carry
    into every pose). aims: {library bone: world direction} applied on top; frames 'last' bakes one held frame."""
    act = bpy.data.actions[action_name]
    src.animation_data_create(); src.animation_data.action = act
    if act.slots: src.animation_data.action_slot = act.slots[0]
    f0, f1 = (int(round(v)) for v in act.frame_range)
    inv_map = {v: k for k, v in mapping.items() if v in tgt.data.bones}
    src_rest = {s: rest_rot_world(src, s) for s in mapping if s in src.data.bones}
    tgt_rest = {t: rest_rot_world(tgt, t) for t in inv_map}
    head_w = lambda arm, n: arm.matrix_world @ arm.data.bones[n].head_local
    for s_name, s_child in CHILD.items():
        t_name, t_child = mapping.get(s_name), mapping.get(s_child)
        if t_name in tgt_rest and t_child and t_child in tgt.data.bones and s_name in src.data.bones and s_child in src.data.bones:
            d_s = (head_w(src, s_child) - head_w(src, s_name)).normalized(); d_t = (head_w(tgt, t_child) - head_w(tgt, t_name)).normalized()
            tgt_rest[t_name] = d_t.rotation_difference(d_s) @ tgt_rest[t_name]
    # aims in target bone names, with each bone's rest direction to its child in bone-local space
    t_aims = {}
    for s_name, d in (aims or {}).items():
        t_name = mapping.get(s_name)
        if not t_name or t_name not in tgt.data.bones: continue
        b = tgt.data.bones[t_name]; kid = mapping.get(CHILD.get(s_name, ''), None)
        tip = tgt.data.bones[kid].head_local if kid and kid in tgt.data.bones else (b.children[0].head_local if b.children else b.tail_local)
        local = b.matrix_local.to_3x3().inverted() @ (tip - b.head_local).normalized()
        t_aims[t_name] = (local, Vector(d).normalized())
    # relaxed finger curl: a rotation about the axis across the finger (finger direction x palm normal; the rest pose is a
    # T-pose with palms down), in each finger bone's own rest frame
    curls = {}
    for b in tgt.data.bones:
        if not FINGER.match(b.name): continue
        kind = re.match(r'[A-Za-z]+', b.name).group(0)
        if clip_name in STRAIGHT_INDEX and kind == 'Index': continue
        tip = b.children[0].head_local if b.children else b.tail_local
        d = (tip - b.head_local).normalized(); axis = d.cross(Vector((0, 0, -1)))
        if axis.length < 1e-4: continue
        local = (b.matrix_local.to_3x3().inverted() @ axis.normalized()).normalized()
        curls[b.name] = Quaternion(local, CURL[kind])
    order = [b for b in tgt.data.bones]  # bones are stored parents first
    root_t = mapping.get('pelvis'); src_pelvis_rest = (src.matrix_world @ src.data.bones['pelvis'].matrix_local).to_translation() if 'pelvis' in src.data.bones else None
    new = bpy.data.actions.new(clip_name); new.use_fake_user = True
    tgt.animation_data_create(); tgt.animation_data.action = new
    tw_inv = tgt.matrix_world.inverted()
    keys = [(f1, 0)] if frames == 'last' else [(f, f) for f in range(f0, f1 + 1)]
    for f, key in keys:
        bpy.context.scene.frame_set(f)
        f = key
        M = {}
        for b in order:
            pb = tgt.pose.bones[b.name]
            if b.parent:
                rel = b.parent.matrix_local.inverted() @ b.matrix_local
                fk = M[b.parent.name] @ rel
            else:
                fk = b.matrix_local.copy()
            want = fk
            s = inv_map.get(b.name)
            if b.name in curls or FINGER.match(b.name) or b.name.startswith('MiddleHand'):
                s = None; want = fk @ curls[b.name].to_matrix().to_4x4() if b.name in curls else fk
            if s and s in src_rest:
                ws = (src.matrix_world @ src.pose.bones[s].matrix).to_quaternion()
                wt = ws @ src_rest[s].inverted() @ tgt_rest[b.name]
                ra = (tw_inv.to_quaternion() @ wt).to_matrix().to_4x4()
                loc = fk.to_translation()
                if b.name == root_t and src_pelvis_rest is not None:
                    sp = (src.matrix_world @ src.pose.bones['pelvis'].matrix).to_translation()
                    loc = b.matrix_local.to_translation() + tw_inv.to_3x3() @ ((sp - src_pelvis_rest) * height_ratio)
                want = Matrix.Translation(loc) @ ra
            if b.name in t_aims:
                local, d = t_aims[b.name]; now = (want.to_3x3() @ local).normalized()
                want = Matrix.Translation(want.to_translation()) @ (now.rotation_difference(d).to_matrix() @ want.to_3x3()).to_4x4()
            M[b.name] = want
            basis = fk.inverted() @ want
            l, r, _ = basis.decompose()
            pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = r
            pb.keyframe_insert('rotation_quaternion', frame=f, group=b.name)
            if b.name == root_t:
                pb.location = l; pb.keyframe_insert('location', frame=f, group=b.name)
    tgt.animation_data.action = None
    return new


def export_glb(path, objs, animations):
    select_only(objs, objs[0])
    os.makedirs(os.path.dirname(path), exist_ok=True)
    kw = dict(filepath=path, use_selection=True, export_format='GLB', export_yup=True, export_apply=False, export_skins=True,
              export_morph=True, export_try_sparse_sk=False, export_animations=animations, export_materials='EXPORT', export_normals=True, export_texcoords=True)
    if animations: kw.update(export_animation_mode='ACTIONS', export_force_sampling=True, export_frame_step=1, export_optimize_animation_size=True)
    bpy.ops.export_scene.gltf(**kw)


def main():
    o = args()
    bpy.context.scene.render.fps = FPS
    os.makedirs(OUT, exist_ok=True)
    rp = os.path.join(OUT, 'build-report.json')
    report = json.load(open(rp)) if os.path.exists(rp) else {}  # partial runs (--only, --skip-*) update their entries
    report.setdefault('models', {}); report.setdefault('families', {})
    ids = o['only'] or list(CAST)
    if not o['skip_models']:
        for cid in ids:
            fam, h = CAST[cid]
            clear_scene()
            arm, meshes, acts = import_glb(os.path.join(SRC, cid + '.glb'))
            for a in acts: bpy.data.actions.remove(a)
            lo, hi = normalise(arm, meshes, h)
            feet = fix_rig(arm, meshes, h)
            face = face_rig(arm, meshes)
            body = arm.data.bones['Body'].head_local
            export_glb(os.path.join(OUT, cid + '.glb'), [arm] + meshes, False)
            report['models'][cid] = {'family': fam, 'height': round(hi.z - lo.z, 3), 'pelvis': round(body.z, 4), 'meshes': len(meshes), 'face': face, 'feet': feet}
            print('MODEL', cid, report['models'][cid])
    if not o['skip_anims']:
        for fam, ref in REFERENCE.items():
            clear_scene()
            src, src_meshes, _ = import_glb(UAL)
            for m in src_meshes: bpy.data.objects.remove(m, do_unlink=True)
            arm, meshes, acts = import_glb(os.path.join(SRC, ref + '.glb'))
            pack_actions = {a.name: a for a in acts}
            lo, hi = normalise(arm, meshes, CAST[ref][1])
            fix_rig(arm, meshes, CAST[ref][1])
            ratio = arm.data.bones['Body'].head_local.z / (src.matrix_world @ src.data.bones['pelvis'].head_local).z
            made = []
            for clip, act in CLIPS.items():
                if act in bpy.data.actions:
                    made.append(retarget(src, arm, MAP[fam], act, clip, ratio).name)
            for clip, (act, aims, frames) in POSED.items():
                made.append(retarget(src, arm, MAP[fam], act, clip, ratio, aims, frames).name)
            # pack clips (wave from the modular pack, clapping from the U pack), retargeted through a pack skeleton
            for pid, suffix, clip in PACK_CLIPS:
                psrc, pmeshes, pacts = import_glb(os.path.join(SRC, pid + '.glb'))
                for m in pmeshes: bpy.data.objects.remove(m, do_unlink=True)
                import re
                pa = next((a for a in pacts if re.sub(r'\.\d+$', '', a.name.split('|')[-1]).endswith(suffix)), None)
                if pa:
                    # map the pack's bones onto this family through the shared body-bone names
                    pmap = {s: s for s in MAP[fam].values() if s in psrc.data.bones}
                    pmap['Body'] = 'Body'
                    made.append(retarget_pack(psrc, arm, pmap, pa, clip))
                bpy.data.objects.remove(psrc, do_unlink=True)
            for a in [a for a in bpy.data.actions if a.name not in made]:
                bpy.data.actions.remove(a)
            for m in meshes: bpy.data.objects.remove(m, do_unlink=True)
            export_glb(os.path.join(OUT, f'anim-{fam}.glb'), [arm], True)
            report['families'][fam] = {'reference': ref, 'clips': sorted(made), 'pelvis': round(arm.data.bones['Body'].head_local.z, 4)}
            print('FAMILY', fam, report['families'][fam])
    with open(rp, 'w') as f: json.dump(report, f, indent=1)


def retarget_pack(src, tgt, mapping, act, clip_name):
    """Same as retarget for a pack skeleton (bones named like the target's); pelvis height from 'Body'."""
    src.animation_data_create(); src.animation_data.action = act
    if act.slots: src.animation_data.action_slot = act.slots[0]
    f0, f1 = (int(round(v)) for v in act.frame_range)
    new = bpy.data.actions.new(clip_name); new.use_fake_user = True
    tgt.animation_data_create(); tgt.animation_data.action = new
    src_rest = {s: rest_rot_world(src, s) for s in mapping if s in src.data.bones}
    tgt_rest = {t: rest_rot_world(tgt, t) for t in mapping.values() if t in tgt.data.bones}
    tw_inv = tgt.matrix_world.inverted()
    for f in range(f0, f1 + 1):
        bpy.context.scene.frame_set(f)
        M = {}
        for b in tgt.data.bones:
            pb = tgt.pose.bones[b.name]
            fk = (M[b.parent.name] @ (b.parent.matrix_local.inverted() @ b.matrix_local)) if b.parent else b.matrix_local.copy()
            want = fk
            if b.name in mapping and b.name in src_rest and b.name != 'Body':
                ws = (src.matrix_world @ src.pose.bones[b.name].matrix).to_quaternion()
                wt = ws @ src_rest[b.name].inverted() @ tgt_rest[b.name]
                want = Matrix.Translation(fk.to_translation()) @ (tw_inv.to_quaternion() @ wt).to_matrix().to_4x4()
            M[b.name] = want
            _, r, _ = (fk.inverted() @ want).decompose()
            pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = r
            pb.keyframe_insert('rotation_quaternion', frame=f, group=b.name)
    tgt.animation_data.action = None
    return new.name


main()
