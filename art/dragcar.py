"""Side-view drag cars for Drag Strip (facing right), body and wheels separate.

Run headless:  blender -b -P art/dragcar.py -- <output folder>
Writes drag_<color>.png (320x144, no wheels) and drag_wheel.png (96x96).
Layout (ortho 4.6 m wide): rear axle at x=-1.35, front axle x=1.3, both at z=.38.
"""
import bpy, math, sys, os

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARGS[0] if ARGS else os.path.join(os.path.dirname(__file__), '..', 'img')
COLORS = {'blue': (.08, .3, .9), 'red': (.85, .08, .08), 'green': (.1, .6, .25), 'yellow': (1, .78, .05), 'purple': (.5, .2, .85), 'black': (.06, .06, .07)}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
    sc.render.film_transparent = True; sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = -.3
    w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (.5, .55, .65, 1)
    for name, rot, e in (('key', (math.radians(55), math.radians(-30), math.radians(-25)), 3), ('rim', (math.radians(-60), math.radians(30), 0), 1.5)):
        L = bpy.data.lights.new(name, 'SUN'); L.energy = e; o = bpy.data.objects.new(name, L); o.rotation_euler = rot; sc.collection.objects.link(o)
    return sc


def mat(name, color, rough=.3, metal=0, emit=0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if 'Coat Weight' in b.inputs: b.inputs['Coat Weight'].default_value = .6
    if emit: b.inputs['Emission Color'].default_value = (*color, 1); b.inputs['Emission Strength'].default_value = emit
    return m


def box(size, loc, m, bevel=.06, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel: b = o.modifiers.new('B', 'BEVEL'); b.width = bevel; b.segments = 4
    o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o


def camera(sc, scale, w, h, cz):
    cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = scale
    c = bpy.data.objects.new('c', cam); c.location = (0, -8, cz); c.rotation_euler = (math.radians(90), 0, 0); sc.collection.objects.link(c); sc.camera = c
    sc.render.resolution_x = w; sc.render.resolution_y = h


def render(sc, name):
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = os.path.join(OUT, name); bpy.ops.render.render(write_still=True); print('wrote', name)


for color, rgb in COLORS.items():
    sc = reset()
    body = mat('body', rgb); dark = mat('dark', (.03, .03, .04), .5); glass = mat('glass', (.1, .15, .22), .05, .2); chrome = mat('chrome', (.8, .82, .85), .1, 1)
    white = mat('white', (.95, .95, .95)); head = mat('head', (1, .95, .7), .2, 0, 6); tail = mat('tail', (1, .05, .03), .3, 0, 6)
    box((3.9, 1.7, .55), (0, 0, .62), body, .07)                                     # lower body
    box((1.9, 1.5, .5), (-.35, 0, 1.08), body, .09)                                   # cabin
    box((.75, 1.42, .4), (.48, 0, 1.06), glass, .1, (0, math.radians(32), 0))          # windscreen
    box((.6, 1.42, .36), (-1.18, 0, 1.03), glass, .1, (0, math.radians(-38), 0))       # rear window
    box((1.25, .03, .3), (-.3, -.76, 1.1), glass, .04)                                 # side window
    box((.05, .04, .34), (-.3, -.78, 1.1), body, .0)                                   # window pillar
    box((3.8, .04, .1), (0, -.86, .62), white, .02)                                    # racing stripe
    box((.2, 1.6, .08), (-1.92, 0, 1.0), dark, .03); box((.06, .1, .3), (-1.85, .55, .85), dark, .01); box((.06, .1, .3), (-1.85, -.55, .85), dark, .01)  # wing
    box((.6, .5, .25), (.6, 0, .95), dark, .06)                                        # hood scoop
    box((.06, .3, .14), (1.95, -.6, .68), head, .03); box((.06, .3, .12), (-1.97, -.6, .72), tail, .03)
    for x in (-1.35, 1.3): box((1.0, 1.75, .3), (x, 0, .78), body, .1)                 # wheel arches
    bpy.ops.mesh.primitive_cylinder_add(radius=.08, depth=.5, location=(-1.9, -.4, .38), rotation=(0, math.radians(90), 0)); bpy.context.object.data.materials.append(chrome)
    camera(sc, 4.6, 320, 144, .95); render(sc, f'drag_{color}.png')

sc = reset()
dark = mat('tyre', (.03, .03, .035), .7); chrome = mat('chrome', (.8, .82, .85), .1, 1)
bpy.ops.mesh.primitive_torus_add(location=(0, 0, 0), major_radius=.3, minor_radius=.1, rotation=(math.radians(90), 0, 0), major_segments=48); bpy.context.object.data.materials.append(dark); bpy.ops.object.shade_smooth()
bpy.ops.mesh.primitive_cylinder_add(radius=.27, depth=.1, location=(0, -.05, 0), rotation=(math.radians(90), 0, 0), vertices=48); bpy.context.object.data.materials.append(chrome)
for i in range(5):
    a = i / 5 * math.tau; box((.05, .04, .22), (math.cos(a) * .12, -.11, math.sin(a) * .12), dark, .01, (0, -a + math.pi / 2, 0))
camera(sc, .86, 96, 96, 0); render(sc, 'drag_wheel.png')
