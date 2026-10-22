# Frame Studio people pipeline, PSX edition (Phase 1 of design/overhaul-plan.md). Runs inside Blender:
#   blender -b --factory-startup -P tools/blender/build_psx_people.py -- [--only id,id] [--skip-anims] [--skip-models]
# Source: Characters PSX 1.2 (C:\Users\HP\Desktop\ASSETS, override with FS_ASSETS): 138 characters on the Mixamo
# skeleton, one mesh and one 512 px texture each. For each character it
#   1. imports the rigged FBX and its texture, renames the Mixamo bones to the engine's names (Hips -> Body, Spine ->
#      Hips, LeftArm -> UpperArm.L ...) so src/assets/19-cast.js drives them like the earlier cast,
#   2. normalises it: metres, the model's own height, soles at 0, facing -Y (Blender), transforms applied,
#   3. measures the feet around the ankle joint (Mixamo's foot bone already starts at the ankle),
#   4. shrinks the texture to 256 px (PSX size) and exports public/assets/people/<id>.glb (mesh + skeleton, JPEG).
# Then it retargets the Quaternius Universal Animation Library (CC0) and the Quaternius packs' wave and clapping onto the
# reference character (world-space rotation deltas, limb rest directions aligned, relaxed finger curl) and exports
# public/assets/people/anim-x.glb, with each walking clip's stride measured from the stance foot. The build report
# also carries the role pools the engine picks models from.
import bpy, sys, os, math, json, re
from mathutils import Matrix, Quaternion, Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ASSETS = os.environ.get('FS_ASSETS', r'C:\Users\HP\Desktop\ASSETS')
PACK = os.path.join(ASSETS, 'Characters_psx_1.2', 'Characters_psx_1.2', 'Characters_psx_02')
RIG_DIR, TEX_DIR = os.path.join(PACK, 'Models', 'Rig'), os.path.join(PACK, 'Textures')
UAL = next(p for p in (os.path.join(ROOT, 'qa', 'asset-src', 'ual', 'Universal Animation Library[Standard]', 'Unreal-Godot', 'UAL1_Standard.glb'),
                       os.path.join(ASSETS, 'ANIMATION', 'Universal Animation Library[Standard]', 'Unreal-Godot', 'UAL1_Standard.glb')) if os.path.exists(p))
PACK_SRC = os.path.join(ROOT, 'qa', 'cast-src')  # Quaternius pack models, only for their wave and clapping clips (fetched by tools/build-cast.mjs, commit 74d24a2)
OUT = os.path.join(ROOT, 'public', 'assets', 'people')
FPS, TEX = 30, 256
FAMILY, REFERENCE = 'x', 'x-01'
# left out: no texture in the pack (Female_01); never picked by the engine (the two exotic dancers); see Monster below
SKIP = {'Character_Female_01', 'Character_56_Female_Exotic_dancer', 'Character_56_Female_Exotic_dancer_01',
        'Character_Monster'}  # Monster: very long thin limbs, the lent skeleton cannot fit it (an arm flew out, a leg stretched)


def char_id(name):
    return 'x-' + name.replace('Character_', '').lower().replace('_', '-')


# Mixamo bone -> engine bone (Blender names; glTF drops the dot: UpperArm.L -> UpperArmL)
RENAME = {'Hips': 'Body', 'Spine': 'Hips', 'Spine1': 'Abdomen', 'Spine2': 'Torso', 'Neck': 'Neck', 'Head': 'Head', 'HeadTop_End': 'HeadTop'}
for side, S in (('Left', 'L'), ('Right', 'R')):
    RENAME.update({f'{side}Shoulder': f'Shoulder.{S}', f'{side}Arm': f'UpperArm.{S}', f'{side}ForeArm': f'LowerArm.{S}', f'{side}Hand': f'Palm.{S}',
                   f'{side}UpLeg': f'UpperLeg.{S}', f'{side}Leg': f'LowerLeg.{S}', f'{side}Foot': f'Foot.{S}', f'{side}ToeBase': f'Toe.{S}', f'{side}Toe_End': f'ToeEnd.{S}'})
    for f in ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky'):
        for n in (1, 2, 3, 4):
            RENAME[f'{side}Hand{f}{n}'] = f'{f}{n}.{S}'

# Universal Animation Library bone -> engine bone
MAP = {'pelvis': 'Body', 'spine_01': 'Hips', 'spine_02': 'Abdomen', 'spine_03': 'Torso', 'neck_01': 'Neck', 'Head': 'Head'}
for s in 'lr':
    S = s.upper()
    MAP.update({f'clavicle_{s}': f'Shoulder.{S}', f'upperarm_{s}': f'UpperArm.{S}', f'lowerarm_{s}': f'LowerArm.{S}', f'hand_{s}': f'Palm.{S}',
                f'thigh_{s}': f'UpperLeg.{S}', f'calf_{s}': f'LowerLeg.{S}', f'foot_{s}': f'Foot.{S}', f'ball_{s}': f'Toe.{S}'})

