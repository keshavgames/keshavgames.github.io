"""Top-down toy biplanes for Sky Ace, facing right (+X).

Run headless:  blender -b -P art/planes.py -- <output folder>
Writes plane_<color>.png (128x128).
"""
import bpy, math, sys, os

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARGS[0] if ARGS else os.path.join(os.path.dirname(__file__), '..', 'img')
COLORS = {'red': (.8, .12, .1), 'blue': (.12, .35, .85), 'green': (.15, .55, .2), 'yellow': (.95, .72, .1), 'purple': (.45, .2, .75), 'black': (.08, .08, .1)}


def mat(name, color, rough=.45, metal=0, alpha=1):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if alpha < 1: b.inputs['Alpha'].default_value = alpha; m.blend_method = 'BLEND' if hasattr(m, 'blend_method') else None
    return m


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
    w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (.15, .16, .2, 1)
    for name, rot, e in (('key', (math.radians(30), math.radians(-25), 0), 2.6), ('fill', (math.radians(-35), math.radians(25), 0), 1.0)):
        L = bpy.data.lights.new(name, 'SUN'); L.energy = e; o = bpy.data.objects.new(name, L); o.rotation_euler = rot; sc.collection.objects.link(o)
    body = mat('body', rgb); trim = mat('trim', (.95, .93, .88)); dark = mat('dark', (.06, .06, .07), .6); wood = mat('wood', (.45, .28, .12), .5)
    glass = mat('glass', (.5, .75, .9), .05)
    bpy.ops.mesh.primitive_cone_add(radius1=.17, radius2=.07, depth=1.5, location=(-.05, 0, .25), rotation=(0, math.radians(-90), 0), vertices=32)
    f = bpy.context.object; f.scale = (1, 1, 1); f.data.materials.append(body); bpy.ops.object.shade_smooth()
    bpy.ops.mesh.primitive_uv_sphere_add(radius=.17, location=(.7, 0, .25)); n = bpy.context.object; n.scale = (.6, 1, 1); n.data.materials.append(dark); bpy.ops.object.shade_smooth()
    box((.42, 1.9, .05), (.18, 0, .42), body, .04)        # top wing
    box((.38, 1.7, .05), (.22, 0, .12), trim, .04)        # lower wing
    for sy in (-1, 1):
        box((.36, .14, .055), (.18, sy * .82, .425), trim, .02)  # wing tip stripes
        bpy.ops.mesh.primitive_cylinder_add(radius=.13, depth=.02, location=(.18, sy * .55, .45)); r = bpy.context.object; r.data.materials.append(trim)
        bpy.ops.mesh.primitive_cylinder_add(radius=.07, depth=.021, location=(.18, sy * .55, .455)); r = bpy.context.object; r.data.materials.append(dark)
    box((.22, .7, .04), (-.72, 0, .27), body, .03)        # tailplane
    box((.25, .04, .22), (-.74, 0, .38), trim, .02)       # fin
    bpy.ops.mesh.primitive_uv_sphere_add(radius=.1, location=(.0, 0, .38)); c = bpy.context.object; c.scale = (1.3, .8, .6); c.data.materials.append(glass); bpy.ops.object.shade_smooth()
    bpy.ops.mesh.primitive_cylinder_add(radius=.36, depth=.01, location=(.84, 0, .25), rotation=(0, math.radians(90), 0)); pr = bpy.context.object; pr.data.materials.append(mat('blur', (.3, .3, .3), .5, 0, .35))
    box((.03, .7, .06), (.85, 0, .25), wood, .01)
    cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = 2.2
    c = bpy.data.objects.new('c', cam); c.location = (0, 0, 8); sc.collection.objects.link(c); sc.camera = c
    sc.render.resolution_x = sc.render.resolution_y = 128
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = os.path.join(OUT, f'plane_{color}.png'); bpy.ops.render.render(write_still=True); print('wrote', color)
