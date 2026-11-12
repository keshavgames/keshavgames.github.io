"""Hollow Ward creature: modelled from a skin-modifier skeleton, rendered to transparent sprites.

Run headless:  blender -b -P art/monster.py -- <output folder>
Writes monster_idle, monster_walk1..4, monster_attack, monster_scream (256x512) and monster_face (512x512).
"""
import bpy, bmesh, math, random, sys, os
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else os.path.join(os.path.dirname(__file__), '..', 'img')
os.makedirs(OUT, exist_ok=True)
random.seed(7)

# ---------- scene ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
engines = {e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items}
sc.render.engine = 'CYCLES'
sc.cycles.samples = 96
sc.cycles.use_denoising = True
sc.cycles.device = 'CPU'
sc.render.film_transparent = True
sc.view_settings.view_transform = 'Filmic' if 'Filmic' in [i.identifier for i in sc.view_settings.bl_rna.properties['view_transform'].enum_items] else 'AgX'
sc.view_settings.look = 'None'
world = bpy.data.worlds.new('World'); sc.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.004, 0.005, 0.006, 1)


def mat_skin():
    m = bpy.data.materials.new('Skin'); m.use_nodes = True
    nt = m.node_tree; n = nt.nodes; L = nt.links
    bsdf = n['Principled BSDF']
    coord = n.new('ShaderNodeTexCoord')
    noise = n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 13; noise.inputs['Detail'].default_value = 14; noise.inputs['Roughness'].default_value = .66
    ramp = n.new('ShaderNodeValToRGB')  # rotten mottling: bruised dark patches over grey, dead skin
    ramp.color_ramp.elements[0].position = .38; ramp.color_ramp.elements[0].color = (0.05, 0.025, 0.03, 1)
    ramp.color_ramp.elements[1].position = .7; ramp.color_ramp.elements[1].color = (0.36, 0.35, 0.30, 1)
    mid = ramp.color_ramp.elements.new(.52); mid.color = (0.17, 0.12, 0.12, 1)
    wave = n.new('ShaderNodeTexWave'); wave.inputs['Scale'].default_value = 5; wave.inputs['Distortion'].default_value = 14; wave.inputs['Detail'].default_value = 6
    vramp = n.new('ShaderNodeValToRGB'); vramp.color_ramp.elements[0].position = .0; vramp.color_ramp.elements[0].color = (0.10, 0.02, 0.06, 1)
    vramp.color_ramp.elements[1].position = .08; vramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    mix = n.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = .55
    L.new(coord.outputs['Object'], noise.inputs['Vector']); L.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    L.new(coord.outputs['Object'], wave.inputs['Vector']); L.new(wave.outputs['Fac'], vramp.inputs['Fac'])
    L.new(ramp.outputs['Color'], mix.inputs[6]); L.new(vramp.outputs['Color'], mix.inputs[7])
    L.new(mix.outputs[2], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = .28
    if 'Subsurface Weight' in bsdf.inputs:
        bsdf.inputs['Subsurface Weight'].default_value = .18
        bsdf.inputs['Subsurface Radius'].default_value = (0.6, 0.15, 0.1)
        bsdf.inputs['Subsurface Scale'].default_value = .03
    if 'Coat Weight' in bsdf.inputs: bsdf.inputs['Coat Weight'].default_value = .35
    bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .9
    L.new(noise.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def mat_flat(name, color, rough=.5, emit=None, strength=0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = strength
    return m


SKIN = mat_skin()
BONE = mat_flat('Teeth', (0.72, 0.64, 0.42), .35)
MAW = mat_flat('Maw', (0.06, 0.004, 0.006), .25, (0.25, 0.0, 0.01), .4)
GLINT = mat_flat('Glint', (1, 0.05, 0.05), .2, (1, 0.02, 0.03), 18)
PIT = mat_flat('Pit', (0.01, 0.005, 0.006), .9)
DRIP = mat_flat('Drip', (0.035, 0.002, 0.004), .05)

# ---------- skeleton (facing -Y, toward the camera) ----------
BASE = {  # gaunt, hunched and lopsided: head hangs below the shoulders and tilts to one side
    'P0': ((0, 0.05, 1.05), .105), 'S1': ((0, 0.02, 1.30), .085), 'S2': ((0, -0.08, 1.52), .145), 'S3': ((0.02, -0.2, 1.70), .13),
    'N': ((0.04, -0.34, 1.74), .05), 'H0': ((0.05, -0.36, 1.86), .1), 'H1': ((0.07, -0.44, 1.79), .13), 'H2': ((0.09, -0.56, 1.74), .11), 'J': ((0.09, -0.6, 1.58), .07),
}
for s, sx in (('L', 1), ('R', -1)):
    hi = .04 if s == 'L' else -.03
    BASE.update({
        f'SH{s}': ((0.25 * sx, -0.19, 1.74 + hi), .062), f'EL{s}': ((0.40 * sx, -0.34, 1.26 + hi), .04), f'WR{s}': ((0.44 * sx, -0.44, 0.82), .034),
        f'HA{s}': ((0.45 * sx, -0.49, 0.70), .05),
        f'HP{s}': ((0.12 * sx, 0.05, 1.00), .07), f'KN{s}': ((0.18 * sx, -0.15, 0.58), .045), f'AN{s}': ((0.15 * sx, 0.1, 0.12), .034), f'TO{s}': ((0.17 * sx, -0.14, 0.03), .03),
    })
    for f in range(4):
        spread = (f - 1.5) * 0.045
        BASE[f'F{s}{f}a'] = ((0.44 * sx + spread * sx, -0.55, 0.52), .02)
        BASE[f'F{s}{f}b'] = ((0.44 * sx + spread * 1.4 * sx, -0.60, 0.30 - abs(f - 1.5) * .03), .011)
        BASE[f'F{s}{f}c'] = ((0.44 * sx + spread * 1.6 * sx, -0.66, 0.12 - abs(f - 1.5) * .04), .004)
EDGES = [('P0', 'S1'), ('S1', 'S2'), ('S2', 'S3'), ('S3', 'N'), ('N', 'H0'), ('H0', 'H1'), ('H1', 'H2'), ('H2', 'J')]
for s in 'LR':
    EDGES += [('S3', f'SH{s}'), (f'SH{s}', f'EL{s}'), (f'EL{s}', f'WR{s}'), (f'WR{s}', f'HA{s}'),
              ('P0', f'HP{s}'), (f'HP{s}', f'KN{s}'), (f'KN{s}', f'AN{s}'), (f'AN{s}', f'TO{s}')]
    for f in range(4): EDGES += [(f'HA{s}', f'F{s}{f}a'), (f'F{s}{f}a', f'F{s}{f}b'), (f'F{s}{f}b', f'F{s}{f}c')]

POSES = {
    'idle': {},
    'walk1': {'KNL': (0.18, -0.30, 0.62), 'ANL': (0.16, -0.20, 0.10), 'TOL': (0.17, -0.38, 0.03), 'KNR': (-0.18, 0.02, 0.55), 'ANR': (-0.16, 0.25, 0.14), 'TOR': (-0.17, 0.06, 0.03),
              'ELR': (-0.37, -0.40, 1.26), 'WRR': (-0.40, -0.62, 0.86), 'HAR': (-0.41, -0.68, 0.76), 'ELL': (0.40, -0.18, 1.24), 'WRL': (0.44, -0.20, 0.80), 'HAL': (0.45, -0.22, 0.69), 'sway': .05},
    'walk2': {'sway': .0, 'H1': (0.05, -0.40, 1.83), 'H2': (0.07, -0.51, 1.80)},
    'walk3': {'KNR': (-0.18, -0.30, 0.62), 'ANR': (-0.16, -0.20, 0.10), 'TOR': (-0.17, -0.38, 0.03), 'KNL': (0.18, 0.02, 0.55), 'ANL': (0.16, 0.25, 0.14), 'TOL': (0.17, 0.06, 0.03),
              'ELL': (0.37, -0.40, 1.26), 'WRL': (0.40, -0.62, 0.86), 'HAL': (0.41, -0.68, 0.76), 'ELR': (-0.40, -0.18, 1.24), 'WRR': (-0.44, -0.20, 0.80), 'HAR': (-0.45, -0.22, 0.69), 'sway': -.05},
    'walk4': {'sway': .0, 'H1': (-0.05, -0.40, 1.83), 'H2': (-0.07, -0.51, 1.80)},
    'attack': {'ELL': (0.36, -0.55, 1.55), 'WRL': (0.32, -0.95, 1.62), 'HAL': (0.31, -1.05, 1.62), 'ELR': (-0.36, -0.55, 1.55), 'WRR': (-0.32, -0.95, 1.62), 'HAR': (-0.31, -1.05, 1.62),
               'H1': (0.0, -0.44, 1.82), 'H2': (0.0, -0.56, 1.78), 'J': (0, -0.62, 1.55), 'mouth': 1.7, 'reach': True},
    'scream': {'H1': (0.0, -0.33, 1.90), 'H2': (0.0, -0.44, 1.93), 'J': (0, -0.55, 1.66), 'ELL': (0.55, -0.20, 1.45), 'WRL': (0.78, -0.30, 1.25), 'HAL': (0.84, -0.34, 1.18),
               'ELR': (-0.55, -0.20, 1.45), 'WRR': (-0.78, -0.30, 1.25), 'HAR': (-0.84, -0.34, 1.18), 'mouth': 2.1, 'spread': True},
}


def clear_objects():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)


def build(pose):
    P = {k: [Vector(v[0]), v[1]] for k, v in BASE.items()}
    sway = pose.get('sway', 0)
    for k, v in pose.items():
        if k in P: P[k][0] = Vector(v)
    if pose.get('reach') or pose.get('spread'):  # carry the fingers along with the moved hands
        for s in 'LR':
            d = P[f'HA{s}'][0] - Vector(BASE[f'HA{s}'][0])
            for f in range(4):
                for j, k in enumerate('abc'):
                    base = Vector(BASE[f'F{s}{f}{k}'][0]) + d
                    if pose.get('reach'): base += Vector((0, -0.12 * (j + 1), 0.08 * (j + 1)))
                    P[f'F{s}{f}{k}'][0] = base
    for k in P:
        if k[0] in 'PSNHJ' and len(k) <= 2: P[k][0].x += sway
    names = list(P)
    me = bpy.data.meshes.new('Body'); bm = bmesh.new()
    verts = {n: bm.verts.new(P[n][0]) for n in names}
    for a, b in EDGES: bm.edges.new((verts[a], verts[b]))
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new('Body', me); sc.collection.objects.link(ob)
    skin = ob.modifiers.new('Skin', 'SKIN'); skin.branch_smoothing = .7; skin.use_smooth_shade = True
    for i, n in enumerate(names):
        r = P[n][1] * (1 + random.uniform(-.06, .06))
        me.skin_vertices[0].data[i].radius = (r, r * (0.8 if n[0] in 'PS' else 1))
        me.skin_vertices[0].data[i].use_root = n == 'P0'
    sub = ob.modifiers.new('Sub', 'SUBSURF'); sub.levels = 2; sub.render_levels = 2
    tex = bpy.data.textures.new('Lumps', 'CLOUDS'); tex.noise_scale = .06
    disp = ob.modifiers.new('Lumps', 'DISPLACE'); disp.texture = tex; disp.strength = .018; disp.mid_level = .5
    ob.data.materials.append(SKIN)
    # ribs pushing out of the chest
    chest, up = P['S2'][0], (P['S3'][0] - P['S1'][0]).normalized()
    for i in range(6):  # front half of each rib only, so they read as bones straining under the skin
        z = -0.16 + i * .055
        bpy.ops.mesh.primitive_torus_add(major_radius=.135 - abs(i - 2.5) * .01, minor_radius=.009, major_segments=40, location=chest + up * z, rotation=(math.radians(-10 + i * 3), 0, 0))
        rib = bpy.context.object; rib.scale = (1.0, .78, 1)
        bm = bmesh.new(); bm.from_mesh(rib.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y > -.05 or abs(v.co.x) > .1], context='VERTS')
        bm.to_mesh(rib.data); bm.free()
        rib.data.materials.append(SKIN)
    # spine knobs down the back
    for t in range(7):
        p = P['S1'][0].lerp(P['S3'][0], t / 6) + Vector((0, .1 + .02 * math.sin(t), 0))
        bpy.ops.mesh.primitive_uv_sphere_add(radius=.028, location=p); bpy.context.object.data.materials.append(SKIN)
    # head: gaping maw with needle teeth, empty eye pits with a red glint
    head, jaw = P['H2'][0], P['J'][0]
    gape = pose.get('mouth', 1.25)
    mouth_c = head.lerp(jaw, .55) + Vector((0, -0.055, 0))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=.065, location=mouth_c)
    maw = bpy.context.object; maw.scale = (0.85, .45, gape); maw.data.materials.append(MAW)
    for i in range(26):
        a = i / 26 * math.tau
        rim = mouth_c + Vector((math.cos(a) * .058, -0.03, math.sin(a) * .058 * gape))
        inward = (mouth_c - rim).normalized()
        length = random.uniform(.028, .055)
        bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=.007, radius2=0, depth=length, location=rim + inward * length * .45)
        tooth = bpy.context.object
        tooth.rotation_mode = 'QUATERNION'; tooth.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(inward)
        tooth.data.materials.append(BONE)
    for sx in (1, -1):
        eye = P['H1'][0] + Vector((0.045 * sx, -0.095, 0.035))
        bpy.ops.mesh.primitive_uv_sphere_add(radius=.026, location=eye); bpy.context.object.scale = (1, .5, .8); bpy.context.object.data.materials.append(PIT)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=.006, location=eye + Vector((0, -0.008, 0))); bpy.context.object.data.materials.append(GLINT)
    for i in range(4):  # thin strings of dark drool, tapering to a point
        x, length = random.uniform(-.035, .035), random.uniform(.05, .12)
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=.0045, radius2=0, depth=length, location=jaw + Vector((x, -0.07, -0.03 - length / 2)), rotation=(math.pi, 0, 0))
        bpy.context.object.data.materials.append(DRIP)