# engine clip name -> library action (the first block is the earlier cast's set; the second the new clips)
CLIPS = {
    'idle': 'Idle_Loop', 'talk': 'Idle_Talking_Loop', 'walk': 'Walk_Loop', 'walk_formal': 'Walk_Formal_Loop', 'run': 'Jog_Fwd_Loop',
    'sprint': 'Sprint_Loop', 'crouch': 'Crouch_Idle_Loop', 'crouch_walk': 'Crouch_Fwd_Loop', 'sit': 'Sitting_Idle_Loop',
    'sit_talk': 'Sitting_Talking_Loop', 'sit_enter': 'Sitting_Enter', 'jump': 'Jump_Loop', 'jump_start': 'Jump_Start', 'jump_land': 'Jump_Land',
    'dance': 'Dance_Loop', 'swim': 'Swim_Fwd_Loop', 'swim_idle': 'Swim_Idle_Loop', 'fall': 'Death01', 'hit': 'Hit_Chest',
    'interact': 'Interact', 'aim': 'Pistol_Aim_Neutral', 'phone': 'Idle_Torch_Loop', 'push': 'Push_Loop', 'drive': 'Driving_Loop',
    'pickup': 'PickUp_Table', 'kneel': 'Fixing_Kneeling', 'roll': 'Roll', 'punch': 'Punch_Jab',
    'jog': 'Jog_Fwd_Loop', 'death': 'Death01', 'shoot': 'Pistol_Shoot', 'reload': 'Pistol_Reload', 'pistol_idle': 'Pistol_Idle_Loop',
    'aim_up': 'Pistol_Aim_Up', 'aim_down': 'Pistol_Aim_Down', 'torch': 'Idle_Torch_Loop', 'sword': 'Sword_Attack', 'sword_idle': 'Sword_Idle',
    'hit_head': 'Hit_Head', 'sit_exit': 'Sitting_Exit', 'punch_cross': 'Punch_Cross',
}
# clips made from a library clip with some bones aimed at fixed directions (Blender world: faces -Y, left +X, up +Z)
POSED = {
    'point': ('Idle_Loop', {'upperarm_r': (-0.12, -1.0, 0.18), 'lowerarm_r': (-0.12, -1.0, 0.2), 'hand_r': (-0.1, -1.0, 0.2)}, 'all'),
    'think': ('Idle_Loop', {'upperarm_r': (-0.18, -0.35, -0.92), 'lowerarm_r': (0.45, -0.5, 0.74), 'hand_r': (0.35, -0.3, 0.88)}, 'all'),
    'carry': ('Walk_Loop', {'upperarm_l': (0.18, -0.45, -0.87), 'lowerarm_l': (-0.3, -0.95, 0.05), 'upperarm_r': (-0.18, -0.45, -0.87), 'lowerarm_r': (0.3, -0.95, 0.05)}, 'all'),
    'carry_idle': ('Idle_Loop', {'upperarm_l': (0.18, -0.45, -0.87), 'lowerarm_l': (-0.3, -0.95, 0.05), 'upperarm_r': (-0.18, -0.45, -0.87), 'lowerarm_r': (0.3, -0.95, 0.05)}, 'all'),
    'zombie': ('Walk_Loop', {'upperarm_l': (0.12, -1.0, 0.05), 'lowerarm_l': (0.05, -1.0, 0.0), 'upperarm_r': (-0.12, -1.0, 0.05), 'lowerarm_r': (-0.05, -1.0, 0.0)}, 'all'),
    'cower': ('Crouch_Idle_Loop', {}, 'all'),
    'sleep': ('Death01', {}, 'last'),
    'dead': ('Death01', {}, 'last'),
}
# library bone -> the bone its direction is measured to (limb rest alignment)
CHILD = {f'{b}_{s}': f'{c}_{s}' for s in 'lr' for b, c in (('clavicle', 'upperarm'), ('upperarm', 'lowerarm'), ('lowerarm', 'hand'), ('thigh', 'calf'), ('calf', 'foot'), ('foot', 'ball'))}
FINGER = re.compile(r'^(Index|Middle|Ring|Pinky|Thumb)\d\.[LR]$')
CURL = {'Index': .32, 'Middle': .38, 'Ring': .42, 'Pinky': .46, 'Thumb': .12}
STRAIGHT_INDEX = {'point'}
# clips from the Quaternius packs (file in qa/cast-src, action suffix, engine name, pack bone -> engine bone)
PACK_BONES_U = {n: n for n in ('Body', 'Hips', 'Abdomen', 'Torso', 'Neck', 'Head')}
PACK_BONES_M = {'Body': 'Body', 'Hips': 'Hips', 'Torso': 'Abdomen', 'Chest': 'Torso', 'Neck': 'Neck', 'Head': 'Head'}
for S in 'LR':
    for m in (PACK_BONES_U, PACK_BONES_M):
        m.update({f'Shoulder.{S}': f'Shoulder.{S}', f'UpperArm.{S}': f'UpperArm.{S}', f'LowerArm.{S}': f'LowerArm.{S}',
                  f'UpperLeg.{S}': f'UpperLeg.{S}', f'LowerLeg.{S}': f'LowerLeg.{S}', f'Foot.{S}': f'Foot.{S}'})
    PACK_BONES_U[f'Palm.{S}'] = f'Palm.{S}'; PACK_BONES_M[f'Wrist.{S}'] = f'Palm.{S}'
