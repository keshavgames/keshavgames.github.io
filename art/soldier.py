"""Soldier kit for the shooters: a chunky armoured soldier in team colours plus first-person guns.

Run headless:  blender -b -P art/soldier.py -- <output folder> [colors|top|guns]
Writes soldier_<color>_<front|back|left|right>_<0|1>.png (160x256), top_<color>_<0|1>.png (112x112)
and gun_<pistol|smg|rifle|sniper>.png (480x320).
"""
import bpy, math, sys, os
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else os.path.join(os.path.dirname(__file__), '..', 'img')
WHAT = sys.argv[sys.argv.index('--') + 2:] if '--' in sys.argv else []
os.makedirs(OUT, exist_ok=True)
COLORS = {'orange': (1.0, 0.42, 0.08), 'blue': (0.12, 0.38, 1.0), 'red': (0.9, 0.12, 0.18), 'green': (0.12, 0.7, 0.25),
          'purple': (0.45, 0.2, 0.85), 'yellow': (1.0, 0.75, 0.12), 'teal': (0.05, 0.65, 0.58), 'pink': (1.0, 0.32, 0.62)}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 40; sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
    sc.render.film_transparent = True
    w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.35, 0.38, 0.45, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = .6
    return sc


def mat(name, color, rough=.5, metal=0, emit=0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit: b.inputs['Emission Color'].default_value = (*color, 1); b.inputs['Emission Strength'].default_value = emit
    return m


def box(name, size, loc, material, parent, bevel=.02, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = size; o.parent = parent
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel: m = o.modifiers.new('B', 'BEVEL'); m.width = bevel; m.segments = 3
    o.data.materials.append(material); bpy.ops.object.shade_smooth()
    return o


def limb(name, a, b, r, material, parent):
    a, b = Vector(a), Vector(b)
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=(b - a).length, location=(a + b) / 2, vertices=16)
    o = bpy.context.object; o.name = name; o.parent = parent
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference((b - a).normalized())
    o.data.materials.append(material); bpy.ops.object.shade_smooth()
    for p in (a, b):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=p); s = bpy.context.object; s.parent = parent; s.data.materials.append(material); bpy.ops.object.shade_smooth()
    return o


def gun(kind, parent, M):
    """A gun along -Y with its grip at the origin."""
    if kind == 'blaster':  # Laser Arena: a chunky white blaster with glowing coils
        white = mat('white', (.85, .87, .9), .3); glow = mat('glow', (.2, .95, 1), .2, 0, 12)
        box('body', (.065, .46, .085), (0, -.22, 0), white, parent, .025)
        box('top', (.045, .3, .04), (0, -.26, .06), M['gun'], parent, .012)
        box('grip', (.055, .07, .14), (0, .02, -.09), M['gun'], parent, .015, rot=(math.radians(-15), 0, 0))
        limb('barrel', (0, -.44, .01), (0, -.86, .01), .024, white, parent)
        for i in range(3):
            bpy.ops.mesh.primitive_torus_add(location=(0, -.52 - i * .1, .01), major_radius=.036, minor_radius=.01, rotation=(math.radians(90), 0, 0))
            t = bpy.context.object; t.parent = parent; t.data.materials.append(glow)
        box('cell', (.075, .12, .04), (0, -.16, -.05), glow, parent, .01)
        limb('tip', (0, -.86, .01), (0, -.9, .01), .018, glow, parent)
        return
    L = {'pistol': .24, 'smg': .48, 'rifle': .78, 'sniper': 1.05}[kind]
    box('body', (.075, L * .55, .1), (0, -L * .2, 0), M['gun'], parent, .01)
    box('grip', (.05, .06, .13), (0, .02, -.08), M['gun'], parent, .01, rot=(math.radians(-15), 0, 0))
    limb('barrel', (0, -L * .45, .015), (0, -L * .95, .015), .014 if kind != 'sniper' else .017, M['metal'], parent)
    if kind != 'pistol':
        box('mag', (.045, .06, .14 if kind != 'smg' else .18), (0, -L * .2, -.1), M['gun'], parent, .01, rot=(math.radians(10), 0, 0))
        box('stock', (.05, L * .3, .07), (0, L * .2, -.01), M['gun'], parent, .01)
    if kind in ('rifle', 'sniper'): box('rail', (.03, L * .35, .02), (0, -L * .25, .055), M['metal'], parent, .004)
    if kind == 'sniper': limb('scope', (0, -L * .05, .085), (0, -L * .45, .085), .028, M['metal'], parent)
    box('accent', (.065, .05, .03), (0, -L * .35, .02), M['team'], parent, .006)


