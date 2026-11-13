"""The Signal for Dead Signal: a tall wet thing whose head splits into four toothed petals around a glowing throat.

Run headless:  blender -b -P art/signal.py -- <output folder> [only]
Writes signal_walk1..4, signal_idle, signal_attack (320x512, front view, ground at the bottom) and signal_face (512x512).
"""
import bpy, math, random, sys, os
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(HERE, 'crawler.py'), encoding='utf8').read().split('\njobs = ')[0])  # shared helpers


def ellipsoid(center, x, y, z, radii, m):  # a sphere stretched along three chosen axes
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=32, ring_count=16); o = bpy.context.object
    B = Matrix((x.normalized() * radii[0], y.normalized() * radii[1], z.normalized() * radii[2])).transposed()
    o.matrix_world = Matrix.Translation(center) @ B.to_4x4(); return put(o, m)


def creature(pose, frame=0):
    flesh = mat('Flesh', (.12, .08, .13), .25, noise=.6, scale=14, sss=.15)
    vein = mat('Vein', (.1, .8, .9), .3, (.2, .9, 1), 6)
    tooth = mat('Tooth', (.75, .72, .6), .35); throat = mat('Throat', (.05, .3, .35), .2, (.3, 1, 1), 14)
    cable = mat('Cable', (.04, .04, .05), .4)
    open_ = {'idle': .25, 'attack': 1.0}.get(pose, .45)
    ph = frame * math.pi / 2
    sw = math.sin(ph) * .16 if pose == 'walk' else 0
    lift = lambda f: max(0, math.sin(ph + f)) * .12 if pose == 'walk' else 0
    P = {'pelvis': ((0, 0, 1.05), .13), 'belly': ((0, -.02, 1.35), .12), 'chest': ((0, -.04, 1.68), .17), 'neck': ((0, -.08, 1.98), .07)}
    E = [('pelvis', 'belly'), ('belly', 'chest'), ('chest', 'neck')]
    for side, sx, f in (('L', 1, 0), ('R', -1, math.pi)):
        s = math.sin(ph + f) * (.16 if pose == 'walk' else 0)
        P['hp' + side] = ((.12 * sx, 0, 1.0), .09); P['kn' + side] = ((.16 * sx, -.12 - s * .5, .55 + lift(f)), .07); P['an' + side] = ((.13 * sx, .06 - s, .06 + lift(f) * .5), .05)
        reach = pose == 'attack'
        P['sh' + side] = ((.24 * sx, -.04, 1.82), .08)
        P['el' + side] = ((.42 * sx, -.2 if reach else -.02 + s * .4, 1.55 if reach else 1.4), .055)
        P['wr' + side] = ((.36 * sx, -.62 if reach else .02 - s * .5, 1.65 if reach else .95), .04)
        E += [('pelvis', 'hp' + side), ('hp' + side, 'kn' + side), ('kn' + side, 'an' + side), ('chest', 'sh' + side), ('sh' + side, 'el' + side), ('el' + side, 'wr' + side)]
    skin_body(P, E, flesh)
    rng = random.Random(8)
    for side, sx in (('L', 1), ('R', -1)):  # long hooked fingers
        w = Vector(P['wr' + side][0])
        for k in range(3):
            d = Vector(((k - 1) * .05 * sx + .02 * sx, -.18 if pose == 'attack' else -.03, .02 if pose == 'attack' else -.24))
            limb(w, w + d, .016, .003, flesh, 6)
        sphere(Vector(P['an' + side][0]) + Vector((0, -.06, .0)), .06, (.8, 1.8, .6), flesh)
    for i in range(9):  # glowing veins over the chest and belly
        a = rng.uniform(-1.2, 1.2); z = rng.uniform(1.1, 1.85)
        p = Vector((math.sin(a) * .14, -math.cos(a) * .13 - .03, z))
        limb(p, p + Vector((rng.uniform(-.06, .06), -.005, rng.uniform(-.14, -.05))), .006, .004, vein, 5)
    for i in range(4):  # cables trailing from its back, as if it ate the wiring
        a = rng.uniform(-1, 1); top = Vector((math.sin(a) * .06, .14, rng.uniform(1.5, 1.9)))
        limb(top, top + Vector((rng.uniform(-.25, .25), rng.uniform(.1, .3), -rng.uniform(.6, 1.4))), .012, .01, cable, 6)
    # the head: four petals that open around a lit throat
    h = Vector((0, -.12, 2.12))
    # an eyeless, swept-back head with a tall vertical mouth that opens sideways
    dark = mat('Mouth', (.01, .002, .006), .4)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=h + Vector((0, .03, .02)), segments=64, ring_count=32)
    hd = bpy.context.object; hd.scale = (.1, .15, .17); bpy.ops.object.transform_apply(scale=True)
    for v in hd.data.vertices:  # sweep the back of the skull up and back
        if v.co.y > 0: v.co.z += v.co.y * .9; v.co.y *= 1.3
    put(hd, flesh); hd.data.materials.append(dark)
    w = .014 + open_ * .03
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=h + Vector((0, -.11, -.01)), segments=32, ring_count=16)
    c = bpy.context.object; c.scale = (w, .08, .13); c.hide_render = True; c.data.materials.append(dark)
    bm = hd.modifiers.new('mouth', 'BOOLEAN'); bm.operation = 'DIFFERENCE'; bm.object = c; bm.solver = 'EXACT'
    if hasattr(bm, 'material_mode'): bm.material_mode = 'TRANSFER'
    sphere(h + Vector((0, -.04, -.01)), .04, (.6, .5, 1.6), throat)
    for sx in (-1, 1):
        for t in range(9):  # teeth along both lips of the slit, pointing across the gap
            z = (t - 4) * .026; edge = w * math.sqrt(max(0, 1 - (z / .13) ** 2))
            q = h + Vector((sx * (edge + .004), -.105 + abs(z) * .25, -.01 + z))
            bpy.ops.mesh.primitive_cone_add(radius1=.009, radius2=0, depth=.035 + open_ * .02, location=q, vertices=6); o = bpy.context.object
            o.rotation_euler = Vector((-sx, -.3, 0)).to_track_quat('Z', 'Y').to_euler(); put(o, tooth, False)
    for k in range(3):  # antenna spines with glowing tips, as if it listens to the station
        base = h + Vector(((k - 1) * .05, .16, .2)); tip = base + Vector(((k - 1) * .12, .14, .3 - abs(k - 1) * .08))
        limb(base, tip, .014, .003, flesh, 6); sphere(tip, .014, (1, 1, 1), vein, 10)