PACK_CLIPS = [('m-casual', 'Wave', 'wave', PACK_BONES_M), ('u-man', 'Clapping', 'cheer', PACK_BONES_U)]
# walking clips whose time follows the distance walked (stride = metres per clip cycle, measured on the reference)
STRIDE_CLIPS = ['walk', 'walk_formal', 'zombie', 'carry', 'crouch_walk', 'run', 'jog', 'sprint', 'swim']

# Role pools (ids), per sex. Crowds pick from 'casual'; elders and children have their own; the uniforms go to their
# roles; killers and monsters are the horror cast. Anything not listed for a role falls back to 'casual'.
def ids(*names): return [char_id('Character_' + n) for n in names]
ROLES = {
    'police': {'m': ids('17_Police', '18_Police', '19_Police', '20_Police'), 'f': ids('17_Female_Police', '18_Female_Police', '19_Female_Police', '20_Female_Police')},
    'sol': {'m': ids('21_Police', '22_Police'), 'f': ids('25_Female_Police', '26_Female_Police')},
    'sheriff': {'m': ids('Sheriff_N', 'Sheriff_N_01'), 'f': ids('19_Female_Police', '20_Female_Police')},
    'fire': {'m': ids('23_Firefighter', '24_Firefighter'), 'f': ids('21_Female_Firefighter', '22_Female_Firefighter')},
    'medic': {'m': ids('25_Doctor', '26_Doctor'), 'f': ids('23_Female_Doctor', '24_Female_Doctor')},
    'worker': {'m': ids('27_HM', '28_HM'), 'f': ids('27_Female_HM', '28_Female_HM')},
    'office': {'m': ids('05', 'Male_36', 'Male_47', 'Male_45'), 'f': ids('37_Female', '38_Female', '39_Female', '45_Female')},
    'vendor': {'m': ids('Male_35', 'Male_45', 'Male_49', 'Male_53'), 'f': ids('43_Female', '49_Female', '54_Female', '55_Female')},
    'athlete': {'m': ids('11', '12', 'Male_55'), 'f': ids('41_Female', '47_Female', 'Female_09')},
    'hiker': {'m': ids('Male_44', '16', 'Male_43'), 'f': ids('34_Female', '35_Female', '43_Female')},
    'survivor': {'m': ids('Male_57', '14', 'Male_42'), 'f': ids('40_Female', '44_Female', 'Female_12')},
    'elder': {'m': ids('Male_33', 'Male_34', 'Male_51', 'Male_48'), 'f': ids('29_Female', '30_Female', '31_Female', '32_Female', '51_Female')},
    'child': {'m': ids('11', '12', '03', '07'), 'f': ids('Female_15', 'Female_16', 'Female_05', '33_Female')},
    'killer': {'m': ids('Killer', 'Killer_01', 'Killer_02', 'Killer_03', 'Killer_04', 'Killer_05', 'Killer_06', 'Killer_07', 'Killer_08', 'Killer_09', 'Killer_10', 'Killer_10_01')},
    'zombie': {'m': ids('Monster', 'Monster_01', 'Monster_02', 'Monster_03', 'Monster_04', 'Monster_05', 'Monster_06', 'Monster_07', 'Monster_08')},
}
ROLES['chef'] = ROLES['vendor']; ROLES['student'] = ROLES['child']; ROLES['civ'] = {}


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
    for a in list(bpy.data.actions): bpy.data.actions.remove(a)
    for coll in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.images):
        for d in list(coll):
            if d.users == 0: coll.remove(d)


def select_only(objs, active):
    if bpy.context.object and bpy.context.object.mode != 'OBJECT': bpy.ops.object.mode_set(mode='OBJECT')
    for o in bpy.context.view_layer.objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = active


def import_rigged(path, glb=False):
    """Imports a rigged file; returns (armature, deforming meshes, new actions). Helper empties are removed and the rig
    is unparented with its world transform kept."""
    before_o, before_a = set(bpy.data.objects), set(bpy.data.actions)
    if glb: bpy.ops.import_scene.gltf(filepath=path)
    else: bpy.ops.import_scene.fbx(filepath=path, ignore_leaf_bones=False, automatic_bone_orientation=False)
    objs = [o for o in bpy.data.objects if o not in before_o]
    acts = [a for a in bpy.data.actions if a not in before_a]
    arm = next(o for o in objs if o.type == 'ARMATURE')
    deform = lambda o: o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)
    for o in [arm] + [o for o in objs if deform(o)]:
        mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    for o in objs:
        if o.type != 'ARMATURE' and not deform(o): bpy.data.objects.remove(o, do_unlink=True)
    meshes = [o for o in bpy.data.objects if deform(o) and any(m.type == 'ARMATURE' and m.object == arm for m in o.modifiers)]
    return arm, meshes, acts


