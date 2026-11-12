"""The Ringmaster for Last Shell: a gaunt carnival host with a cracked porcelain mask and top hat, seen across a table.

Run headless:  blender -b -P art/ringmaster.py -- <output folder>
Writes ringmaster_idle, ringmaster_grin, ringmaster_hurt, ringmaster_aim (512x512).
"""
import bpy, bmesh, math, random, sys, os
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else os.path.join(os.path.dirname(__file__), '..', 'img')
os.makedirs(OUT, exist_ok=True)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 80; sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
    sc.render.film_transparent = True; sc.view_settings.exposure = -0.55
    w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.01, 0.006, 0.004, 1)
    return sc


def mat(name, color, rough=.5, metal=0, emit=None, es=0, coat=0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = es
    if coat and 'Coat Weight' in b.inputs: b.inputs['Coat Weight'].default_value = coat
    return m


def porcelain():
    m = bpy.data.materials.new('Porcelain'); m.use_nodes = True; nt = m.node_tree; n = nt.nodes; L = nt.links
    b = n['Principled BSDF']; b.inputs['Roughness'].default_value = .18
    if 'Coat Weight' in b.inputs: b.inputs['Coat Weight'].default_value = .8
    vor = n.new('ShaderNodeTexVoronoi'); vor.feature = 'DISTANCE_TO_EDGE'; vor.inputs['Scale'].default_value = 4.5
    ramp = n.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position = 0; ramp.color_ramp.elements[0].color = (0.05, 0.03, 0.03, 1)
    ramp.color_ramp.elements[1].position = .025; ramp.color_ramp.elements[1].color = (0.86, 0.83, 0.76, 1)
    noise = n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 3
    mix = n.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = .25
    L.new(vor.outputs['Distance'], ramp.inputs['Fac']); L.new(ramp.outputs['Color'], mix.inputs[6]); L.new(noise.outputs['Color'], mix.inputs[7])
    L.new(mix.outputs[2], b.inputs['Base Color'])
    return m


def obj(o, m): o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o


def sphere(loc, r, scale, m, seg=48):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg // 2); o = bpy.context.object; o.scale = scale; return obj(o, m)


def cyl(loc, r, d, m, rot=(0, 0, 0), verts=48):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d, location=loc, rotation=rot, vertices=verts); return obj(bpy.context.object, m)


