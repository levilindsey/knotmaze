import json, sys
for f in sys.argv[1:]:
    J = json.load(open(f)); print('==', f)
    for x in J['crossings']:
        if x['i'] in (97, 98, 99, 169, 170, 233, 104, 332, 168, 226, 329, 63):
            print(' x%d u%d o%d' % (x['i'], x.get('u', -1), x.get('o', -1)), ' '.join('%+d%+d:%s/m%d' % (b['dir'], b['lat'], b['path'], b['memO']) for b in x['borders']))
