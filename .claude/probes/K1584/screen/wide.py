# K1584: numbered wide views of picked places, each as today | last step | now, one png per place.
#   python wide.py <s5checkDir> <K1584 probe dir> <outDir> <prefix> <maze,x,y,label> ...
import json, sys, subprocess
from PIL import Image, ImageDraw
sp, g, o, pre = sys.argv[1:5]
caps = [('today', r'\s1\out\before', 0), ('last step', r'\s4\out\s4g', 1), ('now', r'\s5\out\s5d', 3)]
for n, it in enumerate(sys.argv[5:]):
    m, x, y, lab0 = it.split(','); x = float(x); y = float(y)
    box = '%d,%d,%d,%d' % (max(0, x - 80), max(0, y - 60), x + 80, y + 60); tiles = []
    for lab, d, ci in caps:
        f = o + r'\_w_%d.png' % ci
        subprocess.check_call([sys.executable, sp + r'\region.py', f, g + d + '\\' + m, box, '5', '--json', sp + r'\t4\%s.json' % m, '--cap', str(ci), '--num'], stdout=subprocess.DEVNULL)
        tiles.append((lab, Image.open(f).convert('RGB')))
    W = sum(t.size[0] for _, t in tiles) + 16; H = tiles[0][1].size[1] + 22
    im = Image.new('RGB', (W, H), (40, 40, 40)); dr = ImageDraw.Draw(im); xx = 0
    for lab, t in tiles:
        dr.text((xx + 4, 4), '%s %s at %.0f,%.0f  |  %s' % (lab0, m, x, y, lab), fill=(255, 220, 90)); im.paste(t, (xx, 22)); xx += t.size[0] + 8
    im.save(o + r'\%s_%d.png' % (pre, n)); print(o + r'\%s_%d.png' % (pre, n), im.size)
