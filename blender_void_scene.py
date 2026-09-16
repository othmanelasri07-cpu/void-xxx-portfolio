"""
VOID XXX — Blender 3D Logo Scene Generator
============================================
Run this in Blender (Edit > Preferences > Python > Run Script)
or via command line: blender --background --python blender_void_scene.py

Outputs:
  - void_logo.glb  (Three.js-ready)
  - void_logo.fbx  (Unreal/Unity)
  - void_logo.obj  (Universal)

Generates:
  - Hexagonal VOID logo with beveled edges
  - Glowing ring around the logo
  - Floating particle spheres
  - Platform/pedestal base
  - Neon wireframe accents
"""

import bpy
import bmesh
import math
import os
import sys

# ── Cleanup ──────────────────────────────────────────────────────
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for col in bpy.data.collections:
    bpy.data.collections.remove(col)

# ── Scene setup ──────────────────────────────────────────────────
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 128
scene.render.film_transparent = True
scene.world.use_nodes = True
bg = scene.world.node_tree.nodes.get('Background')
if bg:
    bg.inputs[0].default_value = (0.02, 0.02, 0.04, 1)

# ── Materials ────────────────────────────────────────────────────
mat_neon_blue = bpy.data.materials.new("NeonBlue")
mat_neon_blue.use_nodes = True
nodes = mat_neon_blue.node_tree.nodes
links = mat_neon_blue.node_tree.links
nodes.clear()
emission = nodes.new('ShaderNodeEmission')
emission.inputs[0].default_value = (0, 0.94, 1, 1)  # #00f0ff
emission.inputs[1].default_value = 5.0
output = nodes.new('ShaderNodeOutputMaterial')
links.new(emission.outputs[0], output.inputs[0])
mat_neon_blue.blend_method = 'BLEND' if hasattr(mat_neon_blue, 'blend_method') else None

mat_neon_purple = bpy.data.materials.new("NeonPurple")
mat_neon_purple.use_nodes = True
nodes = mat_neon_purple.node_tree.nodes
links = mat_neon_purple.node_tree.links
nodes.clear()
emission2 = nodes.new('ShaderNodeEmission')
emission2.inputs[0].default_value = (0.75, 0, 1, 1)  # #bf00ff
emission2.inputs[1].default_value = 3.0
output2 = nodes.new('ShaderNodeOutputMaterial')
links.new(emission2.outputs[0], output2.inputs[0])

mat_dark = bpy.data.materials.new("DarkMetal")
mat_dark.use_nodes = True
bsdf = mat_dark.node_tree.nodes.get('Principled BSDF')
if bsdf:
    bsdf.inputs[0].default_value = (0.05, 0.05, 0.08, 1)
    bsdf.inputs[7].default_value = 0.9  # Metallic
    bsdf.inputs[9].default_value = 0.2  # Roughness

# ── Hexagonal Logo ──────────────────────────────────────────────
mesh_logo = bpy.data.meshes.new("VoidLogoMesh")
bm = bmesh.new()

verts = []
for i in range(6):
    angle = math.radians(60 * i - 30)
    x = math.cos(angle) * 2.0
    y = math.sin(angle) * 2.0
    verts.append(bm.verts.new((x, y, 0)))

# Close the loop
bm.verts.ensure_lookup_table()
edges = []
for i in range(6):
    edges.append(bm.edges.new((verts[i], verts[(i + 1) % 6])))

# Create face
bm.faces.new(verts)

# Extrude for depth
bmesh.ops.solidify(bm, geom=bm.faces[:] + bm.edges[:] + bm.verts[:], thickness=0.4)
bm.to_mesh(mesh_logo)
bm.free()

logo_obj = bpy.data.objects.new("VoidLogo", mesh_logo)
logo_obj.data.materials.append(mat_neon_blue)
logo_obj.location = (0, 0, 1.5)
scene.collection.objects.link(logo_obj)

# ── Wireframe Ring ──────────────────────────────────────────────
bpy.ops.mesh.primitive_torus_add(
    major_radius=2.8, minor_radius=0.04,
    major_segments=64, minor_segments=8,
    location=(0, 0, 1.5)
)
ring1 = bpy.context.active_object
ring1.name = "Ring1"
ring1.data.materials.append(mat_neon_purple)
ring1.rotation_euler = (math.radians(60), 0, 0)

