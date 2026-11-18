#!/usr/bin/env python3
# K1472 s3: A | B | difference mask (> 24), two-thirds scale.  python pairmask.py <a.png> <b.png> <out.png>
import sys
from PIL import Image, ImageChops
A = Image.open(sys.argv[1]).convert("RGB"); B = Image.open(sys.argv[2]).convert("RGB")
m = ImageChops.difference(A, B).convert("L").point(lambda v: 255 if v > 24 else 0)
W, H = A.size
o = Image.new("RGB", (W * 3, H)); o.paste(A, (0, 0)); o.paste(B, (W, 0)); o.paste(Image.merge("RGB", (m, m, m)), (2 * W, 0))
o.resize((W * 3 * 2 // 3, H * 2 // 3)).save(sys.argv[3])
print(sum(1 for v in m.get_flattened_data() if v))
