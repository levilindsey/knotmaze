import json, sys, collections
sp = sys.argv[1]
R = [r for r in json.load(open(sp + r'\floats6.json')) if r['cap'] == 5 and 9 <= r['a'] <= 120]
names = ['today', 'step 1', 'step 3', 'step 4', 'carve', 'now']
first = collections.Counter()
for r in R:
    k = next(i for i, t in enumerate(r['other']) if 0 < t <= 2 * r['a'] + 8)
    r['first'] = k; first[names[k]] += 1
print(len(R), dict(first))
json.dump(R, open(sp + r'\floats_now.json', 'w'))
