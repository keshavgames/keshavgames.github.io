"""Sports props: basketball, bowling ball, bowling pin, baseball, air hockey puck and mallet.

Run headless:  blender -b -P art/sportsprops.py -- <output folder>
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
    w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (.5, .52, .58, 1)
    for name, rot, e in (('key', (math.radians(40), math.radians(-30), math.radians(-20)), 3), ('rim', (math.radians(-60), math.radians(30), 0), 1.2)):
        L = bpy.data.lights.new(name, 'SUN'); L.energy = e; o = bpy.data.objects.new(name, L); o.rotation_euler = rot; sc.collection.objects.link(o)
    return sc


def mat(name, color, rough=.4, metal=0, coat=0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if coat and 'Coat Weight' in b.inputs: b.inputs['Coat Weight'].default_value = coat
    return m


def shoot(sc, name, size, w, h, cam_loc=(0, -6, 0), scale=1.2):
    cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = scale
    c = bpy.data.objects.new('c', cam); sc.collection.objects.link(c); sc.camera = c
    c.location = cam_loc; c.rotation_euler = (Vector((0, 0, cam_loc[2] if cam_loc[1] else 0)) - Vector(cam_loc)).to_track_quat('-Z', 'Y').to_euler()
    sc.render.resolution_x = w; sc.render.resolution_y = h
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = os.path.join(OUT, name); bpy.ops.render.render(write_still=True); print('wrote', name)


# basketball: orange with black seams
sc = reset(); orange = mat('or', (1, .45, .1), .7); seam = mat('seam', (.05, .03, .02), .6)
bpy.ops.mesh.primitive_uv_sphere_add(radius=.5, segments=64, ring_count=32); b = bpy.context.object; b.data.materials.append(orange); bpy.ops.object.shade_smooth()
for rot in ((0, 0, 0), (math.radians(90), 0, 0), (0, math.radians(90), 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=.502, minor_radius=.012, rotation=rot, major_segments=64); bpy.context.object.data.materials.append(seam)
shoot(sc, 'basketball.png', 1, 96, 96, (0, -6, 0), 1.05)

# bowling ball: glossy swirl with finger holes
sc = reset(); blue = mat('bb', (.15, .2, .85), .15, 0, 1); hole = mat('hole', (.02, .02, .03), .5)
bpy.ops.mesh.primitive_uv_sphere_add(radius=.5, segments=64, ring_count=32); b = bpy.context.object; b.data.materials.append(blue); bpy.ops.object.shade_smooth()
for x, z in ((-.1, .18), (.1, .18), (0, -.02)): bpy.ops.mesh.primitive_cylinder_add(radius=.06, depth=.2, location=(x, -.45, z), rotation=(math.radians(90), 0, 0)); bpy.context.object.data.materials.append(hole)
shoot(sc, 'bowlball.png', 1, 96, 96, (0, -6, 0), 1.05)

# bowling pin: white with two red stripes
sc = reset(); white = mat('w', (.95, .95, .95), .2, 0, .8); red = mat('r', (.85, .08, .08), .3)
prof = [(0, 0), (.11, 0), (.14, .1), (.16, .25), (.15, .4), (.09, .58), (.07, .66), (.085, .74), (.09, .8), (.07, .88), (0, .9)]
bpy.ops.mesh.primitive_circle_add(vertices=48, radius=1); c = bpy.context.object; c.select_set(True)
import bmesh
me = bpy.data.meshes.new('pin'); bm = bmesh.new(); rings = []
for r, z in prof:
    ring = [bm.verts.new((math.cos(a / 48 * math.tau) * r, math.sin(a / 48 * math.tau) * r, z)) for a in range(48)]; rings.append(ring)
for i in range(len(rings) - 1):
    for a in range(48): bm.faces.new((rings[i][a], rings[i][(a + 1) % 48], rings[i + 1][(a + 1) % 48], rings[i + 1][a]))
bm.to_mesh(me); bm.free(); pin = bpy.data.objects.new('pin', me); sc.collection.objects.link(pin); pin.data.materials.append(white)
bpy.data.objects.remove(c)
for p in pin.data.polygons: p.use_smooth = True
for z in (.6, .66): bpy.ops.mesh.primitive_torus_add(major_radius=.083, minor_radius=.012, location=(0, 0, z)); bpy.context.object.data.materials.append(red)
cam_loc = (0, -6, .45)
cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = 1.0
co = bpy.data.objects.new('c', cam); sc.collection.objects.link(co); sc.camera = co; co.location = cam_loc; co.rotation_euler = (math.radians(90), 0, 0)
sc.render.resolution_x = 64; sc.render.resolution_y = 128; sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
cam.ortho_scale = 1.0; sc.render.filepath = os.path.join(OUT, 'pin.png'); bpy.ops.render.render(write_still=True); print('wrote pin')

# baseball
sc = reset(); white = mat('w', (.96, .95, .9), .6); stitch = mat('s', (.85, .1, .1), .5)
bpy.ops.mesh.primitive_uv_sphere_add(radius=.5, segments=64, ring_count=32); bpy.context.object.data.materials.append(white); bpy.ops.object.shade_smooth()
for s in (-1, 1): bpy.ops.mesh.primitive_torus_add(major_radius=.36, minor_radius=.02, location=(s * .32, 0, 0), rotation=(0, math.radians(90), 0)); bpy.context.object.data.materials.append(stitch)
shoot(sc, 'baseball.png', 1, 64, 64, (0, -6, 0), 1.05)

# air hockey puck and mallet, seen from above
sc = reset(); red = mat('r', (.9, .12, .12), .3); dark = mat('d', (.1, .1, .12), .4)
bpy.ops.mesh.primitive_cylinder_add(radius=.5, depth=.12, vertices=64); bpy.context.object.data.materials.append(dark); bpy.ops.object.shade_smooth()
bpy.ops.mesh.primitive_torus_add(major_radius=.42, minor_radius=.03, location=(0, 0, .06)); bpy.context.object.data.materials.append(red)
shoot(sc, 'puck.png', 1, 64, 64, (0, 0, 6), 1.05)
for name, col in (('mallet_blue', (.1, .4, .95)), ('mallet_red', (.95, .15, .15))):
    sc = reset(); m = mat('m', col, .25, 0, .6); w = mat('w', (.95, .95, .95), .3)
    bpy.ops.mesh.primitive_cylinder_add(radius=.5, depth=.12, vertices=64); bpy.context.object.data.materials.append(m); bpy.ops.object.shade_smooth()
    bpy.ops.mesh.primitive_uv_sphere_add(radius=.22, location=(0, 0, .2)); bpy.context.object.data.materials.append(m); bpy.ops.object.shade_smooth()
    bpy.ops.mesh.primitive_torus_add(major_radius=.45, minor_radius=.03, location=(0, 0, .06)); bpy.context.object.data.materials.append(w)
    shoot(sc, f'{name}.png', 1, 96, 96, (0, 0, 6), 1.05)
