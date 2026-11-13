"""Whisper Woods sprites: the antlered stalker, forest trees, stone lanterns and the moon gate.

Run headless:  blender -b -P art/woods.py -- <output folder> [only]
Sprites are rendered with an orthographic camera so they sit flat as billboards in the raycaster,
with the ground at the bottom edge of the image.
"""
import bpy, bmesh, math, random, sys, os
from mathutils import Vector

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARGS[0] if ARGS else os.path.join(os.path.dirname(__file__), '..', 'img')
ONLY = ARGS[1] if len(ARGS) > 1 else None
os.makedirs(OUT, exist_ok=True)


def reset(exposure=0):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
    sc.render.film_transparent = True; sc.view_settings.exposure = exposure
    w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.03, 0.035, 0.05, 1)
    return sc


def mat(name, color, rough=.6, emit=None, es=0, noise=0, scale=8):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = es
    if noise:  # dirt and variation so nothing looks like plastic
        n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = 6
        r = nt.nodes.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].color = tuple(c * (1 - noise) for c in color) + (1,); r.color_ramp.elements[1].color = (*color, 1)
        nt.links.new(n.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], b.inputs['Base Color'])
    return m


def put(o, m, smooth=True):
    o.data.materials.append(m)
    if smooth: bpy.ops.object.shade_smooth()
    return o


def sphere(loc, r, scale, m, seg=32):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg // 2); o = bpy.context.object; o.scale = scale; return put(o, m)


def cone(loc, r1, r2, depth, m, rot=(0, 0, 0), verts=24):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=depth, location=loc, rotation=rot, vertices=verts); return put(bpy.context.object, m)


def limb(a, b, r1, r2, m, verts=10):  # a tapered cylinder from point a to point b
    a, b = Vector(a), Vector(b); d = b - a
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=d.length, location=(a + b) / 2, vertices=verts)
    o = bpy.context.object; o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler(); return put(o, m)


def branch(p, d, length, r, depth, m, rng, spread=.55, up=0):
    end = Vector(p) + d.normalized() * length
    limb(p, end, r, r * .62, m, 8)
    if depth <= 0: return
    for k in range(2 if depth > 1 else rng.choice((1, 2))):
        axis = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-.2, .2))).normalized()
        nd = d.normalized() + axis * spread + Vector((0, 0, up))
        branch(end, nd, length * rng.uniform(.6, .78), r * .62, depth - 1, m, rng, spread, up)


def lights(sc, key=420, rim=180, target=(0, 0, 1.2)):
    def light(kind, loc, energy, color, size):
        L = bpy.data.lights.new(kind, kind); L.energy = energy; L.color = color; L.shadow_soft_size = size
        o = bpy.data.objects.new(kind, L); o.location = loc; sc.collection.objects.link(o)
        o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    light('AREA', (2.5, -4, 4.5), key, (.75, .82, 1), 2.5)        # moonlight, cool and soft
    light('AREA', (-2.5, 3, 3), rim, (.5, .6, 1), 2)              # back rim so the silhouette reads in fog
    light('AREA', (0, -5, .5), key * .25, (1, .95, .9), 3)         # low fill: in game the flashlight does this job


def ortho(sc, height, w, h, cz=None, dist=10):
    cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = height
    c = bpy.data.objects.new('c', cam); sc.collection.objects.link(c); sc.camera = c
    c.location = (0, -dist, height / 2 if cz is None else cz); c.rotation_euler = (math.radians(90), 0, 0)
    sc.render.resolution_x = w; sc.render.resolution_y = h; sc.render.resolution_percentage = 100


def render(sc, name):
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = os.path.join(OUT, name); bpy.ops.render.render(write_still=True); print('wrote', name)