def rename_bones(arm, meshes):
    for b in arm.data.bones:
        short = b.name.split(':')[-1]
        new = RENAME.get(short)
        if not new: continue
        old = b.name; b.name = new
        for m in meshes:
            vg = m.vertex_groups.get(old)
            if vg: vg.name = new


def mesh_bounds(meshes):
    dg = bpy.context.evaluated_depsgraph_get(); lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
    for m in meshes:
        e = m.evaluated_get(dg); me = e.to_mesh()
        for v in me.vertices:
            p = m.matrix_world @ v.co
            lo = Vector(map(min, lo, p)); hi = Vector(map(max, hi, p))
        e.to_mesh_clear()
    return lo, hi


def normalise(arm, meshes):
    """Rest pose, metres (the model's own height), soles at 0, centred, facing -Y; transforms applied."""
    if arm.animation_data: arm.animation_data_clear()
    for pb in arm.pose.bones: pb.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    select_only([arm] + meshes, arm)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    # turn the model so its feet point to -Y (the pack's FBX files face -X): the ankle-to-toe direction in the ground
    # plane, averaged over both feet, is the way it faces
    d = Vector((0, 0, 0))
    for S in 'LR':
        foot, toe = arm.data.bones.get(f'Foot.{S}'), arm.data.bones.get(f'Toe.{S}')
        if foot: d += (arm.matrix_world @ (toe.head_local if toe else foot.tail_local)) - (arm.matrix_world @ foot.head_local)
    d.z = 0
    if d.length > 1e-6:
        angle = math.atan2(-1, 0) - math.atan2(d.y, d.x)
        if abs(angle) > 1e-4:
            turn = Matrix.Rotation(angle, 4, 'Z')
            for ob in [arm] + meshes: ob.matrix_world = turn @ ob.matrix_world
            select_only([arm] + meshes, arm); bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    lo, hi = mesh_bounds(meshes)
    for ob in [arm] + meshes:
        ob.location = (ob.location.x - (lo.x + hi.x) / 2, ob.location.y - (lo.y + hi.y) / 2, ob.location.z - lo.z)
    select_only([arm] + meshes, arm)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return mesh_bounds(meshes)


def measure_feet(arm, meshes):
    """Ankle height and how far the toe tip and heel reach from the ankle joint (along the facing axis, -Y)."""
    out = []
    for S in 'LR':
        fb = arm.data.bones.get(f'Foot.{S}')
        if not fb: continue
        groups = {f'Foot.{S}', f'Toe.{S}', f'ToeEnd.{S}'}; c = arm.matrix_world @ fb.head_local; ys = []
        for m in meshes:
            gi = {g.index: g.name for g in m.vertex_groups}
            for v in m.data.vertices:
                if sum(g.weight for g in v.groups if gi.get(g.group) in groups) > .5: ys.append((m.matrix_world @ v.co).y)
        if ys: out.append((c.z, c.y - min(ys), max(ys) - c.y))
    if not out: return None
    n = len(out)
    return {'ankle': round(sum(o[0] for o in out) / n, 4), 'toe': round(sum(o[1] for o in out) / n, 4), 'heel': round(sum(o[2] for o in out) / n, 4)}


def prepare_material(meshes, name):
    """One plain PSX material: the character's texture shrunk to TEX px (relinked from the pack's Textures folder),
    no metal, no shine. Returns whether a texture was found."""
    found = False
    for m in meshes:
        for slot in m.material_slots:
            mat = slot.material
            if not mat or not mat.use_nodes: continue
            bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            tex = next((n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image), None)
            if tex:
                img = tex.image
                if not img.has_data or img.size[0] == 0:
                    alt = os.path.join(TEX_DIR, name + '.png')
                    if os.path.exists(alt): img.filepath = alt; img.reload()
                if img.size[0] > TEX: img.scale(TEX, TEX)
                found = img.size[0] > 0
            if bsdf:
                bsdf.inputs['Metallic'].default_value = 0.0; bsdf.inputs['Roughness'].default_value = 1.0
                for k in ('Specular IOR Level', 'Specular'):
                    if k in bsdf.inputs: bsdf.inputs[k].default_value = 0.0
    return found


def rest_rot_world(arm, name):
    return (arm.matrix_world @ arm.data.bones[name].matrix_local).to_quaternion()


