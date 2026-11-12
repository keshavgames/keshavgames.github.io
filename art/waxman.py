"""Wax figures for Night Shift: melting museum statues with hollow sockets, one glass eye and dripping wax.

Run headless:  blender -b -P art/waxman.py -- <output folder>
Writes wax_<color>_stand.png and wax_<color>_reach.png (320x512) for cream, ash and red,
and wax_face.png (512x512), the close-up used for the jumpscare.
"""
import bpy, math, random, sys, os
import bmesh
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else os.path.join(os.path.dirname(__file__), '..', 'img')
os.makedirs(OUT, exist_ok=True)
COLORS = {'cream': (0.9, 0.8, 0.64), 'ash': (0.55, 0.55, 0.52), 'red': (0.55, 0.08, 0.06)}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 64; sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
    sc.render.film_transparent = True; sc.view_settings.exposure = -0.3
    w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.004, 0.005, 0.008, 1)
    return sc


def wax(name, color):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; n = nt.nodes; L = nt.links
    b = n['Principled BSDF']; b.inputs['Roughness'].default_value = .32
    b.inputs['Subsurface Weight'].default_value = .55; b.inputs['Subsurface Scale'].default_value = .04
    if 'Coat Weight' in b.inputs: b.inputs['Coat Weight'].default_value = .35
    noise = n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 7; noise.inputs['Detail'].default_value = 8
    wave = n.new('ShaderNodeTexWave'); wave.wave_type = 'BANDS'; wave.bands_direction = 'Z'; wave.inputs['Scale'].default_value = 6; wave.inputs['Distortion'].default_value = 9
    ramp = n.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].color = (color[0] * .35, color[1] * .3, color[2] * .3, 1); ramp.color_ramp.elements[1].color = (*color, 1)
    ramp.color_ramp.elements[0].position = .25; ramp.color_ramp.elements[1].position = .75
    mix = n.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = .22
    geo = n.new('ShaderNodeNewGeometry'); L.new(geo.outputs['Position'], noise.inputs['Vector']); L.new(geo.outputs['Position'], wave.inputs['Vector'])  # world space, so small drips share the pattern
    L.new(noise.outputs['Fac'], ramp.inputs['Fac']); L.new(ramp.outputs['Color'], mix.inputs[6]); L.new(wave.outputs['Color'], mix.inputs[7])
    L.new(mix.outputs[2], b.inputs['Base Color']); L.new(mix.outputs[2], b.inputs['Subsurface Radius'])
    return m


