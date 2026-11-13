"""The Crawler for Crawlspace: a pale, starved thing on all fours with backwards-bent limbs and hair over its face.

Run headless:  blender -b -P art/crawler.py -- <output folder> [only]
Writes crawler_walk0..3.png and crawler_lunge.png (side view, facing right, 384x256, ground at the bottom edge)
and crawler_face.png (512x512 front close-up for the jumpscare).
"""
import bpy, bmesh, math, random, sys, os
from mathutils import Vector

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARGS[0] if ARGS else os.path.join(os.path.dirname(__file__), '..', 'img')
ONLY = ARGS[1] if len(ARGS) > 1 else None
os.makedirs(OUT, exist_ok=True)


def reset(exposure=-.3):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
    sc.render.film_transparent = True; sc.view_settings.exposure = exposure
    w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.02, 0.02, 0.025, 1)
    return sc


def mat(name, color, rough=.6, emit=None, es=0, noise=0, scale=8, sss=0):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough
    if sss: b.inputs['Subsurface Weight'].default_value = sss; b.inputs['Subsurface Scale'].default_value = .03
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = es
    if noise:
        n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = 10
        r = nt.nodes.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].color = tuple(c * (1 - noise) for c in color) + (1,); r.color_ramp.elements[1].color = (*color, 1)
        r.color_ramp.elements[0].position = .35
        nt.links.new(n.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], b.inputs['Base Color'])
    return m


def put(o, m, smooth=True):
    o.data.materials.append(m)
    if smooth: bpy.ops.object.shade_smooth()
    return o


def sphere(loc, r, scale, m, seg=32):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg // 2); o = bpy.context.object; o.scale = scale; return put(o, m)


def limb(a, b, r1, r2, m, verts=8):
    a, b = Vector(a), Vector(b); d = b - a
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=d.length, location=(a + b) / 2, vertices=verts)
    o = bpy.context.object; o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler(); return put(o, m)


def skin_body(P, edges, M):
    names = list(P); me = bpy.data.meshes.new('Body'); bm = bmesh.new()
    V = {k: bm.verts.new(P[k][0]) for k in names}
    for a, b in edges: bm.edges.new((V[a], V[b]))
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('Body', me); bpy.context.scene.collection.objects.link(o)
    sk = o.modifiers.new('Skin', 'SKIN'); sk.branch_smoothing = .5; sk.use_smooth_shade = True
    for i, k in enumerate(names):
        r = P[k][1]; me.skin_vertices[0].data[i].radius = (r, r * .9); me.skin_vertices[0].data[i].use_root = k == 'pelvis'
    s = o.modifiers.new('S', 'SUBSURF'); s.levels = s.render_levels = 2
    t = bpy.data.textures.new('lumps', 'CLOUDS'); t.noise_scale = .06
    d = o.modifiers.new('D', 'DISPLACE'); d.texture = t; d.strength = .012
    o.data.materials.append(M)
    return o


