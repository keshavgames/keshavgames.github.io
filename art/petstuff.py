"""Props for the simulation games: pet hats, pet food, toys (Pet Pal), pizza toppings (Pizza Maker), lemonade stand items.

Run headless:  blender -b -P art/petstuff.py -- <output folder> [only-prefix]
"""
import bpy, bmesh, math, sys, os
from mathutils import Vector

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARGS[0] if ARGS else os.path.join(os.path.dirname(__file__), '..', 'img')
ONLY = ARGS[1].split(',') if len(ARGS) > 1 else []


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
    sc.render.film_transparent = True; sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = -.2
    w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (.55, .57, .62, 1)
    for name, rot, e in (('key', (math.radians(40), math.radians(-30), math.radians(-20)), 3), ('rim', (math.radians(-60), math.radians(30), 0), 1.2)):
        L = bpy.data.lights.new(name, 'SUN'); L.energy = e; o = bpy.data.objects.new(name, L); o.rotation_euler = rot; sc.collection.objects.link(o)
    return sc


def mat(name, color, rough=.4, metal=0, coat=0, glass=0, alpha=1):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if coat and 'Coat Weight' in b.inputs: b.inputs['Coat Weight'].default_value = coat
    if glass: b.inputs['Transmission Weight'].default_value = glass; b.inputs['IOR'].default_value = 1.3
    if alpha < 1: b.inputs['Alpha'].default_value = alpha
    return m


def put(o, m, smooth=True):
    o.data.materials.append(m)
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    return o


def sphere(r, loc=(0, 0, 0), scale=(1, 1, 1), m=None, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, rotation=rot, segments=48, ring_count=24); o = bpy.context.object; o.scale = scale
    return put(o, m) if m else o


def cyl(r, d, loc=(0, 0, 0), m=None, rot=(0, 0, 0), v=48, scale=(1, 1, 1), smooth=True):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d, location=loc, rotation=rot, vertices=v); o = bpy.context.object; o.scale = scale
    return put(o, m, smooth) if m else o


def cone(r1, r2, d, loc=(0, 0, 0), m=None, rot=(0, 0, 0), v=48, smooth=True):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=d, location=loc, rotation=rot, vertices=v); o = bpy.context.object
    return put(o, m, smooth) if m else o


def torus(R, r, loc=(0, 0, 0), m=None, rot=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, rotation=rot, major_segments=48, minor_segments=16); o = bpy.context.object; o.scale = scale
    return put(o, m) if m else o