def retarget(src, tgt, mapping, act, clip_name, height_ratio, aims=None, frames='all', src_root='pelvis', child=CHILD):
    """Bakes act (on src) onto tgt as a new action clip_name: world-space rotation deltas from the rest pose, limb rest
    directions aligned (child), aims {source bone: world direction} on top, relaxed finger curls; frames 'last' bakes
    one held frame. The root moves by the source root's motion scaled by height_ratio."""
    src.animation_data_create(); src.animation_data.action = act
    if act.slots: src.animation_data.action_slot = act.slots[0]
    f0, f1 = (int(round(v)) for v in act.frame_range)
    inv_map = {v: k for k, v in mapping.items() if v in tgt.data.bones and k in src.data.bones}
    src_rest = {s: rest_rot_world(src, s) for s in mapping if s in src.data.bones}
    tgt_rest = {t: rest_rot_world(tgt, t) for t in inv_map}
    head_w = lambda arm, n: arm.matrix_world @ arm.data.bones[n].head_local
    for s_name, s_child in child.items():
        t_name, t_child = mapping.get(s_name), mapping.get(s_child)
        if t_name in tgt_rest and t_child and t_child in tgt.data.bones and s_name in src.data.bones and s_child in src.data.bones:
            d_s = (head_w(src, s_child) - head_w(src, s_name)).normalized(); d_t = (head_w(tgt, t_child) - head_w(tgt, t_name)).normalized()
            tgt_rest[t_name] = d_t.rotation_difference(d_s) @ tgt_rest[t_name]
    t_aims = {}
    for s_name, d in (aims or {}).items():
        t_name = mapping.get(s_name)
        if not t_name or t_name not in tgt.data.bones: continue
        b = tgt.data.bones[t_name]; kid = mapping.get(child.get(s_name, ''), None)
        tip = tgt.data.bones[kid].head_local if kid and kid in tgt.data.bones else (b.children[0].head_local if b.children else b.tail_local)
        t_aims[t_name] = (b.matrix_local.to_3x3().inverted() @ (tip - b.head_local).normalized(), Vector(d).normalized())
    curls = {}
    for b in tgt.data.bones:
        if not FINGER.match(b.name): continue
        kind = re.match(r'[A-Za-z]+', b.name).group(0)
        if clip_name in STRAIGHT_INDEX and kind == 'Index': continue
        tip = b.children[0].head_local if b.children else b.tail_local
        d = (tip - b.head_local).normalized(); axis = d.cross(Vector((0, 0, -1)))
        if axis.length < 1e-4: continue
        curls[b.name] = Quaternion((b.matrix_local.to_3x3().inverted() @ axis.normalized()).normalized(), CURL[kind])
    root_t = mapping.get(src_root)
    src_root_rest = (src.matrix_world @ src.data.bones[src_root].matrix_local).to_translation() if src_root in src.data.bones else None
    new = bpy.data.actions.new(clip_name); new.use_fake_user = True
    tgt.animation_data_create(); tgt.animation_data.action = new
    tw_inv = tgt.matrix_world.inverted()
    keys = [(f1, 0)] if frames == 'last' else [(f, f) for f in range(f0, f1 + 1)]
    for f, key in keys:
        bpy.context.scene.frame_set(f)
        M = {}
        for b in tgt.data.bones:
            pb = tgt.pose.bones[b.name]
            fk = (M[b.parent.name] @ (b.parent.matrix_local.inverted() @ b.matrix_local)) if b.parent else b.matrix_local.copy()
            want = fk
            s = inv_map.get(b.name)
            if b.name in curls: s = None; want = fk @ curls[b.name].to_matrix().to_4x4()
            elif FINGER.match(b.name): s = None
            if s and s in src_rest:
                ws = (src.matrix_world @ src.pose.bones[s].matrix).to_quaternion()
                wt = ws @ src_rest[s].inverted() @ tgt_rest[b.name]
                loc = fk.to_translation()
                if b.name == root_t and src_root_rest is not None:
                    sp = (src.matrix_world @ src.pose.bones[src_root].matrix).to_translation()
                    loc = b.matrix_local.to_translation() + tw_inv.to_3x3() @ ((sp - src_root_rest) * height_ratio)
                want = Matrix.Translation(loc) @ (tw_inv.to_quaternion() @ wt).to_matrix().to_4x4()
            if b.name in t_aims:
                local, d = t_aims[b.name]; now = (want.to_3x3() @ local).normalized()
                want = Matrix.Translation(want.to_translation()) @ (now.rotation_difference(d).to_matrix() @ want.to_3x3()).to_4x4()
            M[b.name] = want
            l, r, _ = (fk.inverted() @ want).decompose()
            pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = r
            pb.keyframe_insert('rotation_quaternion', frame=key, group=b.name)
            if b.name == root_t:
                pb.location = l; pb.keyframe_insert('location', frame=key, group=b.name)
    tgt.animation_data.action = None
    return new


