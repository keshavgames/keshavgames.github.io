"""Doll House sprites: the porcelain doll and the kid, seen from a 3/4 top-down camera.

Run headless:  blender -b -P art/doll.py -- <output folder> [only]
Writes doll_still.png, doll_reach.png (192x256), doll_face.png (512x512) and
kid4_<down|up|left|right>_<0|1|2>.png (128x128) for the top-down player.
"""
import bpy, math, random, sys, os
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'crawler.py'), encoding='utf8').read()
exec(src.split('\njobs = ')[0])  # reuse the kid model and helpers from crawler.py
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARGS[0] if ARGS else os.path.join(HERE, '..', 'img')
ONLY = ARGS[1] if len(ARGS) > 1 else None


def porcelain(name='Porcelain'):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; n = nt.nodes; L = nt.links
    b = n['Principled BSDF']; b.inputs['Roughness'].default_value = .15
    if 'Coat Weight' in b.inputs: b.inputs['Coat Weight'].default_value = .7
    vor = n.new('ShaderNodeTexVoronoi'); vor.feature = 'DISTANCE_TO_EDGE'; vor.inputs['Scale'].default_value = 9
    ramp = n.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].color = (.08, .05, .04, 1); ramp.color_ramp.elements[0].position = 0
    ramp.color_ramp.elements[1].color = (.88, .82, .76, 1); ramp.color_ramp.elements[1].position = .02
    L.new(vor.outputs['Distance'], ramp.inputs['Fac']); L.new(ramp.outputs['Color'], b.inputs['Base Color'])
    return m


def doll(pose):
    face = porcelain(); dress = mat('Dress', (.16, .03, .05), .85, noise=.6, scale=14); lace = mat('Lace', (.6, .55, .45), .8, noise=.55, scale=40)
    hair = mat('Hair', (.02, .016, .015), .85); eye = mat('Glass', (.02, .02, .03), .05); iris = mat('Iris', (.15, .3, .5), .1)
    hole = mat('Hole', (.003, .001, .001), .9); lips = mat('Lips', (.5, .05, .06), .3); cheek = mat('Cheek', (.85, .5, .5), .4)
    shoe = mat('Shoe', (.03, .03, .03), .3); glow = mat('Glint', (1, .2, .1), .2, (1, .15, .05), 30)
    reach = pose == 'reach'
    # dress: a flared bell with a ruffled hem and a lace collar
    bpy.ops.mesh.primitive_cone_add(radius1=.3, radius2=.11, depth=.48, location=(0, 0, .3), vertices=48); put(bpy.context.object, dress)
    for i in range(24):
        a = i / 24 * math.tau; sphere((math.cos(a) * .3, math.sin(a) * .3, .07), .045, (1.2, 1.2, .7), lace, 12)
    sphere((0, 0, .58), .12, (1, .9, 1.1), dress)
    for i in range(14):
        a = i / 14 * math.tau; sphere((math.cos(a) * .1, math.sin(a) * .09, .66), .035, (1.3, 1.3, .5), lace, 12)
    for sx in (-1, 1):
        sphere((.14 * sx, 0, .6), .06, (1, 1, 1.1), dress)  # puffed sleeves
        hand = Vector((.12 * sx, -.28, .62)) if reach else Vector((.17 * sx, -.02, .38))
        limb((.15 * sx, 0, .56), hand, .03, .025, face, 10); sphere(hand, .035, (1, 1, 1), face)
        sphere((.07 * sx, -.02, .02), .045, (1, 1.6, .6), shoe)
    # head: tilted, cracked, one eye gone
    tilt = .35 if reach else .15
    h = Vector((0, -.01, .84))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=.13, location=h, segments=64, ring_count=32)
    hd = bpy.context.object; hd.scale = (.95, .92, 1); put(hd, face); hd.data.materials.append(hole)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=h + Vector((.045, -.115, .02)), segments=24, ring_count=12)
    c = bpy.context.object; c.scale = (.032, .04, .03); c.hide_render = True; c.data.materials.append(hole)
    b = hd.modifiers.new('cut', 'BOOLEAN'); b.operation = 'DIFFERENCE'; b.object = c; b.solver = 'EXACT'
    if hasattr(b, 'material_mode'): b.material_mode = 'TRANSFER'
    sphere(h + Vector((.045, -.1, .02)), .007, (1, 1, 1), glow, 12)   # a red glint deep in the empty socket
    sphere(h + Vector((-.045, -.105, .02)), .03, (1, .6, 1), eye)      # big glass eye
    sphere(h + Vector((-.045, -.133, .022)), .006, (1, .4, 1), iris)  # a tiny staring pupil
    sphere(h + Vector((-.07, -.1, -.035)), .02, (1, .4, .8), cheek)
    ooze = mat('Ooze', (.01, .003, .003), .1)
    for k, (dx, L) in enumerate(((.04, .09), (.052, .06), (.035, .05))): limb(h + Vector((dx, -.118, 0)), h + Vector((dx + .004, -.122, -L)), .006, .002, ooze, 8)
    stitch = mat('Stitch', (.03, .02, .02), .6)
    pts = [h + Vector((math.sin(t) * .075, -.124 + (1 - math.cos(t)) * .03, -.06 + (1 - math.cos(t * 1.1)) * .03)) for t in [(-1 + i / 6) * 1.1 for i in range(13)]]
    for a, b2 in zip(pts, pts[1:]): limb(a, b2, .004, .004, stitch, 6)  # a stitched grin from ear to ear
    for p2 in pts[1:-1:2]: limb(p2 + Vector((0, 0, .012)), p2 - Vector((0, 0, .012)), .003, .003, stitch, 6)
    rng = random.Random(3)
    for i in range(120):  # long black hair, a few strands falling across the face
        x = rng.uniform(-.13, .13); front = abs(x) < .06 and rng.random() < .25
        top = h + Vector((x * .9, (-.08 if front else rng.uniform(-.02, .1)), .11 - abs(x) * .3))
        L = rng.uniform(.2, .42) if not front else rng.uniform(.1, .2)
        limb(top, top + Vector((x * .5, (-.06 if front else .03), -L)), .004, .0015, hair, 5)
    sphere(h + Vector((0, .015, .05)), .135, (1, 1, .78), hair)  # hair cap
    # tilt the whole head group
    for o in bpy.context.scene.objects:
        if o.type == 'MESH' and (o.location - h).length < .2 and o.location.z > .7:
            o.location = h + (o.location - h); o.rotation_euler.y += 0
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.context.scene.objects:
        if o.type == 'MESH' and o.location.z > .72: o.select_set(True)
    bpy.ops.transform.rotate(value=tilt, orient_axis='Y', center_override=h - Vector((0, 0, .12)))