def box(size, loc=(0, 0, 0), m=None, bevel=.05, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.scale = size
    bpy.ops.object.transform_apply(scale=True); b = o.modifiers.new('b', 'BEVEL'); b.width = bevel; b.segments = 4
    return put(o, m) if m else o


def star(r, loc, m, rot=(math.radians(90), 0, 0), depth=.03):
    me = bpy.data.meshes.new('star'); bm = bmesh.new(); vs = []
    for i in range(10):
        a = math.pi / 2 + i * math.pi / 5; rr = r if i % 2 == 0 else r * .45; vs.append(bm.verts.new((math.cos(a) * rr, math.sin(a) * rr, 0)))
    f = bm.faces.new(vs); bmesh.ops.extrude_face_region(bm, geom=[f]);
    for v in bm.verts:
        if v not in vs: v.co.z += depth
    bm.to_mesh(me); bm.free(); o = bpy.data.objects.new('star', me); bpy.context.scene.collection.objects.link(o); o.location = loc; o.rotation_euler = rot
    o.data.materials.append(m); return o


def shoot(sc, name, w, h, scale, elev=20, target=(0, 0, 0)):
    cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = scale
    c = bpy.data.objects.new('c', cam); sc.collection.objects.link(c); sc.camera = c
    e = math.radians(elev); t = Vector(target); c.location = t + Vector((0, -8 * math.cos(e), 8 * math.sin(e)))
    c.rotation_euler = (t - c.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.resolution_x = w; sc.render.resolution_y = h
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = os.path.join(OUT, name); bpy.ops.render.render(write_still=True); print('wrote', name)


def front(r, z, a):  # point on a round surface facing the camera (camera sits on -Y)
    return (math.cos(a) * r, math.sin(a) * r, z)


jobs = {}
def job(f): jobs[f.__name__] = f; return f


# ---------- hats ----------
@job
def hat_party():
    sc = reset(); pink = mat('p', (1, .35, .6), .35, 0, .6); yel = mat('y', (1, .85, .15), .4)
    cone(.42, 0, .95, (0, 0, .475), pink)
    for i in range(14):
        z = .08 + (i * .37) % .7; r = .42 * (1 - z / .95) + .01; a = math.radians(-90 + ((i * 47) % 140) - 70)
        sphere(.045, front(r, z, a), m=yel)
    sphere(.11, (0, 0, .98), m=yel); torus(.41, .045, (0, 0, .03), yel)
    shoot(sc, 'hat_party.png', 128, 128, 1.35, 15, (0, 0, .5))


@job
def hat_crown():
    sc = reset(); gold = mat('g', (1, .72, .15), .22, 1); red = mat('r', (.9, .05, .15), .1, 0, 1); blue = mat('b', (.1, .3, 1), .1, 0, 1); grn = mat('gr', (.1, .8, .3), .1, 0, 1)
    o = cyl(.42, .26, (0, 0, .13), gold); o.modifiers.new('s', 'SOLIDIFY').thickness = .04
    for i in range(6):
        a = i * math.tau / 6 - math.pi / 2; cone(.1, 0, .26, (math.cos(a) * .42, math.sin(a) * .42, .38), gold); sphere(.04, (math.cos(a) * .42, math.sin(a) * .42, .52), m=gold)
    for i, mm in enumerate((red, blue, grn)): sphere(.06, front(.44, .13, math.radians(-90 + (i - 1) * 32)), m=mm)
    shoot(sc, 'hat_crown.png', 128, 112, 1.15, 18, (0, 0, .25))


@job
def hat_bow():
    sc = reset(); pink = mat('p', (1, .3, .55), .35, 0, .5); dark = mat('d', (.85, .15, .4), .4)
    for s in (-1, 1): sphere(.3, (s * .3, 0, 0), (1, .38, .62), pink, (0, s * math.radians(-12), 0)); sphere(.12, (s * .44, -.1, .02), (1, .4, .6), dark)
    sphere(.13, (0, -.03, 0), (1, .9, 1.1), dark)
    shoot(sc, 'hat_bow.png', 128, 80, 1.3, 10)


@job
def hat_cap():
    sc = reset(); blue = mat('b', (.15, .4, 1), .5); white = mat('w', (.95, .95, .95), .5)
    o = sphere(.42, (0, 0, 0), (1, 1, .8), blue)
    bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-4], context='VERTS'); bm.to_mesh(o.data); bm.free()
    cyl(.3, .03, (0, -.44, .02), white, scale=(1.1, 1.3, 1)); sphere(.05, (0, 0, .34), m=white)
    star(.12, (0, -.38, .2), white, (math.radians(80), 0, 0))
    shoot(sc, 'hat_cap.png', 128, 96, 1.25, 18, (0, -.1, .12))


@job
def hat_wizard():
    sc = reset(); purple = mat('p', (.4, .15, .85), .5); yel = mat('y', (1, .85, .2), .3, .6)
    cyl(.62, .04, (0, 0, .02), purple, v=64); o = cone(.38, .02, 1.0, (0, 0, .52), purple)
    sb = o.modifiers.new('bend', 'SIMPLE_DEFORM'); sb.deform_method = 'BEND'; sb.angle = math.radians(30); sb.deform_axis = 'Y'
    star(.11, (0, -.27, .3), yel, (math.radians(70), 0, 0)); star(.07, (.14, -.2, .55), yel, (math.radians(70), 0, .3)); torus(.37, .035, (0, 0, .07), yel)
    shoot(sc, 'hat_wizard.png', 128, 144, 1.5, 15, (0, 0, .5))


@job
def hat_tophat():
    sc = reset(); black = mat('k', (.04, .04, .05), .35, 0, .5); red = mat('r', (.85, .1, .15), .5)
    cyl(.52, .04, (0, 0, .02), black, v=64); cyl(.3, .62, (0, 0, .33), black); cyl(.305, .12, (0, 0, .11), red)
    shoot(sc, 'hat_tophat.png', 128, 128, 1.3, 15, (0, 0, .35))


@job
def hat_flower():
    sc = reset(); grn = mat('g', (.2, .65, .2), .6); cols = [mat('c%d' % i, c, .5) for i, c in enumerate(((1, .95, .95), (1, .5, .75), (.6, .5, 1), (1, .6, .3)))]; yel = mat('y', (1, .85, .1), .5)
    torus(.4, .04, (0, 0, 0), grn)
    for i in range(8):
        a = i * math.tau / 8 - math.pi / 2; cx, cy = math.cos(a) * .4, math.sin(a) * .4; m = cols[i % 4]
        for k in range(5):
            b = k * math.tau / 5; sphere(.06, (cx + math.cos(b) * .065, cy, .05 + math.sin(b) * .065), (1, .5, 1), m)
        sphere(.04, (cx, cy - .03, .05), m=yel)
    shoot(sc, 'hat_flower.png', 128, 80, 1.15, 22)