# Second ring
bpy.ops.mesh.primitive_torus_add(
    major_radius=3.0, minor_radius=0.03,
    major_segments=64, minor_segments=8,
    location=(0, 0, 1.5)
)
ring2 = bpy.context.active_object
ring2.name = "Ring2"
ring2.data.materials.append(mat_neon_blue)
ring2.rotation_euler = (math.radians(-30), math.radians(45), 0)

# ── Platform / Pedestal ─────────────────────────────────────────
bpy.ops.mesh.primitive_cylinder_add(
    radius=3.5, depth=0.3, vertices=64,
    location=(0, 0, -0.15)
)
platform = bpy.context.active_object
platform.name = "Platform"
platform.data.materials.append(mat_dark)

# Glowing edge ring on platform
bpy.ops.mesh.primitive_torus_add(
    major_radius=3.5, minor_radius=0.025,
    major_segments=64, minor_segments=6,
    location=(0, 0, 0.01)
)
edge_ring = bpy.context.active_object
edge_ring.name = "PlatformEdge"
edge_ring.data.materials.append(mat_neon_blue)

# ── Floating Particles ──────────────────────────────────────────
for i in range(30):
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=0.05 + math.sin(i * 0.7) * 0.03,
        segments=8, ring_count=6,
        location=(
            math.cos(i * 1.2) * (2.5 + math.sin(i * 0.3) * 1.5),
            math.sin(i * 1.2) * (2.5 + math.cos(i * 0.5) * 1.5),
            0.5 + math.sin(i * 0.8) * 2.0
        )
    )
    particle = bpy.context.active_object
    particle.name = f"Particle_{i}"
    mat = mat_neon_blue if i % 3 == 0 else mat_neon_purple
    particle.data.materials.append(mat)

# ── Wireframe Accent Lines ──────────────────────────────────────
# Create vertical accent lines
for i in range(4):
    angle = math.radians(90 * i)
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.01, depth=4.0, vertices=8,
        location=(math.cos(angle) * 4, math.sin(angle) * 4, 1.5)
    )
    line = bpy.context.active_object
    line.name = f"AccentLine_{i}"
    line.rotation_euler = (math.radians(5), 0, angle)
    line.data.materials.append(mat_neon_blue)

# ── Camera ──────────────────────────────────────────────────────
cam_data = bpy.data.cameras.new("Camera")
cam_data.lens = 50
cam_obj = bpy.data.objects.new("Camera", cam_data)
cam_obj.location = (0, -7, 3)
cam_obj.rotation_euler = (math.radians(75), 0, 0)
scene.collection.objects.link(cam_obj)
scene.camera = cam_obj

# ── Lighting ────────────────────────────────────────────────────
# Key light
bpy.ops.object.light_add(type='AREA', location=(3, -4, 5))
key = bpy.context.active_object
key.name = "KeyLight"
key.data.energy = 200
key.data.color = (0, 0.94, 1)

# Fill light
bpy.ops.object.light_add(type='AREA', location=(-3, -3, 3))
fill = bpy.context.active_object
fill.name = "FillLight"
fill.data.energy = 80
fill.data.color = (0.75, 0, 1)

# Rim light
bpy.ops.object.light_add(type='POINT', location=(0, 4, 2))
rim = bpy.context.active_object
rim.name = "RimLight"
rim.data.energy = 150
rim.data.color = (1, 1, 1)

# ── Export ──────────────────────────────────────────────────────
output_dir = os.path.dirname(bpy.data.filepath) or os.path.expanduser("~/Desktop")
os.makedirs(output_dir, exist_ok=True)

# GLB export (for Three.js / web)
glb_path = os.path.join(output_dir, "void_logo.glb")
try:
    bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB')
    print(f"✅ Exported GLB: {glb_path}")
except Exception as e:
    print(f"⚠️ GLB export failed: {e}")

# FBX export
fbx_path = os.path.join(output_dir, "void_logo.fbx")
try:
    bpy.ops.export_scene.fbx(filepath=fbx_path)
    print(f"✅ Exported FBX: {fbx_path}")
except Exception as e:
    print(f"⚠️ FBX export failed: {e}")

# OBJ export
obj_path = os.path.join(output_dir, "void_logo.obj")
try:
    bpy.ops.export_scene.obj(filepath=obj_path)
    print(f"✅ Exported OBJ: {obj_path}")
except Exception as e:
    print(f"⚠️ OBJ export failed: {e}")

print("\n🎮 VOID XXX 3D Scene generated successfully!")
print(f"📁 Output directory: {output_dir}")
print("🔧 Files: void_logo.glb, void_logo.fbx, void_logo.obj")