def crawler(frame, lunge=False, rng=None):
    rng = rng or random.Random(4)
    skin = mat('Skin', (.5, .5, .48), .45, noise=.45, scale=18, sss=.25)
    dark = mat('Hole', (.004, .002, .002), .8); hair = mat('Hair', (.012, .01, .01), .55)
    tooth = mat('Tooth', (.62, .58, .45), .4); eye = mat('Eye', (.9, .9, .85), .1, (1, .95, .8), 4)
    ph = frame * math.pi / 2
    rise = .28 if lunge else 0
    P = {'pelvis': ((-.5, 0, .58 + rise * .3), .13), 'mid': ((-.12, 0, .64 + rise * .7), .12), 'chest': ((.28, 0, .62 + rise), .16),
         'neck': ((.48, 0, .58 + rise), .055)}
    E = [('pelvis', 'mid'), ('mid', 'chest'), ('chest', 'neck')]
    for side, sy in (('L', .15), ('R', -.15)):
        f = ph if side == 'L' else ph + math.pi
        if lunge:  # rearing up with both arms reaching forward
            el, wr = (.55, sy * 1.2, 1.1), (.95, sy, .78 + (.06 if side == 'L' else 0))
        else:     # elbows jut up and backwards; hands plant ahead and walk
            el = (.42 + .05 * math.sin(f), sy * 1.25, .88 + .05 * max(0, math.cos(f)))
            wr = (.7 + .14 * math.sin(f), sy * 1.05, .05 + .1 * max(0, math.cos(f)))
        P['sh' + side] = ((.3, sy * .9, .64 + rise), .065); P['el' + side] = (el, .045); P['wr' + side] = (wr, .035)
        g = f + math.pi
        kn = (-.32 + .06 * math.sin(g), sy * 1.2, .9 + .06 * max(0, math.cos(g)) + rise * .2)
        an = (-.78 + .16 * math.sin(g), sy, .07 + .1 * max(0, math.cos(g)))
        P['hp' + side] = ((-.5, sy * .8, .56 + rise * .3), .08); P['kn' + side] = (kn, .055); P['an' + side] = (an, .04)
        E += [('chest', 'sh' + side), ('sh' + side, 'el' + side), ('el' + side, 'wr' + side), ('pelvis', 'hp' + side), ('hp' + side, 'kn' + side), ('kn' + side, 'an' + side)]
    skin_body(P, E, skin)
    for i in range(9):  # knobbly spine ridge
        t = i / 8; p = Vector(P['pelvis'][0]).lerp(Vector(P['chest'][0]), t) + Vector((0, 0, .1 + .03 * math.sin(t * math.pi)))
        sphere(p, .02, (1.3, 1, .7), skin, 12)
    for side in 'LR':  # long fingers and toes splayed on the floor
        w = Vector(P['wr' + side][0]); a = Vector(P['an' + side][0])
        for k in range(4):
            spread = (k - 1.5) * .035
            tip = w + (Vector((.2, spread * 2, -.03)) if not lunge else Vector((.2, spread * 2, .06)))
            limb(w, tip, .014, .004, skin, 6)
            limb(a, a + Vector((.12, spread * 1.6, -.04)), .015, .004, skin, 6)
    # head hangs low and forward, face down, hair dragging on the floor
    h = Vector(P['neck'][0]) + Vector((.14, 0, -.06 + (.08 if lunge else 0)))
    head = sphere(h, .1, (1.05, .9, 1.15), skin)
    head.rotation_euler = (0, math.radians(-25 if not lunge else 10), 0)
    mouth = sphere(h + Vector((.09, 0, -.07)), .045, (.6, .8, 1.5 if lunge else 1.1), dark)
    for k in range(6):
        z = -.02 - k * .018
        bpy.ops.mesh.primitive_cone_add(radius1=.006, radius2=0, depth=.03, location=h + Vector((.115, (k % 2 - .5) * .03, z)), rotation=(0, math.pi / 2, 0), vertices=6)
        put(bpy.context.object, tooth, False)
    sphere(h + Vector((.085, .04, .03)), .012, (1, 1, 1), eye, 12)
    for i in range(70):  # long black hair from the scalp, hanging straight down
        a = rng.uniform(0, math.tau); r0 = h + Vector((rng.uniform(-.06, .08), math.sin(a) * .08, .06 + rng.uniform(0, .04)))
        L = rng.uniform(.35, .65) + (.1 if lunge else 0)
        end = r0 + Vector((rng.uniform(-.02, .12) + (.08 if lunge else 0), rng.uniform(-.04, .04), -L))
        limb(r0, end, .004, .0015, hair, 5)


