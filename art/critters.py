"""Eight original creatures for Monster Tamer, in a 3/4 view facing left.

Run headless:  blender -b -P art/critters.py -- <output folder> [only]
Writes mon_<name>.png (256x256).
"""
import bpy, math, sys, os, random
from mathutils import Vector

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARGS[0] if ARGS else os.path.join(os.path.dirname(__file__), '..', 'img')
ONLY = ARGS[1] if len(ARGS) > 1 else None


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
    sc.render.film_transparent = True; sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = -.35
    w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (.45, .5, .6, 1)
    for name, rot, e in (('key', (math.radians(50), math.radians(-20), math.radians(-40)), 2.8), ('rim', (math.radians(-60), math.radians(20), math.radians(150)), 1.6)):
        L = bpy.data.lights.new(name, 'SUN'); L.energy = e; o = bpy.data.objects.new(name, L); o.rotation_euler = rot; sc.collection.objects.link(o)
    return sc


def mat(name, color, rough=.45, emit=0, alpha=1, sss=0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough
    if emit: b.inputs['Emission Color'].default_value = (*color, 1); b.inputs['Emission Strength'].default_value = emit
    if alpha < 1: b.inputs['Alpha'].default_value = alpha
    if sss: b.inputs['Subsurface Weight'].default_value = sss
    return m


def sphere(loc, r, scale, m, seg=40):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg // 2); o = bpy.context.object; o.scale = scale
    o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o


def cone(loc, r1, r2, d, m, rot=(0, 0, 0), v=24):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=d, location=loc, rotation=rot, vertices=v); o = bpy.context.object
    o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o


def limb(a, b, r, m, v=16):
    a, b = Vector(a), Vector(b); d = b - a
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d.length, location=(a + b) / 2, vertices=v); o = bpy.context.object
    o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler(); o.data.materials.append(m); bpy.ops.object.shade_smooth()
    for p in (a, b): sphere(p, r, (1, 1, 1), m, 16)
    return o


def eyes(c, sep, r, look=(-1, -.6, 0), white=None):
    ink = mat('ink', (.02, .02, .03), .1); w = white or mat('eyewhite', (1, 1, 1), .2); shine = mat('shine', (1, 1, 1), .1, 4)
    lk = Vector(look).normalized()
    for s in (-1, 1):
        p = Vector(c) + Vector((0, s * sep, 0))
        sphere(p, r, (1, 1, 1.15), w); sphere(p + lk * r * .55, r * .62, (1, 1, 1.15), ink); sphere(p + lk * r * .85 + Vector((0, 0, r * .35)), r * .2, (1, 1, 1), shine)


def emberpup():
    fur = mat('fur', (1, .45, .1), .6); cream = mat('cream', (1, .88, .7), .6); flame = mat('flame', (1, .55, .05), .3, 12); dark = mat('dark', (.25, .1, .05), .5)
    sphere((0, 0, .45), .38, (1.25, .85, .8), fur); sphere((-.42, 0, .78), .3, (1, 1, .95), fur)
    sphere((-.6, 0, .7), .14, (1, 1, .8), cream); sphere((-.72, 0, .74), .05, (1, 1, 1), dark)
    for s in (-1, 1): cone((-.38, s * .18, 1.08), .12, 0, .3, fur, (s * .3, -.25, 0)); cone((-.38, s * .18, 1.06), .07, 0, .22, cream, (s * .3, -.25, 0))
    for x in (-.25, .25):
        for s in (-1, 1): limb((x, s * .18, .35), (x, s * .2, .06), .08, fur)
    for i in range(5): cone((.5 + i * .06, 0, .7 + i * .1), .12 - i * .015, 0, .3, flame, (0, math.radians(-30 - i * 6), 0))
    eyes((-.66, 0, .86), .13, .075)


def puddlet():
    skin = mat('skin', (.2, .55, 1), .25, 0, 1, .2); belly = mat('belly', (.75, .9, 1), .3); fin = mat('fin', (.1, .35, .85), .3); bub = mat('bub', (.7, .9, 1), .05, 0, .35)
    sphere((0, 0, .45), .45, (1, .95, .9), skin); sphere((-.2, 0, .35), .3, (.8, .9, .8), belly)
    cone((0, 0, .95), .18, 0, .4, fin, (0, math.radians(-25), 0)); cone((.42, 0, .2), .12, 0, .35, fin, (0, math.radians(70), 0))
    for s in (-1, 1): sphere((-.15, s * .4, .2), .14, (1.2, .6, .5), fin)
    eyes((-.36, 0, .66), .17, .1)
    for i, (x, y, z, r) in enumerate(((-.7, .2, 1.0, .08), (-.85, -.1, 1.2, .05), (-.6, -.25, 1.3, .04))): sphere((x, y, z), r, (1, 1, 1), bub)


def sproutle():
    body = mat('body', (.4, .78, .3), .5); dark = mat('dk', (.25, .55, .2), .5); leaf = mat('leaf', (.3, .85, .25), .4); pink = mat('pink', (1, .55, .7), .4)
    sphere((0, 0, .42), .42, (1, 1, .9), body)
    for i in range(6): a = i / 6 * math.tau; sphere((math.cos(a) * .3, math.sin(a) * .3, .2), .12, (1, 1, .6), dark)
    limb((0, 0, .8), (.05, 0, 1.05), .03, dark)
    for s in (-1, 1): l = sphere((s * .16, 0, 1.12), .18, (1.4, .5, .15), leaf); l.rotation_euler = (0, s * -.5, 0)
    sphere((-.05, 0, 1.24), .07, (1, 1, 1), pink)
    eyes((-.33, 0, .55), .15, .085)
    for s in (-1, 1): sphere((-.36, s * .26, .4), .05, (1, 1, .6), pink)