def mat(name, color, rough=.5, emit=None, es=0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = es
    return m


def sphere(loc, r, scale, m, seg=32):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg // 2)
    o = bpy.context.object; o.scale = scale; o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o


def drip(p, r, length, m):  # a hanging run of wax with a fat droplet on the end
    sphere(Vector(p) - Vector((0, 0, length / 2)), r, (1, 1, length / (2 * r)), m, 16)
    sphere(Vector(p) - Vector((0, 0, length)), r * 1.5, (1, 1, 1.3), m, 16)


def build(color, pose, rng):
    W = wax('Wax', COLORS[color]); flesh = mat('Flesh', (.006, .0005, .0005), .85); tooth = mat('Tooth', (.55, .48, .3), .4); hair = mat('Hair', (.02, .015, .012), .7); glass = mat('Glass', (.9, .88, .8), .05)
    iris = mat('Iris', (.05, .2, .1), .1, (.5, 1, .55), 9); 
    reach = pose == 'reach'
    lean = .14 if reach else .04
    P = {'hip': ((0, 0, 1.0), .17), 'chest': ((0, -lean * .6, 1.42), .2), 'neck': ((0, -lean, 1.64), .07),
         'shL': ((.25, -lean * .5, 1.55), .085), 'shR': ((-.25, -lean * .5, 1.55), .085),
         'elL': ((.34, -.06, 1.15), .06), 'elR': ((-.33, -.04, 1.13), .06),
         'wrL': ((.37, -.1, .76), .05), 'wrR': ((-.36, -.06, .74), .05),
         'lgL': ((.11, 0, .92), .1), 'lgR': ((-.11, 0, .92), .1), 'knL': ((.13, -.03, .5), .08), 'knR': ((-.12, -.02, .5), .08),
         'anL': ((.14, 0, .02), .07), 'anR': ((-.13, 0, .02), .07)}
    if reach:
        P['elL'] = ((.3, -.42, 1.42), .06); P['wrL'] = ((.22, -.82, 1.5), .05)
        P['elR'] = ((-.32, -.38, 1.36), .06); P['wrR'] = ((-.26, -.78, 1.38), .05)
    names = list(P); me = bpy.data.meshes.new('Body'); bm = bmesh.new()
    V = {k: bm.verts.new(P[k][0]) for k in names}
    for a, b in [('hip', 'chest'), ('chest', 'neck'), ('chest', 'shL'), ('chest', 'shR'), ('shL', 'elL'), ('elL', 'wrL'), ('shR', 'elR'), ('elR', 'wrR'),
                 ('hip', 'lgL'), ('hip', 'lgR'), ('lgL', 'knL'), ('knL', 'anL'), ('lgR', 'knR'), ('knR', 'anR')]:
        bm.edges.new((V[a], V[b]))
    bm.to_mesh(me); bm.free()
    body = bpy.data.objects.new('Body', me); bpy.context.scene.collection.objects.link(body)
    sk = body.modifiers.new('Skin', 'SKIN'); sk.branch_smoothing = .7; sk.use_smooth_shade = True
    for i, k in enumerate(names):
        r = P[k][1]; me.skin_vertices[0].data[i].radius = (r, r * .85); me.skin_vertices[0].data[i].use_root = k == 'hip'
    s = body.modifiers.new('S', 'SUBSURF'); s.levels = s.render_levels = 2
    tex = bpy.data.textures.new('lumps', 'CLOUDS'); tex.noise_scale = .12
    d = body.modifiers.new('D', 'DISPLACE'); d.texture = tex; d.strength = .035
    body.data.materials.append(W)
    # head: a skull-ish dome with the lower face sagging off to one side
    tilt = .25 if reach else .1
    h = Vector((math.sin(tilt) * .06, -lean - .03, 1.83))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=.13, location=h, segments=72, ring_count=36)
    hd = bpy.context.object; hd.scale = (.9, .95, 1.18); bpy.ops.object.transform_apply(scale=True)
    for v in hd.data.vertices:  # the lower face slides down and forward, worse on one side
        c = v.co
        if c.z < .03:
            k = .03 - c.z
            c.z -= k * (.45 + 2.6 * max(0, c.x) + .12 * math.sin(c.x * 45))
            c.y -= k * .3
    hd.data.materials.append(W); hd.data.materials.append(flesh); bpy.ops.object.shade_smooth()
    mz = -.15 if reach else -.13
    mouth = (.05, .08, .1) if reach else (.042, .07, .065)
    cuts = [(h + Vector((-.05, -.118, .035)), (.034, .045, .038)),   # empty socket
            (h + Vector((.05, -.113, -.005)), (.036, .045, .065)),   # socket melted long
            (h + Vector((.006, -.09, mz)), mouth),
            (h + Vector((-.012, -.125, -.045)), (.012, .04, .028)), (h + Vector((.014, -.125, -.048)), (.012, .04, .026))]  # nose holes
    for loc, sc in cuts:
        bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=loc, segments=32, ring_count=16)
        c = bpy.context.object; c.scale = sc; c.data.materials.append(flesh); c.hide_render = True; c.display_type = 'WIRE'
        b = hd.modifiers.new('Cut', 'BOOLEAN'); b.operation = 'DIFFERENCE'; b.object = c; b.solver = 'EXACT'
        if hasattr(b, 'material_mode'): b.material_mode = 'TRANSFER'
    tex2 = bpy.data.textures.new('skin', 'CLOUDS'); tex2.noise_scale = .025; tex2.noise_depth = 4
    d2 = hd.modifiers.new('D', 'DISPLACE'); d2.texture = tex2; d2.strength = .014
    sphere(h + Vector((0, -.07, .072)), .1, (.72, .4, .2), W)                 # heavy brow ridge
    for sx in (-1, 1): sphere(h + Vector((.068 * sx, -.07, -.035)), .03, (1, .6, 1.2), W)  # cheekbones
    for i in range(46):  # stringy hair still stuck to one side of the scalp
        a = rng.uniform(.15, 1.45) if i % 3 else rng.uniform(1.75, 2.95); r0 = Vector((math.cos(a) * .11, math.sin(a) * .1 + .01, .1)); L = rng.uniform(.18, .42)
        bpy.ops.mesh.primitive_cylinder_add(radius=.0022, depth=L, location=h + r0 + Vector((math.cos(a) * .03, 0, -L / 2 + .02)), vertices=6)
        o = bpy.context.object; o.rotation_euler = (rng.uniform(-.15, .15), math.copysign(rng.uniform(.05, .3), -math.cos(a)), 0); o.data.materials.append(hair)
    sphere(h + Vector((.05, -.098, -.01)), .022, (1, 1, 1), glass)             # one glass eye still in its socket
    sphere(h + Vector((.05, -.117, -.008)), .01, (1, .5, 1), iris)
    top = h.z + mz + mouth[2] * .8
    for i in [j for j in range(9) if j not in (2, 6)]:  # crooked teeth, two missing hanging from the top of the mouth
        x = (i - 4) * mouth[0] * .22
        bpy.ops.mesh.primitive_cube_add(size=.009, location=(h.x + .006 + x, h.y - .118 + abs(x) * .9, top - .004))
        t = bpy.context.object; t.scale = (.8, .8, 1.2 + rng.random() * 1.4); t.rotation_euler = (0, rng.uniform(-.5, .5), 0); t.data.materials.append(tooth)
        if reach and i % 2 == 0:
            bpy.ops.mesh.primitive_cube_add(size=.011, location=(h.x + .006 + x, h.y - .115 + abs(x) * .9, h.z + mz - mouth[2] * .78))
            t = bpy.context.object; t.scale = (.8, .8, 1.5); t.rotation_euler = (0, rng.uniform(-.5, .5), 0); t.data.materials.append(tooth)
    # wax runs everywhere: sockets, chin, arms, fingers, belly
    drip(h + Vector((-.05, -.115, -.005)), .006, .07, W)
    drip(h + Vector((.07, -.1, -.08)), .008, .12, W)
    drip(h + Vector((.01, -.12, mz - mouth[2])), .01, .14, W)
    drip(h + Vector((-.05, -.09, -.17)), .009, .1, W)
    for k in ('wrL', 'wrR', 'elL', 'elR'):
        p = Vector(P[k][0]); drip(p - Vector((0, 0, P[k][1] * .8)), .012, .1 + rng.random() * .12, W)
    for i in range(10):
        a = rng.random() * math.tau
        drip((math.cos(a) * .15, math.sin(a) * .1 - lean * .5, 1.2 + rng.random() * .3), .01, .06 + rng.random() * .14, W)
    for k in ('anL', 'anR'): sphere(Vector(P[k][0]) + Vector((0, -.06, -.005)), .06, (.9, 1.7, .55), W)  # feet
    for k in ('wrL', 'wrR'):  # palms and long melted fingers
        p = Vector(P[k][0]); sphere(p + (Vector((0, 0, -.04)) if not reach else Vector((0, -.04, 0))), .045, (.8, .8, 1.2) if not reach else (.8, 1.2, .8), W)
        for f in range(4):
            off = Vector(((f - 1.5) * .022, -.01, -.1)) if not reach else Vector(((f - 1.5) * .022, -.1, .0))
            sphere(p + off, .013, (1, 1, 4.2) if not reach else (1, 4.2, 1), W, 16)
    sphere((0, -.05, .01), .42, (1, .8, .025), W)  # puddle at the feet
    return h


