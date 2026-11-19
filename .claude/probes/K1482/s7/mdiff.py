import json,sys
A=json.load(open(sys.argv[1])); B=json.load(open(sys.argv[2])); rows=[]
for k in A:
  a=[p[0]>=0.5 for p in A[k]['px']]; b=[p[0]>=0.5 for p in B[k]['px']]
  lost=sum(1 for i in range(len(a)) if a[i] and not b[i]); gain=sum(1 for i in range(len(a)) if b[i] and not a[i])
  if lost+gain: rows.append((k,lost,gain))
print('sites changed',len(rows),'lost',sum(r[1] for r in rows),'gained',sum(r[2] for r in rows))
for r in sorted(rows,key=lambda r:-(r[1]+r[2])): print(*r)
