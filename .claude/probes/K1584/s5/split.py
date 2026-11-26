# K1584 s5: split a tall sheet into parts of at most H px (cut between rows of height R). python split.py <png> [rowH=262] [rows=8]
import sys
from PIL import Image
p = sys.argv[1]; R = int(sys.argv[2]) if len(sys.argv) > 2 else 262; N = int(sys.argv[3]) if len(sys.argv) > 3 else 8
S = Image.open(p); k = 0
for y in range(0, S.size[1], R * N):
    S.crop((0, y, S.size[0], min(S.size[1], y + R * N))).save(p.replace('.png', f'_p{k}.png')); k += 1
print(k, 'parts')