def measure_stride(arm, act):
    """Metres the body would travel per clip cycle for the feet to stay planted: the backward travel of the lower foot
    summed over the cycle (the clip walks in place; the character faces -Y, so a planted foot moves toward +Y)."""
    arm.animation_data_create(); arm.animation_data.action = act
    f0, f1 = (int(round(v)) for v in act.frame_range)
    pts = []
    for f in range(f0, f1 + 1):
        bpy.context.scene.frame_set(f)
        pts.append([arm.matrix_world @ arm.pose.bones[f'Foot.{S}'].head for S in 'LR'])
    arm.animation_data.action = None
    dist = 0.0
    for i in range(1, len(pts)):
        k = 0 if pts[i][0].z < pts[i][1].z else 1
        dy = pts[i][k].y - pts[i - 1][k].y
        if dy > 0: dist += dy
    return round(dist, 3)


# Strides the engine uses (metres per clip cycle at refHeight; scaled by each person's height). Tuned with
# tools/foot-probe.mjs (median slide of the planted point): the earlier cast's table for the same library clips left
# these legs sliding (market 22%, outbreak 27% against 13% for the old cast); walking clips x1.2 and running clips x1.1
# bring both back to the old cast's level. The simple measurement below is kept in the report as a cross-check.
STRIDE = {'refHeight': 1.76, 'walk': 1.36, 'walk_formal': 1.39, 'zombie': 1.36, 'carry': 1.36, 'crouch_walk': .97, 'run': 2.53, 'jog': 2.53, 'sprint': 3.3, 'swim': 1.3}


def export_glb(path, objs, animations):
    select_only(objs, objs[0])
    os.makedirs(os.path.dirname(path), exist_ok=True)
    kw = dict(filepath=path, use_selection=True, export_format='GLB', export_yup=True, export_apply=False, export_skins=True,
              export_morph=False, export_animations=animations, export_materials='EXPORT', export_normals=True, export_texcoords=True,
              export_image_format='JPEG', export_jpeg_quality=85)
    if animations: kw.update(export_animation_mode='ACTIONS', export_force_sampling=True, export_frame_step=1, export_optimize_animation_size=True, export_materials='NONE')
    bpy.ops.export_scene.gltf(**kw)


def sources():
    out = {}
    for sex_dir in sorted(os.listdir(RIG_DIR)):
        for f in sorted(os.listdir(os.path.join(RIG_DIR, sex_dir))):
            if f.lower().endswith('.fbx') and f[:-4] not in SKIP:
                out[char_id(f[:-4])] = (os.path.join(RIG_DIR, sex_dir, f), f[:-4], 'f' if sex_dir == 'Female' else 'm', sex_dir)
    return out


