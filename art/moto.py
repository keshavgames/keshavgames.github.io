"""Dirt bike and rider for Moto Stunt, side view facing right. Wheels are separate so they can spin.

Run headless:  blender -b -P art/moto.py -- <output folder>
Writes moto_body.png (256x192: frame, rider, no wheels) and moto_wheel.png (96x96).
Layout (metres, ortho 2.4 m wide): rear axle at x=-.62, front axle at x=.62, both at z=.34.
"""
import bpy, math, sys, os
from mathutils import Vector

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARGS[0] if ARGS else os.path.join(os.path.dirname(__file__), '..', 'img')


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
    sc.render.film_transparent = True; sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = -.25
    w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (.25, .28, .33, 1)
    for name, rot, e in (('key', (math.radians(60), math.radians(-35), math.radians(-30)), 3), ('rim', (math.radians(-70), math.radians(30), 0), 1.4)):
        L = bpy.data.lights.new(name, 'SUN'); L.energy = e; o = bpy.data.objects.new(name, L); o.rotation_euler = rot; sc.collection.objects.link(o)
    return sc


def mat(name, color, rough=.4, metal=0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    return m


def limb(a, b, r, m, verts=16):
    a, b = Vector(a), Vector(b); d = b - a
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d.length, location=(a + b) / 2, vertices=verts)
    o = bpy.context.object; o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler(); o.data.materials.append(m); bpy.ops.object.shade_smooth()
    for p in (a, b): bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=p); s = bpy.context.object; s.data.materials.append(m); bpy.ops.object.shade_smooth()
    return o


def box(size, loc, m, bevel=.03, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel: b = o.modifiers.new('B', 'BEVEL'); b.width = bevel; b.segments = 3
    o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o


def camera(sc, scale, w, h, cz):
    cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = scale
    c = bpy.data.objects.new('c', cam); c.location = (0, -6, cz); c.rotation_euler = (math.radians(90), 0, 0); sc.collection.objects.link(c); sc.camera = c
    sc.render.resolution_x = w; sc.render.resolution_y = h


def render(sc, name):
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = os.path.join(OUT, name); bpy.ops.render.render(write_still=True); print('wrote', name)


# body: frame, tank, seat, forks, swingarm and the rider in a crouch
sc = reset()
orange = mat('orange', (1, .42, .05), .35); dark = mat('dark', (.05, .05, .06), .6); metal = mat('metal', (.65, .67, .7), .25, .9)
white = mat('white', (.95, .95, .95), .4); suit = mat('suit', (.1, .35, .85), .6); helmet = mat('helmet', (1, .85, .1), .25); visor = mat('visor', (.05, .08, .12), .1)
limb((-.62, 0, .34), (-.05, 0, .5), .04, metal)                   # swingarm
limb((.62, 0, .34), (.38, 0, .86), .035, metal)                    # forks
limb((.36, 0, .86), (.42, 0, .98), .03, dark); limb((.3, .2, 1.0), (.42, -.2, 1.0), .018, dark)  # bars
box((.5, .2, .22), (.08, 0, .72), orange, .07, (0, math.radians(8), 0))       # tank and side panels
box((.62, .18, .08), (-.28, 0, .8), dark, .03, (0, math.radians(-6), 0))      # seat
box((.4, .16, .1), (-.55, 0, .78), orange, .04, (0, math.radians(-14), 0))     # rear fender
box((.34, .14, .06), (.66, 0, .62), orange, .03, (0, math.radians(-20), 0))   # front fender
box((.32, .18, .26), (-.02, 0, .44), dark, .04)                              # engine
limb((-.12, .1, .38), (-.62, .12, .58), .04, metal)                         # exhaust
box((.12, .02, .12), (.2, -.11, .72), white, .01)                            # number plate
# rider: crouched, knees bent, arms to the bars
limb((-.25, 0, .92), (.05, 0, 1.28), .12, suit)                               # torso
limb((-.25, .08, .9), (.05, .1, .7), .07, suit); limb((.05, .1, .7), (-.05, .1, .42), .06, suit)   # leg
box((.2, .1, .08), (.0, .1, .38), dark, .02)                                  # boot
limb((.0, .1, 1.22), (.2, .14, 1.05), .05, suit); limb((.2, .14, 1.05), (.36, .18, .99), .045, suit)  # arm
bpy.ops.mesh.primitive_uv_sphere_add(radius=.16, location=(.12, 0, 1.44)); h = bpy.context.object; h.scale = (1.15, .95, 1); h.data.materials.append(helmet); bpy.ops.object.shade_smooth()
box((.12, .2, .09), (.27, 0, 1.43), visor, .03)
box((.2, .18, .04), (.24, 0, 1.55), helmet, .02, (0, math.radians(-10), 0))   # helmet peak
camera(sc, 2.4, 256, 192, .85); render(sc, 'moto_body.png')

# wheel: knobbly tyre, spokes, hub
sc = reset()
dark = mat('dark', (.04, .04, .05), .75); metal = mat('metal', (.7, .72, .75), .25, .9); orange = mat('orange', (1, .42, .05), .35)
bpy.ops.mesh.primitive_torus_add(location=(0, 0, 0), major_radius=.27, minor_radius=.075, rotation=(math.radians(90), 0, 0), major_segments=48); bpy.context.object.data.materials.append(dark); bpy.ops.object.shade_smooth()
for i in range(20):
    a = i / 20 * math.tau; box((.05, .16, .04), (math.cos(a) * .35, 0, math.sin(a) * .35), dark, .01, (0, -a, 0))
bpy.ops.mesh.primitive_torus_add(location=(0, 0, 0), major_radius=.2, minor_radius=.015, rotation=(math.radians(90), 0, 0)); bpy.context.object.data.materials.append(metal)
for i in range(8):
    a = i / 8 * math.tau; limb((0, 0, 0), (math.cos(a) * .2, 0, math.sin(a) * .2), .008, metal, 8)
bpy.ops.mesh.primitive_cylinder_add(radius=.06, depth=.12, location=(0, 0, 0), rotation=(math.radians(90), 0, 0)); bpy.context.object.data.materials.append(orange)
camera(sc, .8, 96, 96, 0); render(sc, 'moto_wheel.png')
