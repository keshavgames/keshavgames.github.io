"""Top-down go-karts with drivers for Kart Chaos, facing right (+X).

Run headless:  blender -b -P art/karts.py -- <output folder>
Writes kart_<color>.png (128x128).
"""
import bpy, math, sys, os

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARGS[0] if ARGS else os.path.join(os.path.dirname(__file__), '..', 'img')
COLORS = {'red': (.85, .1, .1), 'blue': (.1, .35, .9), 'green': (.12, .65, .2), 'yellow': (.98, .78, .05), 'purple': (.5, .2, .85), 'orange': (1, .45, .05), 'pink': (1, .35, .65), 'teal': (.05, .7, .7)}


def mat(name, color, rough=.4, metal=0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    return m


def box(size, loc, m, bevel=.04, rot=(0, 0, 0)):
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
    body = mat('body', rgb, .3); dark = mat('dark', (.04, .04, .05), .7); white = mat('white', (.95, .95, .95), .4); skin = mat('skin', (.85, .6, .45), .5)
    metal = mat('metal', (.6, .62, .65), .25, .8)
    box((1.2, .62, .16), (0, 0, .22), body, .08)                    # chassis
    box((.36, .7, .08), (.62, 0, .24), body, .04)                    # front bumper
    box((.2, .78, .1), (-.66, 0, .5), body, .04)                     # rear wing
    for sy in (-1, 1): box((.08, .06, .3), (-.66, sy * .3, .35), dark, .01)
    for x, y in ((.45, .42), (.45, -.42), (-.42, .45), (-.42, -.45)):  # chunky tyres
        bpy.ops.mesh.primitive_cylinder_add(radius=.17, depth=.18 if x < 0 else .14, location=(x, y, .17), rotation=(math.radians(90), 0, 0), vertices=32)
        t = bpy.context.object; t.data.materials.append(dark); bpy.ops.object.shade_smooth()
        bpy.ops.mesh.primitive_cylinder_add(radius=.08, depth=.19 if x < 0 else .15, location=(x, y, .17), rotation=(math.radians(90), 0, 0), vertices=16); bpy.context.object.data.materials.append(metal)
    box((.3, .4, .1), (-.15, 0, .34), dark, .03)                     # seat
    bpy.ops.mesh.primitive_uv_sphere_add(radius=.2, location=(-.05, 0, .62)); h = bpy.context.object; h.data.materials.append(body); bpy.ops.object.shade_smooth()  # helmet
    box((.06, .26, .1), (.13, 0, .62), dark, .03)                    # visor
    box((.32, .07, .04), (-.05, 0, .82), white, .02)                 # helmet stripe
    for sy in (-1, 1): box((.3, .07, .07), (.12, sy * .16, .42), skin, .03)   # arms to the wheel
    bpy.ops.mesh.primitive_torus_add(location=(.28, 0, .45), major_radius=.12, minor_radius=.025, rotation=(0, math.radians(70), 0)); bpy.context.object.data.materials.append(dark)
    bpy.ops.mesh.primitive_cylinder_add(radius=.05, depth=.12, location=(-.72, .18, .2), rotation=(0, math.radians(90), 0)); bpy.context.object.data.materials.append(metal)
    cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = 1.9
    c = bpy.data.objects.new('c', cam); c.location = (0, 0, 8); sc.collection.objects.link(c); sc.camera = c
    sc.render.resolution_x = sc.render.resolution_y = 128
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = os.path.join(OUT, f'kart_{color}.png'); bpy.ops.render.render(write_still=True); print('wrote', color)
