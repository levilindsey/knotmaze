# K1584 s3: places for sheet.py from a framediff json: the biggest changed boxes, named by crossing and site.
#   python boxplaces.py <diff.json> <out.json> [n=40] [skip=0]
import sys, json
D = json.load(open(sys.argv[1]))['boxes']; n = int(sys.argv[3]) if len(sys.argv) > 3 else 40; sk = int(sys.argv[4]) if len(sys.argv) > 4 else 0
D = sorted(D, key=lambda b: -b['px'])[sk:sk + n]
json.dump([{'name': 'x%s %s %dpx' % (b['cross'], b['site'], b['px']), 'x': b['x'] + b['w'] / 2, 'y': b['y'] + b['h'] / 2} for b in D], open(sys.argv[2], 'w'))
print(len(D))