def three_quarter(sc, height, w, h, cz, elev=50):
    cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = height
    c = bpy.data.objects.new('c', cam); sc.collection.objects.link(c); sc.camera = c
    el = math.radians(elev); c.location = (0, -6 * math.cos(el), cz + 6 * math.sin(el)); c.rotation_euler = (math.radians(90) - el, 0, 0)
    sc.render.resolution_x = w; sc.render.resolution_y = h
    light(sc, 'AREA', (1.5, -2.5, 3.5), 240, (1, .95, .88), 2, (0, 0, .4))
    light(sc, 'AREA', (-2, 2, 2.5), 120, (.6, .7, 1), 2, (0, 0, .4))


for pose in ('still', 'reach'):
    if ONLY and ONLY != f'doll_{pose}': continue
    sc = reset(-.3); doll(pose); three_quarter(sc, 1.45, 192, 256, .55, 32); render(sc, f'doll_{pose}.png', 192, 256)

DIRS = {'right': 0, 'up': math.pi / 2, 'left': math.pi, 'down': -math.pi / 2}
for d, rot in DIRS.items():
    for f in range(3):
        name = f'kid4_{d}_{f}'
        if ONLY and ONLY != name: continue
        sc = reset(-.2); kid('idle' if f == 0 else 'run', 1 if f == 1 else 3)
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.transform.rotate(value=rot, orient_axis='Z', center_override=(0, 0, 0))
        three_quarter(sc, 1.6, 128, 128, .65); render(sc, f'{name}.png', 128, 128)

if not ONLY or ONLY == 'doll_face':
    sc = reset(-.9); doll('reach')
    light(sc, 'SPOT', (.08, -.45, .62), 20, (1, .9, .75), .03, (0, -.05, .88))
    light(sc, 'AREA', (-.4, .3, 1.3), 12, (.9, .2, .15), .4, (0, 0, .86))
    cam = bpy.data.cameras.new('c'); cam.lens = 50; c = bpy.data.objects.new('c', cam); sc.collection.objects.link(c); sc.camera = c
    c.location = (0, -.62, .9); c.rotation_euler = (Vector((0, 0, .85)) - c.location).to_track_quat('-Z', 'Y').to_euler()
    render(sc, 'doll_face.png', 512, 512)