# ---------- pet food and toys ----------
@job
def food_apple():
    sc = reset(); red = mat('r', (.85, .06, .08), .3, 0, .8); brn = mat('b', (.35, .2, .08), .7); grn = mat('g', (.25, .7, .2), .5)
    sphere(.4, (0, 0, 0), (1, 1, .9), red); cyl(.025, .2, (0, 0, .4), brn, (0, .25, 0)); sphere(.14, (.12, 0, .42), (1, .3, .45), grn, (0, -.6, 0))
    shoot(sc, 'food_apple.png', 96, 96, 1.05, 15, (0, 0, .05))


@job
def food_cookie():
    sc = reset(); tan = mat('t', (.85, .58, .28), .85); choc = mat('c', (.2, .1, .05), .5)
    o = cyl(.45, .12, (0, 0, 0), tan, v=40); b = o.modifiers.new('b', 'BEVEL'); b.width = .04; b.segments = 3
    for i in range(9):
        a = i * 2.4; r = .1 + (i * .13) % .3; sphere(.05, (math.cos(a) * r, math.sin(a) * r, .065), (1, 1, .7), choc)
    shoot(sc, 'food_cookie.png', 96, 96, 1.05, 45)


@job
def food_cupcake():
    sc = reset(); wrap = mat('w', (.4, .75, 1), .5); fr = mat('f', (1, .75, .85), .4, 0, .3); cher = mat('c', (.85, .05, .1), .2, 0, 1); brn = mat('b', (.3, .2, .1), .7)
    cone(.26, .34, .38, (0, 0, .19), wrap, v=24, smooth=False)
    for i, (R, z) in enumerate(((.3, .42), (.22, .52), (.13, .6))): torus(R, .09, (0, 0, z), fr)
    sphere(.08, (0, 0, .7), m=cher); cyl(.012, .14, (.03, 0, .8), brn, (0, .4, 0))
    shoot(sc, 'food_cupcake.png', 96, 112, 1.05, 18, (0, 0, .42))


@job
def food_carrot():
    sc = reset(); org = mat('o', (1, .45, .05), .5); grn = mat('g', (.2, .7, .2), .6)
    parts = [cone(.15, .01, .8, (0, 0, 0), org, (math.pi, 0, 0))]
    for k in (-1, 0, 1): parts.append(cone(.035, .005, .34, (k * .05, 0, .55), grn, (0, math.radians(k * 22), 0)))
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join(); bpy.context.object.rotation_euler = (0, math.radians(35), 0)
    shoot(sc, 'food_carrot.png', 96, 96, 1.15, 10, (0, 0, .05))


@job
def food_broccoli():
    sc = reset(); stem = mat('s', (.55, .8, .4), .6); grn = mat('g', (.12, .45, .12), .75)
    cyl(.09, .4, (0, 0, -.15), stem)
    for i in range(9):
        a = i * 2.2; r = .06 + (i % 3) * .08; sphere(.14, (math.cos(a) * r, math.sin(a) * r - .05, .12 + (i % 2) * .06), m=grn)
    shoot(sc, 'food_broccoli.png', 96, 96, 1.0, 15, (0, 0, .05))


@job
def toy_ball():
    sc = reset(); cols = [mat('c%d' % i, c, .3, 0, .8) for i, c in enumerate(((1, .2, .25), (1, .9, .2), (.2, .5, 1)))]
    sphere(.45, (0, 0, 0), m=cols[0])
    for i, rz in enumerate((0, 1.05, 2.1)): torus(.452, .06, (0, 0, 0), cols[1 + i % 2], (math.radians(90), 0, rz))
    shoot(sc, 'toy_ball.png', 96, 96, 1.0, 15)


@job
def toy_sponge():
    sc = reset(); yel = mat('y', (1, .85, .2), .85); grn = mat('g', (.2, .7, .35), .7); hole = mat('h', (.45, .32, .05), .95)
    box((.6, .34, .18), (0, 0, .09), yel, .04); box((.6, .34, .07), (0, 0, -.035), grn, .02)
    for i in range(7): sphere(.03, ((i * .17) % .5 - .24, -.165, .02 + (i * .07) % .14), (1, .3, 1), hole)
    shoot(sc, 'toy_sponge.png', 96, 72, .8, 25)


# ---------- pizza toppings (seen from above) ----------
@job
def topping_pepperoni():
    sc = reset(); red = mat('r', (.7, .1, .06), .45, 0, .3); dot = mat('d', (.95, .75, .6), .5)
    cyl(.2, .03, (0, 0, 0), red)
    for i in range(6): a = i * 2.1; r = .05 + (i % 3) * .045; sphere(.018, (math.cos(a) * r, math.sin(a) * r, .015), (1, 1, .4), dot)
    shoot(sc, 'topping_pepperoni.png', 64, 64, .46, 90)