def lights():
    def add(kind, loc, rot, energy, color, size=1):
        L = bpy.data.lights.new(kind, kind); L.energy = energy; L.color = color
        if kind == 'SPOT': L.spot_size = math.radians(55); L.spot_blend = .6
        if hasattr(L, 'shadow_soft_size'): L.shadow_soft_size = size
        o = bpy.data.objects.new(kind, L); o.location = loc; o.rotation_euler = rot; sc.collection.objects.link(o)
    add('SPOT', (0.9, -2.4, 3.9), (math.radians(32), 0, math.radians(18)), 650, (0.9, 0.93, 1.0), .12)   # harsh cold light from above
    add('POINT', (0.2, -1.1, 0.25), (0, 0, 0), 18, (0.75, 0.9, 0.45), .3)                               # faint sickly glow from below
    add('AREA', (-1.2, 1.8, 2.6), (math.radians(-60), 0, math.radians(200)), 420, (0.45, 0.55, 1.0), 1.2)  # cold rim from behind
    sc.view_settings.exposure = -0.4


def camera(ortho=True, loc=(0, -6, 1.12), target=(0, -0.2, 1.05), lens=50, scale=2.35):
    cam = bpy.data.cameras.new('Cam')
    if ortho: cam.type = 'ORTHO'; cam.ortho_scale = scale
    else: cam.lens = lens
    o = bpy.data.objects.new('Cam', cam); o.location = loc; sc.collection.objects.link(o); sc.camera = o
    d = Vector(target) - Vector(loc); o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def render(name, w, h):
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = w, h, 100
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = os.path.join(OUT, name + '.png')
    bpy.ops.render.render(write_still=True)
    print('wrote', sc.render.filepath)


only = sys.argv[sys.argv.index('--') + 2:] if '--' in sys.argv else []
for name in ['idle', 'walk1', 'walk2', 'walk3', 'walk4', 'attack', 'scream']:
    if only and name not in only: continue
    clear_objects(); build(POSES[name]); lights(); camera(ortho=False, loc=(0.9, -5.6, 0.55), target=(0.05, -0.2, 1.02), lens=82)
    render('monster_' + name, 320, 512)
if not only or 'face' in only:
    clear_objects(); build(POSES['scream']); lights()
    camera(ortho=False, loc=(0.05, -1.55, 1.86), target=(0, -0.45, 1.80), lens=42)
    render('monster_face', 512, 512)
