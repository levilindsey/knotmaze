import sys
from PIL import Image
look = sys.argv[1]
names = ['crop_spot_s_boxes.png', 'crop_spot_p_ap.png', 'crop_dots_it_3x.png', 'crop_spot_q_oq.png']
ims = [Image.open(f'{look}/{n}').convert('RGB') for n in names]
gap = 18
w = max(i.width for i in ims)
h = sum(i.height for i in ims) + gap * (len(ims) - 1)
out = Image.new('RGB', (w, h), 'white')
y = 0
for i in ims:
    out.paste(i, (0, y)); y += i.height + gap
out.save(f'{look}/card_k1213.png', optimize=True)
print(out.size)