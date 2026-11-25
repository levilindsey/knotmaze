import json, sys
sp = sys.argv[1]
R = json.load(open(sp + r'\floats_now.json'))
names = ['today', 'step 1', 'step 3', 'last step', 'this step', 'this step']
def get(m, a):
    c = [r for r in R if r['m'] == m and r['a'] == a]
    assert len(c) == 1, (m, a, len(c)); return c[0]
tips = [('A_5', 27), ('A_9', 36), ('A_a', 39), ('A_c', 31), ('A_d', 56), ('A_3', 58), ('A_5', 34), ('A_a', 29), ('A_b', 63), ('A_3', 25), ('A_8', 53), ('A_9', 55)]
strokes = [('A_3', 108), ('A_4', 41), ('A_5', 110), ('A_8', 103), ('A_9', 110), ('D_1', 92), ('D_3', 67), ('D_6', 115), ('D_8', 115), ('D_a', 116), ('A_a', 120), ('A_c', 119)]
dots = [('A_4', 21), ('A_9', 82), ('D_1', 12), ('A_b', 54), ('D_2', 19), ('D_9', 10)]
def rows(L, word, n0=1):
    out = []
    for k, (m, a) in enumerate(L):
        r = get(m, a); out.append('%s|@|%.1f|%.1f|%s %d (%s)' % (m, r['x'], r['y'], word, n0 + k, m))
        print(word, n0 + k, m, 'a%d' % a, '(%.0f,%.0f)' % (r['x'], r['y']), 'first loose at', names[r['first']])
    return out
open(sp + r'\pg_tips.txt', 'w').write('\n'.join(rows(tips, 'tip')))
open(sp + r'\pg_strokes.txt', 'w').write('\n'.join(rows(strokes, 'dash') + rows(dots, 'dot')))