def face():
    skin = mat('FaceSkin', (.6, .6, .58), .45, noise=.4, scale=24, sss=.25)
    dark = mat('Hole', (.003, .001, .001), .85); hair = mat('Hair', (.012, .01, .01), .5)
    tooth = mat('Tooth', (.6, .55, .42), .4); eye = mat('Eye', (.9, .9, .85), .1, (1, .95, .8), 6)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=.12, location=(0, 0, 0), segments=64, ring_count=32)
    hd = bpy.context.object; hd.scale = (.82, .9, 1.25); bpy.ops.object.transform_apply(scale=True)
    for v in hd.data.vertices:  # gaunt: sunken cheeks and a long jaw
        if -.11 < v.co.z < 0 and v.co.y < 0: v.co.x *= .86
        if v.co.z < -.05: v.co.z *= 1.35
    put(hd, skin); hd.data.materials.append(dark)
    for loc, sc in (((-.04, -.1, .025), (.028, .05, .022)), ((.04, -.1, .025), (.028, .05, .022)), ((0, -.09, -.12), (.055, .09, .1))):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=loc, segments=32, ring_count=16)
        c = bpy.context.object; c.scale = sc; c.hide_render = True; c.data.materials.append(dark)
        b = hd.modifiers.new('cut', 'BOOLEAN'); b.operation = 'DIFFERENCE'; b.object = c; b.solver = 'EXACT'
        if hasattr(b, 'material_mode'): b.material_mode = 'TRANSFER'
    t = bpy.data.textures.new('skin', 'CLOUDS'); t.noise_scale = .015; d = hd.modifiers.new('D', 'DISPLACE'); d.texture = t; d.strength = .004
    for sx in (-1, 1): sphere((.04 * sx, -.083, .025), .006, (1, 1, 1), eye, 12)  # tiny pupils deep in the dark
    rng = random.Random(9)
    for k in range(12):  # needle teeth around the gaping mouth
        a = k / 12 * math.tau; p = Vector((math.cos(a) * .045, -.112, -.12 + math.sin(a) * .085))
        bpy.ops.mesh.primitive_cone_add(radius1=.005, radius2=0, depth=.028, location=p, vertices=6)
        o = bpy.context.object; o.rotation_euler = (Vector((0, -.112, -.12)) - p).to_track_quat('Z', 'Y').to_euler(); put(o, tooth, False)
    for i in range(160):  # wet hair parted around the face, hanging past the chin
        x = rng.uniform(-.11, .11)
        if abs(x) < .055 and rng.random() < .8: x = math.copysign(rng.uniform(.055, .11), x or 1)
        top = Vector((x, -.04 + abs(x) * .3 + rng.uniform(-.02, .03), .14 - abs(x) * .4))
        limb(top, top + Vector((x * .25 + rng.uniform(-.01, .01), rng.uniform(-.03, -.01), -rng.uniform(.3, .45))), .0035, .0012, hair, 5)


def light(sc, kind, loc, energy, color, size, target):
    L = bpy.data.lights.new(kind, kind); L.energy = energy; L.color = color; L.shadow_soft_size = size
    o = bpy.data.objects.new(kind, L); o.location = loc; sc.collection.objects.link(o)
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()


def render(sc, name, w, h):
    sc.render.resolution_x = w; sc.render.resolution_y = h; sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = os.path.join(OUT, name); bpy.ops.render.render(write_still=True); print('wrote', name)


def side_shot(sc):
    cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = 2.4
    c = bpy.data.objects.new('c', cam); sc.collection.objects.link(c); sc.camera = c
    c.location = (0, -6, .8); c.rotation_euler = (math.radians(90), 0, 0)  # 2.4 x 1.6 m window, ground at the bottom
    light(sc, 'AREA', (1.5, -3, 3), 200, (.85, .9, 1), 2, (0, 0, .5))
    light(sc, 'AREA', (-2, 2, 2), 160, (.5, .6, 1), 2, (0, 0, .5))
    light(sc, 'AREA', (0, -4, .2), 50, (1, .9, .8), 3, (0, 0, .5))


