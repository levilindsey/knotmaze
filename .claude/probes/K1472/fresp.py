import sys
from PIL import Image, ImageChops
def n(a,b):
    A=Image.open(a).convert('RGB').crop((0,0,1060,900)); B=Image.open(b).convert('RGB').crop((0,0,1060,900))
    return ImageChops.difference(A,B).convert('L').point(lambda v:255 if v>5 else 0).histogram()[255]
d=sys.argv[1]
for k in ['today','m_pre','w_pre','wt2','m']:
    print(k, 'fade 0.02 vs 1.18:', n(f'{d}/{k}/s0.png',f'{d}/{k}/s1.2.png'), ' vs today s0:', n(f'{d}/{k}/s0.png',f'{d}/today/s0.png'))