def pebblor():
    rock = mat('rock', (.55, .46, .38), .85); dark = mat('dk', (.35, .28, .22), .85); crys = mat('crys', (.35, .95, .85), .1, 3); face = mat('face', (.78, .66, .52), .7)
    o = sphere((.05, 0, .42), .45, (1.2, .95, .7), rock, 14); bpy.ops.object.shade_flat()   # domed stone back
    for i in range(4):
        for s in (-1, 0, 1): cone((-.25 + i * .18, s * .2, .7 - abs(s) * .08), .07, 0, .28 + (i % 2) * .08, crys, (s * .4, -.15, 0), 6)
    sphere((-.55, 0, .32), .2, (1.1, .95, .9), face)                      # snout-y head peeking out
    sphere((-.72, 0, .3), .06, (1, 1, .8), dark)
    for s in (-1, 1):
        for x in (-.25, .3): sphere((x, s * .38, .1), .12, (1.1, 1, .8), dark, 12)
    eyes((-.66, 0, .44), .1, .065)


def voltle():
    skin = mat('skin', (.15, .7, .7), .45); shell = mat('shell', (1, .8, .15), .35); stripe = mat('stripe', (.12, .15, .25), .4); bolt = mat('bolt', (.6, 1, 1), .3, 8)
    sphere((0, 0, .45), .42, (1.15, 1, .75), shell)                      # battery shell
    for i in range(3): sphere((-.15 + i * .18, 0, .62), .4, (.08, 1.02, .5), stripe)
    sphere((-.55, 0, .5), .22, (1, .95, 1), skin)                          # head
    for s in (-1, 1):
        for x in (-.25, .3): sphere((x, s * .38, .12), .11, (1, 1, .9), skin)
    pts = [(-.2, 0, .8), (-.12, 0, 1.0), (-.24, 0, 1.08), (-.14, 0, 1.28)]
    for p, q in zip(pts, pts[1:]): limb(p, q, .035, bolt, 8)
    sphere((-.14, 0, 1.3), .07, (1, 1, 1), bolt)
    cone((.48, 0, .35), .08, 0, .22, skin, (0, math.radians(80), 0))      # little tail
    eyes((-.68, 0, .58), .1, .07)


def gloomp():
    goo = mat('goo', (.42, .18, .75), .2, .35, .85); glow = mat('glow', (.95, .85, 1), .2, 3)
    o = sphere((0, 0, .6), .45, (1, 1, 1.15), goo)
    for i in range(5): a = i / 5 * math.tau; cone((math.cos(a) * .3, math.sin(a) * .3, .15), .12, 0, .35, goo, (math.pi, 0, 0))
    cone((.35, 0, .8), .2, 0, .6, goo, (0, math.radians(60), 0))
    eyes((-.38, 0, .72), .16, .1, white=glow)
    sphere((-.43, 0, .45), .06, (1.6, 1, .5), mat('mouth', (.15, .05, .2), .3))


def frostling():
    body = mat('body', (.92, .96, 1), .3); blue = mat('blue', (.3, .55, .95), .3); ice = mat('ice', (.6, .9, 1), .05, 2, .8); orange = mat('or', (1, .6, .15), .4)
    sphere((0, 0, .5), .38, (.95, .9, 1.25), blue); sphere((-.12, 0, .45), .28, (.7, .8, 1.1), body)
    cone((-.35, 0, .82), .06, 0, .14, orange, (0, math.radians(-90), 0))
    for s in (-1, 1): sphere((0, s * .38, .45), .1, (.6, .4, 1.3), blue)
    for s in (-1, 1): sphere((-.05, s * .14, .03), .1, (1.4, 1, .4), orange)
    cone((-.1, 0, 1.12), .09, 0, .4, ice, (0, -.2, 0), 6)
    eyes((-.3, 0, .9), .12, .07)


def bloomoth():
    body = mat('body', (.95, .85, .7), .6); wing = mat('wing', (1, .55, .75), .4, 0, .9); spot = mat('spot', (1, .9, .3), .3, 2); dark = mat('dk', (.2, .15, .15), .5)
    sphere((0, 0, .6), .22, (1.6, .9, .9), body)
    for s in (-1, 1):
        w = sphere((.05, s * .38, .8), .35, (.8, 1.1, .1), wing); w.rotation_euler = (s * .5, 0, 0)
        sphere((.05, s * .45, .86), .08, (1, 1, .2), spot).rotation_euler = (s * .5, 0, 0)
        limb((-.3, s * .05, .82), (-.42, s * .18, 1.1), .015, dark, 8); sphere((-.42, s * .18, 1.1), .045, (1, 1, 1), spot)
    for i in range(4): sphere((.3 + i * .12, 0, .55), .14 - i * .02, (1, 1, 1), body)
    eyes((-.3, 0, .66), .1, .07)


CRITTERS = {'emberpup': emberpup, 'puddlet': puddlet, 'sproutle': sproutle, 'pebblor': pebblor, 'voltle': voltle, 'gloomp': gloomp, 'frostling': frostling, 'bloomoth': bloomoth}
for name, build in CRITTERS.items():
    if ONLY and ONLY != name: continue
    sc = reset(); build()
    cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = 2.0
    c = bpy.data.objects.new('c', cam); sc.collection.objects.link(c); sc.camera = c
    c.location = (-5.5, -3.2, 2.6); c.rotation_euler = (Vector((0, 0, .62)) - c.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.resolution_x = sc.render.resolution_y = 256
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = os.path.join(OUT, f'mon_{name}.png'); bpy.ops.render.render(write_still=True); print('wrote', name)