def skull(h, bone, socket, glow, rng, scale=1.0, open_jaw=False, ooze=None):
    """A long deer skull facing the camera (-Y), with hollow sockets and pinprick eyes."""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=.13 * scale, location=h, segments=48, ring_count=24)
    s = bpy.context.object; s.scale = (.85, 1.0, 1.25); bpy.ops.object.transform_apply(scale=True)
    put(s, bone); s.data.materials.append(socket)
    m = sphere(h + Vector((0, -.05, -.2)) * scale, .1 * scale, (.6, .72, 1.55), bone)  # long snout tilted toward you
    m.rotation_euler = (math.radians(-18), 0, 0)
    for sx in (-1, 1): sphere(h + Vector((.075 * sx, -.07, -.06)) * scale, .05 * scale, (.7, .8, 1.1), bone)  # cheekbones
    for sx in (-1, 1):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=h + Vector((.055 * sx, -.1, .03)) * scale, segments=24, ring_count=12)
        c = bpy.context.object; c.scale = Vector((.052, .08, .062)) * scale; c.hide_render = True
        b = s.modifiers.new('cut', 'BOOLEAN'); b.operation = 'DIFFERENCE'; b.object = c; b.solver = 'EXACT'
        if hasattr(b, 'material_mode'): b.material_mode = 'TRANSFER'
        c.data.materials.append(socket)
        sphere(h + Vector((.055 * sx, -.06, .025)) * scale, .008 * scale, (1, 1, 1), glow, 12)
        drip = limb(h + Vector((.06 * sx, -.11, -.01)) * scale, h + Vector((.065 * sx, -.12, -.16 - .04 * sx)) * scale, .007 * scale, .002 * scale, ooze, 8)  # black ooze from the sockets
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=h + Vector((0, -.1, -.16)) * scale, segments=24, ring_count=12)
    c = bpy.context.object; c.scale = Vector((.014, .05, .1)) * scale; c.hide_render = True; c.data.materials.append(socket)
    b = m.modifiers.new('nose', 'BOOLEAN'); b.operation = 'DIFFERENCE'; b.object = c; b.solver = 'EXACT'
    if hasattr(b, 'material_mode'): b.material_mode = 'TRANSFER'
    d = s.modifiers.new('rough', 'DISPLACE'); t = bpy.data.textures.new('bone', 'CLOUDS'); t.noise_scale = .02; d.texture = t; d.strength = .012
    if open_jaw:  # a lower jaw hanging open
        j = sphere(h + Vector((0, -.06, -.36)) * scale, .07 * scale, (.55, .9, .5), bone); j.rotation_euler = (math.radians(35), 0, 0)
        for i in range(7):
            x = (i - 3) * .012 * scale
            bpy.ops.mesh.primitive_cone_add(radius1=.005 * scale, radius2=0, depth=.045 * scale, location=h + Vector((x, -.12 + abs(x) * 1.5, -.36)) * scale, vertices=6)
            put(bpy.context.object, bone, False)
    for i in range(9):  # teeth along the bottom of the muzzle
        x = (i - 4) * .011 * scale
        bpy.ops.mesh.primitive_cone_add(radius1=.006 * scale, radius2=0, depth=.04 * scale, location=h + Vector((x, -.13 + abs(x) * 1.5, -.33 - (.03 if open_jaw else 0))) * scale, rotation=(math.pi, 0, 0), vertices=6)
        put(bpy.context.object, bone, False)
    return s


