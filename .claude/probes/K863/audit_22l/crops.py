# K863 audit 22L: the shape spots on v6.8 beside the font, with the kit's loupe
# (work34/dbg/look_k863k.py, unmodified): font panel (fill + skeleton), then
# v6.8 (font fill pale, ink at pen width, centrelines). Box = fu relative to
# the letter's glyph origin (baseline 0, x-height 500); scale = px/fu (the
# sheets' 1x is about 1 px/fu at J3i's Png dpi for these boxes, so 2-3 here
# is the brief's 3x class; each name says its scale).
import os
import subprocess
import sys

T = r"C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"
HERE = os.path.dirname(os.path.abspath(__file__))
PY = os.path.join(T, "venv", "Scripts", "python.exe")
COL = "v6.8=work34\\base|work28\\ports_k990e.json|M"

# name, word, letter index, scale px/fu, pad fu, box (x0,x1,y0,y1 fu) or None
CASES = [
    ("crop_k903_kx_3x", "ok", 1, 3.0, 40, "80,280,240,430"),
    ("crop_k903_p_3x", "hippo", 2, 3.0, 40, "100,300,200,500"),
    ("crop_k913_a_3x", "bad", 1, 3.0, 40, "-50,300,120,380"),
    ("crop_k948_be_3x", "be", 1, 3.0, 40, "-50,350,200,550"),
    ("crop_k948_oe_3x", "oe", 1, 3.0, 40, "-50,350,200,550"),
    ("crop_k977_b_3x", "bow", 0, 3.0, 40, "50,450,-50,200"),
    ("crop_k977_z_2x", "maze", 2, 2.0, 40, "-50,400,-550,-50"),
    ("crop_k990_f_2x", "fe", 0, 2.0, 40, "100,600,-150,300"),
    ("crop_k991_ip_3x", "ip", 1, 3.0, 40, "100,300,200,500"),
    ("crop_k1006_leade_2x", "even", 0, 2.0, 40, "-350,150,0,550"),
    ("crop_k1006_tailq_2x", "oq", 1, 2.0, 40, "250,650,-550,50"),
    ("crop_k1021_g_3x", "og", 1, 3.0, 40, "400,700,350,560"),
    ("crop_k1021_q_3x", "oq", 1, 3.0, 40, "400,700,350,560"),
    ("crop_k1044_oa_2x", "oa", 1, 2.0, 40, "-100,650,300,560"),
    ("crop_k951_s_3x", "boxes", 4, 3.0, 40, "-50,350,-50,300"),
    ("crop_k1194_c_2x", "cursive", 0, 2.0, 40, "-350,300,0,550"),
    ("crop_k1035_os_3x", "os", 1, 3.0, 40, "-100,300,300,560"),
    ("crop_k937_ho_2x", "ho", 1, 2.0, 40, "-200,300,150,550"),
]

for name, word, li, sc, pad, box in CASES:
    out = os.path.join(HERE, name + ".png")
    cmd = [PY, "-I", os.path.join(T, "work34", "dbg", "look_k863k.py"),
           out, word, str(li), str(sc), str(pad), "--col", COL]
    if box:
        cmd += ["--box", box]
    print(name, flush=True)
    r = subprocess.run(cmd, cwd=T, capture_output=True, text=True)
    print((r.stdout or "").strip())
    if r.returncode != 0:
        print(r.stderr[-2000:])
        sys.exit(r.returncode)
print("crops done")
