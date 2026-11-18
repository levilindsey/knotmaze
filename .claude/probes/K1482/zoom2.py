import json, sys
from PIL import Image
import numpy as np
B = lambda f: Image.fromarray(np.clip((np.asarray(f.convert('RGB')).astype(np.int32)-14)*4,0,255).astype(np.uint8))
S = {s["site"]: s for s in json.load(open(sys.argv[1]))["sites"]}
a = B(Image.open(sys.argv[2])); b = B(Image.open(sys.argv[3])); R = 24; Z = 6; out = []
names = sys.argv[5].split(",")
im = Image.new("RGB", (2*(2*R*Z)+30, len(names)*(2*R*Z+10)), "white")
for i, n in enumerate(names):
    s = S[n]; box = (int(s["x"])-R, int(s["y"])-R, int(s["x"])+R, int(s["y"])+R)
    for j, f in enumerate((a, b)): im.paste(f.crop(box).resize((2*R*Z, 2*R*Z), Image.NEAREST), (j*(2*R*Z+10), i*(2*R*Z+10)))
im.save(sys.argv[4])