def kid(pose, frame=0):
    """The player: a kid in a teal hoodie with a flashlight, side view facing right."""
    hoodie = mat('Hoodie', (.05, .42, .45), .8, noise=.25, scale=30); jeans = mat('Jeans', (.08, .14, .32), .85, noise=.3, scale=40)
    skinm = mat('KidSkin', (.8, .55, .4), .5, sss=.2); hairm = mat('KidHair', (.12, .06, .03), .6); shoe = mat('Shoe', (.85, .85, .85), .5)
    torch = mat('Torch', (.25, .25, .28), .3); lens = mat('Lens', (1, 1, .9), .1, (1, .95, .7), 25)
    crouch = pose == 'crouch'; jump = pose == 'jump'
    ph = frame * math.pi / 2; sw = math.sin(ph) * (.55 if pose == 'run' else 0)
    hip = Vector((0, 0, .36 if crouch else .62)); chest = hip + (Vector((.18, 0, .2)) if crouch else Vector((.04, 0, .34)))
    head = chest + (Vector((.12, 0, .2)) if crouch else Vector((.04, 0, .26)))
    def bodypart(P, E, m):
        o = skin_body(P, E, m); o.modifiers['D'].strength = .004; return o
    bodypart({'pelvis': (hip, .11), 'chest': (chest, .13), 'neck': (chest + Vector((0, 0, .1)), .06)}, [('pelvis', 'chest'), ('chest', 'neck')], hoodie)
    for side, sy, f in (('L', .07, 0), ('R', -.07, math.pi)):
        a = math.sin(ph + f) * (.7 if pose == 'run' else 0)
        if crouch: kn, an = hip + Vector((.2, sy, -.12)), hip + Vector((.05, sy, -.33))
        elif jump: kn, an = hip + Vector((.16 if side == 'L' else .05, sy, -.18)), hip + Vector((.02 if side == 'L' else -.12, sy, -.4))
        else: kn = hip + Vector((math.sin(a) * .28, sy, -.28)); an = kn + Vector((math.sin(a - .5) * .2 - .02, 0, -.28 + max(0, -math.sin(a)) * .06))
        bodypart({'pelvis': (hip + Vector((0, sy, 0)), .07), 'kn': (kn, .055), 'an': (an, .045)}, [('pelvis', 'kn'), ('kn', 'an')], jeans)
        sphere(an + Vector((.05, 0, -.02)), .055, (1.6, .8, .6), shoe)
        sh = chest + Vector((0, sy * 1.6, .06))
        if side == 'R':  # the flashlight arm points forward
            el = sh + Vector((.16, 0, -.08)); wr = el + Vector((.18, 0, .02))
            limb(wr - Vector((.02, 0, 0)), wr + Vector((.16, 0, .01)), .03, .035, torch); sphere(wr + Vector((.165, 0, .01)), .03, (.3, 1, 1), lens)
        else:
            b = -a * .6
            el = sh + Vector((math.sin(b) * .2, 0, -.18)); wr = el + Vector((math.sin(b + .6) * .16, 0, -.14))
            if jump: el, wr = sh + Vector((-.1, 0, .14)), sh + Vector((-.05, 0, .3))
        bodypart({'pelvis': (sh, .05), 'el': (el, .045), 'wr': (wr, .04)}, [('pelvis', 'el'), ('el', 'wr')], hoodie)
        sphere(wr + Vector((.03, 0, 0)), .04, (1, 1, 1), skinm)
    sphere(head, .12, (1, .95, 1.05), skinm)
    sphere(head + Vector((-.015, 0, .04)), .125, (1.02, 1, .92), hairm)
    sphere(head + Vector((-.09, 0, -.05)), .13, (.7, .82, .95), hoodie)  # hood bunched behind the head
    sphere(head + Vector((.1, .04, .01)), .016, (1, 1, 1), mat('Eye', (.05, .03, .02), .2))
    sphere(head + Vector((.115, 0, -.03)), .02, (1, 1, 1), skinm)


def kid_shot(sc):
    cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = 1.5
    c = bpy.data.objects.new('c', cam); sc.collection.objects.link(c); sc.camera = c
    c.location = (0, -6, .75); c.rotation_euler = (math.radians(90), 0, 0)
    light(sc, 'AREA', (1.5, -3, 3), 260, (1, .95, .9), 2, (0, 0, .6))
    light(sc, 'AREA', (-2, 2, 2), 140, (.6, .7, 1), 2, (0, 0, .6))
    light(sc, 'AREA', (0, -4, .4), 80, (1, .95, .9), 3, (0, 0, .6))


jobs = [(f'crawler_walk{i}', lambda i=i: crawler(i)) for i in range(4)] + [('crawler_lunge', lambda: crawler(1, lunge=True))]
for name, job in jobs:
    if ONLY and ONLY != name: continue
    sc = reset(); job(); side_shot(sc); render(sc, f'{name}.png', 384, 256)
kids = [('kid_idle', lambda: kid('idle'))] + [(f'kid_run{i}', lambda i=i: kid('run', i)) for i in range(4)] + [('kid_crouch', lambda: kid('crouch')), ('kid_jump', lambda: kid('jump'))]
for name, job in kids:
    if ONLY and ONLY != name: continue
    sc = reset(-.2); job(); kid_shot(sc); render(sc, f'{name}.png', 160, 160)

if not ONLY or ONLY == 'crawler_face':
    sc = reset(-1.0); face()
    light(sc, 'SPOT', (.05, -.6, -.25), 40, (1, .92, .8), .03, (0, 0, 0))
    light(sc, 'AREA', (-.5, .4, .5), 20, (.6, .7, 1), .4, (0, 0, 0))
    cam = bpy.data.cameras.new('c'); cam.lens = 50; c = bpy.data.objects.new('c', cam); sc.collection.objects.link(c); sc.camera = c
    c.location = (0, -.62, -.02); c.rotation_euler = (Vector((0, 0, -.03)) - c.location).to_track_quat('-Z', 'Y').to_euler()
    render(sc, 'crawler_face.png', 512, 512)
