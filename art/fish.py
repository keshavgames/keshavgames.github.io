"""Aquarium fish for Aquarium Keeper, side view facing right. Writes fish_<kind>.png (160x112)."""
import bpy, math, sys, os
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARGS[0] if ARGS else os.path.join(os.path.dirname(__file__), '..', 'img')
KINDS = {'goldie': ((1, .45, .05), (1, .9, .6)), 'stripe': ((.95, .95, .95), (.1, .1, .12)), 'blue': ((.1, .4, .95), (1, .85, .1)), 'pinky': ((1, .45, .7), (.8, .2, .55)), 'lime': ((.5, .9, .2), (.1, .5, .3)), 'puffer': ((.95, .8, .3), (.6, .4, .1)), 'angel': ((.9, .85, .5), (.2, .2, .3)), 'ruby': ((.85, .08, .15), (1, .7, .3))}
def mat(name, color, rough=.3, emit=0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough
    if 'Coat Weight' in b.inputs: b.inputs['Coat Weight'].default_value = .5
    return m
def sph(loc, r, sc, m):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=48, ring_count=24); o = bpy.context.object; o.scale = sc; o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o
def fin(pts, m):
    import bmesh
    me = bpy.data.meshes.new('fin'); bm = bmesh.new(); vs = [bm.verts.new(p) for p in pts]; bm.faces.new(vs); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('fin', me); bpy.context.scene.collection.objects.link(o); o.data.materials.append(m)
    s = o.modifiers.new('S', 'SOLIDIFY'); s.thickness = .02
for kind, (main, accent) in KINDS.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 40; sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
    sc.render.film_transparent = True; sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = -.2
    w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (.4, .5, .6, 1)
    L = bpy.data.lights.new('k', 'SUN'); L.energy = 3; o = bpy.data.objects.new('k', L); o.rotation_euler = (math.radians(40), math.radians(-20), math.radians(-30)); sc.collection.objects.link(o)
    M, A = mat('m', main), mat('a', accent, .4); ink = mat('ink', (.02, .02, .03), .1); wh = mat('wh', (1, 1, 1), .2)
    tall = kind == 'angel'; puff = kind == 'puffer'
    sph((0, 0, 0), .5, (1.3 if not puff else 1.05, .55, .85 if not tall else 1.4), M)
    if kind == 'stripe':
        for x in (-.3, .2): sph((x, 0, 0), .505, (.1, .56, .86), A)
    if kind in ('blue', 'pinky', 'lime', 'ruby'): sph((.15, 0, -.18), .42, (1.0, .5, .45), A)
    if puff:
        for i in range(14): a = i / 14 * math.tau; bpy.ops.mesh.primitive_cone_add(radius1=.04, depth=.18, location=(math.cos(a) * .5, -.1, math.sin(a) * .45), rotation=(0, -a + math.pi / 2, 0)); bpy.context.object.data.materials.append(A)
    fin([(-.6, 0, 0), (-1.05, 0, .45), (-.95, 0, 0), (-1.05, 0, -.45)], A)          # tail
    fin([(-.2, 0, .35), (.25, 0, .4), (-.35, 0, .75 if not tall else 1.25)], A)       # dorsal
    if tall: fin([(-.2, 0, -.35), (.2, 0, -.4), (-.3, 0, -1.2)], A)
    sph((.45, -.32, .12), .12, (1, .5, 1), wh); sph((.5, -.4, .12), .07, (1, .5, 1), ink)
    cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = 2.6 if not tall else 3.0
    c = bpy.data.objects.new('c', cam); sc.collection.objects.link(c); sc.camera = c; c.location = (0, -6, 0); c.rotation_euler = (math.radians(90), 0, 0)
    sc.render.resolution_x = 160; sc.render.resolution_y = 112; sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = os.path.join(OUT, f'fish_{kind}.png'); bpy.ops.render.render(write_still=True); print('wrote', kind)
