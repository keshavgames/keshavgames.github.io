"""Top-down toy tanks for Tank Clash: hull and turret rendered separately so the turret can turn.

Run headless:  blender -b -P art/tanks.py -- <output folder>
Writes tank_hull_<color>.png and tank_turret_<color>.png (128x128, facing right / +X).
"""
import bpy, math, sys, os
from mathutils import Vector

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARGS[0] if ARGS else os.path.join(os.path.dirname(__file__), '..', 'img')
COLORS = {'green': (.18, .5, .2), 'blue': (.15, .35, .8), 'red': (.75, .15, .12), 'yellow': (.9, .7, .1), 'purple': (.45, .2, .7), 'grey': (.4, .42, .45)}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 40; sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
    sc.render.film_transparent = True; sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = -.4
    w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (.12, .13, .15, 1)
    for name, rot, e in (('key', (math.radians(35), math.radians(-25), 0), 2.6), ('fill', (math.radians(-30), math.radians(30), 0), 1.2)):
        L = bpy.data.lights.new(name, 'SUN'); L.energy = e; o = bpy.data.objects.new(name, L); o.rotation_euler = rot; sc.collection.objects.link(o)
    cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = 2.2
    c = bpy.data.objects.new('c', cam); c.location = (0, 0, 8); sc.collection.objects.link(c); sc.camera = c
    sc.render.resolution_x = sc.render.resolution_y = 128
    return sc


def mat(name, color, rough=.5, metal=0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    return m


def box(size, loc, m, bevel=.03):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.object; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel: b = o.modifiers.new('B', 'BEVEL'); b.width = bevel; b.segments = 3
    o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o


def render(sc, name):
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = os.path.join(OUT, name); bpy.ops.render.render(write_still=True); print('wrote', name)


for color, rgb in COLORS.items():
    sc = reset(); body = mat('body', rgb, .45); dark = mat('dark', (.05, .05, .06), .7); trim = mat('trim', tuple(min(1, c * 1.4 + .1) for c in rgb), .4); metal = mat('metal', (.5, .52, .55), .3, .8)
    box((1.3, .78, .28), (0, 0, .3), body, .08)                   # hull
    box((1.0, .5, .08), (-.05, 0, .47), trim, .03)                 # deck plate
    for sy in (-1, 1):                                              # tracks with treads
        box((1.5, .24, .26), (0, sy * .5, .18), dark, .06)
        for i in range(9): box((.04, .25, .04), (-.68 + i * .17, sy * .5, .32), metal, .005)
    box((.12, .5, .1), (.62, 0, .32), trim, .02)                    # front light bar
    for sy in (-1, 1): box((.08, .1, .06), (.66, sy * .22, .38), mat('lamp', (1, .95, .7), .2), .01)
    render(sc, f'tank_hull_{color}.png')

    sc = reset(); body = mat('body', rgb, .45); dark = mat('dark', (.05, .05, .06), .7); trim = mat('trim', tuple(min(1, c * 1.4 + .1) for c in rgb), .4); metal = mat('metal', (.5, .52, .55), .3, .8)
    bpy.ops.mesh.primitive_cylinder_add(radius=.32, depth=.22, location=(-.05, 0, .62), vertices=48); t = bpy.context.object; t.data.materials.append(body); bpy.ops.object.shade_smooth()
    bv = t.modifiers.new('B', 'BEVEL'); bv.width = .05; bv.segments = 3
    bpy.ops.mesh.primitive_cylinder_add(radius=.06, depth=.75, location=(.55, 0, .64), rotation=(0, math.radians(90), 0), vertices=24); bpy.context.object.data.materials.append(metal); bpy.ops.object.shade_smooth()
    bpy.ops.mesh.primitive_cylinder_add(radius=.085, depth=.14, location=(.9, 0, .64), rotation=(0, math.radians(90), 0), vertices=24); bpy.context.object.data.materials.append(dark)
    box((.18, .18, .08), (-.12, .1, .76), trim, .02)                # hatch
    render(sc, f'tank_turret_{color}.png')
