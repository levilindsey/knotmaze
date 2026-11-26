import json, sys
A = {e['i']: e for e in json.load(open('A_3_ja.json'))['crossings']}
G = {e['i']: e for e in json.load(open('A_3_g1.json'))['crossings']}
for i in [int(s) for s in sys.argv[1].split(',')]:
  for a, g in zip(A[i]['borders'], G[i]['borders']):
    if a['path'] != g['path']:
      print(i, A[i]['under'], A[i]['over'], a['dir'], a['lat'], a['path'], '->', g['path'], 'dUm', a['dUm'], 'dOm', a['dOm'], 'uMs', a['uMemSelf'], 'memO', a['memO'], 'sExit', a['sExit'], 'sin', a['sin'], 'wm', a.get('wm'))