def build(pose):
    M = {'mask': porcelain(), 'coat': mat('Coat', (0.26, 0.02, 0.04), .55), 'stripe': mat('Stripe', (0.75, 0.66, 0.48), .5),
         'hat': mat('Hat', (0.03, 0.025, 0.03), .35), 'band': mat('Band', (0.6, 0.03, 0.05), .3), 'eye': mat('Eye', (0, 0, 0), .95),
         'pupil': mat('Pupil', (1, .85, .3), .2, 0, (1, .7, .2), 30), 'lips': mat('Lips', (0.35, 0.0, 0.02), .2, coat=.6),
         'teeth': mat('Teeth', (0.72, 0.66, 0.5), .3), 'glove': mat('Glove', (0.85, 0.83, 0.78), .6), 'gold': mat('Gold', (1, .72, .25), .25, 1)}
    tilt = {'idle': 0, 'grin': .2, 'hurt': -.35, 'aim': .06}[pose]
    lean = {'idle': 0, 'grin': .04, 'hurt': .12, 'aim': -.06}[pose]
    # gaunt hunched body from a skin skeleton: hips, chest, sloped shoulders, long arms down to the table
    reach = pose == 'aim'
    P = {'hip': ((0, .2, .1), .2), 'chest': ((0, .12 + lean, .52), .22), 'neck': ((0, .02 + lean, .86), .07),
         'shL': ((.27, .08 + lean, .74), .085), 'shR': ((-.27, .08 + lean, .74), .085),
         'elL': ((.44, -.12, .42), .055), 'elR': ((-.44, -.12, .42), .055),
         'wrL': ((.36, -.42, .1), .045), 'wrR': ((-.36, -.42, .1), .045)}
    if reach: P['elR'] = ((-.3, -.35, .62), .055); P['wrR'] = ((-.18, -.75, .62), .045)
    names = list(P); me = bpy.data.meshes.new('Body'); bm = bmesh.new()
    V = {n: bm.verts.new(P[n][0]) for n in names}
    for a, b in [('hip', 'chest'), ('chest', 'neck'), ('chest', 'shL'), ('chest', 'shR'), ('shL', 'elL'), ('elL', 'wrL'), ('shR', 'elR'), ('elR', 'wrR')]: bm.edges.new((V[a], V[b]))
    bm.to_mesh(me); bm.free()
    body = bpy.data.objects.new('Body', me); bpy.context.scene.collection.objects.link(body)
    sk = body.modifiers.new('Skin', 'SKIN'); sk.branch_smoothing = .6; sk.use_smooth_shade = True
    for i, n in enumerate(names): me.skin_vertices[0].data[i].radius = (P[n][1], P[n][1] * .8); me.skin_vertices[0].data[i].use_root = n == 'hip'
    s = body.modifiers.new('S', 'SUBSURF'); s.levels = s.render_levels = 2
    body.data.materials.append(M['coat'])
    for x in (-.1, .1):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, -.06 + lean, .55), rotation=(0, 0, math.radians(14 if x < 0 else -14))); l = bpy.context.object; l.scale = (.07, .02, .5); obj(l, M['stripe'])
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -.08 + lean, .84)); bt = bpy.context.object; bt.scale = (.18, .04, .07); obj(bt, M['band'])
    for z in (.7, .58, .46): sphere((0, -.1 + lean, z), .018, (1, 1, 1), M['gold'])
    cyl((0, -.02 + lean, .92), .06, .16, M['coat'])
    for i in range(18):  # a pleated clown ruff hides the thin neck
        a = i / 18 * math.tau
        o = sphere((math.cos(a) * .15, -.04 + lean + math.sin(a) * .12, .9), .09, (1, 1, .32), M['stripe' if i % 2 else 'band'])
        o.rotation_euler = (math.radians(70), 0, a + math.pi / 2)
    head = Vector((math.sin(tilt) * .14, -.06 + lean, 1.15))
    hg = bpy.data.objects.new('HeadGroup', None); hg.location = head; hg.rotation_euler = (math.radians(8), tilt, 0); bpy.context.scene.collection.objects.link(hg)
    def child(o): o.parent = hg; o.location -= head; return o
    child(sphere(head.copy(), .2, (.82, .78, 1.32), M['mask']))
    for sx in (-1, 1):  # big hollow slanted eyes with a glowing pinprick
        e = child(sphere(head + Vector((.075 * sx, -.13, .08)), .06, (1, .45, 1.55), M['eye'])); e.rotation_euler = (0, math.radians(-22 * sx), 0)
        if pose != 'hurt' or sx < 0: child(sphere(head + Vector((.08 * sx, -.165, .05)), .01, (1, 1, 1), M['pupil']))
    smile = {'idle': .7, 'grin': 1.0, 'hurt': .35, 'aim': .85}[pose]
    for i in range(15):  # a painted grin that curls up into the cheeks, lined with little teeth
        a = math.pi * (1.12 + .76 * i / 14); r = .125
        p = head + Vector((math.cos(a) * r, -.16 + abs(math.cos(a)) * .05, -.05 + math.sin(a) * r * .55 * smile + .06))
        child(sphere(p, .022, (1, .5, .8), M['lips']))
        if 2 <= i <= 12:
            bpy.ops.mesh.primitive_cube_add(size=.014, location=p + Vector((0, -.012, .012))); child(obj(bpy.context.object, M['teeth']))
            if pose in ('grin', 'aim'): bpy.ops.mesh.primitive_cube_add(size=.014, location=p + Vector((0, -.012, -.012))); child(obj(bpy.context.object, M['teeth']))
    child(cyl(head + Vector((0, .02, .25)), .22, .022, M['hat']))
    child(cyl(head + Vector((0, .02, .42)), .14, .34, M['hat']))
    child(cyl(head + Vector((0, .02, .3)), .142, .05, M['band']))
    for sx, wr in ((1, P['wrL'][0]), (-1, P['wrR'][0])):  # gloved hands with long fingers
        hand = Vector(wr) + Vector((0, -.06, -.02 if not (reach and sx < 0) else 0))
        sphere(hand, .07, (1, 1.15, .55), M['glove'])
        for f in range(4):
            fx = (f - 1.5) * .032
            sphere(hand + Vector((fx, -.12 - abs(f - 1.5) * .012, -.005)), .022, (1, 3.2, .85), M['glove'])
        if reach and sx < 0: sphere(hand + Vector((0, -.2, .02)), .022, (1, 4, .9), M['glove'])


def scene_extras(sc):
    def light(kind, loc, energy, color, size=.3):
        L = bpy.data.lights.new(kind, kind); L.energy = energy; L.color = color
        if hasattr(L, 'shadow_soft_size'): L.shadow_soft_size = size
        o = bpy.data.objects.new(kind, L); o.location = loc; sc.collection.objects.link(o)
        o.rotation_euler = (Vector((0, -.05, 1.25)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    light('SPOT', (0.3, -1.1, 2.8), 520, (1, .8, .5), .08)      # one warm bulb overhead
    light('POINT', (0, -.75, .55), 70, (1, .5, .22), .15)         # candlelight from the table
    light('AREA', (1.6, 1.4, 2.2), 260, (.45, .5, 1), .8)          # cold rim
    cam = bpy.data.cameras.new('c'); cam.lens = 38
    c = bpy.data.objects.new('c', cam); c.location = (0, -2.6, 1.05); sc.collection.objects.link(c); sc.camera = c
    c.rotation_euler = (Vector((0, 0, .95)) - c.location).to_track_quat('-Z', 'Y').to_euler()


for pose in ('idle', 'grin', 'hurt', 'aim'):
    sc = reset(); build(pose); scene_extras(sc)
    sc.render.resolution_x = sc.render.resolution_y = 512; sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = os.path.join(OUT, f'ringmaster_{pose}.png'); bpy.ops.render.render(write_still=True)
    print('wrote', pose)
