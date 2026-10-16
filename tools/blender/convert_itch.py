# Imports each model file (fbx, obj, glb/gltf, blend) into an empty scene and exports one GLB with textures embedded
# (used by tools/convert-itch.sh for the itch.io PSX packs). Prints one INV {json} line per file.
#   blender -b --factory-startup -P tools/blender/convert_itch.py -- <out_dir> <file> [<file> ...]
import bpy, sys, os, json
argv = sys.argv[sys.argv.index('--') + 1:]
out, files = argv[0], argv[1:]
os.makedirs(out, exist_ok=True)
for f in files:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    ext = os.path.splitext(f)[1].lower()
    try:
        if ext == '.fbx': bpy.ops.import_scene.fbx(filepath=f)
        elif ext == '.obj': bpy.ops.wm.obj_import(filepath=f)
        elif ext in ('.glb', '.gltf'): bpy.ops.import_scene.gltf(filepath=f)
        elif ext == '.blend':
            with bpy.data.libraries.load(f, link=False) as (src, dst): dst.objects = list(src.objects)
            for o in dst.objects:
                if o is not None: bpy.context.scene.collection.objects.link(o)
        else: raise RuntimeError('unsupported ' + ext)
        bpy.ops.file.find_missing_files(directory=os.path.dirname(f))
        meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
        # Blender's OBJ importer turns the MTL ambient (Ka) into metallic; these are plain painted surfaces
        texdir = os.path.join(os.path.dirname(os.path.dirname(f)), 'textures')
        for mat in bpy.data.materials:
            if not mat.use_nodes: continue
            bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if not bsdf: continue
            bsdf.inputs['Metallic'].default_value = 0.0
            # ... and the MTL transmission filter (Tf 1 1 1) into full transmission
            if 'Transmission Weight' in bsdf.inputs: bsdf.inputs['Transmission Weight'].default_value = 0.0
            # packs that ship textures beside the models (skyscrapers: building_01.png for building_01.1 ... 01.4)
            if not any(n.type == 'TEX_IMAGE' for n in mat.node_tree.nodes) and os.path.isdir(texdir):
                stem = os.path.splitext(os.path.basename(f))[0].split('.')[0]
                png = os.path.join(texdir, stem + '.png')
                if os.path.exists(png):
                    tex = mat.node_tree.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(png); tex.interpolation = 'Closest'
                    mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        dg = bpy.context.evaluated_depsgraph_get(); tris = 0
        for o in meshes:
            m = o.evaluated_get(dg).to_mesh(); m.calc_loop_triangles(); tris += len(m.loop_triangles); o.evaluated_get(dg).to_mesh_clear()
        imgs = sorted({i.filepath for i in bpy.data.images if i.filepath})
        name = os.path.splitext(os.path.basename(f))[0].replace(' ', '_')
        dest = os.path.join(out, name + '.glb')
        bpy.ops.export_scene.gltf(filepath=dest, export_format='GLB', export_apply=True, export_yup=True)
        print('INV ' + json.dumps({'file': f, 'glb': dest, 'objects': [o.name for o in meshes], 'tris': tris,
              'materials': sorted({s.material.name for o in meshes for s in o.material_slots if s.material}), 'images': imgs,
              'armatures': len([o for o in bpy.context.scene.objects if o.type == 'ARMATURE']), 'actions': [a.name for a in bpy.data.actions]}), flush=True)
    except Exception as e:
        print('INV ' + json.dumps({'file': f, 'error': str(e)}), flush=True)
