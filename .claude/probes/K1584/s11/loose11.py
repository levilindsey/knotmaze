# K1584 s11: floats.py's loose pieces (<= 300 px) by the three wedge balls: a piece whose ink centroid lies within the
# ball's radius + 10 px of its centre. The brief: no loose piece from a wedge ball.
#   python loose11.py <floats.json> <cap names, comma separated, in floats.py's order>
import sys, json
BALLS = [('A_3', 63, 1056.0, 266.1, 6.47), ('A_5', 176, 2343.7, 507.6, 6.45), ('A_6', 265, 2304.5, 815.5, 8.45)]
F = json.load(open(sys.argv[1])); names = sys.argv[2].split(','); REACH = 10
cnt = {(c, k): 0 for c in range(len(names)) for _, k, *_r in BALLS}; lst = []
for p in F:
    for m, k, cx, cy, R in BALLS:
        d = ((p['x'] - cx) ** 2 + (p['y'] - cy) ** 2) ** 0.5
        if p['m'] == m and d <= R + REACH:
            cnt[(p['cap'], k)] += 1
            lst.append('%-6s %s k%d  %3d px at (%.0f, %.0f), %.1f px from the centre' % (names[p['cap']], m, k, p['a'], p['x'], p['y'], d))
for c in range(len(names)):
    print('%-6s ' % names[c] + '  '.join('k%d %d' % (k, cnt[(c, k)]) for _, k, *_r in BALLS) + '  total %d' % sum(cnt[(c, k)] for _, k, *_r in BALLS))
print('\n'.join(lst) if lst else '(no loose piece within radius + 10 px of a wedge ball)')