def front(sc, face=False):
    cam = bpy.data.cameras.new('c'); c = bpy.data.objects.new('c', cam); sc.collection.objects.link(c); sc.camera = c
    if face:
        cam.lens = 45; c.location = (0, -.85, 2.1); c.rotation_euler = (Vector((0, -.12, 2.12)) - c.location).to_track_quat('-Z', 'Y').to_euler()
        light(sc, 'SPOT', (.15, -.8, 1.7), 60, (.7, .9, 1), .03, (0, -.12, 2.1))
        light(sc, 'AREA', (-.6, .5, 2.6), 30, (.9, .2, .5), .5, (0, 0, 2.1))
        return
    cam.type = 'ORTHO'; cam.ortho_scale = 2.6; c.location = (0, -6, 1.3); c.rotation_euler = (math.radians(90), 0, 0)
    light(sc, 'AREA', (1.5, -3, 3.5), 320, (.8, .9, 1), 2, (0, 0, 1.2))
    light(sc, 'AREA', (-2, 2, 2.5), 220, (.7, .3, 1), 2, (0, 0, 1.2))
    light(sc, 'AREA', (0, -4, .5), 70, (.6, .9, 1), 3, (0, 0, 1.2))


JOBS = [(f'signal_walk{i + 1}', 'walk', i) for i in range(4)] + [('signal_idle', 'idle', 0), ('signal_attack', 'attack', 0)]
for name, pose, f in JOBS:
    if ONLY and ONLY != name: continue
    sc = reset(-.4); creature(pose, f); front(sc); render(sc, f'{name}.png', 320, 512)
if not ONLY or ONLY == 'signal_face':
    sc = reset(-1.0); creature('attack'); front(sc, face=True); render(sc, 'signal_face.png', 512, 512)