def stalker(pose, rng):
    bone = mat('Bone', (.62, .55, .42), .6, noise=.7, scale=45); socket = mat('Socket', (.002, .001, .001), .9); ooze = mat('Ooze', (.004, .002, .002), .08)
    glow = mat('Eye', (1, .4, .2), .2, (1, .45, .15), 60); cloak = mat('Cloak', (.018, .016, .02), .95, noise=.6, scale=5)
    skin = mat('Skin', (.12, .1, .09), .7, noise=.5, scale=20); antler = mat('Antler', (.32, .26, .2), .7, noise=.5, scale=12)
    lunge = pose == 'lunge'
    lean = .35 if lunge else .1
    head = Vector((0, -lean - .1, 2.85)); neck = head - Vector((0, -.04, .2))
    skull(head, bone, socket, glow, rng, 1.35, lunge, ooze)
    hood = sphere(head + Vector((0, .22, .1)), .26, (1, 1, 1.2), cloak)  # a hood the skull pushes out of
    for sx in (-1, 1):  # two branching antlers, wider than the shoulders
        r2 = random.Random(5 + sx)
        branch(head + Vector((.08 * sx, .02, .16)), Vector((.7 * sx, .1, 1)), .3, .024, 4, antler, r2, .6, .2)
    # a ragged cloak hanging from bony shoulders
    bpy.ops.mesh.primitive_cone_add(radius1=.52, radius2=.2, depth=2.2, location=(0, -lean * .3, 1.12), vertices=48)
    c = bpy.context.object; bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.subdivide(number_cuts=10); bpy.ops.object.mode_set(mode='OBJECT')
    for v in c.data.vertices:
        if v.co.z < -.6: v.co.z += rng.uniform(0, .45) * (-.6 - v.co.z) * 1.5 + rng.uniform(0, .12)  # torn hem
        v.co.x *= 1 + rng.uniform(-.05, .05); v.co.y *= 1 + rng.uniform(-.05, .05)
    c.rotation_euler = (math.radians(-8 if lunge else -3), 0, 0); put(c, cloak)
    d = c.modifiers.new('folds', 'DISPLACE'); t = bpy.data.textures.new('folds', 'CLOUDS'); t.noise_scale = .25; d.texture = t; d.strength = .08
    limb(Vector((0, -lean * .4, 2.05)), neck + Vector((0, .1, 0)), .09, .05, cloak)
    sh = [Vector((.22 * sx, -lean * .45 - .2, 1.9)) for sx in (-1, 1)]
    for sx, s in zip((-1, 1), sh):  # arms far too long, hanging to the knees or reaching out
        sphere(s + Vector((0, .06, .1)), .13, (1, 1, .9), cloak)
        el = s + (Vector((.12 * sx, -.45, .1)) if lunge else Vector((.1 * sx, -.05, -.62)))
        wr = el + (Vector((-.05 * sx, -.62, .12)) if lunge else Vector((.02 * sx, -.08, -.72)))
        limb(s, el, .055, .038, skin); limb(el, wr, .038, .026, skin)
        for f in range(4):  # long claw fingers
            fd = (Vector((((f - 1.5) * .08), -1, .1)) if lunge else Vector(((f - 1.5) * .12, -.25, -1))).normalized()
            limb(wr, wr + fd * .26, .011, .002, bone, 6)
    for sx in (-1, 1):  # thin legs under the cloak hem
        limb(Vector((.12 * sx, -.05, .7)), Vector((.15 * sx, -.08, 0)), .04, .03, skin)


def pine(rng, dead=False):
    bark = mat('Bark', (.09, .06, .045), .85, noise=.6, scale=14); needles = mat('Needles', (.03, .07, .05), .8, noise=.5, scale=6)
    limb((0, 0, 0), (0, 0, 5.2 if not dead else 4.4), .2, .04, bark)
    if dead:
        for i in range(9):
            z = 1.6 + i * .32; a = rng.uniform(0, math.tau)
            branch((0, 0, z), Vector((math.cos(a), math.sin(a), rng.uniform(.1, .7))), rng.uniform(.6, 1.2) * (1.3 - i * .08), .06, 3, bark, rng, .5, .2)
        return
    for i in range(7):  # stacked, slightly droopy tiers of needles
        z = 1.2 + i * .55; r = 1.5 - i * .19
        o = cone((rng.uniform(-.05, .05), rng.uniform(-.05, .05), z), r, .05, 1.3, needles, verts=14)
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.subdivide(number_cuts=3); bpy.ops.object.mode_set(mode='OBJECT')
        for v in o.data.vertices: v.co += Vector((rng.uniform(-.12, .12), rng.uniform(-.12, .12), rng.uniform(-.1, .06)))
        d = o.modifiers.new('tufts', 'DISPLACE'); t = bpy.data.textures.new('t', 'CLOUDS'); t.noise_scale = .15; d.texture = t; d.strength = .18


def lantern(lit):
    stone = mat('Stone', (.38, .37, .35), .9, noise=.55, scale=10); moss = mat('Moss', (.08, .16, .05), .9, noise=.5)
    window = mat('Window', (.02, .02, .02), .5, (1, .62, .22), 18 if lit else 0)
    bpy.ops.mesh.primitive_cylinder_add(radius=.16, depth=.55, location=(0, 0, .28), vertices=8); put(bpy.context.object, stone, False)
    bpy.ops.mesh.primitive_cube_add(size=.42, location=(0, 0, .74)); put(bpy.context.object, stone, False)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -.2, .74)); w = bpy.context.object; w.scale = (.22, .02, .2); put(w, window, False)
    cone((0, 0, 1.08), .42, 0, .32, stone, verts=4).rotation_euler = (0, 0, math.pi / 4)
    sphere((0, 0, 1.26), .05, (1, 1, 1), stone)
    sphere((.12, -.1, .98), .1, (1.4, 1, .3), moss)
    if lit:
        L = bpy.data.lights.new('candle', 'POINT'); L.energy = 30; L.color = (1, .6, .25); L.shadow_soft_size = .1
        o = bpy.data.objects.new('candle', L); o.location = (0, -.3, .74); bpy.context.scene.collection.objects.link(o)


