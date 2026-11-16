"""Rally cars seen from behind for Snow Rally, in straight / left / right steering views.

Run headless:  blender -b -P art/rally.py -- <output folder>
Writes rally_<color>_<c|l|r>.png (192x128).
"""
import bpy, math, sys, os

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARGS[0] if ARGS else os.path.join(os.path.dirname(__file__), '..', 'img')
COLORS = {'blue': (.1, .3, .85), 'red': (.85, .1, .1), 'yellow': (.98, .75, .05), 'green': (.1, .6, .25), 'white': (.92, .92, .95), 'orange': (1, .45, .05)}


def mat(name, color, rough=.35, metal=0, emit=0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit: b.inputs['Emission Color'].default_value = (*color, 1); b.inputs['Emission Strength'].default_value = emit
    return m


def box(size, loc, m, bevel=.05, rot=(0, 0, 0), parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel: b = o.modifiers.new('B', 'BEVEL'); b.width = bevel; b.segments = 3
    o.data.materials.append(m); bpy.ops.object.shade_smooth(); o.parent = parent; return o


for color, rgb in COLORS.items():
    for view, yaw in (('c', 0), ('l', 16), ('r', -16)):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        sc = bpy.context.scene
        sc.render.engine = 'CYCLES'; sc.cycles.samples = 40; sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
        sc.render.film_transparent = True; sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = -.3
        w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (.55, .62, .75, 1)
        for name, rot, e in (('key', (math.radians(50), math.radians(25), math.radians(160)), 2.6), ('fill', (math.radians(70), math.radians(-30), math.radians(-20)), 1.0)):
            L = bpy.data.lights.new(name, 'SUN'); L.energy = e; o = bpy.data.objects.new(name, L); o.rotation_euler = rot; sc.collection.objects.link(o)
        rig = bpy.data.objects.new('rig', None); sc.collection.objects.link(rig)
        body = mat('body', rgb); white = mat('white', (.95, .95, .95)); dark = mat('dark', (.04, .04, .05), .6); glass = mat('glass', (.08, .12, .18), .05, .3)
        tail = mat('tail', (1, .05, .03), .3, 0, 8); metal = mat('metal', (.6, .62, .66), .3, .9); mud = mat('mud', (.25, .2, .16), .9)
        box((1.7, 3.6, .55), (0, 0, .6), body, .12, parent=rig)                    # lower body
        box((1.45, 1.9, .5), (0, .25, 1.1), body, .14, parent=rig)                  # cabin
        box((1.3, .05, .38), (0, 1.22, 1.12), glass, .04, rot=(math.radians(-18), 0, 0), parent=rig)  # rear window
        box((1.72, .06, .14), (0, 1.81, .72), white, .03, parent=rig)               # livery stripe
        box((.3, .06, .12), (-.62, 1.82, .82), tail, .02, parent=rig); box((.3, .06, .12), (.62, 1.82, .82), tail, .02, parent=rig)
        box((1.8, .12, .06), (0, 1.75, 1.42), dark, .02, parent=rig)                # roof spoiler
        for sx in (-1, 1): box((.06, .1, .18), (sx * .6, 1.7, 1.32), dark, .01, parent=rig)
        for sx in (-1, 1): box((.36, .04, .26), (sx * .7, 1.86, .22), mud, .01, parent=rig)   # mud flaps
        box((.4, .1, .12), (.45, 1.82, .3), metal, .02, parent=rig)                  # exhaust
        for x, y in ((.85, 1.15), (-.85, 1.15), (.85, -1.15), (-.85, -1.15)):
            bpy.ops.mesh.primitive_cylinder_add(radius=.36, depth=.32, location=(x, y, .36), rotation=(0, math.radians(90), 0), vertices=32)
            t = bpy.context.object; t.data.materials.append(dark); bpy.ops.object.shade_smooth(); t.parent = rig
        rig.rotation_euler = (0, 0, math.radians(yaw))
        cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = 4.3
        c = bpy.data.objects.new('c', cam); sc.collection.objects.link(c); sc.camera = c
        c.location = (0, 9, 3.4); c.rotation_euler = (math.radians(72), 0, math.radians(180))
        sc.render.resolution_x = 192; sc.render.resolution_y = 128
        sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
        sc.render.filepath = os.path.join(OUT, f'rally_{color}_{view}.png'); bpy.ops.render.render(write_still=True); print('wrote', color, view)