def lights(sc, target, face=False):
    def light(kind, loc, energy, color, size=.3):
        L = bpy.data.lights.new(kind, kind); L.energy = energy; L.color = color
        if hasattr(L, 'shadow_soft_size'): L.shadow_soft_size = size
        o = bpy.data.objects.new(kind, L); o.location = loc; sc.collection.objects.link(o)
        o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    if face:
        sc.view_settings.exposure = -1.1
        light('SPOT', (.08, -.5, 1.42), 70, (1, .88, .66), .03)       # flashlight from below
        light('AREA', (-.9, .5, 2.3), 25, (.9, .15, .1), .5)          # red rim from behind
    else:
        light('SPOT', (.2, -.6, 3.4), 650, (1, .9, .72), .1)          # museum spotlight overhead
        light('AREA', (-1.4, 1.2, 2.2), 220, (.45, .55, 1), .8)       # cold rim
        light('POINT', (0, -1.2, .4), 18, (1, .7, .4), .2)


def camera(sc, loc, target, lens):
    cam = bpy.data.cameras.new('c'); cam.lens = lens
    c = bpy.data.objects.new('c', cam); c.location = loc; sc.collection.objects.link(c); sc.camera = c
    c.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()


def render(sc, name, w, h):
    sc.render.resolution_x = w; sc.render.resolution_y = h; sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = os.path.join(OUT, name); bpy.ops.render.render(write_still=True); print('wrote', name)


only = sys.argv[sys.argv.index('--') + 2] if '--' in sys.argv and len(sys.argv) > sys.argv.index('--') + 2 else None
for color in COLORS:
    for pose in ('stand', 'reach'):
        if only and only != f'{color}_{pose}': continue
        sc = reset(); build(color, pose, random.Random(7)); lights(sc, (0, 0, 1.2))
        camera(sc, (0, -4.6, 1.15), (0, 0, 1.02), 50); render(sc, f'wax_{color}_{pose}.png', 320, 512)
if not only or only == 'face':
    sc = reset(); h = build('cream', 'reach', random.Random(7)); lights(sc, h, face=True)
    camera(sc, h + Vector((0, -.62, -.02)), h + Vector((0, 0, -.05)), 45); render(sc, 'wax_face.png', 512, 512)