def soldier(color, frame=0):
    rig = bpy.data.objects.new('Rig', None); bpy.context.scene.collection.objects.link(rig)
    M = {'team': mat('team_' + color, COLORS[color], .45), 'dark': mat('dark', (0.06, 0.065, 0.08), .7),
         'pants': mat('pants', (0.14, 0.15, 0.19), .8), 'skin': mat('skin', (0.8, 0.58, 0.42), .6),
         'visor': mat('visor_' + color, tuple(min(1, c * 1.2 + .15) for c in COLORS[color]), .1, 0, 3.0),
         'gun': mat('gun', (0.05, 0.05, 0.06), .35, .4), 'metal': mat('metal', (0.3, 0.32, 0.36), .3, .9)}
    for sx, sgn in ((.12, 1), (-.12, -1)):  # legs swing in opposite directions on the walk frame
        off = .16 * sgn if frame else 0
        hip, knee, foot = Vector((sx, 0, .86)), Vector((sx, -.03 - off, .47)), Vector((sx, -off * 1.3, .1))
        limb('leg', hip, knee, .078, M['pants'], rig); limb('shin', knee, foot, .07, M['pants'], rig)
        box('boot', (.14, .26, .11), foot + Vector((0, -.04, -.03)), M['dark'], rig, .03)
        box('pad', (.1, .07, .1), knee + Vector((0, -.07, 0)), M['team'], rig, .02)
    box('belt', (.38, .24, .1), (0, 0, .88), M['dark'], rig, .02)
    box('vest', (.46, .3, .46), (0, 0, 1.14), M['team'], rig, .06)
    box('plate', (.3, .06, .28), (0, -.16, 1.16), M['dark'], rig, .02)
    for px in (-.1, 0, .1): box('pouch', (.08, .06, .08), (px, -.19, 1.02), M['team'], rig, .015)
    box('pack', (.34, .16, .34), (0, .2, 1.16), M['dark'], rig, .04)
    box('collar', (.2, .2, .07), (0, 0, 1.38), M['dark'], rig, .02)
    for sx in (.27, -.27): box('shoulder', (.14, .2, .1), (sx, 0, 1.33), M['team'], rig, .03)
    # arms reach forward to hold the rifle
    limb('arm_r', (.27, -.02, 1.3), (.22, -.24, 1.12), .06, M['team'], rig); limb('fore_r', (.22, -.24, 1.12), (.06, -.33, 1.12), .055, M['dark'], rig)
    limb('arm_l', (-.27, -.02, 1.3), (-.25, -.25, 1.15), .06, M['team'], rig); limb('fore_l', (-.25, -.25, 1.15), (-.02, -.48, 1.15), .055, M['dark'], rig)
    g = bpy.data.objects.new('Gun', None); g.location = (.05, -.34, 1.16); g.parent = rig; bpy.context.scene.collection.objects.link(g)
    gun('rifle', g, M)
    limb('neck', (0, 0, 1.38), (0, -.02, 1.46), .06, M['skin'], rig)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=.15, location=(0, -.01, 1.56)); h = bpy.context.object; h.scale = (1, 1.05, .92); h.parent = rig; h.data.materials.append(M['team']); bpy.ops.object.shade_smooth()
    box('brim', (.3, .32, .04), (0, -.01, 1.5), M['team'], rig, .02)
    box('visor', (.24, .06, .075), (0, -.14, 1.53), M['visor'], rig, .025)
    box('mask', (.18, .05, .07), (0, -.13, 1.45), M['dark'], rig, .02)
    return rig


def lights_and_camera(top=False, ortho_scale=2.0, target_z=.86):
    sc = bpy.context.scene
    for name, loc, energy, color in (('key', (2.5, -3, 4), 4.5, (1, .96, .9)), ('fill', (-3, -2, 2), 1.4, (.8, .87, 1)), ('rim', (0, 4, 3), 3.2, (1, 1, 1))):
        L = bpy.data.lights.new(name, 'SUN'); L.energy = energy; L.color = color
        o = bpy.data.objects.new(name, L); sc.collection.objects.link(o)
        o.rotation_euler = (-Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = ortho_scale
    c = bpy.data.objects.new('cam', cam); sc.collection.objects.link(c); sc.camera = c
    if top: c.location = (0, 0, 6); c.rotation_euler = (0, 0, 0)
    else: c.location = (0, -8, target_z + .25); c.rotation_euler = (math.radians(88), 0, 0)


def render(name, w, h):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = w, h, 100
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = os.path.join(OUT, name + '.png'); bpy.ops.render.render(write_still=True)
    print('wrote', name)


if not WHAT or 'colors' in WHAT:
    for color in COLORS:
        for frame in (0, 1):
            reset(); rig = soldier(color, frame); lights_and_camera()
            for d, rot in (('front', 0), ('left', -90), ('back', 180), ('right', 90)):
                rig.rotation_euler = (0, 0, math.radians(rot))
                render(f'soldier_{color}_{d}_{frame}', 160, 256)
if not WHAT or 'top' in WHAT:
    for color in COLORS:
        for frame in (0, 1):
            reset(); rig = soldier(color, frame); rig.rotation_euler = (0, 0, math.pi); lights_and_camera(top=True, ortho_scale=1.5)
            render(f'top_{color}_{frame}', 112, 112)
if not WHAT or 'guns' in WHAT or 'blaster' in WHAT:
    for kind in ('pistol', 'smg', 'rifle', 'sniper', 'blaster'):
        if WHAT and 'guns' not in WHAT and kind != 'blaster': continue
        sc = reset()
        M = {'team': mat('team', COLORS['orange'], .45), 'gun': mat('gun', (0.05, 0.05, 0.06), .35, .4), 'metal': mat('metal', (0.3, 0.32, 0.36), .3, .9), 'dark': mat('dark', (0.06, 0.065, 0.08), .7)}
        g = bpy.data.objects.new('Gun', None); sc.collection.objects.link(g)
        gun(kind, g, M)
        limb('glove', (0, .1, -.16), (0, .02, -.06), .045, M['dark'], g); limb('sleeve', (.02, .4, -.32), (0, .1, -.16), .06, M['team'], g)
        g.rotation_euler = (math.radians(6), math.radians(-8), math.radians(188)); g.location = (.13, .34, -.115)
        lights_and_camera()
        cam = sc.camera; cam.data.type = 'PERSP'; cam.data.lens = 22; cam.location = (0, 0, 0); cam.rotation_euler = (math.radians(90), 0, 0)
        render(f'gun_{kind}', 480, 320)
