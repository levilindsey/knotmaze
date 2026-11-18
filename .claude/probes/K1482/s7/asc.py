import json,sys
M=json.load(open(sys.argv[1])); t=M[sys.argv[2]]; x0,x1,y0,y1=map(int,sys.argv[3].split(',')); n=2*t['R']
for y in range(y0,y1):
  row=[]
  for x in range(x0,x1):
    ink,cov,ch,wk,wa,wb=t['px'][y*n+x]
    row.append(('%2d%s%d'%(ch,'#' if ink>=0.5 else ('+' if ink>0.1 else '.'),wk)))
  print('%2d '%y+' '.join(row))
