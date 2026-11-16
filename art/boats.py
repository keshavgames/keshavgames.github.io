"""Top-down speedboats for Boat Blitz, facing right (+X).

Run headless:  blender -b -P art/boats.py -- <output folder>
Writes boat_<color>.png (128x128).
"""
import bpy, bmesh, math, sys, os

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARGS[0] if ARGS else os.path.join(os.path.dirname(__file__), '..', 'img')
COLORS = {'blue': (.1, .35, .9), 'red': (.85, .1, .1), 'green': (.1, .62, .25), 'yellow': (1, .78, .05), 'purple': (.5, .2, .85), 'orange': (1, .45, .05)}


def mat(name, color, rough=.3, metal=0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    return m


def hull(m, white):
    # a pointed planing hull: wide at the stern, coming to a sharp bow
    bm = bmesh.new(); pts = [(-.9, -.36), (.25, -.36), (.75, -.2), (1.0, 0), (.75, .2), (.25, .36), (-.9, .36)]
    bot = [bm.verts.new((x, y, .05)) for x, y in [(x * .96, y * .8) for x, y in pts]]
    top = [bm.verts.new((x, y, .32)) for x, y in pts]
    bm.faces.new(bot[::-1]); bm.faces.new(top)
    for i in range(len(pts)): bm.faces.new((bot[i], bot[(i + 1) % len(pts)], top[(i + 1) % len(pts)], top[i]))
    me = bpy.data.meshes.new('hull'); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('hull', me); bpy.context.scene.collection.objects.link(o)
    b = o.modifiers.new('B', 'BEVEL'); b.width = .05; b.segments = 3
    o.data.materials.append(m); return o


def box(size, loc, m, bevel=.03, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel: b = o.modifiers.new('B', 'BEVEL'); b.width = bevel; b.segments = 3
    o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o


for color, rgb in COLORS.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 40; sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
    sc.render.film_transparent = True; sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = -.3
    w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (.2, .25, .3, 1)
    for name, rot, e in (('key', (math.radians(30), math.radians(-25), 0), 2.6), ('fill', (math.radians(-35), math.radians(25), 0), 1.0)):
        L = bpy.data.lights.new(name, 'SUN'); L.energy = e; o = bpy.data.objects.new(name, L); o.rotation_euler = rot; sc.collection.objects.link(o)
    body = mat('body', rgb); white = mat('white', (.95, .95, .95), .4); dark = mat('dark', (.05, .05, .06), .5); glass = mat('glass', (.3, .55, .7), .05); seat = mat('seat', (.85, .8, .7), .6)
    hull(white, white)
    box((.9, .62, .06), (.35, 0, .34), body, .04)                          # painted deck at the bow
    box((.5, .5, .2), (-.3, 0, .38), dark, .05)                             # cockpit tub
    box((.18, .2, .12), (-.3, .13, .44), seat, .03); box((.18, .2, .12), (-.3, -.13, .44), seat, .03)
    box((.06, .56, .16), (.0, 0, .48), glass, .02, (0, math.radians(-30), 0))  # windscreen
    box((.22, .3, .22), (-.98, 0, .3), dark, .04)                           # outboard motor
    box((.08, .7, .03), (-.6, 0, .34), body, .01)                           # stripe
    cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = 2.3
    c = bpy.data.objects.new('c', cam); c.location = (0, 0, 8); sc.collection.objects.link(c); sc.camera = c
    sc.render.resolution_x = sc.render.resolution_y = 128
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = os.path.join(OUT, f'boat_{color}.png'); bpy.ops.render.render(write_still=True); print('wrote', color)