def tpose_rest(arm, meshes, acts):
    """These files rest with the arms hanging down, and their one-frame Mixamo action is a T-pose. The animation library
    (and the retarget) assume a T-pose with the palms down: aligning only limb directions from an arms-down rest left a
    quarter turn of twist in every arm, so elbows bent outward and the zombie's arms crossed. The T-pose becomes the rest
    pose: the mesh is baked into it, then the pose is applied as the skeleton's rest."""
    act = next((a for a in acts if a.frame_range[1] - a.frame_range[0] <= 2), None)
    if not act: return False
    arm.animation_data_create(); arm.animation_data.action = act
    if act.slots: arm.animation_data.action_slot = act.slots[0]
    bpy.context.scene.frame_set(int(act.frame_range[0])); bpy.context.view_layer.update()
    for m in meshes:
        mod = next(md for md in m.modifiers if md.type == 'ARMATURE')
        select_only([m], m); bpy.ops.object.modifier_apply(modifier=mod.name)
        nm = m.modifiers.new('Armature', 'ARMATURE'); nm.object = arm
    select_only([arm], arm); bpy.ops.object.mode_set(mode='POSE')
    bpy.ops.pose.armature_apply(selected=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    arm.animation_data.action = None
    return True


DONOR = os.path.join(RIG_DIR, 'Male', 'Character_01.fbx')
NO_RIG = {'Character_Monster_01', 'Character_Monster_02', 'Character_Monster_03', 'Character_Monster_04', 'Character_Monster_05'}  # skeleton lent to the meshes that ship without one


def rig_from_donor(path):
    """For a character file with no skeleton (Monster, Monster_01-05): imports the donor's rig (its arms-down bind pose
    matches these meshes), stretches it to the mesh's bounding box, moves each joint toward the centre of the nearby
    mesh, and binds with automatic (heat) weights. Returns (armature, meshes, actions) like import_rigged, with the
    donor's one-frame T-pose action so tpose_rest works the same way."""
    arm, dmeshes, acts = import_rigged(DONOR)
    # the FBX importer leaves the one-frame T-pose action on the skeleton: binding the mesh while it was posed turned
    # the body a quarter turn and flung an arm out. Bind at rest; tpose_rest applies the T-pose afterwards.
    if arm.animation_data: arm.animation_data.action = None
    for pb in arm.pose.bones: pb.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    dlo, dhi = mesh_bounds(dmeshes)
    for m in dmeshes: bpy.data.objects.remove(m, do_unlink=True)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path)
    meshes = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
    for o in [o for o in bpy.data.objects if o not in before and o.type != 'MESH']: bpy.data.objects.remove(o, do_unlink=True)
    for m in meshes:
        mw = m.matrix_world.copy(); m.parent = None; m.matrix_world = mw
    # only the mesh's transform is applied: the skeleton keeps its own (its T-pose action is stored in its original
    # axes and units, and applying the transform first blew the body up to 6 m in tpose_rest)
    select_only(meshes, meshes[0]); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    lo, hi = mesh_bounds(meshes)
    # same orientation as the donor (both straight from the pack), so a per-axis stretch maps the donor's body box
    # onto the mesh's; the arms hang down in both, so x is the shoulder width, not an arm span
    k = Vector(((hi.x - lo.x) / max(dhi.x - dlo.x, 1e-6), (hi.y - lo.y) / max(dhi.y - dlo.y, 1e-6), (hi.z - lo.z) / max(dhi.z - dlo.z, 1e-6)))
    dc, mc = (dlo + dhi) / 2, (lo + hi) / 2
    fit = lambda p: Vector((mc.x + (p.x - dc.x) * k.x, mc.y + (p.y - dc.y) * k.y, lo.z + (p.z - dlo.z) * k.z))
    verts = [m.matrix_world @ v.co for m in meshes for v in m.data.vertices]
    h = hi.z - lo.z
    select_only([arm], arm); bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones; mw, mwi = arm.matrix_world, arm.matrix_world.inverted()
    # keep every bone's twist: moving a joint makes Blender recompute the roll, and for near-vertical bones (the legs) a
    # small change of direction flipped the knee hinge sideways, so the walk kicked across the body
    roll_axis = {b.name: b.z_axis.copy() for b in eb}
    # every joint is read before any moves, and the bones are disconnected first: with connected bones, placing a
    # parent's tail also moved its child's head, which was then stretched a second time (spine bones came out 2.5x
    # long or a third of their length)
    orig = {b.name: (mw @ b.head, mw @ b.tail) for b in eb}
    for b in eb: b.use_connect = False
    for b in eb: b.head, b.tail = mwi @ fit(orig[b.name][0]), mwi @ fit(orig[b.name][1])
    # joints toward the middle of the limb around them (fingers and end bones follow their parents). Each bone moves as
    # a whole, so it keeps the donor's direction: moving only the head flipped short spine bones (the head passed the
    # tail), and the posed clips, which aim the arms through the chest, broke. The spine, neck and head move only
    # sideways, so the chain keeps its order up the body.
    for b in eb:
        if re.search(r'Hand(Thumb|Index|Middle|Ring|Pinky)|_End$', b.name): continue
        p = mw @ b.head; r = .06 * h
        near = [v for v in verts if (v - p).length < r]
        if len(near) < 8: continue
        c = sum(near, Vector()) / len(near); target = p.lerp(c, .7)
        if re.sub(r'^mixamorig\d*:', '', b.name) in ('Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head'): target.z = p.z  # Mixamo names: renamed later
        d = mwi @ target - b.head
        b.head += d; b.tail += d
    for b in eb: b.align_roll(roll_axis[b.name])
    bpy.ops.object.mode_set(mode='OBJECT')
    select_only(meshes + [arm], arm)
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    for m in meshes:
        if not any(md.type == 'ARMATURE' for md in m.modifiers): raise RuntimeError('automatic weights failed')
        if not m.vertex_groups or all(not v.groups for v in m.data.vertices): raise RuntimeError('no weights')
    # texture: the pack's Textures folder, by the file's own name
    return arm, meshes, acts


def build_model(cid, path, name, unrigged=False):
    clear_scene()
    arm, meshes, acts = rig_from_donor(path) if unrigged else import_rigged(path)
    tpose_rest(arm, meshes, acts)
    for a in acts: bpy.data.actions.remove(a)
    if not meshes: raise RuntimeError('no deforming mesh')
    rename_bones(arm, meshes)
    lo, hi = normalise(arm, meshes)
    textured = prepare_material(meshes, name)
    return arm, meshes, lo, hi, textured


