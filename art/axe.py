"""A throwing axe for Axe Toss, side view, blade up and to the right. Writes axe.png (128x128)."""
import bpy, math, sys, os
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARGS[0] if ARGS else os.path.join(os.path.dirname(__file__), '..', 'img')
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
sc.render.film_transparent = True; sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = -.2
w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (.5, .5, .55, 1)
L = bpy.data.lights.new('key', 'SUN'); L.energy = 3; o = bpy.data.objects.new('key', L); o.rotation_euler = (math.radians(40), math.radians(-30), 0); sc.collection.objects.link(o)
def mat(name, color, rough=.4, metal=0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal; return m
wood = mat('wood', (.55, .32, .14), .6); steel = mat('steel', (.75, .77, .8), .2, 1); wrap = mat('wrap', (.75, .1, .1), .7)
bpy.ops.mesh.primitive_cylinder_add(radius=.06, depth=1.5, location=(0, 0, 0), vertices=24); h = bpy.context.object; h.data.materials.append(wood); bpy.ops.object.shade_smooth()
bpy.ops.mesh.primitive_cylinder_add(radius=.07, depth=.35, location=(0, 0, -.5), vertices=24); bpy.context.object.data.materials.append(wrap)
bpy.ops.mesh.primitive_cube_add(size=1, location=(.18, 0, .6)); b = bpy.context.object; b.scale = (.42, .05, .32); b.data.materials.append(steel)
m = b.modifiers.new('B', 'BEVEL'); m.width = .03; m.segments = 2
bpy.ops.mesh.primitive_cylinder_add(radius=.2, depth=.05, location=(.36, 0, .6), rotation=(math.radians(90), 0, 0), vertices=32); e = bpy.context.object; e.data.materials.append(steel)
for ob in (h,): pass
cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = 2
c = bpy.data.objects.new('c', cam); c.location = (0, -6, 0); c.rotation_euler = (math.radians(90), 0, 0); sc.collection.objects.link(c); sc.camera = c
sc.render.resolution_x = sc.render.resolution_y = 128
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.render.filepath = os.path.join(OUT, 'axe.png'); bpy.ops.render.render(write_still=True); print('wrote axe')