@job
def topping_mushroom():
    sc = reset(); cap = mat('c', (.78, .64, .48), .6); flesh = mat('f', (.96, .9, .8), .7)
    sphere(.2, (0, .05, 0), (1, .62, .08), cap); sphere(.17, (0, .05, .01), (1, .5, .08), flesh); box((.1, .18, .03), (0, -.1, .01), flesh, .03)
    shoot(sc, 'topping_mushroom.png', 64, 64, .5, 90)


@job
def topping_olive():
    sc = reset(); blk = mat('k', (.07, .05, .08), .25, 0, .8)
    torus(.09, .045, (0, 0, 0), blk)
    shoot(sc, 'topping_olive.png', 64, 64, .3, 90)


@job
def topping_pepper():
    sc = reset(); grn = mat('g', (.15, .6, .12), .3, 0, .6)
    o = torus(.15, .028, (0, 0, 0), grn, scale=(1, .85, .6))
    shoot(sc, 'topping_pepper.png', 64, 64, .38, 90)


@job
def topping_pineapple():
    sc = reset(); yel = mat('y', (1, .82, .25), .45)
    box((.16, .12, .08), (0, 0, 0), yel, .025, (0, 0, .3))
    shoot(sc, 'topping_pineapple.png', 64, 64, .3, 90)


@job
def topping_basil():
    sc = reset(); grn = mat('g', (.1, .5, .12), .35, 0, .4); vein = mat('v', (.3, .7, .3), .5)
    sphere(.2, (0, 0, 0), (1, .5, .06), grn, (0, 0, .5)); box((.32, .01, .01), (0, 0, .012), vein, .003, (0, 0, .5))
    shoot(sc, 'topping_basil.png', 64, 64, .46, 90)


# ---------- lemonade stand ----------
@job
def lemon():
    sc = reset(); yel = mat('y', (1, .86, .1), .55, 0, .3)
    sphere(.3, (0, 0, 0), (1.3, 1, 1), yel); cone(.07, 0, .12, (.42, 0, 0), yel, (0, math.radians(90), 0)); cone(.07, 0, .12, (-.42, 0, 0), yel, (0, math.radians(-90), 0))
    shoot(sc, 'lemon.png', 96, 72, 1.0, 15)


@job
def cup_lemonade():
    sc = reset(); paper = mat('p', (.97, .97, .97), .6); red = mat('r', (.95, .2, .3), .5); lem = mat('l', (1, .9, .3), .2); straw = mat('s', (.2, .6, 1), .4)
    o = cone(.2, .27, .56, (0, 0, .28), paper); o.modifiers.new('s', 'SOLIDIFY').thickness = .015
    for z in (.14, .34): torus(.205 + z * .125, .02, (0, 0, z), red)
    cyl(.255, .02, (0, 0, .5), lem); cyl(.018, .55, (.08, 0, .65), straw, (0, math.radians(14), 0))
    shoot(sc, 'cup_lemonade.png', 80, 112, .95, 22, (0, 0, .4))


@job
def pitcher():
    sc = reset(); glass = mat('g', (.9, .96, 1), .05, 0, 1, 0, .22); lem = mat('l', (1, .86, .22), .25, 0, .5); slice_ = mat('s', (1, .95, .5), .4); ice = mat('i', (.85, .95, 1), .1, 0, 0, 0, .7)
    o = cyl(.34, .9, (0, 0, .45), glass); o.modifiers.new('s', 'SOLIDIFY').thickness = .02
    cyl(.31, .62, (0, 0, .33), lem)
    for i in range(3): cyl(.12, .02, (-.1 + i * .1, -.05, .25 + i * .12), slice_, (math.radians(70), 0, i))
    for i in range(3): box((.1, .1, .1), (.12 - i * .1, .1, .6), ice, .02, (i, .4, 0))
    torus(.2, .04, (.36, 0, .5), glass, (math.radians(90), 0, 0), (1, 1, 1.3))
    shoot(sc, 'pitcher.png', 96, 128, 1.15, 15, (.04, 0, .45))


@job
def sugar():
    sc = reset(); bag = mat('b', (.96, .96, .98), .8); blue = mat('l', (.2, .45, .95), .5); white = mat('w', (1, 1, 1), .3)
    box((.42, .26, .6), (0, 0, .3), bag, .05); box((.43, .27, .2), (0, 0, .3), blue, .02)
    for i in range(5): box((.05, .05, .05), (-.12 + i * .06, -.14, .66 + (i % 2) * .03), white, .01, (i, i, 0))
    shoot(sc, 'sugar.png', 80, 96, .9, 15, (0, 0, .35))


@job
def ice():
    sc = reset(); m = mat('i', (.8, .93, 1), .05, 0, .8, 0, .75)
    box((.3, .3, .3), (0, 0, 0), m, .05, (.3, .2, .5))
    shoot(sc, 'ice.png', 64, 64, .6, 25)


for name, f in jobs.items():
    if not ONLY or any(name.startswith(o) for o in ONLY): f()