def main():
    o = args()
    bpy.context.scene.render.fps = FPS
    os.makedirs(OUT, exist_ok=True)
    rp = os.path.join(OUT, 'build-report.json')
    report = json.load(open(rp)) if os.path.exists(rp) else {}
    if report.get('pipeline') != 'psx':  # the earlier Quaternius report is replaced, not merged
        report = {'pipeline': 'psx', 'models': {}, 'families': {}}
    src = sources()
    ids_ = o['only'] or list(src)
    if not o['skip_models']:
        for cid in ids_:
            path, name, sex, group = src[cid]
            try:
                arm, meshes, lo, hi, textured = build_model(cid, path, name, unrigged=name in NO_RIG)
            except Exception as e:
                print('SKIP', cid, e); report['models'].pop(cid, None); continue
            needed = ('Body', 'Hips', 'Torso', 'Head', 'UpperArm.L', 'LowerArm.L', 'Palm.L', 'UpperLeg.L', 'LowerLeg.L', 'Foot.L')
            missing = [n for n in needed if n not in arm.data.bones]
            if missing:
                print('UNRIGGED', cid, 'missing', missing); report['models'].pop(cid, None); continue
            feet = measure_feet(arm, meshes)
            export_glb(os.path.join(OUT, cid + '.glb'), [arm] + meshes, False)
            report['models'][cid] = {'family': FAMILY, 'name': name, 'autorig': name in NO_RIG, 'group': group, 'sex': sex, 'height': round(hi.z - lo.z, 3),
                                     'pelvis': round(arm.data.bones['Body'].head_local.z, 4), 'bones': len(arm.data.bones), 'tris': sum(len(m.data.polygons) for m in meshes),
                                     'textured': textured, 'feet': feet}
            print('MODEL', cid, json.dumps(report['models'][cid]))
    if not o['skip_anims']:
        arm, meshes, lo, hi, _ = build_model(REFERENCE, src[REFERENCE][0], src[REFERENCE][1])  # clears the scene first
        lib, lib_meshes, _ = import_rigged(UAL, glb=True)
        for m in lib_meshes: bpy.data.objects.remove(m, do_unlink=True)
        ratio = arm.data.bones['Body'].head_local.z / (lib.matrix_world @ lib.data.bones['pelvis'].head_local).z
        made = []
        for clip, act in CLIPS.items():
            if act in bpy.data.actions: made.append(retarget(lib, arm, MAP, bpy.data.actions[act], clip, ratio).name)
            else: print('NO ACTION', act)
        for clip, (act, aims, frames) in POSED.items():
            made.append(retarget(lib, arm, MAP, bpy.data.actions[act], clip, ratio, aims, frames).name)
        for pid, suffix, clip, pmap in PACK_CLIPS:
            path = os.path.join(PACK_SRC, pid + '.glb')
            if not os.path.exists(path): print('NO PACK', path); continue
            psrc, pmeshes, pacts = import_rigged(path, glb=True)
            for m in pmeshes: bpy.data.objects.remove(m, do_unlink=True)
            pa = next((a for a in pacts if re.sub(r'\.\d+$', '', a.name.split('|')[-1]).endswith(suffix)), None)
            if pa:
                pratio = arm.data.bones['Body'].head_local.z / (psrc.matrix_world @ psrc.data.bones['Body'].head_local).z
                made.append(retarget(psrc, arm, pmap, pa, clip, pratio, src_root='Body', child={}).name)
            bpy.data.objects.remove(psrc, do_unlink=True)
        for a in [a for a in bpy.data.actions if a.name not in made]: bpy.data.actions.remove(a)
        measured = {'refHeight': round(hi.z - lo.z, 3)}
        for clip in STRIDE_CLIPS:
            if clip in bpy.data.actions: measured[clip] = measure_stride(arm, bpy.data.actions[clip])
        stride = dict(STRIDE)
        for m in meshes: bpy.data.objects.remove(m, do_unlink=True)
        export_glb(os.path.join(OUT, f'anim-{FAMILY}.glb'), [arm], True)
        report['families'][FAMILY] = {'reference': REFERENCE, 'clips': sorted(made), 'pelvis': round(arm.data.bones['Body'].head_local.z, 4), 'stride': stride, 'stride_measured': measured}
        print('FAMILY', FAMILY, json.dumps(report['families'][FAMILY]))
    present = set(report['models'])
    report['roles'] = {r: {s: [i for i in l if i in present] for s, l in v.items()} for r, v in ROLES.items()}
    with open(rp, 'w') as f: json.dump(report, f, indent=1)
    write_credits(report)


def write_credits(report):
    """Rewrites the people table in public/models/CREDITS.md (between <!-- cast:start --> and <!-- cast:end -->)."""
    path = os.path.join(ROOT, 'public', 'models', 'CREDITS.md')
    rows = ['<!-- cast:start -->', '| File | Model | Pack | Author | Source |', '|---|---|---|---|---|']
    for cid, m in sorted(report['models'].items()):
        rows.append(f"| ../assets/people/{cid}.glb | {m['name']}{' (rigged here)' if m.get('autorig', m['name'] in NO_RIG) else ''} | Characters PSX 1.2 | elbolilloduro | https://elbolilloduro.itch.io/characters-psx |")
    rows.append(f"| ../assets/people/anim-{FAMILY}.glb | clip library retargeted onto {REFERENCE} | Universal Animation Library (CC0) + Quaternius pack wave/clapping | Quaternius | https://quaternius.itch.io/universal-animation-library |")
    rows.append('<!-- cast:end -->')
    text = open(path, encoding='utf8').read().replace('\r\n', '\n')
    a, b = text.index('<!-- cast:start -->'), text.index('<!-- cast:end -->') + len('<!-- cast:end -->')
    open(path, 'w', encoding='utf8', newline='\n').write(text[:a] + '\n'.join(rows) + text[b:])


main()
