"""Tin robots for Sniper Ridge: boxy invaders (red eye) and friendly helper bots (green), front view.

Run headless:  blender -b -P art/robots.py -- <output folder>
Writes bot_<kind>_<pose>.png (160x200) for kind in invader/helper and pose in idle/walk0/walk1/hit.
"""
import bpy, math, sys, os

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARGS[0] if ARGS else os.path.join(os.path.dirname(__file__), '..', 'img')


def mat(name, color, rough=.4, metal=0, emit=0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit: b.inputs['Emission Color'].default_value = (*color, 1); b.inputs['Emission Strength'].default_value = emit
    return m


def box(size, loc, m, bevel=.03, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel: b = o.modifiers.new('B', 'BEVEL'); b.width = bevel; b.segments = 3
    o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o


def cyl(r, d, loc, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d, location=loc, rotation=rot, vertices=24); o = bpy.context.object; o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o


def robot(kind, pose):
    invader = kind == 'invader'
    shell = mat('shell', (.55, .57, .6) if invader else (.3, .7, .35), .35, .7)
    dark = mat('dark', (.08, .08, .1), .5, .3); eye = mat('eye', (1, .1, .05) if invader else (.3, 1, .5), .2, 0, 18)
    trim = mat('trim', (.85, .2, .15) if invader else (.95, .85, .3), .4, .2)
    sw = {'walk0': .25, 'walk1': -.25}.get(pose, 0)
    for sx in (-1, 1):  # legs and feet
        box((.12, .14, .45), (sx * .14, sx * sw * .3, .3 + abs(sw) * .05 * sx), dark, .02, rot=(sx * sw, 0, 0))
        box((.2, .26, .1), (sx * .14, sx * sw * .45 - .03, .06), shell, .03)
    box((.5, .36, .5), (0, 0, .78), shell, .06)                      # body
    box((.3, .02, .18), (0, -.18, .82), dark, .01)                    # chest panel
    for i in range(3): cyl(.025, .02, (-.08 + i * .08, -.19, .82), trim, (math.radians(90), 0, 0))
    for sx in (-1, 1):  # arms
        a = (-1.2 if invader else 1.2) * (1 if sx < 0 else .4) if pose == 'idle' and False else sw * -sx
        box((.1, .1, .4), (sx * .32, -a * .1, .72), dark, .02, rot=(a, 0, 0))
        cyl(.07, .08, (sx * .32, -a * .25 - .02, .5), trim, (math.radians(90), 0, 0))
    cyl(.06, .08, (0, 0, 1.07), dark)                                 # neck
    box((.42, .34, .3), (0, 0, 1.25), shell, .07)                     # head
    box((.3, .04, .1), (0, -.17, 1.27), dark, .02)                    # visor slot
    if invader: box((.22, .03, .05), (0, -.19, 1.27), eye, .01)      # single red eye bar
    else:
        for sx in (-1, 1): cyl(.04, .03, (sx * .08, -.19, 1.27), eye, (math.radians(90), 0, 0))
    cyl(.012, .2, (.1, 0, 1.5), dark); bpy.ops.mesh.primitive_uv_sphere_add(radius=.035, location=(.1, 0, 1.61)); bpy.context.object.data.materials.append(eye)
    if pose == 'hit':  # knocked crooked with the head popped loose
        bpy.ops.object.select_all(action='SELECT'); bpy.ops.transform.rotate(value=.4, orient_axis='Y', center_override=(0, 0, 0))


for kind in ('invader', 'helper'):
    for pose in ('idle', 'walk0', 'walk1', 'hit'):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        sc = bpy.context.scene
        sc.render.engine = 'CYCLES'; sc.cycles.samples = 40; sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
        sc.render.film_transparent = True; sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = -.2
        w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (.35, .4, .5, 1)
        for name, rot, e in (('key', (math.radians(50), math.radians(-30), math.radians(-20)), 3), ('rim', (math.radians(-60), math.radians(20), 0), 1.5)):
            L = bpy.data.lights.new(name, 'SUN'); L.energy = e; o = bpy.data.objects.new(name, L); o.rotation_euler = rot; sc.collection.objects.link(o)
        robot(kind, pose)
        cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = 1.9
        c = bpy.data.objects.new('c', cam); c.location = (0, -6, .95); c.rotation_euler = (math.radians(90), 0, 0); sc.collection.objects.link(c); sc.camera = c
        sc.render.resolution_x = 160; sc.render.resolution_y = 200
        sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
        sc.render.filepath = os.path.join(OUT, f'bot_{kind}_{pose}.png'); bpy.ops.render.render(write_still=True); print('wrote', kind, pose)