def gate():
    stone = mat('GateStone', (.42, .42, .45), .85, noise=.5, scale=6); rune = mat('Rune', (.1, .2, .25), .3, (.4, .9, 1), 12)
    for sx in (-1, 1):
        for i in range(5): bpy.ops.mesh.primitive_cube_add(size=.5, location=(1 * sx, 0, .25 + i * .5)); o = bpy.context.object; o.rotation_euler = (0, 0, random.uniform(-.06, .06)); put(o, stone, False)
    for i in range(9):
        a = math.pi * i / 8; bpy.ops.mesh.primitive_cube_add(size=.42, location=(math.cos(a) * 1.0, 0, 2.5 + math.sin(a) * 1.0)); o = bpy.context.object; o.rotation_euler = (0, -a, 0); put(o, stone, False)
    for z in (.6, 1.3, 2.0):
        for sx in (-1, 1): bpy.ops.mesh.primitive_cube_add(size=1, location=(1 * sx, -.26, z)); r = bpy.context.object; r.scale = (.12, .01, .2); put(r, rune, False)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, .05, 1.7)); p = bpy.context.object; p.scale = (1.5, 3.4, 1); p.rotation_euler = (math.pi / 2, 0, 0)
    put(p, mat('Portal', (0, 0, 0), .2, (.55, .85, 1), 3), False)


JOBS = {
    'stalker_idle': lambda: (stalker('idle', random.Random(3)), (3.9, 256, 512)),
    'stalker_lunge': lambda: (stalker('lunge', random.Random(3)), (3.9, 256, 512)),
    'tree_pine': lambda: (pine(random.Random(11)), (6.2, 256, 512)),
    'tree_pine2': lambda: (pine(random.Random(29)), (6.2, 256, 512)),
    'tree_dead': lambda: (pine(random.Random(17), dead=True), (6.2, 256, 512)),
    'lantern_off': lambda: (lantern(False), (1.5, 128, 192)),
    'lantern_on': lambda: (lantern(True), (1.5, 128, 192)),
    'gate': lambda: (gate(), (4.0, 256, 256)),
}
for name, job in JOBS.items():
    if ONLY and ONLY != name: continue
    sc = reset(-.2); _, (height, w, h) = job(); lights(sc, *((140, 60) if name.startswith(('lantern', 'gate')) else ()))
    if w / h < 1: ortho(sc, height, w, h)
    else: ortho(sc, height, w, h)  # square: ortho_scale is the width
    render(sc, f'{name}.png')

if not ONLY or ONLY == 'stalker_face':  # close-up for the jumpscare: lit from below, eyes burning
    sc = reset(-1.2); stalker('lunge', random.Random(3))
    L = bpy.data.lights.new('under', 'SPOT'); L.energy = 90; L.color = (1, .85, .7); L.shadow_soft_size = .05
    o = bpy.data.objects.new('under', L); o.location = (.1, -1.25, 2.3); sc.collection.objects.link(o)
    o.rotation_euler = (Vector((0, -.45, 2.78)) - o.location).to_track_quat('-Z', 'Y').to_euler()
    R = bpy.data.lights.new('rim', 'AREA'); R.energy = 45; R.color = (.9, .2, .1)
    o = bpy.data.objects.new('rim', R); o.location = (-1, 1, 3.5); sc.collection.objects.link(o)
    o.rotation_euler = (Vector((0, -.45, 2.78)) - o.location).to_track_quat('-Z', 'Y').to_euler()
    cam = bpy.data.cameras.new('c'); cam.lens = 40; c = bpy.data.objects.new('c', cam); sc.collection.objects.link(c); sc.camera = c
    c.location = (0, -1.55, 2.62); c.rotation_euler = (Vector((0, -.45, 2.74)) - c.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.resolution_x = sc.render.resolution_y = 512; render(sc, 'stalker_face.png')
